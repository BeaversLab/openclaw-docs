---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw 附帶了一個捆綁的 `xai` 提供者插件，用於 Grok 模型。對於大多數
用戶而言，推薦的路徑是使用具備資格的 SuperGrok 或 X Premium
訂閱的 Grok OAuth。OpenClaw 堅持本地優先：網關、配置、路由和
工具在您的機器上運行，而 Grok 模型請求通過 xAI 進行身份驗證
併發送到 xAI 的 API。

OAuth 不需要 xAI API 金鑰，也不需要 Grok Build
應用程式。由於 OpenClaw 使用
xAI 的共享 OAuth 客戶端，xAI 可能仍會在同意畫面上顯示 Grok Build。

## 選擇您的設定路徑

使用符合您的 OpenClaw 安裝狀態的路徑：

<Steps>
  <Step title="新的 OpenClaw 安裝">
    在設定新的本機網關時，執行包含守護程式安裝的入門流程，然後在模型/授權步驟中選擇 xAI/Grok OAuth 選項：

    ```bash
    openclaw onboard --install-daemon
    ```

    在 VPS 或透過 SSH 連線時，請在入門流程中使用 device-code：

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    OAuth 不需要 xAI API 金鑰。OpenClaw 不需要 Grok
    Build 應用程式。xAI 可能仍會將同意應用程式標記為 Grok Build，因為
    OpenClaw 使用 xAI 的共享 OAuth 客戶端。

  </Step>
  <Step title="現有的 OpenClaw 安裝">
    如果 OpenClaw 已經配置過，只需登入 xAI。不要為了連接 Grok 而重新執行完整的
    入門流程或重新安裝守護程式：

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    當網關透過 SSH、Docker 或
    VPS 執行，且本機瀏覽器回調不便時，請改用 device-code 流程：

    ```bash
    openclaw models auth login --provider xai --device-code
    ```

    若要在登入後將 Grok 設為預設模型，請單獨應用：

    ```bash
    openclaw models set xai/grok-4.3
    ```

    僅當您有意變更網關、
    守護程式、通道、工作區或其他設定選擇時，才重新執行完整的入門流程。

  </Step>
  <Step title="API 金鑰路徑">
    API 金鑰設定仍然適用於 xAI Console 金鑰，以及需要
    金鑰支援的提供者配置的媒體介面：

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

  </Step>
  <Step title="選擇模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw 使用 xAI Responses API 作為內建的 xAI 傳輸。來自 `openclaw models auth login --provider xai --method oauth`、 `openclaw models auth login --provider xai --device-code` 或 `openclaw models auth login --provider xai --method api-key` 的相同憑證也可以支援 一流的 `x_search`、遠端 `code_execution` 和 xAI 圖片/影片生成。 語音和轉錄目前需要 `XAI_API_KEY` 或提供者設定。 `XAI_API_KEY`
  或外掛程式網頁搜尋設定也可以支援 由 Grok 支援的 `web_search`。 如果您將 xAI 金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下， 內建的 xAI 模型提供者也會重複使用該金鑰作為備案。 設定 `plugins.entries.xai.config.webSearch.baseUrl` 以透過操作員 xAI Responses 代理程式路由 Grok `web_search` 以及預設的 `x_search`。 `code_execution` 調整位於 `plugins.entries.xai.config.codeExecution` 下。
</Note>

## OAuth 疑難排解

- 如果瀏覽器 OAuth 無法連線至 `127.0.0.1:56121`，請使用
  `openclaw models auth login --provider xai --device-code`。
- 如果登入成功但 Grok 不是預設模型，請執行
  `openclaw models set xai/grok-4.3`。
- 若要檢查已儲存的 xAI 認證設定檔，請執行：

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI 決定哪些帳戶可以接收 OAuth API 權杖。如果帳戶不
  符合資格，請嘗試使用 API 金鑰方式，或檢查 xAI 端的訂閱狀態。

<Tip>當從 SSH、Docker 或 VPS 登入時，請使用 `xai-device-code`。OpenClaw 會列印 xAI URL 和簡短代碼；在遠端程序向 xAI 輪詢完成權杖交換的同時， 在任何本機瀏覽器中完成登入。</Tip>

