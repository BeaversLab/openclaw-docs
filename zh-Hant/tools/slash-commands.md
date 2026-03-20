---
summary: "斜線指令：文字與原生、設定及支援的指令"
read_when:
  - 使用或設定聊天指令
  - 偵錯指令路由或權限
title: "斜線指令"
---

# 斜線指令

指令由 Gateway 處理。大多數指令必須作為以 `/` 開頭的 **獨立** 訊息傳送。
�限主機使用的 bash 聊天指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

有兩個相關的系統：

- **指令**：獨立的 `/...` 訊息。
- **指示詞**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 指示詞會在模型看到訊息之前從訊息中移除。
  - 在一般聊天訊息中（非僅指示詞），它們會被視為「行內提示」，並且**不會**保留工作階段設定。
  - 在僅指示詞的訊息中（訊息僅包含指示詞），它們會保留到工作階段並回覆確認。
  - 指示詞僅適用於 **已授權的傳送者**。如果設定了 `commands.allowFrom`，它是唯一使用的
    允許清單；否則授權來自頻道允許清單/配對加上 `commands.useAccessGroups`。
    未授權的傳送者會將指示詞視為純文字。

還有一些 **行內捷徑**（僅限允許清單/已授權的傳送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它們會立即執行，在模型看到訊息之前被移除，並且剩餘的文字會繼續執行正常流程。

## Config

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

- `commands.text`（預設 `true`）啟用在聊天訊息中解析 `/...`。
  - 在沒有原生指令的介面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams），即使您將此設為 `false`，文字指令仍然有效。
- `commands.native` (預設 `"auto"`) 註冊原生指令。
  - Auto：Discord/Telegram 為開啟；Slack 為關閉（直到您新增斜線指令）；對不支援原生的供應商則會忽略。
  - 設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以針對各供應商進行覆寫 (bool 或 `"auto"`)。
  - `false` 會在啟動時清除 Discord/Telegram 上先前註冊的指令。Slack 指令是在 Slack 應用程式中管理，不會自動移除。
- `commands.nativeSkills` (預設 `"auto"`) 在受支援時會原生註冊 **skill** 指令。
  - Auto：Discord/Telegram 為開啟；Slack 為關閉（Slack 需要為每個技能建立一個斜線指令）。
  - 設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以針對各供應商進行覆寫 (bool 或 `"auto"`)。
- `commands.bash` (預設 `false`) 啟用 `! <cmd>` 以執行主機 shell 指令 (`/bash <cmd>` 為別名；需要 `tools.elevated` 允許列表)。
- `commands.bashForegroundMs` (預設 `2000`) 控制 bash 在切換到背景模式前等待的時間 (`0` 會立即進入背景)。
- `commands.config` (預設 `false`) 啟用 `/config` (讀取/寫入 `openclaw.json`)。
- `commands.mcp` (預設 `false`) 啟用 `/mcp` (讀取/寫入位於 `mcp.servers` 下由 OpenClaw 管理的 MCP 設定)。
- `commands.plugins` (預設 `false`) 啟用 `/plugins` (外掛程式探索/狀態以及啟用/停用切換)。
- `commands.debug` (預設 `false`) 啟用 `/debug` (僅限執行階段覆寫)。
- `commands.allowFrom`（可選）為每個提供者設定用於指令授權的允許清單。設定後，這將是指令和指令集的唯一授權來源（頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定提供者的金鑰會覆蓋它。
- `commands.useAccessGroups`（預設值 `true`）在未設定 `commands.allowFrom` 時對指令執行允許清單/原則。

## 指令清單

文字 + 原生（啟用時）：

