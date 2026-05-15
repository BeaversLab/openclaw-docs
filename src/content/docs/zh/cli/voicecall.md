---
summary: "CLI 参考文档，用于 `openclaw voicecall`（voice-call 插件命令界面）"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个插件提供的命令。仅当安装并启用了 voice-call 插件时，它才会出现。

当 Gateway(网关) 运行时，操作命令 (Gateway(网关)`call`, `start`,
`continue`, `speak`, `dtmf`, `end`, 和 `status`Gateway(网关)Gateway(网关)CLI) 会被发送到该 Gateway(网关) 的
voice-call 运行时。如果无法到达任何 Gateway(网关)，它们将回退到独立的
CLI 运行时。

主要文档：

- Voice-call 插件：[Voice Call](/zh/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` 默认打印人类可读的就绪检查。请使用 `--json` 用于
脚本：

```bash
openclaw voicecall setup --json
```

`status` 默认以 JSON 格式打印活动通话。传递 `--call-id <id>` 以检查
单个通话。

对于外部提供商 (`twilio`, `telnyx`, `plivo`)，设置必须从 `publicUrl`Tailscale、隧道或 Tailscale 暴露中解析
一个公共 webhook URL。回环/私有服务回退会被拒绝，因为运营商无法访问它。

`smoke` 运行相同的就绪检查。除非同时存在 `--to` 和 `--yes`，否则它不会进行
真正的电话通话：

```bash
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

## 暴露 webhook (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全提示：仅将 webhook 端点暴露给您信任的网络。如果可能，请优先使用 Tailscale Serve 而不是 Funnel。

## 相关

- [CLI 参考](CLI/en/cli)
- [Voice call 插件](/zh/plugins/voice-call)
