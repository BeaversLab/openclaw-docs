---
summary: "CLI 参考，适用于 `openclaw voicecall`（语音通话插件命令界面）"
read_when:
  - 您使用语音通话插件并希望获取 CLI 入口点
  - 您想要 `voicecall call|continue|status|tail|expose` 的快速示例
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是由插件提供的命令。它仅在安装并启用了语音通话插件时才会出现。

主要文档：

- 语音通话插件：[Voice Call](/zh/plugins/voice-call)

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

安全提示：仅将 webhook 端点公开给您信任的网络。在可能的情况下，优先使用 Tailscale Serve 而不是 Funnel。

import en from "/components/footer/en.mdx";

<en />
