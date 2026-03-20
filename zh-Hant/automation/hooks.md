---
summary: "鉤子：用於指令和生命週期事件的事件驅動自動化"
read_when:
  - 您需要針對 /new、/reset、/stop 和代理生命週期事件的事件驅動自動化
  - 您想要建置、安裝或除錯鉤子
title: "鉤子"
---

# 鉤子

鉤子提供了一個可擴充的事件驅動系統，用於自動化響應代理指令和事件的動作。鉤子會從目錄中自動探索，並可以透過 CLI 指令進行管理，類似於 OpenClaw 中的技能運作方式。

## 快速導覽

鉤子是在發生某些事情時執行的小型腳本。有兩種類型：

- **鉤子** (本頁)：當觸發代理事件（例如 `/new`、`/reset`、`/stop` 或生命週期事件）時，在 Gateway 內部執行。
- **Webhooks**：外部 HTTP webhooks，允許其他系統在 OpenClaw 中觸發工作。請參閱 [Webhook Hooks](/zh-Hant/automation/webhook) 或使用 `openclaw webhooks` 進行 Gmail 輔助指令。

鉤子也可以打包在插件內；請參閱 [Plugins](/zh-Hant/tools/plugin#plugin-hooks)。

常見用途：

- 當您重置會話時儲存記憶快照
- 保留指令的稽核記錄以進行疑難排解或合規性檢查
- 當會話開始或結束時觸發後續的自動化
- 當事件觸發時，將檔案寫入代理工作區或呼叫外部 API

如果您能編寫小型 TypeScript 函式，您就能編寫鉤子。鉤子會被自動探索，並且您可以透過 CLI 啟用或停用它們。

## 概覽

鉤子系統允許您：

- 當發出 `/new` 時，將會話上下文儲存到記憶中
- 記錄所有指令以進行稽核
- 在代理生命週期事件上觸發自訂自動化
- 擴充 OpenClaw 的行為而無需修改核心程式碼

## 開始使用

### 內建鉤子

OpenClaw 隨附四個會被自動探索的內建鉤子：

- **💾 session-memory**：當您發出 `/new` 時，將會話上下文儲存到您的代理工作區 (預設為 `~/.openclaw/workspace/memory/`)
- **📎 bootstrap-extra-files**：在 `agent:bootstrap` 期間，從設定的 glob/路徑模式注入額外的工作區引導檔案
- **📝 command-logger**：將所有指令事件記錄到 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**：當閘道啟動時執行 `BOOT.md`（需要啟用內部 hooks）

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

在入門期間（`openclaw onboard`），系統會提示您啟用建議的 hooks。精靈會自動發現符合資格的 hooks 並將其呈現供選擇。

## Hook 發現

Hooks 會自動從三個目錄中發現（按優先順序）：

1. **Workspace hooks**：`<workspace>/hooks/`（每個代理程式，最高優先權）
2. **Managed hooks**：`~/.openclaw/hooks/`（使用者安裝，跨工作區共用）
3. **Bundled hooks**：`<openclaw>/dist/hooks/bundled/`（隨 OpenClaw 附帶）

Managed hook 目錄可以是**單一 hook**或 **hook pack**（套件目錄）。

每個 hook 是一個包含以下內容的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook Packs (npm/archives)

Hook packs 是標準的 npm 套件，它們透過 `openclaw.hooks` 在 `package.json` 中匯出一或多個 hooks。使用以下方式安裝：

```bash
openclaw hooks install <path-or-spec>
```

Npm 規格僅限於 registry（套件名稱 + 可選的確切版本或 dist-tag）。
Git/URL/file 規格和 semver 範圍會被拒絕。

裸規格和 `@latest` 會保持在穩定版本軌道。如果 npm 將其中任何一個解析為預發布版本，OpenClaw 會停止並要求您使用預發布標籤（例如 `@beta`/`@rc`）或確切的預發布版本明確選擇加入。

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

每個條目指向一個包含 `HOOK.md` 和 `handler.ts`（或 `index.ts`）的 hook 目錄。
Hook packs 可以隨附相依性；它們將被安裝在 `~/.openclaw/hooks/<id>` 下。
解析符號連結後，每個 `openclaw.hooks` 條目必須保留在套件目錄內；跳脫的條目會被拒絕。

安全性說明：`openclaw hooks install` 使用 `npm install --ignore-scripts` 安裝相依性
（無生命週期指令碼）。請保持 hook pack 相依性樹為「純 JS/TS」，並避免依賴 `postinstall` 建置的套件。

## Hook 結構

### HOOK.md 格式

`HOOK.md` 檔案包含 YAML frontmatter 中的中繼資料以及 Markdown 文件：

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
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

- **`emoji`**：顯示 CLI 的表情符號（例如 `"💾"`）
- **`events`**：要監聽的事件陣列（例如 `["command:new", "command:reset"]`）
- **`export`**：要使用的具名匯出（預設為 `"default"`）
- **`homepage`**：文件 URL
- **`requires`**：可選需求
  - **`bins`**：PATH 中必要的二進位檔（例如 `["git", "node"]`）
  - **`anyBins`**：這些二進位檔中至少必須有一個存在
  - **`env`**：必要的環境變數
  - **`config`**：必要的設定路徑（例如 `["workspace.dir"]`）
  - **`os`**：必要的平台（例如 `["darwin", "linux"]`）
- **`always`**：略過資格檢查（布林值）
- **`install`**：安裝方法（對於內建 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### 處理器實作

`handler.ts` 檔案匯出一個 `HookHandler` 函式：

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

#### 事件內容

每個事件包含：

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway' | 'message',
  action: string,              // e.g., 'new', 'reset', 'stop', 'received', 'sent'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    // Command events:
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: OpenClawConfig,
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

### 工作階段事件

- **`session:compact:before`**：緊接在壓縮總結歷史之前
- **`session:compact:after`**：壓縮完成並包含總結中繼資料之後

內部 hook 載荷會將這些事件作為 `type: "session"` 發出，並帶有 `action: "compact:before"` / `action: "compact:after"`；監聽器則使用上述組合鍵進行訂閱。
特定的處理程序註冊使用字面鍵格式 `${type}:${action}`。對於這些事件，請註冊 `session:compact:before` 和 `session:compact:after`。

### Agent 事件

- **`agent:bootstrap`**：在注入工作區引導檔案之前（hook 可變更 `context.bootstrapFiles`）

### Gateway 事件

Gateway 啟動時觸發：

- **`gateway:startup`**：在通道啟動且 hook 載入之後

### 訊息事件

接收或傳送訊息時觸發：

- **`message`**：所有訊息事件（一般監聽器）
- **`message:received`**：當從任何通道收到傳入訊息時。在媒體理解之前的處理早期觸發。內容可能包含原始佔位符，例如 `<media:audio>`，用於尚未處理的媒體附件。
- **`message:transcribed`**：當訊息已完全處理時，包括音訊轉錄和連結理解。此時，`transcript` 包含音訊訊息的完整轉錄文字。當您需要存取已轉錄的音訊內容時，請使用此 hook。
- **`message:preprocessed`**：在所有媒體和連結理解完成後，為每條訊息觸發，讓 hook 在 agent 看到訊息之前，能夠存取完全豐富的內容（轉錄、圖片描述、連結摘要）。
- **`message:sent`**：當傳出訊息成功傳送時

#### 訊息事件內容

訊息事件包含關於該訊息的豐富內容：

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
    threadId?: string,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
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
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
}

