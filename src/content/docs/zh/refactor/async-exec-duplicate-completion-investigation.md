---
summary: "关于重复异步执行完成注入的调查笔记"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "异步执行重复完成调查"
---

## 范围

- 会话：`agent:main:telegram:group:-1003774691294:topic:1`
- 症状：针对会话/运行 `keen-nexus` 的同一个异步执行完成事件在 LCM 中被记录了两次，作为用户轮次。
- 目标：确定这最可能是重复的会话注入还是普通的出站投递重试。

## 结论

最可能是 **重复的会话注入**，而不是纯粹的出站投递重试。

最强的 Gateway(网关) 侧缺陷在于 **节点执行完成路径**：

1. 节点侧执行结束发出带有完整 `runId` 的 `exec.finished`。
2. Gateway(网关) `server-node-events` 将其转换为系统事件并请求心跳。
3. 心跳运行将排空的系统事件块注入到 Agent 提示词中。
4. 嵌入式运行器将该提示词作为新的用户轮次持久化到会话记录中。

如果同一个 `exec.finished` 由于任何原因（重放、重连重复、上游重发、生产者重复）针对同一个 `runId` 两次到达 OpenClaw，则 OpenClaw 当前在此路径上**没有基于 `runId`/`contextKey` 的幂等性检查**。第二个副本将成为具有相同内容的第二条用户消息。

## 确切代码路径

### 1. 生产者：节点执行完成事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 发出带有事件 `exec.finished` 的 `node.event`。
  - 载荷包括 `sessionKey` 和完整的 `runId`。

### 2. Gateway(网关) 事件摄入

- `src/gateway/server-node-events.ts:574-640`
  - 处理 `exec.finished`。
  - 构建文本：
    - `Exec finished (node=..., id=<runId>, code ...)`
  - 通过以下方式将其排队：
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - 立即请求唤醒：
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. 系统事件去重弱点

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` 仅抑制 **连续的重复文本**：
    - `if (entry.lastText === cleaned) return false`
  - 它存储了 `contextKey`，但并**未**使用 `contextKey` 来保证幂等性。
  - 排空（drain）之后，重复抑制会重置。

这意味着，即使代码已经拥有稳定的幂等候选（`exec:<runId>`），带有相同 `runId` 的重放 `exec.finished` 也可以在稍后被再次接受。

### 4. Wake 处理不是主要致复因素

- `src/infra/heartbeat-wake.ts:79-117`
  - Wake 由 `(agentId, sessionKey)` 合并处理。
  - 针对同一目标的重复 Wake 请求会合并为一个待处理的 Wake 条目。

这使得仅凭**重复的 Wake 处理**比重复的事件摄取更难以解释该问题。

### 5. 心跳消费事件并将其转换为提示输入

- `src/infra/heartbeat-runner.ts:535-574`
  - Preflight（预检）会查看待处理的系统事件并对 exec-event 运行进行分类。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 排空了该会话的队列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 排空的系统事件块被添加到 agent 提示体的开头。

### 6. 副本注入点

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 将完整的提示提交给嵌入式 PI 会话。
  - 这就是派生自 completion 的提示转变为持久化用户轮次（turn）的点。

因此，一旦同一系统事件被两次重建到提示中，就会出现重复的 LCM 用户消息。

## 为什么简单的出站交付重试可能性较低

在心跳运行器中确实存在出站失败路径：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 回复首先被生成。
  - 出站交付稍后通过 `deliverOutboundPayloads(...)` 进行。
  - 此处的失败会返回 `{ status: "failed" }`。

然而，对于同一个系统事件队列条目，仅凭这一点**不足以**解释重复的用户轮次：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - 系统事件队列在出站交付之前就已经被排空。

因此，渠道发送重试本身不会重新创建完全相同的排队事件。它可以解释外部投递的缺失/失败，但不能单独解释第二条相同的会话用户消息。

## 次要的、置信度较低的可能性

在 agent 运行器中存在一个完整的运行重试循环：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些瞬态故障可能会重试整个运行并重新提交相同的 `commandBody`。

如果在触发重试条件之前提示词已经追加，这可能会在同一次回复执行中重复持久化的用户提示词。

我将此排在重复 `exec.finished` 摄入的可能性之后，因为：

- 观察到的间隔大约是 51 秒，这看起来更像是第二次唤醒/轮次，而不是进程内重试；
- 报告已经提到了重复的消息发送失败，这更多地指向一个单独的后续轮次，而不是即时的模型/运行时重试。

## 根本原因假设

高置信度假设：

- `keen-nexus` 完成通过 **node exec event path** 到达。
- 相同的 `exec.finished` 被传递到 `server-node-events` 两次。
- Gateway(网关) 接受了两者，因为 `enqueueSystemEvent(...)` 不根据 `contextKey` / `runId` 去重。
- 每个接受的事件都触发了一次心跳，并作为用户轮次注入到 PI 转录中。

## 提议的小范围修复

如果需要修复，最小的高价值更改是：

- 使执行/系统事件幂等性在短时间内尊重 `contextKey`，至少对于完全相同的 `(sessionKey, contextKey, text)` 重复；
- 或者在 `server-node-events` 中为 `exec.finished` 添加专用的去重，键为 `(sessionKey, runId, event kind)`。

这将直接在重放的 `exec.finished` 重复项变成会话轮次之前将其阻止。

## 相关

- [Exec 工具](/zh/tools/exec)
- [Session management](/zh/concepts/session)
