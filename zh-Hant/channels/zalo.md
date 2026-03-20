---
summary: "Zalo bot 支援狀態、功能與設定"
read_when:
  - 正在處理 Zalo 功能或 webhooks
title: "Zalo"
---

# Zalo (Bot API)

狀態：實驗性。支援訊息（DM）。下方的 [功能](#capabilities) 區段反映了目前的 Marketplace 機器人行為。

## 需要外掛

Zalo 以外掛形式提供，並未隨附於核心安裝中。

- 透過 CLI 安裝： `openclaw plugins install @openclaw/zalo`
- 或在設定期間選擇 **Zalo** 並確認安裝提示
- 詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

1. 安裝 Zalo 外掛：
   - 從原始碼 checkout： `openclaw plugins install ./extensions/zalo`
   - 從 npm（若已發佈）： `openclaw plugins install @openclaw/zalo`
   - 或在設定中選擇 **Zalo** 並確認安裝提示
2. 設定權杖：
   - Env： `ZALO_BOT_TOKEN=...`
   - 或 config： `channels.zalo.accounts.default.botToken: "..."`。
3. 重新啟動閘道 (或完成設定)。
4. 訊息 (DM) 存取預設為配對模式；請在首次聯繫時批准配對碼。

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

Zalo 是一款以越南為主的新訊息應用程式；其 Bot API 可讓 Gateway 運行機器人以進行 1:1 對話。
它非常適合用於您希望確定性路由回傳至 Zalo 的支援或通知。

本頁面反映了目前 OpenClaw 針對 **Zalo Bot Creator / Marketplace 機器人** 的行為。
**Zalo Official Account (OA) 機器人** 是不同的 Zalo 產品介面，其行為可能會有所不同。

- 一個由閘道擁有的 Zalo Bot API 頻道。
- 確定性路由：回覆會傳回 Zalo；模型從不自選頻道。
- 訊息 (DM) 共用代理的主要工作階段。
- 下方的 [功能](#capabilities) 區段顯示了目前 Marketplace 機器人的支援情況。

## 設定 (快速路徑)

### 1) 建立機器人權杖 (Zalo Bot Platform)

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 並登入。
2. 建立一個新的機器人並設定其設定。
3. 複製完整的機器人權杖（通常為 `numeric_id:secret`）。對於 Marketplace 機器人，可用的執行時期權杖可能會在建立後顯示於機器人的歡迎訊息中。

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

如果您之後轉移到有群組功能的 Zalo 機器人介面，您可以明確新增群組特定設定，例如 `groupPolicy` 和 `groupAllowFrom`。如需目前 Marketplace 機器人的行為，請參閱 [功能](#capabilities)。

Env 選項： `ZALO_BOT_TOKEN=...` （僅適用於預設帳戶）。

多帳戶支援：使用 `channels.zalo.accounts` 搭配各別帳戶的權杖及選用的 `name`。

3. 重新啟動閘道。當解析到權杖時 (透過環境變數或配置)，Zalo 即會啟動。
4. 直接訊息 (DM) 存取預設為配對模式。當機器人首次被聯繫時，請核准代碼。

## 運作方式 (行為)

- 傳入訊息會被正規化為帶有媒體預留位置的共用通道封裝。
- 回覆一律會路由回同一個 Zalo 聊天。
- 預設使用長輪詢；可透過 `channels.zalo.webhookUrl` 使用 webhook 模式。

## 限制

- 傳出文字會被分割為 2000 個字元的區塊 (Zalo API 限制)。
- 媒體下載/上傳受 `channels.zalo.mediaMaxMb` 限制（預設為 5）。
- 由於 2000 個字元的限制使得串流較不實用，因此預設會封鎖串流功能。

## 存取控制 (DMs)

### DM 存取

- 預設值： `channels.zalo.dmPolicy = "pairing"`。未知發送者會收到配對代碼；訊息將會被忽略直到獲得核准為止（代碼在 1 小時後過期）。
- 透過以下方式核准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配對是預設的權杖交換方式。詳細資訊：[配對](/zh-Hant/channels/pairing)
- `channels.zalo.allowFrom` 接受數字使用者 ID（無法透過使用者名稱查詢）。

## 存取控制 (群組)

對於 **Zalo Bot Creator / Marketplace 機器人**，實際上無法使用群組支援，因為機器人根本無法被加入群組。

這意味著以下與群組相關的配置鍵存在於架構中，但對 Marketplace 機器人無法使用：

- `channels.zalo.groupPolicy` 控制群組傳入處理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些傳送者 ID 可以在群組中觸發機器人。
- 如果未設定 `groupAllowFrom`，Zalo 會退回到 `allowFrom` 進行傳送者檢查。
- 執行時期備註：如果完全缺少 `channels.zalo`，出於安全考量，執行時期仍會退回到 `groupPolicy="allowlist"`。

群組策略值（當您的機器人介面提供群組存取權時）為：

- `groupPolicy: "disabled"` — 封鎖所有群組訊息。
- `groupPolicy: "open"` — 允許任何群組成員（需提及觸發）。
- `groupPolicy: "allowlist"` — 預設為失敗關閉；僅接受允許的傳送者。

如果您使用不同的 Zalo 機器人產品介面並已驗證群組行為正常運作，請單獨記錄該行為，而不要假設它與 Marketplace-bot 流程相符。

## 長輪詢 vs Webhook

- 預設：長輪詢（不需要公開 URL）。
- Webhook 模式：設定 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密鑰必須為 8-256 個字元。
  - Webhook URL 必須使用 HTTPS。
  - Zalo 發送帶有 `X-Bot-Api-Secret-Token` 標頭的事件以供驗證。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 處理 webhook 請求（預設為 webhook URL 路徑）。
  - 請求必須使用 `Content-Type: application/json`（或 `+json` 媒體類型）。
  - 重複事件（`event_name + message_id`）會在短暫的重播視窗內被忽略。
  - 突發流量會根據路徑/來源進行速率限制，並可能傳回 HTTP 429。

**注意：** 根據 Zalo API 文件，getUpdates (輪詢) 和 webhook 互斥。

## 支援的訊息類型

如需快速了解支援情況，請參閱[功能](#capabilities)。以下備註在行為需要額外背景說明的地方補充了細節。

- **文字訊息**：完全支援，包含 2000 個字元的分段。
- **純文字 URL**：行為如同一般文字輸入。
- **連結預覽 / 豐富連結卡片**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態；這些功能無法可靠地觸發回覆。
- **圖片訊息**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態；傳入圖片處理並不可靠（僅有輸入指示器而沒有最終回覆）。
- **貼圖**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態。
- **語音備忘錄 / 音訊檔案 / 影片 / 一般檔案附件**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態。
- **不支援的類型**：已記錄（例如，來自受保護使用者的訊息）。

## Capabilities

此表總結了 OpenClaw 中目前 **Zalo Bot Creator / Marketplace bot** 的行為。

| 功能                   | 狀態                                 |
| ---------------------- | ------------------------------------ |
| 直接訊息               | ✅ 已支援                            |
| 群組                   | ❌ Marketplace bot 無法使用          |
| 媒體（傳入圖片）       | ⚠️ 有限 / 請在您的環境中驗證         |
| 媒體（傳出圖片）       | ⚠️ 尚未針對 Marketplace bot 重新測試 |
| 文字中的純 URL         | ✅ 已支援                            |
| 連結預覽               | ⚠️ 對於 Marketplace bot 不可靠       |
| 反應                   | ❌ 不支援                            |
| 貼圖                   | ⚠️ Marketplace bot 沒有代理回覆      |
| 語音訊息 / 音訊 / 影片 | ⚠️ Marketplace bot 沒有代理回覆      |
| 檔案附件               | ⚠️ Marketplace bot 沒有代理回覆      |
| 主題串                 | ❌ 不支援                            |
| 投票                   | ❌ 不支援                            |
| 原生指令               | ❌ 不支援                            |
| 串流                   | ⚠️ 已封鎖（2000 字元限制）           |

## 傳送目標 (CLI/cron)

- 使用聊天 ID 作為目標。
- 範例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 疑難排解

**Bot 沒有回應：**

- 檢查權杖是否有效：`openclaw channels status --probe`
- 驗證發送者是否已獲批准（配對或 allowFrom）
- 檢查閘道日誌：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 確保 webhook URL 使用 HTTPS
- 驗證秘密 token 為 8-256 個字元
- 確認 gateway HTTP 端點可在設定路徑上存取
- 檢查 getUpdates 輪詢是否未執行（兩者互斥）

## 組態參考 (Zalo)

完整配置：[Configuration](/zh-Hant/gateway/configuration)

扁平的頂層鍵（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是遺留的單帳戶簡寫。對於新配置，建議使用 `channels.zalo.accounts.<id>.*`。這兩種格式仍在本文檔中說明，因為它們存在於架構中。

提供者選項：

- `channels.zalo.enabled`：啟用/停用頻道啟動。
- `channels.zalo.botToken`：來自 Zalo Bot Platform 的機器人權杖。
- `channels.zalo.tokenFile`：從常規檔案路徑讀取權杖。符號連結會被拒絕。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.zalo.allowFrom`：私訊允許清單（使用者 ID）。`open` 需要 `"*"`。精靈會詢問數字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（預設：allowlist）。存在於配置中；有關目前 Marketplace 機器人的行為，請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.groupAllowFrom`：群組傳送者允許清單（使用者 ID）。未設定時會回退至 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒體上限（MB，預設 5）。
- `channels.zalo.webhookUrl`：啟用 Webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：Webhook 密鑰（8-256 個字元）。
- `channels.zalo.webhookPath`：閘道 HTTP 伺服器上的 Webhook 路徑。
- `channels.zalo.proxy`：API 請求的代理 URL。

多帳號選項：

- `channels.zalo.accounts.<id>.botToken`：每個帳戶的權杖。
- `channels.zalo.accounts.<id>.tokenFile`：每個帳戶的常規權杖檔案。符號連結會被拒絕。
- `channels.zalo.accounts.<id>.name`：顯示名稱。
- `channels.zalo.accounts.<id>.enabled`：啟用/停用帳戶。
- `channels.zalo.accounts.<id>.dmPolicy`：每個帳戶的私訊原則。
- `channels.zalo.accounts.<id>.allowFrom`：每個帳戶的允許清單。
- `channels.zalo.accounts.<id>.groupPolicy`：每個帳戶的群組原則。存在於配置中；有關目前 Marketplace 機器人的行為，請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups)。
- `channels.zalo.accounts.<id>.groupAllowFrom`：每個帳號的群組發送者允許名單。
- `channels.zalo.accounts.<id>.webhookUrl`：每個帳號的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：每個帳號的 webhook 密鑰。
- `channels.zalo.accounts.<id>.webhookPath`：每個帳號的 webhook 路徑。
- `channels.zalo.accounts.<id>.proxy`：每個帳號的代理 URL。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
