---
summary: "加固 cron.add 输入处理，对齐架构，并改进 cron UI/代理工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add Hardening"
---

# Cron Add Hardening & Schema Alignment

## Context

最近的网关日志显示 `cron.add` 持续失败，原因是参数无效（缺少 `sessionTarget`、`wakeMode`、`payload` 以及 `schedule` 格式错误）。这表明至少有一个客户端（可能是代理工具调用路径）正在发送被包装或部分指定的作业负载。此外，TypeScript 中的 cron 提供程序枚举、网关架构、CLI 标志和 UI 表单类型之间存在漂移，并且 `cron.status` 的 UI 不匹配（期望 `jobCount` 而网关返回 `jobs`）。

## Goals

- 通过规范化常见的包装负载并推断缺失的 `kind` 字段，来阻止 `cron.add` INVALID_REQUEST 垃圾信息。
- Align cron 提供商 lists across gateway schema, cron types, CLI docs, and UI forms.
- Make agent cron 工具 schema explicit so the LLM produces correct job payloads.
- Fix the Control UI cron status job count display.
- Add tests to cover normalization and 工具 behavior.

## Non-goals

- Change cron scheduling semantics or job execution behavior.
- Add new schedule kinds or cron expression parsing.
- Overhaul the UI/UX for cron beyond the necessary field fixes.

## Findings (current gaps)

- 网关中的 `CronPayloadSchema` 排除了 `signal` + `imessage`，而 TS 类型包含了它们。
- 控制 UI CronStatus 期望 `jobCount`，但网关返回 `jobs`。
- 代理 cron 工具架构允许任意的 `job` 对象，从而启用了格式错误的输入。
- Gateway 网关 严格验证 `cron.add` 而不进行规范化，因此包装的负载会失败。

## What changed

- `cron.add` 和 `cron.update` 现在规范化常见的包装形状并推断缺失的 `kind` 字段。
- Agent cron 工具 schema matches the gateway schema, which reduces invalid payloads.
- Provider 枚举在网关、CLI、UI 和 macOS 选择器之间保持一致。
- 控制 UI 使用网关的 `jobs` 计数字段来显示状态。

## 当前行为

- **规范化：** 已包装的 `data`/`job` 负载会被解包；在安全的情况下，会推断 `schedule.kind` 和 `payload.kind`。
- **默认值：** 当缺失 `wakeMode` 和 `sessionTarget` 时，应用安全的默认值。
- **提供商：** Discord/Slack/Signal/iMessage 现在在 CLI/UI 中一致地显示。

有关规范化形状和示例，请参阅 [Cron jobs](/zh/automation/cron-jobs)。

## 验证

- 观察网关日志，查看 `cron.add` INVALID_REQUEST 错误是否减少。
- 确认刷新后，Control UI 的 cron 状态显示作业计数。

## 可选后续工作

- Control UI 手工冒烟测试：为每个提供商添加一个 cron 作业 + 验证状态作业计数。

## 未解决的问题

- `cron.add` 是否应该接受来自客户端的显式 `state`（当前架构不允许）？
- 我们是否应该允许将 `webchat` 作为显式交付提供商（当前在交付解析中被过滤）？

import zh from "/components/footer/zh.mdx";

<zh />
