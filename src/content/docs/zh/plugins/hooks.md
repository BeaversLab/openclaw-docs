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

如果您想要一个由操作员安装的、用于处理命令和Gateway(网关)事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）的小型 `HOOK.md`Gateway(网关) 脚本，请改用 [internal hooks](/zh/automation/hooks)。

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
- `message_received` - 观察入站内容、发送者、线程和元数据
- **`message_sending`** - 重写出站内容或取消发送
- `message_sent` - 观察出站发送成功或失败
- **`before_dispatch`** - 在移交给渠道之前检查或重写出站分发
- **`reply_dispatch`** - 参与最终的回复分发管道

**会话与压缩**

- `session_start` / `session_end` - 跟踪会话生命周期边界。事件的 `reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。`shutdown` 和 `restart` 值在进程停止或重启时，如果会话仍处于活动状态，则从 Gateway 关闭终结器触发，以便下游插件（如内存或记录存储）可以完成幽灵行（ghost rows），否则这些行在重启后可能会处于开放状态。终结器是有界的，因此慢速插件无法阻止 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 观察或注释压缩周期
- `before_reset` - 观察会话重置事件（`/reset`、编程重置）

**子代理**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - 协调子代理路由和完成交付

**生命周期**

- `gateway_start` / `gateway_stop` - 使用 Gateway(网关) 启动或停止插件拥有的服务
- `deactivate` - `gateway_stop` 的已弃用兼容别名；在新插件中使用 `gateway_stop`
- `cron_changed` - 观察 Gateway 拥有的 cron 生命周期更改（已添加、已更新、已删除、已开始、已完成、已计划）
- **`before_install`** - 检查技能或插件安装扫描，并可选择阻止

## 调试运行时钩子

当插件需要为代理轮次切换提供商或模型时，请使用 `before_model_resolve`。它在模型解析之前运行；`llm_output` 仅在模型尝试生成助手输出后运行。

要验证有效的会话模型，请检查运行时注册，然后使用 `openclaw sessions`Gateway(网关)Gateway(网关) 或 Gateway(网关) 会话/status 界面。在调试提供商载荷时，请使用 `--raw-stream` 和 `--raw-stream-path <path>` 启动 Gateway(网关)；这些标志会将原始模型流事件写入 l 文件。

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.derivedPaths`，包含尽力而为的主机派生目标路径提示，用于众所周知的工具封装（如 `apply_patch`）；如果存在，这些路径可能不完整，或者可能高估了工具实际会触及的内容（例如，对于格式错误或部分输入）
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 上下文字段，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驱动的运行中设置）以及诊断 `ctx.trace`

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
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

类型化生命周期钩子的 Hook 守卫行为：

- `block: true` 是终止性的，会跳过低优先级的处理程序。
- `block: false` 被视为未做决定。
- `params` 重写用于执行的工具参数。
- `requireApproval` 暂停代理运行并通过插件审批向用户询问。
  `/approve` 命令可以批准执行和插件审批。
- 在较高优先级的钩子请求审批后，较低优先级的 `block: true` 仍可以阻止。
- `onResolution` 接收已解析的审批决定 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

需要主机级别策略的内置插件可以使用 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。这些策略在普通的 `before_tool_call` 钩子和外部插件决策之前运行。请仅将它们用于主机受信任的守门，例如工作区策略、预算执行或保留的工作流安全。外部插件应使用普通的 `before_tool_call` 钩子。

### 工具结果持久化

工具结果可以包含结构化的 `details`，用于 UI 渲染、诊断、媒体路由或插件拥有的元数据。请将 `details` 视为运行时元数据，而非提示词内容：

- OpenClaw 会在提供商重放和压缩输入之前剥离 OpenClaw`toolResult.details`，以防止元数据成为模型上下文。
- 持久化的会话条目仅保留有界的 `details`。过大的详细信息将被替换为紧凑摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终的持久化上限之前运行。钩子仍应保持返回的 `details` 较小，并避免仅将与提示词相关的文本放在 `details` 中；请将模型可见的工具输出放在 `content` 中。

## 提示词和模型钩子

为新插件使用特定阶段的钩子：

- `before_model_resolve`：仅接收当前提示词和附件元数据。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收当前提示词、准备好的会话消息，以及为此会话排空的任何一次性排队注入。返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收当前提示词和会话消息。返回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：仅针对心跳轮次运行并返回
  `prependContext` 或 `appendContext`。它旨在用于后台监控器，
  这些监控器需要总结当前状态而不改变用户发起的轮次。

