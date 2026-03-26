---
summary: "Slash 指令：文字與原生比較、設定及支援的指令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash 指令"
---

# Slash 指令

指令由 Gateway 處理。大多數指令必須作為以 `/` 開頭的**獨立** 訊息發送。
主機專用的 bash 聊天指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

有兩個相關的系統：

- **指令 (Commands)**：獨立的 `/...` 訊息。
- **指令詞 (Directives)**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到訊息之前，會從訊息中移除指令詞。
  - 在一般的聊天訊息中（非僅含指令詞），它們被視為「行內提示」，並**不會**持續儲存至工作階段設定。
  - 在僅含指令詞的訊息中（訊息僅包含指令詞），它們會持續儲存至工作階段並回覆確認訊息。
  - 指令詞僅適用於**經授權的發送者**。如果設定了 `commands.allowFrom`，它將是唯一
    使用的允許清單；否則授權來自頻道允許清單/配對加上 `commands.useAccessGroups`。
    未經授權的發送者會將指令詞視為純文字。

還有一些**行內捷徑**（僅限允許清單/經授權的發送者）：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
它們會立即執行，並在模型看到訊息之前被移除，其餘文字則繼續進行正常流程。

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

- `commands.text`（預設為 `true`）可啟用解析聊天訊息中的 `/...`。
  - 在不支援原生指令的介面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使您將此設定為 `false`，文字指令仍然有效。
- `commands.native`（預設 `"auto"`）註冊原生指令。
  - 自動：針對 Discord/Telegram 開啟；針對 Slack 關閉（直到您新增斜線指令）；針對不支援原生的供應商則忽略。
  - 設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆寫各個供應商的設定（布林值或 `"auto"`）。
  - `false` 會在啟動時清除先前在 Discord/Telegram 上註冊的指令。Slack 指令是在 Slack 應用程式中管理，不會自動移除。
- `commands.nativeSkills`（預設 `"auto"`）在支援時會原生註冊 **skill** 指令。
  - 自動：針對 Discord/Telegram 開啟；針對 Slack 關閉（Slack 需要為每個 skill 建立斜線指令）。
  - 設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆寫各個供應商的設定（布林值或 `"auto"`）。
- `commands.bash`（預設 `false`）啟用 `! <cmd>` 以執行主機 shell 指令（`/bash <cmd>` 是別名；需要 `tools.elevated` 允許清單）。
- `commands.bashForegroundMs`（預設 `2000`）控制 bash 在切換到背景模式前等待的時間（`0` 會立即背景執行）。
- `commands.config`（預設 `false`）啟用 `/config`（讀取/寫入 `openclaw.json`）。
- `commands.mcp`（預設 `false`）啟用 `/mcp`（讀取/寫入 OpenClaw 管理的 MCP 配置，位於 `mcp.servers` 下）。
- `commands.plugins`（預設 `false`）啟用 `/plugins`（外掛程式探索/狀態以及啟用/停用切換）。
- `commands.debug`（預設 `false`）啟用 `/debug`（僅執行時期覆寫）。
- `commands.allowFrom` (選用) 為指令授權設定各供應商的允許清單。設定後，這是指令和指令唯一的授權來源 (頻道允許清單/配對和 `commands.useAccessGroups` 會被忽略)。使用 `"*"` 作為全域預設值；特定供應商的金鑰會覆寫它。
- `commands.useAccessGroups` (預設為 `true`) 在未設定 `commands.allowFrom` 時對指令執行允許清單/原則。

## 指令清單

文字 + 原生 (啟用時)：

