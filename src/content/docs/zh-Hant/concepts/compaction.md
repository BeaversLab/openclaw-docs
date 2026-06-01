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

- `embedded run auto-compaction start` / `complete` 在正常的 Gateway 日誌中。
- `🧹 Auto-compaction complete` 在詳細模式中。
- `/status` 顯示 `🧹 Compactions: <count>`。

<Info>在壓縮之前，OpenClaw 會自動提醒代理將重要筆記儲存到 [memory](/zh-Hant/concepts/memory) 檔案中。這可以防止上下文遺失。</Info>

<AccordionGroup>
  <Accordion title="可識別的溢出特徵">
    OpenClaw 會從這些提供者錯誤模式中偵測內容溢出：

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

當設定了 `agents.defaults.compaction.keepRecentTokens` 時，手動壓縮會遵循該 OpenClaw 切割點，並將最近的尾部保留在重建的上下文中。如果沒有明確的保留預算，手動壓縮將作為硬檢查點，僅從新的摘要繼續。

## 設定

在您的 `openclaw.json` 中的 `agents.defaults.compaction` 下設定壓縮。下面列出了最常見的選項；如需完整參考，請參閱[會話管理深入探討](/zh-Hant/reference/session-management-compaction)。

### 使用不同的模型

預設情況下，壓縮使用代理的主要模型。設定 `agents.defaults.compaction.model` 以將摘要工作委派給更強大或專門的模型。此覆寫接受任何 `provider/model-id` 字串：

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

這也適用於本地模型，例如專門用於摘要的第二個 Ollama 模型：

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

未設定時，壓縮會從目前啟用的會話模型開始。如果摘要因提供者錯誤而失敗且該錯誤符合模型回退條件，OpenClaw 會透過會話現有的模型回退鏈重試該壓縮嘗試。回退選擇是暫時的，不會寫回會話狀態。明確的 `agents.defaults.compaction.model` 覆寫會保持精確，不會繼承會話回退鏈。

### 識別碼保留

壓縮摘要預設會保留不透明識別碼 (`identifierPolicy: "strict"`)。使用 `identifierPolicy: "off"` 覆寫以停用，或使用 `identifierPolicy: "custom"` 加上 `identifierInstructions` 進行自訂指引。

### 作用中文字記錄位元組防護

當設定 `agents.defaults.compaction.maxActiveTranscriptBytes` 時，如果作用中的 JSONL 達到該大小，OpenClaw 會在執行前觸發標準的本機壓縮。這對於長時間執行的階段很有用，因為供應商端的內容管理可能會讓模型內容保持健康，而本機文字記錄卻持續增長。它不會分割原始 JSONL 位元組；它會要求標準壓縮管線建立語意摘要。

<Warning>位元組防護需要 `truncateAfterCompaction: true`。如果沒有文字記錄輪替，作用中檔案將不會縮小，且防護會保持非作用中。</Warning>

### 後續文字記錄

啟用 `agents.defaults.compaction.truncateAfterCompaction` 後，OpenClaw 不會就地重寫現有文字記錄。它會根據壓縮摘要、保留的狀態和未摘要的尾部建立一個新的使用中繼任文字記錄，然後記錄檢查點中繼資料，將分支/還原流程指向該壓縮後的繼任者。
繼任文字記錄也會捨棄在短暫重試視窗內到達的完全重複的長使用者輪次，因此通道重試風暴不會被帶入壓縮後的下一個使用中文字記錄。

OpenClaw 不再為新的壓縮作業撰寫個別的 `.checkpoint.*.jsonl` 副本。現有的舊版檢查點檔案在被參照時仍可使用，並會透過正常的會話清理進行修剪。

### 壓縮通知

預設情況下，壓縮會靜默執行。設定 `notifyUser` 可在壓縮開始和完成時顯示簡短的狀態訊息：

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

### 記憶體清除

在進行壓縮之前，OpenClaw 可以執行一次**無聲記憶體刷新**回合，將持久化筆記儲存到磁碟。當此維護回合應使用本機模型而非目前對話模型時，請設定 `agents.defaults.compaction.memoryFlush.model`：

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

記憶體刷新模型覆寫是精確的，不會繼承目前會話的備援鏈。詳情與設定請參閱 [記憶體](/zh-Hant/concepts/memory)。

## 可插拔壓縮提供者

外掛程式可以透過插件 API 上的 `registerCompactionProvider()` 註冊自訂壓縮提供者。當提供者註冊並設定後，OpenClaw 會將摘要工作委派給它，而不是使用內建的 LLM 管線。

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

<Note>如果提供者失敗或傳回空結果，OpenClaw 將會回退到內建的 LLM 摘要。</Note>

## 壓縮與修剪

|                | 壓縮                   | 修剪                         |
| -------------- | ---------------------- | ---------------------------- |
| **作用**       | 摘要較早的對話         | 修剪舊的工具結果             |
| **是否儲存？** | 是（在工作階段紀錄中） | 否（僅在記憶體中，每次請求） |
| **範圍**       | 整個對話               | 僅限工具結果                 |

[Session pruning](/zh-Hant/concepts/session-pruning) 是一個更輕量的補充機制，它會修剪工具輸出而不進行摘要。

## 疑難排解

**壓縮太頻繁？** 模型的上下文視窗可能太小，或是工具輸出太大。請嘗試啟用 [session pruning](/zh-Hant/concepts/session-pruning)。

**壓縮後上下文感覺過時？** 使用 `/compact Focus on <topic>` 來引導摘要，或啟用 [memory flush](/zh-Hant/concepts/memory) 以便保留筆記。

**需要重新開始？** `/new` 會啟動一個新的對話階段而不進行壓縮。

如需進階設定（保留 token、識別符保留、自訂上下文引擎、OpenAI 伺服器端壓縮），請參閱 [Session management deep dive](/zh-Hant/reference/session-management-compaction)。

## 相關

- [Session](/zh-Hant/concepts/session)：對話階段管理與生命週期。
- [Session pruning](/zh-Hant/concepts/session-pruning)：修剪工具結果。
- [Context](/zh-Hant/concepts/context)：如何為代理人的輪次建構上下文。
- [Hooks](/zh-Hant/automation/hooks)：壓縮生命週期掛鉤 (`before_compaction`, `after_compaction`)。
