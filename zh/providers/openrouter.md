---
title: "OpenRouter"
summary: "在 OpenClaw 中使用 OpenRouter 的统一 API 访问多模型"
read_when:
  - 想用一个 API key 访问多种 LLM
  - 想通过 OpenRouter 在 OpenClaw 中运行模型
---

# OpenRouter

OpenRouter 提供 **统一 API**，在单一端点与 API key 后路由多种模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可使用。

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

## 说明

- 模型引用为 `openrouter/<provider>/<model>`。
- 更多模型/provider 选项参见 [/concepts/model-providers](/zh/concepts/model-providers)。
- OpenRouter 在底层使用你的 API key 作为 Bearer token。
