---
summary: "針對各管道故障徵兆與修復的快速管道層級故障排除"
read_when:
  - 通道傳輸顯示已連線但回覆失敗
  - 在深入檢視提供商文件之前，您需要進行特定管道的檢查
title: "通道故障排除"
---

# 通道故障排除

當通道已連線但行為異常時，請使用此頁面。

## 指令階層

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
- `RPC probe: ok`
- 通道探測顯示已連線/就緒

## WhatsApp

### WhatsApp 故障徵兆

| 症狀                  | 最快檢查                                  | 修復                                |
| --------------------- | ----------------------------------------- | ----------------------------------- |
| 已連線但無私訊回覆    | `openclaw pairing list whatsapp`          | 批准傳送者或切換私訊政策/允許名單。 |
| 群組訊息被忽略        | 檢查 `requireMention` + 設定中的提及模式  | 提及機器人或放寬該群組的提及政策。  |
| 隨機斷線/重新登入迴圈 | `openclaw channels status --probe` + 日誌 | 重新登入並驗證憑證目錄是否健康。    |

完整故障排除：[/channels/whatsapp#troubleshooting-quick](/zh-Hant/channels/whatsapp#troubleshooting-quick)

## Telegram

### Telegram 故障徵兆

| 症狀                           | 最快檢查                                 | 修復                                                                |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| `/start` 但無可用的回覆流程    | `openclaw pairing list telegram`         | 批准配對或變更私訊政策。                                            |
| 機器人上線但群組保持靜默       | 驗證提及要求和機器人隱私模式             | 停用群組可見性的隱私模式或提及機器人。                              |
| 發送失敗並伴隨網路錯誤         | 檢查日誌中的 Telegram API 呼叫失敗       | 修復指向 `api.telegram.org` 的 DNS/IPv6/Proxy 路由。                |
| `setMyCommands` 在啟動時被拒絕 | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`     | 減少外掛程式/技能/自訂 Telegram 指令或停用原生選單。                |
| 升級後允許名單封鎖了您         | `openclaw security audit` 和設定允許名單 | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字傳送者 ID。 |

完整故障排除：[/channels/telegram#troubleshooting](/zh-Hant/channels/telegram#troubleshooting)

## Discord

### Discord 故障徵兆

| 症狀                     | 最快檢查                           | 修復                                                  |
| ------------------------ | ---------------------------------- | ----------------------------------------------------- |
| 機器人上線但無伺服器回覆 | `openclaw channels status --probe` | 允許伺服器/頻道並驗證訊息內容意圖。                   |
| 群組訊息被忽略           | 檢查日誌中是否有提及閘門遺漏       | 提及機器人或設定伺服器/頻道 `requireMention: false`。 |
| 缺少私訊回覆             | `openclaw pairing list discord`    | 核准私訊配對或調整私訊政策。                          |

完整疑難排解：[/channels/discord#troubleshooting](/zh-Hant/channels/discord#troubleshooting)

## Slack

### Slack 故障特徵

| 症狀                      | 最快檢查                           | 修復方法                                   |
| ------------------------- | ---------------------------------- | ------------------------------------------ |
| Socket 模式已連線但無回應 | `openclaw channels status --probe` | 驗證 App 權杖 + Bot 權杖和所需的權限範圍。 |
| 私訊被封鎖                | `openclaw pairing list slack`      | 核准配對或放寬私訊政策。                   |
| 頻道訊息被忽略            | 檢查 `groupPolicy` 和頻道允許清單  | 允許該頻道或將政策切換為 `open`。          |

完整疑難排解：[/channels/slack#troubleshooting](/zh-Hant/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特徵

| 症狀                        | 最快檢查                                                                | 修復方法                                     |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 無連入事件                  | 驗證 webhook/伺服器連線性和 App 權限                                    | 修復 webhook URL 或 BlueBubbles 伺服器狀態。 |
| 在 macOS 上可傳送但無法接收 | 檢查 macOS 訊息自動化的隱私權限                                         | 重新授予 TCC 權限並重新啟動頻道程序。        |
| 私訊發送者被封鎖            | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 核准配對或更新允許清單。                     |

完整疑難排解：

- [/channels/imessage#troubleshooting-macos-privacy-and-security-tcc](/zh-Hant/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#troubleshooting](/zh-Hant/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特徵

| 症狀                       | 最快檢查                           | 修復方法                                      |
| -------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但 Bot 無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳號和接收模式。 |
| 私訊被封鎖                 | `openclaw pairing list signal`     | 核准發送者或調整私訊政策。                    |
| 群組回覆未觸發             | 檢查群組允許清單和提及模式         | 新增發送者/群組或放寬閘門限制。               |

完整疑難排解：[/channels/signal#troubleshooting](/zh-Hant/channels/signal#troubleshooting)

## Matrix

### Matrix 故障特徵

| 症狀                 | 最快檢查                           | 修復方法                            |
| -------------------- | ---------------------------------- | ----------------------------------- |
| 已登入但忽略房間訊息 | `openclaw channels status --probe` | 檢查 `groupPolicy` 和房間允許清單。 |
| 私訊未處理           | `openclaw pairing list matrix`     | 批准發送者或調整私訊政策。          |
| 加密聊天室失敗       | 驗證加密模組和加密設定             | 啟用加密支援並重新加入/同步聊天室。 |

完整故障排除：[/channels/matrix#troubleshooting](/zh-Hant/channels/matrix#troubleshooting)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
