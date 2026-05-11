---
summary: "使用每個通道的故障特徵和修復方法進行快速通道級故障排除"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Channel troubleshooting"
---

當通道已連線但行為異常時，請使用本頁面。

## 指令階梯

請先依序執行這些指令：

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
- 通道探測顯示傳輸已連線，且在支援的情況下，顯示 `works` 或 `audit ok`

## WhatsApp

### WhatsApp 失敗特徵

| 症狀                  | 最快檢查                                       | 修正方法                                       |
| --------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 已連線但無私訊回覆    | `openclaw pairing list whatsapp`               | 核准發送者或切換私訊政策/允許清單。            |
| 群組訊息被忽略        | 檢查設定中的 `requireMention` + 提及模式       | 提及機器人或放寬該群組的提及政策。             |
| QR 登入逾時並顯示 408 | 檢查閘道 `HTTPS_PROXY` / `HTTP_PROXY` 環境變數 | 設定可連線的 Proxy；僅將 `NO_PROXY` 用於繞過。 |
| 隨機斷線/重新登入迴圈 | `openclaw channels status --probe` + 日誌      | 重新登入並驗證憑證目錄是否健康。               |

完整疑難排解：[WhatsApp troubleshooting](/zh-Hant/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 失敗特徵

| 症狀                           | 最快檢查                                   | 修正方法                                                                                      |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `/start` 但無可用的回覆流程    | `openclaw pairing list telegram`           | 核准配對或變更私訊政策。                                                                      |
| 機器人在線但群組保持沈默       | 驗證提及要求和機器人隱私模式               | 停用群組可見性的隱私模式或提及機器人。                                                        |
| 發送失敗並伴隨網路錯誤         | 檢查日誌中的 Telegram API 呼叫失敗         | 修正通往 `api.telegram.org` 的 DNS/IPv6/Proxy 路由。                                          |
| 輪詢停滯或重新連線緩慢         | 使用 `openclaw logs --follow` 進行輪詢診斷 | 升級；如果重新啟動是誤報，請調整 `pollingStallThresholdMs`。持續的停滯仍指向 Proxy/DNS/IPv6。 |
| `setMyCommands` 在啟動時被拒絕 | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`       | 減少外掛程式/技能/自訂 Telegram 指令或停用原生選單。                                          |
| 已升級且允許清單封鎖您         | `openclaw security audit` 和設定檔允許清單 | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字發送者 ID。                           |

完整疑難排解：[Telegram 疑難排解](/zh-Hant/channels/telegram#troubleshooting)

## Discord

### Discord 失敗特徵

| 症狀                   | 最快檢查                           | 修復                                                 |
| ---------------------- | ---------------------------------- | ---------------------------------------------------- |
| Bot 上線但無伺服器回應 | `openclaw channels status --probe` | 允許伺服器/頻道並驗證訊息內容意圖。                  |
| 群組訊息被忽略         | 檢查日誌中的提及過濾遺失           | 提及 Bot 或設定伺服器/頻道 `requireMention: false`。 |
| 缺少 DM 回覆           | `openclaw pairing list discord`    | 批准 DM 配對或調整 DM 政策。                         |

完整疑難排解：[Discord 疑難排解](/zh-Hant/channels/discord#troubleshooting)

## Slack

### Slack 失敗特徵

| 症狀                      | 最快檢查                           | 修復                                                                                                                                |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已連線但無回應 | `openclaw channels status --probe` | 驗證 App token + Bot token 及所需範圍；在 SecretRef 支援的設定中留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| DM 被封鎖                 | `openclaw pairing list slack`      | 批准配對或放寬 DM 政策。                                                                                                            |
| 頻道訊息被忽略            | 檢查 `groupPolicy` 和頻道允許清單  | 允許該頻道或將政策切換為 `open`。                                                                                                   |

完整疑難排解：[Slack 疑難排解](/zh-Hant/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 失敗特徵

| 症狀                        | 最快檢查                                                                | 修復                                         |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 無傳入事件                  | 驗證 webhook/伺服器連線性和 App 權限                                    | 修復 webhook URL 或 BlueBubbles 伺服器狀態。 |
| 在 macOS 上可傳送但無法接收 | 檢查 macOS 訊息自動化的隱私權限                                         | 重新授予 TCC 權限並重啟頻道程序。            |
| DM 發送者被封鎖             | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配對或更新允許清單。                     |

完整疑難排解：

- [iMessage 疑難排解](/zh-Hant/channels/imessage#troubleshooting)
- [BlueBubbles 疑難排解](/zh-Hant/channels/bluebubbles#troubleshooting)

## Signal

### Signal 失敗特徵

| 症狀                       | 最快檢查                           | 修復                                          |
| -------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但 Bot 無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳號和接收模式。 |
| DM 被封鎖                  | `openclaw pairing list signal`     | 核准傳送者或調整私訊政策。                    |
| 群組回覆未觸發             | 檢查群組允許清單和提及模式         | 新增傳送者/群組或放寬閘道。                   |

完整疑難排解：[Signal 疑難排解](/zh-Hant/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 失敗特徵

| 症狀                     | 最快檢查                               | 修復                                               |
| ------------------------ | -------------------------------------- | -------------------------------------------------- |
| Bot 回覆「gone to Mars」 | 驗證設定中的 `appId` 和 `clientSecret` | 設定憑證或重新啟動閘道。                           |
| 無接收訊息               | `openclaw channels status --probe`     | 在 QQ 開放平台驗證憑證。                           |
| 語音未轉錄               | 檢查 STT 提供者設定                    | 設定 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主動訊息未送達           | 檢查 QQ 平台互動要求                   | 若近期無互動，QQ 可能會封鎖 Bot 發起的訊息。       |

完整疑難排解：[QQ Bot 疑難排解](/zh-Hant/channels/qqbot#troubleshooting)

## Matrix

### Matrix 失敗特徵

| 症狀                      | 最快檢查                               | 修復                                                                  |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登入但忽略房間訊息      | `openclaw channels status --probe`     | 檢查 `groupPolicy`、房間允許清單和提及閘道。                          |
| 私訊未處理                | `openclaw pairing list matrix`         | 核准傳送者或調整私訊政策。                                            |
| 加密房間失敗              | `openclaw matrix verify status`        | 重新驗證裝置，然後檢查 `openclaw matrix verify backup status`。       |
| 備份還原待處理/損壞       | `openclaw matrix verify backup status` | 執行 `openclaw matrix verify backup restore` 或使用復原金鑰重新執行。 |
| 交叉簽署/引導程序顯示異常 | `openclaw matrix verify bootstrap`     | 一次性修復秘密儲存、交叉簽署和備份狀態。                              |

完整設定與配置：[Matrix](/zh-Hant/channels/matrix)

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting)
