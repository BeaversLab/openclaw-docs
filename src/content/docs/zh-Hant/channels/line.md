---
summary: "LINE Messaging API 外掛程式設定、配置與使用"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE

LINE 透過 LINE Messaging API 連線至 OpenClaw。此外掛程式會在閘道上作為 webhook
接收器運行，並使用您的頻道存取權杖 (channel access token) 與頻道金鑰 (channel secret) 進行
驗證。

狀態：內建外掛。支援直接訊息、群組聊天、媒體、位置、Flex 訊息、範本訊息和快速回覆。不支援回應和主題串。

## 內建外掛

在目前的 OpenClaw 版本中，LINE 作為內建外掛隨附，因此一般的打包版本不需要額外安裝。

如果您使用的是較舊的版本或是不包含 LINE 的自訂安裝，請手動安裝：

```bash
openclaw plugins install @openclaw/line
```

本地結帳（當從 git 儲存庫執行時）：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## 設定

1. 建立 LINE Developers 帳戶並開啟控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 建立（或選擇）一個 Provider 並新增一個 **Messaging API** 頻道。
3. 從頻道設定中複製 **Channel access token** 和 **Channel secret**。
4. 在 Messaging API 設定中啟用 **Use webhook**。
5. 將 webhook URL 設定為您的閘道端點（需要 HTTPS）：

```
https://gateway-host/line/webhook
```

閘道會回應 LINE 的 webhook 驗證 (GET) 和傳入事件 (POST)。
如果您需要自訂路徑，請設定 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 並相應地更新 URL。

安全性說明：

- LINE 簽章驗證取決於內文（針對原始內文的 HMAC），因此 OpenClaw 會在驗證之前套用嚴格的預先授權內文限制和逾時。
- OpenClaw 會處理來自已驗證原始請求位元組的 webhook 事件。為了簽章完整性安全性，將忽略上游中介軟體轉換後的 `req.body` 值。

## 設定

最簡設定：

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

環境變數（僅限預設帳戶）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

Token/secret 檔案：

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

`tokenFile` 和 `secretFile` 必須指向一般檔案。符號連結會被拒絕。

多個帳戶：

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

## 存取控制

直接訊息預設為配對模式。未知發送者會收到配對碼，且其訊息在獲批准前將被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允許清單與原則：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: 直接訊息的允許清單 LINE 使用者 ID
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: 群組的允許清單 LINE 使用者 ID
- 各群組覆寫：`channels.line.groups.<groupId>.allowFrom`
- 執行時注意：如果 `channels.line` 完全缺失，執行時會回退到 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

LINE ID 區分大小寫。有效的 ID 如下所示：

- 使用者：`U` + 32 個十六進位字元
- 群組：`C` + 32 個十六進位字元
- 房間：`R` + 32 個十六進位字元

## 訊息行為

- 文字以 5000 個字元為單位進行分塊。
- Markdown 格式會被移除；程式碼區塊和表格會盡可能轉換為 Flex 卡片。
- 串流回應會被緩衝；LINE 會在代理運作時收到帶有載入動畫的完整分塊。
- 媒體下載受限於 `channels.line.mediaMaxMb`（預設為 10）。

## 頻道資料（訊息）

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

LINE 外掛也提供了一個 `/card` 指令用於 Flex 訊息範本：

```
/card info "Welcome" "Thanks for joining!"
```

## ACP 支援

LINE 支援 ACP（Agent Communication Protocol）對話綁定：

- `/acp spawn <agent> --bind here` 將目前的 LINE 對話綁定到 ACP 會話，而不建立子執行緒。
- 已設定的 ACP 綁定和作用中的對話綁定 ACP 會話在 LINE 上的運作方式與其他對話頻道相同。

詳情請參閱 [ACP agents](/zh-Hant/tools/acp-agents)。

## 外發媒體

LINE 外掛支援透過代理訊息工具傳送圖片、影片和音訊檔案。媒體會透過 LINE 專用的傳遞路徑發送，並伴隨適當的預覽和追蹤處理：

- **圖片**：作為 LINE 圖片訊息發送，並自動產生預覽。
- **影片**：發送時會包含明確的預覽和內容類型處理。
- **音訊**：作為 LINE 音訊訊息發送。

Outbound media URLs must be public HTTPS URLs. OpenClaw validates the target hostname before handing the URL to LINE and rejects loopback, link-local, and private-network targets.

Generic media sends fall back to the existing image-only route when a LINE-specific path is not available.

## 疑難排解

- **Webhook verification fails:** ensure the webhook URL is HTTPS and the
  `channelSecret` matches the LINE console.
- **No inbound events:** confirm the webhook path matches `channels.line.webhookPath`
  and that the gateway is reachable from LINE.
- **Media download errors:** raise `channels.line.mediaMaxMb` if media exceeds the
  default limit.

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及限制
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化措施
