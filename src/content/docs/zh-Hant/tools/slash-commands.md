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
- 個別頻道 `channels.<channel>.commands.enforceOwnerForCommands`（可選，預設 `false`）使得僅限擁有者的指令要求 **擁有者身份** 才能在該介面上執行。當 `true` 時，傳送者必須符合已解析的擁有者候選者（例如 `commands.ownerAllowFrom` 中的條目或提供者原生的擁有者元資料），或在內部訊息頻道上持有內部 `operator.admin` 範圍。頻道 `allowFrom` 中的萬用字元條目，或空白/未解析的擁有者候選者清單，是 **不** 夠的 — 僅限擁有者的指令會在該頻道上封閉式地失敗。如果您希望僅限擁有者的指令僅由 `ownerAllowFrom` 和標準指令允許清單進行閘道控制，請將此設定關閉。
- `commands.ownerDisplay` 控制擁有者 ID 在系統提示詞中的顯示方式：`raw` 或 `hash`。
- `commands.ownerDisplaySecret` 可選地設定當 `commands.ownerDisplay="hash"` 時使用的 HMAC 金鑰。
- `commands.allowFrom`（可選）為指令授權設定個別提供者的允許清單。設定後，它是指令和指示的唯一授權來源（頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略）。使用 `"*"` 作為全域預設值；特定提供者的金鑰會覆寫它。
- `commands.useAccessGroups`（預設 `true`）在未設定 `commands.allowFrom` 時，對指令執行允許清單/原則。

## 指令清單

目前的事實來源：

- 核心內建指令來自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 dock 指令來自 `src/auto-reply/commands-registry.data.ts`
- 外掛指令來自外掛 `registerCommand()` 呼叫
- 您的閘道上實際的可用性仍取決於設定標誌、頻道介面以及已安裝/啟用的外掛

### 核心內建指令

目前可用的內建指令：

