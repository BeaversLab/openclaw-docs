---
summary: "OpenClaw 嵌入式 Pi 代理集成和会话生命周期的架构"
title: "Pi 集成架构"
read_when:
  - Understanding Pi SDK integration design in OpenClaw
  - Modifying agent session lifecycle, tooling, or provider wiring for Pi
---

OpenClaw 与 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其同级软件包 (`pi-ai`, `pi-agent-core`, `pi-tui`) 集成，以驱动其 AI 代理功能。

## 概述

OpenClaw 使用 pi SDK 将 AI 编码代理嵌入到其消息网关架构中。OpenClaw 不将 pi 作为子进程生成或使用 RPC 模式，而是通过 `createAgentSession()` 直接导入并实例化 pi 的 `AgentSession`。这种嵌入式方法提供了：

- 对会话生命周期和事件处理的完全控制
- 自定义工具注入（消息、沙盒、渠道特定操作）
- 根据渠道/上下文自定义系统提示
- 支持分支/压缩的会话持久化
- 具有故障转移功能的多账户身份验证配置轮换
- 与提供商无关的模型切换

## 包依赖项

```json
{
  "@earendil-works/pi-agent-core": "0.75.1",
  "@earendil-works/pi-ai": "0.75.1",
  "@earendil-works/pi-coding-agent": "0.75.1",
  "@earendil-works/pi-tui": "0.75.1"
}
```

| 包                | 用途                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `pi-ai`           | 核心 LLM 抽象：`Model`、`streamSimple`、消息类型、提供商 API                               |
| `pi-agent-core`   | 代理循环、工具执行、`AgentMessage` 类型                                                    |
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

特定于渠道的消息操作运行时现在位于插件拥有的扩展目录中，而不是位于 `src/agents/tools` 下，例如：

- Discord 插件操作运行时文件
- Slack 插件操作运行时文件
- Telegram 插件操作运行时文件
- WhatsApp 插件操作运行时文件

## 核心集成流程

### 1. 运行嵌入式代理

主入口点是 `pi-embedded-runner/run.ts` 中的 `runEmbeddedPiAgent()`：

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

### 2. 创建会话

在 `runEmbeddedAttempt()`（由 `runEmbeddedPiAgent()` 调用）内部，使用了 pi SDK：

