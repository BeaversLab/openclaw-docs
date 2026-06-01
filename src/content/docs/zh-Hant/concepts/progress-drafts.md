---
summary: "Progress drafts: one visible work-in-progress message that updates while an agent runs"
read_when:
  - Configuring visible progress updates for long-running chat turns
  - Choosing between partial, block, and progress streaming modes
  - Explaining how OpenClaw updates one channel message while work is in progress
  - Troubleshooting progress drafts, standalone progress messages, or finalization fallback
title: "Progress drafts"
---

Progress drafts make long-running agent turns feel alive in chat without turning
the conversation into a stack of temporary status replies.

When progress drafts are enabled, OpenClaw creates one visible work-in-progress
message only after the turn proves it is doing real work, updates it while the
agent reads, plans, calls tools, or waits for approval, and then turns that draft
into the final answer when the channel can do that safely.

```text
Shelling...
📖 from docs/concepts/progress-drafts.md
🔎 Web Search: for "discord edit message"
🛠️ Bash: run tests
```

Use progress drafts when you want one tidy status message during tool-heavy work
and the final answer when the turn is done.

## Quick start

透過 `streaming.mode: "progress"` 為每個頻道啟用進度草稿：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
      },
    },
  },
}
```

That is usually enough. OpenClaw will pick an automatic one-word label, wait
until work lasts at least five seconds or emits a second work event, add compact
progress lines while useful work happens, and suppress duplicate standalone
progress chatter for that turn.

## What users see

A progress draft has two parts:

| Part           | Purpose                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| Label          | 簡短的起始器/狀態行，例如 `Working` 或 `Shelling`。                                   |
| Progress lines | Compact run updates using the same tool icons and detail formatter as verbose output. |

在代理開始進行有意義的工作並保持忙碌狀態五秒鐘或發出第二個工作事件後，標籤會隨即出現。它是滾動進度行列表的一部分，因此一旦出現足夠的具體工作，起始狀態就會捲動消失。純文字回覆不會顯示進度草稿。只有在代理發出有用的工作更新時，才會新增進度行，例如 `🛠️ Bash: run tests`、`🔎 Web Search: for "discord edit message"` 或 `✍️ Write: to /tmp/file`。預設情況下，它們使用與 `/verbose` 相同的精簡說明模式；如果在除錯時您想要附加原始命令/詳細資訊，請設定 `agents.defaults.toolProgressDetail: "raw"`。最終答案會在可能的情況下取代草稿；否則，OpenClaw 會正常發送最終答案，並根據頻道的傳輸方式清理或停止更新草稿。

## Choose a mode

`channels.<channel>.streaming.mode` 控制可見的進行中行為：

| 模式       | 最適用於                       | 聊天中顯示的內容                 |
| ---------- | ------------------------------ | -------------------------------- |
| `off`      | 安靜的頻道                     | 僅顯示最終答案。                 |
| `partial`  | 觀看答案文字逐一出現           | 一份使用最新答案文字編輯的草稿。 |
| `block`    | 較大的答案預覽區塊             | 一份以較大區塊更新或附加的預覽。 |
| `progress` | 重度使用工具或長時間執行的回合 | 一份狀態草稿，然後是最終答案。   |

當使用者更關心「正在發生什麼」而不是逐個權位觀看答案文字串流時，請選擇 `progress`。

當答案本身就是進度訊號時，請選擇 `partial`。

當您希望以較大的文字區塊獲得草稿預覽更新時，請選擇 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是預覽串流，而不是正常的區塊傳遞。當您想要正常的區塊回覆時，請使用 `streaming.block.enabled` 或舊版的 `blockStreaming`。

## 設定標籤

進度標籤位於 `channels.<channel>.streaming.progress` 之下。

預設標籤為 `auto`，它會從 OpenClaw 內建的单字標籤池中進行選擇：

```text
Working
Shelling
Scuttling
Clawing
Pinching
Molting
Bubbling
Tiding
Reefing
Cracking
Sifting
Brining
Nautiling
Krilling
Barnacling
Lobstering
Tidepooling
Pearling
Snapping
Surfacing
```

使用固定標籤：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "Investigating",
        },
      },
    },
  },
}
```

