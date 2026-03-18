---
summary: "Synology Chat webhook 設定與 OpenClaw 設定"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat (外掛程式)

狀態：透過外掛程式支援，作為使用 Synology Chat webhook 的直接訊息通道。
此外掛程式接收來自 Synology Chat 連出 webhook 的傳入訊息，並透過 Synology Chat 連入 webhook 傳送回覆。

## 需要外掛程式

Synology Chat 基於外掛程式，並非預設核心通道安裝的一部分。

從本地副本安裝：

```bash
openclaw plugins install ./extensions/synology-chat
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

1. 安裝並啟用 Synology Chat 外掛程式。
   - `openclaw onboard` 現在會在與 `openclaw channels add` 相同的通道設定清單中顯示 Synology Chat。
   - 非互動式設定：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 整合功能中：
   - 建立連入 webhook 並複製其 URL。
   - 使用您的密碼權杖建立連出 webhook。
3. 將連出 webhook URL 指向您的 OpenClaw 閘道：
   - 預設為 `https://gateway-host/webhook/synology`。
   - 或您的自訂 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成設定。
   - 引導式：`openclaw onboard`
   - 直接設定：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重新啟動閘道並發送私訊給 Synology Chat 機器人。

最精簡設定：

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## 環境變數

對於預設帳戶，您可以使用環境變數：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS` (逗號分隔)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

設定值會覆寫環境變數。

## 私訊原則與存取控制

- `dmPolicy: "allowlist"` 是建議的預設值。
- `allowedUserIds` 接受 Synology 使用者 ID 的清單 (或逗號分隔字串)。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 清單會被視為設定錯誤，且 webhook 路由將不會啟動 (請使用 `dmPolicy: "open"` 允許所有存取)。
- `dmPolicy: "open"` 允許任何傳送者。
- `dmPolicy: "disabled"` 會封鎖私訊。
- 配對核准可與以下方式搭配運作：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 外送傳遞

請使用數位化的 Synology Chat 使用者 ID 作為目標。

範例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

媒體傳輸支援透過基於 URL 的檔案傳遞。

## 多重帳號

在 `channels.synology-chat.accounts` 下支援多個 Synology Chat 帳號。
每個帳號都可以覆寫權杖、傳入 URL、webhook 路徑、DM 政策與限制。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## 安全性備註

- 請將 `token` 保密，若外洩請進行輪替。
- 除非您明確信任自我簽署的本地 NAS 憑證，否則請保持 `allowInsecureSsl: false`。
- 傳入 webhook 請求會經過權杖驗證，並針對每位發送者進行速率限制。
- 建議在生產環境中優先使用 `dmPolicy: "allowlist"`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
