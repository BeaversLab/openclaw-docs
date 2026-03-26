---
summary: "OpenClaw 系統提示詞的內容及其組裝方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "系統提示詞"
---

# 系統提示詞

OpenClaw 會為每次代理運行構建自訂的系統提示詞。該提示詞由 **OpenClaw 擁有**，不使用 pi-coding-agent 的預設提示詞。

該提示詞由 OpenClaw 組裝，並注入到每次代理運行中。

## 結構

該提示詞經過專門精簡，並使用固定章節：

- **工具**：目前的工具列表 + 簡短描述。
- **安全性**：簡短的防護提醒，以避免權力尋求行為或繞過監督。
- **技能**（如果可用）：告訴模型如何按需載入技能指令。
- **OpenClaw 自我更新**：如何執行 `config.apply` 和 `update.run`。
- **工作區**：工作目錄 (`agents.defaults.workspace`)。
- **Documentation**：OpenClaw 文件（倉庫或 npm 套件）的本機路徑以及讀取時機。
- **Workspace Files (injected)**：表示引導檔案包含在下方。
- **Sandbox**（啟用時）：指示沙箱執行環境、沙箱路徑，以及是否提供升級執行權限。
- **Current Date & Time**：使用者本地時間、時區和時間格式。
- **Reply Tags**：支援提供者可選的回覆標籤語法。
- **Heartbeats**：心跳提示和確認行為。
- **Runtime**：主機、作業系統、節點、模型、儲存庫根目錄（偵測到時）、思考層級（一行）。
- **Reasoning**：目前可見性層級 + /reasoning 切換提示。

系統提示中的安全防護措施僅供參考。它們指導模型行為，但不執行策略。請使用工具策略、執行核准、沙箱和通道允許清單來執行強制執行；操作者可以透過設計停用這些功能。

## Prompt modes

OpenClaw 可以為子代理程式渲染較小的系統提示。執行時環境會為每次執行設定一個
`promptMode`（這不是使用者可見的設定）：

- `full`（預設）：包含上述所有區段。
- `minimal`：用於子代理程式；省略 **Skills**（技能）、**Memory Recall**（記憶回溯）、**OpenClaw
  Self-Update**（OpenClaw 自我更新）、**Model Aliases**（模型別名）、**User Identity**（使用者身分）、**Reply Tags**（回覆標籤）、
  **Messaging**（訊息傳遞）、**Silent Replies**（靜默回覆）和 **Heartbeats**（心跳）。工具、**Safety**（安全性）、
  工作區、沙箱、當前日期與時間（如已知）、執行時環境和注入的
  上下文仍然可用。
- `none`：僅返回基本身分行。

當 `promptMode=minimal` 時，額外注入的提示會被標記為 **Subagent
Context**（子代理程式上下文），而非 **Group Chat Context**（群組聊天上下文）。

## 工作區啟動程序注入

Bootstrap 文件會被修剪並附加在 **專案上下文** 下，這樣模型就能看到身分和設定檔上下文，而無需明確讀取：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅限全新的工作區)
- `MEMORY.md`（如果存在），否則使用 `memory.md` 作為小寫後備方案

所有這些檔案都會在每輪對話中**注入到上下文視窗** 中，這意味著它們會消耗 tokens。請保持簡潔——特別是 `MEMORY.md`，它可能會隨時間增長，導致上下文使用量意外升高以及更頻繁的壓縮。

> **注意：** `memory/*.md` 每日檔案 **不** 會自動注入。它們
> 是透過 `memory_search` 和 `memory_get` 工具按需存取的，因此
> 除非模型明確讀取它們，否則它們不會計入上下文視窗。

大型檔案會被截斷並標記。每個檔案的大小上限由
`agents.defaults.bootstrapMaxChars` 控制（預設值：20000）。所有檔案的注入引導程序
內容總計由 `agents.defaults.bootstrapTotalMaxChars` 限制
（預設值：150000）。缺失的檔案會注入一個簡短的缺失檔案標記。發生截斷時，
OpenClaw 可以在專案上下文中插入警告區塊；透過
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行為
（`off`、`once`、`always`；
預設值：`once`）。

子代理會話僅注入 `AGENTS.md` 和 `TOOLS.md`（其他啟動檔案
會被過濾掉，以保持子代理上下文精簡）。

內部掛鉤可以透過 `agent:bootstrap` 攔截此步驟，以變更或取代
注入的啟動檔案（例如將 `SOUL.md` 交換為替代人格）。

若要檢查每個注入檔案的貢獻程度（原始內容與注入內容、截斷，以及工具 schema 開銷），請使用 `/context list` 或 `/context detail`。參閱[上下文](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示會包含專用的 **Current Date & Time** 部分。為了保持提示的快取穩定，它現在僅包含
**時區**（沒有動態時鐘或時間格式）。

當代理需要當前時間時使用 `session_status`；狀態卡片
包含時間戳記行。

配置如下：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為詳情，請參閱[日期與時間](/zh-Hant/date-time)。

## 技能

當存在合格的技能時，OpenClaw 會注入一個精簡的**可用技能清單**
(`formatSkillsForPrompt`)，其中包含每個技能的**檔案路徑**。
提示指示模型使用 `read` 來載入列出的位置（工作區、
受管理或捆綁）中的 SKILL.md。如果沒有合格的技能，則會省略技能部分。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

這既保持了基礎提示的精簡，同時又啟用了目標技能的使用。

## 文件

當可用時，系統提示詞會包含一個 **Documentation** 區段，指向
本機 OpenClaw 文件目錄（在 repo 工作區中的 `docs/` 或隨附的 npm
套件文件），並且註明公開鏡像、來源 repo、社群 Discord，以及
用於技能探索的 ClawHub ([https://clawhub.com](https://clawhub.com))。提示詞指示模型優先查閱本機文件
以了解 OpenClaw 的行為、指令、配置或架構，並在可能時自行執行
`openclaw status`（僅在無法存取時詢問使用者）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
