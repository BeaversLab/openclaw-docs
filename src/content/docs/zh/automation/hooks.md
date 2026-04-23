---
summary: "Hooks：针对命令和生命周期事件的事件驱动自动化"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks 是在 Gateway(网关) 内部发生事件时运行的小型脚本。它们可以从目录中发现，并使用 `openclaw hooks` 进行检查。只有在你启用 hooks 或配置至少一个 hook 条目、hook 包、legacy handler 或额外的 hook 目录后，Gateway(网关) 才会加载内部 hooks。

OpenClaw 中有两种 Hooks：

- **内部 hooks**（本页）：在代理事件触发时于 Gateway(网关) 内部运行，例如 `/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统在 OpenClaw 中触发工作。请参阅 [Webhooks](/zh/automation/cron-jobs#webhooks)。

Hooks 也可以打包在插件内部。`openclaw hooks list` 显示了独立 hooks 和插件管理的 hooks。

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
| `command:new`            | `/new` 命令已发出          |
| `command:reset`          | `/reset` 命令已发出        |
| `command:stop`           | `/stop` 命令已发出         |
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
| `os`       | 所需的平台（例如 `["darwin", "linux"]`）         |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路径 |
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

每个事件包括：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推送给用户）和 `context`（特定于事件的数据）。

### 事件上下文重点

**命令事件** (`command:new`, `command:reset`): `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`。

**消息事件** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (提供商-specific data including `senderId`, `senderName`, `guildId`)。

**消息事件** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`。

**消息事件** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`。

**消息事件** (`message:preprocessed`): `context.bodyForAgent` (final enriched body), `context.from`, `context.channelId`。

**引导事件** (`agent:bootstrap`): `context.bootstrapFiles` (mutable array), `context.agentId`。

**会话补丁事件** (`session:patch`): `context.sessionEntry`, `context.patch` (only changed fields), `context.cfg`. Only privileged clients can trigger patch events.

**压缩事件**: `session:compact:before` includes `messageCount`, `tokenCount`. `session:compact:after` adds `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

## Hook 发现

Hook 按覆盖优先级递增的顺序从以下目录中发现：

1. **内置 Hook**: 随 OpenClaw 附带
2. **插件 Hook**: 捆绑在已安装插件内部的 Hook
3. **托管 Hooks**: `~/.openclaw/hooks/` (用户安装，在工作区之间共享)。来自 `hooks.internal.load.extraDirs` 的额外目录共享此优先级。
4. **工作区 Hooks**: `<workspace>/hooks/` (每个 Agent，默认禁用，直到显式启用)

工作区 Hook 可以添加新的 Hook 名称，但不能覆盖同名的内置、托管或插件提供的 Hook。

Gateway(网关) 在启动时会跳过内部 hook 发现，直到配置了内部 hooks。使用 `openclaw hooks enable <name>` 启用捆绑或托管的 hook，安装 hook 包，或设置 `hooks.internal.enabled=true` 以选择加入。当你启用一个命名的 hook 时，Gateway(网关) 仅加载该 hook 的处理程序；`hooks.internal.enabled=true`、额外的 hook 目录和 legacy handlers 则选择加入广泛发现。

### Hook 包

Hook 包是通过 `package.json` 中的 `openclaw.hooks` 导出 hooks 的 npm 包。安装方法如下：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅限于注册表（包名称 + 可选的确切版本或 dist-tag）。Git/URL/文件规范和 semver 范围将被拒绝。

## 捆绑的 hooks

| Hook                  | 事件                           | 作用                                             |
| --------------------- | ------------------------------ | ------------------------------------------------ |
| 会话-memory           | `command:new`, `command:reset` | 将会话上下文保存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`              | 从 glob 模式注入额外的引导文件                   |
| command-logger        | `command`                      | 将所有命令记录到 `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | 在网关启动时运行 `BOOT.md`                       |

启用任何捆绑的 hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### 会话-memory 详情

提取最后 15 条用户/助手消息，通过 LLM 生成描述性文件名 slug，并保存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要配置 `workspace.dir`。

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

路径相对于工作区解析。仅加载已识别的引导基本文件名（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 详情

将每条斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="boot-md"></a>

### boot-md 详情

当网关启动时，从活动工作区运行 `BOOT.md`。

## 插件钩子

插件可以通过插件 SDK 注册钩子以实现更深层次的集成：拦截工具调用、修改提示词、控制消息流等。插件 SDK 提供了 28 个钩子，涵盖模型解析、代理生命周期、消息流、工具执行、子代理协调以及网关生命周期。

有关完整的插件钩子参考，包括 `before_tool_call`、`before_agent_reply`、`before_install` 和所有其他插件钩子，请参阅 [插件架构](/zh/plugins/architecture#provider-runtime-hooks)。

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

<Note>传统的 `hooks.internal.handlers` 数组配置格式仍受支持以保持向后兼容，但新钩子应使用基于发现的系统。</Note>

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

- **保持处理程序快速。** 钩子在命令处理期间运行。使用 `void processInBackground(event)` 发射后不管地处理繁重工作。
- **优雅地处理错误。** 将有风险的操作包装在 try/catch 中；不要抛出错误，以便其他处理程序可以运行。
- **尽早过滤事件。** 如果事件类型/操作不相关，则立即返回。
- **使用特定的事件键。** 优先使用 `"events": ["command:new"]` 而不是 `"events": ["command"]` 以减少开销。

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

检查是否有缺失的二进制文件 (PATH)、环境变量、配置值或操作系统兼容性问题。

### 钩子未执行

1. 验证钩子是否已启用：`openclaw hooks list`
2. 重启您的网关进程以重新加载钩子。
3. 检查网关日志：`./scripts/clawlog.sh | grep hook`

## 相关

- [CLI 参考：hooks](/zh/cli/hooks)
- [Webhooks](/zh/automation/cron-jobs#webhooks)
- [插件架构](/zh/plugins/architecture#provider-runtime-hooks) — 完整的插件 hook 参考
- [配置](/zh/gateway/configuration-reference#hooks)
