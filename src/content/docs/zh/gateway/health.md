---
summary: "Health check commands and gateway health monitoring"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "健康检查"
---

在不猜测的情况下验证渠道连接性的简短指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、关联的渠道认证时长、会话及近期活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、粘贴进行调试是安全的）。
- `openclaw status --deep` — 询问运行中的网关以进行实时健康探测（带 `probe:true` 的 `health`），包括支持时针对每个账户的渠道探测。
- `openclaw health` — 询问运行中的网关以获取其健康快照（仅限 WS；CLI 无直接的渠道套接字）。
- `openclaw health --verbose` — 强制执行实时健康探测并打印网关连接详情。
- `openclaw health --json` — 机器可读的健康快照输出。
- 在 WhatsApp/WebChat 中将 `/status` 作为独立消息发送，以获取状态回复而不调用代理。
- 日志：跟踪 `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

对于 Discord 和其他聊天提供商，会话行并不代表 Socket 的活跃状态。Discord`openclaw sessions`Gateway(网关)、Gateway(网关) `sessions.list` 和代理 `sessions_list` 工具读取存储的对话状态。提供商可以在任何新的会话行具体化之前重新连接并显示健康的渠道状态。请使用上述渠道状态和运行状况命令进行实时连接检查。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可以在配置中覆盖）。计数和最近的接收者通过 `status` 显示。
- 重新链接流程：当日志中出现状态码 409–515 或 `loggedOut` 时，请运行 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后，对于状态 515，二维码登录流程会自动重启一次。）
- 默认启用诊断。除非设置了 `diagnostics.enabled: false`，否则 Gateway 会记录运行情况。内存事件记录 RSS/堆字节数、阈值压力和增长压力。严重的内存压力通过 Gateway 记录器记录日志。当设置了 `diagnostics.memoryPressureSnapshot: true`Linux 时，严重的内存压力还会写入一个 OOM 前稳定性包，其中包含 V8 堆统计信息（如有）、Linux cgroup 计数器、活动资源计数，以及按已编辑相对路径排列的最大会话/记录文件。当进程正在运行但已饱和时，活跃警告会记录事件循环延迟、事件循环利用率、CPU 内核比率以及活动/等待/排队中的会话数。超大载荷事件记录被拒绝、截断或分块的内容，以及可用的大小和限制。它们不会记录消息文本、附件内容、Webhook 主体、原始请求或响应主体、令牌、Cookie 或密钥值。同一心跳会启动有界稳定性记录器，该记录器可通过 `openclaw gateway stability` 或 `diagnostics.stability`Gateway(网关)RPCGateway(网关) Gateway RPC 访问。致命的 Gateway 退出、关闭超时和重启启动失败会在存在事件时将最新的记录器快照保存在 `~/.openclaw/logs/stability/` 下；严重的内存压力仅在设置了 `diagnostics.memoryPressureSnapshot: true` 时才会这样做。使用 `openclaw gateway stability --bundle latest` 检查最新保存的包。
- 对于错误报告，请运行 `openclaw gateway diagnostics export`Gateway(网关) 并附上生成的 zip 文件。导出内容结合了 Markdown 摘要、最新的稳定性包、经过清理的日志元数据、经过清理的 Gateway 状态/健康快照以及配置形状。它旨在共享：聊天文本、Webhook 主体、工具输出、凭据、Cookie、账户/消息标识符和密钥值会被省略或编辑。请参阅[诊断导出](/zh/gateway/diagnostics)。

## 健康监视器配置

- `gateway.channelHealthCheckMinutes`：Gateway 检查渠道健康的频率。默认值：`5`。设置 `0` 可全局禁用运行状况监视器重启。
- `gateway.channelStaleEventThresholdMinutes`：已连接的渠道在健康监视器将其视为陈旧并重新启动之前可以保持空闲的时间。默认值：`30`。请保持此值大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户的健康监视器重新启动的滚动一小时上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监视启用的情况下，禁用特定渠道的健康监视器重新启动。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：覆盖渠道级别设置的多账户覆盖项。
- 这些每个渠道的覆盖设置适用于当前公开这些设置的内置渠道监视器：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 当出现故障时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 重新链接，然后 `openclaw channels login`。
- Gateway(网关) 无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口繁忙，请使用 `--force`）。
- 没有收到传入消息 → 确认关联的手机在线且允许发送者（`channels.whatsapp.allowFrom`）；对于群组聊天，确保允许列表 + 提及规则匹配（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 专用的“health”命令

`openclaw health` 向正在运行的 Gateway 请求其健康快照（CLI 没有直接的渠道套接字）。默认情况下，它可以返回一个新的缓存 Gateway 快照；Gateway 然后在后台刷新该缓存。`openclaw health --verbose` 强制改为进行实时探测。该命令报告可用的关联凭据/身份验证时间、按渠道列出的探测摘要、会话存储摘要以及探测持续时间。如果 Gateway 无法访问或探测失败/超时，它将以非零状态退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制进行实时探测并打印 Gateway 连接详细信息
- `--debug`：`--verbose` 的别名

健康快照包括：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测时间）、按渠道列出的状态、代理可用性以及会话存储摘要。

## 相关

- [Gateway(网关) runbook](<Gateway(网关)/en/gateway>)
- [Diagnostics export](/zh/gateway/diagnostics)
- [Gateway(网关) 故障排除](<Gateway(网关)/en/gateway/troubleshooting>)
