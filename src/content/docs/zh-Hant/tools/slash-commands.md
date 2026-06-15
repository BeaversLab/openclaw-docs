---
title: "斜線指令"
sidebarTitle: "斜線指令"
summary: "所有可用的斜線指令、指令和內聯快捷方式 — 配置、路由和各個介面的行為。"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
  - Understanding how skill commands are registered
---

閘道會處理以 `/` 開頭的獨立訊息指令。
僅限主機的 bash 指令使用 `! <cmd>`（別名為 `/bash <cmd>`）。

當對話綁定到 ACP 會話時，一般文字會路由到 ACP
harness。閘道管理指令保持本機：`/acp ...` 總是到達
OpenClaw 指令處理程式，而 `/status` 加上 `/unfocus` 在
為該介面啟用指令處理時會保持本機。

## 三種指令類型

<CardGroup cols={3}>
  <Card title="指令" icon="terminal">
    由閘道處理的獨立 `/...` 訊息。必須作為訊息中的 唯一內容發送。
  </Card>
  <Card title="指令" icon="sliders">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、 `/exec`、`/model`、`/queue` — 在模型看到之前從訊息中剝離。 單獨發送時保存會話設定；與其他文字一起發送時作為內聯提示。
  </Card>
  <Card title="內聯快捷方式" icon="bolt">
    `/help`、`/commands`、`/status`、`/whoami` — 立即運行並在 模型看到剩餘文字之前被剝離。僅限授權發送者。
  </Card>
</CardGroup>

<AccordionGroup>
  <Accordion title="指令行為詳細資訊">
    - 指令會在模型看到訊息之前從訊息中移除。 - 在 **僅指令** 訊息（訊息僅包含指令）中，它們會持續儲存在會話中並回覆確認。 - 在包含其他文字的 **一般聊天** 訊息中，它們充當內嵌提示且 **不會** 持續儲存會話設定。 - 指令僅適用於 **授權發送者**。如果設定了 `commands.allowFrom`，它將是唯一使用的允許清單；否則授權來自於頻道允許清單/配對加上 `commands.useAccessGroups`。未授權的發送者會將指令視為純文字。
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
  啟用解析聊天訊息中的 `/...`。在沒有原生指令的介面上（WhatsApp、WebChat、Signal、iMessage、Google Chat、Microsoft Teams），即使設定為 `false`，文字指令仍然有效。
</ParamField>

<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  註冊原生指令。自動：Discord/Telegram 為開啟；Slack 為關閉；對不支援原生的提供者則忽略。使用 `channels.<provider>.commands.native` 針對每個頻道進行覆寫。在 Discord 上，`false` 會跳過斜線指令註冊；先前註冊的指令可能會保持可見狀態直到被移除。
</ParamField>

<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  在支援時原生註冊技能指令。自動：Discord/Telegram 為開啟；Slack 為關閉。使用 `channels.<provider>.commands.nativeSkills` 進行覆寫。
</ParamField>

<ParamField path="commands.bash" type="boolean" default="false">
  啟用 `! <cmd>` 以執行主機 Shell 指令（`/bash <cmd>` 別名）。需要 `tools.elevated` 允許清單。
</ParamField>

<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  Bash 在切換到背景模式前等待的時間（`0` 立即 背景執行）。
</ParamField>

<ParamField path="commands.config" type="boolean" default="false">
  啟用 `/config`（讀取/寫入 `openclaw.json`）。僅限擁有者。
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  啟用 `/mcp`（讀取/寫入 `mcp.servers` 下由 OpenClaw 管理的 MCP 設定）。僅限擁有者。
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  啟用 `/plugins`（外掛程式探索/狀態以及安裝 + 啟用/停用）。寫入僅限擁有者。
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  啟用 `/debug`（僅限執行時期的設定覆寫）。僅限擁有者。
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  啟用 `/restart` 以及 Gateway 重啟工具動作。
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  僅限擁有者指令介面的明確擁有者允許清單。與 `commands.allowFrom` 和 DM 配對存取分開。
</ParamField>

<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每個頻道：僅限擁有者的指令需要擁有者身分。當 `true` 時， 發送者必須符合 `commands.ownerAllowFrom` 或持有內部 `operator.admin` 範圍。萬用字元 `allowFrom` 項目並**不**足夠。
</ParamField>

<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制擁有者 ID 如何顯示在系統提示詞中。
</ParamField>

<ParamField path="commands.ownerDisplaySecret" type="string">
  在 `commands.ownerDisplay: "hash"` 時使用的 HMAC 密鑰。
</ParamField>

