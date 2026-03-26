---
title: "Pi 整合架構"
summary: "OpenClaw 嵌入式 Pi 代理整合與會話生命週期的架構"
read_when:
  - Understanding Pi SDK integration design in OpenClaw
  - Modifying agent session lifecycle, tooling, or provider wiring for Pi
---

# Pi 整合架構

本文檔描述 OpenClaw 如何與 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其相關套件 (`pi-ai`, `pi-agent-core`, `pi-tui`) 整合，以驅動其 AI 代理功能。

## 概覽

OpenClaw 使用 pi SDK 將 AI 編碼代理嵌入到其訊息閘道架構中。OpenClaw 不會將 pi 作為子程序產生，也不使用 RPC 模式，而是透過 `createAgentSession()` 直接匯入並實例化 pi 的 `AgentSession`。這種嵌入式方法提供了：

- 對會話生命週期和事件處理的完全控制
- 自訂工具注入（訊息傳遞、沙箱、特定頻道操作）
- 針對每個頻道/情境的系統提示詞客製化
- 具備分支/壓縮支援的會話持久化
- 具有故障轉移功能的多帳號認證設定檔輪替
- 與提供者無關的模型切換

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
| `pi-ai`           | 核心 LLM 抽象：`Model`、`streamSimple`、訊息類型、提供者 API                               |
| `pi-agent-core`   | Agent 迴圈、工具執行、`AgentMessage` 類型                                                  |
| `pi-coding-agent` | 高階 SDK：`createAgentSession`、`SessionManager`、`AuthStorage`、`ModelRegistry`、內建工具 |
| `pi-tui`          | 終端機 UI 元件（用於 OpenClaw 的本機 TUI 模式）                                            |

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

特定於頻道的訊息動作執行時現在位於外掛程式擁有的擴充功能目錄中，而不是在 `src/agents/tools` 下，例如：

- `extensions/discord/src/actions/runtime*.ts`
- `extensions/slack/src/action-runtime.ts`
- `extensions/telegram/src/action-runtime.ts`
- `extensions/whatsapp/src/action-runtime.ts`

## 核心整合流程

### 1. 執行嵌入式代理程式

主要的進入點是 `runEmbeddedPiAgent()` 中的 `pi-embedded-runner/run.ts`：

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

### 2. 建立工作階段

在 `runEmbeddedAttempt()` （由 `runEmbeddedPiAgent()` 呼叫）內部，使用了 pi SDK：

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

### 3. 事件訂閱

`subscribeEmbeddedPiSession()` 訂閱 pi 的 `AgentSession` 事件：

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

處理的事件包括：

- `message_start` / `message_end` / `message_update` （串流文字/思考）
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. 提示（Prompting）

設定完成後，會向會話發送提示：

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

SDK 處理完整的代理循環：發送給 LLM、執行工具調用、串流回應。

圖片注入是局部的：OpenClaw 從當前提示中載入圖片參照，並僅在該輪次中透過 `images` 傳遞它們。它不會重新掃描較舊的歷史輪次來重新注入圖片內容。

## 工具架構

### 工具管道

1. **基礎工具**：pi 的 `codingTools`（read、bash、edit、write）
2. **自訂替換**：OpenClaw 將 bash 替換為 `exec`/`process`，並針對沙箱自訂讀取/編輯/寫入操作
3. **OpenClaw 工具**：訊息傳遞、瀏覽器、畫布、會話、排程、閘道等
4. **通道工具**：針對 Discord/Telegram/Slack/WhatsApp 的特定動作工具
5. **策略過濾**：工具依據設定檔、提供者、代理程式、群組、沙箱策略進行過濾
6. **架構正規化**：針對 Gemini/OpenAI 的怪異行為清理架構
7. **AbortSignal 包裝**：工具經包裝以遵守中止訊號

### 工具定義配接器

pi-agent-core 的 `AgentTool` 的 `execute` 簽章與 pi-coding-agent 的 `ToolDefinition` 不同。位於 `pi-tool-definition-adapter.ts` 的配接器將其連接起來：

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

