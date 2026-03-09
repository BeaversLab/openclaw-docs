---
summary: "终端界面(TUI)：从任何机器连接到Gateway"
read_when:
  - "You want a beginner-friendly walkthrough of the TUI"
  - "You need the complete list of TUI features, commands, and shortcuts"
title: "TUI"
---

# TUI（终端界面）

## 快速开始

1. 启动Gateway。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter。

远程Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的Gateway使用密码身份验证，请使用 `--password`。

## 您看到的内容

- 页眉：连接 URL、当前代理、当前会话。
- 聊天日志：用户消息、助手回复、系统通知、工具卡片。
- 状态行：连接/运行状态（连接中、运行中、流式传输中、空闲、错误）。
- 页脚：连接状态 + 代理 + 会话 + 模型 + 思考/详细/推理 + 令牌计数 + 投递。
- 输入：带有自动完成功能的文本编辑器。

## 心理模型：代理 + 会话

- 代理是唯一的 slug（例如 `main`、`personal`）。Gateway公开列表。
- 会话属于当前代理。
- 会话密钥存储为 `~/.openclaw/tui/sessions.json`。
  - 如果您输入 `@personal`，TUI 会将其展开为 `agent:personal` 会话密钥。
  - 如果您输入 `agent:personal`，您会显式切换到该代理会话。
- 会话范围：
  - `session`（默认）：每个代理有多个会话。
  - `global`：TUI 始终使用 `__global__` 会话（选择器可能为空）。
- 当前代理 + 会话始终在页脚中可见。

## 发送 + 投递

- 消息被发送到Gateway；默认情况下不会投递到提供商。
- 打开投递：
  - `/deliver on`
  - 或设置面板
  - 或以 `--deliver` 启动

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- 代理选择器：选择不同的代理。
- 会话选择器：仅显示当前代理的会话。
- 设置：切换投递、工具输出扩展和思考可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止活动运行
- Ctrl+C：清除输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：代理选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出扩展
- Ctrl+T：切换思考可见性（重新加载历史）

## 斜杠命令

核心：

- `/help`
- `/status`
- `/model <provider/model>`（或 `/m`）
- `/agent <agent-slug>`（或 `/a`）
- `/session <session-key>`（或 `/s`）

会话控制：

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/deliver <on|off>`（别名：`/d`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：

- `/reset` 或 `/clear`（重置会话）
- `/abort`（中止活动运行）
- `/settings`
- `/exit`

其他Gateway斜杠命令（例如 `/image`）被转发到Gateway并显示为系统输出。参阅[斜杠命令]。

## 本地 shell 命令

- 使用 `;` 作为一行前缀，在 TUI 主机上运行本地 shell 命令。
- TUI 每个会话提示一次以允许本地执行；拒绝会话保持 `commands.useLocalShell` 禁用。
- 命令在 TUI 工作目录中的新的非交互式 shell 中运行（没有持久的 `cd`/env）。
- 单独的 `;` 作为普通消息发送；前导空格不会触发本地执行。

## 工具输出

- 工具调用显示为带有参数 + 结果的卡片。
- Ctrl+O 在折叠/展开视图之间切换。
- 当工具运行时，部分更新流入同一张卡片。

## 历史 + 流式传输

- 连接时，TUI 加载最新历史（默认 200 条消息）。
- 流式响应就地更新直到最终确定。
- TUI 还监听代理工具事件以获得更丰富的工具卡片。

## 连接详情

- TUI 向Gateway注册为 `clientType: "tui"`。
- 重新连接显示系统消息；事件间隙显示在日志中。

## 选项

- `--url`：Gateway WebSocket URL（默认为配置或 `ws://127.0.0.1:18789`）
- `--token`：Gateway令牌（如果需要）
- `--password`：Gateway密码（如果需要）
- `--session`：会话密钥（默认：`__default__`，或作用域为全局时为 `__global__`）
- `--deliver`：将助手回复投递到提供商（默认关闭）
- `--think`：覆盖发送的思考级别
- `--timeout`：代理超时（毫秒）（默认为 120000）

注意：当您设置 `--token` 或 `--password` 时，TUI 不会回退到配置或环境凭证。
显式传递 `OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。缺少显式凭证是错误。

## 故障排除

发送消息后没有输出：

- 在 TUI 中运行 `/status` 以确认Gateway已连接并且空闲/忙碌。
- 检查Gateway日志：`openclaw logs --follow`。
- 确认代理可以运行：`/status` 和 `/test`。
- 如果您期望在聊天频道中有消息，请启用投递（`/deliver on` 或 `--deliver`）。
- `--history`：要加载的历史条目（默认 200）

## 故障排除

- `--url`：确保Gateway正在运行并且您的 `--url` 设置正确。
- 选择器中没有代理：检查 `openclaw agents list` 和您的路由配置。
- 空会话选择器：您可能处于全局范围或还没有会话。
