---
summary: "Slash 指令：文字與原生、設定及支援的指令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash 指令"
---

# Slash 指令

指令由 Gateway 處理。大多數指令必須作為以 `/` 開頭的**獨立**訊息發送。
僅限主機的 bash 聊天指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

有兩個相關系統：

- **指令**：獨立的 `/...` 訊息。
- **指令**：`/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到訊息之前，指示詞會從訊息中移除。
  - 在一般聊天訊息中（非僅指示詞），它們被視為「行內提示」且**不會**保存工作階段設定。
  - 在僅指示詞訊息中（訊息僅包含指示詞），它們會保存至工作階段並回覆確認。
  - 指令僅套用於**授權的發送者**。如果設定了 `commands.allowFrom`，則它是唯一使用的
    允許清單；否則授權來自頻道允許清單/配對加上 `commands.useAccessGroups`。
    未授權的發送者會將指令視為純文字。

還有一些**內嵌捷徑**（僅限允許清單/授權的發送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它們會立即執行，並在模型看到訊息之前被移除，剩餘的文字會繼續進行正常流程。

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

- `commands.text`（預設 `true`）啟用解析聊天訊息中的 `/...`。
  - 在沒有原生指令的介面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使將此項設為 `false`，文字指令仍然有效。
- `commands.native`（預設 `"auto"`）註冊原生指令。
  - 自動：Discord/Telegram 開啟；Slack 關閉（直到您加入斜線指令）；對不支援原生的提供者予以忽略。
  - 設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以針對各個提供者進行覆寫（布林值或 `"auto"`）。
  - `false` 會在啟動時清除先前在 Discord/Telegram 上註冊的指令。Slack 指令是在 Slack 應用程式中管理的，不會自動移除。
- `commands.nativeSkills`（預設為 `"auto"`）會在支援時原生註冊 **skill** 指令。
  - 自動：Discord/Telegram 開啟；Slack 關閉（Slack 需要為每個 skill 建立斜線指令）。
  - 設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆寫各供應商的設定（布林值或 `"auto"`）。
- `commands.bash`（預設為 `false`）啟用 `! <cmd>` 來執行主機 shell 指令（`/bash <cmd>` 為別名；需要 `tools.elevated` 許可清單）。
- `commands.bashForegroundMs`（預設為 `2000`）控制 bash 在切換到背景模式之前等待的時間（`0` 會立即進入背景）。
- `commands.config`（預設為 `false`）啟用 `/config`（讀取/寫入 `openclaw.json`）。
- `commands.mcp`（預設為 `false`）啟用 `/mcp`（讀取/寫入位於 `mcp.servers` 下的 OpenClaw 管理之 MCP 設定）。
- `commands.plugins`（預設為 `false`）啟用 `/plugins`（外掛程式探索/狀態，加上安裝 + 啟用/停用控制）。
- `commands.debug`（預設為 `false`）啟用 `/debug`（僅限執行時期的覆寫）。
- `commands.restart`（預設為 `true`）啟用 `/restart` 以及閘道重啟工具動作。
- `commands.ownerAllowFrom`（選用）設定僅限擁有者指令/工具介面的明確擁有者許可清單。這與 `commands.allowFrom` 分開。
- `commands.ownerDisplay` 控制擁有者 ID 如何顯示在系統提示詞中：`raw` 或 `hash`。
- `commands.ownerDisplaySecret` 可選擇性地設定當 `commands.ownerDisplay="hash"` 時使用的 HMAC 金鑰。
- `commands.allowFrom` （選用）為指令授權設定各供應商的允許清單。設定後，這是指令和指令的唯一授權來源（頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定供應商的金鑰會覆寫它。
- 當未設定 `commands.allowFrom` 時，`commands.useAccessGroups` （預設為 `true`）會對指令執行允許清單/原則。

## 指令清單

目前的唯一真相來源：

- 核心內建指令來自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 dock 指令來自 `src/auto-reply/commands-registry.data.ts`
- 外掛指令來自外掛 `registerCommand()` 呼叫
- 在您的 gateway 上實際的可用性仍取決於設定旗標、頻道介面以及已安裝/啟用的外掛程式

### 核心內建指令

目前可用的內建指令：

- `/new [model]` 啟動一個新工作階段；`/reset` 是重設別名。
- `/compact [instructions]` 壓縮工作階段上下文。參見 [/concepts/compaction](/zh-Hant/concepts/compaction)。
- `/stop` 中止目前執行。
- `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理執行緒綁定過期。
- `/think <off|minimal|low|medium|high|xhigh>` 設定思考等級。別名：`/thinking`、`/t`。
- `/verbose on|off|full` 切換詳細輸出。別名：`/v`。
- `/trace on|off` 切換目前工作階段的外掛追蹤輸出。
- `/fast [status|on|off]` 顯示或設定快速模式。
- `/reasoning [on|off|stream]` 切換推理可見性。別名：`/reason`。
- `/elevated [on|off|ask|full]` 切換提升模式。別名：`/elev`。
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 顯示或設定 exec 預設值。
- `/model [name|#|status]` 顯示或設定模型。
- `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出供應商或供應商的模型。
- `/queue <mode>` 管理佇列行為（`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`）以及像 `debounce:2s cap:25 drop:summarize` 這類的選項。
- `/help` 顯示簡短說明摘要。
- `/commands` 顯示產生的指令目錄。
- `/tools [compact|verbose]` 顯示目前的代理程式現在可以使用什麼。
- `/status` 顯示執行時狀態，包括提供者的使用量/配額（如果有資訊的話）。
- `/tasks` 列出目前階段作用中/最近的背景任務。
- `/context [list|detail|json]` 說明如何組合情境。
- `/export-session [path]` 將目前階段匯出為 HTML。別名：`/export`。
- `/whoami` 顯示您的傳送者 ID。別名：`/id`。
- `/skill <name> [input]` 依名稱執行技能。
- `/allowlist [list|add|remove] ...` 管理允許清單項目。僅限文字模式。
- `/approve <id> <decision>` 解決執行核准提示。
- `/btw <question>` 提出一個額外問題而不會改變未來的階段情境。請參閱 [/tools/btw](/zh-Hant/tools/btw)。
- `/subagents list|kill|log|info|send|steer|spawn` 管理目前階段的子代理程式執行。
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 階段和執行時選項。
- `/focus <target>` 將目前的 Discord 執行緒或 Telegram 主題/對話繫結至階段目標。
- `/unfocus` 移除目前的繫結。
- `/agents` 列出目前階段已繫結執行緒的代理程式。
- `/kill <id|#|all>` 中止一個或所有執行中的子代理程式。
- `/steer <id|#> <message>` 向執行中的子代理程式發送引導。別名：`/tell`。
- `/config show|get|set|unset` 讀取或寫入 `openclaw.json`。僅限擁有者。需要 `commands.config: true`。
- `/mcp show|get|set|unset` 讀取或寫入 `mcp.servers` 下的 OpenClaw 管理式 MCP 伺服器設定。僅限擁有者。需要 `commands.mcp: true`。
- `/plugins list|inspect|show|get|install|enable|disable` 檢查或變更外掛程式狀態。`/plugin` 為別名。寫入操作僅限擁有者。需要 `commands.plugins: true`。
- `/debug show|set|unset|reset` 管理僅限運行時的配置覆寫。僅限擁有者。需要 `commands.debug: true`。
- `/usage off|tokens|full|cost` 控制每次回應的使用頁尾或列印本機成本摘要。
- `/tts on|off|status|provider|limit|summary|audio|help` 控制 TTS。請參閱 [/tools/tts](/zh-Hant/tools/tts)。
- 啟用時，`/restart` 會重新啟動 OpenClaw。預設值：啟用；設定 `commands.restart: false` 以停用它。
- `/activation mention|always` 設定群組啟用模式。
- `/send on|off|inherit` 設定傳送原則。僅限擁有者。
- `/bash <command>` 執行主機 shell 指令。僅限文字。別名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允許清單。
- `!poll [sessionId]` 檢查背景 bash 工作。
- `!stop [sessionId]` 停止背景 bash 工作。

