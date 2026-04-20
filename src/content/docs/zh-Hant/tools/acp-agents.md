---
summary: "使用 ACP 運行時會話來操作 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 以及其他工具代理"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理"
---

# ACP 代理程式

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 會話允許 OpenClaw 通過 ACP 後端插件運行外部編程工具（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 和其他受支援的 ACPX 工具）。

如果您用自然語言要求 OpenClaw「在 Codex 中運行此程式」或「在線程中啟動 Claude Code」，OpenClaw 應將該請求路由到 ACP 運行時（而非原生子代理運行時）。每次 ACP 會話生成都會被追蹤為一個[背景任務](/zh-Hant/automation/tasks)。

如果您希望 Codex 或 Claude Code 作為外部 MCP 客戶端直接
連接到現有的 OpenClaw 頻道對話，請使用 [`openclaw mcp serve`](/zh-Hant/cli/mcp)
而非 ACP。

## 我需要哪個頁面？

有三個相近的介面容易混淆：

| 您想要……                                                         | 使用此項                             | 備註                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| 透過 OpenClaw 執行 Codex、Claude Code、Gemini CLI 或其他外部套接 | 本頁面：ACP 代理程式                 | 聊天綁定會話、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、背景任務、運行時控制 |
| 將 OpenClaw Gateway 會話公開為編輯器或用戶端的 ACP 伺服器        | [`openclaw acp`](/zh-Hant/cli/acp)        | 橋接模式。IDE/用戶端透過 stdio/WebSocket 以 ACP 協定與 OpenClaw 通訊                   |
| 重複使用本地 AI CLI 作為純文字後備模型                           | [CLI 後端](/zh-Hant/gateway/cli-backends) | 非 ACP。無 OpenClaw 工具、無 ACP 控制、無工具運行時                                    |

## 這是否開箱即用？

通常是的。

- 全新安裝現在預設啟用捆綁的 `acpx` 運行時插件。
- 捆綁的 `acpx` 插件偏好其插件本地的固定 `acpx` 二進位文件。
- 啟動時，OpenClaw 會探測該二進位文件並在需要時自行修復。
- 如果您想要快速檢查就緒狀態，請從 `/acp doctor` 開始。

首次使用時可能會發生的情況：

- 第一次使用該工具時，可能會使用 `npx` 按需獲取目標工具適配器。
- 該工具的供應商驗證仍然必須存在於主機上。
- 如果主機沒有 npm/網絡存取權限，首次運行的適配器獲取可能會失敗，直到快取被預熱或以其他方式安裝適配器。

範例：

- `/acp spawn codex`：OpenClaw 應該已準備好引導 `acpx`，但 Codex ACP 配接器可能仍需要首次運行擷取。
- `/acp spawn claude`：Claude ACP 配接器的情況相同，此外還需要該主機上的 Claude 端驗證。

## 快速操作員流程

當您需要實用的 `/acp` 逐行手冊時請使用此功能：

1. 生成一個工作階段：
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. 在綁定的對話或串列中工作（或明確以該工作階段金鑰為目標）。
3. 檢查執行時狀態：
   - `/acp status`
