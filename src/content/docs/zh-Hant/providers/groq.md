---
title: "Groq"
summary: "Groq 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) 使用自訂的 LPU 硬體，在開源模型（Llama、Gemma、Mistral 等）上提供超快推理。OpenClaw 透過其相容 OpenAI 的 API 連接到 Groq。

- 提供者： `groq`
- 驗證： `GROQ_API_KEY`
- API：相容 OpenAI

## 快速入門

1. 從 [console.groq.com/keys](https://console.groq.com/keys) 取得 API 金鑰。

2. 設定 API 金鑰：

```bash
export GROQ_API_KEY="gsk_..."
```

3. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 設定檔範例

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 音訊轉錄

Groq 也提供快速的 Whisper 音訊轉錄。當設定為媒體理解提供者時，OpenClaw 會使用 Groq 的 `whisper-large-v3-turbo` 模型來轉錄語音訊息。

```json5
{
  media: {
    understanding: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

## 環境注意事項

如果 Gateway 作為守護程序（launchd/systemd）運行，請確保 `GROQ_API_KEY` 對該程序可用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

## 可用模型

Groq 的模型目錄經常變更。執行 `openclaw models list | grep groq` 以查看目前可用的模型，或查看 [console.groq.com/docs/models](https://console.groq.com/docs/models)。

熱門選擇包括：

- **Llama 3.3 70B Versatile** - 通用用途，大語境
- **Llama 3.1 8B Instant** - 快速、輕量
- **Gemma 2 9B** - 緊湊、高效
- **Mixtral 8x7B** - MoE 架構，強大的推理能力

## 連結

- [Groq Console](https://console.groq.com)
- [API 文件](https://console.groq.com/docs)
- [模型列表](https://console.groq.com/docs/models)
- [定價](https://groq.com/pricing)