// message:preprocessed context
{
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  isGroup?: boolean,
  groupId?: string,
}
```

#### 範例：訊息記錄器 Hook

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) =>
  event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) =>
  event.type === "message" && event.action === "sent";

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

這些 hooks 不是事件流監聽器；它們讓外掛程式在 OpenClaw 持久化工具結果之前，同步調整工具結果。

- **`tool_result_persist`**：在將工具結果寫入工作階段轉錄之前轉換工具結果。必須是同步的；回傳更新後的工具結果載荷或 `undefined` 以保持不變。請參閱 [Agent Loop](/zh-Hant/concepts/agent-loop)。

### 外掛程式 Hook 事件

透過外掛程式 Hook 執行器公開的壓縮生命週期 Hook：

- **`before_compaction`**：在壓縮前運行，包含計數/Token 元資料
- **`after_compaction`**：在壓縮後運行，包含壓縮摘要元資料

### 未來事件

計畫中的事件類型：

- **`session:start`**：當新工作階段開始時
- **`session:end`**：當工作階段結束時
- **`agent:error`**：當代理程式遇到錯誤時

## 建立自訂 Hook

### 1. 選擇位置

- **工作區 Hook** (`<workspace>/hooks/`)：針對各個代理程式，優先順序最高
- **受管理的 Hook** (`~/.openclaw/hooks/`)：跨工作區共享

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

### 新設定格式 (推薦)

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

Hook 可以擁有自訂設定：

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

從額外目錄載入 Hook：

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

### 舊版設定格式 (仍支援)

舊的設定格式為了向後相容仍然可以使用：

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

注意：`module` 必須是相對於工作區的路徑。絕對路徑以及工作區外部的路徑存取將被拒絕。

**遷移**：新 Hook 請使用新的探索式系統。舊版處理程式會在基於目錄的 Hook 之後載入。

## CLI 指令

### 列出 Hook

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

### 檢查符合資格

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

當您發出 `/new` 時，將工作階段內容儲存至記憶體。

**事件**：`command:new`

**需求**：必須設定 `workspace.dir`

**輸出**：`<workspace>/memory/YYYY-MM-DD-slug.md` (預設為 `~/.openclaw/workspace`)

**功能**：

1. 使用重設前的工作階段項目來定位正確的逐字稿
2. 提取對話的最後 15 行
3. 使用 LLM 產生描述性的檔案名稱 slug
4. 將工作階段元資料儲存至帶有日期的記憶體檔案

**輸出示例**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**檔案名稱示例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (如果 slug 產生失敗的後備時間戳記)

**啟用**：

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的引導檔案（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**事件**：`agent:bootstrap`

**需求**：必須配置 `workspace.dir`

**輸出**：不寫入檔案；引導上下文僅在記憶體中修改。

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

**注意**：

- 路徑是相對於工作區解析的。
- 檔案必須保留在工作區內（經 realpath 檢查）。
- 僅載入可識別的引導檔案基名。
- 子代理允許清單被保留（僅限 `AGENTS.md` 和 `TOOLS.md`）。

**啟用**：

```bash
openclaw hooks enable bootstrap-extra-files
```

### command-logger

將所有命令事件記錄到集中式稽核檔案中。

**事件**：`command`

**需求**：無

**輸出**：`~/.openclaw/logs/commands.log`

**功能**：

1. 捕獲事件詳細資訊（命令動作、時間戳記、會話金鑰、發送者 ID、來源）
2. 以 JSONL 格式附加到日誌檔案
3. 在背景中靜默運行

**範例日誌條目**：

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**查看日誌**：

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

當閘道啟動時（通道啟動後）執行 `BOOT.md`。
必須啟用內部 Hook 才能運行此功能。

**事件**：`gateway:startup`

**需求**：必須配置 `workspace.dir`

**功能**：

1. 從您的工作區讀取 `BOOT.md`
2. 透過代理運行器執行指令
3. 透過訊息工具發送任何請求的傳出訊息

**啟用**：

```bash
openclaw hooks enable boot-md
```

## 最佳實踐

### 保持處理器快速

Hook 在命令處理期間運行。請保持它們輕量化：

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

始終包裝有風險的操作：

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

如果事件不相關，則提前返回：

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### 使用特定事件金鑰

盡可能在元資料中指定確切事件：

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

列出所有已發現的 Hook：

```bash
openclaw hooks list --verbose
```

### 檢查註冊

在您的處理器中，記錄其被調用的時機：

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

在輸出中尋找缺失的需求。

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

單獨測試您的處理器：

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
- **`src/hooks/hooks-status.ts`**：狀態回報
- **`src/hooks/loader.ts`**：動態模組載入器
- **`src/cli/hooks-cli.ts`**：CLI 指令
- **`src/gateway/server-startup.ts`**：在閘道啟動時載入 Hooks
- **`src/auto-reply/reply/commands-core.ts`**：觸發指令事件

### 探索流程

```
Gateway startup
    ↓
Scan directories (workspace → managed → bundled)
    ↓
Parse HOOK.md files
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

### 未探索到 Hook

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

3. 列出所有已探索的 Hooks：

   ```bash
   openclaw hooks list
   ```

### Hook 不符合資格

檢查需求：

```bash
openclaw hooks info my-hook
```

尋找遺漏：

- 執行檔 (檢查 PATH)
- 環境變數
- 設定值
- 作業系統相容性

### Hook 未執行

1. 驗證 Hook 已啟用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重新啟動您的閘道程序以便重新載入 Hooks。

3. 檢查閘道記錄檔中的錯誤：

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### 處理常式錯誤

檢查 TypeScript/import 錯誤：

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

1. 建立 Hook 目錄：

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

**遷移的好處**：

- 自動探索
- CLI 管理
- 資格檢查
- 更好的文件
- 一致的結構

## 另請參閱

- [CLI 參考：hooks](/zh-Hant/cli/hooks)
- [內建 Hooks 說明文件](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/zh-Hant/automation/webhook)
- [設定](/zh-Hant/gateway/configuration#hooks)

import en from "/components/footer/en.mdx";

<en />
