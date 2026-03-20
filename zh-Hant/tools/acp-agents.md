---
summary: "Use ACP runtime sessions for Pi, Claude Code, Codex, OpenCode, Gemini CLI, and other harness agents"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP Agents"
---

# ACP agents

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) sessions let OpenClaw run external coding harnesses (for example Pi, Claude Code, Codex, OpenCode, and Gemini CLI) through an ACP backend plugin.

If you ask OpenClaw in plain language to "run this in Codex" or "start Claude Code in a thread", OpenClaw should route that request to the ACP runtime (not the native sub-agent runtime).

## Fast operator flow

Use this when you want a practical `/acp` runbook:

1. Spawn a session:
   - `/acp spawn codex --mode persistent --thread auto`
2. Work in the bound thread (or target that session key explicitly).
3. Check runtime state:
   - `/acp status`
4. Tune runtime options as needed:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Nudge an active session without replacing context:
   - `/acp steer tighten logging and continue`
6. Stop work:
   - `/acp cancel` (stop current turn), or
   - `/acp close` (close session + remove bindings)

## Quick start for humans

Examples of natural requests:

- "Start a persistent Codex session in a thread here and keep it focused."
- "Run this as a one-shot Claude Code ACP session and summarize the result."
- "Use Gemini CLI for this task in a thread, then keep follow-ups in that same thread."

What OpenClaw should do:

1. Pick `runtime: "acp"`.
2. Resolve the requested harness target (`agentId`, for example `codex`).
3. If thread binding is requested and the current channel supports it, bind the ACP session to the thread.
4. Route follow-up thread messages to that same ACP session until unfocused/closed/expired.

## ACP versus sub-agents

Use ACP when you want an external harness runtime. Use sub-agents when you want OpenClaw-native delegated runs.

| Area          | ACP session                           | Sub-agent run                      |
| ------------- | ------------------------------------- | ---------------------------------- |
| Runtime       | ACP 後端外掛（例如 acpx） | OpenClaw 原生子代理執行時  |
| Session 金鑰   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`  |
| 主要指令 | `/acp ...`                            | `/subagents ...`                   |
| 產生工具    | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn` (預設執行時) |

另請參閱 [Sub-agents](/zh-Hant/tools/subagents)。

## 執行緒繫結會話

當通道配接器啟用執行緒繫結時，ACP 會話可以繫結至執行緒：

- OpenClaw 會將執行緒繫結至目標 ACP 會話。
- 該執行緒中的後續訊息會路由至已繫結的 ACP 會話。
- ACP 輸出會傳回同一個執行緒。
- 失焦/關閉/封存/閒置逾時或最大存活時間到期會移除繫結。

執行緒繫結支援取決於配接器。如果目前作用的通道配接器不支援執行緒繫結，OpenClaw 會傳回明確的不支援或無法使用訊息。

執行緒繫結 ACP 的必要功能旗標：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟 (設定 `false` 以暫停 ACP 分派)
- 通道配接器 ACP 執行緒產生旗標已啟用 (依配接器而定)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的通道

- 任何公開會話/執行緒繫結功能的通道配接器。
- 目前內建的支援：
  - Discord 執行緒/頻道
  - Telegram 主題 (群組/超級群組中的論壇主題以及 DM 主題)
- 外掛通道可以透過相同的繫結介面新增支援。

## 通道特定設定

對於非短暫的工作流程，請在頂層 `bindings[]` 項目中設定持續性 ACP 繫結。

### 繫結模型

