---
title: "提升模式"
summary: "Elevated exec 模式与 /elevated 指令"
read_when:
  - 调整 elevated 默认值、允许列表或斜杠命令行为
---

# Elevated 模式（/elevated 指令）

## 它做什么

- `/elevated on` 在 gateway 主机上执行并保留 exec 审批（与 `/elevated ask` 相同）。
- `/elevated full` 在 gateway 主机上执行 **且** 自动审批 exec（跳过 exec 审批）。
- `/elevated ask` 在 gateway 主机上执行但保留 exec 审批（与 `/elevated on` 相同）。
- `on`/`ask` **不会** 强制 `exec.security=full`；仍遵循已配置的安全/询问策略。
- 仅在 agent **处于沙箱** 时改变行为（否则 exec 本就运行在宿主机）。
- 指令形式：`/elevated on|off|ask|full`、`/elev on|off|ask|full`。
- 仅接受 `on|off|ask|full`；其它输入会返回提示且不会改变状态。

## 它控制什么（以及不控制什么）

- **可用性门控**：`tools.elevated` 为全局基线。`agents.list[].tools.elevated` 可在单个 agent 上进一步限制（两者都必须允许）。
- **会话状态**：`/elevated on|off|ask|full` 设置当前 session key 的 elevated 级别。
- **行内指令**：消息内的 `/elevated on|ask|full` 只对该条消息生效。
- **群聊**：在群聊中，仅当提及 agent 时才会响应 elevated 指令。绕过提及要求的“仅命令消息”也视为已提及。
- **宿主机执行**：elevated 会强制 `exec` 在 gateway 主机上运行；`full` 还会设置 `security=full`。
- **审批**：`full` 跳过 exec 审批；`on`/`ask` 在 allowlist/ask 规则要求时仍需审批。
- **非沙箱 agent**：位置无效；仅影响门控、日志与状态。
- **工具策略仍生效**：若 `exec` 被工具策略拒绝，elevated 也不可用。
- **与 `/exec` 分离**：`/exec` 调整授权发送者的会话默认值，不要求 elevated。

## 解析顺序

1. 消息中的行内指令（仅对该消息生效）。
2. 会话覆盖（通过仅指令消息设置）。
3. 全局默认值（配置中的 `agents.defaults.elevatedDefault`）。

## 设置会话默认值

- 发送 **仅包含** 指令的消息（允许空白），例如 `/elevated full`。
- 会发送确认回复（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 若 elevated 访问被禁用或发送者不在允许列表中，指令会返回可执行的错误并不改变会话状态。
- 发送 `/elevated`（或 `/elevated:`）且不带参数可查看当前 elevated 级别。

## 可用性 + 允许列表

- 功能开关：`tools.elevated.enabled`（即使代码支持，默认也可在配置中关闭）。
- 发送者 allowlist：`tools.elevated.allowFrom`，按 provider（如 `discord`、`whatsapp`）分组。
- 单 agent 开关：`agents.list[].tools.elevated.enabled`（可选；只能进一步限制）。
- 单 agent allowlist：`agents.list[].tools.elevated.allowFrom`（可选；设置后发送者必须同时匹配全局 + 单 agent allowlist）。
- Discord 回退：如果省略 `tools.elevated.allowFrom.discord`，则回退使用 `channels.discord.dm.allowFrom`。设置 `tools.elevated.allowFrom.discord`（即便为 `[]`）即可覆盖。单 agent allowlist **不** 使用回退。
- 所有门控都必须通过；否则 elevated 视为不可用。

## 日志 + 状态

- Elevated exec 调用以 info 级别记录。
- 会话状态包含 elevated 模式（如 `elevated=ask`、`elevated=full`）。
