---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks provide an extensible event-driven system for automating actions in response to agent commands and events. Hooks are automatically discovered from directories and can be inspected with `openclaw hooks`, while hook-pack installation and updates now go through `openclaw plugins`.

## Getting Oriented

Hooks are small scripts that run when something happens. There are two kinds:

- **Hooks** (this page): run inside the Gateway when agent events fire, like `/new`, `/reset`, `/stop`, or lifecycle events.
- **Webhooks**: 外部 HTTP webhooks，讓其他系統在 OpenClaw 中觸發工作。請參閱 [Webhook Hooks](/en/automation/webhook) 或使用 `openclaw webhooks` 進行 Gmail 助手指令。

Hooks 也可以打包在 plugin 中；請參閱 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks)。`openclaw hooks list` 會顯示獨立 hooks 與 plugin 管理的 hooks。

Common uses:

- Save a memory snapshot when you reset a session
- Keep an audit trail of commands for troubleshooting or compliance
- Trigger follow-up automation when a session starts or ends
- Write files into the agent workspace or call external APIs when events fire

If you can write a small TypeScript function, you can write a hook. Managed and bundled hooks are trusted local code. Workspace hooks are discovered automatically, but OpenClaw keeps them disabled until you explicitly enable them via the CLI or config.

## Overview

The hooks system allows you to:

- 發出 `/new` 時，將 session 內容儲存至記憶體
- Log all commands for auditing
- Trigger custom automations on agent lifecycle events
- Extend OpenClaw's behavior without modifying core code

## Getting Started

### Bundled Hooks

OpenClaw ships with four bundled hooks that are automatically discovered:

- **💾 session-memory**: 當您發出 `/new` 或 `/reset` 時，將 session 內容儲存至您的 agent 工作區 (預設為 `~/.openclaw/workspace/memory/`)
- **📎 bootstrap-extra-files**: 在 `agent:bootstrap` 期間，從設定的 glob/path 模式注入額外的工作區引導檔案
- **📝 command-logger**: 將所有命令事件記錄到 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: 在閘道啟動時執行 `BOOT.md`（需要啟用內部 hooks）

列出可用的 hooks：

```bash
openclaw hooks list
```

啟用 hook：

```bash
openclaw hooks enable session-memory
```

檢查 hook 狀態：

```bash
openclaw hooks check
```

取得詳細資訊：

```bash
openclaw hooks info session-memory
```

### 入門

在引導過程（`openclaw onboard`）中，系統會提示您啟用建議的 hooks。精靈會自動探索符合條件的 hooks 並供您選擇。

### 信任邊界

Hooks 在閘道進程內運行。請將內建 hooks、受控 hooks 和 `hooks.internal.load.extraDirs` 視為受信任的本機程式碼。位於 `<workspace>/hooks/` 下的工作區 hooks 是存放於本機 repo 的程式碼，因此 OpenClaw 需要在載入它們之前執行明確的啟用步驟。

## Hook 探索

Hooks 會從這些目錄中自動探索，按照覆寫優先順序遞增的順序：

1. **Bundled hooks**：隨 OpenClaw 附帶；對於 npm 安裝位於 `<openclaw>/dist/hooks/bundled/`（對於編譯後的二進制檔案則位於同級的 `hooks/bundled/`）
2. **Plugin hooks**：捆綁在已安裝外掛中的 hooks（請參閱 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks)）
3. **Managed hooks**：`~/.openclaw/hooks/`（使用者安裝，在工作區之間共享；可以覆寫 bundled 和 plugin hooks）。透過 `hooks.internal.load.extraDirs` 配置的**額外 hook 目錄**也會被視為 managed hooks，並共享相同的覆寫優先順序。
4. **Workspace hooks**：`<workspace>/hooks/`（每個 agent 一個，預設停用，直到明確啟用；無法覆寫來自其他來源的 hooks）

工作區 hooks 可以為存放庫新增新的 hook 名稱，但它們無法覆寫具有相同名稱的捆綁、受控或外掛程式提供的 hooks。

受控的 hook 目錄可以是 **單一 hook** 或 **hook pack**（套件目錄）。

每個 hook 是一個包含以下內容的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook Packs (npm/封存)

Hook packs 是標準的 npm 套件，透過 `openclaw.hooks` 在 `package.json` 中匯出一個或多個 hooks。使用以下指令安裝：

```bash
openclaw plugins install <path-or-spec>
```

