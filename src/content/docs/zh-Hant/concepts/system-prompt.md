---
summary: "OpenClaw 系統提示詞的內容及其組建方式"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "系統提示"
---

OpenClaw 會為每次代理執行建構自訂的系統提示。此提示由 **OpenClaw 擁有**，並不使用 pi-coding-agent 的預設提示。

該提示由 OpenClaw 組裝，並注入到每次代理執行中。

Prompt 組裝有三個層次：

- `buildAgentSystemPrompt` 根據明確的輸入渲染提示。它應
  保持為純渲染器，不應直接讀取全域設定。
- `resolveAgentSystemPromptConfig` 解析基於設定的提示參數，例如針對特定代理的
  擁有者顯示、TTS 提示、模型別名、記憶體引用模式和子代理
  委派模式。
- 執行時適配器 (embedded, CLI, command/export previews, compaction) 收集
  即時事實，例如工具、沙箱狀態、通道功能、上下文檔案
  和提供者的提示貢獻，然後呼叫已設定的提示外觀。

這使得匯出/除錯的提示介面與即時執行保持一致，而無需
將每個執行時特定的細節轉化為一個龐大的建構器。

提供者外掛可以提供具備快取感知的提示指導，而無需替換
完整的 OpenClaw 擁有的提示。提供者執行時可以：

