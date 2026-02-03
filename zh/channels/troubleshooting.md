---
summary: "渠道专项故障排查速记（Discord/Telegram/WhatsApp）"
read_when:
  - 渠道已连接但消息不通
  - 排查渠道配置问题（intents、权限、隐私模式）
title: "渠道故障排查"
---

# 渠道故障排查

先从这里开始：

```bash
openclaw doctor
openclaw channels status --probe
```

`channels status --probe` 在能检测到常见渠道配置问题时会给出警告，并包含一些轻量的实时检查（凭据、部分权限/成员关系）。

## Channels

- Discord：[/channels/discord#troubleshooting](/zh/channels/discord#troubleshooting)
- Telegram：[/channels/telegram#troubleshooting](/zh/channels/telegram#troubleshooting)
- WhatsApp：[/channels/whatsapp#troubleshooting-quick](/zh/channels/whatsapp#troubleshooting-quick)

## Telegram 快速修复

- 日志出现 `HttpError: Network request for 'sendMessage' failed` 或 `sendChatAction` → 检查 IPv6 DNS。若 `api.telegram.org` 优先解析 IPv6 且主机无 IPv6 出网，请强制 IPv4 或开启 IPv6。见 [/channels/telegram#troubleshooting](/zh/channels/telegram#troubleshooting)。
- 日志出现 `setMyCommands failed` → 检查到 `api.telegram.org` 的出站 HTTPS 与 DNS 可达性（常见于受限 VPS 或代理）。