4. 視需要調整執行時選項：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 推動使用中的工作階段而不取代內容：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel`（停止當前輪次），或
   - `/acp close`（關閉工作階段 + 移除綁定）

## 人類快速入門

自然請求的範例：

- 「將此 Discord 頻道綁定至 Codex。」
- 「在此處的串列中啟動持續的 Codex 工作階段並保持其焦點。」
- 「將此作為一次性 Claude Code ACP 工作階段執行並總結結果。」
- 「將此 iMessage 聊天綁定至 Codex，並將後續追蹤保留在相同的工作區中。」
- 「在此工作的串列中使用 Gemini CLI，然後在同一串列中保留後續追蹤。」

OpenClaw 應該做的事：

1. 選擇 `runtime: "acp"`。
2. 解析請求的駕馭目標（`agentId`，例如 `codex`）。
3. 如果請求了當前對話綁定且使用中頻道支援，則將 ACP 工作階段綁定至該對話。
4. 否則，如果請求了串列綁定且目前頻道支援，則將 ACP 工作階段綁定至該串列。
5. 將後續的綁定訊息路由至同一個 ACP 工作階段，直到失去焦點/關閉/過期為止。

## ACP 與子代理程式

當您需要外部駕馭執行時時，請使用 ACP。當您需要 OpenClaw 原生委派執行時，請使用子代理程式。

| 領域         | ACP 工作階段                             | 子代理程式執行                    |
| ------------ | ---------------------------------------- | --------------------------------- |
| 執行時       | ACP 後端外掛程式（例如 acpx）            | OpenClaw 原生子代理程式執行時     |
| 工作階段金鑰 | `agent:<agentId>:acp:<uuid>`             | `agent:<agentId>:subagent:<uuid>` |
| 主要指令     | `/acp ...`                               | `/subagents ...`                  |
| Spawn 工具   | 搭配 `runtime:"acp"` 的 `sessions_spawn` | `sessions_spawn`（預設執行環境）  |

另請參閱 [Sub-agents](/zh-Hant/tools/subagents)。

## ACP 如何執行 Claude Code

透過 ACP 執行 Claude Code 時，技術堆疊為：

1. OpenClaw ACP 工作階段控制平面
2. 內建的 `acpx` 執行環境外掛
3. Claude ACP 配接器
4. Claude 端的執行環境/工作階段機制

重要區別：

- ACP Claude 是一個具備 ACP 控制功能、工作階段恢復、背景任務追蹤及選擇性對話/執行緒綁定的工具工作階段。
- CLI 後端是獨立的純文字本機備援執行環境。請參閱 [CLI Backends](/zh-Hant/gateway/cli-backends)。

對於操作員來說，實用規則如下：

- 想要 `/acp spawn`、可綁定的工作階段、執行環境控制或持續性的工具工作：使用 ACP
- 想要透過原始 CLI 進行簡單的本地文字備援：使用 CLI 後端

## 綁定工作階段

### 目前對話綁定

當您希望目前對話變成持久的 ACP 工作區而不建立子執行緒時，請使用 `/acp spawn <harness> --bind here`。

行為：

- OpenClaw 仍擁有通道傳輸、驗證、安全和傳遞的所有權。
- 目前的對話會固定至產生的 ACP 工作階段金鑰。
- 該對話中的後續訊息會路由至同一個 ACP 工作階段。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 工作階段。
- `/acp close` 會關閉工作階段並移除目前對話的綁定。

實際應用上的意義：

- `--bind here` 會保持相同的聊天介面。在 Discord 上，目前的頻道仍維持為目前的頻道。
- 如果您正在啟動新的工作，`--bind here` 仍可建立新的 ACP 工作階段。綁定會將該工作階段附加至目前的對話。
- `--bind here` 本身不會建立子 Discord 執行緒或 Telegram 主題。
- ACP 執行環境仍可擁有自己的工作目錄 (`cwd`) 或後端管理的磁碟工作區。該執行環境工作區與聊天介面分開，且不隱含新的訊息執行緒。
- 如果您產生至不同的 ACP 代理程式且未傳遞 `--cwd`，OpenClaw 預設會繼承**目標代理程式的**工作區，而非請求者的。
- 如果該繼承的工作區路徑遺失 (`ENOENT`/`ENOTDIR`)，OpenClaw 會退回至後端預設 cwd，而不是無聲地重用錯誤的樹狀結構。
- 如果繼承的工作區存在但無法存取 (例如 `EACCES`)，spawn 會傳回真實的存取錯誤，而非捨棄 `cwd`。

心智模型：

- 聊天介面：人們持續對話的地方 (`Discord channel`、`Telegram topic`、`iMessage chat`)
- ACP session：OpenClaw 路由至的持久化 Codex/Claude/Gemini 執行階段狀態
- 子執行緒/主題：僅由 `--thread ...` 建立的選用額外訊息介面
- 執行階段工作區：駕馭執行所在的檔案系統位置 (`cwd`、repo checkout、後端工作區)

範例：

- `/acp spawn codex --bind here`：保留此聊天，產生或附加 Codex ACP session，並將此處的未來訊息路由至該處
- `/acp spawn codex --thread auto`：OpenClaw 可能會建立子執行緒/主題並將 ACP session 繫結至該處
- `/acp spawn codex --bind here --cwd /workspace/repo`：與上述相同的聊天繫結，但 Codex 在 `/workspace/repo` 中執行

目前對話繫結支援：

- 宣佈支援目前對話繫結的聊天/訊息頻道，可以透過共享的對話繫結路徑使用 `--bind here`。
- 具有自訂執行緒/主語意的頻道，仍可在相同的共享介面後面提供頻道特定的正規化處理。
- `--bind here` 始終表示「就地繫結目前對話」。
- 一般的目前對話繫結使用共享的 OpenClaw 繫結存放區，並能在正常的閘道重新啟動後存續。

備註：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上互斥。
- 在 Discord 上，`--bind here` 會將目前的頻道或執行緒就地綁定。僅當 OpenClaw 需要為 `--thread auto|here` 建立子執行緒時，才需要 `spawnAcpSessions`。
- 如果目前使用的頻道未公開目前對話的 ACP 綁定，OpenClaw 會傳回明確的不支援訊息。
- `resume` 和「新工作階段」問題屬於 ACP 工作階段問題，而非頻道問題。您可以在不變更目前聊天介面的情況下重複使用或取代執行階段狀態。

### 執行緒綁定工作階段

當為頻道配接器啟用執行緒綁定時，ACP 工作階段可以綁定到執行緒：

- OpenClaw 會將執行緒綁定到目標 ACP 工作階段。
- 該執行緒中的後續訊息會路由到已綁定的 ACP 工作階段。
- ACP 輸出會傳遞回同一個執行緒。
- 失焦/關閉/封存/閒置逾時或最長使用期限過期會移除綁定。

執行緒綁定支援取決於配接器。如果目前使用的頻道配接器不支援執行緒綁定，OpenClaw 會傳回明確的不支援/不可用訊息。

執行緒綁定 ACP 所需的功能旗標：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停 ACP 分派）
- 頻道配接器 ACP 執行緒生成旗標已啟用（特定於配接器）
  - Discord： `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram： `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的頻道

- 任何公開工作階段/執行緒綁定功能的頻道配接器。
- 目前的內建支援：
  - Discord 執行緒/頻道
  - Telegram 主題（群組/超級群組中的論壇主題和 DM 主題）
- 外掛程式頻道可以透過相同的綁定介面新增支援。

## 頻道特定設定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定持續性 ACP 綁定。

### 綁定模型

- `bindings[].type="acp"` 標記持續性 ACP 對話綁定。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒： `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題： `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles DM/群組聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    為了穩定的群組綁定，建議優先使用 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage DM/群組聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    為了穩定的群組綁定，建議優先使用 `chat_id:*`。
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

ACP 綁定工作階段的覆蓋優先順序：

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

- OpenClaw 會在使用的先確保已設定的 ACP 工作階段存在。
- 該頻道或主題中的訊息會路由至已設定的 ACP 工作階段。
- 在綁定對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 工作階段金鑰。
- 暫時的執行時期綁定 (例如由執行緒焦點流程建立的) 在存在時仍然適用。
- 對於沒有明確指定 `cwd` 的跨代理程式 ACP 生成，OpenClaw 會從代理程式設定繼承目標代理程式工作區。
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

- `runtime` 預設為 `subagent`，因此請為 ACP 會話明確設定 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 會在設定時使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 以保持持續的綁定對話。

介面詳情：

- `task` (必填)：傳送至 ACP 會話的初始提示。
- `runtime` (ACP 必填)：必須為 `"acp"`。
- `agentId` (選填)：ACP 目標 harness id。如果已設定，則回退至 `acp.defaultAgent`。
- `thread` (選填，預設為 `false`)：在支援的情況下請求執行緒綁定流程。
- `mode` (選填)：`run` (單次) 或 `session` (持續)。
  - 預設為 `run`
  - 如果省略 `thread: true` 和模式，OpenClaw 可能會根據執行時路徑預設為持續行為
  - `mode: "session"` 需要 `thread: true`
- `cwd` (選填)：請求的執行時工作目錄 (由後端/執行時原則驗證)。如果省略，ACP 生成會在設定時繼承目標 agent 工作區；缺少的繼承路徑會回退至後端預設值，而實際存取錯誤會被返回。
- `label` (選填)：用於會話/橫幅文字的操作員導向標籤。
- `resumeSessionId` (選填)：恢復現有的 ACP 會話而不是建立新的會話。Agent 會透過 `session/load` 重播其對話歷史記錄。需要 `runtime: "acp"`。
- `streamTo` (選填)：`"parent"` 將初始 ACP 執行進度摘要作為系統事件串流回請求者會話。
  - 當可用時，接受的回應包含 `streamLogPath`，指向會話範圍的 JSONL 日誌 (`<sessionId>.acp-stream.jsonl`)，您可以追蹤該日誌以取得完整中繼歷史記錄。

### 繼續現有的工作階段

使用 `resumeSessionId` 來繼續先前的 ACP 工作階段，而不是重新開始。Agent 會透過 `session/load` 重播其對話歷史，因此它能掌握先前內容的完整脈絡。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 工作階段從您的筆記型電腦移轉到手機 — 告訴您的 Agent 接續您之前離開的地方
- 繼續您在 CLI 中以互動方式開始的程式設計工作階段，現在透過您的 Agent 以無介面方式進行
- 接續因閘道重新啟動或閒置逾時而中斷的工作

備註：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果與子 Agent 執行時期搭配使用，會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標 Agent 必須支援 `session/load`（Codex 和 Claude Code 支援）。
- 如果找不到工作階段 ID，生成作業會失敗並出現明確的錯誤 — 不會靜默回退到新的工作階段。

### Operator 煙霧測試

在閘道部署後使用此功能，當您想要快速檢查 ACP 生成是否實際端對端運作，而不只是通過單元測試時。

建議的檢查步驟：

1. 驗證目標主機上部署的閘道版本/提交。
2. 確認部署的來源包含 ACP 世系接受度於
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中。
3. 開啟一個到即時 Agent 的暫時 ACPX 橋接工作階段（例如
   `razor(main)` 於 `jpclawhq` 上）。
4. 要求該 Agent 呼叫 `sessions_spawn` 並搭配：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證 Agent 回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 無驗證器錯誤
6. 清除暫時的 ACPX 橋接工作階段。

給即時 Agent 的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 請將此煙霧測試保持在 `mode: "run"` 上，除非您故意測試
  執行緒繫結的持續性 ACP 工作階段。
- 對於基本閘道，不需要 `streamTo: "parent"`。該路徑取決於
  請求者/會話的功能，是一個單獨的整合檢查。
- 將執行緒綁定的 `mode: "session"` 測試視為第二個、更豐富的整合
  程序，從真實的 Discord 執行緒或 Telegram 主題進行。

## Sandbox 相容性

ACP 會話目前運行在主機運行環境上，而不是在 OpenClaw sandbox 內部。

目前的限制：

- 如果請求者會話是在 sandbox 中，則會阻止 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 的 ACP 生成。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` 與 `runtime: "acp"` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要 sandbox 強制執行時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

