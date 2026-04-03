---
summary: "使用 ACP 執行階段會話來執行 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 及其他外掛程式代理程式"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理程式"
---

# ACP 代理程式

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 會話允許 OpenClaw 透過 ACP 後端外掛程式執行外部編碼工具（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 和其他支援的 ACPX 工具）。

如果您用自然語言要求 OpenClaw「在 Codex 中執行此操作」或「在執行緒中啟動 Claude Code」，OpenClaw 應將該請求路由傳送至 ACP 執行階段（而非原生子代理程式執行階段）。每個產生的 ACP 會話都會被追蹤為[背景任務](/en/automation/tasks)。

如果您希望 Codex 或 Claude Code 作為外部 MCP 用戶端直接連接到現有的 OpenClaw 頻道對話，請使用 [`openclaw mcp serve`](/en/cli/mcp) 而非 ACP。

## 快速操作員流程

當您想要實用的 `/acp` 執行手冊時，請使用此方法：

1. 產生工作階段：
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. 在綁定的對話或執行緒中工作（或明確指定該階段工作階段金鑰）。
3. 檢查執行時狀態：
   - `/acp status`
4. 視需要調整執行時選項：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在不取代上下文的情況下推動活動階段工作階段：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel` (停止目前回合)，或
   - `/acp close` (關閉會話 + 移除綁定)

## 人員快速入門

自然語言請求範例：

- 「將此 Discord 頻道綁定到 Codex。」
- 「在此處的執行緒中啟動持續的 Codex 階段工作階段，並保持其專注。」
- 「將此作為一次性 Claude Code ACP 階段工作階段執行，並總結結果。」
- 「將此 iMessage 聊天綁定到 Codex，並將後續追蹤保留在同一工作區中。」
- 「在執行緒中針對此任務使用 Gemini CLI，然後將後續追蹤保留在該同一執行緒中。」

OpenClaw 應該做什麼：

1. 選擇 `runtime: "acp"`。
2. 解析所請求的工具目標 (`agentId`，例如 `codex`)。
3. 如果請求了當前對話綁定且使用中的頻道支援該功能，則將 ACP 會話綁定到該對話。
4. 否則，如果請求了執行緒綁定且目前頻道支援該功能，則將 ACP 會話綁定到該執行緒。
5. 將後續的綁定訊息路由到同一個 ACP 會話，直到其失去焦點/關閉/過期。

## ACP 與子代理程式

當您需要外部 harness 執行時時使用 ACP。當您需要 OpenClaw 原生委派執行時使用子代理程式。

| 區域       | ACP 會話                              | 子代理程式執行                    |
| ---------- | ------------------------------------- | --------------------------------- |
| 執行時     | ACP 後端外掛程式（例如 acpx）         | OpenClaw 原生子代理程式執行時     |
| 會話金鑰   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要指令   | `/acp ...`                            | `/subagents ...`                  |
| Spawn 工具 | `sessions_spawn` 使用 `runtime:"acp"` | `sessions_spawn` (預設執行階段)   |

另請參閱 [子代理程式](/en/tools/subagents)。

## 繫結工作階段

### 目前對話繫結

當您希望目前對話變成持久的 ACP 工作區而不建立子執行緒時，請使用 `/acp spawn <harness> --bind here`。

行為：

- OpenClaw 仍擁有通道傳輸、驗證、安全性和傳遞功能。
- 目前對話會固定至產生的 ACP 工作階段金鑰。
- 該對話中的後續訊息會路由至同一個 ACP 工作階段。
- `/new` 和 `/reset` 會在原處重設同一個綁定的 ACP 會話。
- `/acp close` 會關閉工作階段並移除目前對話的綁定。

實務上的意義：

- `--bind here` 保持相同的聊天介面。在 Discord 上，目前的頻道會維持為目前的頻道。
- 如果您正在啟動新的工作，`--bind here` 仍然可以建立新的 ACP 工作階段。此綁定會將該工作階段附加到目前的對話。
- `--bind here` 不會自行建立子 Discord 執行緒或 Telegram 主題。
- ACP 執行時仍然可以擁有自己的工作目錄 (`cwd`) 或後端管理的磁碟工作區。該執行時工作區與聊天介面分開，並不代表新的訊息執行緒。

心智模型：

- 聊天介面：人們持續交談的地方 (`Discord channel`、`Telegram topic`、`iMessage chat`)
- ACP 工作階段：OpenClaw 路由到持久的 Codex/Claude/Gemini 執行時狀態
- 子執行緒/主題：僅由 `--thread ...` 建立的選用額外訊息介面
- 執行時工作區：駭客程式執行的檔案系統位置 (`cwd`、repo checkout、後端工作區)

範例：

- `/acp spawn codex --bind here`：保留此聊天，產生或附加 Codex ACP 工作階段，並將未來的訊息路由至此
- `/acp spawn codex --thread auto`：OpenClaw 可能會建立子執行緒/主題並將 ACP 工作階段綁定到那裡
- `/acp spawn codex --bind here --cwd /workspace/repo`：與上述相同的聊天綁定，但 Codex 在 `/workspace/repo` 中執行

目前對話綁定支援：

- 宣佈支援目前對話綁定的聊天/訊息頻道可以透過共享對話綁定路徑使用 `--bind here`。
- 具有自訂執行緒/主題語意的頻道仍然可以在相同的共用介面後提供特定頻道的正規化。
- `--bind here` 總是意味著「就地綁定目前的對話」。
- 一般目前對話綁定使用共用的 OpenClaw 綁定存放區，並且在正常的閘道重新啟動後仍然存在。

備註：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上互斥。
- 在 Discord 上，`--bind here` 會就地綁定目前的頻道或執行緒。僅當 OpenClaw 需要為 `--thread auto|here` 建立子執行緒時，才需要 `spawnAcpSessions`。
- 如果使用中的頻道未公開目前對話 ACP 綁定，OpenClaw 會傳回明確的不支援訊息。
- `resume` 和「新工作階段」問題是 ACP 工作階段問題，而非頻道問題。您可以在不改變目前聊天介面的情況下重複使用或取代執行時狀態。

### 執行緒繫結工作階段

當為頻道轉接器啟用執行緒繫結時，ACP 工作階段可以繫結到執行緒：

- OpenClaw 會將執行緒繫結到目標 ACP 工作階段。
- 該執行緒中的後續訊息會路由到已繫結的 ACP 工作階段。
- ACP 輸出會傳回同一個執行緒。
- 取消焦點/關閉/封存/閒置逾時或最大存留期過期會移除繫結。

執行緒繫結支援取決於轉接器。如果現用的頻道轉接器不支援執行緒繫結，OpenClaw 會傳回明確的不支援或不可用訊息。

執行緒繫結 ACP 所需的功能旗標：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟（將 `false` 設為暫停 ACP 分派）
- 通道適配器 ACP 線程生成標誌已啟用（特定於適配器）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援線程的通道

- 任何公開會話/線程綁定功能的通道適配器。
- 目前內建的支援：
  - Discord 線程/頻道
  - Telegram 主題（群組/超級群組中的論壇主題和 DM 主題）
- 外掛通道可以透過相同的綁定介面新增支援。

## 通道特定設定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定持續性 ACP 繫結。

### 綁定模型

- `bindings[].type="acp"` 標記持續性 ACP 對話繫結。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles 私訊/群組聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    為了穩定的群組繫結，建議優先使用 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage 私訊/群組聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    為了穩定的群組繫結，建議優先使用 `chat_id:*`。
- `bindings[].agentId` 是擁有者的 OpenClaw 代理程式 ID。
- 選用的 ACP 覆蓋項目位於 `bindings[].acp` 之下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每個代理的執行時期預設值

使用 `agents.list[].runtime` 為每個代理程式定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（harness ID，例如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 繫結會話的覆寫優先順序：

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全域 ACP 預設值（例如 `acp.backend`）

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

- OpenClaw 會確保設定的 ACP session 在使用前已存在。
- 該頻道或主題中的訊息會路由至設定的 ACP session。
- 在繫結對話中，`/new` 和 `/reset` 會就地重設相同的 ACP session key。
- 暫時的執行時期綁定（例如由執行緒聚焦流程建立的）在存在時仍然適用。

## 啟動 ACP sessions (介面)

### 從 `sessions_spawn`

使用 `runtime: "acp"` 從代理程式回合或工具呼叫啟動 ACP session。

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
- 如果省略 `agentId`，OpenClaw 在設定後會使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 以維持持續的綁定對話。

介面詳情：

- `task`（必填）：傳送至 ACP 會話的初始提示。
- `runtime`（ACP 必填）：必須為 `"acp"`。
- `agentId`（選填）：ACP 目标 Harness ID。如果設定，則回退至 `acp.defaultAgent`。
- `thread`（選填，預設 `false`）：請求綁定執行緒的流程（如果支援）。
- `mode`（選填）：`run`（單次）或 `session`（持續）。
  - 預設為 `run`
  - 如果省略 `thread: true` 和 mode，OpenClaw 可能會根據執行時路徑預設為持續行為
  - `mode: "session"` 需要 `thread: true`
- `cwd`（選填）：請求的執行時工作目錄（由後端/執行時原則驗證）。
- `label`（選填）：用於會話/橫幅文字的面向操作員的標籤。
- `resumeSessionId`（選填）：恢復現有的 ACP 會話而不是建立新的會話。Agent 會透過 `session/load` 重放其對話歷史。需要 `runtime: "acp"`。
- `streamTo`（選填）：`"parent"` 將初始 ACP 執行進度摘要作為系統事件串流回傳給請求者會話。
  - 當可用時，接受的回應包含 `streamLogPath`，指向會話範圍的 JSONL 記錄檔 (`<sessionId>.acp-stream.jsonl`)，您可以追蹤以取得完整的轉發歷史。

### 恢復現有會話

使用 `resumeSessionId` 以繼續先前的 ACP 工作階段，而不是重新開始。代理程式會透過 `session/load` 重放其對話歷史，因此它能夠了解之前的完整語境。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 會話從您的筆記型電腦轉移到您的手機 — 告訴您的代理接續您之前的工作
- 繼續您在 CLI 中以互動方式開始的編碼會話，現在透過您的代理以無頭方式運行
- 接續因網關重啟或閒置逾時而中斷的工作

注意：

- `resumeSessionId` 需要 `runtime: "acp"` —— 如果與子代理程式執行環境一起使用，會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理程式必須支援 `session/load` (Codex 和 Claude Code 支援)。
- 如果找不到會話 ID，產生 (spawn) 將會失敗並出現明確的錯誤訊息——不會無聲地回退到新會話。

### 操作員煙霧測試

在閘道部署後使用此功能，當您想要快速檢查 ACP 產生 (spawn) 是否實際上端對端運作，而不僅僅是通過單元測試時。

建議的閘道 (Gate)：

1. 驗證目標主機上已部署的閘道版本/提交版本。
2. 確認部署的來源包含 ACP 血緣接受設定於
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`)。
3. 開啟一個暫時的 ACPX 橋接工作階段至即時代理程式 (例如
   `razor(main)` 於 `jpclawhq`)。
