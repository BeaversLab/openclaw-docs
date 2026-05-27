---
summary: "快速通道層級疑難排解，包含各通道故障特徵與修復方法"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "通道疑難排解"
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
- 通道探測顯示傳輸已連線，且在支援的情況下，`works` 或 `audit ok`

## 更新之後

當 Telegram、iMessage、BlueBubbles 時期的設定檔或其他外掛通道在更新後消失時，請使用此方法。

```bash
openclaw status --all
openclaw doctor --fix
openclaw gateway restart
openclaw status --all
```

尋找 `plugin load failed: dependency tree corrupted; run openclaw doctor
--fix` in `openclaw status --all`。這表示通道已設定，但外掛設定/載入路徑遇到了損毀的相依性樹，而非註冊通道。`openclaw doctor --fix` 會移除過時的外掛相依性暫存目錄和過時的認證陰影，然後 `openclaw gateway restart` 會重新載入乾淨的狀態。

## WhatsApp

### WhatsApp 故障特徵

| 症狀                               | 最快檢查                                       | 修復                                                                                           |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 已連線但無私訊回覆                 | `openclaw pairing list whatsapp`               | 核准發送者或切換私訊原則/允許清單。                                                            |
| 群組訊息被忽略                     | 檢查 `requireMention` + 設定中的提及模式       | 提及機器人或放寬該群組的提及原則。                                                             |
| QR 登入逾時並顯示 408              | 檢查閘道 `HTTPS_PROXY` / `HTTP_PROXY` 環境變數 | 設定可連線的 Proxy；僅在需要繞過時使用 `NO_PROXY`。                                            |
| 隨機斷線/重新登入迴圈              | `openclaw channels status --probe` + 日誌      | 即使目前連線中，最近的重新連線仍會被標記；請監控日誌，重新啟動閘道，如果持續不穩定則重新連結。 |
| `status=408 Request Time-out` 迴圈 | Probe、logs、doctor，然後是 gateway status     | 先修復主機連線/時序問題；如果迴圈持續存在，請備份認證並重新連結帳戶。                          |
| 回覆延遲數秒/數分鐘到達            | `openclaw doctor --fix`                        | 當已驗證的過期本地 TUI 用戶端導致 Gateway 事件迴圈效能下降時，Doctor 會將其停止。              |

