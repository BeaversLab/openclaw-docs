# Async Exec Duplicate Completion Investigation

## 范围

- 会话： `agent:main:telegram:group:-1003774691294:topic:1`
- 症状：针对会话/运行 `keen-nexus` 的同一个异步执行完成事件在 LCM 中被记录了两次，作为用户轮次。
- 目标：确定这最可能是重复的会话注入还是普通的出站交付重试。

## 结论

最可能是 **重复的会话注入**，而不是纯出站交付重试。

Gateway 端最大的差距在于 **节点执行完成路径**：

1. 节点侧执行完成会发出带有完整 `runId` 的 `exec.finished`。
2. Gateway(网关) `server-node-events` 将其转换为系统事件并请求心跳。
3. 心跳运行将排空的系统事件块注入到 Agent 提示词中。
4. 嵌入式运行程序将该提示词作为新的用户轮次持久化到会话记录中。

如果同一个 `exec.finished` 由于任何原因（重放、重连重复、上游重发、生产者重复）针对同一个 `runId` 两次到达 Gateway，OpenClaw 目前在此路径上**没有基于 `runId`/`contextKey` 的幂等性检查**。第二个副本将成为具有相同内容的第二条用户消息。

## 确切的代码路径

### 1. 生产者：节点执行完成事件

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` 发出带有事件 `exec.finished` 的 `node.event`。
  - Payload 包含 `sessionKey` 和完整的 `runId`。

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
  - `enqueueSystemEvent(...)` 仅抑制 **连续重复文本**：
    - `if (entry.lastText === cleaned) return false`
  - 它存储 `contextKey`，但**不**使用 `contextKey` 进行幂等性检查。
  - 排空后，重复抑制会重置。

这意味着，即使代码已经有一个稳定的幂等候选者（`exec:<runId>`），稍后仍可能再次接受具有相同 `runId` 的重放 `exec.finished`。

### 4. 唤醒处理不是主要的重复原因

- `src/infra/heartbeat-wake.ts:79-117`
  - 唤醒由 `(agentId, sessionKey)` 合并。
  - 针对同一目标的重复唤醒请求会合并为一个待处理的唤醒条目。

这使得**仅靠重复的唤醒处理**比重复事件摄取更难解释这一问题。

### 5. 心跳消费事件并将其转化为提示输入

- `src/infra/heartbeat-runner.ts:535-574`
  - 预检会查看待处理的系统事件并对执行事件运行进行分类。
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` 排空会话的队列。
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - 排空的系统事件块被添加到代理提示主体的开头。

### 6. 副本注入点

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` 将完整提示提交到嵌入式 PI 会话。
  - 这就是完成生成的提示变为持久化用户轮次的点。

因此，一旦相同的系统事件被两次重新构建到提示中，预期的结果就是会出现重复的 LCM 用户消息。

## 为什么简单的出站传递重试可能性较低

在心跳运行器中确实存在一个真实的出站失败路径：

- `src/infra/heartbeat-runner.ts:1194-1242`
  - 回复先生成。
  - 出站传递稍后通过 `deliverOutboundPayloads(...)` 进行。
  - 那里的失败返回 `{ status: "failed" }`。

然而，对于相同的系统事件队列条目，仅靠这一点**不足以**解释重复的用户轮次：

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - 系统事件队列在出站传递之前已被排空。

因此，仅靠渠道发送重试本身无法重新创建完全相同的排队事件。这可以解释外部传递的缺失或失败，但不能单独解释第二条相同的会话用户消息。

## 次要、置信度较低的可能性

在代理运行器中有一个完整的运行重试循环：

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - 某些瞬态故障可以重试整个运行并重新提交相同的 `commandBody`。

如果在重试条件触发之前提示已经追加，这可能会在**同一次回复执行中**重复持久化的用户提示。

我将此排在重复的 `exec.finished` 摄取之后，因为：

- 观察到的间隔约为 51 秒，这看起来更像是第二次唤醒/轮次，而不是进程内的重试；
- 报告中已经提到了重复的消息发送失败，这指向了更可能是一个单独的后续轮次，而不是即时的模型/运行时重试。

## 根本原因假设

最高置信度假设：

- `keen-nexus` 完成通过**节点执行事件路径**到达。
- 同一个 `exec.finished` 被传递给 `server-node-events` 两次。
- Gateway(网关) 接受了两者，因为 `enqueueSystemEvent(...)` 不通过 `contextKey` / `runId` 进行去重。
- 每个接受的事件都触发了一个心跳，并作为用户轮次注入到 PI 脚本中。

## 建议的微小修复

如果需要修复，价值最高的最小改动是：

- 使执行/系统事件的幂等性在短时间内遵守 `contextKey`，至少对于完全相同的 `(sessionKey, contextKey, text)` 重复；
- 或者在 `server-node-events` 中为 `exec.finished` 添加一个专用的去重机制，以 `(sessionKey, runId, event kind)` 为键。

这将直接在重放的 `exec.finished` 重复项变成会话轮次之前将其拦截。
