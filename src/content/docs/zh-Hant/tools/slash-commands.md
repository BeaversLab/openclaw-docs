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
  啟用在聊天訊息中解析 `/...`。在沒有原生指令的介面上 (WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams)，即使您將此設定為 `false`，文字指令仍然有效。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  註冊原生指令。Auto：Discord/Telegram 為開啟；Slack 為關閉 (直到您新增斜線指令)；不支援原生的供應商則忽略。設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以依供應商覆寫 (布林值或 `"auto"`)。在 Discord 上，`false` 會在啟動期間跳過斜線指令註冊與清理；先前註冊的指令可能會持續可見，直到您從 Discord 應用程式中移除它們。Slack 指令是在 Slack 應用程式中管理，並不會自動移除。
</ParamField>
在 Discord 上，原生指令規格可能包含 `descriptionLocalizations`，OpenClaw 會將其發佈為 Discord `description_localizations` 並包含在比對比較中。
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  當支援時，原生註冊 **skill** 指令。Auto：Discord/Telegram 為開啟；Slack 為關閉 (Slack 需要為每個技能建立一個斜線指令)。設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以依供應商覆寫 (布林值或 `"auto"`)。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  啟用 `! <cmd>` 以執行主機 Shell 指令 (`/bash <cmd>` 為別名；需要 `tools.elevated` 允許清單)。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切換到背景模式之前等待多久 (`0` 會立即進入背景)。
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  啟用 `/config` (讀取/寫入 `openclaw.json`)。
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  啟用 `/mcp` (讀取/寫入 OpenClaw 管理的 MCP 設定，位於 `mcp.servers` 下)。
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  啟用 `/plugins` (外掛程式探索/狀態以及安裝 + 啟用/停用控制項)。
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  啟用 `/debug` (僅限執行階段的覆寫)。
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  啟用 `/restart` 以及 Gateway 重啟工具動作。
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  設定僅限擁有者指令介面和擁有者閘道通道動作的明確擁有者允許清單。這是可以批准危險動作並執行指令的人類操作員帳戶，例如 `/diagnostics`、`/export-trajectory` 和 `/config`。它與 `commands.allowFrom` 以及 DM 配對存取權分開。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每個通道：讓僅限擁有者的指令需要 **擁有者身分** 才能在該介面上執行。當 `true` 時，傳送者必須符合已解析的擁有者候選者 (例如 `commands.ownerAllowFrom` 中的項目或供應商原生的擁有者中繼資料)，或在內部訊息通道上持有內部 `operator.admin` 範圍。通道 `allowFrom` 中的萬用字元項目，或空白/未解析的擁有者候選者清單，並**不**充分 — 該通道上的僅限擁有者指令會以失敗封閉處理。如果您希望僅限擁有者的指令僅由 `ownerAllowFrom` 和標準指令允許清單進行閘道，請將此保持關閉。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制擁有者 ID 在系統提示中出現的方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  選擇性地設定 `commands.ownerDisplay="hash"` 時使用的 HMAC 密鑰。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  每個供應商的指令授權允許清單。設定後，它是指令和指令的唯一授權來源 (通道允許清單/配對和 `commands.useAccessGroups` 會被忽略)。使用 `"*"` 作為全域預設值；特定供應商的金鑰會覆寫它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  當未設定 `commands.allowFrom` 時，對指令執行允許清單/政策。
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
    - `/new [model]` 會封存當前會話並開啟一個新會話；`/reset` 會原地清除當前會話。它們互為別名。
    - Control UI 會攔截輸入的 `/new` 以建立並切換到一個全新的儀表板會話，除非已配置 `session.dmScope: "main"` 且當前父級是代理程式的主會話；在這種情況下，`/new` 會原地重設主會話。輸入的 `/reset` 仍然執行 Gateway 的原地重設。
    - `/reset soft [message]` 會保留當前對話紀錄，捨棄已重複使用的 CLI 後端會話 ID，並原地重新執行啟動/系統提示詞載入。
    - `/compact [instructions]` 會壓縮會語境。請參閱 [壓縮](/zh-Hant/concepts/compaction)。
    - `/stop` 會中止當前執行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理執行緒綁定的過期時間。
    - `/export-session [path]` 將當前會話匯出為 HTML。別名：`/export`。
    - `/export-trajectory [path]` 會詢問執行核准，然後將當前會話匯出為 JSONL [軌跡套件](/zh-Hant/tools/trajectory)。當您需要某個 OpenClaw 會話的提示詞、工具和對話紀錄時間軸時，請使用此指令。在群組聊天中，核准提示和匯出結果會私下傳送給擁有者。別名：`/trajectory`。

  </Accordion>
  <Accordion title="模型與執行控制">
    - `/think <level|default>` 設定思考等級或清除會話覆寫。選項來自使用中模型的提供者設定檔；常見等級為 `off`、`minimal`、`low`、`medium` 和 `high`，僅在支援時提供自訂等級，如 `xhigh`、`adaptive`、`max` 或二元 `on`。別名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切換詳細輸出。經授權的外部頻道傳送者可保留會話覆寫；內部 gateway/webchat 用戶端需要 `operator.admin`。別名：`/v`。
    - `/trace on|off` 切換目前會話的外掛追蹤輸出。
    - `/fast [status|on|off|default]` 顯示、設定或清除快速模式。
    - `/reasoning [on|off|stream]` 切換推理可見性。別名：`/reason`。
    - `/elevated [on|off|ask|full]` 切換提權模式。別名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 顯示或設定 exec 預設值。
    - `/model [name|#|status]` 顯示或設定模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出已設定/已授權可用的提供者或提供者的模型；新增 `all` 以瀏覽該提供者的完整目錄。`agents.defaults.models` 中的 `provider/*` 項目會讓 `/model` 和 `/models` 僅顯示這些提供者的探索模型。
    - `/queue <mode>` 管理執行中队列行為（`steer`、`followup`、`collect`、`interrupt`）以及像 `debounce:0.5s cap:25 drop:summarize` 這類選項；`/queue default` 或 `/queue reset` 會清除會話覆寫。執行中提示預設在沒有队列指令的情況下進行導向。參閱[指令佇列](/zh-Hant/concepts/queue)與[導向佇列](/zh-Hant/concepts/queue-steering)。
    - `/steer <message>` 將指引注入目前會話的執行中，與 `/queue` 模式無關。如果無法使用導向或會話處於閒置狀態，`<message>` 將繼續作為一般提示。別名：`/tell`。參閱[導向](/zh-Hant/tools/steer)。

  </Accordion>
  <Accordion title="探索與狀態">
    - `/help` 顯示簡短說明摘要。
    - `/commands` 顯示產生的指令目錄。
    - `/tools [compact|verbose]` 顯示目前代理程式現在可使用的項目。
    - `/status` 顯示執行/執行時狀態、Gateway 與系統正常運行時間，以及（可用的）供應商使用量/配額。
    - `/goal [status] | /goal start <objective> | /goal pause|resume|complete|block|clear` 管理目前會話的持續性 [目標](/zh-Hant/tools/goal)。
    - `/diagnostics [note]` 是僅限擁有者使用的 Gateway 錯誤與 Codex harness 執行支援回報流程。它會在每次執行 `openclaw gateway diagnostics export --json` 前要求明確的執行核准；請勿使用允許所有的規則來核准診斷。核准後，它會傳送包含本地組合路徑、清單摘要、隱私權注意事項與相關會話 ID 的可貼上報告。在群組聊天中，核准提示與報告會私下傳送給擁有者。當使用中的會話使用 OpenAI Codex harness 時，相同的核准也會將相關的 Codex 回饋傳送到 OpenAI 伺服器，而完成的回覆會列出 OpenClaw 會話 ID、Codex 執行緒 ID 與 `codex resume <thread-id>` 指令。請參閱[診斷匯出](/zh-Hant/gateway/diagnostics)。
    - `/crestodian <request>` 從擁有者 DM 執行 Crestodian 設定與修復協助程式。
    - `/tasks` 列出目前會話的作用中/最近背景工作。
    - `/context [list|detail|map|json]` 說明如何組合內容。`map` 傳送目前會話內容的樹狀圖影像。
    - `/whoami` 顯示您的傳送者 ID。別名：`/id`。
    - `/usage off|tokens|full|cost` 控制每次回應的使用量頁尾或列印本地成本摘要。

  </Accordion>
  <Accordion title="技能、允許清單、核准">
    - `/skill <name> [input]` 依名稱執行技能。
    - `/allowlist [list|add|remove] ...` 管理允許清單項目。僅限文字。
    - `/approve <id> <decision>` 解決 exec 或外掛程式核准提示。
    - `/btw <question>` 提出一個側邊問題而不改變未來的 session 上下文。別名：`/side`。參見 [BTW](/zh-Hant/tools/btw)。

  </Accordion>
  <Accordion title="Subagents 與 ACP">
    - `/subagents list|log|info` 檢查目前 session 的 sub-agent 執行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP sessions 與執行時期選項。
    - `/focus <target>` 將目前的 Discord 執行緒或 Telegram 主題/對話綁定至 session 目標。
    - `/unfocus` 移除目前的綁定。
    - `/agents` 列出目前 session 中已綁定執行緒的 agents。

  </Accordion>
  <Accordion title="僅限擁有者的寫入與管理">
    - `/config show|get|set|unset` 讀取或寫入 `openclaw.json`。僅限擁有者。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 讀取或寫入位於 `mcp.servers` 下由 OpenClaw 管理的 MCP 伺服器設定。僅限擁有者。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 檢查或修改外掛程式狀態。`/plugin` 為其別名。寫入僅限擁有者。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理僅限執行時期的設定覆寫。僅限擁有者。需要 `commands.debug: true`。
    - `/restart` 啟用時重新啟動 OpenClaw。預設：啟用；設定 `commands.restart: false` 以停用它。
    - `/send on|off|inherit` 設定傳送策略。僅限擁有者。

  </Accordion>
  <Accordion title="語音、TTS、頻道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。請參閱 [TTS](/zh-Hant/tools/tts)。
    - `/activation mention|always` 設定群組啟用模式。
    - `/bash <command>` 執行主機 shell 指令。僅限文字。別名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允許清單。
    - `!poll [sessionId]` 檢查背景 bash 任務。
    - `!stop [sessionId]` 停止背景 bash 任務。

  </Accordion>
