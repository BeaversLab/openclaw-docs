---
summary: "Synology Chat webhook 設定與 OpenClaw 設定"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat (外掛)

狀態：透過外掛支援作為使用 Synology Chat webhooks 的直接訊息 (DM) 頻道。
此外掛接收來自 Synology Chat outgoing webhooks 的訊息，並透過 Synology Chat incoming webhook 發送回覆。

## 需要安裝外掛

Synology Chat 是基於外掛的，並非預設核心頻道安裝的一部分。

從本地副本安裝：

```bash
openclaw plugins install ./extensions/synology-chat
```

詳細資訊：[外掛](/en/tools/plugin)

## 快速設定

1. 安裝並啟用 Synology Chat 外掛。
   - `openclaw onboard` 現在會在與 `openclaw channels add` 相同的頻道設定清單中顯示 Synology Chat。
   - 非互動式設定：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 整合中：
   - 建立一個 incoming webhook 並複製其 URL。
   - 使用您的 secret token 建立一個 outgoing webhook。
3. 將 outgoing webhook URL 指向您的 OpenClaw gateway：
   - 預設為 `https://gateway-host/webhook/synology`。
   - 或是您的自訂 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成設定。
   - 引導式：`openclaw onboard`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重新啟動 gateway 並傳送一則 DM 給 Synology Chat bot。

最小設定：

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
- `SYNOLOGY_ALLOWED_USER_IDS` (以逗號分隔)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

設定值會覆蓋環境變數。

## DM 政策與存取控制

- 建議的預設值為 `dmPolicy: "allowlist"`。
- `allowedUserIds` 接受 Synology 使用者 ID 的清單 (或以逗號分隔的字串)。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 清單會被視為設定錯誤，webhook 路由將不會啟動 (請使用 `dmPolicy: "open"` 來允許所有)。
- `dmPolicy: "open"` 允許任何發送者。
- `dmPolicy: "disabled"` 封鎖 DM。
- 回覆收件者綁定預設保持在穩定的數值 `user_id` 上。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一種應急兼容模式，用於重新啟用可變的使用者名稱/暱稱查詢以進行回覆傳遞。
- 配對審核適用於：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站傳遞

使用數值的 Synology Chat 使用者 ID 作為目標。

範例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

透過基於 URL 的檔案傳遞支援媒體發送。

## 多重帳號

在 `channels.synology-chat.accounts` 下支援多個 Synology Chat 帳號。
每個帳號都可以覆寫 token、傳入 URL、webhook 路徑、DM 政策和限制。
直接訊息階段會按帳號和使用者隔離，因此兩個不同 Synology 帳號上相同的數值 `user_id`
不會共享對話紀錄狀態。
請為每個啟用的帳號指定一個不同的 `webhookPath`。OpenClaw 現在會拒絕重複的完全相同路徑，
並拒絕啟動在多重帳號設置中僅繼承共用 webhook 路徑的已命名帳號。
如果您確實需要為已命名帳號保留舊版繼承功能，請在該帳號或 `channels.synology-chat` 上
設定 `dangerouslyAllowInheritedWebhookPath: true`，但重複的完全相同路徑仍會被拒絕（故障安全）。建議優先使用明確的個別帳號路徑。

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

- 請妥善保管 `token`，若發生洩漏請立即輪換。
- 除非您明確信任自簽名的本機 NAS 憑證，否則請保持 `allowInsecureSsl: false`。
- 傳入 webhook 請求會經過 token 驗證，並按發送者進行速率限制。
- 正式環境建議使用 `dmPolicy: "allowlist"`。
- 除非您明確需要基於舊版使用者名稱的回覆傳遞，否則請保持 `dangerouslyAllowNameMatching` 為關閉。
- 除非您明確接受在多重帳號設置中共用路徑路由的風險，否則請保持 `dangerouslyAllowInheritedWebhookPath` 為關閉。
