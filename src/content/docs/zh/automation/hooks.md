---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Hooks 是当 Gateway(网关) 内部发生某些事情时运行的小脚本。可以从目录中发现它们，并使用 Gateway(网关)`openclaw hooks`Gateway(网关) 进行检查。只有在您启用了 hooks 或配置了至少一个 hook 条目、hook 包、旧版处理程序或额外的 hook 目录后，Gateway(网关) 才会加载内部 hooks。

OpenClaw 中有两种钩子：

- **Internal hooks** (本页)：当 agent 事件触发时在 Gateway(网关) 内部运行，例如 Gateway(网关)`/new`、`/reset`、`/stop` 或生命周期事件。
- **Webhooks**：外部 HTTP 端点，允许其他系统在 OpenClaw 中触发工作。请参阅 [Webhooks](/zh/automation/cron-jobs#webhooks)。

Hooks 也可以捆绑在插件内部。`openclaw hooks list` 显示了独立的 hooks 和由插件管理的 hooks。

## 选择合适的扩展方式

OpenClaw 有几种扩展方式，它们看起来很相似，但解决的问题不同：

| 如果您想要...                                                                                     | 请使用...                               | 原因                                                              |
| ------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| 在 `/new` 上保存快照，记录 `/reset`，在 `message:sent` 后调用外部 API，或添加粗粒度的操作员自动化 | 内部钩子（`HOOK.md`，本页）             | 基于文件的钩子旨在用于由操作员管理的副作用以及命令/生命周期自动化 |
| 重写提示词、阻止工具、取消出站消息，或添加有序的中间件/策略                                       | 通过 `api.on(...)` 实现的类型化插件钩子 | 类型化钩子具有明确的契约、优先级、合并规则以及阻止/取消语义       |
| 添加仅遥测导出或可观测性                                                                          | 诊断事件                                | 可观测性是一个独立的事件总线，而不是策略钩子接口                  |

当您需要类似于小型已安装集成的自动化行为时，请使用内部钩子。当您需要运行时生命周期控制时，请使用类型化插件钩子。

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

| 事件                     | 触发时机                             |
| ------------------------ | ------------------------------------ |
| `command:new`            | 发出 `/new` 命令                     |
| `command:reset`          | 发出 `/reset` 命令                   |
| `command:stop`           | 发出 `/stop` 命令                    |
| `command`                | 任何命令事件（通用监听器）           |
| `session:compact:before` | 在压缩（compaction）总结历史记录之前 |
| `session:compact:after`  | 压缩完成后                           |
| `session:patch`          | 当会话属性被修改时                   |
| `agent:bootstrap`        | 在注入工作区引导文件之前             |
| `gateway:startup`        | 渠道启动并加载钩子之后               |
| `gateway:shutdown`       | 当网关开始关闭时                     |
| `gateway:pre-restart`    | 在预期的网关重启之前                 |
| `message:received`       | 来自任何渠道的入站消息               |
| `message:transcribed`    | 音频转录完成后                       |
| `message:preprocessed`   | 媒体和链接预处理完成或跳过后         |
| `message:sent`           | 出站消息已送达                       |

## 编写 Hook

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
| `emoji`    | 在 CLI 中显示的 Emoji                            |
| `events`   | 要监听的事件数组                                 |
| `export`   | 要使用的命名导出（默认为 `"default"`）           |
| `os`       | 必需平台（例如 `["darwin", "linux"]`）           |
| `requires` | 必需的 `bins`、`anyBins`、`env` 或 `config` 路径 |
| `always`   | 绕过资格检查（布尔值）                           |
| `install`  | 安装方法                                         |

### Handler 实现

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // Your logic here

  // Optionally send a reply on replyable surfaces
  event.messages.push("Hook executed!");
};

