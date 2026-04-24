---
summary: "OpenClaw 如何管理对话会话"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
title: "会话管理"
---

# 会话管理

OpenClaw 将对话组织为 **会话**。每条消息根据其来源——私信、群聊、定时任务等——被路由到一个会话。

## 消息如何路由

| 来源      | 行为           |
| --------- | -------------- |
| 私信      | 默认共享会话   |
| 群聊      | 按群组隔离     |
| 房间/渠道 | 按房间隔离     |
| 定时任务  | 每次运行新会话 |
| Webhooks  | 按 Hook 隔离   |

## 私信隔离

默认情况下，所有私信共享一个会话以保持连贯性。这对于单用户设置来说没问题。

<Warning>如果多个人可以给您的 Agent 发消息，请启用私信隔离。否则，所有用户共享同一个对话上下文——Alice 的私人消息将 Bob 可见。</Warning>

**解决方案：**

```json5
{
  session: {
    dmScope: "per-channel-peer", // isolate by channel + sender
  },
}
```

其他选项：

- `main`（默认）——所有私信共享一个会话。
- `per-peer`——按发送者隔离（跨渠道）。
- `per-channel-peer`——按渠道 + 发送者隔离（推荐）。
- `per-account-channel-peer`——按账户 + 渠道 + 发送者隔离。

<Tip>如果同一个人通过多个渠道联系您，请使用 `session.identityLinks` 链接他们的身份，以便他们共享一个会话。</Tip>

使用 `openclaw security audit` 验证您的设置。

## 会话生命周期

会话会被重复使用，直到过期：

- **每日重置**（默认）——网关主机当地时间凌晨 4:00 开始新会话。
- **闲置重置**（可选）——一段不活动时间后开始新会话。设置
  `session.reset.idleMinutes`。
- **手动重置**——在聊天中输入 `/new` 或 `/reset`。`/new <model>` 也会
  切换模型。

当同时配置了每日重置和闲置重置时，以先到期的为准。

具有活跃提供商拥有的 CLI 会话的会话不会受到隐式每日默认截止的影响。当这些会话应基于定时器过期时，请使用 `/reset` 或显式配置 `session.reset`。

## 状态存储位置

所有会话状态均由 **网关（gateway）** 拥有。UI 客户端向网关查询会话数据。

- **存储（Store）：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **记录（Transcripts）：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

## 会话维护

OpenClaw 会自动随时间限制会话存储。默认情况下，它以 `warn` 模式运行（报告将被清理的内容）。将 `session.maintenance.mode` 设置为 `"enforce"` 以进行自动清理：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

使用 `openclaw sessions cleanup --dry-run` 预览。

## 检查会话

- `openclaw status` -- 会话存储路径和最近活动。
- `openclaw sessions --json` -- 所有会话（使用 `--active <minutes>` 过滤）。
- `/status` in chat -- 上下文使用、模型和开关。
- `/context list` -- 系统提示词中的内容。

## 延伸阅读

- [Session Pruning](/zh/concepts/session-pruning) -- 裁剪工具结果
- [Compaction](/zh/concepts/compaction) -- 总结长对话
- [Session Tools](/zh/concepts/session-tool) -- 用于跨会话工作的代理工具
- [Session Management Deep Dive](/zh/reference/session-management-compaction) --
  存储架构、记录、发送策略、源元数据和高级配置
- [Multi-Agent](/zh/concepts/multi-agent) — 跨代理的路由和会话隔离
- [Background Tasks](/zh/automation/tasks) — 分离的工作如何创建带有会话引用的任务记录
- [通道路由](/zh/channels/channel-routing) — 如何将入站消息路由到会话
