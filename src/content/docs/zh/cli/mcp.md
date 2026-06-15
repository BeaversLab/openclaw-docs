---
summary: "OpenClaw通过 MCP 公开 OpenClaw 渠道对话并管理已保存的 MCP 服务器定义"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有两个职责：

- 使用 OpenClaw`openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 使用 OpenClaw`list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 管理 OpenClaw 拥有的出站 MCP 服务器定义

换句话说：

- `serve`OpenClaw 是 OpenClaw 充当 MCP 服务器
- 其他子命令是 OpenClaw 充当 MCP 客户端注册表，用于注册其运行时稍后可能使用的 MCP 服务器

当 OpenClaw 应该自己托管编码工具会话并通过 ACP 路由该运行时时，请使用 [`openclaw acp`](/zh/cli/acpOpenClaw)

## 选择正确的 MCP 路径

OpenClaw 有多个 MCP 接口。请选择与谁拥有代理运行时以及谁拥有工具相匹配的那个。

| 目标                                             | 使用                                                                    | 原因                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 允许外部 MCP 客户端读取/发送 OpenClaw 渠道对话   | `openclaw mcp serve`                                                    | OpenClaw 是 MCP 服务器，并通过 stdio 公开由 Gateway 支持的对话。                  |
| 为 OpenClaw 管理的代理运行保存第三方 MCP 服务器  | `openclaw mcp add`、`set`、`configure`、`tools`、`login`                | OpenClaw 是 MCP 客户端注册表，稍后会将这些服务器投影到符合条件的运行时中。        |
| 在不运行代理轮次的情况下检查已保存的服务器       | `openclaw mcp status`, `doctor`, `probe`                                | `status` 和 `doctor` 检查配置；`probe` 打开实时 MCP 连接并列出功能。              |
| 从浏览器编辑 MCP 配置                            | 控制 UI `/mcp`                                                          | 该页面显示清单、启用状态、OAuth/过滤器摘要、命令提示以及限定范围的 `mcp` 编辑器。 |
| 为 Codex 应用服务器提供限定范围的本地 MCP 服务器 | `mcp.servers.<name>.codex`                                              | `codex` 块仅影响 Codex 应用服务器的线程投影，并在移交本地配置之前被剥离。         |
| 运行 ACP 托管的测试工具会话                      | [`openclaw acp`](/zh/cli/acp) 和 [ACP 代理](/zh/tools/acp-agents-setup) | ACP 桥接模式不接受每次会话的 MCP 服务器注入；请改为配置网关/插件桥接。            |

<Tip>如果您不确定需要哪种路径，请从 `openclaw mcp status --verbose` 开始。它显示 OpenClaw 已保存的内容，而不启动任何 MCP 服务器。</Tip>

## OpenClaw 作为 MCP 服务器

这是 `openclaw mcp serve` 路径。

### 何时使用 `serve`

在以下情况使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端应直接与 OpenClaw 支持的渠道会话通信
- 您已经拥有本地或远程 OpenClaw Gateway(网关) 且具有已路由的会话
- 您希望使用一个 MCP 服务器在 OpenClaw 的渠道后端上工作，而不是运行单独的按渠道桥接

当 OpenClaw 应自行托管编码运行时并将代理会话保留在 OpenClaw 内部时，请改用 [`openclaw acp`](/zh/cli/acp)。

### 工作原理

`openclaw mcp serve`OpenClawGateway(网关) 启动一个 stdio MCP 服务器。MCP 客户端拥有该进程。当客户端保持 stdio 会话打开时，桥接器通过 WebSocket 连接到本地或远程 OpenClaw Gateway，并通过 MCP 公开路由的渠道对话。

