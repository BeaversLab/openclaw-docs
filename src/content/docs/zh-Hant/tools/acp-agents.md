---
summary: "針對 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 及其他工具代理程式使用 ACP 執行階段工作階段"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Debugging ACP completion delivery or agent-to-agent loops
  - Operating /acp commands from chat
title: "ACP Agents"
---

# ACP 代理程式

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 工作階段讓 OpenClaw 透過 ACP 後端外掛程式執行外部編碼工具（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 及其他支援的 ACPX 工具）。

如果您以純文字語言要求 OpenClaw「在 Codex 中執行此動作」或「在執行緒中啟動 Claude Code」，OpenClaw 應將該請求路由至 ACP 執行階段（而非原生子代理程式執行階段）。每個 ACP 工作階段的產生都會被追蹤為 [背景任務](/zh-Hant/automation/tasks)。

如果您希望 Codex 或 Claude Code 以外部 MCP 用戶端身分直接
連線至現有的 OpenClaw 頻道對話，請使用 [`openclaw mcp serve`](/zh-Hant/cli/mcp)
而非 ACP。

## 我需要哪個頁面？

有三個相近的介面容易混淆：

| 您想要……                                                         | 使用此項                                 | 備註                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 透過 OpenClaw 執行 Codex、Claude Code、Gemini CLI 或其他外部套接 | 本頁面：ACP 代理程式                     | 聊天綁定的工作階段、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、背景任務、執行階段控制項 |
| 將 OpenClaw Gateway 會話公開為編輯器或用戶端的 ACP 伺服器        | [`openclaw acp`](/zh-Hant/cli/acp)            | 橋接模式。IDE/用戶端透過 stdio/WebSocket 以 ACP 協定與 OpenClaw 通訊                             |
| 重複使用本地 AI CLI 作為純文字後備模型                           | [CLI Backends](/zh-Hant/gateway/cli-backends) | 非 ACP。無 OpenClaw 工具、無 ACP 控制、無工具運行時                                              |

## 這是否開箱即用？

通常是的。

- 全新安裝現在隨附內建的 `acpx` 執行階段外掛程式，且預設為啟用狀態。
- 內建的 `acpx` 外掛程式偏好使用其外掛程式本機釘選的 `acpx` 二進位檔。
- 啟動時，OpenClaw 會探測該二進位文件並在需要時自行修復。
- 如果您想要快速的就緒檢查，請從 `/acp doctor` 開始。

首次使用時可能會發生的情況：

- 目標工具介接器可能會在您首次使用該工具時，透過 `npx` 按需求擷取。
- 該工具的供應商驗證仍然必須存在於主機上。
- 如果主機沒有 npm/網絡存取權限，首次運行的適配器獲取可能會失敗，直到快取被預熱或以其他方式安裝適配器。

範例：

- `/acp spawn codex`：OpenClaw 應已準備好啟動 `acpx`，但 Codex ACP 介接器可能仍需要首次執行的擷取動作。
- `/acp spawn claude`：Claude ACP 介接器的情況相同，加上該主機上的 Claude 端驗證。

## 快速操作員流程

當您需要實用的 `/acp` 操作手冊時，請使用此選項：

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
   - `/acp cancel` (停止當前輪次)，或
   - `/acp close` (關閉工作階段 + 移除綁定)

## 人類快速入門

自然請求的範例：

- 「將此 Discord 頻道綁定至 Codex。」
- 「在此處的串列中啟動持續的 Codex 工作階段並保持其焦點。」
- 「將此作為一次性 Claude Code ACP 工作階段執行並總結結果。」
- 「將此 iMessage 聊天綁定至 Codex，並將後續追蹤保留在相同的工作區中。」
- 「在此工作的串列中使用 Gemini CLI，然後在同一串列中保留後續追蹤。」

OpenClaw 應該做的事：

1. 選擇 `runtime: "acp"`。
2. 解析請求的 harness 目標 (`agentId`，例如 `codex`)。
3. 如果請求了當前對話綁定且使用中頻道支援，則將 ACP 工作階段綁定至該對話。
4. 否則，如果請求了串列綁定且目前頻道支援，則將 ACP 工作階段綁定至該串列。
5. 將後續的綁定訊息路由至同一個 ACP 工作階段，直到失去焦點/關閉/過期為止。

