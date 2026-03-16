---
summary: "提升执行模式和 /elevated 指令"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
title: "提升模式"
---

# 提升模式 (/elevated 指令)

## 作用

- `/elevated on` 在网关主机上运行并保留执行批准（与 `/elevated ask` 相同）。
- `/elevated full` 在网关主机上运行**并**自动批准执行（跳过执行批准）。
- `/elevated ask` 在网关主机上运行，但保留执行批准（与 `/elevated on` 相同）。
- `on`/`ask` **不**强制 `exec.security=full`；配置的安全/询问策略仍然适用。
- 仅当代理处于**沙盒**状态时才改变行为（否则执行已在主机上运行）。
- 指令形式：`/elevated on|off|ask|full`，`/elev on|off|ask|full`。
- 仅接受 `on|off|ask|full`；其他任何内容均返回提示且不更改状态。

## 控制内容（及不控制的内容）

- **可用性门槛**：`tools.elevated` 是全局基准。`agents.list[].tools.elevated` 可以针对每个代理进一步限制提升（两者都必须允许）。
- **每会话状态**：`/elevated on|off|ask|full` 为当前会话密钥设置提升级别。
- **内联指令**：消息内的 `/elevated on|ask|full` 仅适用于该消息。
- **群组**：在群组聊天中，仅当提及代理时才会遵守提升指令。绕过提及要求的纯命令消息被视为已提及。
- **主机执行**：提升模式强制将 `exec` 置于网关主机上；`full` 还会设置 `security=full`。
- **批准**：`full` 跳过执行批准；当允许列表/询问规则要求时，`on`/`ask` 遵守批准。
- **非沙盒代理**：对位置无操作；仅影响准入、日志记录和状态。
- **工具策略仍然适用**：如果工具策略拒绝 `exec`，则无法使用提升模式。
- **与 `/exec` 分开**：`/exec` 为授权发件人调整每会话默认值，且不需要提升。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 全局默认值（配置中的 `agents.defaults.elevatedDefault`）。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许包含空白字符），例如 `/elevated full`。
- 发送确认回复（`Elevated mode set to full...` / `Elevated mode disabled.`）。
- 如果 elevated 访问被禁用或发送者不在批准的允许列表中，该指令将返回可执行操作的错误并且不会更改会话状态。
- 发送不带参数的 `/elevated`（或 `/elevated:`）以查看当前的提升级别。

## 可用性 + 允许列表

- 功能开关：`tools.elevated.enabled`（即使代码支持，默认值也可以通过配置关闭）。
- 发送者白名单：`tools.elevated.allowFrom`，带有针对每个提供商的白名单（例如 `discord`，`whatsapp`）。
- 不带前缀的白名单条目仅匹配发送者作用域的身份值（`SenderId`，`SenderE164`，`From`）；接收者路由字段从不用于提升授权。
- 可变的发送者元数据需要明确的前缀：
  - `name:<value>` 匹配 `SenderName`
  - `username:<value>` 匹配 `SenderUsername`
  - `tag:<value>` 匹配 `SenderTag`
  - `id:<value>`、`from:<value>`、`e164:<value>` 可用于显式身份定位
- 每个代理的门槛：`agents.list[].tools.elevated.enabled`（可选；只能进一步限制）。
- 每个代理的允许列表：`agents.list[].tools.elevated.allowFrom`（可选；设置时，发送者必须匹配全局和每个代理的允许列表**两者**）。
- Discord 后备：如果省略了 `tools.elevated.allowFrom.discord`，则将 `channels.discord.allowFrom` 列表用作后备（旧版：`channels.discord.dm.allowFrom`）。设置 `tools.elevated.allowFrom.discord`（即使是 `[]`）以覆盖此项。每个代理的允许列表**不**使用后备。
- 所有门槛都必须通过；否则提升模式将被视为不可用。

## 日志记录 + 状态

- 提升的 exec 调用将记录在 info 级别。
- 会话状态包括提升模式（例如 `elevated=ask`、`elevated=full`）。

import zh from "/components/footer/zh.mdx";

<zh />
