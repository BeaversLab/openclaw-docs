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
- `commands.restart`（預設 `true`）啟用 `/restart` 以及 gateway restart 工具操作。
- `commands.ownerAllowFrom`（可選）為僅限所有者的指令/工具介面設定明確的所有者允許清單。這與 `commands.allowFrom` 是分開的。
- `commands.ownerDisplay` 控制所有者 ID 在系統提示中的顯示方式：`raw` 或 `hash`。
- `commands.ownerDisplaySecret` 可選設定當 `commands.ownerDisplay="hash"` 時使用的 HMAC 密鑰。
- `commands.allowFrom`（可選）為指令授權設定各提供者的允許清單。設定後，它將是指令和指令的唯一授權來源（頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定提供者的金鑰會覆寫它。
- `commands.useAccessGroups`（預設 `true`）在未設定 `commands.allowFrom` 時，對指令執行允許清單/策略。

## 指令清單

目前的唯一真相來源：

- 核心內建指令來自 `src/auto-reply/commands-registry.shared.ts`
- 產生的 dock 指令來自 `src/auto-reply/commands-registry.data.ts`
- 外掛程式指令來自外掛程式 `registerCommand()` 呼叫
- 在您的 gateway 上實際的可用性仍取決於設定旗標、頻道介面以及已安裝/啟用的外掛程式

### 核心內建指令

目前可用的內建指令：