## ACP 與子代理程式

當您需要外部駕馭執行時時，請使用 ACP。當您需要 OpenClaw 原生委派執行時，請使用子代理程式。

| 領域         | ACP 工作階段                          | 子代理程式執行                    |
| ------------ | ------------------------------------- | --------------------------------- |
| 執行時       | ACP 後端外掛程式（例如 acpx）         | OpenClaw 原生子代理程式執行時     |
| 工作階段金鑰 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要指令     | `/acp ...`                            | `/subagents ...`                  |
| Spawn 工具   | `sessions_spawn` 使用 `runtime:"acp"` | `sessions_spawn` (預設運行時)     |

另請參閱 [Sub-agents](/zh-Hant/tools/subagents)。

## ACP 如何執行 Claude Code

透過 ACP 執行 Claude Code 時，技術堆疊為：

1. OpenClaw ACP 工作階段控制平面
2. 內建 `acpx` 運行時外掛程式
3. Claude ACP 配接器
4. Claude 端的執行環境/工作階段機制

重要區別：

- ACP Claude 是一個具備 ACP 控制功能、工作階段恢復、背景任務追蹤及選擇性對話/執行緒綁定的工具工作階段。
- CLI 後端是獨立的純文字本機備援運行時。請參閱 [CLI Backends](/zh-Hant/gateway/cli-backends)。

對於操作員來說，實用規則如下：

- 如果您需要 `/acp spawn`、可綁定的工作階段、運行時控制或持久 harness 工作：請使用 ACP
- 想要透過原始 CLI 進行簡單的本地文字備援：使用 CLI 後端

## 綁定工作階段

### 目前對話綁定

當您希望當前對話成為持久的 ACP 工作區而不建立子執行緒時，請使用 `/acp spawn <harness> --bind here`。

行為：

- OpenClaw 仍擁有通道傳輸、驗證、安全和傳遞的所有權。
- 目前的對話會固定至產生的 ACP 工作階段金鑰。
- 該對話中的後續訊息會路由至同一個 ACP 工作階段。
- `/new` 和 `/reset` 會就地重設相同的綁定 ACP 工作階段。
- `/acp close` 會關閉工作階段並移除當前對話的綁定。

實際應用上的意義：

- `--bind here` 會保持相同的聊天介面。在 Discord 上，目前頻道會保持不變。
- 如果您正在產生新的工作，`--bind here` 仍然可以建立新的 ACP 工作階段。該綁定會將該工作階段附加到當前對話。
- `--bind here` 本身不會建立子 Discord 執行緒或 Telegram 主題。
- ACP 運行時仍然可以有自己的工作目錄 (`cwd`) 或後端管理的磁碟工作區。該運行時工作區與聊天介面分開，並不意味著新的訊息執行緒。
- 如果您衍生到不同的 ACP 代理程式且未傳遞 `--cwd`，OpenClaw 預設會繼承 **目標代理程式的** 工作區，而非請求者的工作區。
- 如果該繼承的工作區路徑遺失（`ENOENT`/`ENOTDIR`），OpenClaw 會回退到後端預設 cwd，而不是無聲地重用錯誤的樹狀結構。
- 如果繼承的工作區存在但無法存取（例如 `EACCES`），spawn 會回傳真正的存取錯誤，而不是丟棄 `cwd`。

心智模型：

- 聊天介面：人們持續交談的地方（`Discord channel`、`Telegram topic`、`iMessage chat`）
- ACP session：OpenClaw 路由至的持久化 Codex/Claude/Gemini 執行階段狀態
- 子執行緒/主題：僅由 `--thread ...` 建立的選用額外訊息介面
- 執行時期工作區：駕馭運作的檔案系統位置（`cwd`、repo checkout、後端工作區）

範例：

