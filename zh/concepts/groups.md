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
> - **私信 access** is controlled by `*.allowFrom`.
> - **Group access** is controlled by `*.groupPolicy` + allowlists (`*.groups`, `*.groupAllowFrom`).
> - **Reply triggering** is controlled by mention gating (`requireMention`, `/activation`).

快速流程（群组消息的处理过程）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![群组消息流程](/images/groups-flow.svg)

If you want...
| Goal | What to set |
|------|-------------|
| Allow all groups but only reply on @mentions | `groups: { "*": { requireMention: true } }` |
| Disable all group replies | `groupPolicy: "disabled"` |
| Only specific groups | `groups: { "<group-id>": { ... } }` (no `"*"` key) |
| Only you can trigger in groups | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 会话密钥

- Group sessions use `agent:<agentId>:<channel>:group:<id>` 会话 keys (rooms/channels use `agent:<agentId>:<channel>:channel:<id>`).
- Telegram forum topics add `:topic:<threadId>` to the group id so each topic has its own 会话.
- 直接聊天使用主会话（如果已配置，则使用每个发送者的会话）。
- 群组会话会跳过心跳检测。

## 模式：个人私信 + 公开群组（单一代理）

是的——如果您的“个人”流量是 **私信**，而您的“公开”流量是 **群组**，这效果很好。

Why: in single-agent mode, 私信 typically land in the **main** 会话 key (`agent:main:main`), while groups always use **non-main** 会话 keys (`agent:main:<channel>:group:<id>`). If you enable 沙箱隔离 with `mode: "non-main"`, those group sessions run in Docker while your main 私信 会话 stays on-host.

这为你提供了一个代理“大脑”（共享工作区 + 内存），但有两种执行姿态：

- **私聊**：完整工具（主机）
- **群组**：沙盒 + 受限工具（Docker）

> 如果你需要真正分离的工作区/角色（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。参见 [多代理路由](/zh/en/concepts/multi-agent)。

示例（私聊在主机上，群组在沙盒中 + 仅限消息工具）：

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

Want “groups can only see folder X” instead of “no host access”? Keep `workspaceAccess: "none"` and mount only allowlisted paths into the sandbox:

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

- 配置键和默认值：[Gateway 网关 配置](/zh/en/gateway/configuration#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙盒 vs 工具策略 vs 提权](/zh/en/gateway/sandbox-vs-工具-policy-vs-elevated)
- 绑定挂载详情：[沙盒化](/zh/en/gateway/沙箱隔离#custom-bind-mounts)

## 显示标签

- UI labels use `displayName` when available, formatted as `<channel>:<token>`.
- `#room` 保留用于房间/频道；群组聊天使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 群组策略

控制每个频道如何处理群组/房间消息：

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

| Policy        | Behavior                                                     |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | 群组绕过允许列表；提及限制仍然适用。      |
| `"disabled"`  | 完全阻止所有群组消息。                           |
| `"allowlist"` | 仅允许与配置的允许列表匹配的群组/房间。 |

备注：

- `groupPolicy` 与提及限制（需要 @mentions）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
- Slack：允许列表使用 `channels.slack.channels`。
- Matrix：允许列表使用 `channels.matrix.groups`（房间 ID、别名或名称）。使用 `channels.matrix.groupAllowFrom` 来限制发送者；也支持每个房间的 `users` 允许列表。
- 群组 DM 单独控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允许列表可以匹配用户 ID（`"123456789"`，`"telegram:123456789"`，`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认值是 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，则群组消息将被阻止。

快速思维模型（群组消息的评估顺序）：

1. `groupPolicy` (open/disabled/allowlist)
2. 群组允许列表 (`*.groups`，`*.groupAllowFrom`，渠道-specific allowlist)
3. 提及限制 (`requireMention`，`/activation`)

## 提及拦截（默认）

除非针对特定群组进行了覆盖，否则群组消息需要@提及。默认值位于每个子系统下的 `*.groups."*"` 中。

回复机器人消息被视为隐式提及（当频道支持回复元数据时）。这适用于 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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

备注：

- `mentionPatterns` 是不区分大小写的正则表达式。
- 提供显式提及的界面仍然通过；模式是一种回退机制。
- 按代理覆盖：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个群组时很有用）。
- 仅在能够检测到@提及时（配置了原生提及或 `mentionPatterns`），才会强制执行提及门控。
- Discord 的默认值位于 `channels.discord.guilds."*"` 中（可按服务器/频道覆盖）。
- 群组历史上下文在所有频道中统一包装，并且仅包含“待处理”消息（因提及门控而跳过的消息）；请使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

## 群组/频道工具限制（可选）

某些频道配置支持限制在**特定群组/房间/频道内**可用的工具。

- `tools`：为整个群组允许/拒绝工具。
- `toolsBySender`：群组内按发送者的覆盖（键为发送者 ID/用户名/电子邮件/电话号码，具体取决于频道）。使用 `"*"` 作为通配符。

解析顺序（最具体的优先）：

1. 群组/频道 `toolsBySender` 匹配
2. 群组/频道 `tools`
3. 默认 (`"*"`) `toolsBySender` 匹配
4. 默认 (`"*"`) `tools`

示例（Telegram）：

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

注意事项：

- 群组/频道工具限制与全局/代理工具策略一起应用（拒绝仍然优先）。
- 某些频道对房间/频道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`，Slack `channels.*`，MS Teams `teams.*.channels.*`）。

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将充当群组允许列表。使用 `"*"` 允许所有群组，同时仍然设置默认提及行为。

常见意图（复制/粘贴）：

1. 禁用所有群组回复

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

3. 允许所有群组但需要提及（显式）

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. 仅所有者可以在群组中触发（WhatsApp）

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

## 激活（仅所有者）

群组所有者可以切换每个群组的激活状态：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（如果未设置，则为机器人自身的 E.164 号码）。将该命令作为独立消息发送。其他平台目前会忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及拦截结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示词会在新群组会话的第一轮中包含群组介绍。它提醒模型要像人类一样回应，避免使用 Markdown 表格，并避免输入字面意义上的 `\n` 序列。

## iMessage 详情

- 在进行路由或加入白名单时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是返回到同一个 `chat_id`。

## WhatsApp 细节

请参阅 [Group messages](/zh/en/concepts/group-messages) 了解 WhatsApp 特有的行为（历史注入、提及处理详情）。

import zh from '/components/footer/zh.mdx';

<zh />
