---
summary: "自動化機制概覽：任務、cron、鉤子、常駐指令和任務流程"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, commitments, hooks, and standing orders
  - Looking for the right automation entry point
title: "自動化與任務"
---

OpenClaw 透過任務、排程工作、推斷承諾、事件掛鉤和常駐指令在背景執行工作。本頁面協助您選擇正確的機制並了解它們如何協同運作。

## 快速決策指南

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}
    START --> Q6{Remember a natural follow-up?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
    Q6 -->|Yes| COMMITMENTS[Inferred Commitments]
```

| 使用案例                         | 建議選項     | 原因                                            |
| -------------------------------- | ------------ | ----------------------------------------------- |
| 在早上 9 點整發送每日報告        | 排程任務     | 精確的時間，獨立的執行                          |
| 在 20 分鐘後提醒我               | 排程任務     | 具備精確時間的單次執行 (`--at`)                 |
| 執行每週深度分析                 | 排程任務     | 獨立任務，可使用不同的模型                      |
| 每 30 分鐘檢查收件匣             | 心跳         | 與其他檢查分批處理，具備情境感知能力            |
| 監控行事曆以查看即將到來的事件   | 心跳         | 非常適合週期性的情境意識                        |
| 在提到的訪談後進行檢查           | 推斷承諾     | 類似記憶的後續跟進，無確切提醒請求              |
| 在使用者情境後進行溫柔的關懷檢查 | 推斷承諾     | 限定於相同的代理程式和頻道                      |
| 檢查子代理程式或 ACP 執行的狀態  | 背景任務     | 任務分類帳追蹤所有分離的工作                    |
| 稽核執行了什麼以及何時執行       | 背景任務     | `openclaw tasks list` 和 `openclaw tasks audit` |
| 多步驟研究然後總結               | 任務流程     | 具備修訂追蹤的持久協調流程                      |
| 在會話重設時執行腳本             | 掛鉤         | 事件驅動，在生命週期事件時觸發                  |
| 在每次工具呼叫時執行程式碼       | 外掛程式掛鉤 | 處理程序內掛鉤可以攔截工具呼叫                  |
| 回覆前始終檢查合規性             | 常駐指令     | 自動注入每個會話                                |

### 排程任務 與 Heartbeat

| 維度     | 排程任務                    | Heartbeat                |
| -------- | --------------------------- | ------------------------ |
| 時機     | 精確（cron 表達式，一次性） | 近似（預設每 30 分鐘）   |
| 會話情境 | 全新（獨立）或共用          | 完整的主會話情境         |
| 任務記錄 | 始終建立                    | 從不建立                 |
| 傳遞     | 頻道、Webhook 或靜默        | 在主會話中內嵌           |
| 最適用於 | 報告、提醒、背景工作        | 收件匣檢查、行事曆、通知 |

當您需要精確的時機或獨立執行時，請使用排程任務。當工作受益於完整的會話情境且近似時機即可時，請使用 Heartbeat。

## 核心概念

### 排程任務

Cron 是 Gateway 內建的精確時機排程器。它會保存工作、在正確的時間喚醒代理程式，並可以將輸出傳送到聊天頻道或 webhook 端點。支援一次性提醒、週期性表達式和傳入 webhook 觸發器。

請參閱[排程任務](/zh-Hant/automation/cron-jobs)。

### 任務

背景任務分類帳會追蹤所有分離的工作：ACP 執行、子代理程式產生、獨立 cron 執行和 CLI 操作。任務是記錄，而不是排程器。使用 `openclaw tasks list` 和 `openclaw tasks audit` 來檢查它們。

參閱 [背景任務](/zh-Hant/automation/tasks)。

### 推斷的承諾

承諾是選用、短期的後續記憶。OpenClaw 從正常對話中推斷它們，將其範圍限定為相同的代理程式和通道，並透過心跳傳送到期的檢查。確切的使用者請求提醒仍屬於 cron。

參閱 [推斷的承諾](/zh-Hant/concepts/commitments)。

### 任務流程

任務流程是背景任務之上的流程編排基層。它管理具有受管和鏡像同步模式、修訂追蹤以及 `openclaw tasks flow list|show|cancel` 以供檢查的持久多步驟流程。

參閱 [任務流程](/zh-Hant/automation/taskflow)。

### 常備指令

常備指令授予代理程式對已定義程式的永久操作權限。它們存在於工作區檔案中（通常是 `AGENTS.md`），並會注入到每個工作階段中。結合 cron 以進行基於時間的執行。

參閱 [常備指令](/zh-Hant/automation/standing-orders)。

### 鉤子

內部鉤子是由代理程式生命週期事件 (`/new`、`/reset`、`/stop`)、工作階段壓縮、閘道啟動和訊息流觸發的事件驅動腳本。它們會從目錄中自動探索，並且可以使用 `openclaw hooks` 進行管理。若要攔截處理序內的工具呼叫，請使用 [外掛程式鉤子](/zh-Hant/plugins/hooks)。

參閱 [鉤子](/zh-Hant/automation/hooks)。

### 心跳

心跳是週期性的主工作階段輪次（預設每 30 分鐘一次）。它會在一次具有完整工作階段內容的代理程式輪次中，批次處理多項檢查（收件匣、行事曆、通知）。心跳輪次不會建立任務記錄，也不會延長每日/閒置工作階段重設的新鮮度。使用 `HEARTBEAT.md` 作為小型檢查清單，或者當您想要在心跳本身內部進行僅到期的週期性檢查時，使用 `tasks:` 區塊。空的心跳檔案會跳過為 `empty-heartbeat-file`；僅到期的任務模式會跳過為 `no-tasks-due`。當 cron 工作處於作用中或已排入佇列時，心跳會延遲，並且 `heartbeat.skipWhenBusy` 也可以在子代理程式或巢狀通道忙碌時延遲它們。

參閱 [心跳](/zh-Hant/gateway/heartbeat)。

## 它們如何協同運作

- **Cron** 處理精確的排程（每日報告、每週審查）和一次性提醒。所有的 Cron 執行都會建立任務記錄。
- **Heartbeat** 在每 30 分鐘的一次批次處理中，處理常規監控（收件匣、行事曆、通知）。
- **Hooks** 使用自訂腳本對特定事件（會話重設、壓縮、訊息流）做出反應。外掛程式 Hooks 涵蓋工具呼叫。
- **Standing orders** 提供代理程式持續性的內容和權限邊界。
- **Task Flow** 協調個別任務之上的多步驟流程。
- **Tasks** 自動追蹤所有分離的工作，以便您進行檢查和稽核。

## 相關

- [Scheduled Tasks](/zh-Hant/automation/cron-jobs) — 精確排程和一次性提醒
- [Inferred Commitments](/zh-Hant/concepts/commitments) — 類似記憶的後續檢查
- [Background Tasks](/zh-Hant/automation/tasks) — 所有分離工作的任務帳本
- [Task Flow](/zh-Hant/automation/taskflow) — 持久的多步驟流程編排
- [Hooks](/zh-Hant/automation/hooks) — 事件驅動的生命週期腳本
- [Plugin hooks](/zh-Hant/plugins/hooks) — 程序內的工具、提示、訊息和生命週期 hooks
- [Standing Orders](/zh-Hant/automation/standing-orders) — 持續的代理程式指令
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性的主會話輪次
- [Configuration Reference](/zh-Hant/gateway/configuration-reference) — 所有配置金鑰
