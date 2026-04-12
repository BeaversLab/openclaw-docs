---
title: "Google (Gemini)"
summary: "Google Gemini 設定（API 金鑰 + OAuth、影像生成、媒體理解、網路搜尋）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Google 外掛程式透過 Google AI Studio 提供 Gemini 模型的存取權限，外加圖片生成、媒體理解（圖片/音訊/影片），以及透過 Gemini Grounding 進行的網路搜尋功能。

- 提供者：`google`
- 驗證：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API
- 替代提供者：`google-gemini-cli` (OAuth)

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice gemini-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (Gemini CLI)

替代提供者 `google-gemini-cli` 使用 PKCE OAuth 而非 API 金鑰。
這是一個非官方整合；部分使用者回報帳號受到限制。
請自行承擔使用風險。

- 預設模型：`google-gemini-cli/gemini-3-flash-preview`
- 別名：`gemini-cli`
- 安裝先決條件：本機 Gemini CLI 可用於 `gemini`
  - Homebrew：`brew install gemini-cli`
  - npm：`npm install -g @google/gemini-cli`
- 登入：

```bash
openclaw models auth login --provider google-gemini-cli --set-default
```

環境變數：

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

（或 `GEMINI_CLI_*` 變體。）

如果登入後 Gemini CLI OAuth 請求失敗，請在閘道主機上設定
`GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID` 並
重試。

如果登入在瀏覽器流程啟動前失敗，請確保本機 `gemini`
指令已安裝並位於 `PATH` 中。OpenClaw 支援 Homebrew 安裝
和全域 npm 安裝，包括常見的 Windows/npm 配置。

Gemini CLI JSON 使用說明：

- 回覆文字來自 CLI JSON `response` 欄位。
- 當 CLI 留下 `usage` 空白時，使用會回退到 `stats`。
- `stats.cached` 會正規化為 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從
  `stats.input_tokens - stats.cached` 推導輸入 token。

## 功能

| 功能                 | 支援             |
| -------------------- | ---------------- |
| 聊天補全             | 是               |
| 影像生成             | 是               |
| 音樂生成             | 是               |
| 影像理解             | 是               |
| 音訊轉錄             | 是               |
| 影片理解             | 是               |
| 網路搜尋 (Grounding) | 是               |
| 思考/推理            | 是 (Gemini 3.1+) |
| Gemma 4 模型         | 是               |

Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支援思考模式。OpenClaw 會將 `thinkingBudget` 重寫為 Gemma 4 支援的 Google `thinkingLevel`。將 thinking 設定為 `off` 會保持停用思考，而不是對應到 `MINIMAL`。

## 直接 Gemini 快取重複使用

對於直接 Gemini API 執行（`api: "google-generative-ai"`），OpenClaw 現在
會將已配置的 `cachedContent` 控制代碼傳遞給 Gemini 請求。

- 使用
  `cachedContent` 或舊版 `cached_content` 配置每個模型或全域參數
- 如果兩者都存在，則以 `cachedContent` 為準
- 範例值：`cachedContents/prebuilt-context`
- Gemini 快取命中使用量已從上游
  `cachedContentTokenCount` 正規化為 OpenClaw `cacheRead`

範例：

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

## 影像生成

內建的 `google` 影像生成提供者預設為
`google/gemini-3.1-flash-image-preview`。

- 也支援 `google/gemini-3-pro-image-preview`
- 生成：每個請求最多 4 張影像
- 編輯模式：已啟用，最多 5 張輸入影像
- 幾何控制：`size`、`aspectRatio` 和 `resolution`

僅限 OAuth 的 `google-gemini-cli` 提供者是一個獨立的文字推斷
介面。影像生成、媒體理解和 Gemini Grounding 保留在
`google` 提供者 ID 上。

若要將 Google 作為預設影像提供者：

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

請參閱 [影像生成](/en/tools/image-generation) 以了解共享工具
參數、提供者選擇和故障轉移行為。

## 影片生成

內建的 `google` 外掛程式也透過共享的
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

參閱 [影片生成](/en/tools/video-generation) 以了解共用工具
參數、提供者選擇和故障轉移行為。

## 音樂生成

隨附的 `google` 外掛程式也會透過共用的
`music_generate` 工具註冊音樂生成功能。

- 預設音樂模型：`google/lyria-3-clip-preview`
- 也支援 `google/lyria-3-pro-preview`
- 提示詞控制：`lyrics` 和 `instrumental`
- 輸出格式：預設為 `mp3`，以及 `wav` (於 `google/lyria-3-pro-preview` 上)
- 參考輸入：最多 10 張圖片
- 基於 Session 的執行會透過共用的任務/狀態流程分離，包括 `action: "status"`

要將 Google 作為預設的音樂提供者：

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

參閱 [音樂生成](/en/tools/music-generation) 以了解共用工具
參數、提供者選擇和故障轉移行為。

## 環境說明

如果 Gateway 作為守護程式 (launchd/systemd) 執行，請確保 `GEMINI_API_KEY`
可供該程序使用 (例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`)。
