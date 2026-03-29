---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "模型供應商快速入門"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個，進行驗證，然後將預設
模型設定為 `provider/model`。

## 快速入門（兩個步驟）

1. 向供應商進行驗證（通常透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支援的供應商（入門組）

- [OpenAI (API + Codex)](/en/providers/openai)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [OpenRouter](/en/providers/openrouter)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [Mistral](/en/providers/mistral)
- [Synthetic](/en/providers/synthetic)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [Z.AI](/en/providers/zai)
- [GLM 模型](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Venice (Venice AI)](/en/providers/venice)
- [Amazon Bedrock](/en/providers/bedrock)
- [Qianfan](/en/providers/qianfan)
- [xAI](/en/providers/xai)

若要查看完整的供應商目錄（xAI、Groq、Mistral 等）和進階配置，
請參閱 [模型供應商](/en/concepts/model-providers)。
