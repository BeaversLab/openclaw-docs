---
summary: "通过核心中的一等 ACP 控制平面和插件支持的运行时（首先是 acpx）集成 ACP 编码代理"
owner: "onutc"
status: "草稿"
last_updated: "2026-02-25"
title: "ACP 线程绑定代理"
---

# ACP 线程绑定代理

## 概述

该计划定义了 OpenClaw 应如何在支持线程的频道（首先是 Discord）中以生产级生命周期和恢复能力支持 ACP 编码代理。

相关文档：

- [统一运行时流式重构计划](/zh/experiments/plans/acp-unified-streaming-refactor)

目标用户体验：

- 用户在会话中生成或聚焦一个 ACP 会话到某个线程
- 该线程中的用户消息路由到绑定的 ACP 会话
- 代理输出流回传到同一线程角色
- 会话可以是持久的或一次性的，并具有显式的清理控制

## 决策总结

长期建议是采用混合架构：

- OpenClaw 核心拥有 ACP 控制平面相关事务
  - 会话标识和元数据
  - 线程绑定和路由决策
  - 交付不变量和重复抑制
  - 生命周期清理和恢复语义
- ACP 运行时后端是可插拔的
  - 第一个后端是由 acpx 支持的插件服务
  - 运行时负责 ACP 传输、排队、取消和重连

OpenClaw 不应在核心中重新实现 ACP 传输内部逻辑。
OpenClaw 不应依赖纯插件拦截路径进行路由。

## 北极星架构（圣杯）

将 ACP 视为 OpenClaw 中的一等控制平面，并具有可插拔的运行时适配器。

不可协商的不变量：

- 每个 ACP 线程绑定都引用一个有效的 ACP 会话记录
- 每个 ACP 会话都有明确的生命周期状态 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每个 ACP 运行都有明确的运行状态 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- 生成、绑定和初始入队是原子的
- 命令重试是幂等的（没有重复运行或重复 Discord 输出）
- 绑定线程渠道输出是 ACP 运行事件的投影，绝不是临时的副作用

长期所有权模型：

- `AcpSessionManager` 是唯一的 ACP 写入器和协调器
- 管理器首先存在于网关进程中；稍后可以在相同接口后面将其移动到专用的 sidecar
- 对于每个 ACP 会话密钥，管理器拥有一个内存中的 actor（序列化命令执行）
- 适配器 (`acpx`, 未来的后端) 仅是传输/运行时实现

长期持久化模型：

- 将 ACP 控制平面状态移动到 OpenClaw 状态目录下的专用 SQLite 存储（WAL 模式）
- 在迁移期间将 `SessionEntry.acp` 保留为兼容性投影，而不是事实来源
- 以仅追加方式存储 ACP 事件，以支持重放、崩溃恢复和确定性交付

### 交付策略（通往圣杯的桥梁）

- 短期过渡
  - 保持当前的线程绑定机制和现有的 ACP 配置表面
  - 修复元数据间隙错误，并通过单一核心 ACP 分支路由 ACP 轮次
  - 立即添加幂等密钥和失效封闭（fail-closed）路由检查
- 长期切换
  - 将 ACP 的单一事实来源移至控制面数据库 + 执行者（actors）
  - 使绑定线程的交付完全基于事件投影
  - 移除依赖于机会性会话条目元数据的遗留回退行为

## 为什么不仅仅使用纯插件

如果没有核心更改，当前的插件钩子不足以进行端到端的 ACP 会话路由。

- 来自线程绑定的入站路由首先在核心调度中解析为会话密钥
- 消息钩子即发即弃，无法短路主回复路径
- 插件命令适用于控制操作，但不适用于替换核心的每轮调度流

结果：

- ACP 运行时可以插件化
- ACP 路由分支必须存在于核心中

## 可复用的现有基础

已实现且应保持权威性：

- 线程绑定目标支持 `subagent` 和 `acp`
- 入站线程路由覆盖在正常调度之前通过绑定进行解析
- 通过回复传递中的 Webhook 实现出站线程身份
- 具有 ACP 目标兼容性的 `/focus` 和 `/unfocus` 流程
- 持久化绑定存储，并在启动时恢复
- 在归档、删除、取消聚焦、重置和删除时的解绑生命周期

