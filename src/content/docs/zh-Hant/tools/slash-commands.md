---
summary: "Slash commands: text vs native, config, and supported commands"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash Commands"
---

# Slash 指令

指令由 Gateway 處理。大多數指令必須以 `/` 開頭的**獨立** 訊息傳送。
僅限主機的 bash 聊天指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

有兩個相關系統：

- **指令**：獨立的 `/...` 訊息。
- **指示詞**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到訊息之前，指示詞會從訊息中移除。
  - 在一般聊天訊息中（非僅指示詞），它們被視為「行內提示」且**不會**保存工作階段設定。
  - 在僅指示詞訊息中（訊息僅包含指示詞），它們會保存至工作階段並回覆確認。
  - 指示詞僅套用於**授權發送者**。如果設定了 `commands.allowFrom`，則它是唯一使用的允許清單；否則授權來自頻道允許清單/配對加上 `commands.useAccessGroups`。
    未授權的發送者會看到指示詞被視為純文字。

還有一些**行內捷徑**（僅限允許清單/授權發送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它們會立即執行，在模型看到訊息前被移除，其餘文字則繼續正常流程。

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
    restart: false,
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text`（預設 `true`）啟用解析聊天訊息中的 `/...`。
  - 在沒有原生指令的表面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使您將此設定設為 `false`，文字指令仍然有效。
- `commands.native` (預設 `"auto"`) 註冊原生指令。
  - 自動：Discord/Telegram 開啟；Slack 關閉（直到您加入斜線指令）；對不支援原生的提供者予以忽略。
  - 設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆寫各提供者的設定（布林值或 `"auto"`）。
  - `false` 會在啟動時清除 Discord/Telegram 上先前註冊的指令。Slack 指令是在 Slack 應用程式中管理的，不會自動移除。
- `commands.nativeSkills` (預設 `"auto"`) 會在支援時原生註冊 **skill** 指令。
  - 自動：Discord/Telegram 開啟；Slack 關閉（Slack 需要為每個 skill 建立斜線指令）。
  - 設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆寫各提供者的設定（布林值或 `"auto"`）。
- `commands.bash` (預設 `false`) 啟用 `! <cmd>` 以執行主機 shell 指令（`/bash <cmd>` 為別名；需要 `tools.elevated` 允許清單）。
- `commands.bashForegroundMs` (預設 `2000`) 控制 bash 在切換到背景模式之前等待多久（`0` 會立即進入背景）。
- `commands.config` (預設 `false`) 啟用 `/config` (讀取/寫入 `openclaw.json`)。
- `commands.mcp` (預設 `false`) 啟用 `/mcp` (讀取/寫入 OpenClaw 管理的 MCP 設定，位於 `mcp.servers` 下)。
- `commands.plugins` (預設 `false`) 啟用 `/plugins` (外掛程式探索/狀態，以及安裝 + 啟用/停用控制)。
- `commands.debug` (預設 `false`) 啟用 `/debug` (僅限執行階段的覆寫)。
- `commands.allowFrom`（可選）為指令授權設定各提供者的允許清單。配置後，它將是指令和指令的唯一授權來源（頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定提供者的鍵會覆蓋它。
- `commands.useAccessGroups`（預設為 `true`）在未設定 `commands.allowFrom` 時強制執行指令的允許清單/原則。

## 指令清單

文字 + 原生（啟用時）：

- `/help`
- `/commands`
- `/tools [compact|verbose]`（顯示當前代理目前可使用的內容；`verbose` 會新增描述）
- `/skill <name> [input]`（依名稱執行技能）
- `/status`（顯示當前狀態；包括目前模型提供者的使用量/配額，如有提供）
- `/tasks` (列出當前工作階段的背景工作；顯示作用中及最近的工作細節以及代理程式本機的後援計數)
- `/allowlist` (列出/新增/移除允許清單項目)
- `/approve <id> <decision>` (解析執行核准提示；使用待處理的核准訊息來取得可用的決定)
- `/context [list|detail|json]` (解釋「context」；`detail` 顯示每個檔案 + 每個工具 + 每個技能 + 系統提示的大小)
- `/btw <question>` (詢問關於目前會話的臨時側面問題，而不會改變未來的會語內容；請參閱 [/tools/btw](/en/tools/btw))
- `/export-session [path]` (別名：`/export`) (將當前工作階段與完整的系統提示匯出為 HTML)
- `/whoami` (顯示您的發送者 ID；別名：`/id`)
- `/session idle <duration|off>` (管理已聚焦執行緒綁定的閒置自動取消聚焦)
- `/session max-age <duration|off>` (管理已聚焦執行緒綁定的強制最大時間自動取消聚焦)
- `/subagents list|kill|log|info|send|steer|spawn` (檢查、控制或生成當前工作階段的子代理程式執行)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (檢查並控制 ACP 執行階段工作階段)
- `/agents` (列出此工作階段的執行緒綁定代理程式)
- `/focus <target>` (Discord：將此執行緒或新執行緒綁定至工作階段/子代理程式目標)
- `/unfocus` (Discord：移除當前的執行緒綁定)
- `/kill <id|#|all>` (立即中止此工作階段的一個或所有執行中的子代理程式；無確認訊息)
- `/steer <id|#> <message>` (立即引導執行中的子代理程式：盡可能在執行中進行，否則中止當前工作並依據引導訊息重新開始)
- `/tell <id|#> <message>` (`/steer` 的別名)
- `/config show|get|set|unset` (將設定保存至磁碟，僅限擁有者；需要 `commands.config: true`)
- `/mcp show|get|set|unset` (管理 OpenClaw MCP 伺服器設定，僅限擁有者；需要 `commands.mcp: true`)
- `/plugins list|show|get|install|enable|disable` （檢查發現的外掛、安裝新的外掛並切換啟用狀態；僅限擁有者寫入；需要 `commands.plugins: true`）
  - `/plugin` 是 `/plugins` 的別名。
  - `/plugin install <spec>` 接受與 `openclaw plugins install` 相同的外掛規格：本機路徑/壓縮檔、npm 套件或 `clawhub:<pkg>`。
  - 啟用/停用寫入操作仍會回覆重啟提示。在被監視的前端 Gateway 上，OpenClaw 可能會在寫入操作後立即自動執行該重啟。
