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

## 結構

該提示詞刻意設計得精簡，並使用固定章節：

- **工具**：目前工具列表 + 簡短描述。
- **安全性**：簡短的防護提醒，以避免追求權力行為或規避監督。
- **技能** (可用時)：告訴模型如何按需載入技能指令。
- **OpenClaw 自我更新**：如何執行 `config.apply` 和 `update.run`。
- **工作區**：工作目錄 (`agents.defaults.workspace`)。
- **文件**：OpenClaw 文件的本機路徑 (repo 或 npm 套件) 及閱讀時機。
- **工作區檔案 (已注入)**：指示以下包含了啟動檔案。
- **沙盒** (啟用時)：指示沙盒執行環境、沙盒路徑，以及是否可用提權執行。
- **目前日期與時間**：使用者本地時間、時區與時間格式。
- **回應標籤**：支援供應商的選用回應標籤語法。
- **心跳**：心跳提示詞與確認行為。
- **執行環境**：主機、作業系統、節點、模型、repo 根目錄 (偵測到時)、思維層級 (一行)。
- **推理**：目前可見性層級 + /reasoning 切換提示。

系統提示詞中的安全防護措施僅供參考。它們引導模型行為，但不強制執行策略。請使用工具策略、執行核准、沙盒隔離與通道允許清單來進行嚴格執行；操作者可刻意停用這些功能。

## 提示詞模式

OpenClaw 可以為子 Agent 呈現較小的系統提示詞。執行環境會為每次執行設定
`promptMode` (非使用者面向的設定)：

- `full` (預設值)：包含上述所有章節。
- `minimal`：用於子代理；省略 **Skills**、**Memory Recall**、**OpenClaw
  Self-Update**、**Model Aliases**、**User Identity**、**Reply Tags**、
  **Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、
  Workspace、Sandbox、Current Date & Time（已知時）、Runtime 和注入的
  Context 保持可用。
- `none`：僅返回基礎身份行。

當 `promptMode=minimal` 時，額外注入的提示會標記為 **Subagent
Context** 而非 **Group Chat Context**。

## Workspace bootstrap 注入

Bootstrap 檔案會被修剪並附加在 **Project Context** 下，以便模型無需顯式讀取即可看到身份和 Profile Context：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅在全新的 Workspaces 上）
- 若存在則使用 `MEMORY.md`，否則使用 `memory.md` 作為小寫的回退

所有這些檔案在每個輪次中都會**注入到 Context window** 中，這意味著它們會消耗 Tokens。請保持簡潔 —— 尤其是 `MEMORY.md`，它會隨時間增長並導致 Context 使用量意外變高以及更頻繁的壓縮。

> **注意：** `memory/*.md` 每日檔案**不**會自動注入。它們
> 透過 `memory_search` 和 `memory_get` 工具按需存取，因此
> 除非模型明確讀取它們，否則不會計入 Context window。

大檔案會使用標記截斷。每個檔案的最大大小由
`agents.defaults.bootstrapMaxChars` 控制（預設值：20000）。所有檔案注入的 Bootstrap
內容總量由 `agents.defaults.bootstrapTotalMaxChars` 限制
（預設值：150000）。缺失的檔案會注入一個簡短的 missing-file 標記。發生截斷時，
OpenClaw 可以在 Project Context 中注入警告區塊；使用
`agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；
預設值：`once`）。

子代理會話僅注入 `AGENTS.md` 和 `TOOLS.md` （其他啟動檔案
會被過濾掉，以保持子代理上下文精簡）。

內部鉤子可以透過 `agent:bootstrap` 攔截此步驟，以變更或替換
注入的啟動檔案（例如將 `SOUL.md` 交換為替代角色）。

若要檢查每個注入檔案的貢獻程度（原始內容 vs. 注入內容、截斷，以及工具架構開銷），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/en/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞會包含一個專用的 **Current Date & Time** 區塊。為了保持提示詞快取穩定，現在僅包含
**時區**（無動態時鐘或時間格式）。

當代理需要當前時間時，請使用 `session_status`；狀態卡
中包含一個時間戳記行。

使用以下方式配置：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為詳情，請參閱 [Date & Time](/en/date-time)。

## 技能

當存在可用的技能時，OpenClaw 會注入一個精簡的 **可用技能清單**
(`formatSkillsForPrompt`)，其中包含每個技能的 **檔案路徑**。提示詞會指示模型使用 `read` 載入列出的
位置（工作區、受管理或捆綁）中的 SKILL.md。如果沒有可用的技能，則會
省略技能區塊。

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

## 文件

當可用時，系統提示詞會包含一個 **文件** 區塊，指向本機
OpenClaw 文件目錄（位於儲存庫工作區中的 `docs/` 或捆綁的 npm
套件文件），並且還會註記公開鏡像、來源儲存庫、社群 Discord 以及
用於技能探索的 ClawHub ([https://clawhub.com](https://clawhub.com))。提示詞會指示模型優先查閱本機文件以了解
OpenClaw 的行為、指令、組態或架構，並在可能時自行執行
`openclaw status`（僅在無法存取時詢問使用者）。
