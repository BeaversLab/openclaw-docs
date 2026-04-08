---
summary: "使用 ACP 運行時會話來操作 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 和其他套接代理程式"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理程式"
---

# ACP 代理程式

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 會話可讓 OpenClaw 透過 ACP 後端外掛程式執行外部編碼套接（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 及其他支援的 ACPX 套接）。

如果您以白話要求 OpenClaw 「在 Codex 中執行此程式」或「在執行緒中啟動 Claude Code」，OpenClaw 應將該要求路由至 ACP 運行時（而非原生子代理程式運行時）。每個 ACP 會話的生成都會被追蹤為 [背景工作](/en/automation/tasks)。

如果您希望 Codex 或 Claude Code 作為外部 MCP 用戶端直接連線至現有的 OpenClaw 頻道對話，請使用 [`openclaw mcp serve`](/en/cli/mcp)
而非 ACP。

## 我需要哪個頁面？

有三個相近的介面容易混淆：

| 您想要……                                                         | 使用此項                      | 備註                                                                                   |
| ---------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| 透過 OpenClaw 執行 Codex、Claude Code、Gemini CLI 或其他外部套接 | 本頁面：ACP 代理程式          | 聊天綁定會話、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、背景工作、運行時控制 |
| 將 OpenClaw Gateway 會話公開為編輯器或用戶端的 ACP 伺服器        | [`openclaw acp`](/en/cli/acp) | 橋接模式。IDE/用戶端透過 stdio/WebSocket 以 ACP 協定與 OpenClaw 通訊                   |

## 這能開箱即用嗎？

通常是可以的。

- 全新安裝現在預設會啟用隨附的 `acpx` 運行時外掛程式。
- 隨附的 `acpx` 外掛程式偏好使用其外掛程式本機固定的 `acpx` 二進位檔。
- 啟動時，OpenClaw 會探測該二進位檔，並在需要時進行自我修復。
- 如果您想要快速檢查就緒狀態，請從 `/acp doctor` 開始。

首次使用時可能會發生什麼情況：

- 目標套接配接器可能會在您第一次使用該套接時，透過 `npx` 按需下載。
- 該套接的供應商驗證仍必須存在於主機上。
- 如果主機沒有 npm/網路存取權限，首次執行的介面卡擷取可能會失敗，直到快取預先載入或透過其他方式安裝介面卡為止。

範例：

- `/acp spawn codex`：OpenClaw 應該準備好啟動 `acpx`，但 Codex ACP 介面卡可能仍需要首次執行的擷取。
- `/acp spawn claude`：Claude ACP 介面卡的情況相同，加上該主機上 Claude 端的驗證。

## 快速操作流程

當您需要實用的 `/acp` 操作手冊時使用此功能：

1. 產生一個工作階段：
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. 在綁定的對話或執行緒中工作（或明確指定該工作階段金鑰作為目標）。
3. 檢查執行時狀態：
   - `/acp status`
