---
summary: "使用 Nix 声明式安装 OpenClaw"
read_when:
  - "You want reproducible, rollback-able installs"
  - "You're already using Nix/NixOS/Home Manager"
  - "You want everything pinned and managed declaratively"
title: "Nix"
---

# Nix 安装

使用 Nix 运行 OpenClaw 的推荐方法是通过 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** — 一个开箱即用的 Home Manager 模块。

## 快速开始

将此粘贴到您的 AI 代理（Claude、Cursor 等）：

```text
I want to set up nix-openclaw on my Mac.
Repository: github:openclaw/nix-openclaw

What I need you to do:
1. Check if Determinate Nix is installed (if not, install it)
2. Create a local flake at ~/code/openclaw-local using templates/agent-first/flake.nix
3. Help me create a Telegram bot (@BotFather) and get my chat ID (@userinfobot)
4. Set up secrets (bot token, Anthropic key) - plain files at ~/.secrets/ is fine
5. Fill in the template placeholders and run home-manager switch
6. Verify: launchd running, bot responds to messages

Reference the nix-openclaw README for module options.
```

> **📦 完整指南：[github.com/openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw)**
>
> nix-openclaw 仓库是 Nix 安装的真相来源。本页面只是一个快速概述。

## 您将获得

- Gateway + macOS 应用 + 工具（whisper、spotify、cameras）— 全部固定版本
- 在重启后仍然存在的 Launchd 服务
- 具有声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

---

## Nix 模式运行时行为

当设置了 `OPENCLAW_NIX_MODE=1` 时（使用 nix-openclaw 时自动设置）：

OpenClaw 支持 **Nix 模式**，使配置确定性并禁用自动安装流程。
通过导出来启用：

```bash
OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。您也可以
通过 defaults 启用 Nix 模式：

```bash
defaults write bot.molt.mac openclaw.nixMode -bool true
```

### 配置 + 状态路径

OpenClaw 从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR` 中。

- `OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）
- `OPENCLAW_CONFIG_PATH`（默认：`$OPENCLAW_STATE_DIR/openclaw.json`）

在 Nix 下运行时，显式设置这些为 Nix 管理的位置，以便运行时状态和配置
保持不可变存储之外。

### Nix 模式下的运行时行为

- 自动安装和自我变更流程被禁用
- 缺失的依赖项显示 Nix 特定的修复消息
- UI 在存在时显示只读的 Nix 模式横幅

## 打包注意事项（macOS）

macOS 打包流程期望在此处有一个稳定的 Info.plist 模板：

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 将此模板复制到应用包中并修补动态字段
（bundle ID、版本/构建、Git SHA、Sparkle 键）。这使得 plist 对 SwiftPM
打包和 Nix 构建（不依赖完整的 Xcode 工具链）具有确定性。

## 相关

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — 完整设置指南
- [Wizard](/zh/start/wizard) — 非 Nix CLI 设置
- [Docker](/zh/install/docker) — 容器化设置
