---
summary: "LINE Messaging API plugin setup, config, and usage"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE (plugin)

LINE connects to OpenClaw via the LINE Messaging API. The plugin runs as a webhook
receiver on the gateway and uses your channel access token + channel secret for
authentication.

Status: supported via plugin. Direct messages, group chats, media, locations, Flex
messages, template messages, and quick replies are supported. Reactions and threads
are not supported.

## Plugin required

Install the LINE plugin:

```bash
openclaw plugins install @openclaw/line
```

Local checkout (when running from a git repo):

```bash
openclaw plugins install ./extensions/line
```

## Setup

1. Create a LINE Developers account and open the Console:
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. Create (or pick) a Provider and add a **Messaging API** channel.
3. Copy the **Channel access token** and **Channel secret** from the channel settings.
4. Enable **Use webhook** in the Messaging API settings.
5. Set the webhook URL to your gateway endpoint (HTTPS required):

```
https://gateway-host/line/webhook
```

The gateway responds to LINE’s webhook verification (GET) and inbound events (POST).
If you need a custom path, set `channels.line.webhookPath` or
`channels.line.accounts.<id>.webhookPath` and update the URL accordingly.

Security note:

- LINE signature verification is body-dependent (HMAC over the raw body), so OpenClaw applies strict pre-auth body limits and timeout before verification.

## Configure

Minimal config:

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

Env vars (default account only):

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

Token/secret files:

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` and `secretFile` must point to regular files. Symlinks are rejected.

Multiple accounts:

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## Access control

Direct messages default to pairing. Unknown senders get a pairing code and their
messages are ignored until approved.

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Allowlists and policies:

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: allowlisted LINE user IDs for DMs
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: allowlisted LINE user IDs for groups
- Per-group overrides: `channels.line.groups.<groupId>.allowFrom`
- 執行時注意：如果 `channels.line` 完全缺失，執行時會回退到 `groupPolicy="allowlist"` 進行群組檢查（即使已設定 `channels.defaults.groupPolicy`）。

LINE ID 區分大小寫。有效的 ID 如下所示：

- 使用者：`U` + 32 個十六進位字元
- 群組：`C` + 32 個十六進位字元
- 聊天室：`R` + 32 個十六進位字元

## 訊息行為

- 文字會在 5000 個字元處進行分塊。
- Markdown 格式會被移除；程式碼區塊和表格會在可能的情況下轉換為 Flex 卡片。
- 串流回應會進行緩衝；當代理程式運作時，LINE 會接收完整分塊並顯示載入動畫。
- 媒體下載數量受限於 `channels.line.mediaMaxMb`（預設為 10）。

## 頻道資料 (豐富訊息)

使用 `channelData.line` 來發送快速回覆、位置、Flex 卡片或範本訊息。

```json5
{
  text: "Here you go",
  channelData: {
    line: {
      quickReplies: ["Status", "Help"],
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "Status card",
        contents: {
          /* Flex payload */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no",
      },
    },
  },
}
```

LINE 外掛還提供了一個 `/card` 指令，用於 Flex 訊息預設：

```
/card info "Welcome" "Thanks for joining!"
```

## 疑難排解

- **Webhook 驗證失敗：** 確保 webhook URL 是 HTTPS，並且 `channelSecret` 與 LINE 主控台相符。
- **沒有收到事件：** 確認 webhook 路徑符合 `channels.line.webhookPath`，且 LINE 可以存取該閘道。
- **媒體下載錯誤：** 如果媒體超過預設限制，請提高 `channels.line.mediaMaxMb`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