4. 要求該代理程式呼叫 `sessions_spawn` 並使用：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證代理回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 無驗證器錯誤
6. 清理暫時性 ACPX 橋接器會話。

給即時代理的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 請將此煙霧測試保留在 `mode: "run"` 上，除非您正在刻意測試
  執行緒綁定的持久 ACP 工作階段。
- 基本閘道器不需要要求 `streamTo: "parent"`。該路徑取決於
  要求者/工作階段功能，並且是一個獨立的整合檢查。
- 請將執行緒綁定的 `mode: "session"` 測試視為來自真實 Discord 執行緒或 Telegram 主題的第二個、更豐富的整合
  階段。

## 沙箱相容性

ACP 會話目前運行在主機執行環境上，而不是在 OpenClaw 沙箱內部。

目前限制：

- 如果要求者工作階段處於沙盒模式，ACP 生成將會被阻擋，無論是對於 `sessions_spawn({ runtime: "acp" })` 還是 `/acp spawn`。
  - 錯誤： `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 帶有 `runtime: "acp"` 的 `sessions_spawn` 不支援 `sandbox: "require"`。
  - 錯誤： `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要沙盒強制執行時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

當需要從聊天中進行明確的操作員控制時，請使用 `/acp spawn`。

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

請參閱 [Slash Commands](/en/tools/slash-commands)。

