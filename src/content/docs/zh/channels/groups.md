---
summary: "各平台上的群聊行为（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在各平台上对群聊的处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 初学者介绍 (2 分钟)

OpenClaw“寄宿”在您自己的消息帐户上。没有单独的 WhatsApp 机器人用户。如果 **您** 在群组中，OpenClaw 就可以看到该群组并在那里回复。

默认行为：

- 群组受到限制 (`groupPolicy: "allowlist"`)。
- 回复需要提及 (@mention)，除非您明确禁用提及门控。

换句话说：在白名单上的发送者可以通过提及 OpenClaw 来触发它。

<Note>
**TL;DR**

- **私信 访问权限** 由 `*.allowFrom` 控制。
- **群组访问权限** 由 `*.groupPolicy` + 允许列表 (`*.groups`, `*.groupAllowFrom`) 控制。
- **回复触发** 由提及门控 (`requireMention`, `/activation`) 控制。
  </Note>

快速流程（群组消息会发生什么）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## 上下文可见性和允许列表

群组安全涉及两种不同的控制：

- **触发授权**：谁可以触发代理 (`groupPolicy`, `groups`, `groupAllowFrom`, 特定于渠道的允许列表)。
- **上下文可见性**：将哪些补充上下文注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常的聊天行为，并基本保持接收到的上下文不变。这意味着允许列表主要决定谁可以触发操作，而不是作为每个引用或历史片段的通用编辑边界。

<AccordionGroup>
  <Accordion title="当前行为特定于渠道">
    - 某些渠道已经在特定路径中应用了基于发送者的补充上下文过滤（例如 Slack 话题种子生成，Matrix 回复/话题查找）。
    - 其他渠道仍然按接收原样传递引用/回复/转发上下文。
  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"`（默认）保持当前的按接收行为。
    - `contextVisibility: "allowlist"` 将补充上下文过滤为仅限允许列表中的发送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个显式的引用/回复例外。

    在此加固模型在所有渠道中一致实施之前，预期各界面会有差异。

  </Accordion>
</AccordionGroup>

![群组消息流程](/images/groups-flow.svg)

如果您想要...

| 目标                                | 设置内容                                                   |
| ----------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但仅在 @mentions 时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                    | `groupPolicy: "disabled"`                                  |
| 仅限特定群组                        | `groups: { "<group-id>": { ... } }`（无 `"*"` 键）         |
| 仅您可以在群组中触发                | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会将 `:topic:<threadId>` 添加到群组 ID，因此每个主题都有自己的会话。
- 直接聊天使用主会话（如果已配置，则使用按发送者划分的会话）。
- 群组会话将跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私信 + 公共群组（单一代理）

是的——如果您的“个人”流量是**私信**而“公共”流量是**群组**，这非常适用。

原因：在单代理模式下，私信通常落在**主**会话密钥（`agent:main:main`）中，而群组始终使用**非主**会话密钥（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 启用沙箱隔离，这些群组会话将在配置的沙箱后端中运行，而您的主私信会话则保持在主机上。如果您不选择后端，Docker 是默认后端。

这为您提供了一个代理“大脑”（共享工作区 + 内存），但有两种执行姿态：

- **私信**：完整工具（主机）
- **群组**：沙箱 + 受限工具

<Note>如果您需要真正独立的工作区/人设（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。请参阅 [多代理路由](/zh/concepts/multi-agent)。</Note>

<Tabs>
  <Tab title="主机上的私信，沙箱隔离的群组">
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
  <Tab title="群组仅能看到允许列表中的文件夹">
    想要“群组只能看到文件夹 X”而不是“无法访问主机”？保留 `workspaceAccess: "none"` 并仅将允许列表中的路径挂载到沙箱中：

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
- `#room` 是为房间/渠道保留的；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 群组策略

控制如何按渠道处理群组/房间消息：

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

| 策略          | 行为                                |
| ------------- | ----------------------------------- |
| `"open"`      | 群组绕过白名单；提及限制仍然适用。  |
| `"disabled"`  | 完全阻止所有群组消息。              |
| `"allowlist"` | 仅允许匹配已配置白名单的群组/房间。 |

