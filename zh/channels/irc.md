---
title: IRC
description: 将 OpenClaw 连接到 IRC 渠道和私信。
summary: "IRC 插件设置、访问控制和故障排除"
read_when:
  - 您希望将 OpenClaw 连接到 IRC 渠道或私信
  - 您正在配置 IRC 允许列表、组策略或提及门控
---

当您需要在经典渠道 (`#room`) 和私信中使用 OpenClaw 时，请使用 IRC。
IRC 作为扩展插件提供，但在主配置文件中的 `channels.irc` 下进行配置。

## 快速开始

1. 在 `~/.openclaw/openclaw.json` 中启用 IRC 配置。
2. 至少设置：

```json
{
  "channels": {
    "irc": {
      "enabled": true,
      "host": "irc.libera.chat",
      "port": 6697,
      "tls": true,
      "nick": "openclaw-bot",
      "channels": ["#openclaw"]
    }
  }
}
```

3. 启动/重启网关：

```bash
openclaw gateway run
```

## 安全默认值

- `channels.irc.dmPolicy` 默认为 `"pairing"`。
- `channels.irc.groupPolicy` 默认为 `"allowlist"`。
- 使用 `groupPolicy="allowlist"` 时，设置 `channels.irc.groups` 以定义允许的渠道。
- 使用 TLS (`channels.irc.tls=true`)，除非您有意接受明文传输。

## 访问控制

IRC 频道有两个独立的“入口”：

1. **渠道访问** (`groupPolicy` + `groups`)：机器人是否完全接受来自渠道的消息。
2. **发送者访问** (`groupAllowFrom` / 每个渠道的 `groups["#channel"].allowFrom`)：谁被允许在该渠道内触发机器人。

配置键：

- 私信允许列表 (私信发送者访问)：`channels.irc.allowFrom`
- 组发送者允许列表 (渠道发送者访问)：`channels.irc.groupAllowFrom`
- 每个渠道的控制 (渠道 + 发送者 + 提及规则)：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允许未配置的渠道 (**默认仍受提及门控限制**)

允许列表条目应使用稳定的发送者身份 (`nick!user@host`)。
仅昵称匹配是可变的，仅在 `channels.irc.dangerouslyAllowNameMatching: true` 时启用。

### 常见陷阱：`allowFrom` 适用于私信，而非渠道

如果您看到如下日志：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……这意味着该发送者未被允许发送 **群组/频道** 消息。请通过以下方式之一修复：

- 设置 `channels.irc.groupAllowFrom` (所有渠道的全局设置)，或者
- 设置每个渠道的发送者允许列表：`channels.irc.groups["#channel"].allowFrom`

示例 (允许 `#tuirc-dev` 中的任何人跟机器人对话)：

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

## 回复触发 (提及)

即使允许了渠道 (通过 `groupPolicy` + `groups`) 且发送者也被允许，OpenClaw 在群组上下文中默认为 **提及门控**。

这意味着除非消息包含匹配机器人的提及模式，否则您可能会看到类似 `drop channel … (missing-mention)` 的日志。

若要使机器人在 IRC 频道中回复而**无需提及**，请为该频道禁用提及限制：

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

或者允许**所有** IRC 频道（无针对每个频道的允许列表）并且仍然无需提及即可回复：

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

## 安全说明（推荐用于公共频道）

如果您在公共渠道中允许 `allowFrom: ["*"]`，任何人都可以提示该机器人。
为了降低风险，请限制该渠道的工具。

### 频道内所有人使用相同的工具

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

注意：

- `toolsBySender` 键应使用 `id:` 作为 IRC 发送者身份值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171` 以进行更强的匹配。
- 旧式无前缀的键仍然被接受，并且仅作为 `id:` 进行匹配。
- 第一个匹配的发送者策略获胜；`"*"` 是通配符后备。

有关组访问与提及门控（以及它们如何交互）的更多信息，请参阅：[/channels/groups](/zh/channels/groups)。

## NickServ

要在连接后使用 NickServ 进行身份验证：

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "enabled": true,
        "service": "NickServ",
        "password": "your-nickserv-password"
      }
    }
  }
}
```

连接时可选的一次性注册：

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "register": true,
        "registerEmail": "bot@example.com"
      }
    }
  }
}
```

注册昵称后，请禁用 `register` 以避免重复的 REGISTER 尝试。

## 环境变量

默认帐户支持：

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

- 如果机器人已连接但在渠道中从不回复，请验证 `channels.irc.groups` **以及** 提及门控是否正在丢弃消息（`missing-mention`）。如果您希望它在没有 ping 的情况下回复，请为该渠道设置 `requireMention:false`。
- 如果登录失败，请验证昵称可用性和服务器密码。
- 如果在自定义网络上 TLS 失败，请验证主机/端口和证书设置。

import zh from "/components/footer/zh.mdx";

<zh />
