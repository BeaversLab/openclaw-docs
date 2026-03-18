---
summary: "Slash 指令：文字與原生模式、設定及支援的指令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "Slash 指令"
---

# Slash 指令

指令由 Gateway 處理。大多數指令必須作為以 `/` 開頭的**獨立**訊息發送。
僅限主機端使用的 bash 聊天指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

有兩個相關的系統：

- **指令**：獨立的 `/...` 訊息。
- **指令詞 (Directives)**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型查看訊息之前，指令詞會從訊息中移除。
  - 在一般聊天訊息中（非純指令詞），它們會被視為「內聯提示」，並**不會**保留工作階段設定。
  - 在純指令詞訊息中（訊息僅包含指令詞），它們會保留至工作階段並回覆確認。
  - 指令詞僅套用於**已授權的發送者**。如果設定了 `commands.allowFrom`，它是唯一使用的
    允許清單；否則授權來自於頻道允許清單/配對加上 `commands.useAccessGroups`。
    未授權的發送者會看到指令詞被視為純文字。

還有一些**內聯捷徑**（僅限允許清單/已授權的發送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它們會立即執行，並在模型查看訊息之前被移除，其餘文字則繼續正常流程。

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
  - 在沒有原生指令的介面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams），即使您將此項設為 `false`，文字指令仍然有效。
- `commands.native` (預設 `"auto"`) 註冊原生指令。
  - 自動：Discord/Telegram 為開啟；Slack 為關閉 (直到您新增斜線指令)；對不支援原生的供應商則忽略。
  - 設定 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆寫各供應商的設定 (布林值或 `"auto"`)。
  - `false` 會在啟動時清除 Discord/Telegram 上先前註冊的指令。Slack 指令在 Slack 應用程式中管理，不會自動移除。
- `commands.nativeSkills` (預設 `"auto"`) 在支援時會原生註冊 **skill** 指令。
  - 自動：Discord/Telegram 為開啟；Slack 為關閉 (Slack 需要為每個 skill 建立斜線指令)。
  - 設定 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆寫各供應商的設定 (布林值或 `"auto"`)。
- `commands.bash` (預設 `false`) 啟用 `! <cmd>` 以執行主機 shell 指令 (`/bash <cmd>` 為別名；需要 `tools.elevated` 允許清單)。
- `commands.bashForegroundMs` (預設 `2000`) 控制 bash 在切換到背景模式前等待的時間 (`0` 會立即進入背景)。
- `commands.config` (預設 `false`) 啟用 `/config` (讀取/寫入 `openclaw.json`)。
- `commands.debug` (預設 `false`) 啟用 `/debug` (僅執行時期覆寫)。
- `commands.allowFrom` (可選) 為指令授權設定各供應商的允許清單。設定後，這將是指令和指令集的唯一授權來源 (頻道允許清單/配對和 `commands.useAccessGroups` 將被忽略)。使用 `"*"` 作為全域預設值；特定供應商的鍵會覆寫它。
- 當未設定 `commands.allowFrom` 時，`commands.useAccessGroups`（預設 `true`）會對指令執行允許清單/原則。

## 指令清單

文字 + 原生（啟用時）：

