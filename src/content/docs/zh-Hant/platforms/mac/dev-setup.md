---
summary: "適用於 OpenClaw macOS 應用程式開發者的設定指南"
read_when:
  - Setting up the macOS development environment
title: "macOS 開發設定"
---

# macOS 開發者設定

本指南涵蓋從原始碼建置和執行 OpenClaw macOS 應用程式所需的步驟。

## 先決條件

在建置應用程式之前，請確保您已安裝以下項目：

1. **Xcode 26.2+**：Swift 開發所需。
2. **Node.js 24 和 pnpm**：建議用於 Gateway、CLI 和打包腳本。為了相容性，目前仍支援 Node 22 LTS，即 `22.14+`。

## 1. 安裝相依套件

安裝整個專案的相依套件：

```bash
pnpm install
```

## 2. 建置與打包應用程式

若要建置 macOS 應用程式並將其打包成 `dist/OpenClaw.app`，請執行：

```bash
./scripts/package-mac-app.sh
```

如果您沒有 Apple 開發者 ID 憑證，腳本將會自動使用 **臨時簽署** (`-`)。

關於開發執行模式、簽署標誌和團隊 ID 故障排除，請參閱 macOS 應用程式 README：
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **注意**：臨時簽署的應用程式可能會觸發安全性提示。如果應用程式立即崩潰並顯示 "Abort trap 6"，請參閱 [故障排除](#troubleshooting) 章節。

## 3. 安裝 CLI

macOS 應用程式預期已安裝全域 `openclaw` CLI 以管理背景任務。

**若要安裝 (推薦)：**

1. 開啟 OpenClaw 應用程式。
2. 前往 **一般** 設定分頁。
3. 點擊 **「安裝 CLI」**。

或者，手動安裝：

```bash
npm install -g openclaw@<version>
```

`pnpm add -g openclaw@<version>` 和 `bun add -g openclaw@<version>` 也可以運作。
對於 Gateway 運行時，Node 仍然是推薦的方式。

## 故障排除

### 建置失敗：工具鏈或 SDK 不相符

macOS 應用程式建置需要最新的 macOS SDK 和 Swift 6.2 工具鏈。

**系統相依性 (必要)：**

- **軟體更新中可用的最新 macOS 版本** (Xcode 26.2 SDKs 所需)
- **Xcode 26.2** (Swift 6.2 工具鏈)

**檢查項目：**

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不符，請更新 macOS/Xcode 並重新執行建置。

### 授予權限時應用程式崩潰

如果您嘗試允許 **語音辨識** 或 **麥克風** 存取權限時應用程式崩潰，這可能是因為 TCC 快取損壞或簽章不相符。

**解決方法：**

1. 重設 TCC 權限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果這樣失敗，請暫時變更 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中的 `BUNDLE_ID`，以強制 macOS 重新建立乾淨的狀態。

### Gateway 持續顯示 "正在啟動..."

如果 Gateway 狀態停留在 "正在啟動..."，請檢查是否有殭屍程序佔用了連接埠：

```bash
openclaw gateway status
openclaw gateway stop

# If you're not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手動執行的程序佔用了連接埠，請停止該程序 (Ctrl+C)。作為最後的手段，終止您上方找到的 PID。
