---
summary: "每个渠道（WhatsApp、Telegram、Discord、Slack）的路由规则及共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "Channel routing"
---

# 渠道与路由

OpenClaw 将回复**路由回消息来源的渠道**。模型不会选择渠道；路由是确定性的，并由主机配置控制。

## 关键术语

- **渠道**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，加上插件渠道。`webchat` 是内部 WebChat UI 渠道，不是可配置的出站渠道。
- **AccountId**：每个渠道的账户实例（如果支持）。
- 可选的渠道默认账号：当出站路径未指定 `accountId` 时，`channels.<channel>.defaultAccount` 选择使用的账号。
  - 在多账号设置中，当配置了两个或更多账号时，请设置显式的默认值（`defaultAccount` 或 `accounts.default`）。否则，回退路由可能会选择第一个标准化的账号 ID。
- **AgentId**：一个隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey (会话密钥)**：用于存储上下文和控制并发存储桶的密钥。

## 出站目标前缀

显式的出站目标可能包含提供商前缀，例如 `telegram:123` 或 `tg:123`。核心仅当所选渠道是 `last` 或未解析时，且仅当加载的插件声明支持该前缀时，才将该前缀视为渠道选择提示。如果调用者已选择了显式渠道，则提供商前缀必须与该渠道匹配；跨渠道组合（例如向 `telegram:123` 发送 WhatsApp）将在插件特定的目标规范化之前失败。

目标类型和服务前缀（如 `channel:<id>`、`user:<id>`、`room:<id>`、`thread:<id>`、`imessage:<handle>` 和 `sms:<number>`）保留在所选渠道的语法范围内。它们不会自行选择提供商。

## 会话键形状（示例）

私信默认折叠到代理的 **main** 会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

即使私信对话历史记录与 main 共享，沙盒和工具策略也会为外部私信使用派生的每账户直接聊天运行时密钥，以便渠道发起的消息不会像本地主会话运行那样被处理。

群组和渠道按渠道保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 渠道/房间：`agent:<agentId>:<channel>:channel:<id>`

主题串：

- Slack/Discord 主题串将 `:thread:<threadId>` 附加到基础键。
- Telegram 论坛话题将 `:topic:<topicId>` 嵌入群组键中。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主私信路由固定

当 `session.dmScope` 为 `main` 时，私信可能会共享一个主会话。
为了防止会话的 `lastRoute`OpenClaw 被非所有者私信覆盖，
OpenClaw 在满足以下所有条件时，会从 `allowFrom` 推断出一个固定的所有者：

- `allowFrom` 恰好包含一个非通配符条目。
- 该条目可以被规范化为该渠道的具体发送者 ID。
- 入站私信发送者与该固定所有者不匹配。

在这种不匹配的情况下，OpenClaw 仍然会记录入站会话元数据，但它
会跳过更新主会话 OpenClaw`lastRoute`。

## 受保护的入站录制

当受保护路径不得创建新的 OpenClaw 会话时，渠道插件可以将入站会话记录标记为 `createIfMissing: false`OpenClawOpenClaw。
在该模式下，OpenClaw 可以更新现有会话的元数据和 `lastRoute`，但它
不会仅因为检测到消息就创建仅路由会话条目。

## 路由规则（如何选择代理）

路由为每条入站消息选择**一个代理**：

1. **精确对等匹配**（`bindings` 具有 `peer.kind` + `peer.id`）。
2. **父级对等匹配**（线程继承）。
3. **服务器 + 角色匹配**（Discord）通过 Discord`guildId` + `roles`。
4. **服务器匹配**（Discord）通过 Discord`guildId`。
5. **团队匹配**（Slack）通过 Slack`teamId`。
6. **账户匹配**（渠道上的 `accountId`）。
7. **渠道匹配**（该渠道上的任何账户，`accountId: "*"`）。
8. **默认代理**（`agents.list[].default`，否则为第一个列表条目，回退到 `main`）。

当绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，**所有提供的字段都必须匹配**该绑定才能应用。

匹配的代理决定了使用哪个工作区和会话存储。

## 广播组（运行多个代理）

广播组允许您在 OpenClaw 通常会回复时为同一对等方运行**多个代理**（例如：在 WhatsApp 组中，在提及/激活门控之后）。

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

请参阅：[广播组](/zh/channels/broadcast-groups)。

## 配置概述

- `agents.list`：命名的代理定义（工作区、模型等）。
- `bindings`：将入站渠道/账户/对等方映射到代理。

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

会话存储位于状态目录下（默认为 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 记录与存储并存

您可以通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

Gateway(网关) 和 ACP 会话发现也会扫描默认 `agents/` 根目录和模板化 `session.store` 根目录下的基于磁盘的代理存储。发现的存储必须保留在该解析的代理根目录内，并使用常规 `sessions.json` 文件。符号链接和根目录外的路径将被忽略。

## WebChat 行为

WebChat 附加到**选定的代理**，默认为该代理的主会话。因此，WebChat 让您可以在一个位置查看该代理的跨渠道上下文。

## 回复上下文

入站回复包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如果可用）。
- 引用的上下文作为 `[Replying to ...]` 块附加到 `Body`。

这在所有渠道中是一致的。

## 相关

- [组](/zh/channels/groups)
- [广播组](/zh/channels/broadcast-groups)
- [配对](/zh/channels/pairing)
