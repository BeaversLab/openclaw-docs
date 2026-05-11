---
summary: "使用 OpenClaw 的 Mistral 模型和 Voxtral 轉錄"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

OpenClaw 支援 Mistral，用於文字/影像模型路由 (`mistral/...`) 以及
媒體理解中透過 Voxtral 進行的音訊轉錄。
Mistral 也可用於記憶嵌入 (`memorySearch.provider = "mistral"`)。

- 提供者： `mistral`
- 驗證： `MISTRAL_API_KEY`
- API：Mistral Chat Completions (`https://api.mistral.ai/v1`)

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [Mistral Console](https://console.mistral.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="執行上手引導">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或直接傳入金鑰：

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

OpenClaw 目前隨附此捆綁的 Mistral 目錄：

| 模型參照                         | 輸入       | 內容    | 最大輸出 | 備註                                                    |
| -------------------------------- | ---------- | ------- | -------- | ------------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文字、影像 | 262,144 | 16,384   | 預設模型                                                |
| `mistral/mistral-medium-2508`    | 文字、影像 | 262,144 | 8,192    | Mistral Medium 3.1                                      |
| `mistral/mistral-small-latest`   | 文字、影像 | 128,000 | 16,384   | Mistral Small 4；可透過 API `reasoning_effort` 調整推理 |
| `mistral/pixtral-large-latest`   | 文字、影像 | 128,000 | 32,768   | Pixtral                                                 |
| `mistral/codestral-latest`       | 文字       | 256,000 | 4,096    | 撰寫程式                                                |
| `mistral/devstral-medium-latest` | 文字       | 262,144 | 32,768   | Devstral 2                                              |
| `mistral/magistral-small`        | 文字       | 128,000 | 40,000   | 啟用推理                                                |

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

## 通話串流 STT

隨附的 `mistral` 外掛程式會將 Voxtral Realtime 註冊為通話
串流 STT 提供者。

| 設定     | 設定路徑                                                               | 預設值                                  |
| -------- | ---------------------------------------------------------------------- | --------------------------------------- |
| API 金鑰 | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 退回到 `MISTRAL_API_KEY`                |
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

<Note>OpenClaw 預設將 Mistral 即時 STT 設定為 8 kHz 的 `pcm_mulaw`，以便語音通話能直接轉發 Twilio 媒體幀。僅當您的上游串流已是原始 PCM 時，才使用 `encoding: "pcm_s16le"` 和相符的 `sampleRate`。</Note>

## 進階組態

<AccordionGroup>
  <Accordion title="可調整推理 (mistral-small-latest)">
    `mistral/mistral-small-latest` 對應至 Mistral Small 4，並透過 `reasoning_effort` 在聊天完成 API 上支援[可調整推理](https://docs.mistral.ai/capabilities/reasoning/adjustable)（`none` 會最小化輸出中的額外思考；`high` 會在最終答案之前顯示完整的思考過程）。

    OpenClaw 將工作階段 **thinking** 等級對應至 Mistral 的 API：

    | OpenClaw thinking 等級                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    其他內建的 Mistral 目錄模型不使用此參數。當您想要 Mistral 原生的推理優先行為時，請繼續使用 `magistral-*` 模型。
    </Note>

  </Accordion>

  <Accordion title="記憶嵌入">
    Mistral 可透過 `/v1/embeddings` 提供記憶嵌入（預設模型：`mistral-embed`）。

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="Auth and base URL">
    - Mistral 驗證使用 `MISTRAL_API_KEY`。
    - 提供者基礎 URL 預設為 `https://api.mistral.ai/v1`。
    - 入門預設模型為 `mistral/mistral-large-latest`。
    - Z.AI 使用 Bearer 驗證搭配您的 API 金鑰。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參考和故障轉移行為。
  </Card>
  <Card title="Media understanding" href="/zh-Hant/nodes/media-understanding" icon="microphone">
    音訊轉錄設定與提供者選擇。
  </Card>
</CardGroup>
