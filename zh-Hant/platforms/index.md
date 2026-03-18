---
summary: "Platform support overview (Gateway + companion apps)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Platforms"
---

# 平台

OpenClaw 核心是使用 TypeScript 編寫的。**Node 是建議的運行環境**。
不建議使用 Bun 作為 Gateway（WhatsApp/Telegram 錯誤）。

存在適用於 macOS（選單列應用程式）和行動節點（iOS/Android）的配套應用程式。Windows 和
Linux 配套應用程式已在計劃中，但 Gateway 目前已完全支援。
適用於 Windows 的原生配套應用程式也在計劃中；建議透過 WSL2 使用 Gateway。

## 選擇您的作業系統

- macOS: [macOS](/zh-Hant/platforms/macos)
- iOS: [iOS](/zh-Hant/platforms/ios)
- Android: [Android](/zh-Hant/platforms/android)
- Windows: [Windows](/zh-Hant/platforms/windows)
- Linux: [Linux](/zh-Hant/platforms/linux)

## VPS 與託管

- VPS hub: [VPS hosting](/zh-Hant/vps)
- Fly.io: [Fly.io](/zh-Hant/install/fly)
- Hetzner (Docker): [Hetzner](/zh-Hant/install/hetzner)
- GCP (Compute Engine): [GCP](/zh-Hant/install/gcp)
- exe.dev (VM + HTTPS proxy): [exe.dev](/zh-Hant/install/exe-dev)

## 常用連結

- 安裝指南: [Getting Started](/zh-Hant/start/getting-started)
- Gateway 手冊: [Gateway](/zh-Hant/gateway)
- Gateway 設定: [Configuration](/zh-Hant/gateway/configuration)
- 服務狀態: `openclaw gateway status`

## Gateway 服務安裝 (CLI)

使用以下其中之一（全部支援）：

- 精靈 (建議): `openclaw onboard --install-daemon`
- 直接: `openclaw gateway install`
- 設定流程: `openclaw configure` → 選擇 **Gateway service**
- 修復/遷移: `openclaw doctor` (提供安裝或修復服務)

服務目標取決於作業系統：

- macOS: LaunchAgent (`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`; 舊版 `com.openclaw.*`)
- Linux/WSL2: systemd 使用者服務 (`openclaw-gateway[-<profile>].service`)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