<Steps>
  <Step title="客户端生成桥接器">
    MCP 客户端生成 `openclaw mcp serve`。
  </Step>
  <Step title="Gateway(网关)桥接器连接到 Gateway"OpenClawGateway(网关)>
    桥接器通过 WebSocket 连接到 OpenClaw Gateway。
  </Step>
  <Step title="会话变为 MCP 对话">
    路由会话变为 MCP 对话以及抄本/历史记录工具。
  </Step>
  <Step title="实时事件队列">
    当桥接器连接时，实时事件在内存中排队。
  </Step>
  <Step title="可选的 Claude 推送">
    如果启用了 Claude 渠道模式，同一会话也可以接收 Claude 特定的推送通知。
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行为">
    - 实时队列状态在桥接器连接时开始
    - 较旧的抄本历史记录使用 `messages_read` 读取
    - Claude 推送通知仅在 MCP 会话存活时存在
    - 当客户端断开连接时，桥接器退出，实时队列消失
    - 一次性代理入口点（如 `openclaw agent` 和 `openclaw infer model run`OpenClaw）会在回复完成时关闭它们打开的任何捆绑 MCP 运行时，因此重复的脚本运行不会累积 stdio MCP 子进程
    - 由 OpenClaw 启动的 stdio MCP 服务器（捆绑或用户配置）在关闭时会作为进程树被拆除，因此服务器启动的子进程不会在父 stdio 客户端退出后继续存在
    - 删除或重置会话会通过共享运行时清理路径释放该会话的 MCP 客户端，因此不会有残留的 stdio 连接绑定到已删除的会话

  </Accordion>
</AccordionGroup>

### 选择客户端模式

以两种不同的方式使用同一网桥：

<Tabs>
  <Tab title="通用 MCP 客户端">仅限标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 以及审批工具。</Tab>
  <Tab title="Claude Code">标准 MCP 工具加上 Claude 专属的渠道适配器。启用 `--claude-channel-mode on` 或保留默认值 `auto`。</Tab>
</Tabs>

<Note>目前，`auto` 的行为与 `on` 相同。目前尚未检测客户端功能。</Note>

### `serve` 暴露的内容

该网桥使用现有的 Gateway(网关) 会话路由元数据来暴露基于渠道的对话。当 OpenClaw 对于已知路由（例如：）已存在会话状态时，对话就会出现：

- `channel`
- 收件人或目的地元数据
- 可选的 `accountId`
- 可选的 `threadId`

这为 MCP 客户端提供了一个统一的位置来：

- 列出最近的路由对话
- 读取最近的记录历史
- 等待新的入站事件
- 通过同一路由发回回复
- 查看网桥连接期间到达的审批请求

### 使用方法

<Tabs>
  <Tab title="Gateway(网关)本地 Gateway(网关)">```bash openclaw mcp serve ```</Tab>
  <Tab title="Gateway(网关)远程 Gateway(网关) (令牌)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="Gateway(网关)远程 Gateway(网关) (密码)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="详细 / Claude 关闭">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### 网桥工具

当前网桥暴露了以下 MCP 工具：

<AccordionGroup>
  <Accordion title="conversations_list"Gateway(网关)>
    列出最近基于会话的对话，这些对话在 Gateway(网关) 会话状态中已有路由元数据。

    有用的筛选器：

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    通过 `session_key`Gateway(网关) 使用直接的 Gateway(网关) 会话查找返回一个对话。
  </Accordion>
  <Accordion title="messages_read">
    读取一个基于会话的对话的最近脚本消息。
  </Accordion>
  <Accordion title="attachments_fetch">
    从一条脚本消息中提取非文本消息内容块。这是对脚本内容的元数据视图，而非独立的持久附件 blob 存储区。
  </Accordion>
  <Accordion title="events_poll">
    读取自数字游标以来的排队实时事件。
  </Accordion>
  <Accordion title="events_wait">
    长轮询，直到下一个匹配的排队事件到达或超时到期。

    当通用 MCP 客户端需要近实时传输且不需要特定于 Claude 的推送协议时，请使用此功能。

  </Accordion>
  <Accordion title="messages_send">
    通过会话上已记录的相同路由将文本发送回去。

    当前行为：

    - 需要现有的对话路由
    - 使用会话的渠道、收件人、账户 ID 和线程 ID
    - 仅发送文本

  </Accordion>
  <Accordion title="permissions_list_open"Gateway(网关)>
    列出桥接器自连接到 Gateway(网关) 以来观察到的待处理 exec/plugin 批准请求。
  </Accordion>
  <Accordion title="permissions_respond">
    解决一个待处理的 exec/plugin 审批请求，使用：

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### 事件模型

桥接器在连接时会维护一个内存中的事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- 该队列仅在运行时存在；它在 MCP 桥接器启动时开始
- `events_poll` 和 `events_wait` 不会自行重放旧的 Gateway(网关) 历史记录
- 应使用 `messages_read` 读取持久化的积压消息

</Warning>

### Claude 渠道通知

