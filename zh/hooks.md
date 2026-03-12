---
summary: "Hooks：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks 提供了一个可扩展的事件驱动系统，用于自动执行响应代理命令和事件的操作。Hooks 会从目录中自动发现，并可以通过 CLI 命令进行管理，类似于技能在 OpenClaw 中的工作方式。

## 入门指南

Hooks 是在发生某些情况时运行的小型脚本。有两种类型：

- **Hooks**（本页面）：在代理事件触发时在网关内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP Webhooks，允许其他系统触发 OpenClaw 中的工作。请参阅 [Webhook Hooks](/zh/en/automation/webhook) 或使用 `openclaw webhooks` 获取 Gmail 辅助命令。

Hooks 也可以打包在插件内部；请参阅 [Plugins](/zh/en/plugin#plugin-hooks)。

常见用途：

- 重置会话时保存内存快照
- 保留命令的审计跟踪以便进行故障排除或合规检查
- 在会话开始或结束时触发后续自动化
- 在事件触发时将文件写入代理工作区或调用外部 API

如果您能编写一个小型 TypeScript 函数，就可以编写一个 hook。Hooks 会自动被发现，您可以通过 CLI 启用或禁用它们。

## 概述

Hooks 系统允许您：

- 当发出 `/new` 时，将会话上下文保存到内存
- 记录所有命令以进行审计
- 在代理生命周期事件上触发自定义自动化
- 在不修改核心代码的情况下扩展 OpenClaw 的行为

## 入门

### 内置 Hooks

OpenClaw 附带了四个自动发现的内置 hooks：

- **💾 session-memory**：当您发出 `/new` 时，将会话上下文保存到您的代理工作区（默认 `~/.openclaw/workspace/memory/`）
- **📝 command-logger**：将所有命令事件记录到 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**：在网关启动时运行 `BOOT.md`（需要启用内部 hooks）
- **😈 soul-evil**: 在清除窗口期间或随机机会下，将注入的 `SOUL.md` 内容与 `SOUL_EVIL.md` 交换

列出可用的 hooks：

```bash
openclaw hooks list
```

启用 hook：

```bash
openclaw hooks enable session-memory
```

检查 hook 状态：

```bash
openclaw hooks check
```

获取详细信息：

```bash
openclaw hooks info session-memory
```

### 入职引导

在入职引导（`openclaw onboard`）期间，系统会提示您启用推荐的 hooks。向导会自动发现符合条件的 hooks 并将其展示供选择。

## Hook 发现

Hooks 会从三个目录中自动发现（按优先级顺序）：

1. **工作区 hooks**: `<workspace>/hooks/` (每个代理，优先级最高)
2. **托管 hooks**: `~/.openclaw/hooks/` (用户安装，在工作区之间共享)
3. **内置 hooks**: `<openclaw>/dist/hooks/bundled/` (随 OpenClaw 附带)

托管的 hook 目录可以是**单个 hook** 或 **hook 包**（package 目录）。

每个 hook 是一个包含以下内容的目录：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook 包 (npm/archives)

Hook 包是标准的 npm 包，通过 `openclaw.hooks` 在 `package.json` 中导出一个或多个 hooks。使用以下命令安装它们：

```bash
openclaw hooks install <path-or-spec>
```

示例 `package.json`：

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "openclaw": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

每个条目指向一个包含 `HOOK.md` 和 `handler.ts` (或 `index.ts`) 的 hook 目录。
Hook 包可以附带依赖项；它们将被安装在 `~/.openclaw/hooks/<id>` 下。

## Hook 结构

### HOOK.md 格式

`HOOK.md` 文件包含 YAML frontmatter 中的元数据以及 Markdown 文档：

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

### 元数据字段

`metadata.openclaw` 对象支持：

- **`emoji`**: 用于 CLI 显示的表情符号 (例如 `"💾"`)
- **`events`**: 要监听的事件数组 (例如 `["command:new", "command:reset"]`)
- **`export`**: 要使用的命名导出 (默认为 `"default"`)
- **`homepage`**: 文档 URL
- **`requires`**: 可选要求
  - **`bins`**: PATH 中必需的二进制文件（例如 `["git", "node"]`）
  - **`anyBins`**: 至少必须存在这些二进制文件中的一个
  - **`env`**: 必需的环境变量
  - **`config`**: 必需的配置路径（例如 `["workspace.dir"]`）
  - **`os`**: 必需的平台（例如 `["darwin", "linux"]`）
- **`always`**: 绕过资格检查（布尔值）
- **`install`**: 安装方法（对于打包的 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### 处理器实现

`handler.ts` 文件导出一个 `HookHandler` 函数：

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

每个事件包括：

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

## 事件类型

### 命令事件

当发出代理命令时触发：

- **`command`**: 所有命令事件（通用监听器）
- **`command:new`**: 当发出 `/new` 命令时
- **`command:reset`**: 当发出 `/reset` 命令时
- **`command:stop`**: 当发出 `/stop` 命令时

### 代理事件

- **`agent:bootstrap`**: 在注入工作区引导文件之前（hooks 可以修改 `context.bootstrapFiles`）

### 网关事件

当网关启动时触发：

- **`gateway:startup`**: 在通道启动并加载 hooks 之后

### 工具结果 Hooks (插件 API)

这些 hooks 不是事件流监听器；它们允许插件在 OpenClaw 持久化工具结果之前同步调整它们。

- **`tool_result_persist`**: 在将工具结果写入会话记录之前对其进行转换。必须是同步的；返回更新后的工具结果负载或 `undefined` 以保持原样。请参阅 [代理循环](/zh/en/concepts/agent-loop)。

### 未来事件

计划中的事件类型：

- **`session:start`**: 当新会话开始时
- **`session:end`**: 当会话结束时
- **`agent:error`**: 当代理遇到错误时
- **`message:sent`**: 当发送消息时
- **`message:received`**: 当接收到消息时

## 创建自定义 Hooks

### 1. 选择位置

- **工作区钩子** (`<workspace>/hooks/`)：按代理划分，优先级最高
- **托管钩子** (`~/.openclaw/hooks/`)：在工作区之间共享

### 2. 创建目录结构

```bash
mkdir -p ~/.openclaw/hooks/my-hook
cd ~/.openclaw/hooks/my-hook
```

### 3. 创建 HOOK.md

```markdown
---
name: my-hook
description: "Does something useful"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---

# My Custom Hook

This hook does something useful when you issue `/new`.
```

### 4. 创建 handler.ts

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

### 5. 启用并测试

```bash
# Verify hook is discovered
openclaw hooks list

# Enable it
openclaw hooks enable my-hook

# Restart your gateway process (menu bar app restart on macOS, or restart your dev process)

# Trigger the event
# Send /new via your messaging channel
```

## 配置

### 新配置格式（推荐）

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

### 按钩子配置

钩子可以具有自定义配置：

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

### 额外目录

从其他目录加载钩子：

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

### 旧配置格式（仍支持）

旧配置格式仍可正常工作以保持向后兼容：

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

**迁移**：新钩子请使用新的基于发现的系统。旧版处理程序在基于目录的钩子之后加载。

## CLI 命令

### 列出钩子

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

### 钩子信息

```bash
# Show detailed info about a hook
openclaw hooks info session-memory

# JSON output
openclaw hooks info session-memory --json
```

### 检查资格

```bash
# Show eligibility summary
openclaw hooks check

# JSON output
openclaw hooks check --json
```

### 启用/禁用

```bash
# Enable a hook
openclaw hooks enable session-memory

# Disable a hook
openclaw hooks disable command-logger
```

## 捆绑的钩子

### 会话记忆 (session-memory)

当您发出 `/new` 时，将会话上下文保存到内存中。

**事件**：`command:new`

**要求**：必须配置 `workspace.dir`

**输出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（默认为 `~/.openclaw/workspace`）

**功能**：

1. 使用重置前的会话条目来定位正确的记录
2. 提取最后 15 行对话
3. 使用 LLM 生成描述性的文件名标识符 (slug)
4. 将会话元数据保存到带日期的内存文件中

**输出示例**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**文件名示例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（如果标识符生成失败，则使用回退时间戳）

**启用**：

```bash
openclaw hooks enable session-memory
```

### 命令记录器 (command-logger)

将所有命令事件记录到集中式审计文件中。

**事件**：`command`

**要求**：无

**输出**：`~/.openclaw/logs/commands.log`

**功能**：

1. 捕获事件详细信息（命令动作、时间戳、会话密钥、发送者 ID、来源）
2. 以 JSONL 格式追加到日志文件
3. 在后台静默运行

**日志条目示例**：

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**查看日志**：

```bash
# View recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print with jq
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**启用**：

```bash
openclaw hooks enable command-logger
```

### 灵魂邪恶 (soul-evil)

在清除窗口期间或随机情况下，将注入的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。

**事件**：`agent:bootstrap`

**文档**：[SOUL Evil Hook](/zh/en/hooks/soul-evil)

**输出**：不写入文件；交换仅在内存中进行。

**启用**：

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

在网关启动时（通道启动后）运行 `BOOT.md`。
必须启用内部挂钩才能运行此操作。

**事件**：`gateway:startup`

**要求**：必须配置 `workspace.dir`

**功能**：

1. 从工作区读取 `BOOT.md`
2. 通过代理运行器运行指令
3. 通过消息工具发送任何请求的出站消息

**启用**：

```bash
openclaw hooks enable boot-md
```

## 最佳实践

### 保持处理程序快速

挂钩在命令处理期间运行。保持轻量：

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

### 优雅地处理错误

始终包装有风险的操作：

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

### 尽早过滤事件

如果事件不相关，尽早返回：

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### 使用特定事件键

尽可能在元数据中指定确切事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而不是：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## 调试

### 启用挂钩日志

网关在启动时记录挂钩加载：

```
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 检查发现

列出所有发现的挂钩：

```bash
openclaw hooks list --verbose
```

### 检查注册

在处理程序中，记录调用时间：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### 验证资格

检查挂钩不符合条件的原因：

```bash
openclaw hooks info my-hook
```

在输出中查找缺失的要求。

## 测试

### 网关日志

监控网关日志以查看挂钩执行：

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### 直接测试挂钩

单独测试处理程序：

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

## 架构

### 核心组件

- **`src/hooks/types.ts`**：类型定义
- **`src/hooks/workspace.ts`**：目录扫描和加载
- **`src/hooks/frontmatter.ts`**：HOOK.md 元数据解析
- **`src/hooks/config.ts`**：资格检查
- **`src/hooks/hooks-status.ts`**：状态报告
- **`src/hooks/loader.ts`**：动态模块加载器
- **`src/cli/hooks-cli.ts`**：CLI 命令
- **`src/gateway/server-startup.ts`**：在网关启动时加载挂钩
- **`src/auto-reply/reply/commands-core.ts`**：触发命令事件

### 发现流程

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

## 故障排除

### 未发现挂钩

1. 检查目录结构：

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. 验证 HOOK.md 格式：

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. 列出所有发现的挂钩：
   ```bash
   openclaw hooks list
   ```

### 挂钩不符合条件

检查要求：

```bash
openclaw hooks info my-hook
```

查找缺失的：

- 二进制文件（检查 PATH）
- 环境变量
- 配置值
- 操作系统兼容性

### 挂钩未执行

1. 验证挂钩已启用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重启网关进程以重新加载挂钩。

3. 检查网关日志中的错误：
   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### 处理程序错误

检查 TypeScript/导入错误：

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 迁移指南

### 从旧版配置到自动发现

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

**之后**：

1. 创建 hook 目录：

   ```bash
   mkdir -p ~/.openclaw/hooks/my-hook
   mv ./hooks/handlers/my-handler.ts ~/.openclaw/hooks/my-hook/handler.ts
   ```

2. 创建 HOOK.md：

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

4. 验证并重启您的网关进程：
   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**迁移的好处**：

- 自动发现
- CLI 管理
- 资格检查
- 更好的文档
- 一致的结构

## 另请参阅

- [CLI 参考：hooks](/zh/en/cli/hooks)
- [内置 Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/zh/en/automation/webhook)
- [配置](/zh/en/gateway/configuration#hooks)
