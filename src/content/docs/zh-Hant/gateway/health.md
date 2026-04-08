---
summary: "Health check commands and gateway health monitoring"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "健康檢查"
---

# 健康檢查 (CLI)

不用猜測就能驗證通道連線的簡短指南。

## 快速檢查

- `openclaw status` — 本機摘要：閘道連線性/模式、更新提示、連結通道驗證期限、工作階段 + 近期活動。
- `openclaw status --all` — 完整的本機診斷（唯讀、色彩標示、貼上以進行除錯是安全的）。
- `openclaw status --deep` — 要求正在運行的閘道提供即時健康探測 (`health` 搭配 `probe:true`)，包括支援時的每個帳號通道探測。
- `openclaw health` — 要求正在運行的閘道提供其健康快照 (僅限 WS；CLI 無直接通道通訊端)。
- `openclaw health --verbose` — 強制進行即時健康探測並列印閘道連線詳細資訊。
- `openclaw health --json` — 機器可讀取的健康快照輸出。
- 在 WhatsApp/WebChat 中傳送 `/status` 作為獨立訊息，以取得狀態回覆而不觸發代理程式。
- 日誌：tail `/tmp/openclaw/openclaw-*.log` 並篩選 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深入診斷

- 磁碟上的認證：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (mtime 應為最近的)。
- Session 儲存區：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (路徑可在設定中覆寫)。計數和最近的收件者會透過 `status` 顯示。
- 重新連結流程：當日誌中出現狀態碼 409–515 或 `loggedOut` 時，執行 `openclaw channels logout && openclaw channels login --verbose`。(注意：配對後，QR 登入流程會針對狀態 515 自動重新啟動一次。)

## 健康監控器設定

- `gateway.channelHealthCheckMinutes`：閘道檢查通道健康的頻率。預設值：`5`。設定 `0` 以全域停用健康監控器重新啟動。
- `gateway.channelStaleEventThresholdMinutes`：連線的通道在健康監控器視其為過時並重新啟動之前，可以保持閒置的時間長度。預設值：`30`。請將此值設定為大於或等於 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳號的健康監控器重新啟動滾動一小時上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：停用特定通道的健康監控器重新啟動，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳號覆寫設定，其優先順序高於通道層級設定。
- 這些針對各個通道的覆寫適用於目前公開這些設定的內建通道監控器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 當發生錯誤時

- `logged out` 或狀態碼 409–515 → 使用 `openclaw channels logout` 重新連結，然後 `openclaw channels login`。
- Gateway 無法連線 → 啟動它：`openclaw gateway --port 18789`（如果埠號被佔用，請使用 `--force`）。
- 沒有收到訊息 → 確認已連結的手機在線上，且發送者已被允許（`channels.whatsapp.allowFrom`）；對於群組聊天，請確保允許清單 + 提及規則相符（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 專用的「health」指令

`openclaw health` 會詢問正在執行的 Gateway 其健康狀態快照（CLI 不會建立直接的通道 socket）。預設情況下，它可以傳回全新的快取 Gateway 快照；然後 Gateway 會在背景重新整理該快取。`openclaw health --verbose` 會強制改為進行即時探測。該指令會在可用時回報已連結的憑證/驗證時間、各通道探測摘要、session-store 摘要以及探測持續時間。如果 Gateway 無法連線或探測失敗/逾時，它會以非零狀態碼結束。

選項：

- `--json`：機器可讀的 JSON 輸出
- `--timeout <ms>`：覆寫預設的 10 秒探測逾時
- `--verbose`：強制進行即時探測並列印 Gateway 連線詳細資訊
- `--debug`：`--verbose` 的別名

健康狀態快照包含：`ok`（布林值）、`ts`（時間戳記）、`durationMs`（探測時間）、各通道狀態、代理程式可用性以及 session-store 摘要。