- `/acp spawn codex --bind here`：保留此聊天，產生或附加 Codex ACP 工作階段，並將此處的未來訊息路由至該處
- `/acp spawn codex --thread auto`：OpenClaw 可能會建立一個子執行緒/主題並將 ACP 工作階段綁定到那裡
- `/acp spawn codex --bind here --cwd /workspace/repo`：與上述相同的聊天綁定，但 Codex 在 `/workspace/repo` 中執行

目前對話繫結支援：

- 廣告支援目前對話綁定的聊天/訊息頻道可以透過共享的對話綁定路徑使用 `--bind here`。
- 具有自訂執行緒/主語意的頻道，仍可在相同的共享介面後面提供頻道特定的正規化處理。
- `--bind here` 總是表示「原地綁定目前對話」。
- 一般的目前對話繫結使用共享的 OpenClaw 繫結存放區，並能在正常的閘道重新啟動後存續。

備註：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上是互斥的。
- 在 Discord 上，`--bind here` 會原地綁定目前的頻道或執行緒。僅當 OpenClaw 需要為 `--thread auto|here` 建立子執行緒時，才需要 `spawnAcpSessions`。
- 如果目前使用的頻道未公開目前對話的 ACP 綁定，OpenClaw 會傳回明確的不支援訊息。
- `resume` 和「新工作階段」問題是 ACP 工作階段問題，而非頻道問題。您可以重複使用或取代執行時期狀態，而無需變更目前的聊天介面。

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
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支援執行緒的頻道

- 任何公開工作階段/執行緒綁定功能的頻道配接器。
- 目前的內建支援：
  - Discord 執行緒/頻道
  - Telegram 主題（群組/超級群組中的論壇主題和 DM 主題）
- 外掛程式頻道可以透過相同的綁定介面新增支援。

## 頻道特定設定

對於非短暫的工作流程，請在頂層 `bindings[]` 條目中設定持久的 ACP 繫結。

### 綁定模型

- `bindings[].type="acp"` 標記持久的 ACP 對話繫結。
- `bindings[].match` 識別目標對話：
  - Discord 頻道或執行緒：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 論壇主題：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles DM/群組聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    建議使用 `chat_id:*` 或 `chat_identifier:*` 以進行穩定的群組繫結。
  - iMessage DM/群組聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    建議使用 `chat_id:*` 以進行穩定的群組繫結。
- `bindings[].agentId` 是擁有的 OpenClaw 代理程式 ID。
- 選用的 ACP 覆寫值位於 `bindings[].acp` 之下：
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
- 在繫結的對話中，`/new` 和 `/reset` 會就地重設相同的 ACP 工作階段金鑰。
- 暫時的執行時期綁定 (例如由執行緒焦點流程建立的) 在存在時仍然適用。
- 對於沒有明確指定 `cwd` 的跨代理程式 ACP 產生，OpenClaw 會從代理程式設定繼承目標代理程式工作區。
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

- `runtime` 預設為 `subagent`，因此請為 ACP 工作階段明確設定 `runtime: "acp"`。
- 如果省略了 `agentId`，OpenClaw 會在配置時使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 來維持持久化的綁定對話。

介面詳情：

- `task` (必要)：發送到 ACP 會話的初始提示詞。
- `runtime` (ACP 必要)：必須為 `"acp"`。
- `agentId` (可選)：ACP 目標受駟 ID。如果已設定，則回退至 `acp.defaultAgent`。
- `thread` (可選，預設為 `false`)：請求執行緒綁定流程（如果支援）。
- `mode` (可選)：`run` (單次) 或 `session` (持久化)。
  - 預設值為 `run`
  - 如果省略了 `thread: true` 和 mode，OpenClaw 可能會根據執行時路徑預設為持久化行為
  - `mode: "session"` 需要 `thread: true`