桥接器还可以公开特定于 Claude 的渠道通知。这是 OpenClaw 对应的 Claude Code 渠道适配器：标准的 MCP 工具仍然可用，但实时入站消息也可以作为特定于 Claude 的 MCP 通知到达。

<Tabs>
  <Tab title="off">`--claude-channel-mode off`：仅标准 MCP 工具。</Tab>
  <Tab title="on">`--claude-channel-mode on`：启用 Claude 渠道通知。</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto`：当前默认值；与 `on` 的桥接器行为相同。</Tab>
</Tabs>

当启用 Claude 渠道模式时，服务器会通告 Claude 实验性功能并可以发送：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接器行为：

- 入站 `user` 聊天记录消息作为 `notifications/claude/channel` 被转发
- 通过 MCP 接收到的 Claude 权限请求会在内存中跟踪
- 如果关联的对话稍后发送 `yes abcde` 或 `no abcde`，桥接器会将其转换为 `notifications/claude/channel/permission`
- 这些通知仅适用于实时会话；如果 MCP 客户端断开连接，则没有推送目标

这是专门针对客户端的。通用 MCP 客户端应依赖标准轮询工具。

### MCP 客户端配置

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

对于大多数通用 MCP 客户端，请从标准工具表面开始并忽略 Claude 模式。仅对真正理解 Claude 特定通知方法的客户端开启 Claude 模式。

### 选项

`openclaw mcp serve` 支持：

<ParamField path="--url" type="string"Gateway(网关)>
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token" type="string"Gateway(网关)>
  Gateway 令牌 (token)。
</ParamField>
<ParamField path="--token-file" type="string">
  从文件读取令牌 (token)。
</ParamField>
<ParamField path="--password" type="string"Gateway(网关)>
  Gateway 密码。
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

<Tip>如果可能，优先使用 `--token-file` 或 `--password-file` 而不是内联密钥。</Tip>

### 安全与信任边界

桥接器不会自行创建路由。它仅公开 Gateway 已知如何路由的对话。

这意味着：

- 发送方白名单、配对和渠道级别的信任仍然属于底层 OpenClaw 渠道配置
- `messages_send` 只能通过现有的存储路由进行回复
- 审批状态对于当前桥接会话仅为实时/内存中状态
- 桥接认证应使用与您信任的任何其他远程 Gateway 客户端相同的 Gateway 令牌或密码控制

如果 `conversations_list`Gateway(网关) 中缺少某个对话，通常原因不是 MCP 配置问题。而是底层 Gateway(网关) 会话中缺少或不完整路由元数据。

### 测试

OpenClaw 附带了一个确定性的 Docker 烟雾测试用于此桥接：

```bash
pnpm test:docker:mcp-channels
```

该烟雾测试：

- 启动一个已设定种子的 Gateway(网关) 容器
- 启动生成 `openclaw mcp serve` 的第二个容器
- 验证对话发现、转录读取、附件元数据读取、实时事件队列行为以及出站发送路由
- 通过真实的 stdio MCP 桥接验证 Claude 风格的渠道和权限通知

这是证明桥接有效而不必将真实的 Telegram、Discord 或 iMessage 账户接入测试运行的最快方法。

如需更广泛的测试上下文，请参阅 [测试](/zh/help/testing)。

### 故障排除

<AccordionGroup>
  <Accordion title="No conversations returned"Gateway(网关)>
    通常意味着 Gateway(网关) 会话尚不可路由。请确认底层会话已存储渠道/提供商、接收者以及可选的账户/线程路由元数据。
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    这是预期行为。实时队列在桥接连接时启动。使用 `messages_read` 读取较旧的转录历史记录。
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    检查以下所有项：

    - 客户端保持了 stdio MCP 会话开启
    - `--claude-channel-mode` 为 `on` 或 `auto`
    - 客户端确实理解 Claude 特定的通知方法
    - 入站消息发生在桥接连接之后

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open`API 仅显示在桥接连接时观察到的审批请求。它不是一个持久的审批历史 API。
  </Accordion>
</AccordionGroup>

## OpenClaw 作为 MCP 客户端注册表

这是 `openclaw mcp list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、
`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 路径。

这些命令不会通过 MCP 暴露 OpenClaw。它们管理 OpenClaw 配置中 OpenClawOpenClaw`mcp.servers`OpenClaw 下的 OpenClaw 拥有的 MCP 服务器定义。

