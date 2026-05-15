---
summary: "平台支援概覽 (Gateway + 伴隨應用程式)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "平台"
---

OpenClaw 核心是使用 TypeScript 編寫的。**Node 是建議的運行時環境**。
不建議在 Gateway 上使用 Bun —— WhatsApp 和 Telegram 頻道存在已知問題；詳情請參閱 [Bun (實驗性)](/zh-Hant/install/bun)。

存在適用於 macOS (選單列應用程式) 和行動節點 (iOS/Android) 的配套應用程式。Windows 和
Linux 配套應用程式已在計劃中，但 Gateway 目前已完全支援。
原生 Windows 配套應用程式也已在計劃中；建議透過 WSL2 使用 Gateway。

## 選擇您的作業系統

- macOS: [macOS](/zh-Hant/platforms/macos)
- iOS: [iOS](/zh-Hant/platforms/ios)
- Android: [Android](/zh-Hant/platforms/android)
- Windows: [Windows](/zh-Hant/platforms/windows)
- Linux: [Linux](/zh-Hant/platforms/linux)

## VPS 與主機代管

- VPS hub: [VPS hosting](/zh-Hant/vps)
- Fly.io: [Fly.io](/zh-Hant/install/fly)
- Hetzner (Docker): [Hetzner](/zh-Hant/install/hetzner)
- GCP (Compute Engine): [GCP](/zh-Hant/install/gcp)
- Azure (Linux VM): [Azure](/zh-Hant/install/azure)
- exe.dev (VM + HTTPS proxy): [exe.dev](/zh-Hant/install/exe-dev)

## 常用連結

- 安裝指南: [Getting Started](/zh-Hant/start/getting-started)
- Gateway 手冊: [Gateway](/zh-Hant/gateway)
- Gateway 配置: [Configuration](/zh-Hant/gateway/configuration)
- 服務狀態: `openclaw gateway status`

## Gateway 服務安裝 (CLI)

使用以下任一方式 (全部支援)：

- 精靈 (建議): `openclaw onboard --install-daemon`
- 直接: `openclaw gateway install`
- 配置流程: `openclaw configure` → 選擇 **Gateway service**
- 修復/遷移: `openclaw doctor` (提供安裝或修復服務的選項)

服務目標取決於作業系統：

- macOS: LaunchAgent (`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`; 舊版 `com.openclaw.*`)
- Linux/WSL2: systemd 使用者服務 (`openclaw-gateway[-<profile>].service`)
- 原生 Windows: 排程的工作 (`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`)，如果拒絕建立工作，則會有針對每位使用者的 Startup-folder 登入項目後備方案

## 相關

- [安裝概覽](/zh-Hant/install)
- [macOS 應用程式](/zh-Hant/platforms/macos)
- [iOS 應用程式](/zh-Hant/platforms/ios)