- `bindings[].type="acp"` 標記持續性 ACP 對話繫結。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是擁有的 OpenClaw 代理 ID。
- 選用的 ACP 覆寫位於 `bindings[].acp` 之下：
  - `mode` (`persistent` 或 `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### 每個代理的運行時預設值

使用 `agents.list[].runtime` 為每個代理定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 繫結會話的覆蓋優先順序：

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

- OpenClaw 會確保設定的 ACP 會話在使用前已存在。
- 該頻道或主題中的訊息會路由至設定的 ACP 會話。
- 在繫結對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 暫時的運行時繫結 (例如由執行緒聚焦流程建立的) 在存在的情況下仍然適用。

## 啟動 ACP 會話 (介面)

### 從 `sessions_spawn`

使用 `runtime: "acp"` 從代理轉換或工具呼叫啟動 ACP 會話。

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
- `mode: "session"` 需要 `thread: true` 來維持持久的繫結對話。

介面詳情：

- `task` (必要)：發送到 ACP 會話的初始提示。
- `runtime` (ACP 必要)：必須為 `"acp"`。
- `agentId` (選用)：ACP 目標 harness id。如果已設定，則回退至 `acp.defaultAgent`。
- `thread` (選用，預設 `false`)：在支援的地方請求執行緒繫結流程。
- `mode` (選用): `run` (單次) 或 `session` (持續)。
  - 預設為 `run`
  - 如果省略了 `thread: true` 和模式，OpenClaw 可能會根據執行時路徑預設為持續行為
  - `mode: "session"` 需要 `thread: true`
- `cwd` (選用): 請求的執行時工作目錄 (由後端/執行時原則驗證)。
- `label` (選用): 用於會話/橫幅文字中供操作員看到的標籤。
- `resumeSessionId` (選用): 恢復現有的 ACP 會話，而不是建立新的會話。代理會透過 `session/load` 重放其對話記錄。需要 `runtime: "acp"`。
- `streamTo` (選用): `"parent"` 將初始 ACP 執行進度摘要以系統事件的形式串流回傳給請求者會話。
  - 當可用時，接受的回應包括指向會話範圍的 JSONL 記錄 (`<sessionId>.acp-stream.jsonl`) 的 `streamLogPath`，您可以追蹤它以取得完整的轉送記錄。

### 恢復現有的會話

使用 `resumeSessionId` 繼續先前的 ACP 會話，而不是重新開始。代理會透過 `session/load` 重放其對話記錄，因此它能接續之前發生的一切內容。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 會話從您的筆記型電腦轉移到您的手機 — 告訴您的代理接續您上次離開的地方
- 繼續您在 CLI 中以互動方式開始的編碼會話，現在透過您的代理以無頭模式執行
- 接續因網關重新啟動或閒置逾時而中斷的工作

備註：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果與子代理執行時一起使用，會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話記錄；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 會話，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理必須支援 `session/load`（Codex 和 Claude Code 支援）。
- 如果找不到工作階段 ID，啟動將會失敗並顯示明確的錯誤訊息 —— 不會無法自動回退到新的工作階段。

### 操作員冒煙測試

當您想要快速檢查 ACP 啟動是否真正端到端運作，而不僅僅是通過單元測試時，請在閘道部署後使用此方法。

建議閘道：

1. 驗證目標主機上部署的閘道版本/提交。
2. 確認部署的來源包含 ACP 世系驗收
   在 `src/gateway/sessions-patch.ts`（`subagent:* or acp:* sessions`）中。
3. 開啟一個即時代理的臨時 ACPX 橋接工作階段（例如
   `razor(main)` 上的 `jpclawhq`）。
4. 要求該代理呼叫 `sessions_spawn` 並帶入：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證代理回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 無驗證器錯誤
6. 清理臨時 ACPX 橋接工作階段。

給即時代理的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

注意：

- 除非您刻意測試
  執行緒綁定的持久 ACP 工作階段，否則請在 `mode: "run"` 上進行此冒煙測試。
- 基本閘道不需要要求 `streamTo: "parent"`。該路徑取決於
  請求者/工作階段功能，屬於單獨的整合檢查。
- 將執行緒綁定 `mode: "session"` 測試視為第二次、更豐富的整合
  檢查，來源為真實的 Discord 執行緒或 Telegram 主題。

## 沙箱相容性

ACP 工作階段目前於主機執行時環境上執行，而非在 OpenClaw 沙箱內執行。

目前限制：

- 如果請求者工作階段處於沙箱中，ACP 啟動將被阻擋，包括 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn`。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要沙箱強制執行時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

當需要從聊天中進行明確的操作員控制時，請使用 `/acp spawn`。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

主要旗標：

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

## Session 目標解析

大多數 `/acp` 動作都接受一個可選的 session 目標 (`session-key`、`session-id` 或 `session-label`)。

解析順序：

1. 明確的目標引數 (或針對 `/acp steer` 的 `--session`)
   - tries 金鑰
   - 然後是 UUID 格式的 session id
   - 然後是標籤
2. 目前執行緒綁定 (如果此對話/執行緒已綁定至 ACP session)
3. 目前請求者 session 後援

如果未解析到任何目標，OpenClaw 會傳回一個清楚的錯誤 (`Unable to resolve session target: ...`)。

## 產生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------- |
| `auto` | 在作用中執行緒內：綁定該執行緒。在執行緒外：若支援，則建立/綁定子執行緒。 |
| `here` | 需要目前作用中的執行緒；若沒有則失敗。                                                  |
| `off`  | 無綁定。Session 以未綁定狀態啟動。                                                                 |

備註：

- 在非執行緒綁定介面上，預設行為實際上等同於 `off`。
- 執行緒綁定產生需要通道政策支援：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

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

`/acp status` 會顯示有效的執行時期選項，以及在可用時顯示執行時期層級和後端層級的 session 識別碼。

部分控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回明確的不支援控制項錯誤。

## ACP 指令食譜

| 指令              | 功能說明                                              | 範例                                                        |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 工作階段；選擇性的執行緒繫結。                 | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目標工作階段正在進行的輪次。                 | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 傳送導引指令至正在執行的工作階段。                | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 關閉工作階段並解除繫結執行緒目標。                  | `/acp close`                                                   |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。 | `/acp status`                                                  |
| `/acp set-mode`      | 設定目標工作階段的執行時期模式。                      | `/acp set-mode plan`                                           |
| `/acp set`           | 一般執行時期組態選項寫入。                      | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 設定執行時期工作目錄覆寫。                   | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 設定核准原則設定檔。                              | `/acp permissions strict`                                      |
| `/acp timeout`       | 設定執行時期逾時 (秒)。                            | `/acp timeout 120`                                             |
| `/acp model`         | 設定執行時期模型覆寫。                               | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | 移除工作階段執行時期選項覆寫。                  | `/acp reset-options`                                           |
| `/acp sessions`      | 列出存放區中最近的 ACP 工作階段。                      | `/acp sessions`                                                |
| `/acp doctor`        | 後端健康狀況、功能、可採取的修正措施。           | `/acp doctor`                                                  |
| `/acp install`       | 列印確定性的安裝和啟用步驟。             | `/acp install`                                                 |

`/acp sessions` 會讀取目前繫結或要求者工作階段的存放區。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道工作階段探索來解析目標，包括每個代理程式的自訂 `session.store` 根目錄。

## 執行時期選項對應

`/acp` 提供了便捷命令和通用設定器。

等效操作：

- `/acp model <id>` 對應到運行時設定金鑰 `model`。
- `/acp permissions <profile>` 對應到運行時設定金鑰 `approval_policy`。
- `/acp timeout <seconds>` 對應到運行時設定金鑰 `timeout`。
- `/acp cwd <path>` 直接更新運行時 cwd 覆寫。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd 覆寫路徑。
- `/acp reset-options` 清除目標會話的所有運行時覆寫。

## acpx harness 支援（目前）

目前的 acpx 內建 harness 別名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 設定定義了自訂代理程式別名，否則建議優先使用這些值作為 `agentId`。

直接使用 acpx CLI 也可以透過 `--agent <command>` 指定任意配接器，但該原始逃生艙是 acpx CLI 的功能（而非正常的 OpenClaw `agentId` 路徑）。

## 必要設定

核心 ACP 基線：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["pi", "claude", "codex", "opencode", "gemini", "kimi"],
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

執行緒繫結設定取決於特定通道配接器。以 Discord 為例：

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

如果執行緒繫結的 ACP 產生無法運作，請先驗證配接器功能旗標：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

請參閱 [設定參考](/zh-Hant/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

安裝並啟用外掛程式：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本地工作區安裝：

```bash
openclaw plugins install ./extensions/acpx
```

然後驗證後端健康狀態：

```text
/acp doctor
```

### acpx 指令與版本設定

根據預設，acpx 外掛程式（發布為 `@openclaw/acpx`）會使用外掛程式本地的固定二進位檔：

1. 指令預設為 `extensions/acpx/node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的固定版本。
3. 啟動時會立即將 ACP 後端註冊為尚未就緒。
4. 背景 ensure 工作會驗證 `acpx --version`。
5. 如果外掛程式本機二進位檔案遺失或不相符，它會執行：
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
- 相對路徑是從 OpenClaw 工作區目錄解析的。
- `expectedVersion: "any"` 會停用嚴格版本比對。
- 當 `command` 指向自訂二進位檔案/路徑時，外掛程式本機自動安裝會停用。
- 在執行後端健康檢查時，OpenClaw 啟動保持非阻斷狀態。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

## 權限設定

ACP 工作階段以非互動方式執行 — 沒有 TTY 可以批准或拒絕檔案寫入和 shell 執行權限提示。acpx 外掛程式提供兩個設定金鑰來控制權限的處理方式：

### `permissionMode`

控制駕駛程式代理程式可以在無需提示的情況下執行哪些作業。

| 值           | 行為                                                  |
| --------------- | --------------------------------------------------------- |
| `approve-all`   | 自動批准所有檔案寫入和 shell 指令。          |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                              |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY 時會發生什麼情況（對於 ACP 工作階段總是如此）。

| 值  | 行為                                                          |
| ------ | ----------------------------------------------------------------- |
| `fail` | 以 `AcpRuntimeError` 中止工作階段。 **（預設）**           |
| `deny` | 以靜默方式拒絕權限並繼續（優雅降級）。 |

### 設定

透過外掛程式設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後，請重新啟動閘道。

> **重要：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 工作階段中，任何觸發權限提示的寫入或執行都可能會因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便工作階段優雅降級而不是當機。

## 疑難排解

| 症狀                                                                  | 可能原因                                                                    | 修正方法                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 後端外掛程式遺失或已停用。                                             | 安裝並啟用後端外掛程式，然後執行 `/acp doctor`。                                                                                                        |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 已全域停用。                                                          | 設定 `acp.enabled=true`。                                                                                                                                           |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 已停用從一般執行緒訊息進行分派。                                  | 設定 `acp.dispatch.enabled=true`。                                                                                                                                  |
| `ACP agent "<id>" is not allowed by policy`                              | 代理程式不在允許清單中。                                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                              |
| `Unable to resolve session target: ...`                                  | 金鑰/ID/標籤權杖錯誤。                                                         | 執行 `/acp sessions`，複製確切的金鑰/標籤，然後重試。                                                                                                                 |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` 在執行緒內容之外使用。                                  | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                               |
| `Only <user-id> can rebind this thread.`                                 | 執行緒繫結由其他使用者擁有。                                               | 以擁有者身分重新繫結或使用不同的執行緒。                                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                         | 配接器缺乏執行緒繫結功能。                                        | 使用 `--thread off` 或移至支援的配接器/通道。                                                                                                          |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 執行時段位於主機端；要求者工作階段已沙箱化。                       | 從沙箱化工作階段使用 `runtime="subagent"`，或從非沙箱化工作階段執行 ACP 生成。                                                                  |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | 已針對 ACP 執行時段要求 `sandbox="require"`。                                  | 針對必要的沙箱使用 `runtime="subagent"`，或從非沙箱化工作階段將 ACP 與 `sandbox="inherit"` 搭配使用。                                               |
| 繫結工作階段遺失 ACP 中繼資料                                   | ACP 工作階段中繼資料過期或已刪除。                                             | 使用 `/acp spawn` 重新建立，然後重新繫結/聚焦執行緒。                                                                                                             |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 封鎖非互動式 ACP 工作階段中的寫入/執行。             | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](#permission-configuration)。                 |
| ACP 工作階段提早失敗且輸出甚少                               | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 檢查 `AcpRuntimeError` 的 gateway 記錄。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 工作階段在完成工作後無限期停滯                    | Harness 程序已完成，但 ACP 工作階段未回報完成。             | 使用 `ps aux \| grep acpx` 進行監控；手動終止停滯的程序。                                                                                                |

import en from "/components/footer/en.mdx";

<en />
