---
title: "Pi 集成架构"
summary: "OpenClaw 嵌入式 Pi 代理集成和会话生命周期的架构"
read_when:
  - Understanding Pi SDK integration design in OpenClaw
  - Modifying agent session lifecycle, tooling, or provider wiring for Pi
---

# Pi 集成架构

本文档描述了 OpenClaw 如何与 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其同级包（`pi-ai`、`pi-agent-core`、`pi-tui`）集成，以驱动其 AI 智能体功能。

## 概述

OpenClaw 使用 pi SDK 将 AI 编码代理嵌入到其消息网关架构中。OpenClaw 不会将 pi 作为子进程生成或使用 RPC 模式，而是通过 `createAgentSession()` 直接导入并实例化 pi 的 `AgentSession`。这种嵌入式方法提供了：

- 对会话生命周期和事件处理的完全控制
- 自定义工具注入（消息传递、沙盒、特定于频道的操作）
- 每个频道/上下文的系统提示定制
- 具有分支/压缩支持的会话持久性
- 支持故障转移的多账户身份验证配置轮换
- 与提供商无关的模型切换

## 包依赖项

```json
{
  "@mariozechner/pi-agent-core": "0.64.0",
  "@mariozechner/pi-ai": "0.64.0",
  "@mariozechner/pi-coding-agent": "0.64.0",
  "@mariozechner/pi-tui": "0.64.0"
}
```

| 包                | 用途                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `pi-ai`           | 核心 LLM 抽象：`Model`、`streamSimple`、消息类型、提供商 API                               |
| `pi-agent-core`   | 智能体循环、工具执行、`AgentMessage` 类型                                                  |
| `pi-coding-agent` | 高级 SDK：`createAgentSession`、`SessionManager`、`AuthStorage`、`ModelRegistry`、内置工具 |
| `pi-tui`          | 终端 UI 组件（用于 OpenClaw 的本地 TUI 模式）                                              |

## 文件结构

```
src/agents/
├── pi-embedded-runner.ts          # Re-exports from pi-embedded-runner/
├── pi-embedded-runner/
│   ├── run.ts                     # Main entry: runEmbeddedPiAgent()
│   ├── run/
│   │   ├── attempt.ts             # Single attempt logic with session setup
│   │   ├── params.ts              # RunEmbeddedPiAgentParams type
│   │   ├── payloads.ts            # Build response payloads from run results
│   │   ├── images.ts              # Vision model image injection
│   │   └── types.ts               # EmbeddedRunAttemptResult
│   ├── abort.ts                   # Abort error detection
│   ├── cache-ttl.ts               # Cache TTL tracking for context pruning
│   ├── compact.ts                 # Manual/auto compaction logic
│   ├── extensions.ts              # Load pi extensions for embedded runs
│   ├── extra-params.ts            # Provider-specific stream params
│   ├── google.ts                  # Google/Gemini turn ordering fixes
│   ├── history.ts                 # History limiting (DM vs group)
│   ├── lanes.ts                   # Session/global command lanes
│   ├── logger.ts                  # Subsystem logger
│   ├── model.ts                   # Model resolution via ModelRegistry
│   ├── runs.ts                    # Active run tracking, abort, queue
│   ├── sandbox-info.ts            # Sandbox info for system prompt
│   ├── session-manager-cache.ts   # SessionManager instance caching
│   ├── session-manager-init.ts    # Session file initialization
│   ├── system-prompt.ts           # System prompt builder
│   ├── tool-split.ts              # Split tools into builtIn vs custom
│   ├── types.ts                   # EmbeddedPiAgentMeta, EmbeddedPiRunResult
│   └── utils.ts                   # ThinkLevel mapping, error description
├── pi-embedded-subscribe.ts       # Session event subscription/dispatch
├── pi-embedded-subscribe.types.ts # SubscribeEmbeddedPiSessionParams
├── pi-embedded-subscribe.handlers.ts # Event handler factory
├── pi-embedded-subscribe.handlers.lifecycle.ts
├── pi-embedded-subscribe.handlers.types.ts
├── pi-embedded-block-chunker.ts   # Streaming block reply chunking
├── pi-embedded-messaging.ts       # Messaging tool sent tracking
├── pi-embedded-helpers.ts         # Error classification, turn validation
├── pi-embedded-helpers/           # Helper modules
├── pi-embedded-utils.ts           # Formatting utilities
├── pi-tools.ts                    # createOpenClawCodingTools()
├── pi-tools.abort.ts              # AbortSignal wrapping for tools
├── pi-tools.policy.ts             # Tool allowlist/denylist policy
├── pi-tools.read.ts               # Read tool customizations
├── pi-tools.schema.ts             # Tool schema normalization
├── pi-tools.types.ts              # AnyAgentTool type alias
├── pi-tool-definition-adapter.ts  # AgentTool -> ToolDefinition adapter
├── pi-settings.ts                 # Settings overrides
├── pi-hooks/                      # Custom pi hooks
│   ├── compaction-safeguard.ts    # Safeguard extension
│   ├── compaction-safeguard-runtime.ts
│   ├── context-pruning.ts         # Cache-TTL context pruning extension
│   └── context-pruning/
├── model-auth.ts                  # Auth profile resolution
├── auth-profiles.ts               # Profile store, cooldown, failover
├── model-selection.ts             # Default model resolution
├── models-config.ts               # models.json generation
├── model-catalog.ts               # Model catalog cache
├── context-window-guard.ts        # Context window validation
├── failover-error.ts              # FailoverError class
├── defaults.ts                    # DEFAULT_PROVIDER, DEFAULT_MODEL
├── system-prompt.ts               # buildAgentSystemPrompt()
├── system-prompt-params.ts        # System prompt parameter resolution
├── system-prompt-report.ts        # Debug report generation
├── tool-summaries.ts              # Tool description summaries
├── tool-policy.ts                 # Tool policy resolution
├── transcript-policy.ts           # Transcript validation policy
├── skills.ts                      # Skill snapshot/prompt building
├── skills/                        # Skill subsystem
├── sandbox.ts                     # Sandbox context resolution
├── sandbox/                       # Sandbox subsystem
├── channel-tools.ts               # Channel-specific tool injection
├── openclaw-tools.ts              # OpenClaw-specific tools
├── bash-tools.ts                  # exec/process tools
├── apply-patch.ts                 # apply_patch tool (OpenAI)
├── tools/                         # Individual tool implementations
│   ├── browser-tool.ts
│   ├── canvas-tool.ts
│   ├── cron-tool.ts
│   ├── gateway-tool.ts
│   ├── image-tool.ts
│   ├── message-tool.ts
│   ├── nodes-tool.ts
│   ├── session*.ts
│   ├── web-*.ts
│   └── ...
└── ...
```

