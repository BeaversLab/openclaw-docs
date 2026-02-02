---
summary: "渠道连接的健康检查步骤"
read_when:
  - 诊断 WhatsApp 渠道健康
title: "Health Checks"
---
# 健康检查 (CLI)

无需猜测即可验证渠道连通性。

## 快速检查
- `openclaw status` — 本地摘要：gateway 可达性/模式、更新提示、已链接渠道认证年龄、sessions + 最近活动。
- `openclaw status --all` — 完整本地诊断（只读、彩色、安全可贴给排障）。
- `openclaw status --deep` — 额外探测运行中的 Gateway（支持的渠道会逐个探测）。
- `openclaw health --json` — 向运行中的 Gateway 请求完整健康快照（仅 WS；不直连 Baileys socket）。
- 在 WhatsApp/WebChat 发送独立消息 `/status`，无需调用 agent 即可获得状态回复。
- 日志：`tail /tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断
- 磁盘凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应较新）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。`status` 会显示数量与最近接收方。
- 重新链接流程：当日志出现 409–515 或 `loggedOut`，执行 `openclaw channels logout && openclaw channels login --verbose`。（注意：状态 515 在配对后 QR 登录会自动重启一次。）

## 失败时
- `logged out` 或状态 409–515 → 先 `openclaw channels logout`，再 `openclaw channels login`。
- Gateway 不可达 → 启动：`openclaw gateway --port 18789`（端口占用可用 `--force`）。
- 无入站消息 → 确认已连接手机在线且发送者在 allowlist（`channels.whatsapp.allowFrom`）；群聊请确认 allowlist + mention 规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用 "health" 命令

`openclaw health --json` 会向运行中的 Gateway 请求健康快照（CLI 不直连渠道 socket）。报告已链接凭据/认证年龄（若可用）、各渠道探测摘要、会话存储摘要与探测耗时。若 Gateway 不可达或探测失败/超时则退出码非 0。使用 `--timeout <ms>` 覆盖默认 10s。
