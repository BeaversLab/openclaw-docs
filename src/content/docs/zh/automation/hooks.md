---
summary: "Hooks：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Hooks 是在 Gateway(网关) 内部发生某些事件时运行的小型脚本。它们可以从目录中发现，并使用 Gateway(网关)`openclaw hooks`Gateway(网关) 进行检查。只有在您启用了 hooks 或配置了至少一个 hook 入口、hook 包、旧版处理程序或额外的 hook 目录后，Gateway(网关) 才会加载内部 hooks。

OpenClaw 中有两种钩子：

- **内部 hooks**（本页）：当代理事件触发时在 Gateway(网关) 内部运行，例如 Gateway(网关)`/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统在 OpenClaw 中触发工作。请参阅 [Webhooks](OpenClaw/en/automation/cron-jobs#webhooks)。

Hooks 也可以打包在插件内部。`openclaw hooks list` 显示了独立的 hooks 和由插件管理的 hooks。

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
| `command:new`            | `/new` 命令已发出            |
| `command:reset`          | `/reset` 命令已发出          |
| `command:stop`           | `/stop` 命令已发出           |
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

**元数据字段**（`metadata.openclaw`）：

| 字段       | 描述                                             |
| ---------- | ------------------------------------------------ |
| `emoji`    | CLI 的显示表情符号                               |
| `events`   | 要监听的事件数组                                 |
| `export`   | 要使用的命名导出（默认为 `"default"`）           |
| `os`       | 所需的平台（例如，`["darwin", "linux"]`）        |
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

每个事件包括：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推送给用户）和 `context`（事件特定数据）。Agent 和工具 插件 Hook 上下文还可以包括 `trace`，这是一个只读的 W3C 兼容诊断追踪上下文，插件可以将其传递到结构化日志中以进行 OTEL 关联。

### 事件上下文要点

**命令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（提供商 特定数据，包括 `senderId`、`senderName`、`guildId`）。对于类似命令的消息，`context.content` 优先使用非空命令主体，然后回退到原始入站主体和通用主体；它不包含仅限 Agent 的增强内容，例如线程历史或链接摘要。

**消息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**消息事件**（`message:preprocessed`）：`context.bodyForAgent`（最终增强主体）、`context.from`、`context.channelId`。

**引导事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可变数组）、`context.agentId`。

**Session patch events** (`session:patch`): `context.sessionEntry`, `context.patch` (仅限已更改字段), `context.cfg`. 只有特权客户端可以触发补丁事件。

**Compaction events**: `session:compact:before` 包括 `messageCount`, `tokenCount`. `session:compact:after` 添加 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

`command:stop` 观察用户发出 `/stop`; 它是取消/命令
生命周期，而不是代理完成网关。需要检查
自然最终答案并要求代理再进行一次传递的插件应改为使用类型化
插件钩子 `before_agent_finalize`。请参阅 [Plugin hooks](/zh/plugins/hooks)。

**Gateway(网关) 生命周期事件**: `gateway:shutdown` 包括 `reason` 和 `restartExpectedMs` 并在网关关闭开始时触发。`gateway:pre-restart` 包含相同的上下文，但仅在关闭是预期重启的一部分并且提供了有限的 `restartExpectedMs` 值时触发。在关闭期间，每个生命周期钩子等待都是尽力而为且有限界的，因此如果处理程序停止，关闭仍会继续。

## Hook discovery

Hooks are discovered from these directories, in order of increasing override precedence:

1. **Bundled hooks**: shipped with OpenClaw
2. **Plugin hooks**: hooks bundled inside installed plugins
3. **Managed hooks**: `~/.openclaw/hooks/` (用户安装，在工作空间之间共享)。来自 `hooks.internal.load.extraDirs` 的额外目录共享此优先级。
4. **Workspace hooks**: `<workspace>/hooks/` (每个代理，默认禁用，直到明确启用)

工作区钩子可以添加新的钩子名称，但不能覆盖同名捆绑、托管或插件提供的钩子。

在启动时，Gateway(网关) 会跳过内部钩子发现，直到配置了内部钩子。使用 `openclaw hooks enable <name>` 启用捆绑或托管钩子，安装钩子包，或设置 `hooks.internal.enabled=true` 以选择加入。当您启用一个命名钩子时，Gateway(网关) 仅加载该钩子的处理程序; `hooks.internal.enabled=true`，额外的钩子目录和旧版处理程序选择加入广泛发现。

### 钩子包

Hook 包是 npm 包，它们通过 `package.json` 中的 `openclaw.hooks` 导出 hooks。安装方法：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅限于注册表（包名称 + 可选的确切版本或分发标签）。将拒绝 Git/URL/文件规范和 semver 范围。

## 捆绑钩子

| 钩子                  | 事件                                              | 功能                                             |
| --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| 会话-memory           | `command:new`, `command:reset`                    | 将会话上下文保存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`                                 | 从 glob 模式注入额外的引导文件                   |
| command-logger        | `command`                                         | 将所有命令记录到 `~/.openclaw/logs/commands.log` |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | 当会话压缩开始/结束时，发送可见的聊天通知        |
| boot-md               | `gateway:startup`                                 | 当网关启动时运行 `BOOT.md`                       |

启用任何内置 hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### 会话-memory 详情

提取最后 15 条用户/助手消息，并使用主机本地日期保存到 `<workspace>/memory/YYYY-MM-DD-HHMM.md`。内存捕获在后台运行，因此 `/new` 和 `/reset` 确认不会因转录读取或可选的 slug 生成而延迟。设置 `hooks.internal.entries.session-memory.llmSlug: true` 可使用配置的模型生成描述性文件名 slug。需要配置 `workspace.dir`。

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

路径相对于工作区解析。仅加载已识别的引导基本名称 (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`)。

<a id="command-logger"></a>

### command-logger 详情

将每条斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 详情

当 OpenClaw 开始和完成会话转录压缩时，向当前对话发送简短的状态消息。这使得在聊天界面上的长轮次不那么令人困惑，因为用户可以看到助手正在总结上下文，并将在压缩后继续。

<a id="boot-md"></a>

### boot-md 详情

当网关启动时，从活动工作区运行 `BOOT.md`。

## 插件钩子

插件可以通过插件 SDK 注册类型化钩子，以实现更深入的集成：
拦截工具调用、修改提示、控制消息流等。
当您需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他进程内生命周期钩子时，请使用插件钩子。

有关完整的插件钩子参考，请参阅[插件钩子](/zh/plugins/hooks)。

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

<Note>为了向后兼容，仍然支持传统的 `hooks.internal.handlers` 数组配置格式，但新钩子应使用基于发现系统的配置。</Note>

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

- **保持处理程序快速。** 钩子在命令处理期间运行。使用 `void processInBackground(event)` 对繁重的工作进行即发即弃（fire-and-forget）处理。
- **优雅地处理错误。** 将有风险的操作包装在 try/catch 中；不要抛出异常，以便其他处理程序可以运行。
- **尽早过滤事件。** 如果事件类型/操作不相关，请立即返回。
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

检查是否缺少二进制文件 (PATH)、环境变量、配置值或操作系统兼容性问题。

### 钩子未执行

1. 验证钩子是否已启用：`openclaw hooks list`
2. 重启您的网关进程以重新加载钩子。
3. 检查网关日志：`./scripts/clawlog.sh | grep hook`

## 相关

- [CLI 参考：hooks](/zh/cli/hooks)
- [Webhooks](/zh/automation/cron-jobs#webhooks)
- [插件钩子](/zh/plugins/hooks) — 进程内插件生命周期钩子
- [配置](/zh/gateway/configuration-reference#hooks)