Npm 規格僅限於註冊表（套件名稱 + 可選的確切版本或 dist-tag）。
會拒絕 Git/URL/檔案規格和 semver 範圍。

Bare specs 和 `@latest` 保持在穩定版本軌道上。如果 npm 將其中任何一個解析為預發布版本，OpenClaw 會停止並要求您明確選擇加入，方法是使用預發布標籤（例如 `@beta`/`@rc`）或特定的預發布版本。

`package.json` 範例：

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "openclaw": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

每個條目指向一個包含 `HOOK.md` 和 `handler.ts`（或 `index.ts`）的 hook 目錄。Hook packs 可以附帶相依套件；它們將被安裝在 `~/.openclaw/hooks/<id>` 下。每個 `openclaw.hooks` 條目在解析符號連結後必須保持在套件目錄內；逸出的條目將被拒絕。

安全性說明：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安裝 hook-pack 相依套件（無生命週期腳本）。請保持 hook pack 相依樹為「純 JS/TS」，並避免依賴 `postinstall` 建置的套件。

## Hook 結構

### HOOK.md 格式

`HOOK.md` 檔案包含 YAML frontmatter 中的元數據以及 Markdown 文件：

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here...

## What It Does

- Listens for `/new` commands
- Performs some action
- Logs the result

## Requirements

- Node.js must be installed

## Configuration

No configuration needed.
```

### 中繼資料欄位

`metadata.openclaw` 物件支援：

- **`emoji`**：用於 CLI 的顯示表情符號（例如 `"💾"`）
- **`events`**：要監聽的事件陣列（例如 `["command:new", "command:reset"]`）
- **`export`**：要使用的命名匯出（預設為 `"default"`）
- **`homepage`**：文件 URL
- **`os`**：所需的平台（例如 `["darwin", "linux"]`）
- **`requires`**：可選需求
  - **`bins`**：PATH 上所需的二進位檔（例如 `["git", "node"]`）
  - **`anyBins`**：必須至少存在其中一個二進位檔
  - **`env`**：所需的環境變數
  - **`config`**：所需的設定路徑（例如 `["workspace.dir"]`）
- **`always`**：繞過資格檢查（布林值）
- **`install`**：安裝方法（對於內建的 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### 處理器實作

`handler.ts` 檔案匯出 `HookHandler` 函數：

```typescript
const myHandler = async (event) => {
  // Only trigger on 'new' command
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  console.log(`  Session: ${event.sessionKey}`);
  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);

  // Your custom logic here

  // Optionally send message to user
  event.messages.push("✨ My hook executed!");
};

export default myHandler;
```

#### 事件上下文

每個事件包括：

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway' | 'message',
  action: string,              // e.g., 'new', 'reset', 'stop', 'received', 'sent'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    // Command events (command:new, command:reset):
    sessionEntry?: SessionEntry,       // current session entry
    previousSessionEntry?: SessionEntry, // pre-reset entry (preferred for session-memory)
    commandSource?: string,            // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    cfg?: OpenClawConfig,
    // Command events (command:stop only):
    sessionId?: string,
    // Agent bootstrap events (agent:bootstrap):
    bootstrapFiles?: WorkspaceBootstrapFile[],
    // Message events (see Message Events section for full details):
    from?: string,             // message:received
    to?: string,               // message:sent
    content?: string,
    channelId?: string,
    success?: boolean,         // message:sent
  }
}
```

## 事件類型

### 指令事件

當發出代理指令時觸發：

- **`command`**：所有指令事件（通用監聽器）
- **`command:new`**：當發出 `/new` 指令時
- **`command:reset`**：當發出 `/reset` 指令時
- **`command:stop`**：當發出 `/stop` 指令時

### Session 事件

- **`session:compact:before`**：就在壓縮摘要歷史之前
- **`session:compact:after`**：壓縮完成並包含摘要元數據之後

內部 hook payload 將這些發出為 `type: "session"`，並帶有 `action: "compact:before"` / `action: "compact:after"`；監聽器使用上述組合鍵進行訂閱。
特定的處理程序註冊使用字面鍵格式 `${type}:${action}`。對於這些事件，請註冊 `session:compact:before` 和 `session:compact:after`。

### 代理事件

- **`agent:bootstrap`**：在工作區引導檔案注入之前（hooks 可能會變更 `context.bootstrapFiles`）

### 閘道事件

當閘道啟動時觸發：

- **`gateway:startup`**: 在通道啟動且 hooks 載入後

