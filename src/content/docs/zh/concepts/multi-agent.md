---
summary: "多智能体路由：隔离的智能体、渠道账号和绑定"
title: "多智能体路由"
sidebarTitle: "多智能体路由"
read_when: "您希望在一个网关进程中运行多个隔离的智能体（工作区 + 身份验证）。"
status: active
---

在一个运行的 Gateway(网关) 中运行多个*隔离的*智能体——每个智能体都有自己的工作区、状态目录（`agentDir`）和会话历史——以及多个渠道账号（例如两个 WhatsApp）。传入的消息通过绑定路由到正确的智能体。

这里的 **agent（智能体）** 是完整的按角色划分的范围：工作区文件、身份验证配置文件、模型注册表和会话存储。`agentDir` 是磁盘上的状态目录，用于在 `~/.openclaw/agents/<agentId>/` 保存每个智能体的配置。**binding（绑定）** 将渠道账号（例如 Slack 工作区或 WhatsApp 号码）映射到这些智能体之一。

## 什么是“一个智能体”？

一个 **agent（智能体）** 是一个完全限定范围的“大脑”，拥有自己的：

- **Workspace（工作区）**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、角色规则）。
- **State directory（状态目录）**（`agentDir`），用于身份验证配置文件、模型注册表和每个智能体的配置。
- **Session store（会话存储）**（聊天记录 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions` 下。

身份验证配置文件是**按智能体划分的**。每个智能体从自己的位置读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
`sessions_history` 也是此处更安全的跨会话回忆路径：它返回有界的、经过清理的视图，而不是原始的记录转储。助手回忆会去除思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截断的工具调用块）、降级的工具调用脚手架、泄漏的 ASCII/全角模型控制令牌，以及在编辑/截断之前格式错误的 MiniMax 工具调用 XML。
</Note>

<Warning>Main agent credentials are **not** shared automatically. Never reuse `agentDir` across agents (it causes auth/会话 collisions). If you want to share creds, copy `auth-profiles.json` into the other agent's `agentDir`.</Warning>

Skills are loaded from each agent workspace plus shared roots such as `~/.openclaw/skills`, then filtered by the effective agent skill allowlist when configured. Use `agents.defaults.skills` for a shared baseline and `agents.list[].skills` for per-agent replacement. See [Skills: per-agent vs shared](/zh/tools/skills#per-agent-vs-shared-skills) and [Skills: agent skill allowlists](/zh/tools/skills#agent-skill-allowlists).

Gateway(网关) can host **one agent** (default) or **many agents** side-by-side.

<Note>**Workspace note:** each agent's workspace is the **default cwd**, not a hard sandbox. Relative paths resolve inside the workspace, but absolute paths can reach other host locations unless 沙箱隔离 is enabled. See [沙箱隔离](/zh/gateway/sandboxing).</Note>

## Paths (quick map)

- Config: `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG_PATH`)
- State dir: `~/.openclaw` (or `OPENCLAW_STATE_DIR`)
- Workspace: `~/.openclaw/workspace` (or `~/.openclaw/workspace-<agentId>`)
- Agent dir: `~/.openclaw/agents/<agentId>/agent` (or `agents.list[].agentDir`)
- Sessions: `~/.openclaw/agents/<agentId>/sessions`

### Single-agent mode (default)

If you do nothing, OpenClaw runs a single agent:

- `agentId` defaults to **`main`**.
- Sessions are keyed as `agent:main:<mainKey>`.
- Workspace defaults to `~/.openclaw/workspace` (or `~/.openclaw/workspace-<profile>` when `OPENCLAW_PROFILE` is set).
- State defaults to `~/.openclaw/agents/main/agent`.

## Agent helper

Use the agent wizard to add a new isolated agent:

```bash
openclaw agents add work
```

Then add `bindings` (or let the wizard do it) to route inbound messages.

Verify with:

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个代理的工作区">
    使用向导或手动创建工作区：

    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每个代理都会获得自己的工作区，包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及位于 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>
  <Step title="创建渠道账号">
    在您偏好的渠道上为每个代理创建一个账号：

    - Discord：每个代理一个机器人，启用 Message Content Intent，复制每个令牌。
    - Telegram：通过 BotFather 为每个代理创建一个机器人，复制每个令牌。
    - WhatsApp：将每个电话号码链接到相应账号。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    请参阅渠道指南：[Discord](/zh/channels/discord)、[Telegram](/zh/channels/telegram)、[WhatsApp](/zh/channels/whatsapp)。

  </Step>
  <Step title="添加代理、账号和绑定">
    在 `agents.list` 下添加代理，在 `channels.<channel>.accounts` 下添加渠道账号，并使用 `bindings` 连接它们（示例如下）。
  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多个代理 = 多个人，多重个性

通过**多个代理**，每个 `agentId` 都将成为一个**完全隔离的个体**：

- **不同的电话号码/账号**（针对每个渠道 `accountId`）。
- **不同的个性**（每个代理的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的身份验证 + 会话**（除非明确启用，否则不会交叉互通）。

这使得**多个人**可以共享一个 Gateway(网关) 服务器，同时保持其 AI“大脑”和数据隔离。

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

额外的集合路径可以在多个代理之间共享，但当路径位于代理工作区之外时，集合名称保持显式。工作区内的路径仍然是代理作用域的，因此每个代理都保留自己的对话记录搜索集。

## 一个 WhatsApp 号码，多个人（私信拆分）

您可以在保持使用**一个 WhatsApp 账户**的同时，将**不同的 WhatsApp 私信**路由到不同的代理。使用 `peer.kind: "direct"` 匹配发送者的 E.164（例如 `+15551234567`）。回复仍来自同一个 WhatsApp 号码（没有每代理的发送者身份）。

<Note>直接对话会折叠到代理的**主会话密钥**，因此真正的隔离需要**每人一个代理**。</Note>

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

- 私信访问控制是**针对每个 WhatsApp 账户全局的**（配对/允许列表），而不是针对每个代理的。
- 对于共享群组，将群组绑定到一个代理或使用[广播群组](/zh/channels/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是**确定性的**，并且**最具体的获胜**：

<Steps>
  <Step title="peer match">确切的私信/群组/渠道 ID。</Step>
  <Step title="parentPeer match">线程继承。</Step>
  <Step title="guildId + roles">Discord 角色路由。</Step>
  <Step title="guildId">Discord.</Step>
  <Step title="teamId">Slack.</Step>
  <Step title="accountId match for a channel">每个账户的回退。</Step>
  <Step title="Channel-level match">`accountId: "*"`.</Step>
  <Step title="Default agent">回退到 `agents.list[].default`，否则为第一个列表条目，默认值：`main`。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Tie-breaking and AND semantics">- 如果同一层级中有多个绑定匹配，则配置顺序中的第一个获胜。 - 如果一个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则所有指定的字段都是必需的（`AND` 语义）。</Accordion>
  <Accordion title="Account-scope detail">- A binding that omits `accountId` matches the default account only. - Use `accountId: "*"` for a channel-wide fallback across all accounts. - If you later add the same binding for the same agent with an explicit account id, OpenClaw upgrades the existing channel-only binding to account-scoped instead of duplicating it.</Accordion>
</AccordionGroup>

## 多个账号 / 电话号码

支持**多个账号**的渠道（例如 WhatsApp）使用 `accountId` 来标识每次登录。每个 `accountId` 都可以路由到不同的代理，因此一台服务器可以托管多个电话号码而不会混淆会话。

如果希望在省略 `accountId` 时设置一个全渠道默认账号，请设置 `channels.<channel>.defaultAccount`（可选）。如果未设置，OpenClaw 将回退到 `default`（如果存在），否则回退到第一个配置的账号 ID（已排序）。

支持此模式的常见渠道包括：

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## 概念

- `agentId`：一个“大脑”（工作区、特定于代理的身份验证、特定于代理的会话存储）。
- `accountId`：一个渠道账号实例（例如 WhatsApp 账号 `"personal"` 对比 `"biz"`）。
- `binding`：根据 `(channel, accountId, peer)` 以及可选的 guild/团队 ID，将入站消息路由到 `agentId`。
- 直接聊天会折叠为 `agent:<agentId>:<mainKey>`（每个代理的“main”；`session.mainKey`）。

## 平台示例

<AccordionGroup>
  <Accordion title="每个代理的 Discord 机器人">
    每个 Discord 机器人帐户映射到一个唯一的 `accountId`。将每个帐户绑定到一个代理，并为每个机器人维护允许列表。

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

    - 邀请每个机器人加入 guild 并启用 Message Content Intent。
    - 令牌位于 `channels.discord.accounts.<id>.token` 中（默认帐户可以使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每个代理的 Telegram 机器人">
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
    - 令牌位于 `channels.telegram.accounts.<id>.botToken` 中（默认帐户可以使用 `TELEGRAM_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每个代理的 WhatsApp 号码">
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

  </Accordion>
