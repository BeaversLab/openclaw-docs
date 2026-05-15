---
summary: "建立可分享的 Gateway 診斷套件用於錯誤回報"
title: "診斷匯出"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw 可以建立本地診斷的 zip 檔案用於錯誤回報。它結合了
經過清理的 Gateway 狀態、健康狀況、日誌、配置形狀以及最近的無承載
穩定性事件。

在您審查診斷套件之前，請將其視為機密處理。它們的設計
旨在省略或編輯承載和憑證，但它們仍然總結了
本地 Gateway 日誌和主機層級的執行狀態。

## 快速入門

```bash
openclaw gateway diagnostics export
```

該命令會列印出寫入的 zip 路徑。若要選擇路徑：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用於自動化：

```bash
openclaw gateway diagnostics export --json
```

## 聊天命令

擁有者可以在聊天中使用 `/diagnostics [note]` 來請求本地 Gateway 匯出。
當錯誤發生在真實對話中，並且您想要一個
可複製貼上的報告給支援團隊時，請使用此功能：

1. 在您發現問題的對話中傳送 `/diagnostics`。如果有幫助的話，
   請加上簡短說明，例如 `/diagnostics bad tool choice`。
2. OpenClaw 會傳送診斷前言並要求一次明確的執行
   核准。核准會執行 `openclaw gateway diagnostics export --json`。
   請不要透過允許所有的規則來核准診斷。
3. 核准後，OpenClaw 會回覆一個可貼上的報告，其中包含本地
   套件路徑、清單摘要、隱私權說明以及相關的 session ID。

在群組聊天中，擁有者仍然可以執行 `/diagnostics`，但 OpenClaw 不會
將診斷詳細資訊貼回共享聊天中。它會透過私人的核准路徑將前言、
核准提示、Gateway 匯出結果以及 Codex session/thread 分解資訊傳送給
擁有者。群組只會收到一個簡短的通知，
指出診斷流程已私下傳送。如果 OpenClaw 找不到私人的
擁有者路徑，該命令會以封閉式失敗，並要求擁有者從 DM 中執行它。

當使用中的 OpenClaw 工作階段使用原生 OpenAI Codex harness 時，相同的 exec 批准也涵蓋了針對 OpenClaw 已知之 Codex 執行時緒 (runtime threads) 的 OpenAI 回饋上傳。該上傳與本機 Gateway zip 檔案分開，且僅會出現在 Codex harness 工作階段中。在批准之前，提示會說明批准診斷也將發送 Codex 回饋，但不會列出 Codex 工作階段或執行緒 ID。批准後，聊天回覆會列出頻道、OpenClaw 工作階段 ID、Codex 執行緒 ID，以及已傳送至 OpenAI 伺服器之執行緒的本機恢復命令。如果您拒絕或忽略該批准，OpenClaw 將不會執行匯出，不會發送 Codex 回饋，也不會列印 Codex ID。

