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

請參閱 [系統提示詞](/en/concepts/system-prompt) 以了解完整細節。

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

若要取得實用的詳細分類（針對每個注入的檔案、工具、技能以及系統提示詞大小），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/en/concepts/context)。

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
  提供商配額視窗（而非每次回應的成本）。

## 成本估算（顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每百萬 Token 美元價**。如果缺少定價，OpenClaw 僅顯示 Token。OAuth Token
絕不會顯示金額成本。

## Cache TTL 和清理影響

提供者 Prompt 快取僅在 Cache TTL 視窗內有效。OpenClaw 可以
選擇性地執行 **cache-ttl pruning**：它在 Cache TTL
過期後清理 Session，然後重置快取視窗，以便後續請求可以重新使用
新快取的 Context，而不是重新快取完整的歷史記錄。當 Session
閒置超過 TTL 時，這能保持較低的快取寫入成本。

在 [Gateway configuration](/en/gateway/configuration) 中進行設定，並在 [Session pruning](/en/concepts/session-pruning) 中查看
行為細節。

Heartbeat 可以在閒置期間保持 Cache **溫熱**。如果您的模型 Cache TTL
為 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免
重新快取完整的 Prompt，減少 Cache 寫入成本。

在多代理設定中，您可以保留一個共享的模型設定，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

如需完整的逐項指南，請參閱 [提示詞快取](/en/reference/prompt-caching)。

對於 Anthropic API 定價，快取讀取的費用顯著低於輸入 Token，而快取寫入則以更高的倍率計費。請參閱 Anthropic 的提示詞快取定價以了解最新費率和 TTL 倍數：
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

`agents.list[].params` 會在選定模型的 `params` 之上進行合併，因此您可以僅覆寫 `cacheRetention` 並繼承其他模型預設值不變。

### 範例：啟用 Anthropic 1M 上下文測試版標頭

Anthropic 的 1M 上下文視窗目前僅限測試版使用。當您在支援的 Opus 或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以自動注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應到 Anthropic 的 `context-1m-2025-08-07` 測試版標頭。

這僅在該模型條目設定了 `context1m: true` 時適用。

需求：憑證必須符合使用長上下文的資格 (API 金鑰計費，或已啟用額外使用量的訂閱)。如果不符合，Anthropic 將回應 `HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果您使用 OAuth/訂閱 Token (`sk-ant-oat-*`) 來驗證 Anthropic，OpenClaw 將跳過 `context-1m-*` 測試版標頭，因為 Anthropic 目前會以 HTTP 401 拒絕該組合。

## 減輕 Token 壓力的技巧

- 使用 `/compact` 來摘要長對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短 (技能清單會被注入到提示詞中)。
- 對於冗長的探索性工作，首選較小的模型。

請參閱 [技能](/en/tools/skills) 以了解確切的技能清單額外負荷公式。