</AccordionGroup>

## 常见模式

<Tabs>
  <Tab title="WhatsApp 日常 + Telegram 深度工作">
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

    说明：

    - 如果您有一个渠道的多个帐户，请将 `accountId` 添加到绑定中（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
    - 要将单个私信/群组路由到 Opus，同时将其余部分保留在 chat 上，请为该对等方添加 `match.peer` 绑定；对等方匹配总是胜过渠道范围规则。

  </Tab>
  <Tab title="同一渠道，一个对等方到 Opus">
    将 WhatsApp 保留在快速代理上，但将一条私信路由到 Opus：

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

    对等方绑定总是优先，因此请将它们放在渠道范围规则之上。

  </Tab>
  <Tab title="绑定到 WhatsApp 群组的家庭智能体">
    将专用的家庭智能体绑定到单个 WhatsApp 群组，并启用提及限制和更严格的工具策略：

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

    - 工具允许/拒绝列表针对的是**工具**，而非技能。如果某项技能需要运行二进制文件，请确保允许 `exec` 并且该二进制文件存在于沙箱中。
    - 若要实施更严格的限制，请设置 `agents.list[].groupChat.mentionPatterns` 并保持该渠道的群组允许列表处于启用状态。

  </Tab>
</Tabs>

## Per-agent sandbox and 工具 configuration