### Session 修補事件

當修改 Session 屬性時觸發：

- **`session:patch`**: 當工作階段更新時

#### Session 事件上下文

Session 事件包含關於 Session 和變更的豐富上下文：

```typescript
{
  sessionEntry: SessionEntry, // The complete updated session entry
  patch: {                    // The patch object (only changed fields)
    // Session identity & labeling
    label?: string | null,           // Human-readable session label

    // AI model configuration
    model?: string | null,           // Model override (e.g., "claude-opus-4-5")
    thinkingLevel?: string | null,   // Thinking level ("off"|"low"|"med"|"high")
    verboseLevel?: string | null,    // Verbose output level
    reasoningLevel?: string | null,  // Reasoning mode override
    elevatedLevel?: string | null,   // Elevated mode override
    responseUsage?: "off" | "tokens" | "full" | null, // Usage display mode

    // Tool execution settings
    execHost?: string | null,        // Exec host (sandbox|gateway|node)
    execSecurity?: string | null,    // Security mode (deny|allowlist|full)
    execAsk?: string | null,         // Approval mode (off|on-miss|always)
    execNode?: string | null,        // Node ID for host=node

    // Subagent coordination
    spawnedBy?: string | null,       // Parent session key (for subagents)
    spawnDepth?: number | null,      // Nesting depth (0 = root)

    // Communication policies
    sendPolicy?: "allow" | "deny" | null,          // Message send policy
    groupActivation?: "mention" | "always" | null, // Group chat activation
  },
  cfg: OpenClawConfig            // Current gateway config
}
```

**安全提示：** 只有特權用戶端（包括控制 UI）才能觸發 `session:patch` 事件。標準 WebChat 用戶端被阻止修補會話（請參閱 PR #20800），因此該掛鉤不會從這些連線觸發。

請參閱 `SessionsPatchParamsSchema` 中的 `src/gateway/protocol/schema/sessions.ts` 以取得完整的類型定義。

#### 範例：會話修補記錄器掛鉤

```typescript
const handler = async (event) => {
  if (event.type !== "session" || event.action !== "patch") {
    return;
  }
  const { patch } = event.context;
  console.log(`[session-patch] Session updated: ${event.sessionKey}`);
  console.log(`[session-patch] Changes:`, patch);
};

export default handler;
```

### 訊息事件

當接收或傳送訊息時觸發：

- **`message`**：所有訊息事件（一般監聽器）
- **`message:received`**：當從任何管道收到傳入訊息時觸發。在媒體理解之前的處理初期觸發。內容可能包含原始佔位符，例如 `<media:audio>`，用於尚未處理的媒體附件。
- **`message:transcribed`**：當訊息已完全處理，包括音訊轉錄和連結理解。此時，`transcript` 包含音訊訊息的完整轉錄文字。當您需要存取轉錄後的音訊內容時，請使用此 Hook。
- **`message:preprocessed`**：在所有媒體和連結理解完成後，對於每則訊息都會觸發，讓 Hook 能在 Agent 看到之前存取完全豐富的內容（轉錄、圖片描述、連結摘要）。
- **`message:sent`**：當外送訊息成功發送時

#### 訊息事件上下文

訊息事件包含關於訊息的豐富上下文：

```typescript
// message:received context
{
  from: string,           // Sender identifier (phone number, user ID, etc.)
  content: string,        // Message content
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "whatsapp", "telegram", "discord")
  accountId?: string,     // Provider account ID for multi-account setups
  conversationId?: string, // Chat/conversation ID
  messageId?: string,     // Message ID from the provider
  metadata?: {            // Additional provider-specific data
    to?: string,
    provider?: string,
    surface?: string,
    threadId?: string | number,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
    guildId?: string,     // Discord guild / server ID
    channelName?: string, // Channel name (e.g., Discord channel name)
  }
}

// message:sent context
{
  to: string,             // Recipient identifier
  content: string,        // Message content that was sent
  success: boolean,       // Whether the send succeeded
  error?: string,         // Error message if sending failed
  channelId: string,      // Channel (e.g., "whatsapp", "telegram", "discord")
  accountId?: string,     // Provider account ID
  conversationId?: string, // Chat/conversation ID
  messageId?: string,     // Message ID returned by the provider
  isGroup?: boolean,      // Whether this outbound message belongs to a group/channel context
  groupId?: string,       // Group/channel identifier for correlation with message:received
}

// message:transcribed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file that was transcribed
  mediaType?: string,     // MIME type of the media
}

// message:preprocessed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file
  mediaType?: string,     // MIME type of the media
  isGroup?: boolean,
  groupId?: string,
}
```

