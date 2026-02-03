---
summary: "加强 cron.add 入参处理、对齐 schema，并改进 cron UI/agent 工具"
title: "Cron 添加加固"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
---

# Cron Add 加固与 Schema 对齐

## 背景

近期 gateway 日志出现大量 `cron.add` 无效参数失败（缺少 `sessionTarget`、`wakeMode`、`payload` 以及 `schedule` 格式错误）。这表明至少有一个客户端（可能是 agent 工具调用路径）在发送被包裹或不完整的 job payload。另有 TypeScript、gateway schema、CLI flags 与 UI 表单类型之间的 cron provider 枚举漂移，以及 UI 对 `cron.status` 的字段不匹配（期望 `jobCount`，但 gateway 返回 `jobs`）。

## 目标

- 通过规范化常见包裹 payload 并推断缺失 `kind`，阻止 `cron.add` 的 INVALID_REQUEST 垃圾日志。
- 对齐 gateway schema、cron types、CLI 文档与 UI 表单中的 cron provider 列表。
- 让 agent cron tool schema 明确化，使 LLM 生成正确的 job payload。
- 修复 Control UI 的 cron status job count 显示。
- 增加测试覆盖规范化与工具行为。

## 非目标

- 修改 cron 调度语义或作业执行行为。
- 新增 schedule 类型或 cron 表达式解析。
- 对 cron UI/UX 做超出必要字段修复的改动。

## 发现（当前缺口）

- gateway 的 `CronPayloadSchema` 不含 `signal` + `imessage`，而 TS 类型包含。
- Control UI 的 CronStatus 期望 `jobCount`，但 gateway 返回 `jobs`。
- agent cron 工具 schema 允许任意 `job` 对象，导致输入畸形。
- gateway 对 `cron.add` 严格校验且无规范化，因此包裹 payload 失败。

## 变更内容

- `cron.add` 与 `cron.update` 现可规范化常见包裹形态并推断缺失的 `kind` 字段。
- agent cron 工具 schema 与 gateway schema 对齐，减少无效 payload。
- provider 枚举在 gateway、CLI、UI 与 macOS 选择器中对齐。
- Control UI 使用 gateway 的 `jobs` 字段显示状态数量。

## 当前行为

- **规范化**：解包 `data`/`job`；在安全时推断 `schedule.kind` 与 `payload.kind`。
- **默认值**：缺失时为 `wakeMode` 与 `sessionTarget` 应用安全默认。
- **Providers**：Discord/Slack/Signal/iMessage 在 CLI/UI 中一致呈现。

规范化形态与示例参见 [Cron jobs](/zh/automation/cron-jobs)。

## 验证

- 观察 gateway 日志，`cron.add` INVALID_REQUEST 错误应减少。
- 刷新后确认 Control UI cron status 显示 job count。

## 可选后续

- 手工 Control UI 冒烟：每个 provider 添加 cron job，并验证状态数量。

## 未决问题

- `cron.add` 是否应接受客户端显式 `state`（目前 schema 不允许）？
- 是否允许 `webchat` 作为显式投递 provider（当前投递解析时被过滤）？
