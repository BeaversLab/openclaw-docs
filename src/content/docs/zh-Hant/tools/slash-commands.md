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
  啟用聊天訊息中的 `/...` 解析。在不支援原生指令的介面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使將此設為 `false`，文字指令仍然有效。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  註冊原生指令。自動：Discord/Telegram 為開啟；Slack 為關閉（直到您新增斜線指令）；對於不支援原生的提供者則忽略。設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以針對每個提供者進行覆寫（布林值或 `"auto"`）。在 Discord 上，`false` 會在啟動期間跳過斜線指令註冊和清理；先前註冊的指令可能會保持可見，直到您從 Discord 應用程式中將其移除。Slack 指令是在 Slack 應用程式中管理的，不會自動移除。
</ParamField>
在 Discord 上，原生指令規格可能包含 `descriptionLocalizations`，OpenClaw 會將其發布為 Discord `description_localizations` 並包含在對比比較中。
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  當支援時，以原生方式註冊 **skill** 指令。自動：Discord/Telegram 為開啟；Slack 為關閉（Slack 需要為每個技能建立一個斜線指令）。設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以針對每個提供者進行覆寫（布林值或 `"auto"`）。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  啟用 `! <cmd>` 以執行主機 shell 指令（`/bash <cmd>` 為別名；需要 `tools.elevated` 允許清單）。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切換到背景模式之前等待的時間（`0` 立即進入背景）。
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  啟用 `/config`（讀取/寫入 `openclaw.json`）。
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  啟用 `/mcp`（讀取/寫入 OpenClaw 管理的 MCP 配置，位於 `mcp.servers` 下）。
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  啟用 `/plugins`（外掛程式探索/狀態以及安裝 + 啟用/停用控制）。
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  啟用 `/debug`（僅限執行時期的覆寫）。
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  啟用 `/restart` 以及閘道重新啟動工具動作。
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  為僅限擁有者的指令/工具介面設定明確的擁有者允許清單。這是可以批准危險動作並執行指令（例如 `/diagnostics`、`/export-trajectory` 和 `/config`）的人工操作員帳戶。它與 `commands.allowFrom` 以及 DM 配對存取分開。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每個頻道：使僅限擁有者的指令需要在該介面上具有 **擁有者身分** 才能執行。當 `true` 時，發送者必須符合已解析的擁有者候選者（例如 `commands.ownerAllowFrom` 中的條目或提供者原生的擁有者元資料），或在內部訊息頻道上持有內部 `operator.admin` 範圍。頻道 `allowFrom` 中的萬用字元條目，或空的/未解析的擁有者候選者清單，是**不**足夠的 —— 僅限擁有者的指令將在該頻道上以「封閉失敗」的方式處理。如果您希望僅限擁有者的指令僅由 `ownerAllowFrom` 和標準指令允許清單進行閘道控制，請將此保持關閉。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制擁有者 ID 在系統提示詞中的顯示方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  選擇性地設定使用 `commands.ownerDisplay="hash"` 時所使用的 HMAC 密鑰。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  針對指令授權的每個提供者允許清單。當已設定時，它是指令和指示的唯一授權來源（頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定於提供者的金鑰會覆寫它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  當未設定 `commands.allowFrom` 時，對指令執行允許清單/原則。
</ParamField>

## 命令列表

當前權威來源：

- 核心內建指令來自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 Dock 指令來自 `src/auto-reply/commands-registry.data.ts`
- 外掛指令來自外掛 `registerCommand()` 呼叫
- 您的 Gateway 上實際可用的命令仍取決於配置標誌、頻道介面以及已安裝/已啟用的插件

### 核心內置命令

