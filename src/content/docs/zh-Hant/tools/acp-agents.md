---
summary: "透過 ACP 後端執行外部編碼程式 (Claude Code, Cursor, Gemini CLI, explicit Codex ACP, OpenClaw ACP, OpenCode)"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message-channel conversation to a persistent ACP session
  - Troubleshooting ACP backend, plugin wiring, or completion delivery
  - Operating /acp commands from chat
title: "ACP 代理程式"
sidebarTitle: "ACP 代理程式"
---

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 工作階段
讓 OpenClaw 透過 ACP 後端外掛程式執行外部編碼駔具（例如 Pi、Claude Code、
Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 及其他
支援的 ACPX 駔具）。

每個 ACP 工作階段的產生都會被追蹤為 [背景工作](/zh-Hant/automation/tasks)。

<Note>
**ACP 是外部駔具路徑，而非預設的 Codex 路徑。** 原生
Codex 應用程式伺服器外掛程式擁有 `/codex ...` 控制項和預設的
`openai/gpt-*` 嵌入式執行時期，用於代理回合；ACP 則擁有
`/acp ...` 控制項和 `sessions_spawn({ runtime: "acp" })` 工作階段。

如果您希望 Codex 或 Claude Code 以外部 MCP 用戶端身分
直接連線至現有的 OpenClaw 頻道對話，請使用
[`openclaw mcp serve`](/zh-Hant/cli/mcp) 而非 ACP。

</Note>

## 我需要哪個頁面？

| 您想要…                                                                   | 使用此項                             | 備註                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 在目前對話中綁定或控制 Codex                                              | `/codex bind`, `/codex threads`      | 當啟用 `codex` 外掛程式時的原生 Codex 應用程式伺服器路徑；包括綁定聊天回覆、圖片轉發、model/fast/permissions、停止及導向控制。ACP 是一種明確的備援方案 |
| 透過 OpenClaw 執行 Claude Code、Gemini CLI、顯式 Codex ACP 或其他外部工具 | 本頁面                               | 聊天綁定會話、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、背景任務、執行環境控制                                                               |
| 將 OpenClaw Gateway 工作階段「作為」ACP 伺服器暴露給編輯器或用戶端        | [`openclaw acp`](/zh-Hant/cli/acp)        | 橋接模式。IDE/用戶端透過 stdio/WebSocket 以 ACP 通訊協定與 OpenClaw 通訊                                                                               |
| 重複使用本機 AI CLI 作為純文字後備模型                                    | [CLI 後端](/zh-Hant/gateway/cli-backends) | 非 ACP。沒有 OpenClaw 工具、沒有 ACP 控制項、沒有工具執行環境                                                                                          |

## 這是否能直接運作？

是的，在安裝官方 ACP 執行環境外掛程式後：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

來源檢出可在
`pnpm install` 之後使用本機 `extensions/acpx` 工作區外掛程式。
執行 `/acp doctor` 以進行準備度檢查。

OpenClaw 只在 ACP **真正可用** 時才會教導代理有關 ACP 產生的資訊：ACP 必須已啟用、不能停用 dispatch、目前的工作階段不能被沙箱阻擋，且必須載入執行階段後端。如果未滿足這些條件，ACP 外掛技能和 `sessions_spawn` ACP 指引將保持隱藏，以免代理建議使用不可用的後端。

<AccordionGroup>
  <Accordion title="首次執行注意事項">
    - 如果設定了 `plugins.allow`，它是一個限制性的外掛清單，且**必須**包含 `acpx`；否則已安裝的 ACP 後端將會被刻意阻擋，且 `/acp doctor` 會回報缺少允許清單項目。
    - Codex ACP 轉接器會與 `acpx` 外掛一起暫存，並在可能時於本機啟動。
    - Codex ACP 使用獨立的 `CODEX_HOME` 執行；OpenClaw 只會從主機 Codex 設定中複製受信任的專案項目並信任目前的工作區，將驗證、通知和掛勾留在主機設定上。
    - 其他目標套件轉接器可能會在您首次使用時透過 `npx` 按需擷取。
    - 該套件的廠商驗證仍必須存在於主機上。
    - 如果主機沒有 npm 或網路存取權，首次執行的轉接器擷取將會失敗，直到快取已預先熱身或透過其他方式安裝轉接器為止。

  </Accordion>
  <Accordion title="Runtime prerequisites">
    ACP 會啟動一個真實的外部 harness 程序。OpenClaw 負責路由、
    背景任務狀態、交付、綁定和策略；而 harness
    則擁有其提供者登入、模型目錄、檔案系統行為和
    原生工具。

    在歸咎於 OpenClaw 之前，請驗證：

    - `/acp doctor` 回報一個已啟用且健康的後端。
    - 當設定了允許清單時，目標 id 獲 `acp.allowedAgents` 允許。
    - Harness 指令可以在 Gateway 主機上啟動。
    - 該 harness 具備提供者驗證（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 選取的模型存在於該 harness 上——模型 id 無法在 harness 之間通用。
    - 請求的 `cwd` 存在且可存取，或者省略 `cwd` 並讓後端使用其預設值。
    - 權限模式符合工作性質。非互動式工作階段無法點擊原生權限提示，因此大量寫入/執行的編碼執行通常需要能夠以無人值守方式繼續的 ACPX 權限設定檔。

  </Accordion>
