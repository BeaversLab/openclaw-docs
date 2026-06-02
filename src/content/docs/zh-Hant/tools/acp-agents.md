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

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 會話
讓 OpenClaw 透過 ACP 後端插件執行外部編碼工具（例如 Claude Code、
Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 和其他
支援的 ACPX 工具）。

每個 ACP 會話的產生都會被追蹤為 [background task](/zh-Hant/automation/tasks)。

<Note>
**ACP 是外部工具路徑，而非預設的 Codex 路徑。** 原生
Codex 應用程式伺服器插件擁有 `/codex ...` 控制項以及用於代理回合的預設
`openai/gpt-*` 內嵌執行時期；ACP 則擁有
`/acp ...` 控制項和 `sessions_spawn({ runtime: "acp" })` 會話。

如果您希望 Codex 或 Claude Code 作為外部 MCP 用戶端
直接連線到現有的 OpenClaw 頻道對話，請使用
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
    - 如果設定了 `plugins.allow`，它是一個限制性的外掛清單，並且**必須**包含 `acpx`；否則已安裝的 ACP 後端會被刻意封鎖，且 `/acp doctor` 會回報缺少允許清單項目。
    - Codex ACP 配接器會與 `acpx` 外掛一併部署，並在可能的情況下於本機啟動。
    - Codex ACP 使用獨立的 `CODEX_HOME` 執行；OpenClaw 會從主機 Codex 設定複製受信任的專案項目以及安全的模型/提供者路由設定，而驗證、通知和掛鉤則保留在主機設定上。
    - 其他目標套接器配接器可能仍需在您首次使用時透過 `npx` 按需取得。
    - 該套接器的供應商驗證仍必須存在於主機上。
    - 如果主機沒有 npm 或網路存取權，首次執行的配接器擷取將會失敗，直到快取已預先載入或透過其他方式安裝配接器為止。

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

OpenClaw 插件工具和內建 OpenClaw 工具預設**不會**對
ACP 工具公開。只有在工具應該直接呼叫那些工具時，才在
[ACP agents - setup](/zh-Hant/tools/acp-agents-setup) 中啟用明確的 MCP 橋接器。

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
| `qwen`     | Qwen Code / Qwen CLI                           | 需要在主機上採用 Qwen 相容的驗證。                                 |

可以在 acpx 本身中設定自訂 acpx 代理別名，但在分派之前，
OpenClaw 原則仍會檢查 `acp.allowedAgents` 和任何
`agents.list[].runtime.acp.agent` 對應。

## 操作員手冊

從聊天進行的快速 `/acp` 流程：

