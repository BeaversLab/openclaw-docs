---
summary: "OpenClaw 如何建構提示詞上下文並回報 Token 使用量與成本"
read_when:
  - 解釋 Token 使用量、成本或上下文視窗
  - 偵錯上下文增長或壓縮行為
title: "Token 使用與成本"
---

# Token 使用與成本

OpenClaw 追蹤的是 **tokens**（Token），而非字元。Token 因模型而異，但大多數
OpenAI 風格的模型對於英文文字平均每個 Token 約為 4 個字元。

## 系統提示詞的建構方式

OpenClaw 會在每次執行時組裝自己的系統提示詞。它包含：

- 工具清單 + 簡短描述
- 技能清單（僅包含元資料；指令會隨需使用 `read` 載入）
- 自我更新指令
- 工作區 + 引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、以及 `BOOTSTRAP.md`，如果是新的）。大檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設值：20000）。
- 時間 (UTC + 使用者時區)
- 回覆標籤 + 心跳行為
- 執行時期元數據 (主機/作業系統/模型/思考)

請參閱 [系統提示詞](/zh-Hant/concepts/system-prompt) 以了解完整細目。

## 什麼計入內容視窗

模型接收的所有內容都會計入內容限制：

- 系統提示詞（上面列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫和工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要和修剪產物
- 提供者包裝器或安全標頭（不可見，但仍計算在內）

如需實用的細分數據（按每個注入的檔案、工具、技能和系統提示詞大小），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 如何查看目前的 Token 使用量

在聊天中使用這些指令：

- `/status` → **豐富的表情狀態卡**，包含會話模型、內容使用量、
  上一次回應的輸入/輸出 Token 數以及 **預估成本**（僅限 API 金鑰）。
- `/usage off|tokens|full` → 在每次回覆後附加 **單次回應使用量頁尾**。
  - 每個會話持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證會**隱藏成本**（僅顯示 Token）。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI:** 支援 `/status` + `/usage`。
- **CLI:** `openclaw status --usage` 和 `openclaw channels list` 顯示
  提供者配額視窗（而非每次回應的成本）。

## 成本估算（如顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 萬個 Token 的美元價格**。如果缺少定價，OpenClaw 僅顯示 Token。OAuth Token 從不顯示美元成本。

## 快取 TTL 和修剪影響

提供者提示快取僅在快取 TTL 視窗內有效。OpenClaw 可以選擇性地執行 **快取 TTL 修剪**：一旦快取 TTL 過期，它就會修剪會話，然後重設快取視窗，以便後續請求可以重用新快取的上下文，而不是重新快取完整的歷史記錄。當會話閒置超過 TTL 時，這可以保持較低的快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行設定，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看行為細節。

Heartbeat 可以在閒置期間保持快取 **溫熱**。如果您的模型快取 TTL 為 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免重新快取完整的提示，從而降低快取寫入成本。

對於 Anthropic API 定價，快取讀取比輸入 Token 便宜得多，而快取寫入則以更高的倍率計費。請參閱 Anthropic 的提示快取定價以了解最新費率和 TTL 倍數：
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### 範例：使用心跳保持 1 小時快取溫熱

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

## 減輕 Token 壓力的技巧

- 使用 `/compact` 來摘要長會話。
- 修剪工作流程中的大型工具輸出。
- 保持技能描述簡短（技能清單會被注入到提示中）。
- 對於冗長、探索性的工作，偏好使用較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能清單開銷公式。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
