---
summary: "多代理路由：隔离的代理、渠道账户和绑定"
title: 多智能体路由
read_when: "您需要在一个Gateway进程拥有多个隔离的代理（工作区 + 认证）。"
status: 活跃
---

# 多智能体路由

目标：在一个运行的 Gateway(网关) 中拥有多个 _隔离的_ 代理（独立的工作区 + `agentDir` + 会话），以及多个渠道账户（例如两个 WhatsApp）。入站流量通过绑定路由到代理。

## 什么是“一个代理”？

一个 **智能体** 是一个具有完全作用域的大脑，拥有其自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、角色规则）。
- **状态目录** (`agentDir`) 用于存储认证配置文件、模型注册表和特定代理的配置。
- **会话存储**（聊天历史 + 路由状态）位于 `~/.openclaw/agents/<agentId>/sessions` 下。

身份认证配置文件是 **按智能体分配的**。每个智能体从其自己的配置读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

`sessions_history` 在此处也是更安全的跨会话召回路径：它返回
一个有界的、经过净化的视图，而不是原始的记录转储。助手召回会剥离
思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML
负载（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 和被截断的工具调用块）、
降级的工具调用脚手架、泄漏的 ASCII/全角模型控制
令牌，以及在编辑/截断之前格式错误的 MiniMax 工具调用 XML。

主代理凭据**不会**自动共享。切勿跨代理重用 `agentDir`
（这会导致身份验证/会话冲突）。如果您想共享凭据，
请将 `auth-profiles.json` 复制到另一个代理的 `agentDir` 中。

