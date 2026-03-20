---
summary: "使用 OpenClaw 声明式安装 Nix"
read_when:
  - 您希望进行可复现、可回滚的安装
  - 您已经在使用 Nix/NixOS/Home Manager
  - 您希望将所有内容固定并通过声明方式管理
title: "Nix"
---

# Nix 安装

使用 OpenClaw 运行 Nix 的推荐方式是通过 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** —— 一个功能齐全的 Home Manager 模块。

## 快速开始

将此内容粘贴到您的 AI 代理（Claude、Cursor 等）：

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
> nix-openclaw 代码库是 Nix 安装的权威来源。本页面仅作简要概述。

## 您将获得

- Gateway(网关) + macOS 应用 + 工具（whisper、spotify、cameras）—— 全部固定版本
- 可在重启后存活的 Launchd 服务
- 具有声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

---

## Nix 模式运行时行为

当设置了 `OPENCLAW_NIX_MODE=1` 时（使用 nix-openclaw 时自动设置）：

OpenClaw 支持一种 **Nix 模式**，该模式使配置具有确定性并禁用自动安装流程。
通过导出以下内容启用它：

```bash
OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用程序不会自动继承 shell 环境变量。您也可以
通过 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### 配置 + 状态路径

OpenClaw 从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR` 中。
必要时，您还可以设置 `OPENCLAW_HOME` 来控制用于内部路径解析的主目录。

- `OPENCLAW_HOME`（默认优先级：`HOME` / `USERPROFILE` / `os.homedir()`）
- `OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）
- `OPENCLAW_CONFIG_PATH`（默认：`$OPENCLAW_STATE_DIR/openclaw.json`）

在 Nix 下运行时，请将这些显式设置为 Nix 管理的位置，以便运行时状态和配置
不会保留在不可变存储中。

### Nix 模式下的运行时行为

- 自动安装和自我变异流程已禁用
- 缺少依赖项时会显示 Nix 特定的修复消息
- 如果存在，UI 会显示只读的 Nix 模式横幅

## 打包说明（macOS）

macOS 打包流程需要一个稳定的 Info.plist 模板，位于：

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 将此模板复制到应用包中，并修补动态字段
（Bundle ID、版本/构建号、Git SHA、Sparkle 密钥）。这使得 plist 对于 SwiftPM
打包和 Nix 构建而言是确定性的（这些构建不依赖完整的 Xcode 工具链）。

## 相关

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — 完整设置指南
- [Wizard](/zh/start/wizard) — 非 Nix CLI 设置
- [Docker](/zh/install/docker) — 容器化设置

import en from "/components/footer/en.mdx";

<en />
