---
summary: "Context：模型看到的內容、它是如何建構的，以及如何檢查它"
read_when:
  - You want to understand what “context” means in OpenClaw
  - You are debugging why the model “knows” something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Context"
---

# Context

「Context」是 **OpenClaw 在一次執行中發送給模型的所有內容**。它受限於模型的 **context window**（Token 限制）。

初學者心智模型：

- **System prompt**（由 OpenClaw 建構）：規則、工具、技能列表、時間/執行時間，以及注入的工作區檔案。
- **對話歷史紀錄**：您的訊息 + 此會話中助理的訊息。
- **Tool 呼叫/結果 + 附件**：指令輸出、檔案讀取、圖片/音訊等。

Context 與「記憶」_並不相同_：記憶可以儲存在磁碟上並稍後重新載入；context 則是模型當前視窗內的內容。

## 快速入門（檢查 context）

- `/status` → 快速查看「我的視窗有多滿？」 + 會話設定。
- `/context list` → 顯示注入的內容 + 大略大小（個別檔案 + 總計）。
- `/context detail` → 更深入的細分：個別檔案、各工具 schema 大小、各技能條目大小，以及 system prompt 大小。
- `/usage tokens` → 將每次回覆的使用量頁尾附加到正常回覆中。
- `/compact` → 將較舊的歷史紀錄摘要為精簡條目，以釋放視窗空間。

另請參閱：[Slash 指令](/zh-Hant/tools/slash-commands)、[Token 使用與費用](/zh-Hant/reference/token-use)、[壓縮](/zh-Hant/concepts/compaction)。

## 範例輸出

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

## 什麼會計入 context window

模型收到的所有內容都會計入，包括：

- System prompt（所有區段）。
- 對話歷史紀錄。
- Tool 呼叫 + tool 結果。
- 附件/文字紀錄（圖片/音訊/檔案）。
- 壓縮摘要和修剪產物。
- 提供者「包裝器」或隱藏標頭（不可見，但仍會計入）。

## OpenClaw 如何建構 system prompt

System prompt 是 **由 OpenClaw 擁有** 的，並在每次執行時重新建構。它包括：

- 工具列表 + 簡短描述。
- 技能列表（僅元資料；見下文）。
- 工作區位置。
- 時間（UTC + 轉換後的使用者時間，若已設定）。
- 執行時期元資料（主機/作業系統/模型/思維）。
- 在 **專案上下文** 下注入的工作區啟動檔案。

完整解析：[系統提示詞](/zh-Hant/concepts/system-prompt)。

## 注入的工作區檔案（專案上下文）

預設情況下，OpenClaw 會注入一組固定的工作區檔案（如果存在的話）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅首次執行）

大型檔案會使用 `agents.defaults.bootstrapMaxChars` 逐個檔案進行截斷（預設 `20000` 個字元）。OpenClaw 還會跨檔案執行總啟動注入上限，使用 `agents.defaults.bootstrapTotalMaxChars`（預設 `150000` 個字元）。`/context` 會顯示 **原始大小與注入大小** 的對比以及是否發生了截斷。

當發生截斷時，執行時可以在專案上下文下插入提示詞內的警告區塊。使用 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；預設 `once`）進行配置。

## 技能：注入內容與按需載入的對比

系統提示詞包含一個精簡的 **技能列表**（名稱 + 描述 + 位置）。此列表會佔用實際的額外負荷。

預設情況下不包含技能指令。預期模型僅在 **需要時** `read` 技能的 `SKILL.md`。

## 工具：存在兩種成本

工具以兩種方式影響上下文：

1. 系統提示詞中的 **工具列表文字**（您看到的「Tooling」）。
2. **工具架構**（JSON）。這些會發送給模型，以便其呼叫工具。即使您看不到它們的純文字形式，它們也會佔用上下文。

`/context detail` 會細分最大的工具架構，讓您了解什麼佔用了主要部分。

## 指令、指令詞與「內聯捷徑」

斜線指令由閘道處理。有幾種不同的行為：

- **獨立指令**：僅包含 `/...` 的訊息會作為指令執行。
- **Directives**: `/think`, `/verbose`, `/reasoning`, `/elevated`, `/model`, `/queue` 會在模型看到訊息之前被移除。
  - 僅包含指令的訊息會保存會話設定。
  - 一般訊息中的行內指令 (inline directives) 會作為單則訊息的提示。
- **Inline shortcuts** (僅限允許名單中的發送者): 一般訊息中的某些 `/...` 標記可以立即執行 (例如：“hey /status”)，並且會在模型看到剩餘文字之前被移除。

詳情：[Slash commands](/zh-Hant/tools/slash-commands)。

## Sessions, compaction, and pruning (what persists)

什麼會在訊息之間持續存在取決於機制：

- **Normal history** 會保留在會話記錄 (session transcript) 中，直到根據策略被壓縮/修剪。
- **Compaction** 會將摘要保留在記錄中，並保持最近的訊息完整無缺。
- **Pruning** 會從執行時的 _in-memory_ 提示詞中移除舊的工具結果，但不會重寫記錄。

文件：[Session](/zh-Hant/concepts/session), [Compaction](/zh-Hant/concepts/compaction), [Session pruning](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 上下文引擎進行組裝和
壓縮。如果您安裝了提供 `kind: "context-engine"` 的插件
並使用 `plugins.slots.contextEngine` 選擇它，OpenClaw 將會把上下文
組裝、`/compact` 和相關的子代理程式上下文生命週期掛鉤委派給該
引擎。

## What `/context` actually reports

`/context` 在可用時偏好使用最新的 **run-built** 系統提示詞報告：

- `System prompt (run)` = 從上次內嵌 (具備工具能力) 的執行中捕獲並保存在會話儲存中。
- `System prompt (estimate)` = 當不存在執行報告時 (或當透過不產生報告的 CLI 後端執行時) 即時計算。

無論哪種情況，它都會回報大小和主要貢獻者；它**不會**傾印完整的系統提示詞或工具架構。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