- `cwd` (可選)：請求的執行時工作目錄 (由後端/執行時策略驗證)。如果省略，配置後 ACP 生成會繼承目標代理工作區；缺少的繼承路徑會回退到後端預設值，而實際的存取錯誤會被傳回。
- `label` (可選)：用於會話/橫幅文字的面向操作員的標籤。
- `resumeSessionId` (可選)：恢復現有的 ACP 會話而不是建立新的。代理會透過 `session/load` 重放其對話歷史記錄。需要 `runtime: "acp"`。
- `streamTo` (可選)：`"parent"` 將初始 ACP 執行進度摘要作為系統事件串流回傳給請求者會話。
  - 當可用時，接受的回應包含指向會話範圍 JSONL 記錄 (`<sessionId>.acp-stream.jsonl`) 的 `streamLogPath`，您可以追蹤它以取得完整的轉送歷史記錄。
- `model` (可選)：針對 ACP 子工作階段的明確模型覆寫。對 `runtime: "acp"` 生效，因此子工作階段會使用請求的模型，而不是無聲回退到目標代理程式的預設值。

## 傳遞模型

ACP 工作階段可以是互動式工作區或父代擁有的背景工作。傳遞路徑取決於該形態。

### 互動式 ACP 工作階段

互動式工作階段旨在於可見的聊天介面上持續對話：

- `/acp spawn ... --bind here` 將目前對話綁定至 ACP 工作階段。
- `/acp spawn ... --thread ...` 將頻道執行緒/主題綁定至 ACP 工作階段。
- 持久設定的 `bindings[].type="acp"` 會將相符的對話路由至同一個 ACP 工作階段。

綁定對話中的後續訊息會直接路由至 ACP 工作階段，且 ACP 輸出會傳遞回同一個頻道/執行緒/主題。

### 父代擁有的單次 ACP 工作階段

由其他代理程式執行所產生的單次 ACP 工作階段是背景子程序，類似於子代理程式：

- 父代會使用 `sessions_spawn({ runtime: "acp", mode: "run" })` 請求工作。
- 子程式會在其自己的 ACP 驅動工作階段中執行。
- 完成結果會透過內部任務完成宣告路徑回報。
- 當需要面向使用者的回覆時，父代會以一般助理語氣改寫子程式結果。

請勿將此路徑視為父代與子程式之間的點對點聊天。子程式已經有傳回父代的完成管道。

### `sessions_send` 與 A2A 傳遞

`sessions_send` 可以在產生後以另一個工作階段為目標。對於一般對等工作階段，OpenClaw 會在插入訊息後使用代理程式對代理程式 (A2A) 的後續路徑：

- 等候目標工作階段的回覆
- 選擇性地讓請求者和目標交換有限數量的後續輪次
- 要求目標產生宣告訊息
- 將該宣告傳遞至可見的頻道或執行緒

該 A2A 路徑是對等傳送的備選方案，適用於發送者需要可見後續的情況。當不相關的工作階段可以查看並傳送訊息給 ACP 目標時，此路徑會保持啟用，例如在廣泛的 `tools.sessions.visibility` 設定下。

僅當請求者是其自身父代擁有的一次性 ACP 子代的父代時，OpenClow 才會跳過 A2A 後續操作。在這種情況下，在任務完成之上執行 A2A 可能會使用子代的結果喚醒父代，將父代的回覆轉發回子代，從而建立父/子回響循環。針對該擁有子代的情況，`sessions_send` 結果會回報 `delivery.status="skipped"`，因為完成路徑已負責該結果。

### 繼續現有工作階段

使用 `resumeSessionId` 來繼續先前的 ACP 工作階段，而不是重新開始。代理會透過 `session/load` 重播其對話歷史，因此它會獲得先前內容的完整脈絡。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常見使用案例：

- 將 Codex 工作階段從您的筆記型電腦移交到您的手機 — 告訴您的代理接續您之前留下的進度
- 繼續您在 CLI 中以互動方式開始的編碼工作階段，現在透過您的代理以無頭模式執行
- 接續因閘道重新啟動或閒置逾時而中斷的工作

備註：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果與子代理執行時一起使用會傳回錯誤。
- `resumeSessionId` 會還原上游 ACP 對話歷史；`thread` 和 `mode` 仍然正常套用於您正在建立的新 OpenClaw 工作階段，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目標代理必須支援 `session/load`（Codex 和 Claude Code 支援）。
- 如果找不到工作階段 ID，產生會失敗並出現明確錯誤 — 不會無聲回退到新工作階段。

