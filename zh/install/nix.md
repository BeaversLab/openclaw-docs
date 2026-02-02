---
title: "Nix 安装"
summary: "使用 Nix 以声明式方式安装 OpenClaw"
read_when:
  - 你想要可复现、可回滚的安装
  - 你已经在用 Nix/NixOS/Home Manager
  - 你希望全部被固定并声明式管理
---

# Nix 安装

使用 Nix 运行 OpenClaw 的推荐方式是 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** —— 一个内置电池的 Home Manager 模块。

## 快速开始

把下面这段发给你的 AI agent（Claude、Cursor 等）：

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
> nix-openclaw 仓库是 Nix 安装的唯一权威来源。本页只是快速概览。

## 你会得到什么

- Gateway + macOS app + tools（whisper、spotify、cameras）——全部固定版本
- 可跨重启存活的 launchd 服务
- 带声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

---

## Nix Mode 运行时行为

当设置 `OPENCLAW_NIX_MODE=1`（nix-openclaw 会自动设置）时：

OpenClaw 支持 **Nix mode**，会让配置确定化并禁用自动安装流程。
可通过导出环境变量启用：

```bash
OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI app 不会自动继承 shell 环境变量。你也可以用 defaults 开启 Nix mode：

```bash
defaults write bot.molt.mac openclaw.nixMode -bool true
```

### Config + state 路径

OpenClaw 从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并把可变数据存入 `OPENCLAW_STATE_DIR`。

- `OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）
- `OPENCLAW_CONFIG_PATH`（默认：`$OPENCLAW_STATE_DIR/openclaw.json`）

在 Nix 下运行时，请把它们显式设到 Nix 管理的位置，以避免运行时状态和配置进入不可变 store。

### Nix mode 下的运行时行为

- 禁用自动安装与自我变更流程
- 缺失依赖会显示 Nix 专用的修复提示
- UI 出现只读的 Nix mode banner（如果启用）

## 打包说明（macOS）

macOS 打包流程要求一个稳定的 Info.plist 模板，路径：

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 会将该模板复制进 app bundle，并补全动态字段
（bundle ID、version/build、Git SHA、Sparkle keys）。这样可保持 plist 的确定性，方便 SwiftPM
打包与 Nix 构建（不依赖完整 Xcode 工具链）。

## 相关

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — 完整安装指南
- [Wizard](/zh/start/wizard) — 非 Nix CLI 设置
- [Docker](/zh/install/docker) — 容器化方案
