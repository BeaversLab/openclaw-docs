---
summary: "频道连接的健康检查步骤"
read_when:
  - "Diagnosing WhatsApp channel health"
title: "健康检查"
---

# Health Checks (CLI)

验证频道连接的简明指南，无需猜测。

## 快速检查

- `openclaw status` — 本地摘要：gateway 可达性/模式、更新提示、链接的频道认证时间、会话和最近活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、安全粘贴用于调试）。
- `openclaw status --deep` — 还会探测正在运行的 Gateway（支持时进行按频道探测）。
- `openclaw health --json` — 向正在运行的 Gateway 请求完整的健康快照（仅 WS；无直接 Baileys 套接字）。
- 在 WhatsApp/WebChat 中将 `/status` 作为独立消息发送，以在不调用代理的情况下获取状态回复。
- 日志：tail `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭证：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（修改时间应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可以在配置中覆盖）。计数和最近的收件人通过 `status` 显示。
- 重新链接流程：当日志中出现状态码 409–515 或 `loggedOut` 时，运行 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后，状态 515 的 QR 登录流程会自动重启一次。）

## 故障排除

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 重新链接，然后 `openclaw channels login`。
- Gateway 无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口忙碌，使用 `--force`）。
- 没有收到消息 → 确认链接的手机在线且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，确保允许列表 + 提及规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用 "health" 命令

`openclaw health --json` 向正在运行的 Gateway 请求其健康快照（CLI 无直接频道套接字）。它会在可用时报告链接的凭证/认证时间、按频道探测摘要、会话存储摘要和探测持续时间。如果 Gateway 无法访问或探测失败/超时，它将以非零退出码退出。使用 `--timeout <ms>` 覆盖 10 秒的默认值。
