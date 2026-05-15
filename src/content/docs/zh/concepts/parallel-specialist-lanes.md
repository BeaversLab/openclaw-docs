---
summary: "运行并行专用代理，而不会阻塞共享的模型和工具容量"
title: "并行专用通道"
sidebarTitle: "专用通道"
read_when:
  - You route group chats to dedicated agents
  - You want parallel work without one long task blocking every chat
  - You are designing a multi-agent operations setup
status: active
---

并行专用通道允许一个 Gateway(网关) 将不同的聊天或房间路由到不同的代理，同时保持用户体验快速。关键在于将并行性视为一种稀缺资源的设计问题，而不仅仅是“更多代理”。

## 第一性原理

只有当专用通道减少了对真正瓶颈的争用时，它才能提高吞吐量：

- **会话锁**：一次运行应只更改一个给定的会话。
- **全局模型容量**：所有可见的聊天运行仍然共享提供商限制。
- **工具容量**：Shell、浏览器、网络和存储库工作可能比模型轮次本身更慢。
- **上下文预算**：长记录会使未来的每次轮次变慢且不够专注。
- **所有权模糊**：执行相同工作的重复代理会浪费容量。

OpenClaw 已经对每个会话的运行进行了序列化，并通过[命令队列](OpenClaw/en/concepts/queue)限制了全局并行性。专用通道在此基础上增加了策略：哪个代理拥有哪项工作，什么保留在聊天中，什么成为后台工作。

## 推荐的推广步骤

### 第 1 阶段：通道契约 + 后台繁重工作

在其工作区和系统提示中，为每个通道提供书面契约：

- **目的**：该通道拥有的工作。
- **非目标**：它应该移交而不是尝试去做的工作。
- **聊天预算**：快速回答保留在聊天中；长任务应简要确认，然后在后台子代理或任务中运行。
- **移交规则**：当另一个通道拥有该工作时，说明它应该去哪里，并提供简洁的移交摘要。
- **工具风险规则**：首选能够完成工作的最小工具表面。

这是最廉价的阶段，可以解决大部分阻塞问题：一个编码任务不再会让研究通道像胶水一样停滞不前，并且每个聊天都保持其自己的上下文整洁。

### 第 2 阶段：优先级和并发控制

围绕每个通道的业务价值调整队列和模型容量：

```json5
{
  agents: {
    defaults: {
      maxConcurrent: 4,
      subagents: { maxConcurrent: 8, delegationMode: "prefer" },
    },
  },
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
    },
  },
}
```

对于高优先级工作，请使用直接/个人聊天和生产运维智能体。当系统繁忙时，让研究、起草和批量编码工作转移到后台任务。

### 第 3 阶段：协调器 / 流量控制器

一旦激活了多条通道，请添加一个小型的协调器模式：

- 跟踪活跃的通道任务和所有者。
- 检测跨组的重复请求。
- 在通道之间路由交接摘要。
- 仅展示阻碍因素、已完成结果以及人类必须做出的决策。

不要从这里开始。没有通道契约的协调器只是在协调混乱。

## 最小通道契约模板

```md
# Lane contract

## Owns

- <job this lane is responsible for>

## Does not own

- <work to hand off>

## Chat budget

- Answer quick questions directly.
- For multi-step, slow, or tool-heavy work: acknowledge briefly, spawn/background
  the work, then return the result when complete.

## Handoff

If another lane owns the request, reply with:

- target lane
- objective
- relevant context
- exact next action

## Tool posture

Use the smallest tool surface that can complete the task. Avoid broad shell or
network work unless this lane explicitly owns it.
```

## 相关

- [多智能体路由](/zh/concepts/multi-agent)
- [命令队列](/zh/concepts/queue)
- [子智能体](/zh/tools/subagents)
