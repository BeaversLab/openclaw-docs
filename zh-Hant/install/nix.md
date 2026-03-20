---
summary: "使用 Nix 宣告式安裝 OpenClaw"
read_when:
  - 您想要可重現、可還原的安裝
  - 您已經在使用 Nix/NixOS/Home Manager
  - 您希望所有內容都被鎖定並以宣告式管理
title: "Nix"
---

# Nix 安裝

使用 Nix 執行 OpenClaw 的推薦方式是透過 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** —— 一個功能齊全的 Home Manager 模組。

## 快速開始

將此貼上至您的 AI 助手（Claude、Cursor 等）：

```text
I want to set up nix-openclaw on my Mac.
Repository: github:openclaw/nix-openclaw

What I need you to do:
1. Check if Determinate Nix is installed (if not, install it)
2. Create a local flake at ~/code/openclaw-local using templates/agent-first/flake.nix
3. Help me create a Telegram bot (@BotFather) and get my chat ID (@userinfobot)
4. Set up secrets (bot token, model provider API key) - plain files at ~/.secrets/ is fine
5. Fill in the template placeholders and run home-manager switch
6. Verify: launchd running, bot responds to messages

Reference the nix-openclaw README for module options.
```

> **📦 完整指南：[github.com/openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw)**
>
> nix-openclaw repo 是 Nix 安裝的權威來源。本頁面僅作為簡要概述。

## 您將獲得

- Gateway + macOS 應用程式 + 工具 —— 全部鎖定版本
- 重開機後仍存在的 Launchd 服務
- 具有宣告式配置的外掛系統
- 即時還原：`home-manager switch --rollback`

---

## Nix 模式執行時行為

當設定 `OPENCLAW_NIX_MODE=1` 時（使用 nix-openclaw 時自動設定）：

OpenClaw 支援 **Nix 模式**，該模式使配置具有確定性並停用自動安裝流程。
透過匯出以下內容啟用它：

```bash
OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 應用程式不會自動繼承 shell 環境變數。您也可以
透過 defaults 啟用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### 配置 + 狀態路徑

OpenClaw 從 `OPENCLAW_CONFIG_PATH` 讀取 JSON5 配置，並將可變數據儲存在 `OPENCLAW_STATE_DIR` 中。
必要時，您也可以設定 `OPENCLAW_HOME` 來控制用於內部路徑解析的基礎主目錄。

- `OPENCLAW_HOME`（默認優先順序：`HOME` / `USERPROFILE` / `os.homedir()`）
- `OPENCLAW_STATE_DIR`（默認：`~/.openclaw`）
- `OPENCLAW_CONFIG_PATH`（默認：`$OPENCLAW_STATE_DIR/openclaw.json`）

在 Nix 下運行時，將這些明確設定為 Nix 管理的位置，以便執行時狀態和配置
不會留在不可變存儲中。

### Nix 模式下的執行時行為

- 自動安裝和自我修改流程已停用
- 缺少依賴項時會顯示 Nix 專用的修復訊息
- 當存在 Nix 模式時，UI 會顯示一個唯讀的 Nix 模式橫幅

## 打包說明（macOS）

macOS 打包流程期望在以下位置有一個穩定的 Info.plist 模板：

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 將此範本複製到應用程式套件中，並修補動態欄位
（套件 ID、版本/組建、Git SHA、Sparkle 金鑰）。這讓 plist 對於 SwiftPM
打包和 Nix 組建（不依賴完整的 Xcode 工具鏈）保持確定性。

## 相關

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — 完整設定指南
- [Wizard](/zh-Hant/start/wizard) — 非 Nix CLI 設定
- [Docker](/zh-Hant/install/docker) — 容器化設定

import en from "/components/footer/en.mdx";

<en />