## 內建目錄

OpenClaw 開箱即包含最新的 xAI 聊天模型，在模型選擇器中
依最新到最舊排序：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

該外掛程式仍會針對現有設定向前解析較舊的 Grok 3、Grok 4、Grok 4 Fast、Grok 4.1
Fast 和 Grok Code 代碼，但 OpenClaw 不再在可選目錄中顯示
那些已退役的上游代碼。

<Tip>除非您明確需要 Grok 4.20 beta 別名，否則請在新聊天和編碼工作負載中使用 `grok-4.3`。</Tip>

## OpenClaw 功能覆蓋範圍

內建的插件將 xAI 目前的公開 API 介面對應到 OpenClaw 的共享供應商和工具合約。不符合共享合約的功能（例如串流 TTS 和即時語音）不會公開——請參閱下表。

| xAI 功能           | OpenClaw 介面                          | 狀態                                               |
| ------------------ | -------------------------------------- | -------------------------------------------------- |
| 聊天 / 回應        | `xai/<model>` 模型供應商               | 是                                                 |
| 伺服器端網路搜尋   | `web_search` 供應商 `grok`             | 是                                                 |
| 伺服器端 X 搜尋    | `x_search` 工具                        | 是                                                 |
| 伺服器端程式碼執行 | `code_execution` 工具                  | 是                                                 |
| 圖片               | `image_generate`                       | 是                                                 |
| 影片               | `video_generate`                       | 是                                                 |
| 批次文字轉語音     | `messages.tts.provider: "xai"` / `tts` | 是                                                 |
| 串流文字轉語音     | -                                      | 未公開；OpenClaw 的 TTS 合約會傳回完整的音訊緩衝區 |
| 批次語音轉文字     | `tools.media.audio` / 媒體理解         | 是                                                 |
| 串流語音轉文字     | 語音通話 `streaming.provider: "xai"`   | 是                                                 |
| 即時語音           | -                                      | 尚未公開；使用不同的會話/WebSocket 合約            |
| 檔案 / 批次        | 僅支援通用模型 API 相容性              | 並非 OpenClaw 的一等工具                           |

