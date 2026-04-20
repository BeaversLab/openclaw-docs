---
summary: "Context: 模型看到什麼、它是如何建構的，以及如何檢查它"
read_when:
  - You want to understand what “context” means in OpenClaw
  - You are debugging why the model “knows” something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Context"
---

# Context

“Context” 是 **OpenClaw 在一次執行中發送給模型的所有內容**。它受模型的 **context window**（token 限制）所限制。

初學者的心智模型：

- **System prompt**（由 OpenClaw 建構）：規則、工具、技能列表、時間/運行時，以及已注入的工作區檔案。
- **Conversation history**：您的訊息 + 此會程中助手的訊息。
- **Tool calls/results + attachments**：指令輸出、檔案讀取、圖片/音訊等。

Context _並不相同_ 於“記憶”：記憶可以儲存在磁碟上並在之後重新載入；context 則是模型當前視窗內的內容。

## Quick start (inspect context)

- `/status` → 快速查看「我的視窗有多滿？」 + 會話設定。
- `/context list` → 已注入的內容 + 粗略大小（每個檔案 + 總計）。
- `/context detail` → 更深入的分析：每個檔案、每個工具 schema 大小、每個技能項目大小，以及 system prompt 大小。
- `/usage tokens` → 將每次回覆的使用情況頁尾附加到正常回覆中。
- `/compact` → 將較舊的歷史記錄摘要為一個精簡項目，以釋放視窗空間。

另請參閱：[斜線指令](/zh-Hant/tools/slash-commands)、[Token 使用與成本](/zh-Hant/reference/token-use)、[壓縮](/zh-Hant/concepts/compaction)。

## Example output

數值會根據模型、提供者、工具原則以及您的工作區內容而有所不同。

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

## What counts toward the context window

模型接收到的所有內容都算在內，包括：

- System prompt（所有部分）。
- Conversation history。
- Tool calls + tool results。
- Attachments/transcripts（圖片/音訊/檔案）。
- Compaction summaries and pruning artifacts。
- Provider “wrappers” 或 hidden headers（不可見，但仍計算在內）。

## How OpenClaw builds the system prompt

System prompt 是 **OpenClaw 擁有** 的，並在每次執行時重建。它包括：

- Tool list + short descriptions。
- Skills list（僅限中繼資料；見下文）。
- Workspace location。
- Time（UTC + 如果有設定則轉換使用者時間）。
- Runtime metadata（主機/作業系統/模型/思考）。
- 在 **Project Context** 下注入的工作區引導檔案。

完整說明：[系統提示詞](/zh-Hant/concepts/system-prompt)。

## 注入的工作區檔案（專案上下文 Project Context）

根據預設，OpenClaw 會注入一組固定的工作區檔案（如果存在的話）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅首次執行時）

大檔案會根據 `agents.defaults.bootstrapMaxChars` 逐個檔案進行截斷（預設 `20000` 個字元）。OpenClaw 也會透過 `agents.defaults.bootstrapTotalMaxChars` 對所有檔案的總引導注入量設限（預設 `150000` 個字元）。`/context` 會顯示 **原始大小與注入大小** 以及是否發生截斷。

當發生截斷時，執行環境可以在 Project Context 下注入提示詞內的警告區塊。您可以透過 `agents.defaults.bootstrapPromptTruncationWarning` 進行設定（`off`、`once`、`always`；預設 `once`）。

## 技能：注入與按需加載

系統提示詞包含一個精簡的 **技能清單**（名稱 + 描述 + 位置）。此清單會佔用實際的額外空間。

根據預設，_不會_ 包含技能指令。預期模型僅在需要時 `read` 技能的 `SKILL.md`。

## 工具：有兩種成本

工具會以兩種方式影響上下文：

1. 系統提示詞中的 **工具清單文字**（您看到的「Tooling」）。
2. **工具架構**（JSON）。這些會傳送給模型以便其呼叫工具。即使您沒有以純文字形式看到它們，它們也會佔用上下文額度。

`/context detail` 會細分最大的工具架構，讓您了解主要佔用者為何。

## 指令、指示和「內聯快捷方式」

斜線指令由閘道 處理。有幾種不同的行為：

- **獨立指令**：僅包含 `/...` 的訊息會以指令形式執行。
- **指令**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 會在模型看到訊息之前被移除。
  - 僅包含指令的訊息會保留工作階段設定。
  - 一般訊息中的內嵌指令會作為單則訊息的提示。
- **內聯捷徑** (僅限允許清單中的傳送者)：一般訊息內的某些 `/...` token 可以立即執行 (例如：「嘿 /status」)，並且會在模型看到其餘文字之前被移除。

詳細資訊：[斜線指令](/zh-Hant/tools/slash-commands)。

## 工作階段、壓縮與修剪 (保留的內容)

跨訊息保留的內容取決於機制：

- **一般歷史記錄** 會保留在工作階段紀錄中，直到被原則壓縮或修剪。
- **壓縮** 會將摘要保留在紀錄中，並保持最近的訊息完整不動。
- **修剪** 會從執行作業的 _記憶體中_ 提示詞中移除舊的工具結果，但不會重寫紀錄。

文件：[Session](/zh-Hant/concepts/session)、[Compaction](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 引擎進行組裝和
壓縮。如果您安裝了提供 `kind: "context-engine"` 的外掛程式
並使用 `plugins.slots.contextEngine` 選取它，OpenClaw 會將上下文
組裝、`/compact` 和相關的子代理程式上下文生命週期掛鉤委派給該
引擎。`ownsCompaction: false` 不會自動回退到舊版
引擎；使用中的引擎仍必須正確實作 `compact()`。請參閱
[Context Engine](/zh-Hant/concepts/context-engine) 以了解完整的
可插拔介面、生命週期掛鉤和設定。

## `/context` 實際回報的內容

`/context` 在可用時偏好使用最新的 **執行時組建** 系統提示詞報告：

- `System prompt (run)` = 從上次內嵌 (具備工具能力) 的執行中擷取並持續儲存於 session store 中。
- `System prompt (estimate)` = 當不存在執行報告時 (或是透過不產生報告的 CLI 後端執行時) 即時計算。

無論如何，它都會報告大小和主要貢獻者；它**不會**傾印完整的系統提示詞或工具架構。

## 相關

- [Context Engine](/zh-Hant/concepts/context-engine) — 透過外掛程式自訂上下文插入
- [壓縮](/zh-Hant/concepts/compaction) — 總結長對話
- [系統提示詞](/zh-Hant/concepts/system-prompt) — 系統提示詞是如何建構的
- [Agent 迴圈](/zh-Hant/concepts/agent-loop) — 完整的 Agent 執行週期