### 操作員煙霧測試

在閘道部署後，當您想要快速檢查 ACP 產生是否
實際上端到端運作，而不只是通過單元測試時，請使用此方法。

建議的檢查點：

1. 驗證目標主機上已部署的閘道版本/提交。
2. 確認已部署的來源在
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中包含 ACP 世系接受。
3. 開啟到即時代理的暫時性 ACPX 橋接工作階段（例如
   `razor(main)` 上的 `jpclawhq`）。
4. 要求該代理呼叫 `sessions_spawn` 並搭配：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 驗證代理回報：
   - `accepted=yes`
   - 真實的 `childSessionKey`
   - 沒有驗證器錯誤
6. 清理暫時的 ACPX 橋接器會話。

給即時代理的提示範例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

備註：

- 請將此冒煙測試保持在 `mode: "run"` 上，除非您正在刻意測試
  執行緒綁定的持久 ACP 會話。
- 基礎閘道不需要 `streamTo: "parent"`。該路徑取決於
  請求者/會話功能，且為獨立的整合檢查。
- 將執行緒綁定 `mode: "session"` 測試視為來自真實 Discord 執行緒或 Telegram 主題的
  第二次、更豐富的整合通過。

## 沙盒相容性

ACP 會話目前運作於主機執行環境，而非在 OpenClaw 沙盒內部。

目前的限制：

