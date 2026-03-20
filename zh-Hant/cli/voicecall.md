---
summary: "`openclaw voicecall` 的 CLI 參考（語音通話外掛命令介面）"
read_when:
  - 您使用語音通話外掛並且需要 CLI 進入點
  - 您想要 `voicecall call|continue|status|tail|expose` 的快速範例
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` 是一個由外掛提供的命令。它僅在安裝並啟用語音通話外掛後才會出現。

主要文件：

- 語音通話外掛：[語音通話](/zh-Hant/plugins/voice-call)

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

安全性提醒：僅將 webhook 端點公開給您信任的網路。可能的話，優先使用 Tailscale Serve 而非 Funnel。

import en from "/components/footer/en.mdx";

<en />
