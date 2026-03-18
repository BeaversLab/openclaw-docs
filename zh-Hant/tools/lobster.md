---
title: Lobster
summary: "適用於 OpenClaw 的具型別工作流程執行時，具有可恢復的審批閘門。"
description: 適用於 OpenClaw 的具型別工作流程執行時 — 具有審批閘門的可組合管道。
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster 是一個工作流程外殼，讓 OpenClaw 能夠將多步驟工具序列作為單一、確定性操作執行，並具有明確的審批檢查點。

## Hook

您的助理可以建構管理自身的工具。要求一個工作流程，30 分鐘後您就會擁有一個 CLI 以及能透過單一呼叫執行的管道。Lobster 是缺失的一環：確定性管道、明確審批以及可恢復狀態。

## Why

如今，複雜的工作流程需要多次反覆的工具呼叫。每次呼叫都消耗 Token，且 LLM 必須協調每個步驟。Lobster 將這種協調轉移到具型別的執行時中：

- **一次呼叫取代多次呼叫**：OpenClaw 執行一次 Lobster 工具呼叫並取得結構化結果。
- **內建審批**：副作用（傳送電子郵件、發表評論）會暫停工作流程，直到獲得明確批准。
- **可恢復**：暫停的工作流程會傳回一個 Token；批准後即可恢復，無需重新執行所有內容。

## Why a DSL instead of plain programs?

Lobster 刻意保持精簡。目標不是「一門新語言」，而是一個可預測、對 AI 友善的管道規格，具有一級審批和恢復 Token。

- **內建審批/恢復**：普通程式可以提示人類，但除非您自行設計該執行時，否則無法使用持續性 Token _暫停並恢復_。
- **確定性 + 可稽核性**：管道即數據，因此易於記錄、比較差異、重新執行和審查。
- **受限的 AI 介面**：微小的文法 + JSON 管道可減少「創意」程式碼路徑，並使驗證變得切合實際。
- **內建安全策略**：逾時、輸出上限、沙箱檢查和允許清單由執行時強制執行，而非每個腳本。
- **仍可程式化**：每個步驟都可以呼叫任何 CLI 或腳本。如果您需要 JS/TS，請從程式碼生成 `.lobster` 檔案。

## How it works

OpenClaw 在 **工具模式** 下啟動本機 `lobster` CLI，並從 stdout 解析 JSON 信封。
如果管道暫停等待審批，工具會傳回一個 `resumeToken`，以便您稍後繼續。

## Pattern: small CLI + JSON pipes + approvals

建構能輸出 JSON 的微小指令，然後將其串接至單一 Lobster 呼叫。（下列為範例指令名稱 — 請替換為您自己的名稱。）

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

如果管道請求核准，請使用以下權杖恢復：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 觸發工作流程；Lobster 執行步驟。核准閘門能讓副作用保持明確且可稽核。

範例：將輸入項目對應至工具呼叫：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 僅 JSON 的 LLM 步驟 (llm-task)

對於需要**結構化 LLM 步驟**的工作流程，請啟用選用的
`llm-task` 插件工具並從 Lobster 呼叫它。這能保持工作流程的
確定性，同時仍允許您使用模型進行分類/摘要/草擬。

啟用該工具：

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

詳情與設定選項請參閱 [LLM Task](/zh-Hant/tools/llm-task)。

## 工作流程檔案 (.lobster)

Lobster 可執行含有 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 欄位的 YAML/JSON 工作流程檔案。在 OpenClaw 工具呼叫中，請將 `pipeline` 設為檔案路徑。

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
- `condition` (或 `when`) 可根據 `$step.approved` 對步驟進行閘控。

## 安裝 Lobster

在執行 OpenClaw Gateway 的**同一台主機**上安裝 Lobster CLI（請參閱 [Lobster repo](https://github.com/openclaw/lobster)），並確保 `lobster` 在 `PATH` 上。

## 啟用工具

Lobster 是一個**選用**的插件工具（預設未啟用）。

建議做法（累加式、安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或是針對每個代理程式：

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

除非您打算以嚴格的允許清單模式執行，否則請避免使用 `tools.allow: ["lobster"]`。

注意：允許清單對選用插件為選用加入。如果您的允許清單僅列出
插件工具（例如 `lobster`），OpenClaw 將保持核心工具啟用。若要限制核心
工具，請一併將您想要的核心工具或群組加入允許清單中。

## 範例：Email 分類

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

傳回 JSON 信封（已截斷）：

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

使用者核准 → 恢復：

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

以工具模式執行 pipeline。

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

- `cwd`：pipeline 的相對工作目錄（必須保持在當前程序工作目錄內）。
- `timeoutMs`：如果子程序超過此持續時間則將其終止（預設值：20000）。
- `maxStdoutBytes`：如果 stdout 超過此大小則將子程序終止（預設值：512000）。
- `argsJson`：傳遞給 `lobster run --args-json` 的 JSON 字串（僅限工作流程檔案）。

## 輸出信封

Lobster 返回具有以下三種狀態之一的 JSON 信封：

- `ok` → 成功完成
- `needs_approval` → 已暫停；需要 `requiresApproval.resumeToken` 才能繼續
- `cancelled` → 已明確拒絕或取消

該工具會在 `content`（美化 JSON）和 `details`（原始物件）中顯示信封。

## 批准

如果存在 `requiresApproval`，請檢查提示並決定：

- `approve: true` → 繼續並執行副作用
- `approve: false` → 取消並結束工作流程

使用 `approve --preview-from-stdin --limit N` 將 JSON 預覽附加到批准請求，無需自訂 jq/heredoc 膠合程式。Resume tokens 現已精簡：Lobster 將工作流程繼續狀態儲存在其狀態目錄下，並傳回一個小的 token key。

## OpenProse

OpenProse 與 Lobster 搭配得很好：使用 `/prose` 協調多代理準備工作，然後執行 Lobster pipeline 以進行確定性批准。如果 Prose 程式需要 Lobster，請透過 `tools.subagents.tools` 允許子代理使用 `lobster` 工具。請參閱 [OpenProse](/zh-Hant/prose)。

## 安全性

- **僅限本機子程序** —— 外掛程式本身不會進行網路呼叫。
- **無秘密** —— Lobster 不管理 OAuth；它會呼叫負責管理的 OpenClaw 工具。
- **感知沙箱** —— 當工具上下文處於沙箱中時將停用。
- **加固** —— 在 `PATH` 上具有固定的可執行檔名稱（`lobster`）；並強制執行逾時和輸出上限。

## 疑難排解

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或將長管線拆分。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或減少輸出大小。
- **`lobster returned invalid JSON`** → 確保管線在工具模式下運行並且僅輸出 JSON。
- **`lobster failed (code …)`** → 在終端機中運行相同的管線以檢查 stderr。

## 了解更多

- [外掛程式](/zh-Hant/tools/plugin)
- [外掛工具製作](/zh-Hant/plugins/agent-tools)

## 案例研究：社群工作流程

一個公開範例：一個「第二大脑」CLI + Lobster 管線，用於管理三個 Markdown 儲存庫（個人、夥伴、共享）。該 CLI 針對統計資料、收件匣列表和陳舊掃描輸出 JSON；Lobster 將這些指令連結成 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 等工作流程，每個都有審核閘門。當 AI 可用時，它會處理判斷（分類）；否則會回退到確定性規則。

- 討論串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 儲存庫：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
