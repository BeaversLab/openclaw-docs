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
- **OpenClaw 自我更新**：如何使用 `config.schema.lookup` 安全地檢查配置，使用 `config.patch` 補丁配置，使用 `config.apply` 替換完整配置，並且僅在明確的用戶請求下運行 `update.run`。僅限所有者使用的 `gateway` 工具也拒絕重寫 `tools.exec.ask` / `tools.exec.security`，包括正規化為這些受保護執行路徑的舊版 `tools.bash.*` 別名。
- **工作區**：工作目錄 (`agents.defaults.workspace`)。
- **文件**：OpenClaw 文件的本地路徑（倉庫或 npm 套件）以及閱讀時機。
- **工作區文件（已注入）**：表示下方包含了引導文件。
- **沙箱**（啟用時）：指示沙箱運行時、沙箱路徑，以及是否可用提權執行。
- **目前日期與時間**：僅限時區（快取穩定；即時時鐘來自 `session_status`）。
- **回覆標籤**：支援的供應商可選的回覆標籤語法。
- **心跳**：心跳提示與確認行為，以及當預設代理啟用心跳時的設定。
- **運行時**：主機、作業系統、節點、模型、倉庫根目錄（偵測到時）、思考層級（一行）。
- **推理**：目前可見性層級 + /reasoning 切換提示。

OpenClaw 將大型穩定內容（包括 **專案脈絡**）保留在內部提示快取邊界之上。易變的頻道/會議區段（例如控制 UI 嵌入指引、**訊息**、**語音**、**群組聊天脈絡**、**反應**、**心跳** 和 **運行時**）會附加在該邊界之下，以便具有前綴快取的本地後端可以在頻道輪次之間重用穩定的工作區前綴。當接受的架構已包含該運行時細節時，工具描述也應避免嵌入目前的頻道名稱。

工具區段還包含針對長期工作的運行時指引：

- 使用 cron 進行後續追蹤（`check back later`、提醒、重複性工作）
  而非 `exec` 睡眠迴圈、`yieldMs` 延遲技巧或重複的 `process`
  輪詢
- 僅對現在啟動並持續在背景執行的指令使用 `exec` / `process`
- 當啟用自動完成喚醒時，啟動指令一次，並在其輸出內容或失敗時依賴基於推送的喚醒路徑
- 當您需要檢查正在執行的指令時，使用 `process` 來查看日誌、狀態、輸入或進行干預
- 如果任務較大，偏好使用 `sessions_spawn`；子代理完成是基於推送的，並會自動向請求者回報
- 不要僅為了等待完成而在迴圈中輪詢 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode` 可以加強此指引。預設的 `suggest` 模式會保持基線提示。`prefer` 則新增了一個專用的**子代理委派**章節，指示主要代理充當響應式協調器，並透過 `sessions_spawn` 推送任何比直接回覆更複雜的事務。這僅限於提示層面；工具原則仍然控制 `sessions_spawn` 是否可用。

當啟用實驗性的 `update_plan` 工具時，工具模組也會告訴模型僅將其用於非平凡的多次步驟工作，保持恰好一個 `in_progress` 步驟，並避免在每次更新後重複整個計畫。

系統提示中的安全防護措施僅供參考。它們指導模型行為但不執行原則。使用工具原則、執行核准、沙盒和通道允許清單來進行強制執行；操作者可以刻意停用這些功能。

在具有原生核准卡片/按鈕的頻道上，執行時提示現在會告訴代理優先依賴該原生核准 UI。只有在工具結果指出聊天核准不可用或手動核准是唯一途徑時，才應包含手動 `/approve` 指令。

## 提示模式

OpenClaw 可以為子代理渲染較小的系統提示。執行環境會為每次執行設定一個 `promptMode`（而非使用者面向的設定）：

- `full`（預設值）：包含上述所有章節。
- `minimal`：用於子代理；省略 **Skills**（技能）、**Memory Recall**（記憶回憶）、**OpenClaw
  Self-Update**（OpenClaw 自更新）、**Model Aliases**（模型別名）、**User Identity**（用戶身份）、**Reply Tags**（回覆標籤）、
  **Messaging**（訊息傳遞）、**Silent Replies**（靜默回覆）和 **Heartbeats**（心跳）。工具、**Safety**（安全性）、
  工作區、沙箱、當前日期與時間（如果已知）、運行時和注入的
  上下文仍然可用。
- `none`：僅返回基本身份行。

當 `promptMode=minimal` 時，額外注入的提示會被標記為 **Subagent
Context**（子代理上下文），而不是 **Group Chat Context**（群組聊天上下文）。

對於頻道自動回覆運行，當直接/群組聊天上下文已包含已解析的
特定於對話的 `NO_REPLY` 行為時，OpenClaw 可以省略通用的 **Silent Replies**
部分。這避免了在全局系統提示和頻道上下文中重複 token 機制。

## 提示快照

OpenClaw 在 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/` 下保留用於 Codex 運行時正常路徑的已提交提示快照。它們會渲染
所選的應用服務器執行緒/回合參數，以及為 Telegram 私訊、Discord 群組和心跳回合重建的模型綁定提示
層堆疊。該堆疊
包括一個固定的 Codex `gpt-5.5` 模型提示固定裝置（fixture），該裝置是根據 Codex 的
模型目錄/快取形狀生成的、Codex 正常路徑權限開發者文本、
OpenClaw 開發者指令、當 OpenClaw 提供時的回合範圍協作模式指令、
用戶回合輸入，以及對動態工具
規範的引用。

