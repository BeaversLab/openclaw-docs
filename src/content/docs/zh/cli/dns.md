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

- Gateway(网关)发现：[设备发现](/en/gateway/discovery)
- 广域网发现配置：[配置](/en/gateway/configuration)

## 安装

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

## `dns setup`

规划或应用用于单播 DNS-SD 发现的 CoreDNS 设置。

选项：

- `--domain <domain>`：广域网发现域（例如 `openclaw.internal`）
- `--apply`：安装或更新 CoreDNS 配置并重启服务（需要 sudo；仅限 macOS）

显示内容：

- 已解析的发现域
- 区域文件路径
- 当前的 tailnet IP
- 推荐的 `openclaw.json` 发现配置
- 要设置的 Tailscale 分割 DNS 名称服务器/域值

备注：

- 如果不使用 `--apply`，该命令仅作为规划辅助工具，并打印推荐的设置。
- 如果省略 `--domain`，OpenClaw 将使用配置中的 `discovery.wideArea.domain`。
- `--apply` 目前仅支持 macOS，并预期使用 Homebrew CoreDNS。
- `--apply` 会在需要时引导区域文件，确保 CoreDNS 导入语句存在，并重启 `coredns` brew 服务。
