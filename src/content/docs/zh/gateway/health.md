---
summary: "Health check commands and gateway health monitoring"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "健康检查"
---

# 健康检查 (CLI)

在不猜测的情况下验证通道连接性的简短指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、已关联通道的验证时长、会话 + 近期活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、可安全粘贴用于调试）。
- `openclaw status --deep` — 向正在运行的网关请求实时健康探测（`health` 带有 `probe:true`），如果支持，还包括每个账户的渠道探测。
- `openclaw health` — 向正在运行的网关请求其健康快照（仅限 WS；CLI 没有直接的渠道套接字）。
- `openclaw health --verbose` — 强制进行实时健康探测并打印网关连接详细信息。
- `openclaw health --json` — 机器可读的健康快照输出。
- 在 WhatsApp/WebChat 中将 `/status` 作为独立消息发送，以获取状态回复而不调用代理。
- 日志：tail `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可以在配置中覆盖）。计数和最近的接收者通过 `status` 显示。
- 重新链接流程：当日志中出现状态代码 409–515 或 `loggedOut` 时，执行 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后，QR 登录流程会针对状态 515 自动重新启动一次）。

## 健康监视器配置

- `gateway.channelHealthCheckMinutes`：网关检查渠道健康的频率。默认值：`5`。设置 `0` 以全局禁用健康监视器重启。
- `gateway.channelStaleEventThresholdMinutes`：连接的渠道在健康监视器将其视为陈旧并重启之前可以保持空闲的最长时间。默认值：`30`。请保持此值大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户的健康监视器重启的一小时滚动上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监视器启用的情况下，禁用特定渠道的健康监视器重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：覆盖渠道级别设置的多账户覆盖项。
- 这些按渠道的覆盖设置适用于当前暴露这些设置的内置渠道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 当发生故障时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 重新链接，然后 `openclaw channels login`。
- Gateway(网关) 无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 没有收到入站消息 → 确认关联的手机已在线且发件人被允许（`channels.whatsapp.allowFrom`）；对于群组聊天，确保允许列表和提及规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用的“health”命令

`openclaw health` 会向正在运行的 CLI 请求其健康快照（CLI 没有直接的渠道套接字）。默认情况下，它可以返回一个新的缓存网关快照；随后网关会在后台刷新该缓存。`openclaw health --verbose` 强制改为进行实时探测。该命令会在可用时报告关联的凭证/身份验证的时长、每个渠道的探测摘要、会话存储摘要以及探测持续时间。如果网关无法访问或探测失败/超时，它将以非零状态退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制进行实时探测并打印网关连接详细信息
- `--debug`：`--verbose` 的别名

健康快照包括：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测时间）、每个渠道的状态、代理可用性以及会话存储摘要。