本计划扩展了该基础，而不是替换它。

## 架构

### 边界模型

核心（必须在 OpenClaw 核心中）：

- 回复管道中的 ACP 会话模式调度分支
- 交付仲裁以避免父级和线程的重复
- ACP 控制面持久化（迁移期间具有 `SessionEntry.acp` 兼容性投影）
- 与会话重置/删除关联的生命周期解绑和运行时分离语义

插件后端 (acpx 实现)：

- ACP 运行时工作器监控
- acpx 进程调用和事件解析
- ACP 命令处理程序 (`/acp ...`) 和操作员用户体验
- 后端特定的配置默认值和诊断

### 运行时所有权模型

- 一个网关进程拥有 ACP 编排状态
- ACP 执行在通过 acpx 后端监控的子进程中运行
- 进程策略是针对每个活动的 ACP 会话密钥长期存在的，而不是针对每条消息

这避免了每次提示时的启动成本，并使取消和重新连接语义保持可靠。

### 核心运行时约定

添加核心 ACP 运行时契约，以便路由代码不依赖于 CLI 细节，并且可以在不更改分发逻辑的情况下切换后端：

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

- 第一个后端：作为插件服务提供的 `AcpxRuntime`
- 核心通过注册表解析运行时，并在没有可用的 ACP 运行时后端时失败并显示明确的操作员错误

### 控制平面数据模型和持久性

长期的真实来源是一个专用的 ACP SQLite 数据库 (WAL 模式)，用于事务性更新和崩溃安全恢复：

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
- 持久化生命周期和运行状态存储于 ACP DB 中，而非通用会话 JSON
- 如果运行时所有者终止，网关将从 ACP DB 重新加载并从检查点恢复

### 路由与交付

入站：

- 将当前线程绑定查找保留为第一步路由
- 如果绑定目标是 ACP 会话，则路由到 ACP 运行时分支而非 `getReplyFromConfig`
- 显式 `/acp steer` 命令使用 `mode: "steer"`

出站：

- ACP 事件流被规范化为 OpenClaw 回复块
- 交付目标通过现有的绑定目标路径解析
- 当绑定线程在该会话轮次中处于活动状态时，将抑制父渠道完成

流式策略：

- 使用合并窗口流式传输部分输出
- 可配置的最小间隔和最大块字节数，以保持在 Discord 速率限制之下
- 最终消息始终在完成或失败时发出

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
  - 使用幂等键将目标运行标记为取消中/已取消

在这些边界之间不允许部分成功。

### 每会话 Actor 模型

`AcpSessionManager` 为每个 ACP 会话键运行一个 Actor：

- Actor 邮箱对 `submit`、`cancel`、`close` 和 `stream` 副作用进行序列化
- Actor 拥有该会话的运行时句柄水合和运行时适配器进程生命周期
- Actor 在任何 Discord 投递之前按顺序写入运行事件 (`seq`)
- Actor 在成功出站发送后更新投递检查点

这消除了跨轮次竞争，并防止了重复或乱序的线程输出。

### 幂等性与投递投影

所有外部 ACP 操作都必须携带幂等键：

- 生成 (spawn) 幂等键
- 提示/引导 (prompt/steer) 幂等键
- 取消幂等键
- 关闭幂等键

投递规则：

- Discord 消息源自 `acp_events` 加上 `acp_delivery_checkpoint`
- 重试从检查点恢复，而无需重新发送已投递的块
- 最终回复发射每次运行通过投影逻辑仅发生一次

### 恢复与自愈

网关启动时：

- 加载非终止 ACP 会话 (`creating`、`idle`、`running`、`cancelling`、`error`)
- 在第一个入站事件上惰性地重新创建 Actor，或在配置的上限下急切地重新创建
- 协调任何 `running` 缺失心跳的运行并标记 `failed` 或通过适配器恢复

在入站 Discord 线程消息上：

- 如果绑定存在但 ACP 会话缺失，则失败关闭并显示明确的过时绑定消息
- 在操作员安全验证后，可选自动解除过期的绑定
- 绝不静默地将过时的 ACP 绑定路由到普通 LLM 路径

