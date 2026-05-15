---
summary: "匯出已編輯的軌跢套件以對 OpenClaw 代理程式工作階段進行偵錯"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "軌跢套件"
---

軌跢擷取是 OpenClaw 的每工作階段飛行記錄器。它會記錄每次代理程式執行的結構化時間軸，然後 `/export-trajectory` 將目前的工作階段封裝成已編輯的支援套件。

當您需要回答以下問題時使用它：

- 發送給模型的是什麼提示、系統提示和工具？
- 哪些對話訊息和工具呼叫導致了這個答案？
- 執行是否逾時、中止、壓縮或發生提供者錯誤？
- 啟用的是哪個模型、外掛、技能和執行時設定？
- 提供者回傳了什麼使用量和提示快取元資料？

如果您正在針對即時 Gateway 問題提交廣泛的支援報告，請從
[`/diagnostics`](/zh-Hant/gateway/diagnostics#chat-command) 開始。診斷工具會收集已清理的 Gateway 套件，並且對於 OpenAI Codex 線束工作階段，也可以在核准後將 Codex 反饋傳送至 OpenAI 伺服器。當您特別需要詳細的每工作階段提示、工具和逐字稿時間軸時，請使用 `/export-trajectory`。

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

自訂路徑是在 `.openclaw/trajectory-exports/` 內部解析的。絕對路徑和 `~` 路徑會被拒絕。

軌跢套件可以包含提示、模型訊息、工具結構描述、工具結果、執行階段事件和本機路徑。因此，聊天斜線指令每次都會透過執行核准流程執行。當您打算建立套件時，請核准匯出一次；請勿使用「全部允許」。在群組聊天中，OpenClaw 會私下將核准提示和匯出結果傳送給擁有者，而不是將軌跢詳細資訊發布回共用聊天室。

為了進行本機檢查或支援工作流程，您也可以直接執行已核准的指令路徑：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
```

## 存取

軌跢匯出是一個擁有者指令。傳送者必須通過該頻道的正常指令授權檢查和擁有者檢查。

## 記錄內容

OpenClaw 代理程式執行預設會開啟軌跢擷取。

執行階段事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.fallback_step`，包括來源模型、下一個模型、失敗原因/詳細資料、鏈結位置，以及備用機制是否推進、成功或耗盡了鏈結
- `model.completed`
- `trace.artifacts`
- `session.ended`

也會從作用中的工作階段分支重建逐字稿事件：

- 使用者訊息
- 助理訊息
- 工具呼叫
- 工具結果
- 壓縮
- 模型變更
- 標籤和自訂會話項目

事件會以帶有此架構標記的 JSON Lines 格式寫入：

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
| `events.jsonl`        | 已排序的執行時間和逐字稿時間軸                                             |
| `session-branch.json` | 已編修的現用逐字稿分支和會話標頭                                           |
| `metadata.json`       | OpenClaw 版本、作業系統/執行環境、模型、設定快照、外掛、技能和提示中繼資料 |
| `artifacts.json`      | 最終狀態、錯誤、使用量、提示快取、壓縮計數、助理文字和工具中繼資料         |
| `prompts.json`        | 提交的提示和選取的提示建構細節                                             |
| `system-prompt.txt`   | 最新的編譯系統提示（於擷取時）                                             |
| `tools.json`          | 傳送至模型的工具定義（於擷取時）                                           |

`manifest.json` 列出該套件中存在的檔案。若會話未擷取相應的執行時間資料，則會省略部分檔案。

## 擷取位置

根據預設，執行時間軌跡事件會寫入會話檔案旁邊：

```text
<session>.trajectory.jsonl
```

OpenClaw 也會在會話旁邊寫入一個盡力的指標檔案：

```text
<session>.trajectory-path.json
```

設定 `OPENCLAW_TRAJECTORY_DIR` 將執行時間軌跡側車檔案儲存在專用目錄中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

設定此變數後，OpenClaw 會在該目錄中為每個會話 ID 寫入一個 JSONL 檔案。

當擁有者的會話項目因會話磁碟預算而被修剪、上限或驅逐時，會話維護會移除軌跡側車檔案。會話目錄外的執行時間檔案僅在指標目標仍證明其屬於該會話時才會被移除。

## 停用擷取

在啟動 OpenClaw 之前設定 `OPENCLAW_TRAJECTORY=0`：

```bash
export OPENCLAW_TRAJECTORY=0
```

這會停用執行時間軌跡擷取。`/export-trajectory` 仍然可以匯出逐字稿分支，但可能會缺少僅限執行時間的檔案，例如編譯內容、供應商產品和提示中繼資料。

## 隱私與限制

軌跡套件是專為支援和除錯而設計的，並非用於公開發布。OpenClaw 在寫入匯出檔案之前會編修敏感值：

- 憑證和已知的類似密碼的酬載欄位
- 影像資料
- 本機狀態路徑
- 工作區路徑，已替換為 `$WORKSPACE_DIR`
- 家目錄路徑（如偵測到）

匯出工具也會限制輸入大小：

- 執行期 sidecar 檔案：即時擷取會在 10 MiB 時停止，並在剩餘空間時記錄截斷事件；匯出接受最大 50 MiB 的現有執行期 sidecar
- 工作階段檔案：50 MiB
- 執行期事件：200,000
- 匯出事件總數：250,000
- 單一執行期事件行若超過 256 KiB 將會被截斷

在與團隊外部分享套件前，請先進行審閱。編輯僅為盡力而為，無法得知所有應用程式特定的密碼。

## 疑難排解

如果匯出沒有執行期事件：

- 確認 OpenClaw 在未使用 `OPENCLAW_TRAJECTORY=0` 的情況下啟動
- 檢查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可寫入的目錄
- 在工作階段中執行另一則訊息，然後再次匯出
- 檢查 `manifest.json` 中是否有 `runtimeEventCount`

如果指令拒絕了輸出路徑：

- 使用像 `bug-1234` 這樣的相對名稱
- 不要傳遞 `/tmp/...` 或 `~/...`
- 將匯出保持在 `.openclaw/trajectory-exports/` 之內

如果匯出因為大小錯誤而失敗，表示工作階段或 sidecar 超出了匯出安全限制。請開啟新的工作階段或匯出較小的重現步驟。

## 相關

- [差異](/zh-Hant/tools/diffs)
- [工作階段管理](/zh-Hant/concepts/session)
- [Exec 工具](/zh-Hant/tools/exec)