</AccordionGroup>

OpenClaw 外掛程式工具與內建 OpenClaw 工具預設**不會**公開給
ACP 駔具。請僅在駔具應直接呼叫這些工具時，才在
[ACP 代理程式 - 設定](/zh-Hant/tools/acp-agents-setup) 中啟用明確的 MCP 橋接器。

## 支援的 harness 目標

使用 `acpx` 後端時，請將這些 harness id 用作 `/acp spawn <id>`
或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 目標：

| Harness id | 典型後端                                       | 備註                                                               |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `claude`   | Claude Code ACP 配接器                         | 需要在主機上進行 Claude Code 驗證。                                |
| `codex`    | Codex ACP 配接器                               | 僅在原生 `/codex` 不可用或請求使用 ACP 時，才會明確進行 ACP 退回。 |
| `copilot`  | GitHub Copilot ACP 配接器                      | 需要 Copilot CLI/執行時期驗證。                                    |
| `cursor`   | Cursor CLI ACP (`cursor-agent acp`)            | 如果本地安裝公開了不同的 ACP 進入點，請覆寫 acpx 指令。            |
| `droid`    | Factory Droid CLI                              | 需要 Factory/Droid 驗證或在環境中設定 `FACTORY_API_KEY`。          |
| `gemini`   | Gemini CLI ACP 配接器                          | 需要 Gemini CLI 驗證或 API 金鑰設定。                              |
| `iflow`    | iFlow CLI                                      | 配接器可用性和模型控制取決於已安裝的 CLI。                         |
| `kilocode` | Kilo Code CLI                                  | 配接器可用性和模型控制取決於已安裝的 CLI。                         |
| `kimi`     | Kimi/Moonshot CLI                              | 需要在主機上進行 Kimi/Moonshot 驗證。                              |
| `kiro`     | Kiro CLI                                       | 配接器可用性和模型控制取決於已安裝的 CLI。                         |
| `opencode` | OpenCode ACP 配接器                            | 需要 OpenCode CLI/提供者驗證。                                     |
| `openclaw` | 透過 `openclaw acp` 進行 OpenClaw Gateway 橋接 | 讓支援 ACP 的駕馭能與 OpenClaw Gateway 工作階段通訊。              |
| `pi`       | Pi/內嵌 OpenClaw 執行階段                      | 用於 OpenClaw 原生駕馭實驗。                                       |
| `qwen`     | Qwen Code / Qwen CLI                           | 需要在主機上進行 Qwen 相容驗證。                                   |

可以在 acpx 本身設定自訂 acpx 代理程式別名，但 OpenClaw 原則仍會在分派前檢查 `acp.allowedAgents` 和任何 `agents.list[].runtime.acp.agent` 對應。

## 操作員手冊

從聊天的快速 `/acp` 流程：

