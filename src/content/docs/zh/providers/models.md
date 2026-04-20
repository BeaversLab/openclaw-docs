---
summary: "OpenClaw 支持的模型提供商 (LLM)"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "模型提供商快速入门"
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个，进行身份验证，然后将默认模型设置为 `provider/model`。

## 快速入门（两步）

1. 与提供商进行身份验证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支持的提供商（入门套件）

- [Alibaba Model Studio](/zh/providers/alibaba)
- [Anthropic (API + Claude CLI)](/zh/providers/anthropic)
- [Amazon Bedrock](/zh/providers/bedrock)
- [BytePlus (International)](/zh/concepts/model-providers#byteplus-international)
- [Chutes](/zh/providers/chutes)
- [ComfyUI](/zh/providers/comfy)
- [Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)
- [fal](/zh/providers/fal)
- [Fireworks](/zh/providers/fireworks)
- [GLM models](/zh/providers/glm)
- [MiniMax](/zh/providers/minimax)
- [Mistral](/zh/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
- [OpenAI (API + Codex)](/zh/providers/openai)
- [OpenCode (Zen + Go)](/zh/providers/opencode)
- [OpenRouter](/zh/providers/openrouter)
- [Qianfan](/zh/providers/qianfan)
- [Qwen](/zh/providers/qwen)
- [Runway](/zh/providers/runway)
- [StepFun](/zh/providers/stepfun)
- [Synthetic](/zh/providers/synthetic)
- [Vercel AI Gateway(网关)](/zh/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/zh/providers/venice)
- [xAI](/zh/providers/xai)
- [Z.AI](/zh/providers/zai)

## 其他打包的提供商变体

- `anthropic-vertex` - 当 Vertex 凭据可用时，隐式支持 Google Vertex 上的 Anthropic；无需单独的新手引导身份验证选择
- `copilot-proxy` - 本地 VS Code Copilot 代理桥接器；使用 `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - 非官方 Gemini CLI OAuth 流程；需要本地安装 `gemini`（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）；默认模型 `google-gemini-cli/gemini-3-flash-preview`；使用 `openclaw onboard --auth-choice google-gemini-cli` 或 `openclaw models auth login --provider google-gemini-cli --set-default`

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，请参阅 [Model providers](/zh/concepts/model-providers)。
