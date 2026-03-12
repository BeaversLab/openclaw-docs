---
summary: "多智能体路由：隔离的智能体、渠道账户和绑定"
title: 多智能体路由
read_when: "您希望在一个网关进程中拥有多个隔离的智能体（工作区 + 认证）。"
status: 活跃
---

# 多智能体路由

目标：在一个运行的 Gateway 中拥有多个 _隔离的_ 智能体（独立的工作区 + `agentDir` + 会话），以及多个渠道账户（例如两个 WhatsApp）。入站消息通过绑定路由到特定的智能体。

## 什么是“一个智能体”？

一个 **智能体** 是一个具有完全作用域的大脑，拥有其自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、角色规则）。
- **状态目录**（`agentDir`），用于存储身份认证配置文件、模型注册表和每个智能体的配置。
- **会话存储**（聊天记录 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions` 下。

身份认证配置文件是 **按智能体分配的**。每个智能体从其自己的配置读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主智能体凭证 **不会** 自动共享。切勿跨智能体重用 `agentDir`
（这会导致身份认证/会话冲突）。如果您想共享凭证，
请将 `auth-profiles.json` 复制到另一个智能体的 `agentDir` 中。

技能通过每个工作区的 `skills/` 文件夹按智能体分配，共享技能
可从 `~/.openclaw/skills` 获取。参见 [技能：按智能体 vs 共享](/zh/en/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以托管 **一个智能体**（默认）或 **许多智能体** 并行运行。

**工作区说明：** 每个智能体的工作区是 **默认 cwd**，而不是一个严格的
沙箱。相对路径在工作区内解析，但绝对路径可以
访问其他主机位置，除非启用了沙箱功能。参见
[沙箱](/zh/en/gateway/sandboxing)。

## 路径（快速地图）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 智能体目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单智能体模式（默认）

如果您不进行任何配置，OpenClaw 将运行单个智能体：

- `agentId` 默认为 **`main`**。
- 会话键控为 `agent:main:<mainKey>`。
- 工作区默认为 `~/.openclaw/workspace`（或者当设置了 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认为 `~/.openclaw/agents/main/agent`。

## Agent helper

使用 agent 向导添加一个新的独立 agent：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导完成）以路由入站消息。

使用以下命令验证：

```bash
openclaw agents list --bindings
```

## Quick start

<Steps>
  <Step title="创建每个 agent 的工作区">

使用向导或手动创建工作区：

```bash
openclaw agents add coding
openclaw agents add social
```

每个 agent 都会获得自己的工作区，包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及在 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>

  <Step title="创建频道账户">

在您偏好的频道上为每个 agent 创建一个账户：

- Discord：每个 agent 一个 bot，启用 Message Content Intent，复制每个 token。
- Telegram：通过 BotFather 为每个 agent 创建一个 bot，复制每个 token。
- WhatsApp：为每个账户关联每个电话号码。

```bash
openclaw channels login --channel whatsapp --account work
```

查看频道指南：[Discord](/zh/en/channels/discord)、[Telegram](/zh/en/channels/telegram)、[WhatsApp](/zh/en/channels/whatsapp)。

  </Step>

  <Step title="添加 agents、账户和绑定">

在 `agents.list` 下添加 agents，在 `channels.<channel>.accounts` 下添加频道账户，并使用 `bindings` 连接它们（示例见下文）。

  </Step>

  <Step title="重启并验证">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## Multiple agents = multiple people, multiple personalities

使用 **multiple agents** 时，每个 `agentId` 都会变成一个**完全独立的人格**：

- **不同的电话号码/账户**（针对每个频道 `accountId`）。
- **不同的个性**（每个 agent 的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的身份验证 + 会话**（除非明确启用，否则不会相互干扰）。

这使得**多个人**可以共享一个 Gateway 服务器，同时保持其 AI“大脑”和数据隔离。

## One WhatsApp number, multiple people (DM split)

您可以在保持使用**同一个 WhatsApp 账户**的同时，将**不同的 WhatsApp 私信** 路由到不同的代理。使用 `peer.kind: "direct"` 匹配发送者 E.164（例如 `+15551234567`）。回复仍来自同一个 WhatsApp 号码（没有针对每个代理的发送者身份）。

重要细节：直接聊天会折叠为代理的**主会话密钥**，因此真正的隔离需要**每人一个代理**。

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

注意：

- 私信访问控制是**全局针对每个 WhatsApp 账户**的（配对/允许列表），而不是针对每个代理。
- 对于共享群组，将该群组绑定到一个代理或使用 [Broadcast groups](/zh/en/channels/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是**确定性**的，遵循**最具体者优先**原则：

1. `peer` 匹配（精确的私信/群组/频道 ID）
2. `parentPeer` 匹配（线程继承）
3. `guildId + roles` (Discord 角色路由)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. `accountId` 针对频道的匹配
7. 频道级匹配 (`accountId: "*"`)
8. 回退到默认代理 (`agents.list[].default`，否则为列表中的第一个条目，默认值: `main`)

如果在同一层级有多个绑定匹配，则配置顺序中的第一个获胜。
如果一个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则需要所有指定的字段（`AND` 语义）。

重要的账户范围细节：

- 省略 `accountId` 的绑定仅匹配默认账户。
- 使用 `accountId: "*"` 作为针对所有账户的频道级回退。
- 如果您随后为同一代理添加具有显式账户 ID 的相同绑定，OpenClaw 会将现有的仅频道绑定升级为账户范围绑定，而不是重复创建它。

## 多个账户 / 电话号码

支持**多个账户**的频道（例如 WhatsApp）使用 `accountId` 来标识
每次登录。每个 `accountId` 都可以路由到不同的代理，因此一台服务器可以托管
多个电话号码而不会混淆会话。

如果想要在省略 `accountId` 时设置一个频道范围的默认账号，请设置 `channels.<channel>.defaultAccount`（可选）。如果未设置，OpenClaw 将回退到 `default`（如果存在），否则回退到第一个配置的账号 id（已排序）。

支持此模式的常见频道包括：

- `whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`
- `irc`、`line`、`googlechat`、`mattermost`、`matrix`、`nextcloud-talk`
- `bluebubbles`、`zalo`、`zalouser`、`nostr`、`feishu`

## 概念

- `agentId`：一个“大脑”（工作区、特定于代理的身份验证、特定于代理的会话存储）。
- `accountId`：一个频道账号实例（例如，WhatsApp 账号 `"personal"` 与 `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 以及可选的公会/团队 ID 将入站消息路由到 `agentId`。
- 直接聊天会合并为 `agent:<agentId>:<mainKey>`（每个代理的“主要”；`session.mainKey`）。

