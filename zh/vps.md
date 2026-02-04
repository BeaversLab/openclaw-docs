---
summary: "OpenClaw 的 VPS 托管索引（Oracle/Fly/Hetzner/GCP/exe.dev）"
read_when:
  - 你想在云端运行 Gateway
  - 你需要 VPS/托管指南速览
title: "VPS 托管"
---

# VPS 托管

此索引链接到已支持的 VPS/托管指南，并高层说明云端部署的工作方式。

## 选择服务商

- **Railway**（一键 + 浏览器设置）：[Railway](/zh/railway)
- **Northflank**（一键 + 浏览器设置）：[Northflank](/zh/northflank)
- **Oracle Cloud（Always Free）**：[Oracle](/zh/platforms/oracle) — $0/月（Always Free，ARM；容量/注册可能较挑剔）
- **Fly.io**：[Fly.io](/zh/platforms/fly)
- **Hetzner（Docker）**：[Hetzner](/zh/platforms/hetzner)
- **GCP（Compute Engine）**：[GCP](/zh/platforms/gcp)
- **exe.dev**（VM + HTTPS 代理）：[exe.dev](/zh/platforms/exe-dev)
- **AWS（EC2/Lightsail/free tier）**：也很合适。视频指南：
  https://x.com/techfrenAJ/status/2014934471095812547

## 云端部署如何工作

- **Gateway 运行在 VPS** 上，并拥有状态与工作区。
- 你从笔记本/手机通过 **Control UI** 或 **Tailscale/SSH** 连接。
- 将 VPS 视为事实来源并 **备份** 状态与工作区。
- 安全默认：保持 Gateway 在回环，仅通过 SSH 隧道或 Tailscale Serve 访问。
  若绑定到 `lan`/`tailnet`，需要 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问：[Gateway remote](/zh/gateway/remote)  
平台索引：[平台](/zh/platforms)

## 在 VPS 上使用节点

你可以让 Gateway 在云端运行，同时在本地设备（Mac/iOS/Android/无 UI）配对 **nodes**。
节点提供本地屏幕/摄像头/画布与 `system.run` 能力，而 Gateway 仍在云端。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)
