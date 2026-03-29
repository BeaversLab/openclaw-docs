---
title: Lobster
summary: "適用於 OpenClaw 的具類型工作流程執行環境，具備可恢復的審批閘道。"
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster 是一個工作流程外殼，讓 OpenClaw 能將多步驟工具序列作為單一、確定性的操作來執行，並具有明確的審批檢查點。

## Hook

您的助理可以建構管理自身的工具。要求一個工作流程，30 分鐘後您就會擁有一個 CLI 以及可作為單一呼叫執行的管線。Lobster 是缺失的一環：確定性管線、明確審批以及可恢復狀態。

## 為何使用

目前，複雜的工作流程需要多次來回的工具呼叫。每次呼叫都會消耗 token，且 LLM 必須協調每個步驟。Lobster 將這種協調轉移到具類型的執行環境中：

- **一次呼叫取代多次呼叫**：OpenClaw 執行一次 Lobster 工具呼叫並獲得結構化結果。
- **內建審批**：副作用（發送電子郵件、發布評論）會暫停工作流程，直到獲得明確批准。
- **可恢復**：暫停的工作流程會返回一個 token；批准後即可恢復，無需重新執行所有步驟。

## 為何使用 DSL 而非一般程式？

Lobster 有意保持精簡。目標不是「一種新語言」，而是一個可預測、對 AI 友善的管線規格，具備第一等級的審批和恢復 token。

- **內建審批/恢復**：一般程式可以提示人類，但若不自行發明該執行環境，就無法使用持續性 token 來「暫停並恢復」。
- **確定性 + 可稽核性**：管線即資料，因此容易記錄、比對、重播和審查。
- **受限的 AI 介面**：微小的語法 + JSON 管線減少了「創意」程式碼路徑，使驗證變得實際可行。
- **內建安全原則**：逾時、輸出上限、沙盒檢查和允許清單由執行環境強制執行，而非由各個腳本執行。
- **仍可程式化**：每個步驟都可以呼叫任何 CLI 或腳本。如果您想要 JS/TS，可以從程式碼產生 `.lobster` 檔案。

## 運作方式

OpenClaw 以 **工具模式** 啟動本機 `lobster` CLI，並從 stdout 解析 JSON 信封。
如果管線因審批而暫停，工具會返回一個 `resumeToken`，以便您稍後繼續。

## 模式：小型 CLI + JSON 管線 + 審批

建構能夠輸出 JSON 的微小指令，然後將其鏈結成單一 Lobster 呼叫。（以下為範例指令名稱 — 請替換為您自己的名稱。）

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

如果流程要求批准，請使用以下 Token 恢復：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 觸發工作流；Lobster 執行步驟。批准門控使副作用變得明確且可審計。

範例：將輸入項目映射為工具呼叫：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 僅限 JSON 的 LLM 步驟 (llm-task)

對於需要**結構化 LLM 步驟**的工作流，請啟用選用的
`llm-task` 插件工具並從 Lobster 呼叫它。這既能保持工作流
的確定性，同時仍允許您使用模型進行分類/摘要/起草。

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

在流程中使用：

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

請參閱 [LLM Task](/en/tools/llm-task) 以了解詳細資訊和設定選項。

## 工作流檔案 (.lobster)

Lobster 可以執行包含 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 欄位的 YAML/JSON 工作流檔案。在 OpenClaw 工具呼叫中，將 `pipeline` 設定為檔案路徑。

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

注意事項：

- `stdin: $step.stdout` 和 `stdin: $step.json` 會傳遞先前步驟的輸出。
- `condition` (或 `when`) 可以根據 `$step.approved` 對步驟進行門控。

## 安裝 Lobster

請在執行 OpenClaw Gateway 的**同一台主機**上安裝 Lobster CLI (參閱 [Lobster repo](https://github.com/openclaw/lobster))，並確保 `lobster` 在 `PATH` 中。

## 啟用工具

Lobster 是一個**選用**的插件工具 (預設不啟用)。

建議 (累加式，安全)：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或針對特定代理程式 (per-agent)：

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

除非您打算在限制性允許清單模式下執行，否則請避免使用 `tools.allow: ["lobster"]`。

注意：允許清單是選用插件的選用加入功能。如果您的允許清單僅列出
插件工具 (例如 `lobster`)，OpenClaw 將保持核心工具啟用狀態。若要限制核心
工具，請將您想要的核心工具或群組也加入允許清單中。

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

傳回 JSON 封裝 (截斷)：

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

單一工作流。確定性。安全。

## 工具參數

### `run`

以工具模式執行流程。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

使用參數執行工作流檔案：

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
- `timeoutMs`：如果子程序超過此持續時間，則終止它（預設值：20000）。
- `maxStdoutBytes`：如果 stdout 超過此大小，則終止子程序（預設值：512000）。
- `argsJson`：傳遞給 `lobster run --args-json` 的 JSON 字串（僅限工作流程檔案）。

## 輸出包絡

Lobster 會傳回具有三種狀態之一的 JSON 包絡：

- `ok` → 已成功完成
- `needs_approval` → 已暫停；需要 `requiresApproval.resumeToken` 才能恢復
- `cancelled` → 已明確拒絕或取消

此工具會在 `content`（美觀的 JSON）和 `details`（原始物件）中顯示包絡。

## 批准

如果存在 `requiresApproval`，請檢查提示並決定：

- `approve: true` → 恢復並繼續副作用
- `approve: false` → 取消並完成工作流程

使用 `approve --preview-from-stdin --limit N` 將 JSON 預覽附加到批准請求，而無需自訂 jq/heredoc 黏合程式。恢復權杖現已緊湊：Lobster 將工作流程恢復狀態儲存在其狀態目錄下，並傳回一個小型權杖金鑰。

## OpenProse

OpenProse 與 Lobster 搭配得很好：使用 `/prose` 來編排多代理準備工作，然後執行 Lobster 管線以進行確定性批准。如果 Prose 程式需要 Lobster，請透過 `tools.subagents.tools` 允許子代理使用 `lobster` 工具。請參閱 [OpenProse](/en/prose)。

## 安全性

- **僅限本地子程序** — 外掛程式本身不會進行網路呼叫。
- **無秘密** — Lobster 不管理 OAuth；它會呼叫負責管理的 OpenClaw 工具。
- **感知沙盒** — 當工具上下文位於沙盒中時停用。
- **強化防護** — 在 `PATH` 上具有固定的可執行檔名稱 (`lobster`)；已強制執行逾時和輸出上限。

## 疑難排解

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或拆分長管線。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或減少輸出大小。
- **`lobster returned invalid JSON`** → 確保管道在工具模式下運行，並僅輸出 JSON。
- **`lobster failed (code …)`** → 在終端機中執行相同的管道以檢查 stderr。

## 深入了解

- [外掛程式](/en/tools/plugin)
- [外掛工具撰寫](/en/plugins/building-plugins#registering-agent-tools)

## 案例研究：社群工作流程

一個公開範例：一個管理三個 Markdown 儲存庫（個人、合作夥伴、共用）的「第二個大腦」CLI + Lobster 管道。該 CLI 會針對統計資料、收件匣列表和過時掃描輸出 JSON；Lobster 將這些指令鏈結成 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync` 等工作流程，每個都有審核閘門。AI 會在可用時處理判斷（分類），並在不可用時回退到確定性規則。

- 討論串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 程式庫：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)
