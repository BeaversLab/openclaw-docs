---
summary: "OpenClaw 的類型化工作流程執行環境，具備可恢復的審批閘門。"
title: Lobster
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

Lobster 是一個工作流程殼層，讓 OpenClaw 將多步驟工具序列作為單一、確定性的操作執行，並具有明確的審批檢查點。

Lobster 是位於獨立後台工作之上的撰寫層級。若要了解個別任務之上的流程編排，請參閱 [Task Flow](/zh-Hant/automation/taskflow) (`openclaw tasks flow`)。若要了解任務活動帳本，請參閱 [`openclaw tasks`](/zh-Hant/automation/tasks)。

## Hook

您的助理可以建構管理自身的工具。提出一個工作流程，30 分鐘後您就會獲得一個 CLI 以及作為單一呼叫執行的管線。Lobster 就是缺失的那一塊拼圖：確定性的管線、明確的審批以及可恢復的狀態。

## Why

如今，複雜的工作流程需要許多來回的工具呼叫。每次呼叫都會消耗 token，而且 LLM 必須編排每個步驟。Lobster 將這種編排轉移到類型化執行環境中：

- **一次呼叫取代多次呼叫**：OpenClaw 執行一次 Lobster 工具呼叫並獲得結構化結果。
- **內建審批機制**：副作用（傳送電子郵件、發表評論）會暫停工作流程，直到獲得明確批准。
- **可恢復**：暫停的工作流程會傳回一個 token；您可以批准並恢復，而無需重新執行所有步驟。

## Why a DSL instead of plain programs?

Lobster 故意保持小巧。目標不是「一種新語言」，而是一個可預測、對 AI 友善的管線規格，具備一等審批與恢復 token。

- **內建審批/恢復機制**：一般的程式可以提示人類，但除非您自行發明該執行環境，否則無法使用持續性 token 來「暫停並恢復」。
- **確定性 + 可稽核性**：管線即資料，因此容易記錄、比較、重新執行和審查。
- **受限的 AI 介面**：微小的語法 + JSON 管線傳遞可減少「創意」程式碼路徑，並使驗證變得切合實際。
- **內建安全原則**：逾時、輸出上限、沙箱檢查和允許清單由執行環境強制執行，而非由各個腳本執行。
- **依然可程式化**：每個步驟都可以呼叫任何 CLI 或腳本。如果您想要 JS/TS，可以從程式碼產生 `.lobster` 檔案。

## How it works

OpenClaw 使用內嵌執行器**在程序內**執行 Lobster 工作流程。不會產生外部 CLI 子程序；工作流程引擎在 gateway 程序內執行，並直接回傳 JSON 信封。
如果管線暫停以等待核准，工具會回傳 `resumeToken` 以便您稍後繼續。

## 模式：小型 CLI + JSON 管線 + 核准

建構使用 JSON 進行通訊的微型指令，然後將它們鏈結成單一 Lobster 呼叫。（下為範例指令名稱 — 請替換為您自己的名稱。）

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
`llm-task` 外掛工具並從 Lobster 呼叫它。這讓工作流程保持確定性，同時仍讓您使用模型進行分類/摘要/起草。

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

在管線中使用它：

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

請參閱 [LLM Task](/zh-Hant/tools/llm-task) 以取得詳細資訊和設定選項。

## 工作流程檔案 (.lobster)

Lobster 可以使用 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 欄位來執行 YAML/JSON 工作流程檔案。在 OpenClaw 工具呼叫中，將 `pipeline` 設定為檔案路徑。

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

- `stdin: $step.stdout` 和 `stdin: $step.json` 會傳遞先前步驟的輸出。
- `condition` (或 `when`) 可以根據 `$step.approved` 對步驟進行閘道控制。

## 安裝 Lobster

套件組合的 Lobster 工作流程在程序內執行；不需要單獨的 `lobster` 二進位檔。內嵌執行器隨附於 Lobster 外掛中。

