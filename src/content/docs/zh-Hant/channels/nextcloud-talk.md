---
summary: "Nextcloud Talk 支援狀態、功能和設定"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

狀態：隨附外掛程式 (webhook bot)。支援私人訊息、聊天室、反應以及 Markdown 訊息。

## 隨附外掛程式

Nextcloud Talk 在目前的 OpenClaw 版本中作為隨附外掛程式提供，因此
正常的封裝版本不需要另外安裝。

如果您使用的是較舊的版本或未包含 Nextcloud Talk 的自訂安裝，請直接安裝 npm 套件：

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

使用基礎套件以跟隨目前的正式發行標籤。僅在您需要可重現的安裝時，才固定特定版本。

本機簽出（當從 git repo 執行時）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

1. 確保 Nextcloud Talk 外掛程式可用。
   - 目前的 OpenClaw 打包版本已包含它。
   - 較舊或自訂的安裝可以使用上述指令手動新增。
2. 在您的 Nextcloud 伺服器上，建立一個 bot：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature webhook --feature response --feature reaction
   ```

3. 在目標聊天室設定中啟用 bot。
4. 設定 OpenClaw：
   - 組態：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或環境變數：`NEXTCLOUD_TALK_BOT_SECRET` (僅限預設帳戶)

   CLI 設定：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --url https://cloud.example.com \
     --token "<shared-secret>"
   ```

   對等的明確欄位：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret "<shared-secret>"
   ```

   檔案支援的密鑰：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. 重新啟動閘道 (或完成設定)。

最簡組態：

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

## 註記

- Bot 無法發起私訊。使用者必須先傳送訊息給 Bot。
- Webhook URL 必須能被閘道存取；若位於代理後方，請設定 `webhookPublicUrl`。
- Bot API 不支援媒體上傳；媒體會以 URL 形式發送。
- Webhook 載荷無法區分私訊與聊天室；請設定 `apiUser` + `apiPassword` 以啟用聊天室類型查詢 (否則私訊將被視為聊天室)。

## 存取控制 (私訊)

- 預設值：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知的傳送者將會收到配對碼。
- 透過以下方式核准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公開私訊：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 僅比對 Nextcloud 使用者 ID；顯示名稱會被忽略。

## 聊天室 (群組)

- 預設值：`channels.nextcloud-talk.groupPolicy = "allowlist"` (提及限制)。
- 使用 `channels.nextcloud-talk.rooms` 將聊天室加入白名單：

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

- 若不允許任何聊天室，請將白名單保留空白或設定 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 狀態     |
| -------- | -------- |
| 私訊     | 支援     |
| 聊天室   | 支援     |
| 執行緒   | 不支援   |
| 媒體     | 僅限 URL |
| 回應     | 支援     |
| 原生指令 | 不支援   |

## 組態參考 (Nextcloud Talk)

完整組態：[組態](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.nextcloud-talk.enabled`：啟用/停用頻道啟動。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 實例 URL。
- `channels.nextcloud-talk.botSecret`：Bot 共用密鑰。
- `channels.nextcloud-talk.botSecretFile`：一般檔案密鑰路徑。符號連結會被拒絕。
- `channels.nextcloud-talk.apiUser`：用於聊天室查詢的 API 使用者 (私訊偵測)。
- `channels.nextcloud-talk.apiPassword`：用於房間查詢的 API/應用程式密碼。
- `channels.nextcloud-talk.apiPasswordFile`：API 密碼檔案路徑。
- `channels.nextcloud-talk.webhookPort`：webhook 監聽連接埠（預設：8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主機（預設：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路徑（預設：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可存取的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：DM 許可清單（使用者 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群組許可清單（使用者 ID）。
- `channels.nextcloud-talk.rooms`：各房間設定和許可清單。
- 靜態發送者存取群組可以透過 `accessGroup:<name>` 從 `allowFrom` 和 `groupAllowFrom` 引用。
- `channels.nextcloud-talk.historyLimit`：群組歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dmHistoryLimit`：DM 歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dms`：各 DM 覆寫（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`：出站文字區塊大小（字元）。
- `channels.nextcloud-talk.chunkMode`：`length`（預設）或 `newline` 以在長度區塊分割前依空行（段落邊界）分割。
- `channels.nextcloud-talk.blockStreaming`：對此頻道停用區塊串流。
- `channels.nextcloud-talk.blockStreamingCoalesce`：區塊串流合併調整。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒體上限（MB）。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘門
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與防護加固