<Note>OpenClaw 使用 xAI 的 REST 圖片/影片/TTS/STT API 進行媒體生成、語音和批次轉錄，使用 xAI 的串流 STT WebSocket 進行即時語音通話轉錄，並使用 Responses API 作為模型、搜尋和程式碼執行工具。需要不同 OpenClaw 合約的功能（例如即時語音會話）在此記錄為上游功能，而非隱藏的插件行為。</Note>

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
  <Accordion title="網路搜尋">
    捆綁的 `grok` 網路搜尋提供者可以使用 `XAI_API_KEY` 或外掛程式
    網路搜尋金鑰：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="影片生成">
    捆綁的 `xai` 外掛程式透過共享的
    `video_generate` 工具註冊影片生成。

    - 預設影片模型：`xai/grok-imagine-video`
    - 模式：文字轉影片、圖片轉影片、參考圖片生成、遠端
      影片編輯以及遠端影片延伸
    - 寬高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`
    - 解析度：`480P`、`720P`
    - 持續時間：生成/圖片轉影片為 1-15 秒，使用
      `reference_image` 角色時為 1-10 秒，延伸則為 2-10 秒
    - 參考圖片生成：將每個提供的圖片的 `imageRoles` 設定為 `reference_image`；xAI 最多接受 7 張此類圖片

    <Warning>
    不接受本機影片緩衝區。請使用遠端 `http(s)` URL 作為
    影片編輯/延伸輸入。圖片轉影片接受本機圖片緩衝區，因為
    OpenClaw 可以將其編碼為 xAI 的資料 URL。
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
    參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共享工具參數、
    提供者選取和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="圖像生成">
    內建的 `xai` 外掛程式透過共用的 `image_generate` 工具註冊圖像生成功能。

    - 預設圖像模型：`xai/grok-imagine-image`
    - 其他模型：`xai/grok-imagine-image-quality`
    - 模式：文字生圖與參考圖像編輯
    - 參考輸入：一個 `image` 或最多五個 `images`
    - 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 數量：最多 4 張圖像

    OpenClaw 會向 xAI 請求 `b64_json` 圖像回應，以便生成的媒體可以儲存並透過正常的通道附件路徑傳遞。本機參考圖像會轉換為 data URL；遠端 `http(s)` 參考則會直接傳遞。

    若要將 xAI 設為預設圖像提供者：

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
    xAI 文件也記載了 `quality`、`mask`、`user`，以及其他原生比例，例如 `1:2`、`2:1`、`9:20` 和 `20:9`。OpenClaw 目前僅轉發跨提供者共用的圖像控制項；不支援的原生特定選項刻意不透過 `image_generate` 公開。
    </Note>

  </Accordion>

  <Accordion title="文字轉語音">
    隨附的 `xai` 外掛程式透過共用的 `tts`
    提供者介面註冊文字轉語音功能。

    - 語音：`eve`、`ara`、`rex`、`sal`、`leo`、`una`
    - 預設語音：`eve`
    - 格式：`mp3`、`wav`、`pcm`、`mulaw`、`alaw`
    - 語言：BCP-47 代碼或 `auto`
    - 速度：提供者原生的速度覆寫
    - 不支援原生的 Opus 語音註記格式

    若要將 xAI 作為預設的 TTS 提供者：

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
    OpenClaw 使用 xAI 的批次 `/v1/tts` 端點。xAI 也透過 WebSocket 提供串流 TTS，
    但 OpenClaw 語音提供者合約目前要求在回覆傳遞前必須有完整的音訊緩衝區。
    </Note>

  </Accordion>

  <Accordion title="語音轉文字">
    隨附的 `xai` 外掛程式透過 OpenClaw 的
    媒體理解轉錄介面註冊批次語音轉文字功能。

    - 預設模型：`grok-stt`
    - 端點：xAI REST `/v1/stt`
    - 輸入路徑：多部分音訊檔案上傳
    - OpenClaw 在任何使用 `tools.media.audio` 的
      传入音訊轉錄場景中皆提供支援，包括 Discord 語音頻道片段和
      頻道音訊附件

    若要針對传入音訊轉錄強制使用 xAI：

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

    語言可以透過共用的音訊媒體設定或每次呼叫的
    轉錄請求提供。共用的 OpenClaw 介面接受提示提示，
    但 xAI REST STT 整合僅會轉發檔案、模型和
    語言，因為這些參數能清晰對應到目前的公開 xAI 端點。

  </Accordion>

  <Accordion title="串流語音轉文字">
    內建的 `xai` 外掛程式也會為即時語音通話音訊註冊一個即時轉錄提供者。

    - 端點：xAI WebSocket `wss://api.x.ai/v1/stt`
    - 預設編碼：`mulaw`
    - 預設取樣率：`8000`
    - 預設端點偵測：`800ms`
    - 暫時性逐字稿：預設啟用

    Voice Call 的 Twilio 媒體串流會傳送 G.711 µ-law 音訊幀，因此
    xAI 提供者可以直接轉送這些音訊幀而無需轉碼：

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

    提供者專屬的設定位於
    `plugins.entries.voice-call.config.streaming.providers.xai` 之下。支援的
    索引鍵包括 `apiKey`、`baseUrl`、`sampleRate`、`encoding` (`pcm`、`mulaw` 或
    `alaw`)、`interimResults`、`endpointingMs` 和 `language`。

    <Note>
    此串流提供者適用於 Voice Call 的即時轉錄路徑。
    Discord 語音目前會錄製短片段，並改用批次
    `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    內建的 xAI 外掛將 `x_search` 作為一個 OpenClaw 工具公開，用於透過 Grok 搜尋
    X (前 Twitter) 的內容。

    設定路徑：`plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | 啟用或停用 x_search                 |
    | `model`            | string  | `grok-4-1-fast`    | 用於 x_search 請求的模型            |
    | `baseUrl`          | string  | -                  | xAI Responses 基礎 URL 覆寫         |
    | `inlineCitations`  | boolean | -                  | 在結果中包含內嵌引用                |
    | `maxTurns`         | number  | -                  | 最大對話輪次                        |
    | `timeoutSeconds`   | number  | -                  | 請求逾時時間（秒）                   |
    | `cacheTtlMinutes`  | number  | -                  | 快取存活時間（分鐘）                 |

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

  <Accordion title="Code execution configuration">
    內建的 xAI 外掛將 `code_execution` 作為一個 OpenClaw 工具公開，用於
    在 xAI 的沙箱環境中執行遠端程式碼。

    設定路徑：`plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 啟用或停用程式碼執行 |
    | `model`           | string  | `grok-4-1-fast`    | 用於程式碼執行請求的模型               |
    | `maxTurns`        | number  | -                  | 最大對話輪次                           |
    | `timeoutSeconds`  | number  | -                  | 請求逾時時間（秒）                      |

    <Note>
    這是 xAI 遠端沙箱執行，而非本地的 [`exec`](/zh-Hant/tools/exec)。
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
  - xAI 驗證可以使用 API 金鑰、環境變數、外掛程式設定備援、 瀏覽器 OAuth，或具備合格 xAI 帳戶的裝置代碼 OAuth。瀏覽器 OAuth 使用 `127.0.0.1:56121` 上的本地回調；對於遠端主機，請使用 `xai-device-code`，除非您想在開啟登入 URL 之前轉發該連接埠。 xAI 決定哪些帳戶可以接收 OAuth API 權杖，且 同意頁面可能會顯示 Grok Build，即使 OpenClaw 並不需要 Grok Build 應用程式。 -
  `grok-4.20-multi-agent-experimental-beta-0304` 在標準 xAI 提供者路徑上不受支援，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。 - xAI Realtime 語音尚未註冊為 OpenClaw 提供者。它 需要與批次 STT 或 串流轉錄不同的雙向語音會話合約。 - xAI 圖片 `quality`、圖片 `mask` 以及額外的僅原生比例，在共享的 `image_generate` 工具具備對應的 跨提供者控制項之前不會公開。
</Accordion>

  <Accordion title="進階說明">
    - OpenClaw 會在共享的 runner 路徑上，自動套用 xAI 專屬的工具架構 (tool-schema) 和工具呼叫相容性修正。
    - 原生 xAI 請求預設為 `tool_stream: true`。將
      `agents.defaults.models["xai/<model>"].params.tool_stream` 設定為 `false` 即可
      停用它。
    - 內建的 xAI 包裝器在發送原生 xAI 請求之前，會移除不支援的嚴格工具架構標誌和推理 payload 金鑰。
    - `web_search`、`x_search` 和 `code_execution` 會以 OpenClaw
      工具的形式呈現。OpenClaw 會在每個工具請求中啟用所需的特定 xAI 內建功能，而不是將所有原生工具附加到每個對話輪次。
    - Grok `web_search` 會讀取 `plugins.entries.xai.config.webSearch.baseUrl`。
      `x_search` 會讀取 `plugins.entries.xai.config.xSearch.baseUrl`，然後
      再回退到 Grok 網頁搜尋的基礎 URL。
    - `x_search` 和 `code_execution` 是由內建的 xAI 外掛程式所擁有，而不是
      硬編碼到核心模型執行時期中。
    - `code_execution` 是遠端 xAI 沙箱執行，而非本機
      [`exec`](/zh-Hant/tools/exec)。
  </Accordion>
</AccordionGroup>

## 即時測試

xAI 媒體路徑涵蓋在單元測試和選用即時套件中。在執行即時探測之前，請在程序環境中匯出
`XAI_API_KEY`。

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

供應商專屬的即時檔案會合成一般的 TTS、電話相容的 PCM
TTS，透過 xAI 批次 STT 轉錄音訊，透過 xAI 即時 STT 串流相同的 PCM，產生文字轉圖片輸出，並編輯參考圖片。共享的圖片即時檔案會透過 OpenClaw 的執行時期選擇、回退、正規化和媒體附件路徑來驗證相同的 xAI 供應商。

## 相關資訊

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與供應商選擇。
  </Card>
  <Card title="所有供應商" href="/zh-Hant/providers/index" icon="grid-2">
    更廣泛的供應商概覽。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與解決方法。
  </Card>
</CardGroup>
