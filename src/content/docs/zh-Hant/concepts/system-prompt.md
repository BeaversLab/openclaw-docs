---
summary: "OpenClaw 系統提示詞的內容及其組建方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "系統提示詞"
---

# 系統提示詞

OpenClaw 會為每次 Agent 執行建構自訂的系統提示詞。該提示詞由 **OpenClaw 擁有**，並不使用 pi-coding-agent 的預設提示詞。

該提示詞由 OpenClaw 組裝，並注入到每次 Agent 執行中。

提供者插件可以提供快取感知的提示詞指引，而無需替換
完整的 OpenClaw 擁有的提示詞。提供者執行時可以：

- 替換一小組命名的核心區段（`interaction_style`,
  `tool_call_style`, `execution_bias`）
- 在提示詞快取邊界之上注入一個 **穩定前綴 (stable prefix)**
- 在提示詞快取邊界之下注入一個 **動態後綴 (dynamic suffix)**

使用提供者擁有的貢獻進行特定模型系列的調優。保留舊版
`before_prompt_build` 提示詞變更以實現相容性或真正的全域提示詞
變更，而非正常的提供者行為。

## 結構

該提示詞刻意簡潔，並使用固定的區段：

- **Tooling**：結構化工具的來源真實性提醒，加上執行時工具使用指引。
- **Safety**：簡短的防護提醒，以避免權力尋求行為或規避監督。
- **Skills**（可用時）：告訴模型如何隨需加載技能指令。
- **OpenClaw Self-Update**：如何使用
  `config.schema.lookup` 安全檢查配置，使用 `config.patch` 修補配置，使用 `config.apply` 替換完整
  配置，並且僅在明確的使用者請求下執行 `update.run`。僅限擁有者使用的 `gateway` 工具也會拒絕重寫
  `tools.exec.ask` / `tools.exec.security`，包括正規化為這些受保護執行路徑的舊版 `tools.bash.*`
  別名。
- **Workspace**：工作目錄 (`agents.defaults.workspace`)。
- **Documentation**：OpenClaw 文件的本地路徑（repo 或 npm 套件）以及閱讀時機。
- **Workspace Files (injected)**：表示下方包含了引導檔案。
- **Sandbox**（啟用時）：指示沙盒執行時、沙盒路徑，以及是否可用提權執行。
- **Current Date & Time**：使用者本地時間、時區和時間格式。
- **Reply Tags**：支援提供者的選用回覆標籤語法。
- **Heartbeats**：當為預設代理啟用心跳時，心跳提示和 ack 行為。
- **Runtime**：主機、作業系統、節點、模型、repo 根目錄（偵測到時）、思考層級（一行）。
- **Reasoning**：目前可見性層級 + /reasoning 切換提示。

Tooling 區段還包含長期執行工作的執行時指引：

- 使用 cron 進行後續追蹤（`check back later`、提醒、週期性工作）
  而非 `exec` 睡眠迴圈、`yieldMs` 延遲技巧或重複的 `process`
  輪詢
- 僅針對立即啟動並持續在背景執行的指令使用 `exec` / `process`
- 當啟用自動完成喚醒時，啟動指令一次，並在輸出內容或失敗時依賴基於推播的喚醒路徑
- 當您需要檢查正在執行的指令時，使用 `process` 來查看日誌、狀態、輸入或進行干預
- 如果任務較大，優先使用 `sessions_spawn`；子代理的完成是基於推播的，並會自動通知請求者
- 不要僅為了等待完成而在迴圈中輪詢 `subagents list` / `sessions_list`

當啟用實驗性的 `update_plan` 工具時，Tooling 也會指示模型僅將其用於非平凡的步驟工作，保持僅有一個
`in_progress` 步驟，並避免在每次更新後重複整個計畫。

系統提示中的安全防護措施僅供參考。它們指導模型行為但不強制執行策略。請使用工具策略、執行批准、沙盒和通道允許清單來進行強制執行；操作員可以刻意停用這些功能。

在具有原生批准卡片/按鈕的通道上，執行時提示現在會告訴
代理優先依賴該原生批准 UI。僅當工具結果顯示聊天批准不可用或
手動批准是唯一途徑時，才應包含手動
`/approve` 指令。

## 提示模式

OpenClaw 可以為子代理呈現較小的系統提示。執行時環境會為每次執行設定一個
`promptMode`（而非使用者可見的設定）：

- `full`（預設）：包含上述所有部分。
- `minimal`：用於子代理；省略 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。Tooling、**Safety**、
  Workspace、Sandbox、Current Date & Time（已知時）、Runtime 和注入的
  內容仍然可用。
- `none`：僅傳回基本身分行。

