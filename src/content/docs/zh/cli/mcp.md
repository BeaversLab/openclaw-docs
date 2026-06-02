---
summary: "通过 MCP 暴露 OpenClaw 渠道对话并管理已保存的 MCP 服务器定义"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有两个任务：

- 使用 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 使用 `list`、`show`、`set` 和 `unset` 管理 OpenClaw 拥有的出站 MCP 服务器定义

换句话说：

- `serve` 是作为 MCP 服务器运行的 OpenClaw
- `list` / `show` / `set` / `unset` 是作为 MCP 客户端注册表运行的 OpenClaw，用于其运行时稍后可能使用的其他 MCP 服务器

当 OpenClaw 应该自己托管编码器连接会话并通过 ACP 路由该运行时，请使用 [`openclaw acp`](/zh/cli/acpOpenClaw)。

## OpenClaw 作为 MCP 服务器

这是 `openclaw mcp serve` 路径。

### 何时使用 `serve`

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或另一个 MCP 客户端应直接与 OpenClaw 支持的渠道对话进行通信
- 您已经拥有一个本地或远程的带有路由会话的 OpenClaw Gateway(网关)
- 你需要一个在 OpenClaw 的渠道后端中工作的 MCP 服务器，而不是运行单独的每个渠道的桥接器

当 OpenClaw 应该自己托管编码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/zh/cli/acpOpenClawOpenClaw)。

### 工作原理

`openclaw mcp serve` 启动一个 stdio MCP 服务器。MCP 客户端拥有该进程。当客户端保持 stdio 会话打开时，桥接器通过 WebSocket 连接到本地或远程 OpenClaw Gateway(网关)，并通过 MCP 暴露路由的渠道对话。

<Steps>
  <Step title="客户端生成桥接器">MCP 客户端生成 `openclaw mcp serve`。</Step>
  <Step title="桥接器连接到 Gateway(网关)">桥接器通过 WebSocket 连接到 OpenClaw Gateway(网关)。</Step>
  <Step title="会话成为 MCP 对话">路由的会话会成为 MCP 对话以及转录/历史工具。</Step>
  <Step title="实时事件队列">网桥连接期间，实时事件会在内存中排队。</Step>
  <Step title="可选的 Claude 推送">如果启用了 Claude 渠道模式，同一会话也可以接收 Claude 特定的推送通知。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行为">
    - 实时队列状态在桥接连接时启动
    - 较旧的对话记录历史通过 `messages_read` 读取
    - Claude 推送通知仅在 MCP 会话存活期间存在
    - 当客户端断开连接时，桥接退出且实时队列消失
    - 一次性代理入口点（如 `openclaw agent` 和 `openclaw infer model run`OpenClaw）会在回复完成后关闭它们打开的任何捆绑的 MCP 运行时，因此重复的脚本运行不会累积 stdio MCP 子进程
    - 由 OpenClaw 启动的 stdio MCP 服务器（捆绑的或用户配置的）会在关闭时作为进程树被拆除，因此由服务器启动的子子进程不会在父 stdio 客户端退出后继续存在
    - 删除或重置会话会通过共享运行时清理路径释放该会话的 MCP 客户端，因此不存在与已删除会话绑定的残留 stdio 连接

  </Accordion>
</AccordionGroup>

### 选择客户端模式

以两种不同的方式使用同一网桥：

<Tabs>
  <Tab title="通用 MCP 客户端">仅限标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 和批准工具。</Tab>
  <Tab title="Claude Code">标准 MCP 工具加上 Claude 特定的渠道适配器。启用 `--claude-channel-mode on` 或保留默认的 `auto`。</Tab>
</Tabs>

<Note>今天，`auto` 的行为与 `on` 相同。目前尚无客户端功能检测。</Note>

### `serve` 暴露的内容

该网桥使用现有的 Gateway(网关) 会话路由元数据来暴露基于渠道的对话。当 OpenClaw 与已知路由（例如：）已存在会话状态时，对话才会出现：

- `channel`
- 接收者或目标元数据
- 可选的 `accountId`
- 可选的 `threadId`

这为 MCP 客户端提供了一个统一的地方来：

- 列出最近的已路由对话
- 阅读最近的转录历史
- 等待新的入站事件
- 通过同一路由发回回复
- 查看在网桥连接期间到达的审批请求

