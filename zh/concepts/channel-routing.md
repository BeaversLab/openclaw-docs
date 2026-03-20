---
summary: "每个渠道（WhatsApp、Telegram、Discord、Slack）的路由规则和共享上下文"
read_when:
  - 更改渠道路由或收件箱行为
title: "Channel Routing"
---

# Channels & routing

OpenClaw 将回复**路由回消息来源渠道**。
模型不选择渠道；路由是确定性的，由主机配置控制。

## Key terms

- **渠道 (Channel)**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**: per‑渠道 account instance (when supported).
- **AgentId**: an isolated workspace + 会话 store (“brain”).
- **SessionKey**: the bucket key used to store context and control concurrency.

## Session key shapes (examples)

Direct messages collapse to the agent’s **main** 会话:

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

Groups and channels remain isolated per 渠道:

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道/房间：`agent:<agentId>:<channel>:channel:<id>`

Threads:

- Slack/Discord 主题会在基础键后附加 `:thread:<threadId>`。
- Telegram 论坛主题将 `:topic:<topicId>` 嵌入到群组键中。

Examples:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Routing rules (how an agent is chosen)

Routing picks **one agent** for each inbound message:

1. **完全对等匹配**（具有 `peer.kind` + `peer.id` 的 `bindings`）。
2. **公会匹配**（Discord）通过 `guildId`。
3. **团队匹配**（Slack）通过 `teamId`。
4. **账户匹配**（渠道上的 `accountId`）。
5. **Channel match** (any account on that 渠道).
6. **默认代理**（`agents.list[].default`，否则为列表第一个条目，回退至 `main`）。

The matched agent determines which workspace and 会话 store are used.

## Broadcast groups (run multiple agents)

Broadcast groups let you run **multiple agents** for the same peer **when OpenClaw would normally reply** (for example: in WhatsApp groups, after mention/activation gating).

Config:

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

参见：[广播组](/zh/broadcast-groups)。

## Config overview

- `agents.list`：命名的代理定义（工作区、模型等）。
- `bindings`：将入站渠道/账户/对等点映射到代理。

示例：

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## 会话存储

会话存储位于状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 记录与存储并存

您可以通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

## WebChat 行为

WebChat 附加到**选定的代理**，默认使用该代理的主会话。
因此，WebChat 允许您在一个位置查看该代理的跨渠道上下文。

## 回复上下文

入站回复包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如果可用）。
- 引用的上下文作为 `[Replying to ...]` 块附加到 `Body`。

这在所有通道中是一致的。

import zh from "/components/footer/zh.mdx";

<zh />
