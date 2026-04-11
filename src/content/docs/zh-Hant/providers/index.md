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
- [Arcee AI (Trinity 模型)](/en/providers/arcee)
- [BytePlus (國際版)](/en/concepts/model-providers#byteplus-international)
- [Chutes](/en/providers/chutes)
- [ComfyUI](/en/providers/comfy)
- [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
- [DeepSeek](/en/providers/deepseek)
- [fal](/en/providers/fal)
- [Fireworks](/en/providers/fireworks)
- [GitHub Copilot](/en/providers/github-copilot)
- [GLM 模型](/en/providers/glm)
- [Google (Gemini)](/en/providers/google)
- [Groq (LPU 推理)](/en/providers/groq)
- [Hugging Face (推理)](/en/providers/huggingface)
- [inferrs (本地模型)](/en/providers/inferrs)
- [Kilocode](/en/providers/kilocode)
- [LiteLLM (統一閘道)](/en/providers/litellm)
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
- [Qwen Cloud](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [SGLang (本地模型)](/en/providers/sglang)
- [StepFun](/en/providers/stepfun)
- [Synthetic](/en/providers/synthetic)
- [Together AI](/en/providers/together)
- [Venice (Venice AI，注重隱私)](/en/providers/venice)
- [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
- [Vydra](/en/providers/vydra)
- [vLLM (本地模型)](/en/providers/vllm)
- [Volcengine (Doubao)](/en/providers/volcengine)
- [xAI](/en/providers/xai)
- [Xiaomi](/en/providers/xiaomi)
- [Z.AI](/en/providers/zai)

## 共用的概覽頁面

- [其他內建變體](/en/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [圖像生成](/en/tools/image-generation) - 共用的 `image_generate` 工具、提供者選擇和故障轉移
- [音樂生成](/en/tools/music-generation) - 共用的 `music_generate` 工具、提供者選擇和故障轉移
- [影片生成](/en/tools/video-generation) - 共用的 `video_generate` 工具、提供者選擇和故障轉移

## 轉錄提供者

- [Deepgram (音訊轉錄)](/en/providers/deepgram)

## 社群工具

- [Claude Max API Proxy](/en/providers/claude-max-api-proxy) - Claude 訂閱憑證的社群 Proxy (使用前請驗證 Anthropic 政策/條款)

若要查看完整的提供者目錄 (xAI、Groq、Mistral 等) 和進階配置，
請參閱 [Model providers](/en/concepts/model-providers)。
