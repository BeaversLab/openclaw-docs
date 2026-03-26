---
summary: "OpenClaw 支援的模型供應商 (LLM)"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "模型供應商快速入門"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個，進行身份驗證，然後將預設模型設定為 `provider/model`。

## 快速入門（兩個步驟）

1. 與供應商進行身份驗證（通常透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支援的供應商（入門套件）

- [OpenAI (API + Codex)](/zh-Hant/providers/openai)
- [Anthropic (API + Claude Code CLI)](/zh-Hant/providers/anthropic)
- [OpenRouter](/zh-Hant/providers/openrouter)
- [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
- [Mistral](/zh-Hant/providers/mistral)
- [Synthetic](/zh-Hant/providers/synthetic)
- [OpenCode (Zen + Go)](/zh-Hant/providers/opencode)
- [Z.AI](/zh-Hant/providers/zai)
- [GLM 模型](/zh-Hant/providers/glm)
- [MiniMax](/zh-Hant/providers/minimax)
- [Venice (Venice AI)](/zh-Hant/providers/venice)
- [Amazon Bedrock](/zh-Hant/providers/bedrock)
- [Qianfan](/zh-Hant/providers/qianfan)
- [xAI](/zh-Hant/providers/xai)

如需完整的提供商目錄（xAI、Groq、Mistral 等）及進階設定，
請參閱 [Model providers](/zh-Hant/concepts/model-providers)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
