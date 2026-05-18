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

每個頻道啟用進度草稿 `streaming.mode: "progress"`：

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
| Label          | 一個簡短的啟動器/狀態行，例如 `Thinking...` 或 `Shelling...`。                        |
| Progress lines | Compact run updates using the same tool icons and detail formatter as verbose output. |

標籤會在代理開始有意義的工作並且保持忙碌五秒鐘或發出第二個工作事件後出現。它是滾動進度行列表的一部分，因此一旦出現足夠的具體工作，啟動狀態就會滾動消失。純文字回覆不會顯示進度草稿。僅當代理發出有用的工作更新時，才會新增進度行，例如 `🛠️ Bash: run tests`、`🔎 Web Search: for "discord edit message"` 或 `✍️ Write: to /tmp/file`。預設情況下，它們使用與 `/verbose` 相同的簡潔說明模式；在調試並且想要附加原始命令/詳細資訊時，請設定 `agents.defaults.toolProgressDetail: "raw"`。最終答案會盡可能替換草稿；否則，OpenClaw 會正常發送最終答案，並根據頻道的傳輸方式清理或停止更新草稿。

## Choose a mode

`channels.<channel>.streaming.mode` 控制可見的進行中行為：

| 模式       | 最適用於                       | 聊天中顯示的內容                 |
| ---------- | ------------------------------ | -------------------------------- |
| `off`      | 安靜的頻道                     | 僅顯示最終答案。                 |
| `partial`  | 觀看答案文字逐一出現           | 一份使用最新答案文字編輯的草稿。 |
| `block`    | 較大的答案預覽區塊             | 一份以較大區塊更新或附加的預覽。 |
| `progress` | 重度使用工具或長時間執行的回合 | 一份狀態草稿，然後是最終答案。   |

當使用者更關心「正在發生什麼」而不是逐字監看答案文字串流時，請選擇 `progress`。

當答案本身就是進度訊號時，請選擇 `partial`。

當您希望以較大的文字區塊更新草稿預覽時，請選擇 `block`。在 Discord 和 Telegram 上，`streaming.mode: "block"` 仍然是預覽串流，而不是正常的區塊傳遞。當您想要正常的區塊回覆時，請使用 `streaming.block.enabled` 或舊版 `blockStreaming`。

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

`"explain"` 是預設值，能透過簡潔的標籤（如 `🛠️ check JS syntax for /tmp/app.js`）保持草稿穩定。`"raw"` 會在可用時附加底層指令/細節，這在除錯時很有用，但在聊天中較為雜亂。

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

OpenClaw 預設會截斷過長的進度行，以免重複的草稿編輯在每次更新時造成不同的換行。預設的每行預算是 120 個字元。散文會在單字邊界處切斷，而路徑或原始指令等長細節則會以中間省略號縮短，以便保留後綴的可見性。

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

Slack 可以將進度行呈現為結構化的 Block Kit 欄位，而非單一文字主體：

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

豐富的呈現方式會保留相同的純文字後援，因此不支援較豐富形狀的頻道和客戶端仍能顯示簡潔的進度文字。

保留單一進度草稿，但隱藏工具和工作行：

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

使用 `toolProgress: false` 時，OpenClaw 仍會針對該輪次隱藏較舊的獨立工具進度訊息。該頻道會保持視覺上的安靜，直到最終答案出現，除非設定有標籤。

## 頻道行為

每個頻道都會使用其支援的最乾淨傳輸方式：

| 頻道            | 進度傳輸                      | 備註                                                   |
| --------------- | ----------------------------- | ------------------------------------------------------ |
| Discord         | 傳送一則訊息，然後編輯它。    | 當最終文字能容納在一則安全的預覽訊息中時，會就地編輯。 |
| Matrix          | 傳送一個事件，然後編輯它。    | 帳戶層級的串流設定會控制帳戶層級的草稿。               |
| Microsoft Teams | 個人聊天中的原生 Teams 串流。 | `streaming.mode: "block"` 對應至 Teams 區塊傳遞。      |
| Slack           | 原生串流或可編輯的草稿貼文。  | 執行緒的可用性會影響是否能使用原生串流。               |
| Telegram        | 傳送一則訊息，然後編輯它。    | 較舊的可見草稿可能會被取代，以便最終時間戳保持有用。   |
| Mattermost      | 可編輯的草稿貼文。            | 工具活動會被折疊至相同的草稿風格貼文中。               |

不支援安全編輯的頻道通常會退回至輸入指示器或僅傳遞最終訊息。

## 最終處理

當最終答案準備就緒時，OpenClaw 會嘗試保持聊天乾淨：

- 如果草稿可以安全地成為最終答案，OpenClaw 會就地編輯它。
- 如果通道使用原生進度串流，當原生傳輸接受最終文字時，OpenClaw 會完成該串流。
- 如果最終答案包含媒體、核准提示、明確的回覆目標、太多區塊，或是編輯/傳送失敗，OpenClaw 會透過
  正常通道傳遞路徑傳送最終答案。

此後備路徑是有意為之的。傳送一個全新的最終答案，比遺失文字、錯誤串接回覆，或用通道無法安全表示的內容覆寫草稿要好。

## 疑難排解

**我只看到最終答案。**

請檢查處理該訊息的帳戶或通道，其 `channels.<channel>.streaming.mode` 是否已設定為 `progress`。某些群組或
引用回覆路徑可能在通道無法安全編輯正確訊息時，停用該輪次的草稿預覽。

**我看到標籤但沒有工具列。**

請檢查 `streaming.progress.toolProgress`。如果為 `false`，OpenClaw 將維持單一草稿行為，
但會隱藏工具和任務進度列。

**我看到的是全新的最終訊息，而不是編輯過的草稿。**

這是一個安全後備機制。發生原因可能包括：媒體回覆、過長的答案、明確的回覆目標、舊版 Telegram 草稿、
缺少 Slack 執行緒目標、預覽訊息已被刪除，或原生串流完成失敗。

**我仍然看到獨立的進度訊息。**

當草稿處於活動狀態時，進度模式會抑制預設的獨立工具進度訊息。如果獨立訊息仍然出現，請驗證該輪次實際上
是否使用進度模式，而非 `streaming.mode: "off"` 或無法為該訊息建立草稿的通道路徑。

**Teams 的行為與 Discord 或 Telegram 不同。**

Microsoft Teams 在個人聊天中使用原生串流，而非通用的傳送後編輯預覽傳輸方式。由於 Teams 沒有
與 Discord 和 Telegram 相同的草稿預覽區塊模式，因此它也將 `streaming.mode: "block"` 視為 Teams
區塊傳遞。

## 相關

- [串流與分塊](/zh-Hant/concepts/streaming)
- [訊息](/zh-Hant/concepts/messages)
- [通道設定](/zh-Hant/gateway/config-channels)
- [Discord](/zh-Hant/channels/discord)
- [Matrix](/zh-Hant/channels/matrix)
- [Microsoft Teams](/zh-Hant/channels/msteams)
- [Slack](/zh-Hant/channels/slack)
- [Telegram](/zh-Hant/channels/telegram)
