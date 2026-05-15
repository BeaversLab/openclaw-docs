---
summary: "OpenClaw 入门选项和流程概述"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "新手引导概述"
sidebarTitle: "入门概述"
---

OpenClaw 有两条新手引导路径。两者都会配置身份验证、Gateway（网关）以及
可选的聊天频道——它们只是在设置交互方式上有所不同。

## 我应该使用哪条路径？

|              | CLI 新手引导                         | macOS 应用新手引导     |
| ------------ | ------------------------------------ | ---------------------- |
| **支持平台** | macOS、Linux、Windows（原生或 WSL2） | 仅限 macOS             |
| **界面**     | 终端向导                             | 应用中的引导式 UI      |
| **最适用于** | 服务器、无头模式、完全控制           | Mac 桌面端、可视化设置 |
| **自动化**   | 用于脚本的 `--non-interactive`       | 仅限手动               |
| **命令**     | `openclaw onboard`                   | 启动应用               |

大多数用户应从 **CLI 新手引导** 开始——它适用于所有环境，并且
为您提供最充分的控制权。

## 新手引导配置的内容

无论您选择哪条路径，新手引导都会设置以下内容：

1. **模型提供商和身份验证** — 您所选提供商的 API 密钥、OAuth 或设置令牌
2. **工作区** — 用于代理文件、引导模板和记忆的目录
3. **Gateway（网关）** — 端口、绑定地址、身份验证模式
4. **频道**（可选）—— 内置且绑定的聊天频道，例如
   iMessage、Discord、飞书、Google Chat、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等等
5. **守护进程**（可选）——后台服务，使 Gateway（网关）能够自动启动

## CLI 新手引导

在任何终端中运行：

```bash
openclaw onboard
```

添加 `--install-daemon` 以一步安装后台服务。

完整参考：[新手引导 (CLI)](/zh/start/wizard)
CLI 命令文档：[`openclaw onboard`](/zh/cli/onboard)

## macOS 应用新手引导

打开 OpenClaw 应用。首次运行向导将通过可视化界面引导您完成相同的步骤。

完整参考：[新手引导 (macOS 应用)](/zh/start/onboarding)

## 自定义或未列出的提供商

如果新手引导中未列出您的提供商，请选择 **自定义提供商** 并
输入：

- API 兼容模式（OpenAI 兼容、Anthropic 兼容或自动检测）
- 基础 URL 和 API 密钥
- 模型 ID 和可选别名

多个自定义端点可以共存——每个端点都有自己的端点 ID。

## 相关内容

- [入门指南](/zh/start/getting-started)
- [CLI 设置参考](/zh/start/wizard-cli-reference)
