---
summary: "各平台上的群聊行为（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群组"
---

# 群组

OpenClaw 在各平台上对群聊的处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 初学者介绍 (2 分钟)

OpenClaw “寄宿”在您自己的消息帐户上。没有单独的 WhatsApp 机器人用户。
如果**您**在一个群组中，OpenClaw 就可以看到该群组并在那里回复。

默认行为：

- 群聊受到限制（`groupPolicy: "allowlist"`）。
- 回复需要提及 (@mention)，除非您明确禁用提及门控。

换句话说：在白名单上的发送者可以通过提及 OpenClaw 来触发它。

> TL;DR
>
> - **私信访问**由 `*.allowFrom` 控制。
> - **群组访问**由 `*.groupPolicy` + 允许列表（`*.groups`，`*.groupAllowFrom`）控制。
> - **回复触发**由提及门控控制（`requireMention`，`/activation`）。

快速流程（群组消息会发生什么）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![群消息流程](/images/groups-flow.svg)

如果您想要...

| 目标                           | 设置内容                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| 允许所有群组但仅在 @提及时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复               | `groupPolicy: "disabled"`                                  |
| 仅限特定群组                   | `groups: { "<group-id>": { ... } }`（没有 `"*"` 键）       |
| 只有你可以在群组中触发         | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话键（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群组 ID 后添加 `:topic:<threadId>`，以便每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置了，则使用每个发送者的会话）。
- 跳过群组会话的心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公开群组（单代理）

是的 — 如果您的“个人”流量是**私信**而“公开”流量是**群组**，这非常适用。

原因：在单代理模式下，私信通常落在**主**会话键（`agent:main:main`）中，而群组始终使用**非主**会话键（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在 Docker 中运行，而您的主私信会话则保留在主机上。

这为您提供了一个代理“大脑”（共享工作区 + 内存），但有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具（Docker）

> 如果您需要真正独立的工作区/角色（“个人”和“公开”绝不能混合），请使用第二个代理 + 绑定。请参阅[多代理路由](/en/concepts/multi-agent)。

示例（私信在主机上，群组已沙箱隔离 + 仅消息工具）：

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

希望“群组只能看到文件夹 X”而不是“无主机访问权限”？保留 `workspaceAccess: "none"` 并且仅将允许列表中的路径挂载到沙箱中：

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

相关：

- 配置键和默认值：[Gateway(网关) configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙箱 vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详细信息：[沙箱隔离](/en/gateway/sandboxing#custom-bind-mounts)

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
| `"open"`      | 群组绕过允许列表；提及门控仍然适用。  |
| `"disabled"`  | 完全阻止所有群组消息。                |
| `"allowlist"` | 仅允许匹配所配置允许列表的群组/房间。 |

注意：

- `groupPolicy` 与提及门控（需要 @mentions）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- 私信配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权保持对群组允许列表的显式要求。
- Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
- Slack：允许列表使用 `channels.slack.channels`。
- Matrix：允许列表使用 `channels.matrix.groups`。首选房间 ID 或别名；已加入房间名称查找是尽力而为的，未解析的名称在运行时会被忽略。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每个房间 `users` 允许列表。
- 群组私信是单独控制的（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允许列表可以匹配用户 ID (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) 或用户名 (`"@alice"` 或 `"alice"`)；前缀不区分大小写。
- 默认值为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，则群组消息将被阻止。
- 运行时安全性：当提供商块完全缺失（`channels.<provider>` 缺失）时，组策略将回退到故障关闭模式（通常为 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

快速心理模型（群组消息的评估顺序）：

1. `groupPolicy` (open/disabled/allowlist)
2. 组允许列表（`*.groups`，`*.groupAllowFrom`，特定于渠道的允许列表）
3. 提及 gating（`requireMention`，`/activation`）

## 提及 gating（默认）

除非针对特定群组进行了覆盖，否则群组消息需要提及。默认值位于每个子系统的 `*.groups."*"` 下。

回复机器人消息被视为一种隐式提及（当该渠道支持回复元数据时）。这适用于 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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
- 提供明确提及的 Surface 仍然会通过；模式仅作为后备方案。
- 按代理覆盖：`agents.list[].groupChat.mentionPatterns` （当多个代理共享一个群组时很有用）。
- 提及拦截仅在可进行提及检测（配置了原生提及或 `mentionPatterns`）时才强制执行。
- Discord 默认值位于 `channels.discord.guilds."*"`（可按每个服务器/渠道覆盖）。
- 跨渠道统一封装群组历史上下文，且仅包含待处理内容（因提及 gating 而跳过的消息）；使用 `messages.groupChat.historyLimit` 作为全局默认值，并使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在**特定群组/房间/渠道**内可用的工具。

- `tools`：允许/拒绝整个群组的工具。
- `toolsBySender`：群组内针对发件人的覆盖设置。
  使用显式键前缀：
  `id:<senderId>`，`e164:<phone>`，`username:<handle>`，`name:<displayName>` 和 `"*"` 通配符。
  旧版无前缀的键仍然被接受，并且仅作为 `id:` 进行匹配。

解析顺序（最具体的优先）：

1. 群组/渠道 `toolsBySender` 匹配
2. 群组/渠道 `tools`
3. 默认 (`"*"`) `toolsBySender` 匹配
4. 默认 (`"*"`) `tools`

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

说明：

- 群组/渠道工具限制是在全局/代理工具策略之外应用的（拒绝仍然优先）。
- 某些渠道对房间/渠道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`，Slack `channels.*`，Microsoft Teams `teams.*.channels.*`）。

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将作为群组允许列表生效。使用 `"*"` 来允许所有群组，同时仍然设置默认提及行为。

常见意图 (复制/粘贴)：

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

所有者由 `channels.whatsapp.allowFrom` 确定（或未设置时使用机器人的自身 E.164）。将命令作为独立消息发送。其他表面目前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject` (如果已知)
- `GroupMembers` (如果已知)
- `WasMentioned` (提及门控结果)
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

频道特定说明：

- BlueBubbles 可以在填充 `GroupMembers` 之前，从本地联系人数据库中可选地丰富未命名的 macOS 群组参与者。此功能默认关闭，仅在常规群组门控通过后运行。

代理系统提示在新群组会话的第一轮中包含群组介绍。它提醒模型像人类一样回复，避免使用 Markdown 表格，并避免输入字面的 `\n` 序列。

## iMessage 细节

- 在路由或添加到允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终发回同一个 `chat_id`。

## WhatsApp 细节

有关 WhatsApp 专有的行为（历史记录注入、提及处理详细信息），请参阅 [群组消息](/en/channels/group-messages)。
