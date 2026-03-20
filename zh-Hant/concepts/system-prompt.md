---
summary: "OpenClaw 系統提示詞的內容及其組裝方式"
read_when:
  - 編輯系統提示詞文字、工具列表或時間/心跳區段
  - 變更工作區引導或技能注入行為
title: "System Prompt"
---

# 系統提示詞

OpenClaw 會為每次代理執行建構自訂的系統提示詞。該提示詞**由 OpenClaw 擁有**，且不使用 pi-coding-agent 的預設提示詞。

該提示詞由 OpenClaw 組裝，並注入到每次代理執行中。

## 結構

該提示詞刻意保持精簡，並使用固定的區段：

- **Tooling**：目前的工具列表 + 簡短描述。
- **Safety**：簡短的防護提醒，以避免追求權力的行為或繞過監督。
- **Skills**（可用時）：告訴模型如何隨需載入技能指令。
- **OpenClaw Self-Update**：如何執行 `config.apply` 和 `update.run`。
- **Workspace**：工作目錄 (`agents.defaults.workspace`)。
- **Documentation**：OpenClaw 文件的本地路徑（repo 或 npm 套件）以及閱讀時機。
- **Workspace Files (injected)**：指出下方包含引導檔案。
- **Sandbox**（啟用時）：指出沙箱執行環境、沙箱路徑，以及是否可使用提權執行。
- **Current Date & Time**：使用者本地時間、時區和時間格式。
- **Reply Tags**：支援供應商的可選回覆標籤語法。
- **Heartbeats**：心跳提示詞與確認行為。
- **Runtime**：主機、作業系統、節點、模型、repo 根目錄（偵測到時）、思考層級（一行）。
- **Reasoning**：目前可見性層級 + /reasoning 切換提示。

系統提示詞中的安全防護措施僅供參考。它們引導模型行為，但不強制執行策略。請使用工具策略、執行核准、沙箱和通道允許清單來進行強制執行；操作員可根據設計停用這些功能。

## 提示詞模式

OpenClaw 可以為子代理呈現較小的系統提示詞。執行環境會為每次執行設定
`promptMode`（非使用者面向的設定）：

- `full` (預設)：包含上述所有區段。
- `minimal`：用於子代理；省略 **技能**、**記憶回憶**、**OpenClaw 自我更新**、**模型別名**、**使用者身份**、**回覆標籤**、**訊息傳遞**、**靜默回覆** 和 **心跳**。工具、**安全性**、工作區、沙箱、當前日期與時間（如果已知）、執行環境和注入的上下文仍然可用。
- `none`：僅返回基礎身份行。

當使用 `promptMode=minimal` 時，額外注入的提示會標記為 **子代理上下文** 而不是 **群組聊天上下文**。

## 工作區引導注入

引導文件會被修剪並附加在 **專案上下文** 下，以便模型無需明確讀取即可看到身份和設定檔上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（僅在全新的工作區上）
- 如果存在則使用 `MEMORY.md`，否則使用 `memory.md` 作為小寫後備

所有這些文件都會在每個輪次中 **注入到上下文視窗** 中，這意味著它們會消耗 token。請保持簡潔 —— 特別是 `MEMORY.md`，它可能會隨時間增長，導致意想不到的高上下文使用量和更頻繁的壓縮。

> **注意：** `memory/*.md` 每日文件 **不會** 自動注入。它們通過 `memory_search` 和 `memory_get` 工具按需存取，因此除非模型明確讀取它們，否則它們不會佔用上下文視窗的空間。

大文件會被用標記截斷。每個文件的最大大小由 `agents.defaults.bootstrapMaxChars` 控制（預設值：20000）。所有文件的注入引導內容總計由 `agents.defaults.bootstrapTotalMaxChars` 限制（預設值：150000）。缺少的文件會注入一個短的缺少文件標記。當發生截斷時，OpenClaw 可以在專案上下文中注入警告塊；通過 `agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；預設值：`once`）。

子代理會話僅注入 `AGENTS.md` 和 `TOOLS.md`（其他啟動文件會被過濾掉，以保持子代理上下文精簡）。

內部掛鉤可以透過 `agent:bootstrap` 攔截此步驟，以變更或取代注入的啟動檔案（例如將 `SOUL.md` 交換為替代的 persona）。

若要檢查每個注入檔案的貢獻程度（原始內容 vs 注入內容、截斷情況，以及工具 schema 開銷），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞會包含一個專用的 **Current Date & Time**（目前日期與時間）章節。為了保持提示詞快取穩定，它現在僅包含 **時區**（沒有動態時鐘或時間格式）。

當代理需要目前時間時，請使用 `session_status`；狀態卡片包含一個時間戳記行。

使用以下方式設定：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為細節，請參閱 [Date & Time](/zh-Hant/date-time)。

## 技能

當有符合資格的技能時，OpenClaw 會注入一個精簡的 **可用技能清單** (`formatSkillsForPrompt`)，其中包含每個技能的 **檔案路徑**。提示詞指示模型使用 `read` 來載入列舉位置（工作區、管理或捆綁）的 SKILL.md。如果沒有符合資格的技能，則會省略技能章節。

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

當可用時，系統提示詞會包含一個 **文件** 章節，指向本機 OpenClaw 文件目錄（位於 repo 工作區中的 `docs/` 或捆綁的 npm 套件文件），並註明公開鏡像、來源 repo、社群 Discord 和 ClawHub ([https://clawhub.com](https://clawhub.com)) 以供技能探索。提示詞指示模型優先查閱本機文件以了解 OpenClaw 行為、指令、設定或架構，並在可能時自行執行 `openclaw status`（僅在無權限存取時才詢問使用者）。

import en from "/components/footer/en.mdx";

<en />
