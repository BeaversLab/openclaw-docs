---
summary: "Plugin hooks: intercept agent, 工具, message, 会话, and Gateway(网关) lifecycle events"
title: "Plugin hooks"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Plugin hooks are in-process extension points for OpenClaw plugins. Use them
when a plugin needs to inspect or change agent runs, 工具 calls, message flow,
会话 lifecycle, subagent routing, installs, or Gateway(网关) startup.

Use [internal hooks](/zh/automation/hooks) instead when you want a small
operator-installed `HOOK.md` script for command and Gateway(网关) events such as
`/new`, `/reset`, `/stop`, `agent:bootstrap`, or `gateway:startup`.

## 快速开始

Register typed plugin hooks with `api.on(...)` from your plugin entry:

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

Hook 处理程序按降序 `priority` 依次运行。相同优先级的 Hook 保持注册顺序。

## Hook 目录

Hook 根据其扩展的表面进行分组。**粗体**名称接受决策结果（阻止、取消、覆盖或要求批准）；所有其他名称仅用于观察。

**Agent 回合**

- `before_model_resolve` — 在会话消息加载之前覆盖提供商或模型
- `before_prompt_build` — 在模型调用之前添加动态上下文或系统提示文本
- `before_agent_start` — 仅用于兼容性的组合阶段；建议使用上述两个 Hook
- **`before_agent_reply`** — 使用合成回复或静默短路模型回合
- **`before_agent_finalize`** — 检查自然最终答案并请求再次通过模型
- `agent_end` — 观察最终消息、成功状态和运行时长

**对话观察**

- `model_call_started` / `model_call_ended` — 观察经过清理的提供商/模型调用元数据、计时、结果和有界的请求 ID 哈希，不包含提示词或响应内容
- `llm_input` — 观察提供商输入（系统提示词、提示词、历史记录）
- `llm_output` — 观察提供商输出

**工具**

- **`before_tool_call`** — 重写工具参数、阻止执行或要求批准
- `after_tool_call` — 观察工具结果、错误和持续时间
- **`tool_result_persist`** — 重写从工具结果生成的助手消息
- **`before_message_write`** — 检查或阻止正在进行的消息写入（罕见）

**消息和投递**

- **`inbound_claim`** — 在代理路由之前认领传入消息（合成回复）
- `message_received` — 观察传入内容、发送者、线程和元数据
- **`message_sending`** — 重写传出内容或取消投递
- `message_sent` — 观察传出投递成功或失败
- **`before_dispatch`** — 在渠道移交之前检查或重写传出调度
- **`reply_dispatch`** — 参与最终回复调度管道

**会话和压缩**

- `session_start` / `session_end` — 跟踪会话生命周期边界
- `before_compaction` / `after_compaction` — 观察或注释压缩周期
- `before_reset` — 观察会话重置事件（`/reset`，程序化重置）

**子代理**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` — 协调子代理路由和完成投递

**生命周期**

- `gateway_start` / `gateway_stop` — 随 Gateway(网关) 一起启动或停止插件拥有的服务
- **`before_install`** — 检查技能或插件安装扫描并选择性地阻止

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 上下文字段，如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、
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

规则：

- `block: true` 是终态，会跳过低优先级的处理程序。
- `block: false` 被视为无决策。
- `params` 重写工具参数以执行。
- `requireApproval` 暂停代理运行并通过插件审批询问用户。
  `/approve` 命令可以批准 exec 和插件审批。
- 在高优先级 hook 请求批准后，低优先级的 `block: true` 仍然可以阻止。
- `onResolution` 接收已解析的审批决策 —— `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

### 工具结果持久化

工具结果可以包含用于 UI 渲染、诊断、
媒体路由或插件拥有的元数据的结构化 `details`。请将 `details` 视为运行时元数据，
而非提示内容：

- OpenClaw 会在提供商重放和压缩
  输入之前剥离 `toolResult.details`，以防止元数据成为模型上下文。
- 持久化的会话条目仅保留有界的 `details`。过大的详细信息
  将被替换为紧凑的摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终的
  持久化上限之前运行。Hook 仍应保持返回的 `details` 较小，并避免
  仅在 `details` 中放置与提示相关的文本；将模型可见的工具输出
  放在 `content` 中。

## 提示和模型钩子

为新插件使用特定阶段的钩子：

- `before_model_resolve`：仅接收当前提示和附件
  元数据。返回 `providerOverride` 或 `modelOverride`。
- `before_prompt_build`：接收当前的提示和会话消息。
  返回 `prependContext`、`systemPrompt`、`prependSystemContext` 或
  `appendSystemContext`。