<ParamField path="commands.allowFrom" type="object">
  針對指令授權的各供應商允許清單。設定後，這將是指令和指令的**唯一**授權來源。請使用 `"*"` 作為全域預設值；供應商特定的金鑰會覆蓋它。
</ParamField>

<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  當未設定 `commands.allowFrom` 時，對指令強制執行允許清單/原則。
</ParamField>

## 指令清單

指令來自三個來源：

- **核心內建指令：** `src/auto-reply/commands-registry.shared.ts`
- **生成的 Dock 指令：** `src/auto-reply/commands-registry.data.ts`
- **外掛程式指令：** 外掛程式 `registerCommand()` 呼叫

可用性取決於設定旗標、頻道介面以及已安裝/啟用的外掛程式。

### 核心指令

<AccordionGroup>
  <Accordion title="Sessions and runs">
    | Command | Description |
    | --- | --- |
    | `/new [model]` | 封存目前的工作階段並開啟新的工作階段 |
    | `/reset [soft [message]]` | 原地重設目前的工作階段。`soft` 會保留對話紀錄，捨棄重複使用的 CLI 後端工作階段 ID，並重新執行啟動流程 |
    | `/compact [instructions]` | 壓縮工作階段內容。請參閱 [壓縮](/zh-Hant/concepts/compaction) |
    | `/stop` | 中止目前的執行 |
    | `/session idle <duration\|off>` | 管理執行緒綁定的閒置過期時間 |
    | `/session max-age <duration\|off>` | 管理執行緒綁定的最大存活時間過期 |
    | `/export-session [path]` | 將目前的工作階段匯出為 HTML。別名：`/export` |
    | `/export-trajectory [path]` | 將目前的工作階段匯出為 JSONL 軌跡套件。別名：`/trajectory` |

    <Note>
      Control UI 會攔截輸入的 `/new` 以建立並切換至全新的
      儀表板工作階段，除非已設定 `session.dmScope: "main"`
      且目前的父項是 Agent 的主要工作階段 —— 在此情況下，`/new`
      會原地重設主要工作階段。輸入的 `/reset` 仍會執行 Gateway 的
      原地重設功能。
    </Note>

  </Accordion>

  <Accordion title="模型與執行控制">
    | 指令 | 描述 |
    | --- | --- |
    | `/think <level\|default>` | 設定思考層級或清除會話覆寫。別名：`/thinking`、`/t` |
    | `/verbose on\|off\|full` | 切換詳細輸出。別名：`/v` |
    | `/trace on\|off` | 切換目前會話的外掛程式追蹤輸出 |
    | `/fast [status\|on\|off\|default]` | 顯示、設定或清除快速模式 |
    | `/reasoning [on\|off\|stream]` | 切換推理可見性。別名：`/reason` |
    | `/elevated [on\|off\|ask\|full]` | 切換提昇模式。別名：`/elev` |
    | `/exec host=<auto\|sandbox\|gateway\|node> security=<deny\|allowlist\|full> ask=<off\|on-miss\|always> node=<id>` | 顯示或設定執行預設值 |
    | `/model [name\|#\|status]` | 顯示或設定模型 |
    | `/models [provider] [page] [limit=<n>\|all]` | 列出已設定/已授權可用的供應商或模型 |
    | `/queue <mode>` | 管理作用中執行佇列的行為。請參閱 [佇列](/zh-Hant/concepts/queue) 和 [佇列導向](/zh-Hant/concepts/queue-steering) |
    | `/steer <message>` | 導入指引至作用中執行。別名：`/tell`。請參閱 [導向](/zh-Hant/tools/steer) |

    <AccordionGroup>
      <Accordion title="詳細 / 追蹤 / 快速 / 推理安全性">
        - `/verbose` 用於除錯 — 正常使用時請保持**關閉**。
        - `/trace` 僅顯示外掛程式擁有的追蹤/除錯行；正常的詳細閒聊保持關閉。
        - `/fast on|off` 會保存會話覆寫；請使用 Sessions UI 的 `inherit` 選項來清除它。
        - `/fast` 是供應商特定的：OpenAI/Codex 將其對應到 `service_tier=priority`；直接的 Anthropic 請求將其對應到 `service_tier=auto` 或 `standard_only`。
        - `/reasoning`、`/verbose` 和 `/trace` 在群組設定中有風險 — 它們可能會顯示內部推理或外掛程式診斷資訊。在群組聊天中請將其保持關閉。

      </Accordion>
      <Accordion title="模型切換詳情">
        - `/model` 會立即將新模型保存至會話中。
        - 如果代理程式處於閒置狀態，下一次執行會立即使用它。
        - 如果執行正在進行中，切換會標記為待處理，並在下一個乾淨的重試點套用。

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion title="探索與狀態">
    | 指令 | 描述 |
    | --- | --- |
    | `/help` | 顯示簡短求助摘要 |
    | `/commands` | 顯示生成的指令目錄 |
    | `/tools [compact\|verbose]` | 顯示目前代理程式現在可使用的功能 |
    | `/status` | 顯示執行/執行階段狀態、Gateway 和系統正常運行時間，以及供應商使用量/配額 |
    | `/goal [status\|start\|pause\|resume\|complete\|block\|clear] ...` | 管理目前會階段的持久性 [goal](/zh-Hant/tools/goal) |
    | `/diagnostics [note]` | 僅限擁有者的支援報告流程。每次都會要求執行核准 |
    | `/crestodian <request>` | 從擁有者的 DM 執行 Crestodian 設定與修復輔助程式 |
    | `/tasks` | 列出目前會階段的使用中/最近背景任務 |
    | `/context [list\|detail\|map\|json]` | 說明內容是如何組裝的 |
    | `/whoami` | 顯示您的傳送者 ID。別名：`/id` |
    | `/usage off\|tokens\|full\|cost` | 控制每次回應的使用頁尾或列印本地成本摘要 |
  </Accordion>

  <Accordion title="技能、允許清單、核准">
    | 指令 | 描述 |
    | --- | --- |
    | `/skill <name> [input]` | 依名稱執行技能 |
    | `/allowlist [list\|add\|remove] ...` | 管理允許清單項目。僅限文字 |
    | `/approve <id> <decision>` | 解決執行或外掛程式核准提示 |
    | `/btw <question>` | 在不變更會階段內容的情況下提出側邊問題。別名：`/side`。參閱 [BTW](/zh-Hant/tools/btw) |
  </Accordion>

  <Accordion title="Subagents and ACP">
    | 指令 | 描述 |
    | --- | --- |
    | `/subagents list\|log\|info` | 檢視目前階段的子代理執行 |
    | `/acp spawn\|cancel\|steer\|close\|sessions\|status\|set-mode\|set\|cwd\|permissions\|timeout\|model\|reset-options\|doctor\|install\|help` | 管理 ACP 階段和執行時期選項 |
    | `/focus <target>` | 將目前的 Discord 執行緒或 Telegram 主題綁定至階段目標 |
    | `/unfocus` | 移除目前的執行緒綁定 |
    | `/agents` | 列出目前階段的執行緒綁定代理 |
  </Accordion>

