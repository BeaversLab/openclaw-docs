---
summary: "平台支援概覽 (Gateway + 伴隨應用程式)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "平台"
---

# 平台

OpenClaw 核心使用 TypeScript 撰寫。**Node 是推薦的執行環境**。
不推薦使用於 Gateway (WhatsApp/Telegram 錯誤)。

目前有 macOS 的伴隨應用程式 (選單列應用程式) 以及行動節點 (iOS/Android)。Windows 和
Linux 的伴隨應用程式正在計畫中，但目前 Gateway 已完全支援。
Windows 的原生伴隨應用程式也在計畫中；建議透過 WSL2 使用 Gateway。

## 選擇您的作業系統

- macOS: [macOS](/zh-Hant/platforms/macos)
- iOS: [iOS](/zh-Hant/platforms/ios)
- Android: [Android](/zh-Hant/platforms/android)
- Windows: [Windows](/zh-Hant/platforms/windows)
- Linux: [Linux](/zh-Hant/platforms/linux)

## VPS 與託管

- VPS 中樞：[VPS 託管](/zh-Hant/vps)
- Fly.io：[Fly.io](/zh-Hant/install/fly)
- Hetzner (Docker)：[Hetzner](/zh-Hant/install/hetzner)
- GCP (Compute Engine)：[GCP](/zh-Hant/install/gcp)
- Azure (Linux VM)：[Azure](/zh-Hant/install/azure)
- exe.dev (VM + HTTPS proxy)：[exe.dev](/zh-Hant/install/exe-dev)

## 常用連結

- 安裝指南：[快速入門](/zh-Hant/start/getting-started)
- Gateway 手冊：[Gateway](/zh-Hant/gateway)
- Gateway 設定：[Configuration](/zh-Hant/gateway/configuration)
- 服務狀態：`openclaw gateway status`

## Gateway 服務安裝 (CLI)

使用其中之一（均受支援）：

- 精靈（推薦）：`openclaw onboard --install-daemon`
- 直接：`openclaw gateway install`
- 設定流程：`openclaw configure` → 選取 **Gateway service**
- 修復/遷移：`openclaw doctor`（提供安裝或修復服務）

服務目標取決於作業系統：

- macOS：LaunchAgent（`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`；舊版 `com.openclaw.*`）
- Linux/WSL2：systemd 使用者服務（`openclaw-gateway[-<profile>].service`）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
