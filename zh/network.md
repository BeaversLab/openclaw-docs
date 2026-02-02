---
summary: "网络枢纽：gateway surface、配对、发现与安全"
read_when:
  - 你需要网络架构 + 安全概览
  - 你在排查本地 vs tailnet 访问或配对
  - 你想要网络相关文档的权威列表
---
# Network hub

此枢纽链接 OpenClaw 在 localhost、LAN 与 tailnet 中连接、配对与安全的核心文档。

## 核心模型

- [Gateway architecture](/zh/concepts/architecture)
- [Gateway protocol](/zh/gateway/protocol)
- [Gateway runbook](/zh/gateway)
- [Web surfaces + bind modes](/zh/web)

## 配对 + 身份

- [Pairing overview (DM + nodes)](/zh/start/pairing)
- [Gateway-owned node pairing](/zh/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/zh/cli/devices)
- [Pairing CLI (DM approvals)](/zh/cli/pairing)

本地信任：
- 本地连接（loopback 或 gateway 主机自身的 tailnet 地址）可以自动批准配对，以保持同机体验顺滑。
- 非本地 tailnet/LAN 客户端仍需要显式配对批准。

## 发现 + 传输

- [Discovery & transports](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [Remote access (SSH)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## Nodes + 传输

- [Nodes overview](/zh/nodes)
- [Bridge protocol (legacy nodes)](/zh/gateway/bridge-protocol)
- [Node runbook: iOS](/zh/platforms/ios)
- [Node runbook: Android](/zh/platforms/android)

## Security

- [Security overview](/zh/gateway/security)
- [Gateway config reference](/zh/gateway/configuration)
- [Troubleshooting](/zh/gateway/troubleshooting)
- [Doctor](/zh/gateway/doctor)
