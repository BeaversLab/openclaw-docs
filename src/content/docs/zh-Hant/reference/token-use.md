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

請參閱 [系統提示詞](/zh-Hant/concepts/system-prompt) 以了解完整細節。

## 什麼計入上下文視窗

模型接收的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有區段）
- 對話歷史記錄（使用者 + 助手訊息）
- 工具呼叫和工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要和修剪產生的資料
- 供應商包裝器或安全標頭（不可見，但仍會計入）

部分運算密集的介面有其各自的明確上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

每個代理的覆寫設定位於 `agents.list[].contextLimits`。這些控制項適用於有界的運行摘要和注入的運行時擁有區塊。它們與引導限制、啟動上下文限制和技能提示限制是分開的。

對於圖像，OpenClaw 會在呼叫提供者之前對文字紀錄/工具圖像進行縮放。使用 `agents.defaults.imageMaxDimensionPx`（預設值：`1200`）來調整此設定：

- 較低的值通常會減少視覺權位的使用和負載大小。
- 較高的值會為 OCR/UI 密集的螢幕截圖保留更多視覺細節。

若要查看實用的細目（按注入的檔案、工具、技能和系統提示大小），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 如何查看目前的權位使用情況

在聊天中使用這些：

- `/status` → 顯示 **豐富表情符號的狀態卡**，包含會話模型、上下文使用量、
  最後一次回應的輸入/輸出權位，以及 **估計成本**（僅限 API 金鑰）。
- `/usage off|tokens|full` → 在每次回覆後附加 **每次回應的使用情況頁尾**。
  - 依會話持續（儲存為 `responseUsage`）。
  - OAuth 驗證會 **隱藏成本**（僅顯示權位）。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本地成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  標準化的提供者配額視窗（`X% left`，而非每次回應的成本）。
  目前支援使用量視窗的提供者：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

使用量介面在顯示之前會正規化常見的供應商原生欄位別名。
對於 OpenAI 系列的 Responses 流量，這包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此傳輸特定的
欄位名稱不會改變 `/status`、`/usage` 或會話摘要。
Gemini CLI JSON 的使用量也會正規化：回覆文字來自 `response`，且
`stats.cached` 對應到 `cacheRead`，並在 CLI 省略明確的
`stats.input` 欄位時使用 `stats.input_tokens - stats.cached`。
對於原生 OpenAI 系列的 Responses 流量，WebSocket/SSE 的使用量別名
以相同方式正規化，並在 `total_tokens` 缺失或 `0` 時，
總計會回退到正規化的輸入 + 輸出。
當目前的會話快照稀疏時，`/status` 和 `session_status` 也可以
從最新的對話使用量記錄中恢復 token/cache 計數器和活動執行時模型標籤。
現有的非零即時值仍優先於對話回退值，且當儲存的總計缺失或較小時，
較大的提示導向對話總計可以取勝。
供應商配額視窗的使用量授權來自供應商特定的掛鉤（如果可用）；
否則 OpenClaw 會回退到從授權設定檔、環境變數或設定中
匹配 OAuth/API 金鑰憑證。
助理對話條目會保留相同的正規化使用量形狀，包括當活動模型
已配置價格且供應商返回使用量元資料時的 `usage.cost`。
這為 `/usage cost` 和對話支援的會話狀態
提供了一個穩定的來源，即使在即時執行狀態消失之後。

OpenClaw 將提供者使用量計算與當前內容快照分開管理。提供者 `usage.total` 可能包含快取輸入、輸出和多個工具迴圈模型呼叫，因此它對成本和遙測很有用，但可能會高估實際的內容視窗。內容顯示和診斷使用最新的提示快照（`promptTokens`，或者在沒有提示快照時使用最後一次模型呼叫）來進行 `context.used`。

## 成本估算（當顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 的 **每百萬 Token 美元價格**。如果缺少定價資訊，OpenClaw 只會顯示 Token 數量。OAuth Token 絕不會顯示美元成本。

當 Sidecar 和通道到達 Gateway 就緒路徑後，OpenClaw 會針對尚未具有本機定價的已配置模型參考，啟動可選的背景定價引導程序。該引導程序會獲取遠端 OpenRouter 和 LiteLLM 的定價目錄。設定 `models.pricing.enabled: false` 可在離線或受限制的網路上跳過這些目錄獲取；明確的 `models.providers.*.models[].cost` 項目會繼續驅動本機成本估算。

## 快取 TTL 和修剪影響

提供者提示快取僅在快取 TTL 視窗內應用。OpenClaw 可以選擇性地執行 **cache-ttl 修剪**：它會在快取 TTL 過期後修剪一次會話，然後重設快取視窗，以便後續請求可以重新使用新快取的內容，而不是重新快取完整歷史記錄。當會話閒置超過 TTL 時，這可以保持較低的快取寫入成本。

在 [Gateway 組態](/zh-Hant/gateway/configuration) 中進行設定，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看行為細節。

Heartbeat 可以在空閒間隙期間保持快取 **溫熱** (warm)。如果您的模型快取 TTL 是 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免重新快取完整的提示，從而減少快取寫入成本。

在多代理設定中，您可以保留一個共享的模型配置，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

有關完整的逐步指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

對於 Anthropic API 定價，快取讀取比輸入 Token 便宜得多，而快取寫入則以更高的倍率計費。有關最新費率和 TTL 倍率，請參閱 Anthropic 的提示快取定價：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 範例：使用 heartbeat 保持 1 小時快取溫熱

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

### 範例：使用每 Agent 快取策略的混合流量

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

`agents.list[].params` 會合併到所選模型的 `params` 之上，因此您可以僅覆寫 `cacheRetention` 並繼承其他未變更的模型預設值。

### 範例：啟用 Anthropic 1M 語境 beta 標頭

Anthropic 的 1M 上下文視窗目前處於測試版階段。當您在支援的 Opus 或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應到 Anthropic 的 `context-1m-2025-08-07` 測試版標頭。

這僅適用於在該模型項目上設定了 `context1m: true` 的情況。

需求：憑證必須符合使用長語境的資格。否則，
Anthropic 將針對該請求回應提供者端速率限制錯誤。

如果您使用 OAuth/訂閱權杖 (`sk-ant-oat-*`) 對 Anthropic 進行驗證，OpenClaw 將會略過 `context-1m-*` 測試版標頭，因為 Anthropic 目前會以 HTTP 401 拒絕該組合。

## 減少 Token 壓力的技巧

- 使用 `/compact` 來摘要長時間的對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能列表會被注入到提示詞中）。
- 對於冗長的探索性工作，請優先選擇較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能清單開銷公式。

## 相關

- [API 使用和成本](/zh-Hant/reference/api-usage-costs)
- [Prompt 快取](/zh-Hant/reference/prompt-caching)
- [使用追蹤](/zh-Hant/concepts/usage-tracking)
