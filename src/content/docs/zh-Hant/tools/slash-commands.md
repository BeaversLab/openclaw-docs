---
summary: "Slash 指令：文字與原生、設定及支援的指令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash commands"
sidebarTitle: "Slash commands"
---

指令由 Gateway 處理。大多數指令必須作為以 `/` 開頭的**獨立**訊息發送。僅限主機的 bash 聊天指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

當對話或執行緒綁定到 ACP 工作階段時，正常的後續文字會路由至該 ACP 接線程式。Gateway 管理指令仍保持在本機：`/acp ...` 總是到達 OpenClaw ACP 指令處理程序，而只要該表面啟用了指令處理，`/status` 和 `/unfocus` 就會保持在本機。

有兩個相關的系統：

<AccordionGroup>
  <Accordion title="Commands">
    獨立的 `/...` 訊息。
  </Accordion>
  <Accordion title="Directives">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。

    - 指示詞會在模型看到訊息之前從訊息中移除。
    - 在一般聊天訊息中（非僅指示詞），它們被視為「內嵌提示」，並**不會**持續保存工作階段設定。
    - 在僅指示詞訊息中（訊息僅包含指示詞），它們會持續保存到工作階段並回覆確認。
    - 指示詞僅套用於**經授權的發送者**。如果設定了 `commands.allowFrom`，它是唯一使用的允許清單；否則授權來自頻道允許清單/配對加上 `commands.useAccessGroups`。未經授權的發送者會看到指示詞被視為純文字。

  </Accordion>
  <Accordion title="Inline shortcuts">
    僅限允許清單/已授權的發送者：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。

    它們會立即執行，並在模型看到訊息前被移除，剩餘的文字則會繼續正常流程。

  </Accordion>
</AccordionGroup>

## 設定

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: true,
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw",
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<ParamField path="commands.text" type="boolean" default="true">
  啟用對聊天訊息中 `/...` 的解析。在不支援原生指令的介面（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams）上，即使將此項設為 `false`，文字指令仍然有效。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  註冊原生指令。自動：Discord/Telegram 為開啟；Slack 為關閉（直到您新增斜線指令）；對於不支援原生的供應商則忽略。設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆寫各供應商的設定（布林值或 `"auto"`）。`false` 會在啟動時清除 Discord/Telegram 上先前註冊的指令。Slack 指令是在 Slack 應用程式中管理的，不會自動移除。
</ParamField>
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  在支援的情況下原生註冊 **skill** 指令。自動：Discord/Telegram 為開啟；Slack 為關閉（Slack 需要為每個技能建立一個斜線指令）。設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆寫各供應商的設定（布林值或 `"auto"`）。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  啟用 `! <cmd>` 以執行主機 shell 指令（`/bash <cmd>` 是別名；需要 `tools.elevated` 允許清單）。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切換到背景模式之前等待的時間（`0` 會立即進入背景）。
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  啟用 `/config`（讀取/寫入 `openclaw.json`）。
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  啟用 `/mcp`（讀取/寫入位於 `mcp.servers` 下的 OpenClaw 管理的 MCP 設定）。
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  啟用 `/plugins`（外掛程式探索/狀態以及安裝 + 啟用/停用控制）。
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  啟用 `/debug`（僅限執行階段的覆寫）。
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  啟用 `/restart` 以及閘道重啟工具動作。
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  設定僅限擁有者指令/工具介面的明確擁有者允許清單。與 `commands.allowFrom` 分開。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每頻道：使僅限擁有者的指令需要 **擁有者身分** 才能在該介面上執行。當設為 `true` 時，傳送者必須符合已解析的擁有者候選者（例如 `commands.ownerAllowFrom` 中的項目或供應商原生的擁有者元資料），或在內部訊息頻道上擁有內部 `operator.admin` 範圍。頻道 `allowFrom` 中的萬用字元項目，或空白/未解析的擁有者候選者清單，是 **不** 足夠的 —— 僅限擁有者的指令會在該頻道上封閉式地失敗。如果您希望僅限擁有者的指令僅由 `ownerAllowFrom` 和標準指令允許清單限制，請將此設定保持關閉。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制擁有者 ID 在系統提示詞中的顯示方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  選擇性地設定使用 `commands.ownerDisplay="hash"` 時使用的 HMAC 密鑰。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  指令授權的每供應商允許清單。當設定後，它是指令和指令的唯一授權來源（頻道允許清單/配對以及 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定供應商的金鑰會覆寫它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  當未設定 `commands.allowFrom` 時，強制執行指令的允許清單/原則。
</ParamField>

