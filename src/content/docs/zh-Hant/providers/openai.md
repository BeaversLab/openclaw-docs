---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

# OpenAI

OpenAI 提供 GPT 模型的開發者 API。OpenClaw 支援兩種驗證方式：

- **API 金鑰** — 直接存取 OpenAI Platform，並依使用量計費 (`openai/*` 模型)
- **Codex 訂閱** — 使用訂閱權限登入 ChatGPT/Codex (`openai-codex/*` 模型)

OpenAI 明確支援在外部工具與工作流程（例如 OpenClaw）中使用訂閱式的 OAuth。

## 開始使用

選擇您偏好的驗證方式，並依照設定步驟操作。

<Tabs>
  <Tab title="API 金鑰 (OpenAI Platform)">
    **最適合用於：** 直接 API 存取與依使用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [OpenAI Platform 儀表板](https://platform.openai.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行導覽設定">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接傳入金鑰：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型參照 | 路由 | 驗證 |
    |-----------|-------|------|
    | `openai/gpt-5.4` | 直接 OpenAI Platform API | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | 直接 OpenAI Platform API | `OPENAI_API_KEY` |

    <Note>
    ChatGPT/Codex 登入會透過 `openai-codex/*` 路由，而不是 `openai/*`。
    </Note>

    ### 設定範例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw **不會**在直接 API 路徑上公開 `openai/gpt-5.3-codex-spark`。即時的 OpenAI API 請求會拒絕該模型。Spark 僅限 Codex 使用。
    </Warning>

  </Tab>

  <Tab title="Codex 訂閱">
    **最適用於：** 使用您的 ChatGPT/Codex 訂閱，而非使用獨立的 API 金鑰。Codex cloud 需要 ChatGPT 登入。

    <Steps>
      <Step title="執行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接執行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```
      </Step>
      <Step title="設定預設模型">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.4
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref | Route | Auth |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Codex 登入 |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Codex 登入 (視權限而定) |

    <Note>
    此路由與 `openai/gpt-5.4` 顯式分開。使用 `openai/*` 搭配 API 金鑰以直接存取 Platform，並使用 `openai-codex/*` 進行 Codex 訂閱存取。
    </Note>

    ### Config 範例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Tip>
    如果入學重複使用現有的 Codex CLI 登入，這些憑證仍由 Codex CLI 管理。憑證過期時，OpenClaw 會先重新讀取外部 Codex 來源，然後將更新後的憑證寫回 Codex 儲存空間。
    </Tip>

    ### Context window 上限

    OpenClaw 將模型元資料與執行階段 context 上限視為不同的值。

    對於 `openai-codex/gpt-5.4`：

    - 原生 `contextWindow`：`1050000`
    - 預設執行階段 `contextTokens` 上限：`272000`

    較小的預設上限在實務上具有更好的延遲與品質特性。使用 `contextTokens` 覆寫它：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.4", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 宣告原生模型元資料。使用 `contextTokens` 限制執行階段 context 預算。
    </Note>

  </Tab>
</Tabs>

## 圖片生成

內建的 `openai` 外掛程式透過 `image_generate` 工具註冊圖片生成功能。

| 功能               | 值                          |
| ------------------ | --------------------------- |
| 預設模型           | `openai/gpt-image-1`        |
| 每次請求的圖片上限 | 4                           |
| 編輯模式           | 已啟用（最多 5 張參考圖片） |
| 尺寸覆寫           | 支援                        |
| 長寬比 / 解析度    | 未轉發至 OpenAI Images API  |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-1" },
    },
  },
}
```

<Note>請參閱 [圖像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

## 影片生成

內建的 `openai` 外掛程式透過 `video_generate` 工具註冊影片生成功能。

| 功能     | 數值                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 預設模型 | `openai/sora-2`                                                            |
| 模式     | 文字生成影片、圖片生成影片、單一影片編輯                                   |
| 參考輸入 | 1 張圖片或 1 部影片                                                        |
| 尺寸覆寫 | 支援                                                                       |
| 其他覆寫 | `aspectRatio`、`resolution`、`audio`、`watermark` 將被忽略，並顯示工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

## 人格覆寫

OpenClaw 會針對 `openai/*` 和 `openai-codex/*` 執行作業，新增一個小型且專屬於 OpenAI 的提示詞覆寫。此覆寫可讓助理保持熱情、協作、簡潔，並略帶情感表達，而不會取代基礎系統提示詞。

| 數值                | 效果                       |
| ------------------- | -------------------------- |
| `"friendly"` (預設) | 啟用 OpenAI 專屬覆寫       |
| `"on"`              | `"friendly"` 的別名        |
| `"off"`             | 僅使用基礎 OpenClaw 提示詞 |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      plugins: {
        entries: {
          openai: { config: { personality: "friendly" } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set plugins.entries.openai.config.personality off
    ```
  </Tab>
</Tabs>

<Tip>Values are case-insensitive at runtime, so `"Off"` and `"off"` both disable the overlay.</Tip>

## Voice and speech

<AccordionGroup>
  <Accordion title="Speech synthesis (TTS)">
    The bundled `openai` plugin registers speech synthesis for the `messages.tts` surface.

    | Setting | Config path | Default |
    |---------|------------|---------|
    | Model | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voice | `messages.tts.providers.openai.voice` | `coral` |
    | Speed | `messages.tts.providers.openai.speed` | (unset) |
    | Instructions | `messages.tts.providers.openai.instructions` | (unset, `gpt-4o-mini-tts` only) |
    | Format | `messages.tts.providers.openai.responseFormat` | `opus` for voice notes, `mp3` for files |
    | API key | `messages.tts.providers.openai.apiKey` | Falls back to `OPENAI_API_KEY` |
    | Base URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    Available models: `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Available voices: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    Set `OPENAI_TTS_BASE_URL` to override the TTS base URL without affecting the chat API endpoint.
    </Note>

  </Accordion>

  <Accordion title="Realtime transcription">
    隨附的 `openai` 外掛程式為 Voice Call 外掛程式註冊即時轉錄功能。

    | 設定 | Config 路徑 | 預設值 |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Silence duration | `...openai.silenceDurationMs` | `800` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | API key | `...openai.apiKey` | Falls back to `OPENAI_API_KEY` |

    <Note>
    使用 WebSocket 連線到 `wss://api.openai.com/v1/realtime`，並採用 G.711 u-law 音訊格式。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    隨附的 `openai` 外掛程式為 Voice Call 外掛程式註冊即時語音功能。

    | 設定 | Config 路徑 | 預設值 |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | Voice | `...openai.voice` | `alloy` |
    | Temperature | `...openai.temperature` | `0.8` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | Silence duration | `...openai.silenceDurationMs` | `500` |
    | API key | `...openai.apiKey` | Falls back to `OPENAI_API_KEY` |

    <Note>
    透過 `azureEndpoint` 和 `azureDeployment` 設定鍵支援 Azure OpenAI。支援雙向工具呼叫。採用 G.711 u-law 音訊格式。
    </Note>

  </Accordion>
</AccordionGroup>

## 進階設定

<AccordionGroup>
  <Accordion title="傳輸 (WebSocket 與 SSE)">
    OpenClaw 對於 `openai/*` 和 `openai-codex/*` 均優先使用 WebSocket，並在需要時回退到 SSE (`"auto"`)。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前會重試一次早期的 WebSocket 失敗
    - 失敗後，會將 WebSocket 標記為降級約 60 秒，並在冷卻期間使用 SSE
    - 為重試和重新連接附加穩定的會話和輪次識別標頭
    - 跨傳輸變體標準化使用計數器 (`input_tokens` / `prompt_tokens`)

    | 數值 | 行為 |
    |-------|----------|
    | `"auto"` (預設) | 優先 WebSocket，回退 SSE |
    | `"sse"` | 僅強制使用 SSE |
    | `"websocket"` | 僅強制使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai-codex/gpt-5.4": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相關 OpenAI 文件：
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket 預熱">
    OpenClaw 預設為 `openai/*` 啟用 WebSocket 預熱，以減少首輪延遲。

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 提供了一個共用的快速模式切換開關，適用於 `openai/*` 和 `openai-codex/*`：

    - **聊天/UI：** `/fast status|on|off`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    啟用後，OpenClaw 會將快速模式對應到 OpenAI 優先處理 (`service_tier = "priority"`)。現有的 `service_tier` 值會被保留，且快速模式不會重寫 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { fastMode: true } },
            "openai-codex/gpt-5.4": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    會話覆蓋優先於配置。在 Sessions UI 中清除會話覆蓋會使會話恢復為配置的預設值。
    </Note>

  </Accordion>

  <Accordion title="優先處理 (service_tier)">
    OpenAI 的 API 透過 `service_tier` 公開優先處理功能。請在 OpenClaw 中針對每個模型進行設定：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { serviceTier: "priority" } },
            "openai-codex/gpt-5.4": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支援的數值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 僅會轉發至原生 OpenAI 端點 (`api.openai.com`) 與原生 Codex 端點 (`chatgpt.com/backend-api`)。如果您透過代理伺服器路由任一提供者，OpenClaw 將保持 `service_tier` 不變。
    </Warning>

  </Accordion>

  <Accordion title="伺服器端壓縮 (Responses API)">
    針對直接的 OpenAI Responses 模型 (`api.openai.com` 上的 `openai/*`)，OpenClaw 會自動啟用伺服器端壓縮：

    - 強制執行 `store: true` (除非模型相容性設定 `supportsStore: false`)
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 預設 `compact_threshold`：`contextWindow` 的 70% (當無法使用時則為 `80000`)

    <Tabs>
      <Tab title="明確啟用">
        對於相容的端點很有用，例如 Azure OpenAI Responses：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.4": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="自訂閾值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="停用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 僅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍然會強制執行 `store: true`，除非相容性設定 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    對於在 `openai/*` 和 `openai-codex/*` 上運行的 GPT-5 系列，OpenClaw 可以使用更嚴格的內嵌執行契約：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic` 時，OpenClaw：
    - 當有工具動作可用時，不再將僅計劃的輪次視為成功的進度
    - 使用立即行動的導引重試該輪次
    - 對於大量工作自動啟用 `update_plan`
    - 如果模型持續計劃而不採取行動，則顯示明確的封鎖狀態

    <Note>
    僅限於 OpenAI 和 Codex 的 GPT-5 系列運行。其他提供者和舊版模型系列保持預設行為。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 對直接 OpenAI、Codex 和 Azure OpenAI 端點的處理方式與通用 OpenAI 相容的 `/v1` 代理不同：

    **Native routes** (`openai/*`, `openai-codex/*`, Azure OpenAI):
    - 當推理被明確停用時，保持 `reasoning: { effort: "none" }` 不變
    - 將工具架構預設為嚴格模式
    - 僅在經過驗證的原生主機上附加隱藏的歸因標頭
    - 保留 OpenAI 專用的請求塑形 (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Proxy/compatible routes:**
    - 使用較寬鬆的相容性行為
    - 不強制執行嚴格的工具架構或僅限原生的標頭

    Azure OpenAI 使用原生傳輸和相容性行為，但不會收到隱藏的歸因標頭。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用的影像工具參數和提供者選擇。
  </Card>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的視訊工具參數與提供者選擇。
  </Card>
  <Card title="OAuth 與認證" href="/zh-Hant/gateway/authentication" icon="key">
    認證詳細資訊與憑證重複使用規則。
  </Card>
</CardGroup>
