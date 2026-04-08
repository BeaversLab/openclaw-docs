---
summary: "OpenClaw 如何構建提示詞上下文並回報 Token 使用量與成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用與成本"
---

# Token 使用與成本

OpenClaw 追蹤的是 **token**，而非字元。Token 因模型而異，但大多數
OpenAI 風格的模型對於英文文本平均每個 token 約為 4 個字元。

## 系統提示詞是如何構建的

OpenClaw 每次執行時都會組裝自己的系統提示詞。它包含：

- 工具列表 + 簡短描述
- 技能列表（僅元資料；指令會透過 `read` 按需載入）
- 自我更新指令
- 工作區 + 引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 以及新建時的 `BOOTSTRAP.md`，此外若有 `MEMORY.md` 則包含之，或使用小寫備選 `memory.md`）。大型檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設：20000），且總引導注入量受 `agents.defaults.bootstrapTotalMaxChars` 限制（預設：150000）。`memory/*.md` 檔案透過記憶體工具按需載入，不會自動注入。
- 時間（UTC + 使用者時區）
- 回覆標籤 + 心跳行為
- 執行時元資料（主機/作業系統/模型/思考）

請參閱 [系統提示詞](/en/concepts/system-prompt) 中的完整說明。

## 哪些內容計入上下文視窗

模型接收到的所有內容都會計入上下文限制：

- 系統提示詞（上述所有章節）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫與工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要與修剪產物
- 供應商包裝器或安全標頭（不可見，但仍會計入）

對於圖片，OpenClaw 會在呼叫供應商前將逐字稿/工具圖片酬載縮小。
使用 `agents.defaults.imageMaxDimensionPx`（預設：`1200`）來進行調整：

- 較低的值通常能減少視覺 token 的使用量與酬載大小。
- 較高的值能保留更多視覺細節，適用於 OCR 或 UI 繁重的螢幕截圖。

若要查看實際細項（依每個注入的檔案、工具、技能以及系統提示詞大小統計），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/en/concepts/context)。

## 如何查看目前的 Token 使用量

在聊天中使用這些：

- `/status` → 顯示包含 Session 模型、Context 使用量、
  最後一次回應的輸入/輸出 Token 以及 **估計成本**（僅限 API 金鑰）的 **豐富 Emoji 狀態卡片**。
- `/usage off|tokens|full` → 在每個回覆後附加 **每次回應的使用量頁尾**。
  - 每個 Session 持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證會 **隱藏成本**（僅顯示 Token）。
- `/usage cost` → 顯示來自 OpenClaw Session 記錄的本地成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  正規化的供應商配額視窗（`X% left`，而非單次回應成本）。
  目前支援使用量視窗的供應商包括：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

使用量介面在顯示前會將常見的供應商原生欄位別名進行正規化。
對於 OpenAI 系列的 Responses 流量，這包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此傳輸特定的
欄位名稱不會影響 `/status`、`/usage` 或工作階段摘要。
Gemini CLI 的 JSON 使用量也會正規化：回覆文字來自 `response`，且
`stats.cached` 對應到 `cacheRead`，當 CLI 省略明確的
`stats.input` 欄位時會使用 `stats.input_tokens - stats.cached`。
對於原生的 OpenAI 系列 Responses 流量，WebSocket/SSE 的使用量別名
會以相同方式正規化，當 `total_tokens` 缺失或 `0` 時，
總計會回退到正規化的輸入 + 輸出。
當目前的工作階段快照稀疏時，`/status` 和 `session_status` 也可以
從最新的對話紀錄使用量日誌中還原 Token/快取計數器以及活動的執行階段模型標籤。
既有的非零即時值仍優先於對話紀錄回退值，而當儲存的總計缺失或較小時，
較大的提示詞導向對話紀錄總計會優先採用。
供應商配額視窗的使用量授權來自供應商特定的掛鉤（如果有的話）；
否則 OpenClaw 會回退至從授權設定檔、環境變數或組態中比對 OAuth/API 金鑰憑證。

## 成本估算（顯示時）

成本是根據您的模型定價設定估算：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每百萬 Token 美元價格**。如果缺少定價資訊，OpenClaw 只會顯示 Token 數。OAuth 權杖
從不顯示美元成本。

## Cache TTL 和修剪影響

供應商提示快取僅在快取 TTL 視窗內適用。OpenClaw 可以
選擇性執行 **cache-ttl 修剪**：一旦快取 TTL
過期，它就會修剪對話，然後重設快取視窗，以便後續請求可以重用
新快取的上下文，而不是重新快取完整歷史記錄。當對話在 TTL 之後閒置時，這可以降低
快取寫入成本。

您可以在 [Gateway configuration](/en/gateway/configuration) 中進行配置，並在 [Session pruning](/en/concepts/session-pruning) 中查看行為詳情。

Heartbeat 可以跨越閒置間隙保持快取 **溫熱**。如果您的模型快取 TTL
是 `1h`，將 heartbeat 間隔設定在該值以下（例如 `55m`）可以避免
重新快取完整提示，從而降低快取寫入成本。

在多代理設置中，您可以保留一個共用的模型配置，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

如需完整的逐步指南，請參閱 [Prompt Caching](/en/reference/prompt-caching)。

對於 Anthropic API 定價，快取讀取顯著低於輸入
Token，而快取寫入則以較高的倍率計費。請參閱 Anthropic 的
提示快取定價以了解最新費率和 TTL 倍數：
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

### 範例：混合流量與每代理快取策略

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

`agents.list[].params` 會合併到所選模型的 `params` 之上，因此您
只能覆寫 `cacheRetention` 並繼承其他模型預設值不變。

### 範例：啟用 Anthropic 1M 上下文 beta 標頭

Anthropic 的 1M 上下文視窗目前處於 beta 測試階段。當您在支援的 Opus
或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以插入
所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應到 Anthropic 的 `context-1m-2025-08-07` beta 標頭。

這僅適用於在該模型條目上設定了 `context1m: true` 的情況。

要求：憑證必須符合長上下文使用條件（API 金鑰計費，或啟用額外使用額度的 OpenClaw Claude 登入路徑）。如果不符合，Anthropic 將回應
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果您使用 OAuth/訂閱權杖 (`sk-ant-oat-*`) 來驗證 Anthropic，
OpenClaw 會略過 `context-1m-*` beta 標頭，因為 Anthropic 目前
會拒絕此組合並回傳 HTTP 401。

## 降低 Token 壓力的技巧

- 使用 `/compact` 來摘要長對話。
- 在您的工作流程中裁剪大型工具輸出。
- 針對包含大量截圖的對話，降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能清單會被注入提示詞中）。
- 對於冗長、探索性的工作，請偏好使用較小的模型。

請參閱 [Skills](/en/tools/skills) 以取得確切的技能清單額外負荷公式。
