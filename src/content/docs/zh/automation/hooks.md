---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks provide an extensible event-driven system for automating actions in response to agent commands and events. Hooks are automatically discovered from directories and can be inspected with `openclaw hooks`, while hook-pack installation and updates now go through `openclaw plugins`.

## 入门指南

Hooks 是在发生某些事情时运行的小脚本。有两种类型：

- **Hooks** (this page): run inside the Gateway(网关) when agent events fire, like `/new`, `/reset`, `/stop`, or lifecycle events.
- **Webhooks**: external HTTP webhooks that let other systems trigger work in OpenClaw. See [Webhook Hooks](/en/automation/webhook) or use `openclaw webhooks` for Gmail helper commands.

Hooks can also be bundled inside plugins; see [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks). `openclaw hooks list` shows both standalone hooks and plugin-managed hooks.

常见用途：

- 重置会话时保存内存快照
- 保留命令的审计跟踪以进行故障排除或合规性检查
- 在会话开始或结束时触发后续自动化
- 当事件触发时，将文件写入代理工作区或调用外部 API

如果您能编写一个小型的 TypeScript 函数，就能编写 hook。托管和打包的 hooks 是受信任的本地代码。Workspace hooks 会被自动发现，但 OpenClaw 会保持禁用状态，直到您通过 CLI 或配置明确启用它们。

## 概述

Hooks 系统允许您：

- Save 会话 context to memory when `/new` is issued
- 记录所有命令以供审计
- 在代理生命周期事件上触发自定义自动化
- 扩展 OpenClaw 的行为而无需修改核心代码

## 入门

### 内置 Hooks

OpenClaw 附带了四个自动发现的内置 hooks：

- **💾 会话-memory**: Saves 会话 context to your agent workspace (default `~/.openclaw/workspace/memory/`) when you issue `/new` or `/reset`
- **📎 bootstrap-extra-files**: Injects additional workspace bootstrap files from configured glob/path patterns during `agent:bootstrap`
- **📝 command-logger**: Logs all command events to `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: Runs `BOOT.md` when the gateway starts (requires internal hooks enabled)

列出可用的挂钩：

```bash
openclaw hooks list
```

启用挂钩：

```bash
openclaw hooks enable session-memory
```

检查挂钩状态：

```bash
openclaw hooks check
```

获取详细信息：

```bash
openclaw hooks info session-memory
```

### 入职

During 新手引导 (`openclaw onboard`), you'll be prompted to enable recommended hooks. The wizard automatically discovers eligible hooks and presents them for selection.

### 信任边界

Hooks run inside the Gateway(网关) process. Treat bundled hooks, managed hooks, and `hooks.internal.load.extraDirs` as trusted local code. Workspace hooks under `<workspace>/hooks/` are repo-local code, so OpenClaw requires an explicit enable step before loading them.

## Hook 设备发现

Hooks 会按覆盖优先级从高到低的顺序，自动从以下目录中发现：

1. **Bundled hooks**: 随 OpenClaw 一起提供；对于 npm 安装位于 `<openclaw>/dist/hooks/bundled/`（对于编译的二进制文件则位于同级目录 `hooks/bundled/`）
2. **Plugin hooks**: 捆绑在已安装插件中的 hooks（参见 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks)）
3. **Managed hooks**: `~/.openclaw/hooks/`（用户安装的，跨工作区共享；可以覆盖 bundled 和 plugin hooks）。通过 `hooks.internal.load.extraDirs` 配置的 **Extra hook directories** 也被视为 managed hooks，并共享相同的覆盖优先级。
4. **Workspace hooks**: `<workspace>/hooks/`（针对每个 agent，默认禁用，直到显式启用；无法覆盖来自其他源的 hooks）

Workspace hooks 可以为仓库添加新的 hook 名称，但它们无法覆盖具有相同名称的打包、托管或插件提供的 hooks。

托管的 hook 目录可以是 **单个 hook** 或 **hook pack**（包目录）。

每个 hook 都是一个包含以下内容的目录：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Hook Packs (npm/archives)

Hook packs 是标准的 npm 包，通过 `openclaw.hooks` 在 `package.json` 中导出一个或多个 hooks。使用以下命令安装它们：

```bash
openclaw plugins install <path-or-spec>
```

Npm 规范仅限于注册表（包名称 + 可选的确切版本或 dist-tag）。
Git/URL/file 规范和 semver 范围将被拒绝。

Bare specs 和 `@latest` 保持稳定版本。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 将停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本进行显式选择。

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

每个条目指向一个包含 `HOOK.md` 和 `handler.ts`（或 `index.ts`）的 hook 目录。
Hook packs 可以附带依赖项；它们将被安装在 `~/.openclaw/hooks/<id>` 下。
每个 `openclaw.hooks` 条目在解析符号链接后必须保留在包目录内；转义的条目将被拒绝。

安全提示：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安装 hook-pack 依赖项（无生命周期脚本）。保持 hook pack 依赖树为“纯 JS/TS”，并避免依赖 `postinstall` 构建的包。

## Hook 结构

### HOOK.md 格式

`HOOK.md` 文件包含 YAML frontmatter 中的元数据和 Markdown 文档：

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
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

- **`emoji`**: 用于 CLI 显示的表情符号（例如 `"💾"`）
- **`events`**：要监听的事件数组（例如，`["command:new", "command:reset"]`）
- **`export`**：要使用的命名导出（默认为 `"default"`）
- **`homepage`**：文档 URL
- **`os`**：所需平台（例如，`["darwin", "linux"]`）
- **`requires`**：可选要求
  - **`bins`**：PATH 上所需的二进制文件（例如，`["git", "node"]`）
  - **`anyBins`**：必须至少存在这些二进制文件之一
  - **`env`**：所需的环境变量
  - **`config`**：所需的配置路径（例如，`["workspace.dir"]`）
- **`always`**：绕过资格检查（布尔值）
- **`install`**：安装方法（对于捆绑的 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### 处理程序实现

`handler.ts` 文件导出一个 `HookHandler` 函数：

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

每个事件包括：

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway' | 'message',
  action: string,              // e.g., 'new', 'reset', 'stop', 'received', 'sent'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    // Command events (command:new, command:reset):
    sessionEntry?: SessionEntry,       // current session entry
    previousSessionEntry?: SessionEntry, // pre-reset entry (preferred for session-memory)
    commandSource?: string,            // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    cfg?: OpenClawConfig,
    // Command events (command:stop only):
    sessionId?: string,
    // Agent bootstrap events (agent:bootstrap):
    bootstrapFiles?: WorkspaceBootstrapFile[],
    // Message events (see Message Events section for full details):
    from?: string,             // message:received
    to?: string,               // message:sent
    content?: string,
    channelId?: string,
    success?: boolean,         // message:sent
  }
}
```

