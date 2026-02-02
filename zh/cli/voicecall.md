---
summary: "`openclaw voicecall` 的 CLI 参考（语音通话插件命令）"
read_when:
  - 使用语音通话插件并需要 CLI 入口
  - 想快速查看 `voicecall call|continue|status|tail|expose` 示例
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是插件提供的命令。仅在语音通话插件已安装并启用时出现。

主文档：
- 语音通话插件：[Voice Call](/zh/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## 暴露 webhooks（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall unexpose
```

安全提示：仅将 webhook 端点暴露到可信网络。能用 Tailscale Serve 就不要用 Funnel。
