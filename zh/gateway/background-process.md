---
summary: "后台 exec 执行与进程管理"
read_when:
  - 添加或修改后台 exec 行为
  - 排查长时间运行的 exec 任务
title: "后台执行和进程工具"
---

# 后台执行和进程工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长任务保存在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

关键参数：
- `command`（必填）
- `yieldMs`（默认 10000）：超过该延迟自动后台化
- `background`（bool）：立即后台
- `timeout`（秒，默认 1800）：超过该时长终止进程
- `elevated`（bool）：若允许/启用 elevated 则在主机运行
- 需要真实 TTY？设置 `pty: true`。
- `workdir`、`env`

行为：
- 前台运行直接返回输出。
- 后台化（显式或超时）时，工具返回 `status: "running"` + `sessionId` 和一段尾部输出。
- 输出保存在内存中，直到被 poll 或 clear。
- 若 `process` 工具被禁用，`exec` 会同步运行并忽略 `yieldMs`/`background`。

## 子进程桥接

当在 exec/process 工具之外启动长运行子进程（例如 CLI 重启或 gateway helper），请附加子进程桥接 helper，以转发终止信号并在退出/错误时卸载监听。这样可避免 systemd 中的孤儿进程，并保持跨平台的一致关停行为。

环境变量覆盖：
- `PI_BASH_YIELD_MS`：默认 yield（ms）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存输出上限（chars）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流的 pending stdout/stderr 上限（chars）
- `PI_BASH_JOB_TTL_MS`：完成会话 TTL（ms，限制在 1m–3h）

配置（推荐）：
- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
 - `tools.exec.notifyOnExit`（默认 true）：后台 exec 退出时排队系统事件并请求 heartbeat。

## process 工具

动作：
- `list`：运行中 + 已完成会话
- `poll`：拉取会话新输出（也报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `kill`：终止后台会话
- `clear`：从内存移除已完成会话
- `remove`：运行中则 kill；否则 clear

注：
- 仅后台会话会被列出并保存在内存中。
- 进程重启会丢失会话（无磁盘持久化）。
- 仅当你运行 `process poll/log` 且工具结果被记录时，会话日志才会写入聊天历史。
- `process` 以 agent 为作用域；仅可见该 agent 启动的会话。
- `process list` 包含派生 `name`（命令动词 + 目标），便于快速浏览。
- `process log` 使用按行 `offset`/`limit`（省略 `offset` 则取最后 N 行）。

## 示例

运行长任务并稍后轮询：
```json
{"tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000}
```
```json
{"tool": "process", "action": "poll", "sessionId": "<id>"}
```

立即后台启动：
```json
{"tool": "exec", "command": "npm run build", "background": true}
```

发送 stdin：
```json
{"tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n"}
```