### 生命周期和安全

支持的操作：

- 取消当前运行：`/acp cancel`
- 解除线程绑定：`/unfocus`
- 关闭 ACP 会话：`/acp close`
- 通过有效的 TTL 自动关闭空闲会话

TTL 策略：

- 有效 TTL 为以下各项的最小值
  - 全局/会话 TTL
  - Discord 线程绑定 TTL
  - ACP 运行时所有者 TTL

安全控制：

- 按名称将 ACP 代理加入白名单
- 限制 ACP 会话的工作区根目录
- 环境变量白名单透传
- 限制每个账户和全局的最大并发 ACP 会话数
- 针对运行时崩溃的有界重启退避

## 配置界面

核心键：

- `acp.enabled`
- `acp.dispatch.enabled`（独立的 ACP 路由终止开关）
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
- 后端按代理预设
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
  - 类型化的 ACP 事件定义和序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化交付检查点和重放游标
- `src/acp/control-plane/idempotency.ts`
  - 幂等性键保留和响应重放
- `src/acp/control-plane/recovery.ts`
  - 启动时的对账和参与者重载计划

兼容性桥接模块：

- `src/acp/runtime/session-meta.ts`
  - 为了投影到 `SessionEntry.acp` 而暂时保留
  - 必须在迁移切换后停止作为事实来源

### 所需不变量（必须在代码中强制执行）

- ACP 会话创建和线程绑定是原子的（单一事务）
- 每个 ACP 会话参与者同时最多只有一个活跃运行
- 事件 `seq` 在每次运行中严格递增
- 交付检查点永远不会超过最后提交的事件
- 幂等重放为重复的命令键返回先前的成功负载
- 过时/丢失的 ACP 元数据不能路由到正常的非 ACP 回复路径

### 核心接触点

需要更改的核心文件：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP 分支调用 `AcpSessionManager.submit` 和事件投影交付
  - 移除绕过控制平面不变量的直接 ACP 回退
- `src/auto-reply/reply/inbound-context.ts`（或最近的规范化上下文边界）
  - 为 ACP 控制平面公开规范化路由键和幂等性种子
- `src/config/sessions/types.ts`
  - 将 `SessionEntry.acp` 保留为仅投影兼容字段
- `src/gateway/server-methods/sessions.ts`
  - 重置/删除/归档必须调用 ACP 管理器关闭/解绑事务路径
- `src/infra/outbound/bound-delivery-router.ts`
  - 对 ACP 绑定会话轮次强制执行失败关闭目标行为
- `src/discord/monitor/thread-bindings.ts`
  - 添加连接到控制平面查找的 ACP 过时绑定验证辅助程序
- `src/auto-reply/reply/commands-acp.ts`
  - 通过 ACP 管理器 API 路由生成/取消/关闭/引导
- `src/agents/acp-spawn.ts`
  - 停止临时元数据写入；调用 ACP 管理器生成事务
- `src/plugin-sdk/**` 和插件运行时桥接
  - 清晰地公开 ACP 后端注册和健康语义

明确不替换的核心文件：

- `src/discord/monitor/message-handler.preflight.ts`
  - 保持线程绑定覆盖行为作为规范的会话密钥解析器

### ACP 运行时注册表 API

添加核心注册表模块：

- `src/acp/runtime/registry.ts`

必需的 API：

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

- `requireAcpRuntimeBackend` 在不可用时抛出类型化的 ACP 后端缺失错误
- 插件服务在 `start` 上注册后端，并在 `stop` 上取消注册
- 运行时查找是只读的且进程局部的

### acpx 运行时插件契约（实现细节）

对于第一个生产后端 (`extensions/acpx`)，OpenClaw 和 acpx
通过严格的命令契约连接：

- 后端 ID：`acpx`
- 插件服务 ID：`acpx-runtime`
- 运行时句柄编码：`runtimeSessionName = acpx:v1:<base64url(json)>`
- 编码的负载字段：
  - `name` (acpx 命名会话；使用 OpenClaw `sessionKey`)
  - `agent` (acpx 代理命令)
  - `cwd` (会话工作区根目录)
  - `mode` (`persistent | oneshot`)

