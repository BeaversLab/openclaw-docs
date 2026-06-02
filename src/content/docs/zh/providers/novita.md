---
summary: "OpenAIAPIOpenClaw通过 OpenClaw 使用 NovitaAI 的 OpenAI 兼容 API"
read_when:
  - You want to run OpenClaw with NovitaAI models
  - You need the Novita provider id, key, or endpoint
title: "NovitaAI"
---

NovitaAI 是一个托管 AI 基础设施提供商，提供 OpenAI 兼容的模型 API。在 OpenClaw 中，它是一个捆绑的模型提供商，因此提供商 ID 为 OpenAIAPIOpenClaw`novita`，凭据通过常规模型认证流程处理，模型引用看起来像 `novita/deepseek/deepseek-v3-0324`。

当您希望通过托管方式访问开放权重和第三方模型路由，而无需运行自己的推理服务器时，请使用 Novita。捆绑的目录专注于适用于智能体轮次的聊天模型，包括 Novita 提供的 DeepSeek、Moonshot、MiniMax、GLM 和 Qwen 路由。

此提供商使用 Novita 的 OpenAI 兼容端点。OpenClaw 处理提供商注册、身份验证、别名、模型引用规范化和基本 URL 选择；Novita 控制实时模型可用性、帐户权限、定价和速率限制。

## 设置

在 [novita.ai/settings/key-management](APIhttps://novita.ai/settings/key-management) 创建 API 密钥，然后运行：

```bash
openclaw onboard --auth-choice novita-api-key
```

或者设置：

```bash
export NOVITA_API_KEY="<your-novita-api-key>" # pragma: allowlist secret
```

## 默认值

- 提供商：`novita`
- 别名：`novita-ai`，`novitaai`
- 基本 URL：`https://api.novita.ai/openai/v1`
- 环境变量：`NOVITA_API_KEY`
- 默认模型：`novita/deepseek/deepseek-v3-0324`

## 何时选择 Novita

- 您希望通过 OpenAI 兼容的 API 获得托管的开放权重模型访问权限。
- 您希望通过单个提供商账户获得 DeepSeek、Kimi、MiniMax、GLM 或 Qwen 系列路由。
- 除了 OpenRouter、GMI、DeepInfra 或直接供应商 API 之外，您还需要另一个托管回退路径。
- 相比于维护 vLLM、SGLang、LM Studio 或 Ollama 基础设施，您更喜欢提供商托管的模型服务。

当您需要供应商原生的请求参数或支持合同时，请选择直接供应商提供商。当模型必须在您自己的硬件上运行或在您自己的网络边界内运行时，请选择本地提供商。

## 模型

捆绑目录包含了常用的 NovitaAI 路由 ID，包括：

- `novita/moonshotai/kimi-k2.5`
- `novita/minimax/minimax-m2.7`
- `novita/zai-org/glm-5`
- `novita/deepseek/deepseek-v3-0324`
- `novita/deepseek/deepseek-r1-0528`
- `novita/qwen/qwen3-235b-a22b-fp8`

该目录是 OpenClaw 模型选择的起点。您的账户、区域或 Novita 当前的目录可能会添加、删除或限制路由。在设置长期默认值之前，请从 OpenClawCLI 检查提供商：

```bash
openclaw models list --provider novita
```

## 故障排除

- `401` 或 `403`：在 Novita 的密钥管理页面中验证密钥，如果存储的配置文件已过时，请重新运行
  `openclaw onboard --auth-choice novita-api-key`。
- 未知模型错误：使用由
  `openclaw models list --provider novita` 返回的确切 `novita/<route-id>`。
- 路由缓慢或失败：尝试另一个 Novita 模型路由，或将 Novita 设置为可以容忍特定提供商差异的工作负载的回退提供商。

## 相关

- [模型提供商](/zh/concepts/model-providers)
- [所有提供商](/zh/providers/index)
