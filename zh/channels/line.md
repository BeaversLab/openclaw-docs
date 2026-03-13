---
summary: LINE Messaging API 插件设置、配置和使用
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE (插件)

LINE 通过 LINE Messaging API 连接到 OpenClaw。该插件作为网关上的 webhook
接收器运行，并使用您的 Channel access token（频道访问令牌）和 Channel secret（频道密钥）进行
身份验证。

状态：通过插件支持。支持直接消息、群聊、媒体、位置、Flex
消息、模板消息和快速回复。不支持表情回应和消息串。

## 所需插件

安装 LINE 插件：

```bash
openclaw plugins install @openclaw/line
```

本地检出版本（当从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/line
```

## 设置

1. 创建一个 LINE Developers 帐户并打开控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 创建（或选择）一个 Provider 并添加一个 **Messaging API** 频道。
3. 从频道设置中复制 **Channel access token**（频道访问令牌）和 **Channel secret**（频道密钥）。
4. 在 Messaging API 设置中启用 **Use webhook**。
5. 将 Webhook URL 设置为您的网关端点（需要 HTTPS）：

```
https://gateway-host/line/webhook
```

网关响应 LINE 的 Webhook 验证 (GET) 和传入事件 (POST)。
如果您需要自定义路径，请设置 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 并相应地更新 URL。

安全提示：

- LINE 签名验证依赖于正文（对原始正文的 HMAC），因此 OpenClaw 在验证之前会应用严格的前置认证正文限制和超时设置。

## 配置

最小配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

环境变量（仅默认账户）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

令牌/密钥文件：

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` 和 `secretFile` 必须指向常规文件。符号链接会被拒绝。

多个账户：

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## 访问控制

私信默认为配对模式。未知发送者将收到配对码，其消息在被批准前将被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允许列表与策略：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: 私信的允许列表 LINE 用户 ID
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: 群组的允许列表 LINE 用户 ID
- 按群组覆盖：`channels.line.groups.<groupId>.allowFrom`
- 运行时说明：如果完全缺少 `channels.line`，运行时将回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

LINE ID 区分大小写。有效的 ID 如下所示：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 房间：`R` + 32 个十六进制字符

## 消息行为

- 文本以 5000 个字符为单位进行分块。
- Markdown 格式会被去除；代码块和表格会尽可能转换为 Flex 卡片。
  卡片。
- 流式响应会被缓冲；LINE 会在代理工作时收到带有加载动画的完整
  数据块。
- 媒体下载受 `channels.line.mediaMaxMb` 限制（默认为 10）。

## 频道数据（富消息）

使用 `channelData.line` 发送快速回复、位置、Flex 卡片或模板消息。

```json5
{
  text: "Here you go",
  channelData: {
    line: {
      quickReplies: ["Status", "Help"],
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "Status card",
        contents: {
          /* Flex payload */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no",
      },
    },
  },
}
```

LINE 插件还提供了一个 `/card` 命令用于 Flex 消息预设：

```
/card info "Welcome" "Thanks for joining!"
```

## 故障排除

- **Webhook 验证失败：** 请确保 Webhook URL 是 HTTPS 且
  `channelSecret` 与 LINE 控制台匹配。
- **没有入站事件：** 请确认 Webhook 路径匹配 `channels.line.webhookPath`
  并且网关可从 LINE 访问。
- **媒体下载错误：** 如果媒体超过默认限制，则引发 `channels.line.mediaMaxMb`
  默认限制。

import zh from '/components/footer/zh.mdx';

<zh />
