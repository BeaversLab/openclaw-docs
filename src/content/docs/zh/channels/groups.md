---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZalo各平台群聊行为（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
  - Scoping mentionPatterns to specific group conversations
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在各平台上对群聊的处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

对于应该提供安静上下文，除非代理明确发送可见消息的常驻房间，请参阅 [Ambient room events](/zh/channels/ambient-room-events)。

## 初学者介绍（2 分钟）

OpenClaw “栖息”在您自己的消息帐户上。没有单独的 WhatsApp 机器人用户。如果 **您** 在某个群组中，OpenClaw 就可以看到该群组并在那里回复。

默认行为：

- 群组是受限的（`groupPolicy: "allowlist"`）。
- 回复需要提及，除非您明确禁用提及门控。
- 群组/渠道中的可见回复默认使用 `message` 工具。

翻译：列入允许列表的发件人可以通过提及来触发 OpenClaw。

<Note>
**TL;DR**

- **私信 访问权限**由 `*.allowFrom` 控制。
- **群组访问权限**由 `*.groupPolicy` + 允许列表（`*.groups`, `*.groupAllowFrom`）控制。
- **回复触发**由提及门控（`requireMention`, `/activation`）控制。

</Note>

快速流程（群组消息会发生什么）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
mention/reply/command/DM -> user request
always-on group chatter -> user request, or room event when configured
```

## 可见回复

对于正常的群组/渠道请求，OpenClaw 默认使用 OpenClaw`messages.groupChat.visibleReplies: "automatic"`。最终的助手文本通过传统的可见回复路径发布，除非您将房间设置为仅使用消息工具输出。

当共享房间应允许代理通过调用 `message(action=send)`OpenClaw 来决定何时发言时，请使用 `messages.groupChat.visibleReplies: "message_tool"`。这最适合由最新一代、工具可靠的模型（如 GPT 5.5）支持的群组房间。如果模型未调用该工具并返回实质性的最终文本，OpenClaw 会将最终文本保密，而不是发布到房间。

对于无法可靠理解仅工具交付的较弱模型或运行时，请使用 `"automatic"`。在自动模式下，代理的最终助手文本是可见的源回复路径，因此无法始终调用 `message(action=send)` 的模型仍可正常回答。

如果在活动工具策略下消息工具不可用，OpenClaw 将回退到自动可见回复，而不是静默抑制响应。OpenClaw`openclaw doctor` 会针对这种不匹配发出警告。

对于直接聊天和其他任何源事件，请使用 `messages.visibleReplies: "message_tool"`WebChat 在全局范围内应用相同的仅工具可见回复行为。内部 WebChat 直接轮次默认为自动最终回复交付，以便 Pi 和 Codex 接收相同的可见回复合同。设置 `messages.visibleReplies: "message_tool"` 以有意要求 `message(action=send)` 进行可见输出。`messages.groupChat.visibleReplies` 仍然是针对群组/渠道聊天室的更具体的覆盖设置。

这取代了旧的强制模型在大多数潜伏模式轮次中回答 `NO_REPLY` 的模式。在仅工具模式下，提示词未定义 `NO_REPLY` 合同。不执行任何可见操作仅意味着不调用消息工具。

插件拥有的对话绑定是例外情况。一旦插件绑定线程并接管入站轮次，插件返回的回复就是可见的绑定响应；它不需要 `message(action=send)`。该回复是插件运行时输出，而不是私有模型的最终文本。

对于直接的群组请求，仍会发送正在输入指示器。当启用时，环境常驻聊天室事件将保持严格和静默，除非代理调用消息工具。

会话默认会抑制冗长的工具/进度摘要。在调试时使用 `/verbose on` 显示当前会话的这些摘要，并使用 `/verbose off` 返回到仅最终回复的行为。相同的详细状态适用于直接聊天、群组、渠道和论坛主题。

要将未提及的常驻群组闲聊作为安静的聊天室上下文而不是用户请求提交，请使用 [Ambient room events](/zh/channels/ambient-room-events)：

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
    },
  },
}
```

默认值为 `unmentionedInbound: "user_request"`。

提及的消息、命令、中止请求和私信仍作为用户请求处理。

若要求群组/渠道请求的可见输出必须通过消息工具进行：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

文件保存后，网关会热重载 `messages` 配置。仅当部署中禁用了文件监视或配置重载时才需重启。

