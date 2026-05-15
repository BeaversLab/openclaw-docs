---
title: "Codex Harness Context Engine Port"
summary: "Specification for making the bundled Codex app-server harness honor OpenClaw context-engine plugins"
read_when:
  - You are wiring context-engine lifecycle behavior into the Codex harness
  - You need lossless-claw or another context-engine plugin to work with codex/* embedded harness sessions
  - You are comparing embedded PI and Codex app-server context behavior
---

## 狀態

草稿實作規格。

## 目標

讓隨附的 Codex app-server harness 遵循嵌入式 PI 週期已遵循的相同 OpenClaw context-engine
lifecycle contract。

使用 `agents.defaults.embeddedHarness.runtime: "codex"` 或
`codex/*` 模型的 Session 應仍允許選定的 context-engine 外掛程式（例如
`lossless-claw`）控制內容組裝、post-turn ingest、維護，以及
Codex app-server 邊界所允許範圍內的 OpenClaw 層級壓縮策略。

## 非目標

- 不重新實作 Codex app-server 內部機制。
- 不讓 Codex 原生執行緒壓縮產生 lossless-claw 摘要。
- 不要求非 Codex 模型使用 Codex harness。
- 不改變 ACP/acpx session 行為。此規格僅適用於
  非 ACP 嵌入式 agent harness 路徑。
- 不讓第三方外掛程式註冊 Codex app-server 擴充工廠；
  現有隨附外掛程式的信任邊界保持不變。

## 現有架構

嵌入式執行迴圈在選擇具體的低層級 harness 之前，會在每次執行時解析已配置的 context engine 一次：

- `src/agents/pi-embedded-runner/run.ts`
  - 初始化 context-engine 外掛程式
  - 呼叫 `resolveContextEngine(params.config)`
  - 將 `contextEngine` 和 `contextTokenBudget` 傳入
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` 委派給選定的 agent harness：

- `src/agents/pi-embedded-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

Codex app-server harness 是由隨附的 Codex 外掛程式註冊的：

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

Codex harness 實作會收到與 PI 支援的嘗試相同的 `EmbeddedRunAttemptParams`：

- `extensions/codex/src/app-server/run-attempt.ts`

這意味著所需的掛鉤點位於 OpenClaw 控制的程式碼中。外部邊界是 Codex 應用程式伺服器協議本身：OpenClaw 可以控制它發送到 `thread/start`、`thread/resume` 和 `turn/start` 的內容，並且可以觀察通知，但它無法更改 Codex 的內部執行緒存儲或原生壓縮器。

## 當前差距

嵌入式 PI 嘗試直接呼叫 context-engine 生命週期：

- 在嘗試之前進行 bootstrap/maintenance
- 在模型呼叫之前進行 assemble
- 在嘗試之後進行 afterTurn 或 ingest
- 在成功的回合之後進行 maintenance
- 針對擁有壓縮功能的引擎進行 context-engine 壓縮

相關的 PI 程式碼：

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Codex 應用程式伺服器目前執行通用的 agent-harness 掛鉤並鏡像副本，但不呼叫 `params.contextEngine.bootstrap`、`params.contextEngine.assemble`、`params.contextEngine.afterTurn`、`params.contextEngine.ingestBatch`、`params.contextEngine.ingest` 或 `params.contextEngine.maintain`。

相關的 Codex 程式碼：

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## 預期行為

對於 Codex harness 回合，OpenClaw 應保留此生命週期：

1. 讀取鏡像的 OpenClaw 會話副本。
2. 當存在先前的會話檔案時，啟動活動的 context engine。
3. 在可用時執行啟動維護 (bootstrap maintenance)。
4. 使用活動的 context engine 組裝語境。
5. 將組裝好的語境轉換為 Codex 相容的輸入。
6. 使用開發者指令啟動或恢復 Codex 執行緒，這些指令包含任何 context-engine `systemPromptAddition`。
7. 使用組裝好的使用者提示啟動 Codex 回合。
8. 將 Codex 結果鏡像回 OpenClaw 副本中。
9. 如果已實作 `afterTurn` 則呼叫它，否則使用鏡像的副本快照呼叫 `ingestBatch`/`ingest`。
10. 在成功的非中止回合之後執行回合維護 (turn maintenance)。
11. 保留 Codex 原生壓縮信號和 OpenClaw 壓縮掛鉤。

## 設計約束

### Codex 應用伺服器仍然是原生執行緒狀態的標準

Codex 擁有其原生執行緒以及任何內部的擴展歷史。OpenClaw 不應嘗試變更應用伺服器的內部歷史，除非透過支援的協定呼叫。

OpenClaw 的文稿副本仍然是 OpenClaw 功能的來源：

- 聊天歷史
- 搜尋
- `/new` 和 `/reset` 簿記
- 未來的模型或線束切換
- context-engine 插件狀態

### Context engine 組合必須投射到 Codex 輸入中

context-engine 介面傳回 OpenClaw `AgentMessage[]`，而不是 Codex
執行緒修補檔。Codex 應用伺服器 `turn/start` 接受當前使用者輸入，而
`thread/start` 和 `thread/resume` 接受開發者指示。

因此，實作需要一個投射層。安全的初始版本應避免假裝它可以替換 Codex 內部歷史。它應該將組合的上下文作為確定性的提示/開發者指示材料注入到當前輪次周圍。

### Prompt-cache 穩定性很重要

對於像 lossless-claw 這樣的引擎，組合的上下文對於未變更的輸入應該是確定性的。請勿在產生的上下文文字中新增時間戳記、隨機 ID 或非確定性的排序。

### 執行時期選擇語意不變

線束選擇保持原樣：

- `runtime: "pi"` 強制使用 PI
- `runtime: "codex"` 選擇已註冊的 Codex 線束
- `runtime: "auto"` 允許插件線束聲明支援的提供者
- 未匹配的 `auto` 執行個體使用 PI

此工作改變了選擇 Codex 線束後發生的事情。

## 實作計畫

### 1. 匯出或重新放置可重複使用的 context-engine 嘗試輔助程式

如今可重複使用的生命週期輔助程式位於 PI 執行器下：

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

如果可以避免，Codex 不應該從名稱暗示 PI 的實作路徑匯入。

建立一個與線束無關的模組，例如：

- `src/agents/harness/context-engine-lifecycle.ts`

移動或重新匯出：

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- `runContextEngineMaintenance` 的小型封裝

透過從舊檔案重新匯出，或在同一個 PR 中更新 PI 呼叫位置，來保持 PI 匯入正常運作。

中立的輔助函數名稱不應提及 PI。

建議名稱：

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. 新增 Codex 內容投影輔助函數

新增一個模組：

- `extensions/codex/src/app-server/context-engine-projection.ts`

職責：

- 接收組裝後的 `AgentMessage[]`、原始鏡像歷史記錄以及目前提示詞。
- 判斷哪些內容屬於開發者指令，哪些屬於目前使用者輸入。
- 將目前使用者提示詞保留為最終的可執行請求。
- 以穩定、明確的格式呈現先前的訊息。
- 避免使用變動的元資料。

建議的 API：

```ts
export type CodexContextProjection = {
  developerInstructionAddition?: string;
  promptText: string;
  assembledMessages: AgentMessage[];
  prePromptMessageCount: number;
};

export function projectContextEngineAssemblyForCodex(params: { assembledMessages: AgentMessage[]; originalHistoryMessages: AgentMessage[]; prompt: string; systemPromptAddition?: string }): CodexContextProjection;
```

建議的首次投影：

- 將 `systemPromptAddition` 放入開發者指令中。
- 將組裝後的對話內容放在 `promptText` 中目前提示詞之前。
- 將其清楚標記為 OpenClaw 組裝的內容。
- 將目前提示詞保持在最後。
- 如果重複的目前使用者提示詞已出現在尾部，則將其排除。

提示詞結構範例：

```text
OpenClaw assembled context for this turn:

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

Current user request:
...
```

這雖然不如原生 Codex 歷史記錄手術優雅，但它可以在 OpenClaw 內部實作，並保留 context-engine 語意。

未來改進：如果 Codex app-server 公開了用於取代或補充執行緒歷史記錄的協定，請將此投影層切換為使用該 API。

### 3. 在 Codex 執行緒啟動前連接引導程序

在 `extensions/codex/src/app-server/run-attempt.ts` 中：

- 像今天一樣讀取鏡像的會話歷史記錄。
- 判斷會話檔案在此執行之前是否存在。最好使用在鏡像寫入前檢查 `fs.stat(params.sessionFile)` 的輔助函數。
- 開啟 `SessionManager`，或者如果輔助函數有要求，使用一個狹窄的會話管理程式介面卡。
- 當 `params.contextEngine` 存在時，呼叫中立的引導輔助函數。

虛擬流程：

```ts
const hadSessionFile = await fileExists(params.sessionFile);
const sessionManager = SessionManager.open(params.sessionFile);
const historyMessages = sessionManager.buildSessionContext().messages;

await bootstrapHarnessContextEngine({
  hadSessionFile,
  contextEngine: params.contextEngine,
  sessionId: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  sessionManager,
  runtimeContext: buildHarnessContextEngineRuntimeContext(...),
  runMaintenance: runHarnessContextEngineMaintenance,
  warn,
});
```

使用與 Codex 工具橋接器和轉錄鏡像相同的 `sessionKey` 慣例。目前 Codex 從 `params.sessionKey` 或 `params.sessionId` 計算 `sandboxSessionKey`；除非有理由保留原始 `params.sessionKey`，否則請一致使用該計算方式。

### 4. 在 `thread/start` / `thread/resume` 和 `turn/start` 之前連接組裝

在 `runCodexAppServerAttempt` 中：

1. 首先建構動態工具，以便上下文引擎能看到實際可用的工具名稱。
2. 讀取鏡像會話歷史。
3. 當 `params.contextEngine` 存在時，執行上下文引擎 `assemble(...)`。
4. 將組裝結果投射到：
   - 開發者指令附加項
   - `turn/start` 的提示文字

現有的掛鉤呼叫：

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

應變成具備上下文感知能力：

1. 使用 `buildDeveloperInstructions(params)` 計算基礎開發者指令
2. 應用上下文引擎組裝/投射
3. 使用投射後的提示/開發者指令執行 `before_prompt_build`

此順序讓通用提示掛鉤能看到 Codex 將收到的相同提示。如果我們需要嚴格的 PI 對等性，請在掛鉤組合之前執行上下文引擎組裝，因為 PI 會在提示管道之後將上下文引擎 `systemPromptAddition` 應用於最終系統提示。重要的不變性是上下文引擎和掛鉤都獲得確定性、已記錄的順序。

建議的首次實作順序：

1. `buildDeveloperInstructions(params)`
2. 上下文引擎 `assemble()`
3. 將 `systemPromptAddition` 附加/前置到開發者指令
4. 將組裝好的訊息投射到提示文字
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. 將最終開發者指令傳遞給 `startOrResumeThread(...)`
7. 將最終提示文字傳遞給 `buildTurnStartParams(...)`

規範應編碼在測試中，以免未來的變更意外重新排序。

### 5. 保持提示快取穩定格式

投射輔助程式必須為相同的輸入產生位元組穩定的輸出：

- 穩定的訊息順序
- 穩定的角色標籤
- 無產生的時間戳記
- 無物件鍵順序洩漏
- 無隨機分隔符
- 無每次執行的 ID

使用固定的分隔符和明確的區段。

### 6. 在文字記錄鏡像之後連接輪詢後（post-turn）處理

Codex 的 `CodexAppServerEventProjector` 會為當前輪次建立一個本地的 `messagesSnapshot`。`mirrorTranscriptBestEffort(...)` 會將該快照寫入 OpenClaw 文字記錄鏡像中。

在鏡像成功或失敗後，使用可用的最佳訊息快照呼叫 context-engine 最終處理程式：

- 寫入之後優先使用完整的鏡像會話上下文，因為 `afterTurn` 期望的是會話快照，而不僅僅是當前輪次。
- 如果無法重新開啟會話檔案，則回退到 `historyMessages + result.messagesSnapshot`。

偽流程：

```ts
const prePromptMessageCount = historyMessages.length;
await mirrorTranscriptBestEffort(...);
const finalMessages = readMirroredSessionHistoryMessages(params.sessionFile)
  ?? [...historyMessages, ...result.messagesSnapshot];

await finalizeHarnessContextEngineTurn({
  contextEngine: params.contextEngine,
  promptError: Boolean(finalPromptError),
  aborted: finalAborted,
  yieldAborted,
  sessionIdUsed: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  messagesSnapshot: finalMessages,
  prePromptMessageCount,
  tokenBudget: params.contextTokenBudget,
  runtimeContext: buildHarnessContextEngineRuntimeContextFromUsage({
    attempt: params,
    workspaceDir: effectiveWorkspace,
    agentDir,
    tokenBudget: params.contextTokenBudget,
    lastCallUsage: result.attemptUsage,
    promptCache: result.promptCache,
  }),
  runMaintenance: runHarnessContextEngineMaintenance,
  sessionManager,
  warn,
});
```

如果鏡像失敗，仍使用回退快照呼叫 `afterTurn`，但需記錄上下文引擎正在從回退輪次資料中提取資訊。

### 7. 標準化使用量和提示快取（prompt-cache）執行時上下文

Codex 結果包含來自 app-server 權杖通知的標準化使用量（當可用時）。將該使用量傳入 context-engine 執行時上下文中。

如果 Codex app-server 最終公開快取讀取/寫入細節，將其映射到 `ContextEnginePromptCacheInfo`。在此之前，請省略 `promptCache`，而不是捏造零值。

### 8. 壓縮策略

有兩個壓縮系統：

1. OpenClaw context-engine `compact()`
2. Codex app-server 原生 `thread/compact/start`

不要無聲地混淆它們。

#### `/compact` 與明確的 OpenClaw 壓縮

當選定的 context engine 具有 `info.ownsCompaction === true` 時，明確的 OpenClaw 壓縮應優先使用 context engine 的 `compact()` 結果，用於 OpenClaw 文字記錄鏡像和外掛狀態。

當選定的 Codex harness 具有原生執行緒綁定時，我們可能會額外請求 Codex 原生壓縮以保持 app-server 執行緒健康，但這必須在詳細資訊中報告為單獨的後端動作。

建議行為：

- 如果 `contextEngine.info.ownsCompaction === true`：
  - 首先呼叫 context-engine `compact()`
  - 然後當存在執行緒綁定時，盡力呼叫 Codex 原生壓縮
  - 將 context-engine 結果作為主要結果返回
  - 在 `details.codexNativeCompaction` 中包含 Codex 原生壓縮狀態
- 如果啟用的上下文引擎不擁有壓縮權限：
  - 保留當前的 Codex 原生壓縮行為

這可能需要修改 `extensions/codex/src/app-server/compact.ts` 或從通用壓縮路徑中封裝它，具體取決於 `maybeCompactAgentHarnessSession(...)` 在何處調用。

#### 輪次內 Codex 原生 contextCompaction 事件

Codex 可能會在一個輪次內發出 `contextCompaction` 項目事件。請保留 `event-projector.ts` 中當前的壓縮前/後鉤子發射，但不要將其視為已完成的上下文引擎壓縮。

對於擁有壓縮權限的引擎，當 Codex 執行原生壓縮時，發出明確的診斷訊息：

- 串流/事件名稱：現有的 `compaction` 串流是可以接受的
- 詳情：`{ backend: "codex-app-server", ownsCompaction: true }`

這使得分離可稽核。

### 9. Session 重置和綁定行為

現有的 Codex harness `reset(...)` 會清除 OpenClaw session 檔案中的 Codex app-server 綁定。請保留該行為。

同時確保上下文引擎狀態清理繼續透過現有的 OpenClaw session 生命週期路徑進行。除非上下文引擎生命週期目前錯過了所有 harness 的重置/刪除事件，否則請勿新增 Codex 特定的清理。

### 10. 錯誤處理

遵循 PI 語義：

- 引導失敗時發出警告並繼續
- 組裝失敗時發出警告並退回到未組裝的 pipeline 訊息/prompt
- afterTurn/ingest 失敗時發出警告並將輪次後最終化標記為失敗
- 維護僅在成功、非中止、非 yield 的輪次之後執行
- 壓縮錯誤不應作為新的 prompt 重試

Codex 特定新增項目：

- 如果上下文投影失敗，發出警告並退回到原始 prompt。
- 如果逐字稿鏡像失敗，仍嘗試使用備援訊息進行上下文引擎最終化。
- 如果 Codex 原生壓縮在上下文引擎壓縮成功後失敗，當上下文引擎為主要時，不要導致整個 OpenClaw 壓縮失敗。

## 測試計畫

### 單元測試

在 `extensions/codex/src/app-server` 下新增測試：

1. `run-attempt.context-engine.test.ts`
   - 當 session 檔案存在時，Codex 會呼叫 `bootstrap`。
   - Codex 使用對映的訊息、token 預算、工具名稱、引用模式、模型 ID 和提示來呼叫 `assemble`。
   - `systemPromptAddition` 包含在開發者指示中。
   - 組合的訊息會在當前請求之前投射到提示中。
   - Codex 在轉錄對映之後呼叫 `afterTurn`。
   - 如果沒有 `afterTurn`，Codex 會呼叫 `ingestBatch` 或逐訊息呼叫 `ingest`。
   - 回合維護在成功的回合後執行。
   - 在提示錯誤、中止或讓出中止時，不會執行回合維護。

2. `context-engine-projection.test.ts`
   - 對於相同的輸入產生穩定的輸出
   - 當組合的歷史記錄包含當前提示時，不會重複
   - 處理空的歷史記錄
   - 保留角色順序
   - 僅在開發者指示中包含系統提示的附加內容

3. `compact.context-engine.test.ts`
   - 擁有的上下文引擎主要結果優先
   - 當同時嘗試時，Codex 原生壓縮狀態會出現在詳細資訊中
   - Codex 原生失敗不會導致擁有的上下文引擎壓縮失敗
   - 非擁有的上下文引擎保留當前的原生壓縮行為

### 現有測試待更新

- 如果存在 `extensions/codex/src/app-server/run-attempt.test.ts`，則為最近的 Codex app-server 執行測試。
- `extensions/codex/src/app-server/event-projector.test.ts` 僅在壓縮事件詳細資訊變更時更新。
- 除非配置行為變更，`src/agents/harness/selection.test.ts` 應不需要更改；它應保持穩定。
- PI 上下文引擎測試應繼續不變地通過。

### 整合/即時測試

新增或擴充即時 Codex harness 冒煙測試：

- 將 `plugins.slots.contextEngine` 配置為測試引擎
- 將 `agents.defaults.model` 配置為 `codex/*` 模型
- 配置 `agents.defaults.embeddedHarness.runtime = "codex"`
- 斷言測試引擎觀察到：
  - bootstrap
  - assemble
  - afterTurn 或 ingest
  - maintenance

避免在 OpenClaw 核心測試中要求 lossless-claw。使用一個小型的儲存庫內假上下文引擎外掛程式。

## 可觀測性

在 Codex 上下文引擎生命週期呼叫周圍加入除錯日誌：

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` 並附帶原因
- `codex native compaction completed alongside context-engine compaction`

避免記錄完整的提示或對話內容。

在有用的地方新增結構化欄位：

- `sessionId`
- `sessionKey` 根據現有的日誌記錄實務進行編輯或省略
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## 遷移 / 相容性

這應該是向後相容的：

- 如果未配置上下文引擎，舊版上下文引擎的行為應等同於目前的 Codex harness 行為。
- 如果 context-engine `assemble` 失敗，Codex 應繼續使用原始提示路徑。
- 現有的 Codex 執行緒繫結應保持有效。
- 動態工具指紋不應包含 context-engine 輸出；否則每次上下文變更都可能會強制建立新的 Codex 執行緒。只有工具目錄應影響動態工具指紋。

## 未解決的問題

1. 組裝好的上下文應完全注入到使用者提示中、完全注入到開發者指示中，還是拆分注入？

   建議：拆分。將 `systemPromptAddition` 放在開發者指示中；將組裝好的對話上下文放在使用者提示包裝器中。這最能符合目前的 Codex 協定，而無需變更原生執行緒歷程。

2. 當 context-engine 擁有壓縮權時，應該停用 Codex 原生壓縮嗎？

   建議：不，一開先不要。Codex 原生壓縮可能仍有必要，以保持 app-server 執行緒運作。但必須將其回報為原生 Codex 壓縮，而不是 context-engine 壓縮。

3. `before_prompt_build` 應在 context-engine 組裝之前或之後執行？

   建議：在 Codex 的 context-engine 投射之後執行，以便通用 harness 掛鉤能看到 Codex 將接收到的實際提示/開發者指示。如果 PI 對等性要求相反的順序，請將選定的順序編碼在測試中並在此處記錄。

4. Codex app-server 能否接受未來的結構化上下文/歷程覆寫？

   未知。如果可以，請用該協定取代文字投射層，並保持生命週期呼叫不變。

## 驗收標準

- A `codex/*` embedded harness turn 會呼叫所選 context engine 的
  assemble lifecycle。
- A context-engine `systemPromptAddition` 會影響 Codex 開發者指令。
- 組裝後的 context 會確定性影響 Codex turn input。
- 成功的 Codex turns 會呼叫 `afterTurn` 或 ingest fallback。
- 成功的 Codex turns 會執行 context-engine turn maintenance。
- 失敗/中止/讓步中止的 turns 不會執行 turn maintenance。
- Context-engine 擁有的 compaction 對於 OpenClaw/plugin state 仍然是主要的。
- Codex 原生 compaction 作為原生 Codex 行為仍可被稽核。
- 現有的 PI context-engine 行為保持不變。
- 當未選取非舊版 context engine
  或 assembly 失敗時，現有的 Codex harness 行為保持不變。
