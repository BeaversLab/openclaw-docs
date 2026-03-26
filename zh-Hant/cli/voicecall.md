---
summary: "`openclaw voicecall` (語音通話外掛程式指令介面) 的 CLI 參考"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是一個由外掛程式提供的指令。只有在安裝並啟用語音通話外掛程式後，它才會顯示。

主要文件：

- 語音通話外掛程式：[Voice Call](/zh-Hant/plugins/voice-call)

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

安全注意事項：僅將 webhook 端點公開給您信任的網路。可能的話，優先使用 Tailscale Serve 而非 Funnel。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
