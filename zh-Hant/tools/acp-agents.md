---
summary: "對 Pi、Claude Code、Codex、OpenCode、Gemini CLI 和其他 harness 代理使用 ACP 執行階段工作階段"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理"
---

# ACP 代理

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 工作階段讓 OpenClaw 能透過 ACP 後端外掛執行外部 coding harness（例如 Pi、Claude Code、Codex、OpenCode 和 Gemini CLI）。

如果您用自然語言請求 OpenClaw「在 Codex 中執行此操作」或「在執行緒中啟動 Claude Code」，OpenClaw 應將該請求路由傳送至 ACP 執行階段（而非原生子代理執行階段）。

## 快速操作流程

當您需要實用的 `/acp` runbook 時使用：

1. 生成工作階段：
   - `/acp spawn codex --mode persistent --thread auto`
2. 在綁定的執行緒中工作（或明確指定該工作階段金鑰作為目標）。
3. 檢查執行階段狀態：
   - `/acp status`
4. 視需要調整執行階段選項：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在替換上下文的情況下推動使用中工作階段：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel` (停止當前輪次)，或
   - `/acp close` (關閉工作階段 + 移除綁定)

## 人員快速入門

自然請求範例：

- 「在此處的執行緒中啟動持續性 Codex 工作階段，並讓其保持專注。」
- 「將此作為一次性 Claude Code ACP 工作階段執行，並總結結果。」
- 「在此工作的執行緒中使用 Gemini CLI，然後將後續追蹤保持在同一個執行緒中。」

OpenClaw 應採取的行動：

1. 選擇 `runtime: "acp"`。
2. 解析請求的 harness 目標 (`agentId`，例如 `codex`)。
3. 如果請求執行緒綁定且目前頻道支援，則將 ACP 工作階段綁定至該執行緒。
4. 將後續的執行緒訊息路由傳送至該 ACP 工作階段，直到其解除專注/關閉/過期。

## ACP 與子代理

當您需要外部 harness 執行階段時請使用 ACP。當您需要 OpenClaw 原生委派執行時請使用子代理。

| 區域         | ACP 工作階段                             | 子代理執行                        |
| ------------ | ---------------------------------------- | --------------------------------- |
| 執行階段     | ACP 後端外掛 (例如 acpx)                 | OpenClaw 原生子代理執行階段       |
| 工作階段金鑰 | `agent:<agentId>:acp:<uuid>`             | `agent:<agentId>:subagent:<uuid>` |
| 主要指令     | `/acp ...`                               | `/subagents ...`                  |
| 生成工具     | 帶有 `runtime:"acp"` 的 `sessions_spawn` | `sessions_spawn` (預設執行環境)   |

另請參閱 [Sub-agents](/zh-Hant/tools/subagents)。

## 執行緒綁定會話 (與通道無關)

當為通道適配器啟用執行緒綁定時，ACP 會話可以綁定到執行緒：

- OpenClaw 會將執行緒綁定到目標 ACP 會話。
- 該執行緒中的後續訊息會路由到已綁定的 ACP 會話。
- ACP 輸出會傳遞回同一個執行緒。
- 取消焦點/關閉/封存/閒置逾時或最大期限過期會移除綁定。

執行緒綁定支援取決於適配器。如果目前的通道適配器不支援執行緒綁定，OpenClaw 會傳回明確的不支援/不可用訊息。

執行緒綁定 ACP 所需的功能旗標：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟 (設定 `false` 以暫停 ACP 分派)
- 已啟用通道適配器 ACP 執行緒生成旗標 (因適配器而異)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的通道

- 任何公開會話/執行緒綁定功能的通道適配器。
- 目前的內建支援：
  - Discord 執行緒/頻道
  - Telegram 主題 (群組/超級群組中的論壇主題以及 DM 主題)
- 外掛通道可以透過相同的綁定介面新增支援。

## 通道特定設定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定永久 ACP 綁定。

### 綁定模型

- `bindings[].type="acp"` 標記永久 ACP 對話綁定。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是擁有的 OpenClaw 代理 ID。
- 選用的 ACP 覆寫位於 `bindings[].acp` 之下：
  - `mode` (`persistent` 或 `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### 每個代理的執行時預設值

