---
summary: "LINE Messaging API 外掛程式設定、配置與使用"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE (外掛程式)

LINE 透過 LINE Messaging API 連線至 OpenClaw。此外掛程式會在閘道上作為 webhook
接收器運行，並使用您的頻道存取權杖 (channel access token) 與頻道金鑰 (channel secret) 進行
驗證。

狀態：透過外掛程式支援。支援直接訊息、群組聊天、媒體、位置、Flex
訊息、範本訊息與快速回覆。不支援回應與討論串。

## 所需外掛程式

安裝 LINE 外掛程式：

```bash
openclaw plugins install @openclaw/line
```

本機簽出 (當從 git repo 執行時)：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## 設定

1. 建立 LINE Developers 帳號並開啟控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 建立 (或選擇) 一個 Provider 並新增一個 **Messaging API** 頻道。
3. 從頻道設定中複製 **Channel access token** (頻道存取權杖) 與 **Channel secret** (頻道金鑰)。
4. 在 Messaging API 設定中啟用 **Use webhook** (使用 webhook)。
5. 將 webhook URL 設定為您的閘道端點 (需要 HTTPS)：

```
https://gateway-host/line/webhook
```

閘道會回應 LINE 的 webhook 驗證 (GET) 與傳入事件 (POST)。
如果您需要自訂路徑，請設定 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 並相應更新 URL。

安全性備註：

- LINE 簽章驗證取決於內容 (對原始內容進行 HMAC 運算)，因此 OpenClaw 在驗證前會套用嚴格的預先授權內容限制與逾時設定。
- OpenClaw 會處理來自已驗證原始請求位元組的 webhook 事件。為確保簽章完整性，上游中介軟體轉換後的 `req.body` 值將被忽略。

## 配置

最簡配置：

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

環境變數 (僅限預設帳號)：

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

`tokenFile` 和 `secretFile` 必須指向一般檔案。符號連結 將被拒絕。

多重帳號：

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

直接訊息預設為配對模式。未知的發送者會收到配對碼，且其
訊息在獲得核準前將被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允許清單與政策：

- `channels.line.dmPolicy`： `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`：用於直接訊息的允許清單 LINE 使用者 ID
- `channels.line.groupPolicy`： `allowlist | open | disabled`
- `channels.line.groupAllowFrom`：用於群組的允許清單 LINE 使用者 ID
- 各群組覆寫：`channels.line.groups.<groupId>.allowFrom`
- 執行時備註：如果完全缺少 `channels.line`，執行時會在群組檢查時回退到 `groupPolicy="allowlist"`（即使設定了 `channels.defaults.groupPolicy`）。

LINE ID 有區分大小寫。有效的 ID 看起來像：

- 使用者：`U` + 32 個十六進位字元
- 群組：`C` + 32 個十六進位字元
- 房間：`R` + 32 個十六進位字元

## 訊息行為

- 文字會以 5000 個字元為單位進行分塊。
- Markdown 格式會被移除；程式碼區塊和表格會盡可能轉換為 Flex 卡片。
- 串流回應會被緩衝；當代理程式運作時，LINE 會收到帶有載入動畫的完整分塊。
- 媒體下載數量受到 `channels.line.mediaMaxMb` 的限制（預設為 10）。

## 頻道資料（訊息豐富化）

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

LINE 外掛還附帶了一個 `/card` 指令，用於 Flex 訊息預設：

```
/card info "Welcome" "Thanks for joining!"
```

## ACP 支援

LINE 支援 ACP（Agent Communication Protocol）對話綁定：

- `/acp spawn <agent> --bind here` 將目前的 LINE 聊天綁定至 ACP 工作階段，而不建立子執行緒。
- 已設定的 ACP 綁定和作用中的對話綁定 ACP 工作階段在 LINE 上的運作方式與其他對話管道相同。

詳情請參閱 [ACP agents](/en/tools/acp-agents)。

## 傳出媒體

LINE 插件支援透過代理程式訊息工具傳送圖片、影片和音訊檔案。媒體會透過 LINE 專用的傳送路徑進行傳送，並包含適當的預覽和追蹤處理：

- **圖片**：作為 LINE 圖片訊息發送，並自動產生預覽。
- **影片**：附帶明確的預覽圖和內容類型處理方式發送。
- **音訊**：作為 LINE 音訊訊息發送。

當無法使用 LINE 專屬路徑時，一般媒體傳送會回退到現有的僅圖片路徑。

## 疑難排解

- **Webhook 驗證失敗：** 請確保 webhook URL 是 HTTPS，且 `channelSecret` 與 LINE 主控台一致。
- **No inbound events:** confirm the webhook path matches `channels.line.webhookPath`
  and that the gateway is reachable from LINE.
- **媒體下載錯誤：** 如果媒體超過預設限制，則引發 `channels.line.mediaMaxMb`。

## 相關

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及限制
- [通道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化防護
