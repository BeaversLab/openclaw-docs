---
summary: "LINE Messaging API 外掛程式設定、配置與使用"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE (外掛程式)

LINE 透過 LINE Messaging API 連線至 OpenClaw。此外掛程式在閘道上作為 webhook
接收器運作，並使用您的頻道存取權杖 + 頻道金鑰進行
驗證。

狀態：透過外掛程式支援。支援直接訊息、群組聊天、媒體、位置、Flex
訊息、範本訊息和快速回覆。不支援反應和討論串。

## 需要外掛程式

安裝 LINE 外掛程式：

```bash
openclaw plugins install @openclaw/line
```

本機簽出 (從 git 儲存庫執行時)：

```bash
openclaw plugins install ./extensions/line
```

## 設定

1. 建立 LINE Developers 帳號並開啟 Console：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 建立 (或選擇) 一個 Provider 並新增 **Messaging API** 頻道。
3. 從頻道設定複製 **Channel access token** 和 **Channel secret**。
4. 在 Messaging API 設定中啟用 **Use webhook**。
5. 將 webhook URL 設定為您的閘道端點 (需要 HTTPS)：

```
https://gateway-host/line/webhook
```

閘道會回應 LINE 的 webhook 驗證 (GET) 和傳入事件 (POST)。
如果您需要自訂路徑，請設定 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 並據此更新 URL。

安全性注意：

- LINE 簽章驗證取決於內文 (對原始內文的 HMAC)，因此 OpenClaw 會在驗證前套用嚴格的預先授權內文限制和逾時設定。

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

`tokenFile` 和 `secretFile` 必須指向一般檔案。符號連結會被拒絕。

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

直接訊息預設為配對模式。未知發送者會收到配對碼，且其
訊息在獲得核准前將被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允許清單與原則：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: 用於直接訊息的允許清單 LINE 使用者 ID
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: 用於群組的允許清單 LINE 使用者 ID
- 各群組覆寫：`channels.line.groups.<groupId>.allowFrom`
- 執行時注意：如果完全缺少 `channels.line`，執行時會退回使用 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

LINE ID 區分大小寫。有效的 ID 看起來像：

- 使用者：`U` + 32 個十六進位字元
- 群組：`C` + 32 個十六進位字元
- 房間：`R` + 32 個十六進位字元

## 訊息行為

- 文字會以 5000 個字元為單位進行分塊。
- Markdown 格式會被移除；程式碼區塊和表格會在可能時轉換為 Flex 卡片。
- 串流回應會被緩衝；當代理程式運作時，LINE 會收到完整區塊並顯示載入動畫。
- 媒體下載數量受限於 `channels.line.mediaMaxMb`（預設為 10）。

## 頻道資料（豐富訊息）

使用 `channelData.line` 來傳送快速回覆、位置、Flex 卡片或範本訊息。

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

LINE 外掛程式也附帶了一個 `/card` 指令，用於 Flex 訊息預設：

```
/card info "Welcome" "Thanks for joining!"
```

## 疑難排解

- **Webhook 驗證失敗：** 請確保 webhook URL 是 HTTPS，且
  `channelSecret` 與 LINE 主控台相符。
- **沒有連入事件：** 請確認 webhook 路徑符合 `channels.line.webhookPath`
  且閘道可被 LINE 存取。
- **媒體下載錯誤：** 如果媒體超過
  預設限制，請提高 `channels.line.mediaMaxMb`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
