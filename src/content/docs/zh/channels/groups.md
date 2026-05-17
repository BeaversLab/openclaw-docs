---
summary: "各平台（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）上的群聊行为"
read_when:
  - Changing group chat behavior or mention gating
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在各平台上对群聊的处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 初学者介绍 (2 分钟)

OpenClaw“寄宿”在您自己的消息帐户上。没有单独的 WhatsApp 机器人用户。如果 **您** 在群组中，OpenClaw 就可以看到该群组并在那里回复。

默认行为：

- 群组受到限制（`groupPolicy: "allowlist"`）。
- 回复需要提及 (@mention)，除非您明确禁用提及门控。
- 群组/渠道中的普通最终回复默认为私密。可见的房间输出使用 `message` 工具。

说明：允许列表中的发送者可以通过提及来触发 OpenClaw。

<Note>
**TL;DR**

- **私信访问** 由 `*.allowFrom` 控制。
- **群组访问** 由 `*.groupPolicy` + 允许列表（`*.groups`，`*.groupAllowFrom`）控制。
- **回复触发** 由提及控制（`requireMention`，`/activation`）控制。

</Note>

快速流程（群组消息的处理过程）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## 可见回复

对于群组/渠道房间，OpenClaw 默认为 `messages.groupChat.visibleReplies: "message_tool"`。
`openclaw doctor --fix` 会将此默认值写入未指定该配置的已配置渠道中。
这意味着代理仍然处理这一轮并可以更新内存/会话状态，但其正常的最终回复不会自动发布回房间。为了进行可见发言，代理使用 `message(action=send)`。

此默认设置取决于可靠调用工具的模型/运行时。如果日志显示
助手文本但显示 `didSendViaMessagingTool: false`，则模型是
私密回答的，而不是调用了消息工具。这不是
Discord/Slack/Telegram 的发送失败。请使用可靠调用工具的模型用于
群组/渠道会话，或者设置
`messages.groupChat.visibleReplies: "automatic"` 以恢复传统的可见
最终回复。

如果消息工具在当前工具策略下不可用，OpenClaw 将回退到自动可见回复，而不是静默抑制响应。OpenClaw`openclaw doctor` 会针对这种不匹配发出警告。

对于直接聊天和任何其他源轮次，使用 `messages.visibleReplies: "message_tool"` 可以全局应用相同的“仅工具”可见回复行为。连接器也可以选择将其作为未设置时的默认值；Codex 连接器对 Codex 模式的直接聊天就是这样做的。对于群组/渠道房间，`messages.groupChat.visibleReplies` 仍然是更具体的覆盖设置。

这取代了旧的模式，即强制模型针对大多数潜伏模式轮次回答 `NO_REPLY`。在“仅工具”模式下，不做任何可见操作仅仅意味着不调用消息工具。

当代理在“仅工具”模式下工作时，仍然会发送正在输入指示器。对于这些轮次，默认的群组输入模式从“message”升级为“instant”，因为在代理决定是否调用消息工具之前，可能永远不会出现正常的助手消息文本。显式的输入模式配置仍然优先。

要为群组/渠道房间恢复旧的自动最终回复：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

网关会在文件保存后热重载 `messages` 配置。只有在部署中禁用了文件监视或配置重载时才需要重启。

若要求每个源聊天的可见输出都必须通过消息工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜杠命令（Discord、Telegram 和其他具有原生命令支持的界面）会绕过 DiscordTelegram`visibleReplies: "message_tool"` 并始终进行可见回复，以便渠道原生命令 UI 获得其预期的响应。这仅适用于经过验证的原生命令轮次；文本输入的 `/...` 命令和普通聊天轮次仍然遵循配置的群组默认值。

## 上下文可见性和允许列表

群组安全涉及两个不同的控制：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、特定于渠道的允许列表）。
- **上下文可见性**：将哪些补充上下文注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常的聊天行为，并基本按原样保留上下文。这意味着允许列表主要决定谁可以触发操作，而不是为每条引用或历史片段设置通用的编辑边界。

