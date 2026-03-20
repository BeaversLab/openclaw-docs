---
summary: "OpenClaw 如何建構提示詞上下文並回報 token 使用量與成本"
read_when:
  - 說明 token 使用量、成本或上下文視窗
  - 偵錯上下文增長或壓縮行為
title: "Token 使用與成本"
---

# Token 使用與成本

OpenClaw 追蹤的是 **tokens**（token），而非字元。Token 因模型而異，但大多數
OpenAI 風格的模型對於英文文字平均每個 token 約為 4 個字元。

## 系統提示詞的建構方式

OpenClaw 每次執行時都會組裝自己的系統提示詞。它包含：

- 工具列表 + 簡短描述
- 技能列表（僅中繼資料；指令會透過 `read` 按需載入）
- 自我更新指令
- 工作區 + 引導檔案（當為新檔案時 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`，加上存在時的 `MEMORY.md` 或作為小寫後備的 `memory.md`）。大檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設值：20000），且總引導注入量受到 `agents.defaults.bootstrapTotalMaxChars` 上限限制（預設值：150000）。`memory/*.md` 檔案是透過記憶工具按需取得，不會自動注入。
- 時間（UTC + 使用者時區）
- 回覆標籤 + 心跳行為
- 執行時期中繼資料（主機/作業系統/模型/思考）

請參閱 [系統提示詞](/zh-Hant/concepts/system-prompt) 了解完整細分。

## 上下文視窗中計入的項目

模型接收到的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫與工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要與修剪產生的資料
- 提供者包裝函式或安全標頭（不可見，但仍會計入）

對於圖片，OpenClaw 會在呼叫提供者前縮小逐字稿/工具圖片酬載。
使用 `agents.defaults.imageMaxDimensionPx`（預設值：`1200`） 進行調整：

- 較低的值通常會減少視覺 token 的使用量與酬載大小。
- 較高的值會保留更多視覺細節，適合 OCR 或 UI 密集型的螢幕截圖。

如需實用細分（按注入的檔案、工具、技能和系統提示詞大小），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 如何查看目前 Token 使用量

在聊天中使用這些：

- `/status` → 顯示包含工作階段模型、內容使用量、
  上次回應輸入/輸出 Token 和 **預估成本**（僅限 API 金鑰）的 **豐富表情符號狀態卡**。
- `/usage off|tokens|full` → 在每個回覆附加 **每次回應使用量頁尾**。
  - 每個工作階段持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證會**隱藏成本**（僅顯示 Token）。
- `/usage cost` → 顯示來自 OpenClaw 工作階段日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  提供者配額視窗（而非每次回應的成本）。

## 成本估算（顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 萬個 Token 的美元價格**。如果缺少定價，OpenClaw 僅顯示 Token。OAuth Token
永遠不會顯示美元成本。

## 快取 TTL 和修剪影響

提供者提示詞快取僅適用於快取 TTL 視窗內。OpenClaw 可以
選擇性地執行 **cache-ttl 修剪**：它在快取 TTL
過期後修剪工作階段，然後重設快取視窗，以便後續請求可以重用
新快取的內容，而不是重新快取完整歷史記錄。這能夠在
工作階段閒置超過 TTL 時保持較低的快取寫入成本。

請在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行配置，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看
行為詳情。

Heartbeat 可以讓快取在閒置間隔中保持 **暖機** 狀態。如果您的模型快取 TTL
是 `1h`，將心跳間隔設定在略低於該值（例如 `55m`）可以避免
重新快取完整提示詞，從而減少快取寫入成本。

在多代理設定中，您可以保留一個共用的模型配置，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

如需完整的逐步指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

對於 Anthropic API 定價，快取讀取比輸入 token 便宜許多，而快取寫入則以較高的倍率計費。請參閱 Anthropic 的提示快取定價以取得最新費率和 TTL 倍率：
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

### 範例：混合流量搭配每個代理的快取策略

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

`agents.list[].params` 會在選定模型的 `params` 之上進行合併，因此您可以只覆寫 `cacheRetention` 並繼承其他模型預設值而不變更。

### 範例：啟用 Anthropic 1M 語境 beta 標頭

Anthropic 的 1M 語境視窗目前僅限 beta 測試。當您在支援的 Opus 或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以插入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應到 Anthropic 的 `context-1m-2025-08-07` beta 標頭。

這僅適用於在該模型項目上設定 `context1m: true` 時。

需求：憑證必須具備使用長語境的資格 (API 金鑰計費，或已啟用額外使用量的訂閱)。若未符合，Anthropic 將回應 `HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果您使用 OAuth/訂閱 token (`sk-ant-oat-*`) 對 Anthropic 進行驗證，
OpenClaw 將會跳過 `context-1m-*` beta 標頭，因為 Anthropic 目前會以 HTTP 401 拒絕該組合。

## 降低 token 壓力的技巧

- 使用 `/compact` 來摘要長時間的對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量螢幕擷圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短 (技能列表會插入到提示中)。
- 對於冗長的探索性工作，請優先選擇較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能列表額外負載公式。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
