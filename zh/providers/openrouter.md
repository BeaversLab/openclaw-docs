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

## 注

- 模型引用是 `openrouter/<provider>/<model>`。
- 有关更多模型/提供商选项，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
- OpenRouter 在底层使用带有您的 API 密钥的 Bearer 令牌。

import zh from '/components/footer/zh.mdx';

<zh />
