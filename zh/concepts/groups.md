---
summary: "跨平台（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）的群聊行为"
read_when:
  - Changing group chat behavior or mention gating
title: "Groups"
---

# 群组

OpenClaw 在各平台上统一处理群聊：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 入门介绍（2 分钟）

OpenClaw “寄宿”在您自己的消息账户上。不存在单独的 WhatsApp 机器人用户。
如果 **您** 在某个群里，OpenClaw 就能看到该群并在那里回复。

默认行为：

- Groups are restricted (`groupPolicy: "allowlist"`).
- 回复需要被提及，除非您明确禁用提及门控。

这意味着：在白名单中的发送者可以通过提及 OpenClaw 来触发它。

> TL;DR
>
> - **私信 访问**由 `*.allowFrom` 控制。
> - **群组 访问**由 `*.groupPolicy` + 允许列表（`*.groups`，`*.groupAllowFrom`）控制。
> - **回复触发**由提及门控（`requireMention`，`/activation`）控制。

快速流程（群组消息的处理过程）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![群组消息流程](/images/groups-flow.svg)

如果您想要...
| 目标 | 设置内容 |
|------|-------------|
| 允许所有群组但仅在 @提及时回复 | `groups: { "*": { requireMention: true } }` |
| 禁用所有群组回复 | `groupPolicy: "disabled"` |
| 仅限特定群组 | `groups: { "<group-id>": { ... } }` （无 `"*"` 键） |
| 只有您可以在群组中触发 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 会话 密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群组 ID 中添加 `:topic:<threadId>`，因此每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置了，则使用每个发件人的会话）。
- 群组会话跳过心跳检测。

## 模式：个人 私信 + 公共群组（单一代理）

是的——如果您的“个人”流量是 **私信** 而“公共”流量是 **群组**，这很有效。

原因：在单代理模式下，私信通常会进入**主**会话密钥 (`agent:main:main`)，而群组总是使用**非主**会话密钥 (`agent:main:<channel>:group:<id>`)。如果您通过 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在 Docker 中运行，而您的主私信会话则保持在宿主机上。

这为您提供了一个代理“大脑”（共享工作区 + 内存），但有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具 (Docker)

> 如果您需要真正分离的工作区/人设（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。请参阅 [多代理路由](/zh/concepts/multi-agent)。

示例（私信在主机上，群组沙箱隔离 + 仅消息传递工具）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // groups/channels are non-main -> sandboxed
        scope: "session", // strongest isolation (one container per group/channel)
        workspaceAccess: "none",
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        // If allow is non-empty, everything else is blocked (deny still wins).
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
      },
    },
  },
}
```

想要“组只能看到文件夹 X”而不是“无主机访问权限”？保留 `workspaceAccess: "none"` 并仅将允许列表中的路径挂载到沙箱：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
        docker: {
          binds: [
            // hostPath:containerPath:mode
            "~/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

相关内容：

- 配置键和默认值：[Gateway 网关 配置](/zh/gateway/configuration#agentsdefaultssandbox)
- 调试工具 被阻止的原因：[沙箱隔离 vs 工具 策略 vs 提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详细信息：[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 保留用于房间/渠道；群组聊天使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 组策略

控制每个渠道如何处理组/房间消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789", "@username"],
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: { channels: { help: { allow: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
    },
  },
}
```

| 策略          | 行为                                |
| ------------- | ----------------------------------- |
| `"open"`      | 组绕过允许列表；提及限制仍然适用。  |
| `"disabled"`  | 完全阻止所有组消息。                |
| `"allowlist"` | 仅允许匹配配置的允许列表的组/房间。 |

注意：

- `groupPolicy` 与提及限制（需要 @提及）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
- Slack：允许列表使用 `channels.slack.channels`。
- Matrix：允许列表使用 `channels.matrix.groups`（房间 ID、别名或名称）。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每个房间的 `users` 允许列表。
- 组 私信是单独控制的（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram 允许列表可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，群组消息将被阻止。

快速心智模型（群组消息的评估顺序）：

1. `groupPolicy`（开放/禁用/允许列表）
2. 群组允许列表（`*.groups`、`*.groupAllowFrom`、特定渠道允许列表）
3. 提及门控（`requireMention`、`/activation`）

## 提及门控（默认）

除非针对特定群组进行了覆盖，否则群组消息需要提及才能触发。默认值位于各子系统下的 `*.groups."*"`。

回复机器人消息被视为隐式提及（当渠道支持回复元数据时）。这适用于 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false },
      },
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false },
      },
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    ],
  },
}
```

注意事项：

- `mentionPatterns` 是不区分大小写的正则表达式。
- 提供显式提及的界面仍然可以通过；模式是作为备选方案的。
- 每个代理的覆盖：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个群组时很有用）。
- 仅当可以进行提及检测（配置了原生提及或 `mentionPatterns`）时，才会强制执行提及门控。
- Discord 默认值位于 `channels.discord.guilds."*"` 中（可按公会/频道覆盖）。
- 群组历史上下文在各个渠道中被统一封装，并且是 **仅限待处理** 的（因提及门控而跳过的消息）；请使用 `messages.groupChat.historyLimit` 设置全局默认值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在 **特定群组/房间/渠道内** 可用的工具。

- `tools`：允许/拒绝整个群组的工具。
- `toolsBySender`：群组内按发送者的覆盖（键为发送者 ID/用户名/电子邮件/电话号码，具体取决于渠道）。使用 `"*"` 作为通配符。

解析顺序（最具体的优先）：

1. group/渠道 `toolsBySender` 匹配
2. group/渠道 `tools`
3. default (`"*"`) `toolsBySender` 匹配
4. default (`"*"`) `tools`

示例 (Telegram)：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

备注：

- Group/渠道 工具 restrictions are applied in addition to global/agent 工具 policy (deny still wins).
- 某些频道对房间/频道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## Group allowlists

When `channels.whatsapp.groups`, `channels.telegram.groups`, or `channels.imessage.groups` is configured, the keys act as a group allowlist. Use `"*"` to allow all groups while still setting default mention behavior.

Common intents (copy/paste)：

1. Disable all group replies

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. 仅允许特定群组（WhatsApp）

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "123@g.us": { requireMention: true },
        "456@g.us": { requireMention: false },
      },
    },
  },
}
```

3. Allow all groups but require mention (explicit)

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. 仅拥有者可以在群组中触发（WhatsApp）

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      groups: { "*": { requireMention: true } },
    },
  },
}
```

## Activation (owner-only)

Group owners can toggle per-group activation：

- `/activation mention`
- `/activation always`

Owner is determined by `channels.whatsapp.allowFrom` (or the bot’s self E.164 when unset). Send the command as a standalone message. Other surfaces currently ignore `/activation`.

## Context fields

Group inbound payloads set：

- `ChatType=group`
- `GroupSubject` (if known)
- `GroupMembers` (if known)
- `WasMentioned` (mention gating result)
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

The agent system prompt includes a group intro on the first turn of a new group 会话. It reminds the 模型 to respond like a human, avoid Markdown tables, and avoid typing literal `\n` sequences.

## iMessage 特性

- 在路由或添加到允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终返回到同一个 `chat_id`。

## WhatsApp 特性

有关 WhatsApp 独有的行为（历史记录注入、提及处理详细信息），请参阅 [群组消息](/zh/concepts/group-messages)。

import zh from "/components/footer/zh.mdx";

<zh />
