---
summary: "使用 OpenRouter 的统一 API 在 OpenClaw 中访问多个模型"
read_when:
  - "You want a single API key for many LLMs"
  - "You want to run models via OpenRouter in OpenClaw"
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一个**统一 API**，将请求路由到单个端点和 API 密钥背后的多个模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 可以通过切换基础 URL 来工作。

## CLI setup

```bash
openclaw onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
    },
  },
}
```

## 注意事项

- 模型引用为 `openrouter/<provider>/<model>`。
- 有关更多模型/提供商选项，请参阅 [/concepts/model-providers](/zh/concepts/model-providers)。
- OpenRouter 在底层使用带有 API 密钥的 Bearer 令牌。
