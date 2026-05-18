---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZalo各平台的群聊行为 (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在各平台上对群聊的处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

对于除非代理明确发送可见消息否则应提供静默上下文的常驻房间，请参阅 [环境房间事件](/zh/channels/ambient-room-events)。

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

对于群组/渠道房间，OpenClaw 默认设置为 `messages.groupChat.visibleReplies: "message_tool"`。
`openclaw doctor --fix` 会将此默认值写入省略了该项的已配置渠道配置中。
这意味着代理仍会处理该轮次并可以更新内存/会话状态，并且当它有房间回复时，应使用 `message(action=send)` 进行可见发言。如果模型错过了该工具并返回了实质性的最终文本，OpenClaw 将保留该最终文本为私密状态，而不是将其发布到房间。

此默认值依赖于能够可靠调用工具的模型/运行时。如果日志显示
有助手文本但出现 `didSendViaMessagingTool: false`DiscordSlackTelegram，则说明模型
私下回答了问题，而不是调用消息工具。房间保持静默，且
网关详细日志会记录被抑制的最终有效负载元数据。这不是
Discord/Slack/Telegram 发送失败，而是一个工具纪律信号。请对群组/渠道会话
使用可靠调用工具的模型，或者当您希望所有可见的群组
回复都使用旧的最终回复路径时，设置 `messages.groupChat.visibleReplies: "automatic"`。

如果消息工具在当前工具策略下不可用，OpenClaw 将
回退到自动可见回复，而不是静默抑制响应。
OpenClaw`openclaw doctor` 会就此不匹配发出警告。

对于直接聊天和任何其他源事件，请使用 `messages.visibleReplies: "message_tool"` 在全局范围内应用相同的仅工具可见回复行为。连接器也可以选择将其作为未设置时的默认值；Codex 连接器对 Codex 模式的直接聊天就是这样做的。`messages.groupChat.visibleReplies` 仍然是针对群组/渠道房间的更具体的覆盖设置。

这取代了以前强制模型在大多数潜伏模式轮次中回答 `NO_REPLY` 的旧模式。在仅工具模式下，不进行任何可见操作仅仅意味着不调用消息工具。

对于直接的群组请求，仍会发送正在输入指示器。当启用时，环境常驻房间事件保持严格和静默，除非代理调用消息工具。

要将未提及的常驻群组闲聊作为静默房间上下文而不是用户请求提交，请使用 [环境房间事件](/zh/channels/ambient-room-events)：

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

提及的消息、命令、中止请求和私信仍然是用户请求。

要恢复针对群组/渠道请求的旧版自动最终回复：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

保存文件后，网关会热重载 `messages` 配置。仅在部署中
禁用了文件监视或配置重载时才需要重启。

若要求每次源聊天的可见输出都必须通过消息工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜杠命令（Discord、Telegram 和其他支持原生命令的界面）会绕过 `visibleReplies: "message_tool"` 并且始终以可见方式回复，以便渠道原生命令 UI 能够获得预期的响应。这仅适用于经过验证的原生命令轮次；文本输入的 `/...` 命令和普通聊天轮次仍遵循配置的组默认设置。

## 上下文可见性和允许列表

组的安全性涉及两个不同的控制：

- **触发授权**：谁可以触发智能体（`groupPolicy`、`groups`、`groupAllowFrom`、特定于渠道的允许列表）。
- **上下文可见性**：哪些补充上下文会被注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常的聊天行为，并保持上下文基本按接收原样保留。这意味着允许列表主要决定谁可以触发操作，而不是针对每个引用或历史片段的通用编辑边界。

<AccordionGroup>
  <Accordion title="当前行为是特定于渠道的">
    - 部分渠道已在特定路径中对补充上下文应用了基于发送者的过滤（例如 Slack 线程植入、Matrix 回复/线程查找）。
    - 其他渠道仍按接收原样传递引用/回复/转发上下文。

  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"`（默认）保持当前的“按接收原样”行为。
    - `contextVisibility: "allowlist"` 将补充上下文过滤为仅包含在允许列表中的发送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个明确的引用/回复例外。

    在此加固模型在所有渠道中一致实施之前，不同界面间可能会存在差异。

  </Accordion>
</AccordionGroup>

![组消息流程](/images/groups-flow.svg)

如果您想要...

| 目标                              | 如何设置                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| 允许所有组但仅在 @mentions 时回复 | `groups: { "*": { requireMention: true } }`                 |
| 禁用所有组回复                    | `groupPolicy: "disabled"`                                   |
| 仅限特定群组                      | `groups: { "<group-id>": { ... } }` （无 `"*"` 键）         |
| 仅您可以在群组中触发              | `groupPolicy: "allowlist"`， `groupAllowFrom: ["+1555..."]` |
| 跨渠道重用同一个可信发件人集      | `groupAllowFrom: ["accessGroup:operators"]`                 |

有关可重用的发件人允许列表，请参阅 [Access groups](/zh/channels/access-groups)。

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题向群组 ID 添加 Telegram`:topic:<threadId>`，因此每个主题都有自己的会话。
- 直接聊天使用主会话（如果已配置，则使用每个发件人的会话）。
- 群组会话跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公开群组（单一代理）

是的——如果您的“个人”流量是 **私信** 而“公开”流量是 **群组**，这效果很好。

原因：在单代理模式下，私信通常落入 **主** 会话密钥（`agent:main:main`），而群组始终使用 **非主** 会话密钥（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"`Docker 启用沙箱隔离，这些群组会话将在配置的沙箱后端运行，而您的主私信会话保留在主机上。如果您不选择后端，Docker 是默认后端。

这为您提供了一个代理“大脑”（共享工作区 + 记忆），但有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具

<Note>如果您需要真正独立的工作区/角色（“个人”和“公开”绝不能混合），请使用第二个代理 + 绑定。请参阅 [Multi-Agent Routing](/zh/concepts/multi-agent)。</Note>

<Tabs>
  <Tab title="私信在主机上，群组沙箱隔离">
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
  <Tab title="群组仅看到允许列表文件夹">
    想要“群组只能看到文件夹 X”而不是“无主机访问权限”？保留 `workspaceAccess: "none"` 并且仅将允许列表路径挂载到沙箱中：

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

- 配置键和默认值：[Gateway(网关) 配置](<Gateway(网关)/en/gateway/config-agents#agentsdefaultssandbox>)
- 调试工具被阻止的原因：[沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详情：[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 保留给房间/渠道；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

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

| 策略          | 行为                                    |
| ------------- | --------------------------------------- |
| `"open"`      | 群组绕过允许列表；提及限制仍然适用。    |
| `"disabled"`  | 完全阻止所有群组消息。                  |
| `"allowlist"` | 仅允许与配置的允许列表匹配的群组/房间。 |

<AccordionGroup>
  <Accordion title="Per-渠道 notes">
    - `groupPolicy`WhatsAppTelegramSignaliMessageMicrosoft TeamsZalo 与提及控制（需要 @mentions）是分开的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（后备方案：显式的 `allowFrom`Signal）。
    - Signal：`groupAllowFrom`Signal 可以匹配入站 Signal 群组 ID 或发送者电话/UUID。
    - 私信配对批准（`*-allowFrom`Discord 存储条目）仅适用于私信访问；群组发送者授权保持对群组允许列表的显式指定。
    - Discord：允许列表使用 `channels.discord.guilds.<id>.channels`Slack。
    - Slack：允许列表使用 `channels.slack.channels`Matrix。
    - Matrix：允许列表使用 `channels.matrix.groups`。首选房间 ID 或别名；已加入房间的名称查找是尽力而为的，未解析的名称在运行时会被忽略。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持按房间的 `users` 允许列表。
    - 群组私信受单独控制（`channels.discord.dm.*`，`channels.slack.dm.*`Telegram）。
    - Telegram 允许列表可以匹配用户 ID（`"123456789"`，`"telegram:123456789"`，`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认值为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，群组消息将被阻止。
    - 运行时安全性：当提供商块完全缺失（`channels.<provider>` 不存在）时，群组策略将回退到故障关闭模式（通常是 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速心理模型（群组消息的评估顺序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist)。</Step>
  <Step title="Group allowlists">Group allowlists (`*.groups`, `*.groupAllowFrom`, 特定渠道 allowlist)。</Step>
  <Step title="Mention gating">Mention gating (`requireMention`, `/activation`)。</Step>
</Steps>

## Mention gating (default)

除非针对每个群组单独覆盖，否则群组消息需要提及。默认值位于每个子系统下的 `*.groups."*"` 中。

当渠道支持回复元数据时，回复机器人消息算作隐式提及。在暴露引用元数据的渠道上，引用机器人消息也可以算作隐式提及。当前内置的情况包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
  <Accordion title="提及过滤说明">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效的模式和不安全的嵌套重复形式将被忽略。
    - 提供明确提及的界面仍然会通过；模式仅作为后备。
    - 每个代理的覆盖设置：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个群组时很有用）。
    - 仅在可以进行提及检测（配置了原生提及或 `mentionPatterns`）时才会强制执行提及过滤。
    - 将群组或发送者加入允许列表不会禁用提及过滤；当所有消息都应触发响应时，请将该群组的 `requireMention` 设置为 `false`。
    - 自动群聊提示上下文每轮都会携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许自动静默回复的群组将干净的空回复或仅包含推理的模型轮次视为静默，等效于 `NO_REPLY`。直接聊天永远不会接收 `NO_REPLY` 指导，并且仅使用消息工具的群组回复通过不调用 `message(action=send)` 来保持静默。
    - 环境常驻群组闲聊默认使用用户请求语义。设置 `messages.groupChat.unmentionedInbound: "room_event"` 以将其作为静默上下文提交。有关设置示例，请参阅 [环境房间事件](/zh/channels/ambient-room-events)。
    - 房间事件不会存储为虚假用户请求，并且来自无消息工具房间事件的私人助手文本不会作为聊天历史重放。
    - Discord 的默认值位于 `channels.discord.guilds."*"` 中（可按服务器/渠道覆盖）。
    - 群组历史上下文在渠道间统一包装。启用提及过滤的群组保留待处理的跳过消息；当渠道支持时，常驻群组也可能保留最近已处理的房间消息。使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

  </Accordion>
</AccordionGroup>

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在**特定群组/房间/渠道内**可用的工具。

- `tools`：为整个群组允许/拒绝工具。
- `toolsBySender`：群组内基于发送者的覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。渠道 ID 使用规范的 OpenClaw 渠道 ID；诸如 `teams` 的别名会规范化为 `msteams`。旧的无前缀键仍被接受，并仅作为 `id:` 进行匹配。

解析顺序（最具体的优先）：

<Steps>
  <Step title="Group toolsBySender">群组/渠道 `toolsBySender` 匹配。</Step>
  <Step title="Group tools">群组/渠道 `tools`。</Step>
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

<Note>群组/渠道工具限制是在全局/代理工具策略之外应用的（拒绝仍然生效）。某些渠道对房间/渠道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将作为群组允许列表。使用 `"*"` 可以允许所有群组，同时仍然设置默认提及行为。

<Warning>常见误区：私信配对批准与群组授权不同。对于支持私信配对的渠道，配对存储仅解锁私信。群组命令仍需要来自配置允许列表（如 `groupAllowFrom`）的明确群组发送者授权，或该渠道记录的配置回退机制。</Warning>

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
  <Tab title="仅所有者触发 (WhatsApp)">
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

## 激活（仅所有者）

群组所有者可以切换每个群组的激活状态：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（如果未设置，则为机器人自己的 E.164 号码）。将命令作为独立消息发送。其他界面目前会忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及控制结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示在新群组会话的第一轮包含群组介绍。它提醒模型像人类一样回复，避免 Markdown 表格，尽量减少空行并遵循正常的聊天间距，并避免输入字面意义上的 `\n` 序列。渠道来源的群组名称和参与者标签呈现为围栏内的不受信任的元数据，而不是内联系统指令。

## iMessage 细节

- 在路由或添加到允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是返回到同一个 `chat_id`。

## WhatsApp 系统提示词

请参阅 [WhatsApp](/zh/channels/whatsapp#system-prompts) 了解标准的 WhatsApp 系统提示词规则，包括群组和直接提示词解析、通配符行为以及账户覆盖语义。

## WhatsApp 细节

请参阅 [群组消息](/zh/channels/group-messages) 了解仅限 WhatsApp 的行为（历史记录注入、提及处理详细信息）。

## 相关

- [广播群组](/zh/channels/broadcast-groups)
- [频道路由](/zh/channels/channel-routing)
- [群组消息](/zh/channels/group-messages)
- [配对](/zh/channels/pairing)
