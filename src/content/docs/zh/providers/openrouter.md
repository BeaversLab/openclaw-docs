---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问多个模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一个**统一 API**，它通过单个端点和 API 密钥将请求路由到许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## CLI 设置

```bash
openclaw onboard --auth-choice openrouter-api-key
```

## 配置片段

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 注

- 模型引用是 `openrouter/<provider>/<model>`。
- 新手引导默认为 `openrouter/auto`。稍后使用
  `openclaw models set openrouter/<provider>/<model>` 切换到具体的模型。
- 有关更多模型/提供商选项，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
- OpenRouter 在底层使用带有您的 API 密钥的 Bearer 令牌。
- 在真实的 OpenRouter 请求 (`https://openrouter.ai/api/v1`) 中，OpenClaw 还
  会添加 OpenRouter 文档中记录的应用归因标头：
  `HTTP-Referer: https://openclaw.ai`、`X-OpenRouter-Title: OpenClaw` 和
  `X-OpenRouter-Categories: cli-agent`。
- 在经过验证的 OpenRouter 路由上，Anthropic 模型引用也会保留
  OpenClaw 用于在系统/开发者提示块上更好地重用提示缓存的
  OpenRouter 特有的 Anthropic `cache_control` 标记。
- 如果您将 OpenRouter 提供商指向其他代理/基础 URL，OpenClaw
  将不会注入那些 OpenRouter 特有的标头或 Anthropic 缓存标记。
- OpenRouter 仍然通过代理风格的 OpenAI 兼容路径运行，因此
  原生的仅限 OpenAI 的请求塑造（例如 `serviceTier`、Responses `store`、
  OpenAI 推理兼容负载以及提示缓存提示）不会被转发。
- Gemini 支持的 OpenRouter 引用停留在代理-Gemini 路径上：OpenClaw 在那里
  保留 Gemini 思考签名清理，但不会启用原生 Gemini
  重放验证或引导重写。
- 在支持的非 `auto` 路由上，OpenClaw 将选定的思考级别映射到
  OpenRouter 代理推理负载。不支持的模型提示和
  `openrouter/auto` 将跳过该推理注入。
- 如果您在模型参数下传递 OpenRouter 提供商路由，OpenClaw 将在共享流
  包装器运行之前将其作为 OpenRouter 路由元数据转发。
