---
summary: "跨平台的群组聊天行为（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）"
read_when:
  - "Changing group chat behavior or mention gating"
title: "群组"
---

# 群组

OpenClaw 在各个平台上对群组聊天进行一致处理：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 新手入门（2 分钟）

OpenClaw “寄居”在你自己的消息账号上。没有单独的 WhatsApp 机器人用户。
如果**你**在一个群组中，OpenClaw 可以看到该群组并在那里响应。

默认行为：

- 群组受到限制（`groupPolicy: "allowlist"`）。
- 除非你明确禁用提及门控，否则回复需要提及。

换句话说：白名单中的发送者可以通过提及 OpenClaw 来触发它。

> TL;DR
>
> - **私聊访问**由 `*.allowFrom` 控制。
> - **群组访问**由 `*.groupPolicy` + 白名单（`*.groups`、`*.groupAllowFrom`）控制。
> - **回复触发**由提及门控（`requireMention`、`/activation`）控制。

快速流程（群组消息的处理过程）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果你想要...
| 目标 | 设置内容 |
|------|-------------|
| Allow all groups but only reply on @mentions | `groups: { "*": { requireMention: true } }` |
| Disable all group replies | `groupPolicy: "disabled"` |
| Only specific groups | `groups: { "<group-id>": { ... } }` (no `"*"` key) |
| Only you can trigger in groups | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题在群组 ID 中添加 `:topic:<threadId>`，以便每个主题都有自己的会话。
- 直接聊天使用主会话（如果已配置，则使用每个发送者的会话）。
- 群组会话跳过心跳。

## 模式：个人私聊 + 公共群组（单个代理）

是的 — 如果你的”个人”流量是**私聊**，而”公共”流量是**群组**，这种模式效果很好。

原因：在单代理模式下，私聊通常落入**主**会话密钥（`agent:main:main`），而群组始终使用**非主**会话密钥（`agent:main:<channel>:group:<id>`）。如果你使用 `mode: "non-main"` 启用沙盒，这些群组会话将在 Docker 中运行，而你的主私聊会话则保留在主机上。
这为你提供了一个代理”大脑”（共享工作区 + 记忆），但有两种执行姿态：

- **私聊**：完整工具（主机）
- **群组**：沙盒 + 受限工具（Docker）

> 如果你需要真正分离的工作区/人设（”个人”和”公共”绝不能混合），请使用第二个代理 + 绑定。参阅[多代理路由](/zh/concepts/multi-agent)。

示例（私聊在主机上，群组在沙盒中 + 仅消息传递工具）：

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

想要”群组只能看到文件夹 X”而不是”无主机访问”？保持 `workspaceAccess: "none"` 并仅将白名单路径挂载到沙盒中：

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

- 配置键和默认值：[Gateway configuration](/zh/gateway/configuration#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙盒 vs 工具策略 vs 提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详情：[沙盒化](/zh/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 为房间/频道保留；群组聊天使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

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

| 策略        | 行为                                                     |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | 群组绕过白名单；提及门控仍然适用。      |
| `"disabled"`  | 完全阻止所有群组消息。                           |
| `"allowlist"` | 仅允许与配置的白名单匹配的群组/房间。 |

注意事项：

- `groupPolicy` 与提及门控（需要 @提及）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- Discord：白名单使用 `channels.discord.guilds.<id>.channels`。
- Slack：白名单使用 `channels.slack.channels`。
- Matrix：白名单使用 `channels.matrix.groups`（房间 ID、别名或名称）。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每个房间的 `users` 白名单。
- 群组私聊单独控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram 白名单可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认为 `groupPolicy: "allowlist"`；如果你的群组白名单为空，群组消息将被阻止。
快速思维模型（群组消息的评估顺序）：

1. `groupPolicy`（open/disabled/allowlist）
2. 群组白名单（`*.groups`、`*.groupAllowFrom`、频道特定白名单）
3. 提及门控（`requireMention`、`/activation`）

## 提及门控（默认）

群组消息需要提及，除非为每个群组单独覆盖。默认值位于 `*.groups."*"` 下的每个子系统中。

回复机器人消息算作隐式提及（当频道支持回复元数据时）。这适用于 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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
- 提供显式提及的表面仍然通过；模式是回退方案。
- 每个代理覆盖：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个群组时很有用）。
- 提及门控仅在可能检测提及时强制执行（已配置原生提及或 `mentionPatterns`）。
- Discord 默认值位于 `channels.discord.guilds."*"` 中（可以按服务器/频道覆盖）。
- 群组历史上下文在各个频道中统一包装，并且**仅限待处理**（因提及门控而跳过的消息）；使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

## 群组/频道工具限制（可选）

某些频道配置支持限制**特定群组/房间/频道内**可用的工具。

- `tools`：为整个群组允许/拒绝工具。
- `toolsBySender`：群组内每个发送者的覆盖（键是发送者 ID/用户名/电子邮件/电话号码，具体取决于频道）。使用 `"*"` 作为通配符。

解析顺序（最具体的优先）：

1. 群组/频道 `toolsBySender` 匹配
2. 群组/频道 `tools`
3. 默认（`"*"`）`toolsBySender` 匹配
4. 默认（`"*"`）`tools`

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

- 群组/频道工具限制除了全局/代理工具策略之外应用（拒绝仍然优先）。
- 某些频道对房间/频道使用不同的嵌套（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群组白名单
当配置 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将充当群组白名单。使用 `"*"` 允许所有群组，同时仍然设置默认提及行为。

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

群组所有者可以切换每个群组的激活：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（或机器人的自 E.164（如果未设置））。将命令作为独立消息发送。其他表面目前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示在新群组会话的第一轮中包含群组介绍。它提醒模型像人类一样响应，避免 Markdown 表格，并避免输入字面 `\n` 序列。

## iMessage 特定内容

- 路由或列入白名单时优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终返回到相同的 `chat_id`。

## WhatsApp 特定内容

参阅[群组消息](/zh/concepts/group-messages)了解 WhatsApp 特定的行为（历史注入、提及处理详细信息）。
