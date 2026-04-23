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

OpenAI GPT-5 系列覆蓋層保持核心執行規則精簡，並增加了
針對人格掛載、簡潔輸出、工具紀律、
並行查找、交付成果覆蓋、驗證、缺失上下文以及
終端工具衛生的模型特定指導。

## 結構

該提示詞刻意保持精簡，並使用固定區塊：

- **工具 (Tooling)**：結構化工具的事實來源提醒加上執行期工具使用指導。
- **執行偏見**：精簡的貫徹指導：依序對
  可執行的請求採取行動，持續直到完成或受阻，從微弱的工具
  結果中恢復，即時檢查可變狀態，並在定案前進行驗證。
- **安全性**：簡短的防護提醒，以避免尋求權力行為或繞過監督。
- **技能** (當可用時)：告訴模型如何按需載入技能指令。
- **OpenClaw 自我更新**：如何使用 `config.schema.lookup` 安全地檢查設定，使用 `config.patch` 修補設定，使用 `config.apply` 替換完整設定，並僅在明確的使用者請求下執行 `update.run`。僅限擁有者的 `gateway` 工具也拒絕重寫
  `tools.exec.ask` / `tools.exec.security`，包括正規化為這些受保護執行路徑的舊版 `tools.bash.*`
  別名。
- **工作區**：工作目錄 (`agents.defaults.workspace`)。
- **文件**：OpenClaw 文件的本地路徑 (repo 或 npm 套件) 以及閱讀時機。
- **工作區檔案 (已注入)**：表示下方包含啟動檔案。
- **沙箱** (當啟用時)：指示沙箱執行環境、沙箱路徑，以及是否可用提升的執行權限。
- **目前日期與時間**：使用者本地時間、時區和時間格式。
- **回覆標籤**：支援的提供者可選用的回覆標籤語法。
- **心跳**：心跳提示與確認 行為，當預設代理啟用心跳時。
- **執行環境**：主機、作業系統、節點、模型、repo 根目錄 (偵測到時)、思考層級 (一行)。
- **推理**：目前可見性層級 + /reasoning 切換提示。

工具 區塊還包含針對長時間工作的執行期指導：

- 使用 cron 進行未來的後續跟進 (`check back later`、提醒、週期性工作)
  而非 `exec` sleep 迴圈、`yieldMs` delay 技巧或重複的 `process`
  輪詢
- 僅針對立即開始並持續在背景執行的指令使用 `exec` / `process`
- 當啟用自動完成喚醒時，啟動指令一次，並在其輸出內容或失敗時依賴基於推播的喚醒路徑
- 當您需要檢查正在執行的指令時，使用 `process` 來查看日誌、狀態、輸入或進行干預
- 如果任務較大，請優先使用 `sessions_spawn`；子代理程式的完成是基於推播的，並會自動通知請求者
- 不要僅為了等待完成而循環輪詢 `subagents list` / `sessions_list`

當啟用實驗性 `update_plan` 工具時，Tooling 也會告訴模型僅將其用於非平凡的多步驟工作，保持確切的一個 `in_progress` 步驟，並在每次更新後避免重複整個計畫。

系統提示中的安全防護措施僅供參考。它們引導模型的行為，但不執行策略。使用工具策略、執行核准、沙盒和通道白名單進行強制執行；操作者可以刻意停用這些功能。

在具有原生核准卡/按鈕的通道上，執行時提示現在會告知
代理優先依賴該原生核准 UI。只有在工具結果指出聊天核准不可用或
手動核准是唯一途徑時，才應包含手動
`/approve` 指令。

## 提示模式

OpenClaw 可以為子代理程式渲染較小的系統提示。執行時會為每次執行設定
一個 `promptMode` (非使用者面向的設定)：

- `full` (預設)：包含上述所有部分。
- `minimal`：用於子代理程式；省略 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。Tooling、**Safety**、
  Workspace、Sandbox、目前日期與時間 (當已知時)、Runtime 和注入的
  上下文仍然可用。
- `none`：僅返回基礎身份行。

當 `promptMode=minimal` 時，額外注入的提示會被標記為 **Subagent
Context**，而不是 **Group Chat Context**。

