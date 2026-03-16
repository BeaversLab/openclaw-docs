---
title: "工具循环检测"
description: "配置可选的防护机制，以防止重复或停滞的工具调用循环"
summary: "如何启用和调整用于检测重复工具调用循环的防护机制"
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
- `historySize`：保留用于分析的最近工具调用的数量。
- `warningThreshold`：将模式归类为仅警告前的阈值。
- `criticalThreshold`：阻止重复循环模式的阈值。
- `globalCircuitBreakerThreshold`：全局无进展中断器阈值。
- `detectors.genericRepeat`：检测重复的相同工具 + 相同参数模式。
- `detectors.knownPollNoProgress`：检测已知的无状态变更的类轮询模式。
- `detectors.pingPong`：检测交替的乒乓模式。

## 推荐设置

- 从 `enabled: true` 开始，保持默认值不变。
- 保持阈值顺序为 `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`。
- 如果出现误报：
  - raise `warningThreshold` 和/或 `criticalThreshold`
  - （可选）raise `globalCircuitBreakerThreshold`
  - 仅禁用导致问题的检测器
  - 降低 `historySize` 以放宽历史记录的严格性

## 日志和预期行为

当检测到循环时，OpenClaw 会报告一个循环事件，并根据严重程度阻止或抑制下一个工具周期。这可以在保护用户免受失控的 token 消耗和死锁影响的同时，保留正常的工具访问权限。

- 首选警告和临时抑制。
- 仅在重复证据累积时才升级。

## 说明

- `tools.loopDetection` 会与代理级别的覆盖设置合并。
- 每个代理的配置会完全覆盖或扩展全局值。
- 如果不存在配置，防护栏将保持关闭状态。

import zh from "/components/footer/zh.mdx";

<zh />
