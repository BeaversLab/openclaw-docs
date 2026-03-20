---
summary: "Terminal UI (TUI): connect to the Gateway(网关) from any machine"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (Terminal UI)

## 快速开始

1. Start the Gateway(网关).

```bash
openclaw gateway
```

2. Open the TUI.

```bash
openclaw tui
```

3. Type a message and press Enter.

Remote Gateway(网关):

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

Use `--password` if your Gateway(网关) uses password auth.

## What you see

- Header: connection URL, current agent, current 会话.
- Chat log: user messages, assistant replies, system notices, 工具 cards.
- Status line: connection/run state (connecting, running, streaming, idle, error).
- Footer: connection state + agent + 会话 + 模型 + think/fast/verbose/reasoning + token counts + deliver.
- Input: text editor with autocomplete.

## Mental 模型: agents + sessions

- Agents are unique slugs (e.g. `main`, `research`). The Gateway(网关) exposes the list.
- Sessions belong to the current agent.
- Session keys are stored as `agent:<agentId>:<sessionKey>`.
  - If you type `/session main`, the TUI expands it to `agent:<currentAgent>:main`.
  - If you type `/session agent:other:main`, you switch to that agent 会话 explicitly.
- Session scope:
  - `per-sender` (default): each agent has many sessions.
  - `global`: the TUI always uses the `global` 会话 (the picker may be empty).
- The current agent + 会话 are always visible in the footer.

## Sending + delivery

- Messages are sent to the Gateway(网关); delivery to providers is off by default.
- Turn delivery on:
  - `/deliver on`
  - or the Settings panel
  - or start with `openclaw tui --deliver`

## Pickers + overlays

- Model picker: list available models and set the 会话 override.
- Agent picker: choose a different agent.
- Session picker: shows only sessions for the current agent.
- Settings: toggle deliver, 工具 output expansion, and thinking visibility.

## Keyboard shortcuts

- Enter: send message
- Esc: abort active run
- Ctrl+C: clear input (press twice to exit)
- Ctrl+D: exit
- Ctrl+L: 模型 picker
- Ctrl+G: agent picker
- Ctrl+P: 会话 picker
- Ctrl+O: toggle 工具 output expansion
- Ctrl+T: toggle thinking visibility (reloads history)

## Slash commands

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
- `/abort`（中止当前运行）
- `/settings`
- `/exit`

其他 Gateway（网关）斜杠命令（例如 `/context`）会被转发到 Gateway（网关）并作为系统输出显示。请参阅 [斜杠命令](/zh/tools/slash-commands)。

## 本地 Shell 命令

- 在行首添加 `!`，以便在 TUI 主机上运行本地 shell 命令。
- TUI 在每个会话中会提示一次以允许本地执行；拒绝将 `!` 在该会话中保持禁用状态。
- 命令在 TUI 工作目录中的全新非交互式 shell 中运行（没有持久的 `cd`/env）。
- 本地 shell 命令在其环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 将作为普通消息发送；前导空格不会触发本地执行。

## 工具输出

- 工具调用显示为包含参数 + 结果的卡片。
- Ctrl+O 在折叠/展开视图之间切换。
- 当工具运行时，部分更新会流式传输到同一张卡片中。

## 终端颜色

- TUI 将助手正文文本保持在终端的默认前景色中，因此深色和浅色终端都能保持可读性。
- 如果您的终端使用浅色背景且自动检测错误，请在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 若要强制使用原始深色调色板，请设置 `OPENCLAW_THEME=dark`。

## 历史记录 + 流式传输

- 连接时，TUI 会加载最新的历史记录（默认为 200 条消息）。
- 流式响应会原地更新，直到完成。
- TUI 还会监听代理工具事件，以显示更丰富的工具卡片。

## 连接详情

- TUI 会向 Gateway(网关)注册为 `mode: "tui"`。
- 重连时会显示一条系统消息；事件间隔会在日志中显示。

## 选项

- `--url <url>`：Gateway(网关) WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway(网关)令牌（如果需要）
- `--password <password>`：Gateway(网关)密码（如果需要）
- `--session <key>`：会话密钥（默认：`main`，或当作用域为全局时的 `global`）
- `--deliver`：将助手回复传递给提供商（默认关闭）
- `--thinking <level>`：覆盖发送时的思考级别
- `--timeout-ms <ms>`：代理超时时间（毫秒）（默认为 `agents.defaults.timeoutSeconds`）

注意：当您设置 `--url` 时，TUI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据即为错误。

## 故障排除

发送消息后无输出：

- 在 TUI 中运行 `/status` 以确认 Gateway(网关)已连接且处于空闲/忙碌状态。
- 检查 Gateway(网关)日志：`openclaw logs --follow`。
- 确认代理可以运行：`openclaw status` 和 `openclaw models status`。
- 如果您希望在聊天渠道中收到消息，请启用传递（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要加载的历史记录条目（默认为 200）

## 连接故障排除

- `disconnected`：确保 Gateway(网关)正在运行且您的 `--url/--token/--password` 正确。
- 选择器中没有代理：检查 `openclaw agents list` 和您的路由配置。
- 空会话选择器：您可能处于全局作用域中或还没有会话。

import zh from "/components/footer/zh.mdx";

<zh />
