---
summary: "Synology Chat webhook 设置和 OpenClaw 配置"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat（插件）

状态：通过插件作为使用 Synology Chat webhooks 的直接消息频道获得支持。
该插件接收来自 Synology Chat 传出 webhook 的入站消息，并通过
Synology Chat 传入 webhook 发送回复。

## 需要插件

Synology Chat 基于插件，不属于默认核心频道安装的一部分。

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详细信息：[插件](/en/tools/plugin)

## 快速设置

1. 安装并启用 Synology Chat 插件。
   - `openclaw onboard` 现在在与 `openclaw channels add` 相同的渠道设置列表中显示 Synology Chat。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建一个传入 webhook 并复制其 URL。
   - 使用您的密钥令牌创建一个传出 webhook。
3. 将传出 webhook URL 指向您的 OpenClaw 网关：
   - 默认为 `https://gateway-host/webhook/synology`。
   - 或者您的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。
   - 引导式：`openclaw onboard`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启网关并向 Synology Chat 机器人发送私信。

最小配置：

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## 环境变量

对于默认账户，您可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

配置值会覆盖环境变量。

## 私信策略和访问控制

- 推荐使用 `dmPolicy: "allowlist"` 作为默认值。
- `allowedUserIds` 接受 Synology 用户 ID 列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表将被视为配置错误，webhook 路由将不会启动（使用 `dmPolicy: "open"` 允许所有）。
- `dmPolicy: "open"` 允许任何发送者。
- `dmPolicy: "disabled"` 阻止私信。
- 默认情况下，回复收件人绑定保持稳定的数值 `user_id`。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一种应急兼容模式，重新启用了可变的用户名/昵称查找以进行回复投递。
- 配对批准适用于：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站投递

使用数值型 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

媒体发送支持基于 URL 的文件投递。

## 多账户

在 `channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。
每个账户可以覆盖令牌、入站 URL、Webhook 路径、私信策略和限制。
私信会话按账户和用户隔离，因此不同 Synology 账户上相同的数值 `user_id`
不会共享记录状态。
为每个启用的账户指定一个不同的 `webhookPath`。OpenClaw 现在会拒绝重复的完全相同的路径，
并拒绝启动在多账户设置中仅继承共享 Webhook 路径的命名账户。
如果您有意需要命名账户的传统继承，请在该账户上或 `channels.synology-chat` 处设置
`dangerouslyAllowInheritedWebhookPath: true`，但重复的完全相同的路径仍会被故障安全地拒绝。首选明确的每账户路径。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## 安全说明

- 请将 `token` 保密，并在泄露后轮换它。
- 除非您明确信任自签名的本地 NAS 证书，否则请保持 `allowInsecureSsl: false` 开启。
- 入站 Webhook 请求会进行令牌验证，并按发件人进行速率限制。
- 生产环境建议使用 `dmPolicy: "allowlist"`。
- 除非您明确需要基于用户名的传统回复投递，否则请保持 `dangerouslyAllowNameMatching` 关闭。
- 除非您明确接受多账户设置中的共享路径路由风险，否则请保持 `dangerouslyAllowInheritedWebhookPath` 关闭。

## 相关

- [渠道概览](/en/channels) — 所有支持的渠道
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群组聊天行为和提及门控
- [通道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
