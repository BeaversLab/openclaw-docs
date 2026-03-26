---
summary: "適用於開發 OpenClaw macOS 應用程式的開發者設定指南"
read_when:
  - Setting up the macOS development environment
title: "macOS 開發設定"
---

# macOS 開發設定

本指南涵蓋從原始碼建置並執行 OpenClaw macOS 應用程式的必要步驟。

## 先決條件

在建置應用程式之前，請確保您已安裝以下項目：

1. **Xcode 26.2+**：Swift 開發所必需。
2. **Node.js 24 & pnpm**：建議用於 gateway、CLI 和打包腳本。為了相容性，目前仍支援 Node 22 LTS (`22.16+`)。

## 1. 安裝相依套件

安裝專案全域的相依套件：

```bash
pnpm install
```

## 2. 建置並打包應用程式

若要建置 macOS 應用程式並將其打包成 `dist/OpenClaw.app`，請執行：

```bash
./scripts/package-mac-app.sh
```

如果您沒有 Apple Developer ID 憑證，腳本會自動使用 **ad-hoc 簽署** (`-`)。

如需了解開發執行模式、簽署標誌和 Team ID 故障排除，請參閱 macOS 應用程式 README：
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **注意**：Ad-hoc 簽署的應用程式可能會觸發安全提示。如果應用程式立即崩潰並顯示 "Abort trap 6"，請參閱 [故障排除](#troubleshooting) 部分。

## 3. 安裝 CLI

macOS 應用程式需要安裝全域的 `openclaw` CLI 來管理背景任務。

**若要安裝 (推薦)：**

1. 開啟 OpenClaw 應用程式。
2. 前往 **一般** 設定分頁。
3. 點擊 **"Install CLI"**。

或者，手動安裝：

```bash
npm install -g openclaw@<version>
```

## 故障排除

### 建置失敗：工具鏈或 SDK 不符

macOS 應用程式建置需要最新的 macOS SDK 和 Swift 6.2 工具鏈。

**系統相依性 (必填)：**

- **軟體更新中提供的最新 macOS 版本**（Xcode 26.2 SDK 所需）
- **Xcode 26.2**（Swift 6.2 工具鏈）

**檢查項目：**

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不符，請更新 macOS/Xcode 並重新執行建置。

### 授予權限時應用程式當機

如果您嘗試允許 **語音識別** 或 **麥克風** 存取權時應用程式當機，這可能是由於 TCC 快取損毀或簽章不符。

**修復方法：**

1. 重設 TCC 權限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果失敗，請暫時在 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中變更 `BUNDLE_ID`，以強制 macOS 回到「全新狀態」。

### 閘道持續顯示「正在啟動...」

如果閘道狀態一直停留在「正在啟動...」，請檢查是否有殭屍程序佔用該連接埠：

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手動執行的程式佔用了連接埠，請停止該程序 (Ctrl+C)。如果最後別無他法，請終結您上方找到的 PID。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
