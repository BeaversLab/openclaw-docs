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

- [统一运行时流式重构计划](/zh/en/experiments/plans/acp-unified-streaming-refactor)

目标用户体验：

- 用户在会话中生成或聚焦一个 ACP 会话到某个线程
- 该线程中的用户消息路由到绑定的 ACP 会话
- 代理输出流回传到同一线程角色
- 会话可以是持久的或一次性的，并具有显式的清理控制

## 决策总结

长期建议是采用混合架构：

- OpenClaw 核心拥有 ACP 控制平面相关事务
  - 会话身份和元数据
  - 线程绑定和路由决策
  - 交付不变量和重复抑制
  - 生命周期清理和恢复语义
- ACP 运行时后端是可插拔的
  - 第一个后端是 acpx 支持的插件服务
  - 运行时负责 ACP 传输、排队、取消和重连

OpenClaw 不应在核心中重新实现 ACP 传输内部机制。
OpenClaw 不应依赖纯插件拦截路径来进行路由。

## 北极星架构（圣杯）

将 ACP 视为 OpenClaw 中的一等控制平面，并配备可插拔的运行时适配器。

不可协商的不变量：

- 每个 ACP 线程绑定都引用一个有效的 ACP 会话记录
- 每个 ACP 会话都有显式的生命周期状态 (`creating`, `idle`, `running`, `cancelling`, `closed`, `error`)
- 每个 ACP 运行都有显式的运行状态 (`queued`, `running`, `completed`, `failed`, `cancelled`)
- 生成、绑定和初始入队是原子操作
- 命令重试是幂等的（没有重复运行或重复的 Discord 输出）
- 绑定线程频道输出是 ACP 运行事件的投影，绝非临时的副作用

长期所有权模型：

- `AcpSessionManager` 是唯一的 ACP 写入者和协调者
- 管理器首先位于网关进程中；稍后可以在同一接口后移动到专用的 sidecar
- 对于每个 ACP 会话密钥，管理器拥有一个内存中的 Actor（序列化命令执行）
- 适配器（`acpx`，未来的后端）仅是传输/运行时实现

长期持久化模型：

- 将 ACP 控制平面状态移动到 OpenClaw 状态目录下的专用 SQLite 存储（WAL 模式）
- 在迁移期间将 `SessionEntry.acp` 作为兼容性投影保留，而非事实来源
- 以仅追加方式存储 ACP 事件，以支持重放、崩溃恢复和确定性交付

### 交付策略（通往圣杯的桥梁）

- 短期桥梁
  - 保持当前的线程绑定机制和现有的 ACP 配置表面
  - 修复元数据差距错误，并通过单一核心 ACP 分支路由 ACP 轮次
  - 立即添加幂等性密钥和故障关闭路由检查
- 长期切换
  - 将 ACP 事实来源移动到控制平面数据库 + Actor
  - 使绑定线程交付纯粹基于事件投影
  - 移除依赖于机会主义会话条目元数据的遗留回退行为

## 为什么不采用纯插件方式

如果没有核心更改，当前的插件挂钩不足以进行端到端的 ACP 会话路由。

- 来自线程绑定的入站路由首先在核心调度中解析为会话密钥
- 消息挂钩是即发即弃的，无法短路主回复路径
- 插件命令适用于控制操作，但不适用于替换核心每轮调度流程

结果：

- ACP 运行时可以插件化
- ACP 路由分支必须存在于核心中

## 可重用的现有基础

已实现且应保持规范性的内容：

- 线程绑定目标支持 `subagent` 和 `acp`
- 入站线程路由覆盖在正常调度之前通过绑定解析
- 通过 Webhook 在回复传递中实现出站线程身份
- `/focus` 和 `/unfocus` 流程与 ACP 目标兼容
- 持久化绑定存储，并在启动时恢复
- 在归档、删除、取消聚焦、重置和删除时执行解绑生命周期

本计划扩展了该基础，而非取而代之。

## 架构

### 边界模型

核心（必须在 OpenClaw 核心中）：

- 回复管道中的 ACP 会话模式调度分支
- 传递仲裁以避免父消息加线程的重复
- ACP 控制平面持久化（迁移期间包含 `SessionEntry.acp` 兼容性投影）
- 生命周期解绑和运行时分离语义与会话重置/删除绑定

插件后端（acpx 实现）：

