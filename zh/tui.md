---
title: "TUI"
summary: "终端 UI（TUI）：从任意机器连接 Gateway"
read_when:
  - 想要 TUI 的入门指南
  - 需要完整的 TUI 功能、命令与快捷键列表
---

# TUI（Terminal UI）

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

若 Gateway 使用密码认证，使用 `--password`。

## 你会看到什么

- Header：连接 URL、当前 agent、当前 session。
- Chat log：用户消息、助手回复、系统提示、工具卡片。
- 状态行：连接/运行状态（connecting、running、streaming、idle、error）。
- Footer：连接状态 + agent + session + model + think/verbose/reasoning + token 计数 + deliver。
- 输入框：带自动补全的文本编辑器。

## 心智模型：agents + sessions

- Agents 是唯一 slug（如 `main`、`research`）。Gateway 会暴露列表。
- Sessions 属于当前 agent。
- Session keys 以 `agent:<agentId>:<sessionKey>` 存储。
  - 输入 `/session main` 时，TUI 会展开为 `agent:<currentAgent>:main`。
  - 输入 `/session agent:other:main` 时，会显式切换到该 agent 会话。
- Session scope：
  - `per-sender`（默认）：每个 agent 有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- Footer 始终显示当前 agent + session。

## 发送与投递

- 消息发送到 Gateway；默认不投递到 provider。
- 开启投递：
  - `/deliver on`
  - 或 Settings 面板
  - 或启动时用 `openclaw tui --deliver`

## 选择器与覆盖层

- 模型选择器：列出模型并设置会话覆盖。
- Agent 选择器：选择不同 agent。
- Session 选择器：仅显示当前 agent 的会话。
- Settings：切换投递、工具输出展开、thinking 可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：终止当前 run
- Ctrl+C：清空输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：agent 选择器
- Ctrl+P：session 选择器
- Ctrl+O：切换工具输出展开
- Ctrl+T：切换 thinking 可见性（会重新加载历史）

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
- `/abort`（终止当前 run）
- `/settings`
- `/exit`

其他 Gateway 斜杠命令（例如 `/context`）会转发给 Gateway 并作为系统输出显示。参见 [斜杠命令](/zh/tools/slash-commands)。

## 本地 shell 命令

- 以 `!` 开头的行会在 TUI 主机上运行本地 shell 命令。
- TUI 会在每个会话第一次请求时询问是否允许本地执行；拒绝后该会话内 `!` 会被禁用。
- 命令在 TUI 工作目录的全新非交互 shell 中运行（不会持久 `cd`/env）。
- 单独一个 `!` 会作为普通消息发送；前导空格不会触发本地 exec。

## 工具输出

- 工具调用显示为卡片（参数 + 结果）。
- Ctrl+O 在折叠/展开视图间切换。
- 工具运行时，局部更新会流入同一张卡片。

## 历史与流式

- 连接后，TUI 会加载最新历史（默认 200 条）。
- 流式回复会原位更新，直到最终定稿。
- TUI 还会监听 agent 工具事件，用于更丰富的工具卡片。

## 连接细节

- TUI 以 `mode: "tui"` 注册到 Gateway。
- 断线重连会显示系统消息；事件缺口会记录到日志。

## 选项

- `--url <url>`：Gateway WebSocket URL（默认来自配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway token（如需要）
- `--password <password>`：Gateway 密码（如需要）
- `--session <key>`：Session key（默认：`main`，或在 global scope 时为 `global`）
- `--deliver`：将助手回复投递到 provider（默认关闭）
- `--thinking <level>`：覆盖发送时的 thinking 级别
- `--timeout-ms <ms>`：agent 超时（毫秒，默认 `agents.defaults.timeoutSeconds`）

## 故障排查

发送消息后无输出：

- 在 TUI 运行 `/status` 确认 Gateway 已连接且 idle/busy。
- 查看 Gateway 日志：`openclaw logs --follow`。
- 确认 agent 可运行：`openclaw status` 与 `openclaw models status`。
- 若期望消息出现在聊天频道，请开启投递（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：加载的历史条数（默认 200）。

## 故障排查

- `disconnected`：确保 Gateway 运行，且 `--url/--token/--password` 正确。
- 选择器无 agent：检查 `openclaw agents list` 与路由配置。
- session 选择器为空：可能在 global scope 或尚无会话。