### 用法

<Tabs>
  <Tab title="本地 Gateway(网关)">```bash openclaw mcp serve ```</Tab>
  <Tab title="远程 Gateway(网关) (token)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="远程 Gateway(网关) (密码)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="详细模式 / Claude 关闭">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### 网桥工具

当前网桥暴露了以下 MCP 工具：

<AccordionGroup>
  <Accordion title="conversations_list">
    列出最近的基于会话的对话，这些对话在 Gateway(网关) 会话状态中已具有路由元数据。

    有用的过滤器：

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    使用直接的 Gateway(网关) 会话查找通过 `session_key`Gateway(网关) 返回一个对话。
  </Accordion>
  <Accordion title="messages_read">
    读取一个基于会话的对话的最近转录消息。
  </Accordion>
  <Accordion title="attachments_fetch">
    从单条记录消息中提取非文本消息内容块。这是对记录内容的元数据视图，而非独立的持久化附件 Blob 存储。
  </Accordion>
  <Accordion title="events_poll">
    从数字游标开始读取已排队的实时事件。
  </Accordion>
  <Accordion title="events_wait">
    长轮询，直到下一个匹配的排队事件到达或超时过期。

    当通用 MCP 客户端需要准实时交付，而不使用 Claude 特定的推送协议时，请使用此方法。

  </Accordion>
  <Accordion title="messages_send">
    通过会话上已记录的相同路由发回文本。

    当前行为：

    - 需要现有的对话路由
    - 使用会话的渠道、接收者、账户 ID 和线程 ID
    - 仅发送文本

  </Accordion>
  <Accordion title="permissions_list_open">
    列出桥接器自连接到 Gateway(网关) 以来观察到的待处理 exec/plugin 批准请求。
  </Accordion>
  <Accordion title="permissions_respond">
    使用以下方法解决一个待处理的 exec/plugin 批准请求：

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### 事件模型

桥接器在连接期间会保持内存中的事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- 队列仅限实时；它在 MCP 桥接启动时开始
- `events_poll` 和 `events_wait`Gateway(网关) 本身不会重播旧的 Gateway(网关) 历史
- 持久积压工作应使用 `messages_read` 读取

</Warning>

### Claude 渠道通知

The bridge can also expose Claude-specific 渠道 notifications. This is the OpenClaw equivalent of a Claude Code 渠道 adapter: standard MCP tools remain available, but live inbound messages can also arrive as Claude-specific MCP notifications.