- ACP 运行时工作器监督
- acpx 进程调用和事件解析
- ACP 命令处理程序（`/acp ...`）和操作员体验
- 后端特定的配置默认值和诊断

### 运行时所有权模型

- 一个网关进程拥有 ACP 编排状态
- ACP 执行在通过 acpx 后端监督的子进程中运行
- 进程策略是针对每个活动的 ACP 会话密钥长期存在的，而不是针对每条消息

这避免了每次提示时的启动成本，并保持取消和重连语义的可靠性。

### 核心运行时契约

添加核心 ACP 运行时契约，以便路由代码不依赖于 CLI 细节，并且可以在不更改调度逻辑的情况下切换后端：

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
- 核心通过注册表解析运行时，并在没有可用的 ACP 运行时后端时以明确的操作员错误失败

### 控制平面数据模型和持久化

长期的唯一事实来源是专用的 ACP SQLite 数据库（WAL 模式），用于事务性更新和崩溃安全恢复：

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
  - `scope`, `idempotency_key`, `result_json`, `created_at`, 唯一 `(scope, idempotency_key)`

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
- 持久化的生命周期和运行状态存在于 ACP 数据库中，而非通用的会话 JSON
- 如果运行时所有者崩溃，网关将从 ACP 数据库重新加载并从检查点恢复

### 路由和投递

入站：

- 将当前线程绑定查找保留为第一步路由
- 如果绑定的目标是 ACP 会话，则路由到 ACP 运行时分支而不是 `getReplyFromConfig`
- 显式的 `/acp steer` 命令使用 `mode: "steer"`

出站：

- ACP 事件流被规范化为 OpenClaw 回复块
- 投递目标通过现有的绑定目标路径解析
- 当绑定线程在该会话轮次中处于活动状态时，父频道完成信号将被抑制

流式传输策略：

- 使用合并窗口流式传输部分输出
- 可配置的最小间隔和最大块字节数，以保持在 Discord 速率限制之下
- 最终消息始终在完成或失败时发送

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
  - 创建 ACP 会话记录
  - 创建/更新 ACP 线程绑定记录
  - 将初始运行记录加入队列
- 关闭事务
  - 标记会话已关闭
  - 删除/过期绑定记录
  - 写入最终关闭事件
- 取消事务
  - 使用幂等键标记目标运行为取消中/已取消

在这些边界内不允许部分成功。

### 每会话 Actor 模型

`AcpSessionManager` 为每个 ACP 会话密钥运行一个 actor：

- actor 邮箱串行化 `submit`、`cancel`、`close` 和 `stream` 副作用
- actor 拥有该会话的运行时句柄填充和运行时适配器进程生命周期
- actor 在任何 Discord 投递之前按顺序写入运行事件 (`seq`)
- actor 在成功出站发送后更新投递检查点

这消除了跨轮次竞争，并防止了重复或乱序的线程输出。

### 幂等性与投递投影

所有外部 ACP 操作都必须携带幂等键：

- spawn 幂等键
- prompt/steer 幂等键
- cancel 幂等键
- close 幂等键

投递规则：

- Discord 消息源自 `acp_events` 加上 `acp_delivery_checkpoint`
- 重试从检查点恢复，而不重新发送已投递的分块
- 根据投影逻辑，最终回复投递每次运行恰好一次

### 恢复与自愈

网关启动时：

- 加载非终端 ACP 会话 (`creating`、`idle`、`running`、`cancelling`、`error`)
- 在第一个入站事件上延迟重新创建 actor，或在配置上限内主动重新创建
- 协调任何缺失心跳的 `running` 运行，并标记 `failed` 或通过适配器恢复

收到入站 Discord 线程消息时：

- 如果绑定存在但 ACP 会话缺失，则以明确的陈旧绑定消息失败并关闭
- （可选）在操作员安全验证后自动解绑陈旧绑定
- 切勿静默将陈旧的 ACP 绑定路由到普通 LLM 路径

### 生命周期与安全性

支持的操作：

- 取消当前运行：`/acp cancel`
- 解绑线程：`/unfocus`
- 关闭 ACP 会话：`/acp close`
- 通过有效的 TTL 自动关闭空闲会话

TTL 策略：

- 有效 TTL 是以下各项的最小值
  - 全局/会话 TTL
  - Discord 线程绑定 TTL
  - ACP 运行时所有者 TTL

