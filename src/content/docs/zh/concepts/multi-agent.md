---
summary: "多智能体路由：隔离的智能体、渠道账户和绑定"
title: "多智能体路由"
sidebarTitle: "多智能体路由"
read_when: "您希望在一个 Gateway 进程中拥有多个隔离的智能体（工作区 + 身份验证）。"
status: active
---

在一个运行的 Gateway(网关) 中运行多个 _隔离的_ 智能体——每个智能体都有自己的工作区、状态目录（`agentDir`Gateway(网关)）和会话历史记录——以及多个渠道账户（例如两个 WhatsApp）。入站消息通过绑定路由到正确的智能体。

此处的 **智能体（agent）** 是完整的、针对特定人设的范围：工作区文件、身份验证配置文件、模型注册表和会话存储。`agentDir` 是磁盘上的状态目录，用于在 `~/.openclaw/agents/<agentId>/`SlackWhatsApp 保存此针对特定智能体的配置。**绑定（binding）** 将渠道账户（例如 Slack 工作区或 WhatsApp 号码）映射到这些智能体之一。

## 什么是“一个智能体”？

**智能体（agent）** 是一个具有完整范围的“大脑”，拥有自己的：

- **工作区（Workspace）**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、人设规则）。
- **状态目录（State directory）**（`agentDir`），用于存放身份验证配置文件、模型注册表和针对特定智能体的配置。
- **会话存储（Session store）**（聊天历史记录 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions` 下。

身份验证配置文件是 **针对特定智能体（per-agent）** 的。每个智能体从自己的以下位置读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
`sessions_history` 在此处也是更安全的跨会话召回路径：它返回有界限的、经过清理的视图，而不是原始的脚本转储。助手召回会去除思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`MiniMax 和截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角模型控制令牌，以及在编辑/截断之前的格式错误的 MiniMax 工具调用 XML。
</Note>

<Warning>切勿跨代理重用 `agentDir`OpenClawOAuthOAuth（这会导致身份验证/会话冲突）。当代理 没有本地配置文件时，它们可以读取默认/主代理的身份验证配置文件，但 OpenClaw 不会将 OAuth 刷新令牌克隆到 辅助代理存储中。如果您需要独立的 OAuth 账户，请从该代理登录； 如果您手动复制凭据，请仅复制可移植的静态 `api_key` 或 `token` 配置文件。</Warning>

