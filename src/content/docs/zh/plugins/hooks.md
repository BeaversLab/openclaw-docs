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

当您需要一个小型的、由操作员安装的 `HOOK.md` 脚本来处理命令和 Gateway(网关) 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）时，请改用 [internal hooks](/zh/automation/hooks)。

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
- 可选的 `event.toolKind` 和 `event.toolInputKind`，为主机权威的（host-authoritative）区分符，用于故意共享名称的工具；例如，外部代码模式 `exec` 调用使用 `toolKind: "code_mode_exec"`，并在已知输入语言时包含 `toolInputKind: "javascript" | "typescript"`
- 可选的 `event.derivedPaths`，包含针对已知工具信封（例如 `apply_patch`）的主机派生目标路径提示（尽力而为）；当存在时，这些路径可能不完整，或者可能高估工具实际触及的范围（例如，对于格式错误或部分的输入）
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 上下文字段，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、`ctx.runId`、`ctx.jobId`（在 cron 驱动的运行中设置）、`ctx.toolKind`、`ctx.toolInputKind` 和诊断 `ctx.trace`

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

- `block: true` 是终止性的，并跳过低优先级的处理程序。
- `block: false` 被视为无决定。
- `params` 重写用于执行的工具参数。
- `requireApproval` 暂停代理运行并通过插件审批向用户询问。`/approve` 命令可以批准 exec 和 plugin 审批。
- 在更高优先级的 hook 请求审批后，较低优先级的 `block: true` 仍然可以阻止。
- `onResolution` 接收已解析的审批决定 - `allow-once`，
  `allow-always`，`deny`，`timeout` 或 `cancelled`。

需要主机级别策略的捆绑插件可以通过 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。
这些策略在普通 `before_tool_call` 钩子和外部插件决策之前运行。
仅将它们用于主机受信任的网关，例如工作区策略、预算执行或保留的工作流安全。
外部插件应使用普通的 `before_tool_call` 钩子。

### 工具结果持久化

工具结果可以包含用于 UI 渲染、诊断、媒体路由或插件拥有的元数据的结构化 `details`。
将 `details` 视为运行时元数据，而不是提示内容：

- OpenClaw 在提供商重放和压缩输入之前剥离 `toolResult.details`，
  以免元数据成为模型上下文。
- 持久化的会话条目仅保留有界的 `details`。
  过大的详细信息将被替换为紧凑的摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终的持久化上限之前运行。
  钩子仍应保持返回的 `details` 较小，并避免将仅与提示相关的文本放在 `details` 中；
  将模型可见的工具输出放在 `content` 中。

## 提示和模型钩子

对于新插件，请使用特定于阶段的钩子：