`before_agent_start` 保留用于兼容性。首选上述显式钩子，
以便您的插件不依赖于遗留的组合阶段。

`before_agent_run` 在提示词构建之后和任何模型输入之前运行，
包括提示词本地的图像加载和 `llm_input` 观察。它接收
当前用户输入作为 `prompt`，以及加载的会话历史在 `messages`
和当前系统提示词。返回 `{ outcome: "block", reason, message? }`
以便在模型能够读取提示词之前停止运行。`reason` 是内部的；
`message` 是面向用户的替代品。唯一支持的输出是
`pass` 和 `block`；不支持的决策形状将失败并关闭。

当运行被阻止时，OpenClaw 仅将替换文本存储在
OpenClaw`message.content` 中，以及非敏感的阻止元数据（如阻止插件
ID 和时间戳）。原始用户文本不会保留在记录或未来
上下文中。内部阻止原因被视为敏感信息，并从
记录、历史记录、广播、日志和诊断负载中排除。可观测性
应使用经过净化的字段，如阻止者 ID、结果、时间戳或安全的
类别。

当 OpenClaw 能够
识别活动运行时，`before_agent_start` 和 `agent_end` 包含 `event.runId`OpenClaw。相同的值也可在 `ctx.runId` 上获取。
Cron 驱动的运行还会公开 `ctx.jobId`（原始 cron 作业 ID），以便
插件挂钩可以将指标、副作用或状态范围限定为特定的计划
作业。

对于源自渠道的运行，`ctx.messageProvider` 是提供商界面，例如 `discord` 或 `telegram`，而当 OpenClaw 可以从会话密钥或传递元数据中推导出会话目标标识符时，`ctx.channelId`OpenClaw 即为该标识符。

`agent_end`OpenClaw 是一个观察钩子，并在轮次结束后以即发即弃的方式运行。钩子运行器应用 30 秒超时，因此卡住的插件或嵌入端点无法让钩子 promise 永久挂起。超时会被记录，并且 OpenClaw 会继续运行；除非插件也使用了自己的中止信号，否则它不会取消插件拥有的网络工作。

对于不应接收原始提示、历史记录、响应、标头、请求正文或提供商请求 ID 的提供商调用遥测，请使用 `model_call_started` 和 `model_call_ended`。这些钩子包括稳定的元数据，例如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终端 `durationMs`/`outcome`，以及当 OpenClaw 可以推导出有界的提供商请求 ID 哈希时的 `upstreamRequestIdHash`OpenClaw。当运行时已解析上下文窗口元数据时，钩子事件和上下文还包括 `contextTokenBudget`（即在模型/配置/代理限制之后的有效 token 预算），以及在应用了更低限制时的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 仅在控制工具即将接受自然的最终助手回答时运行。它不是 `/stop` 取消路径，并且当用户中止轮次时不会运行。返回 `{ action: "revise", reason }` 以请求控制工具在最终确定之前再进行一次模型传递，返回 `{ action: "finalize", reason? }` 以强制最终确定，或者省略结果以继续。Codex 原生 `Stop`OpenClaw 钩子作为 OpenClaw `before_agent_finalize` 决策被中继到此钩子中。

当返回 `action: "revise"` 时，插件可以包含 `retry` 元数据，使额外的模型传递有界且可安全重放：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 会附加到发送给工具线的修订原因中。`idempotencyKey` 允许宿主跨等效的最终决策统计同一插件请求的重试次数，而 `maxAttempts` 限制了宿主在继续使用自然最终答案之前允许的额外传递次数。

