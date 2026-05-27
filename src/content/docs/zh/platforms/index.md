---
summary: "平台支持概览（Gateway(网关) 网关 + 伴侣应用）"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "平台"
---

OpenClaw 核心是用 TypeScript 编写的。**Node 是推荐的运行时**。
不推荐在 Bun 上使用 Gateway(网关) —— 已知 WhatsApp 和
Telegram 渠道存在问题；有关详细信息，请参阅 [Bun (实验性)](/zh/install/bun)。

存在适用于 macOS（菜单栏应用）和移动节点（iOS/Android）的配套应用。Windows 和
Linux 的配套应用已在计划中，但 Gateway(网关) 目前已完全支持。
适用于 Windows 的原生配套应用也在计划中；建议通过 Gateway(网关) 使用 WSL2。

## 选择你的操作系统

- macOS: [macOS](/zh/platforms/macos)
- iOS: [iOS](/zh/platforms/ios)
- Android: [Android](/zh/platforms/android)
- Windows: [Windows](/zh/platforms/windows)
- Linux: [Linux](/zh/platforms/linux)

## VPS 和主机托管

- VPS 中心: [VPS 托管](/zh/vps)
- Fly.io: [Fly.io](/zh/install/fly)
- Hetzner (Docker): [Hetzner](/zh/install/hetzner)
- GCP (Compute Engine): [GCP](/zh/install/gcp)
- Azure (Linux 虚拟机): [Azure](/zh/install/azure)
- exe.dev (虚拟机 + HTTPS 代理): [exe.dev](/zh/install/exe-dev)
- EasyRunner (Podman + Caddy): [EasyRunner](/zh/platforms/easyrunner)

## 常用链接

- 安装指南：[入门指南](/zh/start/getting-started)
- Gateway(网关) 运维手册：[Gateway(网关)](<Gateway(网关)Gateway(网关)/en/gateway>)
- Gateway(网关) 配置：[Configuration](<Gateway(网关)/en/gateway/configuration>)
- 服务状态：`openclaw gateway status`

## Gateway(网关) 服务安装 (CLI)

使用以下方法之一（均已支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接：`openclaw gateway install`
- 配置流程：`openclaw configure`Gateway(网关) → 选择 **Gateway(网关) service**
- 修复/迁移：`openclaw doctor`（提供安装或修复服务的选项）

服务目标取决于操作系统：

- macOS: LaunchAgent (macOS`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`; 旧版 `com.openclaw.*`)
- Linux/WSL2: systemd 用户服务 (LinuxWSL2`openclaw-gateway[-<profile>].service`)
- Windows 原生: 计划任务 (Windows`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`)，如果拒绝创建任务，则回退到每用户 Startup-folder 登录项

## 相关

- [安装概览](/zh/install)
- [macOS 应用](macOS/en/platforms/macos)
- [iOS 应用](iOS/en/platforms/ios)