- `before_model_resolve`：仅接收当前提示和附件元数据。
  返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收当前提示、准备好的会话消息以及为此会话排空的任何一次性队列注入。
  返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收当前的提示词和会话消息。
  返回 `prependContext`、`appendContext`、`systemPrompt`、
  `prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：仅针对心跳轮次运行并返回
  `prependContext` 或 `appendContext`。它适用于需要总结当前状态
  而不改变用户发起的轮次的后台监视器。

`before_agent_start` 保留用于兼容性。最好使用上述显式钩子，
以便您的插件不依赖于旧的组合阶段。

`before_agent_run` 在提示词构建之后和任何模型输入之前运行，
包括提示词本地图像加载和 `llm_input` 观察。它接收
当前用户输入作为 `prompt`，以及加载的会话历史记录（在 `messages` 中）
和活动系统提示词。返回 `{ outcome: "block", reason, message? }`
以在模型读取提示词之前停止运行。`reason` 是内部的；
`message` 是面向用户的替代品。唯一支持的结果是
`pass` 和 `block`；不支持的决策形状将以失败关闭。

当运行被阻止时，OpenClaw 仅将替换文本存储在
OpenClaw`message.content` 中，以及非敏感的阻止元数据（如阻止插件 ID
和时间戳）。原始用户文本不会保留在记录或未来
上下文中。内部阻止原因被视为敏感信息，并从
记录、历史记录、广播、日志和诊断负载中排除。可观测性
应使用经过清理的字段，如阻止者 ID、结果、时间戳或安全
类别。

当 OpenClaw 能够识别活动运行时，`before_agent_start` 和 `agent_end` 包含 `event.runId`OpenClaw。该值也可在 `ctx.runId` 上获取。
Cron 驱动的运行还会公开 `ctx.jobId`（源 cron 作业 id），以便
插件挂钩可以将指标、副作用或状态限定于特定的预定
作业。

对于渠道发起的运行，`ctx.messageProvider` 是提供商界面，例如
`discord` 或 `telegram`，而 `ctx.channelId`OpenClaw 是会话目标
标识符，当 OpenClaw 可以从会话密钥或传递
元数据中推导出它时。

`agent_end`Gateway(网关)CLIOpenClaw 是一个观察挂钩。Gateway 和持久性测试工具路径在轮次后以
即发即弃的方式运行它，而短期的单次 CLI 路径在进程清理前等待
挂钩 promise，以便受信任的插件可以刷新终端
可观测性或捕获状态。挂钩运行器应用 30 秒超时，因此
卡住的插件或嵌入端点无法使挂钩 promise 永远
挂起。超时会被记录，并且 OpenClaw 会继续；它不会取消
插件拥有的网络工作，除非插件也使用自己的中止信号。

对于不应接收原始提示、历史记录、响应、标头、请求正文或提供商请求 ID 的提供商调用遥测，请使用 `model_call_started` 和 `model_call_ended`。这些钩子包括稳定的元数据，如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终端 `durationMs`/`outcome`，以及当 OpenClaw 可以推导出有界的提供商请求 ID 哈希时的 `upstreamRequestIdHash`OpenClaw。当运行时解析了上下文窗口元数据时，钩子事件和上下文还包括 `contextTokenBudget`，即在模型/配置/代理限制后的有效 token 预算，以及 `contextWindowSource` 和 `contextWindowReferenceTokens`（当应用了较低限制时）。

`before_agent_finalize` 仅在工具准备接受自然的最终助手回答时运行。它不是 `/stop` 取消路径，并且在用户中止回合时不会运行。返回 `{ action: "revise", reason }` 以要求工具在最终确定之前再进行一次模型传递，返回 `{ action: "finalize", reason? }` 以强制最终确定，或者省略结果以继续。Codex 原生 `Stop`OpenClaw 钩子作为 OpenClaw `before_agent_finalize` 决策被中继到此钩子中。

当返回 `action: "revise"` 时，插件可以包含 `retry` 元数据，以使额外的模型传递有界且可重放安全：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 会被追加到发送给工具的修订原因中。`idempotencyKey` 允许主机跨等效的最终确定决策计算同一插件请求的重试次数，而 `maxAttempts` 限制了主机在继续使用自然的最终答案之前允许的额外传递次数。

需要原始会话钩子（`before_model_resolve`、
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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 针对每个插件禁用提示词变更钩子和持久化的下一轮注入。

### 会话扩展和下一轮注入

工作流插件可以使用 `api.registerSessionExtension(...)`Gateway(网关) 持久化小型 JSON 兼容的会话状态，并通过 Gateway
`sessions.pluginPatch` 方法进行更新。会话行通过 `pluginExtensions` 投射已注册的扩展状态，
从而让 Control UI 和其他客户端可以呈现插件拥有的状态，而无需了解插件的内部细节。

当插件需要持久化上下文且仅在下一次模型轮次中生效一次时，请使用 `api.enqueueNextTurnInjection(...)`OpenClaw。OpenClaw 会在
提示词钩子之前排空队列中的注入，丢弃过期的注入，并按 `idempotencyKey` 对每个插件进行去重。
这是实现审批恢复、策略摘要、后台监视器增量以及命令延续的正确切入点，这些内容应在下一轮对模型可见，但不应成为永久性的系统提示词文本。

清理语义是契约的一部分。会话扩展清理和运行时生命周期清理回调会接收 `reset`、`delete`、`disable` 或
`restart`。对于重置/删除/禁用，宿主会移除拥有插件的持久会话扩展状态和待处理的下一轮注入；
重启则会保留持久会话状态，同时清理回调允许插件释放调度程序作业、运行上下文以及属于旧运行时代的其他带外资源。

## 消息钩子

使用消息钩子进行渠道级别的路由和传递策略：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、
  `senderId`、可选的运行/会话关联以及元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `message_sent`：观察最终成功或失败。

对于仅音频的 TTS 回复，即使渠道负载中没有可见文本/字幕，`content` 也可能包含隐藏的口语文本。重写该 `content` 仅更新钩子可见的文本；它不会作为媒体字幕渲染。

消息钩子上下文在可用时公开稳定的关联字段：`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在读取旧版元数据之前，请优先使用这些一等字段。

