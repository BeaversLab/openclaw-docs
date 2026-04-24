---
summary: "Synology Chat webhook 設定與 OpenClaw 設定"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat

狀態：使用 Synology Chat webhook 的隨附外掛程式直接訊息通道。
此外掛程式接受來自 Synology Chat 連出 webhook 的傳入訊息，並透過 Synology Chat 連入 webhook 傳送回覆。

## 隨附外掛程式

Synology Chat 在目前的 OpenClaw 版本中是作為隨附外掛程式發布的，因此一般的套件版本不需要額外安裝。

如果您使用的是較舊的版本或未包含 Synology Chat 的自訂安裝，請手動安裝：

從本機 checkout 安裝：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

1. 確保 Synology Chat 外掛程式可用。
   - 目前的 OpenClaw 套件版本已隨附此外掛程式。
   - 較舊或自訂的安裝版本可以使用上述指令從原始碼 checkout 手動新增。
   - `openclaw onboard` 現在會在與 `openclaw channels add` 相同的通道設定清單中顯示 Synology Chat。
   - 非互動式設定：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 整合中：
   - 建立連入 webhook 並複製其 URL。
   - 使用您的金鑰 token 建立連出 webhook。
3. 將連出 webhook URL 指向您的 OpenClaw 閘道：
   - 預設為 `https://gateway-host/webhook/synology`。
   - 或是您的自訂 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成設定。
   - 引導式：`openclaw onboard`
   - 直接式：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重新啟動閘道並發送私訊 (DM) 給 Synology Chat 機器人。

Webhook 驗證詳細資訊：

- OpenClaw 先接受來自 `body.token` 的連出 webhook token，接著是
  `?token=...`，然後是標頭。
- 接受的標頭形式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空白或缺少 token 將會封鎖請求 (fail closed)。

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
- `SYNOLOGY_ALLOWED_USER_IDS` (逗號分隔)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

設定值會覆寫環境變數。

## 私訊 (DM) 政策與存取控制

- `dmPolicy: "allowlist"` 是建議的預設值。
- `allowedUserIds` 接受 Synology 使用者 ID 列表（或以逗號分隔的字串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表會被視為設定錯誤，webhook 路由將無法啟動（請使用 `dmPolicy: "open"` 來允許所有使用者）。
- `dmPolicy: "open"` 允許任何發送者。
- `dmPolicy: "disabled"` 會封鎖 DM。
- 回覆收件者綁定預設保持在穩定的數字 `user_id` 上。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一種應急相容模式，可重新啟用可變的使用者名稱/暱稱查詢以進行回覆傳遞。
- 配對核准適用於：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站傳遞

使用數字 Synology Chat 使用者 ID 作為目標。

範例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

媒體傳輸支援基於 URL 的檔案傳遞。
傳出檔案 URL 必須使用 `http` 或 `https`，且在 OpenClaw 將 URL 轉發至 NAS webhook 之前，會拒絕私人或其他封鎖的網路目標。

## 多重帳號

在 `channels.synology-chat.accounts` 下支援多個 Synology Chat 帳號。
每個帳號都可以覆寫 token、傳入 URL、webhook 路徑、DM 政策和限制。
直接訊息工作階段是按帳號和用戶隔離的，因此兩個不同 Synology 帳號上相同的數字 `user_id` 不會共享對話狀態。
為每個啟用的帳號指定一個不同的 `webhookPath`。OpenClaw 現在會拒絕重複的確切路徑，並拒絕啟動在多帳號設定中僅繼承共享 webhook 路徑的命名帳號。
如果您有意為命名帳號保留舊版繼承行為，請在該帳號或 `channels.synology-chat` 上設定
`dangerouslyAllowInheritedWebhookPath: true`，但重複的確切路徑仍會被以失效封閉 (fail-closed) 的方式拒絕。建議優先使用明確的個別帳號路徑。

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

## 安全性注意事項

- 請妥善保管 `token`，一旦洩露請立即更換。
- 除非您明確信任本地 NAS 的自簽憑證，否則請保持 `allowInsecureSsl: false` 開啟。
- 傳入 webhook 請求會經過權杖驗證，並按發送者進行速率限制。
- 無效權杖檢查使用恆定時間的秘密比較並封閉式失敗。
- 生產環境建議優先使用 `dmPolicy: "allowlist"`。
- 除非您明確需要基於舊版使用者名稱的回覆傳遞，否則請將 `dangerouslyAllowNameMatching` 保持關閉。
- 除非您明確接受多帳號設定中的共享路徑路由風險，否則請將 `dangerouslyAllowInheritedWebhookPath` 保持關閉。

## 疑難排解

- `Missing required fields (token, user_id, text)`：
  - 傳出 Webhook 的負載中缺少一個必要欄位
  - 如果 Synology 在標頭中發送 Token，請確保閘道/代理伺服器保留了這些標頭
- `Invalid token`：
  - 傳出 webhook 密鑰與 `channels.synology-chat.token` 不符
  - 請求發送到了錯誤的帳戶/Webhook 路徑
  - 反向代理在請求到達 OpenClaw 之前剝離了 Token 標頭
- `Rate limit exceeded`：
  - 來自同一來源的無效 Token 嘗試過多可能會暫時鎖定該來源
  - 已驗證的發送者也有獨立的每位使用者訊息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open.`：
  - `dmPolicy="allowlist"` 已啟用但未設定任何使用者
- `User not authorized`：
  - 發送者的數字 `user_id` 不在 `allowedUserIds` 中

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及控制
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
