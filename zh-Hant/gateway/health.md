---
summary: "檢查通道連線狀態的步驟"
read_when:
  - Diagnosing WhatsApp channel health
title: "健康檢查"
---

# 健康檢查 (CLI)

驗證通道連線的簡短指南，無需猜測。

## 快速檢查

- `openclaw status` — 本機摘要：閘道可達性/模式、更新提示、連結通道驗證時間、工作階段 + 近期活動。
- `openclaw status --all` — 完整的本機診斷（唯讀、色彩標記、貼上除錯安全）。
- `openclaw status --deep` — 同時探測執行中的閘道（若支援，則會進行各通道探測）。
- `openclaw health --json` — 向執行中的閘道要求完整的健康狀態快照（僅限 WS；無直接的 Baileys socket）。
- 在 WhatsApp/WebChat 中將 `/status` 作為獨立訊息傳送，以獲得狀態回應而不觸發代理程式。
- 日誌：tail `/tmp/openclaw/openclaw-*.log` 並過濾 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度診斷

- 磁碟上的憑證：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 應為最近）。
- 工作階段存放區：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路徑可在設定中覆寫）。計數和近期收件者會透過 `status` 顯示。
- 重新連結流程：當日誌中出現狀態碼 409–515 或 `loggedOut` 時，執行 `openclaw channels logout && openclaw channels login --verbose`。（註記：配對後，針對狀態碼 515，QR 登入流程會自動重新啟動一次。）

## 健康監控設定

- `gateway.channelHealthCheckMinutes`：閘道檢查通道健康的頻率。預設值：`5`。設定 `0` 以全域停用健康監控重新啟動。
- `gateway.channelStaleEventThresholdMinutes`：已連線通道在健康監控視為過時並重新啟動前，可保持閒置的時間長度。預設值：`30`。請將此值保持大於或等於 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶健康監控重新啟動的一小時滾動上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全域監控啟用的同時，停用特定頻道的 health-monitor 重新啟動功能。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：覆寫頻道層級設定的多帳戶覆寫。
- 這些特定頻道的覆寫適用於目前公開此功能的內建頻道監控器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 當發生錯誤時

- `logged out` 或狀態碼 409–515 → 使用 `openclaw channels logout` 重新連結，然後執行 `openclaw channels login`。
- Gateway 無法連線 → 啟動它：`openclaw gateway --port 18789`（如果連接埠忙碌，請使用 `--force`）。
- 未收到傳入訊息 → 確認連結的手機已上線，且傳送者已獲授權（`channels.whatsapp.allowFrom`）；對於群組聊天，請確保允許清單 + 提及規則符合（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 專用的 "health" 指令

`openclaw health --json` 會向執行中的 Gateway 詢問其健康快照（CLI 不會直接連接頻道 socket）。它會回報連結的憑證/驗證使用時間（如有）、各頻道的探測摘要、會話儲存摘要以及探測持續時間。如果 Gateway 無法連線或探測失敗/逾時，它會以非零狀態碼結束。使用 `--timeout <ms>` 來覆寫預設的 10 秒。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
