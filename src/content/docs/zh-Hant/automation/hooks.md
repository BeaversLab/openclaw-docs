---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks 提供了一個可擴展的事件驅動系統，用於自動化執行回應代理指令和事件的動作。Hooks 會從目錄中自動被探索，並可使用 `openclaw hooks` 進行檢查，而 hook-pack 的安裝與更新現已透過 `openclaw plugins` 進行。

## Getting Oriented

Hooks are small scripts that run when something happens. There are two kinds:

- **Hooks** (本頁面)：當觸發代理事件時，於 Gateway 內部執行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhooks**：外部 HTTP webhooks，允許其他系統在 OpenClaw 中觸發工作。請參閱 [Webhook Hooks](/en/automation/webhook) 或使用 `openclaw webhooks` 取得 Gmail 輔助指令。

Hooks 也可以打包在插件內；請參閱 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks)。`openclaw hooks list` 會顯示獨立的 hooks 與外掛程式管理的 hooks。

Common uses:

- Save a memory snapshot when you reset a session
- Keep an audit trail of commands for troubleshooting or compliance
- Trigger follow-up automation when a session starts or ends
- Write files into the agent workspace or call external APIs when events fire

If you can write a small TypeScript function, you can write a hook. Managed and bundled hooks are trusted local code. Workspace hooks are discovered automatically, but OpenClaw keeps them disabled until you explicitly enable them via the CLI or config.

## Overview

The hooks system allows you to:

- 當發出 `/new` 時，將會話上下文儲存到記憶體
- Log all commands for auditing
- Trigger custom automations on agent lifecycle events
- Extend OpenClaw's behavior without modifying core code

## Getting Started

### Bundled Hooks

OpenClaw ships with four bundled hooks that are automatically discovered:

- **💾 session-memory**：當您發出 `/new` 或 `/reset` 時，將會話上下文儲存至您的代理工作區 (預設為 `~/.openclaw/workspace/memory/`)
- **📎 bootstrap-extra-files**：在 `agent:bootstrap` 期間，從設定的 glob/路徑模式注入額外的工作區引導檔案
- **📝 command-logger**：將所有指令事件記錄到 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**：當 gateway 啟動時執行 `BOOT.md` (需要啟用內部 hooks)

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

在上架期間 (`openclaw onboard`)，系統會提示您啟用建議的 hooks。精靈會自動探索符合資格的 hooks 並顯示它們供您選擇。

### 信任邊界

Hooks 在 Gateway 進程內執行。請將打包的 hooks、受管理的 hooks 和 `hooks.internal.load.extraDirs` 視為受信任的本機程式碼。位於 `<workspace>/hooks/` 下的工作區 hooks 是存放庫本機程式碼，因此 OpenClaw 在載入它們之前需要明確的啟用步驟。

## Hook 探索

Hooks 會從這些目錄中自動探索，按照覆寫優先順序遞增的順序：

1. **Bundled hooks**: 隨 OpenClaw 附帶；位於 `<openclaw>/dist/hooks/bundled/` (npm 安裝) 或其同層目錄的 `hooks/bundled/` (編譯後的二進位檔案)
2. **Plugin hooks**: 打包在已安裝外掛中的 hooks (參閱 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks))
3. **Managed hooks**: `~/.openclaw/hooks/` (使用者安裝，跨工作區共享；可覆寫 bundled 和 plugin hooks)。透過 `hooks.internal.load.extraDirs` 設定的 **額外 hook 目錄** 也會被視為 managed hooks，並享有相同的覆寫優先順序。
4. **Workspace hooks**: `<workspace>/hooks/` (各 agent 獨立，預設停用直到明確啟用；無法覆寫來自其他來源的 hooks)

工作區 hooks 可以為存放庫新增新的 hook 名稱，但它們無法覆寫具有相同名稱的捆綁、受控或外掛程式提供的 hooks。

受控的 hook 目錄可以是 **單一 hook** 或 **hook pack**（套件目錄）。

每個 hook 是一個包含以下內容的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook Packs (npm/封存)

Hook packs 是標準的 npm 套件，透過 `package.json` 中的 `openclaw.hooks` 匯出一或多個 hooks。
使用以下指令安裝：

