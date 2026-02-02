> [!NOTE]
> 本页正在翻译中。

---
summary: "使用设备登录流程从 OpenClaw 登录 GitHub Copilot"
read_when:
  - 想用 GitHub Copilot 作为模型提供商
  - 需要 `openclaw models auth login-github-copilot` 流程
---
# Github Copilot

## 什么是 GitHub Copilot？

GitHub Copilot 是 GitHub 的 AI 编码助手。它为你的 GitHub 账号与套餐提供 Copilot 模型访问。OpenClaw 可以通过两种方式将 Copilot 作为模型提供商。

## 在 OpenClaw 中使用 Copilot 的两种方式

### 1) 内置 GitHub Copilot provider（`github-copilot`）

使用原生设备登录流程获取 GitHub token，并在 OpenClaw 运行时交换为 Copilot API token。这是 **默认** 且最简单的路径，因为不需要 VS Code。

### 2) Copilot Proxy 插件（`copilot-proxy`）

使用 **Copilot Proxy** VS Code 扩展作为本地桥接。OpenClaw 与代理的 `/v1` 端点通信，并使用你在那边配置的模型列表。若你已在 VS Code 中运行 Copilot Proxy 或需要通过它转发，请选择此方式。你必须启用插件并保持 VS Code 扩展运行。

使用 GitHub Copilot 作为模型提供商（`github-copilot`）。登录命令会运行 GitHub 设备登录流程，保存认证 profile，并更新配置以使用该 profile。

## CLI 设置

```bash
openclaw models auth login-github-copilot
```

系统会提示你访问一个 URL 并输入一次性代码。保持终端打开直到完成。

### 可选参数

```bash
openclaw models auth login-github-copilot --profile-id github-copilot:work
openclaw models auth login-github-copilot --yes
```

## 设置默认模型

```bash
openclaw models set github-copilot/gpt-4o
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } }
}
```

## 说明

- 需要交互式 TTY；请在终端直接运行。
- Copilot 模型可用性取决于你的套餐；若模型被拒绝，请尝试其他 ID（例如 `github-copilot/gpt-4.1`）。
- 登录会将 GitHub token 存入认证 profile，并在 OpenClaw 运行时交换为 Copilot API token。
