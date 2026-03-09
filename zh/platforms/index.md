---
summary: "平台支持概述（Gateway + 伴侣应用）"
read_when:
  - "Looking for OS support or install paths"
  - "Deciding where to run the Gateway"
title: "平台"
---

# 平台

OpenClaw 核心使用 TypeScript 编写。**Node 是推荐的运行时**。
不建议将 Bun 用于 Gateway（WhatsApp/Telegram 存在错误）。

伴侣应用适用于 macOS（菜单栏应用）和移动节点（iOS/Android）。Windows 和 Linux 伴侣应用已在计划中，但目前完全支持 Gateway。
Windows 原生伴侣应用也在计划中；建议通过 WSL2 使用 Gateway。

## 选择您的操作系统

- macOS：[macOS](/en/platforms/macos)
- iOS：[iOS](/en/platforms/ios)
- Android：[Android](/en/platforms/android)
- Windows：[Windows](/en/platforms/windows)
- Linux：[Linux](/en/platforms/linux)

## VPS 和托管

- VPS 中心：[VPS hosting](/en/vps)
- Fly.io：[Fly.io](/en/platforms/fly)
- Hetzner (Docker)：[Hetzner](/en/platforms/hetzner)
- GCP (Compute Engine)：[GCP](/en/platforms/gcp)
- exe.dev (VM + HTTPS 代理)：[exe.dev](/en/platforms/exe-dev)

## 常用链接

- 安装指南：[Getting Started](/en/start/getting-started)
- Gateway 运维手册：[Gateway](/en/gateway)
- Gateway 配置：[Configuration](/en/gateway/configuration)
- 服务状态：`openclaw gateway status`

## Gateway service install (CLI)

使用以下方法之一（全部支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接：`openclaw gateway install`
- 配置流程：`openclaw configure` → 选择 **Gateway service**
- 修复/迁移：`openclaw doctor`（提供安装或修复服务）

服务目标取决于操作系统：

- macOS：LaunchAgent（`bot.molt.gateway` 或 `bot.molt.<profile>`；传统 `com.openclaw.*`）
- Linux/WSL2：systemd 用户服务（`openclaw-gateway[-<profile>].service`）
