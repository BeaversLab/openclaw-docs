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

- [Alibaba Model Studio](/en/providers/alibaba)
- [Anthropic (API + Claude CLI)](/en/providers/anthropic)
- [Amazon Bedrock](/en/providers/bedrock)
- [BytePlus (International)](/en/concepts/model-providers#byteplus-international)
- [Chutes](/en/providers/chutes)
- [ComfyUI](/en/providers/comfy)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [fal](/en/providers/fal)
- [Fireworks](/en/providers/fireworks)
- [GLM models](/en/providers/glm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode (Zen + Go)](/en/providers/opencode)
- [OpenRouter](/en/providers/openrouter)
- [Qianfan](/en/providers/qianfan)
- [Qwen](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [StepFun](/en/providers/stepfun)
- [Synthetic](/en/providers/synthetic)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/en/providers/venice)
- [xAI](/en/providers/xai)
- [Z.AI](/en/providers/zai)

## 其他內建提供者變體

- `anthropic-vertex` - 當有 Vertex 憑證可用時，隱含支援 Google Vertex 上的 Anthropic；無需額外的入門驗證選擇
- `copilot-proxy` - 本機 VS Code Copilot Proxy 橋接器；使用 `openclaw onboard --auth-choice copilot-proxy`

如需完整的提供者目錄（xAI、Groq、Mistral 等）及進階設定，請參閱 [Model providers](/en/concepts/model-providers)。