## Session target resolution

大多數 `/acp` 動作都接受可選的 session target (`session-key`、`session-id` 或 `session-label`)。

解析順序：

1. 明確的目標引數（或 `/acp steer` 則為 `--session`）
   - tries key
   - 然後是 UUID 格式的 session id
   - 然後是 label
2. Current thread binding (如果此對話/執行緒綁定至 ACP session)
3. Current requester session fallback

Current-conversation bindings 與 thread bindings 均參與步驟 2。

如果無法解析目標，OpenClaw 會傳回清楚的錯誤 (`Unable to resolve session target: ...`)。

## Spawn bind modes

`/acp spawn` 支援 `--bind here|off`。

| 模式   | 行為                                                   |
| ------ | ------------------------------------------------------ |
| `here` | 就地綁定當前作用中的對話；如果沒有作用中的對話則失敗。 |
| `off`  | 不要建立當前對話的綁定。                               |

備註：

- `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作員途徑。
- `--bind here` 不會建立子執行緒。
- `--bind here` 僅在支援當前對話綁定的頻道上可用。
- `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中組合使用。

## 產生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                    |
| ------ | ----------------------------------------------------------------------- |
| `auto` | 在活動執行緒中：綁定該執行緒。在執行緒之外：若支援則建立/綁定子執行緒。 |
| `here` | 需要目前活動執行緒；若處於非執行緒狀態則失敗。                          |
| `off`  | 無綁定。工作階段以未綁定狀態啟動。                                      |

