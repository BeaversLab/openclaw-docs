---
summary: "终端用户界面 (TUI)：从任何机器连接到 Gateway 网关"
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

如果您的 Gateway 网关 使用密码验证，请使用 `--password`。

## 您所看到的界面

- 页眉：连接 URL、当前代理、当前会话。
- 聊天记录：用户消息、助手回复、系统通知、工具卡片。
- 状态栏：连接/运行状态（connecting、running、streaming、idle、error）。
- 页脚：连接状态 + 代理 + 会话 + 模型 + 思考/快速/详细/推理 + 令牌计数 + 投递。
- 输入：带有自动补全功能的文本编辑器。

## 心智模型：代理 + 会话

- 代理是唯一的标识符（例如 `main`、`research`）。Gateway 网关 会公开该列表。
- 会话属于当前的代理。
- 会话密钥存储为 `agent:<agentId>:<sessionKey>`。
  - 如果您输入 `/session main`，TUI 会将其展开为 `agent:<currentAgent>:main`。
  - 如果您输入 `/session agent:other:main`，您将显式切换到该 agent 会话。
- 会话作用域：
  - `per-sender`（默认）：每个 agent 拥有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前的 agent + 会话始终显示在页脚中。

## 发送 + 传递

- 消息被发送到 Gateway(网关)；默认情况下不发送给提供商。
- 开启传递：
  - `/deliver on`
  - 或设置面板
  - 或使用 `openclaw tui --deliver` 启动

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- Agent 选择器：选择不同的 agent。
- 会话选择器：仅显示当前 agent 的会话。
- 设置：切换传递、工具输出展开和思考可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止活动运行
- Ctrl+C：清除输入（按两次以退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：agent 选择器
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
- `/fast <status|on|off>`
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

其他 Gateway(网关) 斜杠命令（例如，`/context`）将被转发到 Gateway(网关) 并显示为系统输出。请参阅[斜杠命令](/zh/tools/slash-commands)。

## 本地 Shell 命令

- 在行首添加 `!`，以便在 TUI 主机上运行本地 Shell 命令。
- TUI 会在每次会话时提示一次以允许本地执行；如果拒绝，将在该会话中保持 `!` 禁用状态。
- 命令在 TUI 工作目录中全新的非交互式 Shell 中运行（没有持久的 `cd`/env）。
- 本地 Shell 命令在其环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 将作为普通消息发送；前导空格不会触发本地执行。

## 工具输出

- 工具调用显示为包含参数和结果的卡片。
- Ctrl+O 可在折叠视图和展开视图之间切换。
- 工具运行时，部分更新会流式传输到同一张卡片中。

## 终端颜色

- TUI 将助手正文文本保留在终端的默认前景色中，以便深色和浅色终端都能保持可读性。
- 如果您的终端使用浅色背景且自动检测错误，请在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 若要强制使用原始深色调色板，请设置 `OPENCLAW_THEME=dark`。

## 历史记录 + 流式传输

- 连接时，TUI 会加载最新的历史记录（默认为 200 条消息）。
- 流式响应会就地更新，直到完成。
- TUI 还会监听代理工具事件，以提供更丰富的工具卡片。

## 连接详情

- TUI 作为 `mode: "tui"` 向 Gateway(网关) 注册。
- 重连会显示系统消息；事件间隔会在日志中显示。

## 选项

- `--url <url>`：Gateway 网关 WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`: Gateway(网关)令牌（如果需要）
- `--password <password>`：Gateway(网关) 密码（如果需要）
- `--session <key>`：会话密钥（默认：`main`，当范围为全局时为 `global`）
- `--deliver`：将助手回复传递给提供商（默认关闭）
- `--thinking <level>`：覆盖发送时的思考级别
- `--timeout-ms <ms>`：代理超时时间，单位为毫秒（默认为 `agents.defaults.timeoutSeconds`）

注意：当您设置 `--url` 时，TUI 不会回退到配置或环境凭证。
请显式传递 `--token` 或 `--password`。缺少显式凭证将导致错误。

## 故障排除

发送消息后无输出：

- 在 TUI 中运行 `/status`，以确认 Gateway(网关) 已连接且处于空闲/忙碌状态。
- 检查 Gateway(网关) 日志：`openclaw logs --follow`。
- 确认代理能够运行：`openclaw status` 和 `openclaw models status`。
- 如果您在聊天渠道中期望收到消息，请启用传递（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要加载的历史记录条目（默认 200）

## 连接故障排除

- `disconnected`：确保 Gateway(网关) 正在运行，且您的 `--url/--token/--password` 是正确的。
- 选择器中没有代理：检查 `openclaw agents list` 和您的路由配置。
- 会话选择器为空：您可能处于全局范围或者还没有任何会话。

import zh from "/components/footer/zh.mdx";

<zh />