- `/debug show|set|unset|reset` （執行時期覆寫，僅限擁有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost` （每次回應的使用量頁尾或本機成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (控制 TTS；請參閱 [/tts](/en/tools/tts))
  - Discord：原生指令為 `/voice`（Discord 保留 `/tts`）；文字 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` （別名：`/dock_telegram`）（將回應切換至 Telegram）
- `/dock-discord` （別名：`/dock_discord`）（將回應切換至 Discord）
- `/dock-slack` （別名：`/dock_slack`）（將回應切換至 Slack）
- `/activation mention|always` （僅限群組）
- `/send on|off|inherit` （僅限擁有者）
- `/reset` 或 `/new [model]` （選用的模型提示；其餘部分將被傳遞）
- `/think <off|minimal|low|medium|high|xhigh>` （依模型/提供者動態選擇；別名：`/thinking`、`/t`）
- `/fast status|on|off` （省略參數會顯示當前有效的快速模式狀態）
- `/verbose on|full|off` （別名：`/v`）
- `/reasoning on|off|stream` （別名：`/reason`；開啟時，發送一條前綴為 `Reasoning:` 的單獨訊息；`stream` = 僅限 Telegram 草稿）
- `/elevated on|off|ask|full`（別名：`/elev`；`full` 跳過執行核准）
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`（發送 `/exec` 以顯示當前內容）
- `/model <name>`（別名：`/models`；或從 `agents.defaults.models.*.alias` 使用 `/<alias>`）
- `/queue <mode>`（加上 `debounce:2s cap:25 drop:summarize` 等選項；發送 `/queue` 以查看當前設定）
- `/bash <command>`（僅限主機；`! <command>` 的別名；需要 `commands.bash: true` + `tools.elevated` 允許清單）
- `/dreaming [on|off|status|help]` (切換全域 dreaming 或顯示狀態；請參閱 [Dreaming](/en/concepts/dreaming))

僅限文字：

- `/compact [instructions]` (請參閱 [/concepts/compaction](/en/concepts/compaction))
- `! <command>` (僅限主機；一次一個；對於長時間執行的工作，請使用 `!poll` + `!stop`)
- `!poll` (檢查輸出 / 狀態；接受選用的 `sessionId`；`/bash poll` 也可使用)
- `!stop` (停止執行中的 bash 工作；接受選用的 `sessionId`；`/bash stop` 也可使用)

備註：

- 指令接受在指令和參數之間加入選用的 `:` (例如 `/think: high`、`/send: on`、`/help:`)。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱 (模糊比對)；如果沒有符合項，文字將被視為訊息內文。
- 如需完整的提供者使用量詳細資訊，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道 `configWrites`。
- 在多重帳號頻道中，以設定為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
- `/usage` 控制每次回應的使用量頁尾；`/usage cost` 會從 OpenClaw 會話記錄中列印本機成本摘要。
- `/restart` 預設為啟用；設定 `commands.restart: false` 可將其停用。
- Discord 專用原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；不提供文字形式）。
- Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 指令參考和運行時行為：[ACP Agents](/en/tools/acp-agents)。
- `/verbose` 用於除錯和額外的可見性；在正常使用中請保持**關閉**。
- `/fast on|off` 會保存會話覆寫。使用 Sessions UI 的 `inherit` 選項來清除它並回退至配置預設值。
- `/fast` 是特定於供應商的：OpenAI/OpenAI Codex 在原生 Responses 端點上將其對映到 `service_tier=priority`，而直接的公開 Anthropic 請求（包括傳送到 `api.anthropic.com` 的 OAuth 驗證流量）則將其對映到 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/en/providers/openai) 和 [Anthropic](/en/providers/anthropic)。
- 相關時仍會顯示工具失敗摘要，但僅當 `/verbose` 為 `on` 或 `full` 時才會包含詳細的失敗文字。
- `/reasoning`（以及 `/verbose`）在群組設定中具有風險：它們可能會洩露您不打算公開的內部推理或工具輸出。建議保持關閉，尤其是在群組聊天中。
- `/model` 會立即保存新的會話模型。
- 如果代理處於空閒狀態，下次運行會立即使用它。
- 如果運行已經處於活動狀態，OpenClaw 會將即時切換標記為待處理，並且僅在乾淨的重試點重新啟動到新模型。
- 如果工具活動或回覆輸出已經開始，待處理的切換可以保持佇列狀態，直到稍後的重試機會或下一個使用者輪次。
- **快速路徑：** 來自允許清單發送者的僅指令訊息會立即處理（繞過佇列 + 模型）。
- **群組提及門控：** 來自允許清單發送者的僅指令訊息會繞過提及要求。
- **內建捷徑（僅限允許清單發送者）：** 某些指令在嵌入一般訊息時也能運作，並會在模型看到其餘文字前被移除。
  - 範例：`hey /status` 會觸發狀態回覆，其餘文字則繼續依照一般流程處理。
- 目前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授權的僅指令訊息會被靜默忽略，而內建的 `/...` token 會被視為純文字。
- **技能指令：** `user-invocable` 技能會以斜線指令形式呈現。名稱會被標準化為 `a-z0-9_`（最多 32 個字元）；衝突時會加上數字後綴（例如 `_2`）。
  - `/skill <name> [input]` 會依名稱執行技能（當原生指令限制無法允許個別技能指令時很有用）。
  - 預設情況下，技能指令會作為一般請求轉發給模型。
  - 技能可以選擇宣告 `command-dispatch: tool`，將指令直接路由到工具（確定性，無模型）。
  - 範例：`/prose`（OpenProse 外掛）— 請參閱 [OpenProse](/en/prose)。
- **原生指令引數：** Discord 會針對動態選項使用自動完成（當您省略必要引數時會顯示按鈕選單）。Telegram 和 Slack 當指令支援選項且您省略引數時會顯示按鈕選單。

## `/tools`

`/tools` 回答的是執行時期的問題，而不是設定問題：**此代理在此對話中現在可以使用什麼**。

- 預設的 `/tools` 為精簡格式，並針對快速瀏覽進行最佳化。
- `/tools verbose` 會加入簡短描述。
- 支援引數的原生指令介面會公開與 `compact|verbose` 相同的模式切換。
- 結果是依會話範圍而定，因此變更代理、通道、執行緒、傳送者授權或模型可能會
  變更輸出。
- `/tools` 包含在執行時期實際可存取的工具，包括核心工具、已連線
  的外掛工具以及通道擁有的工具。

若要編輯設定檔與覆寫值，請使用控制 UI 工具面板或設定/目錄介面，而不要將
`/tools` 視為靜態目錄。

## 使用介面（顯示位置與內容）

- 當啟用量值追蹤時，**提供者使用量/配額**（例如：「Claude 剩餘 80%」）會顯示於目前模型提供者的 `/status` 中。OpenClaw 會將提供者視窗正規化為 `% left`；對於 MiniMax，僅剩餘百分比欄位會在顯示前反轉，而 `model_remains` 回應會偏好聊天模型條目加上帶有模型標籤的計畫標籤。
- 當即時會話快照稀疏時，`/status` 中的 **Token/快取行** 可以回退到最新的逐字稿使用量項目。現有的非零即時值優先，而逐字稿回退也可以在儲存的總數遺失或較小時，恢復作用中的執行時期模型標籤以及較大的提示導向總數。
- **每次回應的 Token/成本** 由 `/usage off|tokens|full` 控制（附加至一般回覆）。
- `/model status` 是關於 **模型/授權/端點**，而非使用量。

## 模型選擇（`/model`）

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

- `/model` 和 `/model list` 會顯示簡潔的編號選擇器（模型系列 + 可用提供者）。
- 在 Discord 上，`/model` 和 `/models` 會開啟互動式選擇器，其中包含提供者和模型下拉式選單以及提交步驟。
- `/model <#>` 從該選擇器中進行選擇（並在可能時偏好目前的提供者）。
- `/model status` 顯示詳細檢視，包括已設定的提供者端點（`baseUrl`）和 API 模式（`api`）（如果有的話）。