Skills 会从每个代理的工作区以及 `~/.openclaw/skills` 等共享根目录加载，然后在配置时根据有效的代理 Skills 允许列表进行过滤。使用 `agents.defaults.skills` 作为共享基线，使用 `agents.list[].skills` 进行每个代理的替换。请参阅 [Skills: per-agent vs shared](/zh/tools/skills#per-agent-vs-shared-skills) 和 [Skills: agent skill allowlists](/zh/tools/skills#agent-skill-allowlists)。

Gateway 可以并排托管**一个代理**（默认）或**多个代理**。

<Note>**工作区说明：** 每个代理的工作区是**默认 cwd**，而不是硬沙箱。相对路径在工作区内解析，但除非启用了沙箱隔离，否则绝对路径可以到达其他主机位置。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。</Note>

## 路径（快速地图）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单代理模式（默认）

如果您不进行任何操作，OpenClaw 将运行单个代理：

- `agentId` 默认为 **`main`**。
- 会话的键为 `agent:main:<mainKey>`。
- 工作区默认为 `~/.openclaw/workspace`（或在设置了 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认为 `~/.openclaw/agents/main/agent`。

## 代理助手

使用代理向导添加一个新的隔离代理：

```bash
openclaw agents add work
```

然后添加 `bindings` （或者让向导来完成）以路由传入消息。

使用以下命令验证：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个代理工作区">
    使用向导或手动创建工作区：

    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每个代理都有自己的工作区，包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及位于 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>
  <Step title="创建渠道账号">
    在您偏好的渠道上为每个代理创建一个账号：

    - Discord：每个代理一个机器人，启用消息内容意图（Message Content Intent），复制每个令牌（token）。
    - Telegram：通过 BotFather 为每个代理创建一个机器人，复制每个令牌。
    - WhatsApp：为每个账号关联每个电话号码。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    请参阅渠道指南：[Discord](/zh/channels/discord)、[Telegram](/zh/channels/telegram)、[WhatsApp](/zh/channels/whatsapp)。

  </Step>
  <Step title="添加代理、账号和绑定">
    在 `agents.list` 下添加代理，在 `channels.<channel>.accounts` 下添加渠道账号，并使用 `bindings` 将它们连接起来（示例如下）。
  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多个代理 = 多个人物，多种个性

使用**多个代理**时，每个 `agentId` 都会变成一个**完全隔离的人物设定**：

- **不同的电话号码/账号**（针对每个渠道 `accountId`）。
- **不同的个性**（每个代理的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非明确启用，否则不会相互串扰）。

这允许**多个人**共享一个 Gateway(网关) 服务器，同时保持他们的 AI “大脑”和数据相互隔离。

## 跨代理 QMD 记忆搜索

如果一个代理应该搜索另一个代理的 QMD 会话记录，请在 `agents.list[].memorySearch.qmd.extraCollections` 下添加额外的集合。仅当每个代理都应继承相同的共享记录集合时，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // resolves inside workspace -> collection named "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

额外的集合路径可以在代理之间共享，但当路径位于代理工作区之外时，集合名称保持显式。工作区内的路径仍属于代理作用域，因此每个代理保留自己的记录搜索集。

## 一个 WhatsApp 号码，多个人（私信拆分）

您可以在保持**一个 WhatsApp 账户**的同时，将**不同的 WhatsApp 私信**路由到不同的代理。使用 `peer.kind: "direct"`WhatsApp 匹配发送者 E.164（例如 WhatsAppWhatsApp`+15551234567`）。回复仍来自同一个 WhatsApp 号码（没有每个代理的发送者身份）。

<Note>直接聊天会折叠为代理的**主会话密钥**，因此真正的隔离需要**每人一个代理**。</Note>

示例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

注意事项：

- 私信访问控制是**每个 WhatsApp 账户的全局设置**（配对/允许列表），而不是针对每个代理的。
- 对于共享群组，将群组绑定到一个代理或使用[广播群组](/zh/channels/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是**确定性**的，且**最具体者优先**：

<Steps>
  <Step title="peer match">精确的私信/群组/渠道 id。</Step>
  <Step title="parentPeer match">线程继承。</Step>
  <Step title="guildId + roles" Discord>
    Discord 角色路由。
  </Step>
  <Step title="guildId" Discord>
    Discord。
  </Step>
  <Step title="teamId" Slack>
    Slack。
  </Step>
  <Step title="accountId match for a 渠道">每个账户的后备选项。</Step>
  <Step title="渠道级匹配">`accountId: "*"`。</Step>
  <Step title="默认代理">回退到 `agents.list[].default`，否则回退到列表中的第一个条目，默认值：`main`。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="决胜局与 AND 语义">
    - 如果在同一层级有多个绑定匹配，则配置顺序中靠前的那个获胜。
    - 如果一个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则所有指定的字段都是必需的（`AND` 语义）。

  </Accordion>
  <Accordion title="账号范围详情">
    - 省略 `accountId` 的绑定仅匹配默认账号。
    - 使用 `accountId: "*"`OpenClaw 作为跨所有账号的渠道范围回退。
    - 如果您稍后为同一个代理添加了带有显式账号 ID 的相同绑定，OpenClaw 会将现有的仅渠道绑定升级为账号范围绑定，而不是复制它。

  </Accordion>
</AccordionGroup>

## 多个账号 / 电话号码

支持 **多个账号** 的渠道（如 WhatsApp）使用 WhatsApp`accountId` 来标识每个登录。每个 `accountId` 可以路由到不同的代理，因此一台服务器可以承载多个电话号码而不会混淆会话。

如果希望在省略 `accountId` 时拥有渠道范围的默认账号，请设置 `channels.<channel>.defaultAccount`OpenClaw（可选）。如果未设置，OpenClaw 将回退到 `default`（如果存在），否则回退到第一个配置的账号 ID（已排序）。

支持此模式的常见渠道包括：

- `whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`
- `irc`、`line`、`googlechat`、`mattermost`、`matrix`、`nextcloud-talk`
- `zalo`、`zalouser`、`nostr`、`feishu`

## 概念

- `agentId`：一个“大脑”（工作区、每代理身份认证、每代理会话存储）。
- `accountId`WhatsApp：一个渠道账户实例（例如 WhatsApp 账户 `"personal"` 对比 `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 以及可选的公会/团队 ID 将传入消息路由到 `agentId`。
- 直接聊天会折叠到 `agent:<agentId>:<mainKey>`（每代理的“主”会话；`session.mainKey`）。

## 平台示例

<AccordionGroup>
  <Accordion title="Discord每个代理的 Discord 机器人"Discord>
    每个 Discord 机器人账户映射到一个唯一的 `accountId`。将每个账户绑定到一个代理，并保持每个机器人的允许列表。

    ```json5
    {
      agents: {
        list: [
          { id: "main", workspace: "~/.openclaw/workspace-main" },
          { id: "coding", workspace: "~/.openclaw/workspace-coding" },
        ],
      },
      bindings: [
        { agentId: "main", match: { channel: "discord", accountId: "default" } },
        { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
      ],
      channels: {
        discord: {
          groupPolicy: "allowlist",
          accounts: {
            default: {
              token: "DISCORD_BOT_TOKEN_MAIN",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "222222222222222222": { allow: true, requireMention: false },
                  },
                },
              },
            },
            coding: {
              token: "DISCORD_BOT_TOKEN_CODING",
              guilds: {
                "123456789012345678": {
                  channels: {
                    "333333333333333333": { allow: true, requireMention: false },
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    - 邀请每个机器人加入公会并启用消息内容意图。
    - 令牌位于 `channels.discord.accounts.<id>.token` 中（默认账户可以使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="Telegram每个代理的 Telegram 机器人">
    ```json5
    {
      agents: {
        list: [
          { id: "main", workspace: "~/.openclaw/workspace-main" },
          { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
        ],
      },
      bindings: [
        { agentId: "main", match: { channel: "telegram", accountId: "default" } },
        { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
      ],
      channels: {
        telegram: {
          accounts: {
            default: {
              botToken: "123456:ABC...",
              dmPolicy: "pairing",
            },
            alerts: {
              botToken: "987654:XYZ...",
              dmPolicy: "allowlist",
              allowFrom: ["tg:123456789"],
            },
          },
        },
      },
    }
    ```

    - 使用 BotFather 为每个代理创建一个机器人并复制每个令牌。
    - 令牌位于 `channels.telegram.accounts.<id>.botToken` 中（默认账户可以使用 `TELEGRAM_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="WhatsApp每个代理的 WhatsApp 号码">
    在启动网关之前链接每个账户：

    ```bash
    openclaw channels login --channel whatsapp --account personal
    openclaw channels login --channel whatsapp --account biz
    ```

    `~/.openclaw/openclaw.json` (JSON5):

    ```js
    {
      agents: {
        list: [
          {
            id: "home",
            default: true,
            name: "Home",
            workspace: "~/.openclaw/workspace-home",
            agentDir: "~/.openclaw/agents/home/agent",
          },
          {
            id: "work",
            name: "Work",
            workspace: "~/.openclaw/workspace-work",
            agentDir: "~/.openclaw/agents/work/agent",
          },
        ],
      },

      // Deterministic routing: first match wins (most-specific first).
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

        // Optional per-peer override (example: send a specific group to work agent).
        {
          agentId: "work",
          match: {
            channel: "whatsapp",
            accountId: "personal",
            peer: { kind: "group", id: "1203630...@g.us" },
          },
        },
      ],

      // Off by default: agent-to-agent messaging must be explicitly enabled + allowlisted.
      tools: {
        agentToAgent: {
          enabled: false,
          allow: ["home", "work"],
        },
      },

      channels: {
        whatsapp: {
          accounts: {
            personal: {
              // Optional override. Default: ~/.openclaw/credentials/whatsapp/personal
              // authDir: "~/.openclaw/credentials/whatsapp/personal",
            },
            biz: {
              // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
              // authDir: "~/.openclaw/credentials/whatsapp/biz",
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 常见模式

<Tabs>
  <Tab title="WhatsAppTelegramWhatsApp 日常 + Telegram 深度工作"WhatsAppTelegram>
    按渠道拆分：将 WhatsApp 路由到一个快速的日常代理，将 Telegram 路由到一个 Opus 代理。

    ```json5
    {
      agents: {
        list: [
          {
            id: "chat",
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          {
            id: "opus",
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        ],
      },
      bindings: [
        { agentId: "chat", match: { channel: "whatsapp" } },
        { agentId: "opus", match: { channel: "telegram" } },
      ],
    }
    ```

    注意事项：

    - 如果您在一个渠道下有多个账户，请在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
    - 要在将其他对话保留在 chat 上的同时，将单个私信/组路由到 Opus，请为该对等方添加 `match.peer` 绑定；对等方匹配始终优先于全渠道规则。

  </Tab>
  <Tab title="同一渠道，单个对等方使用 Opus"WhatsApp>
    将 WhatsApp 保留在快速代理上，但将一个私信路由到 Opus：

    ```json5
    {
      agents: {
        list: [
          {
            id: "chat",
            name: "Everyday",
            workspace: "~/.openclaw/workspace-chat",
            model: "anthropic/claude-sonnet-4-6",
          },
          {
            id: "opus",
            name: "Deep Work",
            workspace: "~/.openclaw/workspace-opus",
            model: "anthropic/claude-opus-4-6",
          },
        ],
      },
      bindings: [
        {
          agentId: "opus",
          match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
        },
        { agentId: "chat", match: { channel: "whatsapp" } },
      ],
    }
    ```

    对等方绑定始终优先，因此请将它们置于全渠道规则之上。

  </Tab>
  <Tab title="WhatsApp绑定到 WhatsApp 群组的家庭代理"WhatsApp>
    将一个专用的家庭代理绑定到单个 WhatsApp 群组，并配置提及门控和更严格的工具策略：

    ```json5
    {
      agents: {
        list: [
          {
            id: "family",
            name: "Family",
            workspace: "~/.openclaw/workspace-family",
            identity: { name: "Family Bot" },
            groupChat: {
              mentionPatterns: ["@family", "@familybot", "@Family Bot"],
            },
            sandbox: {
              mode: "all",
              scope: "agent",
            },
            tools: {
              allow: [
                "exec",
                "read",
                "sessions_list",
                "sessions_history",
                "sessions_send",
                "sessions_spawn",
                "session_status",
              ],
              deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
            },
          },
        ],
      },
      bindings: [
        {
          agentId: "family",
          match: {
            channel: "whatsapp",
            peer: { kind: "group", id: "120363999999999999@g.us" },
          },
        },
      ],
    }
    ```

    注意事项：

    - 工具允许/拒绝列表是 **tools**（工具），而不是 skills（技能）。如果技能需要运行二进制文件，请确保允许 `exec` 并且该二进制文件存在于沙箱中。
    - 若要实施更严格的门控，请设置 `agents.list[].groupChat.mentionPatterns` 并为该渠道启用群组允许列表。

  </Tab>
</Tabs>

## 按代理配置的沙箱和工具

每个代理都可以拥有自己的沙箱和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // No sandbox for personal agent
        },
        // No tool restrictions - all tools available
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // Always sandboxed
          scope: "agent",  // One container per agent
          docker: {
            // Optional one-time setup after container creation
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // Only read tool
          deny: ["exec", "write", "edit", "apply_patch"],    // Deny others
        },
      },
    ],
  },
}
```

<Note>`setupCommand` 位于 `sandbox.docker` 之下，并在容器创建时运行一次。当解析范围为 `"shared"` 时，将忽略每个代理的 `sandbox.docker.*` 覆盖设置。</Note>

**优势：**

- **安全隔离**：限制不受信任代理的工具。
- **资源控制**：将特定代理置于沙箱中，同时将其他代理保留在宿主机上。
- **灵活策略**：每个代理拥有不同的权限。

<Note>`tools.elevated` 是**全局的**且基于发送者的；无法按代理进行配置。如果您需要按代理的边界，请使用 `agents.list[].tools` 来拒绝 `exec`。对于群组定位，请使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 能够清晰地映射到目标代理。</Note>

有关详细示例，请参阅 [Multi-agent sandbox and tools](/zh/tools/multi-agent-sandbox-tools)。

## 相关内容

- [ACP agents](/zh/tools/acp-agents) — 运行外部编码工具
- [Channel routing](/zh/channels/channel-routing) — 消息如何路由到代理
- [Presence](/zh/concepts/presence) — 代理的状态和可用性
- [Session](/zh/concepts/session) — 会话隔离和路由
- [Sub-agents](/zh/tools/subagents) — 生成后台代理运行