<Accordion title="Owner-only writes and admin">
  | 指令 | 需求 | 描述 | | --- | --- | --- | | `/config show\|get\|set\|unset` | `commands.config: true` | 讀取或寫入 `openclaw.json`。僅限擁有者 | | `/mcp show\|get\|set\|unset` | `commands.mcp: true` | 讀取或寫入 OpenClaw 管理的 MCP 伺服器設定。僅限擁有者 | | `/plugins list\|inspect\|show\|get\|install\|enable\|disable` | `commands.plugins: true` |
  檢視或變更外掛狀態。寫入僅限擁有者。別名：`/plugin` | | `/debug show\|set\|unset\|reset` | `commands.debug: true` | 僅限執行時期的設定覆寫。僅限擁有者 | | `/restart` | `commands.restart: true` (預設) | 重新啟動 OpenClaw | | `/send on\|off\|inherit` | owner | 設定傳送原則 |
</Accordion>

  <Accordion title="Voice, TTS, channel control">
    | 指令 | 描述 |
    | --- | --- |
    | `/tts on\|off\|status\|chat\|latest\|provider\|limit\|summary\|audio\|help` | 控制 TTS。參閱 [TTS](/zh-Hant/tools/tts) |
    | `/activation mention\|always` | 設定群組啟用模式 |
    | `/bash <command>` | 執行主機 Shell 指令。別名：`! <command>`。需要 `commands.bash: true` |
    | `!poll [sessionId]` | 檢查背景 Bash 任務 |
    | `!stop [sessionId]` | 停止背景 Bash 任務 |
  </Accordion>
</AccordionGroup>

### Dock 指令

Dock 指令將目前使用中階段的回覆路由切換至另一個連結頻道。
參閱 [Channel docking](/zh-Hant/concepts/channel-docking) 以了解設定與疑難排解。

由支援原生指令的通道外掛產生：

