---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZalo各平台的群聊行为 (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在各平台上对群聊的处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

对于除非代理明确发送可见消息，否则应提供安静上下文的常驻房间，请参阅 [Ambient room events](/zh/channels/ambient-room-events)。

## 初学者介绍（2 分钟）

OpenClaw “栖息”在您自己的消息帐户上。没有单独的 WhatsApp 机器人用户。如果 **您** 在某个群组中，OpenClaw 就可以看到该群组并在那里回复。

默认行为：

- 群组是受限的 (`groupPolicy: "allowlist"`)。
- 回复需要提及，除非您明确禁用提及门控。
- 群组/渠道中的可见回复默认使用 `message` 工具。

翻译：列入允许列表的发件人可以通过提及来触发 OpenClaw。

<Note>
**TL;DR**

- **私信访问** 由 `*.allowFrom` 控制。
- **群组访问** 由 `*.groupPolicy` + 允许列表 (`*.groups`, `*.groupAllowFrom`) 控制。
- **回复触发** 由提及门控 (`requireMention`, `/activation`) 控制。

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

对于正常的群组/渠道请求，OpenClaw 默认为 `messages.groupChat.visibleReplies: "automatic"`。最终的助手文本通过旧的可见回复路径发布，除非您将房间设置为仅使用消息工具输出。

当共享房间应允许代理通过调用 `message(action=send)` 来决定何时发言时，请使用 `messages.groupChat.visibleReplies: "message_tool"`。这最适合由最新一代工具可靠的模型（如 GPT 5.5）支持的群组房间。如果模型未使用该工具并返回实质性的最终文本，OpenClaw 会将该最终文本设为私密，而不是将其发布到房间中。

如果在当前工具策略下消息工具不可用，OpenClaw 将回退到自动可见回复，而不是静默抑制响应。
`openclaw doctor` 会针对这种不匹配发出警告。

对于直接聊天和其他任何源事件，请使用 `messages.visibleReplies: "message_tool"` 全局应用相同的仅工具可见回复行为。内部 WebChat 直接轮次默认为自动最终回复传递，以便 Pi 和 Codex 接收相同的可见回复合约。设置 `messages.visibleReplies: "message_tool"` 以有意要求 `message(action=send)` 进行可见输出。`messages.groupChat.visibleReplies` 仍然是针对群组/渠道房间更具体的覆盖设置。

这取代了以前强制模型在大多数潜伏模式轮次中回答 `NO_REPLY` 的旧模式。在仅工具模式下，不进行任何可见操作仅仅意味着不调用消息工具。

对于直接的群组请求，仍会发送正在输入指示器。当启用时，环境常驻房间事件保持严格和静默，除非代理调用消息工具。

会话默认会抑制详细的工具/进度摘要。在调试时，使用 `/verbose on` 显示当前会话的这些摘要，并使用 `/verbose off` 返回到仅最终回复的行为。相同的详细状态适用于直接聊天、群组、渠道和论坛主题。

要将未提及的常驻群组闲聊作为安静的房间上下文而不是用户请求提交，请使用 [Ambient room events](/zh/channels/ambient-room-events)：

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

提及的消息、命令、中止请求和私信仍被视为用户请求。

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

文件保存后，网关会热重载 `messages` 配置。仅在部署中禁用文件监视或配置重载时才重启。

若要求每个源聊天的可见输出都必须通过消息工具进行：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜杠命令（Discord、Telegram 和其他具有原生命令支持的界面）会绕过 `visibleReplies: "message_tool"` 并始终进行可见回复，以便渠道原生命令 UI 获得其预期的响应。这仅适用于已验证的原生命令轮次；文本输入的 `/...` 命令和普通聊天轮次仍遵循配置的群组默认值。

## 上下文可见性和允许列表

群组安全涉及两种不同的控制机制：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、特定于渠道的允许列表）。
- **上下文可见性**：将哪些补充上下文注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常的聊天行为，并基本保持接收到的上下文不变。这意味着允许列表主要决定谁可以触发操作，而不是为每个引用或历史片段设定通用的编辑边界。

<AccordionGroup>
  <Accordion title="Current behavior is 渠道-specific">
    - 某些渠道已在特定路径中应用基于发送者的补充上下文过滤（例如 Slack 话题种子植入、Matrix 回复/话题查找）。
    - 其他渠道仍按接收到的样子传递引用/回复/转发上下文。

  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"` (默认) 保持当前按接收时的行为。
    - `contextVisibility: "allowlist"` 过滤补充上下文，仅保留白名单发送者的内容。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个明确的引用/回复例外。

    在此加固模型跨渠道一致实施之前，不同平台间可能会有差异。

  </Accordion>
</AccordionGroup>

![群组消息流](/images/groups-flow.svg)

如果您想要...

| 目标                             | 设置内容                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| 允许所有群组，但仅在 @提及时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                 | `groupPolicy: "disabled"`                                  |
| 仅限特定群组                     | `groups: { "<group-id>": { ... } }` (没有 `"*"` 键)        |
| 仅您可以在群组中触发             | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| 跨渠道复用同一个受信任发送者集合 | `groupAllowFrom: ["accessGroup:operators"]`                |

有关可重用的发送者白名单，请参阅[访问组](/zh/channels/access-groups)。

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群组 ID 中添加 `:topic:<threadId>`，以便每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置了，则使用每个发送者的会话）。
- 群组会话跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公共群组（单个代理）

是的——如果您的“个人”流量是**私信**，而“公共”流量是**群组**，这会运作良好。

原因：在单代理模式下，私信通常落在 **main** 会话密钥 (`agent:main:main`) 中，而群组始终使用 **non-main** 会话密钥 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在配置的沙箱后端运行，而您的主私信会话则保留在主机上。如果您不选择后端，Docker 是默认后端。

这为您提供了一个代理“大脑”（共享工作区 + 内存），但具有两种执行姿态：

- **私信**：完整工具（宿主机）
- **群组**：沙箱 + 受限工具

<Note>如果您需要真正独立的工作区/角色（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。请参阅[多代理路由](/zh/concepts/multi-agent)。</Note>

<Tabs>
  <Tab title="私信在宿主机，群组沙箱隔离">
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
  <Tab title="群组只能看到白名单文件夹">
    想要“群组只能看到文件夹 X”而不是“无法访问主机”？保留 `workspaceAccess: "none"` 并且仅将白名单路径挂载到沙箱中：

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
- 绑定挂载详细信息：[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 保留给房间/频道；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

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

| 策略          | 行为                               |
| ------------- | ---------------------------------- |
| `"open"`      | 群组绕过白名单；提及限制仍然适用。 |
| `"disabled"`  | 完全阻止所有群组消息。             |
| `"allowlist"` | 仅允许匹配配置白名单的群组/房间。  |

<AccordionGroup>
  <Accordion title="Per-渠道 notes">
    - `groupPolicy` 与提及门控（需要 @mentions）是分开的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配入站 Signal 群组 ID 或发送者电话/UUID。
    - 私信配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权对群组允许列表保持显式。
    - Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允许列表使用 `channels.slack.channels`。
    - Matrix：允许列表使用 `channels.matrix.groups`。首选房间 ID 或别名；已加入房间的名称查找是尽力而为的，未解析的名称在运行时会被忽略。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每个房间的 `users` 允许列表。
    - 群组私信受单独控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
    - Telegram 允许列表可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认值为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，则群组消息将被阻止。
    - 运行时安全性：当提供商块完全缺失（`channels.<provider>` 缺失）时，群组策略将回退到故障关闭模式（通常为 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速思维模型（群组消息的评估顺序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist).</Step>
  <Step title="群组允许列表">群组允许列表（`*.groups`、`*.groupAllowFrom`、特定渠道的允许列表）。</Step>
  <Step title="提及门控">提及门控（`requireMention`、`/activation`）。</Step>
</Steps>

## 提及 gating（默认）

除非针对特定群组进行了覆盖，否则群组消息需要提及。默认值位于每个子系统的 `*.groups."*"` 下。

当渠道支持回复元数据时，回复机器人消息被视为隐式提及。在支持引用元数据的渠道上，引用机器人消息也可能被视为隐式提及。当前内置情况包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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

<AccordionGroup>
  <Accordion title="提及筛选注意事项">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效的模式和不安全的嵌套重复形式将被忽略。
    - 提供明确提及的界面仍然会通过；模式仅作为后备方案。
    - 每个代理的覆盖设置：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个组时很有用）。
    - 只有在可以检测到提及（配置了原生提及或 `mentionPatterns`）时，才会强制执行提及筛选。
    - 将组或发件人加入允许列表不会禁用提及筛选；当所有消息都应触发响应时，请将该组的 `requireMention` 设置为 `false`。
    - 自动组聊天提示上下文每一轮都会携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许自动静默回复的组将干净的空回复或仅包含推理的模型轮次视为静默，等效于 `NO_REPLY`。直接聊天永远不会收到 `NO_REPLY` 指导，且仅使用消息工具的组回复通过不调用 `message(action=send)` 来保持安静。
    - 环境常驻群组闲聊默认使用用户请求语义。设置 `messages.groupChat.unmentionedInbound: "room_event"` 将其作为静默上下文提交。有关设置示例，请参阅 [环境房间事件](/zh/channels/ambient-room-events)。
    - 房间事件不会作为虚假用户请求存储，并且来自无消息工具房间事件的私有助手文本不会作为聊天历史重放。
    - Discord 的默认值位于 `channels.discord.guilds."*"` 中（可按公会/渠道覆盖）。
    - 组历史上下文在各个渠道中被一致地包装。提及筛选的组会保留待处理的跳过消息；常驻组在渠道支持时也可能保留最近已处理的房间消息。使用 `messages.groupChat.historyLimit` 设置全局默认值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

  </Accordion>
</AccordionGroup>

## 组/渠道工具限制（可选）

某些渠道配置支持限制特定群组/房间/渠道**内部**可用的工具。

- `tools`：为整个组允许/拒绝工具。
- `toolsBySender`: 组内按发送者覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。渠道 ID 使用规范的 OpenClaw 渠道 ID；诸如 `teams` 之类的别名会标准化为 `msteams`。仍接受旧的无前缀键，并仅将其作为 `id:` 进行匹配。

解析顺序（更具体的优先）：

<Steps>
  <Step title="Group toolsBySender">组/渠道 `toolsBySender` 匹配。</Step>
  <Step title="Group tools">组/渠道 `tools`。</Step>
  <Step title="Default toolsBySender">默认 (`"*"`) `toolsBySender` 匹配。</Step>
  <Step title="Default tools">默认 (`"*"`) `tools`。</Step>
</Steps>

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

<Note>组/渠道工具限制是在全局/代理工具策略之外应用的（拒绝仍然优先）。某些渠道对房间/渠道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将作为组允许列表。使用 `"*"` 允许所有组，同时仍然设置默认提及行为。

<Warning>常见混淆：私信配对批准与组授权不同。对于支持私信配对的渠道，配对存储仅解锁私信。组命令仍需要来自配置允许列表（例如 `groupAllowFrom`）或该渠道的记录配置回退的显式组发送者授权。</Warning>

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

所有者由 `channels.whatsapp.allowFrom` 确定（或在未设置时由机器人自身的 E.164 号码确定）。将该命令作为独立消息发送。其他界面目前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示在新的群组会话的第一轮中包含群组介绍。它提醒模型像人类一样回应，避免使用 Markdown 表格，尽量减少空行并遵循正常的聊天间距，并避免输入字面意义上的 `\n` 序列。来源渠道的群组名称和参与者标签呈现为围栏式的不受信任的元数据，而不是内联系统指令。

## iMessage 细节

- 在路由或允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是回到同一个 `chat_id`。

## WhatsApp 系统提示词

有关标准的 WhatsApp 系统提示规则（包括群组和直接提示解析、通配符行为和账户覆盖语义），请参阅 [WhatsApp](/zh/channels/whatsapp#system-prompts)。

## WhatsApp 特性

有关 WhatsApp 专有的行为（历史记录注入、提及处理详细信息），请参阅 [群组消息](/zh/channels/group-messages)。

## 相关

- [广播群组](/zh/channels/broadcast-groups)
- [渠道路由](/zh/channels/channel-routing)
- [群组消息](/zh/channels/group-messages)
- [配对](/zh/channels/pairing)
