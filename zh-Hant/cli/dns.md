---
summary: "`openclaw dns` 的 CLI 參考（廣域探索輔助工具）"
read_when:
  - 您想要透過 Tailscale + CoreDNS 進行廣域探索 (DNS-SD)
  - 您正在為自訂探索網域設定 Split DNS（例如：openclaw.internal）
title: "dns"
---

# `openclaw dns`

廣域探索（Tailscale + CoreDNS）的 DNS 輔助工具。目前主要專注於 macOS + Homebrew CoreDNS。

相關連結：

- 閘道探索：[Discovery](/zh-Hant/gateway/discovery)
- 廣域探索設定：[Configuration](/zh-Hant/gateway/configuration)

## 安裝設定

```bash
openclaw dns setup
openclaw dns setup --apply
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
