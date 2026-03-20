---
summary: "平台支援概覽（Gateway + 配套應用程式）"
read_when:
  - 正在尋找作業系統支援或安裝路徑
  - 決定要在哪裡執行 Gateway
title: "平台"
---

# 平台

OpenClaw 核心是使用 TypeScript 撰寫的。**Node 是推薦的執行環境**。
不推薦使用 Bun 作為 Gateway（會有 WhatsApp/Telegram 錯誤）。

目前有 macOS（選單列應用程式）和行動裝置節點（iOS/Android）的配套應用程式。雖然 Windows 和 Linux 的配套應用程式已在計畫中，但 Gateway 目前已完全支援。Windows 的原生配套應用程式也在計畫中；建議透過 WSL2 使用 Gateway。

## 選擇您的作業系統

- macOS: [macOS](/zh-Hant/platforms/macos)
- iOS: [iOS](/zh-Hant/platforms/ios)
- Android: [Android](/zh-Hant/platforms/android)
- Windows: [Windows](/zh-Hant/platforms/windows)
- Linux: [Linux](/zh-Hant/platforms/linux)

## VPS 與主機託管

- VPS hub: [VPS hosting](/zh-Hant/vps)
- Fly.io: [Fly.io](/zh-Hant/install/fly)
- Hetzner (Docker): [Hetzner](/zh-Hant/install/hetzner)
- GCP (Compute Engine): [GCP](/zh-Hant/install/gcp)
- exe.dev (VM + HTTPS proxy): [exe.dev](/zh-Hant/install/exe-dev)

## 常用連結

- 安裝指南：[Getting Started](/zh-Hant/start/getting-started)
- Gateway 操作手冊：[Gateway](/zh-Hant/gateway)
- Gateway 設定：[Configuration](/zh-Hant/gateway/configuration)
- 服務狀態： `openclaw gateway status`

## Gateway 服務安裝（CLI）

使用以下其中一種（全部皆支援）：

- 精靈（推薦）： `openclaw onboard --install-daemon`
- 直接： `openclaw gateway install`
- 設定流程： `openclaw configure` → 選擇 **Gateway service**
- 修復/遷移： `openclaw doctor` （提供安裝或修復服務的選項）

服務目標取決於作業系統：

- macOS: LaunchAgent (`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`; 舊版 `com.openclaw.*`)
- Linux/WSL2: systemd user service (`openclaw-gateway[-<profile>].service`)

import en from "/components/footer/en.mdx";

<en />
