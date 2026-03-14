---
summary: "通道连接性的健康检查步骤"
read_when:
  - Diagnosing WhatsApp channel health
title: "健康检查"
---

# 健康检查 (CLI)

在不猜测的情况下验证通道连接性的简短指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、已关联通道的验证时长、会话 + 近期活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、可安全粘贴用于调试）。
- `openclaw status --deep` — 同时探测正在运行的 Gateway 网关（受支持时进行逐通道探测）。
- `openclaw health --json` — 向正在运行的 Gateway 网关 请求完整的健康快照（仅限 WS；无直接 Baileys 套接字）。
- 在 WhatsApp/WebChat 中将 `/status` 作为独立消息发送，以便在不调用代理的情况下获取状态回复。
- 日志：尾部 `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（修改时间应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可以在配置中覆盖）。计数和最近的接收者会通过 `status` 显示。
- 重新关联流程：当日志中出现状态码 409–515 或 `loggedOut` 时，执行 `openclaw channels logout && openclaw channels login --verbose`。（注意：状态 515 配对后，二维码登录流程会自动重启一次。）

## 当出现故障时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 然后执行 `openclaw channels login` 重新关联。
- Gateway 网关 无法访问 → 启动它：`openclaw gateway --port 18789`（如果端口被占用，使用 `--force`）。
- 没有收到传入消息 → 确认关联的手机在线并且发件人被允许（`channels.whatsapp.allowFrom`）；对于群聊，确保允许列表 + 提及规则匹配（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 专用的“health”命令

`openclaw health --json` 向正在运行的 Gateway 网关 请求其健康快照（CLI 不直接使用通道套接字）。报告链接的凭据/认证寿命（如果可用）、每个通道的探测摘要、会话存储摘要以及探测持续时间。如果 Gateway 网关 无法访问或探测失败/超时，则以非零状态退出。使用 `--timeout <ms>` 覆盖 10 秒的默认值。

import zh from '/components/footer/zh.mdx';

<zh />
