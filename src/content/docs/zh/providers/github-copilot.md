---
summary: "使用设备流程从 OpenClaw 登录 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

## 什么是 GitHub Copilot？

GitHub Copilot 是 GitHub 的 AI 编程助手。它根据您的 GitHub 账户和计划提供对 Copilot 模型的访问权限。OpenClaw 可以通过两种不同方式将 Copilot 用作模型提供商。

## 在 OpenClaw 中使用 Copilot 的两种方式

### 1) 内置 GitHub Copilot 提供商 (`github-copilot`)

使用原生的设备登录流程获取 GitHub 令牌，然后在 OpenClaw 运行时将其交换为 Copilot API 令牌。这是**默认**且最简单的路径，因为它不需要 VS Code。

### 2) Copilot Proxy 插件 (`copilot-proxy`)

使用 **Copilot Proxy** VS Code 扩展作为本地桥梁。OpenClaw 与
代理的 `/v1` 端点通信，并使用你在那里配置的模型列表。如果你已经在 VS Code 中运行
Copilot Proxy 或需要通过它进行路由，请选择此项。
你必须启用插件并保持 VS Code 扩展运行。

使用 GitHub Copilot 作为模型提供商 (`github-copilot`)。登录命令运行
GitHub 设备流程，保存身份验证配置文件，并更新你的配置以使用该
配置文件。

## CLI 设置

```bash
openclaw models auth login-github-copilot
```

系统将提示您访问 URL 并输入一次性代码。在完成之前请保持终端打开状态。

### 可选标志

```bash
openclaw models auth login-github-copilot --yes
```

要一步应用提供商推荐的默认模型，请改为使用
通用身份验证命令：

```bash
openclaw models auth login --provider github-copilot --method device --set-default
```

## 设置默认模型

```bash
openclaw models set github-copilot/gpt-4o
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
}
```

## 注意

- 需要交互式 TTY；直接在终端中运行它。
- Copilot 模型的可用性取决于你的计划；如果某个模型被拒绝，请尝试
  另一个 ID（例如 `github-copilot/gpt-4.1`）。
- Claude 模型 ID 自动使用 Anthropic Messages 传输；GPT、o 系列
  和 Gemini 模型保持 OpenAI Responses 传输。
- 登录会在身份验证配置文件存储中存储一个 GitHub 令牌，并在 OpenClaw 运行时将其交换为
  Copilot API 令牌。
