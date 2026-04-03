---
summary: "QQ Bot 設定、配置與使用"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: QQ Bot
---

# QQ Bot

QQ Bot 透過官方 QQ Bot API (WebSocket 閘道) 連接到 OpenClaw。此外掛程式支援 C2C 私人聊天、群組 @訊息，以及頻道訊息，並包含多媒體（圖片、語音、影片、檔案）。

狀態：內建的頻道外掛程式。支援直接訊息、群組聊天、頻道及多媒體。不支援反應和主題串。

## 隨附於 OpenClaw

目前的 OpenClaw 安裝版本已內建 QQ Bot。對於一般設定，您不需要單獨的
`openclaw plugins install` 步驟。

## 設定

1. 前往 [QQ 開放平台](https://q.qq.com/) 並使用您的
   手機 QQ 掃描 QR code 以註冊 / 登入。
2. 點擊 **建立機器人** 以建立新的 QQ 機器人。
3. 在機器人的設定頁面上找到 **AppID** 和 **AppSecret** 並將其複製。

> AppSecret 不會以純文字儲存 — 如果您離開頁面且未將其儲存，
> 您將必須重新產生一個新的。

4. 新增頻道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重新啟動閘道。

互動式設定路徑：

```bash
openclaw channels add
openclaw configure --section channels
```

## 配置

最小配置：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: "YOUR_APP_SECRET",
    },
  },
}
```

預設帳號環境變數：

- `QQBOT_APP_ID`
- `QQBOT_CLIENT_SECRET`

檔案支援的 AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecretFile: "/path/to/qqbot-secret.txt",
    },
  },
}
```

備註：

- 環境變數後援僅適用於預設的 QQ Bot 帳號。
- `openclaw channels add --channel qqbot --token-file ...` 僅提供
  AppSecret；AppID 必須已於配置或 `QQBOT_APP_ID` 中設定。
- `clientSecret` 也接受 SecretRef 輸入，而不僅是純文字字串。

### 多帳號設定

在單一 OpenClaw 執行個體下執行多個 QQ 機器人：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "111111111",
      clientSecret: "secret-of-bot-1",
      accounts: {
        bot2: {
          enabled: true,
          appId: "222222222",
          clientSecret: "secret-of-bot-2",
        },
      },
    },
  },
}
```

每個帳號都會啟動自己的 WebSocket 連線並維護獨立的
權杖快取（以 `appId` 隔離）。

透過 CLI 新增第二個機器人：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 語音 (STT / TTS)

STT 和 TTS 支援兩級配置，並具備優先順序後援機制：

| 設定 | 外掛程式特定         | 框架後援                      |
| ---- | -------------------- | ----------------------------- |
| STT  | `channels.qqbot.stt` | `tools.media.audio.models[0]` |
| TTS  | `channels.qqbot.tts` | `messages.tts`                |

```json5
{
  channels: {
    qqbot: {
      stt: {
        provider: "your-provider",
        model: "your-stt-model",
      },
      tts: {
        provider: "your-provider",
        model: "your-tts-model",
        voice: "your-voice",
      },
    },
  },
}
```

在其中任一項設定 `enabled: false` 以停用。

出站音訊上傳/轉碼行為也可以透過
`channels.qqbot.audioFormatPolicy` 進行調整：

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## 目標格式

| 格式                       | 描述       |
| -------------------------- | ---------- |
| `qqbot:c2c:OPENID`         | 私聊 (C2C) |
| `qqbot:group:GROUP_OPENID` | 群組聊天   |
| `qqbot:channel:CHANNEL_ID` | 頻道       |

> 每個機器人都有自己的用戶 OpenID 集合。機器人 A 收到的 OpenID **不能**
> 用於通過機器人 B 發送訊息。

## 斜線指令

在 AI 佇列之前攔截的內建指令：

| 指令           | 描述                       |
| -------------- | -------------------------- |
| `/bot-ping`    | 延遲測試                   |
| `/bot-version` | 顯示 OpenClaw 框架版本     |
| `/bot-help`    | 列出所有指令               |
| `/bot-upgrade` | 顯示 QQBot 升級指南連結    |
| `/bot-logs`    | 將最近的網關日誌匯出為檔案 |

在任何指令後附加 `?` 以獲取使用說明 (例如 `/bot-upgrade ?`)。

## 疑難排解

- **Bot 回覆 "gone to Mars"：** 未設定憑證或 Gateway 未啟動。
- **沒有收到傳入訊息：** 驗證 `appId` 和 `clientSecret` 是否正確，且
  機器人已在 QQ 開放平台啟用。
- **使用 `--token-file` 設定仍顯示未配置：** `--token-file` 僅設定
  AppSecret。您仍然需要在設定中填寫 `appId` 或設定 `QQBOT_APP_ID`。
- **主動訊息未送達：** 如果用戶最近沒有互動，QQ 可能會攔截機器人發起的訊息。
- **語音未轉錄：** 確保已設定 STT 且提供者可連線。
