---
title: "macOS Dev Setup"
summary: "OpenClaw macOS 应用的开发环境搭建指南"
read_when:
  - 搭建 macOS 开发环境
---
# macOS 开发者设置

本指南涵盖从源码构建并运行 OpenClaw macOS 应用所需的步骤。

## 前置条件

在构建应用之前，请确保已安装以下内容：

1.  **Xcode 26.2+**：Swift 开发必需。
2.  **Node.js 22+ & pnpm**：Gateway、CLI 与打包脚本必需。

## 1. 安装依赖

安装项目级依赖：

```bash
pnpm install
```

## 2. 构建并打包应用

构建 macOS 应用并打包到 `dist/OpenClaw.app`：

```bash
./scripts/package-mac-app.sh
```

如果你没有 Apple Developer ID 证书，脚本会自动使用 **ad-hoc 签名**（`-`）。

关于开发运行模式、签名参数和 Team ID 排查，参见 macOS 应用 README：
https://github.com/openclaw/openclaw/blob/main/apps/macos/README.md

> **注意**：ad-hoc 签名可能触发安全提示。如果应用启动即崩溃并提示 "Abort trap 6"，请参见 [Troubleshooting](#troubleshooting)。

## 3. 安装 CLI

macOS 应用需要全局安装 `openclaw` CLI 来管理后台任务。

**推荐安装方式：**
1. 打开 OpenClaw 应用。
2. 进入 **General** 设置页。
3. 点击 **"Install CLI"**。

或者手动安装：
```bash
npm install -g openclaw@<version>
```

## Troubleshooting

### 构建失败：工具链或 SDK 不匹配
macOS 应用构建需要最新的 macOS SDK 与 Swift 6.2 工具链。

**系统依赖（必需）：**
- **Software Update 中可用的最新 macOS 版本**（Xcode 26.2 SDK 需要）
- **Xcode 26.2**（Swift 6.2 工具链）

**检查：**
```bash
xcodebuild -version
xcrun swift --version
```

如版本不匹配，请更新 macOS/Xcode 并重新构建。

### 授权时应用崩溃
如果在允许 **Speech Recognition** 或 **Microphone** 访问时应用崩溃，可能是 TCC 缓存损坏或签名不匹配。

**修复：**
1. 重置 TCC 权限：
   ```bash
   tccutil reset All bot.molt.mac.debug
   ```
2. 如果无效，可临时修改 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中的 `BUNDLE_ID`，让 macOS 视为“全新应用”。

### Gateway 一直显示 "Starting..."
如果 Gateway 状态一直是 "Starting..."，检查是否有僵尸进程占用端口：

```bash
openclaw gateway status
openclaw gateway stop

# 如果未使用 LaunchAgent（开发模式/手动运行），查找监听进程：
lsof -nP -iTCP:18789 -sTCP:LISTEN
```
如果是手动运行占用端口，请停止该进程（Ctrl+C）。最后手段可直接杀掉上面的 PID。
