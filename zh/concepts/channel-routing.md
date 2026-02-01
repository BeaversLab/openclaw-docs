---
summary: "各渠道（WhatsApp、Telegram、Discord、Slack）的路由规则与共享上下文"
read_when:
  - 修改渠道路由或收件箱行为时
---
# Channels 与路由

OpenClaw 会把回复**路由回消息来源的渠道**。模型不会选择渠道；路由是确定性的，由主机配置控制。

## 关键术语

- **Channel**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：每个渠道的账号实例（如支持）。
- **AgentId**：隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey**：用于存储上下文并控制并发的桶键。

## Session key 形态（示例）

私信会折叠到 agent 的**主**会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

群组与频道按渠道隔离：

- Groups: `agent:<agentId>:<channel>:group:<id>`
- Channels/rooms: `agent:<agentId>:<channel>:channel:<id>`

Threads：

- Slack/Discord 线程在基键末尾追加 `:thread:<threadId>`。
- Telegram 论坛话题将 `:topic:<topicId>` 嵌入 group 键中。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 路由规则（如何选择 agent）

路由为每条入站消息选择**一个 agent**：

1. **精确 peer 匹配**（`bindings` 中的 `peer.kind` + `peer.id`）。
2. **Guild 匹配**（Discord）使用 `guildId`。
3. **Team 匹配**（Slack）使用 `teamId`。
4. **Account 匹配**（渠道上的 `accountId`）。
5. **Channel 匹配**（该渠道的任意账号）。
6. **默认 agent**（`agents.list[].default`，否则列表首项，最终回退到 `main`）。

匹配到的 agent 决定使用哪个工作区与会话存储。

## Broadcast groups（运行多个 agent）

Broadcast groups 允许在**OpenClaw 通常会回复**的情况下，为同一 peer 运行**多个 agent**（例如：在 WhatsApp 群组中，经过 mention/activation 门控后）。

配置：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"]
  }
}
```

参见：[Broadcast Groups](/zh/broadcast-groups)。

## 配置概览

- `agents.list`：具名 agent 定义（工作区、模型等）。
- `bindings`：将入站渠道/账号/peer 映射到 agent。

示例：

```json5
{
  agents: {
    list: [
      { id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }
    ]
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" }
  ]
}
```

## 会话存储

会话存储位于状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 转录与存储并置

你可以通过 `session.store` 与 `{agentId}` 模板覆盖存储路径。

## WebChat 行为

WebChat 绑定**选定的 agent**，默认使用该 agent 的主会话。
因此，WebChat 允许你在一个位置查看该 agent 的跨渠道上下文。

## 回复上下文

入站回复包含：
- `ReplyToId`、`ReplyToBody`、`ReplyToSender`（若可用）。
- 引用上下文会以 `[Replying to ...]` 块追加到 `Body`。

这在各渠道间一致。
