---
title: "工具循环检测"
description: "配置用于防止重复或停滞的工具调用循环的可选防护措施"
summary: "如何启用和调优检测重复工具调用循环的防护措施"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# 工具循环检测

OpenClaw 可以防止 Agent 陷入重复的工具调用模式。
该防护功能**默认处于禁用状态**。

仅在需要时启用它，因为在严格设置下它可能会阻止合法的重复调用。

## 存在原因

- 检测无法取得进展的重复序列。
- 检测高频无结果循环（同一工具、同一输入、重复错误）。
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

按 Agent 覆盖（可选）：

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

- `enabled`：主开关。`false` 表示不执行循环检测。
- `historySize`：保留用于分析的最近工具调用次数。
- `warningThreshold`：将模式归类为仅警告之前的阈值。
- `criticalThreshold`：阻止重复循环模式的阈值。
- `globalCircuitBreakerThreshold`：全局无进展中断器阈值。
- `detectors.genericRepeat`：检测重复的同一工具 + 相同参数模式。
- `detectors.knownPollNoProgress`：检测已知的无状态变化类轮询模式。
- `detectors.pingPong`：检测交替的乒乓模式。

## 推荐设置

- 从 `enabled: true` 开始，保持默认值不变。
- 保持阈值按 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold` 排序。
- 如果出现误报：
  - 提高 `warningThreshold` 和/或 `criticalThreshold`
  - （可选）提高 `globalCircuitBreakerThreshold`
  - 仅禁用导致问题的检测器
  - 减少 `historySize` 以降低历史上下文的严格程度

## 日志和预期行为

当检测到循环时，OpenClaw 会报告循环事件，并根据严重程度阻止或抑制下一个工具周期。
这可以在保持正常工具访问的同时，保护用户免受 Token 消耗失控和系统锁定的影响。

- 优先使用警告和暂时抑制。
- 仅当累积了重复的证据时才升级处理。

## 注意事项

- `tools.loopDetection` 已与代理级别的覆盖设置合并。
- 每个代理的配置会完全覆盖或扩展全局值。
- 如果不存在配置，防护措施将保持关闭状态。
