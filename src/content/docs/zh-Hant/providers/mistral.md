---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 轉錄"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支援 Mistral，可用於文字/圖像模型路由 (`mistral/...`) 以及媒體理解中透過 Voxtral 進行的音訊轉錄。
Mistral 也可以用於記憶嵌入 (`memorySearch.provider = "mistral"`)。

## CLI 設定

```exec
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## 設定片段 (LLM 提供者)

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## 設定片段 (使用 Voxtral 進行音訊轉錄)

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

## 備註

- Mistral 驗證使用 `MISTRAL_API_KEY`。
- 提供者基礎 URL 預設為 `https://api.mistral.ai/v1`。
- 入門預設模型為 `mistral/mistral-large-latest`。
- Mistral 的媒體理解預設音訊模型為 `voxtral-mini-latest`。
- 媒體轉錄路徑使用 `/v1/audio/transcriptions`。
- 記憶嵌入路徑使用 `/v1/embeddings`（預設模型：`mistral-embed`）。