## 平台示例

### 每个代理的 Discord 机器人

每个 Discord 机器人账号映射到一个唯一的 `accountId`。将每个账号绑定到一个代理，并为每个机器人保留允许列表。

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

- 将每个机器人邀请到公会并启用消息内容意图。
- 令牌位于 `channels.discord.accounts.<id>.token` 中（默认账号可以使用 `DISCORD_BOT_TOKEN`）。

### 每个代理的 Telegram 机器人

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

- 使用 BotFather 为每个代理创建一个机器人并复制每个令牌。
- 令牌位于 `channels.telegram.accounts.<id>.botToken` 中（默认账号可以使用 `TELEGRAM_BOT_TOKEN`）。

### 每个代理的 WhatsApp 号码

在启动网关之前链接每个账号：

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json` (JSON5)：

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

## 示例：WhatsApp 日常聊天 + Telegram 深度工作

按频道拆分：将 WhatsApp 路由到快速的日常代理，将 Telegram 路由到 Opus 代理。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-5",
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

- 如果一个频道有多个账号，请将 `accountId` 添加到绑定中（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 要将单个 DM/群组路由到 Opus，同时将其余部分保留在聊天中，请为该对等方添加 `match.peer` 绑定；对等方匹配总是优于通道范围规则。

## 示例：同一通道，一个对等方路由到 Opus

将 WhatsApp 保持在快速代理上，但将一个 DM 路由到 Opus：

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-5",
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

对等方绑定总是优先，因此请将它们置于通道范围规则之上。

## 绑定到 WhatsApp 群组的家庭代理

将专用的家庭代理绑定到单个 WhatsApp 群组，并启用提及限制（mention gating）
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

说明：

- 工具允许/拒绝列表是 **tools**（工具），而不是 skills（技能）。如果技能需要运行
  二进制文件，请确保 `exec` 被允许，并且该二进制文件存在于沙箱中。
- 为了进行更严格的限制，请设置 `agents.list[].groupChat.mentionPatterns` 并保持
  通道的群组允许列表已启用。

## 每个代理的沙箱和工具配置

从 v2026.1.6 开始，每个代理都可以拥有自己的沙箱和工具限制：

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

注意：`setupCommand` 位于 `sandbox.docker` 下，并在创建容器时运行一次。
当解析范围为 `"shared"` 时，将忽略每个代理的 `sandbox.docker.*` 覆盖设置。

**优势：**

- **安全隔离**：限制不受信任代理的工具
- **资源控制**：将特定代理置于沙箱中，同时将其他代理保留在主机上
- **灵活策略**：每个代理拥有不同的权限

注意：`tools.elevated` 是 **全局** 的且基于发送者；无法针对每个代理进行配置。
如果您需要每个代理的边界，请使用 `agents.list[].tools` 来拒绝 `exec`。
对于群组定向，请使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 能够清晰地映射到目标代理。

有关详细示例，请参阅 [多代理沙箱和工具](/zh/en/tools/multi-agent-sandbox-tools)。