Skills 从每个代理的工作区以及共享根目录（如
`~/.openclaw/skills`）加载，然后在配置时按有效的代理 Skills 允许列表进行过滤。
使用 `agents.defaults.skills` 作为共享基线，
使用 `agents.list[].skills` 进行按代理替换。请参阅
[Skills: per-agent vs shared](/zh/tools/skills#per-agent-vs-shared-skills) 和
[Skills: agent skill allowlists](/zh/tools/skills#agent-skill-allowlists)。

Gateway(网关) 可以托管**一个代理**（默认）或**多个代理**并存。

**工作区说明：** 每个代理的工作区是**默认 cwd**，而不是硬性
沙箱。相对路径在工作区内部解析，但绝对路径可以
到达其他主机位置，除非启用了沙箱隔离。请参阅
[沙箱隔离](/zh/gateway/sandboxing)。

## 路径（快速映射）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单代理模式（默认）

如果您不进行任何操作，OpenClaw 将运行单个代理：

- `agentId` 默认为 **`main`**。
- 会话以 `agent:main:<mainKey>` 为键。
- 工作区默认为 `~/.openclaw/workspace`（或在设置了 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认为 `~/.openclaw/agents/main/agent`。

## Agent helper

使用 agent 向导添加一个新的隔离代理：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导来完成）以路由传入消息。

验证使用：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="Create each agent workspace">

使用向导或手动创建工作区：

```bash
openclaw agents add coding
openclaw agents add social
```

每个代理都有自己的工作区，包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及位于 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>

  <Step title="Create 渠道 accounts">

在您首选的渠道上为每个代理创建一个账户：

- Discord：每个代理一个机器人，启用 Message Content Intent，复制每个令牌。
- Telegram：通过 BotFather 为每个代理创建一个机器人，复制每个令牌。
- WhatsApp：将每个电话号码链接到每个账户。

```bash
openclaw channels login --channel whatsapp --account work
```

请参阅渠道指南：[Discord](/zh/channels/discord)、[Telegram](/zh/channels/telegram)、[WhatsApp](/zh/channels/whatsapp)。

  </Step>

  <Step title="Add agents, accounts, and bindings">

在 `agents.list` 下添加代理，在 `channels.<channel>.accounts` 下添加渠道账户，并用 `bindings` 将它们连接起来（示例见下）。

  </Step>

  <Step title="Restart and verify">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## Multiple agents = multiple people, multiple personalities

使用**多个代理**，每个 `agentId` 都将成为一个**完全隔离的角色**：

- **不同的电话号码/账户**（针对每个渠道 `accountId`）。
- **不同的个性**（每个代理的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的身份验证 + 会话**（除非明确启用，否则不会相互串扰）。

这让**多人**可以共享一个 Gateway(网关) 服务器，同时保持其 AI “大脑”和数据相互隔离。

## 跨代理 QMD 记忆搜索

如果一个代理应该搜索另一个代理的 QMD 会话记录，请在
`agents.list[].memorySearch.qmd.extraCollections` 下添加额外的集合。
仅当每个代理都应继承相同的共享记录集合时，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

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

额外的集合路径可以在代理之间共享，但当路径位于代理工作区之外时，集合名称将保持显式。工作区内的路径仍然是代理范围的，因此每个代理都保留自己的记录搜索集。

## 一个 WhatsApp 号码，多人（私信拆分）

您可以在保持**一个 WhatsApp 账户**的同时，将**不同的 WhatsApp 私信**路由到不同的代理。使用 `peer.kind: "direct"` 匹配发送者的 E.164（如 `+15551234567`）。回复仍来自同一个 WhatsApp 号码（没有每个代理的发送者身份）。

重要细节：直接聊天会折叠到代理的**主会话密钥**，因此真正的隔离需要**每人一个代理**。

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

- 私信访问控制是**每个 WhatsApp 账户的全局设置**（配对/允许列表），而不是每个代理的。
- 对于共享群组，将群组绑定到一个代理或使用[广播群组](/zh/channels/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是**确定性的**，并且**最具体的规则优先**：

1. `peer` 匹配（精确的 私信/群组/渠道 id）
2. `parentPeer` 匹配（线程继承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. `accountId` 匹配渠道
7. 渠道级别匹配（`accountId: "*"`）
8. 回退到默认代理（`agents.list[].default`，否则为列表的第一个条目，默认值：`main`）

如果同一层级中有多个绑定匹配，则配置顺序中的第一个获胜。
如果一个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则所有指定的字段都是必需的（`AND` 语义）。

重要的账户范围详细信息：

- 省略 `accountId` 的绑定仅匹配默认账户。
- 使用 `accountId: "*"` 作为所有账户的渠道级回退。
- 如果您稍后为同一个代理添加带有显式账户 ID 的相同绑定，OpenClaw 会将现有的仅渠道绑定升级为账户范围绑定，而不是复制它。

## 多个账户 / 电话号码

支持**多个账户**的渠道（例如 WhatsApp）使用 `accountId` 来标识
每次登录。每个 `accountId` 都可以路由到不同的代理，因此一台服务器可以托管
多个电话号码而不会混淆会话。

如果您希望在省略 `accountId` 时拥有一个渠道级的默认账户，请设置
`channels.<channel>.defaultAccount`（可选）。如果未设置，OpenClaw 将回退到
`default`（如果存在），否则回退到第一个配置的账户 ID（已排序）。

支持此模式的常见渠道包括：

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## 概念

- `agentId`：一个“大脑”（工作区、每个代理的身份验证、每个代理的会话存储）。
- `accountId`：一个渠道账户实例（例如 WhatsApp 账户 `"personal"` 对比 `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 以及可选的 guild/team ID 将入站消息路由到 `agentId`。
- 直接聊天会折叠到 `agent:<agentId>:<mainKey>`（每个代理的“主”`session.mainKey`）。

## 平台示例

### 每个代理 Discord 机器人

每个 Discord 机器人帐户都映射到一个唯一的 `accountId`。将每个帐户绑定到一个代理，并为每个机器人维护允许列表。

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

备注：

- 邀请每个机器人加入服务器并启用消息内容意图（Message Content Intent）。
- 令牌位于 `channels.discord.accounts.<id>.token` 中（默认帐户可以使用 `DISCORD_BOT_TOKEN`）。

### 每个 Telegram 代理的机器人

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

备注：

- 使用 BotFather 为每个代理创建一个机器人，并复制每个令牌。
- 令牌位于 `channels.telegram.accounts.<id>.botToken` 中（默认帐户可以使用 `TELEGRAM_BOT_TOKEN`）。

### 每个 WhatsApp 代理的号码

在启动网关之前链接每个帐户：

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

## 示例： WhatsApp 日常聊天 + Telegram 深度工作

按渠道拆分：将 WhatsApp 路由到一个快速的日常代理，将 Telegram 路由到 Opus 代理。

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

备注：

- 如果您在一个渠道有多个帐户，请将 `accountId` 添加到绑定中（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 要将单个私信/组路由到 Opus，同时保持其余部分在聊天模式，请为该对等方添加 `match.peer` 绑定；对等方匹配总是优先于渠道范围规则。

## 示例：同一渠道，一个对等方使用 Opus

保持 WhatsApp 使用快速代理，但将一条私信路由到 Opus：

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

对等方绑定总是优先，因此请将它们保持在渠道范围规则之上。

## 绑定到 WhatsApp 组的家庭代理

将专用的家庭代理绑定到单个 WhatsApp 组，并启用提及门控
和更严格的工具策略：

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
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
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

备注：

- 工具允许/拒绝列表是**工具**，而不是技能。如果技能需要运行
  二进制文件，请确保允许 `exec` 并且二进制文件存在于沙箱中。
- 为了进行更严格的门控，请设置 `agents.list[].groupChat.mentionPatterns` 并为渠道
  保持启用组允许列表。

## 每个代理的沙箱和工具配置

每个代理可以拥有自己的沙箱和工具限制：

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

注意： `setupCommand` 位于 `sandbox.docker` 下，并在容器创建时运行一次。
当解析范围为 `"shared"` 时，将忽略每个代理的 `sandbox.docker.*` 覆盖设置。

**好处：**

- **安全隔离**：限制不受信任代理的工具
- **资源控制**：对特定代理进行沙箱化，同时将其他代理保留在主机上
- **灵活的策略**：每个代理具有不同的权限

注意：`tools.elevated` 是**全局**的且基于发送者；无法按代理进行配置。
如果您需要每个代理的边界，请使用 `agents.list[].tools` 来拒绝 `exec`。
对于群组定向，请使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 能清晰地映射到目标代理。

有关详细示例，请参阅 [Multi-Agent 沙箱 & Tools](/zh/tools/multi-agent-sandbox-tools)。

## 相关

- [Channel Routing](/zh/channels/channel-routing) — 消息如何路由到代理
- [Sub-Agents](/zh/tools/subagents) — 生成后台代理运行
- [ACP Agents](/zh/tools/acp-agents) — 运行外部编码工具
- [Presence](/zh/concepts/presence) — 代理状态和可用性
- [Session](/zh/concepts/session) — 会话隔离和路由