每个智能体可以拥有自己的沙箱和工具限制：

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

<Note>`setupCommand` 位于 `sandbox.docker` 之下，并在容器创建时运行一次。当解析的作用域为 `"shared"` 时，每个智能体的 `sandbox.docker.*` 覆盖设置将被忽略。</Note>

<Note>`setupCommand` 位于 `sandbox.docker` 下，并在容器创建时运行一次。当解析的作用域为 `"shared"` 时，将忽略每个代理的 `sandbox.docker.*` 覆盖设置。</Note>

- **优势：**
- **安全隔离**：限制不可信代理的工具。
- **资源控制**：将特定代理沙盒化，同时将其他代理保留在主机上。

<Note>`tools.elevated` 是**全局**的且基于发送者；无法针对每个代理进行配置。如果您需要针对每个代理的边界，请使用 `agents.list[].tools` 来拒绝 `exec`。对于群组定位，请使用 `agents.list[].groupChat.mentionPatterns`，以便 @提及 能清晰地映射到目标代理。</Note>

请参阅[多代理沙箱和工具](/zh/tools/multi-agent-sandbox-tools)以获取详细示例。

## 有关详细示例，请参阅 [Multi-agent sandbox and tools](/zh/tools/multi-agent-sandbox-tools)。

- [ACP 代理](/zh/tools/acp-agents) — 运行外部编码工具
- [Channel routing](/zh/channels/channel-routing) — 消息如何路由到代理
- [Presence](/zh/concepts/presence) — 代理在线状态和可用性
- [Session](/zh/concepts/session) — 会话隔离和路由
- [Sub-agents](/zh/tools/subagents) — 生成后台代理运行
