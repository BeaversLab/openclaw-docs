---
summary: "OpenClaw 入门选项和流程概述"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "入门概述"
sidebarTitle: "入门概述"
---

# 入门概述

OpenClaw 支持多种入门路径，具体取决于 Gateway 网关 的运行位置以及您配置提供商的首选方式。

## 选择您的入门路径

- 适用于 CLI、macOS 和 Linux（通过 Windows）的 **WSL2 新手引导**。
- 适用于 Apple silicon 或 Intel Mac 的引导式首次运行的 **macOS 应用**。

## CLI 新手引导

在终端中运行新手引导：

```bash
openclaw onboard
```

当您希望完全控制 CLI、工作区、通道和技能时，请使用 Gateway(网关) 新手引导。文档：

- [新手引导 (CLI)](/zh/start/wizard)
- [`openclaw onboard` 命令](/zh/cli/onboard)

## macOS 应用入门

当您希望在 macOS 上进行完全引导式的设置时，请使用 OpenClaw 应用。文档：

- [新手引导 (macOS App)](/zh/start/onboarding)

## 自定义提供商

如果您需要的端点未列出，包括公开标准 OpenAI 或 Anthropic API 的托管提供商，请在 CLI 新手引导中选择 **Custom Provider**。您将被要求：

- 选择 OpenAI 兼容、Anthropic 兼容或 **未知**（自动检测）。
- 输入基础 URL 和 API 密钥（如果提供商需要）。
- 提供模型 ID 和可选别名。
- 选择一个端点 ID，以便多个自定义端点可以共存。

有关详细步骤，请遵循上面的 CLI 入门文档。

import zh from "/components/footer/zh.mdx";

<zh />
