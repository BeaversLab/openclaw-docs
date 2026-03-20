---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多個模型"
read_when:
  - 您想要單一 API 金鑰來使用多個 LLM
  - 您想要透過 OpenRouter 在 OpenClaw 中執行模型
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供一個 **unified API**（統一 API），將請求路由到單一端點和 API 金鑰後方的多個模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

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

## 注意事項

- 模型參照為 `openrouter/<provider>/<model>`。
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
- OpenRouter 在底層使用與您的 API 金鑰搭配的 Bearer token。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
