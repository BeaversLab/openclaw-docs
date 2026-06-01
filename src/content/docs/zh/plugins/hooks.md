---
summary: "Gateway(网关)插件钩子：拦截代理、工具、消息、会话和 Gateway(网关) 生命周期事件"
title: "Plugin hooks"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Plugin hooks are in-process extension points for OpenClaw plugins. Use them
when a plugin needs to inspect or change agent runs, 工具 calls, message flow,
会话 lifecycle, subagent routing, installs, or Gateway(网关) startup.

如果您需要用于命令和Gateway(网关)事件的小型操作员安装的 `HOOK.md`Gateway(网关) 脚本（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`），请改用 [内部钩子](/zh/automation/hooks)。

## 快速开始

从您的插件入口点，使用 `api.on(...)` 注册类型化的插件钩子：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "Tool Preflight",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        if (event.toolName !== "web_search") {
          return;
        }

        return {
          requireApproval: {
            title: "Run web search",
            description: `Allow search query: ${String(event.params.query ?? "")}`,
            severity: "info",
            timeoutMs: 60_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

钩子处理程序按 `priority` 降序顺序依次运行。相同优先级的钩子保持注册顺序。

`api.on(name, handler, opts?)` 接受：

- `priority` - 处理程序排序（数值越高越先运行）。
- `timeoutMs` - 可选的每个钩子的预算。设置后，如果在预算耗尽后，钩子运行器将中止该处理程序并继续下一个处理程序，而不是让缓慢的设置或召回工作消耗调用方配置的模型超时时间。省略它以使用钩子运行器通用的默认观察/决策超时时间。

操作员也可以在不修改插件代码的情况下设置钩子预算：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` 会覆盖 `hooks.timeoutMs`，后者会覆盖插件编写的 `api.on(..., { timeoutMs })` 值。每个配置的值必须是不得超过 600000 毫秒的正整数。对于已知缓慢的钩子，首选针对每个钩子的覆盖设置，以免一个插件在各处都获得更长的预算。

每个钩子都会接收 `event.context.pluginConfig`OpenClaw，即注册该处理程序的插件的已解析配置。将其用于需要当前插件选项的钩子决策；OpenClaw 会为每个处理程序注入它，而不会改变其他插件看到的共享事件对象。

## 钩子目录

钩子按其扩展的表面进行分组。**粗体**名称接受决策结果（阻止、取消、覆盖或要求批准）；所有其他名称仅用于观察。

**Agent turn（代理回合）**

- `before_model_resolve` - 在会话消息加载之前覆盖提供商或模型
- `agent_turn_prepare` - 在提示词钩子之前消费排队的插件轮次注入并添加同轮次上下文
- `before_prompt_build` - 在模型调用之前添加动态上下文或系统提示词文本
- `before_agent_start` - 仅兼容性的组合阶段；优先使用上述两个钩子
- **`before_agent_run`** - 在模型提交之前检查最终提示词和会话消息，并可选择阻止运行
- **`before_agent_reply`** - 使用合成回复或静默跳过模型轮次
- **`before_agent_finalize`** - 检查自然最终答案并请求再一次模型传递
- `agent_end` - 观察最终消息、成功状态和运行持续时间
- `heartbeat_prompt_contribution` - 为后台监控和生命周期插件添加仅心跳上下文

**对话观察**

- `model_call_started` / `model_call_ended` - 观察经过清理的提供商/模型调用元数据、计时、结果和受限的请求 ID 哈希，不包含提示词或响应内容
- `llm_input` - 观察提供商输入（系统提示词、提示词、历史记录）
- `llm_output` - 观察提供商输出、使用情况以及已解析的 `contextTokenBudget`（如果有）

**工具**

- **`before_tool_call`** - 重写工具参数、阻止执行或要求审批
- `after_tool_call` - 观察工具结果、错误和持续时间
- **`tool_result_persist`** - 重写由工具结果生成的助手消息
- **`before_message_write`** - 检查或阻止正在进行的消息写入（罕见）

**消息和传递**

- **`inbound_claim`** - 在代理路由之前认领入站消息（合成回复）
- `message_received` — 观察入站内容、发送者、线程和元数据
- **`message_sending`** — 重写出站内容或取消投递
- **`reply_payload_sending`** — 在投递之前变更或取消标准化的回复负载
- `message_sent` — 观察出站投递成功或失败
- **`before_dispatch`** - 在移交给渠道之前检查或重写出站调度
- **`reply_dispatch`** - 参与最终的回复调度管道

**会话与压缩**

