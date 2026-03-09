---
summary: "`openclaw logs` 的 CLI 参考（广域发现助手）"
read_when:
  - "You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS"
  - You’re setting up split DNS for a custom discovery domain (example: "openclaw.internal)"
title: "dns"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 助手。目前专注于 macOS + Homebrew CoreDNS。

相关内容：

- Gateway 发现：[发现](/en/gateway/discovery)
- 广域发现配置：[配置](/en/gateway/configuration)

## 设置

```bash
openclaw dns setup
openclaw dns setup --apply
```