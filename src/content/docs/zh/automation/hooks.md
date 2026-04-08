---
summary: "Hooks：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks 是在 Gateway(网关) 内部发生某些情况时运行的小脚本。它们会从目录中自动发现，并可以使用 `openclaw hooks` 进行检查。

OpenClaw 中有两种 Hooks：

- **内部 Hooks**（本页）：当代理事件触发时在 Gateway(网关) 内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：允许其他系统在 OpenClaw 中触发工作的外部 HTTP 端点。请参阅 [Webhooks](/en/automation/cron-jobs#webhooks)。

Hooks 也可以打包在插件内部。`openclaw hooks list` 同时显示了独立的 Hooks 和插件管理的 Hooks。

## 快速开始

```bash
# List available hooks
openclaw hooks list

# Enable a hook
openclaw hooks enable session-memory

# Check hook status
openclaw hooks check

# Get detailed information
openclaw hooks info session-memory
```

## 事件类型

| 事件                     | 触发时机                   |
| ------------------------ | -------------------------- |
| `command:new`            | 发出 `/new` 命令           |
| `command:reset`          | 发出 `/reset` 命令         |
| `command:stop`           | 发出 `/stop` 命令          |
| `command`                | 任何命令事件（通用监听器） |
| `session:compact:before` | 在压缩历史记录之前         |
| `session:compact:after`  | 压缩完成后                 |
| `session:patch`          | 当会话属性被修改时         |
| `agent:bootstrap`        | 在注入工作区引导文件之前   |
| `gateway:startup`        | 渠道启动并加载 Hooks 后    |
| `message:received`       | 来自任何渠道的入站消息     |
| `message:transcribed`    | 音频转录完成后             |
| `message:preprocessed`   | 所有媒体和链接理解完成后   |
| `message:sent`           | 出站消息已发送             |

## 编写 Hooks

### Hook 结构

每个 Hook 是一个包含两个文件的目录：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

### HOOK.md 格式

```markdown
---
name: my-hook
description: "Short description of what this hook does"
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here.
```

**元数据字段** (`metadata.openclaw`)：

| 字段       | 描述                                             |
| ---------- | ------------------------------------------------ |
| `emoji`    | 用于 CLI 的显示表情符号                          |
| `events`   | 要监听的事件数组                                 |
| `export`   | 要使用的命名导出（默认为 `"default"`）           |
| `os`       | 所需平台（例如 `["darwin", "linux"]`）           |
| `requires` | 必需的 `bins`、`anyBins`、`env` 或 `config` 路径 |
| `always`   | 绕过资格检查（布尔值）                           |
| `install`  | 安装方式                                         |

### 处理器实现

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // Your logic here

  // Optionally send message to user
  event.messages.push("Hook executed!");
};

export default handler;
```

每个事件包括：`type`、`action`、`sessionKey`、`timestamp`、`messages`（push 用于发送给用户）和 `context`（事件特定数据）。

### 事件上下文重点

**命令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（提供商特定数据，包括 `senderId`、`senderName`、`guildId`）。

**消息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**消息事件**（`message:preprocessed`）：`context.bodyForAgent`（最终富集正文）、`context.from`、`context.channelId`。

**Bootstrap 事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可变数组）、`context.agentId`。

**会话补丁事件** (`session:patch`): `context.sessionEntry`, `context.patch` (仅限已更改的字段), `context.cfg`。只有特权客户端才能触发补丁事件。

**压缩事件**: `session:compact:before` 包括 `messageCount`, `tokenCount`。`session:compact:after` 添加了 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`。

## Hook 发现

Hook 按覆盖优先级递增的顺序从以下目录中发现：

1. **内置 Hook**: 随 OpenClaw 附带
2. **插件 Hook**: 捆绑在已安装插件内部的 Hook
3. **托管 Hook**: `~/.openclaw/hooks/` (用户安装的，在工作区之间共享)。来自 `hooks.internal.load.extraDirs` 的额外目录共享此优先级。
4. **工作区 Hook**: `<workspace>/hooks/` (针对每个代理，默认禁用，直到明确启用)

工作区 Hook 可以添加新的 Hook 名称，但不能覆盖同名的内置、托管或插件提供的 Hook。

### Hook 包

Hook 包是通过 `package.json` 中的 `openclaw.hooks` 导出 Hook 的 npm 包。安装方法如下：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅限注册表（包名称 + 可选的确切版本或分发标签）。拒绝 Git/URL/文件规范和 semver 范围。

## 内置 Hook

| Hook                  | 事件                           | 作用                                             |
| --------------------- | ------------------------------ | ------------------------------------------------ |
| 会话-memory           | `command:new`, `command:reset` | 将会话上下文保存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`              | 从 glob 模式注入额外的引导文件                   |
| command-logger        | `command`                      | 将所有命令记录到 `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | 在网关启动时运行 `BOOT.md`                       |

启用任何内置 Hook：

```bash
openclaw hooks enable <hook-name>
```

### 会话-memory 详情

提取最后 15 条用户/助手消息，通过 LLM 生成描述性文件名标识符，并保存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要配置 `workspace.dir`。

### bootstrap-extra-files 配置

```json
{
  "hooks": {
    "internal": {
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

路径相对于工作区解析。仅加载已识别的 bootstrap 基础名称 (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`)。

## 插件钩子

插件可以通过插件 SDK 注册钩子以实现更深入集成：拦截工具调用、修改提示、控制消息流等。插件 SDK 暴露了 28 个钩子，涵盖模型解析、代理生命周期、消息流、工具执行、子代理协调和网关生命周期。

有关完整的插件钩子参考，包括 `before_tool_call`、`before_agent_reply`、`before_install` 以及所有其他插件钩子，请参阅 [Plugin Architecture](/en/plugins/architecture#provider-runtime-hooks)。

## 配置

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

每个钩子的环境变量：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_CUSTOM_VAR": "value" }
        }
      }
    }
  }
}
```

额外的钩子目录：

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

<Note>传统的 `hooks.internal.handlers` 数组配置格式仍然支持，以确保向后兼容性，但新钩子应使用基于发现的系统。</Note>

## CLI 参考

```bash
# List all hooks (add --eligible, --verbose, or --json)
openclaw hooks list

# Show detailed info about a hook
openclaw hooks info <hook-name>

# Show eligibility summary
openclaw hooks check

# Enable/disable
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## 最佳实践

- **保持处理程序快速。** 钩子在命令处理期间运行。使用 `void processInBackground(event)` 进行即发即弃 (fire-and-forget) 的繁重工作。
- **优雅地处理错误。** 将有风险的操作包装在 try/catch 中；不要抛出错误，以便其他处理程序可以运行。
- **尽早过滤事件。** 如果事件类型/操作不相关，则立即返回。
- **使用特定的事件键。** 为了减少开销，优先使用 `"events": ["command:new"]` 而不是 `"events": ["command"]`。

## 故障排除

### 未发现钩子

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### 钩子不符合条件

```bash
openclaw hooks info my-hook
```

检查缺少的二进制文件 (PATH)、环境变量、配置值或操作系统兼容性。

### 钩子未执行

1. 验证钩子是否已启用：`openclaw hooks list`
2. 重启您的网关进程以便重新加载钩子。
3. 检查网关日志：`./scripts/clawlog.sh | grep hook`

## 相关

- [CLI 参考：hooks](/en/cli/hooks)
- [Webhooks](/en/automation/cron-jobs#webhooks)
- [插件架构](/en/plugins/architecture#provider-runtime-hooks) — 完整的插件钩子参考
- [配置](/en/gateway/configuration-reference#hooks)
