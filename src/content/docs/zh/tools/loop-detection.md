---
summary: "如何启用和调整检测重复工具调用循环的防护"
title: "工具循环检测"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

OpenClaw 可以防止代理陷入重复的工具调用模式。
该防护功能**默认禁用**。

仅在需要的地方启用它，因为在严格设置下它可能会阻止合法的重复调用。

## 存在原因

- 检测没有进展的重复序列。
- 检测高频无结果循环（相同的工具，相同的输入，重复的错误）。
- 检测已知轮询工具的特定重复调用模式。

## 配置块

全局默认值：

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

每个代理的覆盖（可选）：

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

- `enabled`：总开关。`false` 表示不执行循环检测。
- `historySize`：保留用于分析的最近工具调用次数。
- `warningThreshold`：将模式分类为仅警告之前的阈值。
- `criticalThreshold`：阻止重复循环模式的阈值。
- `globalCircuitBreakerThreshold`：全局无进展阻断阈值。
- `detectors.genericRepeat`：检测重复的相同工具 + 相同参数模式。
- `detectors.knownPollNoProgress`：检测已知的无状态变化类轮询模式。
- `detectors.pingPong`：检测交替的乒乓模式。

对于 `exec`，无进展检查会比较稳定的命令结果，并忽略易变的运行时元数据，例如持续时间、PID、会话 ID 和工作目录。
当运行 ID 可用时，最近的工具调用历史仅在该运行内评估，因此预定的心跳周期和新的运行不会从早期运行继承过时的循环计数。

## 推荐设置

- 从 `enabled: true` 开始，保持默认值不变。
- 保持阈值按 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold` 排序。
- 如果发生误报：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`
  - （可选）提高 `globalCircuitBreakerThreshold`
  - 仅禁用导致问题的检测器
  - 减少 `historySize` 以降低历史上下文的严格程度

## 日志和预期行为

当检测到循环时，OpenClaw 会报告循环事件，并根据严重程度阻止或抑制下一个工具周期。
这可以保护用户免受失控的令牌消耗和锁定，同时保留正常的工具访问权限。

- 首先优先考虑警告和临时抑制。
- 仅在重复证据累积时才升级处理。

## 注

- `tools.loopDetection` 与代理级别的覆盖设置合并。
- Per-agent config fully overrides or extends global values.
- If no config exists, guardrails stay off.

## 相关

- [Exec approvals](/zh/tools/exec-approvals)
- [Thinking levels](/zh/tools/thinking)
- [Sub-agents](/zh/tools/subagents)
