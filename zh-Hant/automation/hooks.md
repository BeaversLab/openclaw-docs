---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# 鉤子

鉤子提供了一個可擴充的事件驅動系統，用於自動化回應代理指令和事件的動作。鉤子會從目錄中自動發現，並且可以透過 CLI 指令進行管理，類似於 OpenClaw 中技能的工作方式。

## 快速入門

鉤子是在發生某些情況時執行的小型腳本。有兩種類型：

- **鉤子**（本頁）：當觸發代理事件時在閘道內部執行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhooks**：讓其他系統在 OpenClaw 中觸發工作的外部 HTTP webhooks。請參閱 [Webhook Hooks](/zh-Hant/automation/webhook) 或使用 `openclaw webhooks` 取得 Gmail 助手指令。

鉤子也可以打包在插件內；請參閱 [Plugins](/zh-Hant/tools/plugin#plugin-hooks)。

常見用途：

- 當您重設工作階段時儲存記憶快照
- 保留指令的稽核紀錄以進行疑難排解或合規性檢查
- 當工作階段開始或結束時觸發後續的自動化
- 在觸發事件時將檔案寫入代理工作區或呼叫外部 API

如果您能撰寫小型 TypeScript 函式，就能撰寫鉤子。鉤子會自動被發現，而您可以透過 CLI 啟用或停用它們。

## 概覽

鉤子系統允許您：

- 當發出 `/new` 時，將工作階段內容儲存到記憶中
- 記錄所有指令以供稽核
- 在代理生命週期事件上觸發自訂自動化
- 擴充 OpenClaw 的行為而無需修改核心程式碼

## 開始使用

### 內建的鉤子

OpenClaw 附帶四個會自動被發現的內建鉤子：

- **💾 session-memory**：當您發出 `/new` 時，將工作階段內容儲存到您的代理工作區（預設為 `~/.openclaw/workspace/memory/`）
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

### 入門導覽

在入門導覽（`openclaw onboard`）期間，系統會提示您啟用推薦的 hooks。精靈會自動探索符合資格的 hooks 並供您選取。

## Hook 探索

Hooks 會從三個目錄自動探索（按優先順序）：

1. **Workspace hooks**：`<workspace>/hooks/`（每個代理程式，最高優先順序）
2. **Managed hooks**：`~/.openclaw/hooks/`（使用者安裝，跨工作區共享）
3. **Bundled hooks**：`<openclaw>/dist/hooks/bundled/`（隨 OpenClaw 附帶）

受管理的 hook 目錄可以是**單一 hook** 或 **hook pack**（套件目錄）。

每個 hook 是一個包含以下內容的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook Packs (npm/archives)

Hook packs 是標準的 npm 套件，透過 `openclaw.hooks` 在 `package.json` 中匯出一或多個 hooks。使用以下方式安裝：

```bash
openclaw hooks install <path-or-spec>
```

Npm 規格僅限 registry（套件名稱 + 可選的確切版本或 dist-tag）。
Git/URL/file 規格和 semver 範圍會被拒絕。

純規格和 `@latest` 會保持在穩定版軌道。如果 npm 將其中任一個解析為搶先版，OpenClaw 會停止並要求您明確選擇加入搶先版標籤，例如 `@beta`/`@rc` 或確切的搶先版版本。

範例 `package.json`：

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
Hook packs 可以附帶相依套件；它們將被安裝在 `~/.openclaw/hooks/<id>` 下。
解析符號連結後，每個 `openclaw.hooks` 條目必須保留在套件目錄內；逃脫的條目會被拒絕。

安全性提示：`openclaw hooks install` 使用 `npm install --ignore-scripts` 安裝相依套件
（無生命週期腳本）。請保持 hook pack 相依樹為「純 JS/TS」，並避免依賴 `postinstall` 建置的套件。

## Hook 結構

### HOOK.md 格式

`HOOK.md` 檔案包含 YAML frontmatter 中的元資料以及 Markdown 文件：

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

### 元資料欄位

`metadata.openclaw` 物件支援：

- **`emoji`**：顯示給 CLI 使用的表情符號（例如 `"💾"`）
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
- **`install`**：安裝方法（對於內建的 hooks：`[{"id":"bundled","kind":"bundled"}]`）

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

#### 事件上下文

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

當發出代理程式指令時觸發：

- **`command`**：所有指令事件（一般監聽器）
- **`command:new`**：當發出 `/new` 指令時
- **`command:reset`**：當發出 `/reset` 指令時
- **`command:stop`**：當發出 `/stop` 指令時

### 階段事件

- **`session:compact:before`**：在壓縮 總結歷史紀錄之前
- **`session:compact:after`**：在壓縮完成並包含總結元資料之後

內部 hook 載荷將其作為 `type: "session"` 與 `action: "compact:before"` / `action: "compact:after"` 一起發送；監聽器使用上述組合鍵進行訂閱。
特定處理程序的註冊使用字面鍵格式 `${type}:${action}`。對於這些事件，請註冊 `session:compact:before` 和 `session:compact:after`。

### 代理程式事件

- **`agent:bootstrap`**：在工作區引導檔案注入之前（hooks 可能會變異 `context.bootstrapFiles`）

### 閘道事件

當閘道啟動時觸發：

- **`gateway:startup`**：在通道啟動並載入 hooks 之後

### 訊息事件

當接收或發送訊息時觸發：

- **`message`**：所有訊息事件（一般監聽器）
- **`message:received`**：當從任何通道接收到傳入訊息時。在媒體理解之前的處理早期觸發。內容可能包含原始佔位符，例如尚未處理的媒體附件的 `<media:audio>`。
- **`message:transcribed`**：當訊息已完全處理時，包括音訊轉錄和連結理解。此時，`transcript` 包含音訊訊息的完整轉錄文字。當您需要存取已轉錄的音訊內容時，請使用此 hook。
- **`message:preprocessed`**：在所有媒體 + 連結理解完成後，對於每個訊息都會觸發，讓 hooks 在代理程式看到訊息之前，能夠存取完全充實的內容（轉錄、圖片描述、連結摘要）。
- **`message:sent`**：當傳出訊息成功發送時

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

這些 hooks 不是事件串流監聽器；它們允許外掛程式在 OpenClaw 持久化工具結果之前，同步調整工具結果。

- **`tool_result_persist`**：在將工具結果寫入工作階段轉錄之前變換工具結果。必須是同步的；返回更新的工具結果載荷或 `undefined` 以保持原樣。請參閱 [Agent Loop](/zh-Hant/concepts/agent-loop)。

### 外掛程式 Hook 事件

透過外掛程式 hook 執行器公開的壓縮生命週期 hooks：

- **`before_compaction`**：在壓縮之前執行，並包含計數/Token 中繼資料
- **`after_compaction`**：在壓縮之後執行，並包含壓縮摘要中繼資料

### 未來事件

計畫中的事件類型：

- **`session:start`**：當新工作階段開始時
- **`session:end`**：當工作階段結束時
- **`agent:error`**：當代理程式遇到錯誤時

## 建立自訂 Hooks

### 1. 選擇位置

- **工作區 hooks** (`<workspace>/hooks/`)：針對每個代理程式，優先順序最高
- **受管理的 hooks** (`~/.openclaw/hooks/`)：在工作區之間共用

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

## 組態

### 新組態格式 (推薦)

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

### 各別 Hook 組態

Hooks 可以具有自訂組態：

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

### 額外表單

從額外表單載入 hooks：

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

### 舊版組態格式 (仍然支援)

舊的組態格式仍然可用於向後相容性：

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

注意：`module` 必須是相對於工作區的路徑。絕對路徑和在工作區之外的遍歷操作將被拒絕。

**移轉**：請對新的 hooks 使用新的探索式系統。舊版處理程式會在基於目錄的 hooks 之後載入。

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

## 內建 hook 參考資料

### session-memory

當您發出 `/new` 時，將工作階段內容儲存至記憶體。

**事件**：`command:new`

**需求**：必須設定 `workspace.dir`

**輸出**：`<workspace>/memory/YYYY-MM-DD-slug.md` (預設為 `~/.openclaw/workspace`)

**功能說明**：

1. 使用重設前的工作階段項目來找出正確的逐字稿
2. 擷取最後 15 行對話
3. 使用 LLM 產生描述性的檔案名稱 slug
4. 將工作階段中繼資料儲存到附有日期的記憶體檔案中

**範例輸出**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**檔名範例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (如果 slug 產生失敗，則使用備用時間戳記)

**啟用**：

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的引導檔案（例如 monorepo-local `AGENTS.md` / `TOOLS.md`）。

**事件**：`agent:bootstrap`

**需求**：必須設定 `workspace.dir`

**輸出**：不寫入任何檔案；僅在記憶體中修改引導語境。

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
- 只會載入已識別的引導檔案基本名稱。
- 子代理程式允許清單會被保留（僅限 `AGENTS.md` 和 `TOOLS.md`）。

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

1. 擷取事件詳細資料（指令動作、時間戳記、工作階段金鑰、傳送者 ID、來源）
2. 以 JSONL 格式附加至記錄檔
3. 在背景中靜默執行

**記錄範例**：

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

當閘道啟動時（通道啟動後）執行 `BOOT.md`。
必須啟用內部掛載此功能才能執行。

**事件**：`gateway:startup`

**需求**：必須設定 `workspace.dir`

**功能**：

1. 從您的工作區讀取 `BOOT.md`
2. 透過代理程式執行器執行指令
3. 透過訊息工具發送任何請求的輸出訊息

**啟用**：

```bash
openclaw hooks enable boot-md
```

## 最佳實踐

### 保持處理程式快速

掛載在指令處理期間執行。請保持輕量化：

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

總是將有風險的操作包裝起來：

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

### 提早過濾事件

如果事件不相關則提早返回：

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

### 啟用掛載記錄

閘道會在啟動時記錄掛載載入情況：

```
Registered hook: session-memory -> command:new
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

在您的處理程式中，記錄被呼叫的時機：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### 驗證資格

檢查掛載為何不符合資格：

```bash
openclaw hooks info my-hook
```

尋找輸出中遺失的需求。

## 測試

### 閘道記錄

監控閘道記錄以查看掛載執行情況：

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### 直接測試掛載

獨立測試您的處理程式：

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
- **`src/hooks/frontmatter.ts`**：HOOK.md 中繼資料解析
- **`src/hooks/config.ts`**：資格檢查
- **`src/hooks/hooks-status.ts`**：狀態回報
- **`src/hooks/loader.ts`**：動態模組載入器
- **`src/cli/hooks-cli.ts`**：CLI 指令
- **`src/gateway/server-startup.ts`**：在閘道啟動時載入 hooks
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

### Hook 未被探索

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

3. 列出所有已探索的 hooks：

   ```bash
   openclaw hooks list
   ```

### Hook 不符合資格

檢查需求：

```bash
openclaw hooks info my-hook
```

尋找缺失項目：

- 二元檔（檢查 PATH）
- 環境變數
- 組態值
- 作業系統相容性

### Hook 未執行

1. 驗證 hook 是否已啟用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重新啟動您的閘道程序以便重新載入 hooks。

3. 檢查閘道日誌中的錯誤：

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### 處理常式錯誤

檢查 TypeScript/匯入錯誤：

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 遷移指南

### 從舊版組態到探索

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

3. 更新組態：

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
- [隨附 Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/zh-Hant/automation/webhook)
- [組態](/zh-Hant/gateway/configuration#hooks)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
