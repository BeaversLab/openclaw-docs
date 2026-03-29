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
- `/allowlist`（列出/新增/移除允許清單項目）
- `/approve <id> allow-once|allow-always|deny`（解決 exec 核准提示）
- `/context [list|detail|json]`（解釋「情境」；`detail` 顯示每個檔案 + 每個工具 + 每個技能 + 系統提示大小）
- `/btw <question>`（詢問關於當前會話的臨時附帶問題，而不改變未來的會話情境；請參閱 [/tools/btw](/en/tools/btw)）
- `/export-session [path]`（別名：`/export`）（將當前會話匯出為包含完整系統提示的 HTML）
- `/whoami`（顯示您的寄件者 ID；別名：`/id`）
- `/session idle <duration|off>`（管理針對焦點執行緒繫結的非活動自動取消焦點）
- `/session max-age <duration|off>`（管理針對焦點執行緒繫結的硬性最大存留時間自動取消焦點）
- `/subagents list|kill|log|info|send|steer|spawn`（檢查、控制或產生當前會話的子代理執行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（檢查和控制 ACP 執行階段會話）
- `/agents`（列出此會話的執行緒繫結代理）
- `/focus <target>`（Discord：將此執行緒或新執行緒繫結至會話/子代理目標）
- `/unfocus` (Discord: 移除目前的綁定主題)
- `/kill <id|#|all>` (立即中止此會話的一個或多個執行中的子代理；無確認訊息)
- `/steer <id|#> <message>` (立即引導執行中的子代理：盡可能在執行中進行，否則中止目前工作並根據引導訊息重新啟動)
- `/tell <id|#> <message>` (`/steer` 的別名)
- `/config show|get|set|unset` (將設定持久化至磁碟，僅限擁有者；需要 `commands.config: true`)
- `/mcp show|get|set|unset` (管理 OpenClaw MCP 伺服器設定，僅限擁有者；需要 `commands.mcp: true`)
- `/plugins list|show|get|install|enable|disable` (檢視已發現的外掛、安裝新外掛並切換啟用狀態；寫入操作僅限擁有者；需要 `commands.plugins: true`)
  - `/plugin` 是 `/plugins` 的別名。
  - `/plugin install <spec>` 接受與 `openclaw plugins install` 相同的外掛規格：本機路徑/壓縮檔、npm 套件或 `clawhub:<pkg>`。
  - 啟用/停用寫入仍會回覆重啟提示。在被監控的前台閘道上，OpenClaw 可能會在寫入後立即自動執行該重啟。
- `/debug show|set|unset|reset` (執行階段覆寫，僅限擁有者；需要 `commands.debug: true`)
- `/usage off|tokens|full|cost` (每次回覆的使用情況頁尾或本機成本摘要)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (控制 TTS；參見 [/tts](/en/tools/tts))
  - Discord：原生指令為 `/voice` (Discord 保留了 `/tts`)；文字 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` (別名：`/dock_telegram`) (將回覆切換至 Telegram)
- `/dock-discord` (別名：`/dock_discord`) (將回覆切換至 Discord)
- `/dock-slack` (別名：`/dock_slack`) (將回覆切換至 Slack)
- `/activation mention|always` (僅限群組)
- `/send on|off|inherit` (僅限擁有者)
- `/reset` 或 `/new [model]`（可選的模型提示；其餘部分會被傳遞）
- `/think <off|minimal|low|medium|high|xhigh>`（由模型/提供商動態選擇；別名：`/thinking`、`/t`）
- `/fast status|on|off`（省略參數會顯示當前有效的快速模式狀態）
- `/verbose on|full|off`（別名：`/v`）
- `/reasoning on|off|stream`（別名：`/reason`；開啟時，會發送一條帶有 `Reasoning:` 前綴的單獨訊息；`stream` = 僅 Telegram 草稿）
- `/elevated on|off|ask|full`（別名：`/elev`；`full` 會跳過執行審批）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`（發送 `/exec` 以顯示當前值）
- `/model <name>`（別名：`/models`；或從 `agents.defaults.models.*.alias` 使用 `/<alias>`）
- `/queue <mode>`（加上諸如 `debounce:2s cap:25 drop:summarize` 的選項；發送 `/queue` 以查看當前設定）
- `/bash <command>`（僅限主機；`! <command>` 的別名；需要 `commands.bash: true` + `tools.elevated` 允許列表）

