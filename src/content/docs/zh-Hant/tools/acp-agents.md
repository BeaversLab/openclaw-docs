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

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 工作階段讓 OpenClaw 透過 ACP 後端外掛程式執行外部編寫工具（例如 Claude Code、Cursor、Copilot、Droid、OpenClaw ACP、OpenCode、Gemini CLI 以及其他支援的 ACPX 工具）。

每個 ACP 工作階段的產生都會被追蹤為[背景任務](/zh-Hant/automation/tasks)。

<Note>
**ACP 是外部工具路徑，而非預設的 Codex 路徑。** 原生的 Codex 應用程式伺服器外掛程式擁有 `/codex ...` 控制項以及代理程式輪次的預設 `openai/gpt-*` 嵌入式執行時；ACP 擁有 `/acp ...` 控制項和 `sessions_spawn({ runtime: "acp" })` 工作階段。

如果您希望 Codex 或 Claude Code 作為外部 MCP 用戶端直接連接到現有的 OpenClaw 頻道對話，請使用 [`openclaw mcp serve`](/zh-Hant/cli/mcp) 而非 ACP。

</Note>

## 我需要哪個頁面？

| 您想要…                                                                   | 使用此項                                 | 備註                                                                                                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 在目前對話中綁定或控制 Codex                                              | `/codex bind`、`/codex threads`          | 當啟用 `codex` 外掛程式時的原生 Codex 應用程式伺服器路徑；包括綁定聊天回覆、圖片轉發、模型/快速/權限、停止和導向控制項。ACP 是一個明確的備援方案 |
| 透過 OpenClaw 執行 Claude Code、Gemini CLI、顯式 Codex ACP 或其他外部工具 | 本頁面                                   | 聊天綁定工作階段、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、背景任務、執行時控制項                                                     |
| 將 OpenClaw Gateway 工作階段「作為」ACP 伺服器暴露給編輯器或用戶端        | [`openclaw acp`](/zh-Hant/cli/acp)            | 橋接模式。IDE/用戶端透過 stdio/WebSocket 以 ACP 通訊協定與 OpenClaw 通訊                                                                         |
| 重複使用本機 AI CLI 作為純文字後備模型                                    | [CLI Backends](/zh-Hant/gateway/cli-backends) | 非 ACP。沒有 OpenClaw 工具、沒有 ACP 控制項、沒有工具執行環境                                                                                    |

## 這是否能直接運作？

是的，在安裝官方 ACP 執行環境外掛程式後：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

來源檢出版本可以在 `pnpm install` 之後使用本機 `extensions/acpx` 工作區外掛程式。執行 `/acp doctor` 以進行就緒檢查。

OpenClaw 僅在 ACP **確實可用** 時才會告知代理程式關於 ACP 產生的資訊：ACP 必須已啟用、分派不得停用、目前工作階段不得被沙箱阻擋，且必須已載入執行時後端。如果未滿足這些條件，ACP 外掛程式技能和 `sessions_spawn` ACP 指引將保持隱藏，以免代理程式建議使用無法使用的後端。

<AccordionGroup>
  <Accordion title="首次執行注意事項">
    - 如果設定了 `plugins.allow`，它會是一個限制性的外掛清單，並且**必須**包含 `acpx`；否則已安裝的 ACP 後端會被刻意封鎖，且 `/acp doctor` 會回報缺少允許清單條目。
    - Codex ACP 配接器會與 `acpx` 外掛一起暫存，並盡可能在本地啟動。
    - Codex ACP 使用獨立的 `CODEX_HOME` 執行；OpenClaw 會從主機 Codex 設定複製受信任的專案條目以及安全的模型/提供者路由設定，而驗證、通知和掛鉤則保留在主機設定中。
    - 其他目標套索配接器在首次使用時，可能仍會透過 `npx` 按需擷取。
    - 該套索的供應商驗證仍必須存在於主機上。
    - 如果主機沒有 npm 或網路存取權限，首次執行的配接器擷取作業會失敗，直到快取已預熱或透過其他方式安裝配接器為止。

  </Accordion>
  <Accordion title="Runtime prerequisites">
    ACP 會啟動一個真正的外部程式過程。OpenClaw 負責路由、
    背景工作狀態、傳遞、繫結與策略；而程式負責
    其提供者登入、模型目錄、檔案系統行為和原生工具。

    在歸咎於 OpenClaw 之前，請確認：

    - `/acp doctor` 回報一個已啟用且健康的後端。
    - 當設定該允許清單時，目標 id 獲 `acp.allowedAgents` 允許。
    - 該程式指令可以在 Gateway 主機上啟動。
    - 該程式具備提供者驗證（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 選定的模型存在於該程式中——模型 id 在不同程式間不可互通。
    - 請求的 `cwd` 存在且可存取，或者省略 `cwd` 並讓後端使用其預設值。
    - 權限模式符合工作需求。非互動式工作階段無法點擊原生權限提示，因此寫入/執行繁重的編碼作業通常需要一個可無人值守進行的 ACPX 權限設定檔。

  </Accordion>