在需要時，使用 `/acp spawn` 從聊天中進行明確的操作員控制。

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

參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。

## 會話目標解析

大多數 `/acp` 動作接受一個可選的會話目標（`session-key`、`session-id` 或 `session-label`）。

解析順序：

1. 明確的目標參數（或 `--session` 用於 `/acp steer`）
   - 嘗試金鑰
   - 然後是 UUID 格式的會話 ID
   - 然後是標籤
2. 目前執行緒綁定（如果此對話/執行緒綁定到 ACP 會話）
3. 目前請求者會線備援

目前對話綁定和執行緒綁定都會參與步驟 2。

如果沒有解析到目標，OpenClaw 會返回一個清楚的錯誤（`Unable to resolve session target: ...`）。

## 生成綁定模式

`/acp spawn` 支援 `--bind here|off`。

| 模式   | 行為                                                   |
| ------ | ------------------------------------------------------ |
| `here` | 將目前作用中的對話就地綁定；如果沒有作用中對話則失敗。 |
| `off`  | 不要建立目前對話的綁定。                               |

備註：

- `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作員路徑。
- `--bind here` 不會建立子執行緒。
- `--bind here` 僅在提供目前對話綁定支援的頻道上可用。
- `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中合併使用。

## 產生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| `auto` | 在作用中的執行緒中：綁定該執行緒。在執行緒外：當受支援時，建立/綁定子執行緒。 |
| `here` | 需要目前作用中的執行緒；如果不在執行緒中則會失敗。                            |
| `off`  | 無綁定。工作階段以未綁定狀態啟動。                                            |

