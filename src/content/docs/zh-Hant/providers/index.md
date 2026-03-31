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
- [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
- [NVIDIA](/en/providers/nvidia)
- [Ollama (雲端 + 本地模型)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (網路搜尋)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen / Model Studio (阿里雲)](/en/providers/qwen_modelstudio)
- [SGLang (本地模型)](/en/providers/sglang)
- [Synthetic](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice AI, 注重隱私)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [vLLM (本機模型)](/en/providers/vllm)
- [Volcengine (豆包)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [小米](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 轉錄服務商

- [Deepgram (音訊轉錄)](/en/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - 適用於 Claude 訂閱憑證的社群代理（使用前請確認 Anthropic 政策/條款）

如需完整的服務商目錄（xAI、Groq、Mistral 等）及進階配置，
請參閱 [Model providers](/en/concepts/model-providers)。
