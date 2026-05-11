---
summary: "OpenClaw 如何摘要長對話以保持在模型限制內"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "壓縮"
---

每個模型都有一個上下文視窗：即其可以處理的最大 token 數量。當對話接近該限制時，OpenClaw 會將較舊的訊息**壓縮**成摘要，以便聊天能夠繼續。

## 運作方式

1. 較舊的對話輪次會被摘要成一個壓縮條目。
2. 摘要會儲存在對話記錄中。
3. 最近的訊息會保持完整。

當 OpenClaw 將歷史記錄分割成壓縮區塊時，它會將助理的工具呼叫與其對應的 `toolResult` 條目配對。如果分割點落在工具區塊內，OpenClaw 會移動邊界，使這一對保持在一起，並保留目前未摘要的尾部。

完整的對話歷史記錄會保留在磁碟上。壓縮只會改變模型在下一輪所看到的內容。

## 自動壓縮

預設會開啟自動壓縮。當對話接近上下文限制，或當模型返回上下文溢位錯誤時（在這種情況下，OpenClaw 會進行壓縮並重試），它就會執行。

您將會看到：

- `🧹 Auto-compaction complete` 在詳細模式下。
- `/status` 顯示 `🧹 Compactions: <count>`。

<Info>在壓縮之前，OpenClaw 會自動提醒代理將重要筆記儲存到 [memory](/zh-Hant/concepts/memory) 檔案中。這可以防止上下文遺失。</Info>

<AccordionGroup>
  <Accordion title="可辨識的溢位特徵">
    OpenClaw 會根據這些提供者的錯誤模式偵測上下文溢位：

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## 手動壓縮

在任何聊天中輸入 `/compact` 以強制進行壓縮。新增指示以引導摘要：

```
/compact Focus on the API design decisions
```

當設定 `agents.defaults.compaction.keepRecentTokens` 時，手動壓縮會遵循該 Pi 切割點，並在重建的上下文中保留最近的尾部。如果沒有明確的保留預算，手動壓縮會充當硬檢查點，並僅從新摘要繼續。

## 組態

在您的 `openclaw.json` 中的 `agents.defaults.compaction` 下配置壓縮。以下列出了最常見的選項；如需完整參考，請參閱[會話管理深度解析](/zh-Hant/reference/session-management-compaction)。

### 使用不同的模型

預設情況下，壓縮使用代理程式的主要模型。設定 `agents.defaults.compaction.model` 可將摘要處理委派給能力更強或更專門的模型。此覆寫接受任何 `provider/model-id` 字串：

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

這也適用於本地模型，例如專門用於摘要處理的第二個 Ollama 模型：

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

未設定時，壓縮使用代理程式的主要模型。

### 識別碼保留

壓縮摘要預設會保留不透明識別碼 (`identifierPolicy: "strict"`)。使用 `identifierPolicy: "off"` 覆寫以停用，或使用 `identifierPolicy: "custom"` 加上 `identifierInstructions` 進行自訂引導。

### 動態文字紀錄位元組守衛

當設定 `agents.defaults.compaction.maxActiveTranscriptBytes` 時，如果動態 JSONL 達到該大小，OpenClaw 會在執行前觸發正常的本地壓縮。這對於長時間執行的會話非常有用，因為在這種情況下，提供者端的內容管理可能會保持模型內容的健康，而本地文字紀錄會持續增長。它不會分割原始 JSONL 位元組；它會要求正常的壓縮管線建立語意摘要。

<Warning>位元組守衛需要 `truncateAfterCompaction: true`。如果沒有文字紀錄輪替，動態檔案將不會縮小，且守衛將保持不活動狀態。</Warning>

### 後續文字紀錄

啟用 `agents.defaults.compaction.truncateAfterCompaction` 後，OpenClaw 不會就地重寫現有的文字紀錄。它會根據壓縮摘要、保留的狀態和未摘要的尾部建立一個新的動態後續文字紀錄，然後將先前的 JSONL 保留為封存的檢查點來源。
後續文字紀錄也會捨棄在短暫重試視窗內到達的重複長使用者輪次，因此通道重試風暴不會在壓縮後被帶入下一個動態文字紀錄中。

壓縮前的檢查點僅在其保持在 OpenClaw 的檢查點大小上限以下時才會保留；過大的動態文字紀錄仍會進行壓縮，但 OpenClaw 會跳過大型除錯快照，而不是讓磁碟使用量加倍。

### 壓縮通知

預設情況下，壓縮過程會靜默運作。設定 `notifyUser` 以在壓縮開始和完成時顯示簡短的狀態訊息：

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

### 記憶體排空

在壓縮之前，OpenClaw 可以執行一個 **靜默記憶體排空** 步驟，將持久化的筆記儲存到磁碟。詳情與設定請參閱 [Memory](/zh-Hant/concepts/memory)。

## 可插拔壓縮提供者

外掛程式可以透過外掛 API 上的 `registerCompactionProvider()` 註冊自訂壓縮提供者。當註冊並設定好提供者後，OpenClaw 會將摘要工作委派給它，而不是使用內建的 LLM 流程。

若要使用已註冊的提供者，請在您的設定中設定其 id：

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

設定 `provider` 會自動強制啟用 `mode: "safeguard"`。提供者會收到與內建路徑相同的壓縮指令和識別碼保留策略，而且 OpenClaw 仍會在提供者輸出後保留最近的對話輪次和分割輪次的後綴內容。

<Note>如果提供者失敗或傳回空結果，OpenClaw 將會回退到內建的 LLM 摘要功能。</Note>

## 壓縮 vs 修剪

|                | 壓縮               | 修剪                         |
| -------------- | ------------------ | ---------------------------- |
| **作用**       | 摘要較舊的對話內容 | 修剪舊的工具結果             |
| **是否儲存？** | 是（在對話紀錄中） | 否（僅在記憶體中，每次請求） |
| **範圍**       | 整個對話           | 僅限工具結果                 |

[Session pruning](/zh-Hant/concepts/session-pruning) 是一種更輕量的補充機制，它會修剪工具輸出而不進行摘要。

## 疑難排解

**壓縮太過頻繁？** 模型的上下文視窗可能太小，或是工具輸出太大。嘗試啟用 [session pruning](/zh-Hant/concepts/session-pruning)。

**壓縮後內容感覺過時？** 使用 `/compact Focus on <topic>` 來引導摘要，或啟用 [memory flush](/zh-Hant/concepts/memory) 以保留筆記。

**需要重新開始？** `/new` 會啟動一個全新的對話而不進行壓縮。

如需進階設定（保留 token、識別碼保留、自訂內容引擎、OpenAI 伺服器端壓縮），請參閱 [Session management deep dive](/zh-Hant/reference/session-management-compaction)。

## 相關內容

- [Session](/zh-Hant/concepts/session)：對話管理與生命週期。
- [Session pruning](/zh-Hant/concepts/session-pruning)：修剪工具結果。
- [Context](/zh-Hant/concepts/context): 如何為代理回合建構內容。
- [Hooks](/zh-Hant/automation/hooks): 壓縮生命週期掛鉤 (`before_compaction`, `after_compaction`)。