如果您需要獨立的 Lobster CLI 以進行開發或外部管線，請從 [Lobster repo](https://github.com/openclaw/lobster) 安裝它，並確保 `lobster` 在 `PATH` 中。

## 啟用工具

Lobster 是一個**選用**的外掛工具（預設不啟用）。

建議（累加式、安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或每個代理程式：

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

除非您打算在嚴格的允許清單模式下運行，否則請避免使用 `tools.allow: ["lobster"]`。

<Note>允許清單對於可選插件是選擇加入的。如果您的允許清單僅列出了插件工具（例如 `lobster`），OpenClaw 將保持核心工具啟用。若要限制核心工具，請在允許清單中也包含您想要的核心工具或群組。</Note>

## 範例：電子郵件分流

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

使用者批准 → 恢復：

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

以工具模式執行管線。

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

- `cwd`：管線的相對工作目錄（必須保持在閘道工作目錄內）。
- `timeoutMs`：如果工作流程超過此持續時間則中止（預設值：20000）。
- `maxStdoutBytes`：如果輸出超過此大小則中止（預設值：512000）。
- `argsJson`：傳遞給 `lobster run --args-json` 的 JSON 字串（僅限工作流程檔案）。

## 輸出信封

Lobster 會傳回具有以下三種狀態之一的 JSON 信封：

- `ok` → 成功完成
- `needs_approval` → 已暫停；需要 `requiresApproval.resumeToken` 才能恢復
- `cancelled` → 已明確拒絕或取消

該工具會同時以 `content`（美化 JSON）和 `details`（原始物件）的形式呈現信封。

## 批准

如果存在 `requiresApproval`，請檢查提示並決定：

- `approve: true` → 恢復並繼續副作用
- `approve: false` → 取消並完成工作流程

使用 `approve --preview-from-stdin --limit N` 將 JSON 預覽附加至批准請求，而無需自定義 jq/heredoc 黏合劑。恢復令牌現在更緊湊：Lobster 將工作流程恢復狀態儲存在其狀態目錄下，並傳回一個小的令牌金鑰。

## OpenProse

OpenProse 與 Lobster 搭配得很好：使用 `/prose` 來協調多智能體準備工作，然後運行 Lobster 管道以進行確定性批准。如果 Prose 程式需要 Lobster，請透過 `tools.subagents.tools` 允許子代理使用 `lobster` 工具。請參閱 [OpenProse](/zh-Hant/prose)。

## 安全性

- **僅限本地進程內** — 工作流程在閘道進程內執行；外掛程式本身不會發出網路呼叫。
- **無秘密金鑰** — Lobster 不管理 OAuth；它會呼叫負責管理的 OpenClaw 工具。
- **感知沙盒** — 當工具上下文處於沙盒模式時會停用。
- **已強化** — 由嵌入式執行器強制執行逾時和輸出上限。

## 疑難排解

- **`lobster timed out`** → 增加 `timeoutMs`，或拆分長管道。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或減少輸出大小。
- **`lobster returned invalid JSON`** → 確保管道在工具模式下執行並且僅列印 JSON。
- **`lobster failed`** → 檢查閘道日誌以獲取嵌入式執行器錯誤詳細資訊。

## 了解更多

- [外掛程式](/zh-Hant/tools/plugin)
- [外掛程式工具撰寫](/zh-Hant/plugins/building-plugins#registering-agent-tools)

## 案例研究：社群工作流程

一個公開範例：一個「第二大脑」CLI + Lobster 管道，用於管理三個 Markdown 儲存庫（個人、合作夥伴、共用）。CLI 發出用於統計資料、收件匣清單和陳舊掃描的 JSON；Lobster 將這些命令連結成工作流程，例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每個都有批准閘門。AI 在可用時處理判斷（分類），在不可用時回退到確定性規則。

- 主題串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 儲存庫：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相關

- [自動化與工作](/zh-Hant/automation) — 排程 Lobster 工作流程
- [自動化總覽](/zh-Hant/automation) — 所有自動化機制
- [工具總覽](/zh-Hant/tools) — 所有可用的代理工具
