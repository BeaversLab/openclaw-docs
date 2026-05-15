---
summary: "Context: 模型看到什麼、它是如何建構的，以及如何檢查它"
read_when:
  - You want to understand what "context" means in OpenClaw
  - You are debugging why the model "knows" something (or forgot it)
  - You want to reduce context overhead (/context, /status, /compact)
title: "Context"
---

"Context" 是 **OpenClaw 在執行一次運行時傳送給模型的所有內容**。它受限於模型的 **context window**（Token 上限）。

初學者心智模型：

- **System prompt**（由 OpenClaw 建構）：規則、工具、技能清單、時間/執行時，以及注入的工作區檔案。
- **對話歷史記錄**：您的訊息 + 此階段中助手的訊息。
- **工具呼叫/結果 + 附件**：指令輸出、檔案讀取、影像/音訊等。

Context 與 "memory" **並不相同**：memory 可以儲存在磁碟上並稍後重新載入；context 則是模型當前視窗內的內容。

## 快速入門（檢查 context）

- `/status` → 快速查看「我的視窗有多滿？」+ 階段設定。
- `/context list` → 顯示注入的內容 + 粗略大小（每個檔案 + 總計）。
- `/context detail` → 更深入的細目：每個檔案、每個工具的 schema 大小、每個技能項目大小，以及系統提示詞大小。
- `/usage tokens` → 將每次回覆的使用情況頁尾附加至正常回覆。
- `/compact` → 將較舊的歷史記錄摘要為一個簡潔的項目，以釋放視窗空間。

另請參閱：[斜線指令](/zh-Hant/tools/slash-commands)、[Token 使用量與費用](/zh-Hant/reference/token-use)、[壓縮](/zh-Hant/concepts/compaction)。

## 輸出範例

數值會根據模型、提供者、工具原則以及您工作區中的內容而有所變化。

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
- 提供者的 "wrappers" 或隱藏標頭（不可見，但仍會被計入）。

## OpenClaw 如何建構系統提示

系統提示是 **OpenClaw 擁有的**，並在每次執行時重建。它包括：

- 工具清單 + 簡短描述。
- 技能清單（僅中繼資料；見下文）。
- 工作區位置。
- 時間（UTC + 轉換後的使用者時間，若有設定）。
- 執行時期中繼資料（主機/作業系統/模型/思考）。
- 在 **Project Context** 下注入的工作區啟動檔案。

完整細目：[系統提示詞](/zh-Hant/concepts/system-prompt)。

## 注入的工作區檔案（專案內容）

根據預設，OpenClaw 會注入一組固定的工作區檔案（如果存在的話）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅首次執行)

大檔案會使用 `agents.defaults.bootstrapMaxChars` 逐個檔案進行截斷（預設 `12000` 個字元）。OpenClaw 也會透過 `agents.defaults.bootstrapTotalMaxChars` 對所有檔案執行總 bootstrap 注入上限（預設 `60000` 個字元）。`/context` 會顯示 **原始大小與注入大小** 以及是否發生截斷。

當發生截斷時，執行時期可以在「專案上下文」下插入一個提示詞內的警告區塊。透過 `agents.defaults.bootstrapPromptTruncationWarning` 進行設定（`off`、`once`、`always`；預設為 `once`）。

## 技能：注入與按需加載

系統提示包含一個簡潔的 **技能列表**（名稱 + 描述 + 位置）。這個列表佔用了實際的開銷。

預設不包含技能指示。模型被期望在**僅在需要時** `read` 技能的 `SKILL.md`。

## 工具：有兩種成本

工具會以兩種方式影響上下文：

1. 系統提示詞中的 **工具列表文本**（你看到的「Tooling」）。
2. **工具架構**（JSON）。這些會發送給模型以便它可以調用工具。即使你沒有將它們視為純文本，它們仍佔用上下文。

`/context detail` 分解了最大的工具架構，以便你能看到什麼佔據了主導地位。

## 指令、指令標記和「內聯捷徑」

斜線指令由 Gateway 處理。有幾種不同的行為：

- **獨立指令**：一條僅包含 `/...` 的訊息會作為指令運行。
- **指令**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 會在模型看到訊息之前被移除。
  - 僅指令的訊息會保存工作階段設定。
  - 一般訊息中的內聯指令作為單則訊息的提示。
- **內聯捷徑**（僅限白名單發送者）：普通訊息中的某些 `/...` token 可以立即運行（例如：「hey /status」），並且在模型看到剩餘文本之前會被移除。

詳情：[斜線指令](/zh-Hant/tools/slash-commands)。

## 工作階段、壓縮與修剪（什麼會被保留）

跨訊息保留的內容取決於機制：

- **一般歷史記錄**會保留在工作階段紀錄中，直到被原則壓縮或修剪。
- **壓縮**會將摘要保留到紀錄中，並保持最近的訊息完整無缺。
- **修剪**會從記憶體中的提示詞中丟棄舊的工具結果以釋放上下文視窗空間，但不會重寫會話記錄——完整的歷史記錄仍可在磁碟上檢查。

文件：[會話](/zh-Hant/concepts/session)、[壓縮](/zh-Hant/concepts/compaction)、[會話修剪](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 上下文引擎進行組裝和壓縮。如果你安裝了一個提供 `kind: "context-engine"` 並透過 `plugins.slots.contextEngine` 選擇它的插件，OpenClaw 會將上下文組裝、`/compact` 和相關的子代理上下文生命週期鉤子委派給該引擎。`ownsCompaction: false` 不會自動回退到舊版引擎；活動引擎仍必須正確實作 `compact()`。請參閱 [Context Engine](/zh-Hant/concepts/context-engine) 以了解完整的可插拔介面、生命週期鉛子和配置。

## `/context` 實際上報告了什麼

`/context` 偏好在可用時使用最新的 **run-built** 系統提示詞報告：

- `System prompt (run)` = 從上次嵌入式（具備工具能力）運行中捕獲並持久化到會話存儲中。
- `System prompt (estimate)` = 當不存在運行報告時（或在通過不生成報告的 CLI 後端運行時）即時計算。

無論哪種方式，它都會回報大小和主要貢獻者；它**不會**傾印完整的系統提示或工具架構。

## 相關

<CardGroup cols={2}>
  <Card title="Context engine" href="/zh-Hant/concepts/context-engine" icon="puzzle-piece">
    透過外掛程式自訂注入上下文。
  </Card>
  <Card title="Compaction" href="/zh-Hant/concepts/compaction" icon="compress">
    總結長對話以將其保持在模型視窗內。
  </Card>
  <Card title="System prompt" href="/zh-Hant/concepts/system-prompt" icon="message-lines">
    系統提示詞是如何構建的，以及它每回合會注入什麼。
  </Card>
  <Card title="Agent loop" href="/zh-Hant/concepts/agent-loop" icon="arrows-rotate">
    從傳入訊息到最終回覆的完整代理執行迴圈。
  </Card>
</CardGroup>
