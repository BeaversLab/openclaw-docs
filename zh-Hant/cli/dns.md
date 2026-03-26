---
summary: "CLI 參考資料：`openclaw dns`（廣域網探索輔助工具）"
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "dns"
---

# `openclaw dns`

廣域網探索（Tailscale + CoreDNS）的 DNS 輔助工具。目前主要支援 macOS + Homebrew CoreDNS。

相關連結：

- 閘道探索：[Discovery](/zh-Hant/gateway/discovery)
- 廣域網探索設定：[Configuration](/zh-Hant/gateway/configuration)

## 安裝設定

```bash
openclaw dns setup
openclaw dns setup --apply
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