</AccordionGroup>

### 生成的 Dock 指令

Dock 指令會將目前會話的回覆路由切換到另一個連結的頻道。請參閱 [頻道對接](/zh-Hant/concepts/channel-docking) 以了解設定、範例與疑難排解。

Dock 指令是由支援原生指令的頻道外掛程式所產生。目前內建的集合包括：

- `/dock-discord` (別名：`/dock_discord`)
- `/dock-mattermost` (別名：`/dock_mattermost`)
- `/dock-slack` (別名：`/dock_slack`)
- `/dock-telegram` (別名：`/dock_telegram`)

從直接聊天中使用 Dock 指令，將目前階段的回覆路由切換到另一個連結頻道。代理程式會維持相同的階段內容，但該階段之後的回覆將會傳送到選定的頻道端點。

Dock 指令需要 `session.identityLinks`。來源傳送者和目標對等端必須位於相同的身分群組中，例如 `["telegram:123", "discord:456"]`。如果 ID 為 `123` 的 Telegram 使用者傳送 `/dock_discord`，OpenClaw 會在作用中的會話上儲存 `lastChannel: "discord"` 和 `lastTo: "456"`。如果傳送者未連結到 Discord 對等端，該指令會回覆設定提示，而不是轉接到一般聊天。

對接僅會變更作用中會話的路由。它不會建立頻道帳戶、授與存取權、繞過頻道允許清單，或將對話紀錄移至另一個會話。請使用 `/dock-telegram`、`/dock-slack`、`/dock-mattermost` 或其他產生的 dock 指令來再次切換路由。