</AccordionGroup>

OpenClaw 外掛工具與內建 OpenClaw 工具預設**不**會對
ACP 程式開放。僅在程式應直接呼叫這些工具時，
才在 [ACP agents - setup](/zh-Hant/tools/acp-agents-setup) 中啟用明確的 MCP 橋接器。

## 支援的 harness 目標

使用 `acpx` 後端時，請使用這些程式 id 作為 `/acp spawn <id>`
或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 目標：

| Harness id | 典型後端                                     | 備註                                                               |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `claude`   | Claude Code ACP 配接器                       | 需要在主機上進行 Claude Code 驗證。                                |
| `codex`    | Codex ACP 配接器                             | 僅在原生 `/codex` 無法使用或請求使用 ACP 時，才明確使用 ACP 後備。 |
| `copilot`  | GitHub Copilot ACP 配接器                    | 需要 Copilot CLI/執行時期驗證。                                    |
| `cursor`   | Cursor CLI ACP (`cursor-agent acp`)          | 如果本地安裝公開了不同的 ACP 進入點，請覆寫 acpx 指令。            |
| `droid`    | Factory Droid CLI                            | 需要在程式環境中具備 Factory/Droid 驗證或 `FACTORY_API_KEY`。      |
| `gemini`   | Gemini CLI ACP 配接器                        | 需要 Gemini CLI 驗證或 API 金鑰設定。                              |
| `iflow`    | iFlow CLI                                    | 配接器可用性和模型控制取決於已安裝的 CLI。                         |
| `kilocode` | Kilo Code CLI                                | 配接器可用性和模型控制取決於已安裝的 CLI。                         |
| `kimi`     | Kimi/Moonshot CLI                            | 需要在主機上進行 Kimi/Moonshot 驗證。                              |
| `kiro`     | Kiro CLI                                     | 配接器可用性和模型控制取決於已安裝的 CLI。                         |
| `opencode` | OpenCode ACP 配接器                          | 需要 OpenCode CLI/提供者驗證。                                     |
| `openclaw` | 透過 `openclaw acp` 的 OpenClaw Gateway 橋接 | 讓支援 ACP 的駕馭能與 OpenClaw Gateway 工作階段通訊。              |
| `qwen`     | Qwen Code / Qwen CLI                         | 需要在主機上採用 Qwen 相容的驗證。                                 |

自訂 acpx 代理別名可以在 acpx 本身中設定，但 OpenClaw 原則仍會在分派前檢查 `acp.allowedAgents` 和任何 `agents.list[].runtime.acp.agent` 對應。

## 操作員手冊

從聊天快速 `/acp` 流程：