使用您自己的自動標籤池：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          labels: ["Checking", "Reading", "Testing", "Finishing"],
        },
      },
    },
  },
}
```

隱藏標籤並僅顯示進度行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: false,
        },
      },
    },
  },
}
```

## 控制進度行

進度行在進度模式下預設為啟用。它們來自真實的執行事件：工具啟動、項目更新、任務計畫、批准、命令輸出、補丁摘要以及類似的代理活動。

當單一工具呼叫仍在執行時，工具也可以發出類型化的進度更新。
這就是緩慢的擷取或搜尋可以在工具傳回最終結果之前更新可見草稿的方式。進度更新是一個部分工具結果，
具有空的模型內容和明確的公開頻道中繼資料：

```json
{
  "content": [],
  "progress": {
    "text": "Fetching page content...",
    "visibility": "channel",
    "privacy": "public",
    "id": "web_fetch:fetching"
  }
}
```

OpenClaw 僅在頻道進度 UI 中呈現 `progress.text`。
正常的工具結果稍後仍會作為 `content` 和 `details` 到達，並且是
唯一傳回給模型的部分。

當將進度加入工具時，請使用簡短、通用的訊息，並將其延遲直到
操作已擱置足夠長的時間以發揮作用：

```typescript
const clearProgressTimer = scheduleToolProgress(onUpdate, { text: "Fetching page content...", id: "web_fetch:fetching" }, 5_000, { signal });

try {
  return await runToolWork();
} finally {
  clearProgressTimer();
}
```

此模式意味著快速呼叫不會顯示進度列，長時間呼叫在仍
擱置時會顯示一條，而已取消的呼叫會在過時
進度出現之前清除計時器。進度文字是一個公開 UI 側頻道，因此不得
包含機密、原始引數、擷取的內容、命令輸出或頁面文字。

OpenClaw 對進度草稿和 `/verbose` 使用相同的格式設定器：

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` 是預設值，使用簡潔的標籤（例如
`🛠️ check JS syntax for /tmp/app.js`）保持草稿穩定。`"raw"` 會在有可用時附加底層
命令/細節，這在除錯時很有用，但在聊天中較為雜亂。

例如，同一個命令會根據細節模式顯示不同的內容：

| 模式      | 進度列                                                         |
| --------- | -------------------------------------------------------------- |
| `explain` | `🛠️ check JS syntax for /tmp/app.js`                           |
| `raw`     | `🛠️ check JS syntax for /tmp/app.js, node --check /tmp/app.js` |

限制保持可見的行數：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 4,
        },
      },
    },
  },
}
```

進度列會自動壓縮，以在編輯草稿時減少聊天氣泡的重新排版。

OpenClaw 預設會截斷長進度列，因此重複的草稿編輯不會
在每次更新時產生不同的換行。預設的每行預算是 120 個字元。
散文會在字詞邊界處切斷，而長細節（例如路徑或原始命令）
則會使用中間省略號縮短，以便後綴保持可見。

調整每行預算：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLineChars: 160,
        },
      },
    },
  },
}
```

Slack 可以將進度列呈現為結構化的 Block Kit 欄位，而不是
單一文字主體：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          render: "rich",
        },
      },
    },
  },
}
```

豐富的呈現方式會保留相同的純文字後援，因此不支援
較豐富形狀的頻道和用戶端仍可以顯示壓縮的進度文字。