- `/help`
- `/commands`
- `/skill <name> [input]`（依名稱執行技能）
- `/status`（顯示目前狀態；包括目前模型提供者的提供者使用量/配額（如有提供））
- `/allowlist`（列出/新增/移除允許清單項目）
- `/approve <id> allow-once|allow-always|deny`（解決執行核准提示）
- `/context [list|detail|json]`（解釋「context」；`detail` 顯示每個檔案 + 每個工具 + 每個技能 + 系統提示的大小）
- `/btw <question>`（詢問有關目前會話的暫時性側面問題，而不改變未來的會語脈；參見 [/tools/btw](/zh-Hant/tools/btw)）
- `/export-session [path]`（別名：`/export`）（將目前會話匯出為含完整系統提示的 HTML）
- `/whoami`（顯示您的寄件者 ID；別名：`/id`）
- `/session idle <duration|off>`（管理針對已聚焦執行緒繫結的非活動自動取消聚焦）
- `/session max-age <duration|off>`（管理針對已聚焦執行緒繫結的硬性最大存留時間自動取消聚焦）
- `/subagents list|kill|log|info|send|steer|spawn`（檢查、控制或產生目前會話的子代理執行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（檢查和控制 ACP 執行時會話）
- `/agents`（列出此會話的執行緒繫結代理）
- `/focus <target>`（Discord：將此執行緒或新執行緒繫結到會話/子代理目標）
- `/unfocus`（Discord：移除目前的執行緒繫結）
- `/kill <id|#|all>`（立即中止此會話中的一個或多個正在運行的子代理；無確認訊息）
- `/steer <id|#> <message>`（立即引導正在運行的子代理：盡可能在運行中進行，否則中止當前工作並根據引導訊息重新啟動）
- `/tell <id|#> <message>`（`/steer` 的別名）
- `/config show|get|set|unset`（將設定保存到磁碟，僅限所有者；需要 `commands.config: true`）
- `/mcp show|get|set|unset`（管理 OpenClaw MCP 伺服器設定，僅限所有者；需要 `commands.mcp: true`）
- `/plugins list|show|get|enable|disable`（檢查已發現的外掛並切換啟用狀態，寫入操作僅限所有者；需要 `commands.plugins: true`）
- `/debug show|set|unset|reset`（執行時覆寫，僅限所有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每次回應的使用情況頁尾或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；參見 [/tts](/zh-Hant/tts)）
  - Discord：原生指令為 `/voice`（Discord 保留了 `/tts`）；純文字 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram`（別名：`/dock_telegram`）（將回應切換至 Telegram）
- `/dock-discord`（別名：`/dock_discord`）（將回應切換至 Discord）
- `/dock-slack`（別名：`/dock_slack`）（將回應切換至 Slack）
- `/activation mention|always`（僅限群組）
- `/send on|off|inherit`（僅限所有者）
- `/reset` 或 `/new [model]`（可選的模型提示；其餘部分將被傳遞）
- `/think <off|minimal|low|medium|high|xhigh>`（根據模型/提供者的動態選擇；別名：`/thinking`、`/t`）
- `/fast status|on|off`（省略參數會顯示當前有效的快速模式狀態）
- `/verbose on|full|off`（別名：`/v`）
- `/reasoning on|off|stream` (別名：`/reason`；開啟時，發送一條前綴為 `Reasoning:` 的獨立訊息；`stream` = 僅限 Telegram 草稿)
- `/elevated on|off|ask|full` (別名：`/elev`；`full` 跳過執行審核)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (發送 `/exec` 以顯示當前狀態)
- `/model <name>` (別名：`/models`；或是從 `agents.defaults.models.*.alias` 執行 `/<alias>`)
- `/queue <mode>` (加上像 `debounce:2s cap:25 drop:summarize` 這類選項；發送 `/queue` 以查看當前設定)
- `/bash <command>` (僅限主機；`! <command>` 的別名；需要 `commands.bash: true` + `tools.elevated` 允許清單)

僅文字：

- `/compact [instructions]` (參見 [/concepts/compaction](/zh-Hant/concepts/compaction))
- `! <command>` (僅限主機；一次一個；對於長時間執行的工作，請使用 `!poll` + `!stop`)
- `!poll` (檢查輸出 / 狀態；接受可選的 `sessionId`；`/bash poll` 也可以使用)
- `!stop` (停止正在執行的 bash 工作；接受可選的 `sessionId`；`/bash stop` 也可以使用)

備註：

- 指令接受在指令和參數之間加入一個可選的 `:` (例如 `/think: high`、`/send: on`、`/help:`)。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱 (模糊比對)；如果沒有比對到，該文字將被視為訊息內容。
- 若要查看完整的提供者使用情況明細，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵循頻道的 `configWrites`。
- 在多帳號頻道中，針對設定的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵循目標帳號的 `configWrites`。
- `/usage` 控制每次回應的使用情況頁尾；`/usage cost` 會從 OpenClaw 會話記錄列印本機成本摘要。
- `/restart` 預設為啟用；設定 `commands.restart: false` 可將其停用。
- Discord 專用的原生指令：`/vc join|leave|status` 可控制語音頻道（需要 `channels.discord.voice` 和原生指令；不提供文字版本）。
- Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 指令參考與執行時行為：[ACP Agents](/zh-Hant/tools/acp-agents)。
- `/verbose` 用於除錯與額外的可見性；正常使用時請保持 **關閉 (off)**。
- `/fast on|off` 會保存會話覆寫。請使用 Sessions UI 的 `inherit` 選項將其清除，並還原為設定預設值。
- 在相關時仍會顯示工具失敗摘要，但僅在 `/verbose` 為 `on` 或 `full` 時才會包含詳細的失敗文字。
- `/reasoning`（以及 `/verbose`）在群組環境中有風險：它們可能揭露您不打算公開的內部推理或工具輸出。建議將其保持關閉，特別是在群組聊天中。
- **快速路徑：** 來自允許清單發送者的僅指令訊息會立即處理（略過佇列 + 模型）。
- **群組提及閘控：** 來自允許清單發送者的僅指令訊息可略過提及要求。
- **內嵌捷徑（僅限允許清單發送者）：** 某些指令在嵌入一般訊息中時也有效，並會在模型看到其餘文字之前被移除。
  - 範例：`hey /status` 會觸發狀態回覆，而其餘文字會繼續依照正常流程處理。
- 目前包含：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
- 未經授權的純命令訊息會被靜默忽略，而內聯 `/...` 標記則會被視為純文字。
- **技能指令：** `user-invocable` 技能會以斜線指令形式公開。名稱會被清理為 `a-z0-9_` (最多 32 個字元)；若名稱重複則會加上數字後綴 (例如 `_2`)。
  - `/skill <name> [input]` 會依名稱執行技能 (當原生指令限制導致無法為每個技能建立指令時很有用)。
  - 預設情況下，技能指令會作為一般請求轉送給模型。
  - 技能可以選擇宣告 `command-dispatch: tool`，以便將指令直接路由至工具 (確定性，不經過模型)。
  - 範例：`/prose` (OpenProse 外掛) — 請參閱 [OpenProse](/zh-Hant/prose)。
- **原生指令參數：** Discord 使用自動完成功能來處理動態選項 (當您省略必要參數時則會顯示按鈕選單)。Telegram 和 Slack 當指令支援選項且您省略參數時會顯示按鈕選單。

## 使用介面 (顯示位置說明)

- **供應商使用量/配額** (例如：「Claude 剩餘 80%」) 會在啟用使用量追蹤時，顯示於當前模型供應商的 `/status` 中。
- **每次回應的 Token/費用** 由 `/usage off|tokens|full` 控制 (附加於一般回應中)。
- `/model status` 是關於 **模型/認證/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 是以指令形式實作的。

範例：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:default
/model status
```