<AccordionGroup>
  <Accordion title="Sessions and runs">
    - `/new [model]` 啟動一個新會話；`/reset` 是重設的別名。
    - 控制介面會攔截輸入的 `/new` 以建立並切換到一個全新的儀表板會話，除非 `session.dmScope: "main"` 已配置且目前的父級是代理程式的主會話；在這種情況下，`/new` 會原地重設主會話。輸入 `/reset` 仍會執行 Gateway 的原地重設。
    - `/reset soft [message]` 保留目前的對話記錄，捨棄重複使用的 CLI 後端會話 ID，並原地重新執行啟動/系統提示載入。
    - `/compact [instructions]` 壓縮會話內容。參見 [壓縮](/zh-Hant/concepts/compaction)。
    - `/stop` 中止目前的執行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理執行緒綁定的過期時間。
    - `/export-session [path]` 將目前會話匯出為 HTML。別名：`/export`。
    - `/export-trajectory [path]` 請求執行核准，然後匯出目前會話的 JSONL [軌跡套件](/zh-Hant/tools/trajectory)。當您需要某個 OpenClaw 會話的提示、工具和對話記錄時間軸時使用。在群組聊天中，核准提示和匯出結果會私下傳送給擁有者。別名：`/trajectory`。

  </Accordion>
  <Accordion title="Model and run controls">
    - `/think <level|default>` 設定思考層級或清除會話覆寫。選項來自使用中模型的提供者設定檔；常見層級有 `off`、`minimal`、`low`、`medium` 和 `high`，並僅在支援時提供自訂層級，例如 `xhigh`、`adaptive`、`max` 或二進位 `on`。別名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切換詳細輸出。別名：`/v`。
    - `/trace on|off` 切換目前會話的外掛追蹤輸出。
    - `/fast [status|on|off|default]` 顯示、設定或清除快速模式。
    - `/reasoning [on|off|stream]` 切換推理可見性。別名：`/reason`。
    - `/elevated [on|off|ask|full]` 切換提升模式。別名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 顯示或設定執行預設值。
    - `/model [name|#|status]` 顯示或設定模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出已設定/已驗證可用的提供者或提供者的模型；新增 `all` 以瀏覽該提供者的完整目錄。`agents.defaults.models` 中的 `provider/*` 條目會讓 `/model` 和 `/models` 僅顯示這些提供者的已探索模型。
    - `/queue <mode>` 管理佇列行為 (`steer`、舊版 `queue`、`followup`、`collect`、`steer-backlog`、`interrupt`) 以及諸如 `debounce:0.5s cap:25 drop:summarize` 的選項；`/queue default` 或 `/queue reset` 清除會話覆寫。請參閱 [命令佇列](/zh-Hant/concepts/queue) 和 [導向佇列](/zh-Hant/concepts/queue-steering)。
    - `/steer <message>` 將引導注入目前會話的使用中執行，獨立於 `/queue` 模式。當會話閒置時，它不會啟動新的執行。別名：`/tell`。請參閱 [導向](/zh-Hant/tools/steer)。

  </Accordion>
  <Accordion title="探索與狀態">
    - `/help` 顯示簡短說明摘要。
    - `/commands` 顯示產生的指令目錄。
    - `/tools [compact|verbose]` 顯示目前代理程式現在可以使用什麼。
    - `/status` 顯示執行/執行階段狀態、Gateway 和系統執行時間，以及可用的供應商使用量/配額。
    - `/diagnostics [note]` 是僅限擁有者使用的支援報告流程，用於 Gateway 錯誤和 Codex 駕馭執行。它會在執行 `openclaw gateway diagnostics export --json` 之前每次都要求明確的執行核准；請不要使用「允許全部」規則來核准診斷。核准後，它會發送一份可貼上的報告，其中包含本地套件路徑、清單摘要、隱私權說明和相關的工作階段 ID。在群組聊天中，核准提示和報告會私下傳送給擁有者。當作用中的工作階段使用 OpenAI Codex 駕馭時，相同的核准也會將相關的 Codex 反饋傳送至 OpenAI 伺服器，而完成的回覆會列出 OpenClaw 工作階段 ID、Codex 執行緒 ID 和 `codex resume <thread-id>` 指令。請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。
    - `/crestodian <request>` 從擁有者的 DM 執行 Crestodian 設定和修復助手。
    - `/tasks` 列出目前工作階段的作用中/最近背景工作。
    - `/context [list|detail|json]` 說明如何組合內容。
    - `/whoami` 顯示您的傳送者 ID。別名：`/id`。
    - `/usage off|tokens|full|cost` 控制每次回應的使用量頁尾，或列印本機成本摘要。

  </Accordion>
  <Accordion title="技能、允許清單、核准">
    - `/skill <name> [input]` 依名稱執行技能。
    - `/allowlist [list|add|remove] ...` 管理允許清單項目。僅限文字。
    - `/approve <id> <decision>` 解決執行核准提示。
    - `/btw <question>` 提出一個側面問題，而不改變未來的工作階段內容。別名：`/side`。請參閱 [BTW](/zh-Hant/tools/btw)。

  </Accordion>
  <Accordion title="子代理和 ACP">
    - `/subagents list|kill|log|info|send|steer|spawn` 管理目前會話的子代理執行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理目前會話的子代理運作。
    - `/focus <target>` 將目前的 Discord 執行緒或 Telegram 主題/對話綁定到會話目標。
    - `/unfocus` 移除目前的綁定。
    - `/agents` 列出目前會話中執行緒綁定的代理。
    - `/kill <id|#|all>` 中止一個或所有正在執行的子代理。
    - `/subagents steer <id|#> <message>` 向正在執行的子代理發送導向。請參閱 [Steer](/zh-Hant/tools/steer)。

  </Accordion>
  <Accordion title="僅限擁有者的寫入和管理">
    - `/config show|get|set|unset` 讀取或寫入 `openclaw.json`。僅限擁有者。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 讀取或寫入 `mcp.servers` 下由 OpenClaw 管理的 MCP 伺服器設定。僅限擁有者。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 檢查或修改外掛狀態。`/plugin` 是一個別名。寫入僅限擁有者。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理僅限執行時的設定覆寫。僅限擁有者。需要 `commands.debug: true`。
    - `/restart` 啟用時重新啟動 OpenClaw。預設：啟用；設定 `commands.restart: false` 以停用它。
    - `/send on|off|inherit` 設定傳送原則。僅限擁有者。

  </Accordion>
  <Accordion title="語音、TTS、頻道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。請參閱 [TTS](/zh-Hant/tools/tts)。
    - `/activation mention|always` 設定群組啟用模式。
    - `/bash <command>` 執行主機 Shell 指令。僅限文字。別名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允許清單。
    - `!poll [sessionId]` 檢查背景 bash 工作。
    - `!stop [sessionId]` 停止背景 bash 工作。

  </Accordion>
