---
summary: "對 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 和其他外掛程式代理使用 ACP 執行階段工作階段"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理程式"
---

# ACP 代理程式

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 工作階段讓 OpenClaw 透過 ACP 後端外掛程式執行外部編碼工具（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 和其他支援的 ACPX 工具）。

如果您以自然語言要求 OpenClaw「在 Codex 中執行此操作」或「在執行緒中啟動 Claude Code」，OpenClaw 應將該請求路由至 ACP 執行階段（而非原生子代理程式執行階段）。

如果您希望 Codex 或 Claude Code 作為外部 MCP 用戶端直接連線
到現有的 OpenClaw 頻道對話，請使用 [`openclaw mcp serve`](/en/cli/mcp)
而非 ACP。

## 快速操作員流程

當您需要實用的 `/acp` 行動手冊時，請使用此選項：

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
   - `/acp cancel`（停止目前輪次），或
   - `/acp close`（關閉階段工作階段 + 移除綁定）

## 人員快速入門

自然語言請求範例：

- 「將此 Discord 頻道綁定到 Codex。」
- 「在此處的執行緒中啟動持續的 Codex 階段工作階段，並保持其專注。」
- 「將此作為一次性 Claude Code ACP 階段工作階段執行，並總結結果。」
- 「將此 iMessage 聊天綁定到 Codex，並將後續追蹤保留在同一工作區中。」
- 「在執行緒中針對此任務使用 Gemini CLI，然後將後續追蹤保留在該同一執行緒中。」

OpenClaw 應該做什麼：

1. 選擇 `runtime: "acp"`。
2. 解析請求的 harness 目標（`agentId`，例如 `codex`）。
3. 如果請求了當前對話綁定且使用中的頻道支援該功能，則將 ACP 會話綁定到該對話。
4. 否則，如果請求了執行緒綁定且目前頻道支援該功能，則將 ACP 會話綁定到該執行緒。
5. 將後續的綁定訊息路由到同一個 ACP 會話，直到其失去焦點/關閉/過期。

## ACP 與子代理程式

當您需要外部 harness 執行時時使用 ACP。當您需要 OpenClaw 原生委派執行時使用子代理程式。

| 區域       | ACP 會話                                 | 子代理程式執行                    |
| ---------- | ---------------------------------------- | --------------------------------- |
| 執行時     | ACP 後端外掛程式（例如 acpx）            | OpenClaw 原生子代理程式執行時     |
| 會話金鑰   | `agent:<agentId>:acp:<uuid>`             | `agent:<agentId>:subagent:<uuid>` |
| 主要指令   | `/acp ...`                               | `/subagents ...`                  |
| Spawn 工具 | 具有 `runtime:"acp"` 的 `sessions_spawn` | `sessions_spawn` (預設執行環境)   |

另請參閱 [Sub-agents](/en/tools/subagents)。

## 繫結工作階段

### 目前對話繫結

當您希望目前對話成為持久的 ACP 工作區而不建立子執行緒時，請使用 `/acp spawn <harness> --bind here`。

行為：

- OpenClaw 仍擁有通道傳輸、驗證、安全性和傳遞功能。
- 目前對話會固定至產生的 ACP 工作階段金鑰。
- 該對話中的後續訊息會路由至同一個 ACP 工作階段。
- `/new` 和 `/reset` 會原地重設同一個繫結的 ACP 工作階段。
- `/acp close` 會關閉工作階段並移除目前對話的繫結。

實務上的意義：

- `--bind here` 保持相同的聊天介面。在 Discord 上，目前的頻道會維持為目前的頻道。
- 如果您正在開啟新的工作，`--bind here` 仍然可以建立新的 ACP 工作階段。該綁定會將工作階段附加到目前的對話。
- `--bind here` 不會自行建立子 Discord 執行緒或 Telegram 主題。
- ACP 執行時仍然可以擁有自己的工作目錄 (`cwd`) 或後端管理的磁碟工作區。該執行時工作區與聊天介面分開，並不意味著新的訊息執行緒。

心智模型：

- 聊天介面：人們持續交談的地方 (`Discord channel`、`Telegram topic`、`iMessage chat`)
- ACP 工作階段：OpenClaw 路由到持久的 Codex/Claude/Gemini 執行時狀態
- 子執行緒/主題：一個僅由 `--thread ...` 建立的可選額外訊息介面
- 執行時期工作區：駕馭運作的檔案系統位置 (`cwd`、repo checkout、後端工作區)