## 事件类型

### 命令事件

当发出代理命令时触发：

- **`command`**：所有命令事件（通用监听器）
- **`command:new`**：发出 `/new` 命令时
- **`command:reset`**：发出 `/reset` 命令时
- **`command:stop`**：发出 `/stop` 命令时

### 会话事件

- **`session:compact:before`**：紧接在压缩总结历史之前
- **`session:compact:after`**：压缩完成并带有摘要元数据之后

内部 hook 负载将这些作为 `type: "session"` 与 `action: "compact:before"` / `action: "compact:after"` 一起发出；监听者使用上述组合键进行订阅。
特定的处理程序注册使用字面键格式 `${type}:${action}`。对于这些事件，请注册 `session:compact:before` 和 `session:compact:after`。

### 代理事件

- **`agent:bootstrap`**：在注入工作区引导文件之前（hooks 可以修改 `context.bootstrapFiles`）

### Gateway(网关) 事件

网关启动时触发：

- **`gateway:startup`**：在通道启动且 hooks 加载之后

### 会话补丁事件

修改会话属性时触发：

- **`session:patch`**：当会话更新时

#### 会话事件上下文

会话事件包含有关会话及其更改的丰富上下文：

```typescript
{
  sessionEntry: SessionEntry, // The complete updated session entry
  patch: {                    // The patch object (only changed fields)
    // Session identity & labeling
    label?: string | null,           // Human-readable session label

    // AI model configuration
    model?: string | null,           // Model override (e.g., "claude-opus-4-5")
    thinkingLevel?: string | null,   // Thinking level ("off"|"low"|"med"|"high")
    verboseLevel?: string | null,    // Verbose output level
    reasoningLevel?: string | null,  // Reasoning mode override
    elevatedLevel?: string | null,   // Elevated mode override
    responseUsage?: "off" | "tokens" | "full" | null, // Usage display mode

    // Tool execution settings
    execHost?: string | null,        // Exec host (sandbox|gateway|node)
    execSecurity?: string | null,    // Security mode (deny|allowlist|full)
    execAsk?: string | null,         // Approval mode (off|on-miss|always)
    execNode?: string | null,        // Node ID for host=node

    // Subagent coordination
    spawnedBy?: string | null,       // Parent session key (for subagents)
    spawnDepth?: number | null,      // Nesting depth (0 = root)

    // Communication policies
    sendPolicy?: "allow" | "deny" | null,          // Message send policy
    groupActivation?: "mention" | "always" | null, // Group chat activation
  },
  cfg: OpenClawConfig            // Current gateway config
}
```

**安全提示：** 只有特权客户端（包括控制 UI）才能触发 `session:patch` 事件。由于标准的 WebChat 客户端被禁止修补会话（参见 PR #20800），因此该 Hook 不会在这些连接上触发。

