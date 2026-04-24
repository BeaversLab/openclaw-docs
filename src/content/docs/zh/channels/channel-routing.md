---
summary: "每个渠道（WhatsApp、Telegram、Discord、Slack）的路由规则及共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "渠道路由"
---

# 渠道与路由

OpenClaw 将回复**路由回消息来源的渠道**。模型不会选择渠道；路由是确定性的，并由主机配置控制。

## 关键术语

- **渠道**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，加上插件渠道。`webchat` 是内部 WebChat UI 渠道，不是可配置的出站渠道。
- **AccountId (账户ID)**：按渠道划分的账户实例（如果支持）。
- 可选的渠道默认账号：当出站路径未指定 `accountId` 时，`channels.<channel>.defaultAccount` 选择使用的账号。
  - 在多账号设置中，当配置了两个或更多账号时，请设置显式的默认值（`defaultAccount` 或 `accounts.default`）。否则，回退路由可能会选择第一个标准化的账号 ID。
- **AgentId (代理ID)**：一个隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey (会话密钥)**：用于存储上下文和控制并发存储桶的密钥。

## 会话密钥形式（示例）

默认情况下，私信会折叠到代理的**主**会话：

- `agent:<agentId>:<mainKey>`（默认值：`agent:main:main`）

即使私信对话历史记录与 main 共享，沙盒和工具策略也会为外部私信使用派生的每账户直接聊天运行时密钥，以便源自渠道的消息不会像本地主会话运行那样被处理。

群组和渠道按渠道保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 渠道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程会在基础密钥后附加 `:thread:<threadId>`。
- Telegram 论坛主题会在群组密钥中嵌入 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主私信路由固定

当 `session.dmScope` 为 `main` 时，私信可能共享一个主会话。为了防止会话的 `lastRoute` 被非所有者私信覆盖，当满足以下所有条件时，OpenClaw 会从 `allowFrom` 推断固定的所有者：

- `allowFrom` 恰好有一个非通配符条目。
- 该条目可以针对该渠道规范化为具体的发送者 ID。
- 入站私信发送者与该固定所有者不匹配。

在这种不匹配的情况下，OpenClaw 仍会记录入站会话元数据，但会跳过更新主会话 `lastRoute`。

## 路由规则（如何选择代理）

路由为每条入站消息选择**一个代理**：

1. **精确对等匹配**（`bindings` 具有 `peer.kind` + `peer.id`）。
2. **父对等匹配**（线程继承）。
3. **公会 + 角色匹配**（Discord），通过 `guildId` + `roles`。
4. **Guild match** (Discord) via `guildId`。
5. **Team match** (Slack) via `teamId`。
6. **Account match** (`accountId` on the 渠道)。
7. **Channel match** (any account on that 渠道, `accountId: "*"`)。
8. **Default agent** (`agents.list[].default`, else first list entry, fallback to `main`)。

When a binding includes multiple match fields (`peer`, `guildId`, `teamId`, `roles`), **all provided fields must match** for that binding to apply.

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

See: [Broadcast Groups](/zh/channels/broadcast-groups)。

## Config overview

- `agents.list`: named agent definitions (workspace, 模型, etc.).
- `bindings`: map inbound channels/accounts/peers to agents.

Example:

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

## Session storage

Session stores live under the state directory (default `~/.openclaw`)：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL transcripts live alongside the store

You can override the store path via `session.store` and `{agentId}` templating.

Gateway(网关) and ACP 会话 discovery also scans disk-backed agent stores under the
default `agents/` root and under templated `session.store` roots. Discovered
stores must stay inside that resolved agent root and use a regular
`sessions.json` file. Symlinks and out-of-root paths are ignored.

## WebChat behavior

WebChat attaches to the **selected agent** and defaults to the agent’s main
会话. Because of this, WebChat lets you see cross‑渠道 context for that
agent in one place.

## Reply context

Inbound replies include:

- `ReplyToId`, `ReplyToBody`, and `ReplyToSender` when available.
- 引用上下文会作为 `[Replying to ...]` 块附加到 `Body`。

这在所有渠道中保持一致。