#### 範例：訊息記錄器掛鉤

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "sent";

const handler = async (event) => {
  if (isMessageReceivedEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Received from ${event.context.from}: ${event.context.content}`);
  } else if (isMessageSentEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Sent to ${event.context.to}: ${event.context.content}`);
  }
};

export default handler;
```

### 工具結果掛鉤（插件 API）

這些掛鉤不是事件串流監聽器；它們允許插件在 OpenClaw 持久化工具結果之前，同步調整它們。

- **`tool_result_persist`**：在工具結果寫入會話轉錄之前進行轉換。必須是同步的；回傳更新後的工具結果承載或 `undefined` 以保持不變。請參閱 [Agent Loop](/en/concepts/agent-loop)。

### 插件掛鉤事件

#### before_tool_call

在每次工具調用前運行。外掛程式可以修改參數、阻止調用或請求使用者核准。

回傳欄位：

- **`params`**：覆寫工具參數（與原始參數合併）
- **`block`**：設為 `true` 以阻止工具調用
- **`blockReason`**：被阻止時向代理程式顯示的原因
- **`requireApproval`**：暫停執行並透過頻道等待使用者核准

`requireApproval` 欄位會觸發原生平台核准（Telegram 按鈕、Discord 元件、`/approve` 指令），而不是依賴代理程式配合：

```typescript
{
  requireApproval: {
    title: "Sensitive operation",
    description: "This tool call modifies production data",
    severity: "warning",       // "info" | "warning" | "critical"
    timeoutMs: 120000,         // default: 120s
    timeoutBehavior: "deny",   // "allow" | "deny" (default)
    onResolution: async (decision) => {
      // Called after the user resolves: "allow-once", "allow-always", "deny", "timeout", or "cancelled"
    },
  }
}
```

當批准解析、超時或取消後，會使用最終決定字串調用 `onResolution` 回調。它在插件內進程中運行（不發送到網關）。使用它來持久化決定、更新快取或執行清理。

`pluginId` 欄位由掛載執行器根據插件註冊自動標記。當多個插件返回 `requireApproval` 時，第一個（優先級最高）獲勝。

`block` 優先於 `requireApproval`：如果合併後的掛載結果同時具有 `block: true` 和 `requireApproval` 欄位，則工具呼叫將立即被阻止，而不觸發批准流程。這確保了高優先級插件的阻止操作不能被低優先級插件的批准請求覆蓋。

如果閘道不可用或不支援外掛程式核准，工具呼叫會退回到使用 `description` 作為封鎖原因的軟性封鎖。

#### 壓縮生命週期

透過外掛程式 Hook 執行器公開的壓縮生命週期 Hook：

- **`before_compaction`**：在壓縮之前執行，附帶計數/Token 元資料
- **`after_compaction`**：在壓縮之後執行，附帶壓縮摘要元資料

### 未來事件

計畫中的事件類型：

- **`session:start`**：當新工作階段開始時
- **`session:end`**：當工作階段結束時
- **`agent:error`**：當代理程式遇到錯誤時

## 建立自訂 Hook

### 1. 選擇位置

- **工作區 Hook** (`<workspace>/hooks/`)：針對每個代理程式；可以新增 Hook 名稱，但無法覆寫具有相同名稱的內建、受管理或外掛程式 Hook
- **受控掛鉤** (`~/.openclaw/hooks/`)：在工作區之間共享；可以覆寫捆綁和外掛掛鉤

### 2. 建立目錄結構

```bash
mkdir -p ~/.openclaw/hooks/my-hook
cd ~/.openclaw/hooks/my-hook
```

### 3. 建立HOOK.md

```markdown
---
name: my-hook
description: "Does something useful"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---

# My Custom Hook

This hook does something useful when you issue `/new`.
```

### 4. 建立handler.ts

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log("[my-hook] Running!");
  // Your logic here
};

export default handler;
```

### 5. 啟用並測試

```bash
# Verify hook is discovered
openclaw hooks list

# Enable it
openclaw hooks enable my-hook

# Restart your gateway process (menu bar app restart on macOS, or restart your dev process)

# Trigger the event
# Send /new via your messaging channel
```

## 設定

### 新設定格式（推薦）

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

