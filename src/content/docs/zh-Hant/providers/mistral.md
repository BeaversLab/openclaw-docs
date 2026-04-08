---
summary: "使用 Mistral 模型與 Voxtral 轉錄功能搭配 OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支援 Mistral 用於文字/影像模型路由 (`mistral/...`) 以及媒體理解中透過 Voxtral 進行的音訊轉錄。
Mistral 也可以用於記憶嵌入 (`memorySearch.provider = "mistral"`)。

## CLI 設定

```bash
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

## 內建 LLM 目錄

OpenClaw 目前隨附此捆綁的 Mistral 目錄：

| 模型參照                         | 輸入       | 上下文  | 最大輸出 | 備註               |
| -------------------------------- | ---------- | ------- | -------- | ------------------ |
| `mistral/mistral-large-latest`   | 文字、圖像 | 262,144 | 16,384   | 預設模型           |
| `mistral/mistral-medium-2508`    | 文字、圖像 | 262,144 | 8,192    | Mistral Medium 3.1 |
| `mistral/mistral-small-latest`   | 文字、圖像 | 128,000 | 16,384   | 較小的多模態模型   |
| `mistral/pixtral-large-latest`   | 文字、圖像 | 128,000 | 32,768   | Pixtral            |
| `mistral/codestral-latest`       | 文字       | 256,000 | 4,096    | 程式碼撰寫         |
| `mistral/devstral-medium-latest` | 文字       | 262,144 | 32,768   | Devstral 2         |
| `mistral/magistral-small`        | 文字       | 128,000 | 40,000   | 具備推理能力       |

## 配置片段 (使用 Voxtral 進行音訊轉錄)

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
- 記憶嵌入路徑使用 `/v1/embeddings` (預設模型：`mistral-embed`)。
