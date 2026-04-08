---
summary: "OpenClaw 如何總結長對話以保持在模型限制內"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "壓縮"
---

# 壓縮

每個模型都有一個上下文視窗——即其能處理的最大 token 數量。
當對話接近該限制時，OpenClaw 會將較舊的訊息**壓縮**
為摘要，以便聊天能夠繼續進行。

## 運作原理

1. 較舊的對話輪次會被總結為一個壓縮條目。
2. 摘要會儲存在會話紀錄檔中。
3. 最近的訊息會保持完整。

當 OpenClaw 將歷史記錄分割為壓縮區塊時，它會保持助理工具呼叫與其對應的 `toolResult` 條目成對。如果分割點落在工具區塊內，OpenClaw 會移動邊界，使這一對保持在一起，並保留當前未壓縮的尾部。

完整的對話歷史記錄會保留在磁碟上。壓縮只會改變模型在下一輪看到的內容。

## 自動壓縮

自動壓縮預設為開啟。它會在工作階段接近內容限制時運行，或者在模型返回內容溢出錯誤時運行（在這種情況下，OpenClaw 會壓縮並重試）。典型的溢出特徵包括 `request_too_large`、`context length exceeded`、`input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, and `ollama error: context length
exceeded`。

<Info>在壓縮之前，OpenClaw 會自動提醒代理將重要筆記儲存到 [記憶](/en/concepts/memory) 檔案中。這可以防止內容遺失。</Info>

## 手動壓縮

在任何對話中輸入 `/compact` 以強制進行壓縮。新增指令以引導摘要：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

預設情況下，壓縮使用您代理的主要模型。您可以使用能力更強的模型來獲得更好的摘要：

```json5
{
  agents: {
    defaults: {
      compaction: {
        model: "openrouter/anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

## 壓縮開始通知

預設情況下，壓縮會靜默運行。若要在壓縮開始時顯示簡短通知，請啟用 `notifyUser`：

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

啟用後，使用者會在每次壓縮運行開始時看到一則短訊息（例如，「正在壓縮內容...」）。

## 壓縮與修剪

|                | 壓縮                   | 修剪                         |
| -------------- | ---------------------- | ---------------------------- |
| **作用**       | 總結較舊的對話         | 修剪舊的工具結果             |
| **是否儲存？** | 是（在工作階段記錄中） | 否（僅在記憶體中，每次請求） |
| **範圍**       | 整個對話               | 僅限工具結果                 |

[工作階段修剪](/en/concepts/session-pruning) 是一個更輕量的補充機制，用於修剪工具輸出而不進行摘要。

## 疑難排解

**壓縮太過頻繁？** 模型的上下文視窗可能較小，或者工具
輸出可能很大。請嘗試啟用
[session pruning](/en/concepts/session-pruning)。

**壓縮後上下文感覺過時？** 使用 `/compact Focus on <topic>` 來
引導摘要，或啟用 [memory flush](/en/concepts/memory) 以便
保存註記。

**需要全新的開始？** `/new` 啟動一個新的會話而不進行壓縮。

如需進階設定（保留 token、識別碼保留、自訂
上下文引擎、OpenAI 伺服器端壓縮），請參閱
[Session Management Deep Dive](/en/reference/session-management-compaction)。

## 相關

- [Session](/en/concepts/session) — session management and lifecycle
- [Session Pruning](/en/concepts/session-pruning) — trimming tool results
- [Context](/en/concepts/context) — how context is built for agent turns
- [Hooks](/en/automation/hooks) — compaction lifecycle hooks (before_compaction, after_compaction)
