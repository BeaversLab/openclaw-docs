---
summary: "使用 ACP 執行階段會話用於 Pi、Claude Code、Codex、OpenCode、Gemini CLI 及其他 harness 代理程式"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理程式"
---

# ACP 代理程式

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 會話讓 OpenClaw 透過 ACP 後端外掛程式執行外部編碼 harness（例如 Pi、Claude Code、Codex、OpenCode 和 Gemini CLI）。

如果您以自然語言要求 OpenClaw「在 Codex 中執行此操作」或「在執行緒中啟動 Claude Code」，OpenClaw 應將該請求路由至 ACP 執行階段（而非原生子代理程式執行階段）。

## 快速操作員流程

當您需要一份實用的 `/acp` runbook 時使用：

1. 生成一個會話：
   - `/acp spawn codex --mode persistent --thread auto`
2. 在綁定的執行緒中運作（或明確指定該會話金鑰作為目標）。
3. 檢查執行階段狀態：
   - `/acp status`
4. 視需要調整執行階段選項：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 觸發作用中的會話但不取代上下文：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel` (停止目前輪次)，或
   - `/acp close` (關閉會話 + 移除綁定)

## 人員快速入門

自然請求範例：

- 「在此處的執行緒中啟動一個持久的 Codex 會話並保持其專注。」
- 「將此作為一次性 Claude Code ACP 會話執行並總結結果。」
- 「在此執行緒中針對此任務使用 Gemini CLI，然後將後續追蹤保留在同一執行緒中。」

OpenClaw 應採取的動作：

1. 選擇 `runtime: "acp"`。
2. 解析請求的 harness 目標 (`agentId`，例如 `codex`)。
3. 如果請求執行緒綁定且目前頻道支援，則將 ACP 會話綁定至該執行緒。
4. 將後續的執行緒訊息路由至同一個 ACP 會話，直到失去焦點/關閉/過期為止。

## ACP 與子代理程式

當您需要外部 harness 執行階段時使用 ACP。當您需要 OpenClaw 原生委派執行時使用子代理程式。

| 領域     | ACP 會話                                 | 子代理程式執行                    |
| -------- | ---------------------------------------- | --------------------------------- |
| 執行階段 | ACP 後端外掛程式 (例如 acpx)             | OpenClaw 原生子代理程式執行階段   |
| 會話金鑰 | `agent:<agentId>:acp:<uuid>`             | `agent:<agentId>:subagent:<uuid>` |
| 主要指令 | `/acp ...`                               | `/subagents ...`                  |
| 生成工具 | 帶有 `runtime:"acp"` 的 `sessions_spawn` | `sessions_spawn`（預設運行時）    |

另請參閱[子代理 (Sub-agents)](/en/tools/subagents)。

## 執行緒綁定會話（與通道無關）

當為通道介面卡啟用執行緒綁定時，ACP 會話可以綁定到執行緒：

- OpenClaw 將執行緒綁定到目標 ACP 會話。
- 該執行緒中的後續訊息將路由到綁定的 ACP 會話。
- ACP 輸出將傳回同一個執行緒。
- 取消焦點/關閉/封存/閒置超時或最大期限到期將移除綁定。

執行緒綁定支援取決於介面卡。如果活動的通道介面卡不支援執行緒綁定，OpenClaw 將返回明確的不支援/不可用訊息。

執行緒綁定 ACP 所需的功能標誌：

- `acp.enabled=true`
- `acp.dispatch.enabled` 預設為開啟（設定 `false` 以暫停 ACP 分發）
- 通道介面卡 ACP 執行緒生成標誌已啟用（特定於介面卡）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的通道

- 任何公開會話/執行緒綁定功能的通道介面卡。
- 目前的內建支援：
  - Discord 執行緒/通道
  - Telegram 主題（群組/超級群組中的論壇主題和 DM 主題）
- 外掛通道可以透過相同的綁定介面新增支援。

## 通道特定設定

對於非暫時性工作流程，請在頂層 `bindings[]` 項目中設定持久化 ACP 綁定。

### 綁定模型

- `bindings[].type="acp"` 標記持久化的 ACP 對話綁定。
- `bindings[].match` 識別目標對話：
  - Discord 通道或執行緒：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是擁有的 OpenClaw 代理 ID。
- 可選的 ACP 覆蓋位於 `bindings[].acp` 下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每個代理的執行時預設值

使用 `agents.list[].runtime` 為每個代理定義一次 ACP 預設值：

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

- OpenClaw 會確保設定的 ACP 會話在使用前已存在。
- 該頻道或主題中的訊息會路由到設定的 ACP 會話。
- 在綁定的對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 會話金鑰。
- 暫時的執行時綁定 (例如由執行緒焦點流程建立的) 在存在的地方仍然適用。

## 啟動 ACP 會話 (介面)

### 從 `sessions_spawn`

使用 `runtime: "acp"` 從代理轉場或工具呼叫啟動 ACP 會話。

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
- 如果省略了 `agentId`，OpenClaw 會在已設定時使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 來保持持久的綁定對話。

介面詳細資訊：

- `task` (必填)：傳送到 ACP 會話的初始提示詞。
- `runtime` (ACP 必填)：必須是 `"acp"`。
- `agentId` (選用)：ACP 目標 harness id。如果已設定，則回退到 `acp.defaultAgent`。
- `thread` (選用，預設為 `false`)：在支援的地方請求執行緒綁定流程。
- `mode` (選用)：`run` (一次性) 或 `session` (持久)。
  - 預設為 `run`
  - 如果省略了 `thread: true` 和模式，OpenClaw 可能會根據執行路徑預設為持久性行為
  - `mode: "session"` 需要 `thread: true`
- `cwd` (選用)：請求的執行時工作目錄（由後端/執行時原則驗證）。
- `label` (選用)：用於會話/橫幅文字的操作員面對標籤。
- `resumeSessionId` (選用)：恢復現有的 ACP 會話而不是建立新的。代理會透過 `session/load` 重放其對話歷史。需要 `runtime: "acp"`。
- `streamTo` (選用)：`"parent"` 將初始 ACP 執行進度摘要作為系統事件串流回傳給請求者會話。
  - 如果可用，接受的回應包含 `streamLogPath`，指向會話範圍的 JSONL 記錄檔 (`<sessionId>.acp-stream.jsonl`)，您可以追蹤以取得完整的轉送歷史。

### 恢復現有會話

使用 `resumeSessionId` 來繼續之前的 ACP 會話，而不是重新開始。代理會透過 `session/load` 重放其對話歷史，因此它會掌握之前的完整背景。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 會話從您的筆記型電腦轉移到您的手機 —— 告訴您的代理接續您之前的工作
- 繼續您在 CLI 中以互動方式開始的程式設計會話，現在透過您的代理以無頭模式進行
- 接續因閘道重新啟動或閒置逾時而中斷的工作

備註：

- `resumeSessionId` 需要 `runtime: "acp"` —— 如果與子代理執行時一起使用，會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 會話，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理必須支援 `session/load` (Codex 和 Claude Code 支援)。
- 如果找不到會話 ID，產生過程會失敗並顯示明確的錯誤 —— 不會無聲地回退到新會話。

### 操作員冒煙測試

在網關部署後使用此功能，當您想要快速進行實時檢查以確認 ACP 生成
是否確實端到端運作，而不僅僅是通過單元測試時。

建議的檢查點：

1. 驗證目標主機上部署的網關版本/提交。
2. 確認部署的來源包含 ACP 血緣驗收於
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中。
3. 開啟一個臨時的 ACPX 橋接會話至即時代理程式（例如
   `razor(main)` 於 `jpclawhq`）。
4. 要求該代理程式使用以下參數呼叫 `sessions_spawn`：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證代理程式回報：
   - `accepted=yes`
   - 一個真實的 `childSessionKey`
   - 無驗證器錯誤
6. 清理臨時 ACPX 橋接會話。

傳送給即時代理程式的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 除非您刻意測試
  執行緒綁定的持久 ACP 會話，否則請將此冒煙測試保持在 `mode: "run"` 上。
- 基本檢查點不需要 `streamTo: "parent"`。該路徑取決於
  請求者/會話能力，且屬於單獨的整合檢查。
- 將執行緒綁定 `mode: "session"` 測試視為來自真實 Discord 執行緒或 Telegram 主題的
  第二次、更豐富的整合通過測試。

## 沙盒相容性

ACP 會話目前運行於主機運行時，而非 OpenClaw 沙盒內部。

目前的限制：

- 如果請求者會話在沙盒中，ACP 生成將對 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 都被阻擋。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要強制沙盒執行時，請使用 `runtime: "subagent"`。

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

請參閱 [斜線指令](/en/tools/slash-commands)。

## 工作階段目標解析

大多數 `/acp` 動作接受一個可選的工作階段目標 (`session-key`、`session-id` 或 `session-label`)。

解析順序：

1. 明確的目標參數 (或針對 `/acp steer` 的 `--session`)
   - 接著是 tries 鍵
   - 接著是 UUID 格式的工作階段 ID
   - 接著是標籤
2. 目前的執行緒綁定 (如果此對話/執行緒已綁定至 ACP 工作階段)
3. 目前請求者工作階段後備

如果未解析到任何目標，OpenClaw 會傳回一個明確的錯誤 (`Unable to resolve session target: ...`)。

## 產生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                    |
| ------ | ----------------------------------------------------------------------- |
| `auto` | 在作用中執行緒內：綁定該執行緒。在執行緒外：若支援則建立/綁定子執行緒。 |
| `here` | 需要目前作用中的執行緒；若沒有則失敗。                                  |
| `off`  | 無綁定。工作階段以未綁定狀態啟動。                                      |

備註：

- 在非執行緒綁定的介面上，預設行為實際上為 `off`。
- 執行緒綁定產生需要通道策略支援：
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

`/acp status` 會顯示有效的執行時期選項，並在可用時顯示執行時期層級與後端層級的工作階段識別碼。

某些控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回一個明確的不支援控制項錯誤。

## ACP 指令範例

| 指令                 | 作用                                     | 範例                                                           |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 工作階段；可選擇性綁定執行緒。  | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目標會話的進行中輪次。               | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 向運行中的會話發送導向指令。             | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 關閉會話並解除綁定執行緒目標。           | `/acp close`                                                   |
| `/acp status`        | 顯示後端、模式、狀態、運行時選項、功能。 | `/acp status`                                                  |
| `/acp set-mode`      | 設定目標會話的運行時模式。               | `/acp set-mode plan`                                           |
| `/acp set`           | 通用運行時配置選項寫入。                 | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 設定運行時工作目錄覆蓋。                 | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 設定審核策略設定檔。                     | `/acp permissions strict`                                      |
| `/acp timeout`       | 設定運行時逾時（秒）。                   | `/acp timeout 120`                                             |
| `/acp model`         | 設定運行時模型覆蓋。                     | `/acp model anthropic/claude-opus-4-6`                         |
| `/acp reset-options` | 移除會話運行時選項覆蓋。                 | `/acp reset-options`                                           |
| `/acp sessions`      | 列出存放區中最近的 ACP 會話。            | `/acp sessions`                                                |
| `/acp doctor`        | 後端健康狀況、功能、可執行的修復措施。   | `/acp doctor`                                                  |
| `/acp install`       | 列印確定性的安裝和啟用步驟。             | `/acp install`                                                 |

`/acp sessions` 讀取目前綁定或請求者會話的存放區。接受 `session-key`、`session-id` 或 `session-label` 標記的指令會透過閘道會話探索解析目標，包括每個代理程式的自訂 `session.store` 根目錄。

## 運行時選項對應

`/acp` 具有便利指令和通用設定器。

等效操作：

- `/acp model <id>` 對應至運行時配置鍵 `model`。
- `/acp permissions <profile>` 對應到執行時期設定鍵 `approval_policy`。
- `/acp timeout <seconds>` 對應到執行時期設定鍵 `timeout`。
- `/acp cwd <path>` 直接更新執行時期 cwd 覆蓋值。
- `/acp set <key> <value>` 是通用路徑。
  - 特例：`key=cwd` 使用 cwd 覆蓋路徑。
- `/acp reset-options` 清除目標工作階段的所有執行時期覆蓋值。

## acpx harness 支援（目前）

目前 acpx 內建 harness 別名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 設定定義了自訂 agent 別名，否則建議優先使用這些值作為 `agentId`。

直接使用 acpx CLI 也可以透過 `--agent <command>` 指定任意轉接器，但該原始轉義方法是 acpx CLI 的功能（並非正常的 OpenClaw `agentId` 路徑）。

## 必要設定

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

執行緒綁定設定取決於頻道轉接器。Discord 範例：

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

如果執行緒綁定 ACP 生成無法運作，請先驗證轉接器功能旗標：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

請參閱 [Configuration Reference](/en/gateway/configuration-reference)。

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

預設情況下，內建的 acpx 後端外掛程式 (`acpx`) 會使用外掛程式本機釘選的二進位檔：

1. 指令預設為 `extensions/acpx/node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的釘選版本。
3. 啟動時會立即將 ACP 後端註冊為未就緒。
4. 背景確保工作會驗證 `acpx --version`。
5. 如果外掛程式本機二進位檔遺失或版本不符，它會執行：
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

