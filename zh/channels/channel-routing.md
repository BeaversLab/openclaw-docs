---
summary: “每个通道的路由规则（WhatsApp、Telegram、Discord、Slack）和共享上下文”
read_when:
  - “Changing channel routing or inbox behavior”
title: “通道路由”
---

# 通道与路由

OpenClaw 将回复**路由回消息来源的通道**。模型
不选择通道；路由是确定性的，由主机配置控制。

## 关键术语

- **通道**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：每个通道的账户实例（当支持时）。
- 可选的通道默认账户：`channels.<channel>.defaultAccount` 选择
  当出站路径未指定 `accountId` 时使用的账户。
  - 在多账户设置中，当配置了两个或更多账户时，设置显式默认值（`defaultAccount` 或 `accounts.default`）。如果没有它，回退路由可能会选择第一个规范的账户 ID。
- **AgentId**：一个隔离的工作区 + 会话存储（”大脑”）。
- **SessionKey**：用于存储上下文和控制并发性的存储桶密钥。

## 会话密钥形状（示例）

直接消息折叠到代理的 **main** 会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

群组和通道按通道保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 通道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程将 `:thread:<threadId>` 附加到基本密钥。
- Telegram 论坛主题将 `:topic:<topicId>` 嵌入到群组密钥中。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主 DM 路由固定

当 `session.dmScope` 为 `main` 时，直接消息可能共享一个主会话。
为了防止会话的 `lastRoute` 被非所有者 DM 覆盖，
当满足以下所有条件时，OpenClaw 从 `allowFrom` 推断固定的所有者：

- `allowFrom` 只有一个非通配符条目。
- 该条目可以规范化为该通道的具体发送者 ID。
- 入站 DM 发送者与该固定所有者不匹配。

在该不匹配情况下，OpenClaw 仍会记录入站会话元数据，但会
跳过更新主会话 `lastRoute`。

## 路由规则（如何选择代理）

路由为每条入站消息选择**一个代理**：

1. **精确对等匹配**（具有 `peer.kind` + `peer.id` 的 `bindings`）。
2. **父对等匹配**（线程继承）。
3. **公会 + 角色匹配**（Discord）通过 `guildId` + `roles`。
4. **公会匹配**（Discord）通过 `guildId`。
5. **团队匹配**（Slack）通过 `teamId`。
6. **账户匹配**（通道上的 `accountId`）。
7. **通道匹配**（该通道上的任何账户，`accountId: "*"`）。
8. **默认代理**（`agents.list[].default`，否则第一个列表条目，回退到 `main`）。

当绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，**所有提供的字段必须匹配**才能应用该绑定。

匹配的代理决定使用哪个工作区和会话存储。

## 广播组（运行多个代理）

广播组让您可以在**OpenClaw 通常会回复时**为同一个对等方运行**多个代理**（例如：在 WhatsApp 群组中，在提及/激活门控之后）。

配置：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

请参阅：[Broadcast Groups](/zh/channels/broadcast-groups)。

## 配置概述

- `agents.list`：命名的代理定义（工作区、模型等）。
- `bindings`：将入站通道/账户/对等方映射到代理。

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
- JSONL 转录与存储并存

您可以通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

## WebChat 行为

WebChat 附加到**选定的代理**，并默认为代理的主
会话。因此，WebChat 让您在一个地方查看该代理的跨通道上下文。

## 回复上下文

入站回复包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如果可用）。
- 引用的上下文作为 `[Replying to ...]` 块附加到 `Body`。

这在所有通道中是一致的。
