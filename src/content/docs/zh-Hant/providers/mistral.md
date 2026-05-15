---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 轉錄"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

OpenClaw 包含一個內建的 Mistral 外掛，註冊了四種合約：聊天補全、媒體理解 (Voxtral 批次轉錄)、語音通話即時語音轉文字 (Voxtral Realtime)，以及記憶嵌入 (`mistral-embed`)。

| 屬性          | 值                                      |
| ------------- | --------------------------------------- |
| 提供者 ID     | `mistral`                               |
| 外掛          | 內建，`enabledByDefault: true`          |
| 認證環境變數  | `MISTRAL_API_KEY`                       |
| 入門標誌      | `--auth-choice mistral-api-key`         |
| 直接 CLI 標誌 | `--mistral-api-key <key>`               |
| API           | OpenAI 相容 (`openai-completions`)      |
| 基礎 URL      | `https://api.mistral.ai/v1`             |
| 預設模型      | `mistral/mistral-large-latest`          |
| 嵌入模型      | `mistral-embed`                         |
| Voxtral 批次  | `voxtral-mini-latest` (音訊轉錄)        |
| Voxtral 即時  | `voxtral-mini-transcribe-realtime-2602` |

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [Mistral Console](https://console.mistral.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="執行入門設定">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或者直接傳遞金鑰：

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
  <Step title="驗證模型可用">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## 內建 LLM 目錄

[Mistral Medium 3.5](https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04)
是目前內建目錄中的混合 Medium 模型：128B 密集權重、
文字和圖片輸入、256K 上下文、函式呼叫、結構化輸出、編碼，
以及透過聊天補全 API 進行可調整的推理。當您想要使用 Mistral
較新的統一代理/編碼模型，而不是預設的 `mistral/mistral-large-latest` 時，請使用
`mistral/mistral-medium-3-5`。

OpenClaw 目前提供此內建的 Mistral 目錄：

| 模型參照                         | 輸入       | 上下文  | 最大輸出 | 備註                                                    |
| -------------------------------- | ---------- | ------- | -------- | ------------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文字、圖片 | 262,144 | 16,384   | 預設模型                                                |
| `mistral/mistral-medium-2508`    | 文字、圖片 | 262,144 | 8,192    | Mistral Medium 3.1                                      |
| `mistral/mistral-medium-3-5`     | 文字、圖片 | 262,144 | 8,192    | Mistral Medium 3.5；可調整推理                          |
| `mistral/mistral-small-latest`   | 文字、圖片 | 128,000 | 16,384   | Mistral Small 4；可透過 API `reasoning_effort` 調整推理 |
| `mistral/pixtral-large-latest`   | 文字、圖片 | 128,000 | 32,768   | Pixtral                                                 |
| `mistral/codestral-latest`       | 文字       | 256,000 | 4,096    | 編碼                                                    |
| `mistral/devstral-medium-latest` | 文字       | 262,144 | 32,768   | Devstral 2                                              |
| `mistral/magistral-small`        | 文字       | 128,000 | 40,000   | 啟用推理                                                |

完成上線後，在不啟動 Gateway 的情況下對 Medium 3.5 進行冒煙測試：

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "Reply with exactly: mistral-ok" \
  --json
```

若要在變更設定前瀏覽內建的目錄列：

```bash
openclaw models list --all --provider mistral --plain
```

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

<Tip>媒體轉錄路徑使用 `/v1/audio/transcriptions`。Mistral 的預設音訊模型是 `voxtral-mini-latest`。</Tip>

## 語音通話串流 STT

內建的 `mistral` 外掛將 Voxtral Realtime 註冊為語音通話串流 STT 提供者。

| 設定     | Config 路徑                                                            | 預設值                                  |
| -------- | ---------------------------------------------------------------------- | --------------------------------------- |
| API 金鑰 | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 回退至 `MISTRAL_API_KEY`                |
| 模型     | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| 編碼     | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| 取樣率   | `...mistral.sampleRate`                                                | `8000`                                  |
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

<Note>OpenClaw 預設將 Mistral 即時 STT 設定為 8 kHz 的 `pcm_mulaw`，以便 Voice Call can 直接轉發 Twilio 媒體幀。僅當您的上游串流已經是原始 PCM 時，才使用 `encoding: "pcm_s16le"` 和 相符的 `sampleRate`。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="可調整推理">
    `mistral/mistral-small-latest` (Mistral Small 4) 和 `mistral/mistral-medium-3-5` 支援透過 `reasoning_effort` 在 Chat Completions API 上使用 [可調整推理](https://docs.mistral.ai/studio-api/conversations/reasoning/adjustable) (`none` 最大限度減少輸出中的額外思考；`high` 在最終答案之前顯示完整的思考軌跡)。Mistral 建議將 `reasoning_effort="high"` 用於 Medium 3.5 智慧體和程式碼使用案例。

    OpenClaw 將會話 **thinking** 等級對應到 Mistral 的 API：

    | OpenClaw thinking 等級                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Warning>
    請勿將 Medium 3.5 推理模式與 `temperature: 0` 搭配使用。Mistral
    HTTP API 會拒絕 `reasoning_effort="high"` 加上 `temperature: 0` 並傳回 400
    回應。請讓保持未設定，以便 Mistral 使用其預設值，或是依照
    [Medium 3.5 建議設定](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)
    並使用 `temperature: 0.7` 進行高階推理。若要確定性直接
    答案，請將思考關閉/設為最小，以便 OpenClaw 在您降低
    之前發送
    `reasoning_effort: "none"`。
    </Warning>

    用於 Medium 3.5 推理的模型範圍設定範例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "mistral/mistral-medium-3-5" },
          models: {
            "mistral/mistral-medium-3-5": {
              params: { thinking: "high" },
            },
          },
        },
      },
    }
    ```

    <Note>
    其他內建的 Mistral 型錄模型不使用此參數。當您想要 Mistral 原生的推理優先行為時，請繼續使用 `magistral-*` 模型。
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

  <Accordion title="Auth and base URL">
    - Mistral 驗證使用 `MISTRAL_API_KEY` (Bearer 標頭)。
    - 提供者基礎 URL 預設為 `https://api.mistral.ai/v1`，並接受標準的 OpenAI 相容聊天完成請求格式。
    - 上架預設模型為 `mistral/mistral-large-latest`。
    - 僅當 Mistral 明確發佈您需要的區域端點時，才在 `models.providers.mistral.baseUrl` 下覆蓋基礎 URL。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Media understanding" href="/zh-Hant/nodes/media-understanding" icon="microphone">
    音訊轉錄設定和提供者選擇。
  </Card>
</CardGroup>
