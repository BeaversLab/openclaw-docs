---
summary: "Google Gemini 設定 (API 金鑰 + OAuth，影像生成，媒體理解，TTS，網路搜尋)"
title: "Google (Gemini)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

Google 外掛程式透過 Google AI Studio 提供對 Gemini 模型的存取，以及影像生成、媒體理解 (影像/音訊/視訊)、文字轉語音，以及透過 Gemini Grounding 進行的網路搜尋。

- 提供者: `google`
- 驗證: `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API
- 執行時期選項: `agents.defaults.agentRuntime.id: "google-gemini-cli"`
  重複使用 Gemini CLI OAuth，同時將模型參照保持為 `google/*`。

## 開始使用

選擇您偏好的驗證方法並依照設定步驟進行。

<Tabs>
  <Tab title="API 金鑰">
    **最適合:** 透過 Google AI Studio 存取標準 Gemini API。

    <Steps>
      <Step title="執行入門引導">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接傳遞金鑰:

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
    環境變數 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均可接受。請使用您已設定的任一變數。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **最適用於：** 透過 PKCE OAuth 重複使用現有的 Gemini CLI 登入，而非使用獨立的 API 金鑰。

    <Warning>
    `google-gemini-cli` 提供者是非官方整合。部分使用者
    回報使用此方式 OAuth 時會遇到帳號限制。請自行承擔風險。
    </Warning>

    <Steps>
      <Step title="安裝 Gemini CLI">
        本機的 `gemini` 指令必須可在 `PATH` 上使用。

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 支援 Homebrew 安裝和全域 npm 安裝，包括
        常見的 Windows/npm 佈局。
      </Step>
      <Step title="透過 OAuth 登入">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="驗證模型可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    - 預設模型：`google/gemini-3.1-pro-preview`
    - 執行時期：`google-gemini-cli`
    - 別名：`gemini-cli`

    **環境變數：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (或是 `GEMINI_CLI_*` 變體。)

    <Note>
    如果 Gemini CLI OAuth 請求在登入後失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID` 並重試。
    </Note>

    <Note>
    如果登入在瀏覽器流程啟動前失敗，請確保本機 `gemini`
    指令已安裝且在 `PATH` 中。
    </Note>

    `google-gemini-cli/*` 模型參照是舊版相容性別名。新的
    設定應該使用 `google/*` 模型參照加上 `google-gemini-cli`
    執行時期，當他們需要本機 Gemini CLI 執行時。

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

<Tip>
Gemini 3 模型使用 `thinkingLevel` 而非 `thinkingBudget`。OpenClaw 將
Gemini 3、Gemini 3.1 和 `gemini-*-latest` 別名推理控制對應到
`thinkingLevel`，因此預設/低延遲執行不會發送已停用的
`thinkingBudget` 數值。

`/think adaptive` 保留 Google 的動態思考語意，而非選擇
固定的 OpenClaw 等級。Gemini 3 和 Gemini 3.1 省略固定的 `thinkingLevel`，以便
Google 選擇等級；Gemini 2.5 則發送 Google 的動態哨點
`thinkingBudget: -1`。

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支援思考模式。OpenClaw
會為 Gemma 4 將 `thinkingBudget` 重寫為支援的 Google `thinkingLevel`。
將思考設定為 `off` 可保留思考停用狀態，而非對應到
`MINIMAL`。

</Tip>

## 圖片生成

內建的 `google` 圖片生成提供者預設為
`google/gemini-3.1-flash-image-preview`。

- 也支援 `google/gemini-3-pro-image-preview`
- 生成：每個請求最多 4 張圖片
- 編輯模式：已啟用，最多 5 張輸入圖片
- 幾何控制：`size`、`aspectRatio` 和 `resolution`

若要將 Google 作為預設圖片提供者：

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

<Note>請參閱 [圖片生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選擇和容錯移轉行為。</Note>

## 影片生成

內建的 `google` 外掛程式也會透過共用的
`video_generate` 工具註冊影片生成。

- 預設影片模型：`google/veo-3.1-fast-generate-preview`
- 模式：文字生成影片、圖片生成影片，以及單一影片參考流程
- 支援 `aspectRatio`、`resolution` 和 `audio`
- 目前持續時間限制：**4 至 8 秒**

若要將 Google 作為預設影片提供者：

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

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和容錯移轉行為。</Note>

## 音樂生成

內建的 `google` 外掛程式也透過共用的
`music_generate` 工具註冊了音樂生成功能。

- 預設音樂模型：`google/lyria-3-clip-preview`
- 也支援 `google/lyria-3-pro-preview`
- 提示詞控制項：`lyrics` 和 `instrumental`
- 輸出格式：預設為 `mp3`，加上 `wav` 於 `google/lyria-3-pro-preview`
- 參考輸入：最多 10 張圖片
- 基於會話的執行會透過共用的任務/狀態流程分離，包括 `action: "status"`

若要將 Google 作為預設的音樂提供商：

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

<Note>請參閱 [音樂生成](/zh-Hant/tools/music-generation) 以了解共用工具參數、提供商選擇和故障轉移行為。</Note>

## 文字轉語音

內建的 `google` 語音提供商使用 Gemini API TTS 路徑搭配
`gemini-3.1-flash-tts-preview`。

- 預設語音：`Kore`
- 驗證：`messages.tts.providers.google.apiKey`、`models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- 輸出：一般 TTS 附件為 WAV，語音備忘錄目標為 Opus，Talk/電話為 PCM
- 語音備忘錄輸出：Google PCM 會包裝為 WAV 並使用 `ffmpeg` 轉碼為 48 kHz Opus

若要將 Google 作為預設的 TTS 提供商：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
          audioProfile: "Speak professionally with a calm tone.",
        },
      },
    },
  },
}
```

Gemini API TTS 使用自然語言提示來控制風格。設定
`audioProfile` 可在口語文字前附加可重複使用的風格提示。當您的提示文字提及
具名發言者時，請設定 `speakerName`。

Gemini API TTS 也接受文字中具有表現力的方括號音訊標籤，
例如 `[whispers]` 或 `[laughs]`。若要將標籤傳送至 TTS
同時使其不出現於可見的聊天回覆中，請將其置於 `[[tts:text]]...[[/tts:text]]`
區塊內：

```text
Here is the clean reply text.

[[tts:text]][whispers] Here is the spoken version.[[/tts:text]]
```

<Note>限制為 Gemini API 的 Google Cloud Console API 金鑰對此提供商有效。 這不是獨立的 Cloud Text-to-Speech API 路徑。</Note>

## 即時語音

隨附的 `google` 外掛程式註冊了一個即時語音提供者，該提供者由 Gemini Live API 支援，適用於語音通話和 Google Meet 等後端音訊橋接器。

| 設定           | 設定路徑                                                            | 預設值                                                                        |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 模型           | `plugins.entries.voice-call.config.realtime.providers.google.model` | `gemini-2.5-flash-native-audio-preview-12-2025`                               |
| 語音           | `...google.voice`                                                   | `Kore`                                                                        |
| 溫度           | `...google.temperature`                                             | (未設定)                                                                      |
| VAD 啟動靈敏度 | `...google.startSensitivity`                                        | (未設定)                                                                      |
| VAD 結束靈敏度 | `...google.endSensitivity`                                          | (未設定)                                                                      |
| 靜音持續時間   | `...google.silenceDurationMs`                                       | (未設定)                                                                      |
| 活動處理       | `...google.activityHandling`                                        | Google 預設值，`start-of-activity-interrupts`                                 |
| 輪次覆蓋率     | `...google.turnCoverage`                                            | Google 預設值，`only-activity`                                                |
| 停用自動 VAD   | `...google.automaticActivityDetectionDisabled`                      | `false`                                                                       |
| API 金鑰       | `...google.apiKey`                                                  | 回退至 `models.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |

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
                voice: "Kore",
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
  Google Live API 使用 WebSocket 進行雙向音訊和函式呼叫。OpenClaw 將電話/Meet 橋接器音訊調整為 Gemini 的 PCM Live API 串流，並將工具呼叫保留在共用的即時語音合約上。除非您需要變更取樣，否則請保持 `temperature` 未設定；因為 Google Live 可以在 `temperature: 0` 時傳回沒有音訊的文字記錄，OpenClaw 會省略非正值。Gemini API 轉錄功能無需 `languageCodes` 即可啟用；目前的 Google SDK 會拒絕此 API
  路徑上的語言代碼提示。
</Note>

<Note>控制 UI 對話支援使用受限單次 Token 的 Google Live 瀏覽器工作階段。僅後端的即時語音提供者也可以透過通用 Gateway 中繼傳輸執行，該傳輸會將提供者憑證保留在 Gateway 上。</Note>

若要進行維護者的即時驗證，請執行
`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`。
Google 端會產生與控制 UI 對話所使用的相同受限 Live API Token 形狀，開啟瀏覽器 WebSocket 端點，傳送初始設定負載，並等待 `setupComplete`。

## 進階設定

<AccordionGroup>
  <Accordion title="Direct Gemini cache reuse">
    針對直接 Gemini API 執行（`api: "google-generative-ai"`），OpenClaw
    會將設定的 `cachedContent` 控制代碼傳遞至 Gemini 請求。

    - 使用 `cachedContent` 或舊版的 `cached_content` 來設定每個模型或全域參數
    - 如果兩者同時存在，`cachedContent` 優先
    - 範例值：`cachedContents/prebuilt-context`
    - Gemini 快取命中使用量會從上游的 `cachedContentTokenCount` 正規化為 OpenClaw `cacheRead`

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

  <Accordion title="Gemini CLI JSON usage notes">
    使用 `google-gemini-cli` OAuth 提供者時，OpenClaw 會
    依以下方式正規化 CLI JSON 輸出：

    - 回覆文字來自 CLI JSON 的 `response` 欄位。
    - 當 CLI 將 `usage` 留空時，使用量會回退至 `stats`。
    - `stats.cached` 會正規化為 OpenClaw `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 會從 `stats.input_tokens - stats.cached` 推算輸入 token。

  </Accordion>

  <Accordion title="Environment and daemon setup">
    如果 Gateway 作為 daemon (launchd/systemd) 執行，請確保 `GEMINI_API_KEY`
    可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖像工具參數和提供者選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    共用的音樂工具參數與提供者選擇。
  </Card>
</CardGroup>