有关完整的类型定义，请参阅 `src/gateway/protocol/schema/sessions.ts` 中的 `SessionsPatchParamsSchema`。

#### 示例：会话补丁记录器钩子

```typescript
const handler = async (event) => {
  if (event.type !== "session" || event.action !== "patch") {
    return;
  }
  const { patch } = event.context;
  console.log(`[session-patch] Session updated: ${event.sessionKey}`);
  console.log(`[session-patch] Changes:`, patch);
};

export default handler;
```

### 消息事件

接收或发送消息时触发：

- **`message`**：所有消息事件（通用监听器）
- **`message:received`**：当从任何渠道接收到入站消息时触发。在媒体理解之前的处理早期触发。内容可能包含原始占位符，例如 `<media:audio>`，用于尚未处理的媒体附件。
- **`message:transcribed`**：当一条消息已完全处理（包括音频转录和链接理解）时。此时，`transcript` 包含音频消息的完整转录文本。当您需要访问转录后的音频内容时，请使用此 Hook。
- **`message:preprocessed`**：在所有媒体和链接理解完成后，为每条消息触发，让 Hook 能够在 agent 看到消息之前访问完全丰富的正文（转录、图像描述、链接摘要）。
- **`message:sent`**：当出站消息成功发送时

#### 消息事件上下文

消息事件包含关于该消息的丰富上下文：

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
    threadId?: string | number,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
    guildId?: string,     // Discord guild / server ID
    channelName?: string, // Channel name (e.g., Discord channel name)
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
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file that was transcribed
  mediaType?: string,     // MIME type of the media
}

