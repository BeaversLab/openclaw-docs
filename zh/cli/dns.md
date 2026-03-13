---
summary: “`openclaw dns`（广域发现辅助工具）的 CLI 参考”
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: “dns”
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 辅助工具。目前专注于 macOS + Homebrew CoreDNS。

相关：

- 网关发现：[Discovery](/zh/en/gateway/discovery)
- 广域发现配置：[Configuration](/zh/en/gateway/configuration)

## 安装

```bash
openclaw dns setup
openclaw dns setup --apply
```

import zh from '/components/footer/zh.mdx';

<zh />
