---
summary: "Context: 模型看到什麼、它是如何建構的，以及如何檢查它"
read_when:
  - You want to understand what “context” means in OpenClaw
  - You are debugging why the model “knows” something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Context"
---

「Context」是 **OpenClaw 在單次執行中發送給模型的所有內容**。它受到模型 **context window**（token 限制）的限制。

初學者心智模型：

- **System prompt**（由 OpenClaw 建構）：規則、工具、技能清單、時間/執行時，以及注入的工作區檔案。
- **對話歷史**：您的訊息 + 此階段中助手的訊息。
- **工具呼叫/結果 + 附件**：指令輸出、檔案讀取、影像/音訊等。

Context 與「記憶」_並不相同_：記憶可以儲存在磁碟上並在稍後重新載入；context 則是目前位於模型視窗中的內容。

## 快速入門（檢查 context）

- `/status` → 快速查看「我的視窗有多滿？」+ 階段設定。
- `/context list` → 顯示注入的內容 + 大略大小（個別檔案 + 總計）。
- `/context detail` → 更深入的分析：每個檔案、每個工具的 schema 大小、每個技能項目的大小，以及系統提示的大小。
- `/usage tokens` → 將每次回覆的使用量頁尾附加到一般回覆中。
- `/compact` → 將較舊的歷史記錄摘要為一個精簡項目，以釋放視窗空間。

另請參閱：[斜線指令](/zh-Hant/tools/slash-commands)、[Token 使用與成本](/zh-Hant/reference/token-use)、[精簡](/zh-Hant/concepts/compaction)。

## 輸出範例

數值會因模型、提供者、工具策略以及您工作區中的內容而異。

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 12,000 chars
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

模型接收到的所有內容都會計入，包括：

- 系統提示（所有部分）。
- 對話歷史。
- 工具呼叫 + 工具結果。
- 附件/文字記錄（影像/音訊/檔案）。
- 精簡摘要與修剪產生的資料。
- 提供者的「包裝器」或隱藏標頭（不可見，但仍會計算）。

## OpenClaw 如何建構系統提示

系統提示是 **OpenClaw 擁有的**，並在每次執行時重建。它包括：

- 工具清單 + 簡短描述。
- 技能清單（僅中繼資料；見下文）。
- 工作區位置。
- 時間（UTC + 轉換後的使用者時間，若有設定）。
- 執行時期中繼資料（主機/作業系統/模型/思考）。
- 在 **Project Context** 下注入的工作區啟動檔案。

完整分析：[系統提示](/zh-Hant/concepts/system-prompt)。

## 注入的工作區檔案（專案內容）

根據預設，OpenClaw 會注入一組固定的工作區檔案（如果存在的話）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅限首次執行）

大型檔案會使用 `agents.defaults.bootstrapMaxChars` 逐個檔案截斷（預設 `12000` 個字元）。OpenClaw 也會使用 `agents.defaults.bootstrapTotalMaxChars` 強制執行跨檔案的總啟動注入上限（預設 `60000` 個字元）。`/context` 會顯示 **原始大小與注入大小** 以及是否發生了截斷。

當發生截斷時，執行時間可以在「專案上下文」下注入提示內警告區塊。使用 `agents.defaults.bootstrapPromptTruncationWarning` 進行設定（`off`、`once`、`always`；預設 `once`）。

## 技能：注入與按需加載

系統提示包含一個簡潔的 **技能列表**（名稱 + 描述 + 位置）。這個列表佔用了實際的開銷。

根據預設，_不會_ 包含技能指令。模型預期僅在 **需要時** `read` 技能的 `SKILL.md`。

## 工具：有兩種成本

工具會以兩種方式影響上下文：

1. 系統提示中的 **工具列表文字**（你看到的「Tooling」）。
2. **工具架構**（JSON）。這些會被發送給模型以便模型可以呼叫工具。即使你不會以純文字形式看到它們，它們仍會計入上下文。

`/context detail` 分解了最大的工具架構，讓你了解什麼佔據了主導地位。

## 指令、指令標記和「內聯捷徑」

斜線指令由 Gateway 處理。有幾種不同的行為：

- **獨立指令**：僅包含 `/...` 的訊息會作為指令執行。
- **指令標記**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 會在模型看到訊息之前被移除。
  - 僅指令的訊息會保存工作階段設定。
  - 一般訊息中的內聯指令作為單則訊息的提示。
- **內聯快捷鍵**（僅限允許清單中的傳送者）：一般訊息中的特定 `/...` 標記可以立即執行（例如：「hey /status」），並且在模型看到其餘文字之前會被移除。

詳細資訊：[斜線指令](/zh-Hant/tools/slash-commands)。

## 工作階段、壓縮與修剪（什麼會被保留）

跨訊息保留的內容取決於機制：

- **一般歷史記錄**會保留在工作階段紀錄中，直到被原則壓縮或修剪。
- **壓縮**會將摘要保留到紀錄中，並保持最近的訊息完整無缺。
- **修剪**會從 _記憶體中_ 的提示中捨棄舊的工具結果以釋放內容視窗空間，但不會重寫工作階段紀錄 —— 完整的歷史記錄仍然可以在磁碟上檢查。

文件：[工作階段](/zh-Hant/concepts/session)、[壓縮](/zh-Hant/concepts/compaction)、[工作階段修剪](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 語境引擎進行組裝和壓縮。如果您安裝了提供 `kind: "context-engine"` 的外掛程式並使用 `plugins.slots.contextEngine` 選擇它，OpenClaw 會將語境組裝、`/compact` 和相關的子代理語境生命週期掛鉤委派給該引擎。`ownsCompaction: false` 不會自動回退到舊版引擎；使用中的引擎仍必須正確實作 `compact()`。請參閱[語境引擎](/zh-Hant/concepts/context-engine)以了解完整的可插入介面、生命週期掛鉤和設定。

## `/context` 實際回報的內容

`/context` 在可用時偏好使用最新的 **執行建置** 系統提示回報：

- `System prompt (run)` = 從上次內嵌（具備工具能力）的執行中擷取，並保留在工作階段儲存庫中。
- `System prompt (estimate)` = 當不存在執行回報時（或是透過不產生該回報的 CLI 後端執行時）即時計算。

無論哪種方式，它都會回報大小和主要貢獻者；它**不會**傾印完整的系統提示或工具架構。

## 相關

- [Context Engine](/zh-Hant/concepts/context-engine) — 透過外掛程式自訂內容注入
- [Compaction](/zh-Hant/concepts/compaction) — 總結長對話
- [System Prompt](/zh-Hant/concepts/system-prompt) — 系統提示詞的建構方式
- [Agent Loop](/zh-Hant/concepts/agent-loop) — 完整的 Agent 執行週期
