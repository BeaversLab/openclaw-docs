---
summary: "Nextcloud Talk 支援狀態、功能和設定"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

# Nextcloud Talk (外掛程式)

狀態：透過外掛程式 (webhook bot) 支援。支援直接訊息、聊天室、回應和 Markdown 訊息。

## 需要外掛程式

Nextcloud Talk 以外掛程式形式提供，不包含在核心安裝中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本機簽出 (從 git repo 執行時)：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

如果您在設定期間選擇 Nextcloud Talk 且偵測到 git 簽出，
OpenClaw 將自動提供本機安裝路徑。

詳細資訊：[外掛程式](/en/tools/plugin)

## 快速設定 (初學者)

1. 安裝 Nextcloud Talk 外掛程式。
2. 在您的 Nextcloud 伺服器上，建立一個 bot：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目標聊天室設定中啟用 bot。
4. 設定 OpenClaw：
   - 設定檔： `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或環境變數： `NEXTCLOUD_TALK_BOT_SECRET` (僅限預設帳戶)
5. 重新啟動閘道 (或完成設定)。

最精簡設定檔：

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

- Bot 無法發起直接訊息。使用者必須先傳送訊息給 bot。
- Webhook URL 必須能被閘道存取；若位於 proxy 後方，請設定 `webhookPublicUrl`。
- Bot API 不支援媒體上傳；媒體將以 URL 形式傳送。
- Webhook 載荷無法區分直接訊息與聊天室；請設定 `apiUser` + `apiPassword` 以啟用聊天室類型查詢 (否則直接訊息將被視為聊天室)。

## 存取控制 (直接訊息)

- 預設值： `channels.nextcloud-talk.dmPolicy = "pairing"`。未知發送者將收到配對代碼。
- 透過以下方式核准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公開直接訊息： `channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 僅符合 Nextcloud 使用者 ID；顯示名稱將被忽略。

## 聊天室 (群組)

- 預設值： `channels.nextcloud-talk.groupPolicy = "allowlist"` (提及門控)。
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

- 若不允許任何聊天室，請將允許清單留空或設定 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 狀態     |
| -------- | -------- |
| 直接訊息 | 已支援   |
| 聊天室   | 已支援   |
| 執行緒   | 不支援   |
| 媒體     | 僅限 URL |
| 回應     | 已支援   |
| 原生指令 | 不支援   |

## 設定參考（Nextcloud Talk）

完整設定：[Configuration](/en/gateway/configuration)

提供者選項：

- `channels.nextcloud-talk.enabled`：啟用/停用頻道啟動。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 實例網址。
- `channels.nextcloud-talk.botSecret`：機器人共用金鑰。
- `channels.nextcloud-talk.botSecretFile`：一般檔案金鑰路徑。不接受符號連結。
- `channels.nextcloud-talk.apiUser`：用於聊天室查詢的 API 使用者（DM 偵測）。
- `channels.nextcloud-talk.apiPassword`：用於聊天室查詢的 API/應用程式密碼。
- `channels.nextcloud-talk.apiPasswordFile`：API 密碼檔案路徑。
- `channels.nextcloud-talk.webhookPort`：webhook 監聽埠（預設：8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主機（預設：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路徑（預設：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可存取的 webhook 網址。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：DM 允許清單（使用者 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群組允許清單（使用者 ID）。
- `channels.nextcloud-talk.rooms`：各聊天室設定與允許清單。
- `channels.nextcloud-talk.historyLimit`：群組歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dmHistoryLimit`：DM 歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dms`：各 DM 覆蓋設定。
- `channels.nextcloud-talk.textChunkLimit`：出站文字區塊大小（字元數）。
- `channels.nextcloud-talk.chunkMode`：`length`（預設）或 `newline` 在進行長度區塊分割前依空白行（段落邊界）分割。
- `channels.nextcloud-talk.blockStreaming`：停用此頻道的區塊串流。
- `channels.nextcloud-talk.blockStreamingCoalesce`：區塊串流合併調整。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒體上限（MB）。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊驗證和配對流程
- [群組](/en/channels/groups) — 群組聊天行為和提及控管
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型和加固
