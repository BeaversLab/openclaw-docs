---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "供應商目錄"
---

# 模型供應商

OpenClaw 可以使用許多 LLM 供應商。選擇一個供應商，進行驗證，然後將預設模型設定為 `provider/model`。

正在尋找聊天頻道文件（WhatsApp/Telegram/Discord/Slack/Mattermost (外掛)/etc.）？請參閱 [頻道](/zh-Hant/channels)。

## 快速開始

1. 向供應商進行驗證（通常是透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 供應商文件

- [Alibaba Model Studio](/zh-Hant/providers/alibaba)
- [Amazon Bedrock](/zh-Hant/providers/bedrock)
- [Anthropic (API + Claude CLI)](/zh-Hant/providers/anthropic)
- [Arcee AI (Trinity 模型)](/zh-Hant/providers/arcee)
- [BytePlus (國際版)](/zh-Hant/concepts/model-providers#byteplus-international)
- [Chutes](/zh-Hant/providers/chutes)
- [ComfyUI](/zh-Hant/providers/comfy)
- [Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
- [DeepSeek](/zh-Hant/providers/deepseek)
- [fal](/zh-Hant/providers/fal)
- [Fireworks](/zh-Hant/providers/fireworks)
- [GitHub Copilot](/zh-Hant/providers/github-copilot)
- [GLM 模型](/zh-Hant/providers/glm)
- [Google (Gemini)](/zh-Hant/providers/google)
- [Groq (LPU 推理)](/zh-Hant/providers/groq)
- [Hugging Face (推理)](/zh-Hant/providers/huggingface)
- [inferrs (本地模型)](/zh-Hant/providers/inferrs)
- [Kilocode](/zh-Hant/providers/kilocode)
- [LiteLLM (統一閘道)](/zh-Hant/providers/litellm)
- [LM Studio (本地模型)](/zh-Hant/providers/lmstudio)
- [MiniMax](/zh-Hant/providers/minimax)
- [Mistral](/zh-Hant/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
- [NVIDIA](/zh-Hant/providers/nvidia)
- [Ollama (雲端 + 本地模型)](/zh-Hant/providers/ollama)
- [OpenAI (API + Codex)](/zh-Hant/providers/openai)
- [OpenCode](/zh-Hant/providers/opencode)
- [OpenCode Go](/zh-Hant/providers/opencode-go)
- [OpenRouter](/zh-Hant/providers/openrouter)
- [Perplexity (網路搜尋)](/zh-Hant/providers/perplexity-provider)
- [Qianfan](/zh-Hant/providers/qianfan)
- [Qwen Cloud](/zh-Hant/providers/qwen)
- [Runway](/zh-Hant/providers/runway)
- [SGLang (本地模型)](/zh-Hant/providers/sglang)
- [StepFun](/zh-Hant/providers/stepfun)
- [Synthetic](/zh-Hant/providers/synthetic)
- [Together AI](/zh-Hant/providers/together)
- [Venice (Venice AI，注重隱私)](/zh-Hant/providers/venice)
- [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
- [Vydra](/zh-Hant/providers/vydra)
- [vLLM (本地模型)](/zh-Hant/providers/vllm)
- [Volcengine (Doubao)](/zh-Hant/providers/volcengine)
- [xAI](/zh-Hant/providers/xai)
- [Xiaomi](/zh-Hant/providers/xiaomi)
- [Z.AI](/zh-Hant/providers/zai)

## 共享概覽頁面

- [額外的附帶變體](/zh-Hant/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [圖像生成](/zh-Hant/tools/image-generation) - 共享的 `image_generate` 工具、提供者選擇和故障轉移
- [音樂生成](/zh-Hant/tools/music-generation) - 共享的 `music_generate` 工具、提供者選擇和故障轉移
- [影片生成](/zh-Hant/tools/video-generation) - 共享的 `video_generate` 工具、提供者選擇和故障轉移

## 轉錄提供者

- [Deepgram (音訊轉錄)](/zh-Hant/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/zh-Hant/providers/claude-max-api-proxy) - Claude 訂閱憑證的社群代理（使用前請驗證 Anthropic 政策/條款）

如需完整的提供商目录（xAI、Groq、Mistral 等）及高级配置，請參閱 [Model providers](/zh-Hant/concepts/model-providers)。
