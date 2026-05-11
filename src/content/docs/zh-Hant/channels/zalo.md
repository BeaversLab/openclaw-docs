---
summary: "Zalo 機器人支援狀態、功能和設定"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

狀態：實驗性。支援訊息 (DM)。下方的 [Capabilities](#capabilities) 區段反映了目前的 Marketplace 機器人行為。

## 隨附外掛

Zalo 作為隨附外掛包含在目前的 OpenClaw 版本中，因此一般的封裝版本不需要單獨安裝。

如果您使用的是較舊的版本或排除 Zalo 的自訂安裝，請手動安裝：

- 透過 CLI 安裝： `openclaw plugins install @openclaw/zalo`
- 或是從原始碼 checkout： `openclaw plugins install ./path/to/local/zalo-plugin`
- 詳細資訊：[外掛](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

1. 確保 Zalo 外掛可用。
   - 目前的封裝版 OpenClaw 版本已內建此外掛。
   - 較舊或自訂的安裝版本可以使用上述指令手動新增。
2. 設定權杖 (token)：
   - 環境變數： `ZALO_BOT_TOKEN=...`
   - 或是設定檔： `channels.zalo.accounts.default.botToken: "..."`。
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

Zalo 是一款以越南為主的訊息應用程式；其 Bot API 讓閘道能夠執行機器人進行 1 對 1 對話。
它非常適合支援或通知，特別是當您想要將路由確定性地傳回 Zalo 時。

本頁面反映了目前 OpenClaw 對於 **Zalo Bot Creator / Marketplace 機器人** 的行為。
**Zalo Official Account (OA) 機器人** 是不同的 Zalo 產品介面，其行為可能不同。

- 一個由閘道擁有的 Zalo Bot API 頻道。
- 確定性路由：回覆會傳回 Zalo；模型從不選擇頻道。
- 訊息 (DM) 共用代理程式的主要工作階段。
- 下方的 [Capabilities](#capabilities) 區段顯示了目前的 Marketplace 機器人支援情況。

## 設定 (快速路徑)

### 1) 建立機器人權杖 (Zalo Bot Platform)

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 並登入。
2. 建立一個新的機器人並設定其設定。
3. 複製完整的機器人權杖 (通常為 `numeric_id:secret`)。對於 Marketplace 機器人，可用的執行時期權杖可能會在建立後顯示在機器人的歡迎訊息中。

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

如果您之後遷移至提供群組功能的 Zalo 機器人介面，可以明確新增群組專屬設定，例如 `groupPolicy` 和 `groupAllowFrom`。關於目前 Marketplace 機器人的行為，請參閱 [Capabilities](#capabilities)。

環境變數選項：`ZALO_BOT_TOKEN=...`（僅適用於預設帳戶）。

多帳戶支援：使用 `channels.zalo.accounts` 搭配各帳戶的 token 以及可選的 `name`。

3. 重新啟動閘道。當解析到 token（環境變數或配置）時，Zalo 便會啟動。
4. DM 存取預設為配對模式。當機器人首次被聯繫時，請批准代碼。

## 運作方式（行為）

- 傳入訊息會被正規化為共享通道封包，並附帶媒體占位符。
- 回覆一律路由回同一個 Zalo 聊天。
- 預設使用長輪詢；可透過 `channels.zalo.webhookUrl` 使用 Webhook 模式。

## 限制

- 傳出文字會以 2000 個字元為單位進行分塊（Zalo API 限制）。
- 媒體下載/上傳受到 `channels.zalo.mediaMaxMb` 的限制（預設為 5）。
- 由於 2000 字元的限制導致串流傳輸效果較差，因此預設會阻擋串流傳輸。

## 存取控制（DM）

### DM 存取

- 預設值：`channels.zalo.dmPolicy = "pairing"`。未知發送者會收到配對代碼；在批准之前訊息將被忽略（代碼在 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- 配對是預設的 token 交換方式。詳細資訊：[配對](/zh-Hant/channels/pairing)
- `channels.zalo.allowFrom` 接受數字使用者 ID（無法查詢使用者名稱）。

## 存取控制（群組）

對於 **Zalo Bot Creator / Marketplace bots**，群組支援實際上並不可用，因為機器人根本無法被加入群組。

這意味著以下與群組相關的配置金鑰雖然存在於架構中，但對 Marketplace bots 並不可用：

- `channels.zalo.groupPolicy` 控制群組傳入處理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制哪些發送者 ID 可以在群組中觸發機器人。
- 如果未設定 `groupAllowFrom`，Zalo 會回退到 `allowFrom` 進行發送者檢查。
- 執行時注意：如果完全缺少 `channels.zalo`，為了安全起見，執行時仍會回退到 `groupPolicy="allowlist"`。

群組政策值（當您的機器人介面可使用群組存取時）如下：

- `groupPolicy: "disabled"` — 阻擋所有群組訊息。
- `groupPolicy: "open"` — 允許任何群組成員（提及限制）。
- `groupPolicy: "allowlist"` — 預設為封閉式失敗；僅接受允許的發送者。

如果您使用的是不同的 Zalo 機器人產品介面，並且已確認群組運作正常，請單獨記錄該行為，而不是假設它與 Marketplace 機器人的流程相符。

## 長輪詢與 Webhook

- 預設值：長輪詢（不需要公開 URL）。
- Webhook 模式：設定 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - Webhook 密鑰長度必須為 8 到 256 個字元。
  - Webhook URL 必須使用 HTTPS。
  - Zalo 發送帶有 `X-Bot-Api-Secret-Token` 標頭的事件以進行驗證。
  - Gateway HTTP 在 `channels.zalo.webhookPath` 處理 webhook 請求（預設為 webhook URL 路徑）。
  - 請求必須使用 `Content-Type: application/json`（或 `+json` 媒體類型）。
  - 重複的事件 (`event_name + message_id`) 在短暫的重放時間視窗內會被忽略。
  - 突發流量會根據路徑/來源進行速率限制，並可能返回 HTTP 429。

**注意：** 根據 Zalo API 文件，getUpdates (輪詢) 和 webhook 是互斥的。

## 支援的訊息類型

如需快速了解支援情況，請參閱[功能](#capabilities)。下方的註釋在行為需要額外說明的地方補充了細節。

- **文字訊息**：完全支援，並具有 2000 個字元的分塊功能。
- **文字中的純 URL**：表現得像正常的文字輸入。
- **連結預覽 / 豐富連結卡片**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態；它們無法可靠地觸發回覆。
- **圖片訊息**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態；傳入圖片的處理不可靠（有輸入指示器但沒有最終回覆）。
- **貼圖**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態。
- **語音訊息 / 音訊檔案 / 影片 / 一般檔案附件**：請參閱[功能](#capabilities)中的 Marketplace 機器人狀態。
- **不支援的類型**：已記錄（例如，來自受保護使用者的訊息）。

## 功能

此表總結了目前 OpenClaw 中 **Zalo Bot Creator / Marketplace 機器人** 的行為。

| 功能                   | 狀態                                   |
| ---------------------- | -------------------------------------- |
| 直接訊息               | ✅ 已支援                              |
| 群組                   | ❌ Marketplace 機器人無法使用          |
| 媒體（傳入圖片）       | ⚠️ 受限 / 請在您的環境中驗證           |
| 媒體（外發圖片）       | ⚠️ 尚未針對 Marketplace 機器人重新測試 |
| 純文字網址             | ✅ 支援                                |
| 連結預覽               | ⚠️ 對 Marketplace 機器人來說不可靠     |
| 回應                   | ❌ 不支援                              |
| 貼圖                   | ⚠️ Marketplace 機器人無代理回覆        |
| 語音訊息 / 音訊 / 影片 | ⚠️ Marketplace 機器人無代理回覆        |
| 檔案附件               | ⚠️ Marketplace 機器人無代理回覆        |
| 串列                   | ❌ 不支援                              |
| 投票                   | ❌ 不支援                              |
| 原生指令               | ❌ 不支援                              |
| 串流                   | ⚠️ 受阻（2000 字元限制）               |

## 傳送目標 (CLI/cron)

- 使用 chat id 作為目標。
- 範例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**機器人沒有回應：**

- 檢查 token 是否有效：`openclaw channels status --probe`
- 驗證發送者是否已被核准（pairing 或 allowFrom）
- 檢查 gateway 日誌：`openclaw logs --follow`

**Webhook 未接收到事件：**

- 確保 webhook URL 使用 HTTPS
- 驗證 secret token 是 8-256 個字元
- 確認在配置的路徑上可存取 gateway HTTP 端點
- 檢查 getUpdates 輪詢是否未運行（它們互斥）

## 配置參考 (Zalo)

完整配置：[Configuration](/zh-Hant/gateway/configuration)

扁平頂層金鑰（`channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是舊版單一帳號簡寫。新配置建議使用 `channels.zalo.accounts.<id>.*`。這裡仍然記錄這兩種形式，因為它們存在於 schema 中。

提供者選項：

- `channels.zalo.enabled`：啟用/停用通道啟動。
- `channels.zalo.botToken`：來自 Zalo Bot Platform 的機器人 token。
- `channels.zalo.tokenFile`：從常規檔案路徑讀取 token。拒絕符號連結。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.zalo.allowFrom`：DM 許可清單（使用者 ID）。`open` 需要 `"*"`。精靈會詢問數字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（預設值：allowlist）。存在於組態中；請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups) 以了解目前的 Marketplace-bot 行為。
- `channels.zalo.groupAllowFrom`：群組傳送者允許清單（使用者 ID）。未設定時會回退至 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒體上限（MB，預設值 5）。
- `channels.zalo.webhookUrl`：啟用 webhook 模式（需要 HTTPS）。
- `channels.zalo.webhookSecret`：webhook 密鑰（8-256 個字元）。
- `channels.zalo.webhookPath`：閘道 HTTP 伺服器上的 webhook 路徑。
- `channels.zalo.proxy`：API 要求的代理伺服器 URL。

多帳戶選項：

- `channels.zalo.accounts.<id>.botToken`：各帳戶的權杖。
- `channels.zalo.accounts.<id>.tokenFile`：各帳戶的標準權杖檔案。不支援符號連結。
- `channels.zalo.accounts.<id>.name`：顯示名稱。
- `channels.zalo.accounts.<id>.enabled`：啟用/停用帳戶。
- `channels.zalo.accounts.<id>.dmPolicy`：各帳戶的 DM 政策。
- `channels.zalo.accounts.<id>.allowFrom`：各帳戶的允許清單。
- `channels.zalo.accounts.<id>.groupPolicy`：各帳戶的群組政策。存在於組態中；請參閱 [Capabilities](#capabilities) 和 [Access control (Groups)](#access-control-groups) 以了解目前的 Marketplace-bot 行為。
- `channels.zalo.accounts.<id>.groupAllowFrom`：各帳戶的群組傳送者允許清單。
- `channels.zalo.accounts.<id>.webhookUrl`：各帳戶的 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：各帳戶的 webhook 密鑰。
- `channels.zalo.accounts.<id>.webhookPath`：各帳戶的 webhook 路徑。
- `channels.zalo.accounts.<id>.proxy`：各帳戶的代理伺服器 URL。

## 相關連結

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — DM 驗證和配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為和提及閘道
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [Security](/zh-Hant/gateway/security) — 存取模型和強化措施
