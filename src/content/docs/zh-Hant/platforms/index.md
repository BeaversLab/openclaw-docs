---
summary: "平台支援概覽 (Gateway + 伴隨應用程式)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "平台"
---

# 平台

OpenClaw 核心是以 TypeScript 撰寫的。**Node 是推薦的執行時期**。
不推薦將 Bun 用於 Gateway (WhatsApp/Telegram 錯誤)。

目前有 macOS (選單列應用程式) 和行動節點 (iOS/Android) 的伴隨應用程式。Windows 和
Linux 伴隨應用程式正在計畫中，但 Gateway 目前已完全支援。
Windows 的原生伴隨應用程式也在計畫中；建議透過 WSL2 使用 Gateway。

## 選擇您的作業系統

- macOS: [macOS](/en/platforms/macos)
- iOS: [iOS](/en/platforms/ios)
- Android: [Android](/en/platforms/android)
- Windows: [Windows](/en/platforms/windows)
- Linux: [Linux](/en/platforms/linux)

## VPS 與託管

- VPS hub: [VPS hosting](/en/vps)
- Fly.io: [Fly.io](/en/install/fly)
- Hetzner (Docker): [Hetzner](/en/install/hetzner)
- GCP (Compute Engine): [GCP](/en/install/gcp)
- Azure (Linux VM): [Azure](/en/install/azure)
- exe.dev (VM + HTTPS proxy): [exe.dev](/en/install/exe-dev)

## 常用連結

- Install guide: [Getting Started](/en/start/getting-started)
- Gateway runbook: [Gateway](/en/gateway)
- Gateway configuration: [Configuration](/en/gateway/configuration)
- 服務狀態：`openclaw gateway status`

## Gateway 服務安裝 (CLI)

使用其中一種 (全部支援)：

- 精靈 (推薦)：`openclaw onboard --install-daemon`
- 直接：`openclaw gateway install`
- 設定流程：`openclaw configure` → 選擇 **Gateway 服務**
- 修復/遷移：`openclaw doctor` (提供安裝或修復服務)

服務目標取決於作業系統：

- macOS: LaunchAgent (`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`; 舊版 `com.openclaw.*`)
- Linux/WSL2: systemd 使用者服務 (`openclaw-gateway[-<profile>].service`)
- Native Windows: Scheduled Task (`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`)，若拒絕建立工作則退回至每個使用者的啟動資料夾登入項目
