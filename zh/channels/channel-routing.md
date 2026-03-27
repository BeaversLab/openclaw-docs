---
summary: "每个渠道（WhatsApp、Telegram、Discord、Slack）的路由规则及共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "渠道路由"
---

# 渠道与路由

OpenClaw 将回复**路由回消息来源的渠道**。模型不会选择渠道；路由是确定性的，并由主机配置控制。

## 关键术语

- **渠道**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，以及扩展渠道。`webchat` 是内部 WebChat UI 渠道，不是可配置的出站渠道。
- **AccountId (账户ID)**：按渠道划分的账户实例（如果支持）。
- 可选的渠道默认账号：当出站路径未指定 `accountId` 时，`channels.<channel>.defaultAccount` 选择使用的账号。
  - 在多账号设置中，当配置了两个或更多账号时，请设置显式的默认值（`defaultAccount` 或 `accounts.default`）。否则，回退路由可能会选择第一个标准化的账号 ID。
- **AgentId (代理ID)**：一个隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey (会话密钥)**：用于存储上下文和控制并发存储桶的密钥。

## 会话密钥形式（示例）

直接消息折叠为代理的**主**会话：

- `agent:<agentId>:<mainKey>`（默认值：`agent:main:main`）

群组和频道在每个渠道中保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程会将 `:thread:<threadId>` 附加到基础密钥。
- Telegram 论坛主题将 `:topic:<topicId>` 嵌入到群组密钥中。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主 私信 路由固定

当 `session.dmScope` 为 `main` 时，私信可能共享一个主会话。
为了防止会话的 `lastRoute` 被非所有者的私信覆盖，
当满足以下所有条件时，OpenClaw 会从 `allowFrom` 推断出固定的所有者：

- `allowFrom` 恰好有一个非通配符条目。
- 该条目可以针对该渠道规范化为具体的发送者 ID。
- 入站 私信 发送者与该固定的所有者不匹配。

在这种不匹配的情况下，OpenClaw 仍然记录入站会话元数据，但它
跳过更新主会话 `lastRoute`。

## 路由规则（如何选择 Agent）

路由会为每条入站消息挑选**一个 Agent**：

1. **精确对等匹配**（具有 `peer.kind` + `peer.id` 的 `bindings`）。
2. **父级对等匹配**（线程继承）。
3. **服务器 + 角色匹配**（Discord）通过 `guildId` + `roles`。
4. **服务器匹配**（Discord）通过 `guildId`。
5. **团队匹配**（Slack）通过 `teamId`。
6. **账号匹配**（渠道上的 `accountId`）。
7. **渠道匹配**（该渠道上的任何账户，`accountId: "*"`）。
8. **默认代理**（`agents.list[].default`，否则为列表第一个条目，回退到 `main`）。

当绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，**所有提供的字段都必须匹配**，该绑定才会生效。

匹配的 Agent 决定了使用哪个工作区和会话存储。

## 广播组（运行多个 Agent）

广播组允许您在**当 OpenClaw 通常会回复时**，为同一个对等方运行**多个 Agent**（例如：在 WhatsApp 群组中，在提及/激活门控之后）。

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

参见：[广播组](/zh/channels/broadcast-groups)。

## 配置概览

- `agents.list`：命名代理定义（工作区、模型等）。
- `bindings`：将入站渠道/账户/对等端映射到代理。

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
- JSONL 脚本与存储并存

您可以通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

Gateway(网关) 和 ACP 会话发现还会扫描默认 `agents/` 根目录和模板化 `session.store` 根目录下的基于磁盘的代理存储。发现的
存储必须位于该解析后的代理根目录内，并使用常规的
`sessions.json` 文件。符号链接和根目录外的路径将被忽略。

## WebChat 行为

WebChat 附加到**选定的代理**，默认使用该代理的主会话。因此，WebChat 允许您在一个位置查看该代理的跨渠道上下文。

## 回复上下文

入站回复包括：

- 可用时包括 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用的上下文作为 `[Replying to ...]` 块附加到 `Body`。

这在所有渠道中是一致的。

import zh from "/components/footer/zh.mdx";

<zh />