### 個別掛鉤設定

掛鉤可以具有自訂設定：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": {
            "MY_CUSTOM_VAR": "value"
          }
        }
      }
    }
  }
}
```

### 額外目錄

從額外目錄載入掛鉤（視為受控掛鉤，具有相同的覆寫優先順序）：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

### 舊版設定格式（仍支援）

舊的設定格式為了向後相容性仍然有效：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts",
          "export": "default"
        }
      ]
    }
  }
}
```

注意：`module` 必須是相對於工作區的路徑。絕對路徑和工作區之外的遍歷將被拒絕。

**遷移**：對於新的掛鉤，請使用新的基於發現的系統。舊版處理程式在基於目錄的掛鉤之後載入。

## CLI 指令

### 列出掛鉤

```bash
# List all hooks
openclaw hooks list

# Show only eligible hooks
openclaw hooks list --eligible

# Verbose output (show missing requirements)
openclaw hooks list --verbose

# JSON output
openclaw hooks list --json
```

### 掛鉤資訊

```bash
# Show detailed info about a hook
openclaw hooks info session-memory

# JSON output
openclaw hooks info session-memory --json
```

### 檢查資格

```bash
# Show eligibility summary
openclaw hooks check

# JSON output
openclaw hooks check --json
```

### 啟用/停用

```bash
# Enable a hook
openclaw hooks enable session-memory

# Disable a hook
openclaw hooks disable command-logger
```

## 內置 Hook 參考

### session-memory

當您發出 `/new` 或 `/reset` 時，將會話上下文保存至記憶體。

**事件**：`command:new`、`command:reset`

**需求**：必須設定 `workspace.dir`

**輸出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（預設為 `~/.openclaw/workspace`）

**功能說明**：

1. 使用重設前的會話條目來定位正確的對話紀錄
2. 從對話中提取最後 15 則使用者/助理訊息（可設定）
3. 使用 LLM 產生描述性的檔案名稱 slug
4. 將會話元資料儲存至附有日期的記憶體檔案

**輸出示例**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram

## Conversation Summary

user: Can you help me design the API?
assistant: Sure! Let's start with the endpoints...
```

**檔案名稱示例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（如果 slug 產生失敗，則使用回溯時間戳記）

**啟用**：

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的引導檔案（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**事件**：`agent:bootstrap`

**需求**：必須設定 `workspace.dir`

**輸出**：未寫入任何檔案；引導內容僅在記憶體中修改。

**設定**：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

**設定選項**：

- `paths` (string[])：要從工作區解析的 glob/路徑模式。
- `patterns` (string[])：`paths` 的別名。
- `files` (string[])：`paths` 的別名。

**備註**：

- 路徑是相對於工作區解析的。
- 檔案必須保留在工作區內（經 realpath 檢查）。
- 只會載入可識別的引導基本名稱（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`、`memory.md`）。
- 對於子代理程式/ cron 會話，會套用更嚴格的允許清單（`AGENTS.md`、`TOOLS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`）。

**啟用**：

```bash
openclaw hooks enable bootstrap-extra-files
```

### command-logger

將所有指令事件記錄到集中的稽核檔案中。

**事件**：`command`

**需求**：無

**輸出**：`~/.openclaw/logs/commands.log`

**作用**：

1. 擷取事件詳細資訊（指令動作、時間戳記、工作階段金鑰、發送者 ID、來源）
2. 以 JSONL 格式附加至記錄檔
3. 在背景中靜默執行

**範例記錄項目**：

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**檢視記錄**：

```bash
# View recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print with jq
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**啟用**：

```bash
openclaw hooks enable command-logger
```

### boot-md

當閘道啟動時（在通道啟動後）執行 `BOOT.md`。
必須啟用內部 hooks 此功能才會執行。

**事件**： `gateway:startup`

**需求**：必須設定 `workspace.dir`

**功能說明**：

1. 從您的工作區讀取 `BOOT.md`
2. 透過代理執行器執行指令
3. 透過訊息工具傳送任何要求的傳出訊息

**啟用**：

```bash
openclaw hooks enable boot-md
```

## 最佳實踐

### 保持處理程序快速

Hook 在指令處理期間執行。請保持輕量化：

```typescript
// ✓ Good - async work, returns immediately
const handler: HookHandler = async (event) => {
  void processInBackground(event); // Fire and forget
};

