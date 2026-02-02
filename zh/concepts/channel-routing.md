---
summary: "按频道路由规则（WhatsApp、Telegram、Discord、Slack）与共享上下文"
read_when:
  - 需要修改频道路由或收件箱行为
title: "Channel Routing"
---
# 频道和路由


OpenClaw 会将回复 **路由回消息来源的频道**。模型不会选择频道；路由是确定性的，并由主机配置控制。

## 关键术语

- **Channel**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：按频道区分的账号实例（若支持）。
- **AgentId**：隔离的 workspace + 会话存储（“大脑”）。
- **SessionKey**：用于存储上下文并控制并发的桶键。

## Session key 形态（示例）

私聊会折叠到该 agent 的 **main** 会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

群组与频道保持按频道隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程会在基础 key 后追加 `:thread:<threadId>`。
- Telegram forum 话题在群组 key 中包含 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 路由规则（如何选择 agent）

路由会为每条入站消息选择 **一个 agent**：

1. **精确 peer 匹配**（`bindings` 中的 `peer.kind` + `peer.id`）。
2. **Guild 匹配**（Discord）通过 `guildId`。
3. **Team 匹配**（Slack）通过 `teamId`。
4. **Account 匹配**（频道上的 `accountId`）。
5. **Channel 匹配**（该频道的任意账号）。
6. **默认 agent**（`agents.list[].default`，否则列表第一个，回退到 `main`）。

匹配到的 agent 决定所使用的 workspace 与会话存储。

## Broadcast groups（运行多个 agents）

Broadcast groups 允许在 OpenClaw **通常会回复的场景**下，为同一 peer 运行 **多个 agents**
（例如：在 WhatsApp 群组中，经过 mention/activation gating 后）。

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

- `agents.list`：具名 agent 定义（workspace、model 等）。
- `bindings`：将入站频道/账号/peer 映射到 agent。

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
- JSONL 转录与其并存

可通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

## WebChat 行为

WebChat 绑定到 **选中的 agent**，默认使用该 agent 的 main 会话。因为如此，
WebChat 可以在一个位置查看该 agent 跨频道的上下文。

## 回复上下文

入站回复包含：
- 可用时附带 `ReplyToId`、`ReplyToBody`、`ReplyToSender`。
- 引用上下文会作为 `[Replying to ...]` 块追加到 `Body`。

这在各频道中一致。
