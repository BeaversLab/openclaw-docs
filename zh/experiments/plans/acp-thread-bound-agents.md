---
summary: "Integrate ACP coding agents via a first-class ACP control plane in core and plugin-backed runtimes (acpx first)"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "ACP Thread Bound Agents"
---

# ACP Thread Bound Agents

## 概览

本计划定义了 OpenClaw 应如何在支持线程的渠道（Discord 优先）中以生产级生命周期和恢复机制支持 ACP 编码代理。

相关文档：

- [统一运行时流式重构计划](/zh/experiments/plans/acp-unified-streaming-refactor)

目标用户体验：

- 用户生成或将 ACP 会话聚焦到线程中
- 该线程中的用户消息路由到绑定的 ACP 会话
- 代理输出流回传到同一线程身份
- 会话可以是持久的或一次性的，并具有明确的清理控制

## 决策摘要

长期建议采用混合架构：

- OpenClaw 核心拥有 ACP 控制平面关注点
  - 会话身份和元数据
  - 线程绑定和路由决策
  - 交付不变量和重复抑制
  - 生命周期清理和恢复语义
- ACP 运行时后端是可插拔的
  - 第一个后端是由 acpx 支持的插件服务
  - 运行时执行 ACP 传输、排队、取消、重连

OpenClaw 不应在核心中重新实现 ACP 传输内部机制。
OpenClaw 不应依赖纯插件拦截路径进行路由。

## 北极星架构（终极目标）

将 ACP 视为 OpenClaw 中的一等控制平面，具有可插拔的运行时适配器。

不可协商的不变量：

- 每个 ACP 线程绑定都引用一个有效的 ACP 会话记录
- 每个 ACP 会话都有明确的生命周期状态 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每个 ACP 运行都有明确的运行状态 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- 生成、绑定和初始入队是原子的
- 命令重试是幂等的（没有重复运行或重复的 Discord 输出）
- 绑定线程渠道输出是 ACP 运行事件的投影，绝不是临时的副作用

长期所有权模型：

- `AcpSessionManager` 是唯一的 ACP 写入器和编排器
- 管理器首先驻留在网关进程中；稍后可以移动到专用的 sidecar，并保持相同的接口
- 对于每个 ACP 会话密钥，管理器拥有一个内存中的 actor（序列化命令执行）
- 适配器（`acpx`、未来的后端）仅是传输/运行时实现

长期持久化模型：

- 将 ACP 控制平面状态移动到 OpenClaw 状态目录下的专用 SQLite 存储（WAL 模式）
- 在迁移期间，将 `SessionEntry.acp` 作为兼容性投影保留，而非事实来源
- 以仅追加方式存储 ACP 事件，以支持重放、崩溃恢复和确定性交付

### 交付策略（通往终极目标的桥梁）

- 短期过渡方案
  - 保留当前的线程绑定机制和现有的 ACP 配置表面
  - 修复元数据缺口错误，并通过单一的核心 ACP 分支路由 ACP 轮次
  - 立即添加幂等密钥和故障关闭路由检查
- 长期切换
  - 将 ACP 的事实来源移动到控制平面 DB + actors
  - 使绑定线程的交付完全基于事件投影
  - 移除依赖机会主义会话进入元数据的遗留回退行为

## 为什么不仅仅是纯插件

如果没有核心更改，当前的插件钩子不足以进行端到端的 ACP 会话路由。

- 来自线程绑定的入站路由首先在核心调度中解析为会话密钥
- 消息钩子是即发即弃的，无法短接主回复路径
- 插件命令适用于控制操作，但不适用于替换核心的每轮调度流程

结果：

- ACP 运行时可以插件化
- ACP 路由分支必须存在于核心中

## 可复用的现有基础

已实现且应保持规范：

- 线程绑定目标支持 `subagent` 和 `acp`
- 入站线程路由覆盖在正常调度之前通过绑定进行解析
- 通过回复交付中的 webhook 实现出站线程身份
- 具有 ACP 目标兼容性的 `/focus` 和 `/unfocus` 流程
- 启动时可恢复的持久化绑定存储
- 在归档、删除、取消聚焦、重置和删除时的解绑生命周期

