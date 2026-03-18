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

| Area          | ACP session                           | Sub-agent run                     |
| ------------- | ------------------------------------- | --------------------------------- |
| Runtime       | ACP backend plugin (for example acpx) | OpenClaw native sub-agent runtime |
| Session key   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| Main commands | `/acp ...`                            | `/subagents ...`                  |
| 生成工具      | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn`（預設執行時間）  |

另請參閱[子代理程式](/zh-Hant/tools/subagents)。

## 綁定執行緒的工作階段（與通道無關）

當為通道配接器啟用執行緒綁定時，ACP 工作階段可以綁定到執行緒：

- OpenClaw 會將執行緒綁定到目標 ACP 工作階段。
- 該執行緒中的後續訊息會路由到已綁定的 ACP 工作階段。
- ACP 輸出會傳回同一個執行緒。
- 取消聚焦/關閉/封存/閒置逾時或最大期限過期會移除綁定。

執行緒綁定支援取決於配接器。如果使用中的通道配接器不支援執行緒綁定，OpenClaw 會傳回明確的不支援/無法使用訊息。

執行緒綁定 ACP 所需的功能旗標：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停 ACP 分派）
- 已啟用通道配接器 ACP 執行緒生成旗標（因配接器而異）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的通道

- 任何公開工作階段/執行緒綁定功能的通道配接器。
- 目前的內建支援：
  - Discord 執行緒/頻道
  - Telegram 主題（群組/超級群組中的論壇主題和 DM 主題）
- 外掛程式通道可以透過相同的綁定介面新增支援。

## 通道特定設定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定永久 ACP 綁定。

### 綁定模型

- `bindings[].type="acp"` 標示永久 ACP 對話綁定。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是擁有的 OpenClaw 代理程式 ID。
- 選用的 ACP 覆寫位於 `bindings[].acp` 下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每個 Agent 的執行時預設值

使用 `agents.list[].runtime` 為每個 Agent 定義一次 ACP 預設值：

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

- OpenClaw 會在使用前確保已設定的 ACP 會話存在。
- 該頻道或主題中的訊息會路由到已設定的 ACP 會話。
- 在繫結的對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 暫時的執行時繫結 (例如由執行緒焦點流程建立的) 在存在時仍然適用。

## 啟動 ACP 會話 (介面)

### 從 `sessions_spawn`

使用 `runtime: "acp"` 從 Agent 輪次或工具呼叫啟動 ACP 會話。

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
- 如果省略 `agentId`，OpenClaw 會在已設定時使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 來保持持久的繫結對話。

介面詳細資訊：

- `task` (必要)：發送到 ACP 會話的初始提示。
- `runtime` (ACP 必要)：必須是 `"acp"`。
- `agentId` (選用)：ACP 目標 harness id。如果設定，則回退到 `acp.defaultAgent`。
- `thread` (選用，預設 `false`)：在支援的情況下請求執行緒繫結流程。
- `mode` (選用)：`run` (一次性) 或 `session` (持久)。
  - 預設為 `run`
  - 如果省略 `thread: true` 和模式，OpenClaw 可能會根據運行時路徑預設為持久化行為
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可選）：請求的運行時工作目錄（由後端/運行時策略驗證）。
- `label`（可選）：用於會話/橫幅文字的操作員面向標籤。
- `resumeSessionId`（可選）：恢復現有的 ACP 會話而不是建立新的會話。Agent 通過 `session/load` 重播其對話歷史。需要 `runtime: "acp"`。
- `streamTo`（可選）：`"parent"` 將初始 ACP 運行進度摘要作為系統事件串流回傳給請求者會話。
  - 當可用時，接受的回應包括指向會話範圍 JSONL 日誌（`<sessionId>.acp-stream.jsonl`）的 `streamLogPath`，您可以追蹤該日誌以獲得完整的轉發歷史。

### 恢復現有會話

使用 `resumeSessionId` 來繼續之前的 ACP 會話，而不是重新開始。Agent 通過 `session/load` 重播其對話歷史，因此它能接續之前的完整上下文。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見用例：

- 將 Codex 會話從筆記型電腦轉移到手機 — 告訴您的 agent 接續您之前的工作
- 繼續您在 CLI 中以互動方式開始的程式碼編寫會話，現在透過您的 agent 以無頭模式進行
- 接續因閘道重啟或閒置逾時而中斷的工作

注意：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果與子 agent 運行時一起使用，會傳回錯誤。
- `resumeSessionId` 恢復上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常適用於您正在建立的新 OpenClaw 會話，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標 agent 必須支援 `session/load`（Codex 和 Claude Code 支援）。
- 如果找不到會話 ID，生成將因明確錯誤而失敗 — 不會無聲地回退到新會話。

### 操作員冒煙測試

在網關部署後，當您想要快速實時檢查 ACP 生成是否端到端實際運作，而不僅僅是通過單元測試時，請使用此方法。

建議的檢查門檻（Gate）：

1. 驗證目標主機上已部署的網關版本/提交記錄。
2. 確認已部署的原始碼在 `src/gateway/sessions-patch.ts` 中包含 ACP 譜系驗收（`subagent:* or acp:* sessions`）。
3. 開啟一個到實時代理的臨時 ACPX 橋接會話（例如 `razor(main)` 上的 `jpclawhq`）。
4. 要求該代理使用以下參數呼叫 `sessions_spawn`：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證代理回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 無驗證器錯誤
6. 清理臨時 ACPX 橋接會話。

發送給實時代理的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 請將此煙霧測試保持在 `mode: "run"` 上，除非您是有意測試線程綁定的持久化 ACP 會話。
- 對於基本檢查門檻，不要要求 `streamTo: "parent"`。該路徑取決於請求者/會話的功能，是一項單獨的整合檢查。
- 應將線程綁定 `mode: "session"` 測試視為從真實 Discord 線程或 Telegram 主題進行的第二個、更豐富的整合測試。

## 沙盒相容性

ACP 會話目前運作於主機執行時上，而非在 OpenClaw 沙盒內部。

目前的限制：

- 如果請求者會話位於沙盒中，ACP 生成將同時對 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 阻擋。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要沙盒強制執行時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

當需要從聊天中進行明確的操作員控制時，請使用 `/acp spawn`。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

關鍵旗標：

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

## 會話目標解析

大多數 `/acp` 動作接受一個可選的會話目標 (`session-key`、`session-id` 或 `session-label`)。

解析順序：

1. 明確的目標引數（或針對 `/acp steer` 的 `--session`）
   - tries 鍵
   - 然後是 UUID 格式的會話 ID
   - 然後是標籤
2. 當前執行緒綁定（如果此對話/執行緒已綁定到 ACP 會話）
3. 當前請求者會話後備

如果未解析到任何目標，OpenClaw 會傳回明確的錯誤 (`Unable to resolve session target: ...`)。

## 生成執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                        |
| ------ | --------------------------------------------------------------------------- |
| `auto` | 在作用中的執行緒內：綁定該執行緒。在執行緒外：若支援，則建立/綁定子執行緒。 |
| `here` | 需要當前作用中的執行緒；若否則失敗。                                        |
| `off`  | 無綁定。會話以未綁定狀態啟動。                                              |

備註：

- 在非執行緒綁定介面上，預設行為實際上為 `off`。
- 執行緒綁定生成需要通道策略支援：
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

`/acp status` 會顯示有效的執行階段選項，並在可用時顯示執行階段層級和後端層級的會話識別碼。

某些控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回明確的不支援控制項錯誤。

## ACP 指令指南

| 指令                 | 功能                                       | 範例                                                           |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 會話；可選的執行緒綁定。          | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目標工作階段進行中的輪次。             | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 傳送導引指令至執行中的工作階段。           | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 關閉工作階段並解除綁定執行緒目標。         | `/acp close`                                                   |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。 | `/acp status`                                                  |
| `/acp set-mode`      | 設定目標工作階段的執行時期模式。           | `/acp set-mode plan`                                           |
| `/acp set`           | 一般執行時期設定選項寫入。                 | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 設定執行時期工作目錄覆寫。                 | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 設定核准政策設定檔。                       | `/acp permissions strict`                                      |
| `/acp timeout`       | 設定執行時期逾時（秒）。                   | `/acp timeout 120`                                             |
| `/acp model`         | 設定執行時期模型覆寫。                     | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | 移除工作階段執行時期選項覆寫。             | `/acp reset-options`                                           |
| `/acp sessions`      | 列出儲存庫中最近的 ACP 工作階段。          | `/acp sessions`                                                |
| `/acp doctor`        | 後端健康狀態、功能、可執行的修復方案。     | `/acp doctor`                                                  |
| `/acp install`       | 列出具確定性的安裝與啟用步驟。             | `/acp install`                                                 |

`/acp sessions` 會讀取目前綁定或請求者工作階段的儲存庫。接受 `session-key`、`session-id` 或 `session-label` token 的指令會透過閘道工作階段探索來解析目標，包括每個代理程式的自訂 `session.store` 根目錄。

## 執行時期選項對應

`/acp` 具有便利指令與通用設定器。

對等操作：

- `/acp model <id>` 對應至執行時期設定金鑰 `model`。
- `/acp permissions <profile>` 對應到 runtime config key `approval_policy`。
- `/acp timeout <seconds>` 對應到 runtime config key `timeout`。
- `/acp cwd <path>` 直接更新 runtime cwd override。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd override 路徑。
- `/acp reset-options` 清除目標 session 的所有 runtime overrides。

## acpx harness 支援 (目前)

目前內建的 acpx harness 別名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx config 定義了自訂 agent 別名，否則請優先使用這些值作為 `agentId`。

直接使用 acpx CLI 也可以透過 `--agent <command>` 指定任意 adapters，但這個原始的緊急逃生門是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路徑）。

## 必備設定

核心 ACP 基準：

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

Thread binding config 是特定於 channel-adapter 的。Discord 範例：

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

如果 thread-bound ACP 產生 (spawn) 無法運作，請先驗證 adapter feature flag：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

請參閱 [Configuration Reference](/zh-Hant/gateway/configuration-reference)。

## acpx 後端的插件設定

安裝並啟用插件：

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

### acpx 指令和版本設定

預設情況下，acpx 插件（發布為 `@openclaw/acpx`）使用插件本地的固定版本二進位檔：

1. 指令預設為 `extensions/acpx/node_modules/.bin/acpx`。
2. 預期版本預設為擴充功能的固定版本。
3. 啟動時立即將 ACP 後端註冊為未就緒 (not-ready)。
4. 背景 ensure 工作會驗證 `acpx --version`。
5. 如果插件本地二進位檔遺失或版本不符，它會執行：
   `npm install --omit=dev --no-save acpx@<pinned>` 並重新驗證。

您可以在插件設定中覆寫指令/版本：

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
- 當 `command` 指向自訂的二進位檔/路徑時，外掛區域自動安裝會被停用。
- 在執行後端健康檢查時，OpenClaw 啟動仍維持非阻塞狀態。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

## 權限設定

ACP 工作階段以非互動方式執行 — 沒有 TTY 可以核准或拒絕檔案寫入和 Shell 執行權限提示。acpx 外掛提供了兩個控制權限處理方式的設定鍵：

### `permissionMode`

控制程式代理程式可以在無需提示的情況下執行哪些操作。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動核准所有檔案寫入和 Shell 指令。  |
| `approve-reads` | 僅自動核准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有互動式 TTY 可用時會發生什麼情況（ACP 工作階段屬於這種情況）。

| 值     | 行為                                           |
| ------ | ---------------------------------------------- |
| `fail` | 以 `AcpRuntimeError` 中止工作階段。 **(預設)** |
| `deny` | 靜默拒絕權限並繼續 (優雅降級)。                |

### 設定

透過外掛設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後，請重新啟動閘道。

> **重要：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 工作階段中，任何觸發權限提示的寫入或執行都可能因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便工作階段能夠優雅降級而不是崩潰。

## 疑難排解

| 徵狀                                                                     | 可能原因                                                         | 修正方法                                                                                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 後端外掛遺失或已停用。                                           | 安裝並啟用後端外掛，然後執行 `/acp doctor`。                                                                                                   |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 已全域停用。                                                 | 設定 `acp.enabled=true`。                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 已停用從一般執行緒訊息分派。                                     | 設定 `acp.dispatch.enabled=true`。                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                              | 代理程式不在允許清單中。                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                              |
| `Unable to resolve session target: ...`                                  | 無效的金鑰/ID/標籤記號。                                         | 執行 `/acp sessions`，複製確切的金鑰/標籤，然後重試。                                                                                          |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` 用於執行緒上下文之外。                           | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                   |
| `Only <user-id> can rebind this thread.`                                 | 執行緒綁定由其他使用者擁有。                                     | 以擁有者身分重新綁定或使用不同的執行緒。                                                                                                       |
| `Thread bindings are unavailable for <channel>.`                         | 配接器缺少執行緒綁定功能。                                       | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                  |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 執行時位於主機端；要求者會話已沙盒化。                       | 從沙盒化會話使用 `runtime="subagent"`，或從非沙盒化會話執行 ACP 生成。                                                                         |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | 已為 ACP 執行時要求 `sandbox="require"`。                        | 使用 `runtime="subagent"` 進行所需的沙盒化，或在非沙盒化會話中使用 ACP 搭配 `sandbox="inherit"`。                                              |
| 綁定會話遺失 ACP 中繼資料                                                | 過時/已刪除的 ACP 會話中繼資料。                                 | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦執行緒。                                                                                          |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 在非互動式 ACP 會話中封鎖寫入/執行。            | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](#permission-configuration)。            |
| ACP 會話提早失敗且輸出甚少                                               | 權限提示已被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 檢查閘道紀錄中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 會話在完成工作後無限期停滯                                           | 駕馭程序已完成，但 ACP 會術未回報完成狀態。                      | 使用 `ps aux \| grep acpx` 進行監控；手動終止過時的程序。                                                                                      |

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