需要原始对话钩子（`before_model_resolve`、`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、`agent_end` 或 `before_agent_run`）的非捆绑插件必须设置：

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 为每个插件禁用提示变更钩子和持久的下一轮注入。

### 会话扩展和下一轮注入

工作流插件可以使用 `api.registerSessionExtension(...)`Gateway(网关) 持久化少量与 JSON 兼容的会话状态，并通过 Gateway(网关) 的 `sessions.pluginPatch` 方法进行更新。会话行通过 `pluginExtensions` 投影已注册的扩展状态，允许 Control UI 和其他客户端渲染插件拥有的状态，而无需了解插件内部实现。

当插件需要持久上下文以恰好到达下一次模型轮次时，请使用 `api.enqueueNextTurnInjection(...)`OpenClaw。OpenClaw 会在提示钩子之前清空排队中的注入，丢弃过期的注入，并按 `idempotencyKey` 对每个插件进行去重。这是审批恢复、策略摘要、后台监控增量以及命令延续的正确切入点，这些内容应该在下一轮对模型可见，但不应成为永久的系统提示文本。

清理语义是契约的一部分。会话扩展清理和运行时生命周期清理回调会接收 `reset`、`delete`、`disable` 或 `restart`。主机将移除拥有该插件的持久化会话扩展状态以及待处理的下一轮注入（针对重置/删除/禁用操作）；重启则保留持久化的会话状态，而清理回调允许插件释放调度器作业、运行上下文以及与旧运行时版本相关的其他带外资源。

## 消息钩子

使用消息钩子进行渠道级别的路由和传递策略控制：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、`senderId`、可选的运行/会话关联元数据以及其他元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `message_sent`：观察最终的成功或失败状态。

对于仅限音频的 TTS 回复，即使渠道负载中没有可见的文本/字幕，`content` 也可能包含隐藏的口语文本。重写该 `content` 仅更新钩子可见的文本；它不会作为媒体字幕呈现。

消息钩子上下文在可用时会暴露稳定的关联字段：`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在读取旧版元数据之前，请优先使用这些一等字段。

在使用特定渠道的元数据之前，请优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- 带有 `cancel: true` 的 `message_sending` 是终止性的。
- 带有 `cancel: false` 的 `message_sending` 被视为未做出决策。
- 重写的 `content` 会继续执行较低优先级的钩子，除非后续的钩子取消传递。
- `message_sending` 可以返回 `cancelReason` 和带有取消操作的受限 `metadata`。新的消息生命周期 API 将其公开为原因为 `cancelled_by_message_sending_hook` 的抑制传递结果；为了兼容性，旧版直接传递仍返回空结果数组。
- `message_sent` 仅用于观察。处理程序失败会被记录下来，但不会改变传递结果。

## 安装钩子

`before_install` 在内置的技能和插件安装扫描之后运行。返回额外的发现结果或 `{ block: true, blockReason }` 以停止安装。

`block: true` 是终局性的。`block: false` 被视为未做决定。

## Gateway(网关) 生命周期

对于需要 Gateway(网关) 拥有状态的插件服务，请使用 `gateway_start`Gateway(网关)。上下文公开了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 用于 cron 检查和更新。使用 `gateway_stop` 清理长时间运行的资源。

不要依赖内部的 `gateway:startup` 钩子来处理插件拥有的运行时服务。

`cron_changed` 针对网关拥有的 cron 生命周期事件触发，其类型化事件负载涵盖 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。该事件携带 `PluginHookGatewayCronJob` 快照（包括 `state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`（如果存在））加上 `not-requested` | `delivered` | `not-delivered` | `unknown` 的 `PluginHookGatewayCronDeliveryStatus`。移除事件仍会携带已删除的作业快照，以便外部调度器可以协调状态。在同步外部唤醒调度器时，请使用运行时上下文中的 `ctx.getCron?.()` 和 `ctx.config`OpenClaw，并将 OpenClaw 作为到期检查和执行的唯一事实来源。

## 即将弃用

一些与钩子相关的接口已被弃用，但仍受支持。请在下一个主要版本发布之前迁移：

- **Plaintext 渠道 envelopes**（纯文本渠道信封）位于 `inbound_claim` 和 `message_received` 处理程序中。请读取 `BodyForAgent` 和结构化用户上下文块，而不是解析平面信封文本。请参阅 [Plaintext 渠道 envelopes → BodyForAgent](/zh/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 为兼容性而保留。新插件应使用 `before_model_resolve` 和 `before_prompt_build` 而不是组合阶段。
- **`deactivate`** 作为已弃用的清理兼容别名保留，直到 2026-08-16 之后。新插件应使用 `gateway_stop`。
- **`before_tool_call` 中的 `onResolution`** 现在使用类型化的 `PluginApprovalResolution` 联合（`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`）而不是自由形式的 `string`。

有关完整列表——包括内存能力注册、提供商思考配置文件、外部身份验证提供商、提供商发现类型、任务运行时访问器以及 `command-auth` → `command-status` 重命名——请参阅 [Plugin SDK migration → Active deprecations](/zh/plugins/sdk-migration#active-deprecations)。

## 相关

- [Plugin SDK migration](/zh/plugins/sdk-migration) - 主动弃用和移除时间表
- [构建插件](/zh/plugins/building-plugins)
- [Plugin SDK 概述](/zh/plugins/sdk-overview)
- [插件入口点](/zh/plugins/sdk-entrypoints)
- [内部钩子](/zh/automation/hooks)
- [插件架构内部机制](/zh/plugins/architecture-internals)
