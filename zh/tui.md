---
summary: "Terminal UI (TUI)：从任意机器连接到 Gateway 网关"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (终端用户界面)

## 快速开始

1. 启动 Gateway 网关。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter 键。

远程 Gateway 网关：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 网关 使用密码认证，请使用 `--password`。

## 您看到的内容

- 头部：连接 URL、当前 Agent、当前会话。
- 聊天记录：用户消息、助手回复、系统通知、工具卡片。
- 状态栏：连接/运行状态（connecting、running、streaming、idle、error）。
- 底部：连接状态 + agent + 会话 + 模型 + think/verbose/reasoning + token 计数 + deliver。
- 输入：带有自动完成功能的文本编辑器。

## 心智模型：Agent + 会话

- Agent 是唯一的标识符（例如 `main`、`research`）。Gateway 网关 会公开该列表。
- 会话属于当前 Agent。
- 会话密钥存储为 `agent:<agentId>:<sessionKey>`。
  - 如果您输入 `/session main`，TUI 会将其扩展为 `agent:<currentAgent>:main`。
  - 如果您输入 `/session agent:other:main`，您将显式切换到该 agent 会话。
- 会话范围：
  - `per-sender`（默认）：每个 agent 有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前的 agent + 会话始终显示在底部。

## 发送 + 投递

- 消息被发送到 Gateway 网关；默认情况下不投递给提供商。
- 开启投递：
  - `/deliver on`
  - 或设置面板
  - 或以 `openclaw tui --deliver` 开始

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- Agent 选择器：选择不同的 agent。
- 会话选择器：仅显示当前 agent 的会话。
- 设置：切换投递、工具输出展开和思考可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止当前运行
- Ctrl+C：清除输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：Agent 选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出展开
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
- `/abort`（中止当前运行）
- `/settings`
- `/exit`

其他 Gateway 网关 斜杠命令（例如 `/context`）会被转发到 Gateway 网关 并显示为系统输出。请参阅 [斜杠命令](/zh/en/tools/slash-commands)。

## 本地 Shell 命令

- 在行首加上 `!` 以在 TUI 主机上运行本地 shell 命令。
- TUI 在每次会话开始时会提示一次以允许本地执行；拒绝将使 `!` 在本次会话中保持禁用状态。
- 命令在 TUI 工作目录中一个新的非交互式 shell 中运行（没有持久的 `cd`/env）。
- 单独的 `!` 将作为普通消息发送；前导空格不会触发本地执行。

## 工具输出

- 工具调用以卡片形式显示，包含参数和结果。
- Ctrl+O 在折叠/展开视图之间切换。
- 工具运行时，部分更新会流式传输到同一张卡片中。

## 历史记录与流式传输

- 连接时，TUI 会加载最新的历史记录（默认为 200 条消息）。
- 流式响应会原地更新，直到完成。
- TUI 还会监听代理工具事件，以显示更丰富的工具卡片。

## 连接详情

- TUI 向 Gateway 网关 注册为 `mode: "tui"`。
- 重连时会显示系统消息；事件缺口会显示在日志中。

## 选项

- `--url <url>`：Gateway 网关 WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 网关 令牌（如果需要）
- `--password <password>`：Gateway 网关 密码（如果需要）
- `--session <key>`：会话密钥（默认为 `main`，当作用域为全局时为 `global`）
- `--deliver`：将助手回复投递给提供商（默认关闭）
- `--thinking <level>`：覆盖发送时的思考级别
- `--timeout-ms <ms>`：Agent 超时时间，以毫秒为单位（默认为 `agents.defaults.timeoutSeconds`）

注意：当您设置 `--url` 时，TUI 不会回退到配置文件或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据将报错。

## 故障排除

发送消息后没有输出：

- 在 TUI 中运行 `/status` 以确认 Gateway 网关 已连接以及处于空闲/忙碌状态。
- 检查 Gateway 网关 日志：`openclaw logs --follow`。
- 确认 Agent 可以运行：`openclaw status` 和 `openclaw models status`。
- 如果您期望在聊天频道中收到消息，请启用投递功能（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要加载的历史记录条目数（默认为 200）

## 故障排除

- `disconnected`：确保 Gateway 网关 正在运行且您的 `--url/--token/--password` 是正确的。
- 选择器中没有 Agent：检查 `openclaw agents list` 和您的路由配置。
- 会话选择器为空：您可能处于全局作用域中，或者尚未有任何会话。


<zh />

import zh from '/components/footer/zh.mdx';

<zh />