- `/help`
- `/commands`
- `/skill <name> [input]` (依名稱執行技能)
- `/status` (顯示目前狀態；包含目前模型供應商的使用量/配額 (如果可用))
- `/allowlist` (列出/新增/移除允許清單項目)
- `/approve <id> allow-once|allow-always|deny` (解析執行核准提示)
- `/context [list|detail|json]` (解釋「情境」；`detail` 顯示每個檔案 + 每個工具 + 每個技能 + 系統提示的大小)
- `/btw <question>` (在不改變未來情境的情況下，詢問關於目前會話的暫時性側面問題；請參閱 [/tools/btw](/zh-Hant/tools/btw))
- `/export-session [path]` (別名：`/export`) (將目前會話匯出為包含完整系統提示的 HTML)
- `/whoami` (顯示您的發送者 ID；別名：`/id`)
- `/session idle <duration|off>` (管理已聚焦執行緒綁定的非使用中自動取消聚焦)
- `/session max-age <duration|off>` (管理已聚焦執行緒綁定的硬性最大存在時間自動取消聚焦)
- `/subagents list|kill|log|info|send|steer|spawn` (檢查、控制或生成目前會話的子代理程式執行)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (檢查和控制 ACP 執行階段會話)
- `/agents` (列出此會話的執行緒綁定代理程式)
- `/focus <target>` (Discord：將此執行緒或新執行緒綁定到會話/子代理程式目標)
- `/unfocus` (Discord：移除目前的執行緒綁定)
- `/kill <id|#|all>` (立即中止此會話的一個或多個正在運行的子代理；無確認訊息)
- `/steer <id|#> <message>` (立即導引正在運行的子代理：盡可能在運行中進行，否則中止當前工作並根據導引訊息重啟)
- `/tell <id|#> <message>` (`/steer` 的別名)
- `/config show|get|set|unset` (將設定持久化到磁碟，僅限擁有者；需要 `commands.config: true`)
- `/mcp show|get|set|unset` (管理 OpenClaw MCP 伺服器設定，僅限擁有者；需要 `commands.mcp: true`)
- `/plugins list|show|get|enable|disable` (檢查發現的外掛並切換啟用狀態，寫入僅限擁有者；需要 `commands.plugins: true`)
- `/debug show|set|unset|reset` (運行時覆蓋，僅限擁有者；需要 `commands.debug: true`)
- `/usage off|tokens|full|cost` (每次回應的使用頁尾或本地成本摘要)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (控制 TTS；請參閱 [/tts](/zh-Hant/tools/tts))
  - Discord：原生指令為 `/voice` (Discord 保留 `/tts`)；文字 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` (別名：`/dock_telegram`) (將回應切換至 Telegram)
- `/dock-discord` (別名：`/dock_discord`) (將回應切換至 Discord)
- `/dock-slack` (別名：`/dock_slack`) (將回應切換至 Slack)
- `/activation mention|always` (僅限群組)
- `/send on|off|inherit` (僅限擁有者)
- `/reset` 或 `/new [model]` (可選的模型提示；其餘部分將被傳遞)
- `/think <off|minimal|low|medium|high|xhigh>` (根據模型/提供者的動態選擇；別名：`/thinking`, `/t`)
- `/fast status|on|off` (省略參數會顯示當前有效的快速模式狀態)
- `/verbose on|full|off` (別名：`/v`)
- `/reasoning on|off|stream` （別名：`/reason`；開啟時，傳送一條前綴為 `Reasoning:` 的單獨訊息；`stream` = 僅限 Telegram 草稿）
- `/elevated on|off|ask|full` （別名：`/elev`；`full` 跳過執行核准）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` （傳送 `/exec` 以顯示當前設定）
- `/model <name>` （別名：`/models`；或從 `agents.defaults.models.*.alias` 使用 `/<alias>`）
- `/queue <mode>` （加上諸如 `debounce:2s cap:25 drop:summarize` 的選項；傳送 `/queue` 以查看當前設定）
- `/bash <command>` （僅限主機；`! <command>` 的別名；需要 `commands.bash: true` + `tools.elevated` 許可清單）

僅限文字：

- `/compact [instructions]` （參閱 [/concepts/compaction](/zh-Hant/concepts/compaction)）
- `! <command>` （僅限主機；一次一個；長時間執行的工作請使用 `!poll` + `!stop`）
- `!poll` （檢查輸出 / 狀態；接受可選的 `sessionId`；`/bash poll` 也可用）
- `!stop` （停止執行中的 bash 工作；接受可選的 `sessionId`；`/bash stop` 也可用）

備註：

- 指令接受在指令與參數之間加入可選的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型別名、`provider/model` 或供應商名稱（模糊匹配）；如果無匹配，文字將被視為訊息內容。
- 如需完整的供應商使用明細，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道 `configWrites` 設定。
- 在多帳號頻道中，針對設定的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
- `/usage` 控制每次回應的使用頁尾；`/usage cost` 會從 OpenClaw 工作階段記錄列印本機成本摘要。
- `/restart` 預設為啟用；設定 `commands.restart: false` 可將其停用。
- Discord 專用原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；無法以文字使用）。
- Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 指令參考與執行時期行為：[ACP Agents](/zh-Hant/tools/acp-agents)。
- `/verbose` 用於偵錯與額外可見性；正常使用時請將其保持**關閉**。
- `/fast on|off` 會持續保存工作階段覆寫。請使用工作階段 UI 的 `inherit` 選項來清除它並回復為設定預設值。
- 相關時仍會顯示工具失敗摘要，但僅在 `/verbose` 為 `on` 或 `full` 時才包含詳細的失敗文字。
- `/reasoning`（以及 `/verbose`）在群組設定中有風險：它們可能會揭露您未預期公開的內部推理或工具輸出。建議將其保持關閉，特別是在群組聊天中。
- **快速路徑**：來自允許清單傳送者的純指令訊息會立即處理（略過佇列 + 模型）。
- **群組提及閘門**：來自允許清單傳送者的純指令訊息會略過提及要求。
- **內嵌捷徑（僅限允許清單傳送者）**：某些指令在嵌入一般訊息時也能運作，並會在模型看到剩餘文字前被移除。
  - 範例：`hey /status` 觸發狀態回覆，其餘文字繼續依正常流程處理。
