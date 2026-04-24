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

狀態：內建外掛。支援私訊、群組聊天、公會頻道和媒體。不支援表情回應和討論串。

## 內建外掛

目前的 OpenClaw 發行版本已包含 QQ Bot，因此一般的封裝版本不需要單獨進行 `openclaw plugins install` 步驟。

## 設定

1. 前往 [QQ 開放平台](https://q.qq.com/) 並使用您的手機 QQ 掃描 QR code 以註冊 / 登入。
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

| 指令           | 描述                                                              |
| -------------- | ----------------------------------------------------------------- |
| `/bot-ping`    | 延遲測試                                                          |
| `/bot-version` | 顯示 OpenClaw 框架版本                                            |
| `/bot-help`    | 列出所有指令                                                      |
| `/bot-upgrade` | 顯示 QQBot 升級指南連結                                           |
| `/bot-logs`    | 將最近的網關日誌匯出為檔案                                        |
| `/bot-approve` | 透過原生流程批准待處理的 QQ Bot 動作（例如確認 C2C 或群組上傳）。 |

在任何指令後附加 `?` 以取得使用說明（例如 `/bot-upgrade ?`）。

## 引擎架構

QQ Bot 作為一個獨立的引擎內建於外掛中：

- 每個帳號擁有一組以 `appId` 為鍵的獨立資源堆疊（WebSocket 連線、API 客戶端、Token 快取、媒體儲存根目錄）。帳號之間從不共用輸入/輸出狀態。
- 多帳號記錄器會將日誌行標記所屬帳號，因此當您在單一閘道下執行多個 Bot 時，診斷資訊仍可保持區分。
- 輸入、輸出和閘道橋接路徑共用 `~/.openclaw/media` 下的一個單一媒體負載根目錄，因此上傳、下載和轉碼快取都會存放在同一個受保護的目錄下，而非分散在各自的子系統樹中。
- 憑證可以作為標準 OpenClaw 憑證快照的一部分進行備份與還原；還原時，引擎會重新附加每個帳號的資源堆疊，而無需重新配對新的 QR code。

## QR code 註冊

除了手動貼上 `AppID:AppSecret` 之外，引擎也支援 QR code 註冊流程以將 QQ Bot 連結至 OpenClaw：

1. 執行 QQ Bot 設定路徑（例如 `openclaw channels add --channel qqbot`）並在提示時選擇 QR code 流程。
2. 使用綁定目標 QQ Bot 的手機應用程式掃描產生的 QR code。
3. 在手機上批准配對。OpenClaw 會將傳回的憑證存入 `credentials/` 中正確的帳號範圍下。

由 Bot 本身產生的批准提示（例如 QQ Bot API 顯示的「允許此動作？」流程）會顯示為原生 OpenClaw 提示，您可以使用 `/bot-approve` 接受，而不需要透過原始 QQ 客戶端回覆。

## 疑難排解

- **Bot 回應「gone to Mars」：** 未設定憑證或尚未啟動 Gateway。
- **沒有收到訊息：** 請驗證 `appId` 和 `clientSecret` 是正確的，且
  Bot 已在 QQ 開放平台上啟用。
- **使用 `--token-file` 設定仍顯示未設定：** `--token-file` 只會設定
  AppSecret。您仍然需要在設定檔中使用 `appId` 或 `QQBOT_APP_ID`。
- **主動訊息未送達：** 如果使用者最近沒有互動，QQ 可能會攔截機器人發起的訊息。
- **語音未轉錄：** 請確保已設定 STT 且提供者連線正常。
