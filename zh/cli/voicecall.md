---
summary: "`openclaw voicecall`（语音通话插件命令界面）的 CLI 参考"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。它仅在已安装并启用语音通话插件时出现。

主要文档：

- Voice-call 插件：[语音通话](/en/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## 公开 Webhook (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全提示：请仅将 webhook 端点暴露给您信任的网络。尽可能使用 Tailscale Serve 而不是 Funnel。

import zh from '/components/footer/zh.mdx';

<zh />