- `/new [model]` 啟動一個新的工作階段；`/reset` 是重設的別名。
- `/reset soft [message]` 保留目前的對話紀錄，捨棄重複使用的 CLI 後端工作階段 ID，並就地重新執行啟動/系統提示詞載入。
- `/compact [instructions]` 壓縮工作階段內容。請參閱 [/concepts/compaction](/zh-Hant/concepts/compaction)。
- `/stop` 中止目前的執行。
- `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理執行緒綁定的過期時間。
- `/think <level>` 設定思考層級。選項來自於作用中模型的供應商設定檔；常見的層級包括 `off`、`minimal`、`low`、`medium` 和 `high`，僅在支援的情況下提供自訂層級如 `xhigh`、`adaptive`、`max` 或二進位 `on`。別名：`/thinking`、`/t`。
- `/verbose on|off|full` 切換詳細輸出。別名：`/v`。
- `/trace on|off` 切換目前工作階段的外掛程式追蹤輸出。
- `/fast [status|on|off]` 顯示或設定快速模式。
- `/reasoning [on|off|stream]` 切換推論的可見性。別名：`/reason`。
- `/elevated [on|off|ask|full]` 切換提升模式。別名：`/elev`。
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 顯示或設定執行預設值。
- `/model [name|#|status]` 顯示或設定模型。
- `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出供應商或供應商的模型。
- `/queue <mode>` 管理佇列行為 (`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`) 以及諸如 `debounce:2s cap:25 drop:summarize` 等選項。
- `/help` 顯示簡短說明摘要。
- `/commands` 顯示產生的指令目錄。
- `/tools [compact|verbose]` 顯示目前代理人現在可以使用什麼。
- `/status` 顯示執行時狀態，包括供應商的使用量/配額（如有）。
- `/tasks` 列出目前工作階段中作用中或最近的背景任務。
- `/context [list|detail|json]` 說明如何組合上下文。
- `/export-session [path]` 將目前的工作階段匯出為 HTML。別名：`/export`。
- `/export-trajectory [path]` 針對目前的工作階段匯出 JSONL [trajectory bundle](/zh-Hant/tools/trajectory)。別名：`/trajectory`。
- `/whoami` 顯示您的傳送者 ID。別名：`/id`。
- `/skill <name> [input]` 依名稱執行技能。
- `/allowlist [list|add|remove] ...` 管理允許清單項目。僅限文字模式。
- `/approve <id> <decision>` 解決執行認可提示。
- `/btw <question>` 提出側面問題而不改變未來的工作階段上下文。請參閱 [/tools/btw](/zh-Hant/tools/btw)。
- `/subagents list|kill|log|info|send|steer|spawn` 管理目前工作階段的子代理程式執行。
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 工作階段與執行時期選項。
- `/focus <target>` 將目前的 Discord 執行緒或 Telegram 主題/對話綁定至工作階段目標。
- `/unfocus` 移除目前的綁定。
- `/agents` 列出目前工作階段的執行緒綁定代理程式。
- `/kill <id|#|all>` 中止一個或所有正在執行的子代理程式。
- `/steer <id|#> <message>` 向正在執行的子代理程式發送導向指令。別名：`/tell`。
- `/config show|get|set|unset` 讀取或寫入 `openclaw.json`。僅限擁有者。需要 `commands.config: true`。
- `/mcp show|get|set|unset` 讀取或寫入 `mcp.servers` 下的 OpenClaw 管理 MCP 伺服器設定。僅限擁有者。需要 `commands.mcp: true`。
- `/plugins list|inspect|show|get|install|enable|disable` 檢查或修改外掛程式狀態。`/plugin` 為別名。寫入操作僅限擁有者。需要 `commands.plugins: true`。
- `/debug show|set|unset|reset` 管理僅限執行時期的設定覆寫。僅限擁有者。需要 `commands.debug: true`。
- `/usage off|tokens|full|cost` 控制每次回應的使用情況頁尾，或列印本機成本摘要。
- `/tts on|off|status|provider|limit|summary|audio|help` 控制 TTS。請參閱 [/tools/tts](/zh-Hant/tools/tts)。
- `/restart` 在啟用時會重新啟動 OpenClaw。預設值：啟用；設定 `commands.restart: false` 以停用它。
- `/activation mention|always` 設定群組啟用模式。
- `/send on|off|inherit` 設定傳送原則。�限擁有者。
- `/bash <command>` 執行主機 shell 指令。僅限文字。別名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允許清單。
- `!poll [sessionId]` 檢查背景 bash 工作。
- `!stop [sessionId]` 停止背景 bash 工作。

### 生成的 dock 指令

Dock 指令是從支援原生指令的頻道外掛生成的。目前的套件組合：

- `/dock-discord` (別名：`/dock_discord`)
- `/dock-mattermost` (別名：`/dock_mattermost`)
- `/dock-slack` (別名：`/dock_slack`)
- `/dock-telegram` (別名：`/dock_telegram`)

### 附帶的外掛指令

附帶的外掛可以新增更多斜線指令。此存儲庫中目前的附帶指令：

- `/dreaming [on|off|status|help]` 切換記憶體夢境。請參閱 [Dreaming](/zh-Hant/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理裝置配對/設定流程。請參閱 [Pairing](/zh-Hant/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 暫時啟用高風險手機節點指令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 語音設定。在 Discord 上，原生指令名稱是 `/talkvoice`。
- `/card ...` 傳送 LINE 豐富卡預設集。請參閱 [LINE](/zh-Hant/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 檢查並控制附帶的 Codex 應用程式伺服器控制線組。請參閱 [Codex Harness](/zh-Hant/plugins/codex-harness)。
- 僅限 QQBot 的指令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 動態技能指令

使用者可呼叫的技能也會以斜線指令的形式公開：

- `/skill <name> [input]` 始終作為通用入口點運作。
- 當技能/外掛註冊時，技能也可能以直接指令（如 `/prose`）的形式出現。
- 原生技能指令註冊由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

注意事項：

- 指令接受在指令和參數之間使用可選的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；如果沒有相符項，文字將被視為訊息主體。
- 如需完整的提供者使用細分，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道 `configWrites`。
- 在多帳號頻道中，以設定為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳號的 `configWrites`。
- `/usage` 控制每次回應的使用頁尾；`/usage cost` 列印來自 OpenClaw 工作階段日誌的本機成本摘要。
- `/restart` 預設為啟用；設定 `commands.restart: false` 即可停用它。
- `/plugins install <spec>` 接受與 `openclaw plugins install` 相同的外掛規格：本機路徑/封存、npm 套件或 `clawhub:<pkg>`。
- `/plugins enable|disable` 更新外掛設定，並可能提示重新啟動。
- Discord 專用原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；不適用於文字）。
- Discord 執行緒綁定指令 (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) 需要啟用有效的執行緒綁定 (`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`)。
- ACP 指令參考與執行時行為：[ACP Agents](/zh-Hant/tools/acp-agents)。
- `/verbose` 旨在用於除錯和額外的可見性；正常使用時請保持 **關閉 (off)**。
- `/trace` 比 `/verbose` 更窄：它僅顯示外掛擁有的追蹤/除錯行，並保持正常的詳細工具輸出關閉。
- `/fast on|off` 會儲存一個會話覆寫設定。使用 Sessions UI 的 `inherit` 選項來清除它，並回退至組態預設值。
- `/fast` 是特定於供應商的：OpenAI/OpenAI Codex 在原生 Responses 端點上將其映射到 `service_tier=priority`，而直接的公開 Anthropic 請求（包括發送到 `api.anthropic.com` 的 OAuth 驗證流量）則將其映射到 `service_tier=auto` 或 `standard_only`。請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Anthropic](/zh-Hant/providers/anthropic)。
- 相關時仍會顯示工具失敗摘要，但僅在 `/verbose` 為 `on` 或 `full` 時才包含詳細的失敗文字。
- `/reasoning`、`/verbose` 和 `/trace` 在群組設定中有風險：它們可能會暴露您不打算公開的內部推理、工具輸出或外掛診斷資訊。建議將其關閉，特別是在群組聊天中。
- `/model` 會立即儲存新的會話模型。
- 如果代理程式處於閒置狀態，下一次執行會立即使用它。
- 如果執行已經在進行中，OpenClaw 會將即時切換標記為待處理，並僅在乾淨的重試點重新啟動進入新模型。
- 如果工具活動或回覆輸出已經開始，待處理的切換可能會保持排隊狀態，直到稍後的重試機會或下一個使用者輪次。
- **快速路徑：** 來自允許列表發送者的純命令訊息會被立即處理（繞過佇列 + 模型）。
- **群組提及閘門：** 來自允許列表發送者的純命令訊息會繞過提及要求。
- **內嵌捷徑（僅限允許列表發送者）：** 某些命令在嵌入正常訊息時也有效，並會在模型看到剩餘文字之前被移除。
  - 例如：`hey /status` 會觸發狀態回覆，而剩餘文字會繼續正常流程。
- 目前包含：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
- 未授權的純命令訊息會被靜默忽略，而內嵌的 `/...` 權杖則會被視為純文字。
- **技能命令：** `user-invocable` 技能會以斜線命令的形式公開。名稱會被清理為 `a-z0-9_`（最多 32 個字元）；衝突時會加上數字後綴（例如 `_2`）。
  - `/skill <name> [input]` 會依名稱執行技能（當原生命令限制阻止每個技能命令時很有用）。
  - 預設情況下，技能命令會作為正常請求轉送給模型。
  - 技能可以選擇宣告 `command-dispatch: tool` 以將命令直接路由到工具（確定性，無模型）。
  - 例如：`/prose` (OpenProse 外掛) — 請參閱 [OpenProse](/zh-Hant/prose)。
- **原生命令引數：** Discord 使用自動完成功能來處理動態選項（當您省略必要引數時會顯示按鈕選單）。當指令支援選項且您省略引數時，Telegram 和 Slack 會顯示按鈕選單。

## `/tools`

`/tools` 回答的是執行時問題，而非配置問題：**此代理在此對話中現在可以使用什麼**。

- 預設的 `/tools` 是精簡的，並已針對快速掃覽進行最佳化。
- `/tools verbose` 會加入簡短描述。
- 支援引數的原生命令介面會公開與 `compact|verbose` 相同的模式切換。
- 結果的作用範圍僅限於當前工作階段，因此變更代理、頻道、執行緒、傳送者授權或模型都可能會改變輸出。
- `/tools` 包含在執行時實際可存取的工具，包括核心工具、已連線的外掛工具以及頻道擁有的工具。

若要編輯設定檔或覆寫值，請使用 Control UI 的 Tools 面板或 config/catalog 介面，而不要將 `/tools` 視為靜態目錄。

## 使用介面（顯示位置與內容）

- **供應商使用量/配額**（例如：「Claude 剩餘 80%」）會在啟用使用量追蹤時，顯示於當前模型供應商的 `/status` 中。OpenClaw 會將供應商視窗正規化為 `% left`；對於 MiniMax，僅剩餘百分比的欄位會在顯示前進行反轉，而 `model_remains` 的回應會優先選擇聊天模型條目加上帶有模型標籤的方案標籤。
- `/status` 中的 **Token/快取行** 當即時工作階段快照稀疏時，可以回退到最新的逐字稿使用量條目。既有的非零即時值仍然優先採用，而逐字稿回退也能在儲存的總計缺失或較小時，恢復作用中的執行時模型標籤以及較大的以提示為導向的總計。
- **每次回應的 token/成本** 是由 `/usage off|tokens|full` 控制的（附加於一般回覆中）。
- `/model status` 是關於 **模型/授權/端點**，而非使用量。

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

- `/model` 和 `/model list` 會顯示一個精簡的編號選取器（模型系列 + 可用供應商）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選取器，其中包含供應商與模型下拉選單以及一個 Submit 步驟。
- `/model <#>` 會從該選取器中進行選擇（並在可能的情況下優先使用當前供應商）。
- `/model status` 會顯示詳細檢視，包括已設定的供應商端點 (`baseUrl`) 與 API 模式 (`api`)（如果有可用的話）。

## Debug overrides

`/debug` 讓您設定 **僅限執行時期** 的配置覆蓋（記憶體中，而非磁碟）。僅限擁有者。預設停用；請使用 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

注意事項：

- 覆寫會立即套用至新的配置讀取，但**不會**寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆寫並返回磁碟上的配置。

## 外掛程式追蹤輸出

`/trace` 讓您切換 **工作階段範圍的外掛程式追蹤/除錯行**，而無需開啟完整詳細模式。

範例：

```text
/trace
/trace on
/trace off
```

注意事項：

- 不帶參數的 `/trace` 會顯示目前的工作階段追蹤狀態。
- `/trace on` 會為目前的工作階段啟用外掛程式追蹤行。
- `/trace off` 會再次將其停用。
- 外掛程式追蹤行可以出現在 `/status` 中，並作為正常助手回覆後的後續診斷訊息。
- `/trace` 不會取代 `/debug`；`/debug` 仍然管理僅限執行時期的配置覆蓋。
- `/trace` 不會取代 `/verbose`；正常的詳細工具/狀態輸出仍屬於 `/verbose`。

## 配置更新

`/config` 會寫入您的磁碟配置（`openclaw.json`）。僅限擁有者。預設停用；請使用 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

注意事項：

- 配置在寫入前會經過驗證；無效的變更會被拒絕。
- `/config` 更新在重新啟動後仍然保留。

## MCP 更新

`/mcp` 會在 `mcp.servers` 下寫入由 OpenClaw 管理的 MCP 伺服器定義。僅限擁有者。預設停用；請使用 `commands.mcp: true` 啟用。

範例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

注意事項：

- `/mcp` 將配置儲存在 OpenClaw 配置中，而不是 Pi 擁有的專案設定中。
- 執行時期轉接器決定哪些傳輸實際上可執行。

## 外掛程式更新

`/plugins` 讓操作員檢查已發現的外掛程式並在設定中切換啟用狀態。唯讀流程可以使用 `/plugin` 作為別名。預設停用；使用 `commands.plugins: true` 啟用。

範例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

備註：

- `/plugins list` 和 `/plugins show` 會對當前工作區加上磁碟設定使用真實的外掛程式探索。
- `/plugins enable|disable` 僅更新外掛程式設定；它不會安裝或解除安裝外掛程式。
- 啟用/停用變更後，請重新啟動閘道以套用變更。

## 介面備註

- **文字指令** 在正常聊天會話中執行（DM 共用 `main`，群組則有自己的會話）。
- **原生指令** 使用獨立會話：
  - Discord： `agent:<agentId>:discord:slash:<userId>`
  - Slack： `agent:<agentId>:slack:slash:<userId>` (前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定)
  - Telegram： `telegram:slash:<userId>` (透過 `CommandTargetSessionKey` 以聊天會話為目標)
- **`/stop`** 以作用中的聊天會話為目標，因此它可以中止當前的執行。
- **Slack：** `channels.slack.slashCommand` 仍然支援單一 `/openclaw` 風格的指令。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 指令 (名稱與 `/help` 相同)。Slack 的指令選單是以暫時性 Block Kit 按鈕的形式提供。
  - Slack 原生例外：註冊 `/agentstatus` (而非 `/status`)，因為 Slack 保留了 `/status`。Slack 訊息中的文字 `/status` 仍然有效。

## BTW 側面問題

`/btw` 是關於當前會話的快速 **側面問題**。

與正常聊天不同：

- 它使用當前會話作為背景內容，
- 它作為單獨的 **無工具** 單次呼叫執行，
- 它不會改變未來的會話內容，
- 它不會寫入逐字稿歷史記錄，
- 它是以即時側面結果而非一般助手訊息的形式提供。

這使得 `/btw` 在您需要暫時性釐清而主要任務繼續進行時非常有用。

範例：

```text
/btw what are we doing right now?
```

有關完整行為和客戶端 UX
詳細資訊，請參閱 [BTW Side Questions](/zh-Hant/tools/btw)。
