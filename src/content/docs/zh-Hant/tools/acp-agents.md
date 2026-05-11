---
summary: "透過 ACP 後端執行外部編程工具（Claude Code、Cursor、Gemini CLI、顯式 Codex ACP、OpenClaw ACP、OpenCode）"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message-channel conversation to a persistent ACP session
  - Troubleshooting ACP backend, plugin wiring, or completion delivery
  - Operating /acp commands from chat
title: "ACP 代理"
sidebarTitle: "ACP 代理"
---

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 工作階段
讓 OpenClaw 透過 ACP 後端外掛程式執行外部編程工具（例如 Pi、Claude Code、
Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI，以及其他
支援的 ACPX 工具）。

每個 ACP 工作階段的產生都會作為[背景任務](/zh-Hant/automation/tasks)進行追蹤。

<Note>
**ACP 是外部工具路徑，而非預設的 Codex 路徑。** 原生
Codex 應用程式伺服器外掛程式擁有 `/codex ...` 控制項與
`agentRuntime.id: "codex"` 嵌入式執行環境；ACP 則擁有
`/acp ...` 控制項與 `sessions_spawn({ runtime: "acp" })` 工作階段。

如果您希望 Codex 或 Claude Code 以外部 MCP 用戶端身分
直接連線至現有的 OpenClaw 頻道對話，請使用
[`openclaw mcp serve`](/zh-Hant/cli/mcp) 而非 ACP。

</Note>

## 我需要哪個頁面？

| 您想要…                                                                   | 使用此項                             | 備註                                                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 在目前對話中綁定或控制 Codex                                              | `/codex bind`、`/codex threads`      | 當啟用 `codex` 外掛程式時的原生 Codex 應用程式伺服器路徑；包含綁定的聊天回覆、圖片轉發、模型/快速/權限、停止及導向控制項。ACP 為顯式的後備方案 |
| 透過 OpenClaw 執行 Claude Code、Gemini CLI、顯式 Codex ACP 或其他外部工具 | 本頁面                               | 聊天綁定工作階段、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、背景任務、執行時期控制項                                                 |
| 將 OpenClaw Gateway 工作階段「作為」ACP 伺服器暴露給編輯器或用戶端        | [`openclaw acp`](/zh-Hant/cli/acp)        | 橋接模式。IDE/用戶端透過 stdio/WebSocket 以 ACP 通訊協定與 OpenClaw 通訊                                                                       |
| 重複使用本機 AI CLI 作為純文字後備模型                                    | [CLI 後端](/zh-Hant/gateway/cli-backends) | 非 ACP。沒有 OpenClaw 工具、沒有 ACP 控制項、沒有工具執行環境                                                                                  |

## 這是否能直接運作？

通常是的。全新安裝預設會啟用隨附的 `acpx` 執行階段外掛程式，並帶有外掛程式本機固定的 `acpx` 二進位檔案，OpenClaw 會在啟動時進行偵測並自行修復。執行 `/acp doctor` 以進行就緒檢查。

只有在 ACP **真正可用** 時，OpenClaw 才會告知代理程式有關 ACP 產生的資訊：ACP 必須已啟用、調度不得停用、目前的工作階段不得受到沙盒封鎖，且必須已載入執行階段後端。如果未滿足這些條件，ACP 外掛程式技能和 `sessions_spawn` ACP 指引將保持隱藏，以免代理程式建議使用無法使用的後端。

<AccordionGroup>
  <Accordion title="首次執行的注意事項">
    - 如果設定了 `plugins.allow`，它會是一個限制性的外掛程式清單，且**必須**包含 `acpx`；否則隨附的預設值會遭到刻意封鎖，且 `/acp doctor` 會回報缺少允許清單項目。
    - 目標標配接器 (Codex、Claude 等) 可能會在您首次使用時，透過 `npx` 按需求擷取。
    - 供應商的驗證機制必須存在於該標的主機上。
    - 如果主機沒有 npm 或網路存取權，首次執行的配接器擷取作業將會失敗，直到快取已預熱或透過其他方式安裝配接器為止。
  </Accordion>
  <Accordion title="運行時先決條件">
    ACP 會啟動真實的外部驅動程序進程。OpenClaw 負責路由、
    背景任務狀態、交付、綁定和策略；驅動程序
    則擁有其提供者登入、模型目錄、檔案系統行為和
    原生工具的控制權。

    在歸咎於 OpenClaw 之前，請驗證：

    - `/acp doctor` 回報一個已啟用且健康的後端。
    - 當設定了允許清單時，目標 id 被 `acp.allowedAgents` 允許。
    - 驅動程序指令可以在 Gateway 主機上啟動。
    - 該驅動程序存在提供者驗證（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 所選模型存在於該驅動程序中 —— 模型 id 無法在驅動程序之間移植。
    - 請求的 `cwd` 存在且可存取，或者省略 `cwd` 讓後端使用其預設值。
    - 權限模式符合工作需求。非互動式工作階段無法點擊原生權限提示，因此涉及大量寫入/執行的編碼作業通常需要能以無人干頤方式進行的 ACPX 權限設定檔。

  </Accordion>