这些保存的定义供 OpenClaw 稍后启动或配置的运行时使用，例如嵌入式 OpenClaw 和其他运行时适配器。OpenClaw 集中存储这些定义，以便这些运行时无需维护自己的重复 MCP 服务器列表。

<AccordionGroup>
  <Accordion title="重要行为">
    - 这些命令仅读取或写入 OpenClaw 配置
    - `status`、`list`、`show`、`doctor`（不带 `--probe`、`set`、`configure`、`tools`、`logout`、`reload` 和 `unset`）不会连接到目标 MCP 服务器
    - `login` 对配置的 HTTP 服务器执行 MCP OAuth 网络流程，并保存生成的本地凭据
    - `status --verbose` 在不连接的情况下打印已解析的传输、身份验证、超时、过滤器和并行工具调用提示
    - `doctor` 检查已保存的定义是否存在本地设置问题，例如缺少 stdio 命令、无效的工作目录、缺少 TLS 文件、已禁用的服务器、字面敏感的标头/环境值以及不完整的 OAuth 授权
    - `doctor --probe` 在静态检查通过后添加与 `probe` 相同的实时连接证明
    - `probe` 连接到选定的服务器或所有已配置的服务器，列出工具，并报告功能/诊断信息
    - `add` 在保存之前从标志和探测构建定义，除非设置了 `--no-probe` 或首先需要 OAuth 授权
    - 运行时适配器在执行时决定它们实际支持哪些传输形状
    - `enabled: false` 保留服务器已保存，但将其从嵌入式运行时发现中排除
    - `timeout` 和 `connectTimeout` 以秒为单位设置每个服务器的请求和连接超时
    - `supportsParallelToolCalls: true` 标记适配器可以并发调用的服务器
    - HTTP 服务器可以使用静态标头、OAuth 登录、TLS 验证控制和 mTLS 证书/密钥路径
    - 嵌入式 OpenClaw 在普通的 `coding` 和 `messaging` 工具配置文件中公开已配置的 MCP 工具；`minimal` 仍然隐藏它们，而 `tools.deny: ["bundle-mcp"]` 显式禁用它们
    - 每个服务器的 `toolFilter.include` 和 `toolFilter.exclude` 在发现的 MCP 工具成为 OpenClaw 工具之前对其进行过滤
    - 宣布资源或提示的服务器还公开用于列出/读取资源和列出/获取提示的实用工具；这些生成的实用工具名称（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`）使用相同的包含/排除过滤器
    - 动态 MCP 工具列表更改会使该会话的缓存目录失效；下一次发现/使用会从服务器刷新
    - 重复的 MCP 工具请求/协议故障会短暂暂停该服务器，以免一个损坏的服务器占用整个回合
    - 会话范围的捆绑 MCP 运行时在空闲 `mcp.sessionIdleTtlMs` 毫秒后（默认为 10 分钟；设置 `0` 以禁用）被回收，而一次性嵌入式运行会在运行结束时清理它们

  </Accordion>
</AccordionGroup>

运行时适配器可能会将此共享注册表规范化为其下游客户端所需的形状。例如，嵌入式 OpenClaw 直接使用 OpenClaw OpenClawOpenClaw`transport` 值，而 Claude Code 和 Gemini 接收 CLI 原生的 `type` 值，例如 `http`、`sse` 或 `stdio`。

Codex 应用服务器还会遵守每个服务器上可选的 `codex` 块。这是专用于 Codex 应用服务器线程的 OpenClaw 投影元数据；它不会改变 ACP 会话、通用 Codex 配置或其他运行时适配器。使用非空的 `codex.agents` 将服务器仅投影到特定的 OpenClaw 代理 ID。空的、空白的或无效的代理列表将被配置验证拒绝，并且会被运行时投影路径忽略，而不是变为全局配置。使用 `codex.defaultToolsApprovalMode`（`auto`、`prompt` 或 `approve`）为受信任的服务器发出 Codex 的原生 `default_tools_approval_mode`。OpenClaw 会将原生 `mcp_servers` 配置移交给 Codex 之前去除 `codex` 元数据。

### 已保存的 MCP 服务器定义

OpenClaw 还会在配置中存储一个轻量级的 MCP 服务器注册表，供那些需要 OpenClaw 托管的 MCP 定义的服务使用。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status [--verbose]`
- `openclaw mcp doctor [name] [--probe]`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp logout <name>`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

注意：

- `list` 会对服务器名称进行排序。
- 不带名称的 `show` 会打印完整的已配置 MCP 服务器对象。
- `status` 在不连接的情况下对配置的传输进行分类。`--verbose` 包括已解析的启动、超时、OAuth、过滤器和并行调用详细信息。
- `doctor` 在不连接的情况下执行静态检查。当命令还应验证启用的服务器是否连接时，请添加 `--probe`。
- `probe` 进行连接并报告工具计数、资源/提示支持、列表更改支持和诊断信息。
- `add` 接受 stdio 标志，如 `--command`、`--arg`、`--env` 和 `--cwd`，或 HTTP 标志，如 `--url`、`--transport`、`--header`、`--auth oauth`、TLS、超时和工具选择标志。
- `set` 需要在命令行上提供一个 JSON 对象值。
- `configure` 更新启用状态、工具过滤器、超时、OAuth、TLS 和并行工具调用提示，而无需替换整个服务器定义。
- `tools` 更新每个服务器的工具过滤器。包含/排除条目是 MCP 工具名称和简单的 `*` glob 模式。
- `login` 为配置了 `auth: "oauth"` 的 HTTP 服务器运行 OAuth 流程。第一次运行会打印授权 URL；批准后使用 `--code` 重新运行。
- `logout` 清除指定服务器的已存储 OAuth 凭据，而不删除已保存的服务器定义。
- `reload` 释放缓存的进程中 MCP 运行时。另一个进程中的 Gateway(网关) 或代理进程仍需要其自己的重新加载或重启路径。
- 对于可流式传输的 HTTP MCP 服务器，请使用 `transport: "streamable-http"`。`openclaw mcp set` 还将 CLI 原生的 `type: "http"` 规范化为相同的规范配置形状，以确保兼容性。
- 如果指定的服务器不存在，`unset` 将失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status --verbose
openclaw mcp doctor --probe
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp logout docs
openclaw mcp unset context7
```

