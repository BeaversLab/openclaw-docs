---
summary: "適用於 OpenClaw 的類型化工作流程執行時，具備可恢復的核准閘門。"
title: Lobster
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

Lobster 是一個工作流程殼層，讓 OpenClaw 將多步驟工具序列作為單一、確定性的操作執行，並具有明確的審批檢查點。

Lobster 是位於分離背景工作之上的撰寫層級。若要進行個別任務之上的流程編排，請參閱 [Task Flow](/zh-Hant/automation/taskflow) (`openclaw tasks flow`)。若要查看任務活動分錄，請參閱 [`openclaw tasks`](/zh-Hant/automation/tasks)。

## Hook

您的助理可以建構管理自身的工具。提出一個工作流程，30 分鐘後您就會獲得一個 CLI 以及作為單一呼叫執行的管線。Lobster 就是缺失的那一塊拼圖：確定性的管線、明確的審批以及可恢復的狀態。

## Why

如今，複雜的工作流程需要許多來回的工具呼叫。每次呼叫都會消耗 token，而且 LLM 必須編排每個步驟。Lobster 將這種編排轉移到類型化執行環境中：

- **一次呼叫取代多次呼叫**：OpenClaw 執行一次 Lobster 工具呼叫並獲得結構化結果。
- **內建審批機制**：副作用（傳送電子郵件、發表評論）會暫停工作流程，直到獲得明確批准。
- **可恢復**：暫停的工作流程會傳回一個 token；您可以批准並恢復，而無需重新執行所有步驟。

## Why a DSL instead of plain programs?

Lobster 故意保持小巧。目標不是「一種新語言」，而是一個可預測、對 AI 友善的管線規格，具備一等審批與恢復 token。

- **內建核准/恢復機制**：一般的程式可以提示人員，但若不自行設計該執行時，它就無法使用持續性權杖來*暫停並恢復*。
- **決定性 + 可稽核性**：管線即資料，因此很容易記錄、比較差異、重新執行和審查。
- **受限的 AI 介面**：微小的語法 + JSON 管線可減少「創意」程式碼路徑，並讓驗證變得切合實際。
- **內建安全原則**：逾時、輸出上限、沙箱檢查和允許清單由執行環境強制執行，而非由各個腳本執行。
- **仍可程式化**：每個步驟都可以呼叫任何 CLI 或指令碼。如果您想要使用 JS/TS，可以從程式碼產生 `.lobster` 檔案。

## How it works

OpenClaw 使用內嵌執行器，以**同處理序**方式執行 Lobster 工作流程。不會產生外部 CLI 子處理序；工作流程引擎會在閘道處理序內執行，並直接傳回 JSON 信封。
如果管線因為等候核准而暫停，工具會傳回 `resumeToken`，以便您稍後繼續。

## 模式：小型 CLI + JSON 管線 + 核准

建置能講 JSON 的微小指令，然後將它們串連成單一 Lobster 呼叫。（下文為範例指令名稱 — 請替換成您自己的名稱。）

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

如果管線請求核准，請使用 token 恢復：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 觸發工作流程；Lobster 執行步驟。核准閘門可讓副作用保持明確且可審計。

範例：將輸入項目對應到工具呼叫：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 僅 JSON 的 LLM 步驟 (llm-task)