若要求每个源聊天的可见输出都必须通过消息工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜杠命令（Discord、Telegram 以及其他支持原生命令的界面）会绕过 `visibleReplies: "message_tool"` 并始终可见地回复，以便原生命令界面获得其期望的响应。这仅适用于经过验证的原生命令轮次；文本输入的 `/...` 命令和普通聊天轮次仍遵循配置的组默认值。

## 上下文可见性和允许列表

涉及两个不同的组安全控制：

- **触发授权**：谁可以触发智能体（`groupPolicy`、`groups`、`groupAllowFrom`、渠道特定的允许列表）。
- **上下文可见性**：将哪些补充上下文注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常聊天行为，并基本按接收到的样子保留上下文。这意味着允许列表主要决定谁可以触发操作，而不是为每个引用或历史片段设定通用的编辑边界。

<AccordionGroup>
  <Accordion title="当前行为因渠道而异">
    - 某些渠道已针对特定路径中的补充上下文应用基于发送者的过滤（例如 Slack 线程植入、Matrix 回复/线程查找）。
    - 其他渠道仍按接收到的样子传递引用/回复/转发上下文。

  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"`（默认）保持当前的按接收处理的行为。
    - `contextVisibility: "allowlist"` 将补充上下文过滤为仅允许列表中的发送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个显式的引用/回复例外。

    在此加固模型在所有渠道中一致实施之前，预期各界面间存在差异。

  </Accordion>
</AccordionGroup>

![Group message flow](/images/groups-flow.svg)

如果您想要……

| 目标                             | 如何设置                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但仅在被提及时回复   | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                 | `groupPolicy: "disabled"`                                  |
| 仅限特定群组                     | `groups: { "<group-id>": { ... } }`（无 `"*"` 键）         |
| 仅限您在群组中触发               | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |
| 跨渠道复用同一个受信任发送者集合 | `groupAllowFrom: ["accessGroup:operators"]`                |

关于可复用的发送者白名单，请参阅 [访问组](/zh/channels/access-groups)。

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群组 ID 后添加 Telegram`:topic:<threadId>`，以便每个主题拥有自己的会话。
- 直接聊天使用主会话（如果已配置，则使用每个发送者的会话）。
- 群组会话将跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公开群组（单智能体）

是的——如果您的“个人”流量是**私信**而“公开”流量是**群组**，这非常适用。

原因：在单智能体模式下，私信通常落入**主**会话密钥（`agent:main:main`），而群组始终使用**非主**会话密钥（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"`Docker 启用沙箱隔离，这些群组会话将在配置的沙箱后端运行，而您的主私信会话则保留在主机上。如果不选择后端，Docker 是默认后端。

这为您提供一个智能体“大脑”（共享工作区 + 内存），但具有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具

<Note>如果您需要真正独立的工作区/人设（“个人”和“公开”绝不能混合），请使用第二个智能体 + 绑定。请参阅 [多智能体路由](/zh/concepts/multi-agent)。</Note>

<Tabs>
  <Tab title="私信 on host, groups 沙箱隔离">
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
  </Tab>
  <Tab title="Groups see only an allowlisted folder">
    想要“群组只能看到文件夹 X”而不是“无主机访问权”？保留 `workspaceAccess: "none"` 并仅将允许列表中的路径挂载到沙箱中：

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

  </Tab>
</Tabs>

相关：

- 配置键和默认值：[Gateway(网关) 配置](/zh/gateway/config-agents#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙箱 vs 工具策略 vs 提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
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

<AccordionGroup>
  <Accordion title="每渠道备注">
    - `groupPolicy` 与提及门控（需要 @提及）是分开的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：请使用 `groupAllowFrom`（回退选项：显式的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配入站 Signal 群组 ID 或发送者电话/UUID。
    - 私信配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权保持对群组允许列表的显式设置。
    - Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允许列表使用 `channels.slack.channels`。
    - Matrix：允许列表使用 `channels.matrix.groups`。建议优先使用房间 ID 或别名；已加入房间的名称查找仅为尽力而为，运行时会忽略无法解析的名称。使用 `channels.matrix.groupAllowFrom` 限制发送者；同时也支持每个房间的 `users` 允许列表。
    - 群组私信单独控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
    - Telegram 允许列表可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认值为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，群组消息将被阻止。
    - 运行时安全性：当提供商块完全缺失（`channels.<provider>` 缺失）时，群组策略将回退到故障关闭模式（通常为 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速心智模型（群组消息的评估顺序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist)。</Step>
  <Step title="Group allowlists">Group allowlists (`*.groups`, `*.groupAllowFrom`, 特定渠道的 allowlist)。</Step>
  <Step title="Mention gating">Mention gating (`requireMention`, `/activation`)。</Step>
