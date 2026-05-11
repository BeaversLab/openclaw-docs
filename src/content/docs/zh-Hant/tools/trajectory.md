---
summary: "匯出已編輯的軌跡套件以用於偵錯 OpenClaw 代理程式工作階段"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "軌跢套件"
---

軌跢捕獲是 OpenClaw 的個別會話飛行紀錄器。它會記錄每個 Agent 執行的結構化時間軸，然後 `/export-trajectory` 將當前會話封裝成經過編輯的支援套件。

當您需要回答以下問題時使用它：

- 發送給模型的是什麼提示、系統提示和工具？
- 哪些對話訊息和工具呼叫導致了這個答案？
- 執行是否逾時、中止、壓縮或發生提供者錯誤？
- 啟用的是哪個模型、外掛、技能和執行時設定？
- 提供者回傳了什麼使用量和提示快取元資料？

## 快速開始

在作用中的會話中傳送此內容：

```text
/export-trajectory
```

別名：

```text
/trajectory
```

OpenClaw 會將套件寫入工作區下：

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

您可以選擇相對輸出目錄名稱：

```text
/export-trajectory bug-1234
```

自訂路徑是在 `.openclaw/trajectory-exports/` 內解析。絕對路徑和 `~` 路徑會被拒絕。

## 存取

軌跢匯出是一個擁有者指令。傳送者必須通過正常的指令授權檢查和頻道的擁有者檢查。

## 記錄內容

OpenClaw Agent 執行預設會開啟軌跢捕獲。

執行時事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.completed`
- `trace.artifacts`
- `session.ended`

對話事件也會從作用中的會話分支重建：

- 使用者訊息
- 助理訊息
- 工具呼叫
- 工具結果
- 壓縮
- 模型變更
- 標籤和自訂會話項目

事件會以帶有此架構標記的 JSON Lines 寫入：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## 套件檔案

匯出的套件可以包含：

| 檔案                  | 內容                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `manifest.json`       | 套件架構、來源檔案、事件計數和產生的檔案清單                     |
| `events.jsonl`        | 已排序的執行時和對話時間軸                                       |
| `session-branch.json` | 經過編輯的作用中對話分支和會話標頭                               |
| `metadata.json`       | OpenClaw 版本、OS/執行時、模型、設定快照、外掛、技能和提示元資料 |
| `artifacts.json`      | 最終狀態、錯誤、使用量、提示快取、壓縮計數、助理文字和工具元資料 |
| `prompts.json`        | 已提交的提示和選取的提示建構細節                                 |
| `system-prompt.txt`   | 最後編譯的系統提示，若已擷取                                     |
| `tools.json`          | 傳送至模型的工具定義，若已擷取                                   |

`manifest.json` 列出該套件中存在的檔案。如果工作階段未擷取對應的執行時期資料，某些檔案會被省略。

## 擷取位置

根據預設，執行時期軌跡事件會寫入在工作階段檔案旁邊：

```text
<session>.trajectory.jsonl
```

OpenClaw 也會在工作階段旁邊寫入一個盡力而為的指標檔案：

```text
<session>.trajectory-path.json
```

設定 `OPENCLAW_TRAJECTORY_DIR` 將執行時期軌跡附件儲存在專用目錄中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

當設定此變數時，OpenClaw 會在該目錄中為每個工作階段 ID 寫入一個 JSONL 檔案。

## 停用擷取

在啟動 OpenClaw 之前設定 `OPENCLAW_TRAJECTORY=0`：

```bash
export OPENCLAW_TRAJECTORY=0
```

這會停用執行時期軌跡擷取。`/export-trajectory` 仍然可以匯出文字紀錄分支，但僅限執行時期的檔案（例如編譯內容、提供者成果和提示元資料）可能會遺失。

## 隱私與限制

軌跡套件是為了支援和偵錯而設計的，並非用於公開發布。OpenClaw 會在寫入匯出檔案之前編輯敏感值：

- 憑證和已知的類似密碼的載荷欄位
- 影像資料
- 本機狀態路徑
- 工作區路徑，替換為 `$WORKSPACE_DIR`
- 家目錄路徑，若偵測到

匯出工具也會限制輸入大小：

- 執行時期附件檔案：50 MiB
- 工作階段檔案：50 MiB
- 執行時期事件：200,000
- 總匯出事件：250,000
- 個別執行時期事件行超過 256 KiB 時會被截斷

在與團隊以外的人員分享之前，請先審查套件。編輯是盡力而為的，無法得知每個應用程式特定的密碼。

## 疑難排解

如果匯出沒有執行時期事件：

- 確認 OpenClaw 是在沒有 `OPENCLAW_TRAJECTORY=0` 的情況下啟動
- 檢查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可寫入的目錄
- 在工作階段中執行另一則訊息，然後再次匯出
- 檢查 `manifest.json` 中是否有 `runtimeEventCount`

如果指令拒絕輸出路徑：

- 使用像 `bug-1234` 這樣的相對名稱
- 不要傳遞 `/tmp/...` 或 `~/...`
- 將匯出保留在 `.openclaw/trajectory-exports/` 內

如果匯出因大小錯誤而失敗，表示工作階段或側車超出了匯出安全限制。請啟動新的工作階段或匯出較小的重現範例。

## 相關

- [差異](/zh-Hant/tools/diffs)
- [工作階段管理](/zh-Hant/concepts/session)
- [Exec 工具](/zh-Hant/tools/exec)
