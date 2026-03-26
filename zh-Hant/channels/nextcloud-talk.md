---
summary: "Nextcloud Talk 支援狀態、功能和配置"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

# Nextcloud Talk（外掛程式）

狀態：透過外掛程式支援。支援私人訊息、聊天室、反應和 Markdown 訊息。

## 需要外掛程式

Nextcloud Talk 以外掛程式形式發行，未包含在核心安裝中。

透過 CLI 安裝（npm 註冊表）：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本機簽出（從 git 儲存庫執行時）：

```bash
openclaw plugins install ./extensions/nextcloud-talk
```

如果您在設定期間選擇 Nextcloud Talk 且偵測到 git 簽出，
OpenClaw 將自動提供本機安裝路徑。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定（初學者）

1. 安裝 Nextcloud Talk 外掛程式。
2. 在您的 Nextcloud 伺服器上，建立一個 bot：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目標聊天室設定中啟用 bot。
4. 設定 OpenClaw：
   - 設定：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或是環境變數：`NEXTCLOUD_TALK_BOT_SECRET` (僅限預設帳戶)
5. 重新啟動 gateway (或完成設定)。

最精簡設定：

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing",
    },
  },
}
```

## 注意事項

- Bot 無法主動發起私人訊息。使用者必須先傳訊息給 Bot。
- Gateway 必須能連線到 Webhook URL；如果位於 Proxy 後方，請設定 `webhookPublicUrl`。
- Bot API 不支援媒體上傳；媒體將以 URL 形式傳送。
- Webhook payload 無法區分私人訊息與聊天室；請設定 `apiUser` + `apiPassword` 以啟用聊天室類型查詢 (否則私人訊息將被視為聊天室)。

## 存取控制 (DMs)

- 預設值：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知發送者將會收到配對碼。
- 透過以下方式批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公開 DMs：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 僅符合 Nextcloud 使用者 ID；顯示名稱將被忽略。

## 聊天室（群組）

- 預設值：`channels.nextcloud-talk.groupPolicy = "allowlist"` (mention-gated)。
- 使用 `channels.nextcloud-talk.rooms` 將聊天室加入允許清單：

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true },
      },
    },
  },
}
```

- 若要不允許任何聊天室，請將允許清單保持空白或設定 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 狀態     |
| -------- | -------- |
| 私訊     | 支援     |
| 聊天室   | 支援     |
| 討論串   | 不支援   |
| 媒體     | 僅限 URL |
| 回應     | 支援     |
| 原生指令 | 不支援   |

## 設定參考 (Nextcloud Talk)

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.nextcloud-talk.enabled`：啟用/停用頻道啟動。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 執行個體 URL。
- `channels.nextcloud-talk.botSecret`：bot 共用金鑰。
- `channels.nextcloud-talk.botSecretFile`: 常規檔案金鑰路徑。符號連結會被拒絕。
- `channels.nextcloud-talk.apiUser`: 用於查詢聊天室的 API 使用者（用於偵測私訊）。
- `channels.nextcloud-talk.apiPassword`: 用於查詢聊天室的 API/應用程式密碼。
- `channels.nextcloud-talk.apiPasswordFile`: API 密碼檔案路徑。
- `channels.nextcloud-talk.webhookPort`: webhook 監聽連接埠（預設：8788）。
- `channels.nextcloud-talk.webhookHost`: webhook 主機（預設：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`: webhook 路徑（預設：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`: 可從外部存取的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`: 私訊允許清單（使用者 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群組允許清單（使用者 ID）。
- `channels.nextcloud-talk.rooms`：各房間設定與允許清單。
- `channels.nextcloud-talk.historyLimit`：群組歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dmHistoryLimit`：DM 歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dms`：各 DM 覆蓋設定（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`：傳出文字區塊大小（字元數）。
- `channels.nextcloud-talk.chunkMode`：`length`（預設）或 `newline` 以在依長度切割前根據空行（段落邊界）進行分割。
- `channels.nextcloud-talk.blockStreaming`：停用此頻道的區塊串流。
- `channels.nextcloud-talk.blockStreamingCoalesce`：區塊串流合併調整。
- `channels.nextcloud-talk.mediaMaxMb`：傳入媒體上限（MB）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