特定于频道的消息操作运行时现在位于插件拥有的扩展目录中，而不是位于 `src/agents/tools` 下，例如：

- Discord 插件操作运行时文件
- Slack 插件操作运行时文件
- Telegram 插件操作运行时文件
- WhatsApp 插件操作运行时文件

## 核心集成流程

### 1. 运行嵌入式代理

主要入口点是 `pi-embedded-runner/run.ts` 中的 `runEmbeddedPiAgent()`：

```typescript
import { runEmbeddedPiAgent } from "./agents/pi-embedded-runner.js";

const result = await runEmbeddedPiAgent({
  sessionId: "user-123",
  sessionKey: "main:whatsapp:+1234567890",
  sessionFile: "/path/to/session.jsonl",
  workspaceDir: "/path/to/workspace",
  config: openclawConfig,
  prompt: "Hello, how are you?",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  timeoutMs: 120_000,
  runId: "run-abc",
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
});
```

### 2. 会话创建

在 `runEmbeddedAttempt()`（由 `runEmbeddedPiAgent()` 调用）内部，使用了 pi SDK：

```typescript
import { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager } from "@mariozechner/pi-coding-agent";

const resourceLoader = new DefaultResourceLoader({
  cwd: resolvedWorkspace,
  agentDir,
  settingsManager,
  additionalExtensionPaths,
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  cwd: resolvedWorkspace,
  agentDir,
  authStorage: params.authStorage,
  modelRegistry: params.modelRegistry,
  model: params.model,
  thinkingLevel: mapThinkingLevel(params.thinkLevel),
  tools: builtInTools,
  customTools: allCustomTools,
  sessionManager,
  settingsManager,
  resourceLoader,
});

applySystemPromptOverrideToSession(session, systemPromptOverride);
```

### 3. 事件订阅

`subscribeEmbeddedPiSession()` 订阅 pi 的 `AgentSession` 事件：

```typescript
const subscription = subscribeEmbeddedPiSession({
  session: activeSession,
  runId: params.runId,
  verboseLevel: params.verboseLevel,
  reasoningMode: params.reasoningLevel,
  toolResultFormat: params.toolResultFormat,
  onToolResult: params.onToolResult,
  onReasoningStream: params.onReasoningStream,
  onBlockReply: params.onBlockReply,
  onPartialReply: params.onPartialReply,
  onAgentEvent: params.onAgentEvent,
});
```