</AccordionGroup>

### 生成的 Dock 指令

Dock 指令會將目前階段的回覆路由切換到另一個連結頻道。請參閱 [頻道對接](/zh-Hant/concepts/channel-docking) 以了解設定、範例與疑難排解。

Dock 指令是由支援原生指令的頻道外掛程式所產生。目前內建的集合包括：

- `/dock-discord` (別名：`/dock_discord`)
- `/dock-mattermost` (別名：`/dock_mattermost`)
- `/dock-slack` (別名：`/dock_slack`)
- `/dock-telegram` (別名：`/dock_telegram`)

從直接聊天中使用 Dock 指令，將目前階段的回覆路由切換到另一個連結頻道。代理程式會維持相同的階段內容，但該階段之後的回覆將會傳送到選定的頻道端點。

Dock 指令需要 `session.identityLinks`。來源發送者和目標端點必須位於同一個身分群組中，例如 `["telegram:123", "discord:456"]`。如果 ID 為 `123` 的 Telegram 使用者傳送 `/dock_discord`，OpenClaw 會將 `lastChannel: "discord"` 和 `lastTo: "456"` 儲存在作用中的階段上。如果發送者未連結到 Discord 端點，指令會回覆設定提示，而不是轉交到一般聊天。

停靠僅更改目前的工作階段路由。它不會建立頻道帳戶、授予存取權限、繞過頻道允許清單，或將對話紀錄移至另一個工作階段。請使用 `/dock-telegram`、`/dock-slack`、`/dock-mattermost` 或其他產生的停靠指令再次切換路由。

### 內建外掛指令

內建外掛可以新增更多斜線指令。此儲存庫中目前的內建指令：