- `/help`
- `/commands`
- `/skill <name> [input]`（透過名稱執行技能）
- `/status`（顯示目前狀態；如果可用，包含目前模型提供者的使用量/配額）
- `/allowlist`（列出/新增/移除允許清單項目）
- `/approve <id> allow-once|allow-always|deny`（解決執行核准提示）
- `/context [list|detail|json]`（解釋「情境」；`detail` 顯示每個檔案 + 每個工具 + 每個技能 + 系統提示的大小）
- `/btw <question>`（詢問關於目前會話的暫時性旁支問題，而不會改變未來的會話情境；參見 [/tools/btw](/zh-Hant/tools/btw))
- `/export-session [path]`（別名：`/export`）（將目前會話匯出為包含完整系統提示的 HTML）
- `/whoami`（顯示您的傳送者 ID；別名：`/id`）
- `/session idle <duration|off>`（管理已聚焦執行緒綁定的閒置自動取消聚焦）
- `/session max-age <duration|off>`（管理已聚焦執行緒綁定的硬性最大時間自動取消聚焦）
- `/subagents list|kill|log|info|send|steer|spawn`（檢查、控制或產生目前會話的子代理程式執行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（檢查並控制 ACP 執行時期會話）
- `/agents`（列出此會話的執行緒綁定代理程式）
- `/focus <target>`（Discord：將此執行緒或新執行緒綁定至會話/子代理程式目標）
- `/unfocus`（Discord：移除目前的執行緒綁定）
- `/kill <id|#|all>`（立即中止此會話的一個或所有正在執行的子代理程式；無確認訊息）
- `/steer <id|#> <message>`（立即引導正在執行的子代理程式：盡可能在執行中進行，否則中止目前工作並根據引導訊息重新啟動）
- `/tell <id|#> <message>`（`/steer` 的別名）
- `/config show|get|set|unset` (將配置持久化到磁碟，僅限擁有者；需要 `commands.config: true`)
- `/debug show|set|unset|reset` (運行時覆蓋，僅限擁有者；需要 `commands.debug: true`)
- `/usage off|tokens|full|cost` (每次回應的使用情況頁腳或本地成本摘要)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (控制 TTS；請參閱 [/tts](/zh-Hant/tts))
  - Discord：原生指令為 `/voice` (Discord 保留 `/tts`)；文字 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` (別名：`/dock_telegram`) (將回應切換到 Telegram)
- `/dock-discord` (別名：`/dock_discord`) (將回應切換到 Discord)
- `/dock-slack` (別名：`/dock_slack`) (將回應切換到 Slack)
- `/activation mention|always` (僅限群組)
- `/send on|off|inherit` (僅限擁有者)
- `/reset` 或 `/new [model]` (可選模型提示；其餘部分將傳遞)
- `/think <off|minimal|low|medium|high|xhigh>` (根據模型/提供者動態選擇；別名：`/thinking`、`/t`)
- `/fast status|on|off` (省略參數會顯示當前有效的快速模式狀態)
- `/verbose on|full|off` (別名：`/v`)
- `/reasoning on|off|stream` (別名：`/reason`；開啟時，發送一條以 `Reasoning:` 為前綴的單獨訊息；`stream` = 僅限 Telegram 草稿)
- `/elevated on|off|ask|full` (別名：`/elev`；`full` 跳過執行核准)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (發送 `/exec` 以顯示當前設定)
- `/model <name>` (別名：`/models`；或從 `agents.defaults.models.*.alias` 發送 `/<alias>`)
- `/queue <mode>`（加上如 `debounce:2s cap:25 drop:summarize` 等選項；發送 `/queue` 以查看目前設定）
- `/bash <command>`（僅限主機；`! <command>` 的別名；需要 `commands.bash: true` + `tools.elevated` 允許清單）

僅限文字：

- `/compact [instructions]`（參見 [/concepts/compaction](/zh-Hant/concepts/compaction)）
- `! <command>`（僅限主機；一次一個；對長時間執行的工作使用 `!poll` + `!stop`）
- `!poll`（檢查輸出 / 狀態；接受可選的 `sessionId`；`/bash poll` 也可以）
- `!stop`（停止正在執行的 bash 工作；接受可選的 `sessionId`；`/bash stop` 也可以）

備註：

- 指令接受在指令和參數之間加入可選的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；如果沒有比對，文字將被視為訊息內文。
- 如需完整的提供者使用量明細，請使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 並遵守頻道 `configWrites`。
- 在多帳戶頻道中，以設定為目標的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也會遵守目標帳戶的 `configWrites`。
- `/usage` 控制每次回應的使用量頁尾；`/usage cost` 會從 OpenClaw 工作階段記錄中列印本地成本摘要。
- `/restart` 預設為啟用；設定 `commands.restart: false` 以停用它。
- 僅限 Discord 的原生指令：`/vc join|leave|status` 控制語音頻道（需要 `channels.discord.voice` 和原生指令；無法以文字方式使用）。
- Discord 繫結執行緒的指令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要啟用有效的執行緒繫結（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 指令參考與運行時行為：[ACP Agents](/zh-Hant/tools/acp-agents)。
- `/verbose` 旨在用於除錯和額外的可見性；正常使用時請保持 **關閉 (off)**。
- `/fast on|off` 會保存會話覆寫設定。請使用 Sessions UI 的 `inherit` 選項來清除它，並還原為預設配置。
- 相關時仍會顯示工具失敗摘要，但僅在 `/verbose` 為 `on` 或 `full` 時才包含詳細的失敗文字。
- `/reasoning`（以及 `/verbose`）在群組設定中具有風險：它們可能會洩露您不打算暴露的內部推理或工具輸出。建議將其保持關閉，尤其是在群組聊天中。
- **快速路徑：** 來自允許列表發送者的純指令訊息會立即處理（略過佇列 + 模型）。
- **群組提及閘道：** 來自允許列表發送者的純指令訊息會略過提及要求。
- **內嵌捷徑（僅限允許列表發送者）：** 某些指令在嵌入一般訊息時也有效，並會在模型看到其餘文字前被移除。
  - 範例：`hey /status` 會觸發狀態回覆，而其餘文字會繼續透過正常流程處理。
- 目前包含：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
- 未授權的純指令訊息會被靜默忽略，而內嵌的 `/...` 標記會被視為純文字。
- **Skill 指令：** `user-invocable` skills 會以斜線指令形式公開。名稱會被清理為 `a-z0-9_`（最多 32 個字元）；衝突時會加上數字後綴（例如 `_2`）。
  - `/skill <name> [input]` 透過名稱執行技能（當原生指令限制阻止每個技能指令時很有用）。
  - 預設情況下，技能指令會作為一般請求轉發給模型。
  - 技能可以選擇性地宣告 `command-dispatch: tool`，以將指令直接路由到工具（確定性，無模型）。
  - 範例：`/prose`（OpenProse 外掛）— 請參閱 [OpenProse](/zh-Hant/prose)。
- **原生指令引數：** Discord 針對動態選項使用自動完成（當您省略必要引數時會顯示按鈕選單）。當指令支援選項且您省略引數時，Telegram 和 Slack 會顯示按鈕選單。

## 使用介面（何處顯示什麼）

- **供應商使用量/配額**（例如：「Claude 剩餘 80%」）會在啟用使用量追蹤時，顯示在目前模型供應商的 `/status` 中。
- **每次回應的 tokens/成本** 由 `/usage off|tokens|full` 控制（附加至一般回應）。
- `/model status` 是關於 **模型/驗證/端點**，而非使用量。

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

- `/model` 和 `/model list` 會顯示一個精簡的編號選擇器（模型系列 + 可用供應商）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含供應商和模型下拉選單以及提交步驟。
- `/model <#>` 從該選擇器中選取（並盡可能偏好像目前的供應商）。
- `/model status` 顯示詳細檢視，包括已設定的供應商端點 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

