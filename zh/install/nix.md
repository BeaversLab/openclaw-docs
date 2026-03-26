---
summary: "使用 Nix 声明式安装 OpenClaw"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

# Nix 安装

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 以声明式方式安装 OpenClaw —— 这是一个功能齐全的 Home Manager 模块。

<Info>
  [nix-openclaw](https://github.com/openclaw/nix-openclaw) 仓库是 Nix
  安装的事实来源。本页面仅为快速概览。
</Info>

## 你将获得

- Gateway(网关) + macOS 应用 + 工具 —— 全部已固定版本
- 可在重启后存活的 Launchd 服务
- 具有声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

## 快速开始

<Steps>
  <Step title="安装 Determinate Nix">
    如果尚未安装 Nix，请遵循 [Determinate Nix
    installer](https://github.com/DeterminateSystems/nix-installer) 的说明。
  </Step>
  <Step title="创建本地 flake">
    使用 nix-openclaw 仓库中的 agent-first 模板： ```bash mkdir -p ~/code/openclaw-local # Copy
    templates/agent-first/flake.nix from the nix-openclaw repo ```
  </Step>
  <Step title="配置密钥">
    设置您的消息机器人令牌和模型提供商 API 密钥。位于 `~/.secrets/` 的纯文本文件即可 正常工作。
  </Step>
  <Step title="填写模板占位符并切换">```bash home-manager switch ```</Step>
  <Step title="验证">确认 launchd 服务正在运行，并且您的机器人响应消息。</Step>
</Steps>

查看 [nix-openclaw README](https://github.com/openclaw/nix-openclaw) 以获取完整的模块选项和示例。

## Nix 模式运行时行为

当设置了 `OPENCLAW_NIX_MODE=1` 时（使用 nix-openclaw 时自动设置），OpenClaw 将进入禁用自动安装流程的确定性模式。

您也可以手动设置：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。请改为通过 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下的变化

- 自动安装和自变异流程被禁用
- 缺失的依赖项会显示 Nix 特定的修复消息
- UI 显示只读 Nix 模式横幅

### 配置和状态路径

OpenClaw 从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR` 中。在 Nix 下运行时，请将这些显式设置为 Nix 管理的位置，以便运行时状态和配置不会保留在不可变存储中。

| 变量                   | 默认值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

## 相关

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- 完整设置指南
- [向导](/zh/start/wizard) -- 非 Nix CLI 设置
- [Docker](/zh/install/docker) -- 容器化设置

import zh from "/components/footer/zh.mdx";

<zh />