处理的事件包括：

- `message_start` / `message_end` / `message_update`（流式文本/思考）
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. 提示

设置完成后，将对会话进行提示：

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

SDK 处理完整的代理循环：发送给 LLM、执行工具调用、流式传输响应。

图像注入是提示词本地的：OpenClaw 从当前提示词加载图像引用，并仅在该轮次通过 `images` 传递它们。它不会重新扫描较早的历史轮次以重新注入图像有效载荷。

## 工具架构

### 工具流水线

1. **基础工具**：pi 的 `codingTools`（读取、bash、编辑、写入）
2. **自定义替换**：OpenClaw 用 `exec`/`process` 替换 bash，并为沙箱自定义读取/编辑/写入
3. **OpenClaw 工具**：消息传递、浏览器、画布、会话、cron、网关等。
4. **频道工具**：Discord/Telegram/Slack/WhatsApp 特定的操作工具
5. **策略过滤**：根据配置文件、提供商、代理、组、沙箱策略筛选工具
6. **模式规范化**：针对 Gemini/OpenAI 的特性清理模式
7. **AbortSignal 封装**：封装工具以遵循中止信号

### 工具定义适配器

pi-agent-core 的 `AgentTool` 具有与 pi-coding-agent 的 `ToolDefinition` 不同的 `execute` 签名。`pi-tool-definition-adapter.ts` 中的适配器弥合了这一点：

```typescript
export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.label ?? name,
    description: tool.description ?? "",
    parameters: tool.parameters,
    execute: async (toolCallId, params, onUpdate, _ctx, signal) => {
      // pi-coding-agent signature differs from pi-agent-core
      return await tool.execute(toolCallId, params, signal, onUpdate);
    },
  }));
}
```

### 工具拆分策略

`splitSdkTools()` 通过 `customTools` 传递所有工具：

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // Empty. We override everything
    customTools: toToolDefinitions(options.tools),
  };
}
```

这确保了 OpenClaw 的策略过滤、沙箱集成和扩展工具集在提供商之间保持一致。

## 系统提示词构建

系统提示词在 `buildAgentSystemPrompt()` (`system-prompt.ts`) 中构建。它组装了一个包含以下部分的完整提示词：工具、工具调用风格、安全防护、OpenClaw CLI 参考、Skills、文档、工作区、沙箱、消息、回复标签、语音、静默回复、心跳、运行时元数据，以及启用时的记忆和反应，以及可选的上下文文件和额外的系统提示词内容。对于子代理使用的最小提示词模式，会对部分内容进行裁剪。

提示词在创建会话后通过 `applySystemPromptOverrideToSession()` 应用：

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## 会话管理

### 会话文件

会话是具有树结构（通过 id/parentId 链接）的 JSONL 文件。Pi 的 `SessionManager` 处理持久化：

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw 使用 `guardSessionManager()` 对其进行封装，以确保工具结果的安全性。

### 会话缓存

`session-manager-cache.ts` 缓存 SessionManager 实例以避免重复的文件解析：

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### 历史记录限制

`limitHistoryTurns()` 根据渠道类型（私信 vs 群组）裁剪对话历史。

### 压缩

当上下文溢出时会触发自动压缩。常见的溢出特征包括 `request_too_large`、`context length exceeded`、`input exceeds the
maximum number of tokens`, `input token count exceeds the maximum number of
input tokens`, `input is too long for the 模型`, and `ollama error: context
length exceeded`. `compactEmbeddedPiSessionDirect()` 处理手动压缩：

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## 身份验证与模型解析

### 身份验证配置文件

OpenClaw 维护一个身份验证配置文件存储，每个提供商有多个 API 密钥：

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

配置文件在失败时会轮换，并带有冷却跟踪：

```typescript
await markAuthProfileFailure({ store, profileId, reason, cfg, agentDir });
const rotated = await advanceAuthProfile();
```

### 模型解析

```typescript
import { resolveModel } from "./pi-embedded-runner/model.js";

const { model, error, authStorage, modelRegistry } = resolveModel(provider, modelId, agentDir, config);

