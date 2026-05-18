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
  <Step title="選擇驗證方式">
    使用來自 [xAI console](https://console.x.ai/) 的 API 金鑰或
    具備 SuperGrok 訂閱的 xAI Grok OAuth。
  </Step>
  <Step title="登入">
    設定 `XAI_API_KEY`，執行 API 金鑰精靈，或啟動 OAuth 流程：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    openclaw onboard --auth-choice xai-oauth
    openclaw models auth login --provider xai --method oauth
    ```

  </Step>
  <Step title="Pick a model">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw 使用 xAI Responses API 作為內建的 xAI 傳輸方式。來自 `openclaw onboard --auth-choice xai-api-key` 或 `openclaw onboard --auth-choice xai-oauth` 的相同憑證也可用於支援一流的 `x_search`、遠端 `code_execution` 以及 xAI 影片/影像生成。 語音和轉錄目前需要 `XAI_API_KEY` 或提供者設定。 `XAI_API_KEY` 或外掛程式網頁搜尋設定也可以支援 Grok 支援的 `web_search`。 如果您將 xAI 金鑰儲存在
  `plugins.entries.xai.config.webSearch.apiKey` 下， 內建的 xAI 模型提供者也會將該金鑰作為後備重複使用。 設定 `plugins.entries.xai.config.webSearch.baseUrl` 以透過操作員 xAI Responses 代理路由 Grok `web_search` 以及，依預設，`x_search`。 `code_execution` 調整位於 `plugins.entries.xai.config.codeExecution` 之下。
</Note>

## 內建目錄

OpenClaw 內建了目前的 xAI 聊天模型，並在模型選擇器中依新舊順序排列：

| 系列           | 模型 ID                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| Grok 4.3       | `grok-4.3`                                                                |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`， `grok-4.20-beta-latest-non-reasoning` |

此外掛程式仍會針對現有設定向前解析較舊的 Grok 3、Grok 4、Grok 4 Fast、Grok 4.1
Fast 和 Grok Code 代碼，但 OpenClaw 不再在可選目錄中顯示
這些已淘汰的上游代碼。

<Tip>除非您明確需要 Grok 4.20 beta 別名，否則請針對新的聊天和程式設計工作負載使用 `grok-4.3`。</Tip>

## OpenClaw 功能覆蓋範圍

內建的外掛程式將 xAI 目前的公開 API 介面對應到 OpenClaw 的共享
提供者和工具合約。不符合共享合約的功能
（例如串流 TTS 和即時語音）不會公開 - 請參閱下
表。

| xAI 功能           | OpenClaw 介面                          | 狀態                                               |
| ------------------ | -------------------------------------- | -------------------------------------------------- |
| 聊天 / 回應        | `xai/<model>` 模型提供者               | 是                                                 |
| 伺服器端網路搜尋   | `web_search` 提供者 `grok`             | 是                                                 |
| 伺服器端 X 搜尋    | `x_search` 工具                        | 是                                                 |
| 伺服器端程式碼執行 | `code_execution` 工具                  | 是                                                 |
| 圖片               | `image_generate`                       | 是                                                 |
| 影片               | `video_generate`                       | 是                                                 |
| 批次文字轉語音     | `messages.tts.provider: "xai"` / `tts` | 是                                                 |
| 串流 TTS           | -                                      | 未公開；OpenClaw 的 TTS 合約會回傳完整的音訊緩衝區 |
| 批次語音轉文字     | `tools.media.audio` / 媒體理解         | 是                                                 |
| 串流語音轉文字     | 語音通話 `streaming.provider: "xai"`   | 是                                                 |
| 即時語音           | -                                      | 尚未公開；不同的會議/WebSocket 合約                |
| 檔案 / 批次        | 僅通用模型 API 相容性                  | 非 OpenClaw 的一等工具                             |

<Note>OpenClaw 使用 xAI 的 REST 圖片/影片/TTS/STT API 進行媒體生成、 語音和批次轉錄，使用 xAI 的串流 STT WebSocket 進行即時 語音通話轉錄，並使用 Responses API 進行模型、搜尋和 程式碼執行工具。需要不同 OpenClaw 合約的功能，例如 即時語音會議，在此處記錄為上游功能，而非 隱藏的外掛行為。</Note>

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

舊版別名仍會正規化為標準的隨附 ID：

| 舊版別名                  | 標準 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="網頁搜尋">
    內建的 `grok` 網頁搜尋供應商可以使用 `XAI_API_KEY` 或外掛程式
    網頁搜尋金鑰：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="影片生成">
    內建的 `xai` 外掛程式會透過共享的 `video_generate` 工具註冊影片生成功能。

    - 預設影片模型：`xai/grok-imagine-video`
    - 模式：文字轉影片、圖片轉影片、參考圖片生成、遠端
      影片編輯以及遠端影片延伸
    - 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 解析度：`480P`、`720P`
    - 持續時間：生成/圖片轉影片為 1-15 秒，使用 `reference_image` 角色時為 1-10 秒，
      延伸則為 2-10 秒
    - 參考圖片生成：將 `imageRoles` 設定為 `reference_image` 針對
      每個提供的圖片；xAI 最多接受 7 張這類圖片

    <Warning>
    不接受本機影片緩衝區。請使用遠端 `http(s)` URL 作為
    影片編輯/延伸的輸入。圖片轉影片接受本機圖片緩衝區，因為
    OpenClaw 可以將其編碼為 xAI 的資料 URL。
    </Warning>

    若要將 xAI 設為預設影片供應商：

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
    請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共享工具參數、
    供應商選擇與故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="圖像生成">
    內建的 `xai` 外掛程式透過共享的
    `image_generate` 工具註冊圖像生成功能。

    - 預設圖像模型：`xai/grok-imagine-image`
    - 額外模型：`xai/grok-imagine-image-quality`
    - 模式：文生圖 和參考圖像編輯
    - 參考輸入：一個 `image` 或最多五個 `images`
    - 寬高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 數量：最多 4 張圖像

    OpenClaw 會向 xAI 請求 `b64_json` 圖像回應，以便生成的媒體可以
    透過正常的頻道附件路徑儲存和傳遞。本機
    參考圖像會轉換為 data URL；遠端 `http(s)` 參考則會
    直接傳遞。

    若要將 xAI 作為預設圖像供應商：

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
    xAI 亦記錄了 `quality`、`mask`、`user` 以及其他原生比例，
    例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前僅轉發
    共享的跨供應商圖像控制項；不支援的原生控制項
    故意不會透過 `image_generate` 公開。
    </Note>

  </Accordion>

  <Accordion title="Text-to-speech">
    隨附的 `xai` 外掛程式透過共享的 `tts` 提供者介面註冊文字轉語音。

    - 語音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 預設語音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 語言：BCP-47 代碼或 `auto`
    - 速度：提供者原生的速度覆寫
    - 不支援原生的 Opus 語音備忘錄格式

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
    OpenClaw 使用 xAI 的批次 `/v1/tts` 端點。xAI 也透過 WebSocket 提供串流 TTS，但 OpenClaw 語音提供者合約目前需要在回覆傳遞之前取得完整的音訊緩衝區。
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    隨附的 `xai` 外掛程式透過 OpenClaw 的媒體理解轉錄介面註冊批次語音轉文字。

    - 預設模型：`grok-stt`
    - 端點：xAI REST `/v1/stt`
    - 輸入路徑：多部分音訊檔案上傳
    - OpenClaw 在任何使用 `tools.media.audio` 的 inbound 音訊轉錄處皆提供支援，包括 Discord 語音頻道片段和頻道音訊附件

    若要針對 inbound 音訊轉錄強制使用 xAI：

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

    語言可以透過共享的音訊媒體設定或單次呼叫轉錄請求來提供。共享的 OpenClaw 介面接受提示提示，但 xAI REST STT 整合僅轉發檔案、模型和語言，因為這些能對應至目前公開的 xAI 端點。

  </Accordion>

  <Accordion title="串流語音轉文字">
    捆綁的 `xai` 外掛程式也註冊了一個即時轉錄提供者，
    用於即時語音通訊音訊。

    - 端點：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 預設編碼：`mulaw`
    - 預設取樣率：`8000`
    - 預設端點偵測：`800ms`
    - 臨時轉錄：預設啟用

    語音通訊的 Twilio 媒體串流會傳送 G.711 µ-law 音訊幀，因此
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
    `plugins.entries.voice-call.config.streaming.providers.xai`。支援的
    索引鍵包括 `apiKey`、`baseUrl`、`sampleRate`、`encoding`（`pcm`、`mulaw` 或
    `alaw`）、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此串流提供者是用於語音通訊的即時轉錄路徑。
    Discord 語音目前會錄製短片段，並改用批次
    `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="x_search 組態">
    內建的 xAI 外掛將 `x_search` 公開為一個 OpenClaw 工具，用於透過 Grok 搜尋
    X (前身為 Twitter) 的內容。

    組態路徑：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | 啟用或停用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用於 x_search 請求的模型     |
    | `baseUrl`          | string  | -                  | xAI 回應的基礎 URL 覆寫      |
    | `inlineCitations`  | boolean | -                  | 在結果中包含內文引文  |
    | `maxTurns`         | number  | -                  | 最大對話輪次           |
    | `timeoutSeconds`   | number  | -                  | 請求逾時時間（秒）           |
    | `cacheTtlMinutes`  | number  | -                  | 快取存活時間（分鐘）        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                baseUrl: "https://api.x.ai/v1",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="程式碼執行組態">
    內建的 xAI 外掛將 `code_execution` 公開為一個 OpenClaw 工具，用於
    在 xAI 的沙箱環境中進行遠端程式碼執行。

    組態路徑：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 啟用或停用程式碼執行  |
    | `model`           | string  | `grok-4-1-fast`    | 用於程式碼執行請求的模型   |
    | `maxTurns`        | number  | -                  | 最大對話輪次               |
    | `timeoutSeconds`  | number  | -                  | 請求逾時時間（秒）               |

    <Note>
    這是 xAI 的遠端沙箱執行，而非本地的 [`exec`](/zh-Hant/tools/exec)。
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
  - xAI 驗證可以使用 API 金鑰、環境變數、外掛程式設定備援，或搭配 SuperGrok 訂閱的 xAI Grok OAuth。OAuth 在 `127.0.0.1:56121` 上使用本機回呼；對於遠端主機，請在開啟登入 URL 之前轉發該連接埠。 - 在標準的 xAI 提供者路徑上不支援 `grok-4.20-multi-agent-experimental-beta-0304`，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。 - xAI Realtime voice 尚未註冊為 OpenClaw 提供者。與批次 STT
  或串流轉錄相比，它需要不同的雙向語音工作階段合約。 - 在共享的 `image_generate` 工具具有相應的跨提供者控制項之前，不會公開 xAI 圖像 `quality`、圖像 `mask` 以及額外的僅限原生的長寬比。
</Accordion>

  <Accordion title="進階說明">
    - OpenClaw 會在共享的執行器路徑上自動套用 xAI 特定的工具架構和工具呼叫相容性修正。
    - 原生 xAI 請求預設 `tool_stream: true`。將 `agents.defaults.models["xai/<model>"].params.tool_stream` 設定為 `false` 即可停用它。
    - 捆綁的 xAI 包裝器會在發送原生 xAI 請求之前，移除不支援的嚴格工具架構旗標和推理負載金鑰。
    - `web_search`、`x_search` 和 `code_execution` 被公開為 OpenClaw 工具。OpenClaw 會在每個工具請求中啟用其所需的特定 xAI 內建功能，而不是將所有原生工具附加到每個對話輪次。
    - Grok `web_search` 會讀取 `plugins.entries.xai.config.webSearch.baseUrl`。`x_search` 會讀取 `plugins.entries.xai.config.xSearch.baseUrl`，然後回退至 Grok 網頁搜尋基底 URL。
    - `x_search` 和 `code_execution` 是由捆綁的 xAI 外掛程式所擁有，而非硬編碼至核心模型執行階段中。
    - `code_execution` 是遠端 xAI 沙箱執行，而非本機 [`exec`](/zh-Hant/tools/exec)。
  </Accordion>
</AccordionGroup>

## 即時測試

xAI 媒體路徑由單元測試和選用即時測試套件覆蓋。在執行即時探測之前，請在程序環境中匯出
`XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

提供商專用的即時檔案會合成一般的 TTS、適合電話的 PCM TTS，透過 xAI 批次 STT 轉錄音訊，透過 xAI 即時 STT 串流相同的 PCM，生成文字轉圖片輸出，並編輯參考圖片。共用圖片即時檔案會透過 OpenClaw 的執行時選擇、備援、正規化和媒體附件路徑來驗證相同的 xAI 提供商。

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和故障轉移行為。
  </Card>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用影片工具參數與提供商選擇。
  </Card>
  <Card title="All providers" href="/zh-Hant/providers/index" icon="grid-2">
    更廣泛的提供商概覽。
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與修復方法。
  </Card>
</CardGroup>