- `session_start` / `session_end` - 跟踪会话生命周期边界。事件的 `reason` 为 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。当进程在会话仍处于活动状态时停止或重启时，`shutdown` 和 `restart` 值会从 Gateway(网关) 关闭终结器中触发，以便下游插件（如内存或记录存储）可以终结那些在重启后原本会处于开放状态的幽灵行。终结器是有界的，因此缓慢的插件无法阻塞 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 观察或注释压缩周期
- `before_reset` - 观察会话重置事件（`/reset`，程序化重置）

**子代理**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - 协调子代理路由和完成交付

**生命周期**

- `gateway_start` / `gateway_stop`Gateway(网关) - 随 Gateway(网关) 启动或停止插件拥有的服务
- `deactivate` - `gateway_stop` 的已弃用兼容别名；在新插件中请使用 `gateway_stop`
- `cron_changed` - 观察 Gateway(网关) 拥有的 cron 生命周期变更（已添加、已更新、已删除、已开始、已完成、已调度）
- **`before_install`** - 检查技能或插件安装扫描并可选择阻止

## 调试运行时钩子

当插件需要为代理回合切换提供商或模型时，请使用 `before_model_resolve`。它在模型解析之前运行；`llm_output` 仅在模型尝试生成助手输出后运行。

若要验证有效的会话模型，请检查运行时注册，然后使用 `openclaw sessions`Gateway(网关)Gateway(网关) 或 Gateway(网关) 会话/status 表面。调试提供商负载时，请使用 `--raw-stream` 和 `--raw-stream-path <path>` 启动 Gateway(网关)；这些标志会将原始模型流事件写入 l 文件。

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.toolKind` 和 `event.toolInputKind`，针对故意共享名称的工具的主机权威区分符；例如，外部代码模式 `exec` 调用使用 `toolKind: "code_mode_exec"` 并在已知输入语言时包含 `toolInputKind: "javascript" | "typescript"`
- 可选的 `event.derivedPaths`，包含针对知名工具封装（例如 `apply_patch`）的尽力而为的主机派生目标路径提示；如果存在，这些路径可能不完整，或者可能过度近似工具实际接触的内容（例如，对于格式错误或部分输入）
- 可选的 `event.runId`
- 可选 `event.toolCallId`
- 上下文字段，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驱动的运行中设置）、`ctx.toolKind`、
  `ctx.toolInputKind` 以及诊断 `ctx.trace`

它可以返回：

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    allowedDecisions?: Array<"allow-once" | "allow-always" | "deny">;
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

类型化生命周期钩子的 Hook 守卫行为：

- `block: true` 是终止性的，并跳过低优先级的处理程序。
- `block: false` 被视为未做决定。
- `params` 重写用于执行的工具参数。
- `requireApproval` 暂停代理运行并通过插件
  审批询问用户。`/approve` 命令可以批准 exec 和插件审批。
  在 Codex app-server 报告模式原生 `PreToolUse` 中继中，这将推迟
  到匹配的 app-server 审批请求；请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime#hook-boundaries)。
- 在更高优先级的 hook
  请求审批后，低优先级的 `block: true` 仍可以阻止。
- `onResolution` 接收已解析的审批决策 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

有关
审批路由、决策行为以及何时使用 `requireApproval` 而不是
可选工具或 exec 审批的信息，请参阅 [Plugin permission requests](/zh/plugins/plugin-permission-requests)。

需要主机级别策略的捆绑插件可以使用 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。
这些策略在普通 `before_tool_call` hook
和外部插件决策之前运行。请仅将它们用于主机信任的关卡，例如工作区策略、预算执行或
保留的工作流安全。外部插件应使用普通的 `before_tool_call`
hook。

### 工具结果持久化

工具结果可以包含用于 UI 渲染、诊断、媒体路由或插件自有元数据的结构化 `details`。请将 `details` 视为运行时元数据，而非提示词内容：

- OpenClaw 会在提供商重放和压缩输入之前剥离 OpenClaw`toolResult.details`，以防止元数据成为模型上下文。
- 持久化的会话条目仅保留有限的 `details`。过多的细节将被替换为紧凑的摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终持久化上限之前运行。Hook 仍应保持返回的 `details` 较小，并避免仅将提示词相关的文本放在 `details` 中；请将模型可见的工具输出放在 `content` 中。

## 提示词和模型 Hook

为新插件使用特定阶段的 Hook：

- `before_model_resolve`：仅接收当前提示词和附件元数据。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收当前提示词、准备好的会话消息以及为此会话排空的任何仅一次队列注入。返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收当前提示词和会话消息。返回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：仅在心跳轮次运行并返回 `prependContext` 或 `appendContext`。它适用于需要总结当前状态而不改变用户发起轮次的后台监控程序。

`before_agent_start` 出于兼容性原因保留。优先使用上述明确的 Hook，以便您的插件不依赖于传统的组合阶段。

`before_agent_run` 在提示词构建之后、任何模型输入之前运行，包括提示词本地图像加载和 `llm_input` 观察。它接收当前用户输入作为 `prompt`，以及 `messages` 中已加载的会话历史记录和当前系统提示词。返回 `{ outcome: "block", reason, message? }` 以在模型读取提示词之前停止运行。`reason` 是内部的；`message` 是面向用户的替代品。唯一支持的结果是 `pass` 和 `block`；不支持的决策形状将以失败方式关闭。

当运行被阻止时，OpenClaw 仅在 OpenClaw`message.content` 中存储替换文本以及非敏感的阻止元数据（例如阻止插件 ID 和时间戳）。原始用户文本不会保留在转录或未来上下文中。内部阻止原因被视为敏感信息，并从转录、历史记录、广播、日志和诊断有效负载中排除。可观测性应使用清理后的字段，例如阻止者 ID、结果、时间戳或安全类别。

当 OpenClaw 可以识别活动运行时，`before_agent_start` 和 `agent_end` 包含 `event.runId`OpenClaw。相同的值也可以在 `ctx.runId` 上获取。Cron 驱动的运行还会公开 `ctx.jobId`（原始 cron 作业 ID），以便插件挂钩可以将指标、副作用或状态范围限定为特定的计划作业。

对于渠道发起的运行，`ctx.messageProvider` 是提供商表面（例如 `discord` 或 `telegram`），而 `ctx.channelId`OpenClaw 是对话目标标识符，当 OpenClaw 可以从会话密钥或传递元数据中派生标识符时。

`agent_end`Gateway(网关) 是一个观察钩子。Gateway(网关) 和持久化 harness 路径在轮次结束后以“即发即弃”的方式运行它，而短期的单次 CLI 路径则会在进程清理前等待钩子 promise，以便受信任的插件可以刷新终端可观测性或捕获状态。钩子运行器应用 30 秒超时，以防止卡住的插件或嵌入端点使钩子 promise 永远处于挂起状态。超时会被记录，OpenClaw 会继续运行；除非插件也使用了其自己的中止信号，否则它不会取消插件拥有的网络工作。

使用 `model_call_started` 和 `model_call_ended` 处理不应接收原始提示词、历史记录、响应、标头、请求正文或提供商请求 ID 的提供商调用遥测。这些钩子包括稳定的元数据，如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终端 `durationMs`/`outcome`，以及当 OpenClaw 可以推导出有界的提供商请求 ID 哈希时的 `upstreamRequestIdHash`。当运行时解析了上下文窗口元数据时，钩子事件和上下文还包括 `contextTokenBudget`，即在 模型/配置/代理 限制后的有效 token 预算，以及在应用了更低限制时的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 仅在 harness 即将接受自然的最终助手回答时运行。它不是 `/stop` 取消路径，并且在用户中止轮次时不会运行。返回 `{ action: "revise", reason }` 以请求 harness 在最终确定之前再进行一次模型传递，返回 `{ action: "finalize", reason? }` 以强制最终确定，或者省略结果以继续。Codex 原生 `Stop` 钩子被作为 OpenClaw `before_agent_finalize` 决策转发到此钩子中。

当返回 `action: "revise"` 时，插件可以包含 `retry` 元数据，以使额外的模型传递有界且可重放安全：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 会附加到发送给 harness 的修订原因中。`idempotencyKey` 允许主机在等效的完成决策中统计同一插件请求的重试次数，而 `maxAttempts` 则限制了主机在继续执行自然最终答案之前允许的额外传递次数。

需要原始对话钩子（`before_model_resolve`、
`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、
`agent_end` 或 `before_agent_run`）的非捆绑插件必须设置：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 为每个插件禁用提示变异钩子和持久的下一轮注入。