## 除錯覆寫

`/debug` 讓您設定 **僅限執行時期** 的設定覆寫（記憶體中，而非磁碟）。僅限擁有者。預設停用；請透過 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

備註：

- 覆寫會立即套用至新的設定讀取，但**不會**寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆寫並返回至磁碟上的設定。

## 設定更新

`/config` 會寫入至您磁碟上的設定（`openclaw.json`）。僅限擁有者。預設停用；請透過 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

備註：

- 設定會在寫入前驗證；無效的變更會被拒絕。
- `/config` 的更新在重新啟動後會持續保留。

## MCP 更新

`/mcp` 會將 OpenClaw 管理的 MCP 伺服器定義寫入 `mcp.servers` 下。僅限擁有者。預設停用；請透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

備註：

- `/mcp` 將設定儲存在 OpenClaw 設定中，而非 Pi 擁有的專案設定中。
- 執行時期配接器會決定哪些傳輸實際上可執行。

## 外掛程式更新

`/plugins` 讓操作員檢查已發現的外掛程式，並在設定中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；請透過 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

備註：

- `/plugins list` 和 `/plugins show` 使用對當前工作區加上磁碟設定的真實外掛程式探索。
- `/plugins enable|disable` 僅更新外掛程式設定；它不會安裝或解除安裝外掛程式。
- 啟用/停用變更後，請重新啟動 gateway 以套用變更。

