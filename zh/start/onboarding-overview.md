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

- 适用于 macOS、Linux 和 Windows（通过 WSL2）的 **CLI 向导**。
- 适用于 Apple silicon 或 Intel Mac 的引导式首次运行的 **macOS 应用**。

## CLI 入门向导

在终端中运行向导：

```bash
openclaw onboard
```

当您想要完全控制 Gateway 网关、工作区、频道和技能时，请使用 CLI 向导。文档：

- [入门向导 (CLI)](/zh/en/start/向导)
- [`openclaw onboard` 命令](/zh/en/cli/onboard)

## macOS 应用入门

当您希望在 macOS 上进行完全引导式的设置时，请使用 OpenClaw 应用。文档：

- [入门 (macOS 应用)](/zh/en/start/新手引导)

## 自定义提供商

如果您需要未列出的端点，包括暴露标准 OpenAI 或 Anthropic API 的托管提供商，请在 CLI 向导中选择 **自定义提供商**。系统将要求您：

- 选择 OpenAI 兼容、Anthropic 兼容或 **未知**（自动检测）。
- 输入基础 URL 和 API 密钥（如果提供商需要）。
- 提供模型 ID 和可选别名。
- 选择一个端点 ID，以便多个自定义端点可以共存。

有关详细步骤，请遵循上面的 CLI 入门文档。

import zh from '/components/footer/zh.mdx';

<zh />