註記：

- `command` 接受絕對路徑、相對路徑或指令名稱 (`acpx`)。
- 相對路徑從 OpenClaw 工作區目錄解析。
- `expectedVersion: "any"` 停用嚴格版本比對。
- 當 `command` 指向自訂的二進位檔/路徑時，外掛本地自動安裝會停用。
- 當後端健康檢查執行時，OpenClaw 啟動保持非阻斷。

請參閱 [Plugins](/en/tools/plugin)。

## 權限設定

ACP 會話以非互動方式執行 — 沒有 TTY 可用來批准或拒絕檔案寫入和 Shell 執行權限提示。acpx 外掛提供兩個設定鍵來控制權限的處理方式：

### `permissionMode`

控制駕馭代理程式可以執行哪些操作而無需提示。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 Shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當應顯示權限提示但無互動式 TTY 可用時（ACP 會話屬於這種情況）會發生什麼情況。

| 值     | 行為                                            |
| ------ | ----------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止會話。**（預設值）** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。                |

### 設定

透過外掛設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後請重新啟動閘道。

> **重要：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 會話中，任何觸發權限提示的寫入或執行都可能因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 如果您需要限制權限，請將 `nonInteractivePermissions` 設定為 `deny`，以便會話優雅降級而不是當機。

## 疑難排解