```bash
openclaw plugins install <path-or-spec>
```

Npm 規格僅限於註冊表（套件名稱 + 可選的確切版本或 dist-tag）。
會拒絕 Git/URL/檔案規格和 semver 範圍。

Bare specs 和 `@latest` 維持在穩定版本軌道。如果 npm 將這兩者解析為發行前版本 (prerelease)，OpenClaw 會停止並要求您明確加入，使用像是 `@beta`/`@rc` 的發行前版本標籤或指定的發行前版本號。

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

每個條目指向一個包含 `HOOK.md` 和處理程式檔案的 hook 目錄。載入器會依序嘗試 `handler.ts`、`handler.js`、`index.ts`、`index.js`。
Hook packs 可以附帶相依套件；它們將被安裝在 `~/.openclaw/hooks/<id>` 下。
每個 `openclaw.hooks` 條目在解析符號連結後必須位於套件目錄內；逃逸至目錄外的條目將被拒絕。

安全提示：`openclaw plugins install` 會以 `npm install --ignore-scripts` 安裝 hook-pack 相依套件 (不執行生命週期腳本)。請保持 hook pack 的相依樹「純 JS/TS」，並避免依賴 `postinstall` 建構的套件。

## Hook 結構

### HOOK.md 格式

`HOOK.md` 檔案包含 YAML frontmatter 中的元資料以及 Markdown 文件：

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

- **`emoji`**: CLI 的顯示表情符號 (例如 `"💾"`)
- **`events`**: 要監聽的事件陣列（例如 `["command:new", "command:reset"]`）
- **`export`**: 要使用的命名匯出（預設為 `"default"`）
- **`homepage`**: 文件 URL
- **`os`**: 所需平台（例如 `["darwin", "linux"]`）
- **`requires`**: 可選需求
  - **`bins`**: PATH 中所需的二進位檔案（例如 `["git", "node"]`）
  - **`anyBins`**: 這些二進位檔案中必須至少存在一個
  - **`env`**: 所需的環境變數
  - **`config`**: 所需的設定路徑（例如 `["workspace.dir"]`）
- **`always`**: 繞過資格檢查（布林值）
- **`install`**: 安裝方法（對於內置 Hooks：`[{"id":"bundled","kind":"bundled"}]`）

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
    sessionKey?: string,           // routing session key
    sessionId?: string,            // internal session UUID
    agentId?: string,              // resolved agent ID
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

- **`command`**: 所有指令事件（通用監聽器）
- **`command:new`**: 發出 `/new` 指令時
- **`command:reset`**: 發出 `/reset` 指令時
- **`command:stop`**: 發出 `/stop` 指令時

### Session 事件

- **`session:compact:before`**: 就在壓縮總結歷史記錄之前
- **`session:compact:after`**: 壓縮完成並帶有總結元數據之後

內部 Hook 載荷將這些作為帶有 `action: "compact:before"` / `action: "compact:after"` 的 `type: "session"` 發出；監聽器使用上述組合鍵進行訂閱。
特定的處理程序註冊使用字面鍵格式 `${type}:${action}`。對於這些事件，請註冊 `session:compact:before` 和 `session:compact:after`。

`session:compact:before` 上下文字段：

- `sessionId`: 內部會話 UUID
- `missingSessionKey`: 當沒有可用的會話金鑰時為 true
- `messageCount`：壓縮前的訊息數量
- `tokenCount`：壓縮前的 token 計數（可能不存在）
- `messageCountOriginal`：來自完整未截斷會話歷史的訊息計數
- `tokenCountOriginal`：完整原始歷史的 token 計數（可能不存在）

`session:compact:after` 上下文字段（除了 `sessionId` 和 `missingSessionKey`）：

- `messageCount`：壓縮後的訊息計數
- `tokenCount`：壓縮後的 token 計數（可能不存在）
- `compactedCount`：被壓縮/移除的訊息數量
- `summaryLength`：生成的壓縮摘要的字元長度
- `tokensBefore`：壓縮前的 token 計數（用於增量計算）
- `tokensAfter`：壓縮後的 token 計數
- `firstKeptEntryId`：壓縮後保留的第一個訊息條目的 ID

