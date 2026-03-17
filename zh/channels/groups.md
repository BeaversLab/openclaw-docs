---
summary: "跨平台（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo）的群聊行为"
read_when:
  - Changing group chat behavior or mention gating
title: "群组"
---

# 群组

OpenClaw 在所有平台上统一处理群组聊天：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams、Zalo。

## 初学者介绍 (2 分钟)

OpenClaw “寄宿”在您自己的消息帐户上。没有单独的 WhatsApp 机器人用户。
如果**您**在一个群组中，OpenClaw 就可以看到该群组并在那里回复。

默认行为：

- 群组受到限制 (`groupPolicy: "allowlist"`)。
- 回复需要提及 (@mention)，除非您明确禁用提及门控。

换句话说：在白名单上的发送者可以通过提及 OpenClaw 来触发它。

> TL;DR
>
> - **私信 访问**由 `*.allowFrom` 控制。
> - **群组访问**由 `*.groupPolicy` + 允许列表（`*.groups`，`*.groupAllowFrom`）控制。
> - **回复触发**由提及门控（`requireMention`，`/activation`）控制。

快速流程（群组消息会发生什么）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果您想要...

| 目标                           | 设置内容                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| 允许所有群组但仅在 @提及时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复               | `groupPolicy: "disabled"`                                  |
| 仅限特定群组                   | `groups: { "<group-id>": { ... } }`（无 `"*"` 键）         |
| 只有你可以在群组中触发         | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题将 `:topic:<threadId>` 添加到群组 ID，因此每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置了，则使用每个发送者的会话）。
- 跳过群组会话的心跳检测。

## 模式：个人私信 + 公共群组（单代理）

是的 —— 如果您的“个人”流量是 **私信**，而您的“公共”流量是 **群组**，这非常有效。

原因：在单代理模式下，私信通常落在 **主** 会话密钥（`agent:main:main`）中，而群组始终使用 **非主** 会话密钥（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在 Docker 中运行，而您的主私信会话则保留在宿主机上。

这为您提供了一个代理“大脑”（共享工作空间 + 内存），但有两种执行姿态：

- **私信**：完整工具（宿主机）
- **群组**：沙箱 + 受限工具（Docker）

> 如果您需要真正独立的工作空间/角色（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。参见[多代理路由](/zh/concepts/multi-agent)。

示例（私信在宿主机上，群组沙箱隔离 + 仅消息工具）：

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

想要“群组只能看到文件夹 X”而不是“无主机访问”？保留 `workspaceAccess: "none"` 并且仅将允许列表中的路径挂载到沙箱中：

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
            "/home/user/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

相关内容：

- 配置键和默认值：[Gateway 网关 配置](/zh/gateway/configuration#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙箱 vs 工具策略 vs 提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详情：[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 是为房间/渠道保留的；群组聊天使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 群组策略

控制每个渠道如何处理群组/房间消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // numeric Telegram user id (wizard can resolve @username)
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

| 策略          | 行为                                  |
| ------------- | ------------------------------------- |
| `"open"`      | 群组绕过允许列表；提及限制仍然适用。  |
| `"disabled"`  | 完全阻止所有群组消息。                |
| `"allowlist"` | 仅允许匹配配置的允许列表的群组/房间。 |

注意事项：

- `groupPolicy` 与提及限制（需要 @mentions）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（后备选项：显式 `allowFrom`）。
- 私信配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权保持对群组允许列表的显式指定。
- Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
- Slack：允许列表使用 `channels.slack.channels`。
- Matrix：允许列表使用 `channels.matrix.groups`（房间 ID、别名或名称）。使用 `channels.matrix.groupAllowFrom` 来限制发送者；也支持每个房间的 `users` 允许列表。
- 群组私信是单独控制的（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允许列表可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认为 `groupPolicy: "allowlist"`；如果您的组允许列表为空，则组消息将被阻止。
- 运行时安全性：当提供商块完全缺失（缺少 `channels.<provider>`）时，组策略将回退到故障关闭模式（通常为 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

快速心理模型（组消息的评估顺序）：

1. `groupPolicy`（开放/禁用/允许列表）
2. 组允许列表（`*.groups`、`*.groupAllowFrom`、特定于渠道的允许列表）
3. 提及 gating（`requireMention`、`/activation`）

## 提及 gating（默认）

组消息需要提及，除非针对每个组进行覆盖。默认值位于 `*.groups."*"` 下的每个子系统中。

回复机器人消息算作隐式提及（当该渠道支持回复元数据时）。这适用于 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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

- `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效的模式和不安全的嵌套重复形式将被忽略。
- 提供显式提及的表面仍然通过；模式是备用方案。
- 每个代理的覆盖：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个组时很有用）。
- 提及 gating 仅在可以检测到提及时强制执行（配置了原生提及或 `mentionPatterns`）。
- Discord 的默认值位于 `channels.discord.guilds."*"` 中（可按服务器/渠道覆盖）。
- 群组历史上下文在各个渠道中统一包装，且为 **pending-only**（因提及 gating 跳过的消息）；使用 `messages.groupChat.historyLimit` 作为全局默认值，并使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在特定群组/房间/渠道内可用的工具。

- `tools`：允许/拒绝整个群组的工具。
- `toolsBySender`：群组内按发送方覆盖。
  使用显式键前缀：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。
  旧版无前缀键仍被接受，并仅作为 `id:` 进行匹配。

解析顺序（最具体的优先）：

1. 群组/渠道 `toolsBySender` 匹配
2. 群组/渠道 `tools`
3. 默认（`"*"`）`toolsBySender` 匹配
4. 默认（`"*"`）`tools`

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
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

注：

- 群组/渠道工具限制除全局/代理工具策略外应用（拒绝仍然有效）。
- 某些渠道对房间/频道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将作为群组允许列表。使用 `"*"` 允许所有群组，同时仍设置默认提及行为。

常见意图（复制/粘贴）：

1. 禁用所有群组回复

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. 仅允许特定群组 (WhatsApp)

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

3. 允许所有群组但要求提及（显式）

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. 仅所有者可以在群组中触发 (WhatsApp)

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

## 激活（仅限所有者）

群组所有者可以切换每个群组的激活状态：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（如果未设置，则使用机器人自身的 E.164）。将该命令作为独立消息发送。其他界面目前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示在新的群组会话的第一轮包含群组介绍。它提醒模型像人类一样回应，避免使用 Markdown 表格，并避免输入字面意义的 `\n` 序列。

## iMessage 详情

- 路由或添加到允许列表时，优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是返回到同一个 `chat_id`。

## WhatsApp 详情

请参阅 [Group messages](/zh/channels/group-messages) 了解 WhatsApp 专属行为（历史记录注入、提及处理详情）。

import zh from "/components/footer/zh.mdx";

<zh />
