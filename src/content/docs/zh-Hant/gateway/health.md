---
summary: "Health check commands and gateway health monitoring"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "Health checks"
---

驗證通道連線而不必猜測的簡短指南。

## 快速檢查

- `openclaw status` — 本地摘要：閘道連線性/模式、更新提示、連結通道驗證時間、工作階段 + 近期活動。
- `openclaw status --all` — 完整本地診斷（唯讀、彩色、貼上除錯安全）。
- `openclaw status --deep` — 詢問正在執行的閘道以進行即時健康探測（`health` 搭配 `probe:true`），包括支援時的每個帳戶通道探測。
- `openclaw health` — 詢問正在執行的閘道以取得其健康快照（僅限 WS；CLI 沒有直接的通道 socket）。
- `openclaw health --verbose` — 強制進行即時健康探測並列印閘道連線詳細資訊。
- `openclaw health --json` — 機器可讀的健康快照輸出。
- 在 WhatsApp/WebChat 中傳送 `/status` 作為獨立訊息，以獲得狀態回覆而不啟動代理程式。
- 日誌：tail `/tmp/openclaw/openclaw-*.log` 並過濾 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度診斷

- 磁碟上的憑證：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 應該是最近的）。
- 工作階段儲存：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路徑可以在設定中覆寫）。計數和最近的收件者會透過 `status` 顯示。
- 重新連結流程：當日誌中出現狀態碼 409–515 或 `loggedOut` 時執行 `openclaw channels logout && openclaw channels login --verbose`。（注意：配對後，QR 登入流程會針對狀態 515 自動重新啟動一次。）
- 診斷功能預設為啟用。除非設定了 `diagnostics.enabled: false`，否則閘道會記錄操作事實。記憶體事件會記錄 RSS/heap 位元組計數、臨界值壓力以及成長壓力。過大承載事件會記錄被拒絕、截斷或分塊的內容，並在可用時記錄其大小與限制。它們不會記錄訊息文字、附件內容、webhook 主體、原始請求或回應主體、權杖、Cookie 或秘密值。相同的心跳會啟動有界穩定性記錄器，可透過 `openclaw gateway stability` 或 `diagnostics.stability` Gateway RPC 存取。當事件存在時，嚴重的閘道退出、關機逾時以及重新啟動啟動失敗會將最新的記錄器快照保存在 `~/.openclaw/logs/stability/` 下；請使用 `openclaw gateway stability --bundle latest` 檢查最新儲存的套件。
- 若要回報錯誤，請執行 `openclaw gateway diagnostics export` 並附加產生的 zip 檔案。匯出內容包含 Markdown 摘要、最新的穩定性套件、經過清理的日誌中繼資料、經過清理的閘道狀態/健康快照以及配置形狀。此匯出內容旨在可供分享：聊天文字、webhook 主體、工具輸出、憑證、Cookie、帳戶/訊息識別碼和秘密值均會被省略或編輯。請參閱[診斷匯出](/zh-Hant/gateway/diagnostics)。

## 健康監控器配置

- `gateway.channelHealthCheckMinutes`：閘道檢查通道健康狀態的頻率。預設值：`5`。設定 `0` 以全域停用健康監控器重新啟動。
- `gateway.channelStaleEventThresholdMinutes`：連線的通道在健康監控器將其視為過時並重新啟動之前，可以保持閒置的時間。預設值：`30`。請將此值設定為大於或等於 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶在健康監控器重新啟動的滾動一小時上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：針對特定通道停用健康監控器重新啟動，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶覆寫設定，其優先順序高於通道層級的設定。
- 這些每個頻道的覆寫適用於目前公開支援的內建頻道監控器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 當發生失敗時

- `logged out` 或狀態碼 409–515 → 使用 `openclaw channels logout` 重新連結，然後 `openclaw channels login`。
- Gateway 無法連線 → 啟動它：`openclaw gateway --port 18789`（如果連接埠忙碌，則使用 `--force`）。
- 沒有收到訊息 → 確認連結的手機在線上且傳送者已被允許（`channels.whatsapp.allowFrom`）；對於群組聊天，請確保允許清單 + 提及規則符合（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 專用的「health」指令

`openclaw health` 會向執行中的 Gateway 請求其健康狀態快照（CLI 不會直接連接頻道 socket）。預設情況下，它可以傳回新的快取 Gateway 快照；然後 Gateway 會在背景重新整理該快取。`openclaw health --verbose` 則會強制進行即時探測。該指令會在可用時報告連結的憑證/驗證有效期、各頻道探測摘要、會話儲存摘要以及探測持續時間。如果 Gateway 無法連線或探測失敗/逾時，它會以非零狀態碼結束。

選項：

- `--json`：機器可讀的 JSON 輸出
- `--timeout <ms>`：覆寫預設的 10 秒探測逾時
- `--verbose`：強制進行即時探測並列印 Gateway 連線詳細資訊
- `--debug`：`--verbose` 的別名

健康狀態快照包括：`ok`（布林值）、`ts`（時間戳記）、`durationMs`（探測時間）、各頻道狀態、代理程式可用性以及會話儲存摘要。

## 相關

- [Gateway runbook](/zh-Hant/gateway)
- [Diagnostics export](/zh-Hant/gateway/diagnostics)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
