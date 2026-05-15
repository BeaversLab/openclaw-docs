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

### 停靠关联渠道

停靠命令允许用户将当前直接聊天会话的回复路由移动到另一个关联渠道，而无需启动新会话。有关示例、配置和故障排除，请参阅 [渠道停靠](/zh/concepts/channel-docking)。

使用 `openclaw security audit` 验证您的设置。

## 会话生命周期

会话会被重复使用，直到它们过期：

- **每日重置**（默认）—— 在网关主机本地时间凌晨 4:00 开始新会话。每日的新鲜度基于当前 `sessionId` 何时启动，而不是基于后续的元数据写入。
- **空闲重置**（可选）—— 在一段不活动时间后开始新会话。设置 `session.reset.idleMinutes`。空闲的新鲜度基于最后一次真实的用户/渠道交互，因此心跳、cron 和 exec 系统事件不会保持会话活跃。
- **手动重置** —— 在聊天中输入 `/new` 或 `/reset`。`/new <model>` 也会切换模型。

当同时配置了每日重置和空闲重置时，以先到期的为准。心跳、cron、exec 和其他系统事件回合可能会写入会话元数据，但这些写入不会延长每日或空闲重置的新鲜度。当重置滚动会话时，旧会话的排队系统事件通知将被丢弃，以免陈旧的背景更新被添加到新会话的第一个提示之前。

拥有活跃提供商拥有的 CLI 会话的会话不会被隐式的每日默认设置所切断。当这些会话应该基于计时器过期时，请使用 `/reset` 或显式配置 `session.reset`。

## 状态所在位置

所有会话状态归 **网关** 所有。UI 客户端向网关查询会话数据。

- **存储：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- ** transcripts：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` 保留单独的生命周期时间戳：

- `sessionStartedAt`：当前 `sessionId` 开始的时间；每日重置使用此时间。
- `lastInteractionAt`：延长空闲生存期的最后一次用户/渠道交互。
- `updatedAt`：最后一次存储行变更；用于列出和清理，但对于每日/空闲重置的新鲜度不具有权威性。

如果没有 `sessionStartedAt`，较旧的行会在可用时从 transcript JSONL 会话头中解析。如果较旧的行也缺少 `lastInteractionAt`，空闲的新鲜度将回退到该会话的开始时间，而不是回退到后续的簿记写入时间。

## 会话维护

OpenClaw 会自动限制随时间推移的会话存储。默认情况下，它在 `warn` 模式下运行（报告将被清理的内容）。将 `session.maintenance.mode` 设置为 `"enforce"` 以启用自动清理：

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

对于生产级别的 `maxEntries` 限制，Gateway(网关) 运行时写入使用一个较小的缓冲区，并分批清理回配置的上限。会话存储读取不会在 Gateway(网关) 启动期间修剪或限制条目。这避免了在每次启动或隔离的 cron 会话时运行完整的存储清理。`openclaw sessions cleanup --enforce` 会立即应用上限。

维护会保留持久的外部会话指针，包括群组会话和线程范围的聊天会话，同时仍允许合成的 cron、hook、心跳、ACP 和子代理条目过期。

如果您之前使用了私信隔离，后来将 `session.dmScope` 返回为 `main`，请使用 `openclaw sessions cleanup --dry-run --fix-dm-scope` 预览过时的对端键控私信行。应用相同的标记将淘汰那些旧的直接私信行，并将其转录内容保留为已删除的存档。

使用 `openclaw sessions cleanup --dry-run` 进行预览。

## 检查会话

- `openclaw status` -- 会话存储路径和最近活动。
- `openclaw sessions --json` -- 所有会话（使用 `--active <minutes>` 过滤）。
- 聊天中的 `/status` -- 上下文使用情况、模型和开关。
- `/context list` -- 系统提示词中的内容。

## 延伸阅读

- [会话修剪](/zh/concepts/session-pruning) -- 修剪工具结果
- [压缩](/zh/concepts/compaction) -- 总结长对话
- [会话工具](/zh/concepts/session-tool) -- 用于跨会话工作的代理工具
- [会话管理深入解析](/zh/reference/session-management-compaction) --
  存储架构、记录副本、发送策略、来源元数据和高级配置
- [多代理](/zh/concepts/multi-agent) — 跨代理的路由和会话隔离
- [后台任务](/zh/automation/tasks) — 独立工作如何创建带有会话引用的任务记录
- [通道路由](/zh/channels/channel-routing) — 入站消息如何路由到会话

## 相关

- [会话清理](/zh/concepts/session-pruning)
- [会话工具](/zh/concepts/session-tool)
- [命令队列](/zh/concepts/queue)
