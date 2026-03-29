---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "供應商目錄"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個供應商，進行驗證，然後將預設模型設定為 `provider/model`。

正在尋找聊天頻道文件（WhatsApp/Telegram/Discord/Slack/Mattermost (外掛)/等。）？請參閱 [頻道](/en/channels)。

## 快速開始

1. 向供應商進行驗證（通常是透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 供應商文件

- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/en/providers/anthropic)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [DeepSeek](/en/providers/deepseek)
- [GitHub Copilot](/en/providers/github-copilot)
- [GLM models](/en/providers/glm)
- [Google (Gemini)](/en/providers/google)
- [Groq (LPU inference)](/en/providers/groq)
- [Hugging Face (Inference)](/en/providers/huggingface)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (unified gateway)](/en/providers/litellm)
- [MiniMax](/en/providers/minimax)
- [Mistral](/en/providers/mistral)
- [Model Studio (Alibaba Cloud)](/en/providers/modelstudio)
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (cloud + local models)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (web search)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen (OAuth)](/en/providers/qwen)
- [SGLang (local models)](/en/providers/sglang)
- [Synthetic](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice AI, privacy-focused)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [vLLM (本機模型)](/en/providers/vllm)
- [火山引擎 (豆包)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [小米](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 轉錄服務提供商

- [Deepgram (音訊轉錄)](/en/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - 用於 Claude 訂閱憑證的社群代理（使用前請確認 Anthropic 的政策/條款）

如需完整的服務商目錄（xAI、Groq、Mistral 等）及進階設定，
請參閱 [Model providers](/en/concepts/model-providers)。
