---
title: IRC
summary: "IRC 插件设置、访问控制和故障排除"
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

# IRC

当您需要在经典频道（`#room`）和直接消息中使用 OpenClaw 时，请使用 IRC。
IRC 作为扩展插件提供，但在 `channels.irc` 下的主配置文件中进行配置。

## 快速开始

1. 在 `~/.openclaw/openclaw.json` 中启用 IRC 配置。
2. 至少设置：

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.example.com",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

为机器人协调首选私有 IRC 服务器。如果你有意使用公共 IRC 网络，常见的选择包括 Libera.Chat、OFTC 和 Snoonet。避免为机器人或群组后向流量使用可预测的公开频道。

3. 启动/重启网关：

```bash
openclaw gateway run
```

## 安全默认值

- `channels.irc.dmPolicy` 默认为 `"pairing"`。
- `channels.irc.groupPolicy` 默认为 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 时，设置 `channels.irc.groups` 来定义允许的频道。
- 使用 TLS (`channels.irc.tls=true`)，除非你有意接受明文传输。

## 访问控制

IRC 频道有两个独立的“关卡”：

1. **频道访问** (`groupPolicy` + `groups`)：机器人是否接受来自频道的消息。
2. **发送者访问** (`groupAllowFrom` / 每频道 `groups["#channel"].allowFrom`)：谁被允许在该频道内触发机器人。

配置键：

- 私信允许列表（私信发送者访问）：`channels.irc.allowFrom`
- 群组发送者允许列表（频道发送者访问）：`channels.irc.groupAllowFrom`
- 每频道控制（频道 + 发送者 + 提及规则）：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允许未配置的频道（**默认仍受提及限制**）

允许列表条目应使用稳定的发送者身份 (`nick!user@host`)。
裸昵称匹配是可变的，仅在 `channels.irc.dangerouslyAllowNameMatching: true` 时启用。

### 常见陷阱：`allowFrom` 是用于私信的，不是用于频道的

如果你看到如下日志：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……这意味着该发送者未被允许发送 **群组/频道** 消息。请通过以下任一方式修复：

- 设置 `channels.irc.groupAllowFrom`（所有频道全局），或
- 设置每频道发送者允许列表：`channels.irc.groups["#channel"].allowFrom`

示例（允许 `#tuirc-dev` 中的任何人跟机器人对话）：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}
```

## 回复触发（提及）

即使频道是允许的（通过 `groupPolicy` + `groups`）且发送者是允许的，OpenClaw 在群组上下文中默认采用 **提及限制**。

这意味着除非消息包含与机器人匹配的提及模式，否则您可能会看到类似 `drop channel … (missing-mention)` 的日志。

若要机器人在 IRC 渠道中回复**而无需提及**，请为该渠道禁用提及限制：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}
```

或者要允许**所有** IRC 渠道（无每渠道允许列表）并在无提及的情况下回复：

```json5
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}
```

## 安全说明（推荐用于公开渠道）

如果您在公开渠道中允许 `allowFrom: ["*"]`，任何人都可以提示机器人。为了降低风险，请限制该渠道的工具。

### 渠道内所有人使用相同的工具

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}
```

### 根据发送者使用不同的工具（所有者获得更多权限）

使用 `toolsBySender` 对 `"*"` 应用更严格的策略，并对您的昵称应用较宽松的策略：

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}
```

备注：

- `toolsBySender` 键应使用 `id:` 作为 IRC 发送者标识值：
  使用 `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以进行更强的匹配。
- 传统的无前缀键仍然被接受，并且仅作为 `id:` 进行匹配。
- 第一个匹配的发送者策略获胜；`"*"` 是通配符后备。

有关组访问权限与提及限制（及其交互方式）的更多信息，请参阅：[/channels/groups](/en/channels/groups)。

## NickServ

连接后使用 NickServ 进行身份验证：

```json5
{
  channels: {
    irc: {
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "your-nickserv-password",
      },
    },
  },
}
```

连接时的一次性可选注册：

```json5
{
  channels: {
    irc: {
      nickserv: {
        register: true,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

注册昵称后禁用 `register`，以避免重复的 REGISTER 尝试。

## 环境变量

默认账户支持：

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS` （逗号分隔）
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

## 故障排除

- 如果机器人已连接但从未在渠道中回复，请验证 `channels.irc.groups` **以及**提及限制是否正在丢弃消息（`missing-mention`）。如果您希望它在无 Ping 的情况下回复，请为该渠道设置 `requireMention:false`。
- 如果登录失败，请验证昵称可用性和服务器密码。
- 如果 TLS 在自定义网络上失败，请验证主机/端口和证书设置。

## 相关

- [Channels Overview](/en/channels) — 所有支持的频道
- [Pairing](/en/channels/pairing) — 私信认证和配对流程
- [Groups](/en/channels/groups) — 群聊行为和提及控制
- [Channel Routing](/en/channels/channel-routing) — 消息的会话路由
- [Security](/en/gateway/security) — 访问模型和加固