</Steps>

## Mention gating (默认)

除非针对特定群组进行了覆盖，否则群组消息需要提及（mention）。默认值位于 `*.groups."*"` 下的每个子系统中。

当渠道支持回复元数据时，回复机器人消息算作隐式提及。在暴露引用元数据的渠道上，引用机器人消息也可以算作隐式提及。当前内置情况包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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

## 限定已配置的提及模式

已配置的 `mentionPatterns` 是正则回退触发器。当平台不暴露原生机器人提及，或者当您希望纯文本（例如 `openclaw:`）算作提及时，请使用它们。原生平台提及是分开的：当 Discord、Slack、Telegram、Matrix 或其他渠道可以证明消息明确提及了机器人时，该原生提及仍然会触发，即使已配置的正则模式被拒绝。

默认情况下，已配置的提及模式适用于渠道将提供商和对话事实传递给提及检测的所有地方。为了防止广泛的模式在每个群组中唤醒代理，请使用 `channels.<channel>.mentionPatterns` 按渠道限定它们。

当渠道的正则提及模式默认应关闭时，请使用 `mode: "deny"`，然后使用 `allowIn` 选择加入特定房间：

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b", "\\bops bot\\b"],
    },
  },
  channels: {
    slack: {
      mentionPatterns: {
        mode: "deny",
        allowIn: ["C0123OPS"],
      },
    },
  },
}
```

当正则提及模式应广泛适用时，请使用默认的 `mode: "allow"`（或省略 `mode`），然后在嘈杂的房间中使用 `denyIn` 将其关闭：

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b"],
    },
  },
  channels: {
    telegram: {
      mentionPatterns: {
        denyIn: ["-1001234567890", "-1001234567890:topic:42"],
      },
    },
  },
}
```

策略解析：

| 字段            | 效果                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `mode: "allow"` | 除非会话 ID 位于 `denyIn` 中，否则启用正则提及模式。这是默认设置。               |
| `mode: "deny"`  | 除非会话 ID 位于 `allowIn` 中，否则禁用正则提及模式。                            |
| `allowIn`       | 在拒绝模式下启用正则提及模式的会话 ID。                                          |
| `denyIn`        | 禁用正则提及模式的会话 ID。如果两者包含相同的 ID，则 `denyIn` 优先于 `allowIn`。 |

目前支持的范围限定正则策略：

| 渠道     | 用于 `allowIn` / `denyIn` 的 ID                         |
| -------- | ------------------------------------------------------- |
| Discord  | Discord 频道 ID。                                       |
| Matrix   | Matrix 房间 ID。                                        |
| Slack    | Slack 频道 ID。                                         |
| Telegram | 群聊 ID，或者对于论坛话题使用 `chatId:topic:threadId`。 |
| WhatsApp | WhatsApp 会话 ID，例如 `123@g.us`。                     |

当某个渠道支持多个账户时，账户级别的渠道配置可以在 `channels.<channel>.accounts.<accountId>.mentionPatterns` 下设置相同的策略。对于该账户，账户策略优先于顶级渠道策略。

