---
summary: "多 agent 路由：隔离 agents、渠道账号与 bindings"
title: "Multi-Agent Routing"
read_when: "需要在一个 gateway 进程中使用多个隔离 agents（工作区 + auth）。"
status: active
---

# Multi-Agent Routing

目标：在一个运行中的 Gateway 内同时运行多个*隔离* agent（独立 workspace + `agentDir` + sessions），以及多个渠道账号（例如两个 WhatsApp）。入站消息通过 bindings 路由到某个 agent。

## 什么是“一个 agent”？

**Agent** 是一个完全隔离的大脑，拥有自己的：

- **Workspace**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、persona 规则）。
- **State directory**（`agentDir`），用于 auth profiles、模型注册与 per-agent 配置。
- **Session store**（聊天历史 + 路由状态），位于 `~/.openclaw/agents/<agentId>/sessions`。

Auth profiles 是 **per-agent** 的。每个 agent 从各自的路径读取：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主 agent 的凭据**不会**自动共享。不要在 agents 之间复用 `agentDir`
（会造成 auth/session 冲突）。若需要共享凭据，请将 `auth-profiles.json` 复制到其他 agent 的 `agentDir`。

Skills 以各 workspace 的 `skills/` 目录为 per-agent；共享 skills 位于 `~/.openclaw/skills`。参见 [Skills: per-agent vs shared](/zh/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以运行**一个 agent**（默认）或**多个 agents**并排运行。

**Workspace 注意：**每个 agent 的 workspace 是**默认 cwd**，而非强制沙箱。相对路径会在 workspace 内解析，但绝对路径仍可访问主机其他位置，除非启用 sandboxing。参见
[Sandboxing](/zh/gateway/sandboxing)。

## 路径（速查）

- Config：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- State dir：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- Workspace：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- Agent dir：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- Sessions：`~/.openclaw/agents/<agentId>/sessions`

### 单 agent 模式（默认）

若不做任何配置，OpenClaw 运行单个 agent：

- `agentId` 默认是 **`main`**。
- Sessions key 为 `agent:main:<mainKey>`。
- Workspace 默认 `~/.openclaw/workspace`（当设置 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- State 默认 `~/.openclaw/agents/main/agent`。

## Agent helper

用 agent 向导添加新的隔离 agent：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导代劳）以路由入站消息。

验证：

```bash
openclaw agents list --bindings
```

## 多 agents = 多人 + 多人格

在**多 agents**模式下，每个 `agentId` 是一个**完全隔离的 persona**：

- **不同电话号码/账号**（每渠道 `accountId`）。
- **不同人格**（per-agent workspace 文件如 `AGENTS.md`、`SOUL.md`）。
- **独立 auth + sessions**（除非显式启用，否则无串联）。

这让**多个人**可共享一个 Gateway 服务器，同时保持各自 AI “大脑”与数据隔离。

## 一个 WhatsApp 号码，多人（DM 拆分）

你可以在**同一个 WhatsApp 账号**下，将**不同 WhatsApp 私聊**路由到不同 agent，通过发送者 E.164（如 `+15551234567`）匹配 `peer.kind: "dm"`。回复仍来自同一 WhatsApp 号码（不会 per-agent 区分发送者身份）。

重要细节：私聊会折叠到 agent 的**主会话 key**，因此真正的隔离需要**一人一个 agent**。

示例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" }
    ]
  },
  bindings: [
    { agentId: "alex", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230001" } } },
    { agentId: "mia",  match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230002" } } }
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"]
    }
  }
}
```

注：
- DM 访问控制是**每个 WhatsApp 账号全局**的（pairing/allowlist），不是 per-agent。
- 对共享群，绑定群到一个 agent 或使用 [Broadcast groups](/zh/broadcast-groups)。

## 路由规则（如何选择 agent）

Bindings 是**确定性**的，且**最具体优先**：

1. `peer` 匹配（精确 DM/group/channel id）
2. `guildId`（Discord）
3. `teamId`（Slack）
4. 渠道 `accountId` 匹配
5. 渠道级匹配（`accountId: "*"`）
6. 回退到默认 agent（`agents.list[].default`，否则列表首项，默认：`main`）

## 多账号 / 多电话号码

支持**多账号**的渠道（如 WhatsApp）使用 `accountId` 标识每个登录。每个 `accountId` 可路由到不同 agent，因此一台服务器可托管多个号码且不混会话。

## 概念

- `agentId`：一个“脑”（workspace、per-agent auth、per-agent session store）。
- `accountId`：一个渠道账号实例（例如 WhatsApp 账号 `"personal"` vs `"biz"`）。
- `binding`：按 `(channel, accountId, peer)`（可选 guild/team ids）将入站消息路由到 `agentId`。
- 私聊折叠到 `agent:<agentId>:<mainKey>`（per-agent “main”；`session.mainKey`）。

## 示例：两个 WhatsApp → 两个 agents

`~/.openclaw/openclaw.json`（JSON5）：

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

按渠道拆分：WhatsApp 路由到快速日常 agent，Telegram 路由到 Opus agent。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-5"
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-5"
      }
    ]
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } }
  ]
}
```

