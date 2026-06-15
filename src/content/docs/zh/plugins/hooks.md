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

如果你想要一个由操作员安装的小型 `HOOK.md` 脚本来处理命令和 Gateway(网关) 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`），请改用[内部钩子](/zh/automation/hooks)。

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
- `resolve_exec_env` - 为 `exec` 贡献插件拥有的环境变量
- **`tool_result_persist`** - 重写由工具结果生成的助手消息
- **`before_message_write`** - 检查或阻止正在进行的消息写入（罕见情况）

**消息和传递**

- **`inbound_claim`** - 在代理路由之前认领入站消息（合成回复）
- `message_received` — 观察入站内容、发送者、线程和元数据
- **`message_sending`** — 重写出站内容或取消传递
- **`reply_payload_sending`** — 在传递之前变更或取消标准化的回复载荷
- `message_sent` — 观察出站传递成功或失败
- **`before_dispatch`** - 在渠道移交之前检查或重写出站分发
- **`reply_dispatch`** - 参与最终的回复分发管道

**会话和压缩**

- `session_start` / `session_end` - 跟踪会话生命周期边界。事件的 `reason` 是 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。当进程在仍有活跃会话时停止或重启时，`shutdown` 和 `restart` 值会从网关关闭终结器触发，因此下游插件（例如内存或记录存储）可以完成那些否则会在重启期间处于开放状态的幽灵行。终结器是有界的，因此缓慢的插件无法阻塞 SIGTERM/SIGINT。
- `before_compaction` / `after_compaction` - 观察或标注压缩周期
- `before_reset` - 观察会话重置事件（`/reset`，程序化重置）

**子代理**

- `subagent_spawned` / `subagent_ended` - 观察子代理启动和完成。
- `subagent_delivery_target` - 当没有核心会话绑定可以投射路由时，用于完成传递的兼容性钩子。
- `subagent_spawning` - 已弃用的兼容性钩子。核心现在在 `subagent_spawned` 触发之前，通过渠道会话绑定适配器准备 `thread: true` 子代理绑定。
- 当 OpenClaw 在启动前解析了子会话的原生模型时，`subagent_spawned` 包含 `resolvedModel` 和 `resolvedProvider`。

**生命周期**

- `gateway_start` / `gateway_stop` - 使用 Gateway(网关) 启动或停止插件拥有的服务
- `deactivate` - `gateway_stop` 的已弃用兼容别名；在新插件中使用 `gateway_stop`
- `cron_changed` - 观察 Gateway 拥有的 cron 生命周期更改（已添加、已更新、已删除、已开始、已完成、已调度）
- **`before_install`** - 检查技能或插件安装扫描并可选择阻止

## 调试运行时钩子

当插件需要为代理轮次切换提供商或模型时，请使用 `before_model_resolve`。它在模型解析之前运行；`llm_output` 仅在模型尝试产生助手输出后运行。

要验证有效的会话模型，请检查运行时注册，然后使用 `openclaw sessions`Gateway(网关)Gateway(网关) 或 Gateway 会话/状态表面。在调试提供商负载时，请使用 `--raw-stream` 和 `--raw-stream-path <path>` 启动 Gateway；这些标志会将原始模型流事件写入 l 文件。

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.toolKind` 和 `event.toolInputKind`，主机权威的区分符，用于故意共享名称的工具；例如，外部代码模式 `exec` 调用使用 `toolKind: "code_mode_exec"` 并在已知输入语言时包含 `toolInputKind: "javascript" | "typescript"`
- 可选的 `event.derivedPaths`，包含尽力而为的主机派生目标路径提示，针对已知工具包装器（如 `apply_patch`）；如果存在，这些路径可能不完整，或者可能过度近似工具实际将触及的内容（例如，对于格式错误或部分的输入）
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 上下文字段，如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
  `ctx.runId`、`ctx.jobId`（在 cron 驱动的运行上设置）、`ctx.toolKind`、
  `ctx.toolInputKind` 和诊断 `ctx.trace`

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

类型化生命周期钩子的钩子守卫行为：

