---
summary: "OpenClaw VPS 托管中心（Oracle/Fly/Hetzner/GCP/exe.dev）"
read_when:
  - "You want to run the Gateway in the cloud"
  - "You need a quick map of VPS/hosting guides"
title: "VPS 托管"
---

# VPS 托管

本中心链接到支持的 VPS/托管指南，并从高层次说明云部署的工作原理。

## 选择服务提供商

- **Railway**（一键 + 浏览器设置）：[Railway](/zh/railway)
- **Northflank**（一键 + 浏览器设置）：[Northflank](/zh/northflank)
- **Oracle Cloud (Always Free)**：[Oracle](/zh/platforms/oracle) — $0/月（Always Free，ARM；容量/注册可能不稳定）
- **Fly.io**：[Fly.io](/zh/platforms/fly)
- **Hetzner (Docker)**：[Hetzner](/zh/platforms/hetzner)
- **GCP (Compute Engine)**：[GCP](/zh/platforms/gcp)
- **exe.dev** (VM + HTTPS 代理)：[exe.dev](/zh/platforms/exe-dev)
- **AWS (EC2/Lightsail/免费层)**：同样很好用。视频教程：
  https://x.com/techfrenAJ/status/2014934471095812547

## 云设置工作原理

- **Gateway 在 VPS 上运行**并拥有状态 + 工作区。
- 您通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑/手机连接。
- 将 VPS 视为事实来源并**备份**状态 + 工作区。
- 安全默认设置：将 Gateway 保持在环回接口上，并通过 SSH 隧道或 Tailscale Serve 访问。
  如果绑定到 `lan`/`tailnet`，需要 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问：[Gateway remote](/zh/gateway/remote)
平台中心：[Platforms](/zh/platforms)

## 在 VPS 上使用节点

您可以将 Gateway 保留在云端，并在本地设备上配对 **节点**
（Mac/iOS/Android/无头）。节点提供本地屏幕/相机/画布和 `system.run`
功能，而 Gateway 保留在云端。

文档：[Nodes](/zh/nodes), [Nodes CLI](/zh/cli/nodes)
