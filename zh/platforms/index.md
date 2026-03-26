---
summary: "平台支持概览（Gateway 网关 + 伴侣应用）"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "平台"
---

# 平台

OpenClaw 核心是用 TypeScript 编写的。**Node 是推荐的运行时**。
不推荐在 Gateway 网关 上使用 Bun（存在 WhatsApp/Telegram Bug）。

存在适用于 macOS（菜单栏应用）和移动节点（iOS/Android）的伴侣应用。目前计划推出 Windows 和
Linux 伴侣应用，但 Gateway 网关 目前已获得完全支持。
同时也计划推出 Windows 原生伴侣应用；对于 Windows，推荐通过 WSL2 使用 Gateway 网关。

## 选择您的操作系统

- macOS: [macOS](/zh/platforms/macos)
- iOS: [iOS](/zh/platforms/ios)
- Android: [Android](/zh/platforms/android)
- Windows: [Windows](/zh/platforms/windows)
- Linux: [Linux](/zh/platforms/linux)

## VPS 与托管

- VPS hub: [VPS hosting](/zh/vps)
- Fly.io: [Fly.io](/zh/install/fly)
- Hetzner (Docker): [Hetzner](/zh/install/hetzner)
- GCP (Compute Engine): [GCP](/zh/install/gcp)
- Azure (Linux VM): [Azure](/zh/install/azure)
- exe.dev (VM + HTTPS 代理): [exe.dev](/zh/install/exe-dev)

## 常用链接

- 安装指南：[入门指南](/zh/start/getting-started)
- Gateway(网关) 运维手册：[Gateway(网关)](/zh/gateway)
- Gateway(网关) 配置：[Configuration](/zh/gateway/configuration)
- 服务状态：`openclaw gateway status`

## Gateway(网关) 服务安装 (CLI)

使用以下其中一种（均已支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接：`openclaw gateway install`
- 配置流程：`openclaw configure` → 选择 **Gateway(网关) service**
- 修复/迁移：`openclaw doctor`（提供安装或修复服务）

服务目标取决于操作系统：

- macOS: LaunchAgent (`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`; 旧版 `com.openclaw.*`)
- Linux/WSL2: systemd 用户服务 (`openclaw-gateway[-<profile>].service`)

import zh from "/components/footer/zh.mdx";

<zh />
