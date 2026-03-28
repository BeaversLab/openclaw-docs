---
summary: "OpenClaw 支援的模型供應商 (LLM)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "供應商目錄"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個供應商，進行驗證，然後將預設模型設定為 `provider/model`。

正在尋找聊天頻道文件（WhatsApp/Telegram/Discord/Slack/Mattermost (外掛程式) 等）？請參閱 [頻道](/zh-Hant/channels)。

## 快速開始

1. 向供應商進行驗證（通常透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 供應商文件

- [Amazon Bedrock](/zh-Hant/providers/bedrock)
- [Anthropic (API + Claude Code CLI)](/zh-Hant/providers/anthropic)
- [Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
- [GLM 模型](/zh-Hant/providers/glm)
- [Google (Gemini)](/zh-Hant/providers/google)
- [Groq (LPU inference)](/zh-Hant/providers/groq)
- [Hugging Face (Inference)](/zh-Hant/providers/huggingface)
- [Kilocode](/zh-Hant/providers/kilocode)
- [LiteLLM (unified gateway)](/zh-Hant/providers/litellm)
- [MiniMax](/zh-Hant/providers/minimax)
- [Mistral](/zh-Hant/providers/mistral)
- [Model Studio (Alibaba Cloud)](/zh-Hant/providers/modelstudio)
- [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
- [NVIDIA](/zh-Hant/providers/nvidia)
- [Ollama (cloud + local models)](/zh-Hant/providers/ollama)
- [OpenAI (API + Codex)](/zh-Hant/providers/openai)
- [OpenCode (Zen + Go)](/zh-Hant/providers/opencode)
- [OpenRouter](/zh-Hant/providers/openrouter)
- [Perplexity (web search)](/zh-Hant/providers/perplexity-provider)
- [Qianfan](/zh-Hant/providers/qianfan)
- [Qwen (OAuth)](/zh-Hant/providers/qwen)
- [SGLang (本機模型)](/zh-Hant/providers/sglang)
- [Together AI](/zh-Hant/providers/together)
- [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
- [Venice (Venice AI，注重隱私)](/zh-Hant/providers/venice)
- [vLLM (本機模型)](/zh-Hant/providers/vllm)
- [Volcengine (Doubao)](/zh-Hant/providers/volcengine)
- [xAI](/zh-Hant/providers/xai)
- [Xiaomi](/zh-Hant/providers/xiaomi)
- [Z.AI](/zh-Hant/providers/zai)

## 轉錄供應商

- [Deepgram (音訊轉錄)](/zh-Hant/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/zh-Hant/providers/claude-max-api-proxy) - Claude 訂閱憑證的社群代理（使用前請確認 Anthropic 的政策/條款）

如需完整的提供者目錄（xAI、Groq、Mistral 等）及進階設定，
請參閱 [Model providers](/zh-Hant/concepts/model-providers)。