僅文字：

- `/compact [instructions]`（請參閱 [/concepts/compaction](/en/concepts/compaction)）
- `! <command>`（僅限主機；一次一個；對長時間運行的任務使用 `!poll` + `!stop`）
- `!poll`（檢查輸出 / 狀態；接受可選的 `sessionId`；`/bash poll` 也可以使用）
- `!stop`（停止運行中的 bash 任務；接受可選的 `sessionId`；`/bash stop` 也可以使用）

注意：

- 指令接受在指令和參數之間加入可選的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；如果沒有相符項目，該文字將被視為訊息本文。
- 如需完整的提供者使用明細，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並會遵守頻道的 `configWrites`。
- 在多帳號頻道中，以設定為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
- `/usage` 控制每次回應的使用量頁尾；`/usage cost` 會從 OpenClaw 會話記錄列印本機成本摘要。
- `/restart` 預設為啟用；請設定 `commands.restart: false` 來停用它。
- Discord 專用原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；無法以文字形式使用）。
- Discord 執行緒綁定指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒綁定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 指令參考與執行時期行為：[ACP Agents](/en/tools/acp-agents)。
- `/verbose` 適用於除錯和額外的可見性；正常使用時請保持**關閉**。
- `/fast on|off` 會保存會話覆蓋設定。使用 Sessions UI 的 `inherit` 選項來清除它，並回退至設定預設值。
- 相關時仍會顯示工具失敗摘要，但僅當 `/verbose` 為 `on` 或 `full` 時，才會包含詳細的失敗文字。
- `/reasoning`（以及 `/verbose`）在群組設定中有風險：它們可能會揭露您不打算公開的內部推理或工具輸出。建議保持關閉，尤其是在群組聊天中。
- **快速路徑：** 來自允許列表發送者的純命令訊息會立即處理（繞過佇列 + 模型）。
- **群組提及閘門：** 來自允許列表發送者的純命令訊息會略過提及要求。
- **內嵌快捷方式（僅限允許列表發送者）：** 某些命令在嵌入一般訊息時也能運作，並會在模型看到剩餘文字之前被移除。
  - 範例：`hey /status` 觸發狀態回覆，剩餘的文字則繼續正常流程。
- 目前包含：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授權的純命令訊息會被無聲忽略，而內嵌的 `/...` 標記會被視為純文字。
- **技能命令：** `user-invocable` 技能會以斜線命令的形式呈現。名稱會被處理為 `a-z0-9_`（最多 32 個字元）；衝突的名稱會加上數字後綴（例如 `_2`）。
  - `/skill <name> [input]` 會依名稱執行技能（當原生命令限制無法提供每個技能的命令時很有用）。
  - 預設情況下，技能命令會作為一般請求轉送給模型。
  - 技能可以選擇性地宣告 `command-dispatch: tool`，將命令直接路由到工具（具確定性，不經過模型）。
  - 範例：`/prose`（OpenProse 外掛程式） — 請參閱 [OpenProse](/en/prose)。
- **原生命令引數：** Discord 針對動態選項使用自動完成功能（當您省略必要引數時會顯示按鈕選單）。Telegram 和 Slack 在命令支援選項且您省略該引數時，會顯示按鈕選單。

## `/tools`

`/tools` 回答的是執行時問題，而非設定問題：**此代理程式目前在這段對話中可使用的功能**。