### 常见服务器配方

这些示例仅保存服务器定义。随后运行 `openclaw mcp doctor --probe` 以验证服务器启动并公开工具。

<Tabs>
  <Tab title="文件系统">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    将文件系统服务器的作用域限制为代理应读取或编辑的最小目录树。

  </Tab>
  <Tab title="内存">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    如果服务器公开了普通代理不应具备的写入工具，请使用工具过滤器。

  </Tab>
  <Tab title="本地脚本">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` 会检查 `cwd` 是否存在，以及该命令是否可从配置的环境中解析。

  </Tab>
  <Tab title="远程 HTTP">
    ```bash
    openclaw mcp add docs \
      --url https://mcp.example.com/mcp \
      --transport streamable-http \
      --auth oauth \
      --oauth-scope docs.read \
      --timeout 20 \
      --connect-timeout 5 \
      --include 'search,read_*'
    openclaw mcp doctor docs --probe
    ```

    当远程服务器支持 OAuth 时请使用它。如果服务器需要静态头部信息，请避免提交字面形式的 bearer 令牌。

  </Tab>
  <Tab title="桌面/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,observe,click,type'
    openclaw mcp doctor cua-driver --probe
    ```

    直接桌面控制服务器继承其启动进程的权限。请使用狭窄的工具过滤器和操作系统级别的权限提示。

  </Tab>
</Tabs>

### JSON 输出结构

将 `--json` 用于脚本和仪表板。字段集可能会随时间增长，因此使用者应忽略未知的键。

<AccordionGroup>
  <Accordion title="status --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "configured": true,
          "enabled": true,
          "ok": true,
          "transport": "streamable-http",
          "launch": "streamable-http https://mcp.example.com/mcp",
          "auth": "oauth",
          "authStatus": {
            "hasTokens": true,
            "hasClientInformation": true,
            "hasCodeVerifier": false,
            "hasDiscoveryState": true,
            "hasLastAuthorizationUrl": false
          },
          "requestTimeoutMs": 20000,
          "connectionTimeoutMs": 5000,
          "toolFilter": {
            "include": ["search", "read_*"],
            "exclude": []
          },
          "supportsParallelToolCalls": true
        }
      ]
    }
    ```
  </Accordion>
  <Accordion title="doctor --">
    ```json
    {
      "ok": false,
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "ok": false,
          "issues": [
            {
              "level": "error",
              "message": "OAuth credentials are not authorized; run openclaw mcp login docs"
            }
          ]
        }
      ]
    }
    ```

    当任何已启用的已检查服务器出现错误时，`doctor --json` 将以非零状态退出。系统会报告警告，但警告本身不会导致命令失败。

  </Accordion>
  <Accordion title="probe --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "generatedAt": "2026-05-31T09:00:00.000Z",
      "servers": {
        "docs": {
          "launch": "streamable-http https://mcp.example.com/mcp",
          "tools": 2,
          "resources": true,
          "prompts": false,
          "listChanged": {
            "tools": true,
            "resources": false,
            "prompts": false
          }
        }
      },
      "tools": ["docs__read_page", "docs__search"],
      "diagnostics": []
    }
    ```

    `probe` 会打开一个实时的 MCP 客户端会话。请将其用于可达性和功能验证，而非静态配置审计。

  </Accordion>
