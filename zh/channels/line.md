---
summary: "LINE Messaging API 插件的设置、配置与用法"
read_when:
  - 你想将 OpenClaw 连接到 LINE
  - 你需要 LINE webhook + 凭据设置
  - 你需要 LINE 特定消息选项
title: "LINE"
---

# LINE（插件）

LINE 通过 LINE Messaging API 连接到 OpenClaw。插件在 gateway 上作为 webhook
接收器运行，并使用你的 channel access token + channel secret 进行认证。

状态：通过插件支持。支持私聊、群聊、媒体、位置、Flex 消息、模板消息与快捷回复。
不支持 reactions 与 threads。

## 需要插件

安装 LINE 插件：

```bash
openclaw plugins install @openclaw/line
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/line
```

## 设置

1. 创建 LINE Developers 账号并打开 Console：
   https://developers.line.biz/console/
2. 创建（或选择）Provider，并添加 **Messaging API** 渠道。
3. 从渠道设置中复制 **Channel access token** 与 **Channel secret**。
4. 在 Messaging API 设置中启用 **Use webhook**。
5. 将 webhook URL 设置为你的 gateway 端点（需 HTTPS）：

```
https://gateway-host/line/webhook
```

gateway 会响应 LINE 的 webhook 验证（GET）与入站事件（POST）。
如需自定义路径，设置 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath`，并相应更新 URL。

## 配置

最小配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing"
    }
  }
}
```

环境变量（仅默认账号）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

Token/secret 文件：

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt"
    }
  }
}
```

多账号：

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing"
        }
      }
    }
  }
}
```

## 访问控制

私聊默认需要配对。未知发送者会收到配对码，未批准前消息会被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Allowlist 与策略：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: 私聊 allowlist（LINE 用户 ID）
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: 群聊 allowlist（LINE 用户 ID）
- 按群覆盖：`channels.line.groups.<groupId>.allowFrom`

LINE ID 区分大小写。有效 ID 形如：

- 用户：`U` + 32 位十六进制
- 群组：`C` + 32 位十六进制
- Room：`R` + 32 位十六进制

## 消息行为

- 文本按 5000 字符分块。
- Markdown 会被移除；代码块与表格尽可能转换为 Flex 卡片。
- 流式响应会先缓冲；agent 处理期间 LINE 会收到带加载动画的完整分块。
- 媒体下载受 `channels.line.mediaMaxMb` 限制（默认 10）。

## 渠道数据（富消息）

使用 `channelData.line` 发送快捷回复、位置、Flex 卡片或模板消息。

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
        longitude: 139.767125
      },
      flexMessage: {
        altText: "Status card",
        contents: { /* Flex payload */ }
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no"
      }
    }
  }
}
```

LINE 插件还提供用于 Flex 模板的 `/card` 命令：

```
/card info "Welcome" "Thanks for joining!"
```

## 故障排查

- **Webhook 验证失败：** 确认 webhook URL 为 HTTPS，且 `channelSecret` 与 LINE 控制台一致。
- **无入站事件：** 确认 webhook 路径与 `channels.line.webhookPath` 匹配，且 gateway 可被 LINE 访问。
- **媒体下载错误：** 若媒体超出默认限制，增大 `channels.line.mediaMaxMb`。