在使用渠道特定元数据之前，请优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- 带有 `cancel: true` 的 `message_sending` 是终局的。
- 带有 `cancel: false` 的 `message_sending` 被视为无决策。
- 重写的 `content` 会继续传递给较低优先级的钩子，除非后续钩子取消传递。
- `message_sending` 可以随取消操作返回 `cancelReason` 和有界的 `metadata`。新的消息生命周期 API 将此公开为原因 `cancelled_by_message_sending_hook` 的被抑制传递结果；旧版直接传递为保持兼容性，将继续返回空结果数组。
- `message_sent` 仅用于观察。处理程序失败会被记录，但不会改变传递结果。

## 安装钩子

`before_install` 在内置的技能和插件安装扫描之后运行。返回额外的发现或 `{ block: true, blockReason }` 以停止安装。

`block: true` 是终局的。`block: false` 被视为无决策。

## Gateway(网关) 生命周期

对需要 Gateway(网关) 拥有状态的插件服务使用 `gateway_start`Gateway(网关)。该上下文公开了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()`，用于 cron 检查和更新。使用 `gateway_stop` 来清理长时间运行的资源。

不要依赖内部的 `gateway:startup` hook 来处理插件拥有的运行时服务。

`cron_changed` 针对 Gateway(网关) 拥有的 cron 生命周期事件触发，其类型化事件负载涵盖了 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。该事件携带 `PluginHookGatewayCronJob` 快照（在存在时包括 `state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`），外加 `PluginHookGatewayCronDeliveryStatus` 类型的 `not-requested` | `delivered` | `not-delivered` | `unknown`。移除事件仍然携带已删除的作业快照，以便外部调度器可以协调状态。在同步外部唤醒调度器时，请使用运行时上下文中的 `ctx.getCron?.()` 和 `ctx.config`OpenClaw，并保持 OpenClaw 作为到期检查和执行的唯一事实来源。

## 即将弃用

少数与 hook 相关的界面已被弃用但仍受支持。请在下一个主要版本发布之前进行迁移：

- `inbound_claim` 和 `message_received` 处理程序中的 **Plaintext 渠道 envelopes**。请读取 `BodyForAgent` 和结构化的用户上下文块，而不是解析扁平的信封文本。请参阅 [Plaintext 渠道 envelopes → BodyForAgent](/zh/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 出于兼容性原因而保留。新插件应使用 `before_model_resolve` 和 `before_prompt_build`，而不是使用合并的阶段。
- **`deactivate`** 在 2026-08-16 之后仍作为已弃用的清理兼容性别名保留。新插件应使用 `gateway_stop`。
- **`before_tool_call` 中的 `onResolution`** 现在使用类型化的 `PluginApprovalResolution` 联合（`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`），而不是自由形式的 `string`。

有关完整列表——包括内存能力注册、提供商思考配置文件、外部身份验证提供商、提供商发现类型、任务运行时访问器以及 `command-auth` → `command-status` 重命名——请参阅
[Plugin SDK migration → Active deprecations](/zh/plugins/sdk-migration#active-deprecations)。

## 相关

- [Plugin SDK migration](/zh/plugins/sdk-migration) - 活跃的弃用和移除时间表
- [Building plugins](/zh/plugins/building-plugins)
- [Plugin SDK overview](/zh/plugins/sdk-overview)
- [Plugin entry points](/zh/plugins/sdk-entrypoints)
- [Internal hooks](/zh/automation/hooks)
- [Plugin architecture internals](/zh/plugins/architecture-internals)