### Agent 事件

- **`agent:bootstrap`**：在工作區引導檔案注入之前（hooks 可以修改 `context.bootstrapFiles`）

### 閘道事件

當閘道啟動時觸發：

- **`gateway:startup`**：在通道啟動且 hooks 載入之後

### 會話修補事件

當會話屬性被修改時觸發：

- **`session:patch`**：當會話被更新時

#### 會話事件上下文

會話事件包含關於會話和變更的豐富上下文：

```typescript
{
  sessionEntry: SessionEntry, // The complete updated session entry
  patch: {                    // The patch object (only changed fields)
    // Session identity & labeling
    label?: string | null,           // Human-readable session label

    // AI model configuration
    model?: string | null,           // Model override (e.g., "claude-sonnet-4-6")
    thinkingLevel?: string | null,   // Thinking level ("off"|"low"|"med"|"high")
    verboseLevel?: string | null,    // Verbose output level
    reasoningLevel?: string | null,  // Reasoning mode override
    elevatedLevel?: string | null,   // Elevated mode override
    responseUsage?: "off" | "tokens" | "full" | "on" | null, // Usage display mode ("on" is backwards-compat alias for "full")
    fastMode?: boolean | null,                    // Fast/turbo mode toggle
    spawnedWorkspaceDir?: string | null,          // Workspace dir override for spawned subagents
    subagentRole?: "orchestrator" | "leaf" | null, // Subagent role assignment
    subagentControlScope?: "children" | "none" | null, // Scope of subagent control

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

**安全提示：** 只有特權客戶端（包括控制 UI）可以觸發 `session:patch` 事件。標準 WebChat 客戶端被禁止修補會話，因此該 hook 不會從這些連線觸發。

請參閱 `src/gateway/protocol/schema/sessions.ts` 中的 `SessionsPatchParamsSchema` 以取得完整的類型定義。

#### 範例：會話修補記錄器 Hook

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

當收到或發送訊息時觸發：

- **`message`**：所有訊息事件（通用監聽器）
- **`message:received`**：當從任何通道接收到訊息時觸發。在媒體理解之前的處理初期觸發。內容可能包含原始佔位符，例如針對尚未處理的媒體附件的 `<media:audio>`。
- **`message:transcribed`**：當訊息已完全處理完成時觸發，包括音訊轉錄和連結理解。此時，`transcript` 包含音訊訊息的完整轉錄文字。當您需要存取轉錄後的音訊內容時，請使用此 hook。
- **`message:preprocessed`**：在所有媒體和連結理解完成後，針對每則訊息觸發，讓 hooks 在 agent 看到之前就能存取完全豐富化的內容（轉錄文字、圖片描述、連結摘要）。
- **`message:sent`**：當外送訊息成功發送時

#### 訊息事件上下文

訊息事件包含關於該訊息的豐富上下文：

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

#### 範例：訊息記錄器 Hook

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

### 工具結果 Hooks (Plugin API)

這些 hooks 並非事件串流監聽器；它們讓外掛程式能在 OpenClaw 持久化工具結果之前同步調整結果。

- **`tool_result_persist`**：在將工具結果寫入會話轉錄之前轉換結果。必須同步執行；返回更新後的工具結果負載，或返回 `undefined` 以保持原樣。請參閱 [Agent Loop](/en/concepts/agent-loop)。

### 外掛 Hook 事件

#### before_tool_call

在每次工具呼叫之前執行。外掛程式可以修改參數、封鎖呼叫，或請求使用者核准。

返回欄位：

- **`params`**：覆寫工具參數（與原始參數合併）
- **`block`**：設定為 `true` 以封鎖工具呼叫
- **`blockReason`**：被封鎖時顯示給 agent 的原因
- **`requireApproval`**：暫停執行並等待透過通道進行的使用者核准

`requireApproval` 欄位會觸發原生平台核准（Telegram 按鈕、Discord 元件、`/approve` 指令），而不是依賴 agent 的配合：

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

當審核解析、逾時或取消後，會使用最終決策字串調用 `onResolution` 回呼。它在外掛程式內的行程中執行（不會傳送到閘道）。使用它來保存決策、更新快取或執行清理作業。

`pluginId` 欄位是由 Hook 執行器根據外掛程式註冊資料自動標記的。當多個外掛程式傳回 `requireApproval` 時，第一個（優先順序最高）者獲勝。

`block` 優先於 `requireApproval`：如果合併後的 Hook 結果同時包含 `block: true` 和 `requireApproval` 欄位，工具呼叫將立即被封鎖，而不會觸發審核流程。這可確保高優先順序外掛程式的封鎖操作不會被低優先順序外掛程式的審核請求覆寫。

如果閘道無法使用或不支援外掛程式審核，工具呼叫將使用 `description` 作為封鎖原因，退回到軟封鎖。

#### before_install

在內建安裝安全性掃描之後、安裝繼續之前執行。OpenClaw 會在互動式技能安裝以及外掛程式套件組合、套件和單一檔案安裝時觸發此 Hook。

預設行為會根據目標類型而有所不同：

- 除非操作員明確使用 `openclaw plugins install --dangerously-force-unsafe-install`，否則外掛程式安裝會在內建掃描 `critical` 發現和掃描錯誤上採取「預設封鎖」（fail closed）處理。
- 技能安裝仍會顯示內建掃描發現和掃描錯誤作為警告，並預設繼續執行。

傳回欄位：

- **`findings`**：要顯示為警告的其他掃描發現
- **`block`**：設為 `true` 以封鎖安裝
- **`blockReason`**：被封鎖時顯示的人類可讀原因

事件欄位：

- **`targetType`**：安裝目標類別（`skill` 或 `plugin`）
- **`targetName`**：安裝目標的人類可讀技能名稱或外掛程式 ID
- **`sourcePath`**：正在掃描的安裝目標內容的絕對路徑
- **`sourcePathKind`**: 掃描的內容是 `file` 還是 `directory`
- **`origin`**: 可用時的標準化安裝來源（例如 `openclaw-bundled`、`openclaw-workspace`、`plugin-bundle`、`plugin-package` 或 `plugin-file`）
- **`request`**: 安裝請求的來源，包括 `kind`、`mode` 和可選的 `requestedSpecifier`
- **`builtinScan`**: 內建掃描器的結構化結果，包括 `status`、摘要計數、發現結果以及可選的 `error`
- **`skill`**: 當 `targetType` 為 `skill` 時的技能安裝元資料，包括 `installId` 和選定的 `installSpec`
- **`plugin`**: 當 `targetType` 為 `plugin` 時的外掛程式安裝元資料，包括標準的 `pluginId`、標準化的 `contentType`、可選的 `packageName` / `manifestId` / `version`，以及 `extensions`

範例事件（外掛程式套件安裝）：

```json
{
  "targetType": "plugin",
  "targetName": "acme-audit",
  "sourcePath": "/var/folders/.../openclaw-plugin-acme-audit/package",
  "sourcePathKind": "directory",
  "origin": "plugin-package",
  "request": {
    "kind": "plugin-npm",
    "mode": "install",
    "requestedSpecifier": "@acme/openclaw-plugin-audit@1.4.2"
  },
  "builtinScan": {
    "status": "ok",
    "scannedFiles": 12,
    "critical": 0,
    "warn": 1,
    "info": 0,
    "findings": [
      {
        "severity": "warn",
        "ruleId": "network_fetch",
        "file": "dist/index.js",
        "line": 88,
        "message": "Dynamic network fetch detected during install review."
      }
    ]
  },
  "plugin": {
    "pluginId": "acme-audit",
    "contentType": "package",
    "packageName": "@acme/openclaw-plugin-audit",
    "manifestId": "acme-audit",
    "version": "1.4.2",
    "extensions": ["./dist/index.js"]
  }
}
```

技能安裝使用相同的事件形狀，包含 `targetType: "skill"` 和 `skill` 物件，而非 `plugin`。

決策語義：

- `before_install`: `{ block: true }` 是終止的，並會停止優先級較低的處理程序。
- `before_install`: `{ block: false }` 被視為未做出決策。

使用此 hook 針對需要在外掛程式安裝前稽核安裝來源的外部安全掃描器、政策引擎或企業核准閘道。

#### 壓縮生命週期

透過外掛程式 hook 執行器公開的壓縮生命週期 hook：

- **`before_compaction`**: 在壓縮之前運行，包含計數/Token 元數據
- **`after_compaction`**: 在壓縮之後運行，包含壓縮摘要元數據

### 完整的外掛程式 Hook 參考

透過外掛程式 SDK 註冊的所有 27 個 hooks。標記為 **sequential (順序)** 的 hooks 會按優先級順序運行並可以修改結果；**parallel (並行)** 的 hooks 則是觸發後即不理會。

#### 模型和提示詞 hooks

| Hook                   | 觸發時機                                 | 執行方式   | 返回值                                                     |
| ---------------------- | ---------------------------------------- | ---------- | ---------------------------------------------------------- |
| `before_model_resolve` | 在查找模型/供應商之前                    | Sequential | `{ modelOverride?, providerOverride? }`                    |
| `before_prompt_build`  | 在模型解析完成後，Session 訊息準備就緒時 | Sequential | `{ systemPrompt?, prependContext?, appendSystemContext? }` |
| `before_agent_start`   | 舊版合併 hook (建議優先使用上述兩個)     | Sequential | 兩種結果形狀的聯集                                         |
| `llm_input`            | 就在 LLM API 呼叫之前                    | Parallel   | `void`                                                     |
| `llm_output`           | 就在收到 LLM 回應之後                    | Parallel   | `void`                                                     |

#### Agent 生命週期 hooks

| Hook                | 觸發時機                              | 執行方式 | 返回值 |
| ------------------- | ------------------------------------- | -------- | ------ |
| `agent_end`         | 在 Agent 執行完成後 (成功或失敗)      | Parallel | `void` |
| `before_reset`      | 當 `/new` 或 `/reset` 清除 session 時 | Parallel | `void` |
| `before_compaction` | 在壓縮摘要歷史記錄之前                | Parallel | `void` |
| `after_compaction`  | 在壓縮完成之後                        | Parallel | `void` |

#### Session 生命週期 hooks

| Hook            | 觸發時機              | 執行方式 | 返回值 |
| --------------- | --------------------- | -------- | ------ |
| `session_start` | 當新的 session 開始時 | Parallel | `void` |
| `session_end`   | 當 session 結束時     | Parallel | `void` |

#### 訊息流 hooks

| Hook                   | 觸發時機                            | 執行方式       | 返回值                        |
| ---------------------- | ----------------------------------- | -------------- | ----------------------------- |
| `inbound_claim`        | 在命令/Agent 分派之前；先宣告者獲勝 | Sequential     | `{ handled: boolean }`        |
| `message_received`     | 收到入站訊息之後                    | Parallel       | `void`                        |
| `before_dispatch`      | 解析指令之後，分派模型之前          | 循序           | `{ handled: boolean, text? }` |
| `message_sending`      | 在傳送出站訊息之前                  | 循序           | `{ content?, cancel? }`       |
| `message_sent`         | 在傳送出站訊息之後                  | 平行           | `void`                        |
| `before_message_write` | 在將訊息寫入工作階段紀錄之前        | **同步**，循序 | `{ block?, message? }`        |

#### 工具執行掛鉤

| 掛鉤                  | 時機                     | 執行           | 傳回                                                  |
| --------------------- | ------------------------ | -------------- | ----------------------------------------------------- |
| `before_tool_call`    | 在每次工具呼叫之前       | 循序           | `{ params?, block?, blockReason?, requireApproval? }` |
| `after_tool_call`     | 在工具呼叫完成之後       | 平行           | `void`                                                |
| `tool_result_persist` | 在將工具結果寫入紀錄之前 | **同步**，循序 | `{ message? }`                                        |

#### 子代理程式掛鉤

| 掛鉤                       | 時機                         | 執行 | 傳回                              |
| -------------------------- | ---------------------------- | ---- | --------------------------------- |
| `subagent_spawning`        | 在建立子代理程式工作階段之前 | 循序 | `{ status, threadBindingReady? }` |
| `subagent_delivery_target` | 生成之後，以解析傳送目標     | 循序 | `{ origin? }`                     |
| `subagent_spawned`         | 在子代理程式完全生成之後     | 平行 | `void`                            |
| `subagent_ended`           | 當子代理程式工作階段終止時   | 平行 | `void`                            |

#### 閘道掛鉤

| 掛鉤            | 時機                       | 執行 | 傳回   |
| --------------- | -------------------------- | ---- | ------ |
| `gateway_start` | 在閘道處理程序完全啟動之後 | 平行 | `void` |
| `gateway_stop`  | 當閘道正在關閉時           | 平行 | `void` |

#### 安裝掛鉤

| 掛鉤             | 時機                             | 執行 | 傳回                                  |
| ---------------- | -------------------------------- | ---- | ------------------------------------- |
| `before_install` | 在內建安全掃描之後，繼續安裝之前 | 循序 | `{ findings?, block?, blockReason? }` |

<Note>兩個掛鉤（`tool_result_persist` 和 `before_message_write`）僅限 **同步** — 它們不得傳回 Promise。若從這些掛鉤傳回 Promise，會在執行階段被攔截，並且會捨棄結果並顯示警告。</Note>

如需完整的處理程序簽章與上下文類型，請參閱 [外掛架構](/en/plugins/architecture)。

### 未來事件

以下事件類型計畫用於內部 Hook 事件流串。
請注意，`session_start` 和 `session_end` 已作為 [外掛 Hook API](/en/plugins/architecture#provider-runtime-hooks) Hook 存在，
但尚未在 `HOOK.md` 元資料中提供為內部 Hook 事件鍵：

- **`session:start`**：當新工作階段開始時（計畫用於內部 Hook 流串；可作為外掛 Hook `session_start` 使用）
- **`session:end`**：當工作階段結束時（計畫用於內部 Hook 流串；可作為外掛 Hook `session_end` 使用）
- **`agent:error`**：當代理程式遇到錯誤時

## 建立自訂 Hooks

### 1. 選擇位置

- **工作區 Hooks** (`<workspace>/hooks/`)：針對各別代理程式；可新增 Hook 名稱，但無法覆寫同名稱的內建、受管理或外掛 Hooks
- **受管理 Hooks** (`~/.openclaw/hooks/`)：在工作區之間共享；可覆寫內建與外掛 Hooks

### 2. 建立目錄結構

```bash
mkdir -p ~/.openclaw/hooks/my-hook
cd ~/.openclaw/hooks/my-hook
```

### 3. 建立 HOOK.md

```markdown
---
name: my-hook
description: "Does something useful"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---