對於需要**結構化 LLM 步驟**的工作流程，請啟用選用的
`llm-task` 外掛工具，並從 Lobster 呼叫它。這能在讓您使用模型進行分類/摘要/草擬的同時，保持工作流程的決定性。

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
        "tools": { "alsoAllow": ["llm-task"] }
      }
    ]
  }
}
```

### 重要限制：內嵌 Lobster 與 `openclaw.invoke` 的比較

隨附的 Lobster 外掛會在閘道內部以**同處理序**方式執行工作流程。在該內嵌模式下，`openclaw.invoke` **不會**自動繼承用於巢狀 OpenClaw CLI 工具呼叫的閘道 URL/驗證內容。

這意味著此模式**目前在內嵌執行器中並不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

僅當在 `openclaw.invoke` 已設定正確閘道/驗證內容的環境中執行**獨立 Lobster CLI** 時，才使用下方的範例。

在獨立 Lobster CLI 管線中使用它：

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

如果您目前使用嵌入式 Lobster 插件，建議採用以下任一方式：

- 在 Lobster 外直接呼叫 `llm-task` 工具，或
- 在 Lobster 管道中使用非 `openclaw.invoke` 步驟，直到新增支援的嵌入式橋接為止。

詳情與設定選項請參閱 [LLM Task](/zh-Hant/tools/llm-task)。

## 工作流程檔案 (.lobster)

Lobster 可以執行包含 `name`、`args`、`steps`、`env`、`condition` 與 `approval` 欄位的 YAML/JSON 工作流程檔案。在 OpenClaw 工具呼叫中，將 `pipeline` 設為檔案路徑。

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

注意：

- `stdin: $step.stdout` 與 `stdin: $step.json` 會傳遞前一步驟的輸出。
- `condition`（或 `when`）可根據 `$step.approved` 對步驟進行閘控。

## 安裝 Lobster

捆綁的 Lobster 工作流程在處理序內執行；不需要單獨的 `lobster` 執行檔。嵌入式執行器隨附於 Lobster 插件。

如果您需要獨立的 Lobster CLI 進行開發或外部管道，請從 [Lobster repo](https://github.com/openclaw/lobster) 安裝，並確保 `lobster` 在 `PATH` 中。

## 啟用工具

Lobster 是一個**可選**的插件工具（預設未啟用）。

建議（新增式，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或針對每個代理程式：

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

除非您打算在限制性的允許清單模式下執行，否則請避免使用 `tools.allow: ["lobster"]`。

<Note>允許清單對可選插件採用加入制。`alsoAllow` 僅啟用指定的可選插件工具，同時保留一般的核心工具集。若要限制核心工具，請搭配您想要的核心工具或群組使用 `tools.allow`。</Note>

## 範例：電子郵件分類

不使用 Lobster：

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

一個工作流程。確定性。安全。

## 工具參數

### `run`

以工具模式執行管道。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

使用參數執行工作流程檔案：

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

- `cwd`：管道的相對工作目錄（必須保持在網關工作目錄內）。
- `timeoutMs`：如果執行時間超過此持續時間，則中止工作流程（預設值：20000）。
- `maxStdoutBytes`：如果輸出超過此大小，則中止工作流程（預設值：512000）。
- `argsJson`：傳遞給 `lobster run --args-json` 的 JSON 字串（僅限工作流程檔案）。

## 輸出信封

Lobster 會回傳一個 JSON 信封，其中包含三種狀態之一：

- `ok` → 已成功完成
- `needs_approval` → 已暫停；需要 `requiresApproval.resumeToken` 才能恢復
- `cancelled` → 已明確拒絕或取消

該工具會在 `content`（美化後的 JSON）和 `details`（原始物件）中顯示此信封。

## 核准

如果存在 `requiresApproval`，請檢查提示並決定：

- `approve: true` → 恢復並繼續副作用
- `approve: false` → 取消並完成工作流程

使用 `approve --preview-from-stdin --limit N` 將 JSON 預覽附加到核准請求，而無需自訂 jq/heredoc 粘合程式。恢復令牌現在已變得精簡：Lobster 將工作流程恢復狀態儲存在其狀態目錄下，並傳回一個小的令牌金鑰。

## OpenProse

OpenProse 與 Lobster 搭配得很好：使用 `/prose` 編排多代理準備，然後執行 Lobster 管道進行確定性核准。如果 Prose 程式需要 Lobster，請透過 `tools.subagents.tools` 允許子代理使用 `lobster` 工具。請參閱 [OpenProse](/zh-Hant/prose)。

## 安全性

- **僅限本機程序內** - 工作流程在網關程序內執行；外掛程式本身不會進行網路呼叫。
- **無機密** - Lobster 不管理 OAuth；它會呼叫管理 OAuth 的 OpenClaw 工具。
- **感知沙盒** - 當工具上下文處於沙盒中時會停用。
- **已強化** - 逾時和輸出上限由嵌入式執行器強制執行。

## 疑難排解

- **`lobster timed out`** → 增加 `timeoutMs`，或將長管道拆分。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或減少輸出大小。
- **`lobster returned invalid JSON`** → 確保管線在工具模式下執行，並僅輸出 JSON。
- **`lobster failed`** → 檢查 gateway 日誌以取得嵌入式 runner 的錯誤詳情。

## 深入了解

- [外掛](/zh-Hant/tools/plugin)
- [外掛工具撰寫](/zh-Hant/plugins/building-plugins#registering-agent-tools)

## 案例研究：社群工作流程

一個公開範例：一個「第二個大腦」CLI + Lobster 管線，用於管理三個 Markdown 儲存庫（個人、合作夥伴、共用）。該 CLI 輸出統計資料、收件匣列表和陳舊掃描的 JSON；Lobster 將這些指令串接成工作流程，例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每個都有審核關卡。當可用時，AI 處理判斷（分類），否則回退到確定性規則。

- 討論串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 儲存庫：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相關

- [Automation](/zh-Hant/automation) - 排程 Lobster 工作流程
- [自動化概覽](/zh-Hant/automation) - 所有自動化機制
- [工具概覽](/zh-Hant/tools) - 所有可用的代理工具
