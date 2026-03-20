---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - 您想要選擇一個模型供應商
  - 您需要快速了解支援的 LLM 後端
title: "供應商目錄"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個供應商，進行驗證，然後將
預設模型設定為 `provider/model`。

正在尋找聊天頻道文件 (WhatsApp/Telegram/Discord/Slack/Mattermost (外掛)/etc.)？請參閱 [頻道](/zh-Hant/channels)。

## 快速開始

1. 與供應商進行驗證 (通常透過 `openclaw onboard`)。
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
- [Hugging Face (推論)](/zh-Hant/providers/huggingface)
- [Kilocode](/zh-Hant/providers/kilocode)
- [LiteLLM (統一閘道)](/zh-Hant/providers/litellm)
- [MiniMax](/zh-Hant/providers/minimax)
- [Mistral](/zh-Hant/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
- [NVIDIA](/zh-Hant/providers/nvidia)
- [Ollama (雲端 + 本機模型)](/zh-Hant/providers/ollama)
- [OpenAI (API + Codex)](/zh-Hant/providers/openai)
- [OpenCode (Zen + Go)](/zh-Hant/providers/opencode)
- [OpenRouter](/zh-Hant/providers/openrouter)
- [Qianfan](/zh-Hant/providers/qianfan)
- [Qwen (OAuth)](/zh-Hant/providers/qwen)
- [Together AI](/zh-Hant/providers/together)
- [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
- [Venice (Venice AI, 注重隱私)](/zh-Hant/providers/venice)
- [vLLM (本機模型)](/zh-Hant/providers/vllm)
- [xAI](/zh-Hant/providers/xai)
- [Xiaomi](/zh-Hant/providers/xiaomi)
- [Z.AI](/zh-Hant/providers/zai)

## 轉錄供應商

- [Deepgram (音訊轉錄)](/zh-Hant/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/zh-Hant/providers/claude-max-api-proxy) - Claude 訂閱憑證的社群代理 (使用前請驗證 Anthropic 的政策/條款)

如需查看完整的提供商目錄（xAI、Groq、Mistral 等）及進階設定，
請參閱 [Model providers](/zh-Hant/concepts/model-providers)。

import en from "/components/footer/en.mdx";

<en />
