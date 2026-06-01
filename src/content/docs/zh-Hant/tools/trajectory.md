---
summary: "匯出經過編輯的軌跢套件，以對 OpenClaw 代理程式工作階段進行偵錯"
read_when:
  - Debugging why an agent answered, failed, or called tools a certain way
  - Exporting a support bundle for an OpenClaw session
  - Investigating prompt context, tool calls, runtime errors, or usage metadata
  - Disabling or relocating trajectory capture
title: "軌跢套件"
---

軌跢擷取是 OpenClaw 針對每個工作階段的飛行紀錄器。它會記錄每個代理程式執行的結構化時間軸，然後 `/export-trajectory` 將目前的工作階段封裝成經過編輯的支援套件。

當您需要回答以下問題時使用它：

- 發送給模型的是什麼提示、系統提示和工具？
- 哪些對話訊息和工具呼叫導致了這個答案？
- 執行是否逾時、中止、壓縮或發生提供者錯誤？
- 啟用的是哪個模型、外掛、技能和執行時設定？
- 提供者回傳了什麼使用量和提示快取元資料？

如果您要針對即時 Gateway 問題提交廣泛的支援報告，請從
[`/diagnostics`](/zh-Hant/gateway/diagnostics#chat-command) 開始。診斷會收集已清理的 Gateway 套件，而對於 OpenAI Codex 測試線工作階段，經批准後也可以將 Codex 回饋傳送到 OpenAI 伺服器。當您特別需要詳細的每個工作階段提示詞、工具和逐字稿時間軸時，請使用 `/export-trajectory`。

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

自訂路徑是在 `.openclaw/trajectory-exports/` 內解析。絕對路徑和
`~` 路徑會被拒絕。

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
- `model.fallback_step`，包括來源模型、下一個模型、失敗原因/細節、鏈結位置，以及容錯移轉是前進、成功還是耗盡了鏈結
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

`manifest.json` 列出該套件中存在的檔案。當工作階段未擷取對應的執行時間資料時，部分檔案會被省略。

## 擷取位置

根據預設，執行時間軌跡事件會寫入會話檔案旁邊：

```text
<session>.trajectory.jsonl
```

OpenClaw 也會在會話旁邊寫入一個盡力的指標檔案：

```text
<session>.trajectory-path.json
```

設定 `OPENCLAW_TRAJECTORY_DIR` 以將執行時間軌跢側車檔案儲存在專用目錄中：

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

這會停用執行時間軌跢擷取。`/export-trajectory` 仍然可以匯出逐字稿分支，但僅限執行時間的檔案（例如已編譯的內容、提供者產出資料和提示詞中繼資料）可能會遺失。

## 調整刷新逾時

OpenClaw 會在代理程式清理期間重新整理執行時軌跡 sidecar。預設的清理逾時為 10,000 毫秒。如果在慢速磁碟或大型儲存上，請在啟動 OpenClaw 之前設定 `OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS`：

```bash
export OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS=30000
```

這控制 OpenClaw 何時記錄 `openclaw-trajectory-flush` 逾時並繼續。
這不會改變軌跡大小上限。若要調整所有未傳遞明確逾時的
代理程式清理步驟，請設定 `OPENCLAW_AGENT_CLEANUP_TIMEOUT_MS`。

## 隱私與限制

軌跡套件是為了支援和除錯而設計，非用於公開發布。OpenClaw 會在寫入匯出檔案前編輯敏感值：

- 憑證和已知類似密碼的 payload 欄位
- 圖片資料
- 本機狀態路徑
- 工作區路徑，替換為 `$WORKSPACE_DIR`
- 主目錄路徑（如果偵測到的話）

匯出工具也會限制輸入大小：

- 執行時 sidecar 檔案：即時擷取在 10 MiB 時停止，並在仍有空間時記錄截斷事件；匯出接受現有的執行時 sidecar，最大可達 50 MiB
- 會話檔案：50 MiB
- 執行時事件：200,000
- 匯出的事件總數：250,000
- 個別執行時事件行在超過 256 KiB 時會被截斷

與團隊以外的人分享套件前，請先審閱。編輯是盡力而為，無法得知每個應用程式特定的密碼。

## 疑難排解

如果匯出沒有執行時事件：

- 確認 OpenClaw 未在 `OPENCLAW_TRAJECTORY=0` 的情況下啟動
- 檢查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可寫入的目錄
- 在會話中執行另一則訊息，然後再次匯出
- 檢查 `manifest.json` 中是否有 `runtimeEventCount`

如果指令拒絕輸出路徑：

- 使用像 `bug-1234` 這樣的相對名稱
- 不要傳遞 `/tmp/...` 或 `~/...`
- 將匯出保持在 `.openclaw/trajectory-exports/` 內

如果匯出因大小錯誤而失敗，表示會話或 sidecar 超出了匯出安全限制。請開始新的會話或匯出較小的重現案例。

## 相關

- [差異](/zh-Hant/tools/diffs)
- [會話管理](/zh-Hant/concepts/session)
- [Exec 工具](/zh-Hant/tools/exec)