// ✗ Bad - blocks command processing
const handler: HookHandler = async (event) => {
  await slowDatabaseQuery(event);
  await evenSlowerAPICall(event);
};
```

### 優雅地處理錯誤

請務必將有風險的操作包裝起來：

```typescript
const handler: HookHandler = async (event) => {
  try {
    await riskyOperation(event);
  } catch (err) {
    console.error("[my-handler] Failed:", err instanceof Error ? err.message : String(err));
    // Don't throw - let other handlers run
  }
};
```

### 儘早過濾事件

如果事件不相關，請提早回傳：

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### 使用特定的事件金鑰

盡可能在元數據中指定確切事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而不是：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## 除錯

### 啟用 Hook 記錄

閘道會在啟動時記錄 Hook 載入情況：

```
Registered hook: session-memory -> command:new
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 檢查探索

列出所有探索到的 Hook：

```bash
openclaw hooks list --verbose
```

### 檢查註冊

在您的處理器中，記錄被調用的時機：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### 驗證資格

檢查 Hook 不符合資格的原因：

```bash
openclaw hooks info my-hook
```

在輸出中尋找缺失的要求。

## 測試

### 閘道日誌

監控閘道日誌以查看 Hook 執行情況：

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### 直接測試 Hook

獨立測試您的處理器：

```typescript
import { test } from "vitest";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = {
    type: "command",
    action: "new",
    sessionKey: "test-session",
    timestamp: new Date(),
    messages: [],
    context: { foo: "bar" },
  };

  await myHandler(event);

  // Assert side effects
});
```

## 架構

### 核心組件

- **`src/hooks/types.ts`**：類型定義
- **`src/hooks/workspace.ts`**：目錄掃描與載入
- **`src/hooks/frontmatter.ts`**：HOOK.md 元數據解析
- **`src/hooks/config.ts`**：資格檢查
- **`src/hooks/hooks-status.ts`**：狀態報告
- **`src/hooks/loader.ts`**：動態模組載入器
- **`src/cli/hooks-cli.ts`**: CLI 指令
- **`src/gateway/server-startup.ts`**: 在閘道啟動時載入鉤子
- **`src/auto-reply/reply/commands-core.ts`**: 觸發指令事件

### 探索流程

```
Gateway startup
    ↓
Scan directories (bundled → plugin → managed + extra dirs → workspace)
    ↓
Parse HOOK.md files
    ↓
Sort by override precedence (bundled < plugin < managed < workspace)
    ↓
Check eligibility (bins, env, config, os)
    ↓
Load handlers from eligible hooks
    ↓
Register handlers for events
```

### 事件流程

```
User sends /new
    ↓
Command validation
    ↓
Create hook event
    ↓
Trigger hook (all registered handlers)
    ↓
Command processing continues
    ↓
Session reset
```

## 疑難排解

### 未發現鉤子

1. 檢查目錄結構：

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. 驗證 HOOK.md 格式：

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. 列出所有已發現的鉤子：

   ```bash
   openclaw hooks list
   ```

### 鉤子不符合條件

檢查需求：

```bash
openclaw hooks info my-hook
```

查找遺漏：

- 二進位檔案 (檢查 PATH)
- 環境變數
- 設定值
- 作業系統相容性

### 鉤子未執行

1. 驗證鉤子是否已啟用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重新啟動您的閘道程序以重新載入鉤子。

3. 檢查閘道紀錄中的錯誤：

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### 處理程式錯誤

檢查 TypeScript/匯入錯誤：

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 遷移指南

### 從舊版設定到探索

**之前**：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts"
        }
      ]
    }
  }
}
```

**之後**：

1. 建立鉤子目錄：

   ```bash
   mkdir -p ~/.openclaw/hooks/my-hook
   mv ./hooks/handlers/my-handler.ts ~/.openclaw/hooks/my-hook/handler.ts
   ```

2. 建立 HOOK.md：

   ```markdown
   ---
   name: my-hook
   description: "My custom hook"
   metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
   ---

   # My Hook

   Does something useful.
   ```

3. 更新設定：

   ```json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "my-hook": { "enabled": true }
         }
       }
     }
   }
   ```

4. 驗證並重新啟動您的閘道程序：

   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**遷移的優點**：

- 自動探索
- CLI 管理
- 資格檢查
- 更完善的文件
- 一致的結構

## 參見

- [CLI 參考：hooks](/en/cli/hooks)
- [內建 Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/en/automation/webhook)
- [組態](/en/gateway/configuration-reference#hooks)
