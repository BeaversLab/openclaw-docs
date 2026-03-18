---
title: "Pi 整合架構"
summary: "OpenClaw 嵌入式 Pi 代理程式整合與會議生命週期的架構"
read_when:
  - Understanding Pi SDK integration design in OpenClaw
  - Modifying agent session lifecycle, tooling, or provider wiring for Pi
---

# Pi 整合架構

本文描述 OpenClaw 如何與 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其相關套件 (`pi-ai`, `pi-agent-core`, `pi-tui`) 整合，以驅動其 AI 代理程式功能。

## 概覽

OpenClaw 使用 pi SDK 將 AI 程式碼代理程式嵌入到其訊息傳遞閘道架構中。與其將 pi 作為子程序生成或使用 RPC 模式，OpenClaw 直接透過 `createAgentSession()` 匯入並實例化 pi 的 `AgentSession`。這種嵌入式方法提供了：

- 對會話生命週期和事件處理的完全控制
- 自訂工具注入（訊息傳遞、沙盒、特定頻道操作）
- 針對每個頻道/情境的系統提示詞自訂
- 支援分支/壓縮的會話持久化
- 具有容錯移轉功能的多帳戶驗證設定檔輪替
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
| `pi-ai`           | 核心 LLM 抽象層：`Model`、`streamSimple`、訊息類型、供應商 API                             |
| `pi-agent-core`   | 代理程式迴圈、工具執行、`AgentMessage` 類型                                                |
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
│   ├── discord-actions*.ts
│   ├── gateway-tool.ts
│   ├── image-tool.ts
│   ├── message-tool.ts
│   ├── nodes-tool.ts
│   ├── session*.ts
│   ├── slack-actions.ts
│   ├── telegram-actions.ts
│   ├── web-*.ts
│   └── whatsapp-actions.ts
└── ...
```

## 核心整合流程

### 1. 執行嵌入式代理程式

主要的進入點是 `pi-embedded-runner/run.ts` 中的 `runEmbeddedPiAgent()`：

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

### 2. 建立會話

在 `runEmbeddedAttempt()`（由 `runEmbeddedPiAgent()` 呼叫）內部，使用了 pi SDK：

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

- `message_start` / `message_end` / `message_update` (串流文字/思考)
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. 提示詞

設定完成後，會對 session 發送提示詞：

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

SDK 處理完整的 agent 循環：發送至 LLM、執行工具呼叫、串流回應。

圖片注入是提示詞本地的：OpenClaw 從當前提示詞載入圖片引用，並僅在該輪次通過 `images` 傳遞。它不會重新掃描較舊的歷史輪次來重新注入圖片 payload。

## 工具架構

### 工具管線

1. **基礎工具**：pi 的 `codingTools` (read, bash, edit, write)
2. **自訂替換**：OpenClaw 用 `exec`/`process` 替換 bash，為沙盒自訂 read/edit/write
3. **OpenClaw 工具**：訊息、瀏覽器、畫布、工作階段、cron、閘道等。
4. **頻道工具**：Discord/Telegram/Slack/WhatsApp 特定的動作工具
5. **策略過濾**：根據設定檔、提供者、agent、群組、沙盒策略過濾工具
6. **Schema 正規化**：針對 Gemini/OpenAI 的怪癖清理 Schema
7. **AbortSignal 包裝**：包裝工具以遵守中止訊號

### 工具定義適配器

pi-agent-core 的 `AgentTool` 具有不同的 `execute` 簽名，不同於 pi-coding-agent 的 `ToolDefinition`。`pi-tool-definition-adapter.ts` 中的適配器橋接了這一點：

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

### 工具分割策略

`splitSdkTools()` 通過 `customTools` 傳遞所有工具：

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // Empty. We override everything
    customTools: toToolDefinitions(options.tools),
  };
}
```

這確保了 OpenClaw 的策略過濾、沙盒整合和擴展工具集在各提供者之間保持一致。

## 系統提示詞構建

系統提示詞建構於 `buildAgentSystemPrompt()` (`system-prompt.ts`) 中。它會組裝包含以下部分的完整提示詞：工具、工具呼叫風格、安全防護、OpenClaw CLI 參考、技能、文件、工作區、沙盒、訊息傳遞、回覆標籤、語音、靜默回覆、心跳、執行時期元資料，以及啟用時的記憶和反應，還有可選的上下文檔案和額外系統提示詞內容。對於子代理使用的最小提示詞模式，會對這些部分進行修剪。

