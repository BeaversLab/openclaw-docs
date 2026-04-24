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

- **API 金鑰** — 直接存取 OpenAI 平台並採用量計費 (`openai/*` 模型)
- **Codex 訂閱** — 使用訂閱權限登入 ChatGPT/Codex (`openai-codex/*` 模型)

OpenAI 明確支援在外部工具與工作流程（例如 OpenClaw）中使用訂閱式的 OAuth。

## OpenClaw 功能支援

| OpenAI 功能      | OpenClaw 介面                             | 狀態                               |
| ---------------- | ----------------------------------------- | ---------------------------------- |
| 聊天 / 回應      | `openai/<model>` 模型供應商               | 是                                 |
| Codex 訂閱模型   | `openai-codex/<model>` 模型供應商         | 是                                 |
| 伺服器端網路搜尋 | 原生 OpenAI 回應工具                      | 是，當啟用網路搜尋且未鎖定供應商時 |
| 圖像             | `image_generate`                          | 是                                 |
| 影片             | `video_generate`                          | 是                                 |
| 文字轉語音       | `messages.tts.provider: "openai"` / `tts` | 是                                 |
| 批次語音轉文字   | `tools.media.audio` / 媒體理解            | 是                                 |
| 串流語音轉文字   | 語音通話 `streaming.provider: "openai"`   | 是                                 |
| 即時語音         | 語音通話 `realtime.provider: "openai"`    | 是                                 |
| 嵌入             | 記憶嵌入提供者                            | 是                                 |

## 開始使用

選擇您偏好的驗證方式，並依照設定步驟進行操作。