安全控制：

- 按名称将 ACP 代理加入允许列表
- 限制 ACP 会话的工作区根目录
- 环境变量允许列表透传
- 限制每个账户和全局的最大并发 ACP 会话数
- 运行时崩溃的有界重启退避

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
- `acp.controlPlane.store`（`sqlite` 默认）
- `acp.controlPlane.storePath`
- `acp.controlPlane.recovery.eagerActors`
- `acp.controlPlane.recovery.reconcileRunningAfterMs`
- `acp.controlPlane.checkpoint.flushEveryEvents`
- `acp.controlPlane.checkpoint.flushEveryMs`
- `acp.idempotency.ttlHours`
- `channels.discord.threadBindings.spawnAcpSessions`

插件/后端键（acpx 插件部分）：

- 后端命令/路径覆盖
- 后端环境允许列表
- 后端每个代理的预设
- 后端启动/停止超时
- 后端每个会话的最大运行中运行数

## 实现规范

### 控制平面模块（新）

在核心中添加专用的 ACP 控制平面模块：

- `src/acp/control-plane/manager.ts`
  - 拥有 ACP 参与者、生命周期转换、命令序列化
- `src/acp/control-plane/store.ts`
  - SQLite 架构管理、事务、查询辅助程序
- `src/acp/control-plane/events.ts`
  - 类型化的 ACP 事件定义和序列化
- `src/acp/control-plane/checkpoint.ts`
  - 持久化传递检查点和重放游标
- `src/acp/control-plane/idempotency.ts`
  - 幂等键保留和响应重放
- `src/acp/control-plane/recovery.ts`
  - 启动时协调和参与者重 hydration 计划

兼容性桥接模块：

- `src/acp/runtime/session-meta.ts`
  - 为投影到 `SessionEntry.acp` 而暂时保留
  - 必须在迁移切换后停止作为事实来源

### 必需的不变量（必须在代码中强制执行）

- ACP 会话创建和线程绑定是原子的（单一事务）
- 每个 ACP 会话参与者一次最多有一个活跃的运行
- 事件 `seq` 在每次运行中严格递增
- 传递检查点永远不会超过最后提交的事件
- 幂等重放为重复的命令键返回之前成功的负载
- 过时/缺失的 ACP 元数据无法路由到正常的非 ACP 回复路径

### 核心接触点

需要更改的核心文件：

- `src/auto-reply/reply/dispatch-from-config.ts`
  - ACP 分支调用 `AcpSessionManager.submit` 和事件投影传递
  - 移除绕过控制平面不变量的直接 ACP 回退
- `src/auto-reply/reply/inbound-context.ts`（或最近的标准化上下文边界）
  - 为 ACP 控制平面公开标准化的路由键和幂等种子
- `src/config/sessions/types.ts`
  - 将 `SessionEntry.acp` 保留为仅投影兼容性字段
- `src/gateway/server-methods/sessions.ts`
  - 重置/删除/归档必须调用 ACP 管理器关闭/解绑事务路径
- `src/infra/outbound/bound-delivery-router.ts`
  - 对 ACP 绑定的会话轮次强制执行失败关闭的目标行为
- `src/discord/monitor/thread-bindings.ts`
  - 添加连接到控制平面查找的 ACP 陈旧绑定验证助手
- `src/auto-reply/reply/commands-acp.ts`
  - 通过 ACP 管理器 API 路由生成/取消/关闭/引导操作
- `src/agents/acp-spawn.ts`
  - 停止临时元数据写入；调用 ACP 管理器生成事务
- `src/plugin-sdk/**` 和插件运行时桥接
  - 干净地公开 ACP 后端注册和健康语义

明确不替换的核心文件：

- `src/discord/monitor/message-handler.preflight.ts`
  - 将线程绑定覆盖行为保留为规范会话键解析器

### ACP 运行时注册表 API

添加核心注册表模块：

- `src/acp/runtime/registry.ts`

必需 API：

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
- 运行时查找是只读的和进程局部的

### acpx 运行时插件契约（实现细节）

对于第一个生产后端（`extensions/acpx`），OpenClaw 和 acpx
通过严格的命令契约连接：

