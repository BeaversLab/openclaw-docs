---
title: Lobster
summary: "適用於 OpenClaw 的型別化工作流程執行環境，具備可恢復的審核閘道。"
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster 是一個工作流程外層殼 (shell)，讓 OpenClaw 能將多步驟的工具序列作為單一、確定性的操作來執行，並包含明確的審核檢查點。

## Hook

您的助理可以建構管理自身的工具。要求一個工作流程，30 分鐘後您就會獲得可透過單一呼叫執行的 CLI 與管線。Lobster 是這謎題的最後一塊拼圖：確定性的管線、明確的審核與可恢復的狀態。

## Why

目前，複雜的工作流程需要多次反覆的工具呼叫。每次呼叫都會消耗 token，且 LLM 必須協調每個步驟。Lobster 將這種協調移至型別化執行環境中：

- **單次呼叫取代多次呼叫**：OpenClaw 執行一次 Lobster 工具呼叫並取得結構化的結果。
- **內建審核**：副作用 (傳送電子郵件、張貼留言) 會暫停工作流程，直到經過明確審核。
- **可恢復**：暫停的工作流程會回傳一組 token；您可以通過審核後繼續，無需重新執行所有步驟。

## Why a DSL instead of plain programs?

Lobster 刻意保持精簡。目標並非「一種新語言」，而是提供一個可預測、友善 AI 的管線規格，具備第一級公民 (first-class) 的審核與恢復 token。

- **內建審核/恢復**：一般程式雖然可以提示人類，但除非您自行設計該執行環境，否則無法透過持久性 token 來 _暫停並恢復_。
- **確定性與可審計性**：管線即資料，因此容易記錄、比對差異、重播與審查。
- **受限的 AI 互動介面**：極小的文法加上 JSON 管線，能減少「創意」程式碼路徑，使驗證變得務實可行。
- **內建安全性政策**：逾時、輸出上限、沙箱檢查與允許清單皆由執行環境強制執行，而非依賴各個腳本。
- **依然可程式化**：每個步驟都能呼叫任何 CLI 或腳本。如果您需要 JS/TS，可以從程式碼產生 `.lobster` 檔案。

## How it works

OpenClaw 以 **工具模式** 啟動本機 `lobster` CLI，並從 stdout 解析 JSON 信封。
若管線因審核而暫停，工具會回傳一個 `resumeToken`，方便您稍後繼續。

## Pattern: small CLI + JSON pipes + approvals

建構使用 JSON 通訊的微型指令，然後將其串接成單一 Lobster 呼叫。(下列範例指令名稱 — 請換成您自己的名稱。)

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

如果管道請求批准，請使用 token 恢復：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 觸發工作流程；Lobster 執行步驟。批准閘門使副作用明確且可審計。

範例：將輸入項目映射到工具呼叫：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 僅限 JSON 的 LLM 步驟 (llm-task)

對於需要**結構化 LLM 步驟**的工作流程，請啟用可選的
`llm-task` 插件工具並從 Lobster 呼叫它。這在保持工作流程確定性的同時，仍允許您使用模型進行分類/摘要/起草。

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

詳情及配置選項請參閱 [LLM Task](/zh-Hant/tools/llm-task)。

## 工作流程檔案 (.lobster)

Lobster 可以執行包含 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 欄位的 YAML/JSON 工作流程檔案。在 OpenClaw 工具呼叫中，將 `pipeline` 設定為檔案路徑。

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
- `condition` (或 `when`) 可以在 `$step.approved` 上對步驟進行閘控。

## 安裝 Lobster

在執行 OpenClaw Gateway 的**相同主機**上安裝 Lobster CLI (請參閱 [Lobster repo](https://github.com/openclaw/lobster))，並確保 `lobster` 在 `PATH` 中。

## 啟用工具

Lobster 是一個**可選**的插件工具 (預設未啟用)。

建議 (累加式，安全)：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或針對每個 agent：

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

除非您打算在限制性允許清單 模式下執行，否則請避免使用 `tools.allow: ["lobster"]`。

注意：允許清單對於可選插件是選用的。如果您的允許清單僅命名
插件工具 (例如 `lobster`)，OpenClaw 會保持核心工具啟用。若要限制核心
工具，請在允許清單中一併包含您想要的核心工具或群組。

## 範例：Email 分流

沒有 Lobster：

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

傳回 JSON 信封 (已截斷)：

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

- `cwd`: 管道的相對工作目錄（必須保持在當前進程工作目錄內）。
- `timeoutMs`: 如果子進程超過此持續時間則將其終止（預設值：20000）。
- `maxStdoutBytes`: 如果 stdout 超過此大小則終止子進程（預設值：512000）。
- `argsJson`: 傳遞給 `lobster run --args-json` 的 JSON 字串（僅限工作流程檔案）。

## 輸出封套

Lobster 返回具有以下三種狀態之一的 JSON 封套：

- `ok` → 已成功完成
- `needs_approval` → 已暫停；需要 `requiresApproval.resumeToken` 才能恢復
- `cancelled` → 已明確拒絕或取消

該工具會在 `content`（美化 JSON）和 `details`（原始物件）中呈現封套。

## 批准

如果存在 `requiresApproval`，請檢查提示並決定：

- `approve: true` → 恢復並繼續副作用
- `approve: false` → 取消並完成工作流程

使用 `approve --preview-from-stdin --limit N` 將 JSON 預覽附加到批准請求，而無需自訂 jq/heredoc 黏合程式。恢復權杖現在緊湊：Lobster 將工作流程恢復狀態儲存在其狀態目錄下，並交回一個小的權杖金鑰。

## OpenProse

OpenProse 與 Lobster 搭配得很好：使用 `/prose` 編排多代理準備工作，然後執行 Lobster 管道進行確定性批准。如果 Prose 程式需要 Lobster，請透過 `tools.subagents.tools` 允許子代理使用 `lobster` 工具。請參閱 [OpenProse](/zh-Hant/prose)。

## 安全性

- **僅限本機子進程** — 外掛程式本身不會進行網路呼叫。
- **無機密** — Lobster 不管理 OAuth；它呼叫管理 OAuth 的 OpenClaw 工具。
- **沙盒感知** — 當工具上下文位於沙盒中時會停用。
- **加固** — 在 `PATH` 上使用固定的可執行檔名稱（`lobster`）；強制執行逾時和輸出上限。

## 故障排除

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或拆分長管道。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或減少輸出大小。
- **`lobster returned invalid JSON`** → 確保管線在工具模式下執行並且僅輸出 JSON。
- **`lobster failed (code …)`** → 在終端機中執行相同的管線以檢查標準錯誤輸出。

## 了解更多

- [外掛程式](/zh-Hant/tools/plugin)
- [外掛工具撰寫](/zh-Hant/plugins/agent-tools)

## 案例研究：社群工作流程

一個公開範例：一個管理三個 Markdown 儲存庫（個人、夥伴、共用）的「第二個大腦」CLI + Lobster 管線。該 CLI 發出統計資料、收件匣列表和過期掃描的 JSON；Lobster 將這些指令鏈結成工作流程，例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每個都有批准檢查點。AI 在可用時處理判斷（分類），在不可用時回退到確定性規則。

- 討論串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 程式庫：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
