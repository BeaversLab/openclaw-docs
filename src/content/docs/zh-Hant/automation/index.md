---
summary: "自動化機制概覽：任務、cron、鉤子、常駐指令和任務流程"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, hooks, and standing orders
  - Looking for the right automation entry point
title: "自動化與任務"
---

OpenClaw 透過任務、排程作業、事件攔截器和常駐指令在背景執行工作。本頁面協助您選擇正確的機制，並瞭解它們如何協同運作。

## 快速決策指南

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
```

| 使用案例                        | 建議選項       | 原因                                            |
| ------------------------------- | -------------- | ----------------------------------------------- |
| 在早上 9 點整發送每日報告       | 排程任務       | 精確的時間，獨立的執行                          |
| 在 20 分鐘後提醒我              | 排程任務       | 具備精確時間的單次執行 (`--at`)                 |
| 執行每週深度分析                | 排程任務       | 獨立任務，可使用不同的模型                      |
| 每 30 分鐘檢查收件匣            | 心跳           | 與其他檢查分批處理，具備情境感知能力            |
| 監控行事曆以查看即將到來的事件  | 心跳           | 非常適合週期性的情境意識                        |
| 檢查子代理程式或 ACP 執行的狀態 | 背景任務       | 任務帳本會追蹤所有分離的工作                    |
| 稽核執行的內容與時間            | 背景任務       | `openclaw tasks list` 和 `openclaw tasks audit` |
| 多步驟研究後進行總結            | 任務流程       | 具備修訂追蹤功能的持久性協調流程                |
| 在工作階段重設時執行指令碼      | 攔截器         | 事件驅動，在生命週期事件上觸發                  |
| 在每次工具呼叫時執行程式碼      | 外掛程式攔截器 | 程序內攔截器可以攔截工具呼叫                    |
| 回覆前始終檢查合規性            | 常駐指令       | 自動注入到每個工作階段中                        |

### 排程任務 vs 心跳

| 維度         | 排程任務                     | 心跳                     |
| ------------ | ---------------------------- | ------------------------ |
| 時間安排     | 精確 (cron 運算式、單次執行) | 近似 (預設每 30 分鐘)    |
| 工作階段情境 | 全新 (獨立) 或共用           | 完整的主工作階段情境     |
| 任務記錄     | 一律建立                     | 從不建立                 |
| 遞送方式     | 頻道、Webhook 或靜默         | 在主工作階段內嵌顯示     |
| 最適合用於   | 報告、提醒、背景作業         | 收件匣檢查、行事曆、通知 |

當您需要精確的時間安排或獨立的執行時，請使用排程任務。當工作受益於完整的工作階段情境且近似時間安排即可時，請使用心跳。

## 核心概念

### 排程任務

Cron 是 Gateway 內建的排程器，用於精確的時間安排。它會持久化作業，在適當的時間喚醒代理程式，並可將輸出遞送到聊天頻道或 webhook 端點。支援單次提醒、週期性運算式和傳入 webhook 觸發程序。

請參閱 [排程任務](/zh-Hant/automation/cron-jobs)。

### 任務

背景任務帳本會追蹤所有分離的工作：ACP 執行、子代理生成、獨立的 cron 執行以及 CLI 操作。任務是記錄，而非排程器。請使用 `openclaw tasks list` 和 `openclaw tasks audit` 來檢查它們。

請參閱 [背景任務](/zh-Hant/automation/tasks)。

### 任務流程

任務流程是位於背景任務之上的流程編排基礎層。它管理具有受管和鏡像同步模式、修訂追蹤以及 `openclaw tasks flow list|show|cancel` 用於檢查的持久性多步驟流程。

請參閱 [任務流程](/zh-Hant/automation/taskflow)。

### 常駐指令

常駐指令授予代理對定義程式的永久操作權限。它們存在於工作區檔案中（通常是 `AGENTS.md`），並會注入到每個工作階段中。結合 cron 使用以進行基於時間的強制執行。

請參閱 [常駐指令](/zh-Hant/automation/standing-orders)。

### 掛鉤

內部掛鉤是由代理生命週期事件
(`/new`、 `/reset`、 `/stop`)、工作階段壓縮、閘道啟動和訊息
流程觸發的事件驅動腳本。它們會從目錄中自動被發現，並可使用
`openclaw hooks` 進行管理。若要進行行程內工具呼叫攔截，請使用
[外掛程式掛鉤](/zh-Hant/plugins/hooks)。

請參閱 [掛鉤](/zh-Hant/automation/hooks)。

### 心跳

心跳是一種週期性的主工作階段輪次（預設每 30 分鐘一次）。它會在一次具有完整工作階段背景的代理輪次中批次處理多項檢查（收件匣、行事曆、通知）。心跳輪次不會建立任務記錄，也不會延長每日/閒置工作階段重設的新鮮度。請使用 `HEARTBEAT.md` 作為小型檢查清單，或者當您想要在心跳本身內部進行僅到期週期性檢查時，使用 `tasks:` 區塊。空的心跳檔案會跳過並顯示為 `empty-heartbeat-file`；僅到期任務模式會跳過並顯示為 `no-tasks-due`。

請參閱 [心跳](/zh-Hant/gateway/heartbeat)。

## 它們如何協同運作

- **Cron** 處理精確的排程（每日報告、每週審查）和一次性提醒。所有的 cron 執行都會建立任務記錄。
- **Heartbeat** 負責每 30 分鐘在單一批次中處理常規監控（收件匣、日曆、通知）。
- **Hooks** 使用自訂腳本對特定事件（工作階段重設、壓縮、訊息流）做出反應。外掛程式掛鉤涵蓋工具呼叫。
- **Standing orders** 提供代理程式持續的背景和權限邊界。
- **Task Flow** 在個別任務之上協調多步驟流程。
- **Tasks** 自動追蹤所有分離的工作，以便您檢查和稽核。

## 相關連結

- [Scheduled Tasks](/zh-Hant/automation/cron-jobs) — 精確排程和一次性提醒
- [Background Tasks](/zh-Hant/automation/tasks) — 所有分離工作的任務分類帳
- [Task Flow](/zh-Hant/automation/taskflow) — 持久的多步驟流程編排
- [Hooks](/zh-Hant/automation/hooks) — 事件驅動的生命週期腳本
- [Plugin hooks](/zh-Hant/plugins/hooks) — 程序內工具、提示、訊息和生命週期掛鉤
- [Standing Orders](/zh-Hant/automation/standing-orders) — 持久的代理程式指令
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 週期性主工作階段輪次
- [Configuration Reference](/zh-Hant/gateway/configuration-reference) — 所有配置鍵
