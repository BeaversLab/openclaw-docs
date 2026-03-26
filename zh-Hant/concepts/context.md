---
summary: "Context: 模型看到的內容、其構建方式以及如何檢查它"
read_when:
  - You want to understand what “context” means in OpenClaw
  - You are debugging why the model “knows” something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Context"
---

# Context

「Context」是 **OpenClaw 在一次運行中發送給模型的所有內容**。它受限於模型的 **context window** (Token 限制)。

初學者心智模型：

- **System prompt** (由 OpenClaw 構建)：規則、工具、技能列表、時間/執行時，以及注入的工作區檔案。
- **Conversation history**：您的訊息 + 此階段的助手訊息。
- **Tool calls/results + attachments**：指令輸出、檔案讀取、圖片/音訊等。

Context _並不同於_「記憶」：記憶可以儲存在磁碟上並稍後重新載入；Context 是當前視窗內模型的內容。

## Quick start (inspect context)

- `/status` → 快速查看「我的視窗有多滿？」+ 階段設定。
- `/context list` → 已注入的內容 + 大略大小（每個檔案 + 總計）。
- `/context detail` → 更詳細的細分：每個檔案、每個工具架構大小、每個技能項目大小，以及系統提示大小。
- `/usage tokens` → 將每次回覆的使用情況頁尾附加到一般回覆。
- `/compact` → 將較舊的歷史記錄摘要為一個精簡項目，以釋放視窗空間。

另請參閱：[斜線指令](/zh-Hant/tools/slash-commands)、[Token 使用與成本](/zh-Hant/reference/token-use)、[壓縮](/zh-Hant/concepts/compaction)。

## 範例輸出

數值會根據模型、提供者、工具原則以及您工作區中的內容而有所不同。

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

## 什麼計入內容視窗

模型接收到的所有內容都計算在內，包括：

- 系統提示（所有區段）。
- 對話歷史記錄。
- 工具呼叫 + 工具結果。
- 附件/逐字稿（圖片/音訊/檔案）。
- 壓縮摘要與剪枝產物。
- 提供者「包裝器」或隱藏標頭（不可見但仍計入）。

## OpenClaw 如何建構系統提示詞

系統提示詞為 **OpenClaw 所有**，並在每次執行時重建。它包含：

- 工具列表 + 簡短描述。
- 技能列表（僅限元數據；見下文）。
- 工作區位置。
- 時間（UTC + 若有設定則轉換使用者時間）。
- 執行時元數據（主機/作業系統/模型/思考）。
- **專案上下文**（Project Context）下注入的工作區啟動檔案。

完整細目：[系統提示詞](/zh-Hant/concepts/system-prompt)。

## 注入的工作區檔案（專案上下文）

根據預設，OpenClaw 會注入一組固定的工作區檔案（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅首次執行)

大型檔案會根據 `agents.defaults.bootstrapMaxChars` (預設 `20000` 個字元) 逐檔截斷。OpenClaw 也會透過 `agents.defaults.bootstrapTotalMaxChars` (預設 `150000` 個字元) 對所有檔案執行總 bootstrap 注入上限。`/context` 會顯示 **原始大小與注入大小** 以及是否發生截斷。

發生截斷時，執行階段可以在專案上下文下注入提示內警告區塊。請使用 `agents.defaults.bootstrapPromptTruncationWarning` (`off`、`once`、`always`；預設 `once`) 進行設定。

## 技能：已注入與按需加載的對比

系統提示包含一個精簡的**技能清單**（名稱 + 描述 + 位置）。這份清單確實會增加額外負擔。

預設情況下並不包含技能指令。模型被期望僅在**需要時**`read`該技能的`SKILL.md`。

## 工具：有兩種成本

工具會以兩種方式影響語境：

1. **工具清單文字**位於系統提示中（即您看到的「Tooling」）。
2. **工具架構**（JSON）。這些會被發送給模型，以便它能呼叫工具。即使您不會將其視為純文字，它們仍會佔用語境。

`/context detail` 會分析最大的工具架構，讓您了解什麼佔據了大部分空間。

## 指令、指令詞和「行內快捷方式」

斜線指令由閘道處理。有幾種不同的行為：

- **獨立指令**：一條僅包含 `/...` 的訊息會以指令形式執行。
- **Directives**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/model`、`/queue` 會在模型看到訊息之前被移除。
  - 僅包含指令的訊息會保留工作階段設定。
  - 一般訊息中的內嵌指令會作為針對該訊息的提示。
- **內嵌捷徑**（僅限允許清單中的傳送者）：一般訊息中的特定 `/...` token 可以立即執行（例如：「嘿 /status」），並會在模型看到其餘文字之前被移除。

詳細資訊：[Slash commands](/zh-Hant/tools/slash-commands)。

## 工作階段、壓縮與修剪（什麼會被保留）

訊息之間保留什麼內容取決於機制：

- **一般記錄**會保留在工作階段記錄中，直到被原則壓縮/修剪。
- **壓縮**會將摘要保存到逐字稿中，並保持最近的訊息不變。
- **修剪**會從單次執行的 _記憶體內_ 提示詞中移除舊的工具結果，但並不會重寫逐字稿。

文件：[Session](/zh-Hant/concepts/session)、[Compaction](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 上下文引擎進行組裝和壓縮。如果您安裝了提供 `kind: "context-engine"` 的外掛程式並透過 `plugins.slots.contextEngine` 選擇它，OpenClaw 會將上下文組裝、`/compact` 和相關的子代理程式上下文生命週期掛鉤委派給該引擎。`ownsCompaction: false` 不會自動回退到舊版引擎；活動引擎仍必須正確實作 `compact()`。請參閱 [Context Engine](/zh-Hant/concepts/context-engine) 以了解完整的可插拔介面、生命週期掛鉤和配置。

## `/context` 實際回報的內容

當有可用的 **run-built** 系統提示詞報告時，`/context` 偏好使用最新的報告：

- `System prompt (run)` = 從上次嵌入式（具備工具功能）運行中捕獲，並持久化儲存在會話儲存中。
- `System prompt (estimate)` = 當不存在運行報告時（或透過不生成報告的 CLI 後端運行時）即時計算。

無論哪種情況，它都會報告大小和主要貢獻者；它**不會**傾印完整的系統提示詞或工具架構。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