## 命令列表

當前權威來源：

- 核心內置命令來自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 Dock 命令來自 `src/auto-reply/commands-registry.data.ts`
- 插件命令來自插件 `registerCommand()` 調用
- 您的 Gateway 上實際可用的命令仍取決於配置標誌、頻道介面以及已安裝/已啟用的插件

### 核心內置命令

<AccordionGroup>
  <Accordion title="Sessions and runs">
    - `/new [model]` 啟動新會話；`/reset` 是重置別名。
    - `/reset soft [message]` 保留當前記錄，丟棄復用的 CLI 後端會話 ID，並就地重新運行啟動/系統提示加載。
    - `/compact [instructions]` 壓縮會話上下文。參見 [壓縮](/zh-Hant/concepts/compaction)。
    - `/stop` 中止當前運行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理線程綁定過期。
    - `/export-session [path]` 將當前會話匯出為 HTML。別名：`/export`。
    - `/export-trajectory [path]` 將當前會話匯出為 JSONL [軌跡包](/zh-Hant/tools/trajectory)。別名：`/trajectory`。
  </Accordion>
  <Accordion title="模型與執行控制">
    - `/think <level>` 設定思考層級。選項來自目前模型的提供商設定檔；常見層級為 `off`、`minimal`、`low`、`medium` 和 `high`，僅在支援的情況下支援自訂層級，如 `xhigh`、`adaptive`、`max` 或二元 `on`。別名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切換詳細輸出。別名：`/v`。
    - `/trace on|off` 切換目前工作階段的外掛程式追蹤輸出。
    - `/fast [status|on|off]` 顯示或設定快速模式。
    - `/reasoning [on|off|stream]` 切換推理可見性。別名：`/reason`。
    - `/elevated [on|off|ask|full]` 切換提升模式。別名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 顯示或設定執行預設值。
    - `/model [name|#|status]` 顯示或設定模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出提供商或提供商的模型。
    - `/queue <mode>` 管理佇列行為 (`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`) 以及諸如 `debounce:2s cap:25 drop:summarize` 的選項。
  </Accordion>
  <Accordion title="探索與狀態">
    - `/help` 顯示簡短的說明摘要。
    - `/commands` 顯示產生的指令目錄。
    - `/tools [compact|verbose]` 顯示目前代理程式現在可使用的項目。
    - `/status` 顯示執行/執行階段狀態，包括 `Execution`/`Runtime` 標籤與提供者使用量/配額（若有提供）。
    - `/crestodian <request>` 從擁有者 DM 執行 Crestodian 設定與修復輔助程式。
    - `/tasks` 列出目前使用中/最近的背景工作。
    - `/context [list|detail|json]` 說明如何組合語境。
    - `/whoami` 顯示你的寄件者 ID。別名：`/id`。
    - `/usage off|tokens|full|cost` 控制各項回應的使用頁尾或列印本機成本摘要。
  </Accordion>
  <Accordion title="技能、允許清單、核准">
    - `/skill <name> [input]` 依名稱執行技能。
    - `/allowlist [list|add|remove] ...` 管理允許清單項目。僅限純文字。
    - `/approve <id> <decision>` 解決執行核准提示。
    - `/btw <question>` 提出側面問題而不改變未來的會話語境。參閱 [BTW](/zh-Hant/tools/btw)。
  </Accordion>
  <Accordion title="子代理程式與 ACP">
    - `/subagents list|kill|log|info|send|steer|spawn` 管理目前會話的子代理程式執行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 會話與執行階段選項。
    - `/focus <target>` 將目前的 Discord 執行緒或 Telegram 主題/對話綁定至會話目標。
    - `/unfocus` 移除目前的綁定。
    - `/agents` 列出目前會話的執行緒綁定代理程式。
    - `/kill <id|#|all>` 中止一個或所有正在執行的子代理程式。
    - `/steer <id|#> <message>` 傳送引導訊號至正在執行的子代理程式。別名：`/tell`。
  </Accordion>
  <Accordion title="僅限擁有者的寫入和管理員">
    - `/config show|get|set|unset` 讀取或寫入 `openclaw.json`。僅限擁有者。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 讀取或寫入 OpenClaw 管理的 MCP 伺服器設定，位置於 `mcp.servers`。僅限擁有者。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 檢查或修改插件狀態。`/plugin` 是別名。寫入操作僅限擁有者。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理僅限執行時的設定覆寫。僅限擁有者。需要 `commands.debug: true`。
    - `/restart` 在啟用時重新啟動 OpenClaw。預設：啟用；設定 `commands.restart: false` 以停用它。
    - `/send on|off|inherit` 設定發送原則。僅限擁有者。
  </Accordion>
  <Accordion title="語音、TTS、頻道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。參見 [TTS](/zh-Hant/tools/tts)。
    - `/activation mention|always` 設定群組啟用模式。
    - `/bash <command>` 執行主機 shell 指令。僅文字。別名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允許清單。
    - `!poll [sessionId]` 檢查背景 bash 任務。
    - `!stop [sessionId]` 停止背景 bash 任務。
  </Accordion>
