---
summary: "LINE Messaging API 插件设置、配置和使用"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE

LINE 通过 LINE Messaging API 连接到 OpenClaw。该插件作为网关上的 webhook
接收器运行，并使用您的 Channel access token（频道访问令牌）和 Channel secret（频道密钥）进行
身份验证。

状态：捆绑插件。支持私信、群聊、媒体、位置、Flex 消息、模板消息和快速回复。不支持表情回应和话题串。

## 捆绑插件

LINE 在当前的 OpenClaw 版本中作为捆绑插件提供，因此普通的打包版本无需单独安装。

如果您使用的是旧版本或排除了 LINE 的自定义安装，请手动安装：

```bash
openclaw plugins install @openclaw/line
```

本地签出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## 设置

1. 创建一个 LINE Developers 账户并打开控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 创建（或选择）一个 Provider 并添加一个 **Messaging API** 渠道。
3. 从渠道设置中复制 **Channel access token**（渠道访问令牌）和 **Channel secret**（渠道密钥）。
4. 在 Messaging API 设置中启用 **Use webhook**（使用 webhook）。
5. 将 webhook URL 设置为您的网关端点（需要 HTTPS）：

```
https://gateway-host/line/webhook
```

网关响应 LINE 的 webhook 验证（GET）和传入事件（POST）。
如果您需要自定义路径，请设置 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 并相应地更新 URL。

安全提示：

- LINE 签名验证依赖于正文（原始正文的 HMAC），因此 OpenClaw 在验证之前会应用严格的预认证正文限制和超时。
- OpenClaw 从验证过的原始请求字节处理 webhook 事件。出于签名完整性的安全性考虑，上游中间件转换的 `req.body` 值将被忽略。

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

`tokenFile` 和 `secretFile` 必须指向常规文件。符号链接将被拒绝。

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

私信默认为配对模式。未知发送者将收到配对码，在获得批准之前其消息将被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

白名单和策略：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: 用于私信的 LINE 用户 ID 白名单
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: 用于群组的 LINE 用户 ID 白名单
- 按群组覆盖：`channels.line.groups.<groupId>.allowFrom`
- 运行时说明：如果完全缺少 `channels.line`，运行时将回退到 `groupPolicy="allowlist"` 进行组检查（即使设置了 `channels.defaults.groupPolicy`）。

LINE ID 区分大小写。有效的 ID 如下所示：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 房间：`R` + 32 个十六进制字符

## 消息行为

- 文本在 5000 个字符处分块。
- Markdown 格式会被去除；代码块和表格在可能的情况下会被转换为 Flex 卡片。
- 流式响应会被缓冲；在代理工作期间，LINE 会接收带有加载动画的完整分块。
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

LINE 插件还附带了一个 `/card` 命令，用于设置 Flex 消息预设：

```
/card info "Welcome" "Thanks for joining!"
```

## ACP 支持

LINE 支持 ACP（Agent Communication Protocol，代理通信协议）会话绑定：

- `/acp spawn <agent> --bind here` 将当前的 LINE 聊天绑定到 ACP 会话，而无需创建子线程。
- 已配置的 ACP 绑定和活动的会话绑定 ACP 会话在 LINE 上的工作方式与其他对话频道类似。

有关详细信息，请参阅 [ACP 代理](/zh/tools/acp-agents)。

## 出站媒体

LINE 插件支持通过代理消息工具发送图片、视频和音频文件。媒体通过 LINE 特定的交付路径发送，并具有适当的预览和跟踪处理：

- **图片**：作为 LINE 图片消息发送，并自动生成预览。
- **视频**：发送时带有明确的预览和内容类型处理。
- **音频**：作为 LINE 音频消息发送。

出站媒体 URL 必须是公共的 HTTPS URL。OpenClaw 在将 URL 传递给 LINE 之前会验证目标主机名，并拒绝回环、链路本地和专用网络目标。

当没有特定的 LINE 路径时，通用媒体发送会退回到现有的仅限图像的路由。

## 故障排除

- **Webhook 验证失败：** 请确保 Webhook URL 是 HTTPS 并且
  `channelSecret` 与 LINE 控制台匹配。
- **没有入站事件：** 请确认 Webhook 路径匹配 `channels.line.webhookPath`
  并且网关可被 LINE 访问。
- **媒体下载错误：** 如果媒体超出
  默认限制，则引发 `channels.line.mediaMaxMb`。

## 相关

- [渠道概述](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信身份验证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及控制
- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全性](/zh/gateway/security) — 访问模型和加固