這使得常見的 Codex 除錯循環變得簡短：在 Telegram、Discord 或其他頻道中注意到不良行為，執行 `/diagnostics`，批准一次，將報告分享給支援團隊，然後如果您想自行檢查原生 Codex 執行緒，可以在本機執行列印出的 `codex resume <thread-id>` 命令。請參閱 [Codex harness](/zh-Hant/plugins/codex-harness#inspect-codex-threads-locally) 以了解該檢查工作流程。

## 匯出包含的內容

該 zip 檔案包含：

- `summary.md`：供支援人員閱讀的概覽。
- `diagnostics.json`：機器可讀的設定、日誌、狀態、健康狀況和穩定性數據摘要。
- `manifest.json`：匯出中繼資料 (metadata) 和檔案列表。
- 經過清理的設定形狀 (config shape) 和非祕密的設定細節。
- 經過清理的日誌摘要和最近的經過編修的日誌行。
- 盡力而為的 Gateway 狀態和健康狀況快照。
- `stability/latest.json`：最新的已持久化穩定性套件 (bundle) (如果可用)。

即使 Gateway 處於不健康狀態，該匯出仍然有用。如果 Gateway 無法回應狀態或健康狀況請求，本機日誌、設定形狀和最新的穩定性套件在可用時仍會被收集。

## 隱私模型

診斷資料的設計旨在可共享。匯出保留有助於除錯的運作數據，例如：

- 子系統名稱、外掛程式 ID、提供者 ID、頻道 ID 和設定模式
- 狀態碼、持續時間、位元組計數、佇列狀態和記憶體讀數
- 經過清理的日誌中繼資料和經過編修的運作訊息
- 設定形狀和非祕密的功能設定

匯出會省略或編修：

- 聊天文字、提示詞、指令、webhook 內文以及工具輸出
- 憑證、API 金鑰、權杖、Cookie 以及機密值
- 原始請求或回應內文
- 帳戶 ID、訊息 ID、原始工作階段 ID、主機名稱以及本機使用者名稱

當日誌訊息看起來像是使用者、聊天、提示詞或工具的內容文字時，匯出內容僅會保留該訊息已被省略的註記以及位元組計數。

## 穩定性記錄器

當啟用診斷功能時，Gateway 預設會記錄一個有界限且不含內容的穩定性串流。它是用於記錄運作事實，而非內容資料。

當 Gateway 持續運作但 Node.js 事件迴圈或 CPU 看起來飽和時，相同的診斷心跳會記錄存活度樣本。這些 `diagnostic.liveness.warning` 事件包含事件迴圈延遲、事件迴圈使用率、CPU 核心比例、作用中/等待/佇列中的工作階段計數、目前已知啟動/執行階段、最近的階段跨度，以及有界限的作用中/已佇列工作標籤。閒置樣本會保留在 `info` 層級的遙測資料中。僅當工作正在等待或佇列中，或是當作用中工作與持續的事件迴圈延遲重疊時，存活度樣本才會變成 Gateway 警告。在原本健康的背景工作期間發生的短暫最大延遲尖峰會保留在除錯日誌中。它們本身不會重新啟動 Gateway。

啟動階段也會發出具有牆上時鐘和 CPU 計時的 `diagnostic.phase.completed` 事件。停滯的嵌入式執行診斷會在最近的橋接器進度看起來已終止時標記 `terminalProgressStale=true`，例如原始回應項目或回應完成事件，但 Gateway 仍視為嵌入式執行為作用中狀態。

檢查即時記錄器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在發生嚴重錯誤退出、關機逾時或重新啟動啟動失敗後，檢查最新保存的穩定性套件：

```bash
openclaw gateway stability --bundle latest
```

從最新保存的套件建立診斷 zip 檔案：

```bash
openclaw gateway stability --bundle latest --export
```

當事件存在時，保存的套件位於 `~/.openclaw/logs/stability/` 之下。

## 實用選項

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>`：寫入至指定的 zip 路徑。
- `--log-lines <count>`：要包含的已清理日誌行數上限。
- `--log-bytes <bytes>`：要檢查的日誌位元組數上限。
- `--url <url>`：用於狀態和健康快照的 Gateway WebSocket URL。
- `--token <token>`：用於狀態和健康快照的 Gateway 權杖。
- `--password <password>`：用於狀態和健康快照的 Gateway 密碼。
- `--timeout <ms>`：狀態和健康快照逾時。
- `--no-stability-bundle`：略過持久化的穩定性套件查閱。
- `--json`：列印機器可讀的匯出中繼資料。

## 停用診斷

預設會啟用診斷功能。若要停用穩定性記錄器和診斷事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

停用診斷會減少錯誤回報的細節。這不會影響正常的 Gateway 記錄。

## 相關

- [健康檢查](/zh-Hant/gateway/health)
- [Gateway CLI](/zh-Hant/cli/gateway#gateway-diagnostics-export)
- [Gateway 通訊協定](/zh-Hant/gateway/protocol#system-and-identity)
- [記錄](/zh-Hant/logging)
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — 將診斷資料串流至收集器的獨立流程
