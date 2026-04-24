---
summary: "Task Flow 工作流程編排層，位於背景任務之上"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Task Flow"
---

# Task Flow

Task Flow 是位於[背景任務](/zh-Hant/automation/tasks)之上的工作流程編排基礎架構。它管理具有自身狀態、修訂追蹤和同步語意的持久多步驟流程，而個別任務則保持為獨立的工作單位。

## 何時使用 Task Flow

當工作跨越多個順序或分支步驟，並且您需要在閘道重新啟動之間追蹤持久的進度時，請使用 Task Flow。對於單一的背景操作，一般的[任務](/zh-Hant/automation/tasks)即已足夠。

| 情境                         | 使用             |
| ---------------------------- | ---------------- |
| 單一背景工作                 | 一般任務         |
| 多步驟管線 (A 接著 B 接著 C) | Task Flow (受控) |
| 觀察外部建立的任務           | Task Flow (鏡像) |
| 一次性提醒                   | Cron 排程工作    |

## 同步模式

### 受控模式

Task Flow 全權掌握生命週期。它會建立作為流程步驟的任務，將其推動至完成，並自動推進流程狀態。

範例：一個每週報告流程，包含 (1) 收集資料，(2) 產生報告，以及 (3) 傳送報告。Task Flow 會將每個步驟建立為背景任務，等待完成後，再移至下一步驟。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### 鏡像模式

Task Flow 會觀察外部建立的任務，並在不接管任務建立權的情況下保持流程狀態同步。當任務來自 cron 排程工作、CLI 指令或其他來源，而您希望能以流程形式統一檢視其進度時，這就非常有用。

範例：三個獨立的 cron 排程工作共同組成「早晨例行作業」。鏡像流程會追蹤其集體進度，而不控制其執行時間或方式。

## 持久狀態與修訂追蹤

每個流程都會保存自己的狀態並追蹤修訂，以便進度能在閘道重新啟動後保留。當多個來源嘗試同時推進同一個流程時，修訂追蹤能啟用衝突偵測。

## 取消行為

`openclaw tasks flow cancel` 會在流程上設定持續性的取消意圖。流程中的現有任務會被取消，且不會啟動任何新步驟。取消意圖在重新啟動後仍然存在，因此即使閘道在所有子任務終止前重新啟動，已取消的流程仍會保持取消狀態。

## CLI 指令

```bash
# List active and recent flows
openclaw tasks flow list

# Show details for a specific flow
openclaw tasks flow show <lookup>

# Cancel a running flow and its active tasks
openclaw tasks flow cancel <lookup>
```

| 指令                              | 描述                               |
| --------------------------------- | ---------------------------------- |
| `openclaw tasks flow list`        | 顯示已追蹤的流程及其狀態和同步模式 |
| `openclaw tasks flow show <id>`   | 透過流程 ID 或查詢鍵檢視單一流程   |
| `openclaw tasks flow cancel <id>` | 取消正在執行的流程及其活動任務     |

## 流程與任務的關聯

流程是協調任務，而非取代任務。單一流程在其生命週期中可能驅動多個背景任務。使用 `openclaw tasks` 檢查個別任務記錄，並使用 `openclaw tasks flow` 檢查協調流程。

## 相關

- [背景任務](/zh-Hant/automation/tasks) — 流程所協調的獨立工作帳本
- [CLI: tasks](/zh-Hant/cli/tasks) — `openclaw tasks flow` 的 CLI 指令參考
- [自動化總覽](/zh-Hant/automation) — 所有自動化機制一覽
- [Cron Jobs](/zh-Hant/automation/cron-jobs) — 可能輸入至流程的排程工作
