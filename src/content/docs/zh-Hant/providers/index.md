---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "供應商目錄"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個供應商，進行驗證，然後將預設模型設定為 `provider/model`。

正在尋找聊天頻道文件（WhatsApp/Telegram/Discord/Slack/Mattermost (外掛)/etc.）？請參閱 [頻道](/en/channels)。

## 快速開始

1. 向供應商進行驗證（通常是透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 供應商文件

- [Alibaba Model Studio](/en/providers/alibaba)
- [Amazon Bedrock](/en/providers/bedrock)
- [Anthropic (API + Claude CLI)](/en/providers/anthropic)
- [BytePlus (International)](/en/concepts/model-providers#byteplus-international)
- [Chutes](/en/providers/chutes)
- [ComfyUI](/en/providers/comfy)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [DeepSeek](/en/providers/deepseek)
- [fal](/en/providers/fal)
- [Fireworks](/en/providers/fireworks)
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
- [Ollama (cloud + local models)](/en/providers/ollama)
- [OpenAI (API + Codex)](/en/providers/openai)
- [OpenCode](/en/providers/opencode)
- [OpenCode Go](/en/providers/opencode-go)
- [OpenRouter](/en/providers/openrouter)
- [Perplexity (web search)](/en/providers/perplexity-provider)
- [Qianfan](/en/providers/qianfan)
- [Qwen Cloud](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [SGLang (local models)](/en/providers/sglang)
- [StepFun](/en/providers/stepfun)
- [Synthetic](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice AI, privacy-focused)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Vydra](/en/providers/vydra)
- [vLLM (local models)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 共享概覽頁面

- [Additional bundled variants](/en/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [Image Generation](/en/tools/image-generation) - 共享 `image_generate` 工具、提供者選擇和故障轉移
- [Music Generation](/en/tools/music-generation) - 共享 `music_generate` 工具、提供者選擇和故障轉移
- [Video Generation](/en/tools/video-generation) - 共享 `video_generate` 工具、提供者選擇和故障轉移

## 轉錄提供者

- [Deepgram (audio transcription)](/en/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - 用於 Claude 訂閱憑證的社群代理（使用前請確認 Anthropic 政策/條款）

如需完整的提供者目錄（xAI、Groq、Mistral 等）和進階設定，
請參閱 [Model providers](/en/concepts/model-providers)。
