---
summary: "OpenClaw 如何管理对话会话"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
  - You are debugging daily or idle session resets
title: "会话管理"
---

OpenClaw 将对话组织为 **会话**。每条消息根据其来源——私信、群聊、定时任务等——被路由到一个会话。

## 消息如何路由

| 来源      | 行为             |
| --------- | ---------------- |
| 私信      | 默认共享会话     |
| 群聊      | 按群组隔离       |
| 房间/渠道 | 按房间隔离       |
| 定时任务  | 每次运行全新会话 |
| Webhooks  | 按钩子隔离       |

## 私信隔离

默认情况下，所有私信共享一个会话以保持连续性。这对于单用户设置是可以的。

<Warning>如果多个人可以向您的代理发送消息，请启用私信隔离。否则，所有用户共享同一个对话上下文——Alice 的私人消息对 Bob 可见。</Warning>

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

会话会被重用，直到过期：

- **每日重置**（默认）——网关主机当地时间凌晨 4:00 开始新会话。每日的新鲜度基于当前 `sessionId` 启动的时间，而不是后续的元数据写入。
- **空闲重置**（可选）——经过一段不活动时间后开始新会话。设置 `session.reset.idleMinutes`。空闲新鲜度基于最后一次真实的用户/渠道交互，因此心跳、定时任务和 exec 系统事件不会保持会话活动状态。
- **手动重置**——在聊天中输入 `/new` 或 `/reset`。`/new <model>` 也会切换模型。

当同时配置了每日重置和空闲重置时，以先到期的为准。心跳、cron、exec 和其他系统事件轮次可能会写入会话元数据，但这些写入不会延长每日或空闲重置的新鲜度。当重置滚动会话时，旧会话的排队系统事件通知将被丢弃，以免陈旧的背景更新被添加到新会话的第一个提示之前。

具有活跃提供商拥有的 CLI 会话的会话不会被隐式每日默认值切断。当这些会话应根据计时器过期时，请使用 `/reset` 或显式配置 `session.reset`。

## 状态存储位置

所有会话状态均由 **网关** 拥有。UI 客户端向网关查询会话数据。

- **存储：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **记录：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` 保持独立的生命周期时间戳：

- `sessionStartedAt`：当前 `sessionId` 开始的时间；每日重置使用此时间。
- `lastInteractionAt`：延长空闲生命周期的最后一次用户/渠道交互。
- `updatedAt`：最后一次存储行变更；用于列出和修剪，但对于每日/空闲重置新鲜度不具有决定性。

如果没有 `sessionStartedAt`，较旧的行将在可用时从记录 JSONL 会话头中解析。如果较旧的行也缺少 `lastInteractionAt`，则空闲新鲜度将回退到该会话开始时间，而不是回退到后续的簿记写入。

## 会话维护

OpenClaw 会随着时间的推移自动限制会话存储。默认情况下，它以 `warn` 模式运行（报告将清理的内容）。将 `session.maintenance.mode` 设置为 `"enforce"` 以进行自动清理：

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

对于生产规模的 `maxEntries` 限制，Gateway(网关) 运行时写入使用一个较小的高水位缓冲区，并分批清理回配置的上限。这避免了在每个隔离的 cron 会话上运行完整的存储清理。`openclaw sessions cleanup --enforce` 立即应用上限。

使用 `openclaw sessions cleanup --dry-run` 预览。

## 检查会话

- `openclaw status` -- 会话存储路径和最近的活动。
- `openclaw sessions --json` -- 所有会话（使用 `--active <minutes>` 过滤）。
- `/status` in chat -- 上下文使用、模型和开关。
- `/context list` -- 系统提示词中的内容。

## 延伸阅读

- [Session Pruning](/zh/concepts/session-pruning) -- 裁剪工具结果
- [Compaction](/zh/concepts/compaction) -- 总结长对话
- [Session Tools](/zh/concepts/session-tool) -- 用于跨会话工作的代理工具
- [Session Management Deep Dive](/zh/reference/session-management-compaction) --
  存储架构、记录、发送策略、源元数据和高级配置
- [Multi-Agent](/zh/concepts/multi-agent) — 代理之间的路由和会话隔离
- [Background Tasks](/zh/automation/tasks) — 独立工作如何创建带有会话引用的任务记录
- [Channel Routing](/zh/channels/channel-routing) — 入站消息如何路由到会话

## 相关

- [Session pruning](/zh/concepts/session-pruning)
- [Session tools](/zh/concepts/session-tool)
- [Command queue](/zh/concepts/queue)