- `block: true` 是终端的，会跳过低优先级的处理程序。
- `block: false` 被视为不做决定。
- `params` 重写用于执行的工具参数。
- `requireApproval` 暂停代理运行并通过插件审批请求用户批准。`/approve` 命令可以批准执行和插件审批。在 Codex app-server 报告模式原生 `PreToolUse` 转发中，这被推迟到匹配的 app-server 审批请求；请参阅 [Codex harness runtime](/zh/plugins/codex-harness-runtime#hook-boundaries)。
- 较低优先级的 `block: true` 仍可以在较高优先级的 hook 请求批准后进行阻止。
- `onResolution` 接收已解析的审批决定 - `allow-once`、`allow-always`、`deny`、`timeout` 或 `cancelled`。

关于审批路由、决策行为以及何时使用 `requireApproval` 而不是可选工具或执行审批，请参阅 [Plugin permission requests](/zh/plugins/plugin-permission-requests)。

需要主机级别策略的捆绑插件可以使用 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。这些在普通 `before_tool_call` hook 和外部插件决策之前运行。请仅将它们用于主机信任的网关，例如工作区策略、预算执行或保留的工作流安全。外部插件应使用普通的 `before_tool_call` hook。

### 执行环境 hook

`resolve_exec_env` 允许插件在构建基础执行环境之后、命令运行之前，将环境变量贡献给 `exec` 工具调用。它接收：

- `event.sessionKey`
- `event.toolName`，目前始终为 `"exec"`
- `event.host`，是 `"gateway"`、`"sandbox"` 或 `"node"` 之一
- 上下文字段，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.messageProvider` 和 `ctx.channelId`

返回一个 `Record<string, string>` 以合并到执行环境中。处理程序按优先级顺序运行，对于相同的键，后续的 Hook 结果会覆盖先前的 Hook 结果。

Hook 输出在合并之前会通过主机执行环境键策略进行过滤。无效的键、`PATH` 以及危险的主机覆盖键（如 `LD_*`、`DYLD_*`、`NODE_OPTIONS`）、代理变量和 TLS 覆盖变量）都会被丢弃。过滤后的插件环境会包含在网关审批/审计元数据中，并转发到节点主机执行请求。

### 工具结果持久化

工具结果可以包含用于 UI 渲染、诊断、介质路由或插件拥有的元数据的结构化 `details`。请将 `details` 视为运行时元数据，而非提示词内容：

- OpenClaw 会在提供商重放和压缩输入之前剥离 `toolResult.details`，以免元数据成为模型上下文。
- 持久化的会话条目仅保留有界的 `details`。过大的细节将被替换为压缩摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终的持久化上限之前运行。Hook 仍应保持返回的 `details` 较小，并避免将提示词相关文本仅放在 `details` 中；请将模型可见的工具输出放在 `content` 中。

## 提示词和模型 Hook

为新插件使用特定阶段的 Hook：

- `before_model_resolve`：仅接收当前提示词和附件元数据。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收当前提示词、已准备的会话消息以及为此会话排空的任何仅一次队列注入。返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收当前的提示词和会话消息。
  返回 `prependContext`、`appendContext`、`systemPrompt`、
  `prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：仅针对心跳轮次运行并返回
  `prependContext` 或 `appendContext`。它旨在供后台监控器
  使用，这些监控器需要总结当前状态而不改变用户发起的轮次。

`before_agent_start` 保留用于兼容性。最好使用上述显式钩子，
以便您的插件不依赖于旧版的合并阶段。

`before_agent_run` 在提示词构建之后和任何模型输入之前运行，
包括提示词本地的图像加载和 `llm_input` 观测。它接收
当前的用户输入作为 `prompt`，加上在 `messages` 中加载的会话历史
和活动的系统提示词。返回 `{ outcome: "block", reason, message? }`
以在模型能够读取提示词之前停止运行。`reason` 是内部的；
`message` 是面向用户的替代品。唯一支持的决策结果是
`pass` 和 `block`；不支持的决策形状将失败关闭。

当运行被阻止时，OpenClaw 仅将替换文本存储在
`message.content` 中，加上非敏感的阻止元数据，例如阻止的插件
ID 和时间戳。原始用户文本不会保留在抄本或未来的
上下文中。内部阻止原因被视为敏感信息，并从
抄本、历史记录、广播、日志和诊断有效负载中排除。可观测性
应使用经过清理的字段，例如阻止者 ID、结果、时间戳或安全的
类别。

当 OpenClaw 能够识别活动运行时，`before_agent_start` 和 `agent_end` 包含 `event.runId`。同样的值也在 `ctx.runId` 上可用。Cron 驱动的运行还会公开 `ctx.jobId`（源自 cron 作业的 ID），以便插件钩子可以将指标、副作用或状态限定到特定的计划作业。

对于源自渠道的运行，`ctx.messageProvider` 是提供商界面，例如 `discord` 或 `telegram`，而 `ctx.channelId` 是对话目标标识符，当 OpenClaw 可以从会话密钥或传递元数据中派生出一个时。

`agent_end` 是一个观察钩子。Gateway(网关) 和持久性工具路径会在轮次结束后以即发即弃的方式运行它，而短暂的一次性 CLI 路径会在进程清理前等待钩子 promise，以便受信任的插件可以刷新最终的可观测性或捕获状态。钩子运行器应用 30 秒超时，因此卡住的插件或嵌入端点无法让钩子 promise 永久挂起。超时会被记录，并且 OpenClaw 会继续运行；除非插件也使用了自己的中止信号，否则它不会取消插件拥有的网络工作。

对于不应接收原始提示、历史记录、响应、标头、请求正文或提供商请求 ID 的提供商调用遥测，请使用 `model_call_started` 和 `model_call_ended`。这些挂钩包含稳定的元数据，例如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终端 `durationMs`/`outcome`，以及当 OpenClaw 能够推导出有界的提供商请求 ID 哈希时的 `upstreamRequestIdHash`。当运行时解析了上下文窗口元数据后，挂钩事件和上下文还包括 `contextTokenBudget`，即模型/配置/代理限制后的有效令牌预算，以及在应用了更低限制时的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 仅在控制工具即将接受自然的最终助手回答时运行。它不是 `/stop` 取消路径，并且在用户中止回合时不会运行。返回 `{ action: "revise", reason }` 以在最终确定之前要求控制工具再进行一次模型传递，返回 `{ action: "finalize", reason? }` 以强制最终确定，或省略结果以继续。Codex 原生 `Stop` 挂钩作为 OpenClaw `before_agent_finalize` 决策中继到此挂钩中。

返回 `action: "revise"` 时，插件可以包含 `retry` 元数据，以使额外的模型传递有界且可重放安全：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 附加到发送给控制工具的修订原因。`idempotencyKey` 允许主机跨等效的最终确定决策统计针对同一插件请求的重试次数，而 `maxAttempts` 限制了主机在继续使用自然最终答案之前允许的额外传递次数。

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

可以使用 `plugins.entries.<id>.hooks.allowPromptInjection=false` 针对每个插件禁用 Prompt 变更钩子和持久的下一轮注入。

### Session 扩展和下一轮注入

工作流插件可以使用 `api.registerSessionExtension(...)` 持久化小型兼容 JSON 的会话状态，并通过 Gateway(网关)
`sessions.pluginPatch` 方法更新它。会话行通过 `pluginExtensions` 投影已注册的扩展状态，
允许 Control UI 和其他客户端渲染插件拥有的状态，而无需了解插件内部细节。

当插件需要持久的上下文以便恰好到达下一次模型轮次时，请使用 `api.enqueueNextTurnInjection(...)`。OpenClaw
在 Prompt 钩子之前排出排队的注入，丢弃过期的注入，并按插件通过 `idempotencyKey` 去重。
这是恢复审批、策略摘要、后台监视器增量以及命令延续的正确切入点，这些内容应在下一轮中
对模型可见，但不应成为永久的系统 Prompt 文本。

清理语义是契约的一部分。会话扩展清理和运行时生命周期清理回调会接收
`reset`、`delete`、`disable` 或
`restart`。对于重置/删除/禁用，宿主会移除拥有插件的持久会话扩展状态
和待处理的下一轮注入；重启会保留持久的会话状态，而清理回调允许插件释放
调度程序作业、运行上下文以及其他针对旧运行时版本的带外资源。

## Message hooks

将 Message hooks 用于渠道级别的路由和传递策略：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、
  `senderId`、可选的运行/会话关联以及元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `reply_payload_sending`：重写标准化的 `ReplyPayload` 对象（包括
  `presentation`、`delivery`、媒体引用和文本）或返回 `{ cancel: true }`。
- `message_sent`：观察最终的成功或失败。

对于仅音频的 TTS 回复，即使渠道负载没有可见的文本/字幕，`content` 也可能包含隐藏的口述记录。
重写该 `content` 仅更新钩子可见的记录；它不会作为媒体字幕渲染。

消息钩子上下文在可用时暴露稳定的关联字段：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。
当渠道具有可见性过滤的引用消息数据时，入站和 `before_dispatch` 上下文也会暴露回复元数据：
`replyToId`、`replyToBody` 和 `replyToSender`。
在读取旧版元数据之前，请优先使用这些一流字段。

在使用渠道特定的元数据之前，请优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- 带有 `cancel: true` 的 `message_sending` 是终止性的。
- 带有 `cancel: false` 的 `message_sending` 被视为无决策。
- 重写的 `content` 会继续传递给较低优先级的钩子，除非后续的钩子
  取消了传递。
- `reply_payload_sending` 在负载规范化之后、渠道传递之前运行，包括路由回原始渠道的回复。
  处理程序按顺序运行，每个处理程序都能看到由较高优先级处理程序生成的最新负载。
- `reply_payload_sending` 载荷不暴露运行时信任标记（例如
  `trustedLocalMedia`）；插件可以编辑载荷形状，但无法授予本地
  媒体信任。
- `message_sending` 可以返回 `cancelReason` 和带有取消限制的 `metadata`。新的消息生命周期 API 将其公开为具有原因 `cancelled_by_message_sending_hook` 的抑制传递
  结果；为了保持兼容性，传统的直接传递继续返回空结果数组。
- `message_sent` 仅用于观察。处理程序故障会被记录，但不会
  更改传递结果。

## 安装钩子

`before_install` 在内置的技能和插件安装扫描之后运行。
返回额外的发现结果或 `{ block: true, blockReason }` 以停止
安装。

`block: true` 是终态的。`block: false` 被视为未做出决定。

## Gateway(网关) 生命周期

对于需要 Gateway(网关) 拥有状态的插件服务，请使用 `gateway_start`Gateway(网关)。上下文
暴露了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()`，用于
cron 检查和更新。使用 `gateway_stop` 清理长时间运行的
资源。

不要依赖内部的 `gateway:startup` 钩子来处理插件拥有的运行时
服务。

`cron_changed` 在网关拥有的 cron 生命周期事件中触发，其类型化事件负载涵盖 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。该事件携带一个 `PluginHookGatewayCronJob` 快照（包括存在时的 `state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`）以及一个 `not-requested` | `delivered` | `not-delivered` | `unknown` 的 `PluginHookGatewayCronDeliveryStatus`。已移除的事件仍携带已删除的作业快照，以便外部调度器协调状态。在同步外部唤醒调度器时，请使用运行时上下文中的 `ctx.getCron?.()` 和 `ctx.config`，并将 OpenClaw 作为到期检查和执行的单一事实来源。

## 即将弃用的功能

一些与钩子相关的接口已被弃用但仍受支持。请在下一个主要版本发布之前迁移：

- **纯文本渠道信封（Plaintext 渠道 envelopes）**，位于 `inbound_claim` 和 `message_received` 处理程序中。请读取 `BodyForAgent` 和结构化用户上下文块，而不是解析扁平信封文本。请参阅 [Plaintext 渠道 envelopes → BodyForAgent](/zh/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 保留用于兼容性。新插件应使用 `before_model_resolve` 和 `before_prompt_build`，而不是使用组合阶段。
- **`subagent_spawning`** 保留用于与旧插件兼容，但新插件不应从中返回线程路由。核心在 `subagent_spawned` 触发之前，通过渠道会话绑定适配器准备 `thread: true` 子代理绑定。
- **`deactivate`** 作为已弃用的清理兼容别名保留，直至 2026-08-16 之后。新插件应使用 `gateway_stop`。
- **`onResolution` 中的 `before_tool_call`** 现在使用类型化
  `PluginApprovalResolution` 联合 (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`)，而不是自由形式的 `string`。

有关完整列表——内存能力注册、提供商思考
概要、外部认证提供商、提供商发现类型、任务运行时
访问器以及 `command-auth` → `command-status` 重命名——请参阅
[Plugin SDK migration → Active deprecations](/zh/plugins/sdk-migration#active-deprecations)。

## 相关

- [Plugin SDK migration](/zh/plugins/sdk-migration) - 活跃的弃用和移除时间线
- [Building plugins](/zh/plugins/building-plugins)
- [Plugin SDK overview](/zh/plugins/sdk-overview)
- [Plugin entry points](/zh/plugins/sdk-entrypoints)
- [Internal hooks](/zh/automation/hooks)
- [Plugin architecture internals](/zh/plugins/architecture-internals)