命令映射：

- 确保会话：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- 提示回合：
  - `acpx --format json --json-strict --cwd <cwd> <agent> prompt --session <name> --file -`
- 取消：
  - `acpx --format json --json-strict --cwd <cwd> <agent> cancel --session <name>`
- 关闭：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions close <name>`

流式传输：

- OpenClaw 从 `acpx --format json --json-strict` 消费 nd 事件
- `text` => `text_delta/output`
- `thought` => `text_delta/thought`
- `tool_call` => `tool_call`
- `done` => `done`
- `error` => `error`

### 会话架构补丁

修补 `src/config/sessions/types.ts` 中的 `SessionEntry`：

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

- 阶段 A：双写 (`acp` 投影 + ACP SQLite 唯一事实源)
- 阶段 B：从 ACP SQLite 进行主要读取，从旧有 `SessionEntry.acp` 进行回退读取
- 阶段 C：迁移命令从有效的旧有条目回填缺失的 ACP 行
- 阶段 D：移除回退读取并仅出于用户体验原因保留投射为可选项
- 旧有字段 (`cliSessionIds`, `claudeCliSessionId`) 保持不变

### 错误约定

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
- 当明确选择 ACP 路由时，切勿静默回退到普通 LLM 路径

### 重复投递仲裁

针对 ACP 绑定轮次的单一路由规则：

- 如果目标 ACP 会话和请求者上下文存在活动的线程绑定，则仅投递到该绑定的线程
- 对于同一轮次，不要同时发送到父渠道
- 如果绑定目标选择不明确，则失败关闭并返回明确错误（不隐式回退到父级）
- 如果不存在活动的绑定，则使用正常的会话目标行为

### 可观测性和操作准备就绪

所需指标：

- 按后端和错误代码统计的 ACP 生成成功/失败计数
- ACP 运行延迟百分位数（队列等待、运行时轮次时间、投递投射时间）
- ACP 参与者重启计数和重启原因
- 陈旧绑定检测计数
- 幂等重放命中率
- Discord 投递重试和速率限制计数器

所需日志：

- 由 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 键控的结构化日志
- 针对会话和运行状态机的显式状态转换日志
- 带有经过脱敏处理的参数和退出摘要的 adapter 命令日志

所需的诊断：

- `/acp sessions` 包括状态、活动运行、最后错误和绑定状态
- `/acp doctor`（或等效项）验证后端注册、存储运行状况和过期绑定

### 配置优先级和有效值

ACP 启用优先级：

- 账户覆盖：`channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 渠道覆盖：`channels.discord.threadBindings.spawnAcpSessions`
- 全局 ACP 网关：`acp.enabled`
- 调度网关：`acp.dispatch.enabled`
- 后端可用性：`acp.backend` 的已注册后端

自动启用行为：

- 当配置了 ACP（`acp.enabled=true`、`acp.dispatch.enabled=true` 或
  `acp.backend=acpx`）时，插件自动启用功能会标记 `plugins.entries.acpx.enabled=true`
  除非其在拒绝列表中或被明确禁用

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 测试映射

单元测试：

- `src/acp/runtime/registry.test.ts`（新增）
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts`（新增）
- `src/infra/outbound/bound-delivery-router.test.ts`（扩展 ACP 失败关闭案例）
- `src/config/sessions/types.test.ts` 或最接近的会话存储测试（ACP 元数据持久化）

集成测试：

- `src/discord/monitor/reply-delivery.test.ts`（绑定的 ACP 投递目标行为）
- `src/discord/monitor/message-handler.preflight*.test.ts`（绑定的 ACP 会话密钥路由连续性）
- 后端包中的 acpx 插件运行时测试（服务注册/启动/停止 + 事件标准化）

Gateway(网关) e2e tests:

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts`（扩展 ACP 重置/删除生命周期覆盖范围）
- 用于生成、消息、流、取消、失去焦点、重启恢复的 ACP 线程轮次往返 e2e 测试

### 推出防护

添加独立的 ACP 调度终止开关：

- `acp.dispatch.enabled` 默认 `false` 用于首次发布
- 禁用时：
  - ACP 生成/聚焦控制命令仍可绑定会话
  - ACP 调度路径不会激活
  - 用户收到明确消息，表明 ACP 调度已被策略禁用