<AccordionGroup>
  <Accordion title="Per-渠道 notes">
    - `groupPolicy` 与提及限制（需要 @mentions）是分开的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（后备：显式 `allowFrom`）。
    - 私信配对批准（`*-allowFrom` 存储条目）仅适用于私信访问；群组发送者授权保持为群组白名单的显式授权。
    - Discord：白名单使用 `channels.discord.guilds.<id>.channels`。
    - Slack：白名单使用 `channels.slack.channels`。
    - Matrix：白名单使用 `channels.matrix.groups`。首选房间 ID 或别名；已加入房间的名称查找是尽力而为的，未解析的名称在运行时会被忽略。使用 `channels.matrix.groupAllowFrom` 限制发送者；每个房间的 `users` 白名单也受支持。
    - 群组私信是单独控制的（`channels.discord.dm.*`，`channels.slack.dm.*`）。
    - Telegram 白名单可以匹配用户 ID（`"123456789"`，`"telegram:123456789"`，`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认为 `groupPolicy: "allowlist"`；如果您的群组白名单为空，群组消息将被阻止。
    - 运行时安全：当提供商块完全丢失时（缺少 `channels.<provider>`），群组策略将回退到故障关闭模式（通常为 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。
  </Accordion>
</AccordionGroup>

快速心智模型（群组消息的评估顺序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy`（开放/禁用/允许列表）。</Step>
  <Step title="Group allowlists">群组允许列表（`*.groups`、`*.groupAllowFrom`、特定渠道的允许列表）。</Step>
  <Step title="Mention gating">提及控制（`requireMention`、`/activation`）。</Step>
</Steps>

## 提及控制（默认）

群组消息需要提及，除非针对特定群组进行了覆盖。默认值位于每个子系统下的 `*.groups."*"` 中。

当渠道支持回复元数据时，回复机器人消息算作隐式提及。在提供引用元数据的渠道上，引用机器人消息也可以算作隐式提及。当前内置案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
  <Accordion title="Mention gating notes">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效的模式和不安全的嵌套重复形式将被忽略。
    - 提供显式提及的表面仍然通过；模式是后备方案。
    - 每个代理覆盖：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个群组时很有用）。
    - 仅当提及检测可行时才强制执行提及控制（配置了原生提及或 `mentionPatterns`）。
    - 允许静默回复的群组将干净的空回复或仅推理的模型轮次视为静默，等效于 `NO_REPLY`。直接聊天仍将空回复视为失败的代理轮次。
    - Discord 默认值位于 `channels.discord.guilds."*"` 中（可按 guild/渠道 覆盖）。
    - 群组历史上下文在渠道间统一包装，并且是 **仅限待处理**（因提及控制而跳过的消息）；使用 `messages.groupChat.historyLimit` 作为全局默认值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）进行覆盖。设置 `0` 以禁用。
  </Accordion>
</AccordionGroup>

## 群组/渠道工具限制（可选）

某些渠道配置支持限制特定群组/房间/渠道内可用的工具。

- `tools`：允许/拒绝整个群组的工具。
- `toolsBySender`：群组内基于发送者的覆盖配置。使用显式键前缀：`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。旧的无前缀键仍被接受，并仅匹配为 `id:`。

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

<Note>群组/渠道工具限制是在全局/代理工具策略之外应用的（拒绝仍然优先）。某些渠道对房间/渠道使用不同的嵌套结构（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键将作为群组允许列表。使用 `"*"` 允许所有群组，同时仍设置默认提及行为。

<Warning>常见误区：私信配对批准与群组授权不同。对于支持私信配对的渠道，配对存储仅解锁私信。群组命令仍然需要来自配置允许列表（如 `groupAllowFrom`）的明确群组发送者授权，或该渠道记录的配置回退。</Warning>

常见意图（复制/粘贴）：

<Tabs>
  <Tab title="禁用所有群组回复">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="仅允许特定群组（WhatsApp）">
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
  <Tab title="仅所有者触发（WhatsApp）">
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

所有者由 `channels.whatsapp.allowFrom` 确定（如果未设置，则为机器人自己的 E.164 号码）。将命令作为独立消息发送。其他渠道目前忽略 `/activation`。

## 上下文字段

群组入站负载设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及限制结果）
- Telegram 论坛主题还包括 `MessageThreadId` 和 `IsForum`。

特定渠道说明：

- BlueBubbles 可以在填充 `GroupMembers` 之前，选择性地从本地联系人数据库中丰富未命名的 macOS 群组参与者。默认情况下此功能处于关闭状态，且仅在常规群组筛选通过后运行。

智能体系统提示在新群组会话的第一轮包含群组介绍。它提醒模型像人类一样回复，避免 Markdown 表格，尽量减少空行并遵循正常的聊天间距，并避免输入字面的 `\n` 序列。源自渠道的群组名称和参与者标签呈现为封闭的不受信任元数据，而不是内联系统指令。

## iMessage 特定细节

- 路由或添加到允许列表时，首选 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复总是返回到同一个 `chat_id`。

## WhatsApp 系统提示词

有关规范的 WhatsApp 系统提示词规则，包括群组和直接提示词解析、通配符行为和帐户覆盖语义，请参阅 [WhatsApp](/zh/channels/whatsapp#system-prompts)。

## WhatsApp 特定细节

有关 WhatsApp 独有的行为（历史记录注入、提及处理详细信息），请参阅 [Group messages](/zh/channels/group-messages)。

## 相关

- [广播群组](/zh/channels/broadcast-groups)
- [频道路由](/zh/channels/channel-routing)
- [群组消息](/zh/channels/group-messages)
- [配对](/zh/channels/pairing)
