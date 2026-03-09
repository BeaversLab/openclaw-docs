---
summary: "`openclaw voicecall` 的 CLI 参考（voice-call 插件命令界面）"
read_when:
  - "You use the voice-call plugin and want the CLI entry points"
  - "You want quick examples for `voicecall call|continue|status|tail|expose`"
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个插件提供的命令。只有在安装并启用了 voice-call 插件时才会显示。

主要文档：

- Voice-call 插件：[Voice Call](/zh/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## 暴露 Webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall unexpose
```

安全注意事项：仅将 webhook 端点暴露给您信任的网络。尽可能优先使用 Tailscale Serve 而不是 Funnel。