<Steps>
  <Step title="生成">
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
    `/acp model <provider/model>`、
    `/acp permissions <profile>`、
    `/acp timeout <seconds>`。
  </Step>
  <Step title="導向">
    不取代語境： `/acp steer tighten logging and continue`。
  </Step>
  <Step title="停止">
    `/acp cancel` (目前輪次) 或 `/acp close` (工作階段 + 綁定)。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="生命週期詳細資訊">
    - Spawn 會建立或恢復 ACP 執行階段工作階段，在 OpenClaw 工作階段存放區中記錄 ACP 中繼資料，並且當執行作業是由父項擁有時，可能會建立背景任務。
    - 父項擁有的 ACP 工作階段即使當執行階段工作階段是持續性的，仍會被視為背景工作；完成項目和跨表面交付會透過父項任務通知器進行，而不是像一般使用者面向的聊天工作階段那樣運作。
    - 任務維護會關閉終止或孤立的父項擁有一次性 ACP 工作階段。持續性 ACP 工作階段會在保留有效對話繫結時予以保留；沒有有效繫結的過時持續性工作階段會被關閉，以避免在擁有任務完成或其任務記錄消失後被無聲恢復。
    - 繫結的後續訊息會直接傳送到 ACP 工作階段，直到繫結被關閉、失去焦點、重設或過期。
    - Gateway 指令會保持在本地。`/acp ...`、`/status` 和 `/unfocus` 永遠不會作為一般提示文字傳送至繫結的 ACP 工具。
    - 當後端支援取消時，`cancel` 會中止活動輪次；它不會刪除繫結或工作階段中繼資料。
    - `close` 會從 OpenClaw 的角度結束 ACP 工作階段並移除繫結。如果工具支援恢復，它可能仍會保留自己的上游紀錄。
    - acpx 外掛程式會在 `close` 之後清除 OpenClaw 擁有的包裝函式和配接器處理序樹，並在 Gateway 啟動期間收割過時的 OpenClaw 擁有 ACPX 孤兒處理序。
    - 閒置執行階段工作程序在 `acp.runtime.ttlMinutes` 之後有資格被清除；儲存的工作階段中繼資料在 `/acp sessions` 之前仍可供使用。

  </Accordion>
  <Accordion title="Native Codex routing rules">
    當啟用時應路由至 **原生 Codex
    外掛程式** 的自然語言觸發條件：

    - 「將此 Discord 頻道綁定至 Codex。」
    - 「將此聊天附加至 Codex 執行緒 `<id>`。」
    - 「顯示 Codex 執行緒，然後綁定此執行緒。」

    原生 Codex 對話綁定是預設的聊天控制路徑。
    OpenClaw 動態工具仍透過 OpenClaw 執行，而
    Codex 原生工具（例如 shell/apply-patch）則在 Codex 內執行。
    對於 Codex 原生工具事件，OpenClaw 會注入輪次原生
    hook 中繼，以便外掛程式 hooks 可以封鎖 `before_tool_call`、觀察
    `after_tool_call`，並透過 OpenClaw 核准來路由 Codex `PermissionRequest` 事件。
    Codex `Stop` hooks 會中繼至
    OpenClaw `before_agent_finalize`，外掛程式可在 Codex 完成其答案前要求再進行
    一次模型傳遞。此中繼刻意保持保守：它不會變更 Codex 原生工具
    引數或重寫 Codex 執行緒記錄。僅在您需要
    ACP 執行時期/會話模型時使用明確的 ACP。內嵌 Codex
    支援邊界記載於
    [Codex harness v1 support contract](/zh-Hant/plugins/codex-harness-runtime#v1-support-contract)。

  </Accordion>
  <Accordion title="Model / provider / runtime selection cheat sheet">
    - legacy Codex model refs - 由 doctor 修復的舊版 Codex OAuth/subscription model route。
    - `openai/*` - 用於 OpenAI agent 輪次的原生 Codex app-server 內嵌執行時期。
    - `/codex ...` - 原生 Codex 對話控制。
    - `/acp ...` 或 `runtime: "acp"` - 明確 ACP/acpx 控制。

  </Accordion>
  <Accordion title="ACP-routing natural-language triggers">
    應路由至 ACP 執行時的觸發器：

    - "將此作為一次性 Claude Code ACP 會話執行並總結結果。"
    - "在此任務中於執行緒使用 Gemini CLI，然後在該同一執行緒中保持後續追蹤。"
    - "透過 ACP 在背景執行緒中執行 Codex。"

    OpenClaw 選取 `runtime: "acp"`，解析 harness `agentId`，
    在支援時綁定至目前對話或執行緒，並將後續追蹤路由至該會話直到關閉/過期。僅當 ACP/acpx
    為顯式指定或原生 Codex 外掛無法用於請求的操作時，Codex 才會遵循此路徑。

    對於 `sessions_spawn`，僅當 ACP 已啟用、請求者未位於沙箱中且已載入
    ACP 執行時後端時，才會通告 `runtime: "acp"`。`acp.dispatch.enabled=false` 會暫停自動
    ACP 執行緒分派，但不會隱藏或阻擋顯式
    `sessions_spawn({ runtime: "acp" })` 呼叫。它針對 ACP harness id，例如 `codex`、
    `claude`、`droid`、`gemini` 或 `opencode`。除非該項目已
    明確設定為 `agents.list[].runtime.type="acp"`，否則請勿傳遞
    來自 `agents_list` 的正常 OpenClaw 配置 agent id；否則請使用預設子代理執行時。當 OpenClaw
    agent 設定為 `runtime.type="acp"` 時，OpenClaw 會使用
    `runtime.acp.agent` 作為底層 harness id。

  </Accordion>
</AccordionGroup>

## ACP 與子代理

當您需要外部 harness 執行時時，請使用 ACP。當啟用 `codex`
外掛時，請使用 **原生 Codex app-server** 進行 Codex 對話綁定/控制。當您需要
OpenClaw 原生委派執行時，請使用 **sub-agents**。

| 領域         | ACP 工作階段                          | 子代理執行                        |
| ------------ | ------------------------------------- | --------------------------------- |
| 執行環境     | ACP 後端外掛程式（例如 acpx）         | OpenClaw 原生子代理執行環境       |
| 工作階段金鑰 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要指令     | `/acp ...`                            | `/subagents ...`                  |
| 生成工具     | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn`（預設執行時）    |

另請參閱 [Sub-agents](/zh-Hant/tools/subagents)。

## ACP 如何執行 Claude Code

對於透過 ACP 執行的 Claude Code，技術堆疊如下：

1. OpenClaw ACP 工作階段控制平面。
2. 官方 `@openclaw/acpx` 執行時外掛。
3. Claude ACP 轉接器。
4. Claude 端的執行環境/工作階段機制。

ACP Claude 是具備 ACP 控制項、工作階段恢復、背景工作追蹤以及選用性對話/執行緒綁定的 **工具機工作階段**。

CLI 後端是獨立的純文字本機備援執行環境——請參閱
[CLI Backends](/zh-Hant/gateway/cli-backends)。

對於操作員來說，實用的原則是：

- **想要 `/acp spawn`、可綁定的工作階段、執行時期控制或持續的佈線工作？** 請使用 ACP。
- **需要透過原始 CLI 進行簡單的本機文字備援嗎？** 請使用 CLI 後端。

## 綁定的工作階段

### 心智模型

- **聊天介面** - 人們持續交談的地方 (Discord 頻道、Telegram 主題、iMessage 聊天)。
- **ACP 工作階段** - OpenClaw 路由到的持久化 Codex/Claude/Gemini 執行環境狀態。
- **子執行緒/主題**——一個選用的額外訊息介面，僅由 `--thread ...` 建立。
- **執行時期工作區**——佈線執行所在的檔案系統位置（`cwd`、repo checkout、後端工作區）。獨立於聊天介面。

### 目前對話的綁定

`/acp spawn <harness> --bind here` 會將目前的對話釘選到
產生的 ACP 工作階段——不會建立子執行緒，使用相同的聊天介面。OpenClaw 繼續擁有傳輸、驗證、安全性與傳遞作業。該對話中的後續訊息會路由至相同的工作階段；`/new` 與 `/reset` 會就地重設工作階段；`/acp close` 則會移除綁定。

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
    - `--bind here` 僅適用於宣告支援目前對話綁定的頻道；否則 OpenClaw 會傳回明確的不支援訊息。綁定在閘道重新啟動後仍會保留。
    - 在 Discord 上，`spawnSessions` 會限制 `--thread auto|here` 建立子執行緒——而非 `--bind here`。
    - 如果您在未指定 `--cwd` 的情況下產生至不同的 ACP 代理程式，OpenClaw 預設會繼承 **目標代理程式的** 工作區。遺失的繼承路徑（`ENOENT`/`ENOTDIR`）會回退至後端預設值；其他存取錯誤（例如 `EACCES`）會顯示為產生錯誤。
    - 閘道管理指令會保留在已綁定的對話中——`/acp ...` 指令由 OpenClaw 處理，即使一般的後續文字路由至已綁定的 ACP 工作階段；只要為該介面啟用指令處理，`/status` 與 `/unfocus` 也會保留在本地。

  </Accordion>
  <Accordion title="Thread-bound sessions">
    當為頻道介面卡啟用執行緒綁定時：

    - OpenClaw 會將執行緒綁定到目標 ACP 會話。
    - 該執行緒中的後續訊息會路由到已綁定的 ACP 會話。
    - ACP 輸出會傳遞回同一個執行緒。
    - 失去焦點/關閉/封存/閒置逾時或最大期限過期會移除綁定。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/unfocus` 是 Gateway 指令，而非傳送給 ACP harness 的提示。

    執行緒綁定 ACP 所需的功能旗標：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停自動 ACP 執行緒調度；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍然有效）。
    - 已啟用頻道介面卡執行緒會話生成（預設值：`true`）：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`

    執行緒綁定支援視介面卡而定。如果使用中的頻道
    介面卡不支援執行緒綁定，OpenClaw 會回傳一則明確的
    不支援/無法使用訊息。

  </Accordion>
  <Accordion title="支援執行緒的頻道">
    - 任何公開工作階段/執行緒繫結功能的頻道轉接器。
    - 目前內建支援：**Discord** 執行緒/頻道、**Telegram** 主題（群組/超級群組中的論壇主題以及 DM 主題）。
    - 外掛程式頻道可以透過相同的繫結介面新增支援。

  </Accordion>
</AccordionGroup>

## 持續性頻道繫結

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定持續性 ACP 綁定。

### 繫結模型

<ParamField path="bindings[].type" type='"acp"'>
  標記持續性 ACP 對話繫結。
</ParamField>
<ParamField path="bindings[].match" type="object">
  識別目標對話。依頻道而定的形狀：

- **Discord 頻道/執行緒：** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack 頻道/DM：** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`。建議使用穩定的 Slack ID；頻道綁定也會匹配該頻道執行緒內的回覆。
- **Telegram 論壇主題：** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **iMessage DM/群組：** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。建議使用 `chat_id:*` 以進行穩定的群組綁定。

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
- 在綁定對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 暫時的執行期綁定 (例如由 thread-focus 流程建立的) 若存在則仍會套用。
- 對於沒有明確指定 `cwd` 的跨 Agent ACP 產生，OpenClaw 會從 Agent 配置繼承目標 Agent 工作區。
- 遺漏的繼承工作區路徑會回退至後端預設的 cwd；未遺漏但存取失敗的情況會顯示為生成錯誤。

## 啟動 ACP 工作階段

啟動 ACP 工作階段有兩種方式：

<Tabs>
  <Tab title="From sessions_spawn">
    使用 `runtime: "acp"` 從 Agent 輪次或
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
    `runtime` 預設為 `subagent`，因此請為 ACP 會話明確設定
    `runtime: "acp"`。如果省略 `agentId`，OpenClaw 在設定時會使用
    `acp.defaultAgent`。`mode: "session"` 需要
    `thread: true` 來保持持久的綁定對話。
    </Note>

  </Tab>
  <Tab title="From /acp command">
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
  傳送至 ACP 工作階段的初始提示詞。
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  對於 ACP 工作階段，必須為 `"acp"`。
</ParamField>
<ParamField path="agentId" type="string">
  ACP 目標套件 ID。如果設定，則回退為 `acp.defaultAgent`。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  請求執行緒綁定流程（在支援的情況下）。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` 為單次執行（one-shot）；`"session"` 為持續性。如果省略 `thread: true` 和
  `mode`，OpenClaw 可能會根據執行路徑預設為持續性行為。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cwd" type="string">
  請求的執行時工作目錄（由後端/執行時原則驗證）。如果省略，ACP 衍生程序會在設定時繼承目標代理程式工作區；遺失的繼承路徑會回退至後端預設值，而實際的存取錯誤則會被傳回。
</ParamField>
<ParamField path="label" type="string">
  用於工作階段/橫幅文字的操作員導向標籤。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  恢復現有的 ACP 工作階段，而不是建立新的。代理程式透過 `session/load` 重播其對話記錄。需要 `runtime: "acp"`。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` 會將初始 ACP 執行進度摘要作為系統事件串流回傳給請求者工作階段。接受的回應包括指向工作階段範圍 JSONL 記錄檔的 `streamLogPath` （`<sessionId>.acp-stream.jsonl`），您可以對其進行 tail 以取得完整的中繼記錄。
</ParamField>

ACP `sessions_spawn` 執行個體使用 `agents.defaults.subagents.runTimeoutSeconds` 作為其預設子輪次限制。此工具不接受單次呼叫逾時覆寫。

<ParamField path="model" type="string">
  ACP 子工作階段的明確模型覆寫。Codex ACP 產生的實例會在 `session/new` 之前，將 OpenAI 參照（例如 `openai/gpt-5.4`）正規化為 Codex ACP 啟動組態；斜線形式（例如 `openai/gpt-5.4/high`）也會設定 Codex ACP 推理力。
  當省略時，`sessions_spawn({ runtime: "acp" })` 會使用現有的子代理模型預設值（如果已設定，則為 `agents.defaults.subagents.model` 或
  `agents.list[].subagents.model`）；否則，它會讓 ACP 駝鳥使用其自己的預設模型。
  其他駝鳥必須宣告支援 ACP `models` 並支援
  `session/set_model`；否則 OpenClaw/acpx 會清楚地失敗，而不是靜默地回退到目標代理的預設值。
</ParamField>
<ParamField path="thinking" type="string">
  明確的思考/推理力。對於 Codex ACP，`minimal` 對應到
  低努力，`low`/`medium`/`high`/`xhigh` 直接對應，而 `off`
  會省略推理力啟動覆寫。
  當省略時，ACP 產生的實例會使用現有的子代理思考預設值和針對所選模型的每模型 `agents.defaults.models["provider/model"].params.thinking`。
</ParamField>

## 產生綁定和執行緒模式

<Tabs>
  <Tab title="--bind here|off">
    | 模式   | 行為                                                                 |
    | ------ | -------------------------------------------------------------------- |
    | `here` | 就地綁定目前主動對話；如果沒有主動對話則失敗。 |
    | `off`  | 不建立目前對話綁定。                          |

    備註：

    - `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作員路徑。
    - `--bind here` 不會建立子執行緒。
    - `--bind here` 僅在提供目前對話綁定支援的頻道上可用。
    - `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中合併使用。

  </Tab>
  <Tab title="--thread auto|here|off">
    | 模式   | 行為                                                                                             |
    | ------ | ------------------------------------------------------------------------------------------------ |
    | `auto` | 在主動執行緒中：綁定該執行緒。在執行緒外：如果支援，則建立/綁定子執行緒。 |
    | `here` | 要求目前主動執行緒；如果不在執行緒中則失敗。                                                  |
    | `off`  | 無綁定。工作階段以未綁定狀態啟動。                                                                 |

    備註：

    - 在非執行緒綁定介面上，預設行為實際上為 `off`。
    - 執行緒綁定產生需要頻道原則支援：
      - Discord：`channels.discord.threadBindings.spawnSessions=true`
      - Telegram：`channels.telegram.threadBindings.spawnSessions=true`
    - 當您想要固定目前對話而不建立子執行緒時，請使用 `--bind here`。

  </Tab>
</Tabs>

## 傳遞模型

ACP 工作階段可以是互動式工作區或父級擁有的背景工作。傳遞路徑取決於該形態。

<AccordionGroup>
  <Accordion title="互動式 ACP 會話">
    互動式會話旨在於可見的聊天介面上持續對話：

    - `/acp spawn ... --bind here` 將當前對話綁定到 ACP 會話。
    - `/acp spawn ... --thread ...` 將頻道執行緒/主題綁定到 ACP 會話。
    - 持久化配置的 `bindings[].type="acp"` 將符合條件的對話路由至同一個 ACP 會話。

    綁定對話中的後續訊息會直接路由至 ACP 會話，而 ACP 輸出則會傳回同一個頻道/執行緒/主題。

    OpenClaw 發送給 harness 的內容：

    - 一般的綁定後續訊息會作為提示文字發送，並且僅當 harness/後端支援時才會附加附件。
    - `/acp` 管理命令和本機 Gateway 命令會在 ACP 分發之前被攔截。
    - 執行時期產生的完成事件會根據目標進行具象化。OpenClaw agents 會獲得 OpenClaw 的內部執行時期上下文封包；外部 ACP harness 則會獲得包含子結果和指令的純文字提示。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 封包絕不應發送給外部 harness 或儲存為 ACP 使用者對話紀錄文字。
    - ACP 對話紀錄項目會使用使用者可見的觸發文字或純完成提示。內部事件中繼資料會盡可能在 OpenClaw 中保持結構化，並不會被視為使用者撰寫的聊天內容。

  </Accordion>
  <Accordion title="父級擁有的單次 ACP 工作階段">
    由另一個代理執行產生的單次 ACP 工作階段是背景子系，類似於子代理：

    - 父級使用 `sessions_spawn({ runtime: "acp", mode: "run" })` 要求工作。
    - 子級在自己的 ACP 驅動工作階段中執行。
    - 子級輪次在原生子代理產生所使用的相同背景通道上執行，因此緩慢的 ACP 驅動不會阻擋不相關的主工作階段工作。
    - 完成報告透過任務完成公告路徑傳回。OpenClaw 在將內部完成中繼資料發送到外部驅動之前，會將其轉換為純 ACP 提示，因此驅動程式不會看到僅限 OpenClaw 的執行階段內容標記。
    - 當面向使用者的回覆有用時，父級會以正常的助理語氣重寫子級結果。

    請**勿**將此路徑視為父級與子級之間的點對點聊天。子級已經有一個回傳給父級的完成通道。

  </Accordion>
  <Accordion title="sessions_send 與 A2A 傳遞">
    `sessions_send` 可以在產生後以另一個工作階段為目標。對於正常的
    同層級工作階段，OpenClaw 在注入訊息後會使用代理對代理 (A2A) 後續路徑：

    - 等待目標工作階段的回覆。
    - 讓要求者和目標選擇性交換有限數量的後續輪次。
    - 要求目標產生公告訊息。
    - 將該公告傳遞到可見的通道或執行緒。

    該 A2A 路徑是發送者需要可見後續處理的同層級傳送的後備方案。當不相關的工作階段可以
    看見並傳送訊息給 ACP 目標時，它會保持啟用，例如在廣泛的
    `tools.sessions.visibility` 設定下。

    只有當要求者是其自己擁有的單次 ACP 子級的父級時，OpenClaw 才會跳過 A2A 後續處理。在這種情況下，
    在任務完成之上執行 A2A 可能會使用子級的結果喚醒父級，將父級的回覆轉發回子級，並
    建立父級/子級回應迴圈。`sessions_send` 結果回報
    `delivery.status="skipped"` 給該擁有子級的情況，因為完成路徑已經負責該結果。

  </Accordion>
  <Accordion title="恢復現有工作階段">
    使用 `resumeSessionId` 繼續先前的 ACP 工作階段，而不是
    重新開始。Agent 透過 `session/load` 重放其對話歷史，
    因此它能掌握先前內容的完整脈絡。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常見使用案例：

    - 將 Codex 工作階段從您的筆記型電腦移轉到您的手機 - 指示您的 Agent 接續您剛才中斷的地方。
    - 繼續您在 CLI 中以互動方式開始的程式碼編輯工作階段，現在透過您的 Agent 以無頭模式進行。
    - 接續因閘道重新啟動或閒置逾時而中斷的工作。

    注意事項：

    - `resumeSessionId` 僅在 `runtime: "acp"` 時適用；預設的子 Agent 執行時期會忽略此僅限 ACP 的欄位。
    - `streamTo` 僅在 `runtime: "acp"` 時適用；預設的子 Agent 執行時期會忽略此僅限 ACP 的欄位。
    - `resumeSessionId` 是主機本機的 ACP/harness 恢復 ID，而非 OpenClaw 頻道工作階段金鑰；OpenClaw 在分派前仍會檢查 ACP 產生原則和目標 Agent 原則，而 ACP 後端或 harness 則擁有載入該上游 ID 的授權。
    - `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍會正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍然需要 `thread: true`。
    - 目標 Agent 必須支援 `session/load`（Codex 和 Claude Code 支援）。
    - 如果找不到工作階段 ID，產生程序會失敗並顯示明確的錯誤 - 不會無聲地回退到新的工作階段。

  </Accordion>
  <Accordion title="部署後的冒煙測試">
    部署閘道後，執行即時的端到端檢查，而不是僅依賴單元測試：

    1. 在目標主機上驗證已部署的閘道版本和提交記錄。
    2. 開啟一個連線至即時代理程式的暫時性 ACPX 橋接器工作階段。
    3. 要求該代理程式呼叫 `sessions_spawn`，並附上 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"` 以及 task `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 驗證 `accepted=yes`、真實的 `childSessionKey`，且沒有驗證器錯誤。
    5. 清理暫時性的橋接器工作階段。

    將閘道保持在 `mode: "run"`，並跳過 `streamTo: "parent"` -
    執行緒綁定的 `mode: "session"` 和串流中繼路徑是分開的、更完整的整合測試。

  </Accordion>
</AccordionGroup>

## 沙盒相容性

ACP 工作階段目前是在主機執行階段上執行，**而非** 在
OpenClaw 沙盒內部。

<Warning>
**安全性邊界：**

- 外部駝具可以根據其本身的 CLI 權限和選取的 `cwd` 進行讀取/寫入。
- OpenClaw 的沙盒原則**並不**封裝 ACP 駝具的執行。
- OpenClaw 仍會強制執行 ACP 功能閘道、允許的代理程式、工作階段擁有權、頻道綁定以及閘道遞送原則。
- 請使用 `runtime: "subagent"` 進行由沙盒強制執行的 OpenClaw 原生工作。

</Warning>

目前的限制：

- 如果請求者工作階段位於沙盒內，ACP 的生成會針對 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 這兩者遭到封鎖。
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。

## 工作階段目標解析

大多數 `/acp` 動作都接受一個選用的工作階段目標 (`session-key`、
`session-id` 或 `session-label`)。

**解析順序：**

1. 明確的目標引數 (或針對 `/acp steer` 的 `--session`)
   - 接著是 key
   - 接著是 UUID 形式的工作階段 ID
   - 接著是 label
2. 目前的執行緒綁定 (如果此對話/執行緒已綁定至 ACP 工作階段)。
3. 目前的請求者工作階段後備方案。

目前對話的綁定和執行緒綁定都會參與步驟 2。

如果沒有解析到目標，OpenClaw 會傳回一個清楚的錯誤
(`Unable to resolve session target: ...`)。

## ACP 控制

| 指令                 | 功能說明                                        | 範例                                                          |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 工作階段；可選的目前綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標工作階段的進行中輪次。                  | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向執行中的工作階段傳送導引指令。                | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉工作階段並解除綁定執行緒目標。              | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。      | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標工作階段的執行時期模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 通用執行時期設定選項寫入。                      | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定執行時期工作目錄覆寫。                      | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定核准原則設定檔。                            | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行時期逾時（秒）。                        | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時期模型覆寫。                          | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除工作階段執行時期選項覆寫。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 從存放區列出最近的 ACP 工作階段。               | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀況、功能、可採取的修復措施。          | `/acp doctor`                                                 |
| `/acp install`       | 輸出確定性的安裝和啟用步驟。                    | `/acp install`                                                |

`/acp status` 顯示有效的執行時選項以及執行時層級和後端層級的會話識別碼。當後端缺乏某項功能時，不支援的控制錯誤會清楚地顯示出來。`/acp sessions` 讀取目前綁定或請求者會話的存放區；目標權杖（`session-key`、`session-id` 或 `session-label`）會透過閘道會話探索來解析，包括每個代理程式的自訂 `session.store` 根目錄。

### 執行時選項對應

`/acp` 具有便利指令和一個通用設定器。等效操作：

| 指令                         | 對應至                       | 備註                                                                                                                                                                            |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 執行時組態鍵 `model`         | 對於 Codex ACP，OpenClaw 會將 `openai/<model>` 正規化為配接器模型 ID，並將斜線推論後綴（例如 `openai/gpt-5.4/high`）對應至 `reasoning_effort`。                                 |
| `/acp set thinking <level>`  | 標準選項 `thinking`          | OpenClaw 在存在時會發送後端通告的等效項，優先使用 `thinking`，然後是 `effort`、`reasoning_effort` 或 `thought_level`。對於 Codex ACP，配接器會將數值對應至 `reasoning_effort`。 |
| `/acp permissions <profile>` | 標準選項 `permissionProfile` | OpenClaw 在存在時會發送後端通告的等效項，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                     |
| `/acp timeout <seconds>`     | 標準選項 `timeoutSeconds`    | OpenClaw 在存在時會發送後端通告的等效項，例如 `timeout` 或 `timeout_seconds`。                                                                                                  |
| `/acp cwd <path>`            | 執行時 cwd 覆蓋              | 直接更新。                                                                                                                                                                      |
| `/acp set <key> <value>`     | 通用                         | `key=cwd` 使用 cwd 覆蓋路徑。                                                                                                                                                   |
| `/acp reset-options`         | 清除所有執行時覆蓋           | -                                                                                                                                                                               |

## acpx harness、外掛程式設定和權限

如需了解 acpx harness 設定（Claude Code / Codex / Gemini CLI 別名）、plugin-tools 和 OpenClaw-tools MCP 橋接器，以及 ACP 權限模式，請參閱 [ACP agents - setup](/zh-Hant/tools/acp-agents-setup)。

## 疑難排解

| 症狀                                                                        | 可能原因                                                                         | 修正方法                                                                                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛遺失、已停用，或被 `plugins.allow` 封鎖。                                | 安裝並啟用後端外掛，在設定允許清單時將 `acpx` 包含在 `plugins.allow` 中，然後執行 `/acp doctor`。                                                             |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                                                 | 設定 `acp.enabled=true`。                                                                                                                                     |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息的自動分派。                                               | 設定 `acp.dispatch.enabled=true` 以恢復自動執行緒路由；明確的 `sessions_spawn({ runtime: "acp" })` 呼叫仍然有效。                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理程式不在允許清單中。                                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                             |
| `/acp doctor` 回報後端在啟動後未就緒                                        | 後端外掛遺失、已停用、被允許/拒絕原則封鎖，或其設定的可執行檔無法使用。          | 安裝/啟用後端外掛，重新執行 `/acp doctor`，如果仍處於不健康狀態，請檢查後端安裝或原則錯誤。                                                                   |
| 找不到 Harness 指令                                                         | Adapter CLI 未安裝、外部外掛遺失，或非 Codex adapter 的首次執行 `npx` 擷取失敗。 | 執行 `/acp doctor`，在 Gateway 主機上安裝/預熱 adapter，或明確設定 acpx agent 指令。                                                                          |
| 來自 Harness 的 Model-not-found 錯誤                                        | Model ID 對其他提供者/harness 有效，但對此 ACP 目標無效。                        | 使用該 harness 列出的模型、在 harness 中設定模型，或省略覆寫設定。                                                                                            |
| 來自 Harness 的供應商驗證錯誤                                               | OpenClaw 狀態正常，但目標 CLI/提供者未登入。                                     | 登入或在 Gateway 主機環境中提供所需的提供者金鑰。                                                                                                             |
| `Unable to resolve session target: ...`                                     | 不正確的金鑰/ID/標籤權杖。                                                       | 執行 `/acp sessions`，複製正確的金鑰/標籤，然後重試。                                                                                                         |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有可綁定的對話時使用。                                         | 移至目標聊天/頻道並重試，或使用無綁定生成。                                                                                                                   |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏當前對話 ACP 綁定功能。                                                | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                                   |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒上下文之外使用。                                         | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                                  |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位使用者擁有活動的綁定目標。                                                 | 以擁有者身分重新綁定，或使用不同的對話或執行緒。                                                                                                              |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺乏執行緒綁定功能。                                                       | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                                 |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 運行時位於主機端；請求者工作階段位於沙箱中。                                 | 從沙箱工作階段使用 `runtime="subagent"`，或從非沙箱工作階段執行 ACP 生成。                                                                                    |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 為 ACP 運行時請求了 `sandbox="require"`。                                        | 使用 `runtime="subagent"` 進行所需的沙箱設定，或從非沙箱工作階段將 ACP 與 `sandbox="inherit"` 搭配使用。                                                      |
| `Cannot apply --model ... did not advertise model support`                  | 目標駕馭未公開通用 ACP 模型切換功能。                                            | 使用宣傳支援 ACP `models`/`session/set_model` 的駕馭，使用 Codex ACP 模型參照，或如果駕馭有自己的啟動旗標，則直接在駕馭中設定模型。                           |
| 綁定工作階段遺失 ACP 中繼資料                                               | 過期/已刪除的 ACP 工作階段中繼資料。                                             | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦執行緒。                                                                                                         |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 工作階段中封鎖寫入/執行。                        | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](/zh-Hant/tools/acp-agents-setup#permission-configuration)。 |
| ACP 工作階段提早失敗且輸出很少                                              | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。                   | 檢查 Gateway 日誌中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要正常降級，請設定 `nonInteractivePermissions=deny`。           |
| ACP 工作階段在完成工作後無限期停滯                                          | Harness 處理程序已完成，但 ACP 工作階段未回報完成。                              | 更新 OpenClaw；目前的 acpx 清理功能會在關閉和 Gateway 啟動時清除 OpenClaw 擁有的過時 wrapper 與 adapter 處理程序。                                            |
| Harness 看到 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                        | 內部事件信封洩漏到 ACP 邊界之外。                                                | 更新 OpenClaw 並重新執行完成流程；外部 harness 應僅接收純文字的完成提示。                                                                                     |

<Note>`Command blocked by PreToolUse hook: Native hook relay unavailable` 屬於 原生 Codex hook relay，而非 ACP/acpx。在綁定的 Codex 聊天中，請使用 `/new` 或 `/reset` 啟動新的工作階段；如果它運作一次後在下次原生工具呼叫時又回來，請重啟 Codex app-server 或 OpenClaw Gateway，而不要重複 `/new`。請參閱 [Codex harness 疑難排解](/zh-Hant/plugins/codex-harness#troubleshooting)。</Note>

## 相關

- [ACP agents - 設定](/zh-Hant/tools/acp-agents-setup)
- [Agent send](/zh-Hant/tools/agent-send)
- [CLI 後端](/zh-Hant/gateway/cli-backends)
- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness 執行環境](/zh-Hant/plugins/codex-harness-runtime)
- [Multi-agent 沙盒工具](/zh-Hant/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (橋接模式)](/zh-Hant/cli/acp)
- [Sub-agents](/zh-Hant/tools/subagents)
