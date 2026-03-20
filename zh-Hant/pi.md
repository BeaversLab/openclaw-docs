---
title: "Pi 整合架構"
summary: "OpenClaw 嵌入式 Pi 代理整合與會話生命週期的架構"
read_when:
  - 了解 OpenClaw 中的 Pi SDK 整合設計
  - 修改 Pi 的代理會話生命週期、工具或供應商連線
---

# Pi 整合架構

本文檔描述 OpenClaw 如何與 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其相關套件 (`pi-ai`、`pi-agent-core`、`pi-tui`) 整合，以驅動其 AI 代理功能。

## 概覽

OpenClaw 使用 pi SDK 將 AI 編碼代理嵌入其訊息閘道架構中。與其將 pi 作為子程序生成或使用 RPC 模式，OpenClaw 直接透過 `createAgentSession()` 匯入並實例化 pi 的 `AgentSession`。這種嵌入式方法提供了：

- 對會話生命週期和事件處理的完全控制
- 自訂工具注入（訊息、沙箱、特定頻道操作）
- 依頻道/情境自訂系統提示
- 支援分支/壓縮的會話持久化
- 具備故障轉移功能的多帳號認證設定輪替
- 與供應商無關的模型切換

## 套件相依性

```json
{
  "@mariozechner/pi-agent-core": "0.49.3",
  "@mariozechner/pi-ai": "0.49.3",
  "@mariozechner/pi-coding-agent": "0.49.3",
  "@mariozechner/pi-tui": "0.49.3"
}
```

| 套件              | 用途                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `pi-ai`           | 核心 LLM 抽象：`Model`、`streamSimple`、訊息類型、供應商 API                               |
| `pi-agent-core`   | 代理迴圈、工具執行、`AgentMessage` 類型                                                    |
| `pi-coding-agent` | 高階 SDK：`createAgentSession`、`SessionManager`、`AuthStorage`、`ModelRegistry`、內建工具 |
| `pi-tui`          | 終端機 UI 組件（用於 OpenClaw 的本機 TUI 模式）                                            |

## 檔案結構

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
├── pi-extensions/                 # Custom pi extensions
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

特定頻道的訊息操作執行時現在位於外掛程式擁有的擴充功能目錄中，而不是在 `src/agents/tools` 下，例如：

- `extensions/discord/src/actions/runtime*.ts`
- `extensions/slack/src/action-runtime.ts`
- `extensions/telegram/src/action-runtime.ts`
- `extensions/whatsapp/src/action-runtime.ts`

## 核心整合流程

### 1. 執行嵌入式代理

主要進入點是 `pi-embedded-runner/run.ts` 中的 `runEmbeddedPiAgent()`：

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
  model: "claude-sonnet-4-20250514",
  timeoutMs: 120_000,
  runId: "run-abc",
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
});
```

### 2. Session Creation

Inside `runEmbeddedAttempt()` (called by `runEmbeddedPiAgent()`), the pi SDK is used:

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";

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

### 3. Event Subscription

`subscribeEmbeddedPiSession()` subscribes to pi's `AgentSession` events:

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

Events handled include:

- `message_start` / `message_end` / `message_update` (streaming text/thinking)
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. Prompting

After setup, the session is prompted:

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

The SDK handles the full agent loop: sending to LLM, executing tool calls, streaming responses.

Image injection is prompt-local: OpenClaw loads image refs from the current prompt and
passes them via `images` for that turn only. It does not re-scan older history turns
to re-inject image payloads.

## Tool Architecture

### Tool Pipeline

1. **Base Tools**: pi's `codingTools` (read, bash, edit, write)
2. **Custom Replacements**: OpenClaw replaces bash with `exec`/`process`, customizes read/edit/write for sandbox
3. **OpenClaw Tools**: messaging, browser, canvas, sessions, cron, gateway, etc.
4. **Channel Tools**: Discord/Telegram/Slack/WhatsApp-specific action tools
5. **Policy Filtering**: Tools filtered by profile, provider, agent, group, sandbox policies
6. **Schema Normalization**: Schemas cleaned for Gemini/OpenAI quirks
7. **AbortSignal Wrapping**: Tools wrapped to respect abort signals

### Tool Definition Adapter

pi-agent-core's `AgentTool` has a different `execute` signature than pi-coding-agent's `ToolDefinition`. The adapter in `pi-tool-definition-adapter.ts` bridges this:

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

### Tool Split Strategy

`splitSdkTools()` passes all tools via `customTools`:

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // Empty. We override everything
    customTools: toToolDefinitions(options.tools),
  };
}
```

This ensures OpenClaw's policy filtering, sandbox integration, and extended toolset remain consistent across providers.

## 系統提示詞建構

系統提示詞是在 `buildAgentSystemPrompt()` (`system-prompt.ts`) 中建構的。它會組合完整的提示詞，其中包含工具、工具呼叫風格、安全防護、OpenClaw CLI 參考、技能、文件、工作區、沙盒、訊息、回覆標籤、語音、靜默回覆、心跳、執行時期元資料，以及啟用時的記憶和反應，還有選用的情境檔案和額外的系統提示詞內容等區塊。針對子代理使用的最小提示詞模式，會對這些區塊進行修剪。

提示詞會在建立工作階段後透過 `applySystemPromptOverrideToSession()` 套用：

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## 工作階段管理

