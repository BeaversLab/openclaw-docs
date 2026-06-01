---
summary: "QQ 機器人設定、配置與使用"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: QQ 機器人
---

QQ 機器人透過官方 QQ 機器人 API (WebSocket 閘道) 連接至 OpenClaw。
此外掛程式支援 C2C 私人聊天、群組 @訊息，以及包含多媒體（圖片、語音、影片、檔案）的
頻道訊息。

狀態：可下載的外掛。支援私訊、群組聊天、頻道和媒體。不支援反應和主題回覆。

## 安裝

在設定之前安裝 QQ 機器人：

```bash
openclaw plugins install @openclaw/qqbot
```

## 設定

1. 前往 [QQ 開放平台](https://q.qq.com/) 並使用您的
   手機 QQ 掃描 QR code 以註冊 / 登入。
2. 點擊 **建立機器人** 以建立新的 QQ 機器人。
3. 在機器人的設定頁面上尋找 **AppID** 和 **AppSecret** 並複製它們。

> AppSecret 不會以明文儲存 — 如果您離開頁面且未儲存它，
> 您將必須重新產生一個新的。

4. 新增頻道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重新啟動 Gateway。

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

Env SecretRef AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: { source: "env", provider: "default", id: "QQBOT_CLIENT_SECRET" },
    },
  },
}
```

備註：

- 環境變數後援僅適用於預設的 QQ Bot 帳號。
- `openclaw channels add --channel qqbot --token-file ...` 僅提供
  AppSecret；AppID 必須已設定在配置或 `QQBOT_APP_ID` 中。
- `clientSecret` 也接受 SecretRef 輸入，而不僅是純文字字串。
- 舊版 `secretref:/...` 標記字串不是有效的 `clientSecret` 值；
  請使用如上例所示的結構化 SecretRef 物件。

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

每個帳號啟動自己的 WebSocket 連線並維護獨立的
token 快取（由 `appId` 隔離）。

透過 CLI 新增第二個機器人：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 群組聊天

QQ 機器人群組聊天支援使用 QQ 群組 OpenID，而非顯示名稱。將機器人
新增至群組，然後提及它或配置群組無需提及即可執行。

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          historyLimit: 50,
          toolPolicy: "restricted",
        },
        GROUP_OPENID: {
          name: "Release room",
          requireMention: false,
          ignoreOtherMentions: true,
          historyLimit: 20,
          prompt: "Keep replies short and operational.",
        },
      },
    },
  },
}
```

`groups["*"]` 為每個群組設定預設值，而具體的
`groups.GROUP_OPENID` 項目會覆寫單一群組的這些預設值。群組
設定包括：

- `requireMention`：機器人回覆前需要 @提及。預設值：`true`。
- `ignoreOtherMentions`：捨去提及其他人但未提及機器人的訊息。
- `historyLimit`：保留最近的非提及群組訊息作為下一次提及回合的上下文。設定 `0` 以停用。
- `toolPolicy`：`full`、`restricted` 或 `none` 用於群組範圍的工具。
- `name`：在日誌和群組上下文中使用的友善標籤。
- `prompt`：附加至代理上下文的每群組行為提示。

啟用模式為 `mention` 和 `always`。`requireMention: true` 對應至
`mention`；`requireMention: false` 對應至 `always`。若存在會話層級的啟用
覆蓋設定，其優先級高於設定檔。

入站佇列是依據對等節點分組的。群組對等節點擁有較大的佇列容量上限，當佇列滿時，會將人類訊息保持在機器人產生的閒聊之前，並將連續的正常群組訊息合併為一個具屬性的輪次。斜線指令仍然會逐一執行。

### 語音 (STT / TTS)

STT 和 TTS 支援具有優先順序回退機制的兩層設定：