備註：

- 在非執行緒綁定介面上，預設行為實際上等同於 `off`。
- 執行緒綁定產生需要頻道策略支援：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
- 當您想要固定目前的對話而不建立子執行緒時，請使用 `--bind here`。

## ACP 控制項

可用的指令家族：

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

`/acp status` 會顯示有效的執行階段選項，以及在可用時顯示執行階層級和後端層級的工作階段識別碼。

某些控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回明確的不支援控制項錯誤。

## ACP 指令範例

| 指令                 | 用途                                              | 範例                                                          |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 工作階段；選擇性的目前綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標會話的進行中輪次。                        | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 傳送導向指令給執行中的會話。                      | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉會話並解除綁定執行緒目標。                    | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。        | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標會話的執行時期模式。                      | `/acp set-mode plan`                                          |
| `/acp set`           | 通用執行時期設定選項寫入。                        | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定執行時期工作目錄覆蓋。                        | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定審核策略設定檔。                              | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行時期逾時（秒）。                          | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時期模型覆蓋。                            | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除會話執行時期選項覆蓋。                        | `/acp reset-options`                                          |
| `/acp sessions`      | 列出儲存空間中最近的 ACP 會話。                   | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀態、功能、可採取的修復措施。            | `/acp doctor`                                                 |
| `/acp install`       | 列印確定性的安裝與啟用步驟。                      | `/acp install`                                                |