## 偵錯覆寫

`/debug` 讓您可以設定 **僅限執行時期** 的設定覆寫（記憶體，而非磁碟）。僅限所有者。預設為停用；請使用 `commands.debug: true` 啟用。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

備註：

- 覆寫會立即套用到新的設定讀取，但 **不會** 寫入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆寫並返回磁碟上的設定。

## 設定更新

`/config` 寫入您的磁碟組態 (`openclaw.json`)。僅限擁有者。預設停用；透過 `commands.config: true` 啟用。

範例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

備註：

- 組態會在寫入前進行驗證；無效的變更會被拒絕。
- `/config` 更新在重新啟動後仍然保留。

## 介面備註

- **文字指令** 在正常聊天工作階段中執行 (DM 共用 `main`，群組則有自己的工作階段)。
- **原生指令** 使用隔離的工作階段：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>` (前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定)
  - Telegram：`telegram:slash:<userId>` (透過 `CommandTargetSessionKey` 指定目標聊天工作階段)
- **`/stop`** 以目前聊天工作階段為目標，以便中止當前的執行。
- **Slack：** 單一 `/openclaw` 風格的指令仍支援 `channels.slack.slashCommand`。如果您啟用 `commands.native`，您必須為每個內建指令建立一個 Slack 指令 (名稱與 `/help` 相同)。Slack 的指令選單會以暫時性的 Block Kit 按鈕形式呈現。
  - Slack 原生例外：註冊 `/agentstatus` (而非 `/status`)，因為 Slack 保留了 `/status`。在 Slack 訊息中，文字 `/status` 仍然有效。

## BTW 附帶問題

`/btw` 是關於目前工作階段的快速 **附帶問題**。

與正常聊天不同的是：

- 它使用目前的工作階段作為背景內容，
- 它作為單獨的 **無工具** 單次呼叫執行，
- 它不會改變未來的工作階段內容，
- 它不會寫入逐字稿歷史記錄，
- 它是以即時側邊結果而非正常的助理訊息傳送。

這使得 `/btw` 在您想要主要任務繼續進行時的臨時釐清非常有用。

範例：

```text
/btw what are we doing right now?
```

請參閱 [BTW 附帶問題](/zh-Hant/tools/btw) 以了解完整的行為和客戶端 UX 細節。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
