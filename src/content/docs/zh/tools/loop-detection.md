---
summary: "如何启用和调整检测重复工具调用循环的防护机制"
title: "工具循环检测"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
  - You hit `compaction_loop_persisted` aborts after a context-overflow retry
---

OpenClaw 针对重复工具调用模式提供了两个协同工作的防护机制：

1. **循环检测** (`tools.loopDetection.enabled`) — 默认禁用。监控滚动工具调用历史记录中的重复模式和未知工具重试。
2. **压缩后防护** (`tools.loopDetection.postCompactionGuard`) — 默认启用，除非 `tools.loopDetection.enabled` 被显式设置为 `false`。在每次压缩重试后启动，当代理在窗口内发出相同的 `(tool, args, result)` 三元组时中止运行。

两者都在同一个 `tools.loopDetection` 块中配置，但只要主开关未显式关闭，压缩后防护就会运行。设置 `tools.loopDetection.enabled: false` 以同时禁用这两个功能。

## 存在原因

- 检测无法取得进展的重复序列。
- 检测高频无结果循环（相同工具、相同输入、重复错误）。
- 检测已知轮询工具的特定重复调用模式。
- 防止上下文溢出后压缩，随后进入相同循环的无限运行周期。

## 配置块

全局默认值，显示所有记录的字段：

```json5
{
  tools: {
    loopDetection: {
      enabled: false, // master switch for the rolling-history detectors
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      unknownToolThreshold: 10,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
      postCompactionGuard: {
        windowSize: 3, // armed after compaction-retry; runs unless enabled is explicitly false
      },
    },
  },
}
```

每个代理的覆盖设置（可选）：

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### 字段行为

| 字段                             | 默认值  | 效果                                                                            |
| -------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `enabled`                        | `false` | 滚动历史记录检测器的主开关。设置 `false` 也会禁用压缩后防护。                   |
| `historySize`                    | `30`    | 保留用于分析的最近工具调用数量。                                                |
| `warningThreshold`               | `10`    | 将模式归类为仅警告之前的阈值。                                                  |
| `criticalThreshold`              | `20`    | 阻止重复的无进展循环模式的阈值。                                                |
| `unknownToolThreshold`           | `10`    | 在错过此次数后，阻止对同一不可用工具的重复调用。                                |
| `globalCircuitBreakerThreshold`  | `30`    | 所有检测器的全局无进展中断阈值。                                                |
| `detectors.genericRepeat`        | `true`  | 对重复的相同工具 + 相同参数模式发出警告，并在相同调用也返回相同结果时进行阻止。 |
| `detectors.knownPollNoProgress`  | `true`  | 检测无状态变化的已知轮询类模式。                                                |
| `detectors.pingPong`             | `true`  | 检测交替的乒乓模式。                                                            |
| `postCompactionGuard.windowSize` | `3`     | 压缩后工具调用期间防护保持激活的数量，以及中止运行的相同三元组计数。            |

对于 `exec`，无进展检查会比较稳定的命令结果，并忽略易变的运行时元数据（如持续时间、PID、会话 ID 和工作目录）。当有运行 ID 可用时，最近的工具调用历史仅在该运行内进行评估，因此预定的心跳周期和新的运行不会从之前的运行继承陈旧的循环计数。

## 推荐设置

- 对于较小的模型，请设置 `enabled: true` 并将阈值保持默认。旗舰模型很少需要滚动历史记录检测，可以将主开关保持在 `false`，同时仍能从压缩后防护中受益。
- 保持阈值顺序为 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`。
- 如果出现误报：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`。
  - 可选择提高 `globalCircuitBreakerThreshold`。
  - 仅禁用导致问题的特定检测器 (`detectors.<name>: false`)。
  - 减少 `historySize` 以降低历史记录的严格程度。
- 要禁用所有内容（包括压缩后防护），请显式设置 `tools.loopDetection.enabled: false`。

## 压缩后防护

当运行器在上下文溢出后完成压缩重试时，它会激活一个短期防护来监视接下来的几次工具调用。如果代理在该窗口内多次发出相同的 `(toolName, argsHash, resultHash)` 三元组，防护将判定压缩未打破循环，并以 `compaction_loop_persisted` 错误中止运行。

该防护机制受主 `tools.loopDetection.enabled` 标志控制，但有一个转折：**当标志未设置或为 `true` 时，它会保持启用状态**，只有当标志显式为 `false` 时才会停用。这是有意为之。该防护机制的存在是为了逃避压缩循环，否则会消耗无限的 token，因此没有进行配置的用户仍然能受到保护。

```json5
{
  tools: {
    loopDetection: {
      // master switch; set false to disable the guard along with the rolling detectors
      enabled: true,
      postCompactionGuard: {
        windowSize: 3, // default
      },
    },
  },
}
```

- 较低的 `windowSize` 更严格（中止前的尝试次数更少）。
- 较高的 `windowSize` 给予智能体更多的恢复尝试次数。
- 当结果发生变化时，防护机制绝不会中止，只有当结果在窗口内完全一致（字节级相同）时才会中止。
- 它的范围故意设计得很窄：仅在压缩重试紧随其后的后果中触发。

<Note>只要主标志未显式设置为 `false`，即使您从未编写过 `tools.loopDetection` 块，压缩后防护机制也会运行。要验证这一点，请在压缩事件发生后立即查看网关日志中的 `post-compaction guard armed for N attempts`。</Note>

## 日志和预期行为

当检测到循环时，OpenClaw 会报告一个循环事件，并根据严重程度抑制或阻止下一个工具循环。这保护用户免受失控的 token 消耗和锁定影响，同时保留正常的工具访问权限。

- 警告优先出现。
- 当模式持续超过警告阈值时，随之而来的是抑制。
- 严重阈值会阻止下一个工具循环，并在运行记录中显示明确的循环检测原因。
- 压缩后防护机制会发出 `compaction_loop_persisted` 错误，其中包含违规工具名称和相同调用计数。

## 相关

<CardGroup cols={2}>
  <Card title="Exec approvals" href="/zh/tools/exec-approvals" icon="shield">
    Shell 执行的允许/拒绝策略。
  </Card>
  <Card title="Thinking levels" href="/zh/tools/thinking" icon="brain">
    推理力度级别和提供商策略交互。
  </Card>
  <Card title="Sub-agents" href="/zh/tools/subagents" icon="users">
    生成隔离的代理以限制失控行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear">
    完整的 `tools.loopDetection` 架构和合并语义。
  </Card>
</CardGroup>