- `/dreaming [on|off|status|help]` 切換記憶夢境功能。請參閱 [Dreaming](/zh-Hant/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理裝置配對/設定流程。請參閱 [Pairing](/zh-Hant/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 暫時啟用高風險的手機節點指令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 語音設定。在 Discord 上，原生指令名稱為 `/talkvoice`。
- `/card ...` 發送 LINE 豐富卡片預設集。請參閱 [LINE](/zh-Hant/channels/line)。
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` 檢查並控制內建的 Codex app-server harness。請參閱 [Codex harness](/zh-Hant/plugins/codex-harness)。
- 僅限 QQBot 的指令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 動態技能指令

使用者可呼叫的技能也會以斜線指令形式呈現：

- `/skill <name> [input]` 始終作為通用進入點。
- 當技能/外掛註冊時，技能也可能會以 `/prose` 這類直接指令的形式出現。
- 原生技能指令註冊是由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制的。
- 指令規格可以為支援本地化描述的原生介面（包括 Discord）提供 `descriptionLocalizations`。

<AccordionGroup>
  <Accordion title="引數與解析器備註">
    - 指令接受在指令與引數之間加入一個可選的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；如果沒有相符項目，文字會被視為訊息主體。
    - 如需完整的提供者使用細目，請使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道 `configWrites`。
    - 在多帳號頻道中，以設定為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
    - `/usage` 控制每次回應的使用頁尾；`/usage cost` 會從 OpenClaw 會話記錄列印本地成本摘要。
    - `/restart` 預設為啟用；設定 `commands.restart: false` 可將其停用。
    - `/plugins install <spec>` 接受與 `openclaw plugins install` 相同的外掛規格：本地路徑/封存檔、npm 套件、`git:<repo>` 或 `clawhub:<pkg>`，然後會請求重新啟動 Gateway，因為外掛來源模組已變更。
    - `/plugins enable|disable` 會更新外掛設定並為新的代理回合觸發 Gateway 外掛重新載入。

  </Accordion>
  <Accordion title="特定頻道行為">
    - Discord 專用原生指令：`/vc join|leave|status` 控制語音頻道（不提供文字形式）。`join` 需要一個伺服器並選取語音/舞台頻道。需要 `channels.discord.voice` 和原生指令。
    - Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 指令參考和執行時行為：[ACP agents](/zh-Hant/tools/acp-agents)。

  </Accordion>
  <Accordion title="詳細資訊 / 追蹤 / 快速 / 推理安全">
    - `/verbose` 適用於偵錯和額外的可見性；在正常使用中請保持**關閉**。
    - `/trace` 比 `/verbose` 更狹窄：它僅顯示外掛擁有的追蹤/偵錯行，並保持正常的詳細工具對話關閉。
    - `/fast on|off` 會持續保存工作階段覆寫。使用 Sessions UI 的 `inherit` 選項來清除它並還原為配置預設值。
    - `/fast` 是特定於供應商的：OpenAI/OpenAI Codex 在原生 Responses 端點上將其對應至 `service_tier=priority`，而直接公開的 Anthropic 請求（包括傳送到 `api.anthropic.com` 的 OAuth 驗證流量）則將其對應至 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Anthropic](/zh-Hant/providers/anthropic)。
    - 相關的時候仍會顯示工具失敗摘要，但只有當 `/verbose` 為 `on` 或 `full` 時，才會包含詳細的失敗文字。
    - `/reasoning`、`/verbose` 和 `/trace` 在群組設定中具有風險：它們可能會揭露您不打算暴露的內部推理、工具輸出或外掛診斷資訊。建議保持關閉，特別是在群組聊天中。

  </Accordion>
  <Accordion title="模型切換">
    - `/model` 會立即持續保存新的工作階段模型。
    - 如果代理處於閒置狀態，下次執行會立即使用它。
    - 如果執行已經啟動，OpenClaw 會將即時切換標記為待處理，並且只在乾淨的重試點重新啟動進入新模型。
    - 如果工具活動或回覆輸出已經開始，待處理的切換可以保持排隊，直到稍後的重試機會或下一個使用者輪次。
    - 在本地 TUI 中，`/crestodian [request]` 會從正常的代理 TUI 返回到 Crestodian。這與訊息通道救援模式分開，並不授予遠端配置權限。

  </Accordion>
  <Accordion title="快速路徑與內聯快捷方式">
    - **快速路徑：** 來自白名單發送者的純指令訊息會立即被處理（繞過佇列 + 模型）。
    - **群組提及閘控：** 來自白名單發送者的純指令訊息可繞過提及要求。
    - **內聯快捷方式（僅限白名單發送者）：** 某些指令在嵌入一般訊息時也有效，並且會在模型看到剩餘文字之前被剝離。
      - 範例：`hey /status` 會觸發狀態回覆，而剩餘的文字會繼續透過正常流程處理。
    - 目前支援：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
    - 未授權的純指令訊息會被無聲忽略，而內聯的 `/...` 標記會被視為純文字。

  </Accordion>
  <Accordion title="技能指令與原生參數">
    - **技能指令：** `user-invocable` 技能會以斜線指令的形式公開。名稱會被正規化為 `a-z0-9_`（最多 32 個字元）；名稱衝突會加上數字後綴（例如 `_2`）。
      - `/skill <name> [input]` 會依名稱執行技能（當原生指令限制無法建立個別技能指令時很有用）。
      - 預設情況下，技能指令會作為一般請求轉發給模型。
      - 技能可以選擇宣告 `command-dispatch: tool`，以將指令直接路由至工具（具確定性，不經過模型）。
      - 範例：`/prose` (OpenProse 外掛) — 請參閱 [OpenProse](/zh-Hant/prose)。
    - **原生指令參數：** Discord 會對動態選項使用自動完成功能（當您省略必要參數時會顯示按鈕選單）。當指令支援選項且您省略該參數時，Telegram 和 Slack 會顯示按鈕選單。動態選項會根據目標工作階段模型解析，因此針對模型的特定選項（例如 `/think` 層級）會遵循該工作階段的 `/model` 覆寫設定。

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答的是運行時問題，而非配置問題：**此代理目前在此次對話中可以使用什麼**。

- 預設的 `/tools` 格式緊湊並經過優化，適合快速掃描。
- `/tools verbose` 會加入簡短描述。
- 支援參數的原生命令介面會暴露與 `compact|verbose` 相同的模式切換開關。
- 結果是基於會話範圍的，因此變更代理、頻道、執行緒、發送者授權或模型可能會改變輸出。
- `/tools` 包含在執行時實際可存取的工具，包括核心工具、已連線的外掛工具以及頻道擁有的工具。

若要編輯設定檔或覆蓋值，請使用控制 UI 工具面板或配置/目錄介面，而不是將 `/tools` 視為靜態目錄。

## 使用介面（顯示位置）

- 當啟用使用量追蹤時，**供應商使用量/配額**（例如：「Claude 剩餘 80%」）會顯示在目前模型供應商的 `/status` 中。OpenClaw 會將供應商視窗正規化為 `% left`；對於 MiniMax，僅顯示剩餘百分比欄位會在顯示前反轉，而 `model_remains` 回應會偏好聊天模型條目加上帶有模型標籤的計劃標籤。
- 當即時會話快照稀疏時，`/status` 中的 **Token/快取行** 可以退回到最新的逐字稿使用量條目。現有的非零即時值仍然優先，當儲存的總數遺失或較小時，逐字稿退回機制也可以還原作用中的執行時模型標籤以及較大的以提示為導向的總數。
- **執行與執行時：** `/status` 回報有效沙箱路徑的 `Execution` 以及實際執行會話的主體的 `Runtime`：`OpenClaw Pi Default`、`OpenAI Codex`、CLI 後端或 ACP 後端。
- **每次回應的 Token/成本** 由 `/usage off|tokens|full` 控制（附加於正常回應）。
- `/model status` 關乎 **模型/授權/端點**，而非使用量。

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

- `/model` 和 `/model list` 會顯示一個精簡的編號選擇器（模型系列 + 可用的提供者）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含提供者和模型下拉選單以及提交步驟。該選擇器會遵守 `agents.defaults.models`，包括 `provider/*` 項目，因此提供者範圍的探索可以讓選擇器保持在 Discord 的 25 個選項元件限制以下。
- `/model <#>` 從該選擇器中進行選擇（並在可能時偏好目前的提供者）。
- `/model status` 顯示詳細資訊檢視，包括已設定的提供者端點 (`baseUrl`) 和 API 模式 (`api`)（如有提供）。

## 偵錯覆寫

`/debug` 讓您設定 **僅限執行時期** 的設定覆寫（記憶體，非磁碟）。僅限擁有者使用。預設為停用；請使用 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>覆寫會立即套用至新的設定讀取，但 **不** 會寫入 `openclaw.json`。使用 `/debug reset` 清除所有覆寫並返回磁碟上的設定。</Note>

## 外掛程式追蹤輸出

`/trace` 讓您切換 **工作階段範圍的外掛程式追蹤/偵錯行**，而無需開啟完整詳細模式。

範例：

```text
/trace
/trace on
/trace off
```

備註：

- `/trace` 不帶參數會顯示目前工作階段的追蹤狀態。
- `/trace on` 會啟用目前工作階段的外掛程式追蹤行。
- `/trace off` 會再次停用它們。
- 外掛程式追蹤行可以出現在 `/status` 中，以及作為正常助理回覆後的後續診斷訊息。
- `/trace` 不會取代 `/debug`；`/debug` 仍然管理僅限執行時期的設定覆寫。
- `/trace` 不會取代 `/verbose`；正常的詳細工具/狀態輸出仍然屬於 `/verbose`。

## 設定更新

`/config` 會寫入您的磁碟配置 (`openclaw.json`)。�限擁有者使用。預設停用；請使用 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

<Note>Config is validated before write; invalid changes are rejected. `/config` updates persist across restarts.</Note>

## MCP 更新

`/mcp` 會將 OpenClaw 管理的 MCP 伺服器定義寫入 `mcp.servers` 之下。僅限擁有者使用。預設停用；請使用 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` 將配置儲存在 OpenClaw 配置中，而非 Pi 擁有的專案設定中。執行時適配器 (Runtime adapters) 決定哪些傳輸實際上可執行。</Note>

## 外掛更新

`/plugins` 允許操作員檢視已發現的外掛並在配置中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；請使用 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` 和 `/plugins show` 會對當前工作區加上磁碟配置進行真實的外掛探索。
- `/plugins install` 從 ClawHub、npm、git、本機目錄和封存檔安裝。
- `/plugins enable|disable` 僅更新外掛配置；它不會安裝或解除安裝外掛。
- 啟用和停用的變更會針對新的代理轉數 (agent turns) 熱重載 Gateway 外掛執行時介面；安裝則會請求 Gateway 重啟，因為外掛來源模組已變更。

</Note>

## 介面說明

<AccordionGroup>
  <Accordion title="各介面的會話">
    - **文字指令** 在正常聊天會話中執行 (DM 共用 `main`，群組則有自己的會話)。
    - **原生指令** 使用隔離的會話：
      - Discord：`agent:<agentId>:discord:slash:<userId>`
      - Slack：`agent:<agentId>:slack:slash:<userId>` (前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定)
      - Telegram：`telegram:slash:<userId>` (透過 `CommandTargetSessionKey` 目標鎖定聊天會話)
    - **`/stop`** 目標鎖定作用中的聊天會話，以便它中止目前的執行。

  </Accordion>
  <Accordion title="Slack 詳情">
    `channels.slack.slashCommand` 仍支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，必須為每個內建指令建立一個 Slack 斜線指令（名稱與 `/help` 相同）。Slack 的指令參數選單會以暫時性 Block Kit 按鈕的形式提供。

    Slack 原生例外：註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

  </Accordion>
</AccordionGroup>

## BTW 側邊問題

`/btw` 是關於當前會話的快速**側邊問題**。`/side` 是一個別名。

與一般聊天不同：

- 它將當前會話作為背景內容，
- 它作為獨立的**無工具**一次性呼叫執行，
- 它不會改變未來的會話內容，
- 它不會寫入文字記錄歷史，
- 它會即時作為側邊結果傳送，而非一般的助理訊息。

這讓 `/btw` 在您希望主要任務繼續進行時，能夠獲得暫時性的澄清而變得很有用。

範例：

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

請參閱 [BTW Side Questions](/zh-Hant/tools/btw) 以了解完整行為和客戶端 UX 細節。

## 相關

- [建立技能](/zh-Hant/tools/creating-skills)
- [技能](/zh-Hant/tools/skills)
- [技能設定](/zh-Hant/tools/skills-config)
