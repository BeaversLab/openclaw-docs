---
title: "平台"
summary: "平台支持概览（Gateway + 伴侣应用）"
read_when:
  - 查找 OS 支持或安装路径
  - 决定在哪里运行 Gateway
---

# 平台

OpenClaw 核心由 TypeScript 编写。**推荐运行时是 Node**。
不推荐用 Bun 作为 Gateway 运行时（WhatsApp/Telegram 有 bug）。

macOS 有伴侣应用（菜单栏 app），移动端有节点（iOS/Android）。Windows 与 Linux 伴侣应用在规划中，但 Gateway 已完全支持。
Windows 的原生伴侣应用也在规划中；Gateway 推荐通过 WSL2 运行。

## 选择你的 OS

- macOS：[macOS](/zh/platforms/macos)
- iOS：[iOS](/zh/platforms/ios)
- Android：[Android](/zh/platforms/android)
- Windows：[Windows](/zh/platforms/windows)
- Linux：[Linux](/zh/platforms/linux)

## VPS & 托管

- VPS 枢纽：[VPS hosting](/zh/vps)
- Fly.io：[Fly.io](/zh/platforms/fly)
- Hetzner（Docker）：[Hetzner](/zh/platforms/hetzner)
- GCP（Compute Engine）：[GCP](/zh/platforms/gcp)
- exe.dev（VM + HTTPS 代理）：[exe.dev](/zh/platforms/exe-dev)

## 常用链接

- 安装指南：[Getting Started](/zh/start/getting-started)
- Gateway runbook：[Gateway](/zh/gateway)
- Gateway 配置：[Configuration](/zh/gateway/configuration)
- 服务状态：`openclaw gateway status`

## Gateway 服务安装（CLI）

使用以下方式之一（均支持）：

- 向导（推荐）：`openclaw onboard --install-daemon`
- 直接安装：`openclaw gateway install`
- 配置流程：`openclaw configure` → 选择 **Gateway service**
- 修复/迁移：`openclaw doctor`（会提示安装或修复服务）

服务目标因 OS 而异：

- macOS：LaunchAgent（`bot.molt.gateway` 或 `bot.molt.<profile>`；旧 `com.openclaw.*`）
- Linux/WSL2：systemd user service（`openclaw-gateway[-<profile>].service`）
