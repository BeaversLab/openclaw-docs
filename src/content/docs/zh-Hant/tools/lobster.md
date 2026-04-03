---
title: Lobster
summary: "適用於 OpenClaw 的具類型工作流程執行環境，具備可恢復的審批閘道。"
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster 是一個工作流程外殼，讓 OpenClaw 能將多步驟工具序列作為單一、確定性的操作來執行，並具有明確的審批檢查點。

Lobster 是位於分離式背景工作之上的其中一個編寫層。如果您遇到較舊的 `ClawFlow` 術語，請將其視為環繞相同任務導向執行環境的歷史命名；目前面向操作者的 CLI 介面為 [`openclaw tasks`](/en/automation/tasks)。

## Hook

您的助理可以建構管理自身的工具。請求一個工作流程，30 分鐘後您就會獲得一個可作為單一呼叫執行的 CLI 和管線。Lobster 就是缺失的那一塊拼圖：確定性的管線、明確的審核，以及可恢復的狀態。

## Why

如今，複雜的工作流程需要多次來回的工具呼叫。每次呼叫都會消耗 token，而且 LLM 必須協調每個步驟。Lobster 將該協調工作移至具有類型的執行環境中：

- **一次呼叫代替多次**：OpenClaw 執行一次 Lobster 工具呼叫並獲得結構化結果。
- **內建審核**：副作用（發送電子郵件、發布評論）會暫停工作流程，直到獲得明確批准。
- **可恢復**：暫停的工作流程會傳回一個 token；批准後即可恢復，無需重新執行所有內容。

## Why a DSL instead of plain programs?

Lobster 刻意保持小巧。目標並非「一門新語言」，而是一個可預測、對 AI 友善的管線規格，具備一等公民的審核和恢復 token。

- **內建批准/恢復**：一般的程式可以提示人類，但除非您自己發明該執行環境，否則它無法使用持續存在的 token 來 _暫停並恢復_。
- **確定性 + 可稽核性**：管線即數據，因此易於記錄、差異比較、重播和審查。
- **受限的 AI 介面**：微小的文法 + JSON 管線減少了「創意」程式碼路徑，並使驗證變得實際可行。
- **內建安全策略**：逾時、輸出上限、沙盒檢查和允許清單由執行環境強制執行，而非每個腳本自行處理。
- **仍可程式化**：每個步驟都可以呼叫任何 CLI 或腳本。如果您需要 JS/TS，可以從程式碼產生 `.lobster` 檔案。

## How it works

OpenClaw 會在本機 `lobster` CLI 中以 **工具模式** 啟動，並從 stdout 解析 JSON 信封。
如果管線因等待審核而暫停，工具會傳回一個 `resumeToken`，以便您稍後繼續。

## Pattern: small CLI + JSON pipes + approvals

構建說 JSON 的小型指令，然後將它們串連成單一 Lobster 呼叫。（下面的指令名稱為範例 — 請替換為您自己的。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

如果管道請求批准，請使用 token 繼續：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 觸發工作流程；Lobster 執行步驟。批准閘門確保副作用明確且可審計。

範例：將輸入項目對應至工具呼叫：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 僅限 JSON 的 LLM 步驟

對於需要**結構化 LLM 步驟**的工作流程，請啟用選用的
`llm-task` 外掛工具並從 Lobster 呼叫它。這能保持工作流程
具有確定性，同時仍讓您使用模型進行分類/摘要/起草。

啟用工具：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

在管道中使用它：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

詳情與設定選項，請參閱 [LLM Task](/en/tools/llm-task)。

## 工作流程檔案

Lobster 可以執行包含 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 欄位的 YAML/JSON 工作流程檔案。在 OpenClaw 工具呼叫中，將 `pipeline` 設為檔案路徑。

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

備註：

- `stdin: $step.stdout` 和 `stdin: $step.json` 會傳遞前一步驟的輸出。
- `condition`（或 `when`）可以根據 `$step.approved` 來閘控步驟。

## 安裝 Lobster