- 預設的 `/tools` 為精簡模式，並經過最佳化以利快速掃覽。
- `/tools verbose` 會新增簡短描述。
- 支援引數的原生命令介面會顯示與 `compact|verbose` 相同的模式切換。
- 結果的作用域為工作階段，因此更改代理、通道、執行緒、發送者授權或模型可能會改變輸出。
- `/tools` 包含實際上在執行時可存取的工具，包括核心工具、已連接的外掛程式工具以及通道擁有的工具。

若要編輯設定檔和覆寫，請使用控制 UI 工具面板或設定檔/目錄介面，而不要將 `/tools` 視為靜態目錄。

## 使用介面（顯示位置與內容）

- **供應商使用量/配額**（例如：「Claude 剩餘 80%」）會在啟用使用量追蹤時，顯示於目前模型供應商的 `/status` 中。
- **每次回應的 token/成本** 由 `/usage off|tokens|full` 控制（附加至正常回覆）。
- `/model status` 是關於 **模型/授權/端點**，而非使用量。

## 模型選擇 (`/model`)

`/model` 被實作為一個指令。

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

- `/model` 和 `/model list` 會顯示一個簡潔的帶號選擇器（模型系列 + 可用供應商）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含供應商和模型下拉式選單以及提交步驟。
- `/model <#>` 從該選擇器中進行選擇（並在可能的情況下優先使用目前的供應商）。
- `/model status` 會顯示詳細檢視，包括已設定的供應商端點 (`baseUrl`) 和 API 模式 (`api`)（如果有）。

## 偵錯覆寫

`/debug` 讓您可以設定 **僅限執行時** 的設定覆寫（記憶體中，而非磁碟）。僅限擁有者。預設為停用；使用 `commands.debug: true` 啟用。

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

## 設定更新

`/config` 會寫入您的磁碟設定 (`openclaw.json`)。僅限擁有者。預設為停用；使用 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

備註：

- 設定會在寫入前進行驗證；無效的變更會被拒絕。
- `/config` 更新會在重啟後保留。

## MCP 更新

`/mcp` 會將由 OpenClaw 管理的 MCP 伺服器定義寫入 `mcp.servers` 下。�限擁有者使用。預設停用；透過 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

備註：

- `/mcp` 將設定儲存在 OpenClaw 設定中，而非 Pi 擁有的專案設定中。
- 執行時適配器決定哪些傳輸實際上可執行。

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

備註：

- `/plugins list` 和 `/plugins show` 會針對目前的工作區加上磁碟上的設定，使用真實的外掛探索功能。
- `/plugins enable|disable` 僅更新外掛設定；它不會安裝或解除安裝外掛。
- 啟用/停用變更後，請重新啟動閘道以套用變更。

## 介面說明

- **文字指令** 在正常的聊天會話中執行（DM 共用 `main`，群組有自己的會話）。
- **原生指令** 使用獨立的會話：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (前置詞可透過 `channels.slack.slashCommand.sessionPrefix` 設定)
  - Telegram: `telegram:slash:<userId>` (透過 `CommandTargetSessionKey` 以聊天會話為目標)
- **`/stop`** 以目前活躍的聊天會話為目標，以便中止目前的執行。
- **Slack:** `channels.slack.slashCommand` 仍支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 指令 (名稱與 `/help` 相同)。Slack 的指令選單會以暫時性的 Block Kit 按鈕形式呈現。
  - Slack 原生例外：註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了 `/status`。文字 `/status` 在 Slack 訊息中仍然有效。

## BTW 附帶問題

`/btw` 是關於當前會話的快速**附帶問題**。

與一般聊天不同的是：

- 它使用當前會話作為背景上下文，
- 它作為獨立的**無工具**一次性調用運行，
- 它不會改變未來的會話上下文，
- 它不會寫入逐字稿歷史記錄，
- 它會即時地作為側邊結果傳遞，而不是一般的助手訊息。

這讓 `/btw` 在您想要暫時性的釐清，同時讓主要任務繼續進行時非常有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW 附帶問題](/en/tools/btw) 以了解完整行為和客戶端 UX 詳情。
