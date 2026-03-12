---
summary: “用于检查通道连接性的健康检查步骤”
read_when:
  - Diagnosing WhatsApp channel health
title: “健康检查”
---

# 健康检查 (CLI)

在不猜测的情况下验证通道连接性的简短指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、关联通道认证时间、会话 + 近期活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、安全粘贴以供调试）。
- `openclaw status --deep` — 同时探测正在运行的网关（支持时进行按通道探测）。
- `openclaw health --json` — 请求正在运行的网关提供完整的健康快照（仅限 WS；无直接 Baileys 套接字）。
- 在 WhatsApp/WebChat 中发送 `/status` 作为独立消息，以在不调用代理的情况下获取状态回复。
- 日志：尾部 `/tmp/openclaw/openclaw-*.log` 并筛选 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（修改时间应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。计数和最近的接收者通过 `status` 显示。
- 重新链接流程：当日志中出现状态码 409–515 或 `loggedOut` 时，使用 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后，状态 515 的二维码登录流程会自动重启一次）。

## 当出现故障时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 然后使用 `openclaw channels login` 重新链接。
- 网关无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 没有收到消息 → 确认关联的手机在线且发件人被允许（`channels.whatsapp.allowFrom`）；对于群组聊天，确保允许列表 + 提及规则匹配（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 专用的“health”命令

`openclaw health --json` 请求正在运行的网关提供其健康快照（CLI 不使用直接通道套接字）。它在可用时报告关联的凭据/认证时间、按通道探测摘要、会话存储摘要和探测持续时间。如果网关无法访问或探测失败/超时，它将以非零状态退出。使用 `--timeout <ms>` 覆盖默认的 10 秒设置。
