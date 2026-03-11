---
summary: "多代理路由：隔离的代理、频道账户和绑定"
title: "多代理路由"
read_when: "您想在一个 gateway 进程中拥有多个隔离的代理（工作区 + 认证）。"
status: "active"
---

# 多代理路由

目标：多个_隔离的_代理（独立的工作区 + `agentDir` + 会话），以及在一个运行的 Gateway 中有多个频道账户（例如两个 WhatsApp）。入站通过绑定路由到代理。

## 什么是"一个代理"？

一个**代理**是一个完全限定的智能体，拥有自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、角色规则）。
- **状态目录**（`agentDir`）用于认证配置文件、模型注册表和按代理的配置。
- **会话存储**（聊天历史 + 路由状态）位于 `~/.openclaw/agents/<agentId>/sessions` 下。

认证配置文件是**按代理的**。每个代理从自己的配置文件读取：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主代理凭证**不会**自动共享。永远不要在代理之间重用 `agentDir`
（这会导致认证/会话冲突）。如果您想共享凭证，
请将 `auth-profiles.json` 复制到其他代理的 `agentDir` 中。

技能通过每个工作区的 `skills/` 文件夹按代理提供，共享技能
可从 `~/.openclaw/skills` 获得。请参阅[技能：按代理与共享](/zh/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以托管**一个代理**（默认）或**许多代理**并排运行。

**工作区说明：**每个代理的工作区是**默认 cwd**，而不是硬
沙箱。相对路径在工作区内解析，但绝对路径可以
到达其他主机位置，除非启用了沙箱。请参阅
[沙箱](/zh/gateway/sandboxing)。

## 路径（快速映射）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单代理模式（默认）

如果您什么也不做，OpenClaw 将运行单个代理：

- `agentId` 默认为 **`main`**。
- 会话键为 `agent:main:<mainKey>`。
- 工作区默认为 `~/.openclaw/workspace`（或在设置 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认为 `~/.openclaw/agents/main/agent`。

## 代理助手
使用代理向导添加新的隔离代理：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导执行）以路由入站消息。

使用以下命令验证：

```bash
openclaw agents list --bindings
```

## 多个代理 = 多个人，多种个性

使用**多个代理**，每个 `agentId` 变成一个**完全隔离的角色**：

- **不同的电话号码/账户**（每个频道 `accountId`）。
- **不同的个性**（按代理的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非明确启用，否则不会交叉串扰）。

这使得**多个人**可以共享一个 Gateway 服务器，同时保持其 AI"大脑"和数据隔离。

## 一个 WhatsApp 号码，多个人（私信拆分）

您可以将**不同的 WhatsApp 私信**路由到不同的代理，同时保持在**一个 WhatsApp 账户**上。使用 `peer.kind: "dm"` 匹配发件人 E.164（如 `+15551234567`）。回复仍然来自同一个 WhatsApp 号码（没有按代理的发件人身份）。

重要细节：直接聊天会折叠到代理的**主会话键**，因此真正的隔离需要**每人一个代理**。

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
    { agentId: "alex", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230001" } } },
    { agentId: "mia", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230002" } } },
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

- 私信访问控制是**每个 WhatsApp 账户的全局设置**（配对/允许列表），而不是按代理。
- 对于共享群组，将群组绑定到一个代理或使用[广播群组](/zh/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是**确定性的**并且**最具体的优先**：

1. `peer` 匹配（确切的私信/群组/频道 id）
2. `guildId` (Discord)
3. `teamId` (Slack)
4. 频道的 `accountId` 匹配
5. 频道级别匹配（`accountId: "*"`）
6. 回退到默认代理（`agents.list[].default`，否则第一个列表条目，默认：`main`）

## 多个账户 / 电话号码

支持**多个账户**的频道（例如 WhatsApp）使用 `accountId` 来标识
每次登录。每个 `accountId` 可以路由到不同的代理，因此一台服务器可以托管
多个电话号码而不会混淆会话。

## 概念

- `agentId`：一个"大脑"（工作区、按代理的认证、按代理的会话存储）。
- `accountId`：一个频道账户实例（例如 WhatsApp 账户 `"personal"` vs `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 以及可选的 guild/team id 将入站消息路由到 `agentId`。
- 直接聊天折叠到 `agent:<agentId>:<mainKey>`（按代理的"主"；`session.mainKey`）。
## 示例：两个 WhatsApp → 两个代理

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
        model: "anthropic/claude-opus-4-5",
      },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

注意：

- 如果您有频道的多个账户，请在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 要将单个私信/群组路由到 Opus，同时将其余保留在聊天上，请为该对等方添加 `match.peer` 绑定；对等方匹配始终胜过频道范围的规则。

## 示例：同一频道，一个对等方到 Opus

将 WhatsApp 保留在快速代理上，但将一个私信路由到 Opus：

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
        model: "anthropic/claude-opus-4-5",
      },
    ],
  },
  bindings: [
    { agentId: "opus", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551234567" } } },
    { agentId: "chat", match: { channel: "whatsapp" } },
  ],
}
```

对等方绑定始终获胜，因此将它们保持在频道范围的规则之上。

## 绑定到 WhatsApp 群组的家庭代理

将专用的家庭代理绑定到单个 WhatsApp 群组，带有提及门控
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

注意：

- 工具允许/拒绝列表是**工具**，而不是技能。如果技能需要运行
  二进制文件，确保允许 `exec` 并且二进制文件存在于沙箱中。
- 对于更严格的门控，请设置 `agents.list[].groupChat.mentionPatterns` 并保持
  为频道启用群组允许列表。

## 按代理的沙箱和工具配置

从 v2026.1.6 开始，每个代理可以拥有自己的沙箱和工具限制：

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

注意：`setupCommand` 位于 `sandbox.docker` 下，并在容器创建时运行一次。
当解析的范围为 `"shared"` 时，将忽略按代理的 `sandbox.docker.*` 覆盖。

**好处：**

- **安全隔离**：限制不受信任的代理的工具
- **资源控制**：对特定代理进行沙箱处理，同时将其他代理保留在主机上
- **灵活的策略**：每个代理有不同的权限

注意：`tools.elevated` 是**全局的**并且基于发件人；它不能按代理配置。
如果您需要按代理的边界，请使用 `agents.list[].tools` 来拒绝 `exec`。
对于群组定位，请使用 `agents.list[].groupChat.mentionPatterns`，以便 @提及清晰地映射到预期的代理。

请参阅[多代理沙箱和工具](/zh/multi-agent-sandbox-tools) 以获取详细示例。