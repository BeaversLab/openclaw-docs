---
summary: "OpenClaw 如何摘要長對話以保持在模型限制內"
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

當 OpenClaw 將歷史記錄分割為壓縮區塊時，它會將助理工具呼叫與其對應的 `toolResult` 項目保持配對。如果分割點落在工具區塊內，OpenClaw 會移動邊界，使該對保持在一起，並保留當前未摘要的尾部。

完整的對話歷史記錄會保留在磁碟上。壓縮只會改變模型在下一輪看到的內容。

## 自動壓縮

自動壓縮預設為開啟。當工作階段接近上下文限制，或模型返回上下文溢出錯誤時（在這種情況下，OpenClaw 會進行壓縮並重試），它就會執行。典型的溢出特徵包括 `request_too_large`、`context length exceeded`、`input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, and `ollama error: context length
exceeded`。

<Info>在壓縮之前，OpenClaw 會自動提醒代理將重要筆記儲存到 [memory](/en/concepts/memory) 檔案中。這可以防止上下文遺失。</Info>

使用您的 `openclaw.json` 中的 `agents.defaults.compaction` 設定來設定壓縮行為（模式、目標 token 等）。
壓縮摘要預設會保留不透明識別碼 (`identifierPolicy: "strict"`)。您可以使用 `identifierPolicy: "off"` 覆蓋此設定，或使用 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自訂文字。

您可以透過 `agents.defaults.compaction.model` 指定不同的模型來進行壓縮摘要。當您的主要模型是本機或小型模型，並且希望由能力更強的模型產生壓縮摘要時，這非常有用。此覆蓋接受任何 `provider/model-id` 字串：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

這也適用於本機模型，例如專用於摘要的第二個 Ollama 模型或微調過的壓縮專家模型：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

未設定時，壓縮會使用代理的主要模型。

## 可插拔的壓縮提供者

外掛程式可以透過外掛程式 API 上的 `registerCompactionProvider()` 註冊自訂壓縮提供者。當註冊並配置了提供者時，OpenClaw 會將摘要工作委派給它，而不是使用內建的 LLM 管線。

若要使用已註冊的提供者，請在您的配置中設定提供者 ID：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

設定 `provider` 會自動強制 `mode: "safeguard"`。提供者會收到與內建路徑相同的壓縮指令和識別符保留原則，而 OpenClaw 仍會在提供者輸出之後保留最近輪次和分割輪次的後綴上下文。如果提供者失敗或傳回空結果，OpenClaw 將會回退到內建的 LLM 摘要。

## 自動壓縮（預設開啟）

當工作階段接近或超過模型的上下文視窗時，OpenClaw 會觸發自動壓縮，並可能使用壓縮後的上下文重試原始請求。

您會看到：

- 在詳細模式下的 `🧹 Auto-compaction complete`
- 顯示 `🧹 Compactions: <count>` 的 `/status`

在壓縮之前，OpenClaw 可以執行 **靜默記憶體清除 (silent memory flush)** 輪次，將持久的筆記儲存到磁碟。請參閱 [記憶體 (Memory)](/en/concepts/memory) 以了解詳細資訊和配置。

## 手動壓縮

在任何聊天中輸入 `/compact` 以強制執行壓縮。加入指令以引導摘要：

```
/compact Focus on the API design decisions
```

## 使用不同的模型

預設情況下，壓縮使用您代理程式的主要模型。您可以使用能力更強的模型來獲得更好的摘要：

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

預設情況下，壓縮會靜默執行。若要在壓縮開始時顯示簡短通知，請啟用 `notifyUser`：

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

啟用後，使用者會在每次壓縮執行開始時看到一則短訊息（例如，「正在壓縮上下文...」）。

## 壓縮與修剪

|                | 壓縮                   | 修剪                         |
| -------------- | ---------------------- | ---------------------------- |
| **作用**       | 摘要較舊的對話         | 修剪舊的工具結果             |
| **是否保留？** | 是（在工作階段記錄中） | 否（僅在記憶體中，每次請求） |
| **範圍**       | 整個對話               | 僅限工具結果                 |

[工作階段修剪 (Session pruning)](/en/concepts/session-pruning) 是一個更輕量的輔助功能，用於在不進行摘要的情況下修剪工具輸出。

## 疑難排解

**壓縮太過頻繁？** 模型的上下文視窗可能太小，或者工具輸出可能太大。請嘗試啟用
[session pruning](/en/concepts/session-pruning)。

**壓縮後上下文感覺陳舊？** 使用 `/compact Focus on <topic>` 來
指引摘要，或啟用 [memory flush](/en/concepts/memory) 以讓
筆記保留。

**需要從頭開始？** `/new` 啟動一個新的會話而不進行壓縮。

若需進階設定（保留 token、識別符保留、自訂上下文引擎、OpenAI 伺服器端壓縮），請參閱
[Session Management Deep Dive](/en/reference/session-management-compaction)。

## 相關內容

- [Session](/en/concepts/session) — 會話管理與生命週期
- [Session Pruning](/en/concepts/session-pruning) — 修剪工具結果
- [Context](/en/concepts/context) — 如何為 agent 回合建立上下文
- [Hooks](/en/automation/hooks) — 壓縮生命週期鉤子（before_compaction, after_compaction）