- `/dock-discord` (別名: `/dock_discord`)
- `/dock-mattermost` (別名: `/dock_mattermost`)
- `/dock-slack` (別名: `/dock_slack`)
- `/dock-telegram` (別名: `/dock_telegram`)

Dock 指令需要 `session.identityLinks`。來源發送者和目標對等端
必須位於同一個身分群組中。

### 內建外掛指令

| 指令                                                                                         | 說明                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/dreaming [on\|off\|status\|help]`                                                          | 切換記憶夢境模式。請參閱 [夢境](/zh-Hant/concepts/dreaming)                            |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]`                                      | 管理裝置配對。請參閱 [配對](/zh-Hant/channels/pairing)                                 |
| `/phone status\|arm ...\|disarm`                                                             | 暫時啟用高風險手機節點指令                                                        |
| `/voice status\|list\|set <voiceId>`                                                         | 管理 Talk 語音設定。Discord 原生名稱: `/talkvoice`                                |
| `/card ...`                                                                                  | 發送 LINE 豐富卡片預設集。請參閱 [LINE](/zh-Hant/channels/line)                        |
| `/codex status\|models\|threads\|resume\|compact\|review\|diagnostics\|account\|mcp\|skills` | 控制 Codex 應用程式伺服器控制線。請參閱 [Codex 控制線](/zh-Hant/plugins/codex-harness) |

僅限 QQBot: `/bot-ping`, `/bot-version`, `/bot-help`, `/bot-upgrade`, `/bot-logs`

### Skill 指令

使用者可呼叫的技能會以斜線指令形式呈現：

- `/skill <name> [input]` 始終作為通用進入點使用。
- 技能可以註冊為直接指令 (例如 OpenProse 的 `/prose`)。
- 原生技能指令註冊由 `commands.nativeSkills` 和
  `channels.<provider>.commands.nativeSkills` 控制。
- 名稱會被處理為 `a-z0-9_` (最多 32 個字元)；衝突時會附加數字尾碼。

<AccordionGroup>
  <Accordion title="Skill command dispatch">
    預設情況下，技能指令會作為一般請求路由到模型。

    技能可以宣告 `command-dispatch: tool` 以直接路由到工具
    (確定性，不涉及模型)。例如：`/prose` (OpenProse 外掛)
    — 請參閱 [OpenProse](/zh-Hant/prose)。

  </Accordion>
  <Accordion title="Native command arguments">
    Discord 對於動態選項會使用自動完成，當省略必要
    參數時會顯示按鈕選單。Telegram 和 Slack 會針對具有選擇項的指令
    顯示按鈕選單。動態選擇項會根據目標工作階段模型解析，因此模型
    特定選項 (如 `/think` 層級) 會遵循工作階段的 `/model` 覆蓋設定。
  </Accordion>
</AccordionGroup>

## `/tools` — 智慧體目前可使用的工具

`/tools` 回答一個執行時期問題：**此智慧體在此次
對話中目前可使用什麼** — 而非靜態設定目錄。

```text
/tools         # compact view
/tools verbose # with short descriptions
```

結果範圍限於工作階段。變更智慧體、頻道、執行緒、傳送者
授權或模型可能會變更輸出。若要編輯設定檔和覆蓋設定，
請使用控制 UI 工具面板或設定介面。

## `/model` — 模型選擇

```text
/model             # show model picker
/model list        # same
/model 3           # select by number from picker
/model openai/gpt-5.4
/model opus@anthropic:default
/model status      # detailed view with endpoint and API mode
```

在 Discord 上，`/model` 和 `/models` 會開啟一個互動選擇器，其中包含供應商和
模型下拉選單。選擇器會遵守 `agents.defaults.models`，包括
`provider/*` 項目。

## `/config` — 寫入磁碟設定

<Note>僅限擁有者。預設停用 — 使用 `commands.config: true` 啟用。</Note>

```text
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

設定會在寫入前進行驗證。無效的變更會被拒絕。`/config`
更新在重啟後仍然保留。

## `/mcp` — MCP 伺服器設定

<Note>僅限擁有者。預設停用 — 使用 `commands.mcp: true` 啟用。</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` 將設定儲存在 OpenClaw 設定中，而非嵌入式智慧體專案設定中。

## `/debug` — 僅限執行時期的覆蓋設定

<Note>僅限擁有者。預設為停用 — 使用 `commands.debug: true` 啟用。 覆寫會立即套用至新的配置讀取，但**不**會寫入磁碟。</Note>

```text
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

## `/plugins` — 外掛程式管理

<Note>寫入操作僅限擁有者。預設為停用 — 使用 `commands.plugins: true` 啟用。</Note>

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
/plugins install ./path/to/plugin
```