</AccordionGroup>

配置形状示例：

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

OpenClaw 会拒绝可能改变 stdio MCP 服务器在首次 RPC 之前启动方式的解释器启动环境变量键，即使它们出现在服务器的 `env` 块中。被阻止的键包括 `NODE_OPTIONS`、`NODE_REDIRECT_WARNINGS`、`NODE_REPL_EXTERNAL_MODULE`、`NODE_REPL_HISTORY`、`NODE_V8_COVERAGE`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 以及类似的运行时控制变量。启动时会以配置错误拒绝这些变量，以防止它们注入隐式序言、交换解释器、启用调试器或针对 stdio 进程重定向运行时输出。普通的凭据、代理和服务器特定的环境变量（`GITHUB_TOKEN`、`HTTP_PROXY`、自定义 `*_API_KEY` 等）不受影响。

如果您的 MCP 服务器确实需要某个被阻止的变量，请将其设置在网关主机进程上，而不是在 stdio 服务器的 `env` 下。

</Warning>

### SSE / HTTP 传输

通过 HTTP 服务器发送事件 (SSE) 连接到远程 MCP 服务器。

| 字段                           | 描述                                            |
| ------------------------------ | ----------------------------------------------- |
| `url`                          | 远程服务器的 HTTP 或 HTTPS URL（必需）          |
| `headers`                      | HTTP 标头的可选键值映射（例如身份验证令牌）     |
| `connectionTimeoutMs`          | 每个服务器的连接超时时间，以毫秒为单位（可选）  |
| `connectTimeout`               | 每个服务器的连接超时时间，以秒为单位（可选）    |
| `timeout` / `requestTimeoutMs` | 每个服务器的 MCP 请求超时时间，以秒或毫秒为单位 |
| `auth: "oauth"`                | 使用 MCP OAuth 令牌存储和 `openclaw mcp login`  |
| `sslVerify`                    | 仅针对明确受信任的专用 HTTPS 端点设置为 false   |
| `clientCert` / `clientKey`     | mTLS 客户端证书和密钥路径                       |
| `supportsParallelToolCalls`    | 提示并发调用对此服务器是安全的                  |

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

`url`（用户信息）和 `headers` 中的敏感值会在日志和状态输出中被编辑。当看起来敏感的 `headers` 或 `env` 条目包含字面量值时，`openclaw mcp doctor` 会发出警告，以便操作员可以将这些值移出已提交的配置。

### OAuth 工作流

OAuth 适用于声明 MCP OAuth 流程的 HTTP MCP 服务器。当为服务器启用 `auth: "oauth"` 时，静态 `Authorization` 标头将被忽略。