4. 視需要調整執行時選項：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在不取代上下文的情況下觸發作用中的工作階段：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel` (停止當前輪次)，或
   - `/acp close` (關閉工作階段 + 移除綁定)

## 人類快速入門

自然語言請求範例：

- 「將此 Discord 頻道綁定到 Codex。」
- 「在此處的執行緒中啟動一個持久的 Codex 工作階段並保持其專注。」
- 「將此作為一次性 Claude Code ACP 工作階段執行並總結結果。」
- 「將此 iMessage 聊天綁定到 Codex 並在相同的工作區中保持後續追蹤。」
- 「在執行緒中使用 Gemini CLI 執行此任務，然後在該相同執行緒中保持後續追蹤。」

OpenClaw 應採取的行動：

1. 選擇 `runtime: "acp"`。
2. 解析請求的驅動程式目標 (`agentId`，例如 `codex`)。
3. 如果請求目前對話綁定且作用中的頻道支援，則將 ACP 工作階段綁定到該對話。
4. 否則，如果請求執行緒綁定且目前頻道支援，則將 ACP 工作階段綁定到該執行緒。
5. 將後續的綁定訊息路由到相同的 ACP 工作階段，直到失去焦點/關閉/過期為止。

## ACP 與子代理程式

當您需要外部驅動程式執行時請使用 ACP。當您需要 OpenClaw 原生委派的執行時請使用子代理程式。

| 領域     | ACP 工作階段                        | 子代理程式執行                    |
| -------- | ----------------------------------- | --------------------------------- |
| 執行時   | ACP 後端外掛程式 (例如 acpx)        | OpenClaw 原生子代理程式執行時     |
| 會話金鑰 | `agent:<agentId>:acp:<uuid>`        | `agent:<agentId>:subagent:<uuid>` |
| 主要指令 | `/acp ...`                          | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 與 `runtime:"acp"` | `sessions_spawn` (預設運行時)     |

另請參閱 [Sub-agents](/en/tools/subagents)。

## ACP 如何執行 Claude Code

對於透過 ACP 執行的 Claude Code，堆疊如下：

1. OpenClaw ACP 會話控制平面
2. 內建的 `acpx` 運行時外掛
3. Claude ACP 配接器
4. Claude 端的運行時/會話機制

重要區別：

- ACP Claude 是一個具有 ACP 控制項、會話恢復、背景任務追蹤以及選用性對話/執行緒綁定的工具會話。
  對於操作員來說，實用規則是：

- 如果需要 `/acp spawn`、可綁定會話、運行時控制或持續性的工具工作：請使用 ACP

## 綁定會話

### 目前對話綁定

當您希望目前對話變成持久的 ACP 工作區而不建立子執行緒時，請使用 `/acp spawn <harness> --bind here`。

行為：

- OpenClaw 繼續擁有通道傳輸、驗證、安全性和傳遞。
- 目前對話會固定至生成的 ACP 會話金鑰。
- 該對話中的後續訊息會路由至同一個 ACP 會話。
- `/new` 和 `/reset` 會原地重設同一個綁定的 ACP 會話。
- `/acp close` 會關閉會話並移除目前對話的綁定。

實際意涵：

- `--bind here` 會保持相同的聊天介面。在 Discord 上，目前通道會維持為目前通道。
- 如果您正在生成新的工作，`--bind here` 仍然可以建立新的 ACP 會話。綁定會將該會話附加至目前對話。
- `--bind here` 本身不會建立子 Discord 執行緒或 Telegram 主題。
- ACP 運行時仍然可以擁有自己的工作目錄 (`cwd`) 或後端管理的磁碟工作區。該運行時工作區與聊天介面分離，並不意味著新的訊息執行緒。
- 如果您衍生到不同的 ACP 代理且未傳遞 `--cwd`，OpenClaw 預設會繼承 **目標代理的** 工作區，而非請求者的。
- 如果該繼承的工作區路徑不存在（`ENOENT`/`ENOTDIR`），OpenClaw 將會回退至後端預設 cwd，而不是無聲地重用錯誤的樹。
- 如果繼承的工作區存在但無法存取（例如 `EACCES`），衍生會回傳真正的存取錯誤，而不是丟棄 `cwd`。

心智模型：

- 聊天介面：人們持續交談的地方（`Discord channel`、`Telegram topic`、`iMessage chat`）
- ACP 工作階段：OpenClaw 路由至的持久性 Codex/Claude/Gemini 執行時狀態
- 子執行緒/主題：一個僅由 `--thread ...` 建立的額外選用訊息介面
- 執行時工作區：線束執行的檔案系統位置（`cwd`、repo checkout、後端工作區）

範例：

- `/acp spawn codex --bind here`：保留此聊天，衍生或附加 Codex ACP 工作階段，並將此處的未來訊息路由至該工作階段
- `/acp spawn codex --thread auto`：OpenClaw 可能會建立子執行緒/主題並將 ACP 工作階段綁定至該處
- `/acp spawn codex --bind here --cwd /workspace/repo`：與上述相同的聊天綁定，但 Codex 在 `/workspace/repo` 中執行

目前對話綁定支援：

- 宣佈支援目前對話綁定的聊天/訊息頻道可以透過共用的對話綁定路徑使用 `--bind here`。
- 具有自訂執行緒/主題語意的頻道仍可在同一個共用的介面後面提供特定於頻道的正規化處理。
- `--bind here` 始終表示「就地綁定目前對話」。
- 一般的目前對話綁定使用共用的 OpenClaw 綁定儲存空間，並在一般的閘道重啟後依然存在。

備註：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上是互斥的。
- 在 Discord 上，`--bind here` 會將目前的頻道或執行緒直接綁定。只有在 OpenClaw 需要為 `--thread auto|here` 建立子執行緒時，才需要 `spawnAcpSessions`。
- 如果目前使用的頻道未公開目前對話的 ACP 綁定，OpenClaw 會傳回明確的不支援訊息。
- `resume` 和「新工作階段」問題屬於 ACP 工作階段問題，而非頻道問題。您可以在不變更目前聊天介面的情況下重複使用或替換執行階段狀態。

### 執行緒綁定工作階段

當為頻道配接器啟用執行緒綁定時，ACP 工作階段可以綁定到執行緒：

- OpenClaw 會將執行緒綁定到目標 ACP 工作階段。
- 該執行緒中的後續訊息會路由到已綁定的 ACP 工作階段。
- ACP 輸出會傳回同一個執行緒。
- 取消聚焦、關閉、封存、閒置逾時或最大期限到期會移除綁定。

執行緒綁定支援取決於特定的配接器。如果目前使用的頻道配接器不支援執行緒綁定，OpenClaw 會傳回明確的不支援/不可用訊息。

執行緒綁定 ACP 所需的功能旗標：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停 ACP 分派）
- 已啟用頻道配接器 ACP 執行緒產生旗標（取決於配接器）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的頻道

- 任何公開工作階段/執行緒綁定功能的頻道配接器。
- 目前內建的支援：
  - Discord 執行緒/頻道
  - Telegram 主題（群組/超級群組中的論壇主題以及 DM 主題）
- 外掛程式頻道可以透過相同的綁定介面新增支援。

## 頻道特定設定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定持續性 ACP 綁定。

### 綁定模型

- `bindings[].type="acp"` 標記持續性 ACP 對話綁定。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles 私訊/群組聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    建議使用 `chat_id:*` 或 `chat_identifier:*` 以進行穩定的群組綁定。
  - iMessage 私訊/群組聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    建議使用 `chat_id:*` 以進行穩定的群組綁定。
- `bindings[].agentId` 是擁有的 OpenClaw 代理程式 ID。
- 選用的 ACP 覆蓋設定位於 `bindings[].acp` 之下：
  - `mode` (`persistent` 或 `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### 每個代理程式的執行時期預設值

