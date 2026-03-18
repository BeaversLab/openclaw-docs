---
summary: "在 OpenClaw 中使用 OpenRouter 的統一 API 存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一個**統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## CLI 設定

```bash
openclaw onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## 設定片段

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

## 備註

- 模型參照為 `openrouter/<provider>/<model>`。
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
- OpenRouter 在底層使用包含您的 API 金鑰的 Bearer token。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