### 工作階段檔案

工作階段是具有樹狀結構（id/parentId 連結）的 JSONL 檔案。Pi 的 `SessionManager` 負責處理持久化：

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw 會使用 `guardSessionManager()` 將其包裝，以確保工具結果的安全性。

### 工作階段快取

`session-manager-cache.ts` 會快取 SessionManager 執行個體，以避免重複解析檔案：

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### 歷程記錄限制

`limitHistoryTurns()` 會根據頻道類型（DM 對群組）來修剪對話歷程記錄。

### 壓縮

當情境溢位時會觸發自動壓縮。`compactEmbeddedPiSessionDirect()` 負責處理手動壓縮：

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## 驗證與模型解析

### 驗證設定檔

OpenClaw 維護著一個驗證設定檔存放區，其中包含每個提供者的多個 API 金鑰：

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

設定檔會在失敗時輪替，並追蹤冷卻時間：

```typescript
await markAuthProfileFailure({ store, profileId, reason, cfg, agentDir });
const rotated = await advanceAuthProfile();
```

### 模型解析

```typescript
import { resolveModel } from "./pi-embedded-runner/model.js";

const { model, error, authStorage, modelRegistry } = resolveModel(
  provider,
  modelId,
  agentDir,
  config,
);

// Uses pi's ModelRegistry and AuthStorage
authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
```

### 失效備援

`FailoverError` 會在經過設定時觸發模型備援：

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

## Pi 擴充功能

OpenClaw 會載入自訂的 pi 擴充功能以實現特殊行為：

### 壓縮防護

`src/agents/pi-extensions/compaction-safeguard.ts` 會為壓縮程序加入防護機制，包括自適應 token 預算以及工具失敗和檔案操作的摘要：

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### 情境修剪

`src/agents/pi-extensions/context-pruning.ts` 實作了基於快取 TTL 的情境修剪：

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

## 串流與區塊回覆

### 區塊分塊

`EmbeddedBlockChunker` 負責管理將串流文字處理成離散的回覆區塊：

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### 思考/最終標籤剝除

串流輸出會經過處理，以剝除 `<think>`/`<thinking>` 區塊並擷取 `<final>` 內容：

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### 回覆指示

回覆指令如 `[[media:url]]`、`[[voice]]`、`[[reply:id]]` 會被解析並提取：

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## 錯誤處理

### 錯誤分類

`pi-embedded-helpers.ts` 會對錯誤進行分類以便進行適當的處理：

```typescript
isContextOverflowError(errorText)     // Context too large
isCompactionFailureError(errorText)   // Compaction failed
isAuthAssistantError(lastAssistant)   // Auth failure
isRateLimitAssistantError(...)        // Rate limited
isFailoverAssistantError(...)         // Should failover
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### 思考層級回退

如果不支援某個思考層級，它會回退：

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

## 沙盒整合

當啟用沙盒模式時，工具和路徑會受到限制：

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

## 供應商特定處理

### Anthropic

- 拒絕魔法字串清理
- 連續角色的輪次驗證
- Claude Code 參數相容性

### Google/Gemini

- 輪次排序修復 (`applyGoogleTurnOrderingFix`)
- 工具架構清理 (`sanitizeToolsForGoogle`)
- 對話歷史清理 (`sanitizeSessionHistory`)

### OpenAI

- 用於 Codex 模型的 `apply_patch` 工具
- 思考層級降級處理

## TUI 整合

OpenClaw 也有一個本機 TUI 模式，直接使用 pi-tui 組件：

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

這提供了類似於 pi 原生模式的互動式終端機體驗。

## 與 Pi CLI 的主要差異

| 層面       | Pi CLI                  | OpenClaw 內嵌                                                                                  |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 呼叫方式   | `pi` 指令 / RPC         | 透過 `createAgentSession()` 的 SDK                                                             |
| 工具       | 預設程式設計工具        | 自訂 OpenClaw 工具套件                                                                         |
| 系統提示詞 | AGENTS.md + 提示詞      | 每個頻道/情境動態生成                                                                          |
| 會話儲存   | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/` (或 `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| 驗證       | 單一憑證                | 多設定檔輪替                                                                                   |
| 擴充功能   | 從磁碟載入              | 程式化 + 磁碟路徑                                                                              |
| 事件處理   | TUI 渲染                | 基於回呼 (onBlockReply 等)                                                                     |

## 未來考量

潛在重構領域：

1. **工具簽章對齊**：目前需要調整 pi-agent-core 與 pi-coding-agent 的簽章
2. **會話管理器封裝**：`guardSessionManager` 增加了安全性但也提高了複雜度
3. **擴充功能載入**：可以更直接地使用 pi 的 `ResourceLoader`
4. **串流處理器複雜度**：`subscribeEmbeddedPiSession` 已經變得相當龐大
5. **供應商怪癖**：許多供應商特定的程式碼路徑，理論上 pi 可以自行處理

## 測試

Pi 整合涵蓋範圍包括以下測試套件：

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
- `src/agents/pi-extensions/**/*.test.ts`

即時/選用：

- `src/agents/pi-embedded-runner-extraparams.live.test.ts` (啟用 `OPENCLAW_LIVE_TEST=1`)

如需目前的執行指令，請參閱 [Pi 開發工作流程](/zh-Hant/pi-dev)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