### 產生的 Dock 指令

Dock 指令是由支援原生指令的通道外掛程式所產生。目前的內建組合：

- `/dock-discord` (別名：`/dock_discord`)
- `/dock-mattermost` (別名：`/dock_mattermost`)
- `/dock-slack` (別名：`/dock_slack`)
- `/dock-telegram` (別名：`/dock_telegram`)

### 內建外掛指令

內建外掛程式可以新增更多斜線指令。此存放庫中目前的內建指令：

- `/dreaming [on|off|status|help]` 切換記憶體夢境。請參閱 [夢境](/zh-Hant/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理裝置配對/設定流程。請參閱 [配對](/zh-Hant/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 暫時啟用高風險手機節點指令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 語音設定。在 Discord 上，原生指令名稱為 `/talkvoice`。
- `/card ...` 傳送 LINE 豐富卡片預設集。請參閱 [LINE](/zh-Hant/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 檢查並控制內建的 Codex 應用程式伺服器套件。請參閱 [Codex Harness](/zh-Hant/plugins/codex-harness)。
- 僅限 QQBot 的指令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 動態技能指令

使用者可呼叫的技能也會以斜線指令的形式公開：

- `/skill <name> [input]` 始終作為通用入口點運作。
- 當技能/外掛註冊時，技能也可能會以直接指令的形式出現，例如 `/prose`。
- 原生技能指令註冊由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

備註：

- 指令在指令與參數之間接受可選的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；如果沒有比對到，文字將被視為訊息正文。
- 如需完整的提供者使用詳情，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道 `configWrites`。
- 在多帳號頻道中，以配置為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
- `/usage` 控制每次回應的使用頁尾；`/usage cost` 會列印來自 OpenClaw 會話日誌的本地成本摘要。
- `/restart` 預設啟用；設定 `commands.restart: false` 以停用它。
- `/plugins install <spec>` 接受與 `openclaw plugins install` 相同的外掛規格：本機路徑/壓縮檔、npm 套件或 `clawhub:<pkg>`。
- `/plugins enable|disable` 會更新外掛配置，並可能提示您重新啟動。
- 僅限 Discord 的原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；無法以文字形式使用）。
- Discord 執行緒綁定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令參考與執行時行為：[ACP Agents](/zh-Hant/tools/acp-agents)。
- `/verbose` 用於偵錯和額外的可見性；正常使用時請保持**關閉**。
- `/trace` 比 `/verbose` 更狹窄：它僅顯示外掛程式擁有的追蹤/偵錯行，並保持正常的詳細工具對話關閉。
- `/fast on|off` 會保存工作階段覆蓋設定。使用 Sessions UI 的 `inherit` 選項來清除它並回復為設定預設值。
- `/fast` 取決於提供者：OpenAI/OpenAI Codex 在原生 Responses 端點上將其對應到 `service_tier=priority`，而直接公開的 Anthropic 請求（包括發送到 `api.anthropic.com` 的 OAuth 驗證流量）則將其對應到 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Anthropic](/zh-Hant/providers/anthropic)。
- 相關時仍會顯示工具失敗摘要，但僅當 `/verbose` 為 `on` 或 `full` 時才會包含詳細的失敗文字。
- `/reasoning`、`/verbose` 和 `/trace` 在群組設定中具有風險：它們可能會洩露您不打算公開的內部推理、工具輸出或外掛程式診斷資訊。建議將其保持關閉，尤其是在群組聊天中。
- `/model` 會立即保存新的工作階段模型。
- 如果代理程式處於閒置狀態，下一次執行將立即使用該模型。
- 如果執行已在進行中，OpenClaw 會將即時切換標記為待處理，並僅在乾淨的重試點重新啟動到新模型。
- 如果工具活動或回覆輸出已經開始，待處理的切換可以保持排隊，直到稍後的重試機會或下一個使用者回合。
- **快速路徑：** 來自允許清單發送者的僅指令訊息會立即處理（繞過佇列 + 模型）。
- **群組提及閘門：** 來自允許清單發送者的僅指令訊息會繞過提及要求。
- **內嵌快捷方式（僅限允許清單發送者）：** 某些指令在嵌入一般訊息中時也能運作，並且會在模型看到其餘文字之前被移除。
  - 範例：`hey /status` 會觸發狀態回覆，而其餘文字則繼續透過一般流程處理。
- 目前支援：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未經授權的僅指令訊息會被靜默忽略，而內嵌的 `/...` 權杖會被視為純文字。
- **技能指令：** `user-invocable` 技能會以斜線指令的形式公開。名稱會被清理為 `a-z0-9_`（最多 32 個字元）；衝突時會加上數字後綴（例如 `_2`）。
  - `/skill <name> [input]` 會依名稱執行技能（當原生指令限制導致無法為每個技能建立指令時很有用）。
  - 根據預設，技能指令會作為一般請求轉發給模型。
  - 技能可以選擇宣告 `command-dispatch: tool`，將指令直接路由到工具（確定性，不經過模型）。
  - 範例：`/prose`（OpenProse 外掛）— 請參閱 [OpenProse](/zh-Hant/prose)。
- **原生指令引數：** Discord 使用自動完成功能來處理動態選項（當您省略必要引數時則顯示按鈕選單）。當指令支援選項且您省略該引數時，Telegram 和 Slack 會顯示按鈕選單。

## `/tools`

`/tools` 回答的是執行時期問題，而非配置問題：**此代理在此對話中現在能使用什麼**。

- 預設的 `/tools` 會顯示精簡內容，並經過最佳化以利快速瀏覽。
- `/tools verbose` 會加入簡短描述。
- 支援引數的原生指令介面會公開與 `compact|verbose` 相同的模式切換功能。
- 結果的作用域為工作階段，因此變更代理、通道、執行緒、發送者授權或模型可以
  改變輸出。
- `/tools` 包含在執行時期實際可存取的工具，包括核心工具、已連接的
  外掛工具以及通道擁有的工具。

若要編輯設定檔和覆寫設定，請使用控制 UI 工具面板或設定/目錄介面，而不要
將 `/tools` 視為靜態目錄。

## 使用介面（內容顯示位置）

- **提供者使用量/配額**（例如：「Claude 剩餘 80%」）會顯示在 `/status` 中，顯示目前模型提供者的資訊（當啟用使用量追蹤時）。OpenClaw 會將提供者視窗正規化為 `% left`；對於 MiniMax，僅剩餘百分比欄位會在顯示前反轉，而 `model_remains` 回應會優先採用聊天模型條目加上模型標記的計畫標籤。
- 當即時工作階段快照稀疏時，`/status` 中的 **Token/快取行** 可以退回到最新的逐字稿使用量條目。現有的非零即時值仍然優先，而逐字稿退回也可以在儲存的總數缺失或較小時，恢復作用中的執行時期模型標籤以及較大的提示導向總數。
- **每次回應的 Token/成本** 由 `/usage off|tokens|full` 控制（附加至一般回應）。
- `/model status` 是關於 **模型/授權/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 實作為一個指令。

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

- `/model` 和 `/model list` 會顯示一個精簡的編號選取器（模型系列 + 可用提供者）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選取器，其中包含提供者和模型下拉選單以及提交步驟。
- `/model <#>` 會從該選取器中進行選擇（並且在可能時優先採用目前的提供者）。
- `/model status` 會顯示詳細視圖，包括設定的提供者端點 (`baseUrl`) 和 API 模式 (`api`)（如果有提供）。

## 除錯覆寫

`/debug` 讓您設定 **僅限執行時期** 的設定覆寫（記憶體中，非磁碟）。僅限擁有者。預設停用；透過 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

備註：

- 覆寫會立即套用於新的設定讀取，但**不會**寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆寫並返回磁碟上的設定。

## 外掛程式追蹤輸出

`/trace` 讓您切換 **工作階段範圍的外掛程式追蹤/偵錯行**，而無須開啟完整詳細模式。

範例：

```text
/trace
/trace on
/trace off
```

備註：

- `/trace` 不帶參數會顯示目前的工作階段追蹤狀態。
- `/trace on` 會為目前的工作階段啟用外掛程式追蹤行。
- `/trace off` 會再次停用它們。
- 外掛程式追蹤行可以出現在 `/status` 中，以及作為正常助手回覆後的後續診斷訊息。
- `/trace` 不會取代 `/debug`；`/debug` 仍然管理僅限執行時期的設定覆寫。
- `/trace` 不會取代 `/verbose`；正常的詳細工具/狀態輸出仍然屬於 `/verbose`。

## 設定更新

`/config` 會寫入您的磁碟設定 (`openclaw.json`)。僅限擁有者。預設停用；透過 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

注意：

- 設定會在寫入前進行驗證；無效的變更會被拒絕。
- `/config` 更新在重新啟動後會持續存在。

## MCP 更新

`/mcp` 會在 `mcp.servers` 下寫入由 OpenClaw 管理的 MCP 伺服器定義。僅限擁有者。預設停用；透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

備註：

- `/mcp` 會將設定儲存在 OpenClaw 設定中，而非 Pi 擁有的專案設定。
- 執行時期配接器會決定哪些傳輸實際上是可執行的。

## 外掛程式更新

`/plugins` 讓操作員檢查已發現的插件並在配置中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設為停用；請使用 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

備註：

- `/plugins list` 和 `/plugins show` 會對當前工作區加上磁碟配置進行真實的插件探索。
- `/plugins enable|disable` 僅更新插件配置；它不會安裝或解除安裝插件。
- 在啟用/停用變更後，請重新啟動 Gateway 以套用變更。

## 介面備註

- **文字命令** 在一般聊天會話中執行（DM 共用 `main`，群組則有自己的會話）。
- **原生命令** 使用隔離會話：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定）
  - Telegram：`telegram:slash:<userId>`（透過 `CommandTargetSessionKey` 指向聊天會話）
- **`/stop`** 指向使用中的聊天會話，因此它可以中止當前的執行。
- **Slack：**`channels.slack.slashCommand` 仍支援單一 `/openclaw` 風格的命令。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 斜線指令（名稱與 `/help` 相同）。Slack 的指令參數選單會以暫時性 Block Kit 按鈕的形式呈現。
  - Slack 原生例外：請註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

## BTW 側提問題

`/btw` 是關於當前會話的快速**側提問題**。

與一般聊天不同：

- 它使用當前會話作為背景語境，
- 它作為獨立的**無工具**單次呼叫執行，
- 它不會改變未來的會話語境，
- 它不會寫入文字記錄歷史，
- 它會作為即時側邊結果傳送，而非一般的助理訊息。

這使得 `/btw` 在您想要臨時釐清問題，而主要任務持續進行時非常有用。

範例：

```text
/btw what are we doing right now?
```

有關完整的行為與客戶端 UX
細節，請參閱 [BTW Side Questions](/zh-Hant/tools/btw)。