使用 `pnpm prompt:snapshots:sync-codex-model` 重新整理固定的 Codex 模型提示固定裝置。默認情況下，該腳本會尋找
位於 `$CODEX_HOME/models_cache.json` 的 Codex 運行時快取，然後是
`~/.codex/models_cache.json`，最後才回退到位於 `~/code/codex/codex-rs/models-manager/models.json` 的維護者 Codex
簽出約定。如果
這些來源都不存在，該命令將退出而不更改已提交的
固定裝置。傳遞 `--catalog <path>` 以從特定的 `models_cache.json`
或 `models.json` 檔案重新整理。

這些快照仍然不是逐位元組的原始 OpenAI 請求捕獲。在 OpenClaw 發送執行緒和回合參數後，Codex 可以在 Codex 執行時內添加執行時擁有的工作區上下文，例如 `AGENTS.md`、環境上下文、記憶、應用程式/外掛指令以及內建的預設協作模式指令。

使用 `pnpm prompt:snapshots:gen` 重新生成它們，並使用 `pnpm prompt:snapshots:check` 驗證偏移。CI 在額外的邊界分片中執行偏移檢查，以便提示詞更改和快照更新保持附加在同一個 PR 上。

## 工作區引導注入

引導檔案會被修剪並附加在 **專案上下文** 下，以便模型無需明確讀取即可看到身分和設定檔上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (僅在全新的工作區上)
- `MEMORY.md` (如果存在)

除非套用了特定檔案的閘門，否則所有這些檔案都會在每個回合中 **注入到上下文視窗** 中。當為預設代理停用心跳或 `agents.defaults.heartbeat.includeSystemPromptSection` 為 false 時，正常執行會省略 `HEARTBEAT.md`。請保持注入檔案的簡潔，特別是 `MEMORY.md`。`MEMORY.md` 旨在保持為一個精心策劃的長期摘要；詳細的每日記錄應放在 `memory/*.md` 中，`memory_search` 和 `memory_get` 可以根據需求檢索它們。過大的 `MEMORY.md` 檔案會增加提示詞使用量，並且由於以下引導檔案限制，可能會被部分注入。

