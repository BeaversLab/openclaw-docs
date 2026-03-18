---
summary: "Use Mistral models and Voxtral transcription with OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支援 Mistral 用於文字/圖像模型路由 (`mistral/...`) 以及
透過 Voxtral 進行媒體理解中的音訊轉錄。
Mistral 也可以用於記憶嵌入 (`memorySearch.provider = "mistral"`)。

## CLI 設定

```bash
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## Config snippet (LLM provider)

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## Config snippet (audio transcription with Voxtral)

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

## 注意事項

- Mistral 驗證使用 `MISTRAL_API_KEY`。
- 提供者基礎 URL 預設為 `https://api.mistral.ai/v1`。
- Onboarding 預設模型為 `mistral/mistral-large-latest`。
- Mistral 的媒體理解預設音訊模型為 `voxtral-mini-latest`。
- 媒體轉錄路徑使用 `/v1/audio/transcriptions`。
- 記憶嵌入路徑使用 `/v1/embeddings` (預設模型：`mistral-embed`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