export default handler;
```

每个事件包括：`type`、`action`、`sessionKey`、`timestamp`、`messages`（仅在可回复的表面上推送回复），以及 `context`（特定于事件的数据）。Agent 和 工具 plugin hook 上下文还可以包含 `trace`，这是一个只读的 W3C 兼容诊断跟踪上下文，插件可以将其传递到结构化日志中以进行 OTEL 关联。

`event.messages` 仅在可回复的表面（如 `command:*` 和 `message:received`）上自动传递。仅生命周期事件（如 `agent:bootstrap`、`session:*`、`gateway:*` 或 `message:sent`）没有回复渠道，并且会忽略推送的消息。

### 事件上下文亮点

**命令事件** (`command:new`、`command:reset`): `context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**消息事件** (`message:received`): `context.from`、`context.content`、`context.channelId`、`context.metadata`（提供商特定数据，包括 `senderId`、`senderName`、`guildId`）。对于类命令消息，`context.content` 优先使用非空命令主体，然后回退到原始入站主体和通用主体；它不包括仅限 Agent 的增强内容，例如线程历史或链接摘要。

**消息事件** (`message:sent`): `context.to`、`context.content`、`context.success`、`context.channelId`。

**消息事件** (`message:transcribed`): `context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**消息事件** (`message:preprocessed`): `context.bodyForAgent`（最终增强主体）、`context.from`、`context.channelId`。

**Bootstrap 事件** (`agent:bootstrap`): `context.bootstrapFiles`（可变数组）、`context.agentId`。

**Session patch 事件** (`session:patch`): `context.sessionEntry`、`context.patch`（仅包含已更改的字段）、`context.cfg`。只有特权客户端才能触发 patch 事件。

**压缩事件**：`session:compact:before` 包括 `messageCount`、`tokenCount`。`session:compact:after` 添加 `compactedCount`、`summaryLength`、`tokensBefore`、`tokensAfter`。

`command:stop` 观察用户发出的 `/stop`；它是取消/命令生命周期，而不是 Agent 最终确认的关口。需要检查自然最终答案并要求 Agent 再处理一轮的插件，应该改用类型化插件钩子 `before_agent_finalize`。请参阅 [Plugin hooks](/zh/plugins/hooks)。

**Gateway(网关) 生命周期事件**：Gateway(网关)`gateway:shutdown` 包含 `reason` 和 `restartExpectedMs`，并在网关开始关闭时触发。`gateway:pre-restart` 包含相同的上下文，但仅当关闭是预期重启的一部分且提供了有限的 `restartExpectedMs` 值时才会触发。在关闭期间，每个生命周期挂钩的等待都是尽力而为且有界的，因此如果处理程序停滞，关闭将继续。`gateway:shutdown` 的默认等待时间为 5 秒，`gateway:pre-restart` 为 10 秒。

当通道仍然可用时，使用 `gateway:pre-restart` 发送简短的重启通知：

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function handler(event) {
  if (event.type !== "gateway" || event.action !== "pre-restart") {
    return;
  }

  const restartInSeconds = Math.ceil(event.context.restartExpectedMs / 1000);
  await execFileAsync("openclaw", ["system", "event", "--mode", "now", "--text", `Gateway restarting in ~${restartInSeconds}s (${event.context.reason}). Checkpoint now.`]);
}
```

在 `gateway:shutdown`（或 `gateway:pre-restart`）事件与关闭序列的其余部分之间，网关还会为进程停止时仍然处于活动状态的每个会话触发一个类型化的 `session_end` 插件挂钩。对于普通的 SIGTERM/SIGINT 停止，该事件的 `reason` 为 `shutdown`；当关闭被安排为预期重启的一部分时，则为 `restart`。此排空是有界的，因此缓慢的 `session_end` 处理程序无法阻止进程退出，并且已通过 replace / reset / delete / compaction 完成最终确定的会话将被跳过，以避免重复触发。

## 挂钩发现

挂钩按覆盖优先级从低到高的顺序从以下目录中发现：

1. **内置挂钩**：随 OpenClaw 附带
2. **插件挂钩**：随已安装插件打包的挂钩
3. **托管挂钩**：`~/.openclaw/hooks/`（用户安装的，在工作区之间共享）。来自 `hooks.internal.load.extraDirs` 的额外目录具有相同的优先级。
4. **工作区挂钩**：`<workspace>/hooks/`（按代理设置，默认禁用，直到显式启用）

工作区挂钩可以添加新的挂钩名称，但不能覆盖具有相同名称的内置、托管或插件提供的挂钩。