範例：

- `/acp spawn codex --bind here`：保留此聊天，產生或附加 Codex ACP 工作階段，並將此處的未來訊息路由傳送至該工作階段
- `/acp spawn codex --thread auto`：OpenClaw 可能會建立一個子執行緒/主題，並將 ACP 工作階段綁定至該處
- `/acp spawn codex --bind here --cwd /workspace/repo`：與上述相同的聊天綁定，但 Codex 在 `/workspace/repo` 中執行

目前對話綁定支援：

- 宣佈支援目前對話綁定的聊天/訊息頻道，可以透過共用的對話綁定路徑使用 `--bind here`。
- 具有自訂執行緒/主題語意的頻道仍然可以在相同的共用介面後提供特定頻道的正規化。
- `--bind here` 總是意味著「就地綁定目前對話」。
- 一般目前對話綁定使用共用的 OpenClaw 綁定存放區，並且在正常的閘道重新啟動後仍然存在。

備註：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上是互斥的。
- 在 Discord 上，`--bind here` 會就地綁定目前的頻道或執行緒。只有在 OpenClaw 需要為 `--thread auto|here` 建立子執行緒時，才需要 `spawnAcpSessions`。
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
- `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停 ACP 分派）
- 通道適配器 ACP 線程生成標誌已啟用（特定於適配器）
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援線程的通道

- 任何公開會話/線程綁定功能的通道適配器。
- 目前內建的支援：
  - Discord 線程/頻道
  - Telegram 主題（群組/超級群組中的論壇主題和 DM 主題）
- 外掛通道可以透過相同的綁定介面新增支援。

## 通道特定設定

對於非暫時性的工作流程，請在頂層 `bindings[]` 項目中設定持久的 ACP 綁定。

### 綁定模型

- `bindings[].type="acp"` 標記持久的 ACP 對話綁定。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或線程: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles 私訊/群組聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    為了穩定的群組綁定，建議使用 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage 私訊/群組聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    為了穩定的群組綁定，建議使用 `chat_id:*`。
- `bindings[].agentId` 是擁有的 OpenClaw 代理 ID。
- 選用的 ACP 覆寫設定位於 `bindings[].acp` 下：
  - `mode` (`persistent` 或 `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### 每個代理的執行時期預設值

使用 `agents.list[].runtime` 為每個 Agent 定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
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
- 在綁定的對話中，`/new` 和 `/reset` 會就地重設同一個 ACP session 鍵。
- 暫時的執行時期綁定（例如由執行緒聚焦流程建立的）在存在時仍然適用。

## 啟動 ACP sessions (介面)

### 從 `sessions_spawn`

使用 `runtime: "acp"` 從代理回合或工具呼叫啟動 ACP session。

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

- `runtime` 預設為 `subagent`，因此請為 ACP sessions 明確設定 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 會在設定時使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 以保持持續的綁定對話。

介面詳情：

- `task` (必填)：傳送到 ACP session 的初始提示。
- `runtime` (ACP 必填)：必須為 `"acp"`。
- `agentId` (選填)：ACP 目標 harness id。如果已設定，則回退至 `acp.defaultAgent`。
- `thread` (選填，預設 `false`)：在支援的情況下請求執行緒綁定流程。
- `mode` (選填)：`run` (單次) 或 `session` (持續)。
  - 預設為 `run`
  - 如果省略 `thread: true` 和模式，OpenClaw 可能會根據執行時期路徑預設為持續行為
  - `mode: "session"` 需要 `thread: true`
- `cwd` (選填)：請求的執行時期工作目錄（由後端/執行時期原則驗證）。
- `label` (選填)：用於 session/banner 文字中面向操作員的標籤。
- `resumeSessionId` (可選)：恢復現有的 ACP 會話而不是建立新的會話。Agent 會透過 `session/load` 重放其對話歷史。需要 `runtime: "acp"`。
- `streamTo` (可選)：`"parent"` 將初始 ACP 執行進度摘要作為系統事件串流回請求者會話。
  - 當可用時，接受的回應包括 `streamLogPath` 指向會話範圍的 JSONL 日誌 (`<sessionId>.acp-stream.jsonl`)，您可以對其進行 tail 操作以查看完整的轉送歷史記錄。

