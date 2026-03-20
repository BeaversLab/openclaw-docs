---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks provide an extensible event-driven system for automating actions in response to agent commands and events. Hooks are automatically discovered from directories and can be managed via CLI commands, similar to how skills work in OpenClaw.

## Getting Oriented

Hooks are small scripts that run when something happens. There are two kinds:

- **Hooks** (this page): run inside the Gateway when agent events fire, like `/new`, `/reset`, `/stop`, or lifecycle events.
- **Webhooks**: external HTTP webhooks that let other systems trigger work in OpenClaw. See [Webhook Hooks](/zh-Hant/automation/webhook) or use `openclaw webhooks` for Gmail helper commands.

Hooks can also be bundled inside plugins; see [Plugins](/zh-Hant/plugin#plugin-hooks).

Common uses:

- Save a memory snapshot when you reset a session
- Keep an audit trail of commands for troubleshooting or compliance
- Trigger follow-up automation when a session starts or ends
- Write files into the agent workspace or call external APIs when events fire

If you can write a small TypeScript function, you can write a hook. Hooks are discovered automatically, and you enable or disable them via the CLI.

## Overview

The hooks system allows you to:

- Save session context to memory when `/new` is issued
- Log all commands for auditing
- Trigger custom automations on agent lifecycle events
- Extend OpenClaw's behavior without modifying core code

## Getting Started

### Bundled Hooks

OpenClaw ships with four bundled hooks that are automatically discovered:

- **💾 session-memory**: Saves session context to your agent workspace (default `~/.openclaw/workspace/memory/`) when you issue `/new`
- **📝 command-logger**: Logs all command events to `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: Runs `BOOT.md` when the gateway starts (requires internal hooks enabled)
- **😈 soul-evil**: 在清除期間或隨機機會下，將注入的 `SOUL.md` 內容與 `SOUL_EVIL.md` 交換

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

### 上手

在上手過程 (`openclaw onboard`) 中，系統會提示您啟用建議的 hooks。精靈會自動發現合格的 hooks 並將其呈現出來供選擇。

## Hook 探索

Hooks 會從三個目錄自動探索（按優先順序）：

1. **Workspace hooks**: `<workspace>/hooks/` (每個 agent，最高優先順序)
2. **Managed hooks**: `~/.openclaw/hooks/` (使用者安裝，跨 workspace 共用)
3. **Bundled hooks**: `<openclaw>/dist/hooks/bundled/` (隨 OpenClaw 附帶)

Managed hook 目錄可以是 **單一 hook** 或 **hook 套件** (package directory)。

每個 hook 都是一個包含以下內容的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook 套件 (npm/archives)

Hook 套件是標準的 npm 套件，透過 `package.json` 中的 `openclaw.hooks` 匯出一或多個 hooks。請使用以下指令安裝：

```bash
openclaw hooks install <path-or-spec>
```

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

每個條目都指向一個包含 `HOOK.md` 和 `handler.ts` (或 `index.ts`) 的 hook 目錄。
Hook 套件可以附帶相依套件；它們將會安裝在 `~/.openclaw/hooks/<id>` 下。

## Hook 結構

### HOOK.md 格式

`HOOK.md` 檔案包含 YAML 前置資料中的元數據加上 Markdown 文件：

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/hooks#my-hook
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

### 元數據欄位

`metadata.openclaw` 物件支援：

- **`emoji`**: 顯示給 CLI 使用的 emoji (例如 `"💾"`)
- **`events`**: 要監聽的事件陣列 (例如 `["command:new", "command:reset"]`)
- **`export`**: 要使用的具名匯出 (預設為 `"default"`)
- **`homepage`**: 文件 URL
- **`requires`**: 可選需求
  - **`bins`**: PATH 中必要的二進位檔 (例如 `["git", "node"]`)
  - **`anyBins`**：這些二進位檔案中必須至少存在一個
  - **`env`**：必要的環境變數
  - **`config`**：必要的設定路徑（例如 `["workspace.dir"]`）
  - **`os`**：必要的平台（例如 `["darwin", "linux"]`）
- **`always`**：略過資格檢查（布林值）
- **`install`**：安裝方式（針對內建的 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### 處理器實作

`handler.ts` 檔案匯出一個 `HookHandler` 函式：

```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";

const myHandler: HookHandler = async (event) => {
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

#### 事件情境

每個事件包含：

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway',
  action: string,              // e.g., 'new', 'reset', 'stop'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: OpenClawConfig
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

### 代理程式事件

- **`agent:bootstrap`**：在注入工作區啟動檔案之前（hooks 可能會變更 `context.bootstrapFiles`）

### 閘道事件

當閘道啟動時觸發：

- **`gateway:startup`**：在通道啟動且 hooks 載入之後

### 工具結果 Hooks (Plugin API)

這些 hooks 並非事件串流監聽器；它們讓外掛程式在 OpenClaw 將工具結果持久化之前，能夠同步調整工具結果。

- **`tool_result_persist`**：在將工具結果寫入至工作階段記錄之前進行轉換。必須為同步；回傳更新後的工具結果載荷，或回傳 `undefined` 以保持原樣。請參閱 [Agent Loop](/zh-Hant/concepts/agent-loop)。

### 未來的事件

計畫中的事件類型：

- **`session:start`**：當新的工作階段開始時
- **`session:end`**：當工作階段結束時
- **`agent:error`**：當代理程式遇到錯誤時
- **`message:sent`**：當訊息已傳送時
- **`message:received`**: 當收到訊息時

## 建立自訂 Hooks

### 1. 選擇位置

- **工作區 hooks** (`<workspace>/hooks/`): 每個代理專用，優先順序最高
- **受管理的 hooks** (`~/.openclaw/hooks/`): 在工作區之間共享

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
import type { HookHandler } from "../../src/hooks/hooks.js";

const handler: HookHandler = async (event) => {
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

Hooks 可以擁有自訂設定：

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

從其他目錄載入 hooks：

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

舊的設定格式仍可運作以維持向後相容性：

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

**遷移**: 請為新的 hooks 使用新的探索式系統。舊版處理器會在基於目錄的 hooks 之後載入。

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

## 內建 Hooks

### session-memory

當您發出 `/new` 時，將會話內容儲存至記憶體。

**事件**: `command:new`

**需求**: 必須設定 `workspace.dir`

**輸出**: `<workspace>/memory/YYYY-MM-DD-slug.md` (預設為 `~/.openclaw/workspace`)

**作用**:

1. 使用重置前的會話項目來定位正確的逐字稿
2. 擷取最後 15 行對話
3. 使用 LLM 產生描述性檔名代碼
4. 將會詢詮釋資料儲存至帶有日期的記憶體檔案

**輸出示例**:

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**檔名範例**:

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (如果代碼產生失敗則使用後備時間戳記)

**啟用**:

```bash
openclaw hooks enable session-memory
```

### command-logger

將所有指令事件記錄到集中的稽核檔案。

**事件**: `command`

**需求**: 無

**輸出**: `~/.openclaw/logs/commands.log`

**作用**:

1. 擷取事件詳細資訊 (指令動作、時間戳記、會話金鑰、發送者 ID、來源)
2. 以 JSONL 格式附加至日誌檔案
3. 在背景中靜默執行

**日誌範例**:

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**檢視日誌**:

```bash
# View recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print with jq
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**啟用**:

```bash
openclaw hooks enable command-logger
```

### soul-evil

在清除視窗期間或隨機將注入的 `SOUL.md` 內容替換為 `SOUL_EVIL.md`。

**事件**: `agent:bootstrap`

**文件**: [SOUL Evil Hook](/zh-Hant/hooks/soul-evil)

**輸出**: 未寫入任何檔案；交換僅在記憶體中進行。

**啟用**:

```bash
openclaw hooks enable soul-evil
```

**配置**:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

### boot-md

當閘道啟動時（在通道啟動後）執行 `BOOT.md`。
必須啟用內部 Hook 此功能才能運作。

**事件**: `gateway:startup`

**需求**: 必須已配置 `workspace.dir`

**功能**:

1. 從您的工作區讀取 `BOOT.md`
2. 透過代理執行器執行指令
3. 透過訊息工具傳送任何請求的輸出訊息

**啟用**:

```bash
openclaw hooks enable boot-md
```

## 最佳實踐

### 保持處理器快速

Hook 在指令處理期間運作。請保持它們輕量化：

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

始終將風險操作包裝起來：

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

### 提前過濾事件

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

### 使用特定事件鍵

盡可能在元數據中指定確切事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而非：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## 除錯

### 啟用 Hook 記錄

閘道會在啟動時記錄 Hook 的載入情況：

```
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 檢查探索

列出所有探索到的 Hook：

```bash
openclaw hooks list --verbose
```

### 檢查註冊

在您的處理器中，記錄被呼叫時的狀態：

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

在輸出中尋找缺少的需求。

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
import { createHookEvent } from "./src/hooks/hooks.js";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = createHookEvent("command", "new", "test-session", {
    foo: "bar",
  });

  await myHandler(event);

  // Assert side effects
});
```

## 架構

### 核心元件

- **`src/hooks/types.ts`**: 類型定義
- **`src/hooks/workspace.ts`**: 目錄掃描與載入
- **`src/hooks/frontmatter.ts`**: HOOK.md 元數據解析
- **`src/hooks/config.ts`**: 資格檢查
- **`src/hooks/hooks-status.ts`**: 狀態報告
- **`src/hooks/loader.ts`**: 動態模組載入器
- **`src/cli/hooks-cli.ts`**: CLI 指令
- **`src/gateway/server-startup.ts`**: 在閘道啟動時載入 Hook
- **`src/auto-reply/reply/commands-core.ts`**: 觸發指令事件

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

3. 列出所有探索到的 Hook：
   ```bash
   openclaw hooks list
   ```

### Hook 不符合資格

檢查需求：

```bash
openclaw hooks info my-hook
```

尋找缺少的：

- 二進位檔案（檢查 PATH）
- 環境變數
- 配置值
- 作業系統相容性

### Hook 未執行

1. 驗證 hook 已啟用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重新啟動您的 gateway 流程以重新載入 hooks。

3. 檢查 gateway 記錄以尋找錯誤：
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

4. 驗證並重新啟動您的 gateway 流程：
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

- [CLI 參考資料：hooks](/zh-Hant/cli/hooks)
- [隨附 Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/zh-Hant/automation/webhook)
- [設定](/zh-Hant/gateway/configuration#hooks)

import en from "/components/footer/en.mdx";

<en />