在启动时，Gateway(网关)会跳过内部 hook 发现，直到配置了内部 hook。使用 Gateway(网关)`openclaw hooks enable <name>` 启用捆绑或托管 hook，安装 hook 包，或设置 `hooks.internal.enabled=true`Gateway(网关) 以选择加入。当您启用一个命名 hook 时，Gateway(网关)仅加载该 hook 的处理程序；`hooks.internal.enabled=true`、额外的 hook 目录和传统处理程序则选择加入广泛发现。

### Hook 包

Hook 包是通过 `package.json` 中的 npm`openclaw.hooks` 导出 hook 的 npm 包。安装方法：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅限于注册表（包名称 + 可选的确切版本或 dist-tag）。会拒绝 Git/URL/文件规范和 semver 范围。

## 捆绑 Hook

| Hook                  | 事件                                              | 功能                                             |
| --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| 会话-memory           | `command:new`, `command:reset`                    | 将会话上下文保存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`                                 | 从 glob 模式注入额外的引导文件                   |
| command-logger        | `command`                                         | 将所有命令记录到 `~/.openclaw/logs/commands.log` |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | 当会话压缩开始/结束时发送可见的聊天通知          |
| boot-md               | `gateway:startup`                                 | 在网关启动时运行 `BOOT.md`                       |

启用任何捆绑的 hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### 会话-memory 详情

提取最后 15 条用户/助手消息，并使用主机本地日期保存到 `<workspace>/memory/YYYY-MM-DD-HHMM.md`。内存捕获在后台运行，因此 `/new` 和 `/reset` 确认不会因转录读取或可选的 slug 生成而延迟。设置 `hooks.internal.entries.session-memory.llmSlug: true` 以使用配置的模型生成描述性文件名 slug。需要配置 `workspace.dir`。

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

路径是相对于工作区解析的。仅加载已识别的引导基本文件名（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 详情

将每条斜杠命令记录到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 详情

当 OpenClaw 开始和结束压缩会话记录时，向当前对话发送简短的状态消息。这使得长轮次在聊天界面上不再那么令人困惑，因为用户可以看到助手正在总结上下文，并将在压缩后继续。

<a id="boot-md"></a>

### boot-md 详情

当网关启动时，从活动工作区运行 `BOOT.md`。

## 插件 Hooks

插件可以通过插件 SDK 注册类型化 Hooks，以实现更深度的集成：拦截工具调用、修改提示、控制消息流等。
当您需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他进程内生命周期 Hooks 时，请使用插件 Hooks。

插件管理的内部 Hooks 有所不同：它们参与本页的粗粒度命令/生命周期事件系统，并以 `plugin:<id>` 的形式显示在 `openclaw hooks list` 中。请使用它们来处理副作用以及与 Hook 包的兼容性，而不是用于有序的中间件或策略网关。

有关完整的插件 Hook 参考，请参阅 [Plugin hooks](/zh/plugins/hooks)。

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

每个 Hook 的环境变量：

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

额外的 Hook 目录：

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

<Note>传统的 `hooks.internal.handlers` 数组配置格式仍然受支持以保持向后兼容，但新的 Hooks 应使用基于发现的系统。</Note>

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

- **保持处理程序快速。** Hooks 在命令处理期间运行。使用 `void processInBackground(event)` 即发即弃地处理繁重工作。
- **优雅地处理错误。** 将有风险的操作包装在 try/catch 中；不要抛出错误，以便其他处理程序能够运行。
- **尽早过滤事件。** 如果事件类型/动作不相关，请立即返回。
- **使用特定的事件键。** 优先使用 `"events": ["command:new"]` 而不是 `"events": ["command"]` 以减少开销。

## 故障排除

### 未发现 Hook

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### Hook 不符合条件

```bash
openclaw hooks info my-hook
```

检查是否缺少二进制文件 (PATH)、环境变量、配置值或操作系统兼容性问题。

### Hook 未执行

1. 验证 Hook 是否已启用：`openclaw hooks list`
2. 重启您的 gateway 进程以重新加载 Hook。
3. 检查 gateway 日志：`./scripts/clawlog.sh | grep hook`

## 相关

- [CLI 参考：hooks](/zh/cli/hooks)
- [Webhooks](/zh/automation/cron-jobs#webhooks)
- [插件 Hooks](/zh/plugins/hooks) — 进程内插件生命周期 Hooks
- [配置](/zh/gateway/configuration-reference#hooks)
