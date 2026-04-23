---
summary: "OpenClaw 如何建構提示詞上下文並回報 Token 使用量與成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用與成本"
---

# Token 使用與成本

OpenClaw 追蹤的是 **Token**，而非字元。Token 取決於模型，但大多數
OpenAI 風格的模型對於英文文字平均每個 Token 約為 4 個字元。

## 系統提示詞的建構方式

OpenClaw 會在每次執行時組裝自己的系統提示詞。它包含：

- 工具清單 + 簡短描述
- 技能清單（僅包含元資料；指令會透過 `read` 按需載入）。
  精簡的技能區塊由 `skills.limits.maxSkillsPromptChars` 限制範圍，
  並可在 `agents.list[].skillsLimits.maxSkillsPromptChars` 進行針對個別代理程式的選擇性覆寫。
- 自我更新指令
- 工作區 + 引導檔案（當有新檔案時包含 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`，外加存在時的 `MEMORY.md` 或作為小寫回退的 `memory.md`）。大型檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設：12000），且總引導注入量受到 `agents.defaults.bootstrapTotalMaxChars` 限制（預設：60000）。`memory/*.md` 每日檔案不是正常引導提示詞的一部分；它們在一般回合中透過記憶工具按需存取，但純 `/new` 和 `/reset` 可以在第一回合 prepend 一個包含近期每日記憶的單次啟動上下文區塊。該啟動序曲由 `agents.defaults.startupContext` 控制。
- 時間（UTC + 使用者時區）
- 回覆標籤 + 心跳行為
- 執行時期元資料（主機/OS/模型/思維）

請參閱 [系統提示詞](/zh-Hant/concepts/system-prompt) 以了解完整細節。

## 計入上下文視窗的項目

模型接收的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫與工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要與修剪產物
- 供應商封裝或安全標頭（不可見，但仍計入）

一些運算負載較重的介面有其各自明確的上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

每個代理的覆寫設定位於 `agents.list[].contextLimits` 下。這些控制項是用於受限制的執行時摘要和注入的執行時所有區塊。它們與啟動限制、啟動上下文限制和技能提示限制是分開的。

對於圖片，OpenClaw 會在呼叫供應商之前縮小文字記錄/工具圖片的大小。使用 `agents.defaults.imageMaxDimensionPx`（預設值：`1200`）來調整此設定：

- 較低的值通常會減少視覺權位的使用和負載大小。
- 較高的值會保留更多視覺細節，適用於 OCR/UI 密集型的螢幕截圖。

若要查看實際細分（每個注入檔案、工具、技能以及系統提示詞的大小），請使用 `/context list` 或 `/context detail`。請參閱 [語境](/zh-Hant/concepts/context)。

## 如何查看目前的權位使用量

在聊天中使用這些指令：

- `/status` → 顯示 **豐富的 emoji 狀態卡片**，包含會話模型、上下文使用量、
  上次回應的輸入/輸出權位，以及 **預估成本**（僅限 API 金鑰）。
- `/usage off|tokens|full` → 在每個回覆後附加 **每次回應的使用量頁尾**。
  - 每個會話持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證 **會隱藏成本**（僅顯示權位）。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  標準化的供應商配額視窗（`X% left`，而非每次回應的成本）。
  目前的使用量視窗供應商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、小米 和 z.ai。

使用量介面會在顯示前將常見的供應商原生欄位別名進行正規化。
對於 OpenAI 系列的 Responses 流量，這包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此傳輸特定的
欄位名稱不會改變 `/status`、`/usage` 或會話摘要。
Gemini CLI JSON 使用量也已正規化：回覆文字來自 `response`，而
當 CLI 省略明確的 `stats.input` 欄位時，
`stats.cached` 會對應到 `cacheRead` 並使用 `stats.input_tokens - stats.cached`。
對於原生 OpenAI 系列 Responses 流量，WebSocket/SSE 使用量別名
也會以相同方式正規化，且當缺少 `total_tokens` 或 `0` 時，
總計會回退到正規化的輸入 + 輸出。
當目前會話快照稀疏時，`/status` 和 `session_status` 也可以
從最新的逐字稿使用量記錄中復原 token/快取計數器與作用中的執行階段模型標籤。
既有的非零即時值仍優先於逐字稿回退值，且當儲存的總計缺失或較小時，
較大的提示導向逐字稿總計可能會優先採用。
供應商配額視窗的使用量驗證來自供應商特定的掛鉤（如果可用）；
否則 OpenClaw 會回退到從驗證設定檔、環境變數或設定中相符的 OAuth/API 金鑰。
助理逐字稿條目會保留相同的正規化使用量形狀，
包括當作用中模型設定價格且供應商傳回使用量元資料時的 `usage.cost`。
這為 `/usage cost` 和逐字稿備份的會話
狀態提供了穩定的來源，即使在即時執行階段狀態消失後也是如此。

## 成本估算（當顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 萬 Token 美元**價格。如果缺少定價資訊，OpenClaw
只會顯示 Token 數量。OAuth Token 從不顯示美元成本。

## Cache TTL 和修剪影響

供應商提示快取僅適用於 cache TTL 視窗內。OpenClaw 可以選擇性地執行 **cache-ttl 修剪**：它在 cache TTL 過期後修剪會話，然後重設快取視窗，以便後續請求可以重用新快取的上下文，而不是重新快取完整歷史記錄。當會話閒置超過 TTL 時，這能保持較低的快取寫入成本。

請在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行設定，並參閱
[Session pruning](/zh-Hant/concepts/session-pruning) 以了解詳細行為。

Heartbeat 可以在閒置間隔期間保持快取 **「溫熱」**。如果您的模型快取 TTL
為 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免
重新快取完整的提示，從而降低快取寫入成本。

在多 Agent 設定中，您可以保留一個共享的模型設定，並使用 `agents.list[].params.cacheRetention` 針對每個 Agent
調整快取行為。

如需完整的逐步指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

對於 Anthropic API 定價，快取讀取成本顯著低於輸入 Token，而快取寫入則以較高的
倍率計費。請參閱 Anthropic 的提示快取定價以獲取最新費率和 TTL 倍率：
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

### 範例：使用每代理快取策略處理混合流量

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

`agents.list[].params` 會在所選模型的 `params` 之上進行合併，因此您
只需覆蓋 `cacheRetention` 並繼承其他模型預設值而不做更動。

### 範例：啟用 Anthropic 1M 上下文 beta 標頭

Anthropic 的 1M 上下文視窗目前處於 Beta 封測階段。當您在支援的 Opus
或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以注入
所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應於 Anthropic 的 `context-1m-2025-08-07` Beta 標頭。

這僅適用於在該模型項目上設定了 `context1m: true` 的情況。

要求：憑證必須符合使用長上下文的資格。否則，Anthropic 對該請求回應提供者端的速率限制錯誤。

如果您使用 OAuth/訂閱 Token (`sk-ant-oat-*`) 對 Anthropic 進行驗證，
OpenClaw 將跳過 `context-1m-*` Beta 標頭，因為 Anthropic 目前
會因 HTTP 401 拒絕該組合。

## 減少 token 壓力的技巧

- 使用 `/compact` 來總結長時間的對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能清單會被注入到提示詞中）。
- 對於冗長的探索性工作，優先使用較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能列表開銷公式。