### 恢復現有會話

使用 `resumeSessionId` 繼續先前的 ACP 會話，而不是重新開始。代理透過 `session/load` 重放其對話歷史，因此它能繼續並掌握之前發生的所有上下文。

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

- `resumeSessionId` 需要 `runtime: "acp"` — 如果與子代理運行時一起使用，則會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍正常套用於您正在建立的新 OpenClaw 會話，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理程式必須支援 `session/load`（Codex 和 Claude Code 都支援）。
- 如果找不到會話 ID，產生 (spawn) 將會失敗並出現明確的錯誤訊息——不會無聲地回退到新會話。

### 操作員煙霧測試

在閘道部署後使用此功能，當您想要快速檢查 ACP 產生 (spawn) 是否實際上端對端運作，而不僅僅是通過單元測試時。

建議的閘道 (Gate)：

1. 驗證目標主機上已部署的閘道版本/提交版本。
2. 確認已部署的來源包含 ACP 譜系接受項於
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中。
3. 開啟一個到即時代理（例如
   `razor(main)` 上的 `jpclawhq`）的暫時性 ACPX 橋接器會話。
4. 要求該代理使用以下參數呼叫 `sessions_spawn`：
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

- 除非您正在刻意測試
  執行緒繫結的持久 ACP 會話，否則請將此煙霧測試保持在 `mode: "run"` 上。
- 不要針對基本閘道要求 `streamTo: "parent"`。該路徑取決於
  請求者/會話能力，且為一項獨立的整合檢查。
- 將綁定執行緒 `mode: "session"` 測試視為從真實 Discord 執行緒或 Telegram 主題進行的第二次、更豐富的整合過程。

## 沙箱相容性

ACP 會話目前運行在主機執行環境上，而不是在 OpenClaw 沙箱內部。

目前限制：

- 如果請求者會話位於沙箱中，則會阻止 ACP 產生 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn`。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 帶有 `runtime: "acp"` 的 `sessions_spawn` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要強制執行沙箱執行時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

需要時，使用 `/acp spawn` 透過聊天進行明確的操作員控制。

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

大多數 `/acp` 動作接受一個選用的 session target (`session-key`、`session-id` 或 `session-label`)。

解析順序：

1. 明確的目標引數 (或針對 `/acp steer` 的 `--session`)
   - tries key
   - 然後是 UUID 格式的 session id
   - 然後是 label
2. Current thread binding (如果此對話/執行緒綁定至 ACP session)
3. Current requester session fallback

Current-conversation bindings 與 thread bindings 均參與步驟 2。

如果未解析到任何目標，OpenClaw 會傳回明確的錯誤 (`Unable to resolve session target: ...`)。

## Spawn bind modes

`/acp spawn` 支援 `--bind here|off`。

| 模式   | 行為                                                   |
| ------ | ------------------------------------------------------ |
| `here` | 就地綁定當前作用中的對話；如果沒有作用中的對話則失敗。 |
| `off`  | 不要建立當前對話的綁定。                               |

備註：

- `--bind here` 是「讓此頻道或聊天由 Codex 支援」的最簡單操作路徑。
- `--bind here` 不會建立子執行緒。
- `--bind here` 僅在暴露當前對話綁定支援的頻道上可用。
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
- 當您想要釘選目前對話而不建立子執行緒時，請使用 `--bind here`。

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

`/acp status` 顯示有效的執行選項，並在可用時顯示執行階層和後端階層的階段作業識別碼。

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

`/acp sessions` 會讀取目前綁定或請求者會話的存放區。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道會話探索來解析目標，包括每個 Agent 的自訂 `session.store` 根目錄。

## 執行時期選項對應

`/acp` 具有便利指令和一個通用設定器。

對等操作：

- `/acp model <id>` 對應至執行時期設定鍵 `model`。
- `/acp permissions <profile>` 對應至執行時期設定鍵 `approval_policy`。
- `/acp timeout <seconds>` 對應至執行時期設定鍵 `timeout`。
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

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 配置定義了自訂代理別名，否則請優先為 `agentId` 使用這些值。
如果您本機安裝的 Cursor 仍將 ACP 公開為 `agent acp`，請在您的 acpx 配置中覆蓋 `cursor` 代理指令，而不是更改內建預設值。

直接的 acpx CLI 使用也可以透過 `--agent <command>` 針對任意配接器，但該原始的逃生機制是 acpx CLI 的功能（而非正常的 OpenClaw `agentId` 路徑）。

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

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

Current-conversation binds 不需要建立子執行緒。它們需要一個有效的對話上下文，以及一個公開 ACP 對話綁定的通道配接器。

請參閱[設定參考](/en/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

安裝並啟用外掛程式：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本機工作區安裝：

```bash
openclaw plugins install ./extensions/acpx
```

然後驗證後端健康狀態：

```text
/acp doctor
```

### acpx 指令與版本設定

預設情況下，隨附的 acpx 後端外掛程式 (`acpx`) 會使用外掛程式本機固定的二進位檔案：

1. 指令預設為 `extensions/acpx/node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的釘選版本。
3. 啟動時會立即將 ACP 後端註冊為未就緒狀態。
4. 背景的確保工作會驗證 `acpx --version`。
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
- 當 `command` 指向自訂二進位檔/路徑時，外掛程式本機自動安裝會停用。
- 當後端健康檢查執行時，OpenClaw 啟動保持非阻斷。

