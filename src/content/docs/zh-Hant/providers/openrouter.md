---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多種模型"
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
  <Step title="執行入門流程">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(選用) 切換至特定模型">
    入門流程預設為 `openrouter/auto`。稍後選擇一個具體模型：

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
模型參照遵循 `openrouter/<provider>/<model>` 模式。如需可用供應商和模型的完整清單，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
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

OpenClaw 使用 `modalities: ["image", "text"]` 將影像請求傳送至 OpenRouter 的聊天完成影像 API。Gemini 影像模型透過 OpenRouter 的 `image_config` 接收支援的 `aspectRatio` 和 `resolution` 提示。針對較慢的 OpenRouter 影像模型，請使用 `agents.defaults.imageGenerationModel.timeoutMs`；`image_generate` 工具的每次呼叫 `timeoutMs` 參數仍然優先。

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

OpenClaw 會將文生視訊和圖生視訊的工作提交給 OpenRouter，輪詢返回的 `polling_url`，並從 OpenRouter 的 `unsigned_urls` 或記載的工作內容端點下載完成的視訊。參考圖片預設作為首幀/末幀圖片發送；標記為 `reference_image` 的圖片會作為 OpenRouter 輸入參考發送。內建的 `google/veo-3.1-fast` 預設值會宣佈目前支援的 4/6/8 秒時長、`720P`/`1080P` 解析度，以及 `16:9`/`9:16` 長寬比。視訊轉視訊未為 OpenRouter 註冊，因為上游視訊生成 API 目前僅接受文字和圖片參考。

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

內建的 OpenRouter 音樂供應商預設為 `google/lyria-3-pro-preview`，並且也公開了 `google/lyria-3-clip-preview`。OpenClaw 會發送 `modalities: ["text", "audio"]`，啟用串流，收集串流的音訊區塊，並將結果儲存為生成的媒體以供頻道傳遞。Lyria 模型透過共用的 `music_generate image=...` 參數接受參考圖片。

## 文字轉語音

OpenRouter 也可以透過其 OpenAI 相容的 `/audio/speech` 端點用作 TTS 供應商。

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          speakerVoice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

如果省略了 `messages.tts.providers.openrouter.apiKey`，TTS 會重複使用 `models.providers.openrouter.apiKey`，然後是 `OPENROUTER_API_KEY`。

## 語音轉文字（入站音訊）

OpenRouter 可以使用其 STT 端點 (`/audio/transcriptions`) 透過共用的 `tools.media.audio` 路徑來轉錄傳入的語音/音訊附件。這適用於任何將傳入語音/音訊轉發至媒體理解事前檢查的頻道外掛程式。

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

OpenClaw 會將 OpenRouter STT 請求作為 JSON 發送，其中 base64 音訊位於 `input_audio` 之下 (OpenRouter STT 合約)，而不是作為多部分 OpenAI 表單上傳。

## 驗證與標頭

OpenRouter 在底層使用包含您的 API 金鑰的 Bearer 權杖。

在真實的 OpenRouter 請求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 也會新增 OpenRouter 記載的 app-attribution 標頭：

| 標頭                      | 數值                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>如果您將 OpenRouter 提供者重新指向其他代理伺服器或基礎 URL，OpenClaw 將**不**會新增那些 OpenRouter 專用的標頭或 Anthropic 快取標記。</Warning>

## 進階設定

<AccordionGroup>
  <Accordion title="回應快取">
    OpenRouter 的回應快取為選用功能。您可以透過模型參數
    為每個 OpenRouter 模型啟用它：

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

    OpenClaw 會發送 `X-OpenRouter-Cache: true`，並在經過設定時發送
    `X-OpenRouter-Cache-TTL`。`responseCacheClear: true` 會強制重新整理
    目前的請求並儲存替代的回應。Snake_case 別名
    （`response_cache`、`response_cache_ttl_seconds` 和
    `response_cache_clear`）也受支援。

    此功能與供應商的提示快取以及 OpenRouter 的
    Anthropic `cache_control` 標記是分開的。它僅套用於已驗證的
    `openrouter.ai` 路由，而非自訂的 Proxy 基礎 URL。

  </Accordion>

