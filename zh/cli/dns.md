---
summary: "CLI 参考文档，用于 `openclaw dns`（广域网发现助手）"
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "dns"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 辅助工具。目前专注于 macOS + Homebrew CoreDNS。

相关：

- Gateway 网关 discovery: [设备发现](/zh/gateway/discovery)
- Wide-area discovery config: [Configuration](/zh/gateway/configuration)

## 安装

```bash
openclaw dns setup
openclaw dns setup --apply
```

import zh from '/components/footer/zh.mdx';

<zh />
