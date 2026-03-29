---
summary: "Zalo 機器人支援狀態、功能和設定"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

狀態：實驗性。支援訊息 (DM)。下方的 [功能](#capabilities) 區段反映了目前的 Marketplace 機器人行為。

## 需要外掛程式

Zalo 以外掛程式形式提供，並未隨附於核心安裝中。

- 透過 CLI 安裝：`openclaw plugins install @openclaw/zalo`
- 或在設定過程中選擇 **Zalo** 並確認安裝提示
- 詳細資訊：[外掛程式](/en/tools/plugin)

## 快速設定 (初學者)

1. 安裝 Zalo 外掛程式：
   - 從原始碼簽出：`openclaw plugins install ./extensions/zalo`
   - 從 npm (如果已發布)：`openclaw plugins install @openclaw/zalo`
   - 或在設定中選擇 **Zalo** 並確認安裝提示
2. 設定權杖：
   - 環境變數：`ZALO_BOT_TOKEN=...`
   - 或設定檔：`channels.zalo.accounts.default.botToken: "..."`。
3. 重新啟動閘道 (或完成設定)。
4. DM 存取預設使用配對；在首次聯繫時批准配對碼。

最精簡設定：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## 簡介

Zalo 是一款專注於越南市場的訊息應用程式；其 Bot API 讓閘道能夠運行機器人進行一對一對話。
它非常適合需要將訊息確定性地路由回 Zalo 的支援或通知場景。

本頁面反映了 **Zalo Bot Creator / Marketplace 機器人**目前的 OpenClaw 行為。
**Zalo Official Account (OA) 機器人**是不同的 Zalo 產品介面，行為可能不同。

- 由閘道擁有的 Zalo Bot API 頻道。
- 確定性路由：回覆會傳回 Zalo；模型從不選擇頻道。
- 訊息 (DM) 與代理程式的主要工作階段共用。
- 下方的 [功能](#capabilities) 區段顯示了目前的 Marketplace 機器人支援。

## 設定 (快速路徑)

### 1) 建立機器人權杖 (Zalo Bot Platform)

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 並登入。
2. 建立新的機器人並設定其選項。
3. 複製完整的機器人權杖 (通常為 `numeric_id:secret`)。對於 Marketplace 機器人，可用的執行時期權杖可能會在建立後顯示在機器人的歡迎訊息中。

### 2) 設定權杖 (環境變數或設定檔)

範例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

如果您後來轉移到支援群組的 Zalo 機器人介面，您可以明確新增群組特定設定，例如 `groupPolicy` 和 `groupAllowFrom`。關於目前的 Marketplace 機器人行為，請參閱[功能](#capabilities)。

Env 選項：`ZALO_BOT_TOKEN=...`（僅適用於預設帳戶）。

多帳戶支援：使用 `channels.zalo.accounts` 搭配各帳戶的 token 和可選的 `name`。

3. 重新啟動 gateway。當解析到 token（env 或 config）時，Zalo 便會啟動。
4. DM 存取預設為配對模式。當機器人首次被聯繫時，請批准代碼。

## 運作方式（行為）

- 傳入訊息會被正規化為共用通道封包，並包含媒體預留位置。
- 回覆一律會路由回同一個 Zalo 聊天。
- 預設為長輪詢；可透過 `channels.zalo.webhookUrl` 使用 webhook 模式。

## 限制

- 傳出文字會分割為 2000 個字元的區塊（Zalo API 限制）。
- 媒體下載/上傳受到 `channels.zalo.mediaMaxMb` 的限制（預設為 5）。
- 由於 2000 字元的限制使得串流傳輸作用降低，因此預設會阻擋串流傳輸。

## 存取控制（DM）

### DM 存取

- 預設值：`channels.zalo.dmPolicy = "pairing"`。未知的發送者會收到配對代碼；在批准之前訊息將被忽略（代碼會在 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配對是預設的 token 交換方式。詳細資訊：[配對](/en/channels/pairing)
- `channels.zalo.allowFrom` 接受數字使用者 ID（無法查詢使用者名稱）。

## 存取控制（群組）

對於 **Zalo Bot Creator / Marketplace 機器人**，實際上並無法使用群組支援，因為機器人根本無法被加入群組。

這意味著以下與群組相關的設定鍵存在於 schema 中，但無法用於 Marketplace 機器人：

- `channels.zalo.groupPolicy` 控制群組傳入處理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些發送者 ID 可以在群組中觸發機器人。
- 如果未設定 `groupAllowFrom`，Zalo 將回退到 `allowFrom` 進行發送者檢查。
- 執行時註記：如果完全缺少 `channels.zalo`，執行時仍會回退到 `groupPolicy="allowlist"` 以確保安全。

群組原則值（當您的機器人介面提供群組存取權時）為：

- `groupPolicy: "disabled"` — 封鎖所有群組訊息。
- `groupPolicy: "open"` — 允許任何群組成員（提及限制）。
- `groupPolicy: "allowlist"` — 預設為封鎖失敗；僅接受允許的發送者。

如果您使用的是不同的 Zalo 機器人產品介面，並且已驗證群組行為正常運作，請單獨記錄該行為，而不是假設它與 Marketplace-bot 流程相符。

## 長輪詢 與 Webhook

- 預設值：長輪詢（不需要公開 URL）。
- Webhook 模式：設定 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密鑰必須為 8-256 個字元。
  - Webhook URL 必須使用 HTTPS。
  - Zalo 發送的事件帶有 `X-Bot-Api-Secret-Token` 標頭以供驗證。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 處理 webhook 請求（預設為 webhook URL 路徑）。
  - 請求必須使用 `Content-Type: application/json`（或 `+json` 媒體類型）。
  - 重複事件（`event_name + message_id`）會在短暫的重播視窗內被忽略。
  - 爆發流量會依路徑/來源進行速率限制，並可能回傳 HTTP 429。

**註記：** 根據 Zalo API 文件，getUpdates (輪詢) 與 webhook 是互斥的。

## 支援的訊息類型

如需快速了解支援情況，請參閱[功能](#capabilities)。下方的註記在行為需要額外脈絡時提供了詳細說明。

- **文字訊息**：完全支援，具有 2000 個字元的分塊功能。
- **文字中的純 URL**：行為如同正常文字輸入。
- **連結預覽 / 豐富連結卡片**：請參閱[功能](#capabilities)中的 Marketplace-bot 狀態；它們無法可靠地觸發回覆。
- **圖片訊息**：請參閱[功能](#capabilities)中的 Marketplace-bot 狀態；傳入圖片的處理並不可靠（只有輸入指示而沒有最終回覆）。
- **貼圖**：請參閱[功能](#capabilities)中的 Marketplace-bot 狀態。
- **語音訊息 / 音訊檔案 / 影片 / 一般檔案附件**：請參閱 [Capabilities](#capabilities) 中的 Marketplace-bot 狀態。
- **不支援的類型**：已記錄（例如，來自受保護使用者的訊息）。

## 功能

此表總結了 OpenClaw 中目前 **Zalo Bot Creator / Marketplace bot** 的行為。

| 功能                   | 狀態                                 |
| ---------------------- | ------------------------------------ |
| 私人訊息               | ✅ 支援                              |
| 群組                   | ❌ Marketplace bot 無法使用          |
| 媒體（接收圖片）       | ⚠️ 有限制 / 請在您的環境中驗證       |
| 媒體（傳送圖片）       | ⚠️ 尚未針對 Marketplace bot 重新測試 |
| 文字中的純 URL         | ✅ 支援                              |
| 連結預覽               | ⚠️ 對於 Marketplace bot 不穩定       |
| 反應                   | ❌ 不支援                            |
| 貼圖                   | ⚠️ Marketplace bot 無法代理回覆      |
| 語音訊息 / 音訊 / 影片 | ⚠️ Marketplace bot 無法代理回覆      |
| 檔案附件               | ⚠️ Marketplace bot 無法代理回覆      |
| 串列                   | ❌ 不支援                            |
| 投票                   | ❌ 不支援                            |
| 原生指令               | ❌ 不支援                            |
| 串流                   | ⚠️ 已封鎖（2000 字元限制）           |

## 傳送目標 (CLI/cron)

- 使用聊天 ID 作為目標。
- 範例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 疑難排解

**Bot 無回應：**

- 檢查 token 是否有效：`openclaw channels status --probe`
- 驗證傳送者已獲核准（配對或 allowFrom）
- 檢查 gateway 日誌：`openclaw logs --follow`

**Webhook 未收到事件：**

- 確保 Webhook URL 使用 HTTPS
- 驗證 secret token 為 8-256 個字元
- 確認 gateway HTTP 端點可在設定的路徑上存取
- 檢查 getUpdates 輪詢是否未執行（這兩者互斥）

## 設定參考 (Zalo)

完整設定：[Configuration](/en/gateway/configuration)

扁平的頂層金鑰（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是舊版單一帳號簡寫。建議新設定使用 `channels.zalo.accounts.<id>.*`。因為這兩種形式都存在於 schema 中，所以此處都有記載。

提供者選項：

- `channels.zalo.enabled`：啟用/停用通道啟動。
- `channels.zalo.botToken`：來自 Zalo Bot Platform 的 bot token。
- `channels.zalo.tokenFile`：從一般檔案路徑讀取 token。不接受符號連結。
- `channels.zalo.dmPolicy`: `pairing | allowlist | open | disabled` (預設: pairing)。
- `channels.zalo.allowFrom`: DM 白名單 (使用者 ID)。`open` 需要 `"*"`。精靈會詢問數字 ID。
- `channels.zalo.groupPolicy`: `open | allowlist | disabled` (預設: allowlist)。存在於設定中；請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups) 以了解目前的 Marketplace-bot 行為。
- `channels.zalo.groupAllowFrom`: 群組傳送者白名單 (使用者 ID)。若未設定，則回退至 `allowFrom`。
- `channels.zalo.mediaMaxMb`: 進入/傳出媒體限制 (MB，預設 5)。
- `channels.zalo.webhookUrl`: 啟用 webhook 模式 (需要 HTTPS)。
- `channels.zalo.webhookSecret`: webhook 金鑰 (8-256 字元)。
- `channels.zalo.webhookPath`: 閘道 HTTP 伺服器上的 webhook 路徑。
- `channels.zalo.proxy`: API 請求的代理伺服器 URL。

多帳號選項：

- `channels.zalo.accounts.<id>.botToken`: 每個帳號的權杖。
- `channels.zalo.accounts.<id>.tokenFile`: 每個帳號的一般權杖檔案。不接受符號連結。
- `channels.zalo.accounts.<id>.name`: 顯示名稱。
- `channels.zalo.accounts.<id>.enabled`: 啟用/停用帳號。
- `channels.zalo.accounts.<id>.dmPolicy`: 每個帳號的 DM 政策。
- `channels.zalo.accounts.<id>.allowFrom`: 每個帳號的白名單。
- `channels.zalo.accounts.<id>.groupPolicy`: 每個帳號的群組政策。存在於設定中；請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups) 以了解目前的 Marketplace-bot 行為。
- `channels.zalo.accounts.<id>.groupAllowFrom`: 每個帳號的群組傳送者白名單。
- `channels.zalo.accounts.<id>.webhookUrl`: 每個帳號的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`: 每個帳號的 webhook 金鑰。
- `channels.zalo.accounts.<id>.webhookPath`: 每個帳號的 webhook 路徑。
- `channels.zalo.accounts.<id>.proxy`: 每個帳號的代理伺服器 URL。
