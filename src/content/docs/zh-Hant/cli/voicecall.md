---
summary: "`openclaw voicecall` 的 CLI 參考（語音通話外掛指令介面）"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是一個由外掛提供的指令。只有在安裝並啟用 voice-call 外掛時才會顯示。

主要文件：

- Voice-call 外掛：[Voice Call](/en/plugins/voice-call)

## 常用指令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## 公開 Webhook (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全注意事項：僅將 webhook 端點公開給您信任的網路。如果可能的話，優先選擇 Tailscale Serve 而非 Funnel。