使用 `agents.list[].runtime` 為每個代理程式定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 綁定會話的覆蓋優先順序：

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全域 ACP 預設值 (例如 `acp.backend`)

範例：

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

行為：

- OpenClaw 會確保設定的 ACP 工作階段在使用前已存在。
- 該頻道或主題中的訊息會路由至設定的 ACP 工作階段。
- 在綁定的對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 工作階段金鑰。
- 暫時的執行時期綁定 (例如由執行緒焦點流程建立的) 在存在的地方仍然適用。
- 對於沒有明確 `cwd` 的跨代理程式 ACP 生成，OpenClaw 會從代理程式設定繼承目標代理程式工作區。
- 缺少繼承的工作區路徑會回退至後端預設 cwd；非缺少的存取失敗會顯示為生成錯誤。

## 啟動 ACP 工作階段 (介面)

### 從 `sessions_spawn`

使用 `runtime: "acp"` 從代理程式回合或工具呼叫啟動 ACP 工作階段。

```json
{
  "task": "Open the repo and summarize failing tests",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

備註：

- `runtime` 預設為 `subagent`，因此請針對 ACP 工作階段明確設定 `runtime: "acp"`。
- 如果省略了 `agentId`，OpenClaw 會在設定時使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 來維持持久的繫結對話。

介面詳細資料：

- `task` (必要)：傳送至 ACP 工作階段的初始提示。
- `runtime` (ACP 必要)：必須是 `"acp"`。
- `agentId` (選用)：ACP 目標arness ID。如果設定，會回退至 `acp.defaultAgent`。
- `thread` (選用，預設 `false`)：請求執行緒繫結流程 (若支援)。
- `mode` (選用)：`run` (單次) 或 `session` (持久)。
  - 預設為 `run`
  - 如果省略了 `thread: true` 和模式，OpenClaw 可能會根據執行時路徑預設為持久行為
  - `mode: "session"` 需要 `thread: true`
- `cwd` (選用)：請求的執行時工作目錄 (由後端/執行時原則驗證)。如果省略，ACP 產生程序在設定時會繼承目標代理程式工作區；缺少的繼承路徑會回退至後端預設值，而實際的存取錯誤會被回傳。
- `label` (選用)：用於工作階段/橫幅文字的操作員面向標籤。
- `resumeSessionId` (選用)：恢復現有的 ACP 工作階段，而不是建立新的。代理程式會透過 `session/load` 重播其對話歷史。需要 `runtime: "acp"`。
- `streamTo` (選用)：`"parent"` 將初始 ACP 執行進度摘要作為系統事件串流回傳給請求者工作階段。
  - 當可用時，接受的回應包括 `streamLogPath`，指向工作階段範圍的 JSONL 日誌 (`<sessionId>.acp-stream.jsonl`)，您可以使用它來追蹤完整的轉送歷史。

### 恢復現有會話

使用 `resumeSessionId` 繼續先前的 ACP 會話，而不是重新開始。代理會透過 `session/load` 重播其對話歷史，因此它能獲得先前內容的完整語境。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 會話從筆記型電腦轉移到手機 — 告訴您的代理從您中斷的地方繼續
- 繼續您在 CLI 中以互動方式開始的程式設計會話，現在透過代理以無頭方式進行
- 接續因閘道重新啟動或閒置逾時而中斷的工作

備註：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果與子代理執行時一起使用，會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 會話，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理必須支援 `session/load`（Codex 和 Claude Code 支援）。
- 如果找不到會話 ID，產生 (spawn) 將會失敗並顯示明確的錯誤訊息 — 不會無聲地回退到新會話。

### 操作員冒煙測試

在閘道部署後使用此功能，當您想要快速即時檢查 ACP 產生
是否實際端到端運作，而不僅僅是通過單元測試時。

建議的閘道：

1. 驗證目標主機上部署的閘道版本/提交。
2. 確認部署的來源包含 ACP 世系接受，在
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中。
3. 開啟通往即時代理的暫時性 ACPX 橋接器會話（例如
   `razor(main)` 上的 `jpclawhq`）。
4. 要求該代理使用以下參數呼叫 `sessions_spawn`：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證代理回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 沒有驗證器錯誤
6. 清理暫時性 ACPX 橋接器會話。

發送給即時代理的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 除非您是有意測試
  執行緒繫結的持續性 ACP 會話，否則請將此冒煙測試保留在 `mode: "run"` 上。
- 基本閘道不需要 `streamTo: "parent"`。該路徑取決於請求者/工作階段的功能，是一個單獨的整合檢查。
- 將執行緒綁定的 `mode: "session"` 測試視為第二次、更豐富的整合通過，來自真實的 Discord 執行緒或 Telegram 主題。

## 沙盒相容性

ACP 工作階段目前運行在主機運行時上，而不是在 OpenClaw 沙盒內部。

目前的限制：

- 如果請求者工作階段是在沙盒中，ACP 的產生將會對於 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 都被封鎖。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要沙盒強制執行時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

在需要時，使用 `/acp spawn` 從聊天中進行明確的操作員控制。

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

請參閱 [斜線指令](/en/tools/slash-commands)。

## 工作階段目標解析

大多數 `/acp` 動作接受選用的工作階段目標 (`session-key`、`session-id` 或 `session-label`)。

解析順序：

1. 明確的目標引數 (或針對 `/acp steer` 的 `--session`)
   - 嘗試金鑰
   - 接著是 UUID 格式的工作階段 ID
   - 接著是標籤
2. 目前執行緒綁定 (如果此對話/執行緒已綁定到 ACP 工作階段)
3. 目前請求者工作階段後備

目前對話綁定和執行緒綁定都參與步驟 2。

如果沒有目標被解析，OpenClaw 會回傳一個清晰的錯誤 (`Unable to resolve session target: ...`)。

## 產生綁定模式

`/acp spawn` 支援 `--bind here|off`。

| 模式   | 行為                                                 |
| ------ | ---------------------------------------------------- |
| `here` | 就地綁定目前作用中的對話；如果沒有作用中對話則失敗。 |
| `off`  | 不要建立目前對話的綁定。                             |

備註：

- `--bind here` 是「讓此頻道或聊天使用 Codex 支援」的最簡單操作員路徑。
- `--bind here` 不會建立子執行緒。
- `--bind here` 僅在公開目前對話綁定支援的頻道上可用。
- `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中結合使用。

