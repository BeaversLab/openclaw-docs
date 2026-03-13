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

`imsg` 集成是旧版功能，可能会在将来的版本中移除。
</Warning>

状态：旧版外部 CLI 集成。网关会生成 `imsg rpc` 并通过 stdio 上的 JSON-RPC 进行通信（没有单独的守护进程/端口）。

<CardGroup cols={3}>
  <Card title="BlueBubbles (recommended)" icon="message-circle" href="/en/channels/bluebubbles">
    新设置的首选 iMessage 方式。
  </Card>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    iMessage 私信 (DM) 默认为配对模式。
  </Card>
  <Card title="Configuration reference" icon="settings" href="/en/gateway/configuration-reference#imessage">
    完整的 iMessage 字段参考。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Local Mac (fast path)">
    <Steps>
      <Step title="Install and verify imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="Configure OpenClaw">

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

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="Approve first DM pairing (default dmPolicy)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配对请求会在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="Remote Mac over SSH">
    OpenClaw 仅需要一个与 stdio 兼容的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的包装脚本。

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

- 运行 `imsg` 的 Mac 上必须登录信息。
- 运行 OpenClaw/`imsg` 的进程上下文需要完全磁盘访问权限（访问信息数据库）。
- 需要通过 Messages.app 发送消息的“自动化”权限。

<Tip>
权限是针对每个进程上下文授予的。如果网关以无头模式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 访问控制和路由

<Tabs>
  <Tab title="DM 策略">
    `channels.imessage.dmPolicy` 控制直接消息：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目可以是标识符或聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送者允许列表：`channels.imessage.groupAllowFrom`。

    运行时回退：如果未设置 `groupAllowFrom`，iMessage 群组发送者检查会在可用时回退到 `allowFrom`。
    运行时说明：如果 `channels.imessage` 完全缺失，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使已设置 `channels.defaults.groupPolicy`）。

    群组的提及控制：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及过滤

    来自授权发送者的控制命令可以在群组中绕过提及控制。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认的 `session.dmScope=main` 时，iMessage 私信会合并到代理主会话中。
    - 群组会话是隔离的（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回复使用原始频道/目标元数据路由回 iMessage。

    类群组线程行为：

    一些多参与者的 iMessage 线程可能会带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups` 下进行了明确配置，OpenClaw 会将其视为群组流量（群组过滤 + 群组会话隔离）。

  </Tab>
</Tabs>

## 部署模式

<AccordionGroup>
  <Accordion title="专用机器人 macOS 用户（独立的 iMessage 身份）">
    使用专用的 Apple ID 和 macOS 用户，以便机器人流量与您的个人信息配置文件隔离。

    典型流程：

    1. 创建/登录专用的 macOS 用户。
    2. 在该用户下使用机器人 Apple ID 登录信息。
    3. 在该用户中安装 `imsg`。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该 bot 用户会话中进行 GUI 批准（自动化 + 完全磁盘访问）。

  </Accordion>

  <Accordion title="通过 Tailscale 连接远程 Mac（示例）">
    常见拓扑：

    - 网关运行在 Linux/VM 上
    - iMessage + `imsg` 运行在您的 tailnet 中的 Mac 上
    - `cliPath` 包装器使用 SSH 运行 `imsg`
    - `remoteHost` 启用 SCP 附件获取

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

    使用 SSH 密钥，使 SSH 和 SCP 都是非交互式的。
    首先确保主机密钥受信任（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion title="Multi-account pattern">
    iMessage 支持 `channels.imessage.accounts` 下的每个账户配置。

    每个账户都可以覆盖以下字段，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置以及附件根允许列表。

  </Accordion>
</AccordionGroup>

## 媒体、分块和传递目标

<AccordionGroup>
  <Accordion title="Attachments and media">
    - 接收附件摄取是可选的：`channels.imessage.includeAttachments`
    - 设置 `remoteHost` 后，可以通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots` (本地)
      - `channels.imessage.remoteAttachmentRoots` (远程 SCP 模式)
      - 默认根目录模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密钥检查 (`StrictHostKeyChecking=yes`)
    - 发送媒体大小使用 `channels.imessage.mediaMaxMb` (默认 16 MB)
  </Accordion>

  <Accordion title="Outbound chunking">
    - 文本分块限制：`channels.imessage.textChunkLimit` (默认 4000)
    - 分块模式：`channels.imessage.chunkMode`
      - `length` (默认)
      - `newline` (段落优先分割)
  </Accordion>

  <Accordion title="Addressing formats">
    首选显式目标：

    - `chat_id:123` (推荐用于稳定路由)
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

iMessage 默认允许通道发起的配置写入（针对 `/config set|unset` 当 `commands.config: true` 时）。

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
  <Accordion title="imsg not found or RPC unsupported">
    验证二进制文件和 RPC 支持：

```bash
imsg rpc --help
openclaw channels status --probe
```

    如果探测报告显示不支持 RPC，请更新 `imsg`。

  </Accordion>

  <Accordion title="DMs are ignored">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配对批准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="Group messages are ignored">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 允许列表行为
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="Remote attachments fail">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 来自网关主机的 SSH/SCP 密钥认证
    - 网关主机上的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行“信息”应用的 Mac 对远程路径的可读性

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    在相同的用户/会话上下文中，以交互方式在 GUI 终端中重新运行并批准提示：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    确认为运行 OpenClaw/`imsg` 的进程上下文授予了完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](/en/gateway/configuration-reference#imessage)
- [网关配置](/en/gateway/configuration)
- [配对](/en/channels/pairing)
- [BlueBubbles](/en/channels/bluebubbles)

import zh from '/components/footer/zh.mdx';

<zh />
