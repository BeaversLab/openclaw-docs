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

完整的對話歷史記錄會保留在磁碟上。壓縮僅改變模型
在下一輪中看到的內容。

## 自動壓縮

預設情況下，自動壓縮是開啟的。當會話接近上下文限制時，
或者當模型返回上下文溢出錯誤時（在這種情況下
OpenClaw 會壓縮並重試），它就會運行。

<Info>在壓縮之前，OpenClaw 會自動提醒代理將重要筆記儲存到 [memory](/en/concepts/memory) 檔案中。這可以防止上下文丟失。</Info>

## 手動壓縮

在任何聊天中輸入 `/compact` 以強制進行壓縮。添加指令以引導摘要：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

預設情況下，壓縮使用您代理的主要模型。您可以使用
能力更強的模型來獲得更好的摘要：

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

## 壓縮與修剪

|              | 壓縮                 | 修剪                         |
| ------------ | -------------------- | ---------------------------- |
| **作用**     | 總結較舊的對話       | 修剪舊的工具結果             |
| **已儲存？** | 是（在會話紀錄檔中） | 否（僅在記憶體中，每次請求） |
| **範圍**     | 整個對話             | 僅限工具結果                 |

[會話修剪](/en/concepts/session-pruning) 是一個更輕量級的補充機制，它會在不進行總結的情況下修剪工具輸出。

## 疑難排解

**壓縮太頻繁？** 模型的上下文視窗可能很小，或者
工具輸出可能很大。請嘗試啟用
[會話修剪](/en/concepts/session-pruning)。

**壓縮後上下文感覺陳舊？** 使用 `/compact Focus on <topic>` 來
引導摘要，或啟用 [memory flush](/en/concepts/memory) 以便
保留筆記。

**需要全新的開始？** `/new` 會啟動一個新的會話而不進行壓縮。

若要進行進階設定（保留 Token、識別符保留、自訂上下文引擎、OpenAI 伺服器端壓縮），請參閱
[Session Management Deep Dive](/en/reference/session-management-compaction)。

## 相關內容

- [Session](/en/concepts/session) — Session 管理與生命週期
- [Session Pruning](/en/concepts/session-pruning) — 修剪工具結果
- [Context](/en/concepts/context) — 如何為 Agent 回合建構上下文
- [Hooks](/en/automation/hooks) — 壓縮生命週期 Hooks (before_compaction, after_compaction)
