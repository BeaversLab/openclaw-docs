---
summary: "网络枢纽：gateway surface、配对、发现与安全"
title: "网络"
read_when:
  - 你需要网络架构 + 安全概览
  - 你在排查本地 vs tailnet 访问或配对
  - 你想要网络相关文档的权威列表
---

# Network hub

此枢纽链接 OpenClaw 在 localhost、LAN 与 tailnet 中连接、配对与安全的核心文档。

## 核心模型

- [Gateway 架构](/zh/concepts/architecture)
- [Gateway 协议](/zh/gateway/protocol)
- [Gateway 运维手册](/zh/gateway)
- [Web 界面 + bind modes](/zh/web)

## 配对 + 身份

- [配对 overview (DM + nodes)](/zh/start/pairing)
- [Gateway-owned node pairing](/zh/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/zh/cli/devices)
- [Pairing CLI (DM approvals)](/zh/cli/pairing)

本地信任：

- 本地连接（loopback 或 gateway 主机自身的 tailnet 地址）可以自动批准配对，以保持同机体验顺滑。
- 非本地 tailnet/LAN 客户端仍需要显式配对批准。

## 发现 + 传输

- [发现 & transports](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [远程访问 (SSH)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## Nodes + 传输

- [节点 overview](/zh/nodes)
- [桥接 protocol (legacy nodes)](/zh/gateway/bridge-protocol)
- [节点 runbook: iOS](/zh/platforms/ios)
- [节点 runbook: Android](/zh/platforms/android)

## Security

- [安全 overview](/zh/gateway/security)
- [Gateway config reference](/zh/gateway/configuration)
- [故障排查](/zh/gateway/troubleshooting)
- [诊断](/zh/gateway/doctor)
