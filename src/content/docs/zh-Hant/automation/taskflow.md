---
summary: "Task Flow 是位於背景任務之上的流程編排層"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Task flow"
---

Task Flow 是位於 [背景任務](/zh-Hant/automation/tasks) 之上的流程編排基層。它管理具有自身狀態、修訂追蹤和同步語意的耐用多步驟流程，而個別任務仍然是分離工作的單位。

## 何時使用 Task Flow

當工作跨越多個順序或分支步驟，並且您需要在閘道重新啟動之間進行耐用的進度追蹤時，請使用 Task Flow。對於單一背景操作，使用普通的 [task](/zh-Hant/automation/tasks) 就足夠了。

| 場景                          | 使用                 |
| ----------------------------- | -------------------- |
| 單一背景工作                  | 普通任務             |
| 多步驟管道（A 接著 B 接著 C） | Task Flow (託管模式) |
| 觀察外部建立的任務            | Task Flow (鏡像模式) |
| 一次性提醒                    | Cron 工作            |

## 可靠的排程工作流程模式

對於諸如市場情報簡報等週期性工作流程，請將排程、編排和可靠性檢查視為不同的層級：

1. 使用 [排程任務](/zh-Hant/automation/cron-jobs) 進行計時。
2. 當工作流程應基於先前的上下文建構時，請使用持續的 cron session。
3. 使用 [Lobster](/zh-Hant/tools/lobster) 進行確定性步驟、審核閘道和恢復權杖處理。
4. 使用 Task Flow 來跨子任務、等待、重試和閘道重新啟動追蹤多步驟執行。

範例 cron 形狀：

```bash
openclaw cron add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "Run the market-intel Lobster workflow. Verify source freshness before summarizing." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

當週期性工作流程需要刻意記錄的歷史、先前的執行摘要或持續存在的上下文時，請使用 `session:<id>` 而不是 `isolated`。當每次執行都應該從頭開始，並且所有必要的狀態都在工作流程中明確指定時，請使用 `isolated`。

在工作流程內部，將可靠性檢查放在 LLM 摘要步驟之前：

```yaml
name: market-intel-brief
steps:
  - id: preflight
    command: market-intel check --json
  - id: collect
    command: market-intel collect --json
    stdin: $preflight.json
  - id: summarize
    command: market-intel summarize --json
    stdin: $collect.json
  - id: approve
    command: market-intel deliver --preview
    stdin: $summarize.json
    approval: required
  - id: deliver
    command: market-intel deliver --execute
    stdin: $summarize.json
    condition: $approve.approved
```

建議的飛行前檢查：

- 瀏覽器可用性和設定檔選擇，例如 `openclaw` 用於託管狀態，或當需要登入的 Chrome session 時使用 `user`。請參閱 [瀏覽器](/zh-Hant/tools/browser)。
- 每個來源的 API 憑證和配額。
- 所需端點的網路連線能力。
- 為代理啟用的必要工具，例如 `lobster`、`browser` 和 `llm-task`。
- 為 cron 配置失敗目的地，以便可見預檢失敗。請參閱 [Scheduled Tasks](/zh-Hant/automation/cron-jobs#delivery-and-output)。

每個收集項目的建議資料溯源欄位：

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "Example report",
  "content": "..."
}
```

讓工作流程在總結之前拒絕或標記過時項目。LLM 步驟應僅接收結構化 JSON，並被要求在其輸出中保留 `sourceUrl`、`retrievedAt` 和 `asOf`。當您在工作流程內需要經過 schema 驗證的模型步驟時，請使用 [LLM Task](/zh-Hant/tools/llm-task)。

對於可重複使用的團隊或社群工作流程，請將 CLI、`.lobster` 檔案以及任何設定說明打包為技能或外掛程式，並透過 [ClawHub](/zh-Hant/clawhub) 發布。除非外掛程式 API 缺少必要的通用功能，否則請將工作流程特定的防護機制保留在該套件中。

## 同步模式

### 託管模式

Task Flow 全權掌握生命週期。它將任務建立為工作流程步驟，驅動其完成，並自動推進工作流程狀態。

例如：每週報告工作流程，(1) 收集資料，(2) 產生報告，以及 (3) 傳送報告。Task Flow 將每個步驟建立為背景任務，等待完成，然後移至下一步驟。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### 鏡像模式

Task Flow 觀察外部建立的任務，並在不接管任務建立的情況下保持工作流程狀態同步。當任務源自 cron 工作、CLI 指令或其他來源，且您希望將其進度統一檢視為工作流程時，這非常有用。

例如：三個獨立的 cron 工作，共同組成一個「晨間運維」例行程式。鏡像工作流程會追蹤其集體進度，而不控制它們的執行時間或方式。

## 持久狀態和修訂追蹤

每個流程都會持久化自身的狀態並追蹤修訂，因此進度可以在閘道重新啟動後存續。修訂追蹤功能可在多個來源嘗試同時推進同一個流程時啟用衝突檢測。
流程登錄檔使用 SQLite 進行有界的預寫式日誌 (write-ahead-log) 維護，包括定期和關機時的檢查點，因此長期執行的閘道不會保留無限制的 `registry.sqlite-wal` sidecar 檔案。

## 取消行為

`openclaw tasks flow cancel` 會在流程上設定一個固定的取消意圖。流程中的活動任務會被取消，且不會啟動任何新步驟。取消意圖會在重新啟動後持續存在，因此即使閘道在所有子任務終止前重新啟動，已取消的流程仍會保持取消狀態。

## CLI 指令

```bash
# List active and recent flows
openclaw tasks flow list

# Show details for a specific flow
openclaw tasks flow show <lookup>

# Cancel a running flow and its active tasks
openclaw tasks flow cancel <lookup>
```

| 指令                              | 描述                             |
| --------------------------------- | -------------------------------- |
| `openclaw tasks flow list`        | 顯示具有狀態和同步模式的追蹤流程 |
| `openclaw tasks flow show <id>`   | 透過流程 ID 或查詢鍵檢查單一流程 |
| `openclaw tasks flow cancel <id>` | 取消執行中的流程及其活動任務     |

## 流程與任務的關係

流程是協調任務，而非取代任務。單一流程在其生命週期中可能會驅動多個背景任務。請使用 `openclaw tasks` 來檢查個別任務記錄，並使用 `openclaw tasks flow` 來檢查協調流程。

## 相關

- [背景任務](/zh-Hant/automation/tasks) — 流程所協調的分離工作帳本
- [CLI: tasks](/zh-Hant/cli/tasks) — `openclaw tasks flow` 的 CLI 指令參考
- [自動化概觀](/zh-Hant/automation) — 所有自動化機制一覽
- [Cron 工作](/zh-Hant/automation/cron-jobs) — 可能輸入至流程的排程工作