## 產生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `auto` | 在作用中的執行緒中：綁定該執行緒。在執行緒外：若支援則建立/綁定子執行緒。 |
| `here` | 需要目前作用中的執行緒；若不在其中則失敗。                                |
| `off`  | 無綁定。階段作業以未綁定狀態啟動。                                        |

備註：

- 在非執行緒綁定介面上，預設行為實際上為 `off`。
- 執行緒綁定產生需要頻道原則支援：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
- 當您想要固定目前的對話而不建立子執行緒時，請使用 `--bind here`。

## ACP 控制項

可用的指令系列：

- `/acp spawn`
- `/acp cancel`
- `/acp steer`
- `/acp close`
- `/acp status`
- `/acp set-mode`
- `/acp set`
- `/acp cwd`
- `/acp permissions`
- `/acp timeout`
- `/acp model`
- `/acp reset-options`
- `/acp sessions`
- `/acp doctor`
- `/acp install`

`/acp status` 會顯示有效的執行階段選項，以及在可用時顯示執行階段層級和後端層級的階段作業識別碼。

某些控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回明確的不支援控制項錯誤。

## ACP 指令食譜

| 指令                 | 作用                                            | 範例                                                          |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 階段作業；可選擇目前綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標會話的進行中輪次。                      | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向運行中的會話發送指引指令。                    | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉會話並取消綁定執行緒目標。                  | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行時選項、功能。        | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標會話的執行時模式。                      | `/acp set-mode plan`                                          |
| `/acp set`           | 通用執行時設定選項寫入。                        | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定執行時工作目錄覆寫。                        | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定批准策略設定檔。                            | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行時逾時 (秒)。                           | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時模型覆寫。                            | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除會話執行時選項覆寫。                        | `/acp reset-options`                                          |
| `/acp sessions`      | 從儲存空間列出最近的 ACP 會話。                 | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀況、功能、可採取的修復措施。          | `/acp doctor`                                                 |
| `/acp install`       | 列印確定性的安裝和啟用步驟。                    | `/acp install`                                                |