`splitSdkTools()` 透過 `customTools` 傳遞所有工具：

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // Empty. We override everything
    customTools: toToolDefinitions(options.tools),
  };
}
```

這確保了 OpenClaw 的策略過濾、沙盒整合和擴展工具集在各供應商之間保持一致。

## 系統提示詞建構

系統提示詞是在 `buildAgentSystemPrompt()` (`system-prompt.ts`) 中建構的。它將包含工具、工具呼叫風格、安全防護、OpenClaw CLI 參考、技能、文件、工作區、沙盒、訊息、回覆標籤、語音、靜默回覆、心跳、執行時元資料，以及啟用時的記憶和反應、可選的上下文檔案和額外系統提示詞內容等部分組合成完整的提示詞。對於子代理使用的最小提示詞模式，會修剪這些部分。

提示詞在建立會話後透過 `applySystemPromptOverrideToSession()` 套用：

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## 會話管理

### 會話檔案

Sessions 為具有樹狀結構（id/parentId 連結）的 JSONL 檔案。Pi 的 `SessionManager` 負責處理持久化：

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw 使用 `guardSessionManager()` 封裝此功能，以確保工具結果的安全性。

### Session Caching

`session-manager-cache.ts` 快取 SessionManager 實例以避免重複檔案解析：

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### History Limiting

`limitHistoryTurns()` 根據頻道類型（DM vs 群組）修剪對話歷史。

### Compaction

當上下文溢出時會觸發自動壓縮。`compactEmbeddedPiSessionDirect()` 處理手動壓縮：

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## Authentication & Model Resolution

### Auth Profiles

OpenClaw 維護一個 auth profile store，每個提供商有多個 API 金鑰：

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

Profiles 在失敗時會輪換，並追蹤冷卻時間：

```typescript
await markAuthProfileFailure({ store, profileId, reason, cfg, agentDir });
const rotated = await advanceAuthProfile();
```

### Model Resolution

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

### Failover

`FailoverError` 在設定時觸發模型備用：

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

## Pi Extensions

OpenClaw 載入自訂 pi 擴充功能以實現專門行為：

### 壓縮防護

`src/agents/pi-extensions/compaction-safeguard.ts` 為壓縮程序加入防護機制，包括彈性 token 預算分配，以及工具失敗和檔案操作摘要：

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### 內容修剪

`src/agents/pi-extensions/context-pruning.ts` 實作了基於 cache-TTL 的內容修剪：

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

`EmbeddedBlockChunker` 管理將串流文字劃分為離散回覆區塊的作業：

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### 思考/最終標籤剝離

串流輸出會經過處理，以剝離 `<think>`/`<thinking>` 區塊並擷取 `<final>` 內容：

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### 回覆指令

回覆指令如 `[[media:url]]`、`[[voice]]`、`[[reply:id]]` 會經過解析與擷取：

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## 錯誤處理

### 錯誤分類

`pi-embedded-helpers.ts` 對錯誤進行分類以進行適當的處理：

```typescript
isContextOverflowError(errorText)     // Context too large
isCompactionFailureError(errorText)   // Compaction failed
isAuthAssistantError(lastAssistant)   // Auth failure
isRateLimitAssistantError(...)        // Rate limited
isFailoverAssistantError(...)         // Should failover
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### 思考層級後備

如果不支援某個思考層級，則會回退：

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

- 拒絕魔術字串清理
- 連續角色的輪次驗證
- Claude Code 參數相容性

### Google/Gemini

- 輪次排序修正 (`applyGoogleTurnOrderingFix`)
- 工具架構清理 (`sanitizeToolsForGoogle`)
- 對話記錄清理 (`sanitizeSessionHistory`)

### OpenAI

- 用於 Codex 模型的 `apply_patch` 工具
- 思考層級降級處理

## TUI 整合

OpenClaw 還有一個本地 TUI 模式，可直接使用 pi-tui 元件：

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

這提供了類似於 pi 原生模式的互動式終端體驗。

## 與 Pi CLI 的主要區別

| 方面       | Pi CLI                  | OpenClaw 內嵌                                                                                  |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 調用方式   | `pi` 指令 / RPC         | 透過 `createAgentSession()` 的 SDK                                                             |
| 工具       | 預設編碼工具            | 自訂 OpenClaw 工具套件                                                                         |
| 系統提示詞 | AGENTS.md + prompts     | 依頻道/語境動態變化                                                                            |
| 會話儲存   | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/` (或 `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| 驗證       | 單一憑證                | 多設定檔並支援輪替                                                                             |
| 擴充功能   | 從磁碟載入              | 程式化 + 磁碟路徑                                                                              |
| 事件處理   | TUI 渲染                | 基於回呼 (onBlockReply 等)                                                                     |

## 未來考量

潛在重構領域：

1. **工具簽章對齊**：目前正於 pi-agent-core 和 pi-coding-agent 簽章之間進行適配
2. **會話管理器封裝**：`guardSessionManager` 增加了安全性但也提高了複雜度
3. **Extension loading**: Could use pi's `ResourceLoader` more directly
4. **Streaming handler complexity**: `subscribeEmbeddedPiSession` has grown large
5. **Provider quirks**: Many provider-specific codepaths that pi could potentially handle

## Tests

Pi integration coverage spans these suites:

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

Live/opt-in:

- `src/agents/pi-embedded-runner-extraparams.live.test.ts` (enable `OPENCLAW_LIVE_TEST=1`)

For current run commands, see [Pi Development Workflow](/zh-Hant/pi-dev).

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