<AccordionGroup>
  <Accordion title="当前行为因渠道而异"SlackMatrix>
    - 某些渠道已在特定路径中基于发件人过滤补充上下文（例如 Slack 线程种子、Matrix 回复/线程查找）。
    - 其他渠道仍按原样传递引用/回复/转发上下文。

  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"`（默认）保持当前按原样接收的行为。
    - `contextVisibility: "allowlist"` 将补充上下文过滤为仅包含允许列表中的发件人。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个明确的引用/回复例外。

    在此加固模型在所有渠道中一致实施之前，预期不同表面会有差异。

  </Accordion>
</AccordionGroup>

![Group message flow](/images/groups-flow.svg)

如果您想要...

| 目标                            | 设置内容                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但仅在 @提及 时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                | `groupPolicy: "disabled"`                                  |
| 仅特定群组                      | `groups: { "<group-id>": { ... } }`（无 `"*"` 键）         |
| 仅您可以在群组中触发            | `groupPolicy: "allowlist"`、`groupAllowFrom: ["+1555..."]` |
| 跨渠道复用同一组受信任的发件人  | `groupAllowFrom: ["accessGroup:operators"]`                |

对于可重用的发送者允许列表，请参阅[访问组](/zh/channels/access-groups)。

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/渠道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题向群组 ID 添加 Telegram`:topic:<threadId>`，以便每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置，则使用每个发件人的会话）。
- 群组会话跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公开群组（单个代理）

是的——如果您的“个人”流量是**私信**，而“公共”流量是**群组**，这种模式效果很好。

原因：在单代理模式下，私信通常进入**主**会话密钥 (`agent:main:main`)，而群组始终使用**非主**会话密钥 (`agent:main:<channel>:group:<id>`)。如果您通过 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在配置的沙箱后端运行，而您的主私信会话将保留在主机上。如果您不选择后端，Docker 是默认后端。

这为您提供了一个代理“大脑”（共享工作区 + 记忆），但有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具

<Note>如果您需要真正独立的工作区/角色（“个人”和“公开”绝不能混合），请使用第二个代理 + 绑定。请参阅[多代理路由](/zh/concepts/multi-agent)。</Note>

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
    想要“群组只能看到文件夹 X”而不是“无主机访问权限”？保持 `workspaceAccess: "none"` 并仅将允许列表中的路径挂载到沙箱中：

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

