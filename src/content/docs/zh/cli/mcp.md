---
summary: "通过 MCP 公开 OpenClaw 渠道对话并管理已保存的 MCP 服务器定义"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "mcp"
---

# mcp

`openclaw mcp` 有两个任务：

- 使用 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 使用 `list`、`show`、
  `set` 和 `unset` 管理 OpenClaw 拥有的出站 MCP 服务器定义

换句话说：

- `serve` 是作为 MCP 服务器运行的 OpenClaw
- `list` / `show` / `set` / `unset` 是作为 MCP 客户端
  注册表运行的 OpenClaw，用于存储其运行时稍后可能使用的其他 MCP 服务器

当 OpenClaw 应自行托管编程工具
会话并通过 ACP 路由该运行时时，请使用 [`openclaw acp`](/en/cli/acp)。

## OpenClaw 作为 MCP 服务器

这是 `openclaw mcp serve` 路径。

## 何时使用 `serve`

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或另一个 MCP 客户端应直接与
  OpenClaw 支持的渠道对话
- 您已经拥有一个本地或远程的带有路由会话的 OpenClaw Gateway(网关)
- 您希望拥有一个可跨 OpenClaw 渠道后端工作的 MCP 服务器，
  而不是运行单独的每渠道桥接器

当 OpenClaw 应自行托管编程
运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/en/cli/acp)。

## 工作原理

`openclaw mcp serve` 启动一个 stdio MCP 服务器。该 MCP 客户端拥有该
进程。当客户端保持 stdio 会话打开时，网桥会通过 WebSocket 连接到
本地或远程 OpenClaw Gateway(网关)，并通过 MCP 公开路由后的渠道
对话。

生命周期：

1. MCP 客户端生成 `openclaw mcp serve`
2. 桥接器连接到 Gateway(网关)
3. 路由会话成为 MCP 对话以及脚本/历史记录工具
4. 桥接器连接时，实时事件在内存中排队
5. 如果启用了 Claude 渠道模式，同一会话也可以接收
   Claude 特定的推送通知

重要行为：

- 当桥接器连接时，实时队列状态开始
- 旧的脚本历史记录使用 `messages_read` 读取
- Claude 推送通知仅在 MCP 会话存活时存在
- 当客户端断开连接时，桥接器退出，实时队列消失

## 选择客户端模式

通过两种不同的方式使用同一个桥接器：

- 通用 MCP 客户端：仅限标准 MCP 工具。使用 `conversations_list`、
  `messages_read`、`events_poll`、`events_wait`、`messages_send` 以及
  批准工具。
- Claude Code：标准 MCP 工具以及 Claude 特定的渠道适配器。
  启用 `--claude-channel-mode on` 或保留默认的 `auto`。

目前，`auto` 的行为与 `on` 相同。尚无客户端功能检测
功能。

## `serve` 公开的内容

桥接器使用现有的 Gateway(网关) 会话路由元数据来暴露由渠道支持的
对话。当 OpenClaw 已经与已知路由（例如）拥有会话状态时，
对话就会出现：

- `channel`
- 收件人或目标元数据
- 可选 `accountId`
- 可选 `threadId`

这为 MCP 客户端提供了一个集中地来：

- 列出最近的路由对话
- 阅读最近的对话历史记录
- 等待新的入站事件
- 通过同一路由发回回复
- 查看在桥接器连接期间到达的审批请求

## 使用方法

```bash
# Local Gateway
openclaw mcp serve

# Remote Gateway
openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Remote Gateway with password auth
openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password

# Enable verbose bridge logs
openclaw mcp serve --verbose

# Disable Claude-specific push notifications
openclaw mcp serve --claude-channel-mode off
```

## 桥接工具

当前的桥接器暴露这些 MCP 工具：

- `conversations_list`
- `conversation_get`
- `messages_read`
- `attachments_fetch`
- `events_poll`
- `events_wait`
- `messages_send`
- `permissions_list_open`
- `permissions_respond`

### `conversations_list`

列出最近的支持会话的对话，这些对话在
Gateway(网关) 会话状态中已经具有路由元数据。

有用的过滤器：

- `limit`
- `search`
- `channel`
- `includeDerivedTitles`
- `includeLastMessage`

### `conversation_get`

根据 `session_key` 返回一个对话。

### `messages_read`

读取一个基于会话的对话的最近逐字稿消息。

### `attachments_fetch`