`/acp sessions` 會讀取目前綁定或請求者會話的儲存空間。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道會話探索解析目標，包括每個代理程式的自訂 `session.store` 根目錄。

## 執行時選項對應

`/acp` 具有便利指令和通用設定器。

對等操作：

- `/acp model <id>` 對應至執行時設定金鑰 `model`。
- `/acp permissions <profile>` 對應至執行時設定金鑰 `approval_policy`。
- `/acp timeout <seconds>` 對應至執行時期配置鍵 `timeout`。
- `/acp cwd <path>` 直接更新執行時期的 cwd 覆蓋值。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd 覆蓋路徑。
- `/acp reset-options` 清除目標工作階段的所有執行時期覆蓋值。

## acpx 套件支援 (目前)

目前的 acpx 內建套件別名：

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI：`cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 配置定義了自訂代理程式別名，否則請優先使用這些值作為 `agentId`。
如果您的本機 Cursor 安裝仍然將 ACP 公開為 `agent acp`，請在您的 acpx 配置中覆蓋 `cursor` 代理程式指令，而不是更改內建預設值。

直接的 acpx CLI 使用方式也可以透過 `--agent <command>` 鎖定任意配接器，但該原始緊急逃生口是 acpx CLI 的功能（而非正常的 OpenClaw `agentId` 路徑）。

## 必要配置

核心 ACP 基線：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

執行緒綁定配置特定於通道配接器。Discord 範例：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnAcpSessions: true,
      },
    },
  },
}
```