在執行 OpenClaw Gateway 的**相同主機**上安裝 Lobster CLI（請參閱 [Lobster repo](https://github.com/openclaw/lobster)），並確保 `lobster` 位於 `PATH` 上。

## 啟用工具

Lobster 是一個**選用**的外掛工具（預設不啟用）。

建議（累加式，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或是針對個別代理程式：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

除非您打算以限制性允許清單模式執行，否則請避免使用 `tools.allow: ["lobster"]`。

備註：允許清單對選用外掛而言為加入採用。如果您的允許清單僅列出了
外掛工具（例如 `lobster`），OpenClaw 會保持核心工具為啟用狀態。若要限制核心
工具，請將您想要的核心工具或群組也包含在允許清單中。

## 範例：Email 分類

未使用 Lobster：

```
User: "Check my email and draft replies"
→ openclaw calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
(repeat daily, no memory of what was triaged)
```

使用 Lobster：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

傳回 JSON 信封（截斷）：

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

使用者批准 → 繼續：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

單一工作流程。確定性。安全。

## 工具參數

### `run`

以工具模式運行管線。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

使用參數運行工作流程檔案：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

在批准後繼續已暫停的工作流程。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可選輸入

- `cwd`：管線的相對工作目錄（必須保持在當前程序工作目錄內）。
- `timeoutMs`：如果持續時間超過此值，則終止子程序（預設值：20000）。
- `maxStdoutBytes`：如果 stdout 超過此大小，則終止子程序（預設值：512000）。
- `argsJson`：傳遞給 `lobster run --args-json` 的 JSON 字串（僅限工作流程檔案）。

## 輸出包絡

Lobster 會傳回具有以下三種狀態之一的 JSON 包絡：

- `ok` → 已成功完成
- `needs_approval` → 已暫停；需要 `requiresApproval.resumeToken` 才能恢復
- `cancelled` → 已明確拒絕或取消

此工具會在 `content`（美觀的 JSON）和 `details`（原始物件）中呈現包絡。

## 批准

如果存在 `requiresApproval`，請檢查提示並決定：

- `approve: true` → 恢復並繼續副作用
- `approve: false` → 取消並完成工作流程

使用 `approve --preview-from-stdin --limit N` 將 JSON 預覽附加至批准請求，而無需自訂 jq/heredoc 粘合。恢復令牌現在變得緊湊：Lobster 將工作流程恢復狀態儲存在其狀態目錄下，並傳回一個小型令牌金鑰。

## OpenProse

OpenProse 與 Lobster 搭配得很好：使用 `/prose` 來協調多代理準備，然後執行 Lobster 管線以進行確定性批准。如果 Prose 程式需要 Lobster，請透過 `tools.subagents.tools` 允許子代理使用 `lobster` 工具。請參閱 [OpenProse](/en/prose)。

## 安全性

- **僅限本機子程序**——外掛程式本身不會進行網路呼叫。
- **無機密**——Lobster 不管理 OAuth；它會呼叫處理此類作業的 OpenClaw 工具。
- **具有沙盒感知能力**——當工具內容位於沙盒中時會停用。
- **已強化**——在 `PATH` 上具有固定的可執行檔名稱（`lobster`）；會強制執行逾時和輸出上限。

## 疑難排解

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或將長管線拆分。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或減少輸出大小。
- **`lobster returned invalid JSON`** → 確保管線在工具模式下運行，並且僅輸出 JSON。
- **`lobster failed (code …)`** → 在終端機中運行相同的管線以檢查 stderr。

## 了解更多

- [外掛程式](/en/tools/plugin)
- [外掛程式工具編寫](/en/plugins/building-plugins#registering-agent-tools)

## 案例研究：社群工作流程

一個公開範例：一個管理三個 Markdown 儲存庫（個人、合作夥伴、共用）的「第二顆大腦」CLI + Lobster 管線。CLI 輸出統計數據、收件匣列表和過期掃描的 JSON；Lobster 將這些指令鏈結成像 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 這樣的工作流程，每個都有審核閘門。當可用時，AI 處理判斷（分類），不可用時則回退到確定性規則。

- 討論串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 程式庫：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相關

- [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) — 排程 Lobster 工作流程
- [自動化總覽](/en/automation) — 所有自動化機制
- [工具總覽](/en/tools) — 所有可用的代理程式工具