此计划扩展了该基础，而不是替换它。

## 架构

### 边界模型

核心（必须在 OpenClaw 核心中）：

- 回复管道中的 ACP 会话模式调度分支
- 传递仲裁以避免父级加线程重复
- ACP 控制平面持久化（迁移期间具有 `SessionEntry.acp` 兼容性投影）
- 生命周期解绑和运行时分离语义与会话重置/删除绑定

插件后端（acpx 实现）：

- ACP 运行时工作进程监督
- acpx 进程调用和事件解析
- ACP 命令处理程序（`/acp ...`）和操作员 UX
- 后端特定的配置默认值和诊断

### 运行时所有权模型

- 一个网关进程拥有 ACP 编排状态
- ACP 执行通过 acpx 后端在受监督的子进程中运行
- 进程策略是针对每个活动的 ACP 会话密钥长期存在的，而不是针对每条消息

这避免了每次提示时的启动成本，并使取消和重新连接语义保持可靠。

### 核心运行时协定

添加核心 ACP 运行时协定，以便路由代码不依赖于 CLI 细节，并且可以在不更改调度逻辑的情况下切换后端：

```ts
export type AcpRuntimePromptMode = "prompt" | "steer";

export type AcpRuntimeHandle = {
  sessionKey: string;
  backend: string;
  runtimeSessionName: string;
};

export type AcpRuntimeEvent =
  | { type: "text_delta"; stream: "output" | "thought"; text: string }
  | { type: "tool_call"; name: string; argumentsText: string }
  | { type: "done"; usage?: Record<string, number> }
  | { type: "error"; code: string; message: string; retryable?: boolean };

export interface AcpRuntime {
  ensureSession(input: {
    sessionKey: string;
    agent: string;
    mode: "persistent" | "oneshot";
    cwd?: string;
    env?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<AcpRuntimeHandle>;

  submit(input: {
    handle: AcpRuntimeHandle;
    text: string;
    mode: AcpRuntimePromptMode;
    idempotencyKey: string;
  }): Promise<{ runtimeRunId: string }>;

  stream(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId: string;
    onEvent: (event: AcpRuntimeEvent) => Promise<void> | void;
    signal?: AbortSignal;
  }): Promise<void>;

  cancel(input: {
    handle: AcpRuntimeHandle;
    runtimeRunId?: string;
    reason?: string;
    idempotencyKey: string;
  }): Promise<void>;

  close(input: { handle: AcpRuntimeHandle; reason: string; idempotencyKey: string }): Promise<void>;

  health?(): Promise<{ ok: boolean; details?: string }>;
}
```

实现细节：

- 第一个后端：`AcpxRuntime` 作为插件服务提供
- 核心通过注册表解析运行时，并且在没有可用的 ACP 运行时后端时失败并显示明确的操作员错误

### 控制平面数据模型和持久化

长期的真相来源是专用的 ACP SQLite 数据库（WAL 模式），用于事务更新和崩溃安全恢复：

- `acp_sessions`
  - `session_key` (pk), `backend`, `agent`, `mode`, `cwd`, `state`, `created_at`, `updated_at`, `last_error`
- `acp_runs`
  - `run_id` (pk), `session_key` (fk), `state`, `requester_message_id`, `idempotency_key`, `started_at`, `ended_at`, `error_code`, `error_message`
- `acp_bindings`
  - `binding_key` (pk), `thread_id`, `channel_id`, `account_id`, `session_key` (fk), `expires_at`, `bound_at`
- `acp_events`
  - `event_id` (pk), `run_id` (fk), `seq`, `kind`, `payload_json`, `created_at`
- `acp_delivery_checkpoint`
  - `run_id` (pk/fk), `last_event_seq`, `last_discord_message_id`, `updated_at`
- `acp_idempotency`
  - `scope`, `idempotency_key`, `result_json`, `created_at`, unique `(scope, idempotency_key)`

