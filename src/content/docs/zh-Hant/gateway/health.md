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

對於 Discord 和其他聊天提供商，會話資料行並不代表 Socket 的存活狀態。
`openclaw sessions`、Gateway `sessions.list` 和代理程式 `sessions_list` 工具
讀取儲存的對話狀態。在具體化任何新的會話資料行之前，提供商可能會重新連線並顯示正常的通道
狀態。請使用上述的通道狀態和
健康狀態指令進行即時連線檢查。

## 深入診斷

- 磁碟上的認證資訊：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (mtime 應為最近的)。
- 會話儲存：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (路徑可在設定中覆寫)。計數和最近的收件者會透過 `status` 顯示。
- 重新連結流程：當記錄檔中出現狀態碼 409–515 或 `loggedOut` 時，請執行 `openclaw channels logout && openclaw channels login --verbose`。（註：配對後，若狀態為 515，QR 登入流程會自動重新啟動一次。）
- 預設會啟用診斷功能。除非設定了 `diagnostics.enabled: false`，否則閘道會記錄運作事實。記憶體事件會記錄 RSS/堆疊 位元組計數、閾值壓力與成長壓力。嚴重的記憶體壓力會透過閘道記錄器 記錄日誌。當設定 `diagnostics.memoryPressureSnapshot: true` 時，嚴重的記憶體壓力也會寫入 OOM 前的穩定性套件，包含 V8 堆疊統計資料（如有）、Linux cgroup 計數器（如有）、作用中的資源計數，以及依過濾後相對路徑排序的最大工作階段/逐字稿 檔案。活躍度警示 會在程序運作但飽和時，記錄事件迴圈延遲、事件迴圈使用率、CPU 核心比例，以及作用中/等待/佇列中的工作階段計數。超大型承載事件 會記錄被拒絕、截斷或分塊的內容，以及可取得的尺寸與限制。它們不會記錄訊息文字、附件內容、Webhook 內文、原始要求或回應內文、權杖、Cookie 或機密值。相同的心跳會啟動有界的穩定性記錄器，可透過 `openclaw gateway stability` 或 `diagnostics.stability` Gateway RPC 存取。當事件存在時，嚴重的閘道終止、關機逾時與重新啟動啟動失敗會將最新的記錄器快照 持久化在 `~/.openclaw/logs/stability/`；只有當設定 `diagnostics.memoryPressureSnapshot: true` 時，嚴重的記憶體壓力才會如此。請使用 `openclaw gateway stability --bundle latest` 檢查最新儲存的套件。
- 若要回報錯誤，請執行 `openclaw gateway diagnostics export` 並附加產生的 zip 檔。此匯出項目會結合 Markdown 摘要、最新的穩定性套件、已清理的日誌詮釋資料、已清理的閘道狀態/健康快照，以及組態形狀。此項目適合分享：聊天文字、webhook 內文、工具輸出、憑證、Cookie、帳戶/訊息識別碼，以及機密值皆會被省略或過濾。請參閱[診斷匯出](/zh-Hant/gateway/diagnostics)。

## 健康監控器配置

- `gateway.channelHealthCheckMinutes`：閘道檢查通道健康的頻率。預設值：`5`。設定 `0` 以全域停用 health-monitor 重新啟動。
- `gateway.channelStaleEventThresholdMinutes`：已連線通道在健康監視器將其視為過時並重新啟動之前，可以保持閒置的時間長度。預設值：`30`。請將此值設定為大於或等於 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶的健康監視器重新啟動次數的滾動一小時上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：針對特定通道停用健康監視器重新啟動，同時保持全域監視啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶覆寫設定，其優先級高於通道層級的設定。
- 這些針對特定通道的覆寫適用於目前支援的內建通道監控器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 當發生失敗時

- `logged out` 或狀態碼 409–515 → 先使用 `openclaw channels logout` 重新連結，然後執行 `openclaw channels login`。
- 無法連線到閘道 → 啟動它：`openclaw gateway --port 18789`（如果連接埠忙碌，請使用 `--force`）。
- 沒有收到傳入訊息 → 確認連結的手機在線上且發送者已獲授權（`channels.whatsapp.allowFrom`）；對於群組聊天，請確保允許清單 + 提及規則相符（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 專用的「health」指令

`openclaw health` 會向執行中的閘道詢問其健康狀態快照（CLI 沒有直接的通道 socket）。預設情況下，它可以返回新的快取閘道快照；然後閘道會在背景中重新整理該快取。`openclaw health --verbose` 則會強制進行即時探測。該指令會在可用時回報連結的憑證/授權存留時間、每通道探測摘要、會話儲存摘要以及探測持續時間。如果閘道無法連線或探測失敗/逾時，它會以非零狀態碼結束。

選項：

- `--json`：機器可讀的 JSON 輸出
- `--timeout <ms>`：覆寫預設的 10 秒探測逾時時間
- `--verbose`：強制進行即時探測並列印閘道連線詳細資訊
- `--debug`：`--verbose` 的別名

健康狀態快照包括：`ok`（布林值）、`ts`（時間戳）、`durationMs`（探測時間）、每通道狀態、代理可用性以及會話儲存摘要。

## 相關

- [Gateway runbook](/zh-Hant/gateway)
- [診斷資料匯出](/zh-Hant/gateway/diagnostics)
- [閘道器疑難排解](/zh-Hant/gateway/troubleshooting)