- `/new [model]` 啟動一個新工作階段；`/reset` 是重設別名。
- `/compact [instructions]` 壓縮會話上下文。請參閱 [/concepts/compaction](/en/concepts/compaction)。
- `/stop` 中止當前的執行。
- `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理執行緒綁定的到期。
- `/think <off|minimal|low|medium|high|xhigh>` 設定思考等級。別名：`/thinking`、`/t`。
- `/verbose on|off|full` 切換詳細輸出。別名：`/v`。
- `/fast [status|on|off]` 顯示或設定快速模式。
- `/reasoning [on|off|stream]` 切換推論可見性。別名：`/reason`。
- `/elevated [on|off|ask|full]` 切換提權模式。別名：`/elev`。
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 顯示或設定 exec 預設值。
- `/model [name|#|status]` 顯示或設定模型。
- `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出提供者或提供者的模型。
- `/queue <mode>` 管理佇列行為（`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`）以及 `debounce:2s cap:25 drop:summarize` 等選項。
- `/help` 顯示簡短說明摘要。
- `/commands` 顯示生成的指令目錄。
- `/tools [compact|verbose]` 顯示當前代理現在可以使用的內容。
- `/status` 顯示執行時狀態，包括提供者使用量/配額（如果可用）。
- `/tasks` 列出目前工作階段的啟用中/最近背景任務。
- `/context [list|detail|json]` 說明如何組合上下文。
- `/export-session [path]` 將當前工作階段匯出為 HTML。別名：`/export`。
- `/whoami` 顯示您的寄件者 ID。別名：`/id`。
- `/skill <name> [input]` 依名稱執行技能。
- `/allowlist [list|add|remove] ...` 管理允許清單項目。僅限文字。
- `/approve <id> <decision>` 解析 exec 核准提示。
- `/btw <question>` 提出一個側面問題，而不改變未來的會話上下文。請參閱 [/tools/btw](/en/tools/btw)。
- `/subagents list|kill|log|info|send|steer|spawn` 管理目前工作階段的子代理執行。
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 工作階段和執行時選項。
- `/focus <target>` 將目前的 Discord 執行緒或 Telegram 主題/對話綁定到工作階段目標。
- `/unfocus` 移除目前的綁定。
- `/agents` 列出目前工作階段的執行緒綁定代理。
- `/kill <id|#|all>` 中止一個或所有正在執行的子代理。
- `/steer <id|#> <message>` 向正在運行的子代理發送指引。別名：`/tell`。
- `/config show|get|set|unset` 讀取或寫入 `openclaw.json`。僅限所有者。需要 `commands.config: true`。
- `/mcp show|get|set|unset` 讀取或寫入位於 `mcp.servers` 的 OpenClaw 管理的 MCP 伺服器配置。僅限所有者。需要 `commands.mcp: true`。
- `/plugins list|inspect|show|get|install|enable|disable` 檢查或變更插件狀態。`/plugin` 是一個別名。寫入操作僅限所有者。需要 `commands.plugins: true`。
- `/debug show|set|unset|reset` 管理僅運行時配置覆蓋。僅限所有者。需要 `commands.debug: true`。
- `/usage off|tokens|full|cost` 控制每次回應的使用情況頁尾或列印本機成本摘要。
- `/tts on|off|status|provider|limit|summary|audio|help` 控制文字轉語音 (TTS)。請參閱 [/tools/tts](/en/tools/tts)。
- `/restart` 在啟用時重啟 OpenClaw。預設：已啟用；設定 `commands.restart: false` 以停用它。
- `/activation mention|always` 設定群組啟用模式。
- `/send on|off|inherit` 設定傳送策略。僅限所有者。
- `/bash <command>` 執行主機 shell 指令。僅文字。別名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允許清單。
- `!poll [sessionId]` 檢查背景 bash 任務。
- `!stop [sessionId]` 停止背景 bash 任務。

### 生成的 Dock 指令

Dock 指令是從支援原生指令的頻道插件生成的。目前的捆綁集合：

- `/dock-discord`（別名：`/dock_discord`）
- `/dock-mattermost`（別名：`/dock_mattermost`）
- `/dock-slack`（別名：`/dock_slack`）
- `/dock-telegram`（別名：`/dock_telegram`）

### 捆綁插件指令

捆綁插件可以新增更多斜線指令。此 repo 中目前的捆綁指令：

- `/dreaming [on|off|status|help]` 切換記憶夢境。請參閱 [Dreaming](/en/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理裝置配對/設定流程。請參閱 [Pairing](/en/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 暫時啟用高風險手機節點指令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 語音設定。在 Discord 上，原生指令名稱為 `/talkvoice`。
- `/card ...` 發送 LINE 豐富卡預設。請參閱 [LINE](/en/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 檢查和控制內建的 Codex 應用程式伺服器測試工具。請參閱 [Codex Harness](/en/plugins/codex-harness)。
- 僅限 QQBot 的指令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 動態技能指令

使用者可呼叫的技能也會以斜線指令的形式公開：

- `/skill <name> [input]` 始終作為通用入口點使用。
- 當技能/外掛註冊時，技能也可能會以直接指令的形式出現，例如 `/prose`。
- 原生技能指令註冊由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

備註：

- 指令接受在指令和參數之間使用可選的 `:` (例如 `/think: high`、`/send: on`、`/help:`)。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱 (模糊匹配)；如果沒有匹配，該文字將被視為訊息正文。
- 如需完整的提供者使用細節，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵守通道 `configWrites`。
- 在多賬號頻道中，針對配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵循目標賬號的 `configWrites`。
- `/usage` 控制每次回應的使用情況頁腳；`/usage cost` 會從 OpenClaw 會話日誌中列印本地成本摘要。
- `/restart` 預設為啟用；設定 `commands.restart: false` 即可將其停用。
- `/plugins install <spec>` 接受與 `openclaw plugins install` 相同的外掛程式規格：本機路徑/封存檔、npm 套件或 `clawhub:<pkg>`。
- `/plugins enable|disable` 會更新外掛程式配置，並可能提示您重新啟動。
- Discord 專用原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；不適用於文字）。
- Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 指令參考和執行時行為：[ACP Agents](/en/tools/acp-agents)。
- `/verbose` 是用於除錯和額外可見性的；在正常使用中請將其設為 **off**（關閉）。
- `/fast on|off` 會保存會話覆寫設定。請使用 Sessions UI 中的 `inherit` 選項來清除它，並還原為預設配置。
- `/fast` 是特定於供應商的：OpenAI/OpenAI Codex 在原生 Responses 端點上將其對應到 `service_tier=priority`，而直接公開的 Anthropic 請求（包括發送到 `api.anthropic.com` 的經過 OAuth 認證的流量）則將其對應到 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/en/providers/openai) 和 [Anthropic](/en/providers/anthropic)。
- 當相關時仍會顯示工具失敗摘要，但只有當 `/verbose` 為 `on` 或 `full` 時，才會包含詳細的失敗文字。
- `/reasoning`（以及 `/verbose`）在群組設定中是有風險的：它們可能會揭露您不想公開的內部推理或工具輸出。建議保持關閉，特別是在群組聊天中。
- `/model` 會立即保存新的 session 模型。
- 如果代理處於閒置狀態，下次運行會立即使用它。
- 如果運行已經在進行中，OpenClaw 會將即時切換標記為待處理，並且只在乾淨的重試點重啟到新模型。
- 如果工具活動或回覆輸出已經開始，待處理的切換可以保持排隊，直到稍後的重試機會或下一個使用者輪次。
- **快速路徑：** 來自允許列表發送者的純指令訊息會被立即處理（繞過佇列 + 模型）。
- **群組提及閘門：** 來自允許列表發送者的純指令訊息會繞過提及要求。
- **內嵌捷徑（僅限允許列表發送者）：** 某些指令在嵌入正常訊息時也有效，並且會在模型看到剩餘文字之前被移除。
  - 範例：`hey /status` 觸發狀態回覆，剩餘的文字繼續正常流程。
- 目前：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授權的純指令訊息會被靜默忽略，內嵌的 `/...` token 則被視為純文字。
- **Skill 指令：** `user-invocable` skills 被公開為斜線指令。名稱會被清理為 `a-z0-9_`（最多 32 個字元）；衝突會加上數字後綴（例如 `_2`）。
  - `/skill <name> [input]` 依名稱執行 skill（當原生指令限制阻止每個 skill 的指令時很有用）。
  - 預設情況下，skill 指令會作為正常請求轉發給模型。
  - Skills 可以選擇性地宣告 `command-dispatch: tool` 以將指令直接路由到工具（確定性，無模型）。
  - 範例：`/prose` (OpenProse 外掛程式) — 請參閱 [OpenProse](/en/prose)。
- **原生指令引數：** Discord 對動態選項使用自動完成功能（當您省略必填引數時會顯示按鈕選單）。當指令支援選項且您省略引數時，Telegram 和 Slack 會顯示按鈕選單。

## `/tools`

`/tools` 回答的是執行階段問題，而非設定問題：**此代理程式目前在此對話中可使用的內容**。

- 預設的 `/tools` 為精簡格式，並已針對快速瀏覽進行最佳化。
- `/tools verbose` 會新增簡短描述。
- 支援引數的原生指令介面會顯示與 `compact|verbose` 相同的模式切換開關。
- 結果的作用範圍為工作階段，因此變更代理程式、頻道、執行緒、傳送者授權或模型可能會改變輸出。
- `/tools` 包含在執行階段實際可存取的工具，包括核心工具、已連線的外掛工具以及頻道擁有的工具。

若要編輯設定檔和覆寫設定，請使用控制 UI 工具面板或設定/目錄介面，而不要將 `/tools` 視為靜態目錄。

## 使用介面（內容顯示位置）

- 當啟用量值追蹤時，**供應商使用量/配額**（例如：「Claude 剩餘 80%」）會顯示在目前模型供應商的 `/status` 中。OpenClaw 會將供應商視窗正規化為 `% left`；對於 MiniMax，僅剩餘百分比的欄位會在顯示前進行反向處理，而 `model_remains` 回應則會優先顯示聊天模型項目加上標記模型的計畫標籤。
- 當即時工作階段快照資料稀少時，`/status` 中的 **Token/快取行** 可以退回到最新的文字記錄使用量項目。現有的非零即時值仍然優先採用，而當儲存的總數遺失或較小時，文字記錄退回機制也可以恢復作用中的執行階段模型標籤以及較大的提示導向總數。
- **每次回應的 Token/成本** 由 `/usage off|tokens|full` 控制（附加至一般回覆）。
- `/model status` 是關於 **模型/授權/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 是作為指令實現的。

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

- `/model` 和 `/model list` 顯示一個緊湊的編號選擇器（模型系列 + 可用的提供者）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含提供者和模型下拉選單以及一個提交步驟。
- `/model <#>` 從該選擇器中進行選擇（並在可能的情況下優先使用當前的提供者）。
- `/model status` 顯示詳細視圖，包括配置的提供者端點 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

## 調試覆蓋

`/debug` 允許您設定 **僅運行時** 的配置覆蓋（記憶體，而非磁碟）。僅限所有者。預設停用；透過 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

注意：

- 覆蓋會立即套用於新的配置讀取，但**不會**寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆蓋並返回磁碟上的配置。

## 配置更新

`/config` 會寫入您磁碟上的配置 (`openclaw.json`)。僅限所有者。預設停用；透過 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

注意：

- 配置在寫入前會經過驗證；無效的變更會被拒絕。
- `/config` 的更新在重啟後仍然保留。

## MCP 更新

`/mcp` 會將 OpenClaw 管理的 MCP 伺服器定義寫入 `mcp.servers` 下。僅限所有者。預設停用；透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

注意：

- `/mcp` 將配置儲存在 OpenClaw 配置中，而不是 Pi 擁有的專案設定中。
- 運行時適配器決定哪些傳輸實際上是可執行的。

## 外掛程式更新

`/plugins` 允許操作員檢查已發現的外掛程式並在配置中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；透過 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

注意：

- `/plugins list` 和 `/plugins show` 針對目前工作區加上磁碟設定使用真正的外掛程式探索。
- `/plugins enable|disable` 僅更新外掛程式設定；它不會安裝或解除安裝外掛程式。
- 啟用/停用變更後，請重新啟動 gateway 以套用它們。

## 介面備註

- **文字指令** 在一般聊天階段中執行（DM 共用 `main`，群組則有自己的階段）。
- **原生指令** 使用獨立階段：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (字首可透過 `channels.slack.slashCommand.sessionPrefix` 設定)
  - Telegram: `telegram:slash:<userId>` (透過 `CommandTargetSessionKey` 以聊天階段為目標)
- **`/stop`** 以目前聊天階段為目標，因此它可以中止目前的執行。
- **Slack:** `channels.slack.slashCommand` 仍然支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 斜線指令 (名稱與 `/help` 相同)。Slack 的指令選單會以暫時的 Block Kit 按鈕形式呈現。
  - Slack 原生例外：註冊 `/agentstatus` (而非 `/status`)，因為 Slack 保留了 `/status`。Slack 訊息中的文字 `/status` 仍然有效。

## BTW 側面問題

`/btw` 是關於目前階段的快速 **側面問題**。

與一般聊天不同：

- 它使用目前階段作為背景內容，
- 它作為單獨的 **無工具** 單次呼叫執行，
- 它不會改變未來的階段內容，
- 它不會寫入到歷史記錄中，
- 它是即時側面結果，而非一般的助理訊息。

這使得 `/btw` 在您希望主要任務繼續進行時取得暫時性澄清時很有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW Side Questions](/en/tools/btw) 以了解完整行為和客戶端 UX
細節。
