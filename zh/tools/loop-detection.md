---
title: "工具循环检测"
description: "配置可选的护栏，以防止重复或停滞的工具调用循环"
summary: "如何启用和调优检测重复工具调用循环的护栏"
read_when:
  - 用户报告代理陷入重复调用工具的困境
  - 您需要调优重复调用保护
  - 您正在编辑代理工具/运行时策略
---

# 工具循环检测

OpenClaw 可以防止代理陷入重复的工具调用模式。
该护栏**默认处于禁用状态**。

仅在需要时启用它，因为在严格设置下它可能会阻止合法的重复调用。

## 为何存在此功能

- 检测无法取得进展的重复序列。
- 检测高频无结果循环（相同的工具、相同的输入、重复的错误）。
- 针对已知轮询工具检测特定的重复调用模式。

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

每代理覆盖（可选）：

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
- `historySize`：保留用于分析的近期工具调用数量。
- `warningThreshold`：将模式归类为仅发出警告之前的阈值。
- `criticalThreshold`：阻止重复循环模式的阈值。
- `globalCircuitBreakerThreshold`：全局无进展阻断器阈值。
- `detectors.genericRepeat`：检测重复的相同工具 + 相同参数模式。
- `detectors.knownPollNoProgress`：检测无状态变化的已知类轮询模式。
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

当检测到循环时，OpenClaw 会报告一个循环事件，并根据严重程度阻止或抑制下一个工具循环。
这可以在保护正常工具访问的同时，防止用户产生失控的令牌消耗和锁定。

- 首选警告和暂时抑制。
- 仅在积累重复证据时才升级。

## 注意事项

- `tools.loopDetection` 与代理级别的覆盖设置合并。
- 每个代理的配置会完全覆盖或扩展全局值。
- 如果不存在配置，防护措施将保持关闭状态。

import zh from "/components/footer/zh.mdx";

<zh />
