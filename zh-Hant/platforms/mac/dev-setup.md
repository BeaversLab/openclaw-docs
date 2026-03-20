---
summary: "適用於 OpenClaw macOS 應用程式開發人員的設定指南"
read_when:
  - 設定 macOS 開發環境
title: "macOS 開發設定"
---

# macOS 開發者設定

本指南涵蓋從原始碼建置並執行 OpenClaw macOS 應用程式所需的步驟。

## 先決條件

在建置應用程式之前，請確保您已安裝以下項目：

1. **Xcode 26.2+**：Swift 開發所需。
2. **Node.js 24 & pnpm**：建議用於 Gateway、CLI 和打包腳本。目前仍支援 Node 22 LTS（即 `22.16+`）以保持相容性。

## 1. 安裝相依套件

安裝整個專案的相依套件：

```bash
pnpm install
```

## 2. 建置並打包應用程式

若要建構 macOS 應用程式並將其打包為 `dist/OpenClaw.app`，請執行：

```bash
./scripts/package-mac-app.sh
```

如果您沒有 Apple Developer ID 憑證，該腳本將自動使用 **ad-hoc 簽署**（`-`）。

如需了解開發執行模式、簽署標誌和 Team ID 故障排除，請參閱 macOS 應用程式 README：
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **注意**：Ad-hoc 簽署的應用程式可能會觸發安全性提示。如果應用程式立即崩潰並顯示 "Abort trap 6"，請參閱 [故障排除](#troubleshooting) 部分。

## 3. 安裝 CLI

macOS 應用程式預期需安裝全域 `openclaw` CLI 以管理背景任務。

**若要安裝 (建議)：**

1. 開啟 OpenClaw 應用程式。
2. 前往 **一般** 設定分頁。
3. 點擊 **「安裝 CLI」**。

或者，手動安裝：

```bash
npm install -g openclaw@<version>
```

## 疑難排解

### 建置失敗：工具鏈或 SDK 不相符

macOS 應用程式建置需要最新的 macOS SDK 和 Swift 6.2 工具鏈。

**系統相依性 (必要)：**

- **軟體更新中可用的最新 macOS 版本** (Xcode 26.2 SDK 所需)
- **Xcode 26.2** (Swift 6.2 工具鏈)

**檢查：**

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不符，請更新 macOS/Xcode 並重新執行建置。

### 授與權限時應用程式崩潰

如果您在嘗試允許 **語音識別** 或 **麥克風** 存取時應用程式崩潰，這可能是由於 TCC 快取損壞或簽章不相符所致。

**修正方法：**

1. 重設 TCC 權限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果失敗，請暫時在 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中變更 `BUNDLE_ID`，以強制 macOS 進行「全新安裝」。

### 閘道「正在啟動...」無限期持續

如果閘道狀態停留在「正在啟動...」，請檢查是否有殭屍程序佔用了連接埠：

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手動執行佔用了連接埠，請停止該程序 (Ctrl+C)。作為最後手段，請終止您在上一步找到的 PID。

import en from "/components/footer/en.mdx";

<en />