- 在金丝雀验证之后，可以在后续版本中将默认值切换为 `true`

## 命令和用户体验计划

### 新命令

- `/acp spawn <agent-id> [--mode persistent|oneshot] [--thread auto|here|off]`
- `/acp cancel [session]`
- `/acp steer <instruction>`
- `/acp close [session]`
- `/acp sessions`

### 现有命令兼容性

- `/focus <sessionKey>` 继续支持 ACP 目标
- `/unfocus` 保持当前语义
- `/session idle` 和 `/session max-age` 替换旧的 TTL 覆盖

## 分阶段推出

### 阶段 0 ADR 和模式冻结

- 发布关于 ACP 控制平面所有权和适配器边界的 ADR
- 冻结 DB 模式 (`acp_sessions`, `acp_runs`, `acp_bindings`, `acp_events`, `acp_delivery_checkpoint`, `acp_idempotency`)
- 定义稳定的 ACP 错误代码、事件合约和状态转换保护

### 阶段 1 核心中的控制平面基础

- 实现 `AcpSessionManager` 和每会话 actor 运行时
- 实现 ACP SQLite 存储和事务辅助工具
- 实现幂等性存储和重放辅助工具
- 实现事件追加 + 传递检查点模块
- 将生成/取消/关闭 API 连接到管理器，并提供事务保证

### 阶段 2 核心路由和生命周期集成

- 将线程绑定的 ACP 轮次从调度管道路由到 ACP 管理器
- 当 ACP 绑定/会话不变量失败时，强制执行故障关闭路由
- 集成重置/删除/归档/取消聚焦生命周期与 ACP 关闭/解除绑定事务
- 添加陈旧绑定检测和可选的自动解除绑定策略

### 阶段 3 acpx 后端适配器/插件

- 针对运行时合约实现 `acpx` 适配器 (`ensureSession`, `submit`, `stream`, `cancel`, `close`)
- 添加后端健康检查和启动/拆解注册
- 将 acpx nd 事件规范化为 ACP 运行时事件
- 强制执行后端超时、进程监督以及重启/退避策略

### 第 4 阶段 投递预测和渠道用户体验（首选 Discord）

- 实现具有检查点恢复功能的事件驱动渠道预测（首选 Discord）
- 使用速率限制感知的刷新策略合并流式块
- 保证每次运行仅发送一次最终完成消息
- 交付 `/acp spawn`、`/acp cancel`、`/acp steer`、`/acp close`、`/acp sessions`

### 阶段 5 迁移和切换

- 引入对 `SessionEntry.acp` 投影以及 ACP SQLite 单一事实来源的双写
- 添加用于遗留 ACP 元数据行的迁移工具
- 将读取路径切换至 ACP SQLite 主库
- 移除依赖于缺失 `SessionEntry.acp` 的遗留回退路由

### 阶段 6 加固、SLO 和规模限制

- 强制执行并发限制（全局/账户/会话）、队列策略和超时预算
- 添加完整的遥测、仪表板和告警阈值
- 混沌测试崩溃恢复和重复投递抑制
- 发布针对后端中断、数据库损坏和陈旧绑定修复的操作手册

### 完整实施清单

- 核心控制平面模块和测试
- 数据库迁移和回滚计划
- 跨调度和命令的 ACP 管理器 API 集成
- 插件运行时桥接器中的适配器注册接口
- acpx 适配器实现和测试
- 具有检查点重放功能的线程级渠道投递预测逻辑（首选 Discord）
- 用于重置/删除/归档/取消聚焦的生命周期钩子
- 陈旧绑定检测器和面向运维人员的诊断
- 所有新 ACP 键的配置验证和优先级测试
- 操作文档和故障排除手册

## 测试计划

单元测试：

- ACP 数据库事务边界（生成/绑定/入队原子性、取消、关闭）
- 会话和运行的 ACP 状态机转换保护
- 所有 ACP 命令的幂等性保留/重放语义
- 每个会话的 Actor 序列化和队列排序
- acpx 事件解析器和块合并器
- 运行时主管重启和退避策略
- 配置优先级和有效 TTL 计算
- 核心 ACP 路由分支选择，以及后端/会话无效时的失效关闭行为