// message:preprocessed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file
  mediaType?: string,     // MIME type of the media
  isGroup?: boolean,
  groupId?: string,
}
```

#### 示例：消息记录器钩子

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "sent";

const handler = async (event) => {
  if (isMessageReceivedEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Received from ${event.context.from}: ${event.context.content}`);
  } else if (isMessageSentEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Sent to ${event.context.to}: ${event.context.content}`);
  }
};

export default handler;
```

### 工具结果钩子 (插件 API)

这些钩子不是事件流监听器；它们允许插件在 OpenClaw 持久化工具结果之前同步调整这些结果。

- **`tool_result_persist`**：在将工具结果写入会话记录之前对其进行转换。必须是同步的；返回更新后的工具结果负载，或返回 `undefined` 以保持原样。请参阅 [Agent Loop](/en/concepts/agent-loop)。

### 插件钩子事件

#### before_tool_call

在每个工具调用之前运行。插件可以修改参数、阻止调用或请求用户批准。

返回字段：

- **`params`**：覆盖工具参数（与原始参数合并）
- **`block`**：设置为 `true` 以阻止工具调用
- **`blockReason`**：阻止时向代理显示的原因
- **`requireApproval`**：暂停执行并等待通过渠道获得用户批准

`requireApproval` 字段会触发原生平台批准（Telegram 按钮、Discord 组件、`/approve` 命令），而不是依赖代理配合：

```typescript
{
  requireApproval: {
    title: "Sensitive operation",
    description: "This tool call modifies production data",
    severity: "warning",       // "info" | "warning" | "critical"
    timeoutMs: 120000,         // default: 120s
    timeoutBehavior: "deny",   // "allow" | "deny" (default)
    onResolution: async (decision) => {
      // Called after the user resolves: "allow-once", "allow-always", "deny", "timeout", or "cancelled"
    },
  }
}
```

在批准解决、超时或取消后，`onResolution` 回调会使用最终决策字符串被调用。它在插件内部进程内运行（不发送到网关）。使用它来持久化决策、更新缓存或执行清理。

`pluginId` 字段由挂钩运行程序从插件注册自动标记。当多个插件返回 `requireApproval` 时，第一个（优先级最高）获胜。

`block` 优先于 `requireApproval`：如果合并的挂钩结果同时具有 `block: true` 和 `requireApproval` 字段，则工具调用将立即被阻止，而不会触发批准流程。这确保了高优先级插件的阻止操作不能被低优先级插件的批准请求覆盖。

如果网关不可用或不支持插件审批，工具调用将回退到使用 `description` 作为阻止原因的软阻止。

#### 压缩生命周期

通过插件钩子运行器暴露的压缩生命周期钩子：

- **`before_compaction`**：在压缩之前运行，带有计数/token 元数据
- **`after_compaction`**：在压缩之后运行，带有压缩摘要元数据

### 未来事件

计划的事件类型：

- **`session:start`**：当新会话开始时
- **`session:end`**：当会话结束时
- **`agent:error`**：当代理遇到错误时

## 创建自定义钩子

### 1. 选择位置

- **工作区钩子** (`<workspace>/hooks/`)：针对每个代理；可以添加新的钩子名称，但不能覆盖同名捆绑的、托管或插件钩子
- **托管钩子** (`~/.openclaw/hooks/`)：在工作区之间共享；可以覆盖捆绑和插件钩子

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
const handler = async (event) => {
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

### 每个钩子的配置

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

从其他目录加载钩子（视为托管钩子，具有相同的覆盖优先级）：

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

### 旧配置格式（仍然支持）

旧的配置格式仍然有效，以保持向后兼容性：

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

注意：`module` 必须是相对于工作区的路径。绝对路径和工作区之外的路径遍历将被拒绝。

**迁移**：对新钩子使用新的基于发现的系统。旧的处理程序在基于目录的钩子之后加载。

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

## 捆绑的 Hook 参考

### 会话记忆

当您发出 `/new` 或 `/reset` 时，将会话上下文保存到记忆中。

**事件**：`command:new`、`command:reset`

**要求**：必须配置 `workspace.dir`

**输出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（默认为 `~/.openclaw/workspace`）

**作用**：

1. 使用重置前的会话条目来定位正确的脚本
2. 从对话中提取最后 15 条用户/助手消息（可配置）
3. 使用 LLM 生成描述性的文件名标识符
4. 将会话元数据保存到带有日期的记忆文件中

**输出示例**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram

## Conversation Summary

user: Can you help me design the API?
assistant: Sure! Let's start with the endpoints...
```

**文件名示例**：

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（如果标识符生成失败，则使用回退时间戳）

**启用**：

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**事件**：`agent:bootstrap`

**要求**：必须配置 `workspace.dir`

**输出**：未写入任何文件；引导上下文仅在内存中修改。

**配置**：

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

**配置选项**：

- `paths` (string[]): 从工作区解析的 glob/路径模式。
- `patterns` (string[]): `paths` 的别名。
- `files` (string[]): `paths` 的别名。

**注意**：

- 路径是相对于工作区解析的。
- 文件必须保留在工作区内（已通过 realpath 检查）。
- 仅加载已识别的引导基本名称 (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`, `memory.md`)。
- 对于子代理/ cron 会话，适用更严格的允许列表 (`AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`)。

**启用**：

```bash
openclaw hooks enable bootstrap-extra-files
```

### command-logger

将所有命令事件记录到集中式审计文件中。

**事件**： `command`

**要求**：无

**输出**： `~/.openclaw/logs/commands.log`

**作用**：

1. 捕获事件详细信息（命令动作、时间戳、会话密钥、发送者 ID、来源）
2. 以 JSONL 格式追加到日志文件
3. 在后台静默运行

**示例日志条目**：

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

### boot-md

在网关启动时（通道启动后）运行 `BOOT.md`。
必须启用内部 Hook 才能运行此程序。

**事件**：`gateway:startup`

**要求**：必须配置 `workspace.dir`

**功能**：

1. 从您的工作区读取 `BOOT.md`
2. 通过代理运行器运行指令
3. 通过消息工具发送任何请求的出站消息

**启用**：

```bash
openclaw hooks enable boot-md
```

## 最佳实践

### 保持处理程序快速

Hook 在命令处理期间运行。保持轻量级：

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

如果事件不相关，请尽早返回：

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### 使用特定的事件键

尽可能在元数据中指定确切的事件：

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

而不是：

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## 调试

### 启用 Hook 日志记录

网关在启动时会记录 Hook 的加载情况：

```
Registered hook: session-memory -> command:new
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 检查设备发现

列出所有已发现的 Hook：

```bash
openclaw hooks list --verbose
```

### 检查注册

在你的处理程序中，记录调用时间：

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### 验证资格

检查 Hook 不符合资格的原因：

```bash
openclaw hooks info my-hook
```

在输出中查找缺失的要求。

## 测试

### Gateway(网关) 日志

监控网关日志以查看 Hook 执行情况：

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### 直接测试 Hooks

单独测试你的处理程序：

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
Scan directories (bundled → plugin → managed + extra dirs → workspace)
    ↓
Parse HOOK.md files
    ↓
Sort by override precedence (bundled < plugin < managed < workspace)
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

### 挂钩未发现

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

### 挂钩不符合资格

检查要求：

```bash
openclaw hooks info my-hook
```

查找缺失项：

- 二进制文件（检查 PATH）
- 环境变量
- 配置值
- 操作系统兼容性

### 挂钩未执行

1. 验证挂钩是否已启用：

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重启您的网关进程以便重新加载挂钩。

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

### 从旧版配置到发现

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

1. 创建挂钩目录：

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

- [CLI 参考：hooks](/en/cli/hooks)
- [Bundled Hooks README](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/en/automation/webhook)
- [配置](/en/gateway/configuration-reference#hooks)
