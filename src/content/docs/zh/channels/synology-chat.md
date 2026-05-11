---
summary: "Synology Chat webhook 设置和 OpenClaw 配置"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

状态：使用 Synology Chat Webhook 的捆绑插件私信渠道。
该插件接收来自 Synology Chat 传出 Webhook 的入站消息，并通过
Synology Chat 传入 Webhook 发送回复。

## 捆绑插件

Synology Chat 作为捆绑插件包含在当前的 OpenClaw 版本中，因此正常的打包版本不需要单独安装。

如果您使用的是旧版本或排除了 Synology Chat 的自定义安装，请手动安装：

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详情：[插件](/zh/tools/plugin)

## 快速设置

1. 确保 Synology Chat 插件可用。
   - 当前的 OpenClaw 打包版本已将其捆绑在内。
   - 旧版本/自定义安装可以使用上述命令从源代码检出中手动添加。
   - `openclaw onboard` 现在在与 `openclaw channels add` 相同的渠道设置列表中显示 Synology Chat。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建一个传入 Webhook 并复制其 URL。
   - 使用您的密钥令牌创建一个传出 Webhook。
3. 将传出 Webhook URL 指向您的 OpenClaw 网关：
   - 默认情况下为 `https://gateway-host/webhook/synology`。
   - 或者您的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。
   - 引导式：`openclaw onboard`
   - 直接方式：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启网关并向 Synology Chat 机器人发送私信。

Webhook 身份验证详细信息：

- OpenClaw 接受来自 `body.token` 的传出 Webhook 令牌，然后是
  `?token=...`，最后是标头。
- 接受的标头格式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空或缺失的令牌将导致失败（默认拒绝）。

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

配置值将覆盖环境变量。

`SYNOLOGY_CHAT_INCOMING_URL` 无法从工作区 `.env` 设置；请参阅[工作区 `.env` 文件](/zh/gateway/security)。

## 私信策略和访问控制

- `dmPolicy: "allowlist"` 是推荐的默认设置。
- `allowedUserIds` 接受 Synology 用户 ID 列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表将被视为配置错误，Webhook 路由将不会启动（使用 `dmPolicy: "open"` 允许所有）。
- `dmPolicy: "open"` 允许任何发送者。
- `dmPolicy: "disabled"` 阻止私信。
- 默认情况下，回复收件人绑定保持稳定的数字 `user_id`。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一种应急兼容模式，它重新启用了可变的用户名/昵称查找以进行回复传递。
- 配对批准适用于：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站投递

使用数字 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

支持通过基于 URL 的文件传送来发送媒体。
出站文件 URL 必须使用 `http` 或 `https`，并且私有的或其他被阻止的网络目标将在 OpenClaw 将 URL 转发给 NAS Webhook 之前被拒绝。

## 多账户

`channels.synology-chat.accounts` 下支持多个 Synology Chat 帐户。
每个帐户可以覆盖令牌、传入 URL、Webhook 路径、私信策略和限制。
私信会话按帐户和用户隔离，因此两个不同 Synology 帐户上相同的数字 `user_id` 不会共享记录状态。
为每个启用的帐户指定一个不同的 `webhookPath`。OpenClaw 现在会拒绝重复的完全相同的路径，并拒绝启动在多帐户设置中仅继承共享 Webhook 路径的命名帐户。
如果您确实需要命名帐户的旧版继承，请在该帐户或 `channels.synology-chat` 上设置 `dangerouslyAllowInheritedWebhookPath: true`，但重复的完全相同的路径仍将被故障安全地拒绝。首选显式的每个帐户的路径。

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

- 请对 `token` 保密，如果泄露请轮换它。
- 除非您明确信任自签名的本地 NAS 证书，否则请保持 `allowInsecureSsl: false`。
- 入站 webhook 请求会经过 token 验证，并按发送者进行速率限制。
- 无效 token 检查使用恒定时间密钥比较，并在失败时拒绝访问。
- 生产环境首选 `dmPolicy: "allowlist"`。
- 除非您明确需要基于用户名的旧版回复传递，否则请保持 `dangerouslyAllowNameMatching` 关闭。
- 除非您明确接受多账户设置中的共享路径路由风险，否则请保持 `dangerouslyAllowInheritedWebhookPath` 关闭。

## 故障排除

- `Missing required fields (token, user_id, text)`：
  - 传出 Webhook 负载缺少必需字段之一
  - 如果 Synology 在标头中发送令牌，请确保网关/代理保留了这些标头
- `Invalid token`：
  - 出站 Webhook 密钥与 `channels.synology-chat.token` 不匹配
  - 请求命中了错误的账户/Webhook 路径
  - 反向代理在请求到达 OpenClaw 之前剥离了令牌标头
- `Rate limit exceeded`：
  - 来自同一来源的过多无效令牌尝试可能会暂时锁定该来源
  - 经过身份验证的发件人也有单独的每用户消息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open.`：
  - 已启用 `dmPolicy="allowlist"` 但未配置任何用户
- `User not authorized`：
  - 发送者的数字 `user_id` 不在 `allowedUserIds` 中

## 相关

- [通道概览](/zh/channels) — 所有支持的通道
- [配对](/zh/channels/pairing) — 私信身份验证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及控制
- [通道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全性](/zh/gateway/security) — 访问模型和加固