集成测试：

- 模拟 ACP 适配器进程，用于确定性的流式传输和取消行为
- ACP 管理器 + 具有事务持久化的调度集成
- 线程绑定的入站路由至 ACP 会话密钥
- 线程绑定的出站传递抑制父渠道重复
- 检查点重放在传递失败后恢复，并从最后一个事件继续
- 插件服务注册和 ACP 运行时后端的拆除

Gateway(网关) e2e tests：

- 使用线程生成 ACP，交换多轮提示，然后取消聚焦
- 使用持久化的 ACP 数据库和绑定重启网关，然后继续同一会话
- 多个线程中的并发 ACP 会话无串扰
- 重复命令重试（相同的幂等键）不会创建重复的运行或回复
- 陈旧绑定场景产生显式错误和可选的自动清理行为

## 风险与缓解措施

- 转换期间的重复传递
  - 缓解措施：单一目标解析器和幂等事件检查点
- 负载下的运行时进程剧增
  - 缓解措施：长生命周期的会话所有者 + 并发上限 + 退避
- 插件缺失或配置错误
  - 缓解措施：面向操作员的显式错误和失效关闭的 ACP 路由（不隐式回退到正常会话路径）
- 子代理和 ACP 网关之间的配置混淆
  - 缓解措施：显式的 ACP 密钥和包含有效策略源的命令反馈
- 控制平面存储损坏或迁移错误
  - 缓解措施：WAL 模式、备份/还原挂钩、迁移冒烟测试和只读回退诊断
- Actor 死锁或邮箱饥饿
  - 缓解措施：监视定时器、Actor 健康探针，以及带拒绝遥测的有界邮箱深度

## 验收检查清单

- ACP 会话生成可以在受支持的渠道适配器中创建或绑定线程（目前为 Discord）
- 所有线程消息仅路由至绑定的 ACP 会话
- ACP 输出以流式或批量形式显示在同一线程身份中
- 父渠道中对于绑定轮次没有重复输出
- spawn+bind+initial enqueue 在持久化存储中是原子的
- ACP 命令重试是幂等的，不会重复运行或输出
- cancel、close、unfocus、archive、reset 和 delete 执行确定性清理
- 崩溃重启保留映射并恢复多轮次连续性
- 并发的线程绑定 ACP 会话独立工作
- ACP 后端缺失状态会产生清晰的可操作错误
- 过时的绑定会被检测到并明确显示（可选择安全自动清理）
- 控制平面指标和诊断信息可供操作员使用
- 新的单元、集成和端到端测试覆盖率通过

## 附录：针对当前实现的重构（状态）

这些是非阻塞性的后续工作，旨在当前功能集落地后保持 ACP 路径的可维护性。

### 1) 集中化 ACP 调度策略评估（已完成）

- 通过 `src/acp/policy.ts` 中的共享 ACP 策略辅助程序实现
- 调度、ACP 命令生命周期处理程序和 ACP 生成路径现在使用共享策略逻辑

### 2) 按子命令域拆分 ACP 命令处理程序（已完成）

- `src/auto-reply/reply/commands-acp.ts` 现在是一个精简路由器
- 子命令行为被拆分为：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - `src/auto-reply/reply/commands-acp/shared.ts` 中的共享辅助程序

### 3) 按职责拆分 ACP 会话管理器（已完成）

- 管理器被拆分为：
  - `src/acp/control-plane/manager.ts`（公共外观 + 单例）
  - `src/acp/control-plane/manager.core.ts`（管理器实现）
  - `src/acp/control-plane/manager.types.ts`（管理器类型/依赖）
  - `src/acp/control-plane/manager.utils.ts`（规范化 + 辅助函数）

### 4) 可选的 acpx 运行时适配器清理

- `extensions/acpx/src/runtime.ts` 可以拆分为：
- 进程执行/监督
- nd 事件解析/规范化
- 运行时 API 表面（`submit`、`cancel`、`close` 等）
- 提高可测试性，并使后端行为更容易审计

import zh from "/components/footer/zh.mdx";

<zh />