- 配置键和默认值：[Gateway(网关)配置](/zh/gateway/config-agents#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙箱与工具策略与提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
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

| 策略          | 行为                                     |
| ------------- | ---------------------------------------- |
| `"open"`      | 群组绕过允许列表；提及 gating 仍然适用。 |
| `"disabled"`  | 完全阻止所有群组消息。                   |
| `"allowlist"` | 仅允许符合配置的允许列表的群组/聊天室。  |

<AccordionGroup>
  <Accordion title="Per-渠道 notes">
    - `groupPolicy` 与提及控制（mention-gating，需要 @mentions）是分开的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（后备：显式的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配入站的 Signal 群组 ID 或发送者的电话/UUID。
    - 私信（私信）配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权保持对群组允许列表的显式设置。
    - Discord：允许列表使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允许列表使用 `channels.slack.channels`。
    - Matrix：允许列表使用 `channels.matrix.groups`。首选房间 ID 或别名；已加入房间的名称查找是尽力而为的，运行时会忽略无法解析的名称。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每个房间的 `users` 允许列表。
    - 群组私信（Group 私信）单独控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
    - Telegram 允许列表可以匹配用户 ID（`"123456789"`，`"telegram:123456789"`，`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认值为 `groupPolicy: "allowlist"`；如果您的群组允许列表为空，则阻止群组消息。
    - 运行时安全性：当提供商块完全缺失（`channels.<provider>` 缺失）时，群组策略将回退到故障关闭模式（通常是 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速思维模型（群组消息的评估顺序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (开放/禁用/允许列表)。</Step>
  <Step title="Group allowlists">群组允许列表 (`*.groups`, `*.groupAllowFrom`, 特定于渠道的允许列表)。</Step>
  <Step title="Mention gating">提及控制 (`requireMention`, `/activation`)。</Step>
</Steps>

## 提及控制（默认）

除非针对每个群组进行了覆盖，否则群组消息需要提及。默认值位于每个子系统下的 `*.groups."*"` 中。

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

<AccordionGroup>
  <Accordion title="提及 gating 注意事项">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效的模式和不安全的嵌套重复形式将被忽略。
    - 提供明确提及的界面仍然通过；模式作为后备。
    - 每个代理覆盖：`agents.list[].groupChat.mentionPatterns` （当多个代理共享一个组时很有用）。
    - 仅在可以检测到提及时（配置了原生提及或 `mentionPatterns`）才会强制执行提及 gating。
    - 将组或发送者列入允许列表不会禁用提及 gating；当所有消息都应触发时，将该组的 `requireMention` 设置为 `false`。
    - 组聊天提示上下文每一轮都携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许静默回复的组将干净的空回复或仅包含推理的  轮次视为静默，等同于 `NO_REPLY`。直接聊天仅在明确允许直接静默回复时才执行相同操作；否则空回复仍将是失败的代理轮次。
    - Discord 默认值位于 `channels.discord.guilds."*"` （可按 guild/渠道 覆盖）。
    - 组历史上下文在渠道间统一包装。提及 gating 的组保留待处理的跳过消息；始终开启的组在渠道支持时也可能保留最近已处理的房间消息。使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit` （或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。

  </Accordion>
</AccordionGroup>

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在 **特定群组/房间/渠道内** 可用的工具。

- `tools`：允许/拒绝整个群组的工具。
- `toolsBySender`：组内每个发送者的覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。渠道 ID 使用规范的 OpenClaw 渠道 ID；例如 `teams` 等别名会规范化为 `msteams`。仍然接受旧的无前缀键，并仅作为 `id:` 进行匹配。

解析顺序（最具体者生效）：

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

<Note>组/渠道工具限制除全局/代理工具策略外应用（拒绝仍然优先）。某些渠道对房间/渠道使用不同的嵌套结构（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群组允许列表

当配置 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将作为组允许列表。使用 `"*"` 以允许所有组，同时仍然设置默认提及行为。

<Warning>常见误区：私信 配对批准与组授权不同。对于支持 私信 配对的渠道，配对存储仅解锁 私信。组命令仍然需要来自配置允许列表（例如 `groupAllowFrom`）的显式组发送者授权，或该渠道记录的配置回退。</Warning>

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

所有者由 `channels.whatsapp.allowFrom` 确定（若未设置，则为机器人自身的 E.164 号码）。请将该命令作为独立消息发送。其他平台目前会忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及过滤结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

代理系统提示词在新的群组会话的第一轮包含群组简介。它提醒模型像人类一样回复，避免使用 Markdown 表格，尽量减少空行并遵循正常的聊天间距，避免输入字面上的 `\n` 序列。源自频道的群组名称和参与者标签呈现为围栏不受信任的元数据，而不是内联系统指令。

## iMessage 细节

- 在路由或添加到允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是发回同一个 `chat_id`。

## WhatsApp 系统提示词

有关规范的 WhatsApp 系统提示词规则（包括群组和直接提示词解析、通配符行为和帐号覆盖语义），请参阅 [WhatsApp](/zh/channels/whatsapp#system-prompts)。

## WhatsApp 特有功能

有关仅限 WhatsApp 的行为（历史记录注入、提及处理详细信息），请参阅 [群组消息](/zh/channels/group-messages)。

## 相关

- [广播群组](/zh/channels/broadcast-groups)
- [频道路由](/zh/channels/channel-routing)
- [群组消息](/zh/channels/group-messages)
- [配对](/zh/channels/pairing)