`/acp sessions` 會讀取目前綁定或請求者會話的儲存空間。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道會話探索來解析目標，包括自訂的個別代理 `session.store` 根目錄。

## 執行時期選項對應

`/acp` 具有便利指令和通用設定器。

對等操作：

- `/acp model <id>` 對應至執行時期設定金鑰 `model`。
- `/acp permissions <profile>` 對應至執行時期設定金鑰 `approval_policy`。
- `/acp timeout <seconds>` 對應至執行時配置鍵 `timeout`。
- `/acp cwd <path>` 直接更新執行時 cwd 覆寫。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd 覆寫路徑。
- `/acp reset-options` 清除目標 session 的所有執行時覆寫。

## acpx harness 支援 (目前)

目前 acpx 內建 harness 別名：

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI: `cursor-agent acp`)
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

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 配置定義了自訂 agent 別名，否則優先使用這些 `agentId` 的值。
如果您的本機 Cursor 安裝版本仍將 ACP 公開為 `agent acp`，請在您的 acpx 配置中覆寫 `cursor` agent 指令，而不是變更內建預設值。

直接使用 acpx CLI 也可以透過 `--agent <command>` 指定任意 adapter，但該原始權限外掛是 acpx CLI 的功能 (而非正常的 OpenClaw `agentId` 路徑)。

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

執行緒綁定配置特定於 channel adapter。以 Discord 為例：

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

如果執行緒綁定 ACP 產生 (spawn) 無法運作，請先驗證 adapter 功能旗標：

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

目前對話綁定 不需要建立子執行緒。它們需要一個有效的對話上下文，以及一個公開 ACP 對話綁定的 channel adapter。