`before_agent_start` 保留以用于兼容。首选上述明确的钩子，
以便您的插件不依赖于遗留的合并阶段。

当 OpenClaw 能识别活动运行时，
`before_agent_start` 和 `agent_end` 会包含 `event.runId`。
相同的值也可在 `ctx.runId` 上获取。
Cron 驱动的运行还会暴露 `ctx.jobId`（原始 cron 任务 id），以便
插件钩子可以将指标、副作用或状态限定于特定的计划
任务。

使用 `model_call_started` 和 `model_call_ended` 进行提供商调用遥测，
这些遥测不应接收原始提示、历史记录、响应、标头、请求
正文或提供商请求 ID。这些钩子包括稳定的元数据，例如
`runId`、`callId`、`provider`、`model`、可选的
`api`/`transport`、终端
`durationMs`/`outcome`，以及当 OpenClaw 能导出
有界的提供商请求 id 哈希时的 `upstreamRequestIdHash`。

`before_agent_finalize` 仅在 harness 即将接受自然的
最终助手回答时运行。它不是 `/stop` 取消路径，当用户中止轮次时不会运行。
返回 `{ action: "revise", reason }` 以在最终确定之前请求
harness 进行又一次模型传递，`{ action:
"finalize", reason? }` 以强制最终确定，或省略结果以继续。
Codex 原生 `Stop` 钩子作为 OpenClaw
`before_agent_finalize` 决策被中继到此钩子。

非捆绑插件如果需要 `llm_input`、`llm_output`、
`before_agent_finalize` 或 `agent_end`，必须设置：

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

可以通过
`plugins.entries.<id>.hooks.allowPromptInjection=false` 针对每个插件禁用提示变更钩子。

## 消息钩子

使用消息钩子进行渠道级路由和交付策略：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、
  `senderId`、可选的运行/会话关联以及元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `message_sent`：观察最终的成功或失败。

对于纯音频 TTS 回复，即使渠道负载中没有可见的文本/字幕，`content` 也可能包含隐藏的口述记录。
重写该 `content` 仅更新钩子可见的记录；它不会作为媒体
字幕呈现。

消息钩子上下文在可用时暴露稳定的关联字段：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在读取旧版元数据之前，请优先
使用这些一等字段。

在使用特定于渠道的元数据之前，请优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- 带有 `cancel: true` 的 `message_sending` 是终结性的。
- 带有 `cancel: false` 的 `message_sending` 被视为无决策。
- 重写的 `content` 会继续传递给较低优先级的钩子，除非后续的钩子
  取消了交付。

## 安装钩子

`before_install` 在对技能和插件安装进行内置扫描后运行。
返回其他发现结果或 `{ block: true, blockReason }` 以停止
安装。

`block: true` 是终结性的。`block: false` 被视为无决策。

## Gateway(网关) 生命周期

对于需要 Gateway(网关) 拥有状态的插件服务，请使用 `gateway_start`。上下文暴露了 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 用于 cron 检查和更新。使用 `gateway_stop` 来清理长期运行的资源。

不要依赖内部的 `gateway:startup` hook 来处理插件拥有的运行时服务。

## 即将弃用的功能

一些与 hook 相关的接口已被弃用，但仍受支持。请在下一个主要版本发布之前进行迁移：

- `inbound_claim` 和 `message_received` 处理程序中的 **明文渠道信封**。请读取 `BodyForAgent` 和结构化的用户上下文块，而不是解析扁平的信封文本。请参阅 [Plaintext 渠道 envelopes → BodyForAgent](/zh/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 保留用于兼容性。新插件应使用 `before_model_resolve` 和 `before_prompt_build`，而不是合并的阶段。
- **`onResolution` in `before_tool_call`** 现在使用类型化的 `PluginApprovalResolution` 联合（`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`），而不是自由形式的 `string`。

有关完整列表——内存能力注册、提供商思考配置文件、外部身份验证提供商、提供商发现类型、任务运行时访问器以及 `command-auth` → `command-status` 重命名——请参阅 [Plugin SDK migration → Active deprecations](/zh/plugins/sdk-migration#active-deprecations)。

## 相关

- [Plugin SDK migration](/zh/plugins/sdk-migration) — 活跃的弃用功能和移除时间表
- [构建插件](/zh/plugins/building-plugins)
- [Plugin SDK 概述](/zh/plugins/sdk-overview)
- [Plugin 入口点](/zh/plugins/sdk-entrypoints)
- [内部 hooks](/zh/automation/hooks)
- [Plugin 架构内部原理](/zh/plugins/architecture-internals)
