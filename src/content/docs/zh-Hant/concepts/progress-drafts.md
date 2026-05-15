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

Enable progress drafts per channel with `streaming.mode: "progress"`:

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
| Label          | A short starter/status line such as `Thinking...` or `Shelling...`.                   |
| Progress lines | Compact run updates using the same tool icons and detail formatter as verbose output. |

The label appears after the agent starts meaningful work and either remains busy
for five seconds or emits a second work event. It is part of the rolling progress
line list, so the starter status scrolls away once enough concrete work appears.
Plain text-only replies do not show a progress draft. Progress lines are added
only when the agent emits useful work updates, for example `🛠️ Bash: run tests`,
`🔎 Web Search: for "discord edit message"`, or `✍️ Write: to /tmp/file`.
By default they use the same compact explain mode as `/verbose`; set
`agents.defaults.toolProgressDetail: "raw"` when debugging and you also want raw
commands/details appended.
The final answer replaces the draft when possible; otherwise
OpenClaw sends the final answer normally and cleans up or stops updating the
draft according to the channel's transport.

## Choose a mode

`channels.<channel>.streaming.mode` 控制可見的進行中行為：

| 模式       | 最適用於                       | 聊天中顯示的內容                 |
| ---------- | ------------------------------ | -------------------------------- |
| `off`      | 安靜的頻道                     | 僅顯示最終答案。                 |
| `partial`  | 觀看答案文字逐一出現           | 一份使用最新答案文字編輯的草稿。 |
| `block`    | 較大的答案預覽區塊             | 一份以較大區塊更新或附加的預覽。 |
| `progress` | 重度使用工具或長時間執行的回合 | 一份狀態草稿，然後是最終答案。   |

當使用者更關心「正在發生什麼」而不是看著答案文字逐字串流時，請選擇 `progress`。

當答案本身就是進度信號時，請選擇 `partial`。

當您希望以較大的文字區塊更新草稿預覽時，請選擇 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是預覽串流，而不是一般的區塊傳遞。當您想要一般的區塊回覆時，請使用 `streaming.block.enabled` 或舊版 `blockStreaming`。

## 設定標籤

進度標籤位於 `channels.<channel>.streaming.progress` 之下。

預設標籤是 `auto`，它會從 OpenClaw 內建的單字加省略號標籤池中選擇：

```text
Thinking...
Shelling...
Scuttling...
Clawing...
Pinching...
Molting...
Bubbling...
Tiding...
Reefing...
Cracking...
Sifting...
Brining...
Nautiling...
Krilling...
Barnacling...
Lobstering...
Tidepooling...
Pearling...
Snapping...
Surfacing...
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

OpenClaw 對進度草稿和 `/verbose` 使用相同的格式器：

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` 是預設值，它透過簡潔的標籤（如 `🛠️ check JS syntax for /tmp/app.js`）保持草稿穩定。`"raw"` 會在可用時附加底層命令/細節，這在除錯時很有用，但在聊天中會比較吵雜。

例如，相同的命令會根據細節模式而有不同的呈現方式：

| 模式      | 進度行                                                         |
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

進度行會自動壓縮，以減少編輯草稿時聊天氣泡的重排。

預設情況下，OpenClaw 會截斷過長的進度行，以避免重複的草稿編輯在每次更新時產生不同的換行。前綴部分保持可讀，而路徑或原始命令等長細節則會以省略號縮短。

Slack 可以將進度行呈現為結構化的 Block Kit 欄位，而不是單一的文字主體：

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

豐富的呈現方式保留了相同的純文字後備，因此不支援較豐富形狀的頻道和客戶端仍然可以顯示精簡的進度文字。

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

使用 `toolProgress: false` 時，OpenClaw 仍會針對該輪次抑制較舊的獨立工具進度訊息。除非設定了標籤，否則頻道在顯示上會保持安靜，直到最終答案出現為止。

## 頻道行為

每個頻道都會使用其支援的最乾淨的傳輸方式：

| 頻道            | 進度傳輸                          | 備註                                                 |
| --------------- | --------------------------------- | ---------------------------------------------------- |
| Discord         | 發送一則訊息，然後編輯它。        | 當最終文字符合單一安全預覽訊息時，會就地編輯。       |
| Matrix          | 發送一個事件，然後編輯它。        | 帳號層級的串流設定控制帳號層級的草稿。               |
| Microsoft Teams | 在個人聊天中使用原生 Teams 串流。 | `streaming.mode: "block"` 對應至 Teams 區塊傳遞。    |
| Slack           | 原生串流或可編輯的草稿貼文。      | 執行緒的可用性會影響是否可以使用原生串流。           |
| Telegram        | 發送一則訊息，然後編輯它。        | 較舊的可見草稿可能會被取代，以便最終時間戳保持實用。 |
| Mattermost      | 可編輯的草稿貼文。                | 工具活動會被折疊進同一個草稿樣式的貼文中。           |

不支援安全編輯的頻道通常會後備至輸入指示器或僅傳遞最終答案。

## 最終確定

當最終答案準備好時，OpenClaw 會嘗試保持聊天整潔：

- 如果草稿可以安全地成為最終答案，OpenClaw 會就地編輯它。
- 如果頻道使用原生進度串流，OpenClaw 會在原生傳輸接受最終文字時結束該串流。
- 如果最終答案包含媒體、核准提示、明確的回覆目標、過多區塊，或編輯/發送失敗，OpenClaw 會透過正常的頻道傳遞路徑發送最終答案。

此備援路徑是刻意的。發送一則全新的最終答案，勝於遺失文字、錯置回覆串列，或以頻道無法安全表示的內容覆寫草稿。

## 疑難排解

**我只看到最終答案。**

請檢查處理該訊息的帳戶或頻道，其 `channels.<channel>.streaming.mode` 是否設定為 `progress`。當頻道無法安全編輯正確的訊息時，部分群組或引用回覆路徑可能會停用該輪次的草稿預覽。

**我看到標籤但沒有工具列。**

請檢查 `streaming.progress.toolProgress`。如果為 `false`，OpenClaw 將維持單一草稿行為，但會隱藏工具與任務進度列。

**我看到的是全新的最終訊息，而非編輯後的草稿。**

這是一項安全備援措施。此情況可能發生於媒體回覆、長篇回答、明確指定的回覆目標、舊的 Telegram 草稿、遺失的 Slack 串列目標、已刪除的預覽訊息，或原生串流最終化失敗時。

**我仍然看到獨立的進度訊息。**

當草稿啟用時，進度模式會抑制預設的獨立工具進度訊息。如果獨立訊息仍然出現，請驗證該輪次實際上是否使用進度模式，而非 `streaming.mode: "off"` 或無法為該訊息建立草稿的頻道路徑。

**Teams 的行為與 Discord 或 Telegram 不同。**

Microsoft Teams 在個人聊天中使用原生串流，而非通用的傳送並編輯預覽傳輸機制。此外，Teams 將 `streaming.mode: "block"` 視為 Teams 區塊遞送，因為它沒有 Discord 和 Telegram 所使用的相同草稿預覽區塊模式。

## 相關

- [串流與分塊](/zh-Hant/concepts/streaming)
- [訊息](/zh-Hant/concepts/messages)
- [頻道設定](/zh-Hant/gateway/config-channels)
- [Discord](/zh-Hant/channels/discord)
- [Matrix](/zh-Hant/channels/matrix)
- [Microsoft Teams](/zh-Hant/channels/msteams)
- [Slack](/zh-Hant/channels/slack)
- [Telegram](/zh-Hant/channels/telegram)
