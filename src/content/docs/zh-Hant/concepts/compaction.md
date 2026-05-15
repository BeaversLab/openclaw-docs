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

當 OpenClaw 將歷史記錄分割為壓縮區塊時，它會將助理工具呼叫與其對應的 `toolResult` 條目保持配對。如果分割點落在工具區塊內，OpenClaw 會移動邊界，使該對保持在一起，並保留當前未摘要的尾部。

完整的對話歷史記錄會保留在磁碟上。壓縮只會改變模型在下一輪所看到的內容。

## 自動壓縮

預設會開啟自動壓縮。當對話接近上下文限制，或當模型返回上下文溢位錯誤時（在這種情況下，OpenClaw 會進行壓縮並重試），它就會執行。

您將會看到：

- `🧹 Auto-compaction complete` 處於詳細模式。
- `/status` 顯示 `🧹 Compactions: <count>`。

<Info>在壓縮之前，OpenClaw 會自動提醒代理將重要筆記儲存到 [memory](/zh-Hant/concepts/memory) 檔案中。這可以防止上下文遺失。</Info>

<AccordionGroup>
  <Accordion title="可識別的溢出簽名">
    OpenClaw 會從這些提供者錯誤模式中偵測上下文溢出：

    - `request_too_large`
    - `context length exceeded`
    - `input exceeds the maximum number of tokens`
    - `input token count exceeds the maximum number of input tokens`
    - `input is too long for the model`
    - `ollama error: context length exceeded`

  </Accordion>
</AccordionGroup>

## 手動壓縮

在任何聊天中輸入 `/compact` 以強制進行壓縮。新增指令以引導摘要：

```
/compact Focus on the API design decisions
```

當設定 `agents.defaults.compaction.keepRecentTokens` 時，手動壓縮會遵循該 Pi 切割點，並將最近的尾部保留在重建的上下文中。如果沒有明確的保留預算，手動壓縮的行為就像一個硬式檢查點，並僅從新的摘要繼續。

## 組態

在您的 `openclaw.json` 中的 `agents.defaults.compaction` 下配置壓縮。最常見的選項列於下方；若需完整參考，請參閱[會話管理深入探討](/zh-Hant/reference/session-management-compaction)。

### 使用不同的模型

預設情況下，壓縮使用代理的主要模型。設定 `agents.defaults.compaction.model` 可將摘要委派給更強大或專門的模型。此覆寫接受任何 `provider/model-id` 字串：

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

未設定時，壓縮從作用中的會話模型開始。如果摘要因提供者錯誤而失敗且符合模型備援條件，OpenClaw 會透過會話現有的模型備援鏈重試該壓縮嘗試。備援選擇是暫時的，不會寫回會話狀態。明確的 `agents.defaults.compaction.model` 覆寫保持精確，且不繼承會話備援鏈。

### 識別碼保留

壓縮摘要預設會保留不透明的識別碼（`identifierPolicy: "strict"`）。覆寫 `identifierPolicy: "off"` 以停用，或是使用 `identifierPolicy: "custom"` 加上 `identifierInstructions` 來進行自訂引導。

### 動態文字紀錄位元組守衛

當設定 `agents.defaults.compaction.maxActiveTranscriptBytes` 時，如果作用的 JSONL 達到該大小，OpenClaw 會在執行前觸發正常的本機壓縮。這對於長時間執行的工作階段很有用，在這種情況下，提供者端內容管理可能會保持模型內容健康，同時本機對話記錄會持續增長。它不會分割原始 JSONL 位元組；它會要求正常的壓縮管線建立語意摘要。

<Warning>位元組防護需要 `truncateAfterCompaction: true`。如果沒有對話記錄輪替，作用中的檔案將不會縮小，且防護會保持非作用狀態。</Warning>

### 後續文字紀錄

當啟用 `agents.defaults.compaction.truncateAfterCompaction` 時，OpenClaw 不會就地重寫現有的對話記錄。它會從壓縮摘要、保留狀態和未摘要的尾部建立一個新的作用中繼承者對話記錄，然後將先前的 JSONL 保留為已封存的檢查點來源。
繼承者對話記錄也會捨棄在短暫重試視窗內到達的完全重複長使用者輪次，因此在壓縮後，頻道重試風暴不會被帶入下一個作用中對話記錄。

壓縮前的檢查點僅在其保持在 OpenClaw 的檢查點大小上限以下時才會保留；過大的動態文字紀錄仍會進行壓縮，但 OpenClaw 會跳過大型除錯快照，而不是讓磁碟使用量加倍。

### 壓縮通知

預設情況下，壓縮會靜默執行。設定 `notifyUser` 以在壓縮開始和完成時顯示簡短的狀態訊息：

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

在壓縮之前，OpenClaw 可以執行**靜默記憶體清除**輪次，將持久化筆記儲存到磁碟。當此維護輪次應使用本機模型而非作用中的對話模型時，請設定 `agents.defaults.compaction.memoryFlush.model`：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

記憶體清除模型覆寫是精確的，並且不繼承作用中工作階段的後援鏈。詳細資訊和設定請參閱 [記憶體](/zh-Hant/concepts/memory)。

## 可插拔壓縮提供者

外掛程式可以透過外掛程式 API 上的 `registerCompactionProvider()` 註冊自訂壓縮提供者。當註冊並設定提供者時，OpenClaw 會將摘要委派給它，而不是使用內建的 LLM 管線。

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

設定 `provider` 會自動強制執行 `mode: "safeguard"`。提供者會收到與內建路徑相同的壓縮指示和識別符保留政策，且 OpenClaw 仍會在提供者輸出後保留最近輪次和分割輪次的後綴上下文。

<Note>如果提供者失敗或傳回空結果，OpenClaw 會回退到內建 LLM 摘要。</Note>

## 壓縮與修剪

|                | 壓縮                   | 修剪                         |
| -------------- | ---------------------- | ---------------------------- |
| **作用**       | 對較舊的對話進行摘要   | 修剪舊的工具結果             |
| **是否儲存？** | 是（在工作階段記錄中） | 否（僅在記憶體中，每次請求） |
| **範圍**       | 整個對話               | 僅限工具結果                 |

[工作階段修剪](/zh-Hant/concepts/session-pruning) 是一個更輕量的補充機制，可在不進行摘要的情況下修剪工具輸出。

## 疑難排解

**壓縮太頻繁？** 模型的上下文視窗可能太小，或是工具輸出可能太大。請嘗試啟用 [工作階段修剪](/zh-Hant/concepts/session-pruning)。

**壓縮後上下文感覺陳舊？** 使用 `/compact Focus on <topic>` 來引導摘要，或啟用 [記憶體排空](/zh-Hant/concepts/memory) 以保留備註。

**需要乾淨的環境？** `/new` 會啟動一個新的工作階段而不進行壓縮。

如需進階設定（保留 token、識別符保留、自訂上下文引擎、OpenAI 伺服器端壓縮），請參閱 [工作階段管理深入探討](/zh-Hant/reference/session-management-compaction)。

## 相關

- [工作階段](/zh-Hant/concepts/session)：工作階段管理與生命週期。
- [工作階段修剪](/zh-Hant/concepts/session-pruning)：修剪工具結果。
- [上下文](/zh-Hant/concepts/context)：如何為代理輪次建構上下文。
- [Hooks](/zh-Hant/automation/hooks)：壓縮生命週期鉤子（`before_compaction`、`after_compaction`）。
