---
summary: "OpenClaw 系統提示詞的內容及其組建方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "系統提示"
---

OpenClaw 會為每次代理執行建構自訂的系統提示。此提示由 **OpenClaw 擁有**，並不使用 pi-coding-agent 的預設提示。

該提示由 OpenClaw 組裝，並注入到每次代理執行中。

提供者插件可以提供具備快取感知能力的提示指引，而無需替換
完整的 OpenClaw 擁有的提示。提供者執行時可以：

- 替換一小組具名的核心區段（`interaction_style`、
  `tool_call_style`、`execution_bias`）
- 在提示快取邊界上方注入**穩定前綴**
- 在提示快取邊界下方注入**動態後綴**

使用提供者擁有的貢獻進行特定模型系列調整。保留傳統
`before_prompt_build` 提示變更以用於相容性或真正的全域提示
變更，而非正常的提供者行為。

OpenAI GPT-5 系列覆蓋層保持核心執行規則簡短，並新增
模型特定指引，包括人格鎖定、簡潔輸出、工具紀律、
並行查找、交付成果覆蓋率、驗證、缺失上下文以及終端工具衛生。

## 結構

該提示刻意精簡，並使用固定的區段：

- **工具**：結構化工具真實來源提醒加上執行時工具使用指引。
- **執行偏差**：精簡的貫徹指引：依序對可行請求採取行動、
  持續直到完成或受阻、從微弱的工具結果中恢復、即時檢查可變狀態，
  並在定案前進行驗證。
- **安全性**：簡短的防護提醒，以避免權力尋求行為或規避監督。
- **技能**（當可用時）：告訴模型如何按需載入技能指示。
- **OpenClaw 自我更新**：如何使用 `config.schema.lookup` 安全檢查配置、
  使用 `config.patch` 修補配置、使用 `config.apply` 替換完整
  配置，以及僅在明確使用者要求時執行 `update.run`。僅限擁有者使用的
  `gateway` 工具也會拒絕重寫 `tools.exec.ask` / `tools.exec.security`，
  包括正規化為這些受保護執行路徑的傳統 `tools.bash.*` 別名。
- **工作區**：工作目錄 (`agents.defaults.workspace`)。
- **文件**：OpenClaw 文件的本地路徑（repo 或 npm 套件）以及讀取時機。
- **工作區檔案（已注入）**：表示下方包含引導檔案。
- **沙箱**（啟用時）：表示沙箱執行環境、沙箱路徑，以及是否可用提升權限的執行。
- **目前日期與時間**：使用者本地時間、時區和時間格式。
- **回覆標籤**：支援的提供者可選用的回覆標籤語法。
- **心跳**：心跳提示與 ack 行為，當預設代理啟用心跳時。
- **執行環境**：主機、作業系統、節點、模型、repo 根目錄（偵測到時）、思考層級（一行）。
- **推理**：目前可見性層級 + /reasoning 切換提示。

工具部分也包含長時間工作的執行指引：

- 針對未來的後續追蹤 (`check back later`、提醒、週期性工作) 使用 cron
  而非 `exec` sleep 迴圈、`yieldMs` 延遲技巧或重複的 `process`
  輪詢
- 僅針對現在啟動並在背景繼續執行的指令使用 `exec` / `process`
- 當啟用自動完成喚醒時，啟動指令一次並在輸出或失敗時依賴
  基於推送的喚醒路徑
- 當您需要檢視正在執行的指令時，使用 `process` 來查看日誌、狀態、輸入或進行干預
- 如果任務較大，優先使用 `sessions_spawn`；子代理的完成是
  基於推送的，並會自動通知請求者
- 不要僅為了等待完成而在迴圈中輪詢 `subagents list` / `sessions_list`

當啟用實驗性 `update_plan` 工具時，工具也會告訴
模型僅將其用於非平凡的多步驟工作，保持剛好一個
`in_progress` 步驟，並避免在每次更新後重複整個計畫。

系統提示中的安全防護是建議性的。它們引導模型行為但不強制執行策略。使用工具策略、執行核准、沙箱和通道白名單進行強制執行；操作者可以故意停用這些功能。

在具有原生認可卡/按鈕的頻道上，執行時提示現在會告知代理程式首先依賴該原生認可 UI。只有在工具結果指出聊天認不可用或手動認可是唯一途徑時，才應包含手動 `/approve` 指令。

## 提示模式

OpenClaw 可以為子代理程式渲染較小的系統提示。執行時會為每次執行設定一個 `promptMode`（而非使用者可見的設定）：

- `full` (預設)：包含上述所有章節。
- `minimal`：用於子代理程式；省略 **技能**、**記憶回憶**、**OpenClaw
  自我更新**、**模型別名**、**使用者身分**、**回覆標籤**、
  **訊息傳遞**、**靜默回覆**和 **心跳**。工具、**安全性**、
  工作區、沙箱、目前日期與時間 (已知時)、執行時，以及注入的
  內容仍然可用。
- `none`：僅回傳基本身分行。

當 `promptMode=minimal` 時，額外注入的提示會被標記為 **子代理程式
Context** 而非 **群組聊天 Context**。

