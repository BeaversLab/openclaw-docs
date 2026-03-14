---
summary: "适用于 OpenClaw macOS 应用开发人员的设置指南"
read_when:
  - Setting up the macOS development environment
title: "macOS 开发设置"
---

# macOS 开发设置

本指南涵盖了从源代码构建和运行 OpenClaw macOS 应用程序所需的所有步骤。

## 先决条件

在构建应用之前，请确保已安装以下内容：

1. **Xcode 26.2+**：Swift 开发所必需。
2. **Node.js 24 & pnpm**：推荐用于网关、CLI 和打包脚本。为了兼容性，目前仍支持 Node 22 LTS (`22.16+`)。

## 1. 安装依赖项

安装项目范围内的依赖项：

```bash
pnpm install
```

## 2. 构建和打包应用

要构建 macOS 应用并将其打包为 `dist/OpenClaw.app`，请运行：

```bash
./scripts/package-mac-app.sh
```

如果您没有 Apple Developer ID 证书，脚本将自动使用 **临时签名** (`-`)。

有关开发运行模式、签名标志和团队 ID 故障排除，请参阅 macOS 应用自述文件：
[https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md](https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md)

> **注意**：临时签名的应用可能会触发安全提示。如果应用立即崩溃并显示 "Abort trap 6"，请参阅 [故障排除](#troubleshooting) 部分。

## 3. 安装 CLI

macOS 应用期望安装全局 `openclaw` CLI 来管理后台任务。

**安装（推荐）：**

1. 打开 OpenClaw 应用。
2. 转到 **通用** 设置选项卡。
3. 点击 **"Install CLI"**。

或者，手动安装：

```bash
npm install -g openclaw@<version>
```

## 故障排除

### 构建失败：工具链或 SDK 不匹配

macOS 应用构建需要最新的 macOS SDK 和 Swift 6.2 工具链。

**系统依赖项（必需）：**

- **软件更新中可用的最新 macOS 版本**（Xcode 26.2 SDK 所需）
- **Xcode 26.2** (Swift 6.2 工具链)

**检查：**

```bash
xcodebuild -version
xcrun swift --version
```

如果版本不匹配，请更新 macOS/Xcode 并重新运行构建。

### 授予权限时应用崩溃

如果您在尝试允许 **语音识别** 或 **麦克风** 访问时应用崩溃，这可能是由于 TCC 缓存损坏或签名不匹配造成的。

**修复：**

1. 重置 TCC 权限：

   ```bash
   tccutil reset All ai.openclaw.mac.debug
   ```

2. 如果失败，请在 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中临时更改 `BUNDLE_ID`，以强制 macOS "从零开始"。

### Gateway 网关 一直处于“启动中...”状态

如果网关状态一直停留在“启动中...”，请检查是否有僵尸进程占用了端口：

```bash
openclaw gateway status
openclaw gateway stop

# If you’re not using a LaunchAgent (dev mode / manual runs), find the listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是手动运行的进程占用了端口，请停止该进程（Ctrl+C）。作为最后手段，请终止上面找到的 PID。

import zh from '/components/footer/zh.mdx';

<zh />