當設定 `promptMode=minimal` 時，額外注入的提示會被標記為 **Subagent
Context**（子代理程式情境），而非 **Group Chat Context**（群組聊天情境）。

## 工作區引導注入

引導檔案會經過修剪並附加在 **Project Context**（專案情境）之下，以便模型無需明確讀取即可查看身分和設定檔情境：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅限全新的工作區）
- `MEMORY.md`（如果存在），否則使用 `memory.md` 作為小寫的備案

除非有特定檔案的閘門限制，否則所有這些檔案都會在每個輪次中**注入到上下文視窗**中。當為預設代理停用心跳或
`agents.defaults.heartbeat.includeSystemPromptSection` 為 false 時，`HEARTBEAT.md` 會在正常執行中被省略。
請保持注入的檔案簡潔 — 尤其是 `MEMORY.md`，它會隨時間增長並導致上下文使用量異常偏高以及更頻繁的壓縮。

> **注意：** `memory/*.md` 每日文件**不**屬於正常啟動
> 專案上下文的一部分。在普通回合中，它們是透過
> `memory_search` 和 `memory_get` 工具按需存取的，因此除非模型明確讀取它們，否則它們不會佔用
> 上下文視窗。純 `/new` 和
> `/reset` 回次是例外：執行時可以將最近的每日記憶
> 作為一次性啟動上下文區塊，預先附加到該第一個回次。

大檔案會被截斷並加上標記。每個檔案的大小上限由
`agents.defaults.bootstrapMaxChars` 控制（預設值：12000）。所有檔案注入的啟動引導
內容總計上限由 `agents.defaults.bootstrapTotalMaxChars` 限制
（預設值：60000）。缺失的檔案會注入一個簡短的缺失檔案標記。當發生截斷
時，OpenClaw 可以在專案上下文中插入警告區塊；請使用
`agents.defaults.bootstrapPromptTruncationWarning` 進行控制（`off`、`once`、`always`；
預設值：`once`）。

子代理工作階段僅注入 `AGENTS.md` 和 `TOOLS.md`（其他啟動檔案
會被過濾掉以保持子代理上下文精簡）。

內部 Hook 可以透過 `agent:bootstrap` 攔截此步驟，以變更或替換
注入的啟動檔案（例如將 `SOUL.md` 交換為替代人格）。

如果您想讓代理聽起來不那麼通用，請從
[SOUL.md 人格指南](/zh-Hant/concepts/soul) 開始。

要檢查每個注入檔案的貢獻程度（原始與注入、截斷，加上工具架構開銷），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞會包含一個專用的 **Current Date & Time** 區塊。為了保持提示詞快取的穩定性，它現在僅包含
**時區**（沒有動態時鐘或時間格式）。

當代理需要當前時間時，請使用 `session_status`；狀態卡片
包含一個時間戳行。同一個工具可選擇設定每個工作階段的模型
覆寫（`model=default` 會清除它）。

設定方式：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為細節，請參閱 [日期與時間](/zh-Hant/date-time)。

## 技能

當存在符合條件的技能時，OpenClaw 會注入一個精簡的 **可用技能清單** (`formatSkillsForPrompt`)，其中包含每個技能的 **檔案路徑**。系統提示會指示模型使用 `read` 來載入列舉位置（工作區、受管理或內建）中的 SKILL.md。如果沒有符合條件的技能，則會省略技能章節。

資格條件包含技能元資料閘門、執行時期環境/設定檢查，以及當配置 `agents.defaults.skills` 或 `agents.list[].skills` 時的有效代理程式技能允許清單。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

這既保持了基礎提示詞的精簡，同時又啟用了針對性的技能使用。

技能清單預算由技能子系統擁有：

- 全域預設值：`skills.limits.maxSkillsPromptChars`
- 各代理程式覆寫值：`agents.list[].skillsLimits.maxSkillsPromptChars`

一般有界的執行時期摘要使用不同的介面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

這種區分方式能將技能大小計算與執行時期讀取/注入大小計算（例如 `memory_get`、即時工具結果以及壓縮後的 AGENTS.md 重新整理）分開處理。

## 文件

當有可用資源時，系統提示會包含一個 **文件** 章節，指向本機 OpenClaw 文件目錄（位於儲存庫工作區中的 `docs/` 或內建的 npm 套件文件），並且註記公開鏡像、來源儲存庫、社群 Discord 以及 ClawHub ([https://clawhub.ai](https://clawhub.ai)) 以供技能探索。系統提示會指示模型優先查閱本機文件以了解 OpenClaw 的行為、指令、設定或架構，並在可能的情況下自行執行 `openclaw status`（僅在無權限存取時才詢問使用者）。
