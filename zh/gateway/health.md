---
summary: "渠道连接性的健康检查步骤"
read_when:
  - 诊断 WhatsApp 渠道健康状况
title: "Health Checks"
---

# 健康检查 (CLI)

在不猜测的情况下验证通道连接性的简短指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、关联渠道认证时间、会话 + 最近活动。
- `openclaw status --all` — 完整的本地诊断（只读，彩色，安全粘贴用于调试）。
- `openclaw status --deep` — 还会探测正在运行的 Gateway(网关)（支持时进行逐渠道探测）。
- `openclaw health --json` — 向正在运行的 Gateway(网关) 请求完整的健康快照（仅限 WS；无直接 Baileys 套接字）。
- 在 WhatsApp/WebChat 中发送 `/status` 作为独立消息，以获取状态回复而无需调用代理。
- 日志：tail `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可以在配置中覆盖）。计数和最近的接收者通过 `status` 显示。
- 重连流程：当日志中出现状态码 409–515 或 `loggedOut` 时 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后，状态 515 的二维码登录流程会自动重启一次。）

## 健康监控配置

- `gateway.channelHealthCheckMinutes`：网关检查渠道健康状况的频率。默认值：`5`。设置 `0` 以全局禁用健康监视器重启。
- `gateway.channelStaleEventThresholdMinutes`：已连接渠道在健康监视器将其视为陈旧并重启之前可以保持空闲的时间。默认值：`30`。保持此值大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户的健康监视器重启的每小时滚动上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监视启用的情况下，禁用特定渠道的健康监视器重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：覆盖渠道级别设置的多账户覆盖。
- 这些每个渠道的覆盖设置适用于当前公开了这些设置的内置渠道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 出现故障时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 重新链接，然后 `openclaw channels login`。
- Gateway(网关) 无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口繁忙，请使用 `--force`）。
- 没有收到入站消息 → 确认关联的手机已在线且发送者已被允许（`channels.whatsapp.allowFrom`）；对于群组聊天，确保白名单 + 提及规则匹配（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 专用的“health”命令

`openclaw health --json` 向正在运行的 Gateway(网关) 请求其健康快照（CLI 没有直接的渠道套接字）。它会在可用时报告关联凭据/身份验证的时长、每个渠道的探测摘要、会话存储摘要以及探测持续时间。如果 CLI 无法访问或探测失败/超时，它将以非零状态退出。使用 `--timeout <ms>` 覆盖默认的 10 秒设置。

import en from "/components/footer/en.mdx";

<en />
