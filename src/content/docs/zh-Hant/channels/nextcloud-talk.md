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

如果您使用的是舊版本或排除 Nextcloud Talk 的自訂安裝，
請手動安裝：

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本機檢出 (當從 git 儲存庫執行時)：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

1. 確保 Nextcloud Talk 外掛程式可用。
   - 目前的封裝版 OpenClaw 發行版本已內建此外掛程式。
   - 較舊或自訂的安裝版本可以使用上述指令手動新增。
2. 在您的 Nextcloud 伺服器上，建立一個 bot：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目標聊天室設定中啟用該 bot。
4. 設定 OpenClaw：
   - 設定：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
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

   檔案支援的秘密金鑰：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. 重新啟動閘道 (或完成設定)。

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

## 備註

- Bot 無法主動發起私人訊息。使用者必須先傳送訊息給 bot。
- Webhook URL 必須能被閘道存取；如果位於代理伺服器後方，請設定 `webhookPublicUrl`。
- Bot API 不支援媒體上傳；媒體會以 URL 形式傳送。
- Webhook 載荷無法區分私人訊息與聊天室；請設定 `apiUser` + `apiPassword` 以啟用聊天室類型查詢 (否則私人訊息將被視為聊天室)。

## 存取控制 (私人訊息)

- 預設值：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知的傳送者會收到配對碼。
- 透過以下方式核准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公開私人訊息：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 僅比對 Nextcloud 使用者 ID；顯示名稱會被忽略。

## 聊天室 (群組)

- 預設值：`channels.nextcloud-talk.groupPolicy = "allowlist"` (提及限制)。
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

- 若不允許任何聊天室，請將允許清單保持空白或設定 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 狀態     |
| -------- | -------- |
| 私人訊息 | 支援     |
| 聊天室   | 支援     |
| 串接     | 不支援   |
| 媒體     | 僅限 URL |
| 反應     | 支援     |
| 原生指令 | 不支援   |

## 設定參考

完整設定：[設定](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.nextcloud-talk.enabled`：啟用/停用頻道啟動。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 執行個體 URL。
- `channels.nextcloud-talk.botSecret`：機器人共用金鑰。
- `channels.nextcloud-talk.botSecretFile`：一般檔案金鑰路徑。符號連結會被拒絕。
- `channels.nextcloud-talk.apiUser`：用於聊天室查詢（DM 偵測）的 API 使用者。
- `channels.nextcloud-talk.apiPassword`：用於聊天室查詢的 API/應用程式密碼。
- `channels.nextcloud-talk.apiPasswordFile`：API 密碼檔案路徑。
- `channels.nextcloud-talk.webhookPort`：webhook 監聽埠（預設：8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主機（預設：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路徑（預設：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可存取的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：DM 允許清單（使用者 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群組允許清單（使用者 ID）。
- `channels.nextcloud-talk.rooms`：各聊天室設定和允許清單。
- `channels.nextcloud-talk.historyLimit`：群組歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dmHistoryLimit`：DM 歷史記錄限制（0 表示停用）。
- `channels.nextcloud-talk.dms`：各 DM 覆寫。
- `channels.nextcloud-talk.textChunkLimit`：輸出文字區塊大小（字元數）。
- `channels.nextcloud-talk.chunkMode`：`length`（預設）或 `newline` 在按長度分割之前於空白行處分割（段落邊界）。
- `channels.nextcloud-talk.blockStreaming`：停用此頻道的區塊串流。
- `channels.nextcloud-talk.blockStreamingCoalesce`：區塊串流合併調整。
- `channels.nextcloud-talk.mediaMaxMb`：輸入媒體上限（MB）。

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 身份驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘控
- [通道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
