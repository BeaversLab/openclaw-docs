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
- `RPC probe: ok`
- 通道探測顯示已連接/就緒

## WhatsApp

### WhatsApp 故障特徵

| 症狀                  | 最快檢查                                  | 修復                               |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| 已連接但無私訊回覆    | `openclaw pairing list whatsapp`          | 核准發送者或切換私訊策略/白名單。  |
| 群組訊息被忽略        | 檢查 `requireMention` + 設定中的提及模式  | 提及機器人或放寬該群組的提及策略。 |
| 隨機斷線/重新登入循環 | `openclaw channels status --probe` + 日誌 | 重新登入並驗證憑證目錄是否正常。   |

完整疑難排解：[/channels/whatsapp#troubleshooting](/en/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特徵

| 症狀                           | 最快檢查                               | 修復                                                                |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| `/start` 但無可用的回覆流程    | `openclaw pairing list telegram`       | 核准配對或更改私訊策略。                                            |
| 機器人線上但群組保持靜默       | 驗證提及要求和機器人隱私模式           | 停用隱私模式以取得群組可見性或提及機器人。                          |
| 發送失敗並伴隨網路錯誤         | 檢查日誌中是否有 Telegram API 呼叫失敗 | 修復通往 `api.telegram.org` 的 DNS/IPv6/ Proxy 路由。               |
| `setMyCommands` 在啟動時被拒絕 | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`   | 減少外掛/技能/自訂 Telegram 指令或停用原生選單。                    |
| 升級後白名單阻擋了您           | `openclaw security audit` 和設定白名單 | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字發送者 ID。 |

完整疑難排解：[/channels/telegram#troubleshooting](/en/channels/telegram#troubleshooting)

## Discord

### Discord 故障特徵

| 症狀                     | 最快檢查                           | 修復                                                |
| ------------------------ | ---------------------------------- | --------------------------------------------------- |
| 機器人線上但無伺服器回覆 | `openclaw channels status --probe` | 允許伺服器/頻道並驗證訊息內容意圖。                 |
| 群組訊息被忽略           | 檢查日誌中是否有提及閘門丟棄       | 提及機器人或設定公會/頻道 `requireMention: false`。 |
| 缺少 DM 回覆             | `openclaw pairing list discord`    | 批准 DM 配對或調整 DM 政策。                        |

完整疑難排解：[/channels/discord#troubleshooting](/en/channels/discord#troubleshooting)

## Slack

### Slack 失敗特徵

| 症狀                        | 最快檢查                           | 修復                                               |
| --------------------------- | ---------------------------------- | -------------------------------------------------- |
| Socket 模式已連接但沒有回應 | `openclaw channels status --probe` | 驗證 App token + Bot token 和所需的範圍 (scopes)。 |
| DM 已封鎖                   | `openclaw pairing list slack`      | 批准配對或放寬 DM 政策。                           |
| 頻道訊息被忽略              | 檢查 `groupPolicy` 和頻道允許清單  | 允許該頻道或將政策切換為 `open`。                  |

完整疑難排解：[/channels/slack#troubleshooting](/en/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 失敗特徵

| 症狀                          | 最快檢查                                                                | 修復                                         |
| ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 沒有傳入事件                  | 驗證 webhook/server 的連線性和 App 權限                                 | 修復 webhook URL 或 BlueBubbles 伺服器狀態。 |
| 在 macOS 上可以發送但無法接收 | 檢查 Messages 自動化的 macOS 隱私權限                                   | 重新授予 TCC 權限並重新啟動頻道程序。        |
| DM 發送者被封鎖               | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配對或更新允許清單。                     |

完整疑難排解：

- [/channels/imessage#troubleshooting](/en/channels/imessage#troubleshooting)
- [/channels/bluebubbles#troubleshooting](/en/channels/bluebubbles#troubleshooting)

## Signal

### Signal 失敗特徵

| 症狀                        | 最快檢查                           | 修復                                          |
| --------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但機器人無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳戶和接收模式。 |
| DM 已封鎖                   | `openclaw pairing list signal`     | 批准發送者或調整 DM 政策。                    |
| 群組回覆未觸發              | 檢查群組允許清單和提及模式         | 新增發送者/群組或放寬閘道。                   |

完整疑難排解：[/channels/signal#troubleshooting](/en/channels/signal#troubleshooting)

## QQ 機器人

### QQ 機器人故障特徵

| 症狀                       | 最快檢查                               | 修復                                               |
| -------------------------- | -------------------------------------- | -------------------------------------------------- |
| 機器人回覆「gone to Mars」 | 驗證設定中的 `appId` 和 `clientSecret` | 設定憑證或重新啟動閘道。                           |
| 無接收訊息                 | `openclaw channels status --probe`     | 驗證 QQ 開放平台上的憑證。                         |
| 語音未轉錄                 | 檢查 STT 供應商設定                    | 設定 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主動訊息未送達             | 檢查 QQ 平台互動要求                   | 若無近期互動，QQ 可能會封鎖機器人發起的訊息。      |

完整疑難排解：[/channels/qqbot#troubleshooting](/en/channels/qqbot#troubleshooting)

## Matrix

### Matrix 故障特徵

| 症狀                 | 最快檢查                           | 修復                                |
| -------------------- | ---------------------------------- | ----------------------------------- |
| 已登入但忽略房間訊息 | `openclaw channels status --probe` | 檢查 `groupPolicy` 和房間允許清單。 |
| 私訊 (DM) 未處理     | `openclaw pairing list matrix`     | 核准發送者或調整私訊 (DM) 政策。    |
| 加密房間失敗         | 驗證加密模組和加密設定             | 啟用加密支援並重新加入/同步房間。   |

完整設定與配置：[Matrix](/en/channels/matrix)