# My Custom Hook

This hook does something useful when you issue `/new`.
```

### 4. 建立 handler.ts

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

### 5. 啟用與測試

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

### 個別 Hook 設定

Hooks 可以具有自訂設定：

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

從額外目錄載入 Hooks（視為受管理 Hooks，具有相同的覆寫優先順序）：

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

注意：`module` 必須是相對於工作區的路徑。絕對路徑與超出工作區的瀏覽路徑將被拒絕。

**移轉**：請針對新的 Hooks 使用新的探索型系統。舊版處理程序會在目錄型 Hooks 之後載入。

## CLI 指令

### 列出 Hooks

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

### Hook 資訊

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

## 內建 Hook 參考

### session-memory

當您發出 `/new` 或 `/reset` 時，將工作階段上下文儲存至記憶體。

**事件**：`command:new`、`command:reset`

**需求**：必須設定 `workspace.dir`

**輸出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（預設為 `~/.openclaw/workspace`）

**功能**：

1. 使用重置前的會話條目來定位正確的對話紀錄
2. 從對話中提取最後 15 則使用者/助理訊息（可設定）
3. 使用 LLM 生成描述性檔名 slug
4. 將會話元資料儲存至帶有日期的記憶檔案

**輸出範例**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram

## Conversation Summary

user: Can you help me design the API?
assistant: Sure! Let's start with the endpoints...
```