<Tabs>
  <Tab title="off">`--claude-channel-mode off`: standard MCP tools only.</Tab>
  <Tab title="on">`--claude-channel-mode on`: enable Claude 渠道 notifications.</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto`: current default; same bridge behavior as `on`.</Tab>
</Tabs>

When Claude 渠道 mode is enabled, the server advertises Claude experimental capabilities and can emit:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Current bridge behavior:

- inbound `user` transcript messages are forwarded as `notifications/claude/channel`
- Claude permission requests received over MCP are tracked in-memory
- if the linked conversation later sends `yes abcde` or `no abcde`, the bridge converts that to `notifications/claude/channel/permission`
- these notifications are live-会话 only; if the MCP client disconnects, there is no push target

This is intentionally client-specific. Generic MCP clients should rely on the standard polling tools.

### MCP client config

Example stdio client config:

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

For most generic MCP clients, start with the standard 工具 surface and ignore Claude mode. Turn Claude mode on only for clients that actually understand the Claude-specific notification methods.

### Options

`openclaw mcp serve` supports:

<ParamField path="--url" type="string">
  Gateway(网关) WebSocket URL。
</ParamField>
<ParamField path="--token" type="string">
  Gateway(网关) 令牌。
</ParamField>
<ParamField path="--token-file" type="string">
  从文件读取令牌。
</ParamField>
<ParamField path="--password" type="string">
  Gateway(网关) 密码。
</ParamField>
<ParamField path="--password-file" type="string">
  从文件读取密码。
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude 通知模式。
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  在 stderr 上输出详细日志。
</ParamField>

<Tip>尽可能使用 `--token-file` 或 `--password-file` 而不是内联密钥。</Tip>

### 安全与信任边界

网桥不会虚构路由。它仅暴露 Gateway(网关)已知如何路由的会话。

这意味着：

- 发送者白名单、配对和渠道级别的信任仍然属于底层 OpenClaw 渠道配置
- `messages_send` 只能通过现有的存储路由进行回复
- 批准状态仅对当前网桥会话是实时的/内存中的
- 网桥身份验证应使用您信任用于任何其他远程 Gateway(网关)客户端的相同 Gateway(网关) 令牌或密码控制

如果 `conversations_list` 中缺少会话，通常原因不是 MCP 配置。它是底层 Gateway(网关) 会话中缺少或不完整的路由元数据。

### 测试

OpenClaw 随附了一个确定性的 Docker 烟雾测试用于此网桥：

```bash
pnpm test:docker:mcp-channels
```

该烟雾测试：

- 启动一个已设定种子的 Gateway(网关) 容器
- 启动第二个容器，该容器生成 `openclaw mcp serve`
- 验证会话发现、记录读取、附件元数据读取、实时事件队列行为和出站发送路由
- 通过真实的 stdio MCP 网桥验证 Claude 风格的渠道和权限通知

这是在不将真实的 Telegram、Discord 或 iMessage 账户连接到测试运行的情况下证明网桥工作的最快方法。

有关更广泛的测试上下文，请参阅 [Testing](/zh/help/testing)。

### 故障排除

<AccordionGroup>
  <Accordion title="No conversations returned">
    通常表示 Gateway(网关) 会话尚不可路由。请确认底层会话已存储 渠道/提供商、recipient 以及可选的 account/thread 路由元数据。
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    预期行为。实时队列在桥接连接时启动。使用 `messages_read` 读取旧的记录历史。
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    请检查以下所有项：

    - 客户端是否保持 stdio MCP 会话开启
    - `--claude-channel-mode` 是否为 `on` 或 `auto`
    - 客户端是否确实理解 Claude 特定的通知方法
    - 入站消息是否发生在桥接连接之后

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` 仅显示在桥接连接期间观察到的审批请求。它不是一个持久的审批历史 API。
  </Accordion>
</AccordionGroup>

## OpenClaw 作为 MCP 客户端注册表

这是 `openclaw mcp list`、`show`、`status`、`probe`、`add`、`set`、
`configure`、`tools`、`login`、`reload` 和 `unset` 路径。

这些命令不会通过 MCP 公开 OpenClaw。它们管理 OpenClaw 配置中 OpenClawOpenClaw`mcp.servers`OpenClaw 下 OpenClaw 拥有的 MCP 服务器定义。

这些保存的定义适用于 OpenClaw 稍后启动或配置的运行时，例如嵌入式 OpenClaw 和其他运行时适配器。OpenClaw 集中存储这些定义，以便这些运行时无需维护自己重复的 MCP 服务器列表。

