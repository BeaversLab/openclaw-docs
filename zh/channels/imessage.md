---
summary: "通过 imsg（基于 stdio 的 JSON-RPC）提供的旧版 iMessage 支持。新设置应使用 BlueBubbles。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

# iMessage（旧版：imsg）

<Warning>
对于新的 iMessage 部署，请使用 <a href="/en/channels/bluebubbles">BlueBubbles</a>。

`imsg` 集成是旧版功能，可能会在未来的版本中移除。

</Warning>

状态：旧版外部 CLI 集成。Gateway(网关) 生成 `imsg rpc` 并通过 stdio 上的 JSON-RPC 进行通信（没有单独的守护进程/端口）。

<CardGroup cols={3}>
  <Card title="BlueBubbles (推荐)" icon="message-circle" href="/en/channels/bluebubbles">
    新设置首选的 BlueBubbles 路径。
  </Card>
  <Card title="配对" icon="link" href="/en/channels/pairing">
    iMessage 私信默认为配对模式。
  </Card>
  <Card title="配置参考" icon="settings" href="/en/gateway/configuration-reference#imessage">
    Full iMessage field reference.
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="本地 Mac（快速路径）">
    <Steps>
      <Step title="安装并验证 imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>

      <Step title="批准首次 OpenClaw 配对（默认 dmPolicy）">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配对请求将在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="Remote Mac over SSH">
    OpenClaw 只需要一个兼容 stdio 的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的包装脚本。

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    启用附件时的推荐配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
      // Optional: override allowed attachment roots.
      // Defaults include /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未设置 `remoteHost`，OpenClaw 会尝试通过解析 SSH 包装脚本来自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`（无空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密检查，因此中继主机密必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

  </Tab>
</Tabs>

## 要求和权限 (macOS)

- 必须在运行 `imsg` 的 Mac 上登录 Messages。
- 运行 OpenClaw/`imsg` 的进程上下文需要“完全磁盘访问”权限（访问 Messages 数据库）。
- 需要“自动化”权限才能通过 Messages.app 发送消息。

<Tip>
权限是按进程上下文授予的。如果网关以无头模式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 访问控制和路由

<Tabs>
  <Tab title="私信 policy">
    `channels.imessage.dmPolicy` 控制私信（私信）：

    - `pairing` （默认）
    - `allowlist`
    - `open` （需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目可以是句柄或聊天目标（`chat_id:*`, `chat_guid:*`, `chat_identifier:*`）。

  </Tab>

  <Tab title="Group policy + mentions">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist` （配置时的默认值）
    - `open`
    - `disabled`

    群组发送者允许列表：`channels.imessage.groupAllowFrom`。

    运行时回退：如果 `groupAllowFrom` 未设置，iMessage 群组发送者检查将在可用时回退到 `allowFrom`。
    运行时注意：如果 `channels.imessage` 完全缺失，运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使 `channels.defaults.groupPolicy` 已设置）。

    群组的提及控制：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及控制

    来自授权发送者的控制命令可以在群组中绕过提及控制。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认 `session.dmScope=main`，iMessage 私信会折叠到 Agent 主会话中。
    - 群组会话是隔离的 (`agent:<agentId>:imessage:group:<chat_id>`)。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    一些多参与者 iMessage 线程可能会带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups` 下被明确配置，OpenClaw 会将其视为群组流量（群组过滤 + 群组会话隔离）。

  </Tab>
</Tabs>

## 部署模式

<AccordionGroup>
  <Accordion title="专用机器人 macOS 用户（独立的 iMessage 身份）">
    使用专用的 Apple ID 和 macOS 用户，以便机器人流量与您的个人 Messages 资料隔离。

    典型流程：

    1. 创建/登录专用的 macOS 用户。
    2. 在该用户中使用机器人 Apple ID 登录 Messages。
    3. 在该用户中安装 `imsg`。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在机器人用户会话中进行 GUI 批准（自动化 + 完全磁盘访问权限）。

  </Accordion>

  <Accordion title="通过 Tailscale 连接远程 Mac（示例）">
    常见拓扑结构：

    - 网关运行在 Tailscale/VM 上
    - iMessage + `imsg` 运行在您 tailnet 中的 Mac 上
    - `cliPath` 包装器使用 SSH 来运行 `imsg`
    - `remoteHost` 启用通过 SCP 获取附件

    示例：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db",
    },
  },
}
```

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

    使用 SSH 密钥，以便 SSH 和 SCP 均为非交互式。
    确保首先信任主机密钥（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便 `known_hosts` 被填充。

  </Accordion>

  <Accordion title="多账户模式">
    iMessage 支持在 `channels.imessage.accounts` 下进行逐账户配置。

    每个账户可以覆盖诸如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根目录允许列表等字段。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 接收附件摄取是可选的：`channels.imessage.includeAttachments`
    - 当设置了 `remoteHost` 时，可以通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 默认根目录模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密钥检查（`StrictHostKeyChecking=yes`）
    - 外发媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）
  </Accordion>

<Accordion title="出站分块">
  - 文本分块限制：`channels.imessage.textChunkLimit`（默认 4000）- 分块模式：
  `channels.imessage.chunkMode` - `length`（默认）- `newline`（段落优先分割）
</Accordion>

  <Accordion title="寻址格式">
    首选的显式目标：

    - `chat_id:123`（推荐用于稳定路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    也支持句柄目标：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许渠道发起的配置写入（当 `commands.config: true` 时用于 `/config set|unset`）。

禁用：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

## 故障排除

<AccordionGroup>
  <Accordion title="未找到 imsg 或不支持 RPC">
    验证二进制文件和 RPC 支持：

```bash
imsg rpc --help
openclaw channels status --probe
```

    如果探测报告不支持 RPC，请更新 `imsg`。

  </Accordion>

  <Accordion title="私信被忽略">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配对批准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="群组消息被忽略">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 许可名单行为
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 网关主机的 SSH/SCP 密钥认证
    - 网关主机的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行“信息”应用的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOS 权限提示被遗漏">
    在相同的用户/会话上下文中，以交互方式在 GUI 终端中重新运行，并批准提示：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    确认为运行 OpenClaw/`imsg` 的进程上下文授予了完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](/en/gateway/configuration-reference#imessage)
- [Gateway(网关) 配置](/en/gateway/configuration)
- [配对](/en/channels/pairing)
- [BlueBubbles](/en/channels/bluebubbles)

import zh from "/components/footer/zh.mdx";

<zh />
