---
title: "Google (Gemini)"
summary: "Google Gemini 設定（API 金鑰、圖像生成、媒體理解、網路搜尋）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key auth flow
---

# Google (Gemini)

Google 外掛程式透過 Google AI Studio 提供 Gemini 模型的存取權限，外加圖片生成、媒體理解（圖片/音訊/影片），以及透過 Gemini Grounding 進行的網路搜尋功能。

- 供應商：`google`
- 驗證：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API：Google Gemini API

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

## 功能

| 功能      | 支援             |
| --------- | ---------------- |
| 聊天完成  | 是               |
| 圖像生成  | 是               |
| 音樂生成  | 是               |
| 圖像理解  | 是               |
| 音訊轉錄  | 是               |
| 影片理解  | 是               |
| 網路搜尋  | 是               |
| 思考/推理 | 是 (Gemini 3.1+) |

## 直接 Gemini 快取重用

對於直接的 Gemini API 執行 (`api: "google-generative-ai"`)，OpenClaw 現在會將已設定的 `cachedContent` 控制碼傳遞給 Gemini 請求。

- 使用 `cachedContent` 或舊版 `cached_content` 來設定每個模型或全域參數
- 如果兩者都存在，則 `cachedContent` 優先
- 範例值：`cachedContents/prebuilt-context`
- Gemini 快取命中使用量已從上游 `cachedContentTokenCount` 標準化為 OpenClaw `cacheRead`

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

## 圖像生成

內建的 `google` 圖像生成供應商預設為 `google/gemini-3.1-flash-image-preview`。

- 也支援 `google/gemini-3-pro-image-preview`
- 生成：每個請求最多 4 張圖像
- 編輯模式：已啟用，最多 5 張輸入圖像
- 幾何控制：`size`、`aspectRatio` 和 `resolution`

圖像生成、媒體理解和 Gemini Grounding 均保留在 `google` 供應商 ID 上。

要將 Google 用作預設圖像供應商：

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

請參閱 [圖像生成](/en/tools/image-generation) 以了解共用工具參數、供應商選擇和故障轉移行為。

## 影片生成

內建的 `google` 外掛程式也透過共用的 `video_generate` 工具註冊影片生成功能。

- 預設影片模型：`google/veo-3.1-fast-generate-preview`
- 模式：文字轉影片、圖像轉影片和單影片參考流程
- 支援 `aspectRatio`、`resolution` 和 `audio`
- 目前持續時間限制：**4 到 8 秒**

要將 Google 用作預設影片提供者：

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

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。

## 音樂生成

隨附的 `google` 外掛程式也透過共用的 `music_generate` 工具註冊音樂生成。

- 預設音樂模型：`google/lyria-3-clip-preview`
- 也支援 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 輸出格式：預設為 `mp3`，加上 `wav` 於 `google/lyria-3-pro-preview`
- 參考輸入：最多 10 張圖片
- 支援會話的執行會透過共用的任務/狀態流程分離，包括 `action: "status"`

要將 Google 用作預設音樂提供者：

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

請參閱 [音樂生成](/en/tools/music-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。

## 環境注意事項

如果 Gateway 作為守護程序 (launchd/systemd) 運行，請確保 `GEMINI_API_KEY` 可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