- 如果請求者會話在沙盒內，ACP 生成將同時被 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 封鎖。
  - 錯誤：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` 搭配 `runtime: "acp"` 不支援 `sandbox: "require"`。
  - 錯誤：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

當您需要沙盒強制執行時，請使用 `runtime: "subagent"`。

### 來自 `/acp` 指令

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

請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

## 會話目標解析

大多數 `/acp` 動作接受可選的會話目標（`session-key`、`session-id` 或 `session-label`）。

解析順序：

1. 明確的目標引數（或 `--session` 針對 `/acp steer`）
   - 嘗試金鑰
   - 然後是 UUID 形式的會話 ID
   - 然後是標籤
2. 目前的執行緒綁定（如果此對話/執行緒已綁定至 ACP 會話）
3. 目前的請求者會話後備

目前對話綁定和執行緒綁定都會參與步驟 2。

如果沒有解析到目標，OpenClaw 會傳回清楚的錯誤 (`Unable to resolve session target: ...`)。

## 衍生綁定模式

`/acp spawn` 支援 `--bind here|off`。

| 模式   | 行為                                                   |
| ------ | ------------------------------------------------------ |
| `here` | 就地綁定目前作用中的對話；如果沒有作用中的對話則失敗。 |
| `off`  | 不要建立目前對話的綁定。                               |

註記：

- `--bind here` 是「讓此頻道或聊天以 Codex 為後盾」的最簡單操作員途徑。
- `--bind here` 不會建立子執行緒。
- `--bind here` 僅在揭露目前對話綁定支援的頻道上提供。
- `--bind` 和 `--thread` 不能在同一個 `/acp spawn` 呼叫中合併使用。

## 衍生執行緒模式

`/acp spawn` 支援 `--thread auto|here|off`。

| 模式   | 行為                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `auto` | 在作用中的執行緒中：綁定該執行緒。在執行緒外：若支援則建立/綁定子執行緒。 |
| `here` | 需要目前作用中的執行緒；如果未在執行緒中則失敗。                          |
| `off`  | 無綁定。工作階段以未綁定狀態啟動。                                        |

註記：

- 在非執行緒綁定介面上，預設行為實際上等同於 `off`。
- 執行緒綁定衍生需要頻道政策支援：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
- 當您想要固定目前的對話而不建立子執行緒時，請使用 `--bind here`。

## ACP 控制

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

`/acp status` 顯示有效的執行時期選項，以及（如果可用）執行時期層級和後端層級的工作階段識別碼。

某些控制項取決於後端功能。如果後端不支援某個控制項，OpenClaw 會傳回明確的「不支援控制項」錯誤。

## ACP 指令食譜

| 指令                 | 作用                                            | 範例                                                          |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 建立 ACP 工作階段；可選的目前繫結或執行緒繫結。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目標工作階段正在進行的輪次。                | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 將導向指令傳送至正在執行的工作階段。            | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 關閉工作階段並解除繫結執行緒目標。              | `/acp close`                                                  |
| `/acp status`        | 顯示後端、模式、狀態、執行時期選項、功能。      | `/acp status`                                                 |
| `/acp set-mode`      | 設定目標工作階段的執行時期模式。                | `/acp set-mode plan`                                          |
| `/acp set`           | 通用執行時期設定選項寫入。                      | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 設定執行時期工作目錄覆寫。                      | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 設定核准原則設定檔。                            | `/acp permissions strict`                                     |
| `/acp timeout`       | 設定執行時期逾時（秒）。                        | `/acp timeout 120`                                            |
| `/acp model`         | 設定執行時期模型覆寫。                          | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除工作階段執行時期選項覆寫。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 列出儲存庫中的近期 ACP 工作階段。               | `/acp sessions`                                               |
| `/acp doctor`        | 後端健康狀態、功能、可採取的修復措施。          | `/acp doctor`                                                 |
| `/acp install`       | 列印確定性安裝和啟用步驟。                      | `/acp install`                                                |

`/acp sessions` 讀取目前綁定或請求者的會話存放區。接受 `session-key`、`session-id` 或 `session-label` 權杖的指令會透過閘道會話探索來解析目標，包括自訂的個別代理程式 `session.store` 根目錄。

## 執行時期選項對應

`/acp` 具有便利指令和一個通用設定器。

對等操作：

- `/acp model <id>` 對應到執行時期設定金鑰 `model`。
- `/acp permissions <profile>` 對應到執行時期設定金鑰 `approval_policy`。
- `/acp timeout <seconds>` 對應到執行時期設定金鑰 `timeout`。
- `/acp cwd <path>` 直接更新執行時期 cwd 覆寫。
- `/acp set <key> <value>` 是通用路徑。
  - 特殊情況：`key=cwd` 使用 cwd 覆寫路徑。
- `/acp reset-options` 清除目標會話的所有執行時期覆寫。

## acpx 駕馭器支援（目前）

目前的 acpx 內建駕馭器別名：

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

當 OpenClaw 使用 acpx 後端時，除非您的 acpx 設定定義了自訂代理程式別名，否則請優先使用這些 `agentId` 的值。
如果您的本機 Cursor 安裝仍將 ACP 公開為 `agent acp`，請在您的 acpx 設定中覆寫 `cursor` 代理程式指令，而不是變更內建預設值。

直接的 acpx CLI 用法也可以透過 `--agent <command>` 以任意轉接器為目標，但該原始逃逸方法是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路徑）。

## 所需配置

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

執行緒綁定配置因通道適配器而異。Discord 範例：

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

如果執行緒綁定的 ACP 產生無法運作，請先驗證適配器功能旗標：

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

目前對話綁定不需要建立子執行緒。它們需要一個作用中的對語內文，以及一個公開 ACP 對話綁定的通道適配器。

請參閱 [Configuration Reference](/zh-Hant/gateway/configuration-reference)。

## acpx 後端的外掛程式設定

全新安裝預設會啟用隨附的 `acpx` 執行此外掛程式，因此 ACP
通常無需手動安裝外掛程式即可運作。

從以下開始：

```text
/acp doctor
```

如果您停用了 `acpx`、透過 `plugins.allow` / `plugins.deny` 拒絕了它，或是想要
切換到本機開發副本，請使用明確的外掛程式路徑：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

開發期間的本機工作區安裝：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然後驗證後端健全狀況：

```text
/acp doctor
```

### acpx 指令和版本配置

預設情況下，隨附的 acpx 後端外掛程式 (`acpx`) 使用外掛程式區域固定的二進位檔案：

1. 指令預設為 ACPX 外掛程式套件內的外掛程式區域 `node_modules/.bin/acpx`。
2. 預期的版本預設為擴充功能的固定版本。
3. 啟動時會立即將 ACP 後端註冊為未就緒。
4. 背景確保工作會驗證 `acpx --version`。
5. 如果外掛程式區域的二進位檔案遺失或不相符，它會執行：
   `npm install --omit=dev --no-save acpx@<pinned>` 並重新驗證。

您可以在外掛程式配置中覆寫指令/版本：

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
- 當 `command` 指向自訂二進位檔案/路徑時，外掛程式區域自動安裝會停用。
- 在後端健全狀況檢查執行時，OpenClaw 啟動保持非封鎖狀態。

請參閱 [Plugins](/zh-Hant/tools/plugin)。

### 自動依賴項安裝

當您使用 `npm install -g openclaw` 全局安裝 OpenClaw 時，acpx
運行時依賴項（特定於平台的二進製文件）會通過 postinstall 掛鈎自動
安裝。如果自動安裝失敗，網關仍會正常啟動並通過 `openclaw acp doctor` 報告缺失的依賴項。

### 外掛工具 MCP 橋接器

默認情況下，ACPX 會話**不會**將 OpenClaw 外掛註冊的工具暴露給
ACP 程式。

如果您希望 ACP 代理程式（例如 Codex 或 Claude Code）調用已安裝的
OpenClaw 外掛工具（例如記憶體回憶/存儲），請啟用專用橋接器：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用：

- 將名為 `openclaw-plugin-tools` 的內建 MCP 伺服器注入到 ACPX 會話
  引導過程中。
- 暴露由已安裝並啟用的 OpenClaw
  外掛註冊的外掛工具。
- 保持該功能為顯式選項且默認關閉。

安全與信任注意事項：

- 這會擴展 ACP 程式的工具表面。
- ACP 代理程式只能存取網關中已活躍的外掛工具。
- 請將此視為與讓這些外掛在
  OpenClaw 本身中執行相同的信任邊界。
- 啟用前請審查已安裝的外掛。

自訂 `mcpServers` 仍像以前一樣工作。內建的外掛工具橋接器是一個
額外的可選便利功能，而非通用 MCP 伺服器設置的替代品。

### OpenClaw 工具 MCP 橋接器

默認情況下，ACPX 會話也**不會**通過
MCP 暴露內建的 OpenClaw 工具。當 ACP 代理程式需要特定的
內建工具（例如 `cron`）時，請啟用獨立的 core-tools 橋接器：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

其作用：

- 將名為 `openclaw-tools` 的內建 MCP 伺服器注入到 ACPX 會話
  引導過程中。
- 暴露選定的內建 OpenClaw 工具。初始伺服器暴露 `cron`。
- 保持核心工具暴露為顯式選項且默認關閉。

### 運行時超時配置

隨附的 `acpx` 外掛將內建運行時的輪詢默認設定為 120 秒
超時。這為較慢的程式（如 Gemini CLI）提供了足夠的時間來完成
ACP 啟動和初始化。如果您的主機需要不同的
運行時限制，請覆蓋它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值後請重啟網關。

### 健康探測代理配置

內建的 `acpx` 外掛程式會探測一個駕駛程式代理程式，以判斷嵌入式執行階段後端是否已準備就緒。其預設值為 `codex`。若您的部署使用不同的預設 ACP 代理程式，請將探測代理程式設為相同的 id：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

變更此值後請重新啟動閘道。

## 權限設定

ACP 工作階段以非互動方式執行 — 沒有 TTY 可以批准或拒絕檔案寫入和 shell 執行的權限提示。acpx 外掛程式提供了兩個設定鍵來控制權限的處理方式：

這些 ACPX 駕駛程式權限與 OpenClaw exec 批准分開，也與 CLI 後端供應商略過旗標（例如 Claude CLI `--permission-mode bypassPermissions`）分開。ACPX `approve-all` 是 ACP 工作階段的駕駛程式層級緊急開關。

### `permissionMode`

控制駕駛程式代理程式可以在無需提示的情況下執行哪些作業。

| 值              | 行為                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自動批准所有檔案寫入和 shell 指令。  |
| `approve-reads` | 僅自動批准讀取；寫入和執行需要提示。 |
| `deny-all`      | 拒絕所有權限提示。                   |

### `nonInteractivePermissions`

控制當顯示權限提示但沒有可用的互動式 TTY 時會發生什麼情況（這是 ACP 工作階段的常態）。

| 值     | 行為                                             |
| ------ | ------------------------------------------------ |
| `fail` | 以 `AcpRuntimeError` 中止工作階段。 **（預設）** |
| `deny` | 靜默拒絕權限並繼續（優雅降級）。                 |

### 設定

透過外掛程式設定進行設定：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

變更這些值後請重新啟動閘道。

> **重要：** OpenClaw 目前預設為 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非互動式 ACP 工作階段中，任何觸發權限提示的寫入或執行都可能會因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失敗。
>
> 若您需要限制權限，請將 `nonInteractivePermissions` 設為 `deny`，讓工作階段優雅降級而非崩潰。

## 疑難排解

| 症狀                                                                        | 可能原因                                                       | 修正方法                                                                                                                                                |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 後端外掛程式遺失或已停用。                                     | 安裝並啟用後端插件，然後執行 `/acp doctor`。                                                                                                            |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全域停用。                                               | 設定 `acp.enabled=true`。                                                                                                                               |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已停用從一般執行緒訊息的派送。                                 | 設定 `acp.dispatch.enabled=true`。                                                                                                                      |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允許清單中。                                         | 使用允許的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                       |
| `Unable to resolve session target: ...`                                     | 錯誤的 key/id/label token。                                    | 執行 `/acp sessions`，複製確切的 key/label，然後重試。                                                                                                  |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` 在沒有可繫結的對話中使用了。                     | 移至目標聊天/頻道並重試，或使用未繫結的產生。                                                                                                           |
| `Conversation bindings are unavailable for <channel>.`                      | 配接器缺乏目前對話 ACP 繫結能力。                              | 在支援的情況下使用 `/acp spawn ... --thread ...`，設定頂層 `bindings[]`，或移至支援的頻道。                                                             |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` 在執行緒上下文之外使用。                       | 移至目標執行緒或使用 `--thread auto`/`off`。                                                                                                            |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位使用者擁有作用中的繫結目標。                             | 以擁有者身分重新繫結，或使用不同的對話或執行緒。                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                            | 配接器缺乏執行緒繫結能力。                                     | 使用 `--thread off` 或移至支援的配接器/頻道。                                                                                                           |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 執行時間位於主機端；請求者工作階段已沙盒化。               | 從沙盒化工作階段使用 `runtime="subagent"`，或從非沙盒化工作階段執行 ACP 產生。                                                                          |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 為 ACP 執行時間請求了 `sandbox="require"`。                    | 對於所需的沙盒化使用 `runtime="subagent"`，或從非沙盒化工作階段使用具有 `sandbox="inherit"` 的 ACP。                                                    |
| 繫結工作階段缺少 ACP 元資料                                                 | 過時/已刪除的 ACP 工作階段元資料。                             | 使用 `/acp spawn` 重新建立，然後重新繫結/聚焦執行緒。                                                                                                   |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非互動式 ACP 工作階段中封鎖寫入/執行。      | 將 `plugins.entries.acpx.config.permissionMode` 設定為 `approve-all` 並重新啟動 gateway。請參閱 [Permission configuration](#permission-configuration)。 |
| ACP 工作階段很早失敗且輸出很少                                              | 權限提示被 `permissionMode`/`nonInteractivePermissions` 封鎖。 | 檢查 gateway 日誌中的 `AcpRuntimeError`。若要完整權限，請設定 `permissionMode=approve-all`；若要優雅降級，請設定 `nonInteractivePermissions=deny`。     |
| ACP 工作階段在完成工作後無限期停滯                                          | Harness 程序已完成，但 ACP 工作階段未回報完成。                | 使用 `ps aux \| grep acpx` 監控；手動終止停滯的程序。                                                                                                   |
