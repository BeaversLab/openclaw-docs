---
summary: "建立可分享的 Gateway 診斷套件用於錯誤回報"
title: "診斷匯出"
read_when:
  - Preparing a bug report or support request
  - Debugging Gateway crashes, restarts, memory pressure, or oversized payloads
  - Reviewing what diagnostics data is recorded or redacted
---

OpenClaw 可以建立本機診斷 zip 檔案，可安全地附加至錯誤報告中。它結合了經過清理的 Gateway 狀態、健康狀況、日誌、配置結構，以及最近不含承載的穩定性事件。

## 快速開始

```bash
openclaw gateway diagnostics export
```

該指令會列印寫入的 zip 路徑。若要選擇路徑：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用於自動化：

```bash
openclaw gateway diagnostics export --json
```

## 匯出包含的內容

該 zip 檔案包括：

- `summary.md`：供支援使用的易讀概述。
- `diagnostics.json`：機器可讀的配置、日誌、狀態、健康狀況
  和穩定性資料摘要。
- `manifest.json`：匯出中繼資料和檔案清單。
- 經過清理的配置結構和非機密配置詳細資訊。
- 經過清理的日誌摘要和最近編輯過的日誌行。
- 盡力而為的 Gateway 狀態和健康快照。
- `stability/latest.json`：最新的持續性穩定性套件（如果有）。

即使 Gateway 處於不健康狀態，匯出內容仍然有用。如果 Gateway 無法
回應狀態或健康狀況請求，仍然會盡可能收集本機日誌、配置結構和最新
的穩定性套件。

## 隱私模型

診斷資料的設計目的是為了可分享。匯出內容保留了有助於除錯的營運資料
，例如：

- 子系統名稱、外掛程式 ID、提供者 ID、頻道 ID 和配置的模式
- 狀態碼、持續時間、位元組計數、佇列狀態和記憶體讀數
- 經過清理的日誌中繼資料和編輯過的營運訊息
- 配置結構和非機密功能設定

匯出內容會省略或編輯：

- 聊天文字、提示詞、指示、 webhook 內文和工具輸出
- 憑證、API 金鑰、權杖、Cookie 和機密值
- 原始請求或回應內文
- 帳戶 ID、訊息 ID、原始工作階段 ID、主機名稱和本機使用者名稱

當日誌訊息看起來像是使用者、聊天、提示詞或工具承載文字時，
匯出內容僅保留訊息已被省略的事實和位元組計數。

## 穩定性記錄器

當啟用診斷功能時，Gateway 預設會記錄有界的、不含承載的穩定性串流。這是用於營運事實，而非內容。

檢查即時記錄器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

檢查在嚴重錯誤退出、關機逾時或重啟啟動失敗後最新的持久化穩定性套件：

```bash
openclaw gateway stability --bundle latest
```

從最新的持久化套件建立診斷 zip 檔案：

```bash
openclaw gateway stability --bundle latest --export
```

當事件存在時，持久化套件位於 `~/.openclaw/logs/stability/` 下。

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
- `--url <url>`：用於狀態和健康狀態快照的 Gateway WebSocket URL。
- `--token <token>`：用於狀態和健康狀態快照的 Gateway 權杖。
- `--password <password>`：用於狀態和健康狀態快照的 Gateway 密碼。
- `--timeout <ms>`：狀態和健康狀態快照逾時。
- `--no-stability-bundle`：跳過持久化穩定性套件查詢。
- `--json`：列印機器可讀取的匯出中繼資料。

## 停用診斷功能

預設會啟用診斷功能。若要停用穩定性記錄器和診斷事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

停用診斷功能會減少錯誤報告的細節。這不會影響正常的 Gateway 日誌記錄。

## 相關主題

- [健康狀態檢查](/zh-Hant/gateway/health)
- [Gateway CLI](/zh-Hant/cli/gateway#gateway-diagnostics-export)
- [Gateway 協定](/zh-Hant/gateway/protocol#system-and-identity)
- [日誌記錄](/zh-Hant/logging)
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — 將診斷資料串流到收集器的獨立流程
