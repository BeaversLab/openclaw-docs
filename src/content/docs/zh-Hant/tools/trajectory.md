---
summary: "匯出已編輯的軌跡套件以用於偵錯 OpenClaw 代理程式工作階段"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "軌跡套件"
---

# 軌跡套件

軌跡擷取是 OpenClaw 的每個工作階段飛行紀錄器。它會為每次代理程式執行記錄結構化時間軸，然後 `/export-trajectory` 將目前的工作階段打包成已編輯的支援套件。

當您需要回答類似以下的問題時使用它：

- 傳送了哪些提示、系統提示和工具給模型？
- 哪些對話紀錄訊息和工具呼叫導致了這個答案？
- 執行是否逾時、中止、壓縮或發生提供者錯誤？
- 啟用了哪些模型、外掛程式、技能和執行時間設定？
- 提供者傳回了哪些使用量和提示快取元資料？

## 快速入門

在作用中的工作階段中傳送此內容：

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

自訂路徑是在 `.openclaw/trajectory-exports/` 內部解析。絕對路徑和 `~` 路徑會被拒絕。

## 存取

軌跡匯出是一個擁有者命令。傳送者必須通過頻道的正常命令授權檢查和擁有者檢查。

## 會記錄什麼內容

對於 OpenClaw 代理程式執行，軌跡擷取預設為開啟。

執行時間事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.completed`
- `trace.artifacts`
- `session.ended`

對話紀錄事件也會從作用中的工作階段分支重建：

- 使用者訊息
- 助理訊息
- 工具呼叫
- 工具結果
- 壓縮
- 模型變更
- 標籤和自訂工作階段項目

事件會以 JSON Lines 格式寫入，並使用此架構標記：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## 套件檔案

匯出的套件可以包含：

| 檔案                  | 內容                                                                       |
| --------------------- | -------------------------------------------------------------------------- |
| `manifest.json`       | 套件架構、來源檔案、事件計數和產生的檔案清單                               |
| `events.jsonl`        | 已排序的執行時間和對話紀錄時間軸                                           |
| `session-branch.json` | 已編輯的作用中對話紀錄分支和工作階段標頭                                   |
| `metadata.json`       | OpenClaw 版本、作業系統/執行環境、模型、設定快照、外掛、技能和提示詞元資料 |
| `artifacts.json`      | 最終狀態、錯誤、使用量、提示詞快取、壓縮計數、助理文字和工具元資料         |
| `prompts.json`        | 提交的提示詞和選定的提示詞構建詳細資訊                                     |
| `system-prompt.txt`   | 最新的編譯系統提示詞（如已擷取）                                           |
| `tools.json`          | 傳送給模型的工具定義（如已擷取）                                           |

`manifest.json` 列出了該套件中存在的檔案。如果工作階段未擷取對應的執行時資料，某些檔案會被省略。

## 擷取位置

依預設，執行時軌跡事件會寫入在工作階段檔案旁邊：

```text
<session>.trajectory.jsonl
```

OpenClaw 也會在工作階段旁邊寫入一個盡力而為的指標檔案：

```text
<session>.trajectory-path.json
```

設定 `OPENCLAW_TRAJECTORY_DIR` 以將執行時軌跡附屬檔案儲存在專用目錄中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

當設定此變數時，OpenClaw 會在該目錄中為每個工作階段 ID 寫入一個 JSONL 檔案。

## 停用擷取

在啟動 OpenClaw 之前設定 `OPENCLAW_TRAJECTORY=0`：

```bash
export OPENCLAW_TRAJECTORY=0
```

這會停用執行時軌跡擷取。`/export-trajectory` 仍然可以匯出對話分支，但僅限執行時的檔案（例如編譯的上下文、提供者產出和提示詞元資料）可能會遺失。

## 隱私權與限制

軌跡套件是為了支援和除錯而設計，而非公開發布。OpenClaw 會在寫入匯出檔案之前編輯敏感值：

- 憑證和已知的類似秘密欄位
- 圖片資料
- 本機狀態路徑
- 工作區路徑，已替換為 `$WORKSPACE_DIR`
- 主目錄路徑（在偵測到時）

匯出工具也會限制輸入大小：

- 執行時附屬檔案：50 MiB
- 工作階段檔案：50 MiB
- 執行時事件：200,000
- 匯出的事件總數：250,000
- 單一執行時事件行若超過 256 KiB 則會被截斷

在團隊外部分享套件前請先審閱。編輯是盡力而為的，無法得知每個應用程式特定的秘密。

## 疑難排解

如果匯出沒有執行時事件：

- 確認 OpenClaw 在未設定 `OPENCLAW_TRAJECTORY=0` 的情況下啟動
- 檢查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可寫入的目錄
- 在工作階段中執行另一則訊息，然後再次匯出
- 檢查 `manifest.json` 以尋找 `runtimeEventCount`

如果指令拒絕該輸出路徑：

- 使用相對名稱，例如 `bug-1234`
- 不要傳遞 `/tmp/...` 或 `~/...`
- 將匯出保持在 `.openclaw/trajectory-exports/` 內

如果匯出因大小錯誤而失敗，表示工作階段或側車程式已超過匯出安全限制。請開啟新的工作階段或匯出較小的重現步驟。
