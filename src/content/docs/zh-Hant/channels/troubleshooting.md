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

| 症狀                      | 最快檢查                                       | 修復                                                                                           |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 已連線但無私訊回覆        | `openclaw pairing list whatsapp`               | 核准發送者或切換私訊原則/允許清單。                                                            |
| 群組訊息被忽略            | 檢查 `requireMention` + 設定中的提及模式       | 提及機器人或放寬該群組的提及原則。                                                             |
| QR 登入逾時並顯示 408     | 檢查閘道 `HTTPS_PROXY` / `HTTP_PROXY` 環境變數 | 設定可連線的 Proxy；僅在需要繞過時使用 `NO_PROXY`。                                            |
| 隨機斷線/重新登入迴圈     | `openclaw channels status --probe` + 日誌      | 即使目前連線中，最近的重新連線仍會被標記；請監控日誌，重新啟動閘道，如果持續不穩定則重新連結。 |
| 回覆延遲數秒/數分鐘才到達 | `openclaw doctor --fix`                        | 當已驗證的過時本機 TUI 客戶端降低閘道事件迴圈效能時，Doctor 會將其停止。                       |

完整疑難排解：[WhatsApp 疑難排解](/zh-Hant/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特徵

| 症狀                           | 最快檢查                                 | 修復                                                                                                      |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/start` 但沒有可用的回覆流程  | `openclaw pairing list telegram`         | 批准配對或變更私人訊息政策。                                                                              |
| Bot 線上但群組保持靜默         | 驗證提及要求和 Bot 隱私模式              | 停用隱私模式以取得群組可見性或提及 Bot。                                                                  |
| 傳送失敗並伴隨網路錯誤         | 檢查日誌中的 Telegram API 呼叫失敗       | 修復指向 `api.telegram.org` 的 DNS/IPv6/Proxy 路由。                                                      |
| 啟動回報 `getMe returned 401`  | 檢查已配置的權杖來源                     | 重新複製或重新產生 BotFather 權杖並更新 `botToken`、`tokenFile` 或 default-account `TELEGRAM_BOT_TOKEN`。 |
| 輪詢停滯或重新連線緩慢         | `openclaw logs --follow` 進行輪詢診斷    | 升級；如果重新啟動是誤報，請調整 `pollingStallThresholdMs`。持續停滯仍然指向 Proxy/DNS/IPv6。             |
| `setMyCommands` 在啟動時被拒絕 | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`     | 減少外掛程式/技能/自訂 Telegram 指令或停用原生選單。                                                      |
| 升級後允許清單阻擋您           | `openclaw security audit` 和配置允許清單 | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字傳送者 ID。                                       |

完整疑難排解：[Telegram 疑難排解](/zh-Hant/channels/telegram#troubleshooting)

## Discord

### Discord 故障徵兆

| 徵兆                                 | 最快檢查                                                                             | 修正                                                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot 線上但無伺服器回覆               | `openclaw channels status --probe`                                                   | 允許伺服器/頻道並驗證訊息內容意圖。                                                                                                                                                                                             |
| 群組訊息被忽略                       | 檢查日誌中的提及閘門遺漏                                                             | 提及 Bot 或設定伺服器/頻道 `requireMention: false`。                                                                                                                                                                            |
| 正在輸入/使用權杖但沒有 Discord 訊息 | 檢查這是環境房間事件還是模型遺漏了 `message(action=send)` 的已選 `message_tool` 房間 | 檢查閘道詳細日誌中的隱藏最終負載元資料，驗證 `messages.groupChat.unmentionedInbound`，閱讀 [Ambient room events](/zh-Hant/channels/ambient-room-events)，或是針對一般群組請求保持 `messages.groupChat.visibleReplies: "automatic"`。 |
| 缺少私人訊息回覆                     | `openclaw pairing list discord`                                                      | 批准私人訊息配對或調整私人訊息政策。                                                                                                                                                                                            |

完整疑難排解：[Discord 疑難排解](/zh-Hant/channels/discord#troubleshooting)

## Slack

### Slack 故障徵兆

| 徵兆                        | 最快檢查                           | 修正                                                                                                                                    |
| --------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已連線但沒有回應 | `openclaw channels status --probe` | 驗證 App token + Bot token 和所需的範圍；在基於 SecretRef 的設定上，留意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| DMs 已封鎖                  | `openclaw pairing list slack`      | 批准配對或放寬 DM 政策。                                                                                                                |
| 頻道訊息被忽略              | 檢查 `groupPolicy` 和頻道允許清單  | 允許該頻道或將策略切換為 `open`。                                                                                                       |

完整疑難排解：[Slack 疑難排解](/zh-Hant/channels/slack#troubleshooting)

## iMessage

### iMessage 故障特徵

| 症狀                           | 快速檢查                                              | 修復                                                                |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `imsg` 缺失或在非 macOS 上失敗 | `openclaw channels status --probe --channel imessage` | 在 Messages Mac 上執行 OpenClaw，或是為 `cliPath` 使用 SSH 包裝器。 |
| 在 macOS 上可發送但無法接收    | 檢查訊息自動化的 macOS 隱私權限                       | 重新授予 TCC 權限並重新啟動頻道程序。                               |
| DM 發送者被封鎖                | `openclaw pairing list imessage`                      | 批准配對或更新允許清單。                                            |

完整疑難排解：

- [iMessage 疑難排解](/zh-Hant/channels/imessage#troubleshooting)

## Signal

### Signal 故障特徵

| 症狀                       | 快速檢查                           | 修復                                          |
| -------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但 Bot 無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳戶和接收模式。 |
| DM 已封鎖                  | `openclaw pairing list signal`     | 批准發送者或調整 DM 政策。                    |
| 群組回覆未觸發             | 檢查群組允許清單和提及模式         | 新增發送者/群組或放寬閘道。                   |

完整疑難排解：[Signal 疑難排解](/zh-Hant/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 故障特徵

| 症狀                     | 快速檢查                               | 修復                                               |
| ------------------------ | -------------------------------------- | -------------------------------------------------- |
| Bot 回覆「gone to Mars」 | 驗證設定中的 `appId` 和 `clientSecret` | 設定憑證或重新啟動閘道。                           |
| 沒有傳入訊息             | `openclaw channels status --probe`     | 驗證 QQ 開放平台上的憑證。                         |
| 語音未轉錄               | 檢查 STT 提供者設定                    | 設定 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主動訊息未送達           | 檢查 QQ 平台互動要求                   | 若近期沒有互動，QQ 可能會封鎖 Bot 發起的訊息。     |

完整疑難排解：[QQ Bot 疑難排解](/zh-Hant/channels/qqbot#troubleshooting)

## Matrix

### Matrix 失敗徵兆

| 症狀                          | 最快速檢查                             | 修復                                                                  |
| ----------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登入但忽略房間訊息          | `openclaw channels status --probe`     | 檢查 `groupPolicy`、房間允許清單和提及閘控。                          |
| 私訊未處理                    | `openclaw pairing list matrix`         | 核准發送者或調整私訊原則。                                            |
| 加密房間失敗                  | `openclaw matrix verify status`        | 重新驗證裝置，然後檢查 `openclaw matrix verify backup status`。       |
| 備份還原待處理/失敗           | `openclaw matrix verify backup status` | 執行 `openclaw matrix verify backup restore` 或使用復原金鑰重新執行。 |
| 交叉簽署/啟動狀態看起來不正確 | `openclaw matrix verify bootstrap`     | 一次性修復秘密儲存、交叉簽署和備份狀態。                              |

完整設定與配置：[Matrix](/zh-Hant/channels/matrix)

## 相關

- [配對](/zh-Hant/channels/pairing)
- [通道路由](/zh-Hant/channels/channel-routing)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting)
