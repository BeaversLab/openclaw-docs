---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for video generation
title: "OpenRouter"
---

OpenRouter 提供了一個 **統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 建立 API 金鑰。
  </Step>
  <Step title="執行入門導覽">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（選用）切換至特定模型">
    入門導覽預設為 `openrouter/auto`。請稍後選擇一個具體模型：

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
模型參照遵循 `openrouter/<provider>/<model>` 模式。如需可用提供者和模型的完整列表，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
</Note>

套件後備範例：

| 模型參照                          | 備註                           |
| --------------------------------- | ------------------------------ |
| `openrouter/auto`                 | OpenRouter 自動路由            |
| `openrouter/moonshotai/kimi-k2.6` | 透過 MoonshotAI 使用 Kimi K2.6 |
| `openrouter/moonshotai/kimi-k2.5` | 透過 MoonshotAI 使用 Kimi K2.5 |

## 圖片生成

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

OpenClaw 會透過 `modalities: ["image", "text"]` 將影像請求傳送至 OpenRouter 的聊天完成影像 API。Gemini 影像模型會透過 OpenRouter 的 `image_config` 接收支援的 `aspectRatio` 和 `resolution` 提示。針對較慢的 OpenRouter 影像模型，請使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的每次呼叫 `timeoutMs` 參數仍然優先。

## 影片生成

OpenRouter 也可以透過其非同步 `/videos` API 支援 `video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 影片模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openrouter/google/veo-3.1-fast",
      },
    },
  },
}
```

OpenClaw 將文字轉影片和圖片轉影片作業提交至 OpenRouter，輪詢傳回的 `polling_url`，並從 OpenRouter 的 `unsigned_urls` 或記載的作業內容端點下載完成的影片。參考圖片預設作為第一/最後一影格圖片發送；標記為 `reference_image` 的圖片則作為 OpenRouter 輸入參考發送。內建的 `google/veo-3.1-fast` 預設會公開目前支援的 4/6/8 秒持續時間、`720P`/`1080P` 解析度以及 `16:9`/`9:16` 長寬比。由於上游影片生成 API 目前僅接受文字和圖片參考，因此未為 OpenRouter 註冊影片轉影片功能。

## 文字轉語音

透過其相容 OpenAI 的 `/audio/speech` 端點，OpenRouter 也可以用作 TTS 提供者。

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

如果省略了 `messages.tts.providers.openrouter.apiKey`，TTS 會重複使用 `models.providers.openrouter.apiKey`，接著是 `OPENROUTER_API_KEY`。

## 語音轉文字 (輸入音訊)

OpenRouter 可以透過共用的 `tools.media.audio` 路徑使用其 STT 端點 (`/audio/transcriptions`) 來轉錄輸入的語音/音訊附件。這適用於任何將輸入語音/音訊轉發至媒體理解 preflight 的頻道外掛程式。

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "openrouter", model: "openai/whisper-large-v3-turbo" }],
      },
    },
  },
}
```

OpenClaw 會將 OpenRouter STT 請求以 JSON 形式發送，音訊以 base64 編碼置於 `input_audio` 下 (OpenRouter STT 契約)，而非作為多部分的 OpenAI 表單上傳。

## 驗證與標頭

OpenRouter 在底層使用包含您的 API 金鑰的 Bearer token。

在真實的 OpenRouter 請求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 也會新增 OpenRouter 記載的 app-attribution 標頭：

| 標頭                      | 值                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>如果您將 OpenRouter 提供者重新指向其他 Proxy 或基礎 URL，OpenClaw 將**不會**注入這些特定於 OpenRouter 的標頭或 Anthropic 快取標記。</Warning>

## 進階組態

<AccordionGroup>
  <Accordion title="回應快取">
    OpenRouter 的回應快取為選用功能。透過模型參數在每個 OpenRouter 模型上啟用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/auto": {
              params: {
                responseCache: true,
                responseCacheTtlSeconds: 300,
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 會發送 `X-OpenRouter-Cache: true`，且在設定後，也會發送 `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 會強制重新整理目前請求並儲存替代回應。同時也接受 Snake_case 別名（`response_cache`、`response_cache_ttl_seconds` 和 `response_cache_clear`）。

    這與提供者提示詞快取以及 OpenRouter 的 Anthropic `cache_control` 標記是分開的。它僅套用於已驗證的 `openrouter.ai` 路由，不適用於自訂代理基礎 URL。

  </Accordion>

<Accordion title="Anthropic 快取標記">在已驗證的 OpenRouter 路由上，Anthropic 模型參照會保留 OpenClaw 用於在系統/開發者提示區塊上更好地重複使用提示快取的 OpenRouter 專屬 Anthropic `cache_control` 標記。</Accordion>

<Accordion title="Anthropic 推理預填充">在已驗證的 OpenRouter 路由上，啟用推理功能的 Anthropic 模型參照會在請求到達 OpenRouter 之前捨棄末尾的助理預填充輪次，以符合 Anthropic 對推理對話必須以使用者輪次結束的要求。</Accordion>

<Accordion title="思考 / 推理注入">在支援的非 `auto` 路由上，OpenClaw 會將選取的思考等級對應到 OpenRouter 代理推理載荷。不支援的模型提示以及 `openrouter/auto` 將跳過該推理注入。Hunter Alpha 也會跳過過期設定模型參照的代理推理，因為對於該已淘汰路由，OpenRouter 可能會在推理欄位中傳回最終答案文字。</Accordion>

<Accordion title="DeepSeek V4 推理重放">在已驗證的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 會在重放的助理回合中填補缺失的 `reasoning_content`，以便思考/工具對話保持 DeepSeek V4 所需的後續形狀。OpenClaw 會為這些路由發送 OpenRouter 支援的 `reasoning_effort` 值；`xhigh` 是最高宣傳 層級，過時的 `max` 覆寫會被映射至 `xhigh`。</Accordion>

<Accordion title="僅限 OpenAI 的請求塑形">OpenRouter 仍透過代理樣式的 OpenAI 相容路徑運行，因此 原生的僅限 OpenAI 請求塑形（例如 `serviceTier`、Responses `store`、 OpenAI 推理相容 Payload 以及提示詞快取提示）不會被轉發。</Accordion>

<Accordion title="Gemini 支援的路由">由 Gemini 支援的 OpenRouter 參照會保持在代理 Gemini 路徑上：OpenClaw 會在那裡 保留 Gemini 思考簽章清理，但不會啟用原生 Gemini 重放驗證或啟動重寫。</Accordion>

  <Accordion title="供應商路由元數據">
    如果您在模型參數下傳遞 OpenRouter 供應商路由，OpenClaw 會在共用串流包裝器運行前
    將其作為 OpenRouter 路由元數據轉發。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理、模型和供應商的完整組態參考。
  </Card>
</CardGroup>
