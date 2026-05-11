---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
title: "OpenRouter"
---

OpenRouter 提供了一個 **統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 建立 API 金鑰。
  </Step>
  <Step title="執行入門引導">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(選用) 切換至特定模型">
    入門引導預設為 `openrouter/auto`。稍後選擇一個具體模型：

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## 設定範例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 模型參考

<Note>
模型參照遵循 `openrouter/<provider>/<model>` 模式。如需可用提供者和模型的完整清單，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
</Note>

套件後備範例：

| 模型參照                          | 備註                           |
| --------------------------------- | ------------------------------ |
| `openrouter/auto`                 | OpenRouter 自動路由            |
| `openrouter/moonshotai/kimi-k2.6` | 透過 MoonshotAI 使用 Kimi K2.6 |

## 影像生成

OpenRouter 也可以支援 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 影像模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw 使用 `modalities: ["image", "text"]` 將影像請求傳送至 OpenRouter 的聊天完成影像 API。Gemini 影像模型會透過 OpenRouter 的 `image_config` 接收支援的 `aspectRatio` 和 `resolution` 提示。針對較慢的 OpenRouter 影像模型，請使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的每次呼叫 `timeoutMs` 參數仍優先。

## 文字轉語音

OpenRouter 也可以透過其與 OpenAI 相容的
`/audio/speech` 端點作為 TTS 提供者。

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 會重複使用
`models.providers.openrouter.apiKey`，然後是 `OPENROUTER_API_KEY`。

## 驗證與標頭

OpenRouter 在底層使用 Bearer token 與您的 API 金鑰。

在實際的 OpenRouter 請求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 也會新增
OpenRouter 記錄的 app-attribution 標頭：

| 標頭                      | 數值                  |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>如果您將 OpenRouter 提供者重新指向其他 Proxy 或基底 URL，OpenClaw 將**不會**注入這些 OpenRouter 專屬標頭或 Anthropic 快取標記。</Warning>

## 進階設定

<AccordionGroup>
  <Accordion title="Anthropic 快取標記">
    在已驗證的 OpenRouter 路由上，Anthropic 模型參照會保留
    OpenClaw 用於改善系統/開發者提示區塊提示快取重用的
    OpenRouter 專屬 Anthropic `cache_control` 標記。
  </Accordion>

<Accordion title="思考 / 推理注入">在支援的非 `auto` 路由上，OpenClaw 會將選取的思考層級對應到 OpenRouter Proxy 推理 Payload。不支援的模型提示與 `openrouter/auto` 會跳過該推理注入。Hunter Alpha 也會針對過時的設定模型參照跳過 Proxy 推理，因為對於該已淘汰路由，OpenRouter 可能會在推理欄位中傳回最終答案文字。</Accordion>

<Accordion title="僅限 OpenAI 的請求塑造">OpenRouter 仍透過 Proxy 樣式的 OpenAI 相容路徑運作，因此 原生僅限 OpenAI 的請求塑造（例如 `serviceTier`、Responses `store`、 OpenAI 推理相容 Payload 和提示快取提示）不會被轉送。</Accordion>

<Accordion title="Gemini 支援的路由">Gemini 支援的 OpenRouter 參照會保持在 Proxy-Gemini 路徑上：OpenClaw 會在那裡 保留 Gemini 思考簽章清理，但不會啟用原生 Gemini 重播驗證或 bootstrap 重寫。</Accordion>

  <Accordion title="Provider routing metadata">
    如果您在模型參數下傳遞 OpenRouter 提供者路由，OpenClaw 會在共用的串流包裝器執行之前，將其作為 OpenRouter 路由元資料轉發。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理程式、模型和提供者的完整配置參考。
  </Card>
</CardGroup>
