---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多個模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一個 **unified API**，可將請求路由至單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可使用。

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
      model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
    },
  },
}
```

## 注意事項

- 模型參考是 `openrouter/<provider>/<model>`。
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
- OpenRouter 在底層使用帶有您 API 金鑰的 Bearer 權杖。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
