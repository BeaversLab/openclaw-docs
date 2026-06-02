---
summary: "OpenAIAPIOpenClaw在 OpenClaw 中使用 GMI Cloud 的 OpenAI 兼容 API"
read_when:
  - You want to run OpenClaw with GMI Cloud models
  - You need the GMI provider id, key, or endpoint
title: "GMI Cloud"
---

GMI Cloud 是一个托管推理平台，用于托管前沿和开源权重的模型，
并位于 OpenAI 兼容的 API 之后。在 OpenClaw 中，它是一个捆绑的模型提供商，
这意味着你可以使用提供商 ID OpenAIAPIOpenClaw`gmi` 来选择它，通过正常的模型身份验证存储凭据，
并使用模型引用，如 `gmi/google/gemini-3.1-flash-lite`。

当你想要使用一个 API 密钥访问多个托管的模型家族时，请使用 GMI，包括
Google、Anthropic、OpenAI、DeepSeek、Moonshot 以及 Z.AI 由 GMI 目录公开的
路由。它作为模型回退的备用提供商非常有用，用于比较
不同供应商的托管路由，或者当 GMI 在你的主要提供商之前
提供某个模型时。

此提供商使用 OpenAI 兼容的聊天语义。OpenClaw 拥有提供商
ID、身份验证配置文件、别名、模型目录种子和基本 URL；GMI 拥有实时
模型可用性、计费、速率限制以及任何提供商端的路由策略。

## 设置

在 GMI Cloud 中创建一个 API 密钥，然后运行：

```bash
openclaw onboard --auth-choice gmi-api-key
```

或者设置：

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## 默认值

- 提供商：`gmi`
- 别名：`gmi-cloud`, `gmicloud`
- 基本 URL：`https://api.gmi-serving.com/v1`
- 环境变量：`GMI_API_KEY`
- 默认模型：`gmi/google/gemini-3.1-flash-lite`

## 何时选择 GMI

- 你想要一个托管的 OpenAI 兼容端点，而不是本地模型服务器。
- 你希望通过一个提供商账户尝试多个商业和开源权重模型家族。
- 你想要一个具有与 OpenRouter、
  DeepInfra、Together 或直接供应商 API 不同的上游路由的备用提供商。
- 你需要 GMI 特定的模型 ID、定价或账户控制。

当您需要 GMI 未通过其 OpenAI 兼容路由公开的供应商原生功能时，请改为选择直接供应商提供商。当数据本地性或本地 GPU 控制比托管便利性更重要时，请选择本地提供商（如 Ollama、LM Studio、vLLM 或 SGLang）。

## 模型

内置目录包含了常用的可用 GMI Cloud 路由 ID，包括：

- `gmi/zai-org/GLM-5.1-FP8`
- `gmi/deepseek-ai/DeepSeek-V3.2`
- `gmi/moonshotai/Kimi-K2.5`
- `gmi/google/gemini-3.1-flash-lite`
- `gmi/anthropic/claude-sonnet-4.6`
- `gmi/openai/gpt-5.4`

该目录只是一个种子，并不保证每个账户都可以随时调用每个模型。使用 OpenClaw 的模型列出命令来查看已配置的提供商在您的环境中报告的内容：

```bash
openclaw models list --provider gmi
```

## 故障排除

- `401` 或 `403`：检查运行 OpenClaw 的进程是否设置了 `GMI_API_KEY`，或者重新运行新手引导以将密钥存储在提供商身份验证配置文件中。
- 未知模型错误：确认该模型存在于您的 GMI 账户中，并使用 `openclaw models list --provider gmi` 显示的完整 `gmi/<route-id>` 引用。
- 间歇性提供商错误：尝试不同的 GMI 路由，或将 GMI 配置为回退选项，而不是唯一的主要模型提供商。

## 相关

- [模型提供商](/zh/concepts/model-providers)
- [所有提供商](/zh/providers/index)
