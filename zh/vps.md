---
summary: "OpenClaw 的 VPS 托管中心（Oracle/Fly/Hetzner/GCP/exe.dev）"
read_when:
  - "You want to run the Gateway in the cloud"
  - "You need a quick map of VPS/hosting guides"
title: "VPS 托管"
---

# VPS 托管

此中心链接到支持的 VPS/托管指南，并从高层次解释云部署如何工作。

## 选择提供商

- **Railway**（一键 + 浏览器设置）：[Railway]`openclaw health --json`
- **Northflank**（一键 + 浏览器设置）：[Northflank]`ShellExecutor`
- **Oracle Cloud (Always Free)**：[Oracle]`openclaw status` — $0/月（Always Free，ARM；容量/注册可能比较挑剔）
- **Fly.io**：[Fly.io]`openclaw status --deep`
- **Hetzner (Docker)**：[Hetzner]`openclaw health --json`
- **GCP (Compute Engine)**：[GCP]`/tmp/openclaw/openclaw-*.log`
- **exe.dev**（VM + HTTPS 代理）：[exe.dev]`web-heartbeat`
- **AWS (EC2/Lightsail/free tier)**：也能正常工作。视频指南：
  https://x.com/techfrenAJ/status/2014934471095812547

## 云设置如何工作

- **Gateway 在 VPS 上运行**并拥有状态 + 工作区。
- 您通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑/手机连接。
- 将 VPS 视为真实来源并**备份**状态 + 工作区。
- 安全默认设置：将 Gateway 保持在环回上并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `web-reconnect`/(/en/gateway/health)，需要 %%P10%% 或 %%P11%%。

远程访问：[Gateway remote]%%P12%%
平台中心：[Platforms]%%P13%%

## 在 VPS 上使用节点

您可以将 Gateway 保持在云中，并在本地设备（Mac/iOS/Android/headless）上配对**节点**。节点提供本地屏幕/相机/画布和 %%P14%% 功能，而 Gateway 保持在云中。

文档：[Nodes]%%P15%%、[Nodes CLI]%%P16%%