<AccordionGroup>
  <Accordion title="重要行为">
    - 这些命令仅读取或写入 OpenClaw 配置
    - `status`、`list`、`show`、`set`、`configure`、`tools`、`reload` 和 `unset` 不会连接到目标 MCP 服务器
    - `probe` 连接到选定的服务器或所有配置的服务器，列出工具，并报告功能/诊断信息
    - `add` 在保存之前从标志和探测构建定义，除非设置了 `--no-probe` 或首先需要 OAuth 授权
    - 运行时适配器决定它们在执行时实际支持哪些传输形式
    - `enabled: false` 保持服务器已保存，但将其从嵌入式运行时发现中排除
    - `timeout` 和 `connectTimeout` 以秒为单位设置每个服务器的请求和连接超时
    - `supportsParallelToolCalls: true` 标记适配器可以并发调用的服务器
    - HTTP 服务器可以使用静态标头、OAuth 登录、TLS 验证控制和 mTLS 证书/密钥路径
    - 嵌入式 OpenClaw 在常规 `coding` 和 `messaging` 工具配置文件中公开已配置的 MCP 工具；`minimal` 仍然隐藏它们，而 `tools.deny: ["bundle-mcp"]` 显式禁用它们
    - 每个服务器的 `toolFilter.include` 和 `toolFilter.exclude` 在发现的 MCP 工具成为 OpenClaw 工具之前对其进行过滤
    - 宣布资源或提示的服务器还公开用于列出/读取资源和列出/获取提示的实用工具；这些生成的实用名称（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`）使用相同的包含/排除过滤器
    - 动态 MCP 工具列表更改会使该会话的缓存目录失效；下一次发现/使用会从服务器刷新
    - 重复的 MCP 工具请求/协议故障会短暂暂停该服务器，以防止一个损坏的服务器占用整个轮次
    - 会话范围的捆绑 MCP 运行时在空闲 `mcp.sessionIdleTtlMs` 毫秒后被回收（默认为 10 分钟；设置 `0` 以禁用），一次性嵌入式运行在运行结束时清理它们

  </Accordion>
</AccordionGroup>

运行时适配器可能会将此共享注册表规范化为其下游客户端预期的形状。例如，嵌入式 OpenClaw 直接消耗 OpenClaw OpenClawOpenClaw`transport`CLI 值，而 Claude Code 和 Gemini 接收 CLI 原生的 `type` 值，例如 `http`、`sse` 或 `stdio`。

Codex app-server 还会遵守每个服务器上可选的 `codex`OpenClaw 块。这是仅用于 Codex app-server 线程的 OpenClaw 投影元数据；它不会更改 ACP 会话、通用 Codex harness 配置或其他运行时适配器。使用非空的 `codex.agents`OpenClaw 将服务器仅投影到特定的 OpenClaw agent ID。配置验证会拒绝空、空白或无效的代理列表，并且运行时投影路径会将其省略，而不是使其变为全局。使用 `codex.defaultToolsApprovalMode`（`auto`、`prompt` 或 `approve`）为受信任的服务器发出 Codex 的原生 `default_tools_approval_mode`OpenClaw。OpenClaw 在将原生 `mcp_servers` 配置移交给 Codex 之前，会剥离 `codex` 元数据。

### 已保存的 MCP 服务器定义

OpenClaw 还会在配置中存储一个轻量级的 MCP 服务器注册表，用于需要 OpenClaw 管理的 MCP 定义的界面。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

注：

- `list` 对服务器名称进行排序。
- 不带名称的 `show` 会打印完整的已配置 MCP 服务器对象。
- `status` 对已配置的传输进行分类而不进行连接。
- `probe` 进行连接并报告工具数量、资源/提示支持、列表更改支持和诊断信息。
- `add` 接受 stdio 标志，如 `--command`、`--arg`、`--env` 和 `--cwd`，或 HTTP 标志，如 `--url`、`--transport`、`--header`、`--auth oauth`、TLS、timeout 和 工具-selection 标志。
- `set` 期望在命令行上有一个 JSON 对象值。
- `configure`OAuth 更新启用状态、工具过滤器、超时、OAuth、TLS 和 parallel-工具-call 提示，而无需替换整个服务器定义。
- `tools` 更新每个服务器的工具过滤器。包含/排除条目是 MCP 工具名称和简单的 `*` 通配符。
- `login`OAuth 为配置了 `auth: "oauth"` 的 HTTP 服务器运行 OAuth 流程。第一次运行会打印授权 URL；批准后，使用 `--code` 重新运行。
- `reload`Gateway(网关) 释放缓存中的进程内 MCP 运行时。另一个进程中的 Gateway 或代理进程仍需要它们自己的重新加载或重新启动路径。
- 对于可流式传输的 HTTP MCP 服务器，请使用 `transport: "streamable-http"`。`openclaw mcp set`CLI 还会将 CLI 原生的 `type: "http"` 规范化为相同的规范配置形状，以确保兼容性。
- 如果指定的服务器不存在，`unset` 将失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp unset context7
```

示例配置形状：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com",
        "transport": "streamable-http",
        "timeout": 20,
        "connectTimeout": 5,
        "supportsParallelToolCalls": true,
        "auth": "oauth",
        "oauth": {
          "scope": "docs.read"
        },
        "sslVerify": true,
        "clientCert": "/path/to/client.crt",
        "clientKey": "/path/to/client.key",
        "toolFilter": {
          "include": ["search_*"],
          "exclude": ["admin_*"]
        }
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

<Warning>
**Stdio 环境变量安全过滤器**