- 后端 id：`acpx`
- 插件服务 ID：`acpx-runtime`
- 运行时句柄编码：`runtimeSessionName = acpx:v1:<base64url(json)>`
- 编码负载字段：
  - `name` (acpx 命名会话；使用 OpenClaw `sessionKey`)
  - `agent` (acpx 代理命令)
  - `cwd` (会话工作区根目录)
  - `mode` (`persistent | oneshot`)

命令映射：

- 确保会话：
  - `acpx --format json --json-strict --cwd <cwd> <agent> sessions ensure --name <name>`
- 提示轮次：
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

### 会话模式修补

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

- 阶段 A：双写 (`acp` 投影 + ACP SQLite 作为唯一真实源)
- 阶段 B：从 ACP SQLite 主读取，从旧版 `SessionEntry.acp` 回退读取
- 阶段 C：迁移命令从有效的旧版条目回填缺失的 ACP 行
- 阶段 D：移除回退读取，并保持投影为仅用于 UX 的可选项
- 旧版字段 (`cliSessionIds`, `claudeCliSessionId`) 保持不变

### 错误约定

添加稳定的 ACP 错误代码和面向用户的消息：

- `ACP_BACKEND_MISSING`
  - 消息：`ACP runtime backend is not configured. Install and enable the acpx runtime plugin.`
- `ACP_BACKEND_UNAVAILABLE`
  - 消息：`ACP runtime backend is currently unavailable. Try again in a moment.`
- `ACP_SESSION_INIT_FAILED`
  - 消息：`Could not initialize ACP session runtime.`
- `ACP_TURN_FAILED`
  - 消息：`ACP turn failed before completion.`

规则：

- 在线程内返回可操作的用户安全消息
- 仅在运行时日志中记录详细的后端/系统错误
- 当明确选择了 ACP 路由时，切勿静默回退到普通 LLM 路径

### 重复交付仲裁

针对 ACP 绑定轮次的单一路由规则：

- 如果目标 ACP 会话和请求者上下文存在活跃的线程绑定，则仅投递到该绑定线程
- 不要将同一轮次发送到父频道
- 如果绑定的目标选择不明确，则以显式错误失败关闭（无隐式父级回退）
- 如果不存在活动绑定，则使用正常的会话目标行为

### 可观测性和运行就绪性

所需指标：

- 按后端和错误代码统计的 ACP 生成成功/失败计数
- ACP 运行延迟百分位数（队列等待时间、运行轮次时间、交付投射时间）
- ACP Actor 重启计数和重启原因
- 过期绑定检测计数
- 幂等重放命中率
- Discord 交付重试和速率限制计数器

所需日志：

- 由 `sessionKey`、`runId`、`backend`、`threadId`、`idempotencyKey` 键控的结构化日志
- 会话和运行状态机的显式状态转换日志
- 带有可安全编辑参数和退出摘要的适配器命令日志

所需诊断：

- `/acp sessions` 包括状态、活动运行、上次错误和绑定状态
- `/acp doctor`（或同等项）验证后端注册、存储运行状况和过期绑定

### 配置优先级和有效值

ACP 启用优先级：

- 账户覆盖：`channels.discord.accounts.<id>.threadBindings.spawnAcpSessions`
- 频道覆盖：`channels.discord.threadBindings.spawnAcpSessions`
- 全局 ACP 门控：`acp.enabled`
- 分发门控：`acp.dispatch.enabled`
- 后端可用性：`acp.backend` 的已注册后端

自动启用行为：

- 当配置了 ACP（`acp.enabled=true`、`acp.dispatch.enabled=true` 或
  `acp.backend=acpx`）时，插件自动启用会标记 `plugins.entries.acpx.enabled=true`
  除非被列入黑名单或显式禁用

TTL 有效值：

- `min(session ttl, discord thread binding ttl, acp runtime ttl)`

### 测试映射

单元测试：

- `src/acp/runtime/registry.test.ts`（新）
- `src/auto-reply/reply/dispatch-from-config.acp.test.ts`（新）
- `src/infra/outbound/bound-delivery-router.test.ts`（扩展 ACP 失败关闭场景）
- `src/config/sessions/types.test.ts` 或最近的会话存储测试（ACP 元数据持久化）

集成测试：

- `src/discord/monitor/reply-delivery.test.ts`（绑定的 ACP 交付目标行为）
- `src/discord/monitor/message-handler.preflight*.test.ts`（绑定的 ACP 会话密钥路由连续性）
- 后端包中的 acpx 插件运行时测试（服务注册/启动/停止 + 事件规范化）

