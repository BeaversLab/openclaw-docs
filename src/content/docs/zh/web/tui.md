---
summary: "终端 UI (TUI)：连接到 Gateway 或在嵌入式模式下本地运行"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (终端用户界面)

## 快速开始

### Gateway(网关) 模式

1. 启动 Gateway(网关)。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入消息并按 Enter。

远程 Gateway(网关)：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway(网关) 使用密码认证，请使用 `--password`。

### 本地模式

在没有 Gateway(网关) 的情况下运行 TUI：

```bash
openclaw chat
# or
openclaw tui --local
```

注意：

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的别名。
- `--local` 不能与 `--url`、`--token` 或 `--password` 结合使用。
- 本地模式直接使用嵌入式代理运行时。大多数本地工具可用，但仅 Gateway(网关) 支持的功能不可用。

## 您所看到的

- 页眉：连接 URL、当前代理、当前会话。
- 聊天记录：用户消息、助手回复、系统通知、工具卡片。
- 状态栏：连接/运行状态（连接中、运行中、流式传输中、空闲、错误）。
- 页脚：连接状态 + agent + 会话 + 模型 + think/fast/verbose/trace/reasoning + token 计数 + deliver。
- 输入：带有自动补全功能的文本编辑器。

## 心智模型：agents + 会话

- Agents 是唯一的标识符（例如 `main`，`research`）。Gateway(网关) 会公开此列表。
- 会话属于当前的 agent。
- 会话密钥存储为 `agent:<agentId>:<sessionKey>`。
  - 如果您输入 `/session main`，TUI 会将其展开为 `agent:<currentAgent>:main`。
  - 如果您输入 `/session agent:other:main`，您将显式切换到该 agent 会话。
- 会话范围：
  - `per-sender`（默认）：每个 agent 拥有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前的 Agent + 会话始终在页脚中可见。

## 发送 + 投递

- 消息被发送到 Gateway(网关)；默认关闭向提供商的投递。
- 开启投递：
  - `/deliver on`
  - 或设置面板
  - 或以 `openclaw tui --deliver` 启动

## 选择器 + 覆盖层

- 模型选择器：列出可用模型并设置会话覆盖。
- Agent 选择器：选择不同的 Agent。
- 会话选择器：仅显示当前 Agent 的会话。
- 设置：切换投递、工具输出扩展和思考可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止活动运行
- Ctrl+C：清除输入（按两次退出）
- Ctrl+D：退出
- Ctrl+L：模型选择器
- Ctrl+G：Agent 选择器
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
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：

- `/new` 或 `/reset`（重置会话）
- `/abort` (中止活动运行)
- `/settings`
- `/exit`

仅限本地模式：

- `/auth [provider]` 在 TUI 内部打开提供商认证/登录流程。

其他 Gateway(网关) 斜杠命令（例如 `/context`）会被转发到 Gateway(网关) 并显示为系统输出。请参阅 [斜杠命令](/zh/tools/slash-commands)。

## 本地 Shell 命令

- 在行首加上 `!`，以便在 TUI 主机上运行本地 shell 命令。
- TUI 每次会话提示一次以允许本地执行；拒绝将使 `!` 在该会话中保持禁用状态。
- 命令在 TUI 工作目录中的一个全新、非交互式 shell 中运行（没有持久的 `cd`/env）。
- 本地 shell 命令会在其环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独的 `!` 将作为普通消息发送；前导空格不会触发本地执行。

## 从本地 TUI 修复配置

当当前配置已经验证通过，并且您希望嵌入式代理在同一台机器上检查它、将其与文档进行比较，并帮助修复配置漂移而不依赖正在运行的 Gateway(网关) 时，请使用本地模式。

如果 `openclaw config validate` 已经失败，请先从 `openclaw configure` 或 `openclaw doctor --fix` 开始。`openclaw chat` 不会绕过无效配置保护。

典型循环：

1. 启动本地模式：

```bash
openclaw chat
```

2. 询问代理您想要检查的内容，例如：

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. 使用本地 shell 命令进行确切的证据收集和验证：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. 使用 `openclaw config set` 或 `openclaw configure` 应用细微的更改，然后重新运行 `!openclaw config validate`。
5. 如果 Doctor 建议进行自动迁移或修复，请先检查，然后运行 `!openclaw doctor --fix`。

提示：

- 相比手动编辑 `openclaw.json`，优先使用 `openclaw config set` 或 `openclaw configure`。
- `openclaw docs "<query>"` 会从同一台机器搜索实时文档索引。
- `openclaw config validate --json` 在您需要结构化架构以及 SecretRef/可解析性错误时非常有用。

## 工具输出

- 工具调用以卡片形式显示，包含参数和结果。
- Ctrl+O 在折叠和展开视图之间切换。
- 工具运行时，部分更新会流式传输到同一张卡片中。

## 终端颜色

- TUI 将助手正文文本保留在终端的默认前景色中，以便深色和浅色终端都能保持可读性。
- 如果您的终端使用浅色背景且自动检测错误，请在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 要强制使用原始深色调色板，请设置 `OPENCLAW_THEME=dark`。

## 历史记录 + 流式传输

- 连接时，TUI 会加载最新的历史记录（默认为 200 条消息）。
- 流式响应会原位更新，直到完成。
- TUI 还会监听代理工具事件，以提供更丰富的工具卡片。

## 连接详情

- TUI 向 Gateway(网关) 注册为 `mode: "tui"`。
- 重连时会显示一条系统消息；事件间隔会在日志中显示。

## 选项

- `--local`：针对本地嵌入式代理运行时运行
- `--url <url>`：Gateway(网关) WebSocket URL（默认为配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway(网关) 令牌（如果需要）
- `--password <password>`：Gateway(网关) 密码（如果需要）
- `--session <key>`: 会话密钥（默认为 `main`，当作用域为全局时为 `global`）
- `--deliver`: 将助手回复传递给提供商（默认关闭）
- `--thinking <level>`: 覆盖发送时的思考级别
- `--message <text>`: 连接后发送初始消息
- `--timeout-ms <ms>`: 代理超时时间，以毫秒为单位（默认为 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`: 要加载的历史记录条目（默认 `200`）

注意：当您设置 `--url` 时，TUI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据会导致错误。
在本地模式下，不要传递 `--url`、`--token` 或 `--password`。

## 故障排除

发送消息后无输出：

- 在 TUI 中运行 `/status` 以确认 Gateway(网关) 是否已连接以及处于空闲/忙碌状态。
- 检查 Gateway(网关) 日志：`openclaw logs --follow`。
- 确认 agent 可以运行：`openclaw status` 和 `openclaw models status`。
- 如果您期望在聊天渠道中收到消息，请启用投递（`/deliver on` 或 `--deliver`）。

## 连接故障排除

- `disconnected`：确保 Gateway(网关) 正在运行并且您的 `--url/--token/--password` 是正确的。
- 选择器中没有代理：检查 `openclaw agents list` 和您的路由配置。
- 会话选择器为空：您可能处于全局作用域中或还没有会话。

## 相关

- [控制界面](/zh/web/control-ui) — 基于 Web 的控制界面
- [配置](/zh/cli/config) — 检查、验证和编辑 `openclaw.json`
- [医生](/zh/cli/doctor) — 引导式修复和迁移检查
- [CLI 参考](/zh/cli) — 完整的 CLI 命令参考