## 工作區啟動注入

啟動檔案會被修剪並附加在 **專案內容** 下，以便模型無需明確讀取即可看到身分和設定檔內容：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅在全新的工作區上)
- `MEMORY.md` (如果存在)

除非套用了特定檔案閘道，否則所有這些檔案都會在每個輪次中**注入到內容視窗** 中。當
針對預設代理程式停用心跳或 `agents.defaults.heartbeat.includeSystemPromptSection`
為 false 時，一般執行中會省略 `HEARTBEAT.md`。請保持注入
檔案的簡潔 — 特別是 `MEMORY.md`，它會隨時間增長並導致
出乎意料的高內容使用量和更頻繁的壓縮。

<Note>`memory/*.md` 日常檔案**不是**正常啟動專案上下文的一部分。在普通輪次中，它們是透過 `memory_search` 和 `memory_get` 工具按需存取的，因此除非模型明確讀取它們，否則它們不會計入上下文視窗。純 `/new` 和 `/reset` 輪次是例外：執行時可以將最近的日常記憶體作為一次性啟動上下文塊附加到該第一個輪次。</Note>

大檔案會被截斷並加上標記。每個檔案的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（預設值：12000）。跨檔案注入的啟動內容總量由 `agents.defaults.bootstrapTotalMaxChars` 限制
（預設值：60000）。缺少的檔案會注入一個簡短的缺少檔案標記。當發生截斷時，OpenClaw 可以在專案上下文中注入一個警告塊；使用 `agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；
預設值：`once`）。

子代理會話僅注入 `AGENTS.md` 和 `TOOLS.md`（其他啟動檔案會被過濾掉以保持子代理上下文精簡）。

內部攔截器可以透過 `agent:bootstrap` 攔截此步驟，以變更或替換
注入的啟動檔案（例如將 `SOUL.md` 交換為替換人格）。

如果您想讓代理聽起來不那么普通，請從
[SOUL.md 人格指南](/zh-Hant/concepts/soul) 開始。

要檢查每個注入檔案的貢獻程度（原始 vs 注入、截斷，加上工具架構開銷），請使用 `/context list` 或 `/context detail`。請參閱 [上下文](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞包含一個專用的 **目前日期與時間** 部分。為了保持提示詞快取穩定，它現在僅包含
**時區**（沒有動態時鐘或時間格式）。

當代理需要目前時間時請使用 `session_status`；狀態卡包含一個時間戳行。同一個工具可選地設定每個會話的模型覆寫（`model=default` 清除它）。

配置方式：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

詳見[日期與時間](/zh-Hant/date-time)以了解完整的行為細節。

## 技能

當存在符合資格的技能時，OpenClaw 會注入一個精簡的**可用技能清單**
(`formatSkillsForPrompt`)，其中包含每個技能的**檔案路徑**。系統提示會指示模型使用 `read` 來載入列舉位置（工作區、受管理或內建）中的 SKILL.md。如果沒有符合資格的技能，則會省略技能區段。

資格條件包括技能元資料閘道、執行時環境/設定檢查，以及當配置了 `agents.defaults.skills` 或
`agents.list[].skills` 時的實際代理技能允許清單。

外掛程式內建的技能只有在擁有該技能的外掛程式已啟用時才符合資格。
這讓工具外掛程式能夠揭露更深層的操作指南，而無需將所有這些指
南直接嵌入在每個工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

這既保持了基礎提示的精簡，同時仍能啟用針對性的技能使用。

技能清單預算由 skills 子系統擁有：

- 全域預設值：`skills.limits.maxSkillsPromptChars`
- 個別代理覆寫：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用有界執行時摘錄使用不同的介面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

這種區分方式將技能的大小計算與執行時讀取/注入大小計算（例如 `memory_get`、即時工具結果以及壓縮後的 AGENTS.md 重新整理）分開處理。

## 文件

系統提示包含一個**文件**區段。當有本機文件可用時，它會指向本機 OpenClaw 文件目錄（在 Git 簽出中為 `docs/` 或內建的 npm
套件文件）。如果本機文件不可用，則會回退至
[https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分也包含 OpenClaw 原始碼位置。Git 檢出會暴露本地
原始碼根目錄，以便代理程式能直接檢查程式碼。套件安裝則包含 GitHub
原始碼 URL，並指示代理程式在文件不完整或過時時到那裡查看原始碼。提示詞也會提及公共文件鏡像、社群 Discord 以及 ClawHub
([https://clawhub.ai](https://clawhub.ai)) 以便探索技能。它指示模型
針對 OpenClaw 的行為、指令、配置或架構優先查閱文件，並在可能時自行執行
`openclaw status`（僅在無權限存取時才詢問使用者）。
特別是對於配置，它會指引代理程式前往 `gateway` 工具動作
`config.schema.lookup` 以取得確切的欄位級文件與限制，然後前往
`docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md`
以獲得更廣泛的指引。

## 相關連結

- [Agent runtime](/zh-Hant/concepts/agent)
- [Agent workspace](/zh-Hant/concepts/agent-workspace)
- [Context engine](/zh-Hant/concepts/context-engine)