</AccordionGroup>

OpenClaw 外掛工具和內建 OpenClaw 工具預設**不**會曝露給
ACP 驅動程序。僅當驅動程序應直接呼叫這些工具時，才在
[ACP agents — setup](/zh-Hant/tools/acp-agents-setup) 中啟用明確的 MCP 橋接器。

## 支援的驅動程序目標

使用隨附的 `acpx` 後端時，請將這些驅動程序 id 用作 `/acp spawn <id>`
或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 目標：

| 驅動程序 id | 典型後端                                       | 備註                                                                         |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `claude`    | Claude Code ACP 配接器                         | 需要主機上的 Claude Code 驗證。                                              |
| `codex`     | Codex ACP 配接器                               | 僅在原生 `/codex` 不可用或請求 ACP 時，才作為明確的 ACP 後備方案。           |
| `copilot`   | GitHub Copilot ACP 配接器                      | 需要 Copilot CLI/執行時驗證。                                                |
| `cursor`    | Cursor CLI ACP (`cursor-agent acp`)            | 如果本機安裝公開了不同的 ACP 進入點，請覆寫 acpx 指令。                      |
| `droid`     | Factory Droid CLI                              | Requires Factory/Droid auth or `FACTORY_API_KEY` in the harness environment. |
| `gemini`    | Gemini CLI ACP 配接器                          | Requires Gemini CLI auth or API key setup.                                   |
| `iflow`     | iFlow CLI                                      | Adapter availability and model control depend on the installed CLI.          |
| `kilocode`  | Kilo Code CLI                                  | Adapter availability and model control depend on the installed CLI.          |
| `kimi`      | Kimi/Moonshot CLI                              | Requires Kimi/Moonshot auth on the host.                                     |
| `kiro`      | Kiro CLI                                       | Adapter availability and model control depend on the installed CLI.          |
| `opencode`  | OpenCode ACP 配接器                            | Requires OpenCode CLI/provider auth.                                         |
| `openclaw`  | OpenClaw Gateway bridge through `openclaw acp` | Lets an ACP-aware harness talk back to an OpenClaw Gateway session.          |
| `pi`        | Pi/embedded OpenClaw runtime                   | Used for OpenClaw-native harness experiments.                                |
| `qwen`      | Qwen Code / Qwen CLI                           | Requires Qwen-compatible auth on the host.                                   |

Custom acpx agent aliases can be configured in acpx itself, but OpenClaw
policy still checks `acp.allowedAgents` and any
`agents.list[].runtime.acp.agent` mapping before dispatch.

## Operator runbook

Quick `/acp` flow from chat:

<Steps>
  <Step title="Spawn">
    `/acp spawn claude --bind here`,
    `/acp spawn gemini --mode persistent --thread auto`, or explicit
    `/acp spawn codex --bind here`.
  </Step>
  <Step title="Work">
    Continue in the bound conversation or thread (or target the session
    key explicitly).
  </Step>
  <Step title="Check state">
    `/acp status`
  </Step>
  <Step title="Tune">
    `/acp model <provider/model>`,
    `/acp permissions <profile>`,
    `/acp timeout <seconds>`.
  </Step>
  <Step title="Steer">
    Without replacing context: `/acp steer tighten logging and continue`.
  </Step>
  <Step title="Stop">
    `/acp cancel` (當前輪次) 或 `/acp close` (工作階段 + 繫結)。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命週期詳情">
    - Spawn 會建立或復原 ACP 執行時段工作階段，在 OpenClaw 工作階段存放區中記錄 ACP 元數據，並且當執行作業為父級擁有時可能會建立背景任務。
    - 繫結的後續訊息會直接傳送至 ACP 工作階段，直到繫結關閉、取消聚焦、重設或過期為止。
    - 閘道命令會保留在本地。`/acp ...`、`/status` 和 `/unfocus` 絕不會以一般提示文字的形式傳送至已繫結的 ACP 工具線束。
    - 當後端支援取消時，`cancel` 會中止作用中的輪次；它不會刪除繫結或工作階段元數據。
    - `close` 會從 OpenClaw 的角度終止 ACP 工作階段並移除繫結。如果工具線束支援復原，它可能仍會保留自己的上游歷史記錄。
    - 閒置的執行時段工作程序在 `acp.runtime.ttlMinutes` 之後符合清除條件；已儲存的工作階段元數據在 `/acp sessions` 之間仍可供使用。
  </Accordion>
  <Accordion title="Native Codex 路由規則">
    當啟用時，應路由至 **原生 Codex
    外掛程式** 的自然語言觸發條件：

    - "將此 Discord 頻道綁定到 Codex。"
    - "將此聊天附加到 Codex 執行緒 `<id>`。"
    - "顯示 Codex 執行緒，然後綁定此執行緒。"

    原生 Codex 對話綁定是預設的聊天控制路徑。
    OpenClaw 動態工具仍然透過 OpenClaw 執行，而
    原生 Codex 工具（例如 shell/apply-patch）則在 Codex 內部執行。
    對於原生 Codex 工具事件，OpenClaw 會注入每回合的原生
    Hook 中繼，因此外掛程式 Hooks 可以封鎖 `before_tool_call`、觀察
    `after_tool_call`，並透過 OpenClaw 核准路由 Codex `PermissionRequest` 事件。
    Codex `Stop` Hooks 會中繼至
    OpenClaw `before_agent_finalize`，外掛程式可以在 Codex 完成其答案之前請求再進行一次模型傳遞。
    中繼保持刻意保守：它不會變更原生 Codex 工具
    引數或重寫 Codex 執行緒記錄。僅在您
    需要 ACP 執行階段/工作階段模型時，才使用明確的 ACP。
    內嵌 Codex 支援邊界記載於
    [Codex harness v1 support contract](/zh-Hant/plugins/codex-harness#v1-support-contract)。

  </Accordion>
  <Accordion title="模型 / 提供者 / 執行階段選擇速查表">
    - `openai-codex/*` — PI Codex OAuth/訂閱路由。
    - `openai/*` 加上 `agentRuntime.id: "codex"` — 原生 Codex 應用伺服器內嵌執行階段。
    - `/codex ...` — 原生 Codex 對話控制。
    - `/acp ...` 或 `runtime: "acp"` — 明確的 ACP/acpx 控制。
  </Accordion>
  <Accordion title="ACP 路由自然語言觸發器">
    應路由至 ACP 執行時的觸發器：

    - 「將此作為一次性 Claude Code ACP 會話執行並總結結果。」
    - 「在此執行緒中使用 Gemini CLI 執行此任務，然後在同一執行緒中保留後續追蹤。」
    - 「透過 ACP 在背景執行緒中執行 Codex。」

    OpenClaw 會選取 `runtime: "acp"`，解析駕駛程式 `agentId`，
    在支援時綁定至目前對話或執行緒，並將後續追蹤路由至該會話直到關閉/過期。Codex 僅
    在明確使用 ACP/acpx 或要求的操作無法使用原生 Codex
    外掛程式時，才會遵循此路徑。

    對於 `sessions_spawn`，僅在啟用
    ACP、請求者未被沙箱化且已載入 ACP 執行時後端時，才會公告 `runtime: "acp"`。
    `acp.dispatch.enabled=false` 會暫停自動
    ACP 執行緒分派，但不會隱藏或封鎖明確的
    `sessions_spawn({ runtime: "acp" })` 呼叫。它的目標是 ACP 駕駛程式 ID，例如 `codex`、
    `claude`、`droid`、`gemini` 或 `opencode`。
    除非該項目已使用 `agents.list[].runtime.type="acp"` 明確設定，否則請勿傳遞來自 `agents_list` 的正常
    OpenClaw 設定代理程式 ID；
    否則請使用預設的子代理程式執行時。當 OpenClaw 代理程式
    已使用 `runtime.type="acp"` 設定時，OpenClaw 會使用
    `runtime.acp.agent` 作為基礎駕駛程式 ID。

  </Accordion>
</AccordionGroup>

## ACP 與子代理比較

當您需要外部裝置執行時期時，請使用 ACP。當啟用 `codex` 外掛程式時，請使用 **原生 Codex 應用程式伺服器** 進行 Codex 對話繫結/控制。當您需要 OpenClaw 原生委派執行時，請使用 **子代理**。

| 領域         | ACP 工作階段                          | 子代理執行                        |
| ------------ | ------------------------------------- | --------------------------------- |
| 執行時期     | ACP 後端外掛程式（例如 acpx）         | OpenClaw 原生子代理執行時期       |
| 工作階段金鑰 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要指令     | `/acp ...`                            | `/subagents ...`                  |
| 產生工具     | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn` (預設執行階段)   |

另請參閱[子代理程式](/zh-Hant/tools/subagents)。

## ACP 如何執行 Claude Code

透過 ACP 執行 Claude Code 的技術堆疊如下：

1. OpenClaw ACP 工作階段控制平面。
2. 內建的 `acpx` 執行階段外掛程式。
3. Claude ACP 配接器。
4. Claude 端的執行階段/工作階段機制。

ACP Claude 是一個具備 ACP 控制功能、工作階段恢復、背景工作追蹤以及選用性對話/執行緒綁定功能的 **harvest 工作階段**。

CLI 後端是獨立的純文字本機備援執行階段 — 請參閱 [CLI 後端](/zh-Hant/gateway/cli-backends)。

對操作員來說，實用的原則是：

- **需要 `/acp spawn`、可綁定的工作階段、執行階段控制或持續的 harness 工作？** 請使用 ACP。
- **需要透過原始 CLI 進行簡單的本機文字備援？** 請使用 CLI 後端。

## 綁定的工作階段

### 心智模型

- **聊天介面** — 人們持續交談的地方 (Discord 頻道、Telegram 主題、iMessage 聊天)。
- **ACP 工作階段** — OpenClaw 路由至的持久 Codex/Claude/Gemini 執行階段狀態。
- **子執行緒/主題** — 僅由 `--thread ...` 建立的選用額外訊息介面。
- **執行階段工作區** — harness 執行的檔案系統位置 (`cwd`、repo checkout、後端工作區)。獨立於聊天介面。

### 目前對話的綁定

`/acp spawn <harness> --bind here` 將目前的對話固定至
產生的 ACP 工作階段 — 無子執行緒，相同的聊天介面。OpenClaw 繼續
負責傳輸、驗證、安全和遞送。該對話中的後續訊息會
路由至同一個工作階段；`/new` 和 `/reset` 會就地
重設工作階段；`/acp close` 則會移除綁定。

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
  <Accordion title="綁定規則與專屬性">
    - `--bind here` 和 `--thread ...` 是互斥的。
    - `--bind here` 僅在支援當前對話綁定的頻道上運作；否則 OpenClaw 會傳回明確的不支援訊息。綁定會在 Gateway 重新啟動後持續存在。
    - 在 Discord 上，僅當 OpenClaw 需要為 `--thread auto|here` 建立子執行緒時，才需要 `spawnAcpSessions` — 而非針對 `--bind here`。
    - 如果您在沒有 `--cwd` 的情況下產生不同的 ACP 代理程式，OpenClaw 預設會繼承 **目標代理程式的** 工作區。遺失的繼承路徑 (`ENOENT`/`ENOTDIR`) 會回退至後端預設值；其他存取錯誤（例如 `EACCES`）會顯示為產生錯誤。
    - Gateway 管理指令會保留在綁定的對話中 — `/acp ...` 指令由 OpenClaw 處理，即使一般的後續文字會路由至綁定的 ACP 工作階段；只要針對該介面啟用指令處理，`/status` 和 `/unfocus` 也會保留在本地。
  </Accordion>
  <Accordion title="綁定執行緒的工作階段">
    當為頻道配接器啟用執行緒繫結時：

    - OpenClaw 會將執行緒繫結至目標 ACP 工作階段。
    - 該執行緒中的後續訊息會路由至已繫結的 ACP 工作階段。
    - ACP 輸出會傳遞回同一個執行緒。
    - 失去焦點/關閉/封存/閒置逾時或最大存留期到期會移除繫結。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是閘道指令，而非傳送給 ACP 韌體的提示詞。

    繫結執行緒的 ACP 所需的功能旗標：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停自動 ACP 執行緒分派；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍可運作）。
    - 啟用頻道配接器 ACP 執行緒產生旗標（依配接器而定）：
      - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

    執行緒繫結支援依配接器而定。如果作用中的頻道配接器不支援執行緒繫結，OpenClaw 會傳回清楚的「不支援/無法使用」訊息。

  </Accordion>
  <Accordion title="支援執行緒的頻道">
    - 任何公開工作階段/執行緒繫結功能的頻道配接器。
    - 目前內建支援：**Discord** 執行緒/頻道、**Telegram** 主題（群組/超級群組中的論壇主題以及 DM 主題）。
    - 外掛程式頻道可以透過相同的繫結介面新增支援。
  </Accordion>
</AccordionGroup>

## 持續性頻道繫結

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定持續性 ACP 繫結。

### 繫結模型

<ParamField path="bindings[].type" type='"acp"'>
  標記持續性 ACP 對話繫結。
</ParamField>
<ParamField path="bindings[].match" type="object">
  識別目標對話。依頻道而定的形狀：

- **Discord 頻道/執行緒：** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Telegram 論壇主題：** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **BlueBubbles DM/群組：** `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。建議使用 `chat_id:*` 或 `chat_identifier:*` 以獲得穩定的群組綁定。
- **iMessage DM/群組：** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。建議使用 `chat_id:*` 以獲得穩定的群組綁定。
  </ParamField>
<ParamField path="bindings[].agentId" type="string">
擁有的 OpenClaw 代理程式 ID。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
選用的 ACP 覆寫。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
選用的操作員面向標籤。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
選用的執行時工作目錄。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
選用的後端覆寫。
</ParamField>

### 每個代理程式的執行時預設值

使用 `agents.list[].runtime` 為每個代理程式定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**ACP 綁定會話的覆寫優先順序：**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全域 ACP 預設值 (例如 `acp.backend`)

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

- OpenClaw 會在使用前確保已設定的 ACP 會話存在。
- 該頻道或主題中的訊息會路由到已設定的 ACP 會話。
- 在綁定對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 暫時的執行時綁定 (例如由執行緒焦點流程建立的) 仍然會在存在的地方套用。
- 對於沒有明確 `cwd` 的跨代理程式 ACP 衍生，OpenClaw 會從代理程式設定繼承目標代理程式工作區。
- 缺少繼承的工作區路徑會回退到後端預設 cwd；非缺少的存取失敗會顯示為衍生錯誤。

## 啟動 ACP 會話

啟動 ACP 會話的兩種方式：

<Tabs>
  <Tab title="From sessions_spawn">
    使用 `runtime: "acp"` 從代理輪次或
    工具呼叫啟動 ACP 會話。

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
    `runtime` 預設為 `subagent`，因此請明確設定 `runtime: "acp"`
    以用於 ACP 會話。如果省略 `agentId`，OpenClaw 在經過配置後會使用
    `acp.defaultAgent`。`mode: "session"` 需要
    `thread: true` 來保持持久的綁定對話。
    </Note>

  </Tab>
  <Tab title="From /acp command">
    使用 `/acp spawn` 透過聊天進行明確的操作員控制。

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    關鍵旗標：

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    參閱 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Tab>
</Tabs>

### `sessions_spawn` 參數

<ParamField path="task" type="string" required>
  傳送至 ACP 會話的初始提示詞。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  針對 ACP 會話必須為 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目標駕駛程式 ID。若設定則回退至 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  請求執行緒綁定流程（於支援時）。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 為一次性；`"session"` 為持久性。若 `thread: true` 且
  省略 `mode`，OpenClaw 可能根據執行時路徑預設為持久性行為。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  請求的執行時工作目錄（由後端/執行時原則驗證）。若省略，在設定時 ACP 生成任務會繼承目標代理程式工作區；遺失的繼承路徑會回退至後端預設值，而實際存取錯誤則會被傳回。
</ParamField>
<ParamField path="label" type="string">
  用於會話/橫幅文字的導向操作員標籤。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢復現有的 ACP 會話，而非建立新會話。代理程式透過 `session/load` 重播其對話記錄。需要
  `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 會將初始 ACP 執行進度摘要作為系統事件串流回傳給請求者會話。接受的回應包括指向會話範圍 JSONL 記錄檔
  （`<sessionId>.acp-stream.jsonl`）的 `streamLogPath`，您可以對其進行 tail 以取得完整轉送記錄。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  在 N 秒後中止 ACP 子回合。`0` 將回合保留在閘道的無逾時路徑上。相同的值會套用至閘道執行和 ACP 執行時，因此停滯/配額耗盡的駕駛程式不會無限期佔用父代理程式通道。
</ParamField>
<ParamField path="model" type="string">
  ACP 子會話的明確模型覆寫。Codex ACP 生成任務會在 `session/new` 之前，將 OpenClaw Codex 參照（例如 `openai-codex/gpt-5.4`）正規化為 Codex ACP 啟動組態；斜線形式（例如 `openai-codex/gpt-5.4/high`）也會設定 Codex ACP 推理強度。
  其他駕駛程式必須公告 ACP `models` 並支援 `session/set_model`；否則 OpenClaw/acpx 會清楚失敗，而非靜默回退至目標代理程式預設值。
</ParamField>
<ParamField path="thinking" type="string">
  明確思考/推理強度。對於 Codex ACP，`minimal` 對應至低強度，`low`/`medium`/`high`/`xhigh` 直接對應，而 `off`
  則省略推理強度啟動覆寫。
</ParamField>

## 生成綁定和執行緒模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行為                                                               |
    | ------ | ---------------------------------------------------------------------- |
    | `here` | 將當前啟用的對話就地綁定；如果未啟用則失敗。 |
    | `off`  | 不要建立當前對話綁定。                          |

    註記：

    - `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作員途徑。
    - `--bind here` 不會建立子執行緒。
    - `--bind here` 僅在支援當前對話綁定的頻道上可用。
    - `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中合併使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行為                                                                                            |
    | ------ | --------------------------------------------------------------------------------------------------- |
    | `auto` | 在啟用的執行緒中：綁定該執行緒。在執行緒外：在支援時建立/綁定子執行緒。 |
    | `here` | 要求當前啟用的執行緒；如果未在執行緒中則失敗。                                                  |
    | `off`  | 無綁定。工作階段以未綁定狀態啟動。                                                                 |

    註記：

    - 在非執行緒綁定介面上，預設行為實際上是 `off`。
    - 執行緒綁定生成需要頻道原則支援：
      - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
    - 當您想要固定當前對話而不建立子執行緒時，請使用 `--bind here`。

  </Tab>
</Tabs>

## 傳遞模型

ACP 工作階段可以是互動式工作區或父擁有的背景工作。傳遞路徑取決於該形狀。

<AccordionGroup>
  <Accordion title="互動式 ACP 工作階段">
    互動式工作階段旨在於可見的聊天介面上持續對話：

    - `/acp spawn ... --bind here` 將目前對話繫結至 ACP 工作階段。
    - `/acp spawn ... --thread ...` 將頻道執行緒/主題繫結至 ACP 工作階段。
    - 持久化設定的 `bindings[].type="acp"` 會將符合條件的對話路由至同一個 ACP 工作階段。

    已繫結對話中的後續訊息會直接路由至 ACP 工作階段，而 ACP 的輸出則會傳回至同一個頻道/執行緒/主題。

    OpenClaw 傳送至 Harness 的內容：

    - 一般的已繫結後續訊息會以提示文字傳送，並且僅在 Harness/後端支援時才會附加附件。
    - `/acp` 管理指令與本機 Gateway 指令會在 ACP 分派前被攔截。
    - 執行時期產生的完成事件會依目標具體化。OpenClaw Agent 會取得 OpenClaw 的內部執行時期環境封包；外部 ACP Harness 則會取得包含子項結果與指示的純提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 環境封包絕不應傳送至外部 Harness，或作為 ACP 使用者文字紀錄保存。
    - ACP 文字紀錄項目使用使用者可見的觸發文字或純完成提示。內部事件中繼資料會盡可能在 OpenClaw 中保持結構化，且不會被視為使用者撰寫的聊天內容。

  </Accordion>
  <Accordion title="父級擁有的單次 ACP 會話">
    由另一個代理程式執行產生的單次 ACP 會話是背景子程序，類似於子代理程式：

    - 父級使用 `sessions_spawn({ runtime: "acp", mode: "run" })` 請求工作。
    - 子級在自己的 ACP 驅動程式會話中執行。
    - 子級回合在原生子代理程式產生所使用的同一背景通道上執行，因此緩慢的 ACP 驅動程式不會阻擋不相關的主會話工作。
    - 完成報告透過任務完成通告路徑回報。OpenClaw 在將內部完成中繼資料傳送至外部驅動程式之前，會將其轉換為純 ACP 提示，因此驅動程式不會看到僅限 OpenClaw 的執行階段內容標記。
    - 當使用者面向的回覆很有用時，父級會以正常的助理語氣重寫子級結果。

    請**勿**將此路徑視為父級與子級之間的點對點聊天。子級已經有一個回至父級的完成通道。

  </Accordion>
  <Accordion title="sessions_send 和 A2A 傳遞">
    `sessions_send` 可以在生成後以另一個會話為目標。對於正常的
    對等會話，OpenClaw 在注入訊息後會使用代理對代理 (A2A) 的後續路徑：

    - 等待目標會話的回覆。
    - 可選地讓請求者和目標交換有限數量的後續輪次。
    - 要求目標產生公告訊息。
    - 將該公告傳遞到可見的頻道或執行緒。

    該 A2A 路徑是發送者需要可見後續回應的對等傳送的備用方案。當不相關的會話
    可以查看並向 ACP 目標發送訊息時，它會保持啟用，例如在寬鬆的
    `tools.sessions.visibility` 設定下。

    只有當請求者是其自己父級擁有的一次性 ACP 子級的父級時，
    OpenClaw 才會跳過 A2A 後續。在這種情況下，在任務完成之上執行 A2A 可能會
    用子級的結果喚醒父級，將父級的回覆轉發回子級，並
    建立父/子回響循環。`sessions_send` 結果會針對該擁有子級的情況回報
    `delivery.status="skipped"`，因為完成路徑已經負責該結果。

  </Accordion>
  <Accordion title="恢復現有工作階段">
    使用 `resumeSessionId` 以繼續先前的 ACP 工作階段，而非重新開始。代理程式會透過 `session/load` 重播其對話歷史，因此它能獲得先前內容的完整脈絡。

    ```json
    {
      "task": "Continue where we left off — fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常見使用情境：

    - 將 Codex 工作階段從您的筆記型電腦移交到您的手機 — 指示您的代理程式接續您中斷的地方。
    - 繼續您在 CLI 中以互動方式開始的程式設計工作階段，現在透過您的代理程式以無介面方式進行。
    - 恢復因閘道重新啟動或閒置逾時而中斷的工作。

    備註：

    - `resumeSessionId` 僅適用於 `runtime: "acp"`；預設子代理程式執行時間會忽略此 ACP 專用欄位。
    - `streamTo` 僅適用於 `runtime: "acp"`；預設子代理程式執行時間會忽略此 ACP 專用欄位。
    - `resumeSessionId` 是主機本機的 ACP/harness 恢復 ID，而非 OpenClaw 頻道工作階段金鑰；OpenClaw 在分派前仍會檢查 ACP 生成原則和目標代理程式原則，而 ACP 後端或 harness 則擁有載入該上游 ID 的授權。
    - `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍需要 `thread: true`。
    - 目標代理程式必須支援 `session/load`（Codex 和 Claude Code 支援）。
    - 如果找不到工作階段 ID，生成會失敗並顯示清楚的錯誤訊息 — 不會無聲地回退到新的工作階段。

  </Accordion>
  <Accordion title="部署後冒煙測試">
    在網關部署後，請運行實時端到端檢查，而不要僅信任單元測試：

    1. 在目標主機上驗證已部署的網關版本和提交記錄。
    2. 開啟一個臨時 ACPX 橋接會話連接到活躍的代理程式。
    3. 要求該代理程式呼叫 `sessions_spawn`，並帶有 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 和任務 `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 驗證 `accepted=yes`、真實的 `childSessionKey` 以及沒有驗證器錯誤。
    5. 清理臨時橋接會話。

    將閘門保持在 `mode: "run"` 上並跳過 `streamTo: "parent"` —
    執行緒綁定 `mode: "session"` 和流轉發路徑是分開的

、更豐富的整合傳遞。

  </Accordion>
</AccordionGroup>

## 沙箱相容性

ACP 會話目前在主機執行時上運行，**而非**在
OpenClaw 沙箱內部。

<Warning>
**安全邊界：**

- 外部套件可以根據其自身的 CLI 權限和選定的 `cwd` 進行讀寫。
- OpenClaw 的沙箱策略**不會**包裝 ACP 套件執行。
- OpenClaw 仍然執行 ACP 功能閘門、允許的代理程式、會話擁有權、頻道綁定和網關遞送策略。
- 使用 `runtime: "subagent"` 進行沙箱強制執行的 OpenClaw 原生工作。
  </Warning>

目前限制：

- 如果請求者會話是在沙箱中，則會阻止 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 的 ACP 衍生。
- 帶有 `runtime: "acp"` 的 `sessions_spawn` 不支援 `sandbox: "require"`。

## 會話目標解析

大多數 `/acp` 動作都接受可選的會話目標 (`session-key`、
`session-id` 或 `session-label`)。

**解析順序：**

1. 明確的目標引數 (或 `--session` 用於 `/acp steer`)
   - 嘗試鍵 (tries key)
   - 然後是 UUID 形狀的會話 ID
   - 然後是標籤
2. 目前的執行緒綁定 (如果此對話/執行緒已綁定到 ACP 會話)。
3. 目前的請求者會話備案。

目前對話綁定和執行緒綁定都會參與步驟 2。

如果沒有解析出目標，OpenClaw 會傳回一個清晰的錯誤
(`Unable to resolve session target: ...`)。

## ACP 控制

| 指令                 | 作用                                        | 範例                                                          |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 會話；可選的目前綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標會話進行中的輪次。                  | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 將導引指令發送到執行中的會話。              | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉會話並解除綁定執行緒目標。              | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。  | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標會話的執行時期模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 一般執行時期設定選項寫入。                  | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定執行時期工作目錄覆寫。                  | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定核准政策設定檔。                        | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行時期逾時 (秒)。                     | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時期模型覆寫。                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除會話執行時期選項覆寫。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 列出來自儲存空間的近期 ACP 會話。           | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀況、功能、可採取的修復措施。      | `/acp doctor`                                                 |
| `/acp install`       | 列出具確定性的安裝和啟用步驟。              | `/acp install`                                                |

`/acp status` 顯示有效的執行時期選項以及執行時期層級和後端層級的工作階段識別碼。當後端缺少某項功能時，不支援的控制錯誤會清楚地顯示出來。`/acp sessions` 會讀取目前綁定或請求者工作階段的存放區；目標權杖（`session-key`、`session-id` 或 `session-label`）會透過閘道工作階段探索來解析，包括每個代理程式的自訂 `session.store` 根目錄。

### 執行時期選項對應

`/acp` 具有便利指令和一個通用設定器。等效操作：

| 指令                         | 對應至                           | 備註                                                                                                                                                        |
| ---------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 執行時期設定鍵 `model`           | 對於 Codex ACP，OpenClaw 會將 `openai-codex/<model>` 標準化為配接器模型 ID，並將斜線推論後綴（例如 `openai-codex/gpt-5.4/high`）對應至 `reasoning_effort`。 |
| `/acp set thinking <level>`  | 執行時期設定鍵 `thinking`        | 對於 Codex ACP，OpenClaw 會在配接器支援的情況下發送相應的 `reasoning_effort`。                                                                              |
| `/acp permissions <profile>` | 執行時期設定鍵 `approval_policy` | —                                                                                                                                                           |
| `/acp timeout <seconds>`     | 執行時期設定鍵 `timeout`         | —                                                                                                                                                           |
| `/acp cwd <path>`            | 執行時期 cwd 覆寫                | 直接更新。                                                                                                                                                  |
| `/acp set <key> <value>`     | 通用                             | `key=cwd` 使用 cwd 覆寫路徑。                                                                                                                               |
| `/acp reset-options`         | 清除所有執行時期覆寫             | —                                                                                                                                                           |

## acpx 線具、外掛程式設定和權限

如需 acpx 線具設定（Claude Code / Codex / Gemini CLI 別名）、plugin-tools 和 OpenClaw-tools MCP 橋接器，以及 ACP 權限模式的相關資訊，請參閱 [ACP agents — setup](/zh-Hant/tools/acp-agents-setup)。

## 疑難排解

| 症狀                                                                        | 可能原因                                                       | 修正方法                                                                                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛程式遺失、已停用，或被 `plugins.allow` 封鎖。          | 安裝並啟用後端外掛程式，在設定了該允許清單時將 `acpx` 包含在 `plugins.allow` 中，然後執行 `/acp doctor`。                                                     |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                                     |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息自動分派。                               | 設定 `acp.dispatch.enabled=true` 以恢復自動執行緒路由；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍然有效。                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允許清單中。                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                             |
| `/acp doctor` 回報後端在啟動後尚未準備就緒                                  | 外掛程式相依性探測或自我修復正在執行中。                       | 稍等片刻並重新執行 `/acp doctor`；如果仍處於不健康狀態，請檢查後端安裝錯誤和外掛程式允許/拒絕政策。                                                           |
| 找不到 Harness 指令                                                         | 配接器 CLI 尚未安裝或首次執行 `npx` 擷取失敗。                 | 在 Gateway 主機上安裝/預熱配接器，或明確設定 acpx agent 指令。                                                                                                |
| 來自 Harness 的找不到模型                                                   | 模型 ID 對其他提供者/Harness 有效，但不適用於此 ACP 目標。     | 使用該 Harness 列出的模型、在 Harness 中設定模型，或省略覆寫設定。                                                                                            |
| 來自 Harness 的廠商驗證錯誤                                                 | OpenClaw 狀態健康，但目標 CLI/提供者尚未登入。                 | 請登入或在 Gateway 主機環境中提供所需的提供者金鑰。                                                                                                           |
| `Unable to resolve session target: ...`                                     | 錯誤的金鑰/ID/標籤 Token。                                     | 執行 `/acp sessions`，複製正確的金鑰/標籤，然後重試。                                                                                                         |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有可綁定的活躍對話情況下使用。               | 移至目標聊天/頻道並重試，或使用未綁定的產生。                                                                                                                 |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏目前對話 ACP 綁定功能。                              | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                                   |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒內容之外使用。                         | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                                  |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位使用者擁有活躍的綁定目標。                               | 以擁有者身份重新綁定，或使用不同的對話或執行緒。                                                                                                              |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺乏線程綁定功能。                                       | 請使用 `--thread off` 或切換至支援的配接器/頻道。                                                                                                             |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行時位於主機端；請求者工作階段已沙盒化。                 | 請從沙盒化工作階段使用 `runtime="subagent"`，或從非沙盒化工作階段執行 ACP 衍生程序。                                                                          |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 為 ACP 執行時請求了 `sandbox="require"`。                      | 請使用 `runtime="subagent"` 進行必要的沙盒化，或從非沙盒化工作階段使用帶有 `sandbox="inherit"` 的 ACP。                                                       |
| `Cannot apply --model ... did not advertise model support`                  | 目標駝具未公開通用 ACP 模型切換功能。                          | 請使用宣告支援 ACP `models`/`session/set_model` 的駝具，使用 Codex ACP 模型參照，或若駝具具備自己的啟動旗標，則直接在駝具中設定模型。                         |
| 綁定工作階段缺少 ACP 元資料                                                 | ACP 工作階段元資料過期/已刪除。                                | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦線程。                                                                                                           |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 工作階段中封鎖寫入/執行。      | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](/zh-Hant/tools/acp-agents-setup#permission-configuration)。 |
| ACP 工作階段提前失敗，輸出很少                                              | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 請檢查閘道日誌中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。              |
| ACP 工作階段在完成工作後無限期停頓                                          | 駝具程序已結束，但 ACP 工作階段未回報完成。                    | 使用 `ps aux \| grep acpx` 監控；手動終止過期程序。                                                                                                           |
| 駝具看見 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                            | 內部事件封包洩漏至 ACP 邊界之外。                              | 更新 OpenClaw 並重新執行完成流程；外部駝具應僅接收純文字完成提示。                                                                                            |

## 相關

- [ACP agents — setup](/zh-Hant/tools/acp-agents-setup)
- [Agent send](/zh-Hant/tools/agent-send)
- [CLI 後端](/zh-Hant/gateway/cli-backends)
- [Codex 載具](/zh-Hant/plugins/codex-harness)
- [多代理沙箱工具](/zh-Hant/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (橋接模式)](/zh-Hant/cli/acp)
- [子代理](/zh-Hant/tools/subagents)