<Accordion title="Anthropic 快取標記">在已驗證的 OpenRouter 路由上，Anthropic 模型參照會保留 OpenRouter 專屬的 Anthropic `cache_control` 標記，OpenClaw 會使用這些標記 以便在系統/開發者提示區塊上更好地重用提示快取。</Accordion>

<Accordion title="Anthropic 推理預填">在已驗證的 OpenRouter 路由上，啟用推理功能的 Anthropic 模型參照會在請求到達 OpenRouter 之前 捨棄末尾的助手預填輪次，以符合 Anthropic 要求 推理對話必須以使用者輪次結束的規定。</Accordion>

<Accordion title="思考 / 推理注入">在支援的非 `auto` 路由上，OpenClaw 會將選取的思考層級 對應至 OpenRouter Proxy 推理載荷。不支援的模型提示與 `openrouter/auto` 將跳過該推理注入。Hunter Alpha 也會 對過時的設定模型參照跳過 Proxy 推理，因為 OpenRouter 可能 會在該已淘汰路由的推理欄位中傳回最終答案文字。</Accordion>

<Accordion title="DeepSeek V4 推理重播">在已驗證的 OpenRouter 路由上，`openrouter/deepseek/deepseek-v4-flash` 和 `openrouter/deepseek/deepseek-v4-pro` 會在重播的助理回合中填補缺失的 `reasoning_content`，以便思考/工具對話保持 DeepSeek V4 所需的後續形狀。OpenClaw 會針對這些路由發送 OpenRouter 支援的 `reasoning_effort` 值；`xhigh` 是最高宣稱的 層級，而過時的 `max` 覆寫會被對應到 `xhigh`。</Accordion>

<Accordion title="僅限 OpenAI 的請求塑形">OpenRouter 仍然透過代理樣式的 OpenAI 相容路徑運作，因此 原生僅限 OpenAI 的請求塑形（例如 `serviceTier`、Responses `store`、 OpenAI 推理相容承載以及提示詞快取提示）不會被轉發。</Accordion>

<Accordion title="Gemini 支援的路由">由 Gemini 支援的 OpenRouter 引用會停留在代理 Gemini 路徑上：OpenClaw 在該處保留 Gemini 思考特徵清理功能，但不啟用原生 Gemini 重播驗證或啟動重寫。</Accordion>

  <Accordion title="供應商路由元資料">
    OpenRouter 支援 `provider` 請求物件用於底層供應商
    路由。使用 `models.providers.openrouter.params.provider` 為所有 OpenRouter 文字模型請求
    設定預設政策：

    ```json5
    {
      models: {
        providers: {
          openrouter: {
            params: {
              provider: {
                sort: "latency",
                require_parameters: true,
                data_collection: "deny",
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 會將該物件作為請求 `provider`
    載荷轉發給 OpenRouter。請使用 OpenRouter 記載的 snake_case 欄位，包括 `sort`、
    `only`、`ignore`、`order`、`allow_fallbacks`、`require_parameters`、
    `data_collection`、`quantizations`、`max_price`、`preferred_max_latency`、
    `preferred_min_throughput`、`zdr` 和 `enforce_distillable_text`。

    每個模型的參數仍會覆寫供應商層級的路由物件：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/anthropic/claude-sonnet-4-6": {
              params: {
                provider: {
                  order: ["anthropic"],
                  allow_fallbacks: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    這僅適用於 OpenRouter chat-completions 路由。直接的 Anthropic、
    Google、OpenAI 或自訂供應商路由會忽略 OpenRouter 路由參數。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障移轉行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理程式、模型和供應商的完整設定參考。
  </Card>
</CardGroup>