从一条逐字稿消息中提取非文本消息内容块。这是针对逐字稿内容的元数据视图，而非独立的持久化附件 Blob 存储。

### `events_poll`

从数字游标开始读取已加入队列的实时事件。

### `events_wait`

进行长轮询，直到下一个匹配的队列事件到达或超时过期。

当通用 MCP 客户端需要近乎实时的传递且不使用 Claude 特定的推送协议时，请使用此功能。

### `messages_send`

通过已记录在会话上的同一路径发回文本。

当前行为：

- 需要现有的对话路径
- 使用会话的渠道、接收者、账号 ID 和线程 ID
- 仅发送文本

### `permissions_list_open`

列出桥接器自连接到 Gateway(网关) 以来观察到的待处理 exec/plugin 批准请求。

### `permissions_respond`

通过以下方式解决一个待处理的 exec/plugin 批准请求：

- `allow-once`
- `allow-always`
- `deny`

## 事件模型

桥接器在连接时会在内存中保留一个事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

重要限制：

- 队列仅用于实时；它在 MCP 桥接器启动时开始
- `events_poll` 和 `events_wait` 本身不会重放旧的 Gateway(网关) 历史记录
- 应使用 `messages_read` 读取持久积压

## Claude 渠道通知

桥接器还可以公开 Claude 特定的渠道通知。这相当于 Claude Code 渠道适配器的 OpenClaw 版本：标准的 MCP 工具仍然可用，但实时传入的消息也可以作为 Claude 特定的 MCP 通知到达。

标志：

- `--claude-channel-mode off`：仅标准 MCP 工具
- `--claude-channel-mode on`：启用 Claude 渠道通知
- `--claude-channel-mode auto`：当前默认值；与 `on` 具有相同的桥接行为

启用 Claude 渠道模式时，服务器会公布 Claude 实验性功能并可以发送：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 传入的 `user` 脚本消息被转发为
  `notifications/claude/channel`
- 通过 MCP 接收的 Claude 权限请求将在内存中跟踪
- 如果关联的对话稍后发送 `yes abcde` 或 `no abcde`，桥接器
  会将其转换为 `notifications/claude/channel/permission`
- 这些通知仅适用于实时会话；如果 MCP 客户端断开连接，
  则不存在推送目标

这是特意针对特定客户端的。通用 MCP 客户端应依赖
标准轮询工具。

## MCP 客户端配置