<Tabs>
  <Tab title="API 金鑰 (OpenAI 平台)">
    **最適合：** 直接存取 API 及依使用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [OpenAI Platform 儀表板](https://platform.openai.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行上架程式">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接傳遞金鑰：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref | Route | Auth |
    |-----------|-------|------|
    | `openai/gpt-5.4` | Direct OpenAI Platform API | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | Direct OpenAI Platform API | `OPENAI_API_KEY` |

    <Note>
    ChatGPT/Codex 登入是透過 `openai-codex/*` 路由，而不是 `openai/*`。
    </Note>

    ### 設定範例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw **不會** 在直接 API 路徑上暴露 `openai/gpt-5.3-codex-spark`。即時 OpenAI API 請求會拒絕該模型。Spark 僅限 Codex 使用。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **最適用於：** 使用您的 ChatGPT/Codex 訂閱，而非額外的 API 金鑰。Codex cloud 需要登入 ChatGPT。

    <Steps>
      <Step title="Run Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接執行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        對於無頭程式 或不支援回調 的設定，請新增 `--device-code` 以使用 ChatGPT 裝置碼流程 登入，而非本機瀏覽器回調：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Set the default model">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.4
        ```
      </Step>
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref | 路由 | 驗證 |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Codex 登入 |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Codex 登入 (視權限而定) |

    <Note>
    此路由刻意與 `openai/gpt-5.4` 分開。使用 `openai/*` 搭配 API 金鑰以直接存取 Platform，並使用 `openai-codex/*` 進行 Codex 訂閱存取。
    </Note>

    ### 設定範例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Note>
    Onboarding 不再從 `~/.codex` 匯入 OAuth 資料。請使用瀏覽器 OAuth (預設) 或上述裝置碼流程登入 — OpenClaw 會在其自己的 agent auth store 中管理產生的憑證。
    </Note>

    ### 上下文視窗 上限

    OpenClaw 將模型中繼資料 和執行時期上下文上限 視為不同的值。

    對於 `openai-codex/gpt-5.4`：

    - 原生 `contextWindow`：`1050000`
    - 預設執行時期 `contextTokens` 上限：`272000`

    較小的預設上限在實務上具有更好的延遲 和品質 特性。使用 `contextTokens` 覆寫它：

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
    使用 `contextWindow` 來宣告原生模型中繼資料。使用 `contextTokens` 來限制執行時期上下文預算。
    </Note>

  </Tab>
</Tabs>

## 圖像生成

內建的 `openai` 外掛程式透過 `image_generate` 工具註冊圖像生成。

| 功能                 | 數值                        |
| -------------------- | --------------------------- |
| 預設模型             | `openai/gpt-image-2`        |
| 每次請求的最大圖像數 | 4                           |
| 編輯模式             | 已啟用（最多 5 張參考圖像） |
| 尺寸覆寫             | 支援，包括 2K/4K 尺寸       |
| 長寬比 / 解析度      | 不轉發至 OpenAI Images API  |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>請參閱 [圖像生成](/zh-Hant/tools/image-generation) 以了解共享工具參數、供應商選擇和容錯移轉行為。</Note>

`gpt-image-2` 是 OpenAI 文字轉圖像生成和圖像編輯的預設選項。`gpt-image-1` 仍可作為顯式模型覆寫使用，但新的 OpenAI 圖像工作流程應使用 `openai/gpt-image-2`。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

編輯：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## 影片生成

內建的 `openai` 外掛程式透過 `video_generate` 工具註冊影片生成。

| 功能     | 數值                                                                     |
| -------- | ------------------------------------------------------------------------ |
| 預設模型 | `openai/sora-2`                                                          |
| 模式     | 文字轉影片、圖片轉影片、單一影片編輯                                     |
| 參考輸入 | 1 張圖片或 1 部影片                                                      |
| 尺寸覆寫 | 支援                                                                     |
| 其他覆寫 | `aspectRatio`、`resolution`、`audio`、`watermark` 將被忽略並顯示工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共享工具參數、供應商選擇和容錯移轉行為。</Note>

## GPT-5 提示詞貢獻

OpenClaw 會為跨供應商的 GPT-5 系列執行新增一個共享的 GPT-5 提示詞貢獻。它依模型 ID 套用，因此 `openai/gpt-5.4`、`openai-codex/gpt-5.4`、`openrouter/openai/gpt-5.4`、`opencode/gpt-5.4` 和其他相容的 GPT-5 參照會收到相同的疊加層。舊版的 GPT-4.x 模型則不會。

內建的原生 Codex 駕驭提供者 (`codex/*`) 透過 Codex 應用伺服器開發者指示使用相同的 GPT-5 行為和心跳疊加層，因此 `codex/gpt-5.x` 工作階段即使在 Codex 擁有剩餘驾驭提示詞的情況下，仍能保持相同的貫徹執行和主動心跳指導。

GPT-5 貢獻內容為人格持久性、執行安全性、工具紀律、輸出格式、完成檢查和驗證新增了標記行為合約。特定頻道的回覆和靜默訊息行為保留在共享的 OpenClaw 系統提示詞和傳出傳遞原則中。對於匹配的模型，GPT-5 指引始終啟用。友好的互動風格層是獨立的且可設定。

| 值                  | 效果                 |
| ------------------- | -------------------- |
| `"friendly"` (預設) | 啟用友好的互動風格層 |
| `"on"`              | `"friendly"` 的別名  |
| `"off"`             | 僅停用友好風格層     |

<Tabs>
  <Tab title="設定">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>值在執行時不區分大小寫，因此 `"Off"` 和 `"off"` 都會停用友好風格層。</Tip>

<Note>當未設定共享的 `agents.defaults.promptOverlays.gpt5.personality` 設定時，舊版 `plugins.entries.openai.config.personality` 仍會被讀取作為相容性後援。</Note>

## 語音和語音合成

<AccordionGroup>
  <Accordion title="語音合成 (TTS)">
    內建的 `openai` 外掛程式為 `messages.tts` 介面註冊了語音合成功能。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 語音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未設定) |
    | 指示 | `messages.tts.providers.openai.instructions` | (未設定，僅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 語音備忘錄為 `opus`，檔案為 `mp3` |
    | API 金鑰 | `messages.tts.providers.openai.apiKey` | 會回退至 `OPENAI_API_KEY` |
    | 基礎 URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用語音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

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
    設定 `OPENAI_TTS_BASE_URL` 以覆寫 TTS 基礎 URL，而不會影響聊天 API 端點。
    </Note>

  </Accordion>

  <Accordion title="語音轉文字">
    隨附的 `openai` 外掛程式透過 OpenClaw 的媒體理解轉錄介面註冊批次語音轉文字。

    - 預設模型：`gpt-4o-transcribe`
    - 端點：OpenAI REST `/v1/audio/transcriptions`
    - 輸入路徑：多部分音訊檔案上傳
    - OpenClaw 在任何使用 `tools.media.audio` 的傳入音訊轉錄處皆提供支援，包括 Discord 語音頻道片段和頻道音訊附件

    若要強制對傳入音訊轉錄使用 OpenAI：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    當由共用的音訊媒體設定或單次轉錄請求提供時，語言和提示詞提示會轉發給 OpenAI。

  </Accordion>

  <Accordion title="即時轉錄">
    隨附的 `openai` 外掛程式為語音通話外掛註冊即時轉錄。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 語言 | `...openai.language` | (未設定) |
    | 提示詞 | `...openai.prompt` | (未設定) |
    | 靜音持續時間 | `...openai.silenceDurationMs` | `800` |
    | VAD 閾值 | `...openai.vadThreshold` | `0.5` |
    | API 金鑰 | `...openai.apiKey` | 回退至 `OPENAI_API_KEY` |

    <Note>
    使用 WebSocket 連線到 `wss://api.openai.com/v1/realtime`，並採用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音訊。此串流提供者是用於語音通話的即時轉錄路徑；Discord 語音目前則是錄製短片段並改用批次 `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    內建的 `openai` 外掛程式為 Voice Call 外掛程式註冊即時語音。

    | 設定 | 配置路徑 | 預設值 |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | Voice | `...openai.voice` | `alloy` |
    | Temperature | `...openai.temperature` | `0.8` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | Silence duration | `...openai.silenceDurationMs` | `500` |
    | API key | `...openai.apiKey` | Falls back to `OPENAI_API_KEY` |

    <Note>
    透過 `azureEndpoint` 和 `azureDeployment` 配置金鑰支援 Azure OpenAI。支援雙向工具呼叫。使用 G.711 u-law 音訊格式。
    </Note>

  </Accordion>
</AccordionGroup>

## 進階配置

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw 對於 `openai/*` 和 `openai-codex/*` 均採用 WebSocket 優先並 SSE 備援 (`"auto"`) 的機制。

    在 `"auto"` 模式下，OpenClaw 會：
    - 在回退到 SSE 之前重試一次早期的 WebSocket 失敗
    - 失敗後，將 WebSocket 標記為降級約 60 秒，並在冷卻期間使用 SSE
    - 附加穩定的 session 和 turn 標頭用於重試和重新連線
    - 在不同的傳輸變體之間正規化使用計數器 (`input_tokens` / `prompt_tokens`)

    | 數值 | 行為 |
    |-------|----------|
    | `"auto"` (預設) | WebSocket 優先，SSE 備援 |
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

    相關的 OpenAI 文件：
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket warm-up">
    OpenClaw 預設為 `openai/*` 啟用 WebSocket 預熱，以減少首次輪詢延遲。

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

<a id="openai-fast-mode"></a>

  <Accordion title="Fast mode">
    OpenClaw 為 `openai/*` 和 `openai-codex/*` 提供了一個共享的快速模式切換開關：

    - **Chat/UI:** `/fast status|on|off`
    - **Config:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    啟用後，OpenClaw 會將快速模式對應至 OpenAI 優先處理（`service_tier = "priority"`）。現有的 `service_tier` 值將被保留，且快速模式不會覆寫 `reasoning` 或 `text.verbosity`。

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
    會話覆寫優先於設定。在 Sessions UI 中清除會話覆寫會將該會話恢復為設定的預設值。
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)">
    OpenAI 的 API 透過 `service_tier` 提供優先處理功能。您可以在 OpenClaw 中針對每個模型進行設定：

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

    支援的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 僅會轉送至原生 OpenAI 端點（`api.openai.com`）和原生 Codex 端點（`chatgpt.com/backend-api`）。如果您透過代理路由任一提供者，OpenClaw 將保持 `service_tier` 不變。
    </Warning>

  </Accordion>

  <Accordion title="伺服器端壓縮 (Responses API)">
    對於直接的 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenClaw 會自動啟用伺服器端壓縮：

    - 強制 `store: true`（除非模型相容性設定了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 預設 `compact_threshold`：`contextWindow` 的 70%（當無法使用時則為 `80000`）

    <Tabs>
      <Tab title="明確啟用">
        對於相容的端點（例如 Azure OpenAI Responses）很有用：

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
      <Tab title="自訂臨界值">
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
    `responsesServerCompaction` 僅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍會強制 `store: true`，除非相容性設定了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="嚴格代理式 GPT 模式">
    對於在 `openai/*` 和 `openai-codex/*` 上執行的 GPT-5 系列，OpenClaw 可以使用更嚴格的嵌入式執行合約：

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
    - 使用立即行動的引導重試該輪次
    - 對於大量工作自動啟用 `update_plan`
    - 如果模型持續計劃而未採取行動，會顯示明確的封鎖狀態

    <Note>
    僅限於 OpenAI 和 Codex 的 GPT-5 系列執行。其他提供者和較舊的模型系列會保持預設行為。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 對直接 OpenAI、Codex 和 Azure OpenAI 端點的處理方式與通用 OpenAI 相容的 `/v1` 代理不同：

    **原生路由** (`openai/*`, `openai-codex/*`, Azure OpenAI):
    - 僅為支援 OpenAI `none` 計畫的模型保留 `reasoning: { effort: "none" }`
    - 省略模型或代理拒絕的 `reasoning.effort: "none"` 的停用推理
    - 將工具結構描述預設為嚴格模式
    - 僅在驗證過的原生主機上附加隱藏的歸因標頭
    - 保留 OpenAI 專用的請求塑形 (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **代理/相容路由：**
    - 使用較寬鬆的相容行為
    - 不強制執行嚴格的工具結構描述或僅限原生的標頭

    Azure OpenAI 使用原生傳輸和相容行為，但不會收到隱藏的歸因標頭。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和容錯移轉行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用圖像工具參數和提供商選擇。
  </Card>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用影片工具參數和提供商選擇。
  </Card>
  <Card title="OAuth and auth" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重用規則。
  </Card>
</CardGroup>