`/plugins enable|disable` 會更新外掛程式配置，並針對新的代理程式回合熱重新載入 Gateway 外掛程式執行環境。`/plugins install` 會自動重新啟動受管理的 Gateway，因為外掛程式來源模組已變更。

## `/trace` — 外掛程式追蹤輸出

```text
/trace          # show current trace state
/trace on
/trace off
```

`/trace` 會顯示範圍僅限於工作階段的外掛程式追蹤/除錯行，無需完整詳細模式。它不會取代 `/debug` (執行時期覆寫) 或 `/verbose` (一般工具輸出)。

## `/btw` — 側邊提問

`/btw` 是關於當前工作階段內容的快速側邊提問。別名：`/side`。

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

與一般訊息不同：

- 使用當前工作階段作為背景內容。
- 在 Codex harness 工作階段中，以暫時性 Codex 側邊執行緒執行。
- **不會**改變未來的工作階段內容。
- 不會寫入對話紀錄歷史。

請參閱 [BTW side questions](/zh-Hant/tools/btw) 以了解完整行為。

## 介面說明

<AccordionGroup>
  <Accordion title="各介面的工作階段範圍">
    - **文字指令：** 在一般聊天工作階段中執行 (DM 共用 `main`，群組則有自己的工作階段)。
    - **原生 Discord 指令：** `agent:<agentId>:discord:slash:<userId>`
    - **原生 Slack 指令：** `agent:<agentId>:slack:slash:<userId>` (前綴可透過 `channels.slack.slashCommand.sessionPrefix` 設定)
    - **原生 Telegram 指令：** `telegram:slash:<userId>` (透過 `CommandTargetSessionKey` 鎖定聊天工作階段)
    - **`/stop`** 鎖定使用中的聊天工作階段以中止目前的執行。

  </Accordion>
  <Accordion title="Slack 詳情">
    `channels.slack.slashCommand` 支援單一 `/openclaw` 風格的指令。
    使用 `commands.native: true` 時，請為每個內建指令建立一個 Slack 斜線指令。
    註冊 `/agentstatus`（而非 `/status`），因為 Slack 保留了
    `/status`。文字 `/status` 在 Slack 訊息中仍然有效。
  </Accordion>
  <Accordion title="快速路徑與內聯快捷鍵">
    - 來自允許清單發送者的純指令訊息會立即處理（略過佇列 + 模型）。
    - 內聯快捷鍵（`/help`、`/commands`、`/status`、`/whoami`）也可嵌入在一般訊息中運作，並會在模型看到剩餘文字前被移除。
    - 未授權的純指令訊息會被靜默忽略；內聯 `/...` 權杖會被視為純文字。

  </Accordion>
  <Accordion title="引數說明">
    - 指令接受在指令與引數之間使用可選的 `:`（`/think: high`、`/send: on`）。
    - `/new <model>` 接受模型別名、`provider/model` 或提供者名稱（模糊比對）；若無相符項，文字將被視為訊息主體。
    - `/allowlist add|remove` 需要 `commands.config: true` 並遵循頻道 `configWrites`。

  </Accordion>
</AccordionGroup>

## 提供者使用量與狀態

- 當啟用使用量追蹤時，**提供者使用量/配額**（例如「Claude 剩餘 80%」）會顯示在目前模型提供者的 `/status` 中。
- `/status` 中的 **Token/快取行** 在即時會話快照稀疏時，可以回溯到最新的逐字稿使用量條目。
- **執行與運行時：** `/status` 報告 `Execution` 作為有效的沙箱路徑，並報告 `Runtime` 作為運行會話的主體：`OpenClaw Default`、`OpenAI Codex`、CLI 後端或 ACP 後端。
- **每次回應的 token/成本：** 由 `/usage off|tokens|full` 控制。
- `/model status` 是關於模型/認證/端點的，而非使用情況。

## 相關

<CardGroup cols={2}>
  <Card title="技能" href="/zh-Hant/tools/skills" icon="puzzle-piece">
    技能斜線指令如何註冊與閘控。
  </Card>
  <Card title="建立技能" href="/zh-Hant/tools/creating-skills" icon="hammer">
    建立一個能註冊自身斜線指令的技能。
  </Card>
  <Card title="BTW" href="/zh-Hant/tools/btw" icon="comments">
    不改變會語上下文的側面問題。
  </Card>
  <Card title="引導" href="/zh-Hant/tools/steer" icon="compass">
    使用 `/steer` 在運行過程中引導代理程式。
  </Card>
</CardGroup>