| 症狀                                                                     | 可能原因                                                       | 修正方法                                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 後端外掛遺失或已停用。                                         | 安裝並啟用後端外掛，然後執行 `/acp doctor`。                                                                                                   |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 已停用從一般執行緒訊息進行分派。                               | 設定 `acp.dispatch.enabled=true`。                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                              | Agent 不在允許清單中。                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                              |
| `Unable to resolve session target: ...`                                  | 無效的 key/id/label 權杖。                                     | 執行 `/acp sessions`，複製確切的 key/label，然後重試。                                                                                         |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` 用於執行緒上下文之外。                         | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                   |
| `Only <user-id> can rebind this thread.`                                 | 另一個使用者擁有執行緒繫結。                                   | 以擁有者身分重新繫結，或使用不同的執行緒。                                                                                                     |
| `Thread bindings are unavailable for <channel>.`                         | 配接器缺乏執行緒繫結功能。                                     | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                  |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 運行時位於主機端；請求者工作階段已沙箱化。                 | 從沙箱化工作階段使用 `runtime="subagent"`，或從非沙箱化工作階段執行 ACP 產生。                                                                 |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | ACP 運行時請求了 `sandbox="require"`。                         | 使用 `runtime="subagent"` 進行所需的沙箱化，或從非沙箱化工作階段使用具有 `sandbox="inherit"` 的 ACP。                                          |
| 繫結的工作階段缺少 ACP 中繼資料                                          | 過時/已刪除的 ACP 工作階段中繼資料。                           | 使用 `/acp spawn` 重新建立，然後重新繫結/聚焦執行緒。                                                                                          |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 封鎖非互動式 ACP 工作階段中的寫入/執行。      | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動閘道。請參閱[權限設定](#permission-configuration)。             |
| ACP 工作階段提早失敗且輸出甚少                                           | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 檢查閘道記錄中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。 |
| ACP 工作階段在完成工作後無限期停滯                                       | Arness 處理程序已完成，但 ACP 工作階段未回報完成。             | 使用 `ps aux \| grep acpx` 進行監控；手動終止過舊的程序。                                                                                      |
