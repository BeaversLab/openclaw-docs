---
summary: "后台执行执行和进程管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "后台执行和进程工具"
---

# 后台执行 + 进程工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保存在内存中。`process` 工具管理这些后台会话。

## exec 工具

关键参数：

- `command` (必填)
- `yieldMs` (默认 10000)：在此延迟后自动后台运行
- `background` (布尔值)：立即后台运行
- `timeout` (秒，默认 1800)：在此超时后终止进程
- `elevated` (布尔值)：如果启用/允许提升模式，则在沙箱外运行 (默认为 `gateway`，当执行目标为 `node` 时为 `node`)
- 需要真正的 TTY？请设置 `pty: true`。
- `workdir`, `env`

行为：

- 前台运行直接返回输出。
- 当进入后台时 (显式或超时)，该工具返回 `status: "running"` + `sessionId` 和一个简短的尾部。
- 输出将保留在内存中，直到轮询或清除会话。
- 如果 `process` 工具被禁止，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- 生成的执行命令接收 `OPENCLAW_SHELL=exec` 以用于上下文感知的 shell/配置文件规则。
- 对于现在开始的长时间运行工作，启动一次并依赖自动完成唤醒，当它被启用且命令发出输出或失败时。
- 如果自动完成唤醒不可用，或者您需要为干净退出且没有输出的命令提供静默成功确认，请使用 `process` 确认完成。
- 不要使用 `sleep` 循环或重复轮询来模拟提醒或延迟的后续工作；请使用 cron 处理未来的工作。

## 子进程桥接

在 exec/process 工具之外生成长时间运行的子进程（例如 CLI 重生或网关助手）时，请附加子进程桥接助手，以便转发终止信号并在退出/错误时分离监听器。这可以避免 systemd 上出现孤立进程，并使关机行为在各平台上保持一致。

环境变量覆盖：

- `PI_BASH_YIELD_MS`：默认让出时间（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存输出上限（字符数）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流的待处理 stdout/stderr 上限（字符数）
- `PI_BASH_JOB_TTL_MS`：已完成会话的 TTL（毫秒，限制为 1m–3h）

配置（首选）：

- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
- `tools.exec.notifyOnExit`（默认 true）：当后台 exec 退出时，将系统事件排队 + 请求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（默认 false）：为 true 时，也将为未产生任何输出且成功的后台运行将完成事件排队。

## process 工具

操作：

- `list`：正在运行 + 已完成的会话
- `poll`：排出会话的新输出（同时报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `send-keys`：向 PTY 支持的会话发送显式键标记或字节
- `submit`：向 PTY 支持的会话发送 Enter / 回车符
- `paste`：发送文本，可选择包裹在括号粘贴模式中
- `kill`：终止后台会话
- `clear`：从内存中删除已完成的会话
- `remove`：如果正在运行则杀死，否则如果已完成则清除

注意：

- 只有后台会话才会在内存中列出/保留。
- 进程重启后会话将丢失（无磁盘持久化）。
- 仅当您运行 `process poll/log` 并且工具结果被记录时，会话日志才会保存到聊天历史记录中。
- `process` 的作用域仅限于每个代理；它只能看到由该代理启动的会话。
- 当自动完成唤醒不可用时，使用 `poll` / `log` 来获取状态、日志、静默成功确认或
  完成确认。
- 当您需要输入
  或干预时，使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含一个派生的 `name`（命令动词 + 目标）以便快速扫描。
- `process log` 使用基于行的 `offset`/`limit`。
- 当 `offset` 和 `limit` 都被省略时，它返回最后 200 行并包含分页提示。
- 当提供了 `offset` 但省略了 `limit` 时，它返回从 `offset` 到末尾的内容（不限制为 200 行）。
- 轮询用于按需获取状态，而不是用于等待循环调度。如果工作应该
  稍后进行，请改用 cron。

## 示例

运行长任务并在稍后轮询：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在后台启动：

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

发送 stdin：

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

发送 PTY 键：

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

提交当前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴字面文本：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```
