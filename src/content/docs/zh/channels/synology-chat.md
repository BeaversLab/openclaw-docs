---
summary: "Synology Chat webhook 设置和 OpenClaw 配置"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat

状态：使用 Synology Chat Webhook 的捆绑插件私信渠道。
该插件接收来自 Synology Chat 传出 Webhook 的入站消息，并通过
Synology Chat 传入 Webhook 发送回复。

## 捆绑插件

Synology Chat 作为当前 OpenClaw 版本中的捆绑插件提供，因此正常的
打包构建无需单独安装。

如果您使用的是较旧的构建或排除了 Synology Chat 的自定义安装，
请手动安装：

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详情：[插件](/zh/tools/plugin)

## 快速设置

1. 确保 Synology Chat 插件可用。
   - 当前的 OpenClaw 打包版本已包含该插件。
   - 较旧/自定义安装可以使用上述命令从源代码检出中手动添加。
   - `openclaw onboard` 现在在与 `openclaw channels add` 相同的渠道设置列表中显示 Synology Chat。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建一个传入 Webhook 并复制其 URL。
   - 使用您的密钥令牌创建一个传出 Webhook。
3. 将传出 Webhook URL 指向您的 OpenClaw 网关：
   - 默认为 `https://gateway-host/webhook/synology`。
   - 或您的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。
   - 引导式：`openclaw onboard`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启网关并向 Synology Chat 机器人发送私信。

Webhook 身份验证详细信息：

- OpenClaw 接受来自 `body.token`，然后
  `?token=...`，最后是请求头的传出 Webhook 令牌。
- 接受的请求头格式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空缺或缺失的令牌将导致验证失败（默认拒绝）。

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

配置值优先于环境变量。

## 私信策略和访问控制

- `dmPolicy: "allowlist"` 是推荐的默认设置。
- `allowedUserIds` 接受 Synology 用户 ID 列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表将被视为配置错误，webhook 路由将不会启动（请使用 `dmPolicy: "open"` 以允许所有人）。
- `dmPolicy: "open"` 允许任何发送者。
- `dmPolicy: "disabled"` 阻止私信。
- 回复接收者绑定默认基于稳定的数字 `user_id`。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一种应急兼容模式，用于重新启用可变的用户名/昵称查找以进行回复投递。
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

支持通过基于 URL 的文件传输发送媒体。
出站文件 URL 必须使用 `http` 或 `https`，并且在 OpenClaw 将 URL 转发给 NAS webhook 之前，将拒绝私有或其他受阻止的网络目标。

## 多账户

在 `channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。
每个账户可以覆盖令牌、传入 URL、webhook 路径、私信策略和限制。
私信会话按账户和用户隔离，因此两个不同 Synology 账户上相同的数字 `user_id`
不共享聊天记录状态。
为每个启用的账户指定一个不同的 `webhookPath`。OpenClaw 现在拒绝重复的完全相同的路径，并拒绝启动在多账户设置中仅继承共享 webhook 路径的命名账户。
如果您有意需要命名账户的旧版继承，请在该账户或 `channels.synology-chat` 上设置
`dangerouslyAllowInheritedWebhookPath: true`，但仍然会以失效安全（fail-closed）方式拒绝重复的完全相同的路径。优先使用明确的每个账户路径。

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

- 保密 `token`，如果泄露请轮换它。
- 保持 `allowInsecureSsl: false` 开启，除非您明确信任自签名的本地 NAS 证书。
- 入站 webhook 请求会经过 token 验证，并按发送者进行速率限制。
- 无效 token 检查使用恒定时间密钥比较，并在失败时拒绝访问。
- 生产环境建议使用 `dmPolicy: "allowlist"`。
- 保持 `dangerouslyAllowNameMatching` 关闭，除非您明确需要基于旧版用户名的回复传递。
- 保持 `dangerouslyAllowInheritedWebhookPath` 关闭，除非您在多账户设置中明确接受共享路径路由风险。

## 故障排除

- `Missing required fields (token, user_id, text)`：
  - 传出 Webhook 负载缺少必需字段之一
  - 如果 Synology 在标头中发送令牌，请确保网关/代理保留了这些标头
- `Invalid token`：
  - 传出 webhook 密钥与 `channels.synology-chat.token` 不匹配
  - 请求命中了错误的账户/Webhook 路径
  - 反向代理在请求到达 OpenClaw 之前剥离了令牌标头
- `Rate limit exceeded`：
  - 来自同一来源的过多无效令牌尝试可能会暂时锁定该来源
  - 经过身份验证的发件人也有单独的每用户消息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open.`：
  - `dmPolicy="allowlist"` 已启用但未配置用户
- `User not authorized`：
  - 发送者的数字 `user_id` 不在 `allowedUserIds` 中

## 相关

- [通道概览](/zh/channels) — 所有支持的通道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及控制
- [通道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全性](/zh/gateway/security) — 访问模型和加固
