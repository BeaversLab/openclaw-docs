---
summary: "OpenClaw 如何建構提示詞上下文並回報 Token 使用量與成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token use and costs"
---

OpenClaw 追蹤的是 **tokens**，而非字元。Token 是特定於模型的，但大多數 OpenAI 風格的模型對於英文文字平均每個 token 約為 4 個字元。

## 如何建構系統提示詞

OpenClaw 會在每次執行時組裝自己的系統提示詞。它包含：

- 工具列表 + 簡短描述
- 技能列表（僅包含中繼資料；指令會根據需求透過 `read` 載入）。
  精簡的技能區塊由 `skills.limits.maxSkillsPromptChars` 界定，
  並可透過
  `agents.list[].skillsLimits.maxSkillsPromptChars` 針對每個代理進行選擇性覆寫。
- 自我更新指令
- 工作區 + 引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 於新增時，以及 `BOOTSTRAP.md`，若存在則加上 `MEMORY.md`）。小寫根目錄 `memory.md` 不會被注入；當與 `MEMORY.md` 搭配使用時，它是 `openclaw doctor --fix` 的舊版修復輸入。大型檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設值：12000），且總引導注入量受限於 `agents.defaults.bootstrapTotalMaxChars`（預設值：60000）。`memory/*.md` 每日檔案不是一般引導提示詞的一部分；它們在一般回合中透過記憶工具按需載入，但重置/啟動模型執行可以在第一回合前置加入單次的啟動內容區塊，包含最近的每日記憶。純聊天 `/new` 和 `/reset` 指令會被確認，而不會呼叫模型。啟動前奏由 `agents.defaults.startupContext` 控制。
- 時間 (UTC + 使用者時區)
- 回覆標籤 + 心跳行為
- 執行時期中繼資料 (主機/作業系統/模型/思考)

請參閱 [系統提示詞](/zh-Hant/concepts/system-prompt) 中的完整細節。

當記錄憑證或驗證程式碼片段時，請使用
[秘密金鑰預留位置慣例](/zh-Hant/reference/secret-placeholder-conventions) 來
避免在僅限文件的變更中出現秘密掃描器的誤報。

## 什麼計入上下文視窗

模型接收到的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫和工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要和修剪工藝
- 供應商包裝器或安全性標頭（不可見，但仍會計入）

某些運算時資源消耗較高的介面有其自身的明確上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

每個代理的覆寫位於 `agents.list[].contextLimits` 下。這些控制項是
用於有界的運行時摘錄和注入的運行時擁有區塊。它們與
啟動限制、啟動上下文限制和技能提示詞限制是分開的。

對於圖片，OpenClaw 會在供應商呼叫前將逐字稿/工具圖片酬載縮小。
使用 `agents.defaults.imageMaxDimensionPx` (預設: `1200`) 進行調整：

- 較低的值通常會減少視覺 token 使用量和酬載大小。
- 較高的值會為 OCR/繁重 UI 的螢幕截圖保留更多視覺細節。

如需實用的細節（每個注入的檔案、工具、技能和系統提示詞大小），請使用 `/context list` 或 `/context detail`。請參閱 [上下文](/zh-Hant/concepts/context)。

## 如何查看當前的 token 使用量

在聊天中使用這些指令：

- `/status` → **豐富表情符號的狀態卡片**，包含會話模型、上下文使用量、
  上一次回應的輸入/輸出 token，以及當為活動模型設定
  本地定價時的 **預估成本**。
- `/usage off|tokens|full` → 將 **每次回應的使用量頁尾** 附加到每個回覆。
  - 每個會話持續存在（儲存為 `responseUsage`）。
  - `/usage full` 僅在 OpenClaw 擁有使用量中繼資料和
    活動模型的本地定價時顯示預估成本。否則僅顯示 token。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI:** 支援 `/status` + `/usage`。
- **CLI:** `openclaw status --usage` 和 `openclaw channels list` 顯示
  標準化的供應商配額視窗（`X% left`，而非單次回應成本）。
  目前的使用視窗供應商包括：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

Usage 介面會在顯示前將常見的供應商原生欄位別名進行正規化。
對於 OpenAI 系列的 Responses 流量，這同時包含 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此傳輸特定的
欄位名稱不會改變 `/status`、`/usage` 或 session 摘要。
Gemini CLI JSON usage 也會進行正規化：回覆文字來自 `response`，且
`stats.cached` 對應到 `cacheRead`，並在 CLI
省略明確的 `stats.input` 欄位時使用 `stats.input_tokens - stats.cached`。
對於原生的 OpenAI 系列 Responses 流量，WebSocket/SSE usage 別名會以
相同方式正規化，且當 `total_tokens` 缺失或
`0` 時，總計會退而求其次使用正規化後的 input + output。
當目前 session 快照資訊稀疏時，`/status` 和 `session_status` 也可以
從最新的逐字稿 usage log 中還原 token/cache 計數器以及
使用中的 runtime model 標籤。既有的非零即時值仍優先於
逐字稿備用值，且當儲存的總計缺失或較小時，較大的 prompt 導向
逐字稿總計會勝出。
針對供應商配額視窗的 usage auth 來自供應商特定的 hooks（如果可用）；
否則 OpenClaw 會退而求其次，從 auth profiles、env 或 config
中比對 OAuth/API-key 憑證。
Assistant 逐字稿條目會保存相同的正規化 usage 形狀，包括
當使用中的 model 設定了價格配置且供應商
回傳 usage metadata 時的 `usage.cost`。這為 `/usage cost` 和
逐字稿備援的 session 狀態提供了一個穩定的來源，
即使即時 runtime 狀態已經消失。