即使出现在服务器的 OpenClawRPC`env` 块中，OpenClaw 也会拒绝在第一次 RPC 之前可能改变 stdio MCP 服务器启动方式的解释器启动环境变量键。被阻止的键包括 `NODE_OPTIONS`、`NODE_REDIRECT_WARNINGS`、`NODE_REPL_EXTERNAL_MODULE`、`NODE_REPL_HISTORY`、`NODE_V8_COVERAGE`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 以及类似的运行时控制变量。启动时会因配置错误而拒绝这些变量，以防止它们注入隐式序言、交换解释器、启用调试器或重定向针对 stdio 进程的运行时输出。普通的凭据、代理和特定于服务器的环境变量（`GITHUB_TOKEN`、`HTTP_PROXY`、自定义 `*_API_KEY` 等）不受影响。

如果您的 MCP 服务器确实需要其中一个被阻止的变量，请将其设置在网关主机进程上，而不是在 stdio 服务器的 `env` 下。

</Warning>

### SSE / HTTP 传输

通过 HTTP 服务器发送事件连接到远程 MCP 服务器。

| 字段                           | 描述                                                |
| ------------------------------ | --------------------------------------------------- |
| `url`                          | 远程服务器的 HTTP 或 HTTPS URL（必需）              |
| `headers`                      | 可选的 HTTP 标头键值对映射（例如身份验证令牌）      |
| `connectionTimeoutMs`          | 每个服务器的连接超时时间，以毫秒为单位（可选）      |
| `connectTimeout`               | 每个服务器的连接超时时间，以秒为单位（可选）        |
| `timeout` / `requestTimeoutMs` | 每个服务器的 MCP 请求超时时间，以秒或毫秒为单位     |
| `auth: "oauth"`                | 使用 MCP OAuth 令牌存储和 OAuth`openclaw mcp login` |
| `sslVerify`                    | 仅针对明确受信任的私有 HTTPS 端点设置为 false       |
| `clientCert` / `clientKey`     | mTLS 客户端证书和密钥路径                           |
| `supportsParallelToolCalls`    | 提示并发调用对此服务器是安全的                      |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "timeout": 20,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url`（userinfo）和 `headers` 中的敏感值在日志和状态输出中会被编辑。

### 可流式传输的 HTTP 传输

`streamable-http` 是除了 `sse` 和 `stdio` 之外的额外传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段                           | 描述                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `url`                          | 远程服务器的 HTTP 或 HTTPS URL（必需）                                       |
| `transport`                    | 设置为 `"streamable-http"` 以选择此传输方式；如果省略，OpenClaw 将使用 `sse` |
| `headers`                      | HTTP 头的可选键值映射（例如身份验证令牌）                                    |
| `connectionTimeoutMs`          | 每个服务器的连接超时时间（毫秒）（可选）                                     |
| `connectTimeout`               | 每个服务器的连接超时时间（秒）（可选）                                       |
| `timeout` / `requestTimeoutMs` | 每个服务器的 MCP 请求超时时间（秒或毫秒）                                    |
| `auth: "oauth"`                | 使用 MCP OAuth 令牌存储和 `openclaw mcp login`                               |
| `sslVerify`                    | 仅对显式受信任的私有 HTTPS 端点设置为 false                                  |
| `clientCert` / `clientKey`     | mTLS 客户端证书和密钥路径                                                    |
| `supportsParallelToolCalls`    | 提示该服务器允许并发调用                                                     |

OpenClaw 配置使用 `transport: "streamable-http"` 作为标准拼写。通过 `openclaw mcp set` 保存时会接受 CLI 原生的 MCP `type: "http"` 值，并由现有配置中的 `openclaw doctor --fix` 进行修复，但 `transport` 是嵌入式 OpenClaw 直接使用的值。

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectTimeout": 10,
        "timeout": 30,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>这些命令仅管理已保存的配置。它们不会启动 渠道 bridge，不会打开实时 MCP 客户端会话，也不会证明目标服务器是可达的。</Note>

## 当前限制

本页记录了目前发布的 bridge 功能。

当前限制：

- 会话发现依赖于现有的 Gateway(网关) 会话路由元数据
- 除了特定于 Claude 的适配器外，没有通用的推送协议
- 尚无消息编辑或反应工具
- HTTP/SSE/streamable-http 传输连接到单个远程服务器；尚无多路复用上游
- `permissions_list_open` 仅包含在桥接连接时观察到的批准

## 相关

- [CLI 参考](CLI/en/cli)
- [插件](/zh/cli/plugins)