</AccordionGroup>

### 生成的 Dock 指令

Dock 指令是由支援原生指令的頻道插件生成的。目前內建的套組：

- `/dock-discord` (別名： `/dock_discord`)
- `/dock-mattermost` (別名： `/dock_mattermost`)
- `/dock-slack` (別名： `/dock_slack`)
- `/dock-telegram` (別名： `/dock_telegram`)

### 內建的插件指令

內建插件可以新增更多斜線指令。此儲存庫中目前的內建指令：

- `/dreaming [on|off|status|help]` 切換記憶夢境。參見 [Dreaming](/zh-Hant/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理裝置配對/設定流程。請參閱 [配對](/zh-Hant/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 臨時啟用高風險的電話節點指令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 語音設定。在 Discord 上，原生指令名稱為 `/talkvoice`。
- `/card ...` 發送 LINE 豐富卡片預設集。請參閱 [LINE](/zh-Hant/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 檢查並控制內建的 Codex app-server 響應程式。請參閱 [Codex harness](/zh-Hant/plugins/codex-harness)。
- 僅限 QQBot 的指令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 動態技能指令

使用者可呼叫的技能也會以斜線指令的形式公開：

- `/skill <name> [input]` 始終作為通用入口點運作。
- 當技能/外掛程式註冊時，技能也可能會以直接指令（如 `/prose`）的形式出現。
- 原生技能指令註冊由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

<AccordionGroup>
  <Accordion title="Argument and parser notes">
    - 指令接受指令與參數之間的一個可選 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊匹配）；如果沒有匹配，文字會被視為訊息內容。
    - 如需完整的提供者使用細分，請使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true` 並且遵守頻道 `configWrites`。
    - 在多帳號頻道中，以設定為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
    - `/usage` 控制每次回應的使用頁尾；`/usage cost` 會從 OpenClaw 會議記錄列印本機成本摘要。
    - `/restart` 預設為啟用；設定 `commands.restart: false` 以停用它。
    - `/plugins install <spec>` 接受與 `openclaw plugins install` 相同的外掛程式規格：本機路徑/封存檔、npm 套件或 `clawhub:<pkg>`。
    - `/plugins enable|disable` 會更新外掛程式設定，並可能提示重新啟動。
  </Accordion>
  <Accordion title="Channel-specific behavior">
    - Discord 僅限的原生指令：`/vc join|leave|status` 控制語音頻道（無法作為文字使用）。`join` 需要伺服器（guild）和選定的語音/舞台頻道。需要 `channels.discord.voice` 和原生指令。
    - Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 指令參考和執行時期行為：[ACP agents](/zh-Hant/tools/acp-agents)。
  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` 是為了除錯和額外的可見性而設計的；在正常使用中請保持**關閉**。
    - `/trace` 比 `/verbose` 更狹窄：它僅顯示外掛擁有的追蹤/除錯行，並保持正常的詳細工具閒談關閉。
    - `/fast on|off` 會保存工作階段覆寫。使用 Sessions UI 的 `inherit` 選項來清除它並回退至預設設定。
    - `/fast` 是特定於提供者的：OpenAI/OpenAI Codex 在原生的 Responses 端點上將其對應到 `service_tier=priority`，而直接公開的 Anthropic 請求（包括傳送到 `api.anthropic.com` 的 OAuth 驗證流量）則將其對應到 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Anthropic](/zh-Hant/providers/anthropic)。
    - 工具失敗摘要仍會在相關時顯示，但詳細的失敗文字僅在 `/verbose` 為 `on` 或 `full` 時才會包含。
    - `/reasoning`、`/verbose` 和 `/trace` 在群組設定中具有風險：它們可能會揭露您不打算暴露的內部推理、工具輸出或外掛診斷資訊。建議保持關閉，尤其是在群組聊天中。
  </Accordion>
  <Accordion title="Model switching">
    - `/model` 會立即儲存新的工作階段模型。
    - 如果代理程式處於閒置狀態，下一次執行會立即使用它。
    - 如果執行已經進行中，OpenClaw 會將即時切換標記為待處理，並且僅在乾淨的重試點重新啟動至新模型。
    - 如果工具活動或回覆輸出已經開始，待處理的切換可以保持佇列，直到稍後的重試機會或下一個使用者輪次。
    - 在本機 TUI 中，`/crestodian [request]` 會從正常的代理程式 TUI 返回到 Crestodian。這與訊息通道救援模式分開，並且不授予遠端設定權限。
  </Accordion>
  <Accordion title="快速路徑和內聯捷徑">
    - **快速路徑：** 來自允許列表發送者的僅命令訊息會被立即處理（繞過佇列 + 模型）。
    - **群組提及閘門：** 來自允許列表發送者的僅命令訊息會繞過提及要求。
    - **內聯捷徑（僅限允許列表發送者）：** 某些命令在嵌入到普通訊息中時也能生效，並且會在模型看到剩餘文字之前被剝離。
      - 範例：`hey /status` 觸發狀態回覆，而剩餘的文字繼續正常流程。
    - 目前：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
    - 未授權的僅命令訊息會被無聲忽略，而內聯 `/...` token 會被視為純文字。
  </Accordion>
  <Accordion title="技能指令和原生引數">
    - **技能指令：** `user-invocable` 技能會以斜線指令形式公開。名稱會被清理為 `a-z0-9_`（最多 32 個字元）；衝突會加上數字後綴（例如 `_2`）。
      - `/skill <name> [input]` 透過名稱執行技能（當原生指令限制阻止每個技能指令時很有用）。
      - 預設情況下，技能指令會作為普通請求轉發給模型。
      - 技能可以選擇性地宣告 `command-dispatch: tool` 以將指令直接路由到工具（確定性，無模型）。
      - 範例：`/prose`（OpenProse 外掛） — 請參閱 [OpenProse](/zh-Hant/prose)。
    - **原生指令引數：** Discord 對動態選項使用自動完成（當您省略必要引數時使用按鈕選單）。當指令支援選項並且您省略該引數時，Telegram 和 Slack 會顯示按鈕選單。動態選項會根據目標會話模型解析，因此特定模型的選項（例如 `/think` 級別）會遵循該會話的 `/model` 覆蓋。
  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答的是執行時問題，而非配置問題：**該 Agent 在此對話中當前可使用的內容**。

- 預設的 `/tools` 為精簡格式，並已針對快速瀏覽進行最佳化。
- `/tools verbose` 會加入簡短描述。
- 支援參數的原生命令介面會顯示與 `compact|verbose` 相同的模式切換開關。
- 結果是以 Session 為範圍的，因此變更 Agent、頻道、主題、傳送者授權或模型都可能會改變輸出結果。
- `/tools` 包含在執行時實際可存取的工具，包括核心工具、已連接的外掛工具以及頻道擁有的工具。

若要進行設定檔和覆寫編輯，請使用 Control UI 的 Tools 面板或配置/目錄介面，而不要將 `/tools` 視為靜態目錄。

## 使用介面（內容顯示位置）

- **提供者使用量/配額**（例如：「Claude 剩餘 80%」）會在啟用量追蹤時，顯示於當前模型提供者的 `/status` 中。OpenClaw 會將提供者視窗標準化為 `% left`；對於 MiniMax，僅剩餘百分比欄位會在顯示前進行反轉，而 `model_remains` 的回應則會優先採用聊天模型條目加上帶有模型標籤的方案標籤。
- 當即時 Session 快照資料稀少時，`/status` 中的 **Token/快取行** 可以退回至最新的逐字稿使用量條目。既有的非零即時數值仍會優先採用，且逐字稿退回機制也能在儲存的總數缺失或較小時，復原活躍的執行時模型標籤以及較大的提示導向總數。
- **執行 vs 執行時：** `/status` 會回報有效沙箱路徑的 `Execution` 以及實際執行 Session 的 `Runtime`：`OpenClaw Pi Default`、`OpenAI Codex`、CLI 後端或 ACP 後端。
- **每次回應的 Token/成本** 是由 `/usage off|tokens|full` 控制的（附加於一般回應後）。
- `/model status` 是關於 **模型/驗證/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 是以指令的方式實作。

範例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

備註：

- `/model` 和 `/model list` 會顯示一個簡潔的帶號碼選擇器（模型系列 + 可用供應商）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，包含供應商和模型下拉選單以及提交步驟。
- `/model <#>` 會從該選擇器中進行選擇（並在可能時優先使用目前的供應商）。
- `/model status` 會顯示詳細資訊檢視，包括設定的供應商端點 (`baseUrl`) 和 API 模式 (`api`)（如果有）。

## 偵錯覆蓋

`/debug` 讓您設定 **僅限執行時期** 的配置覆蓋（記憶體，非磁碟）。僅限擁有者。預設為停用；使用 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>覆蓋設定會立即套用於新的配置讀取，但**不會**寫入 `openclaw.json`。使用 `/debug reset` 清除所有覆蓋設定並返回磁碟上的配置。</Note>

## 外掛程式追蹤輸出

`/trace` 讓您切換 **範圍僅限工作階段的外掛程式追蹤/偵錯行**，而無需開啟完整詳細模式。

範例：

```text
/trace
/trace on
/trace off
```

備註：

- `/trace` 不帶參數時會顯示目前工作階段的追蹤狀態。
- `/trace on` 會為目前的工作階段啟用外掛程式追蹤行。
- `/trace off` 會再次將其停用。
- 外掛程式追蹤行可以出現在 `/status` 中，以及作為正常助手回覆後的後續診斷訊息。
- `/trace` 不會取代 `/debug`；`/debug` 仍然管理僅限執行時期的配置覆蓋。
- `/trace` 不會取代 `/verbose`；正常的詳細工具/狀態輸出仍然屬於 `/verbose`。

## 配置更新

`/config` 會寫入您的磁碟配置 (`openclaw.json`)。僅限擁有者。預設為停用；使用 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

<Note>組態會在寫入前進行驗證；無效的變更會被拒絕。`/config` 更新會在重新啟動後持續生效。</Note>

## MCP 更新

`/mcp` 會將 OpenClaw 管理的 MCP 伺服器定義寫入 `mcp.servers` 下。僅限擁有者。預設停用；可透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` 將組態儲存在 OpenClaw 組態中，而非 Pi 擁有的專案設定中。執行時適配器決定哪些傳輸實際上可執行。</Note>

## 外掛程式更新

`/plugins` 允許操作員檢查發現的外掛程式並切換組態中的啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；可透過 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>- `/plugins list` 和 `/plugins show` 會對當前工作區加上磁碟上的組態使用真實的外掛程式探索。 - `/plugins enable|disable` 僅更新外掛程式組態；它不會安裝或解除安裝外掛程式。 - 在進行啟用/停用變更後，請重新啟動閘道以套用它們。</Note>

## 介面說明

<AccordionGroup>
  <Accordion title="各介面的工作階段">
    - **文字指令** 在一般聊天工作階段中執行（DM 共用 `main`，群組有自己的工作階段）。
    - **原生指令** 使用獨立的工作階段：
      - Discord：`agent:<agentId>:discord:slash:<userId>`
      - Slack：`agent:<agentId>:slack:slash:<userId>`（前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定）
      - Telegram：`telegram:slash:<userId>`（透過 `CommandTargetSessionKey` 以聊天工作階段為目標）
    - **`/stop`** 以活躍的聊天工作階段為目標，因此可以中止當前的執行。
  </Accordion>
  <Accordion title="Slack 特定細節">
    針對單一 `/openclaw` 風格指令，仍然支援 `channels.slack.slashCommand`。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 指令（名稱與 `/help` 相同）。Slack 的指令參數選單會以暫時性 Block Kit 按鈕的形式呈現。

    Slack 原生例外：註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

  </Accordion>
</AccordionGroup>

## BTW 附帶提問

`/btw` 是關於目前會話的快速**附帶提問**。

與一般聊天不同的是：

- 它會使用目前會話作為背景內容，
- 它會以單獨的**無工具**一次性呼叫方式執行，
- 它不會改變未來的會語內容，
- 它不會寫入逐字稿歷史，
- 它會即時呈現為側邊結果，而非一般的助手訊息。

這使得 `/btw` 在您希望主要任務繼續進行的同時獲得暫時性澄清時非常有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW 附帶提問](/zh-Hant/tools/btw) 以了解完整行為與客戶端 UX 細節。

## 相關

- [建立技能](/zh-Hant/tools/creating-skills)
- [技能](/zh-Hant/tools/skills)
- [技能設定](/zh-Hant/tools/skills-config)