備註：

- 在非執行緒綁定介面上，預設行為實際上等同於 `off`。
- 執行緒綁定產生需要頻道策略支援：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
- 當您想要固定目前的對話而不建立子執行緒時，請使用 `--bind here`。

## ACP 控制項

可用指令系列：

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

`/acp status` 顯示有效的執行時期選項，並在可用時顯示執行時期層級和後端層級的會話識別碼。

部分控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回明確的不支援控制項錯誤。

## ACP 指令食譜

| 指令                 | 作用                                            | 範例                                                          |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 階段作業；可選用目前綁定或執行緒綁定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標階段作業的進行中輪次。                  | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 將指引指令傳送至正在執行的作業階段。            | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉作業階段並解除綁定執行緒目標。              | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行階段選項、功能。      | `/acp status`                                                 |
| `/acp set-mode`      | 為目標作業階段設定執行階段模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 通用執行階段設定選項寫入。                      | `/acp set model openai/gpt-5.2`                               |
| `/acp cwd`           | 設定執行階段工作目錄覆寫。                      | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定審核原則設定檔。                            | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行階段逾時 (秒)。                         | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時期模型覆寫。                          | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除工作階段執行時期選項覆寫。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 列出儲存庫中最近的 ACP 工作階段。               | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀態、功能、可行的修復措施。            | `/acp doctor`                                                 |
| `/acp install`       | 輸出確定性的安裝和啟用步驟。                    | `/acp install`                                                |

`/acp sessions` 讀取目前綁定或請求者會話的存放區。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道會話探索來解析目標，包括自訂的每個代理 `session.store` 根目錄。

## 執行時期選項對應

`/acp` 具有便利指令和一個通用設定器。

對等操作：

- `/acp model <id>` 對應至執行時期組態金鑰 `model`。
- `/acp permissions <profile>` 對應至執行時期組態金鑰 `approval_policy`。
- `/acp timeout <seconds>` 對應至執行時期組態金鑰 `timeout`。
- `/acp cwd <path>` 直接更新執行時期 cwd 覆寫。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd 覆蓋路徑。
- `/acp reset-options` 清除目標會話的所有運行時覆蓋。

## acpx harness 支援（當前）

當前的 acpx 內建 harness 別名：

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

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 配置定義了自訂代理程式別名，否則建議為 `agentId` 使用這些值。
如果您的本機 Cursor 安裝仍然將 ACP 公開為 `agent acp`，請在您的 acpx 配置中覆蓋 `cursor` 代理程式指令，而不是更改內建預設值。

直接使用 acpx CLI 也可以透過 `--agent <command>` 以任意配接器為目標，但該原始緊急出口是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路徑）。

## 必填配置

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

執行緒綁定配置因通道配接器而異。Discord 的範例：

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

如果執行緒綁定的 ACP 生成無法運作，請先驗證配接器功能旗標：

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Current-conversation binds 不需要建立子執行緒。它們需要一個有效的對話上下文，以及一個公開 ACP 對話綁定的通道配接器。

