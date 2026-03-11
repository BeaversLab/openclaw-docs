---
summary: "终端 UI (TUI)：从任何机器连接到 Gateway"
read_when:
  - "You want a beginner-friendly walkthrough of the TUI"
  - "You need the complete list of TUI features, commands, and shortcuts"
title: "TUI"
---

# TUI（终端 UI）

## 快速开始

1. 启动 Gateway。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter。

远程 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 使用密码身份验证，请使用 `--password`。

## 您看到的内容

- 标题栏：连接 URL、当前代理、当前会话。
- 聊天日志：用户消息、助手回复、系统通知、工具卡片。
- 状态行：连接/运行状态（连接中、运行中、流式传输中、空闲、错误）。
- 页脚栏：连接状态 + 代理 + 会话 + 模型 + 思考/详细/推理 + token 计数 + 交付。
- 输入框：带有自动完成的文本编辑器。

## 心理模型：代理 + 会话

- 代理是唯一的标识符（例如 `main`、`research`）。Gateway 会暴露列表。
- 会话属于当前代理。
- 会话密钥存储为 `agent:<agentId>:<sessionKey>`。
  - 如果您输入 `/session main`，TUI 会将其扩展为 `agent:<currentAgent>:main`。
  - 如果您输入 `/session agent:other:main`，您将显式切换到该代理会话。
- 会话范围：
  - `per-sender`（默认）：每个代理有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前代理 + 会话始终在页脚栏中可见。

## 发送 + 交付

- 消息被发送到 Gateway；默认关闭向提供商的交付。
- 打开交付：
  - `/deliver on`
  - 或设置面板
  - 或使用 `openclaw tui --deliver` 启动

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- 代理选择器：选择不同的代理。
- 会话选择器：仅显示当前代理的会话。
- 设置：切换交付、工具输出扩展和思考可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止活动运行
- Ctrl+C：清除输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：代理选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出扩展
- Ctrl+T：切换思考可见性（重新加载历史记录）

## 斜杠命令

核心：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

会话控制：

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：

- `/new` 或 `/reset`（重置会话）
- `/abort`（中止活动运行）
- `/settings`
- `/exit`

其他 Gateway 斜杠命令（例如 `/context`）被转发到 Gateway 并显示为系统输出。请参阅[斜杠命令](/zh/tools/slash-commands)。

## 本地 shell 命令

- 使用 `!` 作为一行前缀，在 TUI 主机上运行本地 shell 命令。
- TUI 在每个会话提示一次以允许本地执行；拒绝将在会话期间保持 `!` 禁用。
- 命令在 TUI 工作目录中的新的非交互式 shell 中运行（没有持久的 `cd`/env）。
- 本地 shell 命令在其环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 作为正常消息发送；前导空格不会触发本地执行。

## 工具输出

- 工具调用显示为带有参数 + 结果的卡片。
- Ctrl+O 在折叠/展开视图之间切换。
- 当工具运行时，部分更新流式传输到同一卡片中。

## 终端颜色

- TUI 将助手正文文本保留在终端的默认前景色中，以便暗色和亮色终端都保持可读。
- 如果您的终端使用亮色背景且自动检测错误，请在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 要强制使用原始暗色调色板，请设置 `OPENCLAW_THEME=dark`。

## 历史记录 + 流式传输

- 连接时，TUI 加载最新的历史记录（默认 200 条消息）。
- 流式响应在最终确定之前就地更新。
- TUI 还监听代理工具事件以获得更丰富的工具卡片。

## 连接详情

- TUI 向 Gateway 注册为 `mode: "tui"`。
- 重新连接显示系统消息；事件差距会在日志中显示。

## 选项

- `--url <url>`：Gateway WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 令牌（如果需要）
- `--password <password>`：Gateway 密码（如果需要）
- `--session <key>`：会话密钥（默认：`main`，或范围为全局时的 `global`）
- `--deliver`：将助手回复交付给提供商（默认关闭）
- `--thinking <level>`：覆盖发送的思考级别
- `--timeout-ms <ms>`：代理超时（毫秒）（默认为 `agents.defaults.timeoutSeconds`）

注意：当您设置 `--url` 时，TUI 不会回退到配置或环境凭据。
显式传递 `--token` 或 `--password`。缺少显式凭据是一个错误。

## 故障排除

发送消息后没有输出：

- 在 TUI 中运行 `/status` 以确认 Gateway 已连接且空闲/忙碌。
- 检查 Gateway 日志：`openclaw logs --follow`。
- 确认代理可以运行：`openclaw status` 和 `openclaw models status`。
- 如果您期望在聊天频道中收到消息，请启用交付（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要加载的历史记录条目（默认 200）

## 连接故障排除

- `disconnected`：确保 Gateway 正在运行且您的 `--url/--token/--password` 正确。
- 选择器中没有代理：检查 `openclaw agents list` 和您的路由配置。
- 空会话选择器：您可能处于全局范围或还没有会话。
