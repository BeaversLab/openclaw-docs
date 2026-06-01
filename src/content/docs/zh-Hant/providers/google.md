---
summary: "Google Gemini 設定 (API 金鑰 + OAuth、圖片生成、媒體理解、TTS、網路搜尋)"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

Google 外掛程式透過 Google AI Studio 提供對 Gemini 模型的存取，以及影像生成、媒體理解 (影像/音訊/視訊)、文字轉語音，以及透過 Gemini Grounding 進行的網路搜尋。

- 提供者：`google`
- 驗證：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API
- 執行時期選項：provider/model `agentRuntime.id: "google-gemini-cli"`
  重複使用 Gemini CLI OAuth，同時將模型參照保持為 `google/*` 的標準格式。

## 開始使用

選擇您偏好的驗證方法並依照設定步驟進行。

<Tabs>
  <Tab title="API 金鑰">
    **最適用於：** 透過 Google AI Studio 進行標準的 Gemini API 存取。

    <Steps>
      <Step title="執行入門設定">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接傳遞金鑰：

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    環境變數 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均可被接受。請使用您已經設定的那一個。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **最適用於：** 透過 PKCE OAuth 重複使用現有的 Gemini CLI 登入，而非使用獨立的 API 金鑰。

    <Warning>
    `google-gemini-cli` 提供者是非官方整合。部分使用者
    回報以這種方式使用 OAuth 時帳號會受到限制。使用風險請自行承擔。
    </Warning>

    <Steps>
      <Step title="安裝 Gemini CLI">
        本地 `gemini` 指令必須可在 `PATH` 上使用。

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 支援 Homebrew 安裝和全域 npm 安裝，包括
        常見的 Windows/npm 配置。
      </Step>
      <Step title="透過 OAuth 登入">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - 預設模型：`google/gemini-3.1-pro-preview`
    - 執行環境：`google-gemini-cli`
    - 別名：`gemini-cli`

    Gemini 3.1 Pro 的 Gemini API 模型 ID 是 `gemini-3.1-pro-preview`。OpenClaw 接受較短的 `google/gemini-3.1-pro` 作為便利別名，並在呼叫提供者之前將其正規化。

    **環境變數：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (或是 `GEMINI_CLI_*` 變體。)

    <Note>
    如果登入後 Gemini CLI OAuth 請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID` 並重試。
    </Note>

    <Note>
    如果在瀏覽器流程開始前登入失敗，請確保本地 `gemini`
    指令已安裝並且在 `PATH` 中。
    </Note>

    `google-gemini-cli/*` 模型參照是舊版相容性別名。當需要
    本地 Gemini CLI 執行時，新設定應該使用 `google/*` 模型參照加上 `google-gemini-cli`
    執行環境。

  </Tab>
</Tabs>

## 功能

| 功能                 | 支援                         |
| -------------------- | ---------------------------- |
| 聊天完成             | 是                           |
| 圖像生成             | 是                           |
| 音樂生成             | 是                           |
| 文字轉語音           | 是                           |
| 即時語音             | 是 (Google Live API)         |
| 圖像理解             | 是                           |
| 音訊轉錄             | 是                           |
| 影片理解             | 是                           |
| 網路搜尋 (Grounding) | 是                           |
| 思考/推理            | 是 (Gemini 2.5+ / Gemini 3+) |
| Gemma 4 模型         | 是                           |

## 網路搜尋

內建的 `gemini` 網路搜尋提供者使用 Gemini Google Search grounding。
在 `plugins.entries.google.config.webSearch` 下設定專用的搜尋金鑰，
或讓它在 `GEMINI_API_KEY` 之後重複使用 `models.providers.google.apiKey`：

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // falls back to models.providers.google.baseUrl
            model: "gemini-2.5-flash",
          },
        },
      },
    },
  },
}
```

憑證優先順序為專用的 `webSearch.apiKey`，然後是 `GEMINI_API_KEY`，
接著是 `models.providers.google.apiKey`。`webSearch.baseUrl` 是選用的，
並且存在於運營商代理或相容的 Gemini API 端點中；當省略時，
Gemini 網路搜尋會重複使用 `models.providers.google.baseUrl`。請參閱
[Gemini search](/zh-Hant/tools/gemini-search) 以了解供應商特定的工具行為。

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而非 `thinkingBudget`。OpenClaw 會將
Gemini 3、Gemini 3.1 和 `gemini-*-latest` 別名推理控制對應到
`thinkingLevel`，因此預設/低延遲執行不會傳送已停用的
`thinkingBudget` 數值。

`/think adaptive` 保留 Google 的動態思考語意，而不是選擇
固定的 OpenClaw 等級。Gemini 3 和 Gemini 3.1 省略固定的 `thinkingLevel`，以便
Google 可以選擇等級；Gemini 2.5 會傳送 Google 的動態哨兵
`thinkingBudget: -1`。

Gemma 4 模型 (例如 `gemma-4-26b-a4b-it`) 支援思考模式。OpenClaw
會將 `thinkingBudget` 重寫為 Gemma 4 支援的 Google `thinkingLevel`。
將思考設定為 `off` 會保留停用思考，而不是對應到
`MINIMAL`。

</Tip>

## 圖像生成

內建的 `google` 圖像生成提供者預設為
`google/gemini-3.1-flash-image-preview`。

- 也支援 `google/gemini-3-pro-image-preview`
- 生成：每次請求最多 4 張圖像
- 編輯模式：已啟用，最多 5 張輸入圖像
- 幾何控制：`size`、`aspectRatio` 和 `resolution`

若要使用 Google 作為預設圖像提供者：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

<Note>請參閱 [Image Generation](/zh-Hant/tools/image-generation) 以了解共享工具參數、供應商選擇和故障轉移行為。</Note>

## 影片生成

內建的 `google` 外掛程式也透過共享的 `video_generate` 工具註冊影片生成功能。

- 預設影片模型：`google/veo-3.1-fast-generate-preview`
- 模式：文字生成影片、圖片生成影片，以及單一影片參考流程
- 支援 `aspectRatio` (`16:9`, `9:16`) 和 `resolution` (`720P`, `1080P`)；Veo 目前不支援音訊輸出
- 支援的持續時間：**4、6 或 8 秒**（其他值會調整為最接近的允許值）

若要將 Google 設為預設的影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

<Note>請參閱 [Video Generation](/zh-Hant/tools/video-generation) 以了解共享工具參數、供應商選擇和故障轉移行為。</Note>

## 音樂生成

隨附的 `google` 外掛程式也透過共享的
`music_generate` 工具註冊音樂生成功能。

- 預設音樂模型：`google/lyria-3-clip-preview`
- 也支援 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 輸出格式：預設為 `mp3`，加上 `wav` 於 `google/lyria-3-pro-preview`
- 參考輸入：最多 10 張圖片
- 基於 Session 的執行會透過共享的工作/狀態流程分離，包括 `action: "status"`

若要將 Google 設為預設的音樂提供者：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

<Note>請參閱 [Music Generation](/zh-Hant/tools/music-generation) 以了解共享工具參數、供應商選擇和故障轉移行為。</Note>

## 文字轉語音

隨附的 `google` 語音供應商使用 Gemini API TTS 路徑搭配
`gemini-3.1-flash-tts-preview`。

- 預設語音：`Kore`
- 驗證：`messages.tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 輸出：一般 TTS 附件為 WAV，語音備忘錄目標為 Opus，Talk/電話語音為 PCM
- 語音備忘錄輸出：Google PCM 被封裝為 WAV 並透過 `ffmpeg` 轉碼為 48 kHz Opus

Google 的批次 Gemini TTS 路徑會在完成的
`generateContent` 回應中傳回生成的音訊。若要獲得最低延遲的口語對話，請使用
由 Gemini Live API 支援的 Google 即時語音提供者，而非批次
TTS。

若要使用 Google 作為預設的 TTS 提供者：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          speakerVoice: "Kore",
          audioProfile: "Speak professionally with a calm tone.",
        },
      },
    },
  },
}
```

Gemini API TTS 使用自然語言提示來進行風格控制。設定
`audioProfile` 以在口語文字前附加可重複使用的風格提示。當您的提示文字提及
具名說話者時，請設定 `speakerName`。

Gemini API TTS 亦接受文字中的表達性方括號音訊標籤，
例如 `[whispers]` 或 `[laughs]`。若要在將標籤傳送至 TTS 的同時
將其保留在可見的聊天回覆之外，請將其放在 `[[tts:text]]...[[/tts:text]]`
區塊內：

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>僅限於 Gemini API 的 Google Cloud Console API 金鑰對此 提供者有效。這並非獨立的 Cloud Text-to-Speech API 路徑。</Note>

## 即時語音

內建的 `google` 外掛註冊了一個由 Gemini Live API 支援的即時語音提供者，
適用於語音通話和 Google Meet 等後端音訊橋接器。

| 設定           | 設定路徑                                                            | 預設值                                                                          |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 模型           | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                                 |
| 語音           | `...google.voice`                                                   | `Kore`                                                                          |
| 溫度           | `...google.temperature`                                             | (未設定)                                                                        |
| VAD 啟動靈敏度 | `...google.startSensitivity`                                        | (未設定)                                                                        |
| VAD 結束靈敏度 | `...google.endSensitivity`                                          | (未設定)                                                                        |
| 靜音持續時間   | `...google.silenceDurationMs`                                       | (未設定)                                                                        |
| 活動處理       | `...google.activityHandling`                                        | Google 預設值，`start-of-activity-interrupts`                                   |
| 輪次覆蓋範圍   | `...google.turnCoverage`                                            | Google 預設值，`only-activity`                                                  |
| 停用自動 VAD   | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                         |
| 會話恢復       | `...google.sessionResumption`                                       | `true`                                                                          |
| 內容壓縮       | `...google.contextWindowCompression`                                | `true`                                                                          |
| API 金鑰       | `...google.apiKey`                                                  | 會回退至 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

語音通話即時設定範例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          realtime: {
            enabled: true,
            provider: "google",
            providers: {
              google: {
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                speakerVoice: "Kore",
                activityHandling: "start-of-activity-interrupts",
                turnCoverage: "only-activity",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
  Google Live API 透過 WebSocket 使用雙向音訊和函式呼叫。 OpenClaw 將電話/Meet 橋接音訊調整為 Gemini 的 PCM Live API 串流，並 在共享的即時語音合約上保留工具呼叫。除非您需要抽樣變更，否則請保持 `temperature` 未設定；OpenClaw 會省略非正值，因為對於 `temperature: 0`，Google Live 可以傳回沒有音訊的文字記錄。 無需 `languageCodes` 即可啟用 Gemini API 轉錄；目前的 Google SDK 會拒絕此 API
  路徑上的語言代碼提示。
</Note>

<Note>控制 UI 對話支援使用受限單次權杖的 Google Live 瀏覽器工作階段。 僅後端的即時語音提供者也可以透過一般 Gateway 中繼傳輸來執行，該傳輸會將提供者憑證保留在 Gateway 上。</Note>

若要進行維護者即時驗證，請執行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。
該測試也涵蓋 OpenAI 後端/WebRTC 路徑；Google 端會產生與 Control UI Talk 所使用相同的受限
Live API 權杖形狀，開啟瀏覽器 WebSocket 端點，傳送初始設定負載，並等待
`setupComplete`。

## 進階設定

<AccordionGroup>
  <Accordion title="直接重複使用 Gemini 快取">
    對於直接 Gemini API 執行 (`api: "google-generative-ai"`)，OpenClaw
    會將設定的 `cachedContent` 控制代碼傳遞至 Gemini 請求。

    - 使用 `cachedContent` 或舊版 `cached_content`
      設定各模型或全域參數
    - 如果兩者同時存在，`cachedContent` 優先
    - 範例值：`cachedContents/prebuilt-context`
    - Gemini 快取命中使用量會從上游 `cachedContentTokenCount`
      正規化為 OpenClaw `cacheRead`

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "google/gemini-2.5-pro": {
              params: {
                cachedContent: "cachedContents/prebuilt-context",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Gemini CLI JSON 使用注意事項">
    使用 `google-gemini-cli` OAuth 提供者時，OpenClaw 會如下
    正規化 CLI JSON 輸出：

    - 回覆文字來自 CLI JSON `response` 欄位。
    - 當 CLI 將 `usage` 留白時，使用量會退回至 `stats`。
    - `stats.cached` 會正規化為 OpenClaw `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 會從
      `stats.input_tokens - stats.cached` 推算輸入權杖。

  </Accordion>

  <Accordion title="Environment and daemon setup">
    如果 Gateway 作為守護行程（launchd/systemd）執行，請確保 `GEMINI_API_KEY`
    對該行程可用（例如，在 `~/.openclaw/.env` 中或透過
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="圖片生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數和提供者選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數和提供者選擇。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    共用的音樂工具參數和提供者選擇。
  </Card>
</CardGroup>
