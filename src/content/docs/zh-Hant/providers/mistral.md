---
summary: "使用 OpenClaw 的 Mistral 模型和 Voxtral 轉錄"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支援 Mistral 進行文字/影像模型路由 (`mistral/...`) 以及透過媒體理解中的 Voxtral 進行音訊轉錄。
Mistral 也可用於記憶嵌入 (`memorySearch.provider = "mistral"`)。

- 提供者： `mistral`
- 驗證： `MISTRAL_API_KEY`
- API： Mistral Chat Completions (`https://api.mistral.ai/v1`)

## 快速入門

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [Mistral Console](https://console.mistral.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="執行入門設定">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或直接傳遞金鑰：

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="設定預設模型">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## 內建 LLM 目錄

OpenClaw 目前包含此捆綁的 Mistral 目錄：

| 模型參考                         | 輸入       | 內容    | 最大輸出 | 備註                                                        |
| -------------------------------- | ---------- | ------- | -------- | ----------------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文字、圖像 | 262,144 | 16,384   | 預設模型                                                    |
| `mistral/mistral-medium-2508`    | 文字、圖像 | 262,144 | 8,192    | Mistral Medium 3.1                                          |
| `mistral/mistral-small-latest`   | 文字、圖像 | 128,000 | 16,384   | Mistral Small 4；可透過 API 調整推理能力 `reasoning_effort` |
| `mistral/pixtral-large-latest`   | 文字、圖像 | 128,000 | 32,768   | Pixtral                                                     |
| `mistral/codestral-latest`       | 文字       | 256,000 | 4,096    | 編碼                                                        |
| `mistral/devstral-medium-latest` | 文字       | 262,144 | 32,768   | Devstral 2                                                  |
| `mistral/magistral-small`        | 文字       | 128,000 | 40,000   | 啟用推理                                                    |

## 音訊轉錄 (Voxtral)

透過媒體理解管線使用 Voxtral 進行批次音訊轉錄。

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

<Tip>媒體轉錄路徑使用 `/v1/audio/transcriptions`。Mistral 的預設音訊模型為 `voxtral-mini-latest`。</Tip>

## Voice Call 串流 STT

內建的 `mistral` 外掛將 Voxtral Realtime 註冊為 Voice Call
串流 STT 提供者。

| 設定     | 設定路徑                                                               | 預設值                                  |
| -------- | ---------------------------------------------------------------------- | --------------------------------------- |
| API 金鑰 | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 回退至 `MISTRAL_API_KEY`                |
| 模型     | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| 編碼     | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| 採樣率   | `...mistral.sampleRate`                                                | `8000`                                  |
| 目標延遲 | `...mistral.targetStreamingDelayMs`                                    | `800`                                   |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "mistral",
            providers: {
              mistral: {
                apiKey: "${MISTRAL_API_KEY}",
                targetStreamingDelayMs: 800,
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>OpenClaw 預設將 Mistral 即時 STT 設定為 8 kHz 的 `pcm_mulaw`，以便 Voice Call 可以直接轉發 Twilio 媒體幀。僅當您的上游串流已經是原始 PCM 時，才使用 `encoding: "pcm_s16le"` 和匹配的 `sampleRate`。</Note>

## 進階配置

<AccordionGroup>
  <Accordion title="可調整推理 (mistral-small-latest)">
    `mistral/mistral-small-latest` 對應至 Mistral Small 4，並透過 `reasoning_effort` 在 Chat Completions API 上支援 [可調整推理](https://docs.mistral.ai/capabilities/reasoning/adjustable) (`none` 可將輸出中的額外思考降至最低；`high` 會在最終答案前顯示完整的思考軌跡)。

    OpenClaw 將工作階段的 **thinking** 層級對應至 Mistral 的 API：

    | OpenClaw thinking 層級                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    其他捆綁的 Mistral 型錄模型不使用此參數。當您想要 Mistral 的原生推理優先行為時，請繼續使用 `magistral-*` 模型。
    </Note>

  </Accordion>

  <Accordion title="記憶嵌入">
    Mistral 可以透過 `/v1/embeddings` 提供記憶嵌入 (預設模型：`mistral-embed`)。

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="驗證與基礎 URL">
    - Mistral 驗證使用 `MISTRAL_API_KEY`。
    - 提供者基礎 URL 預設為 `https://api.mistral.ai/v1`。
    - 入門預設模型為 `mistral/mistral-large-latest`。
    - Z.AI 使用 Bearer 驗證搭配您的 API 金鑰。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參考和故障轉移行為。
  </Card>
  <Card title="媒體理解" href="/zh-Hant/nodes/media-understanding" icon="microphone">
    音訊轉錄設定和提供商選擇。
  </Card>
</CardGroup>
