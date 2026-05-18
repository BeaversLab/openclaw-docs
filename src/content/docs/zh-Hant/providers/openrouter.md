---
summary: "在 OpenClaw 中使用 OpenRouter 的統一 API 來存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for music generation
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
    入門導覽預設為 `openrouter/auto`。請稍後選擇一個具體的模型：

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
| `openrouter/moonshotai/kimi-k2.5` | 透過 MoonshotAI 使用 Kimi K2.5 |

## 圖片生成

OpenRouter 也可以支援 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下使用 OpenRouter 的圖像模型：

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

OpenClaw 會使用 `modalities: ["image", "text"]` 將圖像請求發送到 OpenRouter 的聊天完成圖像 API。Gemini 的圖像模型會透過 OpenRouter 的 `image_config` 接收支援的 `aspectRatio` 和 `resolution` 提示。請針對較慢的 OpenRouter 圖像模型使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的單次呼叫 `timeoutMs` 參數仍然優先。

## 影片生成

OpenRouter 也可以透過其非同步 `/videos` API 支援 `video_generate` 工具。在 `agents.defaults.videoGenerationModel` 下使用 OpenRouter 的影片模型：

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

OpenClaw 將文字轉影片和圖片轉影片工作提交給 OpenRouter，輪詢傳回的 `polling_url`，並從 OpenRouter 的 `unsigned_urls` 或記載的工作內容端點下載完成的影片。參考圖片預設作為第一/最後一幀圖片發送；標記為 `reference_image` 的圖片會作為 OpenRouter 輸入參考發送。內建的 `google/veo-3.1-fast` 預設廣告目前支援的 4/6/8 秒持續時間、`720P`/`1080P` 解析度，以及 `16:9`/`9:16` 長寬比。由於上游影片生成 API 目前僅接受文字和圖片參考，因此未為 OpenRouter 註冊影片轉影片功能。

## 音樂生成

OpenRouter 也可以透過聊天完成音訊輸出來支援 `music_generate` 工具。請使用 `agents.defaults.musicGenerationModel` 下的 OpenRouter 音訊模型：

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "openrouter/google/lyria-3-pro-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

內建的 OpenRouter 音樂提供者預設為 `google/lyria-3-pro-preview`，並公開 `google/lyria-3-clip-preview`。OpenClaw 發送 `modalities: ["text",
"audio"]`，啟用串流，收集串流音訊區塊，並將結果儲存為生成的媒體以供頻道傳遞。透過共用的 `music_generate image=...` 參數，Lyria 模型接受參考圖片。

## 文字轉語音

OpenRouter 也可以透過其相容 OpenAI 的 `/audio/speech` 端點用作 TTS 提供者。

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

如果省略 `messages.tts.providers.openrouter.apiKey`，TTS 會重複使用 `models.providers.openrouter.apiKey`，然後是 `OPENROUTER_API_KEY`。

## 語音轉文字（入站音訊）

OpenRouter 可以透過共用的 `tools.media.audio` 路徑，使用其 STT 端點（`/audio/transcriptions`）轉錄入站語音/音訊附件。這適用於任何將入站語音/音訊轉發至媒體理解預檢的頻道外掛程式。

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

OpenClaw 將 OpenRouter STT 請求作為 JSON 發送，並將 base64 音訊放在 `input_audio` 下（OpenRouter STT 契約），而不是作為多部分 OpenAI 表單上傳。

## 驗證與標頭

OpenRouter 在底層使用包含您的 API 金鑰的 Bearer 權杖。

在真實的 OpenRouter 請求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 也會新增
OpenRouter 文件中記載的 app-attribution 標頭：

| 標頭                      | 數值                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>如果您將 OpenRouter 提供者重新指向其他代理伺服器或基礎 URL，OpenClaw 將**不**會新增那些 OpenRouter 專用的標頭或 Anthropic 快取標記。</Warning>

## 進階設定

<AccordionGroup>
  <Accordion title="Response caching">
    OpenRouter 回應快取為選用功能。您可以透過模型參數針對各個 OpenRouter 模型啟用它：

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

    OpenClaw 會傳送 `X-OpenRouter-Cache: true`，並在有設定時傳送
    `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 會強制重新整理
    目前的請求並儲存替換的回應。Snake_case 別名
    (`response_cache`、`response_cache_ttl_seconds` 和
    `response_cache_clear`) 也可接受。

    此功能與提供者提示快取以及 OpenRouter 的
    Anthropic `cache_control` 標記是分開的。它僅套用於已驗證的
    `openrouter.ai` 路由，不適用於自訂代理基礎 URL。

  </Accordion>

<Accordion title="Anthropic cache markers">在已驗證的 OpenRouter 路由上，Anthropic 模型參照會保留 OpenRouter 專用的 Anthropic `cache_control` 標記，這些標記是 OpenClaw 用來 改善系統/開發者提示區塊的提示快取重用效率。</Accordion>

<Accordion title="Anthropic reasoning prefill">在已驗證的 OpenRouter 路由上，啟用推理功能的 Anthropic 模型參照會在請求到達 OpenRouter 之前捨棄結尾的 assistant prefill 輪次， 以符合 Anthropic 對於推理對話必須以使用者輪次結束的要求。</Accordion>

<Accordion title="思考 / 推理注入">在支援的非 `auto` 路由上，OpenClaw 會將選取的思考層級對應至 OpenRouter 代理推理承載。不支援的模型提示以及 `openrouter/auto` 會跳過該推理注入。Hunter Alpha 也會跳過 針對過時設定模型參照的代理推理，因為對於該已淘汰路由，OpenRouter 可能 會在推理欄位中傳回最終答案文字。</Accordion>

<Accordion title="DeepSeek V4 推理重放">
  在經過驗證的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 會填補重放助手回合中缺失的 `reasoning_content`， 以便思考/工具對話保持 DeepSeek V4 所需的 後續形態。OpenClaw 會針對這些路由傳送 OpenRouter 支援的 `reasoning_effort` 數值；`xhigh` 是宣傳的最高 層級，而過時的 `max` 覆蓋值會對應至 `xhigh`。
</Accordion>

<Accordion title="僅限 OpenAI 的請求塑形">OpenRouter 仍透過代理風格的 OpenAI 相容路徑執行，因此 原生的僅限 OpenAI 請求塑形（例如 `serviceTier`、Responses `store`、 OpenAI 推理相容承載以及提示快取提示）不會被轉送。</Accordion>

<Accordion title="Gemini 支援的路由">Gemini 支援的 OpenRouter 參照會保持在代理 Gemini 路徑上：OpenClaw 會在該處 保留 Gemini 思考簽章清理功能，但不會啟用原生 Gemini 重播放驗證或啟動重寫。</Accordion>

  <Accordion title="供應商路由中繼資料">
    如果您在模型參數下傳遞 OpenRouter 供應商路由，OpenClaw 會
    在共用串流包裝函式執行之前，將其作為 OpenRouter 路由中繼資料轉送。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參考和故障轉移行為。
  </Card>
  <Card title="組態參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理人、模型和提供者的完整組態參考。
  </Card>
</CardGroup>
