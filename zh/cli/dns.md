---
summary: "`openclaw dns` 的 CLI 参考（广域发现辅助）"
read_when:
  - 你想通过 Tailscale + CoreDNS 实现广域发现（DNS-SD）
  - 你在为自定义发现域（如 openclaw.internal）配置 split DNS
title: "dns"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 辅助工具。目前聚焦 macOS + Homebrew CoreDNS。

相关：
- Gateway 发现：[Discovery](/zh/gateway/discovery)
- 广域发现配置：[Configuration](/zh/gateway/configuration)

## 设置

```bash
openclaw dns setup
openclaw dns setup --apply
```