```typescript
import { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";

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
- `compaction_start` / `compaction_end`

### 4. 提示（Prompting）

设置完成后，对会话进行提示：

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

SDK 处理完整的代理循环：发送到 LLM，执行工具调用，流式传输响应。

图像注入是提示本地的：OpenClaw 从当前提示加载图像引用，并仅通过 `images` 为该轮传递它们。它不会重新扫描旧的历史轮次以重新注入图像负载。

## 工具架构

### 工具管道

1. **基础工具**：pi 的 `codingTools`（read, bash, edit, write）
2. **自定义替换**：OpenClaw 用 `exec`/`process` 替换 bash，为沙箱自定义 read/edit/write
3. **OpenClaw 工具**：messaging, browser, canvas, sessions, cron, gateway 等。
4. **频道工具**：Discord/Telegram/Slack/WhatsApp 特定操作工具
5. **策略过滤**：按 profile、提供商、agent、group、sandbox 策略过滤工具
6. **架构规范化**：针对 Gemini/OpenAI 的怪癖清理架构
7. **AbortSignal 封装**：封装工具以遵守中止信号

### 工具定义适配器

pi-agent-core 的 `AgentTool` 与 pi-coding-agent 的 `ToolDefinition` 具有不同的 `execute` 签名。`pi-tool-definition-adapter.ts` 中的适配器弥合了这一差异：

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

这确保了 OpenClaw 的策略过滤、沙箱集成和扩展工具集在各提供商之间保持一致。

## 系统提示构建

系统提示词是在 `buildAgentSystemPrompt()` (`system-prompt.ts`OpenClaw) 中构建的。它组装了一个完整的提示词，包含多个部分，包括工具、工具调用风格、安全防护、OpenClaw 控制、Skills、文档、工作区、沙箱、消息传递、助手输出指令、语音、静默回复、心跳、运行时元数据，以及启用时的记忆和反应，还有可选的上下文文件和额外的系统提示词内容。对于子代理使用的最小提示词模式，会对这些部分进行修剪。

提示词在通过 `applySystemPromptOverrideToSession()` 创建会话后应用：

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## 会话管理

### 会话文件

会话是具有树状结构（id/parentId 链接）的 JSONL 文件。Pi 的 `SessionManager` 负责持久化：

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw 使用 `guardSessionManager()` 对此进行封装，以确保工具结果的安全性。

### 会话缓存

`session-manager-cache.ts` 缓存 SessionManager 实例以避免重复的文件解析：

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### 历史记录限制

`limitHistoryTurns()` 根据渠道类型（私信与群组）对对话历史进行裁剪。

### 压缩

当上下文溢出时触发自动压缩。常见的溢出特征包括 `request_too_large`, `context length exceeded`, `input exceeds the
maximum number of tokens`, `input token count exceeds the maximum number of
input tokens`, `input is too long for the 模型`, and `ollama error: context
length exceeded`. `compactEmbeddedPiSessionDirect()` 处理手动压缩：

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## 身份验证和模型解析

### 身份验证配置

OpenClaw 维护一个身份验证配置存储，每个提供商拥有多个 API 密钥：

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

配置文件在发生故障时会轮换，并跟踪冷却时间：

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

配置后，`FailoverError` 会触发模型回退：

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

OpenClaw 加载自定义 pi 扩展以实现专门的行为：

### 压缩防护

`src/agents/pi-hooks/compaction-safeguard.ts` 为压缩增加了防护措施，包括自适应令牌预算以及工具失败和文件操作摘要：

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

## 流式传输和块回复

### 块分块

`EmbeddedBlockChunker` 将流式文本管理为离散的回复块：

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### Thinking/Final 标签剥离

对流式输出进行处理，以剥离 `<think>`/`<thinking>` 块并提取 `<final>` 内容：

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### 回复指令

诸如 `[[media:url]]`、`[[voice]]`、`[[reply:id]]` 等回复指令会被解析和提取：

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## 错误处理

### 错误分类

`pi-embedded-helpers.ts` 对错误进行分类以进行适当的处理：

```typescript
isContextOverflowError(errorText)     // Context too large
isCompactionFailureError(errorText)   // Compaction failed
isAuthAssistantError(lastAssistant)   // Auth failure
isRateLimitAssistantError(...)        // Rate limited
isFailoverAssistantError(...)         // Should failover
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### 思考级别回退

如果某个思考级别不受支持，则会回退：

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

- 拒绝魔幻字符串清除
- 连续角色的轮次验证
- 严格的上游 Pi 工具参数验证

### Google/Gemini

- 插件拥有的工具架构清理

### OpenAI

- 用于 Codex 模型的 `apply_patch` 工具
- 思考级别降级处理

## TUI 集成

OpenClaw 还有一种本地 TUI 模式，可直接使用 pi-tui 组件：

```typescript
// src/tui/tui.ts
import { ... } from "@earendil-works/pi-tui";
```

这提供了类似于 Pi 原生模式的交互式终端体验。

## 与 Pi CLI 的主要区别

| 方面       | Pi CLI                  | OpenClaw 嵌入式                                                                                |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 调用       | `pi` 命令 / RPC         | 通过 `createAgentSession()` 的 SDK                                                             |
| 工具       | 默认编码工具            | 自定义 OpenClaw 工具套件                                                                       |
| 系统提示词 | AGENTS.md + 提示词      | 动态针对渠道/上下文                                                                            |
| 会话存储   | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/` (或 `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| 身份验证   | 单一凭证                | 支持轮换的多配置文件                                                                           |
| 扩展       | 从磁盘加载              | 程序化 + 磁盘路径                                                                              |
| 事件处理   | TUI 渲染                | 基于回调（onBlockReply 等）                                                                    |

## 未来考量

可能需要重构的领域：

1. **工具签名对齐**：目前正在调整 pi-agent-core 和 pi-coding-agent 签名之间的差异
2. **会话管理器封装**：`guardSessionManager` 增加了安全性但也提高了复杂性
3. **扩展加载**：可以更直接地使用 Pi 的 `ResourceLoader`
4. **流式处理程序复杂性**：`subscribeEmbeddedPiSession` 变得过于庞大
5. **提供商的特殊之处**：许多特定于提供商的代码路径，pi 可能潜在地处理它们

## 测试

Pi 集成覆盖范围包括以下套件：

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

有关当前运行命令，请参阅 [Pi 开发工作流程](/zh/pi-dev)。

## 相关

- [Pi 开发工作流程](/zh/pi-dev)
- [安装概述](/zh/install)
