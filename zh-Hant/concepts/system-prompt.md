---
summary: "OpenClaw 系統提示詞包含的內容及其組裝方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "系統提示詞"
---

# 系統提示詞

OpenClaw 會為每次代理運行構建自訂的系統提示詞。該提示詞由 **OpenClaw 所有**，並不使用 pi-coding-agent 的預設提示詞。

該提示詞由 OpenClaw 組裝並注入到每次代理運行中。

## 結構

該提示詞經過特意精簡，並使用固定的區塊：

- **工具**：目前工具清單 + 簡短描述。
- **安全性**：簡短的防護提醒，以避免權力尋求行為或規避監督。
- **技能**（當可用時）：告訴模型如何按需載入技能指令。
- **OpenClaw 自我更新**：如何執行 `config.apply` 和 `update.run`。
- **工作區**：工作目錄 (`agents.defaults.workspace`)。
- **文件**：OpenClaw 文件的本地路徑（儲存庫或 npm 套件）以及何時閱讀它們。
- **工作區文件（注入）**：表示引導檔案包含在下方。
- **沙箱**（啟用時）：表示沙箱執行時、沙箱路徑，以及是否可使用升權執行。
- **目前日期與時間**：使用者當地時間、時區和時間格式。
- **回覆標籤**：支援的供應商可選用的回覆標籤語法。
- **心跳**：心跳提示詞和確認行為。
- **執行時**：主機、作業系統、節點、模型、儲存庫根目錄（偵測到時）、思考層級（一行）。
- **推理**：目前的可見性層級 + /reasoning 切換提示。

系統提示詞中的安全防護措施僅供參考。它們指導模型行為，但不執行政策。請使用工具政策、執行核准、沙箱和通道允許清單來進行強制執行；操作者可依設計停用這些功能。

## 提示詞模式

OpenClaw 可以為子代理渲染較小的系統提示詞。執行時會為每次運行設定一個
`promptMode`（這不是使用者可設定的配置）：

- `full`（預設）：包含上述所有區塊。
- `minimal`：用於子代理；省略 **Skills**（技能）、**Memory Recall**（記憶回憶）、**OpenClaw
  Self-Update**（OpenClaw 自我更新）、**Model Aliases**（模型別名）、**User Identity**（使用者身分）、**Reply Tags**（回覆標籤）、
  **Messaging**（訊息傳遞）、**Silent Replies**（靜默回覆）和 **Heartbeats**（心跳）。工具、**Safety**（安全性）、
  Workspace（工作區）、Sandbox（沙盒）、Current Date & Time（當前日期與時間，如已知）、Runtime（運行時）和注入的
  上下文保持可用。
- `none`：僅返回基礎身分行。

當 `promptMode=minimal` 時，額外注入的提示會被標記為 **Subagent
Context**（子代理上下文）而非 **Group Chat Context**（群組聊天上下文）。

## Workspace bootstrap injection（工作區啟動注入）

Bootstrap（啟動）檔案會經過修剪並附加在 **Project Context**（專案上下文）下，以便模型無需明確讀取即可看到身分和設定檔上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅限全新的工作區）
- 如果存在則使用 `MEMORY.md`，否則使用 `memory.md` 作為小寫備選方案

所有這些檔案在每個回合中都會 **注入到上下文視窗中**，這
意味著它們會消耗 token。請保持簡潔 —— 特別是 `MEMORY.md`，它可能會
隨時間增長，導致上下文使用量意外偏高以及更頻繁的
壓縮。

> **注意：** `memory/*.md` 每日檔案 **不會** 自動注入。它們
> 透過 `memory_search` 和 `memory_get` 工具按需存取，因此
> 除非模型明確讀取它們，否則不會計入上下文視窗。

大檔案會被標記截斷。每個檔案的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（預設值：20000）。所有檔案中注入的啟動
內容總計上限由 `agents.defaults.bootstrapTotalMaxChars` 限制
（預設值：150000）。缺失的檔案會注入一個簡短的缺失檔案標記。發生截斷
時，OpenClaw 可以在 Project Context 中注入一個警告區塊；透過
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；
預設值：`once`）。

子代理會話僅注入 `AGENTS.md` 和 `TOOLS.md`（其他啟動檔案
會被過濾掉以保持子代理上下文精簡）。

內部掛鉤可以透過 `agent:bootstrap` 攔截此步驟，以變更或替換
注入的啟動檔案（例如將 `SOUL.md` 交換為替換人設）。

若要檢查每個注入檔案的貢獻（原始 vs 注入、截斷，以及工具架構額外開銷），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示會包含一個專屬的 **Current Date & Time** 區塊。為了保持提示緩存穩定，現在僅包含
**時區**（無動態時鐘或時間格式）。

當代理需要當前時間時，請使用 `session_status`；狀態卡片
包含一條時間戳記行。

設定方式：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為詳情，請參閱 [Date & Time](/zh-Hant/date-time)。

## 技能

當存在符合條件的技能時，OpenClaw 會注入一個精簡的 **available skills list**
(`formatSkillsForPrompt`)，其中包含每個技能的 **file path**。
提示指示模型使用 `read` 載入列出的
位置（工作區、受管理或捆綁）中的 SKILL.md。如果沒有符合條件的技能，
則會省略 Skills 區塊。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

這既保持了基礎提示的精簡，同時仍能啟用目標技能的使用。

## 文件

當可用時，系統提示會包含一個 **Documentation** 區塊，指向
本機 OpenClaw 文件目錄（即工作區中的 `docs/` 或捆綁的 npm
套件文件），並註明公開鏡像、來源存儲庫、社群 Discord，以及
用於技能發現的 ClawHub ([https://clawhub.com](https://clawhub.com))。提示指示模型優先查閱本機文件
以了解 OpenClaw 行為、指令、設定或架構，並在可能時自行執行
`openclaw status`（僅在無法存取時詢問使用者）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