OpenClaw 將供應商使用量計算與目前的內容快照分開管理。供應商 `usage.total` 可以包含快取輸入、輸出和多個工具迴圈模型呼叫，因此對於成本和遙測很有用，但可能會高估即時內容視窗。內容顯示和診斷使用最新的提示快照（`promptTokens`，或在沒有提示快照可用時使用最後一次模型呼叫）來進行 `context.used`。

## 成本估算（顯示時）

成本是根據您的模型定價配置估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 每 100 萬個 Token 的 **美元** 價格。如果缺少定價，OpenClaw 僅顯示 Token。成本顯示不僅限於 API 金鑰驗證：諸如 `aws-sdk` 之類的非 API 金鑰供應商，如果其配置的模型項目包含本地定價且供應商傳回使用量元數據，也可以顯示估算成本。

當 Sidecar 和通道到達 Gateway 就緒路徑後，OpenClaw 會對尚未具有本地定價的已配置模型參照啟動選用的背景定價引導。該引導會擷取遠端 OpenRouter 和 LiteLLM 定價目錄。設定 `models.pricing.enabled: false` 以在離線或受限網路上跳過這些目錄擷取；明確的 `models.providers.*.models[].cost` 項目會繼續驅動本地成本估算。

## 快取 TTL 和修剪影響

供應商提示快取僅適用於快取 TTL 視窗內。OpenClaw 可以選擇性地執行 **快取 TTL 修剪**：它會在快取 TTL 過期後修剪工作階段，然後重設快取視窗，以便後續請求可以重用新快取的內容，而不是重新快取完整歷史記錄。這可以在工作階段閒置超過 TTL 時保持較低的快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行配置，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看行為詳細資訊。

Heartbeat 可以在閒置期間保持快取 **暖機**。如果您的模型快取 TTL 是 `1h`，將 Heartbeat 間隔設定在該值以下（例如 `55m`）可以避免重新快取完整提示，從而降低快取寫入成本。

在多 Agent 設定中，您可以保留一個共享的模型配置並使用 `agents.list[].params.cacheRetention` 針對每個 Agent 微調快取行為。

如需完整的逐項設定指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

關於 Anthropic API 定價，快取讀取成本遠低於輸入 token，而快取寫入則以較高的乘數計費。請參閱 Anthropic 的提示快取定價以取得最新費率和 TTL 乘數：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 範例：使用心跳保持 1 小時快取溫熱

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 範例：使用逐 Agent 快取策略處理混合流量

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` 會合併至所選模型的 `params` 之上，因此您可以
僅覆寫 `cacheRetention` 並繼承其他模型預設值而不變。

### Anthropic 1M 上下文

OpenClaw 針對具備 GA 能力的 Claude 4.x 模型（如 Opus 4.6、Opus 4.7 和
Sonnet 4.6）使用 Anthropic 的 1M 上下文視窗。對於這些模型，您不需要
`params.context1m: true`。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

較舊的配置可以保留 `context1m: true`，但 OpenClaw 不再針對此設定傳送
Anthropic 已停用的 `context-1m-2025-08-07` beta 標頭，也不會將不支援的舊版 Claude 模型擴充至 1M。

需求：憑證必須符合使用長語境的資格。否則，
Anthropic 將針對該請求回應提供者端速率限制錯誤。

如果您使用 OAuth/訂閱 token (`sk-ant-oat-*`) 進行 Anthropic 身份驗證，
OpenClaw 將保留 OAuth 所需的 Anthropic beta 標頭，同時移除舊配置中殘留的
已停用 `context-1m-*` beta 標頭。

## 減少 Token 壓力的技巧

- 使用 `/compact` 來摘要長時間的工作階段。
- 在您的工作流程中修剪大型工具輸出。
- 針對包含大量截圖的工作階段，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能列表會被注入到提示詞中）。
- 對於冗長的探索性工作，請優先選擇較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能列表開銷公式。

## 相關

- [API usage and costs](/zh-Hant/reference/api-usage-costs)
- [Prompt caching](/zh-Hant/reference/prompt-caching)
- [Usage tracking](/zh-Hant/concepts/usage-tracking)
