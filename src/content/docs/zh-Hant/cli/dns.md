---
summary: "CLI 參考手冊（廣域發現輔助工具） `openclaw dns`"
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "dns"
---

# `openclaw dns`

用於廣域發現（Tailscale + CoreDNS）的 DNS 輔助工具。目前主要針對 macOS + Homebrew CoreDNS。

相關主題：

- 閘道發現：[Discovery](/en/gateway/discovery)
- 廣域發現設定：[Configuration](/en/gateway/configuration)

## 設定

```bash
openclaw dns setup
openclaw dns setup --apply
```