网关端到端测试：

- `src/gateway/server.sessions.gateway-server-sessions-a.e2e.test.ts` （扩展 ACP 重置/删除生命周期覆盖范围）
- ACP 线程轮次端到端往返测试，涵盖生成、消息、流、取消、失焦、重启恢复

### 发布防护

添加独立的 ACP 调度终止开关：

- `acp.dispatch.enabled` 默认 `false` 用于首次发布
- 禁用时：
  - ACP 生成/聚焦控制命令仍可能绑定会话
  - ACP 调度路径不会激活
  - 用户收到明确消息，表明 ACP 调度已被策略禁用
- 金丝雀验证后，在后续版本中默认值可以翻转为 `true`

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

### 阶段 0 ADR 和模式冻结

- 发布关于 ACP 控制平面所有权和适配器边界的 ADR
- 冻结数据库模式（`acp_sessions`、`acp_runs`、`acp_bindings`、`acp_events`、`acp_delivery_checkpoint`、`acp_idempotency`）
- 定义稳定的 ACP 错误代码、事件合约和状态转换防护

### 阶段 1 核心中的控制平面基础

- 实现 `AcpSessionManager` 和每会话 actor 运行时
- 实现 ACP SQLite 存储和事务辅助工具
- 实现幂等性存储和重放辅助工具
- 实现事件追加 + 交付检查点模块
- 将生成/取消/关闭 API 连接到管理器，并提供事务保证

### 阶段 2 核心路由和生命周期集成

- 将来自调度管道的线程绑定 ACP 轮次路由到 ACP 管理器
- 当 ACP 绑定/会话不变量失效时，强制执行失效关闭路由
- 将重置/删除/归档/失焦生命周期与 ACP 关闭/解绑事务集成
- 添加陈旧绑定检测和可选的自动解绑策略

### 阶段 3 acpx 后端适配器/插件

- 针对运行时契约实现 `acpx` 适配器（`ensureSession`，`submit`，`stream`，`cancel`，`close`）
- 添加后端健康检查以及启动/拆除（teardown）注册
- 将 acpx nd 事件规范化为 ACP 运行时事件
- 强制执行后端超时、进程监督以及重启/退避（backoff）策略

### 第 4 阶段 投放投影与频道 UX（以 Discord 为首）

- 实现带有检查点恢复功能的事件驱动频道投影（以 Discord 为首）
- 使用具备速率限制感知的刷新（flush）策略合并流式分块
- 保证每次运行仅发送一次最终完成消息
- 发布 `/acp spawn`，`/acp cancel`，`/acp steer`，`/acp close`，`/acp sessions`

### 第 5 阶段 迁移与切换

- 引入对 `SessionEntry.acp` 投影及 ACP SQLite 单一事实源的双写
- 为遗留 ACP 元数据行添加迁移工具
- 将读取路径切换至 ACP SQLite 主库
- 移除依赖于缺失 `SessionEntry.acp` 的遗留回退路由

### 第 6 阶段 加固、SLO 与扩展限制

- 强制执行并发限制（全局/账户/会话）、队列策略以及超时预算
- 添加完整的遥测、仪表盘和告警阈值
- 混沌测试崩溃恢复和重复投递抑制
- 发布针对后端中断、数据库损坏和过时绑定（stale-binding）修复的运行手册

### 完整实施检查清单

- 核心控制面模块和测试
- 数据库迁移和回滚计划
- 跨越分发和命令的 ACP 管理器 API 集成
- 插件运行时桥接器中的适配器注册接口
- acpx 适配器实现和测试
- 支持线程的频道投放投影逻辑，具备检查点重放功能（以 Discord 为首）
- 针对重置/删除/归档/取消聚焦的生命周期钩子
- 过时绑定（stale-binding）检测器和面向运维人员的诊断功能
- 所有新 ACP 键的配置验证和优先级测试
- 操作文档和故障排除运行手册

## 测试计划

单元测试：

- ACP DB 事务边界（生成/绑定/入队原子性、取消、关闭）
- ACP 状态机转换守卫用于会话和运行
- 所有 ACP 命令的幂等性保留/重放语义
- 每个会话的 Actor 序列化和队列排序
- acpx 事件解析器和块合并器
- 运行时监督程序重启和退避策略
- 配置优先级和有效 TTL 计算
- 核心 ACP 路由分支选择，以及当后端/会话无效时的失效关闭行为