| 設定 | 外掛特定                                                 | 框架回退                      |
| ---- | -------------------------------------------------------- | ----------------------------- |
| STT  | `channels.qqbot.stt`                                     | `tools.media.audio.models[0]` |
| TTS  | `channels.qqbot.tts`, `channels.qqbot.accounts.<id>.tts` | `messages.tts`                |

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
      accounts: {
        "qq-main": {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

在任一項設定 `enabled: false` 即可停用。
帳號層級的 TTS 覆蓋設定使用與 `messages.tts` 相同的結構，並會與通道/全域 TTS 設定進行深度合併。

入站的 QQ 語音附件會以音訊媒體中繼資料的形式暴露給代理程式，同時將原始語音檔案排除在通用 `MediaPaths` 之外。當已設定 TTS 時，`[[audio_as_voice]]` 純文字回覆會合成 TTS 並發送原生的 QQ 語音訊息。

出站音訊上傳/轉碼行為也可以透過
`channels.qqbot.audioFormatPolicy` 進行調整：

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## 目標格式

| 格式                       | 描述           |
| -------------------------- | -------------- |
| `qqbot:c2c:OPENID`         | 私人聊天 (C2C) |
| `qqbot:group:GROUP_OPENID` | 群組聊天       |
| `qqbot:channel:CHANNEL_ID` | 頻道           |

> 每個機器人都有自己的一組使用者 OpenID。由機器人 A 接收到的 OpenID **不能**
> 用於透過機器人 B 發送訊息。

## 斜線指令

在 AI 佇列之前攔截的內建指令：

| 指令           | 描述                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `/bot-ping`    | 延遲測試                                                                    |
| `/bot-version` | 顯示 OpenClaw 框架版本                                                      |
| `/bot-help`    | 列出所有指令                                                                |
| `/bot-me`      | 顯示發送者的 QQ 使用者 ID (openid) 以進行 `allowFrom`/`groupAllowFrom` 設定 |
| `/bot-upgrade` | 顯示 QQBot 升級指南連結                                                     |
| `/bot-logs`    | 將最近的閘道日誌匯出為檔案                                                  |
| `/bot-approve` | 透過原生流程核准待處理的 QQ Bot 動作（例如，確認 C2C 或群組上傳）。         |

在任何指令後附加 `?` 以取得使用說明（例如 `/bot-upgrade ?`）。

管理員指令（`/bot-me`、`/bot-upgrade`、`/bot-logs`、`/bot-clear-storage`、`/bot-streaming`、`/bot-approve`）僅限直接訊息使用，並且傳送者的 openid 必須位於明確的非萬用字元 `allowFrom` 清單中。萬用字元 `allowFrom: ["*"]` 允許聊天但不授予管理員指令存取權。群組訊息會先比對 `groupAllowFrom`，然後回退到 `allowFrom`。在群組中執行管理員指令會傳回提示，而不是靜默丟棄。

當 QQ Bot 執行核准使用預設的同聊天室回退機制時，原生核准按鈕點擊遵循相同的明確非萬用字元指令允許清單。若要在未賦予更廣泛指令存取權限的情況下授予僅核准存取權，請設定
`channels.qqbot.execApprovals.approvers`。

## 引擎架構

QQ Bot 作為外掛內的獨立引擎提供：

- 每個帳戶擁有一個以 `appId` 為鍵值的獨立資源堆疊（WebSocket 連線、API 用戶端、令牌快取、媒體儲存根目錄）。帳戶絕不共用輸入/輸出狀態。
- 多重帳戶記錄器會以擁有帳戶標記記錄行，因此當您在單一閘道下執行多個機器人時，診斷資訊仍可保持區隔。
- 輸入、輸出和閘道橋接路徑共用 `~/.openclaw/media` 下的一個媒體負載根目錄，因此上傳、下載和轉碼快取會位於一個受保護的目錄中，而非每個子系統的樹狀結構。
- 富媒體傳遞透過 C2C 和群組目標的一個 `sendMedia` 路徑進行。超過大型檔案閾值的本機檔案和緩衝區使用 QQ 的區塊上傳端點，而較小的負載則使用一次性媒體 API。
- 認證資料可以作為標準 OpenClaw 認證快照的一部分進行備份和還原；還原時引擎會重新附加每個帳戶的資源堆疊，而無需新的 QR code 配對。

## QR code 入職

除了手動貼上 `AppID:AppSecret` 之外，引擎還支援 QR code 入職流程，用於將 QQ Bot 連結至 OpenClaw：

1. 執行 QQ Bot 設定路徑（例如 `openclaw channels add --channel qqbot`）並在提示時選擇 QR code 流程。
2. 使用與目標 QQ Bot 綁定的手機應用程式掃描生成的 QR code。
3. 在手機上核准配對。OpenClaw 會將傳回的認證資料儲存在正確帳戶範圍下的 `credentials/` 中。

由機器人本身產生的核准提示（例如，QQ Bot API 公開的「允許此操作？」流程）會顯示為原生的 OpenClaw 提示，您可以使用 `/bot-approve` 接受，而不需透過原始 QQ 用戶端回覆。

## 疑難排解

- **Bot replies "gone to Mars":** 尚未配置憑證或尚未啟動 Gateway。
- **No inbound messages:** 請驗證 `appId` 和 `clientSecret` 是否正確，並在 QQ 開放平台上啟用機器人。
- **Repeated self-replies:** OpenClaw 將 QQ 的出站參考索引記錄為由機器人發送，並會忽略當前 `msgIdx` 與該機器人帳號相符的入站事件。這可防止平台回音迴圈，同時仍允許使用者引用或回覆先前的機器人訊息。
- **Setup with `--token-file` still shows unconfigured:** `--token-file` 僅會設定 AppSecret。您仍需在設定檔中提供 `appId` 或使用 `QQBOT_APP_ID`。
- **Proactive messages not arriving:** 如果使用者近期沒有互動，QQ 可能會攔截由機器人主動發送的訊息。
- **Voice not transcribed:** 請確保 STT 已設定且供應商連線正常。

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