備註：

- `/model` 和 `/model list` 會顯示精簡的編號選擇器 (模型系列 + 可用供應商)。
- 在 Discord 上，`/model` 和 `/models` 會開啟互動式選擇器，包含供應商和模型下拉選單以及提交步驟。
- `/model <#>` 從該選擇器中進行選擇（並在可能的情況下優先使用目前的提供者）。
- `/model status` 顯示詳細視圖，包括設定的提供者端點 (`baseUrl`) 和 API 模式 (`api`)（如有）。

## Debug overrides

`/debug` 允許您設定 **僅限運行時** 的設定覆寫（記憶體中，而非磁碟）。僅限擁有者。預設停用；透過 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

備註：

- 覆寫會立即套用至新的設定讀取，但 **不會** 寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆寫並返回磁碟上的設定。

## Config updates

`/config` 會寫入您磁碟上的設定 (`openclaw.json`)。僅限擁有者。預設停用；透過 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

備註：

- 設定在寫入前會經過驗證；無效的變更將被拒絕。
- `/config` 更新會在重新啟動後保留。

## MCP updates

`/mcp` 會在 `mcp.servers` 下寫入由 OpenClaw 管理的 MCP 伺服器定義。僅限擁有者。預設停用；透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

備註：

- `/mcp` 將設定儲存在 OpenClaw 設定中，而非 Pi 擁有的專案設定中。
- Runtime adapters 決定哪些傳輸實際上可執行。

## Plugin updates

`/plugins` 允許操作員檢查已發現的外掛並在設定中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；透過 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

備註：

- `/plugins list` 和 `/plugins show` 會針對目前的工作區加上磁碟上的設定使用真實的外掛探索功能。
- `/plugins enable|disable` 僅更新外掛設定；它不會安裝或解除安裝外掛。
- 啟用/停用變更後，請重新啟動 gateway 以套用變更。

## Surface notes

- **文字指令** 在正常的聊天會話中執行（DM 共用 `main`，群組則有自己的會話）。
- **原生指令**使用獨立的會話：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定）
  - Telegram：`telegram:slash:<userId>`（透過 `CommandTargetSessionKey` 鎖定聊天會話）
- **`/stop`** 鎖定目前的聊天會話，因此它可以中止當前的執行。
- **Slack：** `channels.slack.slashCommand` 仍支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 斜線指令（名稱與 `/help` 相同）。Slack 的指令選單會以暫時性的 Block Kit 按鈕形式呈現。
  - Slack 原生例外：請註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了 `/status`。Slack 訊息中的文字 `/status` 仍然有效。

## BTW 側面問題

`/btw` 是關於當前會話的快速 **側面問題**。

不同於一般聊天：

- 它將當前會話作為背景語境，
- 它作為單獨的 **無工具** 單次呼叫執行，
- 它不會改變未來的會話語境，
- 它不會被寫入對話紀錄歷史，
- 它是以即時側面結果呈現，而非一般的助手訊息。

這使得 `/btw` 在主要任務持續進行時，當您需要暫時性釐清時非常有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW Side Questions](/zh-Hant/tools/btw) 以了解完整行為和客戶端 UX
細節。

import en from "/components/footer/en.mdx";

<en />
