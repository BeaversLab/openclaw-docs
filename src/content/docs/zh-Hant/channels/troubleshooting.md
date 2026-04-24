---
summary: "使用每個通道的故障特徵和修復方法進行快速通道級故障排除"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "通道故障排除"
---

# 通道故障排除

當通道已連接但行為異常時，請使用本頁面。

## 命令階梯

首先按順序執行這些操作：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康基準：

- `Runtime: running`
- `Connectivity probe: ok`
- `Capability: read-only`、`write-capable` 或 `admin-capable`
- 通道探測顯示傳輸已連接，且在支援的情況下，`works` 或 `audit ok`

## WhatsApp

### WhatsApp 故障特徵

| 症狀                  | 最快檢查                                  | 修復                                |
| --------------------- | ----------------------------------------- | ----------------------------------- |
| 已連接但無私訊回覆    | `openclaw pairing list whatsapp`          | 核准發送者或切換私訊原則/允許清單。 |
| 群組訊息被忽略        | 檢查設定中的 `requireMention` + 提及模式  | 提及機器人或放寬該群組的提及原則。  |
| 隨機斷線/重新登入迴圈 | `openclaw channels status --probe` + 日誌 | 重新登入並驗證憑證目錄是否健康。    |

完整疑難排解：[WhatsApp 疑難排解](/zh-Hant/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特徵

| 症狀                           | 最快檢查                                   | 修復                                                                                    |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `/start` 但無可用的回覆流程    | `openclaw pairing list telegram`           | 核准配對或變更私訊原則。                                                                |
| 機器人上線但群組保持靜默       | 驗證提及需求和機器人隱私模式               | 關閉隱私模式以取得群組可見性或提及機器人。                                              |
| 發送失敗並伴隨網路錯誤         | 檢查日誌中是否有 Telegram API 呼叫失敗     | 修復通往 `api.telegram.org` 的 DNS/IPv6/Proxy 路由。                                    |
| 輪詢停滯或重新連線緩慢         | 使用 `openclaw logs --follow` 進行輪詢診斷 | 升級；如果重啟是誤報，請調整 `pollingStallThresholdMs`。持續停滯仍指向 Proxy/DNS/IPv6。 |
| `setMyCommands` 在啟動時被拒絕 | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`       | 減少外掛/技能/自訂 Telegram 指令或停用原生選單。                                        |
| 已升級且允許清單阻擋您         | `openclaw security audit` 和設定允許清單   | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字發送者 ID。                     |

完整疑難排解：[Telegram 疑難排解](/zh-Hant/channels/telegram#troubleshooting)

## Discord

### Discord 故障特徵

| 症狀                     | 最快檢查                           | 修復                                                  |
| ------------------------ | ---------------------------------- | ----------------------------------------------------- |
| 機器人上線但無伺服器回覆 | `openclaw channels status --probe` | 允許伺服器/頻道並驗證訊息內容意圖。                   |
| 群組訊息被忽略           | 檢查日誌中的提及閘門遺漏           | 提及機器人或設定伺服器/頻道 `requireMention: false`。 |
| 缺少私訊回覆             | `openclaw pairing list discord`    | 批准私訊配對或調整私訊政策。                          |

完整疑難排解：[Discord 疑難排解](/zh-Hant/channels/discord#troubleshooting)

## Slack

### Slack 失敗特徵

| 症狀                      | 最快檢查                           | 修復                                                                                                                                |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已連接但無回應 | `openclaw channels status --probe` | 驗證 App token + Bot token 和所需範圍；在 SecretRef 支援的設定中留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私訊被封鎖                | `openclaw pairing list slack`      | 批准配對或放寬私訊政策。                                                                                                            |
| 頻道訊息被忽略            | 檢查 `groupPolicy` 和頻道允許清單  | 允許頻道或將政策切換為 `open`。                                                                                                     |

完整疑難排解：[Slack 疑難排解](/zh-Hant/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 失敗特徵

| 症狀                        | 最快檢查                                                                | 修復                                         |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 無連入事件                  | 驗證 webhook/伺服器連線性與 App 權限                                    | 修復 webhook URL 或 BlueBubbles 伺服器狀態。 |
| 在 macOS 上可傳送但無法接收 | 檢查 macOS 的訊息自動化隱私權限                                         | 重新授權 TCC 權限並重新啟動頻道程序。        |
| 私訊發送者被封鎖            | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配對或更新允許清單。                     |

完整疑難排解：

- [iMessage 疑難排解](/zh-Hant/channels/imessage#troubleshooting)
- [BlueBubbles 疑難排解](/zh-Hant/channels/bluebubbles#troubleshooting)

## Signal

### Signal 失敗特徵

| 症狀                        | 最快檢查                           | 修復                                          |
| --------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但機器人無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳號與接收模式。 |
| 私訊被封鎖                  | `openclaw pairing list signal`     | 批准發送者或調整私訊政策。                    |
| 群組回覆未觸發              | 檢查群組允許清單與提及模式         | 新增發送者/群組或放寬閘道。                   |

完整疑難排解：[Signal 疑難排解](/zh-Hant/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 失敗特徵

| 症狀                 | 最快檢查                               | 修復                                               |
| -------------------- | -------------------------------------- | -------------------------------------------------- |
| Bot 回覆「去火星了」 | 驗證設定中的 `appId` 和 `clientSecret` | 設定憑證或重新啟動閘道。                           |
| 沒有收到訊息         | `openclaw channels status --probe`     | 在 QQ 開放平台驗證憑證。                           |
| 語音未轉錄           | 檢查 STT 提供者設定                    | 設定 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主動訊息未送達       | 檢查 QQ 平台互動要求                   | 如果近期沒有互動，QQ 可能會阻擋機器人發起的訊息。  |

完整疑難排解：[QQ Bot 疑難排解](/zh-Hant/channels/qqbot#troubleshooting)

## Matrix

### Matrix 失效特徵

| 症狀                  | 最快速檢查                             | 修復                                                                  |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登入但忽略房間訊息  | `openclaw channels status --probe`     | 檢查 `groupPolicy`、房間允許清單以及提及閘控。                        |
| 私信未處理            | `openclaw pairing list matrix`         | 核准發送者或調整私信政策。                                            |
| 加密房間失敗          | `openclaw matrix verify status`        | 重新驗證裝置，然後檢查 `openclaw matrix verify backup status`。       |
| 備份還原擱置中/損壞   | `openclaw matrix verify backup status` | 執行 `openclaw matrix verify backup restore` 或使用復原金鑰重新執行。 |
| 交叉簽署/啟動外觀異常 | `openclaw matrix verify bootstrap`     | 一次性修復秘密儲存、交叉簽署和備份狀態。                              |

完整設定與設定檔：[Matrix](/zh-Hant/channels/matrix)
