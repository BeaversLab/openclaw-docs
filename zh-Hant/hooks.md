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
- **Webhooks**：外部 HTTP webhook，可讓其他系統在 OpenClaw 中觸發工作。請參閱 [Webhook Hooks](/zh-Hant/automation/webhook) 或使用 `openclaw webhooks` 取得 Gmail 輔助命令。

Hook 也可以打包在插件內；請參閱 [Plugins](/zh-Hant/plugin#plugin-hooks)。

常見用途：

- 當您重設工作階段時儲存記憶體快照
- 保留命令的稽核記錄以進行疑難排解或合規性檢查
- 當工作階段開始或結束時觸發後續的自動化
- 當事件觸發時，將檔案寫入代理程式工作區或呼叫外部 API

如果您能編寫小型 TypeScript 函式，就能編寫 hook。Hook 會自動被探索，而您可以透過 CLI 啟用或停用它們。

## 概觀

Hook 系統允許您：

- 當發出 `/new` 時，將工作階段內容儲存到記憶體
- 記錄所有命令以供稽核
- 在代理程式生命週期事件上觸發自訂自動化
- 無需修改核心程式碼即可擴展 OpenClaw 的行為

## 快速入門

### 內建 Hooks

OpenClaw 附帶四個會自動被發現的內建 hooks：

- **💾 session-memory**：當您發出 `/new` 時，將會話上下文儲存到您的 agent 工作區（預設 `~/.openclaw/workspace/memory/`）
- **📝 command-logger**：將所有指令事件記錄到 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**：在閘道啟動時執行 `BOOT.md`（需要啟用內部 hooks）
- **😈 soul-evil**：在清除視窗內或隨機將注入的 `SOUL.md` 內容替換為 `SOUL_EVIL.md`

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

獲取詳細資訊：

```bash
openclaw hooks info session-memory
```

### 入門導覽

在上線期間 (`openclaw onboard`)，系統會提示您啟用建議的 hooks。精靈會自動探索符合資格的 hooks 並將其列出供選擇。

## Hook 探索

Hooks 會從三個目錄自動探索（按優先順序）：

1. **工作區 hooks**：`<workspace>/hooks/` (每個代理，優先順序最高)
2. **受管 hooks**：`~/.openclaw/hooks/` (使用者安裝，跨工作區共享)
3. **內建 hooks**：`<openclaw>/dist/hooks/bundled/` (隨 OpenClaw 附帶)

受管 hook 目錄可以是**單一 hook** 或 **hook 套件** (package 目錄)。

每個 hook 都是一個包含以下內容的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook 套件

Hook 套件是標準的 npm 套件，透過 `openclaw.hooks` 中的
`package.json` 匯出一或多個 hooks。請使用以下指令安裝：

```bash
openclaw hooks install <path-or-spec>
```

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

每個條目都指向一個包含 `HOOK.md` 和 `handler.ts`（或 `index.ts`）的 hook 目錄。
Hook 套件可以包含相依性；它們將被安裝在 `~/.openclaw/hooks/<id>` 下。

## Hook 結構

### HOOK.md 格式

`HOOK.md` 檔案包含 YAML frontmatter 中的元資料以及 Markdown 文件：

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

### 元資料欄位

`metadata.openclaw` 物件支援：

- **`emoji`**：CLI 的顯示表情符號（例如 `"💾"`）
- **`events`**：要監聽的事件陣列（例如 `["command:new", "command:reset"]`）
- **`export`**：要使用的具名匯出（預設為 `"default"`）
- **`homepage`**：文件 URL
- **`requires`**: 可選需求
  - **`bins`**: PATH 中的必要二進位檔案（例如 `["git", "node"]`）
  - **`anyBins`**: 這些二進位檔案中至少必須存在一個
  - **`env`**: 必要的環境變數
  - **`config`**: 必要的配置路徑（例如 `["workspace.dir"]`）
  - **`os`**: 必要的平台（例如 `["darwin", "linux"]`）
- **`always`**: 繞過資格檢查（布林值）
- **`install`**: 安裝方法（對於內掛 hook：`[{"id":"bundled","kind":"bundled"}]`）

### 處理器實作

`handler.ts` 檔案匯出一個 `HookHandler` 函數：

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

#### 事件上下文

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

當發出代理指令時觸發：

- **`command`**：所有指令事件（通用監聽器）
- **`command:new`**：當發出 `/new` 指令時
- **`command:reset`**：當發出 `/reset` 指令時
- **`command:stop`**：當發出 `/stop` 指令時

### 代理事件

- **`agent:bootstrap`**：在工作區引導檔案注入之前（Hook 可能會變更 `context.bootstrapFiles`）

### 閘道事件

當閘道啟動時觸發：

- **`gateway:startup`**：在通道啟動並載入 Hook 之後

### 工具結果 Hook（外掛程式 API）

這些 Hook 不是事件串流監聽器；它們允許外掛程式在 OpenClaw 持久化工具結果之前同步調整這些結果。

- **`tool_result_persist`**：在工具結果寫入會話紀錄之前進行轉換。必須是同步的；回傳更新後的工具結果承載資料，或回傳 `undefined` 以保持原樣。請參閱 [Agent Loop](/zh-Hant/concepts/agent-loop)。

### 未來事件

規劃中的事件類型：

- **`session:start`**：當新工作階段開始時
- **`session:end`**：當工作階段結束時
- **`agent:error`**：當代理程式遭遇錯誤時
- **`message:sent`**：當傳送訊息時
- **`message:received`**：當接收訊息時

## 建立自訂 Hooks

### 1. 選擇位置

- **工作區 hooks** (`<workspace>/hooks/`)：針對個別代理程式，優先順序最高
- **受控 hooks** (`~/.openclaw/hooks/`)：跨工作區共享

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

### 新設定格式（建議）

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

從額外的目錄載入 hooks：

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

**遷移**：請針對新的 hooks 使用新的探索式系統。舊版的處理程式會在基於目錄的 hooks 之後載入。

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

## 內建 Hooks

### session-memory

當您發出 `/new` 時，將 session 語境儲存至記憶體。

**事件**：`command:new`

**需求**：必須設定 `workspace.dir`

**輸出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（預設為 `~/.openclaw/workspace`）

**功能**：

1. 使用重置前的會話條目來定位正確的對話紀錄
2. 提取最後 15 行對話
3. 使用 LLM 生成描述性的檔案名稱 slug
4. 將會話元數據儲存到帶有日期的記憶檔案中

**範例輸出**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**檔案名稱範例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` （如果 slug 生成失敗，則使用後備時間戳記）

**啟用**：

```bash
openclaw hooks enable session-memory
```

### command-logger

將所有指令事件記錄到集中的稽核檔案中。

**事件**： `command`

**需求**：無

**輸出**： `~/.openclaw/logs/commands.log`

**功能說明**：

1. 擷取事件詳細資訊（指令動作、時間戳記、會話金鑰、發送者 ID、來源）
2. 以 JSONL 格式附加到日誌檔案
3. 在背景中靜默執行

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

### soul-evil

在清除窗口期間或隨機機會下，將注入的 `SOUL.md` 內容與 `SOUL_EVIL.md` 交換。

**事件**：`agent:bootstrap`

**文件**：[SOUL Evil Hook](/zh-Hant/hooks/soul-evil)

**輸出**：不寫入檔案；交換僅在記憶體中進行。

**啟用**：

```bash
openclaw hooks enable soul-evil
```

**配置**：

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

在閘道啟動時（頻道啟動後）執行 `BOOT.md`。
必須啟用內部 hooks 才能執行此操作。

**事件**：`gateway:startup`

**需求**：必須設定 `workspace.dir`

**功能**：

1. 從您的工作區讀取 `BOOT.md`
2. 透過代理執行器執行指令
3. 透過訊息工具發送任何請求的傳出訊息

**啟用**：

```bash
openclaw hooks enable boot-md
```

## 最佳實踐

### 保持處理程序快速

Hooks 在指令處理期間運行。請保持輕量化：

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

### 使用特定的事件鍵

盡可能在元數據中指定確切的事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而不是：

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

在您的處理器中，記錄被呼叫的時機：

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

### 閘道記錄

監控閘道記錄以查看 Hook 執行情況：

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

- **`src/hooks/types.ts`**：類型定義
- **`src/hooks/workspace.ts`**：目錄掃描與載入
- **`src/hooks/frontmatter.ts`**：HOOK.md 元數據解析
- **`src/hooks/config.ts`**：資格檢查
- **`src/hooks/hooks-status.ts`**: 狀態報告
- **`src/hooks/loader.ts`**: 動態模組載入器
- **`src/cli/hooks-cli.ts`**: CLI 指令
- **`src/gateway/server-startup.ts`**: 在閘道啟動時載入 hooks
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

### 未發現 Hook

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

3. 列出所有發現的 hooks：
   ```bash
   openclaw hooks list
   ```

### Hook 不符合資格

檢查需求：

```bash
openclaw hooks info my-hook
```

尋找缺失項目：

- 二進位檔案（檢查 PATH）
- 環境變數
- 設定值
- 作業系統相容性

### Hook 未執行

1. 驗證 hook 是否已啟用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重新啟動您的閘道程序以重新載入 hooks。

3. 檢查閘道日誌中的錯誤：
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

3. 更新配置：

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

4. 驗證並重新啟動您的 gateway 進程：
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
- [配置](/zh-Hant/gateway/configuration#hooks)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