完整疑難排解：[WhatsApp troubleshooting](/zh-Hant/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特徵

| 症狀                            | 最快檢查                                     | 修復                                                                                                        |
| ------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/start` 但無可用的回覆流程     | `openclaw pairing list telegram`             | 批准配對或變更 DM 政策。                                                                                    |
| Bot 上線但群組保持靜默          | 驗證提及要求與 bot 隱私模式                  | 停用群組可見性的隱私模式或提及 bot。                                                                        |
| 發送失敗並伴隨網路錯誤          | 檢查日誌中的 Telegram API 呼叫失敗           | 修復對 `api.telegram.org` 的 DNS/IPv6/Proxy 路由。                                                          |
| 啟動時回報 `getMe returned 401` | 檢查設定的 token 來源                        | 重新複製或重新產生 BotFather token 並更新 `botToken`、`tokenFile` 或 default-account `TELEGRAM_BOT_TOKEN`。 |
| 輪詢停滯或重連緩慢              | 執行 `openclaw logs --follow` 以進行輪詢診斷 | 升級；如果重啟是誤報，請調整 `pollingStallThresholdMs`。持續停滯仍指向 proxy/DNS/IPv6。                     |
| `setMyCommands` 在啟動時被拒絕  | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`         | 減少外掛/技能/自訂 Telegram 指令或停用原生選單。                                                            |
| 升級後許可清單封鎖了您          | `openclaw security audit` 和設定檔許可清單   | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字發送者 ID。                                         |

完整疑難排解：[Telegram troubleshooting](/zh-Hant/channels/telegram#troubleshooting)

## Discord

### Discord 故障特徵

| 症狀                                 | 最快檢查                                                                         | 修復                                                                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot 上線但沒有伺服器回覆             | `openclaw channels status --probe`                                               | 允許伺服器/頻道並驗證訊息內容意圖。                                                                                                                                                                                                 |
| 群組訊息被忽略                       | 檢查日誌中的提及閘門遺失                                                         | 提及 bot 或設定伺服器/頻道 `requireMention: false`。                                                                                                                                                                                |
| 輸入中/token 使用但沒有 Discord 訊息 | 檢查這是環境房間事件還是模型錯過的選用 `message_tool``message(action=send)` 房間 | 檢查閘道詳細日誌中是否有隱藏的最終負載元數據，驗證 `messages.groupChat.unmentionedInbound`，閱讀 [Ambient room events](/zh-Hant/channels/ambient-room-events)，或針對一般群組請求保持 `messages.groupChat.visibleReplies: "automatic"`。 |
| 缺少私訊回覆                         | `openclaw pairing list discord`                                                  | 核准私訊配對或調整私訊原則。                                                                                                                                                                                                        |

完整疑難排解：[Discord 疑難排解](/zh-Hant/channels/discord#troubleshooting)

## Slack

### Slack 失敗特徵

| 徵狀                      | 最快檢查                           | 修復                                                                                                                                      |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已連接但無回應 | `openclaw channels status --probe` | 驗證 App token + Bot token 以及所需的範圍；在基於 SecretRef 的設定中，留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私訊被封鎖                | `openclaw pairing list slack`      | 核准配對或放寬私訊原則。                                                                                                                  |
| 頻道訊息被忽略            | 檢查 `groupPolicy` 和頻道允許清單  | 允許該頻道或將原則切換為 `open`。                                                                                                         |

完整疑難排解：[Slack 疑難排解](/zh-Hant/channels/slack#troubleshooting)

## iMessage

### iMessage 失敗特徵

| 徵狀                           | 最快檢查                                              | 修復                                                              |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `imsg` 缺失或在非 macOS 上失敗 | `openclaw channels status --probe --channel imessage` | 在 Messages Mac 上執行 OpenClaw，或為 `cliPath` 使用 SSH 包裝器。 |
| 在 macOS 上可傳送但無法接收    | 檢查 Messages 自動化的 macOS 隱私權限                 | 重新授權 TCC 權限並重新啟動頻道程序。                             |
| 私訊發送者被封鎖               | `openclaw pairing list imessage`                      | 核准配對或更新允許清單。                                          |

完整疑難排解：

- [iMessage 疑難排解](/zh-Hant/channels/imessage#troubleshooting)

## Signal

### Signal 失敗特徵

| 徵狀                       | 最快檢查                           | 修復                                          |
| -------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但 Bot 無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳戶和接收模式。 |
| 私訊被封鎖                 | `openclaw pairing list signal`     | 核准發送者或調整私訊原則。                    |
| 群組回覆未觸發             | 檢查群組允許清單和提及模式         | 新增發送者/群組或放寬過濾條件。               |

完整疑難排解：[Signal 疑難排解](/zh-Hant/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 失敗特徵

| 症狀                     | 最快檢查                               | 修復                                               |
| ------------------------ | -------------------------------------- | -------------------------------------------------- |
| Bot 回覆「gone to Mars」 | 驗證設定中的 `appId` 和 `clientSecret` | 設定憑證或重新啟動閘道。                           |
| 沒有收到訊息             | `openclaw channels status --probe`     | 驗證 QQ 開放平台上的憑證。                         |
| 語音未轉錄               | 檢查 STT 提供者設定                    | 設定 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主動訊息未送達           | 檢查 QQ 平台互動要求                   | 如果沒有最近的互動，QQ 可能會阻擋 Bot 發起的訊息。 |

完整疑難排解：[QQ Bot 疑難排解](/zh-Hant/channels/qqbot#troubleshooting)

## Matrix

### Matrix 失敗特徵

| 症狀                          | 最快檢查                               | 修復                                                                  |
| ----------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登入但忽略房間訊息          | `openclaw channels status --probe`     | 檢查 `groupPolicy`、房間允許清單和提及閘門。                          |
| 私訊未處理                    | `openclaw pairing list matrix`         | 核准發送者或調整私訊原則。                                            |
| 加密房間失敗                  | `openclaw matrix verify status`        | 重新驗證裝置，然後檢查 `openclaw matrix verify backup status`。       |
| 備份還原擱置中/損壞           | `openclaw matrix verify backup status` | 執行 `openclaw matrix verify backup restore` 或使用復原金鑰重新執行。 |
| 交叉簽署/引導程序看起來不正確 | `openclaw matrix verify bootstrap`     | 一次性修復祕密儲存、交叉簽署和備份狀態。                              |

完整設定和組態：[Matrix](/zh-Hant/channels/matrix)

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting)