注：
- 若渠道有多个账号，为 binding 添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若要将单个 DM/群路由到 Opus 而其余仍在 chat，添加该 peer 的 `match.peer` 绑定；peer 匹配总是高于渠道级规则。

## 示例：同一渠道，一个 peer 到 Opus

保持 WhatsApp 在快速 agent，但将一个 DM 路由到 Opus：

```json5
{
  agents: {
    list: [
      { id: "chat", name: "Everyday", workspace: "~/.openclaw/workspace-chat", model: "anthropic/claude-sonnet-4-5" },
      { id: "opus", name: "Deep Work", workspace: "~/.openclaw/workspace-opus", model: "anthropic/claude-opus-4-5" }
    ]
  },
  bindings: [
    { agentId: "opus", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551234567" } } },
    { agentId: "chat", match: { channel: "whatsapp" } }
  ]
}
```

peer 绑定总是优先，因此要放在渠道级规则之上。

## 绑定家庭 agent 到 WhatsApp 群

将一个专用家庭 agent 绑定到单个 WhatsApp 群，并设置 mention 门控
与更严格的工具策略：

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
          mentionPatterns: ["@family", "@familybot", "@Family Bot"]
        },
        sandbox: {
          mode: "all",
          scope: "agent"
        },
        tools: {
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"]
        }
      }
    ]
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" }
      }
    }
  ]
}
```

注：
- 工具 allow/deny 列表是 **tools**，不是 skills。若某 skill 需要执行
  二进制，请确保允许 `exec` 且该二进制存在于 sandbox。
- 若需更严格门控，设置 `agents.list[].groupChat.mentionPatterns` 并保持渠道群 allowlist 启用。

## Per-Agent Sandbox 与工具配置

从 v2026.1.6 起，每个 agent 可有自己的 sandbox 与工具限制：

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

注：`setupCommand` 位于 `sandbox.docker` 下，仅在容器创建时运行一次。
当解析后的 scope 为 `"shared"` 时，per-agent `sandbox.docker.*` 覆盖会被忽略。

**收益：**
- **安全隔离**：限制不可信 agent 的工具
- **资源控制**：将指定 agent 放入 sandbox，其他仍在 host
- **灵活策略**：每个 agent 不同权限

注：`tools.elevated` 是**全局**且基于 sender 的；不可 per-agent 配置。
若需要 per-agent 边界，请用 `agents.list[].tools` 禁止 `exec`。
若要针对群组，使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 明确映射到目标 agent。

参见 [Multi-Agent Sandbox & Tools](/zh/multi-agent-sandbox-tools) 查看详细示例。