<Steps>
  <Step title="Spawn">
    `/acp spawn claude --bind here`、
    `/acp spawn gemini --mode persistent --thread auto` 或明確的
    `/acp spawn codex --bind here`。
  </Step>
  <Step title="Work">
    在綁定的對話或串列中繼續（或明確指定目標工作階段金鑰）。
  </Step>
  <Step title="檢查狀態">
    `/acp status`
  </Step>
  <Step title="調整">
    `/acp model <provider/model>`,
    `/acp permissions <profile>`,
    `/acp timeout <seconds>`.
  </Step>
  <Step title="引導">
    不替換上下文：`/acp steer tighten logging and continue`。
  </Step>
  <Step title="停止">
    `/acp cancel` (目前回合) 或 `/acp close` (工作階段 + 綁定)。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命週期詳情">
    - Spawn 會建立或恢復 ACP 執行階段會話，在 OpenClaw 會話存放區中記錄 ACP 中繼資料，並且當執行作業由父項擁有時，可能會建立背景工作。
    - 由父項擁有的 ACP 會話即使當執行階段會話是持續性的，也會被視為背景工作；完成與跨介面傳遞會透過父項工作通知器進行，而不是像一般使用者面向的聊天會話那樣運作。
    - 工作維護會關閉終止或孤立的由父項擁有的一次性 ACP 會話。只要持續的 ACP 會話仍保持作用中的交談繫結，就會予以保留；沒有作用中繫結的過期持續性會話會被關閉，以免在擁有工作完成或其工作記錄消失後被無聲恢復。
    - 繫結的後續訊息會直接傳送到 ACP 會話，直到繫結被關閉、失去焦點、重設或過期為止。
    - Gateway 指令會保留在本地。`/acp ...`、`/status` 和 `/unfocus` 永遠不會作為一般提示文字傳送到繫結的 ACP 鞍具。
    - 當後端支援取消時，`cancel` 會中止目前的輪次；它不會刪除繫結或會話中繼資料。
    - `close` 會從 OpenClaw 的角度結束 ACP 會話並移除繫結。如果鞍具支援恢復，它可能仍會保留自己的上游記錄。
    - acpx 外掛程式會在 `close` 之後清理 OpenClaw 擁有的包裝函式和配接器程序樹，並在 Gateway 啟動期間收回過期的 OpenClaw 擁有之 ACPX 孤立程序。
    - 閒置的執行階段工作程序在 `acp.runtime.ttlMinutes` 之後符合清理條件；已存放的會話中繼資料在 `/acp sessions` 內仍可供使用。

  </Accordion>
  <Accordion title="Native Codex 路由規則">
    當啟用 **native Codex 外掛程式**時，應路由至此的自然語言觸發條件：

    - "將此 Discord 頻道綁定至 Codex。"
    - "將此聊天附加至 Codex 執行緒 `<id>`。"
    - "顯示 Codex 執行緒，然後綁定此執行緒。"

    Native Codex 對話綁定是預設的聊天控制路徑。
    OpenClaw 動態工具仍透過 OpenClaw 執行，而
    Codex 原生工具（如 shell/apply-patch）則在 Codex 內部執行。
    針對 Codex 原生工具事件，OpenClaw 會注入每一輪的原生
    hook 中繼，讓外掛程式 hooks 可以阻擋 `before_tool_call`、觀察
    `after_tool_call`，並透過 OpenClaw 核准來路由 Codex `PermissionRequest` 事件。
    Codex `Stop` hooks 會被中繼至
    OpenClaw `before_agent_finalize`，外掛程式可在該處請求再進行一次
    模型傳遞，然後 Codex 完成其答案。此中繼保持
    蓄意保守：它不會變更 Codex 原生工具
    引數或重寫 Codex 執行緒記錄。僅在
    您想要 ACP 執行時期/工作階段模型時，才使用明確的 ACP。
    內嵌的 Codex 支援邊界已記載於
    [Codex harness v1 support contract](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

  </Accordion>
  <Accordion title="模型 / 提供者 / 執行時期選擇速查表">
    - legacy Codex model refs - 由 doctor 修復的 legacy Codex OAuth/subscription 模型路由。
    - `openai/*` - 適用於 OpenAI 代理程式回合的原生 Codex app-server 內嵌執行時期。
    - `/codex ...` - 原生 Codex 對話控制。
    - `/acp ...` 或 `runtime: "acp"` - 明確的 ACP/acpx 控制。

  </Accordion>
  <Accordion title="ACP 路由自然語言觸發器">
    應路由至 ACP 執行環境的觸發器：

    - 「將此作為一次性 Claude Code ACP 會話執行並總結結果。」
    - 「在執行緒中使用 Gemini CLI 執行此任務，然後在該同一執行緒中保留後續追蹤。」
    - 「透過 ACP 在背景執行緒中執行 Codex。」

    OpenClaw 會選取 `runtime: "acp"`，解析 harness `agentId`，
    在支援時綁定至目前對話或執行緒，並將後續追蹤路由至該會話直到關閉/過期。僅當
    明確指定 ACP/acpx 或要求的作業無法使用原生 Codex 外掛程式時，Codex
    才會遵循此路徑。

    針對 `sessions_spawn`，僅在啟用 ACP、請求者未在沙箱中
    且已載入 ACP 執行環境後端時，才會公告 `runtime: "acp"`。
    `acp.dispatch.enabled=false` 會暫停自動 ACP 執行緒分派，但不會隱藏或阻擋
    明確的 `sessions_spawn({ runtime: "acp" })` 呼叫。它以 ACP harness ID 為目標，例如 `codex`、
    `claude`、`droid`、`gemini` 或
    `opencode`。除非該項目已明確設定為
    `agents.list[].runtime.type="acp"`，否則請勿傳遞來自 `agents_list` 的
    一般 OpenClaw 設定代理程式 ID；否則請使用預設子代理程式執行環境。當
    OpenClaw 代理程式設定為 `runtime.type="acp"` 時，OpenClaw 會
    使用 `runtime.acp.agent` 作為基礎 harness ID。

  </Accordion>
</AccordionGroup>

## ACP 與子代理

當您需要外部 harness 執行環境時，請使用 ACP。當啟用
`codex` 外掛程式時，請使用 **原生 Codex
app-server** 進行 Codex 對話綁定/控制。當您想要
OpenClaw 原生委派執行時，請使用 **子代理程式**。

| 領域         | ACP 工作階段                        | 子代理執行                        |
| ------------ | ----------------------------------- | --------------------------------- |
| 執行環境     | ACP 後端外掛程式（例如 acpx）       | OpenClaw 原生子代理執行環境       |
| 工作階段金鑰 | `agent:<agentId>:acp:<uuid>`        | `agent:<agentId>:subagent:<uuid>` |
| 主要指令     | `/acp ...`                          | `/subagents ...`                  |
| 生成工具     | `sessions_spawn` 與 `runtime:"acp"` | `sessions_spawn` (預設執行環境)   |

另請參閱 [子代理程式](/zh-Hant/tools/subagents)。

## ACP 如何執行 Claude Code

對於透過 ACP 執行的 Claude Code，技術堆疊如下：

1. OpenClaw ACP 工作階段控制平面。
2. 官方 `@openclaw/acpx` 執行環境外掛程式。
3. Claude ACP 轉接器。
4. Claude 端的執行環境/工作階段機制。

ACP Claude 是具備 ACP 控制項、工作階段恢復、背景工作追蹤以及選用性對話/執行緒綁定的 **工具機工作階段**。

CLI 後端是獨立的純文字本地後援執行環境 - 請參閱
[CLI Backends](/zh-Hant/gateway/cli-backends)。

對於操作員來說，實用的原則是：

- **需要 `/acp spawn`、可綁定的會話、執行時間控制或持續的 harness 工作？** 請使用 ACP。
- **需要透過原始 CLI 進行簡單的本機文字備援嗎？** 請使用 CLI 後端。

## 綁定的工作階段

### 心智模型

- **聊天介面** - 人們持續交談的地方 (Discord 頻道、Telegram 主題、iMessage 聊天)。
- **ACP 工作階段** - OpenClaw 路由到的持久化 Codex/Claude/Gemini 執行環境狀態。
- **子執行緒/主題** - 一個僅由 `--thread ...` 建立的額外選用訊息傳遞介面。
- **執行工作區** - harness 執行的檔案系統位置 (`cwd`、repo checkout、後端工作區)。與聊天介面無關。

### 目前對話的綁定

`/acp spawn <harness> --bind here` 會將目前的對話釘選到
產生的 ACP 會話 - 不會建立子執行緒，使用相同的聊天介面。OpenClaw 持續負責傳輸、驗證、安全性和傳遞工作。該對話中的後續訊息會路由到同一個會話；`/new` 和 `/reset` 會原地重置
會話；`/acp close` 則會移除綁定。

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
    - `--bind here` 和 `--thread ...` 是互斥的。
    - `--bind here` 僅在宣稱支援目前對話綁定的頻道上運作；否則 OpenClaw 會傳回明確的不支援訊息。綁定在閘道重新啟動後會持續存在。
    - 在 Discord 上，`spawnSessions` 會限制 `--thread auto|here` 的子執行緒建立 - 而非 `--bind here`。
    - 如果您在不使用 `--cwd` 的情況下產生至不同的 ACP agent，OpenClaw 預設會繼承 **目標 agent 的** 工作區。遺失的繼承路徑 (`ENOENT`/`ENOTDIR`) 會退回至後端預設值；其他存取錯誤 (例如 `EACCES`) 則會以產生錯誤呈現。
    - 閘道管理命令會保留在綁定對話中的本機 - 即使一般的後續文字路由至綁定的 ACP 會話，`/acp ...` 命令仍由 OpenClaw 處理；只要該介面啟用了命令處理，`/status` 和 `/unfocus` 也會保留在本機。

  </Accordion>
  <Accordion title="Thread-bound sessions">
    當針對通道配接器啟用執行緒綁定時：

    - OpenClaw 會將執行緒綁定到目標 ACP 會話。
    - 該執行緒中的後續訊息會路由到已綁定的 ACP 會話。
    - ACP 輸出會傳遞回同一個執行緒。
    - 失去焦點/關閉/封存/閒置超時或最大期限過期會移除綁定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是 Gateway 指令，而非給 ACP harness 的提示詞。

    針對執行緒綁定 ACP 的必要功能旗標：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停自動 ACP 執行緒分派；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍可運作）。
    - 已啟用通道配接器執行緒會話生成（預設：`true`）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`

    執行緒綁定支援取決於特定的配接器。如果作用的通道配接器不支援執行緒綁定，OpenClaw 會回傳明確的不支援/無法使用訊息。

  </Accordion>
  <Accordion title="支援執行緒的頻道">
    - 任何公開工作階段/執行緒繫結功能的頻道轉接器。
    - 目前內建支援：**Discord** 執行緒/頻道、**Telegram** 主題（群組/超級群組中的論壇主題以及 DM 主題）。
    - 外掛程式頻道可以透過相同的繫結介面新增支援。

  </Accordion>
</AccordionGroup>

## 持續性頻道繫結

對於非暫時性的工作流程，請在頂層 `bindings[]` 項目中設定持久的 ACP 綁定。

### 繫結模型

<ParamField path="bindings[].type" type='"acp"'>
  標記持續性 ACP 對話繫結。
</ParamField>
<ParamField path="bindings[].match" type="object">
  識別目標對話。依頻道而定的形狀：

- **Discord 通道/執行緒：** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack 通道/DM：** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`。建議使用穩定的 Slack ID；通道綁定也會符合該通道執行緒內的回覆。
- **Telegram 論壇主題：** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **iMessage DM/群組：** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。建議使用 `chat_id:*` 以建立穩定的群組綁定。

</ParamField>
<ParamField path="bindings[].agentId" type="string">
  擁有的 OpenClaw agent id。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可選的 ACP 覆蓋。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  可選的操作員面標籤。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可選的執行期工作目錄。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可選的後端覆蓋。
</ParamField>

### 各 agent 的執行期預設值

使用 `agents.list[].runtime` 為每個代理程式定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**ACP 綁定會話的覆蓋優先順序：**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. ACP 全域預設值（例如 `acp.backend`）

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
- 在綁定對話中，`/new` 和 `/reset` 會原地重設相同的 ACP session key。
- 暫時的執行期綁定 (例如由 thread-focus 流程建立的) 若存在則仍會套用。
- 對於沒有明確指定 `cwd` 的跨 agent ACP 產生，OpenClaw 會從 agent 設定繼承目標 agent 的工作區。
- 遺漏的繼承工作區路徑會回退至後端預設的 cwd；未遺漏但存取失敗的情況會顯示為生成錯誤。

## 啟動 ACP 工作階段

啟動 ACP 工作階段有兩種方式：

<Tabs>
  <Tab title="從 sessions_spawn">
    使用 `runtime: "acp"` 從 agent 輪次或工具呼叫啟動 ACP session。

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
    `runtime` 預設為 `subagent`，因此請為 ACP session 明確設定 `runtime: "acp"`。如果省略 `agentId`，OpenClaw 會在設定後使用 `acp.defaultAgent`。`mode: "session"` 需要 `thread: true` 來維持持久的綁定對話。
    </Note>

  </Tab>
  <Tab title="從 /acp 指令">
    使用 `/acp spawn` 從聊天進行明確的操作員控制。

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
  傳送至 ACP 工作階段的初始提示詞。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  針對 ACP 工作階段必須為 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目標駕馭器 ID。若設定則回退為 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  在支援的情況下請求執行緒綁定流程。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 為一次性；`"session"` 為持續性。若 `thread: true` 且
  省略 `mode`，OpenClaw 可能會根據執行時路徑預設為持續性行為。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  請求的執行時工作目錄（由後端/執行時政策驗證）。若省略，ACP 產生程序在設定時會繼承目標代理程式工作區；遺失的繼承路徑會回退至後端預設值，而實際的存取錯誤則會被回傳。
</ParamField>
<ParamField path="label" type="string">
  用於工作階段/橫幅文字中、面向操作員的標籤。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢復現有的 ACP 工作階段而非建立新的。代理程式透過 `session/load` 重播其對話歷史。需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 會將初始 ACP 執行進度摘要以系統事件形式串流回請求者工作階段。接受的回應包括指向工作階段範圍 JSONL 記錄檔 (`<sessionId>.acp-stream.jsonl`) 的 `streamLogPath`，您可以對其執行 tail 以查看完整的中繼歷史。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  在 N 秒後中止 ACP 子回合。`0` 會將回合保持在閘道的無逾時路徑上。相同的值會套用至閘道執行和 ACP 執行時，以免停滯/配額耗盡的駕馭器無限期佔用父代理程道通道。
</ParamField>
<ParamField path="model" type="string">
  ACP 子工作階段的明確模型覆寫。Codex ACP 產生程序會在 `session/new` 之前將 OpenAI 參考（例如 `openai/gpt-5.4`）正規化為 Codex ACP 啟動設定；斜線形式（例如 `openai/gpt-5.4/high`）也會設定 Codex ACP 推理強度。其他駕馭器必須宣告 ACP `models` 並支援 `session/set_model`；否則 OpenClaw/acpx 會明確失敗，而非靜默回退至目標代理程式預設值。
</ParamField>
<ParamField path="thinking" type="string">
  明確的思考/推理強度。對於 Codex ACP，`minimal` 對應至低強度，`low`/`medium`/`high`/`xhigh` 直接對應，而 `off` 則省略推理強度啟動覆寫。
</ParamField>

## 生成繫結與執行緒模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行為                                                               |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | 就地綁定當前啟用的對話；如果沒有啟用的對話則失敗。 |
    | `off`  | 不建立當前對話的綁定。                          |

    註記：

    - `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作員途徑。
    - `--bind here` 不會建立子執行緒。
    - `--bind here` 僅在支援當前對話綁定的頻道上可用。
    - `--bind` 和 `--thread` 不能在相同的 `/acp spawn` 呼叫中組合使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行為                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------- |
    | `auto` | 在啟用的執行緒中：綁定該執行緒。在執行緒外：受支援時建立/綁定子執行緒。 |
    | `here` | 需要當前啟用的執行緒；如果不在其中則失敗。                                                  |
    | `off`  | 無綁定。工作階段以未綁定狀態啟動。                                                                 |

    註記：

    - 在非執行緒綁定介面上，預設行為實際上等同於 `off`。
    - 執行緒綁定的產生需要頻道政策支援：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 當您想要固定當前對話而不建立子執行緒時，請使用 `--bind here`。

  </Tab>
</Tabs>

## 傳遞模型

ACP 工作階段可以是互動式工作區，也可以是父擁有的背景工作。傳遞路徑取決於該結構。

<AccordionGroup>
  <Accordion title="互動式 ACP 會話">
    互動式會話旨在可見的聊天介面上持續對話：

    - `/acp spawn ... --bind here` 將當前對話綁定至 ACP 會話。
    - `/acp spawn ... --thread ...` 將頻道主題串/主題綁定至 ACP 會話。
    - 持久設定的 `bindings[].type="acp"` 會將符合的對話路由至同一個 ACP 會話。

    綁定對話中的後續訊息會直接路由至 ACP 會話，而 ACP 的輸出也會傳回同一個頻道/主題串/主題。

    OpenClaw 傳送至 harness 的內容：

    - 一般的綁定後續訊息會以提示文字傳送，並僅在 harness/後端支援時一併傳送附件。
    - `/acp` 管理指令與本機 Gateway 指令會在 ACP 分派前進行攔截。
    - 執行時產生的完成事件會依目標具體化。OpenClaw 代理程式會取得 OpenClaw 的內部執行時語言環境信封；外部 ACP harness 則會取得包含子結果與指示的一般提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 信封絕不應傳送給外部 harness 或作為 ACP 使用者對話紀錄文字保存。
    - ACP 對話紀錄項目會使用使用者可見的觸發文字或一般完成提示。內部事件元資料會盡可能維持在 OpenClaw 中的結構，而不會被視為使用者撰寫的聊天內容。

  </Accordion>
  <Accordion title="Parent-owned one-shot ACP sessions">
    由另一個代理運行產生的一次性 ACP 會話是背景子進程，類似於子代理：

    - 父代理使用 `sessions_spawn({ runtime: "acp", mode: "run" })` 請求工作。
    - 子代理在其自己的 ACP 駝鳥會話中運行。
    - 子代理回合在與原生子代理產生所使用的相同背景通道上運行，因此緩慢的 ACP 駝鳥不會阻斷不相關的主會話工作。
    - 完成報告透過任務完成公告路徑回報。OpenClaw 在將內部完成中繼資料發送到外部駝鳥之前，會將其轉換為純 ACP 提示，因此駝鳥不會看到僅限 OpenClaw 的執行時間內容標記。
    - 當使用者面向的回覆有用時，父代理會以正常的助理語氣重寫子代理的結果。

    請**勿**將此路徑視為父代理與子代理之間的點對點聊天。子代理已經有一個回報給父代理的完成通道。

  </Accordion>
  <Accordion title="sessions_send and A2A delivery">
    `sessions_send` 可以在產生後以另一個會話為目標。對於正常的
    對等會話，OpenClaw 在插入訊息後使用代理對代理 (A2A) 的後續路徑：

    - 等待目標會話的回覆。
    - 可選地讓請求者和目標交換有限數量的後續回合。
    - 要求目標產生公告訊息。
    - 將該公告傳送到可見的通道或執行緒。

    該 A2A 路徑是發送者需要可見後續內容的對等發送的後備機制。當不相關的會話可以
    看到並傳送訊息給 ACP 目標時，它會保持啟用，例如在廣泛的
    `tools.sessions.visibility` 設定下。

    只有當請求者是其自己的父代理擁有的一次性 ACP 子代理的父代理時，OpenClaw 才會跳過 A2A 後續。在這種情況下，
    在任務完成之上運行 A2A 可能會用子代理的結果喚醒父代理，將父代理的回覆轉發回子代理，並
    建立父/子回傳迴路。`sessions_send` 結果回報
    `delivery.status="skipped"` 給該擁有子代理的情況，因為
    完成路徑已負責該結果。

  </Accordion>
  <Accordion title="繼續現有工作階段">
    使用 `resumeSessionId` 來繼續先前的 ACP 工作階段，而非
    重新開始。代理程式會透過 `session/load` 重放其對話歷史，因此它能接續先前的完整內容。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常見使用案例：

    - 將 Codex 工作階段從您的筆記型電腦轉移到您的手機——告訴您的代理程式接續您先前離開的地方。
    - 繼續您先前在 CLI 中以互動方式開始的編碼工作階段，現在透過您的代理程式以無頭方式進行。
    - 接續因閘道重新啟動或閒置逾時而中斷的工作。

    注意事項：

    - `resumeSessionId` 僅在 `runtime: "acp"` 時適用；預設的子代理程式執行時期會忽略此 ACP 專用欄位。
    - `streamTo` 僅在 `runtime: "acp"` 時適用；預設的子代理程式執行時期會忽略此 ACP 專用欄位。
    - `resumeSessionId` 是主機本機的 ACP/harness 恢復 ID，而非 OpenClaw 頻道工作階段金鑰；在發送之前，OpenClaw 仍會檢查 ACP 產生原則和目標代理程式原則，而 ACP 後端或 harness 則擁有載入該上游 ID 的授權。
    - `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍需要 `thread: true`。
    - 目標代理程式必須支援 `session/load`（Codex 和 Claude Code 均支援）。
    - 如果找不到工作階段 ID，產生作業會失敗並顯示明確錯誤——不會自動無聲地回退至新的工作階段。

  </Accordion>
  <Accordion title="部署後冒煙測試">
    在網關部署後，執行實時端對端檢查，而不是僅信任單元測試：

    1. 在目標主機上驗證已部署的網關版本和提交記錄。
    2. 開啟一個指向實時代理程式的暫時性 ACPX 橋接器工作階段。
    3. 要求該代理程式使用 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和任務 `Reply with exactly LIVE-ACP-SPAWN-OK` 來呼叫 `sessions_spawn`。
    4. 驗證 `accepted=yes`、一個真正的 `childSessionKey`，以及沒有驗證器錯誤。
    5. 清理暫時性橋接器工作階段。

    請將閘道保持在 `mode: "run"` 上並跳過 `streamTo: "parent"` -
    執行緒綁定 `mode: "session"` 和串流中繼路徑是分開的
    更豐富的整合測試。

  </Accordion>
</AccordionGroup>

## Sandbox 相容性

ACP 工作階段目前運作於主機執行時期上，**而非**在 OpenClaw sandbox 內。

<Warning>
**安全性邊界：**

- 外部駔馱可以根據其自身的 CLI 權限和所選的 `cwd` 進行讀取/寫入。
- OpenClaw 的沙箱策略並不會封裝 ACP 駔馱的執行。
- OpenClaw 仍會強制執行 ACP 功能閘道、允許的代理程式、工作階段擁有權、頻道綁定和網關傳遞策略。
- 請使用 `runtime: "subagent"` 進行由沙箱強制執行的 OpenClaw 原生工作。

</Warning>

目前的限制：

- 如果請求者工作階段位於沙箱中，ACP 的產生會對於 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 這兩者都遭到封鎖。
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。

## 工作階段目標解析

大多數 `/acp` 動作都接受一個可選的工作階段目標 (`session-key`、
`session-id` 或 `session-label`)。

**解析順序：**

1. 明確的目標引數 (或針對 `/acp steer` 的 `--session`)
   - 接著嘗試 key
   - 接著 UUID 格式的工作階段 id
   - 接著 label
2. 目前執行緒綁定 (如果此對話/執行緒已綁定至 ACP 工作階段)。
3. 目前請求者工作階段備援。

目前對話綁定和執行緒綁定都會參與步驟 2。

如果沒有目標被解析，OpenClaw 會傳回一個清楚的錯誤
(`Unable to resolve session target: ...`)。

## ACP 控制指令

| 指令                 | 說明                                              | 範例                                                          |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 工作階段；選擇性的目前綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標工作階段正在進行的輪次。                  | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 將導向指令傳送至正在執行的工作階段。              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉工作階段並解除綁定執行緒目標。                | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。        | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標工作階段的執行時期模式。                  | `/acp set-mode plan`                                          |
| `/acp set`           | 通用執行時期設定選項寫入。                        | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定執行時期工作目錄覆寫。                        | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定核准原則設定檔。                              | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行時期逾時 (秒)。                           | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時期模型覆寫。                            | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除工作階段執行時期選項覆寫。                    | `/acp reset-options`                                          |
| `/acp sessions`      | 列出儲存庫中最近的 ACP 工作階段。                 | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀況、功能、可採取的修復措施。            | `/acp doctor`                                                 |
| `/acp install`       | 輸出確定性的安裝和啟用步驟。                      | `/acp install`                                                |

`/acp status` 會顯示有效的執行時期選項，加上執行時期層級和後端層級的工作階段識別碼。當後端缺乏某項功能時，不支援的控制錯誤會清楚地顯示出來。 `/acp sessions` 會讀取目前綁定或請求者工作階段的存放區；目標記號（`session-key`、`session-id` 或 `session-label`）會透過閘道工作階段探索來解析，包括自訂的各代理程式 `session.store` 根目錄。

### 執行時期選項對應

`/acp` 具有便利指令和一個通用設定器。對等操作：

| 指令                         | 對應至                       | 備註                                                                                                                                                                            |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 執行時期設定金鑰 `model`     | 對於 Codex ACP，OpenClaw 會將 `openai/<model>` 正規化為介面卡模型 ID，並將斜線推理後綴（例如 `openai/gpt-5.4/high`）對應到 `reasoning_effort`。                                 |
| `/acp set thinking <level>`  | 標準選項 `thinking`          | OpenClaw 會在存在時發送後端公告的對等項目，優先選擇 `thinking`，然後是 `effort`、`reasoning_effort` 或 `thought_level`。對於 Codex ACP，介面卡會將值對應到 `reasoning_effort`。 |
| `/acp permissions <profile>` | 標準選項 `permissionProfile` | OpenClaw 在存在時會發送後端通告的等效選項，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                   |
| `/acp timeout <seconds>`     | 標準選項 `timeoutSeconds`    | OpenClaw 在存在時會發送後端通告的等效選項，例如 `timeout` 或 `timeout_seconds`。                                                                                                |
| `/acp cwd <path>`            | 執行時期 cwd 覆寫            | 直接更新。                                                                                                                                                                      |
| `/acp set <key> <value>`     | 通用                         | `key=cwd` 使用 cwd 覆蓋路徑。                                                                                                                                                   |
| `/acp reset-options`         | 清除所有執行時期覆寫         | -                                                                                                                                                                               |

## acpx harness、外掛程式設定和權限

關於 acpx harness 配置（Claude Code / Codex / Gemini CLI 別名）、plugin-tools 和 OpenClaw-tools MCP 橋接以及 ACP 權限模式，請參閱 [ACP agents - setup](/zh-Hant/tools/acp-agents-setup)。

## 疑難排解

| 徵狀                                                                        | 可能原因                                                                         | 修復方式                                                                                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端插件遺失、已停用，或被 `plugins.allow` 封鎖。                                | 安裝並啟用後端插件，在設置該允許清單時將 `acpx` 包含在 `plugins.allow` 中，然後執行 `/acp doctor`。                                                           |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                                                 | 設置 `acp.enabled=true`。                                                                                                                                     |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息自動分派。                                                 | 設置 `acp.dispatch.enabled=true` 以恢復自動執行緒路由；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍然有效。                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理程式未在允許清單中。                                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                             |
| `/acp doctor` 報告啟動後立即後端未就緒                                      | 後端外掛程式遺失、已停用、被允許/拒絕原則封鎖，或其設定的可執行檔無法使用。      | 安裝/啟用後端插件，重新執行 `/acp doctor`，並檢查後端安裝或政策錯誤（若持續處於不健康狀態）。                                                                 |
| 找不到 Harness 指令                                                         | Adapter CLI 未安裝、外部插件遺失，或非 Codex adapter 的首次執行 `npx` 獲取失敗。 | 執行 `/acp doctor`，在 Gateway 主機上安裝/預熱 adapter，或明確配置 acpx agent 指令。                                                                          |
| 來自 harness 的 Model-not-found（找不到模型）錯誤                           | 模型 ID 對其他供應商/harness 有效，但對此 ACP 目標無效。                         | 使用該 harness 列出的模型、在 harness 中設定模型，或省略覆寫設定。                                                                                            |
| 來自 harness 的供應商驗證錯誤                                               | OpenClaw 狀況正常，但目標 CLI/供應商未登入。                                     | 登入或在 Gateway 主機環境中提供所需的供應商金鑰。                                                                                                             |
| `Unable to resolve session target: ...`                                     | 錯誤的金鑰/ID/標籤 token。                                                       | 執行 `/acp sessions`，複製確切的 key/label，然後重試。                                                                                                        |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有可繫結的生效對話中使用。                                     | 移至目標聊天/頻道並重試，或使用非綁定產生。                                                                                                                   |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏目前對話 ACP 綁定功能。                                                | 請在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或切換至支援的頻道。                                                               |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒上下文之外使用。                                         | 請移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                                |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位使用者擁有作用中的綁定目標。                                               | 以擁有者身分重新綁定，或使用不同的對話或執行緒。                                                                                                              |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺乏執行緒綁定功能。                                                       | 使用 `--thread off` 或切換至支援的介接卡/頻道。                                                                                                               |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行階段位於主機端；請求者階段已沙箱化。                                     | 從沙盒工作階段使用 `runtime="subagent"`，或從非沙盒工作階段執行 ACP 產生。                                                                                    |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | ACP 執行時期請求 `sandbox="require"`。                                           | 請將 `runtime="subagent"` 用於所需的沙盒化，或從非沙盒工作階段使用具有 `sandbox="inherit"` 的 ACP。                                                           |
| `Cannot apply --model ... did not advertise model support`                  | 目標駝具未公開一般 ACP 模型切換。                                                | 使用支援 ACP `models`/`session/set_model` 的駕馭工具、使用 Codex ACP 模型參照，或如果駕馭工具有自己的啟動旗標，請直接在其中設定模型。                         |
| 綁定階段缺少 ACP 中繼資料                                                   | 過時/已刪除的 ACP 階段中繼資料。                                                 | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦執行緒。                                                                                                         |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 工作階段中封鎖寫入/執行。                        | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](/zh-Hant/tools/acp-agents-setup#permission-configuration)。 |
| ACP 階段提早失敗且輸出甚少                                                  | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。                   | 請檢查閘道記錄中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。              |
| ACP 工作階段在完成工作後無限期停滯                                          | 處理序已完成，但 ACP 工作階段未回報完成狀態。                                    | 更新 OpenClaw；目前的 acpx 清理功能會在關閉和 Gateway 啟動時清除 OpenClaw 擁有的過時包裝程式與配接器處理序。                                                  |
| 駕馭工具看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                        | 內部事件信封洩漏至 ACP 邊界之外。                                                | 更新 OpenClaw 並重新執行完成流程；外部 harness 應僅接收純文字的完成提示。                                                                                     |

<Note>`Command blocked by PreToolUse hook: Native hook relay unavailable` 屬於 原生 Codex hook 中繼，而非 ACP/acpx。在綁定的 Codex 聊天中，使用 `/new` 或 `/reset` 啟動新 會話；如果它運作一次後在下一次原生工具呼叫時再次出現，請重新啟動 Codex 應用程式伺服器或 OpenClaw Gateway，而不要 重複 `/new`。請參閱 [Codex harness 故障排除](/zh-Hant/plugins/codex-harness#troubleshooting)。</Note>

## 相關

- [ACP agents - setup](/zh-Hant/tools/acp-agents-setup)
- [Agent send](/zh-Hant/tools/agent-send)
- [CLI Backends](/zh-Hant/gateway/cli-backends)
- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (橋接模式)](/zh-Hant/cli/acp)
- [Sub-agents](/zh-Hant/tools/subagents)
