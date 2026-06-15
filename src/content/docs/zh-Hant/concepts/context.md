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
- `/context map` → 類似 WinDirStat 風格的矩形樹狀圖，顯示目前會話中追蹤的內容貢獻者。
- `/usage tokens` → 將每次回覆的使用量頁尾附加到一般回覆中。
- `/compact` → 將較舊的歷史記錄摘要為一個精簡條目，以釋放視窗空間。

另請參閱：[Slash commands](/zh-Hant/tools/slash-commands)、[Token use & costs](/zh-Hant/reference/token-use)、[Compaction](/zh-Hant/concepts/compaction)。

## Example output

數值會根據模型、提供者、工具原則以及您工作區中的內容而有所不同。

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

### `/context map`

發送一張根據最新快取的執行報告所生成的圖片。在一般訊息於會話中產生執行報告之前，`/context map` 會傳回一則不可用的訊息，而非呈現估算值。矩形區域與追蹤的提示字元數成比例：

- 注入的工作區檔案
- 基本系統提示文字
- 技能提示條目
- 工具 JSON 綱要

當沒有快取執行報告時，`/context list`、`/context detail` 和 `/context json` 仍然可以檢視隨需估算值。

## 什麼計入內容視窗

模型接收到的所有內容都會計入，包括：

- 系統提示（所有部分）。
- 對話歷史記錄。
- 工具呼叫 + 工具結果。
- 附件/逐字稿（圖片/音訊/檔案）。
- 壓縮摘要和修剪產物。
- 提供者「包裝器」或隱藏標頭（不可見，但仍會計入）。

## OpenClaw 如何建構系統提示

系統提示由 **OpenClaw 擁有**，並在每次執行時重建。它包括：

- 工具列表 + 簡短描述。
- 技能列表（僅限元資料；見下文）。
- 工作區位置。
- 時間（UTC + 轉換後的使用者時間，若有設定）。
- 執行時期元資料（主機/作業系統/模型/思考）。
- 位於 **Project Context** 下的注入工作區啟動檔案。

完整細節：[System Prompt](/zh-Hant/concepts/system-prompt)。

## 注入的工作區檔案（Project Context）

根據預設，OpenClaw 會注入一組固定的工作區檔案（如果存在的話）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅首次執行）

大型檔案會使用 `agents.defaults.bootstrapMaxChars` 逐檔截斷（預設 `20000` 個字元）。OpenClaw 也會針對所有檔案執行總 bootstrap 注入上限，使用 `agents.defaults.bootstrapTotalMaxChars`（預設 `60000` 個字元）。`/context` 會顯示 **原始大小 vs 注入大小** 以及是否發生截斷。

當發生截斷時，執行時可以在專案上下文下插入一個提示內警告區塊。透過 `agents.defaults.bootstrapPromptTruncationWarning` 進行設定（`off`、`once`、`always`；預設 `always`）。

## 技能：注入與按需載入

系統提示包含精簡的**技能清單**（名稱 + 描述 + 位置）。此清單會產生實際的額外負擔。

預設情況下並不包含技能指示。預期模型僅在**需要時** `read` 技能的 `SKILL.md`。

## 工具：有兩種成本

工具會以兩種方式影響上下文：

1. 系統提示中的**工具清單文字**（即您看到的「Tooling」）。
2. **工具架構**（JSON）。這些會被發送給模型以便呼叫工具。即使您看不到它們的純文字內容，它們也會計入上下文。

`/context detail` 會剖析最大的工具架構，讓您了解哪些內容佔據了主導地位。

## 指令、指示與「內聯捷徑」

斜線指令由閘道處理。有幾種不同的行為：

- **獨立指令**：僅包含 `/...` 的訊息會以指令形式執行。
- **指示**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 會在模型看到訊息之前被移除。
  - 僅包含指示的訊息會保留會話設定。
  - 一般訊息中的內聯指示會充當單則訊息提示。
- **內建捷徑** (僅限允許清單中的傳送者): 普通訊息中的特定 `/...` 標記可以立即執行 (例如: "hey /status")，並且在模型看到剩餘文字之前會被移除。

詳細資訊: [Slash commands](/zh-Hant/tools/slash-commands)。

## 工作階段、壓縮 和修剪 (什麼會持久保存)

什麼會在訊息之間持久保存取決於機制:

- **一般歷史記錄** 會保留在工作階段文字記錄中，直到被原則壓縮/修剪。
- **壓縮** 會將摘要保留在文字記錄中，並保持最近的訊息完整。
- **修剪** 會從 _記憶體內_ 提示中捨棄舊的工具結果以釋放上下文視窗空間，但不會重寫工作階段文字記錄 - 完整的歷史記錄仍可在磁碟上檢查。

文件: [Session](/zh-Hant/concepts/session), [Compaction](/zh-Hant/concepts/compaction), [Session pruning](/zh-Hant/concepts/session-pruning)。

預設情況下，OpenClaw 使用內建的 `legacy` 上下文引擎進行組合和
壓縮。如果您安裝一個提供 `kind: "context-engine"` 的插件
並使用 `plugins.slots.contextEngine` 選擇它，OpenClaw 會將上下文
組合、`/compact` 和相關的子代理上下文生命週期掛鉤委派給該
引擎。`ownsCompaction: false` 不會自動回退到舊版
引擎; 活躍的引擎仍必須正確實作 `compact()`。請參閱
[Context Engine](/zh-Hant/concepts/context-engine) 以了解完整的
可插拔介面、生命週期掛鉤和配置。

## `/context` 實際回報的內容

當有可用時，`/context` 偏好使用最新的 **執行建置** 系統提示報告:

- `System prompt (run)` = 從上次嵌入的 (具備工具能力) 執行中擷取並持久保存在工作階段儲存中。
- `System prompt (estimate)` = 當不存在執行報告時 (或透過不產生該報告的 CLI 後端執行時) 即時計算。

無論何種方式，它都會回報大小和主要貢獻者; 它 **不會** 傾印完整的系統提示或工具架構。

## 相關

<CardGroup cols={2}>
  <Card title="Context engine" href="/zh-Hant/concepts/context-engine" icon="puzzle-piece">
    透過外掛程式自訂內容注入。
  </Card>
  <Card title="Compaction" href="/zh-Hant/concepts/compaction" icon="compress">
    摘要長對話以保持在模型視窗內。
  </Card>
  <Card title="System prompt" href="/zh-Hant/concepts/system-prompt" icon="message-lines">
    系統提示詞的建構方式及其每輪注入的內容。
  </Card>
  <Card title="Agent loop" href="/zh-Hant/concepts/agent-loop" icon="arrows-rotate">
    從接收訊息到最終回應的完整代理程式執行週期。
  </Card>
</CardGroup>
