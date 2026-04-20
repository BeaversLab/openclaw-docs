---
title: "Google (Gemini)"
summary: "Google Gemini 設定（API 金鑰 + OAuth、圖片生成、媒體理解、網路搜尋）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Google 外掛程式透過 Google AI Studio 提供 Gemini 模型的存取權限，外加圖片生成、媒體理解（圖片/音訊/影片），以及透過 Gemini Grounding 進行的網路搜尋功能。

- 供應商：`google`
- 驗證：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 替代供應商：`google-gemini-cli` (OAuth)

## 開始使用

選擇您偏好的驗證方式，並依照設定步驟操作。

<Tabs>
  <Tab title="API 金鑰">
    **最適用於：** 透過 Google AI Studio 存取標準 Gemini API。

    <Steps>
      <Step title="執行引導設定">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接傳入金鑰：

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
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    環境變數 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均可接受。使用您已經設定的那一個。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **最適用於：** 透過 PKCE OAuth 重複使用現有的 Gemini CLI 登入，而非使用個別的 API 金鑰。

    <Warning>
    `google-gemini-cli` 提供者是非官方整合。部分使用者
    回報以這種方式使用 OAuth 時會遭遇帳號限制。風險自負。
    </Warning>

    <Steps>
      <Step title="安裝 Gemini CLI">
        本機 `gemini` 指令必須可在 `PATH` 上使用。

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
        openclaw models list --provider google-gemini-cli
        ```
      </Step>
    </Steps>

    - 預設模型：`google-gemini-cli/gemini-3-flash-preview`
    - 別名：`gemini-cli`

    **環境變數：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    (或 `GEMINI_CLI_*` 變體。)

    <Note>
    若登入後 Gemini CLI OAuth 請求失敗，請在 gateway 主機上設定 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID` 並重試。
    </Note>

    <Note>
    若在瀏覽器流程啟動前登入失敗，請確認本機 `gemini`
    指令已安裝且位於 `PATH` 中。
    </Note>

    僅限 OAuth 的 `google-gemini-cli` 提供者是獨立的文字推斷
    介面。圖片生成、媒體理解與 Gemini Grounding 仍保留在
    `google` 提供者 ID 上。

  </Tab>
</Tabs>

## 功能

| 功能                 | 支援             |
| -------------------- | ---------------- |
| 聊天補全             | 是               |
| 圖片生成             | 是               |
| 音樂生成             | 是               |
| 圖片理解             | 是               |
| 音訊轉錄             | 是               |
| 影片理解             | 是               |
| 網路搜尋 (Grounding) | 是               |
| 思考/推理            | 是 (Gemini 3.1+) |
| Gemma 4 模型         | 是               |

<Tip>Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支援思考模式。OpenClaw 會將 `thinkingBudget` 重寫為 Gemma 4 支援的 Google `thinkingLevel`。 將 thinking 設定為 `off` 可保持停用思考狀態，而非對應到 `MINIMAL`。</Tip>

## 圖片生成

內建的 `google` 圖片生成提供者預設為
`google/gemini-3.1-flash-image-preview`。

- 同時也支援 `google/gemini-3-pro-image-preview`
- 生成：每次請求最多 4 張圖片
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

<Note>請參閱 [圖片生成](/en/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

## 影片生成

內建的 `google` 外掛程式也會透過共用的
`video_generate` 工具註冊影片生成。

- 預設影片模型：`google/veo-3.1-fast-generate-preview`
- 模式：文字轉影片、圖片轉影片和單一影片參考流程
- 支援 `aspectRatio`、`resolution` 和 `audio`
- 目前持續時間限制：**4 到 8 秒**

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

<Note>請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

## 音樂生成

內建的 `google` 外掛程式也會透過共用的
`music_generate` 工具註冊音樂生成。

- 預設音樂模型：`google/lyria-3-clip-preview`
- 同時也支援 `google/lyria-3-pro-preview`
- 提示詞控制：`lyrics` 和 `instrumental`
- 輸出格式：預設為 `mp3`，加上 `wav` 於 `google/lyria-3-pro-preview`
- 參考輸入：最多 10 張圖片
- 會話支援的執行會透過共用的任務/狀態流程分離，包括 `action: "status"`

若要將 Google 作為預設音樂提供者：

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

<Note>請參閱[音樂生成](/en/tools/music-generation)以了解共用工具參數、提供者選擇和容錯移轉行為。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Direct Gemini cache reuse">
    對於直接執行的 Gemini API (`api: "google-generative-ai"`)，OpenClaw
    會將設定的 `cachedContent` 控制代碼傳遞給 Gemini 請求。

    - 使用
      `cachedContent` 或舊版 `cached_content`
      設定每個模型或全域參數
    - 如果兩者都存在，則以 `cachedContent` 為準
    - 範例值：`cachedContents/prebuilt-context`
    - Gemini 快取命中使用量已從上游
      `cachedContentTokenCount` 正規化為 OpenClaw `cacheRead`

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
    當使用 `google-gemini-cli` OAuth 提供者時，OpenClaw 會
    依照以下方式正規化 CLI JSON 輸出：

    - 回覆文字來自 CLI JSON 的 `response` 欄位。
    - 當 CLI 將 `usage` 留空時，使用量會改用
      `stats`。
    - `stats.cached` 已正規化為 OpenClaw `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 會從
      `stats.input_tokens - stats.cached` 推算輸入 Token。

  </Accordion>

  <Accordion title="Environment and daemon setup">
    如果閘道作為守護程序 執行，請確保
    `GEMINI_API_KEY` 對該程序可用 (例如在
    `~/.openclaw/.env` 中或透過
    `env.shellEnv`)。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="圖片生成" href="/en/tools/image-generation" icon="image">
    共用的圖片工具參數與供應商選擇。
  </Card>
  <Card title="影片生成" href="/en/tools/video-generation" icon="video">
    共用的影片工具參數與供應商選擇。
  </Card>
  <Card title="音樂生成" href="/en/tools/music-generation" icon="music">
    共用的音樂工具參數與供應商選擇。
  </Card>
</CardGroup>
