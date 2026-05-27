---
summary: "OpenClaw 支援的模型供應商 (LLMs)"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "提供者目錄"
---

OpenClaw 可以使用許多 LLM 提供商。選擇一個提供商，進行驗證，然後將預設模型設為 `provider/model`。

正在尋找聊天頻道文件（WhatsApp/Telegram/Discord/Slack/Mattermost (外掛)/etc.）？請參閱 [頻道](/zh-Hant/channels)。

## 快速開始

1. 向提供商進行驗證（通常透過 `openclaw onboard`）。
2. 設定預設模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文件

- [Alibaba Model Studio](/zh-Hant/providers/alibaba)
- [Amazon Bedrock](/zh-Hant/providers/bedrock)
- [Amazon Bedrock Mantle](/zh-Hant/providers/bedrock-mantle)
- [Anthropic (API + Claude CLI)](/zh-Hant/providers/anthropic)
- [Arcee AI (Trinity models)](/zh-Hant/providers/arcee)
- [Azure Speech](/zh-Hant/providers/azure-speech)
- [BytePlus (International)](/zh-Hant/concepts/model-providers#byteplus-international)
- [Cerebras](/zh-Hant/providers/cerebras)
- [Chutes](/zh-Hant/providers/chutes)
- [Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
- [ComfyUI](/zh-Hant/providers/comfy)
- [DeepSeek](/zh-Hant/providers/deepseek)
- [ds4 (本機 DeepSeek V4)](/zh-Hant/providers/ds4)
- [ElevenLabs](/zh-Hant/providers/elevenlabs)
- [fal](/zh-Hant/providers/fal)
- [Fireworks](/zh-Hant/providers/fireworks)
- [GitHub Copilot](/zh-Hant/providers/github-copilot)
- [Google (Gemini)](/zh-Hant/providers/google)
- [Gradium](/zh-Hant/providers/gradium)
- [Groq (LPU inference)](/zh-Hant/providers/groq)
- [Hugging Face (Inference)](/zh-Hant/providers/huggingface)
- [inferrs (local models)](/zh-Hant/providers/inferrs)
- [Kilocode](/zh-Hant/providers/kilocode)
- [LiteLLM (unified gateway)](/zh-Hant/providers/litellm)
- [LM Studio (local models)](/zh-Hant/providers/lmstudio)
- [MiniMax](/zh-Hant/providers/minimax)
- [Mistral](/zh-Hant/providers/mistral)
- [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
- [NVIDIA](/zh-Hant/providers/nvidia)
- [Ollama (cloud + local models)](/zh-Hant/providers/ollama)
- [OpenAI (API + Codex)](/zh-Hant/providers/openai)
- [OpenCode](/zh-Hant/providers/opencode)
- [OpenCode Go](/zh-Hant/providers/opencode-go)
- [OpenRouter](/zh-Hant/providers/openrouter)
- [Perplexity (web search)](/zh-Hant/providers/perplexity-provider)
- [Qianfan](/zh-Hant/providers/qianfan)
- [Qwen Cloud](/zh-Hant/providers/qwen)
- [Runway](/zh-Hant/providers/runway)
- [SenseAudio](/zh-Hant/providers/senseaudio)
- [SGLang (local models)](/zh-Hant/providers/sglang)
- [StepFun](/zh-Hant/providers/stepfun)
- [Synthetic](/zh-Hant/providers/synthetic)
- [Tencent Cloud (TokenHub)](/zh-Hant/providers/tencent)
- [Together AI](/zh-Hant/providers/together)
- [Venice (Venice AI, privacy-focused)](/zh-Hant/providers/venice)
- [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
- [vLLM (local models)](/zh-Hant/providers/vllm)
- [Volcengine (Doubao)](/zh-Hant/providers/volcengine)
- [Vydra](/zh-Hant/providers/vydra)
- [xAI](/zh-Hant/providers/xai)
- [Xiaomi](/zh-Hant/providers/xiaomi)
- [Z.AI (GLM)](/zh-Hant/providers/zai)

## 共享概覽頁面

- [Additional bundled variants](/zh-Hant/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [Image Generation](/zh-Hant/tools/image-generation) - 共用 `image_generate` 工具、供應商選擇和故障轉移
- [音樂生成](/zh-Hant/tools/music-generation) - 共用 `music_generate` 工具、供應商選擇與故障轉移
- [影片生成](/zh-Hant/tools/video-generation) - 共用 `video_generate` 工具、供應商選擇與故障轉移

## 轉錄供應商

- [Deepgram (音訊轉錄)](/zh-Hant/providers/deepgram)
- [ElevenLabs](/zh-Hant/providers/elevenlabs#speech-to-text)
- [Mistral](/zh-Hant/providers/mistral#audio-transcription-voxtral)
- [OpenAI](/zh-Hant/providers/openai#speech-to-text)
- [SenseAudio](/zh-Hant/providers/senseaudio)
- [xAI](/zh-Hant/providers/xai#speech-to-text)

## 社群工具

- [Claude Max API Proxy](/zh-Hant/providers/claude-max-api-proxy) - Claude 訂閱憑證的社群代理（使用前請先確認 Anthropic 的政策/條款）

如需完整的供應商目錄（xAI、Groq、Mistral 等）及進階設定，
請參閱 [Model providers](/zh-Hant/concepts/model-providers)。
