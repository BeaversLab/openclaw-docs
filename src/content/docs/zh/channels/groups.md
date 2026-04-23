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

## 上下文可见性和允许列表

群组安全涉及两种不同的控制：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、特定渠道的允许列表）。
- **上下文可见性**：将哪些补充上下文注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常的聊天行为，并基本保持接收到的上下文不变。这意味着允许列表主要决定谁可以触发操作，而不是作为每个引用或历史片段的通用编辑边界。

当前行为因渠道而异：

- 某些渠道已针对特定路径中的补充上下文应用基于发送者的过滤（例如 Slack 线程植入、Matrix 回复/线程查找）。
- 其他渠道仍按接收到的原样传递引用/回复/转发上下文。

加固方向（计划中）：

- `contextVisibility: "all"`（默认）保持当前按接收原样处理的行为。
- `contextVisibility: "allowlist"` 将补充上下文过滤为仅包含允许列表中的发送者。
- `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个显式的引用/回复例外。

在此加固模型在各个渠道一致实施之前，预期不同表现层会存在差异。

![群组消息流程](/images/groups-flow.svg)

如果您想要...

| 目标                                | 设置方法                                                   |
| ----------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但仅在 @mentions 时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                    | `groupPolicy: "disabled"`                                  |
| 仅限特定群组                        | `groups: { "<group-id>": { ... } }`（无 `"*"` 键）         |
| 只有您可以在群组中触发              | `groupPolicy: "allowlist"`、`groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/渠道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会将 `:topic:<threadId>` 添加到群组 ID，以便每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置了，则使用每个发送者的会话）。
- 群组会话跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公共群组（单个代理）

是的 —— 如果您的“个人”流量是 **私信**，而“公共”流量是 **群组**，这种模式效果很好。

原因：在单代理模式下，私信通常会进入**主**会话密钥（`agent:main:main`），而群组总是使用**非主**会话密钥（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在配置的沙箱后端中运行，而您的主私信会话则保留在主机上。如果您不选择后端，Docker 是默认后端。

这为您提供了一个代理“大脑”（共享工作区 + 内存），但有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具

> 如果您需要真正独立的工作区/人设（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。请参阅 [Multi-Agent Routing](/zh/concepts/multi-agent)。

示例（主机上的私信，群组沙箱隔离 + 仅限消息工具）：

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

想要“群组只能看到文件夹 X”而不是“无主机访问”？保留 `workspaceAccess: "none"` 并仅将允许列表中的路径挂载到沙箱中：

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

- 配置键和默认值：[Gateway(网关) configuration](/zh/gateway/configuration-reference#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详细信息：[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)

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
        "!roomId:example.org": { enabled: true },
        "#alias:example.org": { enabled: true },
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

注：

- `groupPolicy` 与提及限制（需要 @mentions）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（后备：显式 `allowFrom`）。
- 私信 配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权仍明确取决于群组允许列表。
- Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
- Slack：允许列表使用 `channels.slack.channels`。
- Matrix：允许列表使用 `channels.matrix.groups`。首选房间 ID 或别名；已加入房间的名称查找尽力而为，运行时将忽略未解析的名称。使用 `channels.matrix.groupAllowFrom` 限制发送者；每个房间的 `users` 允许列表也受支持。
- 群组私信 单独控制（`channels.discord.dm.*`, `channels.slack.dm.*`）。
- Telegram 允许列表可以匹配用户 ID（`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认值为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，群组消息将被阻止。
- 运行时安全性：当提供商 块完全缺失（`channels.<provider>` 缺失）时，群组策略将回退到故障关闭模式（通常为 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

快速心理模型（群组消息的评估顺序）：

1. `groupPolicy` (open/disabled/allowlist)
2. 群组允许列表（`*.groups`, `*.groupAllowFrom`, 特定渠道 允许列表）
3. 提及门控（`requireMention`, `/activation`）

## 提及门控（默认）

除非针对每个群组进行了覆盖，否则群组消息需要提及。默认值按子系统位于 `*.groups."*"` 下。

当渠道支持回复元数据时，回复机器人消息被视为隐式提及。在暴露引用元数据的渠道上，引用机器人消息也可以被视为隐式提及。当前内置案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
- 提供明确提及的界面仍然可以通过；模式是一种备用方案。
- 每代理覆盖：`agents.list[].groupChat.mentionPatterns` （当多个代理共享一个组时很有用）。
- 仅在可以进行提及检测（配置了原生提及或 `mentionPatterns`）时，才会强制执行提及限制。
- Discord 的默认值位于 `channels.discord.guilds."*"` 中（可按 guild/渠道 覆盖）。
- 组历史上下文在渠道间统一包装，且为 **仅待处理** （因提及限制而跳过的消息）；使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit` （或 `channels.<channel>.accounts.*.historyLimit` ）进行覆盖。设置 `0` 以禁用。

## 组/渠道工具限制（可选）

某些渠道配置支持限制在 **特定组/房间/渠道内** 可用的工具。

- `tools`：允许/拒绝整个组的工具。
- `toolsBySender`：组内按发件人覆盖。
  使用显式密钥前缀：
  `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` 和 `"*"` 通配符。
  旧的无前缀密钥仍被接受，并仅匹配为 `id:`。

解析顺序（最具体的优先）：

1. 组/渠道 `toolsBySender` 匹配
2. 组/渠道 `tools`
3. 默认 （`"*"`） `toolsBySender` 匹配
4. 默认 （`"*"`） `tools`

示例 （%%PH:GLOSSARY:175:698df0b%%）：

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

注意：

- 组/渠道工具限制是除全局/代理工具策略外额外应用的（拒绝仍然优先）。
- 某些渠道对房间/渠道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`，Slack `channels.*`，Microsoft Teams `teams.*.channels.*`）。

## 组允许列表

当配置了 `channels.whatsapp.groups`, `channels.telegram.groups` 或 `channels.imessage.groups` 时，这些密钥将作为组允许列表。使用 `"*"` 允许所有组，同时仍设置默认提及行为。

常见误区：私信配对批准与群组授权不是一回事。对于支持私信配对的渠道，配对存储仅解锁私信。群组命令仍然需要来自配置允许列表（例如 `groupAllowFrom`）或该渠道文档中记录的配置回退的明确群组发送者授权。

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

## 激活（仅所有者）

群组所有者可以切换每个群组的激活状态：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（如果未设置，则为机器人自身的 E.164）。将命令作为独立消息发送。其他界面当前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及拦截结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

渠道特定说明：

- BlueBubbles 可以在填充 `GroupMembers` 之前，选择性地从本地联系人数据库中丰富未命名的 macOS 群组参与者。默认情况下此功能是关闭的，并且仅在正常的群组拦截通过后才运行。

智能体系统提示在新群组会话的第一轮包含群组介绍。它提醒模型像人类一样回应，避免 Markdown 表格，尽量减少空行并遵循正常的聊天间距，并避免输入字面的 `\n` 序列。

## iMessage 特性

- 在路由或列入允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是回到同一个 `chat_id`。

## WhatsApp 特性

有关 WhatsApp 特有的行为（历史记录注入、提及处理详细信息），请参阅 [Group messages](/zh/channels/group-messages)。