### 会话扩展和下一轮注入

工作流插件可以使用 `api.registerSessionExtension(...)`Gateway(网关) 持久化小型兼容 JSON 的会话状态，并通过 Gateway
`sessions.pluginPatch` 方法进行更新。会话行通过 `pluginExtensions` 投影已注册的扩展状态，允许控制 UI 和其他客户端渲染
插件拥有的状态，而无需了解插件内部细节。

当插件需要持久化上下文以恰好到达下一个模型轮次时，请使用 `api.enqueueNextTurnInjection(...)`OpenClaw。OpenClaw 在提示钩子之前排空队列中的注入，丢弃过期的注入，并按插件通过 `idempotencyKey` 进行去重。这是批准恢复、策略摘要、
后台监控增量和命令延续的正确接口，它们应在下一轮对模型可见，但不应成为永久性的系统提示文本。

清理语义是契约的一部分。会话扩展清理和运行时生命周期清理回调接收 `reset`、`delete`、`disable` 或
`restart`。宿主会移除所属插件的持久化会话扩展状态和待处理的下一轮注入，用于重置/删除/禁用；重启会保留持久化的会话状态，同时清理回调允许插件释放调度器作业、运行上下文以及旧运行代系的其他带外资源。

## 消息钩子

使用消息钩子进行渠道级别的路由和传递策略：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、
  `senderId`、可选的运行/会话关联以及元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `reply_payload_sending`：重写规范化的 `ReplyPayload` 对象（包括
  `presentation`、`delivery`、媒体引用和文本）或返回 `{ cancel: true }`。