**檔名範例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（如果 slug 生成失敗則使用備用時間戳記）

**啟用**：

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的引導檔案（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**事件**：`agent:bootstrap`

**需求**：必須設定 `workspace.dir`

**輸出**：未寫入任何檔案；僅在記憶體中修改引導上下文。

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
- 檔案必須保持在工作區內（經 realpath 檢查）。
- 僅載入已識別的引導基本檔名（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`、`memory.md`）。
- 對於 subagent/cron 會話，會套用更嚴格的白名單（`AGENTS.md`、`TOOLS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`）。

**啟用**：

```bash
openclaw hooks enable bootstrap-extra-files
```

### command-logger

將所有指令事件記錄到集中的稽核檔案。

**事件**：`command`

**需求**：無

**輸出**：`~/.openclaw/logs/commands.log`

**功能**：

1. 捕獲事件細節（指令動作、時間戳、會話金鑰、發送者 ID、來源）
2. 以 JSONL 格式附加到日誌檔案
3. 在背景中靜默執行

**範例日誌條目**：

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**檢視日誌**：

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

在閘道啟動時執行 `BOOT.md`（在通道啟動之後）。
必須啟用內部掛載才能執行此項目。

**事件**：`gateway:startup`

**需求**：必須設定 `workspace.dir`

**功能**：

1. 從您的工作區讀取 `BOOT.md`
2. 透過代理程式執行器執行指令
3. 透過訊息工具傳送任何請求的傳出訊息

**啟用**：

```bash
openclaw hooks enable boot-md
```

## 最佳實踐

### 保持處理程序快速

掛載在指令處理期間執行。保持它們輕量化：

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

始終將有風險的操作包裝起來：

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

如果事件不相關，則提早返回：

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

在元資料中指定確切的事件（如果可能的話）：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而不是：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## 除錯

### 啟用掛載日誌

閘道會在啟動時記錄掛載載入情況：

```text
Registered hook: session-memory -> command:new, command:reset
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 檢查探索

