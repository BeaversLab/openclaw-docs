---
summary: "Zalo 機器人支援狀態、功能和設定"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

狀態：實驗性。支援 DM。下方的 [功能](#capabilities) 區段反映了目前 Marketplace 機器人的行為。

## 需要外掛程式

Zalo 以外掛程式形式提供，並未隨附於核心安裝中。

- 透過 CLI 安裝： `openclaw plugins install @openclaw/zalo`
- 或在設定期間選擇 **Zalo** 並確認安裝提示
- 詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定（初學者）

1. 安裝 Zalo 外掛程式：
   - 從原始碼簽出： `openclaw plugins install ./extensions/zalo`
   - 從 npm（如果已發布）： `openclaw plugins install @openclaw/zalo`
   - 或在設定中選擇 **Zalo** 並確認安裝提示
2. 設定權杖：
   - 環境變數： `ZALO_BOT_TOKEN=...`
   - 或設定：`channels.zalo.accounts.default.botToken: "..."`。
3. 重新啟動閘道（或完成設定）。
4. DM 存取預設為配對模式；請在首次聯絡時批准配對碼。

最小設定：

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

Zalo 是一款專注於越南的通訊應用程式；其 Bot API 可讓閘道執行機器人以進行 1 對 1 對話。
它非常適用於需要確定性路由回傳至 Zalo 的支援或通知情境。

本頁面反映了目前 OpenClaw 對於 **Zalo Bot Creator / Marketplace 機器人**的行為。
**Zalo Official Account (OA) 機器人**是不同的 Zalo 產品介面，其行為可能有所不同。

- 由閘道擁有的 Zalo Bot API 頻道。
- 確定性路由：回覆會傳回 Zalo；模型從不自動選擇頻道。
- 私訊 (DM) 共用代理程式的主工作階段。
- 下方的 [Capabilities](#capabilities) 區段顯示了目前 Marketplace 機器人的支援情況。

## 設定（快速路徑）

### 1) 建立機器人 Token (Zalo Bot Platform)

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 並登入。
2. 建立一個新的機器人並設定其設定。
3. 複製完整的機器人權杖 (通常是 `numeric_id:secret`)。對於 Marketplace 機器人，可用的執行時期權杖可能會在建立後出現在機器人的歡迎訊息中。

### 2) 設定權杖 (env 或 config)

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

如果您後來轉移到有群組功能的 Zalo 機器人介面，您可以明確新增群組專屬的設定，例如 `groupPolicy` 和 `groupAllowFrom`。有關目前 Marketplace 機器人的行為，請參閱 [Capabilities](#capabilities)。

Env 選項：`ZALO_BOT_TOKEN=...` (僅適用於預設帳戶)。

多重帳戶支援：使用 `channels.zalo.accounts` 搭配各個帳戶的權杖以及可選的 `name`。

3. 重新啟動閘道。當解析到權杖 (env 或 config) 時，Zalo 便會啟動。
4. 私訊存取預設為配對模式。當機器人首次收到訊息時，請批准代碼。

## 運作方式 (行為)

- 傳入訊息會被標準化為共用通道封包，並包含媒體佔位符。
- 回覆一律會路由回同一個 Zalo 聊天。
- 預設為長輪詢；可透過 `channels.zalo.webhookUrl` 使用 Webhook 模式。

## 限制

- 輸出文字會被分割為 2000 個字元區塊 (Zalo API 限制)。
- 媒體下載/上傳受限於 `channels.zalo.mediaMaxMb` (預設為 5)。
- 由於 2000 字元的限制使串流變得較無用處，串流功能預設為封鎖狀態。

## 存取控制 (私訊)

### 私訊存取

- 預設值：`channels.zalo.dmPolicy = "pairing"`。未知傳送者會收到配對代碼；訊息在批准前會被忽略 (代碼於 1 小時後過期)。
- 透過以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配對是預設的 Token 交換方式。詳情：[配對](/zh-Hant/channels/pairing)
- `channels.zalo.allowFrom` 接受數字使用者 ID（無法查找使用者名稱）。

## 存取控制（群組）

對於 **Zalo Bot Creator / Marketplace 機器人**，實際上無法使用群組支援，因為機器人根本無法被加入群組。

這意味著以下與群組相關的設定鍵存在於架構中，但對 Marketplace 機器人無法使用：

- `channels.zalo.groupPolicy` 控制群組傳入處理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些傳送者 ID 可以在群組中觸發機器人。
- 如果未設定 `groupAllowFrom`，Zalo 將針對傳送者檢查回退至 `allowFrom`。
- 運行時注意：如果完全缺少 `channels.zalo`，出於安全考慮，運行時仍會回退到 `groupPolicy="allowlist"`。

群組政策值（當您的機器人介面提供群組存取權時）為：

- `groupPolicy: "disabled"` — 封鎖所有群組訊息。
- `groupPolicy: "open"` — 允許任何群組成員（提及限制）。
- `groupPolicy: "allowlist"` — 預設為封閉失敗（fail-closed）；僅接受允許的發送者。

如果您使用的是不同的 Zalo 機器人產品介面，並且已驗證群組行為正常運作，請單獨記錄該行為，而不是假設它與 Marketplace 機器人流程相符。

## 長輪詢與 Webhook

- 預設值：長輪詢（不需要公開 URL）。
- Webhook 模式：設定 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密鑰必須為 8-256 個字元。
  - Webhook URL 必須使用 HTTPS。
  - Zalo 發送帶有 `X-Bot-Api-Secret-Token` 標頭的事件以供驗證。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 處理 webhook 請求（預設為 webhook URL 路徑）。
  - 請求必須使用 `Content-Type: application/json`（或 `+json` 媒體類型）。
  - 重複事件（`event_name + message_id`）會在短暫的重放視窗內被忽略。
  - 突發流量會根據路徑/來源進行速率限制，並可能返回 HTTP 429。

**注意：** 根據 Zalo API 文檔，getUpdates（輪詢）和 webhook 是互斥的。

## 支援的訊息類型

如需快速了解支援情況，請參閱 [Capabilities](#capabilities)。以下註釋在行為需要額外背景時提供了詳細說明。

- **文字訊息**：完全支援，並以 2000 個字元為單位進行分塊。
- **文字中的純網址**：表現如同正常的文字輸入。
- **連結預覽 / 豐富連結卡片**：請參閱 [Capabilities](#capabilities) 中的 Marketplace-bot 狀態；它們無法可靠地觸發回覆。
- **圖片訊息**：請參閱 [Capabilities](#capabilities) 中的 Marketplace-bot 狀態；傳入圖片的處理不可靠（只有輸入指示器但沒有最終回覆）。
- **貼圖**：請參閱 [Capabilities](#capabilities) 中的 Marketplace-bot 狀態。
- **語音訊息 / 音訊檔案 / 影片 / 一般檔案附件**：請參閱 [Capabilities](#capabilities) 中的 Marketplace-bot 狀態。
- **不支援的類型**：已記錄（例如，來自受保護使用者的訊息）。

## 功能

此表總結了 OpenClaw 中目前的 **Zalo Bot Creator / Marketplace bot** 行為。

| 功能                     | 狀態                                   |
| ------------------------ | -------------------------------------- |
| 私人訊息                 | ✅ 已支援                              |
| 群組                     | ❌ Marketplace bot 無法使用            |
| 媒體（傳入圖片）         | ⚠️ 有限 / 請在您的環境中驗證           |
| 媒體（傳出圖片）         | ⚠️ 尚未針對 Marketplace 機器人重新測試 |
| 文字中的純 URL           | ✅ 已支援                              |
| 連結預覽                 | ⚠️ 對 Marketplace 機器人來說不可靠     |
| 回應                     | ❌ 不支援                              |
| 貼圖                     | ⚠️ Marketplace 機器人無代理回應        |
| 語音備忘錄 / 音訊 / 影片 | ⚠️ Marketplace 機器人無代理回應        |
| 檔案附件                 | ⚠️ Marketplace 機器人無代理回應        |
| 串列                     | ❌ 不支援                              |
| 投票                     | ❌ 不支援                              |
| 原生指令                 | ❌ 不支援                              |
| 串流                     | ⚠️ 已封鎖（2000 字元限制）             |

## 傳遞目標 (CLI/cron)

- 使用聊天 ID 作為目標。
- 範例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 疑難排解

**機器人無回應：**

- 檢查 token 是否有效：`openclaw channels status --probe`
- 驗證發送者已獲核准 (配對或 allowFrom)
- 檢查 gateway 日誌：`openclaw logs --follow`

**Webhook 未收到事件：**

- 請確保 webhook URL 使用 HTTPS
- 驗證 secret token 為 8-256 個字元
- 確認網關 HTTP 端點在設定的路徑上可存取
- 檢查 getUpdates 輪詢是否未在執行（這兩者是互斥的）

## 組態參考 (Zalo)

完整組態：[Configuration](/zh-Hant/gateway/configuration)

扁平的頂層金鑰（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 及類似金鑰）是舊版單一帳號的簡寫。建議對新的組態使用 `channels.zalo.accounts.<id>.*`。因為這兩種形式都存在於綱要中，所以這裡仍然記錄了這兩種形式。

提供者選項：

- `channels.zalo.enabled`：啟用/停用頻道啟動。
- `channels.zalo.botToken`：來自 Zalo Bot Platform 的 bot token。
- `channels.zalo.tokenFile`：從常規檔案路徑讀取 token。符號連結會被拒絕。
- `channels.zalo.dmPolicy`: `pairing | allowlist | open | disabled` (預設：pairing)。
- `channels.zalo.allowFrom`: DM 許可清單 (使用者 ID)。`open` 需要 `"*"`。精靈會詢問數字 ID。
- `channels.zalo.groupPolicy`: `open | allowlist | disabled` (預設：allowlist)。存在於設定中；請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups) 以了解目前的 Marketplace-bot 行為。
- `channels.zalo.groupAllowFrom`: 群組發送者許可清單 (使用者 ID)。未設定時會回退至 `allowFrom`。
- `channels.zalo.mediaMaxMb`: 入站/出站媒體容量 (MB，預設 5)。
- `channels.zalo.webhookUrl`: 啟用 Webhook 模式 (需要 HTTPS)。
- `channels.zalo.webhookSecret`: Webhook 密鑰 (8-256 個字元)。
- `channels.zalo.webhookPath`：閘道 HTTP 伺服器上的 webhook 路徑。
- `channels.zalo.proxy`：API 請求的代理 URL。

多帳號選項：

- `channels.zalo.accounts.<id>.botToken`：各帳號的 token。
- `channels.zalo.accounts.<id>.tokenFile`：各帳號的一般 token 檔案。符號連結會被拒絕。
- `channels.zalo.accounts.<id>.name`：顯示名稱。
- `channels.zalo.accounts.<id>.enabled`：啟用/停用帳號。
- `channels.zalo.accounts.<id>.dmPolicy`：各帳號的 DM 政策。
- `channels.zalo.accounts.<id>.allowFrom`：各帳號的允許清單。
- `channels.zalo.accounts.<id>.groupPolicy`：各帳號的群組政策。出現在設定中；請參閱[功能]#capabilities和[存取控制 (群組)]#access-control-groups以了解目前的 Marketplace 機器人行為。
- `channels.zalo.accounts.<id>.groupAllowFrom`：各帳號的群組發送者允許清單。
- `channels.zalo.accounts.<id>.webhookUrl`：每個帳號的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：每個帳號的 webhook secret。
- `channels.zalo.accounts.<id>.webhookPath`：每個帳號的 webhook 路徑。
- `channels.zalo.accounts.<id>.proxy`：每個帳號的 proxy URL。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