使用 `agents.list[].runtime` 為每個代理定義一次 ACP 預設值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` （harness id，例如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 繫結會話的覆蓋優先順序：

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

- OpenClaw 會確保設定的 ACP 會話在使用前已存在。
- 該頻道或主題中的訊息會路由到設定的 ACP 會話。
- 在繫結的對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 臨時執行時繫結（例如由執行緒焦點流程建立的）在存在時仍然適用。

## 啟動 ACP 會話（介面）

### 從 `sessions_spawn`

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

備註：

- `runtime` 預設為 `subagent`，因此請為 ACP 會話明確設定 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 在有設定時會使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 來保持持久的繫結對話。

介面詳細資訊：

- `task` （必填）：傳送到 ACP 會話的初始提示。
- `runtime` （ACP 必填）：必須是 `"acp"`。
- `agentId` （選用）：ACP 目標 harness id。如果設定，則回退到 `acp.defaultAgent`。
- `thread` （選用，預設 `false`）：在支援的情況下請求執行緒繫結流程。
- `mode` （選用）：`run` （單次）或 `session` （持續性）。
  - 預設為 `run`
  - 如果省略了 `thread: true` 和模式，OpenClaw 可能會根據運行時路徑預設為持久性行為
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可選）：請求的運行時工作目錄（由後端/運行時策略驗證）。
- `label`（可選）：用於會話/橫幅文字的面向操作員的標籤。
- `resumeSessionId`（可選）：恢復現有的 ACP 會話而不是建立新會話。代理程式會透過 `session/load` 重播其對話歷史。需要 `runtime: "acp"`。
- `streamTo`（可選）：`"parent"` 將初始 ACP 運行進度摘要作為系統事件串流回傳給請求者會話。
  - 當可用時，接受的回應包含 `streamLogPath`，指向會話範圍的 JSONL 日誌（`<sessionId>.acp-stream.jsonl`），您可以對其進行 tail 操作以獲得完整的轉送歷史。

### 恢復現有會話

使用 `resumeSessionId` 繼續先前的 ACP 會話，而不是重新開始。代理程式會透過 `session/load` 重播其對話歷史，因此它能繼續並掌握之前發生的所有背景。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 會話從您的筆記型電腦移交到您的手機 —— 告訴您的代理程式從您中斷的地方接手
- 繼續您在 CLI 中以互動方式開始的程式設計會話，現在透過您的代理程式以無頭模式（headlessly）進行
- 接手因閘道重新啟動或閒置逾時而中斷的工作

注意：

- `resumeSessionId` 需要 `runtime: "acp"` —— 如果與子代理程式運行時一起使用，會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 會話，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理程式必須支援 `session/load`（Codex 和 Claude Code 支援）。
- 如果找不到會話 ID，產生會失敗並傳回明確的錯誤 —— 不會自動靜默回退到新會話。

### 操作員冒煙測試

在 gateway 部署後使用此方法，當您想要快速進行即時檢查以確認 ACP spawn
是否實際上端到端運作，而不僅僅是通過單元測試時。

建議的檢查門檻：

1. 驗證目標主機上部署的 gateway 版本/提交記錄。
2. 確認部署的來源包含 ACP lineage acceptance 在
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中。
3. 開啟一個到即時 agent 的臨時 ACPX bridge session（例如
   `razor(main)` on `jpclawhq`）。
4. 要求該 agent 呼叫 `sessions_spawn` 並帶有：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證 agent 回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 無驗證器錯誤
6. 清理臨時 ACPX bridge session。

給即時 agent 的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 除非您故意測試 thread-bound persistent ACP sessions，
  否則請將此煙霧測試保持在 `mode: "run"` 上。
- 基本檢查門檻不要求 `streamTo: "parent"`。該路徑取決於
  requester/session 能力，是一個獨立的整合檢查。
- 將 thread-bound `mode: "session"` 測試視為來自真實 Discord thread 或 Telegram topic 的
  第二次、更豐富的整合檢查。

## Sandbox 相容性

ACP sessions 目前在 host runtime 上運行，而不是在 OpenClaw sandbox 內部。

目前的限制：

- 如果 requester session 是 sandboxed，則 ACP spawns 會對 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 都被封鎖。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 帶有 `runtime: "acp"` 的 `sessions_spawn` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要 sandbox-enforced execution 時，請使用 `runtime: "subagent"`。

### 從 `/acp` 指令

當需要時，使用 `/acp spawn` 從聊天中進行明確的操作員控制。

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

參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。

## 會話目標解析

大多數 `/acp` 動作都接受一個可選的會話目標（`session-key`、`session-id` 或 `session-label`）。

解析順序：

1. 明確的目標引數（或針對 `/acp steer` 的 `--session`）
   - tries 鍵
   - 然後是 UUID 形式的會話 ID
   - 然後是標籤
2. 目前執行緒綁定（如果此對話/執行緒已綁定到 ACP 會話）
3. 目前請求者會話後備

如果沒有解析到目標，OpenClaw 會傳回一個明確的錯誤（`Unable to resolve session target: ...`）。

## 產生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `auto` | 在作用中的執行緒中：綁定該執行緒。在執行緒外：若支援則建立/綁定子執行緒。 |
| `here` | 需要目前作用中的執行緒；如果不在執行緒中則會失敗。                        |
| `off`  | 無綁定。會話啟動時不綁定。                                                |

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

`/acp status` 會顯示有效的執行時期選項，並且在可用時顯示執行時期層級和後端層級的會話識別碼。

某些控制項取決於後端的功能。如果後端不支援某個控制項，OpenClaw 會傳回一個明確的不支援控制項錯誤。

## ACP 指令指南

| 指令                 | 作用                                     | 範例                                                           |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 會話；可選的執行緒綁定。        | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目標工作階段的進行中輪次。           | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 傳送引導指令給正在執行的工作階段。       | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 關閉工作階段並取消綁定執行緒目標。       | `/acp close`                                                   |
| `/acp status`        | 顯示後端、模式、狀態、執行時選項、功能。 | `/acp status`                                                  |
| `/acp set-mode`      | 設定目標工作階段的執行時模式。           | `/acp set-mode plan`                                           |
| `/acp set`           | 通用執行時組態選項寫入。                 | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 設定執行時工作目錄覆寫。                 | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 設定審核策略設定檔。                     | `/acp permissions strict`                                      |
| `/acp timeout`       | 設定執行時逾時（秒）。                   | `/acp timeout 120`                                             |
| `/acp model`         | 設定執行時模型覆寫。                     | `/acp model anthropic/claude-opus-4-6`                         |
| `/acp reset-options` | 移除工作階段執行時選項覆寫。             | `/acp reset-options`                                           |
| `/acp sessions`      | 從儲存區列出最近的 ACP 工作階段。        | `/acp sessions`                                                |
| `/acp doctor`        | 後端健康狀態、功能、可行的修復方法。     | `/acp doctor`                                                  |
| `/acp install`       | 列印確定性安裝和啟用步驟。               | `/acp install`                                                 |

`/acp sessions` 會讀取目前綁定或請求者工作階段的儲存區。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道工作階段探索來解析目標，包括自訂的每個代理程式 `session.store` 根目錄。

## 執行時選項對應

`/acp` 具有便利指令和通用設定器。

對等操作：

- `/acp model <id>` 對應到執行時組態鍵 `model`。
- `/acp permissions <profile>` 對應執行時配置鍵 `approval_policy`。
- `/acp timeout <seconds>` 對應執行時配置鍵 `timeout`。
- `/acp cwd <path>` 直接更新執行時 cwd 覆蓋。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd 覆蓋路徑。
- `/acp reset-options` 清除目標會話的所有執行時覆蓋。

## acpx harness 支援 (目前)

目前的 acpx 內建 harness 別名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 配置定義了自訂代理別名，否則請優先對 `agentId` 使用這些值。

直接使用 acpx CLI 也可以透過 `--agent <command>` 指向任意適配器，但這種原始的應急出口是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路徑）。

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

綁定執行緒配置因頻道適配器而異。Discord 範例：

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

如果綁定執行緒的 ACP 生成無法運作，請先驗證適配器功能標誌：

- Discord： `channels.discord.threadBindings.spawnAcpSessions=true`

請參閱 [配置參考](/zh-Hant/gateway/configuration-reference)。

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

### acpx 指令和版本配置

預設情況下，acpx 外掛程式（發布為 `@openclaw/acpx`）使用外掛程式本地的固定二進位檔案：

1. 指令預設為 `extensions/acpx/node_modules/.bin/acpx`。
2. 預期版本預設為擴充功能的固定版本。
3. 啟動時立即將 ACP 後端註冊為未就緒。
4. 背景確保工作會驗證 `acpx --version`。
5. 如果外掛程式本地二進位檔案遺失或不匹配，它會執行：
   `npm install --omit=dev --no-save acpx@<pinned>` 並重新驗證。

您可以在外掛程式配置中覆蓋指令/版本：

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
- 相對路徑從 OpenClaw 工作區目錄解析。
- `expectedVersion: "any"` 會停用嚴格版本比對。
- 當 `command` 指向自訂二進位檔/路徑時，外掛程式本機自動安裝會停用。
- 在執行後端健康狀態檢查時，OpenClaw 啟動仍維持非阻斷式。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

## 權限設定

ACP 會話以非互動方式執行 — 沒有 TTY 可核准或拒絕檔案寫入和 shell 執行權限提示。acpx 外掛程式提供兩個控制權限處理方式的設定鍵：

### `permissionMode`

控制程式代理程式可在無需提示的情況下執行哪些操作。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動核准所有檔案寫入和 shell 指令。  |
| `approve-reads` | 僅自動核准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當應顯示權限提示但無互動式 TTY 可用時 (這是 ACP 會話的常態) 會發生什麼情況。

| 值     | 行為                                           |
| ------ | ---------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會話。 **(預設值)** |
| `deny` | 以無訊息方式拒絕權限並繼續 (優雅降級)。        |

### 設定

透過外掛程式設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後請重新啟動閘道。

> **重要：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 會話中，任何觸發權限提示的寫入或執行操作都可能因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便會話優雅降級而非當機。

## 疑難排解

| 症狀                                                                     | 可能原因                                                       | 修正方法                                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 後端外掛程式遺失或已停用。                                     | 安裝並啟用後端外掛程式，然後執行 `/acp doctor`。                                                                                               |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 已停用來自一般執行緒訊息的派送。                               | 設定 `acp.dispatch.enabled=true`。                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                              | 代理程式不在允許清單中。                                       | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                              |
| `Unable to resolve session target: ...`                                  | 金鑰/ID/標籤符記無效。                                         | 執行 `/acp sessions`，複製確切的金鑰/標籤，然後重試。                                                                                          |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` 在執行緒語境外使用。                           | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                   |
| `Only <user-id> can rebind this thread.`                                 | 執行緒綁定歸另一個使用者所有。                                 | 以擁有者身分重新綁定，或使用不同的執行緒。                                                                                                     |
| `Thread bindings are unavailable for <channel>.`                         | 配接器缺乏執行緒綁定能力。                                     | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                  |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 執行時位於主機端；要求者工作階段已沙盒化。                 | 從沙盒化工作階段使用 `runtime="subagent"`，或從非沙盒化工作階段執行 ACP 衍生程序。                                                             |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | 為 ACP 執行時請求了 `sandbox="require"`。                      | 使用 `runtime="subagent"` 進行必要的沙盒化，或從非沙盒化工作階段搭配 `sandbox="inherit"` 使用 ACP。                                            |
| 綁定工作階段遺失 ACP 中繼資料                                            | ACP 工作階段中繼資料已過期或已刪除。                           | 使用 `/acp spawn` 重新建立，然後重新綁定/聚焦執行緒。                                                                                          |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 封鎖在非互動式 ACP 工作階段中進行寫入/執行。  | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱 [權限設定](#permission-configuration)。            |
| ACP 工作階段提早失敗且輸出甚少                                           | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 檢查閘道紀錄中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要正常降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 工作階段在完成工作後無限期停滯                                       | 線程處理程序已結束，但 ACP 工作階段未回報完成。                | 使用 `ps aux \| grep acpx` 進行監控；手動終結過時的程序。                                                                                      |

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
