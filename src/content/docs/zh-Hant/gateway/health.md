---
summary: "檢查通道連線的步驟"
read_when:
  - Diagnosing WhatsApp channel health
title: "Health Checks"
---

# Health Checks (CLI)

驗證通道連線的簡短指南，無需猜測。

## 快速檢查

- `openclaw status` — 本地摘要：閘道連線性/模式、更新提示、連結通道驗證時間、會話 + 近期活動。
- `openclaw status --all` — 完整本地診斷（唯讀、色彩，貼上除錯時安全）。
- `openclaw status --deep` — 也會探測正在執行的閘道（支援時會進行各通道探測）。
- `openclaw health --json` — 向正在執行的閘道請求完整的健康快照（僅限 WS；無直接 Baileys socket）。
- 在 WhatsApp/WebChat 中將 `/status` 作為獨立訊息發送，即可獲得狀態回覆，無需呼叫代理程式。
- 日誌：使用 tail `/tmp/openclaw/openclaw-*.log` 並篩選 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度診斷

- 磁碟上的憑證：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 應為最近時間）。
- Session store：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路徑可在設定中覆寫）。計數與最近的收件者會透過 `status` 顯示。
- 重新連結流程：當日誌中出現狀態碼 409–515 或 `loggedOut` 時，執行 `openclaw channels logout && openclaw channels login --verbose`。（註記：QR 登入流程在配對後若出現狀態碼 515，會自動重啟一次。）

## Health monitor config

- `gateway.channelHealthCheckMinutes`：閘道檢查通道健康狀況的頻率。預設值：`5`。設定 `0` 以全域停用 health-monitor 重新啟動。
- `gateway.channelStaleEventThresholdMinutes`：連線的通道在健康監視器將其視為過時並重新啟動之前，可以閒置的時間長度。預設值：`30`。請將此值設定為大於或等於 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶的健康監視器重新啟動次數的滾動一小時上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：停用特定通道的健康監視器重新啟動，同時保持全域監視啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶覆寫設定，其優先級高於通道層級的設定。
- 這些每通道的覆寫設定適用於目前公開支援的內建通道監視器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 當發生失敗時

- `logged out` 或狀態碼 409–515 → 使用 `openclaw channels logout` 重新連結，然後 `openclaw channels login`。
- 無法連線至 Gateway → 啟動它：`openclaw gateway --port 18789`（如果連接埠被佔用，請使用 `--force`）。
- 沒有收到傳入訊息 → 確認連結的手機在線，且允許發送者（`channels.whatsapp.allowFrom`）；對於群組聊天，確保許可清單 + 提及規則相符（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 專用的「health」指令

`openclaw health --json` 會向正在執行的 Gateway 要求其健康狀態快照（CLI 不會直接連接通道 socket）。它會回報可用的連結憑證/驗證時效、各通道探測摘要、session-store 摘要以及探測持續時間。如果 Gateway 無法連線或探測失敗/逾時，它會以非零狀態碼結束。請使用 `--timeout <ms>` 覆寫預設的 10 秒設定。
