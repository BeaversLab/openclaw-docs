---
summary: "强化 cron.add 输入处理，对齐架构，并改进 cron UI/代理工具"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Cron Add Hardening"
---

# Cron Add Hardening & Schema Alignment

## Context

Recent gateway logs show repeated `cron.add` failures with invalid parameters (missing `sessionTarget`, `wakeMode`, `payload`, and malformed `schedule`). This indicates that at least one client (likely the agent tool call path) is sending wrapped or partially specified job payloads. Separately, there is drift between cron provider enums in TypeScript, gateway schema, CLI flags, and UI form types, plus a UI mismatch for `cron.status` (expects `jobCount` while gateway returns `jobs`).

## Goals

- Stop `cron.add` INVALID_REQUEST spam by normalizing common wrapper payloads and inferring missing `kind` fields.
- Align cron provider lists across gateway schema, cron types, CLI docs, and UI forms.
- Make agent cron tool schema explicit so the LLM produces correct job payloads.
- Fix the Control UI cron status job count display.
- Add tests to cover normalization and tool behavior.

## Non-goals

- Change cron scheduling semantics or job execution behavior.
- Add new schedule kinds or cron expression parsing.
- Overhaul the UI/UX for cron beyond the necessary field fixes.

## Findings (current gaps)

- `CronPayloadSchema` in gateway excludes `signal` + `imessage`, while TS types include them.
- Control UI CronStatus expects `jobCount`, but gateway returns `jobs`.
- Agent cron tool schema allows arbitrary `job` objects, enabling malformed inputs.
- Gateway strictly validates `cron.add` with no normalization, so wrapped payloads fail.

## What changed

- `cron.add` and `cron.update` now normalize common wrapper shapes and infer missing `kind` fields.
- Agent cron tool schema matches the gateway schema, which reduces invalid payloads.
- Provider 枚举在网关、CLI、UI 和 macOS 选择器之间保持一致。
- Control UI 使用网关的 `jobs` 计数字段来显示状态。

## 当前行为

- **规范化：** 解除 `data`/`job` 负载的包装；在安全的情况下推断 `schedule.kind` 和 `payload.kind`。
- **默认值：** 当缺少 `wakeMode` 和 `sessionTarget` 时，应用安全的默认值。
- **提供商：** Discord/Slack/Signal/iMessage 现在在 CLI/UI 中一致地显示。

有关规范化形状和示例，请参阅 [Cron jobs](/zh/en/automation/cron-jobs)。

## 验证

- 观察网关日志，确认 `cron.add` INVALID_REQUEST 错误已减少。
- 确认刷新后，Control UI 的 cron 状态显示作业计数。

## 可选后续工作

- Control UI 手工冒烟测试：为每个提供商添加一个 cron 作业 + 验证状态作业计数。

## 未解决的问题

- `cron.add` 是否应接受来自客户端的显式 `state`（目前架构不允许）？
- 我们是否应该允许将 `webchat` 作为显式传递提供商（目前在传递解析中被过滤）？

import zh from '/components/footer/zh.mdx';

<zh />