請參閱 [外掛程式](/en/tools/plugin)。

## 權限設定

ACP 會話以非互動方式執行——沒有 TTY 可以批准或拒絕檔案寫入和 shell 執行權限提示。acpx 外掛程式提供兩個設定金鑰來控制權限的處理方式：

### `permissionMode`

控制 harness 代理程式可以在不提示的情況下執行哪些作業。

| 數值            | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 Shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制在會顯示權限提示但無互動式 TTY 可用時（ACP 會話始終是這種情況）會發生什麼。

| 數值   | 行為                                          |
| ------ | --------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會話。**（預設）** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。              |

### 設定

透過外掛程式設定設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些數值後請重新啟動閘道。

> **重要提示：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 工作階段中，任何觸發權限提示的寫入或執行操作都可能會失敗並傳回 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便工作階段能夠優雅地降級，而不是崩潰。

## 疑難排解

| 症狀                                                                        | 可能原因                                                       | 解決方法                                                                                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛程式遺失或已停用。                                     | 安裝並啟用後端外掛程式，然後執行 `/acp doctor`。                                                                                                     |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                            |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息進行分派。                               | 設定 `acp.dispatch.enabled=true`。                                                                                                                   |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允許清單中。                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                    |
| `Unable to resolve session target: ...`                                     | 錯誤的 key/id/label token。                                    | 執行 `/acp sessions`，複製確切的 key/label，然後重試。                                                                                               |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有有效可綁定對話的情況下使用。               | 移動到目標聊天/頻道並重試，或使用非綁定的生成。                                                                                                      |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺少目前對話 ACP 綁定能力。                              | 在支援的地方使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                            |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒上下文之外使用。                       | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                         |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位用戶擁有啟用的綁定目標。                                 | 以擁有者身份重新綁定，或使用不同的對話或執行緒。                                                                                                     |
| `Thread bindings are unavailable for <channel>.`                            | 轉接器缺少執行緒綁定功能。                                     | 使用 `--thread off` 或切換至支援的轉接器/頻道。                                                                                                      |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行時位於主機端；請求者工作階段已沙盒化。                 | 從沙盒化工作階段使用 `runtime="subagent"`，或從非沙盒化工作階段執行 ACP 生成。                                                                       |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 為 ACP 執行時請求了 `sandbox="require"`。                      | 針對所需的沙盒化使用 `runtime="subagent"`，或從非沙盒化工作階段使用搭配 `sandbox="inherit"` 的 ACP。                                                 |
| 綁定工作階段缺少 ACP 元數據                                                 | 過期/已刪除的 ACP 工作階段元數據。                             | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦執行緒。                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 工作階段中封鎖寫入/執行。      | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](#permission-configuration)。                  |
| ACP 工作階段提早失敗且輸出很少                                              | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 請檢查閘道日誌中的 `AcpRuntimeError`。若要取得完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 工作階段在完成工作後無限期停滯                                          | 線程 程序已結束，但 ACP 工作階段未回報完成。                   | 使用 `ps aux \| grep acpx` 進行監控；手動終結過時的程序。                                                                                            |