- 替換一小组命名的核心部分 (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- 在提示快取邊界之上注入**穩定前綴**
- 在提示快取邊界之下注入**動態後綴**

使用提供者擁有的貢獻進行特定模型系列的調整。保留舊版
`before_prompt_build` 提示變更以用於相容性或真正全域的提示
變更，而非正常的提供者行為。

OpenAI GPT-5 系列覆蓋層保持核心執行規則簡短，並添加
特定於模型的指導，包括人格鎖定、簡潔輸出、工具紀律、
並行查詢、交付範圍、驗證、缺失上下文和
終端工具衛生。

## 結構

該提示經過特意壓縮並使用固定區段：

- **工具**：結構化工具的來源提醒加上執行時工具使用指導。
- **執行偏差**：簡潔的貫徹指導：依次對
  可執行請求採取行動，持續直到完成或受阻，從微弱的工具
  結果中恢復，即時檢查可變狀態，並在最終確定前進行驗證。
- **安全性**：簡短的防護提醒，以避免尋求權力的行為或繞過監督。
- **技能** (當可用時)：告訴模型如何按需載入技能指令。
- **OpenClaw Control**：告訴模型在設定/重新啟動作業中偏好使用 `gateway` 工具，並避免發明 CLI 指令。
- **OpenClaw Self-Update**：如何使用 `config.schema.lookup` 安全地檢查設定、使用 `config.patch` 修補設定、使用 `config.apply` 取代完整設定，並僅在明確的使用者請求下執行 `update.run`。僅限擁有者使用的 `gateway` 工具也會拒絕重寫 `tools.exec.ask` / `tools.exec.security`，包括標準化為這些受保護執行路徑的舊版 `tools.bash.*` 別名。
- **Workspace**：工作目錄 (`agents.defaults.workspace`)。
- **Documentation**：OpenClaw 文件/來源的本地路徑以及何時閱讀它們。
- **Workspace Files (injected)**：表示以下包含了啟動檔案。
- **Sandbox** (啟用時)：表示沙箱執行環境、沙箱路徑，以及是否可使用提升權限的執行。
- **Current Date & Time**：僅限時區 (快取穩定；即時時鐘來自 `session_status`)。
- **Assistant Output Directives**：精簡附件、語音備忘錄和回覆標籤語法。
- **Heartbeats**：心跳提示和確認行為，當預設代理程式啟用心跳時。
- **Runtime**：主機、作業系統、節點、模型、儲存庫根目錄 (偵測到時)、思考層級 (一行)。
- **Reasoning**：目前可見性層級 + /reasoning 切換提示。

OpenClaw 將大型穩定內容，包括 **Project Context**，保留在內部提示快取邊界之上。變動的頻道/會話區段，例如控制 UI 嵌入指引、**Messaging**、**Voice**、**Group Chat Context**、**Reactions**、**Heartbeats** 和 **Runtime**，會附加在該邊界之下，以便具有前置快取的本地後端可以在頻道輪次之間重複使用穩定的工作區前置詞。當接受的架構已包含該執行時詳細資訊時，工具描述同樣應避免嵌入目前的頻道名稱。

Tooling 區段也包含長時間執行作業的執行時指引：

- 對於後續的跟進（`check back later`、提醒、週期性工作），請使用 cron
  而非 `exec` sleep 迴圈、`yieldMs` delay 技巧或重複的 `process`
  輪詢
- 僅對現在開始並繼續在背景執行的指令使用 `exec` / `process`
- 當啟用自動完成喚醒時，只需啟動指令一次，並在它輸出或失敗時依賴基於推送的喚醒路徑
- 當您需要檢查正在執行的指令時，使用 `process` 來查看日誌、狀態、輸入或進行干預
- 如果任務較大，優先使用 `sessions_spawn`；子代理的完成是基於推送的，並會自動通知請求者
- 不要僅為了等待完成而在迴圈中輪詢 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode` 可以加強此指導。預設的
`suggest` 模式會保留基準推動。`prefer` 增加了一個專門的
**Sub-Agent Delegation** 部分，指示主代理作為響應式協調器，並將任何比直接回覆更複雜的事項通過
`sessions_spawn` 推送。這僅限於提示；工具策略仍然控制 `sessions_spawn` 是否可用。

當啟用實驗性的 `update_plan` 工具時，Tooling 還會告訴模型僅將其用於非平凡的多步驟工作，保持正好一個
`in_progress` 步驟，並避免在每次更新後重複整個計劃。

系統提示中的安全防護措施是建議性的。它們指導模型行為，但不強制執行策略。請使用工具策略、執行批准、沙盒和通道允許列表進行強制執行；操作員可以有意禁用這些功能。

在具有原生批准卡/按鈕的頻道上，執行時提示現在會告訴代理首先依賴該原生批准 UI。僅當工具結果顯示聊天批准不可用或手動批准是唯一途徑時，才應包含手動
`/approve` 指令。

## 提示模式

OpenClaw 可以為子代理渲染較小的系統提示。運行時會為每次運行設定一個 `promptMode`（這不是使用者可見的配置）：

- `full`（預設值）：包含上述所有章節。
- `minimal`：用於子代理；省略 **Memory Recall**、**OpenClaw Self-Update**、**Model Aliases**、**User Identity**、**Assistant Output Directives**、**Messaging**、**Silent Replies** 和 **Heartbeats**。工具、**Safety**、**Skills**（如果提供）、Workspace、Sandbox、當前日期與時間（如果已知）、Runtime 和注入的上下文仍然可用。
- `none`：僅返回基本身份行。

當 `promptMode=minimal` 時，額外注入的提示會標記為 **Subagent Context** 而非 **Group Chat Context**。

對於頻道自動回覆執行，當直接訊息、群組或僅限訊息工具的上下文擁有可見回覆合約時，OpenClaw 會省略通用的**靜默回覆**（Silent Replies）部分。只有舊的自動群組/頻道模式才應顯示 `NO_REPLY`；直接訊息和僅限訊息工具的回覆不會收到靜默代幣的指導。

## 提示快照

OpenClaw 會在 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/` 下保留針對 Codex 運行時快樂路徑的已提交提示快照。它們會渲染選定的應用伺服器線程/輪次參數，以及針對 Telegram 直接訊息、Discord 群組和心跳輪次的重建模型綁定提示層堆疊。該堆疊包括固定 Codex `gpt-5.5` 模型提示裝置（從 Codex 的模型目錄/快取形狀生成）、Codex 快樂路徑權限開發者文字、OpenClaw 開發者指令、OpenClaw 提供時的輪次範圍協作模式指令、使用者輪次輸入，以及動態工具規格的參考。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示詞 fixture。默認情況下，腳本會先在 `$CODEX_HOME/models_cache.json` 尋找 Codex 的運行時緩存，然後是 `~/.codex/models_cache.json`，只有在這些都不存在時才回退到維護者 Codex checkout 約定的 `~/code/codex/codex-rs/models-manager/models.json`。如果這些來源都不存在，該命令將在不更改已提交 fixture 的情況下退出。傳入 `--catalog <path>` 以從特定的 `models_cache.json` 或 `models.json` 文件刷新。

這些快照仍然不是逐字節的原始 OpenAI 請求捕獲。在 OpenClaw 發送線程和輪次參數後，Codex 可以在 Codex 運行時內添加運行時擁有的工作區上下文（例如 `AGENTS.md`）、環境上下文、記憶、應用程式/外掛指令以及內置的默認協作模式指令。

使用 `pnpm prompt:snapshots:gen` 重新生成它們，並使用 `pnpm prompt:snapshots:check` 驗證差異。CI 在額外的邊界分片中運行差異檢查，以便提示詞更改和快照更新保持附加在同一 PR 上。

## 工作區引導注入

引導文件會被修剪並附加在 **專案上下文** 下，因此模型可以看到身份和配置文件上下文而無需顯式讀取：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` （僅限全新的工作區）
- 如果存在 `MEMORY.md`

除非特定檔案有設置閘門，否則所有這些檔案都會在每一輪**注入到上下文視窗**中。當預設代理停用心跳或 `agents.defaults.heartbeat.includeSystemPromptSection` 為 false 時，`HEARTBEAT.md` 會在一般執行中被省略。請保持注入檔案的精簡，特別是 `MEMORY.md`。`MEMORY.md` 旨在作為長期策展的摘要；詳細的每日筆記應放在 `memory/*.md` 中，以便 `memory_search` 和 `memory_get` 可按需擷取。過大的 `MEMORY.md` 檔案會增加提示詞的使用量，且由於下方的啟動檔案限制，可能會被部分注入。

當會話在原生 Codex 駝具上執行時，Codex 會透過其自己的專案文件發現機制載入 `AGENTS.md`。OpenClaw 仍會解析其餘的啟動檔案並將其作為 Codex 配置指令轉發，因此 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` 保持相同的工作區上下文角色，而不重複 `AGENTS.md`。

<Note>`memory/*.md` 每日檔案**並不**屬於一般啟動專案上下文的一部分。在一般輪次中，它們是透過 `memory_search` 和 `memory_get` 工具按需存取，因此除非模型明確讀取，否則不會佔用上下文視窗。純 `/new` 和 `/reset` 輪次是例外：執行時環境可以在第一輪將最近的每日記憶體作為一次性啟動上下文塊預先加入。</Note>

大檔案會被截斷並帶有標記。每個檔案的最大大小由 `agents.defaults.bootstrapMaxChars` 控制（預設：12000）。跨檔案注入的引導內容總量上限由 `agents.defaults.bootstrapTotalMaxChars` 限制（預設：60000）。遺失的檔案會注入一個簡短的遺失檔案標記。發生截斷時，OpenClaw 可以插入簡明的系統提示詞警告通知；透過 `agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；預設：`always`）。詳細的原始/注入計數保留在診斷資訊中，例如 `/context`、`/status`、doctor 和日誌。

對於記憶檔案，截斷並非資料遺失：檔案在磁碟上保持完整，但模型在直接讀取或搜尋記憶之前，只能看到被截斷的注入副本。如果 `MEMORY.md` 經常被截斷，請將其蒸餾為更簡短且持久的摘要，並將詳細歷史記錄移至 `memory/*.md`，或者有意識地提高引導限制。

子代理程式階段只會注入 `AGENTS.md` 和 `TOOLS.md`（其他引導檔案會被過濾掉，以保持子代理程式的上下文精簡）。

內部掛鉤 可以透過 `agent:bootstrap` 攔截此步驟，以變更或替換注入的引導檔案（例如將 `SOUL.md` 交換為替代的人格設定）。

如果您想讓代理程式的聽起來不那麼通用，請從 [SOUL.md Personality Guide](/zh-Hant/concepts/soul) 開始。

若要檢查每個注入檔案的貢獻程度（原始內容 vs 注入內容、截斷情況，以及工具架構額外負荷），請使用 `/context list` 或 `/context detail`。請參閱 [Context](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞會包含專門的「目前日期與時間」章節。為了保持提示詞快取穩定，它現在僅包含 **時區**（不包含動態時鐘或時間格式）。

當代理需要當前時間時使用 `session_status`；狀態卡包含時間戳記行。同一個工具可以選擇性地設定每個工作階段的模型覆寫（`model=default` 清除它）。

設定如下：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

參閱 [日期與時間](/zh-Hant/date-time) 以了解完整的行為細節。

## 技能

當存在合格的技能時，OpenClaw 會注入一個精簡的 **可用技能列表**（`formatSkillsForPrompt`），其中包含每個技能的 **檔案路徑**。提示指示模型使用 `read` 來載入列出路徑（工作區、受管理或捆綁）下的 SKILL.md。如果沒有合格的技能，則會省略技能部分。

合格性包括技能元數據閘門、執行時環境/設定檢查，以及當設定 `agents.defaults.skills` 或 `agents.list[].skills` 時的有效代理技能允許列表。

外掛程式捆綁的技能僅在其所屬的外掛程式啟用時才合格。這讓工具外掛程式能夠公開更深入的作業指南，而無需將所有指導內容直接嵌入到每個工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

這既保持了基礎提示的精簡，同時又啟用了針對性的技能使用。

技能列表預算由技能子系統擁有：

- 全域預設值：`skills.limits.maxSkillsPromptChars`
- 每個代理的覆寫：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用的受限執行時摘錄使用不同的表面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

這種區分使得技能大小與執行時讀取/注入大小（例如 `memory_get`、即時工具結果以及壓縮後的 AGENTS.md 重新整理）保持分開。

## 文件

系統提示包含一個 **文件** 部分。當本地文件可用時，它指向本地 OpenClaw 文件目錄（Git 檢出中的 `docs/` 或捆綁的 npm 套件文件）。如果本地文件不可用，它會回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部分還包含了 OpenClaw 的原始碼位置。Git 檢出（checkouts）會公開本機的
source root，以便代理程式可以直接檢查程式碼。套件安裝則包含 GitHub
原始碼 URL，並告訴代理程式在文件不完整或過時時前往該處檢視原始碼。
提示詞也註明了公開文件鏡像、社群 Discord 以及 ClawHub
([https://clawhub.ai](https://clawhub.ai))，用於技能探索。它指示模型
對於 OpenClaw 的行為、指令、設定或架構，應先查閱文件，並在可能的情況下
自行執行 `openclaw status`（僅在無權限存取時才詢問使用者）。
針對設定，它會指引代理程式至 `gateway` 工具動作
`config.schema.lookup` 以取得精確的欄位層級文件與限制，接著參閱
`docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md`
以獲得更廣泛的指引。

## 相關

- [代理程式執行時期](/zh-Hant/concepts/agent)
- [代理程式工作區](/zh-Hant/concepts/agent-workspace)
- [情境引擎](/zh-Hant/concepts/context-engine)
