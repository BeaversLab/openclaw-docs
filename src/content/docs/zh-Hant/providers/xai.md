---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw 內建了 Grok 模型的 `xai` 提供者插件。

## 快速入門

<Steps>
  <Step title="建立 API 金鑰">
    在 [xAI console](https://console.x.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="設定您的 API 金鑰">
    設定 `XAI_API_KEY`，或執行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="選擇一個模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>OpenClaw 使用 xAI Responses API 作為內建的 xAI 傳輸。同樣的 `XAI_API_KEY` 也可以驅動 Grok 支援的 `web_search`、一等公民 `x_search`， 以及遠端 `code_execution`。 如果您將 xAI 金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下， 內建的 xAI 模型提供者也會將該金鑰作為備案重複使用。 `code_execution` 微調位於 `plugins.entries.xai.config.codeExecution` 下。</Note>

## 內建目錄

OpenClaw 原生包含這些 xAI 模型系列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`、`grok-3-fast`、`grok-3-mini`、`grok-3-mini-fast`               |
| Grok 4         | `grok-4`、`grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`、`grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`、`grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`、`grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

當較新的 `grok-4*` 和 `grok-code-fast*` ID 遵循
相同的 API 形狀時，該插件也會向前解析這些 ID。

<Tip>`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 變體是內建目錄中 目前支援圖像的 Grok 參照。</Tip>

## OpenClaw 功能涵蓋範圍

隨附的外掛程式將 xAI 目前的公開 API 介面對應至 OpenClaw 的共享提供者和工具合約。不符合共享合約的功能（例如串流 TTS 和即時語音）不會公開——請參閱下表。

| xAI 功能           | OpenClaw 介面                          | 狀態                                               |
| ------------------ | -------------------------------------- | -------------------------------------------------- |
| 聊天 / 回應        | `xai/<model>` 模型提供者               | 是                                                 |
| 伺服器端網路搜尋   | `web_search` 提供者 `grok`             | 是                                                 |
| 伺服器端 X 搜尋    | `x_search` 工具                        | 是                                                 |
| 伺服器端程式碼執行 | `code_execution` 工具                  | 是                                                 |
| 圖片               | `image_generate`                       | 是                                                 |
| 影片               | `video_generate`                       | 是                                                 |
| 批次文字轉語音     | `messages.tts.provider: "xai"` / `tts` | 是                                                 |
| 串流 TTS           | —                                      | 未公開；OpenClaw 的 TTS 合約會傳回完整的音訊緩衝區 |
| 批次語音轉文字     | `tools.media.audio` / 媒體理解         | 是                                                 |
| 串流語音轉文字     | 語音通話 `streaming.provider: "xai"`   | 是                                                 |
| 即時語音           | —                                      | 尚未公開；具有不同的連線階段/WebSocket 合約        |
| 檔案 / 批次        | 僅限通用模型 API 相容性                | 非 OpenClaw 的一等工具                             |

<Note>OpenClaw 使用 xAI 的 REST 圖片/影片/TTS/STT API 進行媒體生成、 語音和批次轉錄，使用 xAI 的串流 STT WebSocket 進行即時 語音通話轉錄，並使用 Responses API 進行模型、搜尋和 程式碼執行工具。需要不同 OpenClaw 合約的功能（例如 即時語音連線階段）會在此記錄為上游功能，而非 隱藏的外掛程式行為。</Note>

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

舊版別名仍會正規化為標準隨附 ID：

| 舊版別名                  | 標準 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="網路搜尋">
    內建的 `grok` 網路搜尋提供者同樣使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="影片生成">
    內建的 `xai` 外掛程式透過共用的 `video_generate` 工具註冊影片生成。

    - 預設影片模型：`xai/grok-imagine-video`
    - 模式：文字轉影片、圖片轉影片、參考圖片生成、遠端影片編輯和遠端影片延伸
    - 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 解析度：`480P`、`720P`
    - 時長：生成/圖片轉影片為 1-15 秒，使用 `reference_image` 角色時為 1-10 秒，延伸為 2-10 秒
    - 參考圖片生成：將每張提供的圖片的 `imageRoles` 設定為 `reference_image`；xAI 最多接受 7 張此類圖片

    <Warning>
    不接受本機影片緩衝區。請使用遠端 `http(s)` URL 作為影片編輯/延伸輸入。圖片轉影片接受本機圖片緩衝區，因為 OpenClaw 可以將其編碼為 xAI 的資料 URL。
    </Warning>

    若要將 xAI 設為預設影片提供者：

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
    請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="影像生成">
    內建的 `xai` 外掛程式透過共用的
    `image_generate` 工具註冊影像生成功能。

    - 預設影像模型：`xai/grok-imagine-image`
    - 其他模型：`xai/grok-imagine-image-pro`
    - 模式：文字轉影像與參考影像編輯
    - 參考輸入：一個 `image` 或最多五個 `images`
    - 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 數量：最多 4 張影像

    OpenClaw 向 xAI 要求 `b64_json` 影像回應，以便生成的媒體可以透過一般頻道附件路徑儲存與傳遞。本機參考影像會轉換為資料 URL；遠端 `http(s)` 參考則會直接傳遞。

    若要使用 xAI 作為預設影像供應商：

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
    xAI 文件中也記載了 `quality`、`mask`、`user` 以及其他原生長寬比，
    例如 `1:2`、`2:1`、`9:20` 與 `20:9`。OpenClaw 目前僅轉發共用的跨供應商影像控制項；不支援的原生專屬設定項刻意不透過 `image_generate` 公開。
    </Note>

  </Accordion>

  <Accordion title="Text-to-speech">
    內建的 `xai` 外掛程式透過共用的 `tts`
    提供者介面註冊文字轉語音。

    - 語音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 預設語音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 語言：BCP-47 代碼或 `auto`
    - 速度：提供者原生速度覆寫
    - 不支援原生 Opus 語音備忘錄格式

    若要將 xAI 用作預設的 TTS 提供者：

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
    OpenClaw 使用 xAI 的批次 `/v1/tts` 端點。xAI 也透過 WebSocket 提供串流 TTS，但 OpenClaw 語音提供者合約目前會在回覆傳遞之前預期完整的音訊緩衝區。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    內建的 `xai` 外掛程式透過 OpenClaw 的媒體理解轉錄介面註冊批次語音轉文字。

    - 預設模型：`grok-stt`
    - 端點：xAI REST `/v1/stt`
    - 輸入路徑：多部分音訊檔案上傳
    - OpenClaw 在使用 `tools.media.audio` 的任何地方都提供支援，包括 Discord 語音頻道區段和頻道音訊附件

    若要針對傳入音訊轉錄強制使用 xAI：

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

    語言可以透過共用的音訊媒體設定或個別呼叫的轉錄要求來提供。共用的 OpenClaw 介面接受提示提示，但 xAI REST STT 整合僅會轉發檔案、模型和語言，因為這些乾淨地對應至目前公開的 xAI 端點。

  </Accordion>

  <Accordion title="串流語音轉文字">
    內建的 `xai` 外掛程式也註冊了一個即時轉錄提供者
    以用於即時語音通訊音訊。

    - 端點：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 預設編碼：`mulaw`
    - 預設取樣率：`8000`
    - 預設端點偵測：`800ms`
    - 中間轉錄結果：預設啟用

    語音通訊的 Twilio 媒體串流會發送 G.711 µ-law 音訊幀，因此
    xAI 提供者可以直接轉發這些幀而無需轉碼：

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
    鍵值為 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或
    `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此串流提供者適用於語音通訊的即時轉錄路徑。
    Discord 語音目前會錄製短片段，並改用批次
    `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    內建的 xAI 外掛程式將 `x_search` 公開為 OpenClaw 工具，用於透過 Grok
    搜尋 X（前稱 Twitter）內容。

    設定路徑：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 啟用或停用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用於 x_search 請求的模型     |
    | `inlineCitations`  | boolean | —                  | 在結果中包含內文引用  |
    | `maxTurns`         | number  | —                  | 最大對話輪次           |
    | `timeoutSeconds`   | number  | —                  | 請求逾時間（秒）           |
    | `cacheTtlMinutes`  | number  | —                  | 快取存活時間（分鐘）        |

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

  <Accordion title="程式碼執行配置">
    內建的 xAI 外掛程式將 `code_execution` 公開為 OpenClaw 工具，用於
    在 xAI 的沙箱環境中進行遠端程式碼執行。

    設定路徑：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 啟用或停用程式碼執行  |
    | `model`           | string  | `grok-4-1-fast`    | 用於程式碼執行請求的模型   |
    | `maxTurns`        | number  | —                  | 最大對話輪次               |
    | `timeoutSeconds`  | number  | —                  | 請求逾時間（秒）               |

    <Note>
    這是遠端 xAI 沙箱執行，而非本機 [`exec`](/zh-Hant/tools/exec)。
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
  - 目前僅支援 API 金鑰驗證。OpenClaw 尚未支援 xAI OAuth 或裝置代碼流程。 - 標準的 xAI 提供者路徑不支援 `grok-4.20-multi-agent-experimental-beta-0304`，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。 - xAI Realtime voice 尚未註冊為 OpenClaw 提供者。它需要與批次 STT 或串流轉錄不同的雙向語音會話契約。 - xAI 圖片 `quality`、圖片 `mask` 以及額外的僅限原生比例，在共享的 `image_generate`
  工具具有對應的跨提供者控制之前，不會公開。
</Accordion>

  <Accordion title="進階備註">
    - OpenClaw 會在共享的執行器路徑上自動套用 xAI 特定的工具架構和工具呼叫相容性修復。
    - 原生 xAI 請求預設 `tool_stream: true`。將 `agents.defaults.models["xai/<model>"].params.tool_stream` 設定為 `false` 即可停用它。
    - 捆綁的 xAI 包裝器會在發送原生 xAI 請求之前，移除不支援的嚴格工具架構旗標和推理承載金鑰。
    - `web_search`、`x_search` 和 `code_execution` 被公開為 OpenClaw 工具。OpenClaw 會在每個工具請求中啟用其所需的特定 xAI 內建功能，而不是將所有原生工具附加到每個聊天輪次。
    - `x_search` 和 `code_execution` 是由捆綁的 xAI 外掛程式所擁有，而不是硬編碼到核心模型執行階段中。
    - `code_execution` 是遠端 xAI 沙箱執行，而不是本機 [`exec`](/zh-Hant/tools/exec)。
  </Accordion>
</AccordionGroup>

## 即時測試

xAI 媒體路徑由單元測試和選用的即時測試套件所涵蓋。即時指令會從您的登入 shell 載入機密資訊（包括 `~/.profile`），然後再探測 `XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

提供商專用的即時檔案會綜合標準的 TTS、適合電話的 PCM
TTS、透過 xAI 批次 STT 進行音訊轉錄、透過 xAI
即時 STT 串流相同的 PCM、生成文字轉圖片輸出，以及編輯參考圖片。
共享的圖片即時檔案會透過 OpenClaw 的
執行時期選取、故障轉移、標準化和媒體附加路徑來驗證相同的 xAI 提供商。

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和故障轉移行為。
  </Card>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共享的視訊工具參數和提供商選擇。
  </Card>
  <Card title="所有提供商" href="/zh-Hant/providers/index" icon="grid-2">
    更廣泛的提供商概覽。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題和修正方法。
  </Card>
</CardGroup>