- `message_sent`：观察最终的成功或失败。

对于仅音频的 TTS 回复，即使渠道负载中没有可见文本/字幕，`content` 也可能包含隐藏的口语转录文本。重写该
`content` 仅更新钩子可见的转录文本；它不会作为媒体字幕渲染。

消息钩子上下文在可用时公开稳定的关联字段：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在读取旧版元数据之前，请优先使用这些一等字段。

在使用特定于渠道的元数据之前，请优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- `message_sending` 搭配 `cancel: true` 是终局性的。
- `message_sending` 搭配 `cancel: false` 被视为未做决定。
- 重写后的 `content` 会继续传递给优先级较低的钩子，除非后续钩子取消传递。
- `reply_payload_sending` 在有效负载规范化之后、渠道传递之前运行，包括路由回原始渠道的回复。处理程序按顺序运行，每个处理程序都会看到由高优先级处理程序生成的最新有效负载。
- `reply_payload_sending` 有效负载不暴露运行时信任标记（如 `trustedLocalMedia`）；插件可以编辑有效负载的形状，但不能授予本地媒体信任。
- `message_sending` 可以返回 `cancelReason` 和有界的 `metadata` 以进行取消。新的消息生命周期 API 将其作为原因为 `cancelled_by_message_sending_hook` 的被抑制传递结果公开；为了兼容性，传统的直接传递仍返回空结果数组。
- `message_sent` 仅用于观察。处理程序失败会被记录，且不会改变传递结果。

## 安装钩子

`before_install` 在内置的技能和插件安装扫描之后运行。返回额外的发现结果或 `{ block: true, blockReason }` 以停止安装。

`block: true` 是终局性的。`block: false` 被视为未做决定。

## Gateway(网关) 生命周期

对于需要 Gateway(网关) 拥有状态的插件服务，请使用 `gateway_start`Gateway(网关)。上下文公开了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()`，用于 cron 检查和更新。使用 `gateway_stop` 清理长时间运行的资源。

不要依赖内部的 `gateway:startup` 钩子来处理插件拥有的运行时服务。

`cron_changed` 在网关拥有的 cron 生命周期事件时触发，其类型化事件负载涵盖 `added`、`updated`、`removed`、`started`、`finished`
和 `scheduled` 原因。该事件携带 `PluginHookGatewayCronJob`
快照（包括 `state.nextRunAtMs`、`state.lastRunStatus` 和
`state.lastError`，如果存在的话）以及 `PluginHookGatewayCronDeliveryStatus`
`not-requested` | `delivered` | `not-delivered` | `unknown`。移除
事件仍然携带已删除的作业快照，以便外部调度程序协调状态。在同步外部唤醒调度程序时，请使用运行时上下文中的 `ctx.getCron?.()` 和 `ctx.config`OpenClaw，并保持 OpenClaw 作为到期检查和执行的单一事实来源。

## 即将弃用的功能

少数与钩子相关的接口已被弃用但仍受支持。请在下一个主要版本发布之前进行迁移：

- **明文渠道信封** 位于 `inbound_claim` 和 `message_received`
  处理程序中。请读取 `BodyForAgent` 和结构化用户上下文块，
  而不是解析扁平的信封文本。请参阅
  [明文渠道信封 → BodyForAgent](/zh/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 保留以实现兼容性。新插件应使用
  `before_model_resolve` 和 `before_prompt_build`，而不是使用组合
  阶段。
- **`deactivate`** 在 2026-08-16 之前仍然作为一个已弃用的清理兼容性别名保留。
  新插件应使用 `gateway_stop`。
- **`before_tool_call` 中的 `onResolution`** 现在使用类型化
  `PluginApprovalResolution` 联合（`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`），而不是自由格式的 `string`。

有关完整列表——内存功能注册、提供商思考配置文件、外部身份验证提供商、提供商发现类型、任务运行时访问器以及 `command-auth` → `command-status` 重命名——请参阅[插件 SDK 迁移 → 即将弃用的功能](/zh/plugins/sdk-migration#active-deprecations)。

## 相关

- [插件 SDK 迁移](/zh/plugins/sdk-migration) - 当前弃用项和移除时间表
- [构建插件](/zh/plugins/building-plugins)
- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件入口点](/zh/plugins/sdk-entrypoints)
- [内部钩子](/zh/automation/hooks)
- [插件架构内部原理](/zh/plugins/architecture-internals)