// Uses pi's ModelRegistry and AuthStorage
authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
```

### 故障转移

`FailoverError` 在配置时触发模型回退：

```typescript
if (fallbackConfigured && isFailoverErrorMessage(errorText)) {
  throw new FailoverError(errorText, {
    reason: promptFailoverReason ?? "unknown",
    provider,
    model: modelId,
    profileId,
    status: resolveFailoverStatus(promptFailoverReason),
  });
}
```

## Pi 扩展

OpenClaw 加载自定义 pi 扩展以实现专门行为：

### 压缩保护

`src/agents/pi-hooks/compaction-safeguard.ts` 为压缩添加了防护措施，包括自适应 token 预算以及工具失败和文件操作摘要：

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### 上下文修剪

`src/agents/pi-hooks/context-pruning.ts` 实现了基于缓存 TTL 的上下文修剪：

```typescript
if (cfg?.agents?.defaults?.contextPruning?.mode === "cache-ttl") {
  setContextPruningRuntime(params.sessionManager, {
    settings,
    contextWindowTokens,
    isToolPrunable,
    lastCacheTouchAt,
  });
  paths.push(resolvePiExtensionPath("context-pruning"));
}
```

## 流式传输与块回复

### 块分块

`EmbeddedBlockChunker` 将流式文本管理为离散的回复块：

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### 思考/最终标签剥离

流式输出经过处理，以去除 `<think>`/`<thinking>` 块并提取 `<final>` 内容：

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### 回复指令

诸如 `[[media:url]]`、`[[voice]]`、`[[reply:id]]` 之类的回复指令会被解析和提取：

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## 错误处理

### 错误分类

`pi-embedded-helpers.ts` 对错误进行分类以便进行适当处理：

```typescript
isContextOverflowError(errorText)     // Context too large
isCompactionFailureError(errorText)   // Compaction failed
isAuthAssistantError(lastAssistant)   // Auth failure
isRateLimitAssistantError(...)        // Rate limited
isFailoverAssistantError(...)         // Should failover
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### 思考级别回退

如果不支持某个思考级别，它会回退：

```typescript
const fallbackThinking = pickFallbackThinkingLevel({
  message: errorText,
  attempted: attemptedThinking,
});
if (fallbackThinking) {
  thinkLevel = fallbackThinking;
  continue;
}
```

## 沙箱集成

当启用沙箱模式时，工具和路径会受到限制：

```typescript
const sandbox = await resolveSandboxContext({
  config: params.config,
  sessionKey: sandboxSessionKey,
  workspaceDir: resolvedWorkspace,
});

if (sandboxRoot) {
  // Use sandboxed read/edit/write tools
  // Exec runs in container
  // Browser uses bridge URL
}
```

## 特定于提供商的处理

### Anthropic

- 拒绝魔术字符串清理
- 连续角色的轮次验证
- 严格的上游 Pi 工具参数验证

### Google/Gemini

- 插件拥有的工具架构清理

### OpenAI

- 用于 Codex 模型的 `apply_patch` 工具
- 思考级别降级处理

## TUI 集成

OpenClaw 还有一个本地 TUI 模式，直接使用 pi-tui 组件：

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

这提供了类似于 pi 原生模式的交互式终端体验。

## 与 Pi CLI 的主要区别

| 方面       | Pi CLI                  | OpenClaw 嵌入式                                                                                |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 调用       | `pi` 命令 / RPC         | 通过 `createAgentSession()` 使用 SDK                                                           |
| 工具       | 默认编码工具            | 自定义 OpenClaw 工具套件                                                                       |
| 系统提示词 | AGENTS.md + 提示词      | 基于渠道/上下文的动态                                                                          |
| 会话存储   | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/` (或 `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| 身份验证   | 单一凭证                | 支持轮换的多配置文件                                                                           |
| 扩展       | 从磁盘加载              | 编程方式 + 磁盘路径                                                                            |
| 事件处理   | TUI 渲染                | 基于回调（onBlockReply 等）                                                                    |

## 未来考量

可能需要重做的领域：

1. **工具签名对齐**：目前正在适配 pi-agent-core 和 pi-coding-agent 之间的签名
2. **会话管理器包装**：`guardSessionManager` 增加了安全性但也增加了复杂性
3. **扩展加载**：可以直接使用 Pi 的 `ResourceLoader`
4. **流式处理程序复杂性**：`subscribeEmbeddedPiSession` 变得很大
5. **提供商怪癖**：许多提供商特定的代码路径，Pi 可能会潜在地处理

## 测试

Pi 集成覆盖范围涵盖以下套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-auth-json.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-embedded-helpers*.test.ts`
- `src/agents/pi-embedded-runner*.test.ts`
- `src/agents/pi-embedded-runner/**/*.test.ts`
- `src/agents/pi-embedded-subscribe*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-tool-definition-adapter*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-hooks/**/*.test.ts`

实时/可选：

- `src/agents/pi-embedded-runner-extraparams.live.test.ts` （启用 `OPENCLAW_LIVE_TEST=1`）

有关当前的运行命令，请参阅 [Pi 开发流程](/zh/pi-dev)。
