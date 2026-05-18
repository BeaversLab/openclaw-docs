---
summary: "LINE Messaging API 外掛程式設定、配置及使用"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

LINE 透過 LINE Messaging API 連接到 OpenClaw。該外掛程式在閘道上作為 webhook
接收器運行，並使用您的頻道存取權杖和頻道金鑰進行
驗證。

狀態：可下載的外掛程式。支援直接訊息、群組聊天、媒體、位置、Flex 訊息、範本訊息和快速回覆。不支援反應和主題串。

## 安裝

在設定通道之前先安裝 LINE：

```bash
openclaw plugins install @openclaw/line
```

本機簽出（從 git 儲存庫執行時）：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## 設定

1. 建立 LINE Developers 帳戶並開啟主控台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 建立（或選擇）一個 Provider 並新增一個 **Messaging API** 通道。
3. 從通道設定中複製 **Channel access token** 和 **Channel secret**。
4. 在 Messaging API 設定中啟用 **Use webhook**。
5. 將 webhook URL 設定為您的閘道端點（需要 HTTPS）：

```
https://gateway-host/line/webhook
```

閘道會回應 LINE 的 webhook 驗證 (GET)，並在簽章與載驗證後立即確認簽署的連入事件 (POST)；Agent 處理則會非同步繼續。
如果您需要自訂路徑，請設定 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 並相應更新 URL。

安全性說明：

- LINE 簽章驗證取決於內容（對原始內容進行 HMAC），因此 OpenClaw 會在驗證之前套用嚴格的預先驗證內容限制和逾時。
- OpenClaw 會處理來自已驗證原始請求位元組的 webhook 事件。為了簽章完整性安全，將忽略上游中介軟體轉換的 `req.body` 值。

## 配置

基本配置：

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

公開 DM 配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "open",
      allowFrom: ["*"],
    },
  },
}
```

環境變數（僅限預設帳戶）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

權杖/金鑰檔案：

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

直接訊息預設為配對模式。未知的發送者會收到配對碼，其
訊息將在獲得核准前被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

許可清單與原則：

- `channels.line.dmPolicy`： `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`：DM 的允許清單 LINE 使用者 ID；`dmPolicy: "open"` 需要 `["*"]`
- `channels.line.groupPolicy`： `allowlist | open | disabled`
- `channels.line.groupAllowFrom`：群組的允許清單 LINE 使用者 ID
- 各群組覆寫： `channels.line.groups.<groupId>.allowFrom`
- 靜態傳送者存取群組可以透過 `accessGroup:<name>` 從 `allowFrom`、`groupAllowFrom` 和各群組的 `allowFrom` 參考。
- 執行時注意：如果完全缺少 `channels.line`，執行時將回退到 `groupPolicy="allowlist"` 進行群組檢查（即使已設定 `channels.defaults.groupPolicy`）。

LINE ID 區分大小寫。有效的 ID 如下所示：

- 使用者：`U` + 32 個十六進位字元
- 群組：`C` + 32 個十六進位字元
- 房間：`R` + 32 個十六進位字元

## 訊息行為

- 文字以 5000 個字元為單位進行分塊。
- Markdown 格式會被移除；程式碼區塊和表格會盡可能轉換為 Flex 卡片。
- 串流回應會被緩衝；LINE 會在代理運作時收到帶有載入動畫的完整分塊。
- 媒體下載數量受 `channels.line.mediaMaxMb` 限制（預設為 10）。
- 傳入媒體在傳遞給代理之前會儲存在 `~/.openclaw/media/inbound/` 下，這與其他內建頻道外掛程式使用的共用媒體儲存一致。

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

LINE 外掛程式還提供了一個用於 Flex 訊息預設集的 `/card` 指令：

```
/card info "Welcome" "Thanks for joining!"
```

## ACP 支援

LINE 支援 ACP（Agent Communication Protocol）對話綁定：

- `/acp spawn <agent> --bind here` 將目前的 LINE 聊天綁定到 ACP 工作階段，而不建立子執行緒。
- 已設定的 ACP 綁定和主動的對話綁定 ACP 工作階段在 LINE 上的運作方式與其他對話頻道相同。

詳情請參閱 [ACP 代理程式](/zh-Hant/tools/acp-agents)。

## 傳出媒體

LINE 外掛程式支援透過代理程式訊息工具傳送圖片、影片和音訊檔案。媒體會透過 LINE 專用的傳遞路徑發送，並伴隨適當的預覽和追蹤處理：

- **圖片**：作為 LINE 圖片訊息發送，並自動產生預覽。
- **影片**：包含明確的預覽和內容類型處理。
- **音訊**：作為 LINE 音訊訊息發送。

傳出媒體 URL 必須是公開的 HTTPS URL。OpenClaw 會在將 URL 傳遞給 LINE 之前驗證目標主機名稱，並會拒絕回環、連結本機和私人網路目標。

當無法使用 LINE 專用路徑時，一般媒體傳送會回退到現有的僅限圖片路徑。

## 疑難排解

- **Webhook 驗證失敗：** 請確保 Webhook URL 為 HTTPS，且
  `channelSecret` 與 LINE 主控台相符。
- **沒有傳入事件：** 請確認 Webhook 路徑符合 `channels.line.webhookPath`，
  且閘道可從 LINE 存取。
- **媒體下載錯誤：** 如果媒體超過
  預設限制，請提高 `channels.line.mediaMaxMb`。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及控制
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化措施
