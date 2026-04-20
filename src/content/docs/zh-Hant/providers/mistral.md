---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 轉錄"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支援 Mistral 進行文字/圖像模型路由 (`mistral/...`) 以及
透過媒體理解中的 Voxtral 進行音訊轉錄。
Mistral 也可用於記憶嵌入 (`memorySearch.provider = "mistral"`)。

- 提供商： `mistral`
- 驗證： `MISTRAL_API_KEY`
- API： Mistral 聊天完成 (`https://api.mistral.ai/v1`)

## 快速入門

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [Mistral Console](https://console.mistral.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="執行入門引導">
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

| 模型參考                         | 輸入       | 內容    | 最大輸出 | 備註                                                    |
| -------------------------------- | ---------- | ------- | -------- | ------------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文字、圖像 | 262,144 | 16,384   | 預設模型                                                |
| `mistral/mistral-medium-2508`    | 文字、圖像 | 262,144 | 8,192    | Mistral Medium 3.1                                      |
| `mistral/mistral-small-latest`   | 文字、圖像 | 128,000 | 16,384   | Mistral Small 4；可透過 API 調整推理 `reasoning_effort` |
| `mistral/pixtral-large-latest`   | 文字、圖像 | 128,000 | 32,768   | Pixtral                                                 |
| `mistral/codestral-latest`       | 文字       | 256,000 | 4,096    | 編碼                                                    |
| `mistral/devstral-medium-latest` | 文字       | 262,144 | 32,768   | Devstral 2                                              |
| `mistral/magistral-small`        | 文字       | 128,000 | 40,000   | 啟用推理                                                |

## 音訊轉錄 (Voxtral)

透過媒體理解管線使用 Voxtral 進行音訊轉錄。

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

<Tip>媒體轉錄路徑使用 `/v1/audio/transcriptions`。 Mistral 的預設音訊模型為 `voxtral-mini-latest`。</Tip>

## 進階設定

<AccordionGroup>
  <Accordion title="可調整推理 (mistral-small-latest)">
    `mistral/mistral-small-latest` 對應至 Mistral Small 4，並透過 `reasoning_effort` 在 Chat Completions API 上支援[可調整推理](https://docs.mistral.ai/capabilities/reasoning/adjustable) (`none` 將輸出中的額外思考減至最少；`high` 會在最終答案前顯示完整的思考過程)。

    OpenClaw 將工作階段 **thinking** 層級對應至 Mistral 的 API：

    | OpenClaw thinking 層級                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** | `high`             |

    <Note>
    其他打包的 Mistral 目錄模型不使用此參數。當您想要 Mistral 的原生推理優先行為時，請繼續使用 `magistral-*` 模型。
    </Note>

  </Accordion>

  <Accordion title="記憶嵌入">
    Mistral 可以透過 `/v1/embeddings` 提供記憶嵌入服務 (預設模型：`mistral-embed`)。

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
    - Z.AI 使用您的 API 金鑰進行 Bearer 驗證。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="媒體理解" href="/en/tools/media-understanding" icon="microphone">
    音訊轉錄設定與提供者選擇。
  </Card>
</CardGroup>
