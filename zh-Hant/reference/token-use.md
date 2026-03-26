---
summary: "OpenClaw 如何建構提示詞上下文並回報 token 使用量 + 成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用與成本"
---

# Token 使用與成本

OpenClaw 追蹤 **tokens**，而不是字元。Token 是特定於模型的，但大多數
OpenAI 風格的模型對於英文文字平均每個 token 約為 4 個字元。

## 系統提示詞是如何建構的

OpenClaw 會在每次執行時組裝自己的系統提示詞。它包含：

- 工具列表 + 簡短描述
- 技能列表（僅包含元資料；指令會透過 `read` 按需載入）
- 自我更新指令
- 工作區 + 引導檔案（當這些檔案是新的時：`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`，另外如果存在 `MEMORY.md` 則包含它，或者使用 `memory.md` 作為小寫後備）。大型檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設值：20000），且總引導注入量受 `agents.defaults.bootstrapTotalMaxChars` 限制（預設值：150000）。`memory/*.md` 檔案是透過記憶體工具按需獲取的，不會自動注入。
- 時間（UTC + 使用者時區）
- 回覆標籤 + 心跳行為
- 執行時期元資料（主機/作業系統/模型/思考）

在 [系統提示詞](/zh-Hant/concepts/system-prompt) 中查看完整細目。

## 什麼會計入上下文視窗

模型收到的所有內容都會計入上下文限制：

- 系統提示詞（上面列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫和工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要和修剪產物
- 供應商包裝器或安全性標頭（不可見，但仍會計算在內）

對於圖片，OpenClaw 會在呼叫供應商之前下調逐字稿/工具圖片的大小。
使用 `agents.defaults.imageMaxDimensionPx`（預設值：`1200`）來進行調整：

- 較低的值通常會減少視覺 token 的使用量和載荷大小。
- 較高的值會為 OCR/UI 繁重的螢幕截圖保留更多視覺細節。

若要查看實用細分（依注入的檔案、工具、技能和系統提示詞大小），請使用 `/context list` 或 `/context detail`。請參閱[Context](/zh-Hant/concepts/context)。

## 如何查看目前的 Token 使用量

在聊天中使用：

- `/status` → 顯示包含工作階段模型、Context 使用量、
  最後一次回應的輸入/輸出 Token 以及**預估成本**（僅限 API 金鑰）的 **豐富表情符號狀態卡**。
- `/usage off|tokens|full` → 在每次回覆後附加 **單次回應使用量頁尾**。
  - 每個工作階段持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證會**隱藏成本**（僅顯示 Token）。
- `/usage cost` → 顯示來自 OpenClaw 工作階段日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  供應商配額視窗（而非單次回應成本）。

## 成本預估（顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每百萬 Token 美元價格**。如果缺少定價，OpenClaw 僅顯示 Token。OAuth Token
絕不會顯示美元成本。

## 快取 TTL 和修剪影響

供應商提示詞快取僅適用於快取 TTL 視窗內。OpenClaw 可以
選擇性地執行 **cache-ttl 修剪**：它在快取 TTL
到期後修剪工作階段，然後重設快取視窗，以便後續請求可以重用
新快取的 Context，而不是重新快取完整的歷史記錄。這可以
在工作階段閒置超過 TTL 時降低快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行設定，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看
行為詳情。

心跳可以在閒置間隔期間保持快取 **溫熱**。如果您的模型快取 TTL
是 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免
重新快取完整提示詞，從而減少快取寫入成本。

在多代理設定中，您可以保留一個共用的模型設定，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

如需完整的逐步指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

對於 Anthropic API 價格，快取讀取比輸入 token 便宜許多，而快取寫入則以更高的倍率計費。請參閱 Anthropic 的提示快取價格以了解最新費率和 TTL 倍率：
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

`agents.list[].params` 會與所選模型的 `params` 進行合併，因此您可以
僅覆寫 `cacheRetention` 並繼承其他模型預設值不變。

### 範例：啟用 Anthropic 1M 上下文 Beta 標頭

Anthropic 的 1M 上下文視窗目前處於 Beta 封閉階段。當您在支援的 Opus
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

這對應到 Anthropic 的 `context-1m-2025-08-07` beta 標頭。

這僅適用於在該模型項目上設定了 `context1m: true` 的情況。

需求：憑證必須符合長上下文使用資格 (API 金鑰計費，或啟用了額外使用量的訂閱)。如果不符合，Anthropic 將
以 `HTTP 429: rate_limit_error: Extra usage is required for long context requests` 回應。

如果您使用 OAuth/訂閱 token (`sk-ant-oat-*`) 進行 Anthropic 身份驗證，
OpenClaw 將跳過 `context-1m-*` beta 標頭，因為 Anthropic 目前
會拒絕該組合並回傳 HTTP 401。

## 減輕 Token 壓力的技巧

- 使用 `/compact` 來總結長對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短 (技能清單會被注入到提示中)。
- 對於冗長的探索性工作，偏好使用較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解精確的技能清單開銷公式。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