集成测试：

- 用于确定性流式传输和取消行为的伪造 ACP 适配器进程
- ACP 管理器 + 具有事务持久性的调度集成
- 线程绑定的入站路由到 ACP 会话密钥
- 线程绑定的出站交付抑制父频道重复
- 检查点重放在交付失败后恢复，并从最后一个事件继续
- 插件服务注册和 ACP 运行时后端的拆除

网关端到端测试：

- 通过线程生成 ACP，交换多轮提示，取消聚焦
- 使用持久化的 ACP 数据库和绑定重启网关，然后继续同一会话
- 多个线程中的并发 ACP 会话没有交叉串扰
- 重复命令重试（相同的幂等性密钥）不会创建重复的运行或回复
- 过时绑定场景产生显式错误和可选的自动清理行为

## 风险和缓解措施

- 转换期间的重复交付
  - 缓解措施：单一目标解析器和幂等事件检查点
- 负载下的运行时进程流失
  - 缓解措施：长生命周期的每个会话所有者 + 并发上限 + 退避
- 插件缺失或配置错误
  - 缓解措施：面向操作员的显式错误和失效关闭 ACP 路由（无隐式回退到正常会话路径）
- 子代理和 ACP 网关之间的配置混淆
  - 缓解措施：显式 ACP 密钥和包含有效策略源的命令反馈
- 控制平面存储损坏或迁移错误
  - 缓解措施：WAL 模式、备份/还原挂钩、迁移冒烟测试和只读回退诊断
- Actor 死锁或邮箱饥饿
  - 缓解措施：监视计时器、Actor 健康探针，以及具有拒绝遥测功能的受限邮箱深度

## 验收清单

- ACP 会话生成可以在支持的通道适配器（目前为 Discord）中创建或绑定线程
- 所有线程消息仅路由到绑定的 ACP 会话
- ACP 输出以流式传输或批处理方式出现在同一线程身份中
- 在父通道中针对绑定回合没有重复输出
- 生成、绑定和初始入队在持久化存储中是原子性的
- ACP 命令重试是幂等的，不会重复运行或输出
- 取消、关闭、取消聚焦、归档、重置和删除执行确定性的清理
- 崩溃重启保留映射并恢复多轮连续性
- 并发的线程绑定 ACP 会话独立工作
- ACP 后端缺少状态会产生清晰的可操作性错误
- 过时的绑定会被检测到并明确显示（可选择安全地自动清理）
- 控制平面指标和诊断信息可供操作员使用
- 新的单元测试、集成测试和端到端测试覆盖通过

## 附录：针对当前实现的目标重构（状态）

这些是非阻塞的后续工作，旨在当前功能集落地后保持 ACP 路径的可维护性。

### 1) 集中化 ACP 分发策略评估（已完成）

- 通过 `src/acp/policy.ts` 中的共享 ACP 策略助手实现
- 分发、ACP 命令生命周期处理程序和 ACP 生成路径现在使用共享策略逻辑

### 2) 按子命令域拆分 ACP 命令处理程序（已完成）

- `src/auto-reply/reply/commands-acp.ts` 现在是一个精简的路由器
- 子命令行为被拆分为：
  - `src/auto-reply/reply/commands-acp/lifecycle.ts`
  - `src/auto-reply/reply/commands-acp/runtime-options.ts`
  - `src/auto-reply/reply/commands-acp/diagnostics.ts`
  - shared helpers in `src/auto-reply/reply/commands-acp/shared.ts`

### 3) 按职责拆分 ACP 会话管理器（已完成）

- 管理器被拆分为：
  - `src/acp/control-plane/manager.ts` (public facade + singleton)
  - `src/acp/control-plane/manager.core.ts` (manager implementation)
  - `src/acp/control-plane/manager.types.ts` (manager types/deps)
  - `src/acp/control-plane/manager.utils.ts` (normalization + helper functions)

### 4) 可选的 acpx 运行时适配器清理

- `extensions/acpx/src/runtime.ts` 可以拆分为：
- 进程执行/监督
- nd 事件解析/规范化
- 运行时 API 表面 (`submit`, `cancel`, `close` 等)
- 提高可测试性，并使后端行为更易于审计

import zh from '/components/footer/zh.mdx';

<zh />
