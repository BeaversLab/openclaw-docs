---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - You want to choose a model provider
  - You want quick setup examples for LLM auth + model selection
title: "模型提供者快速入門"
---

OpenClaw 可以使用許多 LLM 提供商。選擇一個，進行身份驗證，然後將預設模型設定為 `provider/model`。

## 快速入門（兩個步驟）

1. 向提供商進行身份驗證（通常透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支援的提供商（入門組合）

- [阿里雲模型工作室](/zh-Hant/providers/alibaba)
- [Amazon Bedrock](/zh-Hant/providers/bedrock)
- [Anthropic (API + Claude CLI)](/zh-Hant/providers/anthropic)
- [BytePlus (國際版)](/zh-Hant/concepts/model-providers#byteplus-international)
- [Chutes](/zh-Hant/providers/chutes)
- [ComfyUI](/zh-Hant/providers/comfy)
- [Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
- [DeepInfra](/zh-Hant/providers/deepinfra)
- [fal](/zh-Hant/providers/fal)
- [Fireworks](/zh-Hant/providers/fireworks)
- [GLM 模型](/zh-Hant/providers/glm)
- [MiniMax](/zh-Hant/providers/minimax)
- [Mistral](/zh-Hant/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
- [OpenAI (API + Codex)](/zh-Hant/providers/openai)
- [OpenCode (Zen + Go)](/zh-Hant/providers/opencode)
- [OpenRouter](/zh-Hant/providers/openrouter)
- [Qianfan](/zh-Hant/providers/qianfan)
- [Qwen](/zh-Hant/providers/qwen)
- [Runway](/zh-Hant/providers/runway)
- [StepFun](/zh-Hant/providers/stepfun)
- [Synthetic](/zh-Hant/providers/synthetic)
- [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/zh-Hant/providers/venice)
- [xAI](/zh-Hant/providers/xai)
- [Z.AI](/zh-Hant/providers/zai)

## 其他提供者變體

- `anthropic-vertex` - 安裝 `@openclaw/anthropic-vertex-provider` 以在 Vertex 憑證可用時支援 Google Vertex 上的隱式 Anthropic；無需單獨的入門驗證選項
- `copilot-proxy` - 本機 VS Code Copilot Proxy 橋接器；使用 `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - 非官方 Gemini CLI OAuth 流程；需要本機安裝 `gemini` (`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`)；預設模型 `google-gemini-cli/gemini-3-flash-preview`；使用 `openclaw onboard --auth-choice google-gemini-cli` 或 `openclaw models auth login --provider google-gemini-cli --set-default`

如需完整的提供者目錄（xAI、Groq、Mistral 等）及進階設定，
請參閱 [模型提供者](/zh-Hant/concepts/model-providers)。

## 相關

- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型容錯](/zh-Hant/concepts/model-failover)
- [模型 CLI](/zh-Hant/cli/models)