## 介面備註

- **文字指令** 在一般聊天會話中執行（DM 共用 `main`，群組有自己的會話）。
- **原生指令** 使用獨立會話：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定）
  - Telegram：`telegram:slash:<userId>`（透過 `CommandTargetSessionKey` 指向聊天會話）
- **`/stop`** 以作用中的聊天會話為目標，以便中止當前的執行。
- **Slack：** 單一 `/openclaw` 風格的指令仍然支援 `channels.slack.slashCommand`。如果您啟用 `commands.native`，則必須為每個內建指令建立一個 Slack 指令（名稱與 `/help` 相同）。Slack 的指令參數選單會以暫時性的 Block Kit 按鈕形式提供。
  - Slack 原生例外：請註冊 `/agentstatus`（而不是 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

## BTW 附帶問題

`/btw` 是關於當前會話的快速**附帶問題**。

與一般聊天不同：

- 它使用當前會話作為背景上下文，
- 它作為單獨的**無工具**一次性呼叫執行，
- 它不會改變未來的會話上下文，
- 它不會寫入對話記錄歷史，
- 它是作為即時附帶結果傳送，而非一般的助理訊息。

這使得當您需要臨時釐清某些事項，且同時讓主要任務繼續進行時，`/btw` 非常有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW 附帶問題](/en/tools/btw) 以了解完整行為和客戶端 UX
詳細資訊。
