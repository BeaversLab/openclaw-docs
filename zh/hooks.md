---
summary: "Hooks：面向命令与生命周期事件的事件驱动自动化"
read_when:
  - 你想对 /new、/reset、/stop 与 agent 生命周期事件做事件驱动自动化
  - 你想构建、安装或调试 hooks
title: "钩子"
---

# Hooks

Hooks 提供可扩展的事件驱动系统，用于响应 agent 命令与事件来自动化动作。Hooks 会从目录自动发现，并可通过 CLI 管理，类似 OpenClaw 的 skills。

## 先弄清楚

Hooks 是在“某件事发生时”运行的小脚本。有两类：

- **Hooks**（本页）：在 Gateway 内运行，当 agent 事件触发，如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP webhook，用于让其它系统触发 OpenClaw 工作。见 [Webhook 钩子](/zh/automation/webhook) 或用 `openclaw webhooks` 获取 Gmail 辅助命令。

Hooks 也可打包在插件内；见 [插件](/zh/plugin#plugin-hooks)。

常见用途：

- 会话重置时保存记忆快照
- 记录命令审计轨迹以便排障/合规
- 会话开始或结束时触发后续自动化
- 事件触发时在 agent 工作区写文件或调用外部 API

只要会写一个小的 TypeScript 函数，就能写 hook。Hooks 会自动发现，并可通过 CLI 启用/禁用。

## 概览

Hooks 系统允许你：

- 当 `/new` 触发时保存会话上下文到 memory
- 记录所有命令以便审计
- 在 agent 生命周期事件上触发自定义自动化
- 无需修改核心代码即可扩展 OpenClaw 行为

## 快速开始

### 内置 Hooks

OpenClaw 自带四个 hooks，会自动发现：

- **💾 session-memory**：你发出 `/new` 时，将会话上下文保存到 agent 工作区（默认 `~/.openclaw/workspace/memory/`）
- **📝 command-logger**：将所有命令事件写入 `~/.openclaw/logs/commands.log`
- **🚀 boot-md**：gateway 启动时运行 `BOOT.md`（需启用内部 hooks）
- **😈 soul-evil**：在清洗窗口或随机概率下，将注入的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`

列出可用 hooks：

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

查看详细信息：

```bash
openclaw hooks info session-memory
```

### Onboarding

在 onboarding（`openclaw onboard`）期间，会提示你启用推荐 hooks。向导会自动发现可用 hooks 并供你选择。

## Hook 发现

Hooks 会从三个目录自动发现（按优先级）：

1. **工作区 hooks**：`<workspace>/hooks/`（每 agent，最高优先级）
2. **托管 hooks**：`~/.openclaw/hooks/`（用户安装，跨工作区共享）
3. **内置 hooks**：`<openclaw>/dist/hooks/bundled/`（随 OpenClaw 发布）

托管 hooks 目录可以是 **单个 hook** 或 **hook 包**（包目录）。

每个 hook 是一个目录，包含：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook 包（npm/archives）

Hook 包是标准 npm 包，通过 `package.json` 中的 `openclaw.hooks` 导出一个或多个 hook。用下面命令安装：

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

每个条目指向一个 hook 目录，包含 `HOOK.md` 与 `handler.ts`（或 `index.ts`）。Hook 包可携带依赖，会安装到 `~/.openclaw/hooks/<id>`。

## Hook 结构

### HOOK.md 格式

`HOOK.md` 文件包含 YAML frontmatter 元数据 + Markdown 文档：

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

- **`emoji`**：CLI 显示用 emoji（例如 `"💾"`）
- **`events`**：要监听的事件数组（例如 `['command:new', 'command:reset']`）
- **`export`**：使用的命名导出（默认为 `"default"`）
- **`homepage`**：文档 URL
- **`requires`**：可选要求
  - **`bins`**：PATH 上必须存在的可执行文件（例如 `['git', 'node']`）
  - **`anyBins`**：至少存在这些二进制之一
  - **`env`**：需要的环境变量
  - **`config`**：需要的配置路径（例如 `['workspace.dir']`）
  - **`os`**：需要的平台（例如 `['darwin', 'linux']`）
- **`always`**：跳过资格检查（boolean）
- **`install`**：安装方式（对内置 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### Handler 实现

`handler.ts` 导出一个 `HookHandler` 函数：

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

每个事件包含：

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

### Command 事件

当 agent 命令被触发：

- **`command`**：所有命令事件（通用监听）
- **`command:new`**：发出 `/new` 时
- **`command:reset`**：发出 `/reset` 时
- **`command:stop`**：发出 `/stop` 时

### Agent 事件

- **`agent:bootstrap`**：工作区 bootstrap 文件注入前（hooks 可修改 `context.bootstrapFiles`）

### Gateway 事件

Gateway 启动时触发：

- **`gateway:startup`**：频道启动且 hooks 加载后

### Tool Result Hooks（插件 API）

这些 hooks 不是事件流监听器；它们让插件在 OpenClaw 持久化前同步调整工具结果。

- **`tool_result_persist`**：在写入会话转录前转换工具结果。必须同步；返回更新后的 payload，或返回 `undefined` 以保持原样。见 [Agent Loop](/zh/concepts/agent-loop)。

### 未来事件

计划中的事件类型：

- **`session:start`**：新会话开始
- **`session:end`**：会话结束
- **`agent:error`**：agent 出错
- **`message:sent`**：消息发送
- **`message:received`**：消息接收

## 创建自定义 Hooks

### 1. 选择位置

- **工作区 hooks**（`<workspace>/hooks/`）：每 agent，最高优先级
- **托管 hooks**（`~/.openclaw/hooks/`）：跨工作区共享

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

### 单 hook 配置

Hooks 可以有自定义配置：

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

从额外目录加载 hooks：

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

旧格式为兼容保留：

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

**迁移**：新 hooks 请使用基于发现的系统。旧 handlers 会在目录 hooks 之后加载。

## CLI 命令

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

### Hook 信息

```bash
# Show detailed info about a hook
openclaw hooks info session-memory

# JSON output
openclaw hooks info session-memory --json
```

### 资格检查

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

## 内置 Hooks

### session-memory

发出 `/new` 时保存会话上下文到 memory。

**事件**：`command:new`

**要求**：必须配置 `workspace.dir`

**输出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（默认 `~/.openclaw/workspace`）

**行为**：

1. 使用重置前的会话条目定位正确转录
2. 抽取对话最后 15 行
3. 使用 LLM 生成描述性文件名 slug
4. 将会话元数据写入按日期命名的 memory 文件

**示例输出**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**文件名示例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（若 slug 生成失败则回退为时间戳）

**启用**：

```bash
openclaw hooks enable session-memory
```

### command-logger

将所有命令事件记录到集中审计文件。

**事件**：`command`

**要求**：无

**输出**：`~/.openclaw/logs/commands.log`

**行为**：

1. 捕获事件详情（命令动作、时间戳、会话 key、发件人 ID、来源）
2. 以 JSONL 格式追加日志
3. 后台静默运行

**示例日志**：

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

### soul-evil

在清洗窗口或随机概率下，将注入的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。

**事件**：`agent:bootstrap`

**文档**：[SOUL Evil Hook](/zh/hooks/soul-evil)

**输出**：不写文件；仅内存内替换。

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

gateway 启动时运行 `BOOT.md`（频道启动后）。
需要启用内部 hooks。

**事件**：`gateway:startup`

**要求**：必须配置 `workspace.dir`

**行为**：

1. 从工作区读取 `BOOT.md`
2. 通过 agent runner 执行指令
3. 通过消息工具发送任何需要的外发消息

**启用**：

```bash
openclaw hooks enable boot-md
```

## 最佳实践

### 处理器保持轻量

Hooks 运行在命令处理期间。保持轻量：

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

### 优雅处理错误

总是包裹可能失败的操作：

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

### 早过滤事件

若事件不相关，尽早返回：

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### 使用更具体的事件 key

尽可能在 metadata 中指定精确事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而不是：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## 调试

### 启用 Hook 日志

gateway 启动时会记录 hook 加载：

```
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 检查发现

列出所有已发现 hooks：

```bash
openclaw hooks list --verbose
```

### 检查注册

在 handler 中记录调用：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### 验证资格

检查为何 hook 不可用：

```bash
openclaw hooks info my-hook
```

查看输出中的缺失要求。

## 测试

### Gateway 日志

监控 gateway 日志以查看 hook 执行：

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### 直接测试 Hooks

在隔离环境中测试 handler：

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
- **`src/hooks/workspace.ts`**：目录扫描与加载
- **`src/hooks/frontmatter.ts`**：HOOK.md 元数据解析
- **`src/hooks/config.ts`**：资格检查
- **`src/hooks/hooks-status.ts`**：状态报告
- **`src/hooks/loader.ts`**：动态模块加载器
- **`src/cli/hooks-cli.ts`**：CLI 命令
- **`src/gateway/server-startup.ts`**：gateway 启动时加载 hooks
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

### 事件流

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

## 故障排查

### Hook 未发现

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

3. 列出所有已发现 hooks：
   ```bash
   openclaw hooks list
   ```

### Hook 不具备资格

检查要求：

```bash
openclaw hooks info my-hook
```

查看缺失项：

- 二进制（检查 PATH）
- 环境变量
- 配置值
- OS 兼容性

### Hook 未执行

1. 确认 hook 已启用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重启 gateway 进程以重新加载 hooks。

3. 检查 gateway 日志是否有错误：
   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Handler 错误

检查 TypeScript/import 错误：

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 迁移指南

### 从旧配置迁移到发现式

**Before**：

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

**After**：

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

4. 验证并重启 gateway 进程：
   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**迁移收益**：

- 自动发现
- CLI 管理
- 资格检查
- 更好的文档
- 一致的结构

## 另见

- [CLI 参考：hooks](/zh/cli/hooks)
- [Bundled 钩子 README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook 钩子](/zh/automation/webhook)
- [配置](/zh/gateway/configuration#hooks)