## 工作區啟動引導注入

啟動引導檔案會被修剪並附加在 **Project Context** 下，以便模型無需明確讀取即可看到身分和設定檔上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅在全新的工作區上)
- 如果存在則使用 `MEMORY.md`，否則使用 `memory.md` 作為小寫備選

除非套用了特定檔案的閘門，否則所有這些檔案都會在每個輪次中 **注入到上下文視窗** 中。當預設代理停用了心跳或
`agents.defaults.heartbeat.includeSystemPromptSection` 為 false 時，`HEARTBEAT.md` 會在正常執行中被省略。
保持注入檔案簡潔——特別是 `MEMORY.md`，它會隨時間增長並導致
上下文使用量異常升高以及更頻繁的壓縮。

> **注意：** `memory/*.md` 每日檔案 **不** 屬於正常啟動引導
> Project Context 的一部分。在普通輪次中，它們是透過
> `memory_search` 和 `memory_get` 工具按需存取的，因此除非模型明確讀取它們，否則不會佔用
> 上下文視窗。純 `/new` 和
> `/reset` 輪次是例外：運行時可以將最近的每日記憶
> 作為一次性啟動上下文塊前置於該第一個輪次。

大文件會使用標記進行截斷。每個檔案的大小上限由
`agents.defaults.bootstrapMaxChars` 控制（預設值：12000）。所有檔案的注入引導內容
總計由 `agents.defaults.bootstrapTotalMaxChars` 限制
（預設值：60000）。遺失的檔案會注入一個簡短的遺失檔案標記。當發生截斷
時，OpenClaw 可以在專案上下文中注入警告區塊；透過
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；
預設值：`once`）。

子代理工作階段僅注入 `AGENTS.md` 和 `TOOLS.md`（其他引導檔案
會被過濾掉以保持子代理上下文精簡）。

內部掛鉤可以透過 `agent:bootstrap` 攔截此步驟，以修改或替換
注入的引導檔案（例如將 `SOUL.md` 交換為替代角色設定）。

如果您希望讓聽起來不太通用，請從
[SOUL.md 個性指南](/zh-Hant/concepts/soul) 開始。

若要檢查每個注入檔案的貢獻程度（原始內容與注入內容、截斷情況，以及工具 schema 開銷），請使用 `/context list` 或 `/context detail`。請參閱 [上下文](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞會包含專用的 **目前日期與時間** 區段。為了保持提示詞快取穩定，現在僅包含
**時區**（不包含動態時鐘或時間格式）。

當 需要目前時間時請使用 `session_status`；狀態卡片
包含一個時間戳記行。同一個工具可以選擇性設定每個工作階段的模型
覆寫（`model=default` 會將其清除）。

設定方式為：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為詳情，請參閱 [日期與時間](/zh-Hant/date-time)。

## 技能

當存在合適的技能時，OpenClaw 會注入一個精簡的 **available skills list**
(`formatSkillsForPrompt`)，其中包含每個技能的 **file path**。該提示指示模型使用
`read` 來載入列舉位置（workspace、managed 或 bundled）的 SKILL.md。如果沒有合適的技能，
則會省略 Skills 部分。

合適性條件包括技能 metadata gates、執行時環境/配置檢查，以及當設定
`agents.defaults.skills` 或
`agents.list[].skills` 時的有效 agent 技能允許清單。

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
- 各 agent 覆蓋：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用有界執行時摘錄使用不同的介面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

這種區分將技能大小與執行時讀取/注入大小（例如 `memory_get`、即時工具結果和壓縮後的
AGENTS.md 更新）分開管理。

## 文件

當可用時，系統提示會包含一個 **Documentation** 部分，指向本機 OpenClaw 文件目錄（位於 repo
workspace 中的 `docs/` 或打包的 npm
package docs），並註明公共鏡像、來源 repo、社群 Discord 和
ClawHub ([https://clawhub.ai](https://clawhub.ai)) 以便發現技能。該提示指示模型優先查閱本機文件以了解
OpenClaw 的行為、指令、配置或架構，並在可能時自行執行
`openclaw status`（僅在無權限存取時詢問使用者）。
