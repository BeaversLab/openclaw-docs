---
summary: "后台执行执行和进程管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "后台执行和进程工具"
---

# 后台执行 + 进程工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保留在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

关键参数：

- `command` (必填)
- `yieldMs` (默认 10000)：在此延迟后自动转为后台
- `background` (布尔值)：立即转为后台
- `timeout` (秒，默认 1800)：在此超时后终止进程
- `elevated` (布尔值)：如果启用/允许提升模式，则在主机上运行
- 需要真实的 TTY？设置 `pty: true`。
- `workdir`, `env`

行为：

- 前台运行直接返回输出。
- 当转为后台时（显式或超时），工具返回 `status: "running"` + `sessionId` 和简短的尾部输出。
- 输出将保留在内存中，直到轮询或清除会话。
- 如果 `process` 工具被禁用，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- 生成的执行命令接收 `OPENCLAW_SHELL=exec` 以用于感知上下文的 shell/配置文件规则。

## 子进程桥接

在 exec/process 工具之外生成长时间运行的子进程（例如，CLI 重生或网关助手）时，请附加子进程桥接助手，以便转发终止信号并在退出/错误时分离侦听器。这可以避免 systemd 上的孤立进程，并使各平台上的关闭行为保持一致。

环境覆盖：

- `PI_BASH_YIELD_MS`：默认让渡 (毫秒)
- `PI_BASH_MAX_OUTPUT_CHARS`：内存输出上限 (字符)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流的待处理 stdout/stderr 上限 (字符)
- `PI_BASH_JOB_TTL_MS`：已结束会话的 TTL (毫秒，限制为 1m–3h)

配置（首选）：

- `tools.exec.backgroundMs` (默认 10000)
- `tools.exec.timeoutSec` (默认 1800)
- `tools.exec.cleanupMs` (默认 1800000)
- `tools.exec.notifyOnExit` (默认 true)：当后台执行退出时，将系统事件排队 + 请求心跳。
- `tools.exec.notifyOnExitEmptySuccess` (默认 false)：为 true 时，也将为未产生输出的成功后台运行将完成事件排队。

## 进程工具

操作：

- `list`: 运行中 + 已完成的会话
- `poll`: 获取会话的新输出（同时也报告退出状态）
- `log`: 读取聚合输出（支持 `offset` + `limit`）
- `write`: 发送 stdin（`data`，可选 `eof`）
- `kill`: 终止后台会话
- `clear`: 从内存中移除已完成的会话
- `remove`: 如果正在运行则终止，否则如果已完成则清除

说明：

- 只有后台会话才会被列出并保存在内存中。
- 进程重启后会话将丢失（无磁盘持久化）。
- 仅当您运行 `process poll/log` 并且工具结果被记录时，会话日志才会保存到聊天记录中。
- `process` 的范围是针对每个代理的；它只能看到由该代理启动的会话。
- `process list` 包含一个派生的 `name`（命令动词 + 目标）以便快速扫描。
- `process log` 使用基于行的 `offset`/`limit`。
- 当 `offset` 和 `limit` 都被省略时，它返回最后 200 行并包含分页提示。
- 当提供了 `offset` 但省略了 `limit` 时，它返回从 `offset` 到末尾的内容（不限制为 200 行）。

## 示例

运行长任务并稍后轮询：

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
