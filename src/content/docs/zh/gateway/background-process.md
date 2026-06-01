---
summary: "后台执行执行和进程管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "后台执行和进程工具"
---

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保留在内存中。`process` 工具管理这些后台会话。

## exec 工具

关键参数：

- `command`（必需）
- `yieldMs`（默认 10000）：在此延迟后自动后台运行
- `background`（布尔值）：立即后台运行
- `timeout`（秒，默认 `tools.exec.timeoutSec`）：在此超时后终止进程；仅设置 `timeout: 0` 以禁用该调用的执行进程超时
- `elevated` (bool)：如果启用/允许提升模式，则在沙箱外运行（默认为 `gateway`，或者当 exec 目标为 `node` 时为 `node`）
- 需要真正的 TTY？设置 `pty: true`。
- `workdir`，`env`

行为：

- 前台运行直接返回输出。
- 当进入后台（显式或超时）时，该工具返回 `status: "running"` + `sessionId` 和简短的尾部输出。
- 后台和 `yieldMs` 运行继承 `tools.exec.timeoutSec`，除非调用提供了显式的 `timeout`。
- 输出将保留在内存中，直到会话被轮询或清除。
- 如果 `process` 工具不被允许，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- 生成的 exec 命令接收 `OPENCLAW_SHELL=exec` 以用于感知上下文的 shell/profile 规则。
- 对于现在开始的长时间运行工作，启动一次，并在启用且命令发出输出或失败时依赖自动完成唤醒。
- 如果自动完成唤醒不可用，或者您需要针对已干净退出且无输出的命令进行静默成功确认，请使用 `process` 确认完成。
- 不要使用 `sleep` 循环或重复轮询来模拟提醒或延迟跟进；请使用 cron 处理将来的工作。

## 子进程桥接

当在 exec/process 工具之外生成长时间运行的子进程（例如，CLI 重生或网关助手）时，请附加子进程桥接助手，以便转发终止信号并在退出/错误时分离监听器。这可以避免 systemd 上出现孤儿进程，并保持跨平台的关闭行为一致。

环境变量覆盖：

- `OPENCLAW_BASH_YIELD_MS`：默认让出（毫秒）
- `OPENCLAW_BASH_MAX_OUTPUT_CHARS`：内存输出上限（字符）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流的待处理 stdout/stderr 上限（字符数）
- `OPENCLAW_BASH_JOB_TTL_MS`：已结束会话的 TTL（毫秒，限制为 1m–3h）
- `OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`：将可写入的后台会话标记为可能正在等待输入之前的空闲输出阈值（默认 15000 毫秒）

配置（首选）：

- `tools.exec.backgroundMs` (默认值 10000)
- `tools.exec.timeoutSec` (默认值 1800)
- `tools.exec.cleanupMs` (默认值 1800000)
- `tools.exec.notifyOnExit` (默认值 true): 当后台 exec 退出时，将系统事件排队并请求心跳。
- `tools.exec.notifyOnExitEmptySuccess` (默认值 false): 为 true 时，也为未产生任何输出且成功的后台运行将完成事件排队。

## process 工具

操作：

- `list`: 运行中 + 已完成的会话
- `poll`: 排空某个会话的新输出（同时报告退出状态）
- `log`: 读取聚合输出并显示输入恢复提示（支持 `offset` + `limit`）
- `write`: 发送 stdin (`data`，可选的 `eof`)
- `send-keys`：向 PTY 支持的会话发送显式按键令牌或字节
- `submit`：向 PTY 支持的会话发送 Enter / 回车符
- `paste`：发送纯文本，可选择用括号粘贴模式包裹
- `kill`：终止后台会话
- `clear`：从内存中移除已完成的会话
- `remove`：如果正在运行则终止，否则如果已完成则清除

注：

- 只有后台会话会被列出并持久保存在内存中。
- 进程重启时会丢失会话（无磁盘持久化）。
- 仅当您运行 `process poll/log` 且记录了工具结果时，会话日志才会保存到聊天历史中。
- `process` 的作用域按代理划分；它只能看到由该代理启动的会话。
- 使用 `poll` / `log` 获取状态、日志、静默成功确认，或在自动完成唤醒不可用时获取完成确认。
- 在恢复交互式 CLI 之前，请使用 `log`，以便同时查看当前的脚本记录、
  stdin 状态和输入等待提示。
- 当您需要输入
  或干预时，请使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含派生的 `name`（命令动词 + 目标），以便快速扫描。
- `process list`、`poll` 和 `log` 仅
  在会话仍具有可写入的 stdin 并且空闲时间超过
  输入等待阈值时才报告 `waitingForInput`。
- `process log` 使用基于行的 `offset`/`limit`。
- 当同时省略 `offset` 和 `limit` 时，它返回最后 200 行并包含一个分页提示。
- 当提供 `offset` 而省略 `limit` 时，它返回从 `offset` 到末尾的内容（不限制为 200 行）。
- 轮询用于按需获取状态，而不是等待循环调度。如果工作应该
  稍后进行，请改用 cron。

## 示例

运行长任务并在稍后轮询：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

在发送输入之前检查交互式会话：

```json
{ "tool": "process", "action": "log", "sessionId": "<id>" }
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