```ts
export type AcpSessionMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

存储规则：

- 在迁移期间将 `SessionEntry.acp` 作为兼容性投影保留
- 进程 ID 和套接字仅保留在内存中
- 持久化生命周期和运行状态存储在 ACP 数据库中，而非通用会话 JSON 中
- 如果运行时所有者崩溃，网关将从 ACP 数据库重新加载并从检查点恢复

### 路由和投递

入站：

- 保留当前线程绑定查找作为第一步路由
- 如果绑定目标是 ACP 会话，则路由到 ACP 运行时分支而非 `getReplyFromConfig`
- 显式的 `/acp steer` 命令使用 `mode: "steer"`

出站：

- ACP 事件流被规范化为 OpenClaw 回复块
- 投递目标通过现有的绑定目标路径解析
- 当绑定线程在该会话轮次中处于活动状态时，抑制父渠道完成

流式传输策略：

- 使用合并窗口流式传输部分输出
- 可配置的最小间隔和最大块字节数，以保持在 Discord 速率限制之下
- 完成或失败时始终发送最终消息

### 状态机和事务边界

会话状态机：

- `creating -> idle -> running -> idle`
- `running -> cancelling -> idle | error`
- `idle -> closed`
- `error -> idle | closed`

运行状态机：

- `queued -> running -> completed`
- `running -> failed | cancelled`
- `queued -> cancelled`

所需的事务边界：

- 生成事务
  - 创建 ACP 会话行
  - 创建/更新 ACP 线程绑定行
  - 将初始运行行加入队列
- 关闭事务
  - 标记会话已关闭
  - 删除/过期绑定行
  - 写入最终关闭事件
- 取消事务
  - 使用幂等键标记目标运行为正在取消/已取消

在这些边界之间不允许部分成功。

### 每会话 Actor 模型

`AcpSessionManager` 为每个 ACP 会话键运行一个 actor：

- actor 邮箱序列化 `submit`、`cancel`、`close` 和 `stream` 副作用
- actor 拥有该会话的运行时句柄水合和运行时适配器进程生命周期
- actor 在任何 Discord 投递之前按顺序写入运行事件 (`seq`)
- actor 在成功的出站发送后更新投递检查点

这消除了跨轮次竞争并防止重复或乱序的线程输出。

### 幂等性和投递投影

所有外部 ACP 操作都必须携带幂等键：

- 生成幂等键
- 提示/引导幂等键
- 取消幂等键
- 关闭幂等键

投递规则：

- Discord 消息派生自 `acp_events` 加上 `acp_delivery_checkpoint`
- 重试从检查点恢复，而不重新发送已投递的分块
- 最终回复发射从投影逻辑来看是每次运行恰好一次

### 恢复和自愈

网关启动时：

- 加载非终端 ACP 会话 (`creating`、`idle`、`running`、`cancelling`、`error`)
- 在首次入站事件时惰性地重新创建 actor，或在配置的限制内急切地创建
- 协调任何缺少心跳的 `running` 运行，并标记 `failed` 或通过适配器恢复

当收到入站 Discord 线程消息时：

- 如果绑定存在但 ACP 会话缺失，则以明确的过期绑定消息失败关闭
- 在操作员安全验证后，可选择自动解绑过期绑定
- 永远不要静默地将过期的 ACP 绑定路由到正常的 LLM 路径

### 生命周期和安全

支持的操作：

- 取消当前运行：`/acp cancel`
- 解绑线程：`/unfocus`
- 关闭 ACP 会话：`/acp close`
- 通过有效的 TTL 自动关闭空闲会话

TTL 策略：

- 有效 TTL 为以下各项中的最小值
  - 全局/会话 TTL
  - Discord 线程绑定 TTL
  - ACP 运行时所有者 TTL

安全控制：

- 按名称将 ACP 代理加入白名单
- 限制 ACP 会话的工作区根目录
- 环境变量白名单透传
- 每个账户和全局的最大并发 ACP 会话数
- 针对运行时崩溃的有限重启退避

## 配置界面

核心键：

- `acp.enabled`
- `acp.dispatch.enabled`（独立 ACP 路由终止开关）
- `acp.backend`（默认 `acpx`）
- `acp.defaultAgent`
- `acp.allowedAgents[]`
- `acp.maxConcurrentSessions`
- `acp.stream.coalesceIdleMs`
- `acp.stream.maxChunkChars`
- `acp.runtime.ttlMinutes`
- `acp.controlPlane.store`（`sqlite` 默认值）
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

插件/后端键（acpx 插件部分）：

- 后端命令/路径覆盖
- 后端环境变量白名单
- 后端针对每个代理的预设
- 后端启动/停止超时
- 后端每个会话的最大进行中运行数

## 实施规范

### 控制平面模块（新增）

在核心中添加专用的 ACP 控制平面模块：

- `src/acp/control-plane/manager.ts`
  - 拥有 ACP 执行者、生命周期转换、命令序列化
- `src/acp/control-plane/store.ts`
  - SQLite 架构管理、事务、查询助手
- `src/acp/control-plane/events.ts`
  - 类型化 ACP 事件定义和序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化传递检查点和重放游标
- `src/acp/control-plane/idempotency.ts`
  - 幂等性键保留和响应重放
- `src/acp/control-plane/recovery.ts`
  - 启动时对账和执行者重新水合计划

兼容性桥接模块：

- `src/acp/runtime/session-meta.ts`
  - 暂时保留以便投影到 `SessionEntry.acp`
  - 必须在迁移切换后停止作为单一事实来源

### 所需不变性（必须在代码中强制执行）

- ACP 会话创建和线程绑定是原子的（单一事务）
- 每个 ACP 会话参与者 (actor) 一次最多只能有一个活跃的运行
- 每次运行中 event `seq` 严格递增
- 传递检查点永远不能超过最后提交的事件
- 幂等重放为重复的命令键返回先前的成功负载
- 陈旧/缺失的 ACP 元数据无法路由到正常的非 ACP 回复路径

### Core 接触点

需要更改的 Core 文件：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP 分支调用 `AcpSessionManager.submit` 和事件投影传递
  - 移除绕过控制平面不变性的直接 ACP 回退
- `src/auto-reply/reply/inbound-context.ts`（或最近的标准化上下文边界）
  - 为 ACP 控制平面公开标准化的路由键和幂等种子
- `src/config/sessions/types.ts`
  - 将 `SessionEntry.acp` 保持为仅投影兼容性字段
- `src/gateway/server-methods/sessions.ts`
  - 重置/删除/归档必须调用 ACP 管理器关闭/解绑事务路径
- `src/infra/outbound/bound-delivery-router.ts`
  - 对 ACP 绑定的会话轮次强制执行失败关闭的目标行为
- `src/discord/monitor/thread-bindings.ts`
  - 添加连接到控制平面查找的 ACP 陈旧绑定验证帮助程序
- `src/auto-reply/reply/commands-acp.ts`
  - 通过 ACP 管理器 API 路由生成/取消/关闭/引导
- `src/agents/acp-spawn.ts`
  - 停止临时的元数据写入；调用 ACP 管理器生成事务
- `src/plugin-sdk/**` 和插件运行时桥
  - 清晰地公开 ACP 后端注册和健康语义

明确不替换的 Core 文件：

- `src/discord/monitor/message-handler.preflight.ts`
  - 保持线程绑定覆盖行为作为规范的会话键解析器

### ACP 运行时注册表 API

添加一个核心注册表模块：

- `src/acp/runtime/registry.ts`

所需的 API：

```ts
export type AcpRuntimeBackend = {
  id: string;
  runtime: AcpRuntime;
  healthy?: () => boolean;
};

export function registerAcpRuntimeBackend(backend: AcpRuntimeBackend): void;
export function unregisterAcpRuntimeBackend(id: string): void;
export function getAcpRuntimeBackend(id?: string): AcpRuntimeBackend | null;
export function requireAcpRuntimeBackend(id?: string): AcpRuntimeBackend;
```

行为：

- 当不可用时，`requireAcpRuntimeBackend` 抛出类型化的 ACP 后端缺失错误
- 插件服务在 `start` 上注册后端，并在 `stop` 上取消注册
- 运行时查找是只读的且仅限于进程本地

### acpx 运行时插件协定（实现细节）

对于第一个生产后端（`extensions/acpx`），OpenClaw 和 acpx 通过严格的命令契约连接：

- backend id: `acpx`
- plugin service id: `acpx-runtime`
- runtime handle encoding: `runtimeSessionName = acpx:v1:<base64url(json)>`
- 编码负载字段：
  - `name`（acpx 命名会话；使用 OpenClaw `sessionKey`）
  - `agent`（acpx agent command）
  - `cwd`（会话 workspace root）
  - `mode`（`persistent | oneshot`）

命令映射：

- ensure 会话：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- prompt turn：
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- cancel：
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- close：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

流式传输：

- OpenClaw 从 `acpx --format json --json-strict` 消费 nd 事件
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### 会话模式修补

修补 `SessionEntry` 在 `src/config/sessions/types.ts` 中：

```ts
type SessionAcpMeta = {
  backend: string;
  agent: string;
  runtimeSessionName: string;
  mode: "persistent" | "oneshot";
  cwd?: string;
  state: "idle" | "running" | "error";
  lastActivityAt: number;
  lastError?: string;
};
```

持久化字段：

- `SessionEntry.acp?: SessionAcpMeta`

迁移规则：

- 阶段 A：双写（`acp` 投影 + ACP SQLite 数据源）
- 阶段 B：从 ACP SQLite 主要读取，从旧版 `SessionEntry.acp` 回退读取
- 阶段 C：迁移命令从有效的旧版条目回填缺失的 ACP 行
- 阶段 D：移除回退读取并保持投影为可选，仅用于 UX
- 旧版字段（`cliSessionIds`，`claudeCliSessionId`）保持不变

### 错误契约

添加稳定的 ACP 错误代码和面向用户的消息：

- `ACP_BACKEND_MISSING`
  - message: `ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - message: `ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - message: `Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - message: `ACP turn failed before completion.`

规则：

- 在线程内返回可操作的用户安全消息
- 仅在运行时日志中记录详细的后端/系统错误
- 当显式选择 ACP 路由时，切勿静默回退到正常 LLM 路径

### 重复传递仲裁

ACP 绑定回合的单一路由规则：

- 如果目标 ACP 会话和请求者上下文存在活动线程绑定，则仅传递到该绑定线程
- 对于同一回合，不要同时发送到父渠道
- 如果绑定目标选择不明确，则通过显式错误进行失效关闭（无隐式父级回退）
- 如果不存在活动绑定，则使用正常的会话目标行为

### 可观测性和运营就绪性

必需指标：

- 按后端和错误代码统计的 ACP 生成成功/失败次数
- ACP 运行延迟百分位数（队列等待、运行时回合时间、交付投影时间）
- ACP 参与者重启次数和重启原因
- 陈旧绑定检测次数
- 幂等重放命中率
- Discord 传递重试和速率限制计数器

必需日志：

- 按 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 键入的结构化日志
- 会话和运行状态机的显式状态转换日志
- 包含脱敏安全参数和退出摘要的适配器命令日志

必需诊断：

- `/acp sessions` 包括状态、活动运行、最后一个错误和绑定状态
- `/acp doctor`（或同等项）验证后端注册、存储运行状况和陈旧绑定

### 配置优先级和有效值

ACP 启用优先级：

- 账户覆盖：`channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 渠道覆盖：`channels.discord.threadBindings.spawnAcpSessions`
- 全局 ACP 闸门：`acp.enabled`
- 调度闸门：`acp.dispatch.enabled`
- 后端可用性：`acp.backend` 的注册后端

自动启用行为：

- 当配置 ACP（`acp.enabled=true`、`acp.dispatch.enabled=true` 或 `acp.backend=acpx`）时，插件自动启用会标记 `plugins.entries.acpx.enabled=true`，除非被列入黑名单或显式禁用

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 测试映射

单元测试：

- `src/acp/runtime/registry.test.ts` （新增）
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts` （新增）
- `src/infra/outbound/bound-delivery-router.test.ts` （扩展 ACP 故障关闭场景）
- `src/config/sessions/types.test.ts` 或最近的 会话-store 测试（ACP 元数据持久化）

集成测试：

- `src/discord/monitor/reply-delivery.test.ts` （绑定 ACP 交付目标行为）
- `src/discord/monitor/message-handler.preflight*.test.ts` （绑定 ACP 会话-key 路由连续性）
- 后端包中的 acpx 插件运行时测试（服务注册/启动/停止 + 事件标准化）

Gateway(网关) e2e 测试：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` （扩展 ACP 重置/删除生命周期覆盖范围）
- ACP 线程轮次往返 e2e 测试，包括生成、消息、流、取消、失去焦点、重启恢复

### 发布防护

添加独立的 ACP 调度终止开关：

- 首次发布 `acp.dispatch.enabled` 默认 `false`
- 禁用时：
  - ACP 生成/聚焦控制命令仍可能绑定会话
  - ACP 调度路径不会激活
  - 用户收到明确的提示，表明 ACP 调度已被策略禁用
- 金丝雀验证后，可以在后续版本中将默认值翻转为 `true`

## 命令和 UX 计划

### 新命令

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### 现有命令兼容性

- `/focus <sessionKey>` 继续支持 ACP 目标
- `/unfocus` 保持当前语义
- `/session idle` 和 `/session max-age` 取代旧的 TTL 覆盖

## 分阶段发布

### 阶段 0：ADR 和架构冻结

- 发布关于 ACP 控制平面所有权和适配器边界的 ADR
- 冻结 DB 架构（`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`）
- 定义稳定的 ACP 错误代码、事件合约和状态转换守卫

### 阶段 1：核心中的控制平面基础

- 实现 `AcpSessionManager` 和每个会话的 actor 运行时
- 实现 ACP SQLite 存储和事务辅助函数
- 实现幂等性存储和重放辅助函数
- 实现事件追加和传递检查点模块
- 将 spawn/cancel/close API 连接到管理器，并提供事务保证

### 阶段 2 核心路由和生命周期集成

- 将来自分发管道的线程绑定 ACP 回合路由到 ACP 管理器
- 当 ACP 绑定/会话不变性失效时，实施失效关闭路由
- 将重置/删除/归档/取消聚焦生命周期与 ACP 关闭/解绑事务集成
- 添加过时绑定检测和可选的自动解绑策略

### 阶段 3 acpx 后端适配器/插件

- 根据运行时合约实现 `acpx` 适配器 (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- 添加后端健康检查和启动/拆卸注册
- 将 acpx nd 事件规范化为 ACP 运行时事件
- 执行后端超时、进程监督以及重启/退避策略

### 阶段 4 投影交付和渠道用户体验（Discord 优先）

- 实现支持检查点恢复的事件驱动渠道投影（Discord 优先）
- 合并流块，并使用感知速率限制的刷新策略
- 保证每次运行仅发送一次最终完成消息
- 交付 `/acp spawn`、`/acp cancel`、`/acp steer`、`/acp close`、`/acp sessions`

### 阶段 5 迁移和切换

- 引入对 `SessionEntry.acp` 投影加上 ACP SQLite 真实来源的双写
- 为旧版 ACP 元数据行添加迁移工具
- 将读取路径切换到 ACP SQLite 主库
- 移除依赖于缺失 `SessionEntry.acp` 的旧版后备路由

### 阶段 6 加固、SLO 和规模限制

- 执行并发限制（全局/账户/会话）、队列策略和超时预算
- 添加完整的遥测、仪表板和告警阈值
- 混沌测试崩溃恢复和重复传递抑制
- 发布针对后端中断、数据库损坏和过时绑定修复的运行手册

### 完整实施检查清单

- 核心控制平面模块和测试
- 数据库迁移和回滚计划
- 跨调度和命令的 ACP manager API 集成
- 插件运行时桥接器中的适配器注册接口
- acpx 适配器实现和测试
- 支持线程的渠道传递投影逻辑，包含检查点重放（优先 Discord）
- 用于重置/删除/归档/取消聚焦的生命周期钩子
- 过时绑定检测器和面向操作员的诊断
- 针对所有新 ACP 键的配置验证和优先级测试
- 操作文档和故障排除手册

## 测试计划

单元测试：

- ACP 数据库事务边界（生成/绑定/入队原子性、取消、关闭）
- 针对会话和运行的 ACP 状态机转换守卫
- 跨所有 ACP 命令的幂等性保留/重放语义
- 每个会话的参与者序列化和队列排序
- acpx 事件解析器和块合并器
- 运行时监督程序重启和退避策略
- 配置优先级和有效 TTL 计算
- 核心 ACP 路由分支选择以及后端/会话无效时的故障关闭行为

集成测试：

- 用于确定性流式传输和取消行为的虚假 ACP 适配器进程
- ACP manager + 带有事务持久化的调度集成
- 到 ACP 会话密钥的线程绑定入站路由
- 线程绑定的出站传递抑制了父渠道重复
- 检查点重放在传递失败后恢复并从上一个事件继续
- 插件服务注册和 ACP 运行时后端的拆解

Gateway(网关) 端到端测试：

- 使用线程生成 ACP，交换多轮提示，取消聚焦
- 网关重启并保留 ACP 数据库和绑定，然后继续同一会话
- 多个线程中的并发 ACP 会话不会出现串扰
- 重复的命令重试（相同的幂等性密钥）不会创建重复的运行或回复
- 过时绑定场景产生显式错误和可选的自动清理行为

## 风险和缓解措施

- 转换期间的重复传递
  - 缓解措施：单一目标解析器和幂等事件检查点
- 负载下的运行时进程剧烈变化
  - 缓解措施：长生命周期的每个会话所有者 + 并发上限 + 退避
- 插件缺失或配置错误
  - 缓解措施：显式面向操作员的错误和故障关闭的 ACP 路由（不隐式回退到正常会话路径）
- 子代理和 ACP 网关之间的配置混淆
  - 缓解措施：显式的 ACP 密钥和包含有效策略源的命令反馈
- 控制平面存储损坏或迁移错误
  - 缓解措施：WAL 模式、备份/还原挂钩、迁移冒烟测试以及只读回退诊断
- 参与者死锁或邮箱饥饿
  - 缓解措施：看门狗定时器、参与者健康探测，以及带有拒绝遥测的有界邮箱深度

## 验收清单

- ACP 会话生成可以在支持的渠道适配器中创建或绑定线程（目前为 Discord）
- 所有线程消息仅路由到绑定的 ACP 会话
- ACP 输出以流式传输或批处理的方式出现在同一线程身份中
- 在父渠道中没有针对绑定轮次的重复输出
- 生成+绑定+初始入队在持久化存储中是原子的
- ACP 命令重试是幂等的，不会重复运行或输出
- 取消、关闭、失焦、归档、重置和删除执行确定性清理
- 崩溃重启保留映射并恢复多轮次连续性
- 并发的线程绑定 ACP 会话独立工作
- ACP 后端缺少状态会产生清晰的可操作错误
- 过时的绑定会被检测到并明确显示（可选择安全自动清理）
- 控制平面指标和诊断信息可供操作员使用
- 新的单元、集成和端到端覆盖率通过

## 附录：针对当前实现的重构（状态）

这些是非阻塞性的后续工作，以便在当前功能集落地后保持 ACP 路径的可维护性。

### 1) 集中化 ACP 调度策略评估（已完成）

- 通过 `src/acp/policy.ts` 中的共享 ACP 策略助手实现
- 调度、ACP 命令生命周期处理程序和 ACP 生成路径现在使用共享策略逻辑

### 2) 按子命令域拆分 ACP 命令处理程序（已完成）

- `src/auto-reply/reply/commands-acp.ts` 现在是一个瘦路由器
- 子命令行为拆分为：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - `src/auto-reply/reply/commands-acp/shared.ts` 中的共享助手

### 3) 按职责拆分 ACP 会话管理器（已完成）

- 管理器拆分为：
  - `src/acp/control-plane/manager.ts`（公共外观 + 单例）
  - `src/acp/control-plane/manager.core.ts`（管理器实现）
  - `src/acp/control-plane/manager.types.ts`（管理器类型/依赖项）
  - `src/acp/control-plane/manager.utils.ts`（规范化 + 辅助函数）

### 4) 可选的 acpx 运行时适配器清理

- `extensions/acpx/src/runtime.ts` 可以拆分为：
- 进程执行/监督
- nd 事件解析/规范化
- 运行时 API 表面 (`submit`, `cancel`, `close` 等)
- 提高可测试性，并使后端行为更易于审计

import zh from "/components/footer/zh.mdx";

<zh />
