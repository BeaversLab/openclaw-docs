---
summary: "用于非精确提醒的推断性跟进记忆"
title: "推断承诺"
sidebarTitle: "承诺"
read_when:
  - You want OpenClaw to remember natural follow-ups
  - You want to understand how inferred check-ins differ from reminders
  - You want to review or dismiss follow-up commitments
---

承诺是短暂的跟进记忆。启用后，OpenClaw 可以注意到对话产生了未来的跟进机会，并记住稍后将其带回。

示例：

- 你提到明天有一个面试。OpenClaw 可能会在事后跟进。
- 你说你筋疲力尽。OpenClaw 可能稍后会问你睡没睡。
- 代理说它会在情况发生变化后跟进。OpenClaw 可能会追踪这个未完成的闭环。

承诺不是像 `MEMORY.md`OpenClaw 那样的持久性事实，也不是精确的提醒。它们介于记忆和自动化之间：OpenClaw 记住受对话约束的义务，然后在到期时由 heartbeat 传递它。

## 启用承诺

承诺默认处于关闭状态。在配置中启用它们：

```bash
openclaw config set commitments.enabled true
openclaw config set commitments.maxPerDay 3
```

等效的 `openclaw.json`：

```json
{
  "commitments": {
    "enabled": true,
    "maxPerDay": 3
  }
}
```

`commitments.maxPerDay` 限制了在滚动的一天中每个代理会话可以传递多少推断的跟进。默认值是 `3`。

## 工作原理

在代理回复后，OpenClaw 可能会在单独的上下文中运行隐藏的后台提取过程。该过程仅查找推断的跟进承诺。它不会写入可见的对话，也不会要求主代理对提取进行推理。

当它发现一个高置信度的候选项时，OpenClaw 会存储一个包含以下内容的承诺：

- 代理 ID
- 会话密钥
- 原始渠道和传递目标
- 到期时间窗口
- 简短的建议跟进内容
- 非指令性元数据，供 heartbeat 决定是否发送它

交付通过 heartbeat 进行。当承诺到期时，heartbeat 会将该承诺添加到同一代理和渠道范围的 heartbeat 轮次中。模型可以发送一个自然的回复或 `HEARTBEAT_OK` 来将其关闭。如果 heartbeat 配置了 `target: "none"`，到期的承诺将保留在内部，不会发送外部回复。承诺交付提示不会重播原始对话文本，并且到期的承诺 heartbeat 轮次运行时不使用 OpenClaw 工具。

OpenClaw 永远不会在写入推断承诺后立即交付。到期时间被限制为在创建承诺后至少一个 heartbeat 间隔，因此后续无法在推断的同一时刻回显。

## 范围

承诺的范围限定在创建它们的确切代理和渠道上下文内。在与 Discord 中的一个代理交谈时推断的后续，不会由另一个代理、另一个渠道或无关的会话交付。

此范围是该功能的一部分。自然的回复应该感觉像是同一对话的延续，而不是全局提醒系统。

## 承诺与提醒

| 需求                               | 用途                                 |
| ---------------------------------- | ------------------------------------ |
| "下午 3 点提醒我"                  | [计划任务](/zh/automation/cron-jobs) |
| "20 分钟后 ping 我"                | [计划任务](/zh/automation/cron-jobs) |
| "每个工作日运行此报告"             | [计划任务](/zh/automation/cron-jobs) |
| "我明天有个面试"                   | 承诺                                 |
| "我通宵没睡"                       | 承诺                                 |
| "如果我不回复这个开放话题，请跟进" | 承诺                                 |

明确的用户请求已经属于调度器路径。承诺仅用于推断的后续：即用户未要求提醒，但对话明显创造了有用的未来检查点的时刻。

## 管理承诺

使用 CLI 检查和清除存储的承诺：

```bash
openclaw commitments
openclaw commitments --all
openclaw commitments --agent main
openclaw commitments --status snoozed
openclaw commitments dismiss cm_abc123
```

有关命令参考，请参阅 [`openclaw commitments`](/zh/cli/commitments)。

## 隐私和成本

承诺提取使用 LLM 传递，因此启用它会在符合条件的轮次后增加后台模型使用。该传递对用户可见的对话是隐藏的，但它可以读取最近的交换以确定是否存在后续。

存储的承诺是本地 OpenClaw 状态。它们是操作内存，而非长期记忆。使用以下方式禁用该功能：

```bash
openclaw config set commitments.enabled false
```

## 故障排除

如果预期的后续跟进未出现：

- 确认 `commitments.enabled` 为 `true`。
- 检查 `openclaw commitments --all` 中是否有待处理、已忽略、已延迟或已过期的记录。
- 确保代理的心跳正在运行。
- 检查该代理会话是否已达到 `commitments.maxPerDay`。
- 请记住，精确的提醒会被承诺提取跳过，而应出现在[计划任务](/zh/automation/cron-jobs)中。

## 相关内容

- [记忆概述](/zh/concepts/memory)
- [活动记忆](/zh/concepts/active-memory)
- [心跳](/zh/gateway/heartbeat)
- [计划任务](/zh/automation/cron-jobs)
- [`openclaw commitments`](/zh/cli/commitments)
- [配置参考](/zh/gateway/configuration-reference#commitments)