提示詞在建立會話後透過 `applySystemPromptOverrideToSession()` 套用：

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## 會話管理

### 會話檔案

會話是具有樹狀結構（透過 id/parentId 連結）的 JSONL 檔案。Pi 的 `SessionManager` 負責處理持久性：

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw 使用 `guardSessionManager()` 封裝此機制，以確保工具結果的安全性。

### 會話快取

`session-manager-cache.ts` 會快取 SessionManager 實例，以避免重複解析檔案：

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### 歷史記錄限制

`limitHistoryTurns()` 會根據頻道類型（私訊與群組）修剪對話歷史記錄。

### 壓縮

當上下文溢位時會觸發自動壓縮。`compactEmbeddedPiSessionDirect()` 負責處理手動壓縮：

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## 驗證與模型解析

### 驗證設定檔

OpenClaw 維護一個驗證設定檔存儲區，其中每個提供者都包含多個 API 金鑰：

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

設定檔在發生錯誤時會輪換，並追蹤冷卻時間：

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

### 故障轉移

當有設定時，`FailoverError` 會觸發模型備援：

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

`src/agents/pi-extensions/compaction-safeguard.ts` 為壓縮程序加入防護機制，包括自適應 token 預算分配，以及工具失敗和檔案操作摘要：

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### 上下文修剪

`src/agents/pi-extensions/context-pruning.ts` 實作了基於快取 TTL 的上下文修剪：

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

`EmbeddedBlockChunker` 負責管理串流文字，將其組織成獨立的回覆區塊：

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### 思考/最終標籤移除

串流輸出會經過處理，以移除 `<think>`/`<thinking>` 區塊並提取 `<final>` 內容：

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // Strip <think>...</think> content
  // If enforceFinalTag, only return <final>...</final> content
};
```

### 回覆指令

回覆指令如 `[[media:url]]`、`[[voice]]`、`[[reply:id]]` 會被解析並提取：

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## 錯誤處理

### 錯誤分類

`pi-embedded-helpers.ts` 會對錯誤進行分類以進行適當的處理：

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

## 沙箱整合

當啟用沙箱模式時，工具和路徑會受到限制：

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

- 拒絕魔術字串清除
- 連續角色的輪次驗證
- Claude Code 參數相容性

### Google/Gemini

- 輪次順序修復 (`applyGoogleTurnOrderingFix`)
- 工具架構清理 (`sanitizeToolsForGoogle`)
- 工作階段歷史清理 (`sanitizeSessionHistory`)

### OpenAI

- 用於 Codex 模型的 `apply_patch` 工具
- 思考層級降級處理

## TUI 整合

OpenClaw 也有一個本機 TUI 模式，可直接使用 pi-tui 元件：

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

這提供了類似於 pi 原生模式的互動式終端體驗。

## 與 Pi CLI 的主要差異

| 方面         | Pi CLI                  | OpenClaw 嵌入式                                                                                |
| ------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 呼叫方式     | `pi` 指令 / RPC         | 透過 `createAgentSession()` 的 SDK                                                             |
| 工具         | 預設編碼工具            | 自訂 OpenClaw 工具套件                                                                         |
| 系統提示詞   | AGENTS.md + prompts     | 每個通道/內容動態設定                                                                          |
| 工作階段儲存 | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/` (或 `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`) |
| 驗證         | 單一憑證                | 具輪替機制的多設定檔                                                                           |
| 擴充功能     | 從磁碟載入              | 程式化 + 磁碟路徑                                                                              |
| 事件處理     | TUI 渲染                | 基於回呼 (onBlockReply 等)                                                                     |

## 未來考量

潛在重構領域：

1. **工具簽章對齊**：目前適用於 pi-agent-core 和 pi-coding-agent 簽章之間的調整
2. **工作階段管理器封裝**：`guardSessionManager` 增加了安全性但也提高了複雜度
3. **擴充功能載入**：可以直接使用 pi 的 `ResourceLoader`
4. **串流處理器複雜度**：`subscribeEmbeddedPiSession` 已變得龐大
5. **供應商怪癖**：許多 pi 可能潛在處理的供應商特定程式碼路徑

## 測試

Pi 整合涵蓋範圍包含這些套件：

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

若要查看目前的執行指令，請參閱 [Pi Development Workflow](/zh-Hant/pi-dev)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