保留單一進度草稿，但隱藏工具和任務行：

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: false,
        },
      },
    },
  },
}
```

使用 `toolProgress: false` 時，OpenClaw 仍會針對該輪次抑制較舊的獨立工具進度訊息。除非設定了標籤，否則頻道在直到最終答案出現前會保持視覺上的安靜。

## 頻道行為

每個頻道會使用其支援的最乾淨傳輸方式：

| 頻道            | 進度傳輸                        | 備註                                                       |
| --------------- | ------------------------------- | ---------------------------------------------------------- |
| Discord         | 發送一則訊息，然後編輯它。      | 當最終文字符合一則安全的預覽訊息時，會就地編輯。           |
| Matrix          | 發送一個事件，然後編輯它。      | 帳戶層級的串流配置會控制帳戶層級的草稿。                   |
| Microsoft Teams | 個人聊天中使用原生 Teams 串流。 | `streaming.mode: "block"` 對應至 Teams 區塊傳遞。          |
| Slack           | 原生串流或可編輯的草稿貼文。    | 是否可使用原生串流取決於是否支援執行緒。                   |
| Telegram        | 發送一則訊息，然後編輯它。      | 較舊的可見草稿可能會被替換，以便保留最終時間戳記的實用性。 |
| Mattermost      | 可編輯的草稿貼文。              | 工具活動會折疊至同一則草稿樣式的貼文中。                   |

不支援安全編輯的頻道通常會回退至輸入指示器或僅傳遞最終結果。

## 最終確認

當最終答案準備就緒時，OpenClaw 會嘗試保持聊天乾淨：

- 如果草稿可以安全地成為最終答案，OpenClaw 會就地編輯它。
- 如果頻道使用原生進度串流，OpenClaw 會在原生傳輸接受最終文字時
  完成該串流。
- 如果最終答案包含媒體、核准提示、明確的回覆目標、
  過多區塊，或編輯/發送失敗，OpenClaw 會透過
  正常的頻道傳遞路徑發送最終答案。

此回退路徑是刻意設計的。發送全新的最終答案，比遺失文字、
回覆錯誤執行緒，或用頻道無法安全代表的內容覆蓋草稿來得好。

## 疑難排解

**我只看到最終答案。**

請檢查處理該訊息的帳戶或頻道，其 `channels.<channel>.streaming.mode` 是否設定為 `progress`。當頻道無法安全地編輯正確的訊息時，某些群組或引用回覆路徑可能會針對該輪次停用草稿預覽。

**我看到標籤但沒有工具行。**

請檢查 `streaming.progress.toolProgress`。如果它是 `false`，OpenClaw 將保留單一草稿行為，但會隱藏工具和任務進度行。

**我看到的是一條新的最終訊息，而不是經過編輯的草稿。**

這是一種安全後備機制。這可能發生在媒體回覆、長篇回覆、
明確的回覆目標、舊的 Telegram 草稿、缺少 Slack thread 目標、
已刪除的預覽訊息，或原生串流最終化失敗時。

**我仍然看到獨立的進度訊息。**

當草稿處於活動狀態時，進度模式會抑制預設的獨立工具進度訊息。如果仍然出現獨立訊息，請驗證該輪次實際上是否正在使用進度模式，而不是 `streaming.mode: "off"` 或無法為該訊息建立草稿的通道路徑。

**Teams 的行為與 Discord 或 Telegram 不同。**

Microsoft Teams 在個人聊天中使用原生串流，而不是通用的
傳送並編輯預覽傳輸方式。Teams 還將 `streaming.mode: "block"` 視為
Teams 區塊傳遞，因為它沒有使用 Discord 和 Telegram 所使用的相同草稿預覽區塊模式。

## 相關

- [串流與分塊](/zh-Hant/concepts/streaming)
- [訊息](/zh-Hant/concepts/messages)
- [通道組態](/zh-Hant/gateway/config-channels)
- [Discord](/zh-Hant/channels/discord)
- [Matrix](/zh-Hant/channels/matrix)
- [Microsoft Teams](/zh-Hant/channels/msteams)
- [Slack](/zh-Hant/channels/slack)
- [Telegram](/zh-Hant/channels/telegram)