### 內建外掛指令

內建外掛可以新增更多斜線指令。此儲存庫中目前的內建指令：

- `/dreaming [on|off|status|help]` 切換記憶體夢想。請參閱 [夢想](/zh-Hant/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理裝置配對/設定流程。請參閱 [配對](/zh-Hant/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 暫時啟用高風險手機節點指令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 語音設定。在 Discord 上，原生指令名稱為 `/talkvoice`。
- `/card ...` 發送 LINE 豐富卡片預設集。請參閱 [LINE](/zh-Hant/channels/line)。
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` 檢查並控制捆綁的 Codex 應用伺服器綁定。請參閱 [Codex harness](/zh-Hant/plugins/codex-harness)。
- 僅限 QQBot 的指令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 動態技能指令

使用者可呼叫的技能也會以斜線指令形式呈現：

- `/skill <name> [input]` 始終作為通用入口點運作。
- 當技能/外掛註冊時，技能也可能會以直接指令的形式出現，例如 `/prose`。
- 原生技能指令註冊由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。
- 指令規範可以為支援本地化描述的原生介面（包括 Discord）提供 `descriptionLocalizations`。

<AccordionGroup>
  <Accordion title="引數與解析器說明">
    - 指令接受一個可選的 `:` 位於指令與引數之間（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；若無比對，則將文字視為訊息內容。
    - 如需完整的提供者使用說明，請使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道的 `configWrites`。
    - 在多帳號頻道中，目標配置的 `/allowlist --account <id>` 與 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
    - `/usage` 控制每次回應的使用情況頁尾；`/usage cost` 會從 OpenClaw 會話日誌列印本地成本摘要。
    - `/restart` 預設為啟用；請設定 `commands.restart: false` 來停用它。
    - `/plugins install <spec>` 接受與 `openclaw plugins install` 相同的外掛規格：本機路徑/壓縮檔、npm 套件、`git:<repo>` 或 `clawhub:<pkg>`。由於外掛來源模組變更，受管理的 Gateway 會自動重新啟動。
    - `/plugins enable|disable` 會更新外掛配置並觸發 Gateway 外掛重新載入，以便進行新的 Agent 回合。

  </Accordion>
  <Accordion title="特定頻道行為">
    - 僅限 Discord 的原生指令：`/vc join|leave|status` 控制語音頻道（無法以文字形式使用）。`join` 需要伺服器並選擇語音/舞台頻道。需要 `channels.discord.voice` 和原生指令。
    - Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 指令參考和執行時期行為：[ACP agents](/zh-Hant/tools/acp-agents)。

  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` 適用於偵錯和額外的可見性；正常使用時請將其設為關閉 (**off**)。
    - `/trace` 比 `/verbose` 更狹窄：它只會顯示外掛程式擁有的追蹤/偵錯行，並保持正常的詳細工具交談關閉。
    - `/fast on|off` 會保存工作階段覆寫。請使用 Sessions UI `inherit` 選項來清除它並還原為設定預設值。
    - `/fast` 是特定於提供者的：OpenAI/OpenAI Codex 在原生 Responses 端點上將其對應至 `service_tier=priority`，而直接公開的 Anthropic 要求（包括傳送到 `api.anthropic.com` 的 OAuth 驗證流量）將其對應至 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Anthropic](/zh-Hant/providers/anthropic)。
    - 相關時仍會顯示工具失敗摘要，但只有在啟用 `/verbose full` 時才會包含詳細的失敗文字。
    - `/reasoning`、`/verbose` 和 `/trace` 在群組設定中具有風險：它們可能會揭露您不打算公開的內部推理、工具輸出或外掛診斷資訊。建議將其保持關閉，尤其是在群組聊天中。

  </Accordion>
  <Accordion title="Model switching">
    - `/model` 會立即保存新的工作階段模型。
    - 如果代理程式處於閒置狀態，下次執行會立即使用它。
    - 如果執行已經在進行中，OpenClaw 會將即時切換標記為待處理，並且只有在乾淨的重試點才會重新啟動到新模型。
    - 如果工具活動或回覆輸出已經開始，待處理的切換可以保持佇列狀態，直到後續的重試機會或下一個使用者輪次。
    - 在本機 TUI 中，`/crestodian [request]` 會從正常的代理程式 TUI 返回至 Crestodian。這與訊息通道救援模式分開，並且不授與遠端設定權限。

  </Accordion>
  <Accordion title="Fast path and inline shortcuts">
    - **Fast path:** 來自允許列表發送者的僅指令訊息會立即處理（繞過佇列 + 模型）。
    - **Group mention gating:** 來自允許列表發送者的僅指令訊息會繞過提及要求。
    - **Inline shortcuts (allowlisted senders only):** 某些指令在嵌入正常訊息時也有效，並會在模型看到剩餘文字前被移除。
      - 範例：`hey /status` 會觸發狀態回覆，而剩餘文字會繼續依正常流程進行。
    - 目前支援：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
    - 未授權的僅指令訊息會被靜默忽略，而內聯的 `/...` 標記會被視為純文字。

  </Accordion>
  <Accordion title="Skill commands and native arguments">
    - **Skill commands:** `user-invocable` 技能會以斜線指令公開。名稱會被清理為 `a-z0-9_`（最多 32 個字元）；衝突時會加上數字後綴（例如 `_2`）。
      - `/skill <name> [input]` 會依名稱執行技能（當原生指令限制無法使用個別技能指令時很有用）。
      - 預設情況下，技能指令會作為正常請求轉發給模型。
      - 技能可以選擇宣告 `command-dispatch: tool`，將指令直接路由至工具（具確定性，無模型）。
      - 範例：`/prose` (OpenProse 外掛) — 請參閱 [OpenProse](/zh-Hant/prose)。
    - **Native command arguments:** Discord 會對動態選項使用自動完成（當您省略必要引數時會使用按鈕選單）。當指令支援選項且您省略引數時，Telegram 和 Slack 會顯示按鈕選單。動態選項會根據目標工作階段模型解析，因此模型特定的選項（如 `/think` 層級）會遵循該工作階段的 `/model` 覆寫設定。

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答的是運行時問題，而非設定問題：**該代理目前在此對話中可以使用什麼**。

- 預設的 `/tools` 採用精簡格式，並針對快速瀏覽進行了最佳化。
- `/tools verbose` 會加入簡短的描述。
- 支援參數的原生命令介面會公開與 `compact|verbose` 相同的模式切換開關。
- 結果是基於會話範圍的，因此變更代理、頻道、執行緒、發送者授權或模型可能會改變輸出。
- `/tools` 包含在執行時實際可存取的工具，包括核心工具、已連接的外掛工具以及通道擁有的工具。

若要編輯設定檔和覆寫設定，請使用 Control UI 的 Tools 面板或 config/catalog 介面，而不要將 `/tools` 視為靜態目錄。

## 使用介面（顯示位置）

- 當啟用使用量追蹤時，**提供者使用量/配額**（例如：「Claude 剩餘 80%」）會顯示在目前模型提供者的 `/status` 中。OpenClaw 會將提供者視窗標準化為 `% left`；對於 MiniMax，僅剩餘的百分比欄位會在顯示前反轉，而 `model_remains` 回應則偏好聊天模型條目加上帶有模型標籤的計畫標籤。
- 當即時會話快照稀疏時，`/status` 中的 **Token/cache 行** 可以回退到最新的文字記錄使用量條目。現有的非零即時值仍然優先採用，而當儲存的總數缺失或較小時，文字記錄回退也可以恢復作用中的執行時模型標籤加上較大的以提示為導向的總數。
- **執行與執行時：** `/status` 會回報有效沙箱路徑的 `Execution` 以及實際執行會話對象的 `Runtime`：`OpenClaw Default`、`OpenAI Codex`、CLI 後端或 ACP 後端。
- **每次回應的 token/成本** 是由 `/usage off|tokens|full` 控制的（附加到一般回覆中）。
- `/model status` 是關於 **模型/驗證/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 是作為指令實作的。

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

- `/model` 和 `/model list` 會顯示一個精簡的編號選擇器（模型系列 + 可用提供者）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含提供者和模型下拉選單以及一個提交步驟。該選擇器會遵守 `agents.defaults.models`，包括 `provider/*` 條目，因此透過提供者範圍的探索可以將選擇器保持在 Discord 的 25 個選項元件限制之下。
- `/model <#>` 會從該選擇器中進行選擇（並盡可能優先使用目前的提供者）。
- `/model status` 會顯示詳細檢視，包括已配置的提供者端點（`baseUrl`）和 API 模式（`api`）（如有可用）。

## 偵錯覆寫

`/debug` 讓您設定 **僅限執行時期** 的配置覆寫（儲存在記憶體中，而非磁碟）。僅限擁有者使用。預設為停用；透過 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

<Note>覆寫會立即套用於新的配置讀取，但 **不會** 寫入 `openclaw.json`。使用 `/debug reset` 清除所有覆寫並返回磁碟上的配置。</Note>

## 外掛程式追蹤輸出

`/trace` 讓您切換 **工作階段範圍的外掛程式追蹤/偵錯行**，而無需開啟完整詳細模式。

範例：

```text
/trace
/trace on
/trace off
```

備註：

- `/trace` 不帶參數時會顯示目前的工作階段追蹤狀態。
- `/trace on` 會啟用目前工作階段的外掛程式追蹤行。
- `/trace off` 會再次將其停用。
- 外掛程式追蹤行可以出現在 `/status` 中，也可以在一般助理回覆之後作為後續診斷訊息出現。
- `/trace` 不會取代 `/debug`；`/debug` 仍然管理僅限執行時期的配置覆寫。
- `/trace` 不會取代 `/verbose`；一般的詳細工具/狀態輸出仍然屬於 `/verbose`。

## 設定更新

`/config` 會寫入您的磁碟配置（`openclaw.json`）。僅限擁有者使用。預設為停用；透過 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

<Note>配置會在寫入前進行驗證；無效的變更會被拒絕。`/config` 更新會在重新啟動後持續存在。</Note>

## MCP 更新

`/mcp` 會在 `mcp.servers` 下寫入由 OpenClaw 管理的 MCP 伺服器定義。僅限擁有者使用。預設停用；透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` 將設定儲存在 OpenClaw 設定中，而非 embedded-agent 專案設定中。執行時適配器決定哪些傳輸實際上可執行。</Note>

## 外掛更新

`/plugins` 允許操作員檢查已發現的外掛並在設定中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；透過 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` 和 `/plugins show` 會針對當前工作區加上磁碟設定來使用真實的外掛探索。
- `/plugins install` 從 ClawHub、npm、git、本機目錄和封存檔案安裝。
- `/plugins enable|disable` 僅更新外掛設定；它不會安裝或解除安裝外掛。
- 啟用和停用的變更會針對新的代理回合熱重載 Gateway 外掛執行時層級；安裝會自動重新啟動受管理的 Gateway，因為外掛來源模組已變更。

</Note>

## 介面說明

<AccordionGroup>
  <Accordion title="Sessions per surface">
    - **文字指令** 在一般聊天會話中執行（DM 共用 `main`，群組有自己的會話）。
    - **原生指令** 使用隔離會話：
      - Discord：`agent:<agentId>:discord:slash:<userId>`
      - Slack：`agent:<agentId>:slack:slash:<userId>`（前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定）
      - Telegram：`telegram:slash:<userId>`（透過 `CommandTargetSessionKey` 指向聊天會話）
    - **`/stop`** 指向作用中的聊天會話，以便它中止目前的執行。

  </Accordion>
  <Accordion title="Slack 特定事項">
    `channels.slack.slashCommand` 仍支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，則必須為每個內建指令建立一個 Slack 斜線指令（名稱與 `/help` 相同）。Slack 的指令參數選單是以暫時性 Block Kit 按鈕的形式提供。

    Slack 原生例外：註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

  </Accordion>
</AccordionGroup>

## BTW 側邊問題

`/btw` 是關於目前會話的快速**側提問題**。`/side` 是別名。

與一般聊天不同：

- 它將當前會話作為背景內容，
- 在 Codex harness 工作階段中，它會以暫時性的 Codex 側面執行緒執行，並具備目前的 Codex 權限和原生工具介面，
- 在非 Codex 工作階段中，它會保持較舊的直接一次性側面呼叫行為，
- 它不會改變未來的工作階段語境，
- 它不會寫入逐字稿歷史，
- 它會以即時側面結果的形式傳送，而不是一般的助理訊息。

這使得 `/btw` 在您需要進行臨時說明，同時讓主要任務繼續進行時非常有用。

範例：

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

請參閱 [BTW 側提問題](/zh-Hant/tools/btw) 以了解完整行為和客戶端 UX 細節。

## 相關

- [建立技能](/zh-Hant/tools/creating-skills)
- [技能](/zh-Hant/tools/skills)
- [技能設定](/zh-Hant/tools/skills-config)
