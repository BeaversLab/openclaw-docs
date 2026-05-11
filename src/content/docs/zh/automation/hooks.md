---
summary: "Hooks：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

钩子是在 Gateway 内部发生事件时运行的小脚本。它们可以从目录中发现，并使用 `openclaw hooks` 进行检查。Gateway 仅在您启用钩子或配置了至少一个钩子条目、钩子包、旧版处理程序或额外钩子目录后，才会加载内部钩子。

OpenClaw 中有两种钩子：

- **内部钩子**（本页）：当代理事件触发时在 Gateway 内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统在 OpenClaw 中触发工作。请参阅 [Webhooks](/zh/automation/cron-jobs#webhooks)。

钩子也可以打包在插件内部。`openclaw hooks list` 显示了独立钩子和插件管理的钩子。

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

| 事件                     | 触发时机                     |
| ------------------------ | ---------------------------- |
| `command:new`            | 发出 `/new` 命令             |
| `command:reset`          | 发出 `/reset` 命令           |
| `command:stop`           | 发出 `/stop` 命令            |
| `command`                | 任何命令事件（通用监听器）   |
| `session:compact:before` | 在压缩总结历史记录之前       |
| `session:compact:after`  | 压缩完成后                   |
| `session:patch`          | 当会话属性被修改时           |
| `agent:bootstrap`        | 在注入工作区引导文件之前     |
| `gateway:startup`        | 渠道启动且钩子加载后         |
| `gateway:shutdown`       | 当网关关闭开始时             |
| `gateway:pre-restart`    | 在预期的网关重启之前         |
| `message:received`       | 来自任何渠道的入站消息       |
| `message:transcribed`    | 音频转录完成后               |
| `message:preprocessed`   | 媒体和链接预处理完成或跳过后 |
| `message:sent`           | 出站消息已投递               |

## 编写钩子

### 钩子结构

每个钩子都是一个包含两个文件的目录：

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
| `emoji`    | CLI 的显示表情符号                               |
| `events`   | 要监听的事件数组                                 |
| `export`   | 要使用的命名导出（默认为 `"default"`）           |
| `os`       | 所需平台（例如 `["darwin", "linux"]`）           |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路径 |
| `always`   | 绕过资格检查（布尔值）                           |
| `install`  | 安装方法                                         |

### 处理程序实现

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

每个事件包括：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推送给用户）和 `context`（事件特定数据）。Agent 和 工具 插件钩子上下文还可以包括 `trace`，这是一个只读的、兼容 W3C 的诊断跟踪上下文，插件可以将其传递给结构化日志以进行 OTEL 关联。

### 事件上下文要点

**命令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（提供商特定数据，包括 `senderId`、`senderName`、`guildId`）。

**消息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**Message events** (`message:preprocessed`): `context.bodyForAgent` (final enriched body), `context.from`, `context.channelId`。

**Bootstrap events** (`agent:bootstrap`): `context.bootstrapFiles` (mutable array), `context.agentId`。

**Session patch events** (`session:patch`): `context.sessionEntry`, `context.patch` (only changed fields), `context.cfg`. Only privileged clients can trigger patch events.

**Compaction events**: `session:compact:before` includes `messageCount`, `tokenCount`. `session:compact:after` adds `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`。

`command:stop` observes the user issuing `/stop`; it is cancellation/command
lifecycle, not an agent-finalization gate. Plugins that need to inspect a
natural final answer and ask the agent for one more pass should use the typed
plugin hook `before_agent_finalize` instead. See [Plugin hooks](/zh/plugins/hooks)。

**Gateway(网关) lifecycle events**: `gateway:shutdown` includes `reason` and `restartExpectedMs` and fires when gateway shutdown begins. `gateway:pre-restart` includes the same context but only fires when shutdown is part of an expected restart and a finite `restartExpectedMs` value is supplied. During shutdown, each lifecycle hook wait is best-effort and bounded so shutdown continues if a handler stalls.

## Hook discovery

Hooks are discovered from these directories, in order of increasing override precedence:

1. **Bundled hooks**: shipped with OpenClaw
2. **Plugin hooks**: hooks bundled inside installed plugins
3. **Managed hooks**: `~/.openclaw/hooks/` (user-installed, shared across workspaces). Extra directories from `hooks.internal.load.extraDirs` share this precedence.
4. **Workspace hooks**: `<workspace>/hooks/` (per-agent, disabled by default until explicitly enabled)

工作区钩子可以添加新的钩子名称，但不能覆盖同名捆绑、托管或插件提供的钩子。

在配置内部钩子之前，Gateway(网关) 会在启动时跳过内部钩子发现。使用 `openclaw hooks enable <name>` 启用捆绑或托管的钩子，安装钩子包，或设置 `hooks.internal.enabled=true` 以选择加入。当您启用一个命名钩子时，Gateway(网关) 仅加载该钩子的处理程序；`hooks.internal.enabled=true`、额外的钩子目录和旧版处理程序则会选择加入广泛的发现。

### 钩子包

钩子包是通过 `openclaw.hooks` 在 `package.json` 中导出钩子的 npm 包。安装方法如下：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅限于注册表（包名称 + 可选的确切版本或分发标签）。将拒绝 Git/URL/文件规范和 semver 范围。

## 捆绑钩子

| 钩子                  | 事件                           | 功能                                             |
| --------------------- | ------------------------------ | ------------------------------------------------ |
| 会话-memory           | `command:new`, `command:reset` | 将会话上下文保存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`              | 从 glob 模式注入额外的引导文件                   |
| command-logger        | `command`                      | 将所有命令记录到 `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | 在网关启动时运行 `BOOT.md`                       |

启用任何捆绑的钩子：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### 会话-memory 详情

提取最后 15 条用户/助手消息，通过 LLM 生成描述性文件名，并使用主机本地日期保存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要配置 `workspace.dir`。

<a id="bootstrap-extra-files"></a>

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

路径相对于工作区解析。仅加载已识别的引导基本名称（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 详情

将每个斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="boot-md"></a>

### boot-md 详情

当网关启动时，从活动工作区运行 `BOOT.md`。

## 插件挂钩

插件可以通过插件 SDK 注册类型化挂钩，以实现更深度的集成：
拦截工具调用、修改提示、控制消息流等。
当您需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他进程内生命周期挂钩时，请使用插件挂钩。

有关完整的插件挂钩参考，请参阅[插件挂钩](/zh/plugins/hooks)。

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

每个挂钩的环境变量：

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

额外的挂钩目录：

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

<Note>旧的 `hooks.internal.handlers` 数组配置格式仍然支持，以保持向后兼容性，但新的挂钩应使用基于发现的系统。</Note>

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

- **保持处理程序快速。** 挂钩在命令处理期间运行。使用 `void processInBackground(event)` 进行繁重工作的即发即弃处理。
- **优雅地处理错误。** 将有风险的操作包装在 try/catch 中；不要抛出错误，以便其他处理程序可以运行。
- **尽早过滤事件。** 如果事件类型/操作不相关，请立即返回。
- **使用特定的事件键。** 为了减少开销，建议优先使用 `"events": ["command:new"]` 而不是 `"events": ["command"]`。

## 故障排除

### 未发现挂钩

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### 挂钩不符合条件

```bash
openclaw hooks info my-hook
```

检查是否缺少二进制文件 (PATH)、环境变量、配置值或操作系统兼容性。

### 挂钩未执行

1. 验证挂钩已启用：`openclaw hooks list`
2. 重启您的网关进程以便重新加载挂钩。
3. 检查网关日志：`./scripts/clawlog.sh | grep hook`

## 相关

- [CLI 参考：hooks](/zh/cli/hooks)
- [Webhooks](/zh/automation/cron-jobs#webhooks)
- [Plugin hooks](/zh/plugins/hooks) — 进程内插件生命周期挂钩
- [配置](/zh/gateway/configuration-reference#hooks)
