---
summary: "針對各通道故障徵兆與修復的快速通道層級疑難排解"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "通道疑難排解"
---

# 通道疑難排解

當通道已連線但行為異常時，請使用此頁面。

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
- `RPC probe: ok`
- 通道探測顯示已連線/就緒

## WhatsApp

### WhatsApp 故障徵兆

| 症狀                  | 最快檢查                                  | 修復                                |
| --------------------- | ----------------------------------------- | ----------------------------------- |
| 已連線但無私訊回覆    | `openclaw pairing list whatsapp`          | 核准發送者或切換私訊原則/允許清單。 |
| 群組訊息被忽略        | 檢查 `requireMention` + 設定中的提及模式  | 提及機器人或放寬該群組的提及原則。  |
| 隨機斷線/重新登入迴圈 | `openclaw channels status --probe` + 日誌 | 重新登入並驗證憑證目錄狀態健康。    |

完整疑難排解：[/channels/whatsapp#troubleshooting-quick](/zh-Hant/channels/whatsapp#troubleshooting-quick)

## Telegram

### Telegram 故障徵兆

| 症狀                           | 最快檢查                                   | 修復                                                                |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------- |
| `/start` 但無可用的回覆流程    | `openclaw pairing list telegram`           | 核准配對或變更私訊原則。                                            |
| 機器人上線但群組保持靜默       | 驗證提及要求和機器人隱私模式               | 停用群組可見性的隱私模式或提及機器人。                              |
| 傳送失敗並伴隨網路錯誤         | 檢查日誌中的 Telegram API 呼叫失敗         | 修復前往 `api.telegram.org` 的 DNS/IPv6/Proxy 路由。                |
| `setMyCommands` 在啟動時被拒絕 | 檢查日誌中的 `BOT_COMMANDS_TOO_MUCH`       | 減少外掛/技能/自訂 Telegram 指令或停用原生選單。                    |
| 升級後且允許清單將您阻擋       | `openclaw security audit` 和設定檔允許清單 | 執行 `openclaw doctor --fix` 或將 `@username` 替換為數字發送者 ID。 |

完整疑難排解：[/channels/telegram#troubleshooting](/zh-Hant/channels/telegram#troubleshooting)

## Discord

### Discord 故障徵兆

| 症狀                     | 最快檢查                           | 修復                                                  |
| ------------------------ | ---------------------------------- | ----------------------------------------------------- |
| 機器人上線但無伺服器回覆 | `openclaw channels status --probe` | 允許伺服器/頻道並驗證訊息內容意圖。                   |
| 群組訊息被忽略           | 檢查日誌中的提及過濾遺漏           | 提及機器人或設定伺服器/頻道 `requireMention: false`。 |
| 缺少私訊回覆             | `openclaw pairing list discord`    | 批准私訊配對或調整私訊政策。                          |

完整疑難排解：[/channels/discord#troubleshooting](/zh-Hant/channels/discord#troubleshooting)

## Slack

### Slack 失敗特徵

| 症狀                      | 最快檢查                           | 修復                                             |
| ------------------------- | ---------------------------------- | ------------------------------------------------ |
| Socket 模式已連線但無回應 | `openclaw channels status --probe` | 驗證 App token + Bot token 和所需範圍 (scopes)。 |
| 私訊被封鎖                | `openclaw pairing list slack`      | 批准配對或放寬私訊政策。                         |
| 頻道訊息被忽略            | 檢查 `groupPolicy` 和頻道允許清單  | 允許該頻道或將政策切換為 `open`。                |

完整疑難排解：[/channels/slack#troubleshooting](/zh-Hant/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 失敗特徵

| 症狀                        | 最快檢查                                                                | 修復                                         |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 無 inbound 事件             | 驗證 webhook/伺服器連線性與應用程式權限                                 | 修正 webhook URL 或 BlueBubbles 伺服器狀態。 |
| 在 macOS 上可發送但無法接收 | 檢查 Messages 自動化的 macOS 隱私權限                                   | 重新授予 TCC 權限並重新啟動通道程序。        |
| DM 發送者被封鎖             | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 核准配對或更新允許清單。                     |

完整疑難排解：

- [/channels/imessage#troubleshooting-macos-privacy-and-security-tcc](/zh-Hant/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#troubleshooting](/zh-Hant/channels/bluebubbles#troubleshooting)

## Signal

### Signal 失敗特徵

| 症狀                        | 最快速檢查                         | 修正                                          |
| --------------------------- | ---------------------------------- | --------------------------------------------- |
| Daemon 可連線但機器人無回應 | `openclaw channels status --probe` | 驗證 `signal-cli` daemon URL/帳戶與接收模式。 |
| DM 已封鎖                   | `openclaw pairing list signal`     | 核准發送者或調整 DM 政策。                    |
| 群組回覆未觸發              | 檢查群組許可清單和提及模式         | 新增發送者/群組或放寬閘門。                   |

完整疑難排解：[/channels/signal#troubleshooting](/zh-Hant/channels/signal#troubleshooting)

## Matrix

### Matrix 失敗特徵

| 症狀                 | 快速檢查                           | 修復                                |
| -------------------- | ---------------------------------- | ----------------------------------- |
| 已登入但忽略房間訊息 | `openclaw channels status --probe` | 檢查 `groupPolicy` 和房間許可清單。 |
| DM 未處理            | `openclaw pairing list matrix`     | 核准發送者或調整 DM 政策。          |
| 加密的房間失敗       | 驗證加密模組和加密設定             | 啟用加密支援並重新加入/同步房間。   |

完整故障排除：[/channels/matrix#troubleshooting](/zh-Hant/channels/matrix#troubleshooting)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
