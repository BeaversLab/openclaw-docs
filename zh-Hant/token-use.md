---
summary: "OpenClaw 如何建構提示詞上下文並回報 token 使用量與成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用與成本"
---

# Token 使用與成本

OpenClaw 追蹤的是 **token**，而非字元。Token 取決於具體模型，但大多數
OpenAI 風格的模型對於英文文本平均約為每 token 4 個字元。

## 系統提示詞如何建構

OpenClaw 每次執行時都會組裝自己的系統提示詞。它包含：

- 工具列表 + 簡短描述
- 技能列表（僅限元資料；指令會透過 `read` 按需載入）
- 自我更新指令
- 工作區 + 引導檔案（當有新內容時包含 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）。大型檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設值：20000）。
- 時間（UTC + 使用者時區）
- 回覆標籤 + 心跳行為
- 執行時元資料（主機/作業系統/模型/思考狀態）

請參閱 [系統提示詞](/zh-Hant/concepts/system-prompt) 中的完整細目。

## 什麼會計入上下文視窗

模型接收到的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫和工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要和修剪產物
- 提供者包裝器或安全性標頭（不可見，但仍會計入）

若要查看實用的細目（依每個注入檔案、工具、技能和系統提示詞大小），請使用 `/context list` 或 `/context detail`。請參閱 [上下文](/zh-Hant/concepts/context)。

## 如何查看目前的 token 使用量

在聊天中使用這些指令：

- `/status` → 顯示包含會話模型、上下文使用量、
  最近一次回應輸入/輸出 token 數量以及 **預估成本**（僅限 API 金鑰）的 **豐富表情符號狀態卡片**。
- `/usage off|tokens|full` → 在每次回應後附加 **單次回應使用量頁尾**。
  - 會依照每個會話持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證會**隱藏成本**（僅顯示 token）。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本機成本摘要。

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
`cacheWrite` 的 **每百萬 Token 美元** 價格。如果缺少定價，OpenClaw 僅顯示 Token 數。OAuth Token
從不顯示美金成本。

## 快取 TTL 和剪枝的影響

提供商提示快取僅在快取 TTL 視窗內生效。OpenClaw 可以
選擇性執行 **快取 TTL 剪枝**：它會在快取 TTL
過期後剪枝會話，然後重設快取視窗，以便後續請求能重用
新快取的內容，而不是重新快取完整歷史記錄。當會話閒置超過 TTL 時，這能
保持較低的快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行設定，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看
行為細節。

心跳可以在閒置期間保持快取 **溫熱**。如果您的模型快取 TTL
是 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免
重新快取完整提示，從而降低快取寫入成本。

對於 Anthropic API 定價，快取讀取比輸入
Token 便宜得多，而快取寫入則以更高的倍率計費。請參閱 Anthropic 的
提示快取定價以了解最新費率和 TTL 倍率：
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

## 降低 Token 壓力的技巧

- 使用 `/compact` 來總結長會話。
- 在您的工作流程中修剪大型工具輸出。
- 保持技能描述簡短（技能清單會插入提示中）。
- 對於冗長、探索性的工作，首選較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能清單開銷公式。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
