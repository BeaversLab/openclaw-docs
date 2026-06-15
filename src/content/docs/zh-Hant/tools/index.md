---
doc-schema-version: 1
summary: "OpenClaw 工具、技能和外掛程式總覽：代理程式可以呼叫的內容及如何擴充它們"
read_when:
  - You want to understand what tools OpenClaw provides
  - You are deciding between built-in tools, skills, and plugins
  - You need the right docs entry point for tool policy, automation, or agent coordination
title: "概覽"
---

使用此頁面選擇正確的「功能」介面。**工具**是可呼叫的動作，**技能**教導代理程式如何運作，而**外掛程式**則新增執行階段功能，例如工具、提供者、通道、掛鉤和封裝的技能。

這是一個概覽與路由頁面。如需詳盡的工具原則、預設值、群組成員資格、提供者限制及設定欄位，請使用 [工具與自訂提供者](/zh-Hant/gateway/config-tools)。

## 從這裡開始

對於大多數代理程式，請先從內建工具類別開始，然後僅在代理程式應該看到較少工具或需要明確主機存取權時調整政策。

| 如果您需要...                  | 先使用這個                                  | 然後閱讀                                                                                                  |
| ------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 讓代理程式使用現有功能進行動作 | [內建工具](#built-in-tool-categories)       | [工具類別](#built-in-tool-categories)                                                                     |
| 控制代理程式可以呼叫的內容     | [工具原則](#configure-access-and-approvals) | [工具與自訂提供者](/zh-Hant/gateway/config-tools)                                                              |
| 教導代理程式工作流程           | [技能](#choose-tools-skills-or-plugins)     | [技能](/zh-Hant/tools/skills)、[建立技能](/zh-Hant/tools/creating-skills) 和 [技能工作坊](/zh-Hant/tools/skill-workshop) |
| 新增新的整合或執行階段介面     | [外掛程式](#extend-capabilities)            | [外掛程式](/zh-Hant/tools/plugin) 和 [建置外掛程式](/zh-Hant/plugins/building-plugins)                              |
| 稍後或在背景執行工作           | [自動化](/zh-Hant/automation)                    | [自動化概觀](/zh-Hant/automation)                                                                              |
| 協調多個代理程式或線束         | [子代理程式](/zh-Hant/tools/subagents)           | [ACP 代理程式](/zh-Hant/tools/acp-agents) 和 [代理程式傳送](/zh-Hant/tools/agent-send)                              |
| 搜尋大型 OpenClaw 工具目錄     | [工具搜尋](/zh-Hant/tools/tool-search)           | [工具搜尋](/zh-Hant/tools/tool-search)                                                                         |

## 選擇工具、技能或外掛程式

<Steps>
  <Step title="當代理需要執行操作時使用工具">
    工具是代理可以呼叫的類型化函式，例如 `exec`、`browser`、
    `web_search`、`message` 或 `image_generate`。當代理
    需要讀取資料、變更檔案、傳送訊息、呼叫供應商或操作
    其他系統時，請使用工具。可見的工具會以結構化函式
    定義的形式傳送給模型。

    模型只能看到那些通過了啟用設定檔、允許/拒絕
    原則、供應商限制、沙箱狀態、通道權限
    和外掛程式可用性檢查的工具。

  </Step>

  <Step title="當代理程式需要指示時，請使用技能">
    技能是載入代理程式提示中的 `SKILL.md` 指令包。當代理程式已具備所需工具，但需要可重複的
    工作流程、審查標準、指令序列或操作限制時，請使用技能。

    技能可以位於工作區、共享技能目錄、受管理的 OpenClaw 技能根目錄或外掛程式套件中。

    [技能](/zh-Hant/tools/skills) | [技能工作坊](/zh-Hant/tools/skill-workshop) | [建立技能](/zh-Hant/tools/creating-skills) | [技能設定](/zh-Hant/tools/skills-config)

  </Step>

  <Step title="當 OpenClaw 需要新功能時，請使用外掛程式">
    外掛程式可以新增工具、技能、通道、模型提供者、語音、即時
    語音、媒體產生、網路搜尋、網路擷取、掛鉤和其他執行時
    功能。當功能包含程式碼、認證資訊、
    生命週期掛鉤、資訊清單中繼資料或可安裝套件時，請使用外掛程式。現有的
    外掛程式可以從 ClawHub、npm、git、本機目錄或
    封存檔安裝。

    [安裝和設定外掛程式](/zh-Hant/tools/plugin) | [建置外掛程式](/zh-Hant/plugins/building-plugins) | [外掛程式 SDK](/zh-Hant/plugins/sdk-overview)

  </Step>
</Steps>

## 內建工具類別

下表列出了具代表性的工具，以便您識別該介面。它並
非完整的政策參考。如需確切的群組、預設值和允許/拒絕
語意，請使用 [工具和自訂提供者](/zh-Hant/gateway/config-tools)。

| 類別               | 當代理需要時使用...                                    | 代表性工具                                                           | 閱讀下一步                                                                                           |
| ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Runtime            | 執行指令、管理程序，或使用供應商支援的 Python 分析     | `exec`, `process`, `code_execution`                                  | [Exec](/zh-Hant/tools/exec)、[Code execution](/zh-Hant/tools/code-execution)                                   |
| 檔案               | 讀取和變更工作區檔案                                   | `read`, `write`, `edit`, `apply_patch`                               | [Apply patch](/zh-Hant/tools/apply-patch)                                                                 |
| Web                | 搜尋網路、搜尋 X 帖文，或取得可讀取的頁面內容          | `web_search`, `x_search`, `web_fetch`                                | [Web tools](/zh-Hant/tools/web)、[Web fetch](/zh-Hant/tools/web-fetch)                                         |
| 瀏覽器             | 操作瀏覽器工作階段                                     | `browser`                                                            | [Browser](/zh-Hant/tools/browser)                                                                         |
| 訊息傳遞與頻道     | 傳送回覆或頻道動作                                     | `message`                                                            | [Agent send](/zh-Hant/tools/agent-send)                                                                   |
| 工作階段與代理程式 | 檢查工作階段、委派工作、引導另一個執行，或回報狀態     | `sessions_*`、`subagents`、`agents_list`、`session_status`、`goal`   | [Goal](/zh-Hant/tools/goal)、[Sub-agents](/zh-Hant/tools/subagents)、[Session tool](/zh-Hant/concepts/session-tool) |
| 自動化             | 排程工作或回應背景事件                                 | `cron`、`heartbeat_respond`                                          | [Automation](/zh-Hant/automation)                                                                         |
| 閘道與節點         | 檢查閘道狀態或已配對的目標裝置                         | `gateway`、`nodes`                                                   | [Gateway configuration](/zh-Hant/gateway/configuration)、[Nodes](/zh-Hant/nodes)                               |
| 媒體               | 分析、產生或說出媒體內容                               | `image`、`image_generate`、`music_generate`、`video_generate`、`tts` | [Media overview](/zh-Hant/tools/media-overview)                                                           |
| 大型 OpenClaw 目錄 | 搜尋並呼叫許多符合資格的工具，無需將每個架構傳送至模型 | `tool_search_code`、`tool_search`、`tool_describe`                   | [Tool Search](/zh-Hant/tools/tool-search)                                                                 |

<Note>Tool Search 是實驗性的 OpenClaw agent surface。Codex harness 執行會使用 Codex-native code mode、native tool search、deferred dynamic tools 和 nested tool calls，而不是 `tools.toolSearch`。</Note>

## 外掛程式提供的工具

外掛程式可以註冊額外的工具。外掛程式作者透過 `api.registerTool(...)` 和清單的 `contracts.tools` 連接工具；請使用 [Plugin SDK](/zh-Hant/plugins/sdk-overview) 和 [Plugin manifest](/zh-Hant/plugins/manifest) 查看合約詳細資訊。

常見的外掛程式提供的工具包括：

- [Diffs](/zh-Hant/tools/diffs) 用於呈現檔案和 markdown 差異
- [LLM Task](/zh-Hant/tools/llm-task) 用於僅限 JSON 的工作流程步驟
- [Lobster](/zh-Hant/tools/lobster) 用於具有可恢復核准功能的類型化工作流程
- [Tokenjuice](/zh-Hant/tools/tokenjuice) 用於壓縮嘈雜的 `exec` 和 `bash` 工具輸出
- [Tool Search](/zh-Hant/tools/tool-search) 用於探索和呼叫大型工具目錄，而無需將每個架構放入提示中
- [Canvas](/zh-Hant/plugins/reference/canvas) 用於節點 Canvas 控制和 A2UI 呈現

## 設定存取和核准

工具政策會在模型呼叫之前執行。如果政策移除了某個工具，模型在該輪次中將不會收到該工具的架構。由於全域設定、每個代理程式的設定、管道政策、提供者限制、沙箱規則、管道/執行時期政策或外掛程式的可用性，執行可能會失去工具。

- [Tools and custom providers](/zh-Hant/gateway/config-tools) 說明工具設定檔、允許/拒絕清單、供應商特定限制、迴圈偵測，以及供應商支援的工具設定。
- [Exec approvals](/zh-Hant/tools/exec-approvals) 說明主機命令核准原則。
- [Elevated exec](/zh-Hant/tools/elevated) 說明在沙箱外執行的受控執行。
- [Sandbox vs tool policy vs elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 說明哪個層級控制檔案和程序存取。
- [Per-agent sandbox and tool restrictions](/zh-Hant/tools/multi-agent-sandbox-tools)
  記錄了代理執行特定於代理的限制。

## 擴充功能

根據您需要 OpenClaw 執行的工作來選擇擴充路徑：

- 使用 [Plugins](/zh-Hant/tools/plugin) 安裝或管理現有外掛程式。
- 使用
  [Build plugins](/zh-Hant/plugins/building-plugins) 建置新的整合、提供者、通道、工具或掛鉤。
- 使用 [Skills](/zh-Hant/tools/skills) 和
  [Creating skills](/zh-Hant/tools/creating-skills) 新增或調整可重複使用的代理指令。
- 當您需要實作合約時，請使用 [Plugin SDK](/zh-Hant/plugins/sdk-overview) 和 [Plugin manifest](/zh-Hant/plugins/manifest)。

## 疑難排解遺失的工具

如果模型無法看到或呼叫工具，請從目前輪次的有效原則開始：

1. 在
   [Tools and custom providers](/zh-Hant/gateway/config-tools) 中檢查啟用的設定檔、`tools.allow` 和 `tools.deny`。
2. 在
   [Tools and custom providers](/zh-Hant/gateway/config-tools) 中檢查特定提供者的限制，並確認選取的
   [model provider](/zh-Hant/concepts/model-providers) 支援該工具形狀。
3. 使用
   [Sandbox vs tool policy vs elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 和 [Elevated exec](/zh-Hant/tools/elevated) 檢查通道權限、沙箱狀態和提升存取權。
4. 在
   [Plugins](/zh-Hant/tools/plugin) 中檢查擁有此外掛程式是否已安裝並啟用。
5. 對於代理執行，請在
   [Per-agent sandbox and tool restrictions](/zh-Hant/tools/multi-agent-sandbox-tools) 中檢查特定代理的限制。
6. 對於大型 OpenClaw 目錄，請確認執行是使用直接工具公開還是
   [Tool Search](/zh-Hant/tools/tool-search)。

## 相關

- [Automation](/zh-Hant/automation) 用於 cron、工作、心跳、承諾、掛鉤、常駐訂單和工作流程
- [Agents](/zh-Hant/concepts/agent) 用於代理模型、工作階段、記憶體和多代理協調
- [Tools and custom providers](/zh-Hant/gateway/config-tools) 用於標準工具政策參考
- [Plugins](/zh-Hant/tools/plugin) 用於外掛程式安裝和管理
- [Plugin SDK](/zh-Hant/plugins/sdk-overview) 用於外掛程式作者參考
- [Skills](/zh-Hant/tools/skills) 用於技能載入順序、閘道和設定
- [技能研習坊](/zh-Hant/tools/skill-workshop) 用於生成和審閱技能建立
- [工具搜尋](/zh-Hant/tools/tool-search) 用於精簡的 OpenClaw 工具目錄探索
