---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 转录"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支持通过 Mistral 进行文本/图像模型路由 (`mistral/...`)，并在媒体理解中通过 Voxtral 进行音频转录。
Mistral 也可用于记忆嵌入 (`memorySearch.provider = "mistral"`)。

## CLI 设置

```bash
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## 配置代码片段 (LLM 提供商)

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## 配置代码片段 (使用 Voxtral 进行音频转录)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

## 备注

- Mistral 认证使用 `MISTRAL_API_KEY`。
- 提供商基础 URL 默认为 `https://api.mistral.ai/v1`。
- 入门默认模型为 `mistral/mistral-large-latest`。
- Mistral 的媒体理解默认音频模型为 `voxtral-mini-latest`。
- 媒体转录路径使用 `/v1/audio/transcriptions`。
- 记忆嵌入路径使用 `/v1/embeddings` (默认模型: `mistral-embed`)。

import zh from '/components/footer/zh.mdx';

<zh />