<Steps>
  <Step title="保存服务器">
    使用 `auth: "oauth"` 以及任何可选的 OAuth 元数据添加或更新服务器。

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"scope":"docs.read"}}'
    ```

  </Step>
  <Step title="开始登录">
    运行 login 以创建授权请求。

    ```bash
    openclaw mcp login docs
    ```

    OpenClaw 会打印授权 URL，并将临时的 OAuth 验证器状态存储在 OpenClaw 状态目录下。

  </Step>
  <Step title="使用代码完成">
    在浏览器中批准后，将返回的代码传回 OpenClaw。

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step title="检查授权">
    使用 status 或 doctor 确认令牌是否存在。

    ```bash
    openclaw mcp status --verbose
    openclaw mcp doctor docs --probe
    ```

  </Step>
  <Step title="清除凭据">
    Logout 会移除存储的 OAuth 凭据，但保留已保存的服务器定义。

    ```bash
    openclaw mcp logout docs
    ```

  </Step>
</Steps>

如果提供商轮换令牌或授权状态卡住，请运行 `openclaw mcp logout <name>`，然后重复 `login`。即使 `auth: "oauth"` 已从配置中移除，只要服务器名称和 URL 仍然能识别凭据存储条目，`logout` 就可以清除已保存 HTTP 服务器的凭据。

### 可流式传输的 HTTP 传输

`streamable-http` 是 `sse` 和 `stdio` 之外的附加传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段                           | 描述                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| `url`                          | 远程服务器的 HTTP 或 HTTPS URL（必需）                                   |
| `transport`                    | 设置为 `"streamable-http"` 以选择此传输；如果省略，OpenClaw 将使用 `sse` |
| `headers`                      | HTTP 标头的可选键值映射（例如身份验证令牌）                              |
| `connectionTimeoutMs`          | 每个服务器的连接超时时间（毫秒）（可选）                                 |
| `connectTimeout`               | 每个服务器的连接超时时间（秒）（可选）                                   |
| `timeout` / `requestTimeoutMs` | 每个服务器的 MCP 请求超时时间（秒或毫秒）                                |
| `auth: "oauth"`                | 使用 MCP OAuth 令牌存储和 `openclaw mcp login`                           |
| `sslVerify`                    | 仅对明确信任的私有 HTTPS 端点设置为 false                                |
| `clientCert` / `clientKey`     | mTLS 客户端证书和密钥路径                                                |
| `supportsParallelToolCalls`    | 指示此服务器可以安全地进行并发调用                                       |

OpenClaw 配置使用 OpenClaw`transport: "streamable-http"`CLI 作为标准拼写。通过 `openclaw mcp set` 保存时，CLI 原生的 MCP `type: "http"` 值会被接受，并由 `openclaw doctor --fix` 在现有配置中修复，但嵌入式 OpenClaw 直接消耗的是 `transport`OpenClaw。

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

<Note>注册表命令不会启动渠道桥。只有 `probe` 和 `doctor --probe` 会打开一个实时的 MCP 客户端会话，以证明目标服务器是可达的。</Note>

## 控制 UI

浏览器控制 UI 在 `/mcp`OAuthCLI 包含一个专门的 MCP 设置页面。它显示已配置的服务器计数、已启用/OAuth/过滤器摘要、每服务器的传输行、启用/禁用控件、常用 CLI 命令，以及用于 `mcp` 配置部分的范围编辑器。

使用该页面进行操作员编辑和快速清单。当您需要实时的服务器证明时，请使用 `openclaw mcp doctor --probe` 或 `openclaw mcp probe`。

操作员工作流：

1. 打开控制 UI 并选择 **MCP**。
2. 查看总计、已启用、OAuth 和已过滤服务器的摘要卡片。
3. 使用每行服务器行来查看传输、身份验证、过滤器、超时和命令提示。
4. 当您想保留定义但将其从运行时发现中排除时，请切换启用状态。
5. 编辑范围限定的 `mcp`OAuth 配置部分，以进行结构更改，例如添加新服务器、标头、TLS、OAuth 元数据或工具过滤器。
6. 选择 **Save** 仅持久化配置，或选择 **Save & Publish** 通过 Gateway 配置路径应用更改。
7. 当您需要实时证明已编辑的服务器已启动并列出工具时，请运行 `openclaw mcp doctor --probe`。

注意事项：

- 命令片段会对服务器名称加引号，以便在 Shell 中复制不寻常的名称
- 如果显示的类 URL 值包含嵌入的凭据，则在渲染前会被编辑
- 该页面不会自行启动 MCP 传输
- 活动运行时可能需要 `openclaw mcp reload`Gateway(网关)、Gateway(网关) 配置发布或进程重启，具体取决于哪个进程拥有 MCP 客户端

## 当前限制

本页面记录了目前发布的桥接功能。

当前限制：

- 会话发现依赖于现有的 Gateway(网关) 会话路由元数据
- 除 Claude 专用适配器外，没有通用的推送协议
- 尚无消息编辑或反应工具
- HTTP/SSE/streamable-http 传输连接到单个远程服务器；尚无多路复用上游
- `permissions_list_open` 仅包含在桥接连接时观察到的审批

## 相关

- [CLI 参考](CLI/en/cli)
- [插件](/zh/cli/plugins)