<Steps>
  <Step title="產生">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto` 或明確的
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="運作">
    在綁定的對話或執行緒中繼續（或明確以工作階段金鑰為目標）。
  </Step>
  <Step title="檢查狀態">
    `/acp status`
  </Step>
  <Step title="調整">
    `/acp model <provider/model>`、
    `/acp permissions <profile>`、
    `/acp timeout <seconds>`。
  </Step>
  <Step title="引導">
    不取代上下文：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="Stop">
    `/acp cancel` (目前輪次) 或 `/acp close` (工作階段 + 繫結)。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命週期詳細資訊">
    - Spawn 會建立或恢復 ACP 執行階段工作階段，在 OpenClaw 工作階段存放區中記錄 ACP 元資料，並且當執行由父項擁有時，可能會建立背景工作。
    - 即使執行階段工作階段是持久的，父項擁有的 ACP 工作階段仍會被視為背景工作；完成和跨表面交付會透過父項工作通知器進行，而不會像一般使用者面向的聊天工作階段那樣運作。
    - 工作維護會關閉已終止或孤立的父項擁有一次性 ACP 工作階段。只要有效的對話繫結仍然存在，持久的 ACP 工作階段就會被保留；沒有有效繫結的過時持久工作階段會被關閉，以免在擁有工作完成或其工作記錄消失後被靜靜恢復。
    - 繫結的後續訊息會直接傳送到 ACP 工作階段，直到繫結被關閉、取消焦點、重設或過期為止。
    - Gateway 指令會保留在本機。`/acp ...`、`/status` 和 `/unfocus` 絕不會作為一般提示文字傳送到繫結的 ACP 駕馭。
    - 當後端支援取消時，`cancel` 會中止使用中的輪次；它不會刪除繫結或工作階段元資料。
    - `close` 會從 OpenClaw 的角度結束 ACP 工作階段並移除繫結。如果駕馭支援恢復，可能仍會保留自己的上游紀錄。
    - 在 `close` 之後，acpx 外掛程式會清理 OpenClaw 擁有的包裝函式和配接器處理程序樹，並在 Gateway 啟動期間清除過時的 OpenClaw 擁有 ACPX 孤立程序。
    - 閒置執行階段工作程序在 `acp.runtime.ttlMinutes` 之後便符合清理資格；儲存的工作階段元資料會保留 `/acp sessions` 的可用時間。

  </Accordion>
  <Accordion title="Native Codex 路由規則">
    當啟用時，應路由至 **native Codex
    plugin** 的自然語言觸發器：

    - "Bind this Discord channel to Codex."
    - "Attach this chat to Codex thread `<id>`."
    - "Show Codex threads, then bind this one."

    Native Codex 對話綁定是預設的聊天控制路徑。
    OpenClaw 動態工具仍透過 OpenClaw 執行，而
    Codex 原生工具（例如 shell/apply-patch）則在 Codex 內執行。
    對於 Codex 原生工具事件，OpenClaw 會注入一個每回合的原生
    hook 中繼，因此 plugin hooks 可以封鎖 `before_tool_call`、觀察
    `after_tool_call`，並透過 OpenClaw 核准來路由 Codex `PermissionRequest` 事件。
    Codex `Stop` hooks 會被中繼至
    OpenClaw `before_agent_finalize`，其中 plugins 可以在 Codex
    完成其答案之前要求再進行一次模型傳遞。該中繼保持
    刻意的保守：它不會變更 Codex 原生工具
    引數或重寫 Codex 執行緒記錄。僅在您
    想要 ACP runtime/session 模型時才使用明確的 ACP。
    內嵌 Codex 支援邊界記錄於
    [Codex harness v1 support contract](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract) 中。

  </Accordion>
  <Accordion title="模型 / 提供者 / 執行時選擇速查表">
    - `openai-codex/*` - 由 doctor 修復的舊版 Codex OAuth/訂閱模型路由。
    - `openai/*` - 用於 OpenAI agent 輪次的原生 Codex app-server 嵌入式執行時。
    - `/codex ...` - 原生 Codex 對話控制。
    - `/acp ...` 或 `runtime: "acp"` - 明確的 ACP/acpx 控制。

  </Accordion>
  <Accordion title="ACP 路由自然語言觸發器">
    應路由至 ACP 執行階段的觸發器：

    - "將此作為一次性 Claude Code ACP 工作階段執行並總結結果。"
    - "在此執行緒中使用 Gemini CLI 執行此任務，然後在同一執行緒中保持後續追蹤。"
    - "透過 ACP 在背景執行緒中執行 Codex。"

    OpenClaw 選取 `runtime: "acp"`，解析工具 `agentId`，
    在支援時綁定至目前的對話或執行緒，並將後續追蹤路由至該工作階段直到關閉/過期。Codex 僅在
    明確指定 ACP/acpx 或原生 Codex 外掛無法用於請求的操作時，才會遵循此路徑。

    對於 `sessions_spawn`，`runtime: "acp"` 僅在
    啟用 ACP、請求者未處於沙盒中且已載入 ACP 執行階段後端時才會顯示。`acp.dispatch.enabled=false` 會暫停
    自動 ACP 執行緒調度，但不會隱藏或封鎖明確的
    `sessions_spawn({ runtime: "acp" })` 呼叫。它以 ACP 工具 ID 為目標，例如 `codex`、
    `claude`、`droid`、`gemini` 或 `opencode`。除非該項目
    已明確設定為使用 `agents.list[].runtime.type="acp"`，否則請勿
    傳遞來自 `agents_list` 的標準 OpenClaw 設定代理 ID；
    否則請使用預設的子代理執行階段。當 OpenClaw 代理
    設定為使用 `runtime.type="acp"` 時，OpenClaw 會
    使用 `runtime.acp.agent` 作為基礎工具 ID。

  </Accordion>
</AccordionGroup>

## ACP 與子代理

當您需要外部 harness 執行時期時，請使用 ACP。當啟用 `codex` 外掛程式時，請使用 **原生 Codex 應用程式伺服器** 進行 Codex 對話繫結/控制。當您需要 OpenClaw 原生的委派執行時，請使用 **子代理**。

| 領域        | ACP session                                                        | Sub-agent run                     |
| ----------- | ------------------------------------------------------------------ | --------------------------------- |
| Runtime     | ACP backend plugin (for example acpx)                              | OpenClaw native sub-agent runtime |
| Session key | `agent:<agentId>:acp:<uuid>`                                       | `agent:<agentId>:subagent:<uuid>` |
| 主要指令    | `/acp ...`                                                         | `/subagents ...`                  |
| Spawn tool  | PH:INLINE_CODE:206:cc5bbf69%% 搭配 `sessions_spawn``runtime:"acp"` |
| }           | `sessions_spawn` (預設執行階段)                                    |

另請參閱 [Sub-agents](/zh-Hant/tools/subagents)。

## ACP 如何執行 Claude Code

透過 ACP 使用 Claude Code 時，技術堆疊如下：

1. OpenClaw ACP 工作階段控制平面。
2. 官方 `@openclaw/acpx` 執行階段外掛程式。
3. Claude ACP 轉接器。
4. Claude 端的執行階段/工作階段機制。

ACP Claude 是具備 ACP 控制項、工作階段恢復、背景任務追蹤以及選擇性對話/執行緒綁定的 **harness 工作階段**。

CLI 後端是獨立的僅文字本地備援執行環境 - 請參閱 [CLI Backends](/zh-Hant/gateway/cli-backends)。

對於操作員來說，實用的原則是：

- **想要 `/acp spawn`、可綁定的工作階段、執行階段控制，或持續性的 harness 工作？** 請使用 ACP。
- **想要透過原始 CLI 進行簡單的本機文字備援？** 請使用 CLI 後端。

## 綁定的工作階段

### 心智模型

- **聊天介面** - 人們持續交談的地方 (Discord 頻道、Telegram 主題、iMessage 聊天)。
- **ACP 工作階段** - OpenClaw 路由傳送至的持久 Codex/Claude/Gemini 執行階段狀態。
- **子執行緒/主題** - 僅由 `--thread ...` 建立的額外選用訊息介面。
- **執行階段工作區** - harness 執行的檔案系統位置 (`cwd`、repo checkout、後端工作區)。獨立於聊天介面。

### 目前對話的綁定

`/acp spawn <harness> --bind here` 會將目前的對話釘選到產生的 ACP 工作階段 - 沒有子執行緒，相同的聊天介面。OpenClaw 持續擁有傳輸、驗證、安全性和傳遞功能。該對話中的後續訊息會路由傳送到相同的工作階段；`/new` 和 `/reset` 會就地重設工作階段；`/acp close` 則會移除綁定。

範例：

```text
/codex bind                                              # native Codex bind, route future messages here
/codex model gpt-5.4                                     # tune the bound native Codex thread
/codex stop                                              # control the active native Codex turn
/acp spawn codex --bind here                             # explicit ACP fallback for Codex
/acp spawn codex --thread auto                           # may create a child thread/topic and bind there
/acp spawn codex --bind here --cwd /workspace/repo       # same chat binding, Codex runs in /workspace/repo
```

<AccordionGroup>
  <Accordion title="綁定規則與互斥性">
    - `--bind here` 與 `--thread ...` 互斥。
    - `--bind here` 僅在支援目前對話綁定的頻道上運作；否則 OpenClaw 會傳回明確的不支援訊息。綁定在閘道重新啟動後仍然持續。
    - 在 Discord 上，`spawnSessions` 會限制 `--thread auto|here` 的子執行緒建立——而非 `--bind here`。
    - 如果您在沒有 `--cwd` 的情況下衍生到不同的 ACP 代理程式，OpenClaw 預設會繼承**目標代理程式的**工作區。遺失的繼承路徑 (`ENOENT`/`ENOTDIR`) 會退回到後端預設值；其他存取錯誤 (例如 `EACCES`) 會顯示為衍生錯誤。
    - 閘道管理命令會保留在綁定的對話中——`/acp ...` 命令由 OpenClaw 處理，即使一般的後續文字會路由到綁定的 ACP 工作階段；只要針對該介面啟用了命令處理，`/status` 和 `/unfocus` 也會保留在本地。

  </Accordion>
  <Accordion title="Thread-bound sessions">
    當通道適配器啟用執行緒綁定時：

    - OpenClaw 會將執行緒綁定到目標 ACP 會話。
    - 該執行緒中的後續訊息會路由到已綁定的 ACP 會話。
    - ACP 輸出會傳送回同一個執行緒。
    - 失去焦點/關閉/封存/閒置逾時或最大期限過期會移除綁定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是 Gateway 指令，而非傳送給 ACP harness 的提示詞。

    執行緒綁定 ACP 所需的功能標誌：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停自動 ACP 執行緒分派；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍可運作）。
    - 已啟用通道適配器執行緒會話生成（預設：`true`）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`

    執行緒綁定支援取決於適配器。如果目前使用的通道適配器不支援執行緒綁定，OpenClaw 會傳回清楚的「不支援/無法使用」訊息。

  </Accordion>
  <Accordion title="Thread-supporting channels">
    - 任何公開會話/執行緒綁定功能的通道適配器。
    - 目前內建支援：**Discord** 執行緒/頻道、**Telegram** 主題（群組/超級群組中的論壇主題以及 DM 主題）。
    - 外掛程式通道可透過相同的綁定介面新增支援。

  </Accordion>
</AccordionGroup>

## 永久通道綁定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定永久 ACP 綁定。

### 綁定模型

<ParamField path="bindings[].type" type='"acp"'>
  標記永久 ACP 對話綁定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  識別目標對話。各通道的格式：

- **Discord 頻道/執行緒：** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack 頻道/DM:** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`。建議使用穩定的 Slack ID；頻道綁定也會比對該頻道串列內的回覆。
- **Telegram 論壇主題:** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **iMessage DM/群組:** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。建議使用 `chat_id:*` 以進行穩定的群組綁定。

</ParamField>
<ParamField path="bindings[].agentId" type="string">
  擁有的 OpenClaw 代理 ID。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可選的 ACP 覆蓋。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  可選的操作員面向標籤。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可選的執行時工作目錄。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可選的後端覆蓋。
</ParamField>

### 每個代理的執行時預設值

使用 `agents.list[].runtime` 為每個代理定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**ACP 綁定會話的覆蓋優先順序：**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全域 ACP 預設值（例如 `acp.backend`）

### 範例

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### 行為

- OpenClaw 會確保設定的 ACP 會話在使用前已存在。
- 該頻道或主題中的訊息會路由至設定的 ACP 會話。
- 在綁定的對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 暫時的執行時期綁定（例如由執行緒焦點流程所建立）在存在的地方仍然適用。
- 對於沒有明確 `cwd` 的跨代理程式 ACP 衍生，OpenClaw 會從代理程式設定繼承目標代理程式工作區。
- 缺失的繼承工作區路徑會回退至後端預設 cwd；非缺失的存取失敗會顯示為產生錯誤。

## 啟動 ACP 會話

啟動 ACP 會話的兩種方式：

<Tabs>
  <Tab title="從 sessions_spawn">
    使用 `runtime: "acp"` 從代理回合或工具呼叫啟動 ACP 會話。

    ```json
    {
      "task": "Open the repo and summarize failing tests",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` 預設為 `subagent`，因此請針對 ACP 會話明確設定 `runtime: "acp"`。如果省略 `agentId`，OpenClaw 會在設定時使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true` 來保持持久的綁定對話。
    </Note>

  </Tab>
  <Tab title="從 /acp 指令">
    使用 `/acp spawn` 進行來自聊天的明確操作員控制。

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    主要旗標：

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 參數

<ParamField path="task" type="string" required>
  發送至 ACP 工作階段的初始提示詞。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  對於 ACP 工作階段必須為 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目標 harness ID。如果設定，則會回退至 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  請求執行緒綁定流程（於支援時）。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 為單次執行；`"session"` 為持續性。如果 `thread: true` 且
  省略了 `mode`，OpenClaw 可能會根據執行時路徑
  預設為持續性行為。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  請求的執行時工作目錄（經後端/執行時策略驗證）。
  如果省略，ACP 生成作業在設定時會繼承目標
  Agent 工作區；缺少的繼承路徑會回退至後端
  預設值，而實際的存取錯誤則會被傳回。
</ParamField>
<ParamField path="label" type="string">
  用於工作階段/橫幅文字的操作員面向標籤。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢復現有的 ACP 工作階段，而不是建立新的。
  Agent 會透過 `session/load` 重播其對話歷史記錄。
  需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 會將初始 ACP 執行進度摘要以系統事件形式
  串流回傳給請求者工作階段。接受的回應包含
  指向工作階段範圍 JSONL 日誌的 `streamLogPath`
  (`<sessionId>.acp-stream.jsonl`)，您可以對其進行 tail 以取得完整的轉送歷史記錄。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  在 N 秒後中止 ACP 子回合。`0` 將回合保持在
  閘道的無逾時路徑上。相同的值會套用至 Gateway
  執行和 ACP 執行時，以免停滯/配額耗盡的
  harness 無限期佔用父 Agent 通道。
</ParamField>
<ParamField path="model" type="string">
  ACP 子工作階段的明確模型覆寫。Codex ACP 生成作業
  會在 `session/new` 之前將 OpenClaw Codex 參照
  （如 `openai-codex/gpt-5.4`）正規化為 Codex
  ACP 啟動設定；斜線形式（如
  `openai-codex/gpt-5.4/high`）也會設定 Codex ACP 推理力。
  其他 harness 必須宣佈 ACP `models` 並支援
  `session/set_model`；否則 OpenClaw/acpx 會明確失敗，
  而不是無聲地回退至目標 Agent 預設值。
</ParamField>
<ParamField path="thinking" type="string">
  明確的思考/推理力。對於 Codex ACP，`minimal` 對應至
  低力，`low`/`medium`/`high`/`xhigh` 直接對應，而 `off`
  則省略推理力啟動覆寫。
</ParamField>

## 生成綁定和執行緒模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行為                                                               |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | 就地綁定當前活躍的對話；如果沒有活躍對話則失敗。 |
    | `off`  | 不要建立當前對話綁定。                          |

    註記：

    - `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作者路徑。
    - `--bind here` 不會建立子執行緒。
    - `--bind here` 僅在公開當前對話綁定支援的頻道上可用。
    - `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中合併使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行為                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------- |
    | `auto` | 在活躍執行緒中：綁定該執行緒。在執行緒外：若受支援則建立/綁定子執行緒。 |
    | `here` | 要求當前活躍執行緒；如果不在執行緒中則失敗。                                                  |
    | `off`  | 無綁定。工作階段以未綁定狀態啟動。                                                                 |

    註記：

    - 在非執行緒綁定介面上，預設行為實際上為 `off`。
    - 執行緒綁定生成需要頻道政策支援：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 當您想要固定當前對話而不建立子執行緒時，請使用 `--bind here`。

  </Tab>
</Tabs>

## 傳遞模型

ACP 工作階段可以是互動式工作區，也可以是父級擁有的背景工作。傳遞路徑取決於該形態。

<AccordionGroup>
  <Accordion title="Interactive ACP sessions">
    互動式會話旨在於可見的聊天介面上持續對話：

    - `/acp spawn ... --bind here` 將當前對話綁定到 ACP 會話。
    - `/acp spawn ... --thread ...` 將頻道串話/主題綁定到 ACP 會話。
    - 持續性配置的 `bindings[].type="acp"` 會將符合條件的對話路由至同一個 ACP 會話。

    綁定對話中的後續訊息會直接路由至 ACP 會話，且 ACP 的輸出會傳回至同一個頻道/串話/主題。

    OpenClaw 傳送至 Harness 的內容：

    - 一般的綁定後續訊息會作為提示文字傳送，並且只有在 Harness/後端支援時才會包含附件。
    - `/acp` 管理指令與本機 Gateway 指令會在 ACP 分派之前被攔截。
    - 執行時期產生的完成事件會依目標具體化。OpenClaw Agent 會取得 OpenClaw 的內部執行時期內容封包；外部 ACP Harness 則會取得包含子結果與指令的純文字提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 封包絕不應傳送給外部 Harness 或儲存為 ACP 使用者對話記錄文字。
    - ACP 對話記錄項目會使用使用者可見的觸發文字或純文字完成提示。內部事件中繼資料會盡可能在 OpenClaw 中保持結構化，且不會被視為使用者撰寫的聊天內容。

  </Accordion>
  <Accordion title="父級擁有的單次 ACP 工作階段">
    由另一個 agent 執行產生的單次 ACP 工作階段是背景子項，類似於 sub-agents：

    - 父級使用 `sessions_spawn({ runtime: "acp", mode: "run" })` 請求工作。
    - 子項在其自己的 ACP harness 工作階段中執行。
    - 子項輪次在與原生 sub-agent 產生相同的背景通道上執行，因此緩慢的 ACP harness 不會封鎖不相關的主要工作階段工作。
    - 完成結果透過任務完成宣告路徑回報。在發送到外部 harness 之前，OpenClaw 會將內部完成元資料轉換為純 ACP 提示，因此 harness 不會看到僅限 OpenClaw 的執行階段內容標記。
    - 當面向使用者的回覆有用時，父級會以一般助理語氣重寫子項結果。

    請**勿**將此路徑視為父級與子項之間的點對點聊天。子項已經有回到父級的完成通道。

  </Accordion>
  <Accordion title="sessions_send 與 A2A 傳遞">
    `sessions_send` 可以在產生後以另一個工作階段為目標。對於一般
    同層級工作階段，OpenClaw 在注入訊息後使用 agent-to-agent (A2A) 後續路徑：

    - 等待目標工作階段的回覆。
    - 選擇性地讓請求者和目標交換有限數量的後續輪次。
    - 要求目標產生宣告訊息。
    - 將該宣告傳遞到可見通道或執行緒。

    該 A2A 路徑是發送者需要可見後續內容的同層級傳送的備用方案。當不相關的工作階段
    可以看到並傳送訊息給 ACP 目標時，它會保持啟用，例如在廣泛的
    `tools.sessions.visibility` 設定下。

    只有當請求者是其自身父級擁有的單次 ACP 子項的父級時，OpenClaw 才會跳過 A2A 後續。在這種情況下，
    在任務完成之上執行 A2A 可能會用子項的結果喚醒父級，將父級的回覆轉發回子項，並
    建立父級/子項回圈。`sessions_send` 結果回報
    `delivery.status="skipped"` 該擁有子項情況，因為
    完成路徑已經負責結果。

  </Accordion>
  <Accordion title="恢復現有工作階段">
    使用 `resumeSessionId` 來繼續之前的 ACP 工作階段，而不是
    重新開始。代理程式透過
    `session/load` 重播其對話記錄，因此它能完全掌握之前的上下文。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常見使用案例：

    - 將 Codex 工作階段從您的筆記型電腦轉移到您的手機 — 告訴您的代理程式從您離開的地方接手。
    - 繼續您在 CLI 中互動式啟動的編碼工作階段，現在透過您的代理程式以無頭模式進行。
    - 接手因閘道重新啟動或閒置逾時而中斷的工作。

    註記：

    - `resumeSessionId` 僅在 `runtime: "acp"` 時適用；預設子代理程式執行時期會忽略此 ACP 專用欄位。
    - `streamTo` 僅在 `runtime: "acp"` 時適用；預設子代理程式執行時期會忽略此 ACP 專用欄位。
    - `resumeSessionId` 是主機本機 ACP/harness 恢復 ID，而非 OpenClaw 頻道工作階段金鑰；在分派之前，OpenClaw 仍會檢查 ACP 生成策略和目標代理程式策略，而 ACP 後端或 harness 則擁有載入該上游 ID 的授權。
    - `resumeSessionId` 會還原上游 ACP 對話記錄；`thread` 和 `mode` 仍正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍需要 `thread: true`。
    - 目標代理程式必須支援 `session/load`（Codex 和 Claude Code 支援）。
    - 如果找不到工作階段 ID，生成將會失敗並顯示清楚的錯誤訊息 — 不會自動無聲地回退到新的工作階段。

  </Accordion>
  <Accordion title="部署後的煙霧測試">
    在閘道部署後，請執行實際的端對端檢查，而不要僅信任單元測試：

    1. 在目標主機上驗證已部署的閘道版本和提交記錄。
    2. 開啟一個到即時代理的臨時 ACPX 橋接器工作階段。
    3. 要求該代理使用 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和任務 `Reply with exactly LIVE-ACP-SPAWN-OK` 呼叫 `sessions_spawn`。
    4. 驗證 `accepted=yes`、一個真實的 `childSessionKey`，且無驗證器錯誤。
    5. 清理臨時橋接器工作階段。

    將閘道保持在 `mode: "run"` 並跳過 `streamTo: "parent"` -
    執行緒綁定的 `mode: "session"` 和串流中繼路徑是分開的
    豐富整合測試階段。

  </Accordion>
</AccordionGroup>

## Sandbox 相容性

ACP 會話目前在主機執行時間上執行，而**非**在 OpenClaw 沙箱內。

<Warning>
**安全邊界：**

- 外部駔具可以根據其自身的 CLI 權限和所選的 `cwd` 進行讀寫。
- OpenClaw 的沙箱政策**並不**包裝 ACP 駔具的執行。
- OpenClaw 仍然會執行 ACP 功能閘道、允許的代理程式、會話擁有權、通道綁定以及 Gateway 傳遞政策。
- 請使用 `runtime: "subagent"` 進行由沙箱強制執行的 OpenClaw 原生工作。

</Warning>

目前的限制：

- 如果請求者的會話在沙箱中，ACP 的產生會同時對 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 進行封鎖。
- 具有 `runtime: "acp"` 的 `sessions_spawn` 不支援 `sandbox: "require"`。

## 會話目標解析

大多數 `/acp` 動作接受一個可選的 session 目標 (`session-key`、
`session-id` 或 `session-label`)。

**解析順序：**

1. 明確的目標引數 (或 `/acp steer` 的 `--session`)
   - 嘗試 key
   - 接著是 UUID 形式的 session id
   - 接著是 label
2. 目前的執行緒綁定 (如果此對話/執行緒已綁定至 ACP session)。
3. 目前請求者 session 後備。

目前對話綁定與執行緒綁定都會參與
步驟 2。

如果沒有解析出任何目標，OpenClaw 會傳回清楚的錯誤
(`Unable to resolve session target: ...`)。

## ACP 控制項

| 指令                 | 功能                                             | 範例                                                          |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP session；可選擇目前的綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標會話進行中的輪次。                       | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向正在運行的會話發送導向指令。                   | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉會話並解除綁定線程目標。                     | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、運行時選項、功能。         | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標會話的運行時模式。                       | `/acp set-mode plan`                                          |
| `/acp set`           | 通用運行時配置選項寫入。                         | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定運行時工作目錄覆蓋。                         | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定審核策略設定檔。                             | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行逾時（秒）。                             | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行模型覆寫。                               | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除階段執行選項覆寫。                           | `/acp reset-options`                                          |
| `/acp sessions`      | 從存放區列出最近的 ACP 階段。                    | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀況、功能、可採取的修復措施。           | `/acp doctor`                                                 |
| `/acp install`       | 列印確定性安裝和啟用步驟。                       | `/acp install`                                                |

`/acp status` 顯示有效的執行時選項，以及執行時層級和後端層級的工作階段識別碼。當後端缺少某項功能時，不支援的控制錯誤會清楚地顯示出來。`/acp sessions` 會讀取目前綁定或請求者工作階段的存放區；目標權杖（`session-key`、`session-id` 或 `session-label`）會透過閘道工作階段探索來解析，包括自訂的每個代理程式 `session.store` 根目錄。

### 執行時選項對應

`/acp` 提供了便利指令和一個通用設定器。等效操作：

| 指令                         | 對應至                       | 備註                                                                                                                                                                            |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 執行時設定鍵 `model`         | 對於 Codex ACP，OpenClaw 會將 `openai-codex/<model>` 標準化為介面器模型 ID，並將斜線推理後綴（例如 `openai-codex/gpt-5.4/high`）對應到 `reasoning_effort`。                     |
| `/acp set thinking <level>`  | 標準選項 `thinking`          | OpenClaw 會在存在時發送後端通告的等效值，優先使用 `thinking`，然後是 `effort`、`reasoning_effort` 或 `thought_level`。對於 Codex ACP，介面器會將數值對應到 `reasoning_effort`。 |
| `/acp permissions <profile>` | 標準選項 `permissionProfile` | OpenClaw 會在存在時發送後端通告的等效值，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                     |
| `/acp timeout <seconds>`     | 正規選項 `timeoutSeconds`    | OpenClaw 在存在時會發送後端通告的等效選項，例如 `timeout` 或 `timeout_seconds`。                                                                                                |
| `/acp cwd <path>`            | 執行時 cwd 覆蓋              | 直接更新。                                                                                                                                                                      |
| `/acp set <key> <value>`     | 通用                         | `key=cwd` 使用 cwd 覆蓋路徑。                                                                                                                                                   |
| `/acp reset-options`         | 清除所有執行時覆蓋           | -                                                                                                                                                                               |

## acpx harness、外掛程式設定與權限

有關 acpx harness 設定（Claude Code / Codex / Gemini CLI
別名）、plugin-tools 和 OpenClaw-tools MCP 橋接器，以及 ACP
權限模式，請參閱
[ACP agents - setup](/zh-Hant/tools/acp-agents-setup)。

## 疑難排解

| 症狀                                                                        | 可能原因                                                                           | 修正方法                                                                                                                                                      |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛遺失、已停用，或被 `plugins.allow` 封鎖。                                  | 安裝並啟用後端外掛，當設定該允許清單時，將 `acpx` 包含在 `plugins.allow` 中，然後執行 `/acp doctor`。                                                         |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                                                   | 設定 `acp.enabled=true`。                                                                                                                                     |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息自動分派。                                                   | 設定 `acp.dispatch.enabled=true` 以恢復自動執行緒路由；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍然有效。                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允許清單中。                                                             | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                             |
| `/acp doctor` 回報後端在啟動後未準備就緒                                    | 後端外掛遺失、已停用、被允許/拒絕策略封鎖，或其設定的可執行檔無法使用。            | 安裝/啟用後端外掛，重新執行 `/acp doctor`，如果狀態仍不健康，請檢查後端安裝或策略錯誤。                                                                       |
| 找不到 Harness 指令                                                         | Adapter CLI 未安裝、外部外掛遺失，或是非 Codex adapter 的首次執行 `npx` 擷取失敗。 | 執行 `/acp doctor`，在 Gateway 主機上安裝/預熱 adapter，或明確設定 acpx agent 指令。                                                                          |
| 來自 Harness 的 Model-not-found                                             | Model id 對於其他提供者/harness 有效，但不適用於此 ACP 目標。                      | 使用該 harness 列出的模型，在 harness 中設定模型，或省略覆寫設定。                                                                                            |
| 來自 Harness 的廠商驗證錯誤                                                 | OpenClaw 狀況良好，但目標 CLI/提供者尚未登入。                                     | 請登入或在 Gateway 主機環境中提供所需的提供者金鑰。                                                                                                           |
| `Unable to resolve session target: ...`                                     | 錯誤的金鑰/id/標籤 token。                                                         | 執行 `/acp sessions`，複製確切的金鑰/標籤，然後重試。                                                                                                         |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有可繫結的對話中使用。                                           | 移至目標聊天/頻道並重試，或使用未繫結的生成。                                                                                                                 |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏目前對話 ACP 繫結功能。                                                  | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                                   |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒上下文之外使用。                                           | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                                  |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位使用者擁有使用中的繫結目標。                                                 | 以擁有者身分重新繫結，或使用不同的對話或執行緒。                                                                                                              |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺乏執行緒繫結功能。                                                         | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                                 |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行時位於主機端；請求者工作階段已沙盒化。                                     | 從沙盒化工作階段使用 `runtime="subagent"`，或從非沙盒化工作階段執行 ACP 生成。                                                                                |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 為 ACP 執行時請求了 `sandbox="require"`。                                          | 使用 `runtime="subagent"` 進行所需的沙盒化，或從非沙盒化工作階段將 ACP 與 `sandbox="inherit"` 搭配使用。                                                      |
| `Cannot apply --model ... did not advertise model support`                  | 目標駝鳥未公開通用 ACP 模型切換功能。                                              | 使用宣傳支援 ACP `models`/`session/set_model` 的駝鳥，使用 Codex ACP 模型參考，或如果駝鳥有自己的啟動旗標，則直接在駝鳥中設定模型。                           |
| 繫結工作階段缺少 ACP 中繼資料                                               | 過時/已刪除的 ACP 工作階段中繼資料。                                               | 使用 `/acp spawn` 重新建立，然後重新繫結/聚焦執行緒。                                                                                                         |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 工作階段中封鎖寫入/執行。                          | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](/zh-Hant/tools/acp-agents-setup#permission-configuration)。 |
| ACP 工作階段提早失敗且輸出甚少                                              | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。                     | 檢查閘道日誌中的 `AcpRuntimeError`。若要取得完整權限，請設定 `permissionMode=approve-all`；若要允許優雅降級，請設定 `nonInteractivePermissions=deny`。        |
| ACP 工作階段在完成工作後無限期停滯                                          | 駕馭程序已完成，但 ACP 工作階段未回報完成。                                        | 更新 OpenClaw；目前的 acpx 清理機制會在關閉和閘道啟動時，清除 OpenClaw 擁有的過時包裝程式和配接器程序。                                                       |
| 駕馭看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                            | 內部事件信封洩漏到 ACP 邊界之外。                                                  | 更新 OpenClaw 並重新執行完成流程；外部駕馭應僅接收純文字的完成提示。                                                                                          |

## 相關

- [ACP 代理程式 - 設定](/zh-Hant/tools/acp-agents-setup)
- [Agent send](/zh-Hant/tools/agent-send)
- [CLI 後端](/zh-Hant/gateway/cli-backends)
- [Codex 駕馭](/zh-Hant/plugins/codex-harness)
- [Codex 駕馭執行時期](/zh-Hant/plugins/codex-harness-runtime)
- [多代理程式沙箱工具](/zh-Hant/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (橋接模式)](/zh-Hant/cli/acp)
- [子代理程式](/zh-Hant/tools/subagents)