列出所有探索到的掛載：

```bash
openclaw hooks list --verbose
```

### 檢查註冊

在您的處理程序中，記錄被呼叫時的狀況：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### 驗證資格

檢查為何掛載不符合資格：

```bash
openclaw hooks info my-hook
```

尋找輸出中遺失的需求。

## 測試

### 閘道日誌

監控閘道日誌以查看掛載執行情況：

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### 直接測試掛載

獨立測試您的處理程序：

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

### 核心元件

- **`src/hooks/types.ts`**：型別定義
- **`src/hooks/workspace.ts`**：目錄掃描與載入
- **`src/hooks/frontmatter.ts`**：HOOK.md 元資料解析
- **`src/hooks/config.ts`**：資格檢查
- **`src/hooks/hooks-status.ts`**：狀態報告
- **`src/hooks/loader.ts`**：動態模組載入器
- **`src/cli/hooks-cli.ts`**：CLI 指令
- **`src/gateway/server-startup.ts`**：在閘道啟動時載入掛載
- **`src/auto-reply/reply/commands-core.ts`**：觸發指令事件

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

### 未探索到掛載

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

3. 列出所有探索到的掛載：

   ```bash
   openclaw hooks list
   ```

### 掛載不符合資格

檢查需求：

```bash
openclaw hooks info my-hook
```

尋找遺失的：

- 二進位檔（檢查 PATH）
- 環境變數
- 設定值
- 作業系統相容性

### Hook 未執行

1. 驗證 hook 是否已啟用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重新啟動您的 gateway 程序以重新載入 hooks。

3. 檢查 gateway 記錄中的錯誤：

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### 處理程序錯誤

檢查 TypeScript/匯入錯誤：

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 遷移指南

### 從舊版設定到自動探索

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

1. 建立 hook 目錄：

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

4. 驗證並重新啟動您的 gateway 程序：

   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**遷移的好處**：

- 自動探索
- CLI 管理
- 資格檢查
- 更好的文件
- 一致的結構

## 參閱

- [CLI 參考：hooks](/en/cli/hooks)
- [內建 Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/en/automation/webhook)
- [組態](/en/gateway/configuration-reference#hooks)
