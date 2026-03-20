---
summary: "平台支持概述 (Gateway(网关) + 配套应用)"
read_when:
  - 寻找操作系统支持或安装路径
  - 决定在哪里运行 Gateway(网关)
title: "平台"
---

# 平台

OpenClaw 核心使用 TypeScript 编写。**Node 是推荐的运行时**。
不建议在 Bun 上使用 Gateway(网关)（存在 WhatsApp/Telegram 错误）。

macOS（菜单栏应用）和移动节点（iOS/Android）已有配套应用。Windows 和
Linux 的配套应用已在计划中，但 Gateway(网关) 目前已完全支持。
Windows 的原生配套应用也已在计划中；推荐通过 Gateway(网关) 使用 WSL2。

## 选择您的操作系统

- macOS：[macOS](/zh/platforms/macos)
- iOS：[iOS](/zh/platforms/ios)
- Android：[Android](/zh/platforms/android)
- Windows：[Windows](/zh/platforms/windows)
- Linux：[Linux](/zh/platforms/linux)

## VPS 和托管

- VPS 中心：[VPS 托管](/zh/vps)
- Fly.io：[Fly.io](/zh/install/fly)
- Hetzner (Docker)：[Hetzner](/zh/install/hetzner)
- GCP (Compute Engine)：[GCP](/zh/install/gcp)
- exe.dev (VM + HTTPS 代理)：[exe.dev](/zh/install/exe-dev)

## 常用链接

- 安装指南：[入门指南](/zh/start/getting-started)
- Gateway(网关) 运维手册：[Gateway(网关)](/zh/gateway)
- Gateway(网关) 配置：[配置](/zh/gateway/configuration)
- 服务状态：`openclaw gateway status`

## Gateway(网关) 服务安装 (CLI)

使用以下方法之一（均已支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接方式：`openclaw gateway install`
- 配置流程：`openclaw configure` → 选择 **Gateway(网关) 服务**
- 修复/迁移：`openclaw doctor`（提供安装或修复服务的选项）

服务目标取决于操作系统：

- macOS：LaunchAgent (`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`；旧版 `com.openclaw.*`)
- Linux/WSL2：systemd 用户服务 (`openclaw-gateway[-<profile>].service`)

import zh from "/components/footer/zh.mdx";

<zh />
