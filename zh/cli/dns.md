---
summary: "CLI 参考，用于 `openclaw dns`（广域设备发现辅助工具）"
read_when:
  - 您希望通过 Tailscale + CoreDNS 进行广域设备发现（DNS-SD）
  - 您正在为自定义设备发现域（例如：openclaw.internal）设置拆分 DNS
title: "dns"
---

# `openclaw dns`

用于广域设备发现的 DNS 辅助工具（Tailscale + CoreDNS）。目前主要面向 macOS + Homebrew CoreDNS。

相关内容：

- Gateway(网关) 设备发现：[设备发现](/zh/gateway/discovery)
- 广域设备发现配置：[Configuration](/zh/gateway/configuration)

## 设置

```bash
openclaw dns setup
openclaw dns setup --apply
```

import en from "/components/footer/en.mdx";

<en />
