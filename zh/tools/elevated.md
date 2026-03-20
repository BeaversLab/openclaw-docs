---
summary: "Elevated exec mode and /elevated directives"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
title: "Elevated Mode"
---

# 提升模式 (/elevated 指令)

## 作用

- `/elevated on` 在网关主机上运行并保留执行审批（与 `/elevated ask` 相同）。
- `/elevated full` 在网关主机上运行 **并且** 自动批准执行（跳过执行审批）。
- `/elevated ask` 在网关主机上运行但保留执行审批（与 `/elevated on` 相同）。
- `on`/`ask` **不** 强制 `exec.security=full`；配置的安全/询问策略仍然适用。
- 仅当代理处于**沙盒**状态时才改变行为（否则执行已在主机上运行）。
- 指令形式：`/elevated on|off|ask|full`、`/elev on|off|ask|full`。
- 仅接受 `on|off|ask|full`；其他任何内容都会返回提示且不会更改状态。

## What it controls (and what it does not)

- **可用性门槛**：`tools.elevated` 是全局基准。`agents.list[].tools.elevated` 可以针对每个代理进一步限制提升（两者都必须允许）。
- **每次会话状态**：`/elevated on|off|ask|full` 设置当前会话密钥的提升级别。
- **内联指令**：消息内的 `/elevated on|ask|full` 仅适用于该消息。
- **群组**：在群组聊天中，仅当提及代理时才会遵守提升指令。绕过提及要求的纯命令消息被视为已提及。
- **主机执行**：提升模式将 `exec` 强制到网关主机；`full` 还设置 `security=full`。
- **审批**：`full` 跳过执行审批；当允许列表/询问规则要求时，`on`/`ask` 会遵守它们。
- **非沙盒代理**：对位置无操作；仅影响准入、日志记录和状态。
- **工具策略仍然适用**：如果 `exec` 被工具策略拒绝，则无法使用提升模式。
- **与 `/exec` 分离**：`/exec` 为经过授权的发件人调整每次会话的默认值，并且不需要提升模式。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 全局默认值（配置中的 `agents.defaults.elevatedDefault`）。

## 设置会话默认值

- 发送一条 **仅** 包含该指令的消息（允许使用空格），例如 `/elevated full`。
- 发送确认回复（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 如果 elevated 访问被禁用或发送者不在批准的允许列表中，该指令将返回可执行操作的错误并且不会更改会话状态。
- 发送 `/elevated`（或 `/elevated:`）且不附带参数，以查看当前的提升级别。

## 可用性 + 允许列表

- 功能开关：`tools.elevated.enabled`（即使代码支持，也可以通过配置将其默认设置为关闭）。
- 发送者允许列表：`tools.elevated.allowFrom`，带有针对每个提供商的允许列表（例如 `discord`，`whatsapp`）。
- 不带前缀的允许列表条目仅匹配发送方范围的标识值（`SenderId`，`SenderE164`，`From`）；接收方路由字段绝不用于提升授权。
- 可变的发送者元数据需要明确的前缀：
  - `name:<value>` 匹配 `SenderName`
  - `username:<value>` 匹配 `SenderUsername`
  - `tag:<value>` 匹配 `SenderTag`
  - `id:<value>`、`from:<value>`、`e164:<value>` 可用于显式标识定位
- 每个代理的开关：`agents.list[].tools.elevated.enabled`（可选；只能进一步限制）。
- 每个代理的允许列表：`agents.list[].tools.elevated.allowFrom`（可选；设置时，发送者必须同时匹配全局和每个代理的允许列表）。
- Discord 回退：如果省略了 `tools.elevated.allowFrom.discord`，则使用 `channels.discord.allowFrom` 列表作为回退（旧版：`channels.discord.dm.allowFrom`）。设置 `tools.elevated.allowFrom.discord`（即使是 `[]`）以覆盖。每个代理的允许列表**不**使用回退。
- 所有门槛都必须通过；否则提升模式将被视为不可用。

## 日志记录 + 状态

- 提升的 exec 调用将记录在 info 级别。
- 会话状态包括提升模式（例如 `elevated=ask`，`elevated=full`）。

import zh from "/components/footer/zh.mdx";

<zh />
