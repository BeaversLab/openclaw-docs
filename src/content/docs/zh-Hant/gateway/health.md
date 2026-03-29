---
summary: "檢查通道連線的健康檢查步驟"
read_when:
  - Diagnosing WhatsApp channel health
title: "健康檢查"
---

# 健康檢查 (CLI)

不用猜測就能驗證通道連線的簡短指南。

## 快速檢查

- `openclaw status` — 本機摘要：閘道連線性/模式、更新提示、連結通道驗證期限、工作階段 + 近期活動。
- `openclaw status --all` — 完整的本機診斷（唯讀、色彩標示、貼上以進行除錯是安全的）。
- `openclaw status --deep` — 也會探測正在執行的閘道（支援時會進行逐通道探測）。
- `openclaw health --json` — 向正在執行的閘道詢問完整的健康快照（僅限 WS；無直接 Baileys socket）。
- 在 WhatsApp/WebChat 中傳送 `/status` 作為獨立訊息，以取得狀態回覆而不觸發代理程式。
- 日誌：tail `/tmp/openclaw/openclaw-*.log` 並過濾 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度診斷

- 磁碟上的憑證：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 應該是最近的）。
- 工作階段儲存：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路徑可在設定中覆寫）。計數和最近的收件者會透過 `status` 顯示。
- 重新連結流程：當日誌中出現狀態碼 409–515 或 `loggedOut` 時，使用 `openclaw channels logout && openclaw channels login --verbose`。（注意：配對後，QR 登入流程會針對狀態 515 自動重新啟動一次）。

## 健康監控設定

- `gateway.channelHealthCheckMinutes`：閘道檢查通道健康的頻率。預設值：`5`。設定 `0` 以全域停用健康監控重新啟動。
- `gateway.channelStaleEventThresholdMinutes`：連線的通道在健康監控將其視為過期並重新啟動之前可以閒置的時間長度。預設值：`30`。將此值設定為大於或等於 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶的健康監控重新啟動的滾動一小時上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全域監控啟用的同時，停用特定通道的 health-monitor 重新啟動功能。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶覆寫設定，其優先順序高於通道層級的設定。
- 這些每個通道的覆寫設定適用於目前公開支援的內建通道監控器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 當發生失敗時

- `logged out` 或狀態碼 409–515 → 使用 `openclaw channels logout` 重新連結，然後 `openclaw channels login`。
- 無法連線至 Gateway → 啟動它：`openclaw gateway --port 18789` (如果連接埠忙碌，請使用 `--force`)。
- 未收到傳入訊息 → 確認連結的手機在線上，且發送者已被允許 (`channels.whatsapp.allowFrom`)；對於群組聊天，請確保允許清單 + 提及規則相符 (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`)。

## 專用的 "health" 指令

`openclaw health --json` 會向正在執行的 Gateway 要求其健康快照 (CLI 不直接使用通道 socket)。它會在可用時回報連結的憑證/驗證時間、每個通道的探查摘要、session-store 摘要以及探查持續時間。如果 Gateway 無法連線或探查失敗/逾時，它會以非零狀態碼結束。使用 `--timeout <ms>` 覆寫預設的 10 秒。
