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
- 默认情况下已启用诊断。除非设置了 `diagnostics.enabled: false`，否则网关会记录运行事实。内存事件记录 RSS/堆字节计数、阈值压力和增长压力。超大负载事件记录被拒绝、截断或分块的内容，以及在可用时记录大小和限制。它们不记录消息文本、附件内容、Webhook 主体、原始请求或响应主体、令牌、Cookie 或机密值。相同的心跳会启动有界稳定性记录器，可通过 `openclaw gateway stability` 或 `diagnostics.stability` Gateway(网关) RPC 获取。当事件存在时，Gateway(网关) 致命退出、关闭超时和重启启动失败会将最新的记录器快照保存在 `~/.openclaw/logs/stability/` 下；请使用 `openclaw gateway stability --bundle latest` 检查最新保存的包。
- 对于错误报告，请运行 `openclaw gateway diagnostics export` 并附上生成的 zip 文件。该导出内容包含 Markdown 摘要、最新的稳定性包、经过清理的日志元数据、经过清理的 Gateway(网关) 状态/健康快照以及配置形状。该文件旨在共享：聊天文本、webhook 正文、工具输出、凭据、Cookie、帐户/消息标识符和秘密值已被省略或编辑。

## Health monitor config

- `gateway.channelHealthCheckMinutes`：Gateway 检查渠道健康的频率。默认值：`5`。设置 `0` 以全局禁用 health-monitor 重启。
- `gateway.channelStaleEventThresholdMinutes`：已连接的渠道在 health monitor 将其视为过时并重启之前可以保持空闲的时间。默认值：`30`。请保持此值大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户的健康监控重启的滚动一小时上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监控启用的同时，禁用特定渠道的健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：覆盖渠道级别设置的多账户覆盖配置。
- 这些特定渠道的覆盖设置适用于当前公开它们的内置渠道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 出现故障时

- `logged out` 或状态码 409–515 → 使用 `openclaw channels logout` 重新连接，然后 `openclaw channels login`。
- Gateway(网关) 无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 没有收到消息 → 确认关联的手机在线且发送者被允许 (`channels.whatsapp.allowFrom`)；对于群聊，确保 allowlist + 提及 规则匹配 (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`)。

## 专用的 “health” 命令

`openclaw health` 向正在运行的网关请求其健康快照（没有来自 CLI 的直接渠道 socket）。默认情况下，它可以返回一个新的缓存网关快照；然后网关在后台刷新该缓存。`openclaw health --verbose` 强制改为进行实时探测。该命令报告（如果可用）关联凭据/认证时间、每个渠道的探测摘要、会话存储摘要以及探测持续时间。如果网关无法访问或探测失败/超时，它将以非零状态退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制进行实时探测并打印网关连接详情
- `--debug`：`--verbose` 的别名

健康快照包括：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测时间）、各渠道状态、代理可用性以及会话存储摘要。