如果執行緒綁定的 ACP 生成無法運作，請先驗證配接器功能標誌：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

目前對話綁定不需要建立子執行緒。它們需要一個現有的對語上下文，以及一個公開 ACP 對語綁定的通道配接器。

請參閱[配置參考](/en/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

全新安裝預設會啟用隨附的 `acpx` 執行時期外掛程式，因此 ACP
通常無需手動安裝外掛程式的步驟即可運作。

從以下開始：

```text
/acp doctor
```

如果您停用了 `acpx`，透過 `plugins.allow` / `plugins.deny` 拒絕了它，或者想要
切換到本機開發版本，請使用明確的外掛程式路徑：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本機工作區安裝：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然後驗證後端健全狀態：

```text
/acp doctor
```

### acpx 指令與版本設定

根據預設，隨附的 acpx 後端外掛程式 (`acpx`) 會使用外掛程式本機固定的二進位檔：

1. 指令預設為 ACPX 外掛程式套件內的外掛程式本機 `node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的固定版本。
3. 啟動時立即將 ACP 後端註冊為未就緒。
4. 背景確保工作會驗證 `acpx --version`。
5. 如果外掛程式本機二進位檔遺失或不符合，它會執行：
   `npm install --omit=dev --no-save acpx@<pinned>` 並重新驗證。

您可以在外掛程式設定中覆寫指令/版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

備註：

- `command` 接受絕對路徑、相對路徑或指令名稱 (`acpx`)。
- 相對路徑是從 OpenClaw 工作區目錄解析。
- `expectedVersion: "any"` 會停用嚴格版本比對。
- 當 `command` 指向自訂二進位檔/路徑時，外掛程式本機自動安裝會停用。
- 當後端健全狀態檢查執行時，OpenClaw 啟動保持非封鎖。

請參閱 [外掛程式](/en/tools/plugin)。

### 自動依賴項安裝

當您使用 `npm install -g openclaw` 全域安裝 OpenClaw 時，acpx
執行時期依賴項 (平台特定的二進位檔) 會透過 postinstall hook 自動
安裝。如果自動安裝失敗，閘道仍會正常啟動
並透過 `openclaw acp doctor` 回報遺失的依賴項。

### 外掛程式工具 MCP 橋接器

根據預設，ACPX 工作階段**不會**將 OpenClaw 外掛程式註冊的工具公開給
ACP 韌體。

如果您希望 ACP 代理程式 (例如 Codex 或 Claude Code) 呼叫已安裝的
OpenClaw 外掛程式工具 (例如記憶體擷取/儲存)，請啟用專用橋接器：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用為：

- 將名為 `openclaw-plugin-tools` 的內建 MCP 伺服器注入 ACPX 工作階段
  啟動程序中。
- 公開已安裝並啟用的 OpenClaw 外掛程式
  已註冊的外掛程式工具。
- 保持功能顯式且預設關閉。

安全與信任注意事項：

- 這擴展了 ACP 駝鳥工具表面。
- ACP 代理程式只能存取閘道中已啟用的外掛程式工具。
- 將此視為與讓這些外掛程式在 OpenClaw 本身中執行相同的信任邊界。
- 在啟用它之前，請檢閱已安裝的外掛程式。

自訂 `mcpServers` 仍像以前一樣運作。內建的外掛程式工具橋接器是一個額外的選用便利功能，並非通用 MCP 伺服器設定的替代品。

## 權限設定

ACP 會話以非互動方式執行 — 沒有 TTY 可以批准或拒絕檔案寫入和 Shell 執行權限提示。acpx 外掛程式提供了兩個設定金鑰來控制權限的處理方式：

這些 ACPX 駝鳥權限與 OpenClaw exec 核准分開，也與 CLI 後端供應商略過旗標（例如 Claude CLI `--permission-mode bypassPermissions`）分開。ACPX `approve-all` 是 ACP 會話的駝鳥層級緊急開關。

### `permissionMode`

控制駝鳥代理程式可以在無需提示的情況下執行哪些操作。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 Shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY（這對於 ACP 會話來說總是如此）時會發生什麼情況。

| 值     | 行為                                         |
| ------ | -------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會話。 **(預設)** |
| `deny` | 以靜默方式拒絕權限並繼續 (優雅降級)。        |

### 設定

透過外掛程式設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後，請重新啟動閘道。

> **重要提示：** OpenClaw 目前預設使用 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 工作階段中，任何觸發權限提示的寫入或執行操作都可能會因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便工作階段能夠正常降級，而不是直接當機。

## 疑難排解

| 症狀                                                                        | 可能原因                                                       | 修正方法                                                                                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛遺失或已停用。                                         | 安裝並啟用後端外掛，然後執行 `/acp doctor`。                                                                                                         |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                            |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息進行分派。                               | 設定 `acp.dispatch.enabled=true`。                                                                                                                   |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允許清單中。                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                    |
| `Unable to resolve session target: ...`                                     | 錯誤的 key/id/label 權杖。                                     | 執行 `/acp sessions`，複製確切的 key/label，然後重試。                                                                                               |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在沒有有效的可綁定對話的情況下使用了 `--bind here`。           | 移至目標聊天/頻道並重試，或使用未綁定的生成。                                                                                                        |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏目前對話 ACP 綁定功能。                              | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                          |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在執行緒內容之外使用了 `--thread here`。                       | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                         |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一個使用者擁有有效的綁定目標。                               | 以擁有者身份重新綁定，或使用不同的對話或執行緒。                                                                                                     |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺乏執行緒綁定功能。                                     | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                        |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行時位於主機端；請求者工作階段已沙盒化。                 | 從沙盒化工作階段使用 `runtime="subagent"`，或從非沙盒化工作階段執行 ACP 生成。                                                                       |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` 請求 ACP 執行時。                          | 對於所需的沙盒化，請使用 `runtime="subagent"`，或從非沙盒化會話搭配 `sandbox="inherit"` 使用 ACP。                                                   |
| 繫結會話缺少 ACP 元資料                                                     | 過時/已刪除的 ACP 會話元資料。                                 | 使用 `/acp spawn` 重新建立，然後重新繫結/聚焦執行緒。                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 會話中阻擋寫入/執行。          | 將 `plugins.entries.acpx.config.permissionMode` 設為 `approve-all` 並重新啟動閘道。請參閱 [權限配置](#permission-configuration)。                    |
| ACP 會話提早失敗且輸出很少                                                  | 權限提示被 `permissionMode`/`nonInteractivePermissions` 阻擋。 | 請檢查閘道日誌中的 `AcpRuntimeError`。若要取得完整權限，請設定 `permissionMode=approve-all`；若要正常降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 會話在完成工作後無限期停滯                                              | 駕馭程序已完成，但 ACP 會程未回報完成。                        | 使用 `ps aux \| grep acpx` 監控；手動終止過時的程序。                                                                                                |