當會話在原生 Codex 驅動程式上運行時，Codex 會透過其自身的專案文件探索載入 `AGENTS.md`。OpenClaw 仍然會解析剩餘的引導檔案，並將其作為 Codex 配置指令轉發，因此 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` 保持相同的工作區上下文角色，而不會重複 `AGENTS.md`。

<Note>`memory/*.md` 每日檔案**不**屬於正常引導專案上下文的一部分。在普通輪次中，它們是透過 `memory_search` 和 `memory_get` 工具按需存取的，因此除非模型明確讀取它們，否則它們不會佔用上下文視窗。純 `/new` 和 `/reset` 輪次是例外：執行時可以將最近的每日記憶作為該首輪的一次性啟動上下文區塊預先加上去。</Note>

大型檔案會以標記截斷。每個檔案的大小上限由 `agents.defaults.bootstrapMaxChars` 控制（預設值：12000）。所有檔案中注入的引導內容總計由 `agents.defaults.bootstrapTotalMaxChars` 限制（預設值：60000）。遺失的檔案會注入一個簡短的遺失檔案標記。當發生截斷時，OpenClaw 可以注入一個簡潔的系統提示警告通知；使用 `agents.defaults.bootstrapPromptTruncationWarning` 控制此行為（`off`、`once`、`always`；預設值：`once`）。詳細的原始/注入計數會保留在診斷資訊中，例如 `/context`、`/status`、doctor 和日誌。

對於記憶檔案，截斷並不會造成資料遺失：檔案在磁碟上保持完整，但模型只會看到縮短後的注入副本，直到它直接讀取或搜尋記憶為止。如果 `MEMORY.md` 經常被截斷，請將其提煉成更簡短的持久摘要，並將詳細歷史記錄移至 `memory/*.md`，或者有意提高引導限制。

子代理會話僅注入 `AGENTS.md` 和 `TOOLS.md`（其他引導檔案
會被過濾掉，以保持子代理上下文精簡）。

內部掛鉤可以透過 `agent:bootstrap` 攔截此步驟，以修改或替換
注入的引導檔案（例如將 `SOUL.md` 交換為替代人格）。

如果您想讓代理聽起來不那麼 generic，請從
[SOUL.md Personality Guide](/zh-Hant/concepts/soul) 開始。

若要檢查每個注入檔案的貢獻程度（原始與注入、截斷，以及工具架構開銷），請使用 `/context list` 或 `/context detail`。參閱 [Context](/zh-Hant/concepts/context)。

## 時間處理

當已知使用者時區時，系統提示詞會包含專用的 **Current Date & Time** 區塊。為了保持提示詞的快取穩定性，現在僅包含
**時區**（沒有動態時鐘或時間格式）。

當代理需要當前時間時，請使用 `session_status`；狀態卡片
包含一個時間戳記行。同一個工具可選擇性地設定每個會話的模型
覆寫（`model=default` 會清除它）。

配置方式：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

有關完整行為的詳細資訊，請參閱 [Date & Time](/zh-Hant/date-time)。

## 技能

當有符合資格的技能存在時，OpenClaw 會注入一個精簡的 **available skills list**
(`formatSkillsForPrompt`)，其中包含每個技能的 **file path**。
提示詞會指示模型使用 `read` 來載入列出的
位置（工作區、受管理或捆綁）中的 SKILL.md。如果沒有符合資格的技能，
則會省略技能區塊。

資格條件包括技能元數據閘門、執行時環境/配置檢查，
以及當配置了 `agents.defaults.skills` 或
`agents.list[].skills` 時的有效代理技能允許清單。

外掛程式捆綁的技能僅在其擁有的外掛程式啟用時才符合資格。
這允許工具外掛程式公開更深入的操作指南，而無需將所有
這些指導直接嵌入到每個工具描述中。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

這既保持了基本提示詞的精簡，同時又允許針對性的技能使用。

技能列表預算由技能子系統擁有：

- 全域預設值：`skills.limits.maxSkillsPromptChars`
- 每個代理的覆寫：`agents.list[].skillsLimits.maxSkillsPromptChars`

通用有界執行時摘要使用不同的介面：

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

這種分離將技能大小與執行時讀取/注入大小（例如 `memory_get`、即時工具結果以及壓縮後的 AGENTS.md 重新整理）區分開來。

## 文件

系統提示詞包含一個**文件** 部份。當有本機文件可用時，它會指向本機 OpenClaw 文件目錄（Git 簽出中的 `docs/` 或隨附的 npm 套件文件）。如果無法使用本機文件，它會回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。

同一部份也包含 OpenClaw 來源位置。Git 簽出會公開本機來源根目錄，以便代理可以直接檢查程式碼。套件安裝會包含 GitHub 來源 URL，並告訴代理在文件不完整或過時時到那裡檢視來源。提示詞還會註記公開文件鏡像、社群 Discord 和 ClawHub ([https://clawhub.ai](https://clawhub.ai)) 用於技能探索。它告訴模型針對 OpenClaw 行為、指令、組態或架構先查閱文件，並在可能時自行執行 `openclaw status`（僅在缺乏存取權時詢問使用者）。具體對於組態，它會指向代理 `gateway` 工具動作 `config.schema.lookup` 以取得確切的欄位級文件和約束，然後指向 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以獲得更廣泛的指導。

## 相關

- [代理執行時](/zh-Hant/concepts/agent)
- [代理工作區](/zh-Hant/concepts/agent-workspace)
- [內容引擎](/zh-Hant/concepts/context-engine)