- 目前包含：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
- 未經授權的僅含指令訊息會被無聲忽略，而內聯 `/...` 權杖則會被視為純文字。
- **Skill 指令：** `user-invocable` skills 以斜線指令形式公開。名稱會被正規化為 `a-z0-9_` (最多 32 個字元)；發生衝突時會加上數字後綴 (例如 `_2`)。
  - `/skill <name> [input]` 依名稱執行 skill (當原生指令限制無法允許個別 skill 指令時很有用)。
  - 預設情況下，skill 指令會作為一般請求轉發給模型。
  - Skills 可以選擇性地宣告 `command-dispatch: tool`，以將指令直接路由至工具 (具確定性，不經模型)。
  - 範例：`/prose` (OpenProse 外掛程式) — 參閱 [OpenProse](/zh-Hant/prose)。
- **原生指令引數：** Discord 對動態選項使用自動完成 (當您省略必要引數時則使用按鈕選單)。當指令支援選擇且您省略引數時，Telegram 和 Slack 會顯示按鈕選單。

## 使用介面 (內容顯示位置)

- **供應商使用量/配額** (例如：「Claude 還剩 80%」) 會在啟用使用量追蹤時顯示於 `/status` 中，針對目前的模型供應商。
- **單次回應權杖/成本** 由 `/usage off|tokens|full` 控制 (附加於一般回覆之後)。
- `/model status` 關於 **模型/驗證/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 是作為指令實作的。

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
- 在 Discord 上，`/model` 和 `/models` 會開啟互動式選擇器，包含供應商與模型下拉選單以及提交步驟。
- `/model <#>` 從該選擇器中選取（並在可能時優先使用當前的提供者）。
- `/model status` 顯示詳細視圖，包括已配置的提供者端點（`baseUrl`）和 API 模式（`api`）（如果有）。

## 偵錯覆寫

`/debug` 讓您設定 **僅限執行時** 的配置覆寫（記憶體中，非硬碟）。僅限擁有者。預設停用；請使用 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

備註：

- 覆寫會立即套用於新的配置讀取，但 **不** 會寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆寫並返回硬碟上的配置。

## 配置更新

`/config` 會寫入您的硬碟配置（`openclaw.json`）。僅限擁有者。預設停用；請使用 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

備註：

- 配置會在寫入前進行驗證；無效的變更會被拒絕。
- `/config` 更新會在重新啟動後保留。

## MCP 更新

`/mcp` 會將 OpenClaw 管理的 MCP 伺服器定義寫入 `mcp.servers` 下。僅限擁有者。預設停用；請使用 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

備註：

- `/mcp` 將配置儲存在 OpenClaw 配置中，而非 Pi 擁有的專案設定中。
- 執行時適配器決定哪些傳輸實際上可執行。

## 外掛程式更新

`/plugins` 讓操作員檢查已發現的外掛程式並切換配置中的啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；請使用 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

備註：

- `/plugins list` 和 `/plugins show` 會針對目前的工作區加上硬碟配置進行真實的外掛程式探索。
- `/plugins enable|disable` 僅更新外掛程式配置；它不會安裝或解除安裝外掛程式。
- 在啟用/停用變更後，請重新啟動閘道以套用它們。

## 介面備註

- **文字指令** 在一般聊天會話中執行（DM 共用 `main`，群組則有自己的會話）。
- **原生指令** 使用獨立會話：
  - Discord： `agent:<agentId>:discord:slash:<userId>`
  - Slack： `agent:<agentId>:slack:slash:<userId>` （前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定）
  - Telegram： `telegram:slash:<userId>` （透過 `CommandTargetSessionKey` 指向聊天會話）
- **`/stop`** 指向目前的作用中聊天會話，因此它可以中止目前的執行。
- **Slack：** `channels.slack.slashCommand` 仍然支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 斜線指令（名稱與 `/help` 相同）。Slack 的指令選單是以暫時性的 Block Kit 按鈕形式提供。
  - Slack 原生例外：註冊 `/agentstatus` （而非 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

## BTW 邊問題

`/btw` 是關於目前會話的快速 **邊問題**。

與一般聊天不同：

- 它將目前會話作為背景語境，
- 它作為獨立的 **無工具** 單次呼叫執行，
- 它不會改變未來的會話語境，
- 它不會寫入對話紀錄歷史，
- 它是以即時邊結果的形式傳送，而不是一般的助手訊息。

這使得 `/btw` 在您想要暫時釐清某些事情，同時主要任務繼續進行時非常有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW Side Questions](/zh-Hant/tools/btw) 以了解完整行為和客戶端 UX 細節。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