請參閱 [Configuration Reference](/en/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

安裝並啟用外掛程式：

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

預設情況下，隨附的 acpx 後端外掛程式 (`acpx`) 使用外掛程式本機固定的二進位檔案：

1. 指令預設為 ACPX 外掛程式套件內的外掛程式本機 `node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的釘選版本。
3. 啟動時會立即將 ACP 後端註冊為未就緒狀態。
4. 背景確保工作會驗證 `acpx --version`。
5. 如果外掛程式本機的二進位檔案遺失或不相符，它會執行：
   `npm install --omit=dev --no-save acpx@<pinned>` 並重新驗證。

您可以在外掛程式設定中覆寫 command/version：

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
- 相對路徑是從 OpenClaw 工作區目錄解析的。
- `expectedVersion: "any"` 停用嚴格版本比對。
- 當 `command` 指向自訂二進位檔案/路徑時，外掛程式本機自動安裝會停用。
- 當後端健康檢查執行時，OpenClaw 啟動保持非阻斷。

請參閱 [Plugins](/en/tools/plugin)。

### 自動相依性安裝

當您使用 `npm install -g openclaw` 全局安裝 OpenClaw 時，acpx
運行時依賴項（平台特定的二進制文件）會通過 postinstall 掛鈎自動安裝。
如果自動安裝失敗，網關仍會正常啟動，並通過 `openclaw acp doctor` 報告缺少依賴項。

### 插件工具 MCP 橋接

默認情況下，ACPX 會話**不**會向 ACP harness 公開 OpenClaw 插件註冊的工具。

如果您希望 ACP 代理（如 Codex 或 Claude Code）調用已安裝的
OpenClaw 插件工具（例如記憶回憶/存儲），請啟用專用橋接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用：

- 將名為 `openclaw-plugin-tools` 的內置 MCP 服務器注入到 ACPX 會話
  引導中。
- 公開由已安裝並啟用的 OpenClaw 插件註冊的插件工具。
- 保持該功能明確並默認關閉。

安全和信任說明：

- 這會擴展 ACP harness 的工具表面。
- ACP 代理僅能訪問網關中已處於活動狀態的插件工具。
- 應將此視為與允許這些插件在 OpenClaw 本身中執行相同的信任邊界。
- 啟用它之前，請檢查已安裝的插件。

自定義 `mcpServers` 仍像以前一樣工作。內置的插件工具橋接是一個額外的選擇性便利功能，並非通用 MCP 服務器配置的替代品。

## 權限配置

ACP 會話以非交互方式運行 —— 沒有 TTY 來批准或拒絕文件寫入和 shell 執行權限提示。acpx 插件提供了兩個配置鍵來控制權限的處理方式：

這些 ACPX harness 權限與 OpenClaw exec 批准是分開的，也與 CLI 後端供應商繞過標誌（如 Claude CLI `--permission-mode bypassPermissions`）分開。ACPX `approve-all` 是 ACP 會話的 harness 級別的緊急開關。

### `permissionMode`

控制 harness 代理可以在無需提示的情況下執行哪些操作。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有文件寫入和 shell 命令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY 時（這在 ACP 會話中總是如此）會發生什麼。

| 值     | 行為                                        |
| ------ | ------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會話。**(預設)** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。            |

### 配置

透過外掛配置設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後重新啟動閘道。

> **重要：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 會話中，任何觸發權限提示的寫入或執行都可能因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便會話優雅降級而不是崩潰。

## 疑難排解

| 症狀                                                                        | 可能原因                                                       | 修復方法                                                                                                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛遺失或已停用。                                         | 安裝並啟用後端外掛，然後執行 `/acp doctor`。                                                                                                   |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息進行分派。                               | 設定 `acp.dispatch.enabled=true`。                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理程式不在允許清單中。                                       | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                              |
| `Unable to resolve session target: ...`                                     | 錯誤的 key/id/label 權杖。                                     | 執行 `/acp sessions`，複製確切的 key/label，然後重試。                                                                                         |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有可繫結的作用中對話情況下使用。             | 移至目標聊天/頻道並重試，或使用非繫結的產生 (spawn)。                                                                                          |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏目前對話 ACP 繫結功能。                              | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                    |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒語境外使用。                           | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                   |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一個用戶擁有使用中的綁定目標。                               | 以擁有者身份重新綁定，或使用不同的對話或串列。                                                                                                 |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺少串列綁定功能。                                       | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                  |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 運行時位於主機端；請求者會話已沙箱化。                     | 從沙箱化會話使用 `runtime="subagent"`，或從非沙箱化會話執行 ACP 生成。                                                                         |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 已為 ACP 運行時請求 `sandbox="require"`。                      | 使用 `runtime="subagent"` 進行必要的沙箱化，或從非沙箱化會話搭配 `sandbox="inherit"` 使用 ACP。                                                |
| 綁定會話缺少 ACP 中繼資料                                                   | 過期/已刪除的 ACP 會話中繼資料。                               | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦串列。                                                                                            |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 阻止在非互動式 ACP 會話中進行寫入/執行。      | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](#permission-configuration)。            |
| ACP 會話提早失敗且輸出甚少                                                  | 權限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。 | 檢查閘道日誌中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 會話完成工作後無限期停滯                                                | 駕駛程序流程已結束，但 ACP 會話未報告完成。                    | 使用 `ps aux \| grep acpx` 監控；手動終止過期程序。                                                                                            |
