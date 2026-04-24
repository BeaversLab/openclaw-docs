---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 內建了針對 Grok 模型的 `xai` 提供者外掛程式。

## 開始使用

<Steps>
  <Step title="建立 API 金鑰">
    在 [xAI 主控台](https://console.x.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="設定您的 API 金鑰">
    設定 `XAI_API_KEY`，或執行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="選擇模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>OpenClaw 使用 xAI Responses API 作為內建的 xAI 傳輸。相同的 `XAI_API_KEY` 也可以驅動由 Grok 支援的 `web_search`、一流的 `x_search` 以及遠端 `code_execution`。 如果您將 xAI 金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下， 內建的 xAI 模型提供者也會將該金鑰作為後備重複使用。 `code_execution` 調整位於 `plugins.entries.xai.config.codeExecution` 之下。</Note>

## 內建模型目錄

OpenClaw 內建了以下 xAI 模型系列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

當新的 `grok-4*` 和 `grok-code-fast*` ID 遵循相同的 API 形狀時，
該外掛程式也會向前解析這些 ID。

<Tip>`grok-4-fast`、`grok-4-1-fast` 以及 `grok-4.20-beta-*` 變體是 目前內建目錄中具備映像處理能力的 Grok 參考。</Tip>

## OpenClaw 功能覆蓋範圍

內建外掛程式會將 xAI 目前的公開 API 介面映射到 OpenClaw 的共享
提供者與工具合約，前提是行為能夠乾淨地契合。

| xAI 功能           | OpenClaw 介面                          | 狀態                                               |
| ------------------ | -------------------------------------- | -------------------------------------------------- |
| 聊天 / 回應        | `xai/<model>` 模型供應商               | 是                                                 |
| 伺服器端網路搜尋   | `web_search` 供應商 `grok`             | 是                                                 |
| 伺服器端 X 搜尋    | `x_search` 工具                        | 是                                                 |
| 伺服器端程式碼執行 | `code_execution` 工具                  | 是                                                 |
| 圖片               | `image_generate`                       | 是                                                 |
| 影片               | `video_generate`                       | 是                                                 |
| 批次文字轉語音     | `messages.tts.provider: "xai"` / `tts` | 是                                                 |
| 串流 TTS           | —                                      | 未公開；OpenClaw 的 TTS 合約會回傳完整的音訊緩衝區 |
| 批次語音轉文字     | `tools.media.audio` / 媒體理解         | 是                                                 |
| 串流語音轉文字     | 語音通話 `streaming.provider: "xai"`   | 是                                                 |
| 即時語音           | —                                      | 尚未公開；不同的會話/WebSocket 合約                |
| 檔案 / 批次        | 僅支援通用模型 API 相容性              | 非 OpenClaw 的一等工具                             |

<Note>OpenClaw 使用 xAI 的 REST image/video/TTS/STT API 進行媒體生成、 語音和批次轉錄，使用 xAI 的串流 STT WebSocket 進行即時 語音通話轉錄，並使用 Responses API 進行模型、搜尋和 程式碼執行工具操作。需要不同 OpenClaw 合約的功能，例如 即時語音會話，在此處被記錄為上游功能，而非 隱藏的外掛行為。</Note>

### 快速模式對應

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
會將原生 xAI 請求重寫如下：

| 來源模型      | 快速模式目標       |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 舊版相容性別名

舊版別名仍會正規化為標準的內建 ID：

| 舊版別名                  | 標準 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="Web search">
    內建的 `grok` web-search provider 也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Video generation">
    內建的 `xai` 外掛程式透過共用的 `video_generate` 工具註冊影片生成功能。

    - 預設影片模型：`xai/grok-imagine-video`
    - 模式：text-to-video、image-to-video、remote video edit 和 remote video
      extension
    - 寬高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 解析度：`480P`、`720P`
    - 時長：生成/圖片轉影片為 1-15 秒，擴展為 2-10 秒

    <Warning>
    不接受本機影片緩衝區。請使用遠端 `http(s)` URL 作為
    影片編輯/擴展輸入。Image-to-video 接受本機圖片緩衝區，因為
    OpenClaw 可以將其編碼為 xAI 的 data URL。
    </Warning>

    若要將 xAI 設為預設的影片供應商：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、
    供應商選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="圖片生成">
    內建的 `xai` 外掛程式透過共享的 `image_generate` 工具註冊圖片生成功能。

    - 預設圖片模型：`xai/grok-imagine-image`
    - 其他模型：`xai/grok-imagine-image-pro`
    - 模式：文字生成圖片與參考圖片編輯
    - 參考輸入：一個 `image` 或最多五個 `images`
    - 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 數量：最多 4 張圖片

    OpenClaw 向 xAI 請求 `b64_json` 圖片回應，以便生成的媒體能夠透過正常頻道附件路徑儲存和傳送。本機參考圖片會轉換為 data URL；遠端 `http(s)` 參照則會直接傳遞。

    若要將 xAI 設為預設圖片供應商：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "xai/grok-imagine-image",
          },
        },
      },
    }
    ```

    <Note>
    xAI 的文件也提到了 `quality`、`mask`、`user`，以及其他原生長寬比，例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前僅轉發共享的跨供應商圖片控制項；不支援的原生設定項目故意不透過 `image_generate` 公開。
    </Note>

  </Accordion>

  <Accordion title="文字轉語音">
    內建的 `xai` 外掛程式透過共享的 `tts` 提供者介面註冊文字轉語音功能。

    - 語音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 預設語音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 語言：BCP-47 代碼或 `auto`
    - 速度：提供者原生的速度覆寫
    - 不支援原生 Opus 語音備忘錄格式

    若要使用 xAI 作為預設的 TTS 提供者：

    ```json5
    {
      messages: {
        tts: {
          provider: "xai",
          providers: {
            xai: {
              voiceId: "eve",
            },
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw 使用 xAI 的批次 `/v1/tts` 端點。xAI 也透過 WebSocket 提供串流 TTS，但 OpenClaw 語音提供者合約目前要求在回覆傳遞前必須有完整的音訊緩衝區。
    </Note>

  </Accordion>

  <Accordion title="語音轉文字">
    內建的 `xai` 外掛程式透過 OpenClaw 的媒體理解轉錄介面註冊批次語音轉文字功能。

    - 預設模型：`grok-stt`
    - 端點：xAI REST `/v1/stt`
    - 輸入路徑：多部分音訊檔案上傳
    - OpenClaw 在任何使用 `tools.media.audio` 進行輸入音訊轉錄的地方都提供支援，包括 Discord 語音頻道片段和頻道音訊附件

    若要針對輸入音訊轉錄強制使用 xAI：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "xai",
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    語言可以透過共享音訊媒體設定或每次呼叫的轉錄請求來提供。共享的 OpenClaw 介面接受提示詞提示，但 xAI REST STT 整合僅會轉發檔案、模型和語言，因為這些項目能乾淨地對應至目前的公開 xAI 端點。

  </Accordion>

  <Accordion title="串流語音轉文字">
    內建的 `xai` 外掛也會註冊一個即時轉錄提供者，
    用於即時通話音訊。

    - 端點：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 預設編碼：`mulaw`
    - 預設取樣率：`8000`
    - 預設端點偵測：`800ms`
    - 中間草稿：預設啟用

    Voice Call 的 Twilio 媒體串流會傳送 G.711 µ-law 音訊幀，所以
    xAI 提供者可以直接轉發這些幀而不需要轉碼：

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    提供者擁有的設定位於
    `plugins.entries.voice-call.config.streaming.providers.xai` 之下。支援的
    金鑰有 `apiKey`、`baseUrl`、`sampleRate`、`encoding` (`pcm`、`mulaw` 或
    `alaw`)、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    這個串流提供者是用於 Voice Call 的即時轉錄路徑。
    Discord 語音目前會錄製短片段，並改用批次
    `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    內建的 xAI 外掛將 `x_search` 公開為一種 OpenClaw 工具，用於透過 Grok 搜尋
    X (前稱 Twitter) 內容。

    設定路徑：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 啟用或停用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用於 x_search 請求的模型     |
    | `inlineCitations`  | boolean | —                  | 在結果中包含內文引用  |
    | `maxTurns`         | number  | —                  | 最大對話輪次           |
    | `timeoutSeconds`   | number  | —                  | 請求逾時時間（秒）           |
    | `cacheTtlMinutes`  | number  | —                  | 快取存留時間（分鐘）        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Code execution configuration">
    內建的 xAI 外掛將 `code_execution` 公開為一種 OpenClaw 工具，用於
    在 xAI 的沙箱環境中執行遠端程式碼。

    設定路徑：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 啟用或停用程式碼執行  |
    | `model`           | string  | `grok-4-1-fast`    | 用於程式碼執行請求的模型   |
    | `maxTurns`        | number  | —                  | 最大對話輪次               |
    | `timeoutSeconds`  | number  | —                  | 請求逾時時間（秒）               |

    <Note>
    這是 xAI 遠端沙箱執行，而非本機 [`exec`](/zh-Hant/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="已知限制">
  - 目前僅支援 API 金鑰認證。OpenClaw 尚未支援 xAI OAuth 或裝置碼流程。 - 標準的 xAI 提供者路徑不支援 `grok-4.20-multi-agent-experimental-beta-0304`，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。 - xAI Realtime voice 尚未註冊為 OpenClaw 提供者。它需要的雙向語音會話合約與批次 STT 或串流轉錄不同。 - xAI 圖片 `quality`、圖片 `mask` 以及額外的僅原生支援長寬比，在共用 `image_generate`
  工具具備對應的跨提供者控制項之前，不會公開。
</Accordion>

  <Accordion title="進階說明">
    - OpenClaw 會在共用執行器路徑上自動套用 xAI 特定的工具架構和工具呼叫相容性修正。
    - 原生 xAI 請求預設 `tool_stream: true`。設定
      `agents.defaults.models["xai/<model>"].params.tool_stream` 為 `false` 即可停用它。
    - 內建的 xAI 包裝器會在發送原生 xAI 請求之前，移除不支援的嚴格工具架構旗標和推理酬載金鑰。
    - `web_search`、`x_search` 和 `code_execution` 會公開為 OpenClaw 工具。OpenClaw 會在每個工具請求內啟用所需的特定 xAI 兘建工具，而不是將所有原生工具附加到每個聊天輪次。
    - `x_search` 和 `code_execution` 是由內建的 xAI 外掛程式擁有，而不是硬編碼到核心模型執行階段中。
    - `code_execution` 是遠端 xAI 沙箱執行，而不是本機
      [`exec`](/zh-Hant/tools/exec)。
  </Accordion>
</AccordionGroup>

## 即時測試

xAI 媒體路徑涵蓋在單元測試和選用即時測試套件中。即時指令會在探查 `XAI_API_KEY` 之前，從您的登入 shell 載入密鑰，包括 `~/.profile`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

特定於提供者的即時檔案會合成正常的 TTS、適合電話的 PCM
TTS，透過 xAI 批次 STT 轉錄音訊，透過 xAI
即時 STT 串流相同的 PCM，生成文生圖輸出，並編輯參考圖片。
共享圖片即時檔案透過 OpenClaw 的執行時選擇、容錯移轉、標準化和媒體附件路徑來驗證相同的 xAI 提供者。

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共享影片工具參數與提供者選擇。
  </Card>
  <Card title="所有提供者" href="/zh-Hant/providers/index" icon="grid-2">
    更廣泛的提供者概覽。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與修復方法。
  </Card>
</CardGroup>
