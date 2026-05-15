---
summary: "后台执行执行和进程管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "后台执行和进程工具"
---

OpenClaw 通过 OpenClaw`exec` 工具运行 shell 命令，并将长时间运行的任务保留在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

关键参数：

- `command`（必需）
- `yieldMs`（默认 10000）：在此延迟后自动转为后台
- `background`（布尔值）：立即进入后台
- `timeout`（秒，默认 `tools.exec.timeoutSec`）：在此超时后终止进程；仅设置 `timeout: 0` 可禁用该调用的 exec 进程超时
- `elevated`（布尔值）：如果启用/允许提升模式，则在沙箱外运行（默认为 `gateway`，当 exec 目标为 `node` 时为 `node`）
- 需要真实的 TTY？设置 `pty: true`。
- `workdir`、`env`

行为：

- 前台运行直接返回输出。
- 当进入后台时（显式或超时），工具返回 `status: "running"` + `sessionId` 以及简短的尾部输出。
- 后台和 `yieldMs` 运行会继承 `tools.exec.timeoutSec`，除非调用提供了显式的 `timeout`。
- 输出将保留在内存中，直到会话被轮询或清除。
- 如果 `process` 工具不被允许，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- 生成的 exec 命令会接收 `OPENCLAW_SHELL=exec`，以用于上下文感知的 shell/profile 规则。
- 对于现在开始的长时间运行工作，启动一次，并在启用且命令发出输出或失败时依赖自动完成唤醒。
- 如果自动完成唤醒不可用，或者您需要针对干净退出且无输出的命令进行静默成功确认，请使用 `process` 来确认完成。
- 不要使用 `sleep` 循环或重复轮询来模拟提醒或延迟的后续跟进；请使用 cron 处理未来的工作。

## 子进程桥接

当在 exec/process 工具之外生成长时间运行的子进程（例如，CLI 重生或网关助手）时，请附加子进程桥接助手，以便转发终止信号并在退出/错误时分离监听器。这可以避免 systemd 上出现孤儿进程，并保持跨平台的关闭行为一致。

环境变量覆盖：

- `PI_BASH_YIELD_MS`：默认让出时间（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存输出上限（字符数）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流的待处理 stdout/stderr 上限（字符数）
- `PI_BASH_JOB_TTL_MS`：已完成会话的 TTL（毫秒，限制在 1 分钟到 3 小时之间）

配置（首选）：

- `tools.exec.backgroundMs`（默认为 10000）
- `tools.exec.timeoutSec`（默认为 1800）
- `tools.exec.cleanupMs`（默认为 1800000）
- `tools.exec.notifyOnExit`（默认为 true）：当后台 exec 退出时，将系统事件加入队列并请求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（默认为 false）：如果为 true，也会为没有产生任何输出的成功后台运行加入完成事件。

## process 工具

操作：

- `list`：列出正在运行和已完成的会话
- `poll`：排出会话的新输出（同时报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `send-keys`：向 PTY 支持的会话发送显式键令牌或字节
- `submit`：向 PTY 支持的会话发送 Enter / 回车
- `paste`：发送字面文本，可选择包裹在括号粘贴模式中
- `kill`：终止后台会话
- `clear`：从内存中移除已完成的会话
- `remove`：如果正在运行则终止，否则如果已完成则清除

注意：

- 只有后台会话才会被列出并保留在内存中。
- 进程重启后会话将丢失（无磁盘持久化）。
- 仅当您运行 `process poll/log` 且记录了工具结果时，会话日志才会保存到聊天记录中。
- `process` 的作用域限于每个代理；它只能看到由该代理启动的会话。
- 当无法使用自动完成唤醒时，请使用 `poll` / `log` 来获取状态、日志、静默成功确认或
  完成确认。
- 当您需要输入
  或干预时，请使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含派生的 `name`（命令动词 + 目标）以便快速扫描。
- `process log` 使用基于行的 `offset`/`limit`。
- 当同时省略 `offset` 和 `limit` 时，它返回最后 200 行并包含分页提示。
- 当提供了 `offset` 但省略了 `limit` 时，它返回从 `offset` 到结尾的内容（不限制为 200 行）。
- 轮询用于按需获取状态，而非用于等待循环调度。如果工作应
  在稍后进行，请改用 cron。

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

发送 PTY 按键：

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

提交当前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴文本：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## 相关

- [Exec 工具](/zh/tools/exec)
- [Exec 批准](/zh/tools/exec-approvals)
