---
summary: "Context: what the model sees, how it is built, and how to inspect it"
read_when:
  - 您想要了解「context」在 OpenClaw 中的含義
  - 您正在偵錯模型為什麼「知道」某些事情（或是忘記了）
  - 您想要減少 context 開銷 (/context, /status, /compact)
title: "Context"
---

# Context

「Context」是 **OpenClaw 在執行時發送給模型的所有內容**。它受限於模型的 **context window**（token 限制）。

初學者心智模型：

- **System prompt** (OpenClaw 建構)：規則、工具、技能列表、時間/執行時間，以及注入的工作區檔案。
- **Conversation history**：您的訊息 + 此會話中助手的訊息。
- **Tool calls/results + attachments**：指令輸出、檔案讀取、圖片/音訊等。

Context _與_「記憶」_不是同一回事_：記憶可以儲存在磁碟上並稍後重新載入；context 則是模型當前視窗內的內容。

## Quick start (inspect context)

- `/status` → 快速查看「我的視窗有多滿？」+ 會話設定。
- `/context list` → 顯示注入了什麼 + 大略大小（每個檔案 + 總計）。
- `/context detail` → 更深入的細分：每個檔案、每個工具架構大小、每個技能項目大小，以及系統提示大小。
- `/usage tokens` → 將每次回覆的使用情況頁尾附加到一般回覆中。
- `/compact` → 將較舊的歷史記錄總結為一個精簡項目，以釋放視窗空間。

另請參閱：[Slash commands](/zh-Hant/tools/slash-commands)、[Token use & costs](/zh-Hant/reference/token-use)、[Compaction](/zh-Hant/concepts/compaction)。

## Example output

數值會因模型、提供者、工具原則以及您工作區中的內容而異。

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

模型接收到的所有內容都會計算在內，包括：

- System prompt（所有部分）。
- Conversation history。
- Tool calls + tool results。
- Attachments/transcripts（圖片/音訊/檔案）。
- Compaction summaries 和 pruning artifacts。
- 提供者「wrappers」或隱藏標頭（不可見，但仍會計算）。

## How OpenClaw builds the system prompt

System prompt 由 **OpenClaw 擁有** 並在每次執行時重新建構。它包括：

- Tool list + 簡短描述。
- Skills list（僅限元資料；見下文）。
- 工作區位置。
- 時間 (UTC + 轉換後的使用者時間，若已設置)。
- 運行時元數據 (主機/作業系統/模型/思考)。
- 在 **Project Context** 下注入的工作區引導文件。

完整細節：[System Prompt](/zh-Hant/concepts/system-prompt)。

## 注入的工作區文件 (Project Context)

預設情況下，OpenClaw 會注入一組固定的工作區文件 (如果存在)：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅首次運行)

大文件會使用 `agents.defaults.bootstrapMaxChars` 逐個截斷 (預設 `20000` 個字元)。OpenClaw 還使用 `agents.defaults.bootstrapTotalMaxChars` 強制執行跨文件的引導注入總量上限 (預設 `150000` 個字元)。`/context` 顯示 **原始與注入** 的大小以及是否發生了截斷。

當發生截斷時，運行時可以在 Project Context 下注入提示內警告塊。使用 `agents.defaults.bootstrapPromptTruncationWarning` 進行配置 (`off`, `once`, `always`；預設 `once`)。

## 技能：注入與按需加載

系統提示包含一個精簡的 **技能清單** (名稱 + 描述 + 位置)。此清單佔用實際空間。

預設情況下不包含技能指令。模型被預期僅在 **需要時** `read` 技能的 `SKILL.md`。

## 工具：有兩種成本

工具以兩種方式影響上下文：

1. 系統提示中的 **工具清單文字** (您看到的「Tooling」)。
2. **工具架構** (JSON)。這些會發送給模型以便調用工具。即使您不將它們視為純文字，它們也會佔用上下文。

`/context detail` 分解了最大的工具架構，以便您查看主要佔用的部分。

## 命令、指令和「內聯快捷方式」

斜槓命令 由 Gateway 處理。有幾種不同的行為：

- **獨立命令**：僅包含 `/...` 的訊息會作為命令運行。
- **指令**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/model`、`/queue` 會在模型看到訊息之前被移除。
  - 僅包含指令的訊息會保留工作階段設定。
  - 一般訊息中的內聯指令會作為單一訊息的提示。
- **內聯捷徑** (僅限允許列表中的傳送者)：一般訊息中的某些 `/...` 標記可以立即執行 (例如：「hey /status」)，並且在模型看到剩餘文字之前會被移除。

詳情：[斜線指令](/zh-Hant/tools/slash-commands)。

## 工作階段、壓縮與修剪 (什麼會被保留)

什麼會在訊息之間保留，取決於機制：

- **一般歷史記錄** 會保留在工作階段紀錄中，直到被策略壓縮/修剪。
- **壓縮** 會將摘要保留到紀錄中，並保持最近的訊息不變。
- **修剪** 會從執行的 _記憶體中_ 提示中移除舊的工具結果，但不會重寫紀錄。

文件：[工作階段](/zh-Hant/concepts/session)、[壓縮](/zh-Hant/concepts/compaction)、[工作階段修剪](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 上下文引擎進行組裝和壓縮。如果您安裝了提供 `kind: "context-engine"` 的外掛並使用 `plugins.slots.contextEngine` 選擇它，OpenClaw 會將上下文組裝、`/compact` 和相關的子代理程式上下文生命週期掛鉤委派給該引擎。`ownsCompaction: false` 不會自動回退到舊版引擎；使用中的引擎仍必須正確實作 `compact()`。請參閱 [Context Engine](/zh-Hant/concepts/context-engine) 以了解完整的可插拔介面、生命週期掛鉤和設定。

## `/context` 實際回報的內容

`/context` 優先選擇最新的 **執行建構** 系統提示報告 (如果可用)：

- `System prompt (run)` = 從上次內嵌 (具備工具能力) 的執行中擷取，並保留在工作階段儲存中。
- `System prompt (estimate)` = 在不存在運行報告時（或透過不產生報告的 CLI 後端執行時）即時計算。

無論哪種情況，它都會回報大小和主要貢獻者；它**不會**傾印完整的系統提示或工具架構。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