<AccordionGroup>
  <Accordion title="提及筛选说明">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效的模式和不安全的嵌套重复形式将被忽略。
    - 提供明确提及的界面仍然通过；配置的正则表达式模式作为后备方案。
    - `channels.<channel>.mentionPatterns.mode: "deny"` 默认禁用该渠道的已配置提及模式；使用 `allowIn` 重新选择加入特定对话。
    - `channels.<channel>.mentionPatterns.denyIn` 禁用特定对话 ID 的已配置提及模式，而原生平台的 @提及仍然有效。
    - 每个代理覆盖：`agents.list[].groupChat.mentionPatterns` （当多个代理共享一个组时很有用）。
    - 仅在可以检测到提及（原生提及或配置了 `mentionPatterns`）时才强制执行提及筛选。
    - 将组或发件人加入白名单不会禁用提及筛选；当所有消息都应触发时，将该组的 `requireMention` 设置为 `false`。
    - 自动组聊提示上下文每轮都携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许自动静默回复的组将干净的空回复或仅包含推理的模型轮次视为静默，相当于 `NO_REPLY`。直接聊天永远不会收到 `NO_REPLY` 指导，并且仅使用消息工具的组回复通过不调用 `message(action=send)` 来保持静默。
    - 环境常驻组聊天默认使用用户请求语义。设置 `messages.groupChat.unmentionedInbound: "room_event"` 以将其作为静默上下文提交。有关设置示例，请参阅 [环境房间事件](/zh/channels/ambient-room-eventsDiscord)。
    - 房间事件不会存储为虚假用户请求，并且来自无消息工具房间事件的私人助手文本不会作为聊天历史重放。
    - Discord 默认值位于 `channels.discord.guilds."*"` 中（每个公会/渠道可覆盖）。
    - 组历史上下文在所有渠道中统一包装。提及筛选的组保留待处理的跳过消息；当渠道支持时，常驻组也可能保留最近已处理的房间消息。使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit` （或 `channels.<channel>.accounts.*.historyLimit`） 进行覆盖。设置 `0` 以禁用。

  </Accordion>
</AccordionGroup>

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在**特定群组/房间/渠道内**可用的工具。

- `tools`：允许/拒绝整个群组的工具。
- `toolsBySender`：群组内按发送方覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。渠道 ID 使用规范化的 OpenClaw 渠道 ID；诸如 `teams` 之类的别名会规范化为 `msteams`。仍接受旧版无前缀键，并仅将其作为 `id:` 进行匹配。

解析顺序（最具体的优先）：

<Steps>
  <Step title="Group toolsBySender">群组/渠道 `toolsBySender` 匹配。</Step>
  <Step title="Group tools">群组/渠道 `tools`。</Step>
  <Step title="Default toolsBySender">默认（`"*"`）`toolsBySender` 匹配。</Step>
  <Step title="Default tools">默认（`"*"`）`tools`。</Step>
</Steps>

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
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

<Note>群组/渠道工具限制除了全局/代理工具策略外应用（拒绝仍然优先）。某些渠道对房间/渠道使用不同的嵌套结构（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将充当群组允许列表。使用 `"*"` 以允许所有群组，同时仍设置默认提及行为。

<Warning>常见误区：私信配对批准与群组授权不同。对于支持私信配对的渠道，配对存储仅解锁私信。群组命令仍需要来自配置允许列表（如 `groupAllowFrom`）的明确群组发送者授权，或该渠道文档中记载的配置回退机制。</Warning>

常见意图（复制/粘贴）：

<Tabs>
  <Tab title="禁用所有群组回复">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="仅允许特定群组 (WhatsApp)">
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
  </Tab>
  <Tab title="允许所有群组但需要提及">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="仅限所有者触发 (WhatsApp)">
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
  </Tab>
</Tabs>

## 激活（仅限所有者）

群组所有者可以切换每个群组的激活状态：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（如果未设置，则为机器人自身的 E.164）。将该命令作为独立消息发送。其他平台目前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示在新的群组会话的第一轮包含群组介绍。它提醒模型像人类一样回应，避免 Markdown 表格，尽量减少空行并遵循正常的聊天间距，并避免输入字面的 `\n` 序列。来源渠道的群组名称和参与者标签呈现为受围栏保护的不可信元数据，而非内联系统指令。

## iMessage 细节

- 在路由或添加到允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是返回到同一个 `chat_id`。

## WhatsApp 系统提示词

有关 WhatsApp 系统提示词的规范规则，包括群组和直接提示词解析、通配符行为以及帐户覆盖语义，请参阅 [WhatsApp](/zh/channels/whatsapp#system-prompts)。

## WhatsApp 细节

有关 WhatsApp 专用的行为（历史记录注入、提及处理详细信息），请参阅 [Group messages](/zh/channels/group-messages)。

## 相关

- [Broadcast groups](/zh/channels/broadcast-groups)
- [Channel routing](/zh/channels/channel-routing)
- [Group messages](/zh/channels/group-messages)
- [Pairing](/zh/channels/pairing)
