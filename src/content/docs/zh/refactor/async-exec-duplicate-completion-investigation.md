---
summary: "关于重复异步执行完成注入的调查笔记"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "异步执行重复完成调查"
---

# 异步执行重复完成调查

## 范围

- 会话：`agent:main:telegram:group:-1003774691294:topic:1`
- 症状：针对会话/运行 `keen-nexus` 的同一个异步执行完成事件在 LCM 中被作为用户轮次记录了两次。
- 目标：确定这最可能是重复会话注入还是普通的出站交付重试。

## 结论

这最可能是 **重复会话注入**，而不是纯粹的出站交付重试。

网关端最明显的漏洞在 **节点执行完成路径** 中：

1. 节点端执行完成会发出 `exec.finished`，其中包含完整的 `runId`。
2. Gateway(网关) `server-node-events` 将其转换为系统事件并请求心跳。
3. 心跳运行将排空的系统事件块注入到代理提示中。
4. 嵌入式运行器将该提示作为新的用户轮次持久化到会话记录中。

如果相同的 `exec.finished` 由于任何原因（重放、重连重复、上游重发、重复的生产者）两次到达同一 `runId` 的网关，OpenClaw 目前在此路径上**没有以 `runId`/`contextKey` 为键的幂等性检查**。第二个副本将成为具有相同内容的第二条用户消息。

## 精确代码路径

### 1. 生产者：节点执行完成事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 发出带有事件 `exec.finished` 的 `node.event`。
  - Payload includes `sessionKey` and full `runId`。

### 2. Gateway(网关) 事件摄入

- `src/gateway/server-node-events.ts:574-640`
  - 处理 `exec.finished`。
  - 构建文本：
    - `Exec finished (node=..., id=<runId>, code ...)`
  - 通过以下方式将其加入队列：
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - 立即请求唤醒：
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. 系统事件去重薄弱环节

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` 仅抑制 **连续重复的文本**：
    - `if (entry.lastText === cleaned) return false`
  - 它存储 `contextKey`，但 **不** 使用 `contextKey` 进行幂等性处理。
  - 排空后，重复抑制会重置。

这意味着即使代码已经有一个稳定的幂等候选者 (`exec:<runId>`)，具有相同 `runId` 的重放 `exec.finished` 也可以在稍后被再次接受。

### 4. 唤醒处理不是主要的重复原因

- `src/infra/heartbeat-wake.ts:79-117`
  - 唤醒由 `(agentId, sessionKey)` 合并。
  - 针对同一目标的重复唤醒请求会折叠为一个待处理的唤醒条目。

这使得**仅凭重复的唤醒处理**比重复事件摄取更难以解释该问题。

### 5. 心跳消耗事件并将其转化为提示输入

- `src/infra/heartbeat-runner.ts:535-574`
  - Preflight 查看待处理的系统事件并对执行事件运行进行分类。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 排空该会话的队列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 已耗尽的系统事件块被前置到代理提示体中。

### 6. 副本注入点

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 将完整提示提交到嵌入式 PI 会话。
  - 这就是从完成生成的提示转变为持久化用户轮次的地方。

因此，一旦同一个系统事件被两次重建到提示中，就会出现重复的 LCM 用户消息。

## 为什么普通出站交付重试的可能性较小

心跳运行器中确实存在一条真实的出站失败路径：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 首先生成回复。
  - 出站交付随后通过 `deliverOutboundPayloads(...)` 进行。
  - 那里的失败返回 `{ status: "failed" }`。

然而，对于同一个系统事件队列条目，仅凭这一点**不足以**解释重复的用户轮次：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - 系统事件队列在出站投递之前已被清空。

因此，仅靠渠道发送重试本身无法重建完全相同的排队事件。这可以解释外部投递缺失/失败，但本身不足以解释第二条相同的会话用户消息。

## 次要的、可能性较低的推测

代理运行器中存在一个完整运行重试循环：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些瞬时失败可以重试整个运行并重新提交相同的 `commandBody`。

如果在触发重试条件之前提示词已被追加，这可能会在**同一次回复执行中**复制已持久化的用户提示词。

我将其排在重复 `exec.finished` 摄取的可能性之后，原因如下：

- 观察到的间隔约为 51 秒，这看起来更像是第二次唤醒/轮次，而不是进程内的重试；
- 该报告已经提到了重复的消息发送失败，这更多地指向了一个稍后单独的轮次，而不是即时的模型/运行时重试。

## 根本原因假设

最高置信度假设：

- `keen-nexus` 完成是通过 **节点执行事件路径** 传递的。
- 同一个 `exec.finished` 被传递给了 `server-node-events` 两次。
- Gateway(网关) 接受了两者，因为 `enqueueSystemEvent(...)` 不根据 `contextKey` / `runId` 进行去重。
- 每个被接受的事件都触发了一次心跳，并作为用户轮次注入到了 PI 副本中。

## 建议的小范围修复

如果需要修复，最小的高价值改动是：

- 使执行/系统事件的幂等性在短时间内尊重 `contextKey`，至少对于完全相同的 `(sessionKey, contextKey, text)` 重复；
- 或者在 `server-node-events` 中为以 `(sessionKey, runId, event kind)` 为键的 `exec.finished` 添加专门的去重逻辑。

这将直接在重放的 `exec.finished` 重复项变成会话轮次之前将其拦截。