參閱 [配置參考](/zh-Hant/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

全新安裝預設會啟用隨附的 `acpx` 執行時外掛程式，因此 ACP
通常無需手動安裝外掛程式步驟即可運作。

從以下內容開始：

```text
/acp doctor
```

如果您停用了 `acpx`，透過 `plugins.allow` / `plugins.deny` 拒絕了它，或是想要
切換到本機開發版本，請使用明確的外掛程式路徑：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本機工作區安裝：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然後驗證後端健康狀態：

```text
/acp doctor
```

### acpx 指令與版本設定

根據預設，內建的 acpx 後端外掛程式 (`acpx`) 會使用外掛程式區域內的固定二進位檔：

1. 指令預設為 ACPX 外掛程式套件內的外掛程式區域 `node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的固定版本。
3. 啟動時會立即將 ACP 後端註冊為未就緒。
4. 背景的確保工作會驗證 `acpx --version`。
5. 如果外掛程式區域的二進位檔遺失或不符，它會執行：
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
- 相對路徑會從 OpenClaw 工作區目錄解析。
- `expectedVersion: "any"` 會停用嚴格的版本比對。
- 當 `command` 指向自訂二進位檔/路徑時，外掛程式區域的自動安裝會停用。
- 當後端健康檢查執行時，OpenClaw 啟動維持非封阻狀態。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

### 自動相依性安裝

當您使用 `npm install -g openclaw` 全域安裝 OpenClaw 時，acpx
執行階段相依性 (平台特定的二進位檔) 會透過 postinstall 掛鉤自動
安裝。如果自動安裝失敗，閘道仍會正常啟動
並透過 `openclaw acp doctor` 回報遺失的相依性。

### 外掛程式工具 MCP 橋接器

根據預設，ACPX 工作階段**不會**將 OpenClaw 外掛程式註冊的工具公開給
ACP 線具。

如果您希望 ACP 代理程式 (例如 Codex 或 Claude Code) 呼叫已安裝的
OpenClaw 外掛程式工具 (例如記憶體回取/儲存)，請啟用專用的橋接器：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

這項功能的作用：

- 將名為 `openclaw-plugin-tools` 的內建 MCP 伺服器注入到 ACPX 工作階段
  引導程序中。
- 公開已安裝並啟用的 OpenClaw
  外掛程式已註冊的外掛程式工具。
- 使該功能保持顯式並預設關閉。

安全性和信任注意事項：

- 這擴展了 ACP 鞍具工具的表面範圍。
- ACP 代理只能存取已在閘道中啟用的外掛工具。
- 請將此視為與讓這些外掛在 OpenClaw 本身中執行相同的信任邊界。
- 啟用它之前，請檢視已安裝的外掛。

自訂 `mcpServers` 仍像以前一樣運作。內建的 plugin-tools 橋接器是一個額外的選用便利功能，並非通用 MCP 伺服器設定的替代品。

### 執行階段逾時設定

隨附的 `acpx` 外掛預設將內嵌執行階段設定為 120 秒逾時。這為較慢的鞍具（例如 Gemini CLI）提供了足夠的時間來完成 ACP 啟動和初始化。如果您的主機需要不同的執行階段限制，請覆寫它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

變更此值後，請重新啟動閘道。

## 權限設定

ACP 會話以非互動方式執行 — 沒有 TTY 來批准或拒絕檔案寫入和 shell 執行權限提示。acpx 外掛提供了兩個設定鍵來控制權限的處理方式：

這些 ACPX 鞍具權限與 OpenClaw exec 批准分開，並與 CLI 後端供應商繞過標誌（例如 Claude CLI `--permission-mode bypassPermissions`）分開。ACPX `approve-all` 是 ACP 會話的鞍具層級緊急開關。

### `permissionMode`

控制鞍具代理可以在無需提示的情況下執行哪些操作。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY（這是 ACP 會話的常態）時會發生什麼。

| 值     | 行為                                          |
| ------ | --------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會話。**（預設）** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。              |

### 設定

透過外掛設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後，請重新啟動閘道。

> **重要提示：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 會話中，任何觸發權限提示的寫入或執行操作都可能會因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便會話能夠優雅降級而不會崩潰。

## 疑難排解

| 症狀                                                                        | 可能原因                                                       | 解決方法                                                                                                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛程式遺失或已停用。                                     | 安裝並啟用後端外掛程式，然後執行 `/acp doctor`。                                                                                               |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息進行分派。                               | 設定 `acp.dispatch.enabled=true`。                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理程式不在允許清單中。                                       | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                              |
| `Unable to resolve session target: ...`                                     | 金鑰/ID/標籤記號錯誤。                                         | 執行 `/acp sessions`，複製確切的金鑰/標籤，然後重試。                                                                                          |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在沒有可繫結的作用中對話情況下使用了 `--bind here`。           | 移至目標聊天/頻道並重試，或使用未繫結的產生程序。                                                                                              |
| `Conversation bindings are unavailable for <channel>.`                      | 介面卡缺乏目前對話 ACP 繫結功能。                              | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                    |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在執行緒內容之外使用了 `--thread here`。                       | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                   |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 作用中繫結目標由另一位使用者擁有。                             | 以擁有者身份重新繫結，或使用不同的對話或執行緒。                                                                                               |
| `Thread bindings are unavailable for <channel>.`                            | 介面卡缺乏執行緒繫結功能。                                     | 使用 `--thread off` 或移至支援的介面卡/頻道。                                                                                                  |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行時位於主機端；請求者會話已沙箱化。                     | 從沙箱化會話使用 `runtime="subagent"`，或從非沙箱化會話執行 ACP 產生程序。                                                                     |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 為 ACP 執行時請求了 `sandbox="require"`。                      | 請使用 `runtime="subagent"` 進行必要的沙箱化，或在非沙箱化會話中從 `sandbox="inherit"` 使用 ACP。                                              |
| 綁定會話缺少 ACP 中繼資料                                                   | 過時/已刪除的 ACP 會話中繼資料。                               | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦執行緒。                                                                                          |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 會話中封鎖寫入/執行。          | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](#permission-configuration)。            |
| ACP 會話提早失敗且輸出甚少                                                  | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 檢查閘道記錄中的 `AcpRuntimeError`。如需完整權限，請設定 `permissionMode=approve-all`；如需優雅降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 會話在完成工作後無限期停滯                                              | 駕馭程式程序已結束，但 ACP 會話未回報完成。                    | 使用 `ps aux \| grep acpx` 監控；手動終止過時的程序。                                                                                          |