示例 stdio 客户端配置：

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": ["mcp", "serve", "--url", "wss://gateway-host:18789", "--token-file", "/path/to/gateway.token"]
    }
  }
}
```

对于大多数通用 MCP 客户端，请从标准工具界面开始，并忽略
Claude 模式。仅对确实理解 Claude 特定通知方法的客户端启用 Claude 模式。

## 选项

`openclaw mcp serve` 支持：

- `--url <url>`: Gateway(网关) WebSocket URL
- `--token <token>`: Gateway(网关) token
- `--token-file <path>`: 从文件读取 token
- `--password <password>`: Gateway(网关) 密码
- `--password-file <path>`: 从文件读取密码
- `--claude-channel-mode <auto|on|off>`: Claude 通知模式
- `-v`, `--verbose`: 在 stderr 上输出详细日志

如果可能，请优先使用 `--token-file` 或 `--password-file` 而非内联机密信息。

## 安全与信任边界

桥接器不会发明路由规则。它仅公开 Gateway(网关)
已经知道如何路由的对话。

这意味着：

- 发送方白名单、配对和渠道级信任仍然属于
  底层 OpenClaw 渠道配置
- `messages_send` 只能通过现有的存储路由进行回复
- 审批状态仅在当前桥接会话中存在于内存中
- bridge auth 应该使用与您信任用于任何其他远程 Gateway(网关) 客户端相同的 Gateway(网关) 令牌或密码控制

如果 `conversations_list` 中缺少对话，通常原因并非
MCP 配置问题。而是底层 Gateway(网关) 会话中缺失或不完整的路由元数据。

## 测试

OpenClaw 为此桥接提供了一个确定性的 Docker 冒烟测试：

```bash
pnpm test:docker:mcp-channels
```

该冒烟测试：

- 启动一个已设置种子的 Gateway(网关) 容器
- 启动第二个容器来生成 `openclaw mcp serve`
- 验证对话发现、脚本读取、附件元数据读取、实时事件队列行为以及出站发送路由
- 通过真实的 stdio MCP 桥接验证 Claude 风格的渠道和权限通知

这是证明桥接有效而无需将真实的 Telegram、Discord 或 iMessage 账户连接到测试运行的最快方法。

有关更广泛的测试上下文，请参阅 [测试](/en/help/testing)。

## 故障排除

### 未返回任何对话

通常意味着 Gateway(网关) 会话尚不可路由。请确认底层会话已存储渠道/提供商、收件人以及可选的账户/线程路由元数据。

### `events_poll` 或 `events_wait` 缺少旧消息

预期行为。实时队列在桥接连接时启动。请使用 `messages_read` 读取旧的历史记录。

### Claude 通知未显示

检查所有这些：

- 客户端保持 stdio MCP 会话打开
- `--claude-channel-mode` 为 `on` 或 `auto`
- 客户端确实理解 Claude 特定的通知方法
- 入站消息发生在桥接连接之后

### 批准请求丢失

`permissions_list_open` 仅显示桥接连接期间观察到的审批请求。它不是一个持久的审批历史 API。

## OpenClaw 作为 MCP 客户端注册表

这是 `openclaw mcp list`、`show`、`set` 和 `unset` 路径。

这些命令不通过 MCP 暴露 OpenClaw。它们在 OpenClaw 配置的 `mcp.servers` 下管理 OpenClaw 拥有的 MCP
服务器定义。

这些保存的定义专供 OpenClaw 稍后启动或配置的运行时使用，例如嵌入式 Pi 和其他运行时适配器。OpenClaw 将这些定义集中存储，以便这些运行时无需维护自己的重复 MCP 服务器列表。

重要行为：

- 这些命令仅读取或写入 OpenClaw 配置
- 它们不连接到目标 MCP 服务器
- 它们不验证命令、URL 或远程传输当前是否可访问
- 运行时适配器在执行时决定它们实际支持哪些传输形式

## 已保存的 MCP 服务器定义

OpenClaw 还在配置中存储了一个轻量级的 MCP 服务器注册表，供需要 OpenClaw 托管的 MCP 定义的界面使用。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

示例配置形式：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com"
      }
    }
  }
}
```

### Stdio 传输

启动本地子进程并通过 stdin/stdout 进行通信。

| 字段                       | 描述                       |
| -------------------------- | -------------------------- |
| `command`                  | 要生成的可执行文件（必需） |
| `args`                     | 命令行参数数组             |
| `env`                      | 额外的环境变量             |
| `cwd` / `workingDirectory` | 进程的工作目录             |

### SSE / HTTP 传输

通过 HTTP 服务器发送事件连接到远程 MCP 服务器。

| 字段                | 描述                                           |
| ------------------- | ---------------------------------------------- |
| `url`               | 远程服务器的 HTTP 或 HTTPS URL（必需）         |
| `headers`           | HTTP 标头的可选键值映射（例如身份验证令牌）    |
| `connectionTimeout` | 每个服务器的连接超时时间，以毫秒为单位（可选） |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url`（用户信息）和 `headers` 中的敏感值在日志和
状态输出中会被编辑隐藏。

### 可流式 HTTP 传输

`streamable-http` 是除了 `sse` 和 `stdio` 之外的额外传输选项。它使用 HTTP 流与远程 MCP 服务器进行双向通信。

| 字段                | 描述                                           |
| ------------------- | ---------------------------------------------- |
| `url`               | 远程服务器的 HTTP 或 HTTPS URL（必需）         |
| `transport`         | 设置为 `"streamable-http"` 以选择此传输方式    |
| `headers`           | HTTP 标头的可选键值映射（例如身份验证令牌）    |
| `connectionTimeout` | 每个服务器的连接超时时间，以毫秒为单位（可选） |

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeout": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

这些命令仅管理已保存的配置。它们不启动渠道桥接器，
不打开实时 MCP 客户端会话，也不证明目标服务器是可访问的。

## 当前限制

本页面记录了目前发布的桥接器功能。

当前限制：

- 会话发现依赖于现有的 Gateway(网关) 会话路由元数据
- 除了 Claude 特定的适配器外，没有通用的推送协议
- 尚无消息编辑或反应工具
- HTTP/SSE/streamable-http 传输连接到单个远程服务器；尚不支持多路复用上游
- `permissions_list_open` 仅包含桥接器连接时观察到的批准
