---
summary: "加固 cron.add 输入处理，对齐 schema，并改进 cron UI/agent 工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add 加固"
---

# Cron Add 加固与 Schema 对齐

## 背景

最近的 Gateway(网关) 日志显示 `cron.add` 反复失败，原因为无效参数（缺少 `sessionTarget`、`wakeMode`、`payload` 以及格式错误的 `schedule`）。这表明至少有一个客户端（可能是 agent 工具调用路径）正在发送被包装或部分指定的作业 payload。此外，TypeScript、Gateway(网关) schema、CLI 标志和 UI 表单类型中的 cron 提供商枚举之间存在不一致，并且 `cron.status` 的 UI 存在不匹配（期望 `jobCount` 而 Gateway(网关) 返回 `jobs`）。

## 目标

- 通过规范化常见的包装 payload 并推断缺失的 `kind` 字段，停止 `cron.add` INVALID_REQUEST 垃圾信息。
- 在 Gateway(网关) schema、cron 类型、CLI 文档和 UI 表单之间对齐 cron 提供商列表。
- 使 agent cron 工具 schema 明确化，以便 LLM 生成正确的作业 payload。
- 修复 Control UI cron 状态作业计数显示。
- 添加测试以覆盖规范化和工具行为。

## 非目标

- 更改 cron 调度语义或作业执行行为。
- 添加新的调度类型或 cron 表达式解析。
- 除必要的字段修复外，彻底改造 cron 的 UI/UX。

## 发现（当前差距）

- Gateway(网关) 中的 `CronPayloadSchema` 排除了 `signal` + `imessage`，而 TS 类型包含它们。
- Control UI CronStatus 期望 `jobCount`，但 Gateway(网关) 返回 `jobs`。
- Agent cron 工具 schema 允许任意的 `job` 对象，从而导致格式错误的输入。
- Gateway(网关) 严格验证 `cron.add` 而不进行规范化，因此包装的 payload 会失败。

## 变更内容

- `cron.add` 和 `cron.update` 现在可以规范化常见的包装形状并推断缺失的 `kind` 字段。
- Agent cron 工具架构与网关架构匹配，从而减少了无效负载。
- 提供商枚举在网关、CLI、UI 和 macOS 选择器之间保持一致。
- Control UI 使用网关的 `jobs` 计数字段来显示状态。

## 当前行为

- **标准化：** 经包装的 `data`/`job` 负载会被解包；在安全的情况下，`schedule.kind` 和 `payload.kind` 会被推断。
- **默认值：** 当缺少 `wakeMode` 和 `sessionTarget` 时，会应用安全的默认值。
- **提供商：** Discord/Slack/Signal/iMessage 现在在 CLI/UI 中一致地展示。

有关标准化的形状和示例，请参阅 [Cron jobs](/zh/automation/cron-jobs)。

## 验证

- 观察网关日志中 `cron.add` INVALID_REQUEST 错误的减少情况。
- 确认 Control UI cron 状态在刷新后显示作业计数。

## 可选后续工作

- Control UI 手冒烟测试：为每个提供商添加一个 cron 作业 + 验证状态作业计数。

## 开放性问题

- `cron.add` 是否应接受来自客户端的显式 `state`（当前架构不允许）？
- 我们是否应允许 `webchat` 作为显式投递提供商（当前在投递解析中被过滤）？

import en from "/components/footer/en.mdx";

<en />
