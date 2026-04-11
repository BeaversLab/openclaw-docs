---
summary: "使用 12 個提供者後端從文字、圖片或現有影片生成影片"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "影片生成"
---

# 影片生成

OpenClaw 智慧體可以根據文字提示、參考圖片或現有影片來生成影片。支援 12 個供應商後端，每個後端都有不同的模型選項、輸入模式和功能集。智慧體會根據您的設定和可用的 API 金鑰自動選擇合適的供應商。

<Note>The `video_generate` tool only appears when at least one video-generation provider is available. If you do not see it in your agent tools, set a provider API key or configure `agents.defaults.videoGenerationModel`.</Note>

OpenClaw 將影片生成視為三種執行時模式：

- `generate` 用於不包含參考媒體的文字生成影片請求
- `imageToVideo` 當請求包含一或多張參考圖片時
- `videoToVideo` 當請求包含一或多個參考影片時

提供者可以支援這些模式的任何子集。工具會在提交前驗證啟用的
模式，並在 `action=list` 中回報支援的模式。

## 快速開始

1. 為任何支援的提供者設定 API 金鑰：

```bash
export GEMINI_API_KEY="your-key"
```

2. 可選：釘選預設模型：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. 要求代理：

> 生成一隻友善的龍蝦在日落時衝浪的 5 秒電影感影片。

代理會自動呼叫 `video_generate`。不需要工具白名單。

## 生成影片時會發生什麼事

影片生成是非同步的。當代理在會話中呼叫 `video_generate` 時：

1. OpenClaw 將請求提交給提供者，並立即傳回工作 ID。
2. 提供者在背景處理工作（通常需要 30 秒到 5 分鐘，視提供者和解析度而定）。
3. 當影片準備好時，OpenClaw 會透過內部完成事件喚醒同一個會話。
4. 代理會將完成的影片貼回原始對話中。

當工作正在進行時，同一會話中重複的 `video_generate` 呼叫會傳回目前的工作狀態，而不是開始另一個生成工作。請使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 從 CLI 檢查進度。

在非會話支援的代理執行之外（例如，直接工具叫用），工具會回退到內聯生成，並在同一輪次中傳回最終的媒體路徑。

### 工作生命週期

每個 `video_generate` 請求都會經歷四個狀態：

1. **queued** -- 任務已建立，正在等待提供者接受。
2. **running** -- 提供者正在處理中（視提供者與解析度而定，通常為 30 秒至 5 分鐘）。
3. **succeeded** -- 影片已就緒；代理程式會喚醒並將其發布至對話中。
4. **failed** -- 提供者發生錯誤或逾時；代理程式會喚醒並回報錯誤詳情。

從 CLI 檢查狀態：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

重複防制：若目前已有影片任務處於 `queued` 或 `running` 狀態，`video_generate` 將會回傳現有任務狀態，而不會啟動新任務。使用 `action: "status"` 可明確檢查狀態，而不觸發新的生成作業。

## 支援的提供者

| 提供者   | 預設模型                        | 文字 | 圖片參照           | 影片參照         | API 金鑰                                 |
| -------- | ------------------------------- | ---- | ------------------ | ---------------- | ---------------------------------------- |
| Alibaba  | `wan2.6-t2v`                    | Yes  | Yes (remote URL)   | Yes (remote URL) | `MODELSTUDIO_API_KEY`                    |
| BytePlus | `seedance-1-0-lite-t2v-250428`  | Yes  | 1 張圖片           | No               | `BYTEPLUS_API_KEY`                       |
| ComfyUI  | `workflow`                      | Yes  | 1 張圖片           | No               | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal      | `fal-ai/minimax/video-01-live`  | Yes  | 1 張圖片           | No               | `FAL_KEY`                                |
| Google   | `veo-3.1-fast-generate-preview` | Yes  | 1 張圖片           | 1 部影片         | `GEMINI_API_KEY`                         |
| MiniMax  | `MiniMax-Hailuo-2.3`            | Yes  | 1 張圖片           | No               | `MINIMAX_API_KEY`                        |
| OpenAI   | `sora-2`                        | Yes  | 1 張圖片           | 1 部影片         | `OPENAI_API_KEY`                         |
| Qwen     | `wan2.6-t2v`                    | Yes  | Yes (remote URL)   | Yes (remote URL) | `QWEN_API_KEY`                           |
| Runway   | `gen4.5`                        | Yes  | 1 張圖片           | 1 部影片         | `RUNWAYML_API_SECRET`                    |
| Together | `Wan-AI/Wan2.2-T2V-A14B`        | Yes  | 1 張圖片           | No               | `TOGETHER_API_KEY`                       |
| Vydra    | `veo3`                          | Yes  | 1 張圖片 (`kling`) | No               | `VYDRA_API_KEY`                          |
| xAI      | `grok-imagine-video`            | Yes  | 1 張圖片           | 1 部影片         | `XAI_API_KEY`                            |

部分提供者接受額外或替代的 API 金鑰環境變數。詳情請參閱個別的 [提供者頁面](#related)。

執行 `video_generate action=list` 以在執行時檢查可用的提供者、模型和執行時模式。

### 已宣告的功能矩陣

這是 `video_generate`、合約測試和共用即時掃描所使用的顯式模式合約。

| 提供者   | `generate` | `imageToVideo` | `videoToVideo` | 目前的共用即時通道                                                                                               |
| -------- | ---------- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Alibaba  | 是         | 是             | 是             | `generate`、`imageToVideo`；`videoToVideo` 已跳過，因為此提供者需要遠端 `http(s)` 影片 URL                       |
| BytePlus | 是         | 是             | 否             | `generate`、`imageToVideo`                                                                                       |
| ComfyUI  | 是         | 是             | 否             | 不在共用掃描中；工作流程特定的覆蓋範圍存在於 Comfy 測試中                                                        |
| fal      | 是         | 是             | 否             | `generate`、`imageToVideo`                                                                                       |
| Google   | 是         | 是             | 是             | `generate`、`imageToVideo`；共用 `videoToVideo` 已跳過，因為目前的緩衝區支援 Gemini/Veo 掃描不接受該輸入         |
| MiniMax  | 是         | 是             | 否             | `generate`、`imageToVideo`                                                                                       |
| OpenAI   | 是         | 是             | 是             | `generate`、`imageToVideo`；共用 `videoToVideo` 已跳過，因為此組織/輸入路徑目前需要提供者端的重繪/重新混音存取權 |
| Qwen     | 是         | 是             | 是             | `generate`、`imageToVideo`；`videoToVideo` 已跳過，因為此提供者需要遠端 `http(s)` 影片 URL                       |
| Runway   | 是         | 是             | 是             | `generate`、`imageToVideo`；`videoToVideo` 僅在選取的模型為 `runway/gen4_aleph` 時執行                           |
| Together | 是         | 是             | 否             | `generate`、`imageToVideo`                                                                                       |
| Vydra    | 是         | 是             | 否             | `generate`；共用 `imageToVideo` 已跳過，因為捆綁的 `veo3` 僅支援文字，而捆綁的 `kling` 需要遠端圖片 URL          |
| xAI      | 是         | 是             | 是             | `generate`, `imageToVideo`; `videoToVideo` 已跳過，因為此提供者目前需要遠端 MP4 URL                              |

## 工具參數

### 必要

| 參數     | 類型 | 描述                                              |
| -------- | ---- | ------------------------------------------------- |
| `prompt` | 字串 | 要產生影片的文字描述（`action: "generate"` 必填） |

### 內容輸入

| 參數     | 類型   | 描述                       |
| -------- | ------ | -------------------------- |
| `image`  | 字串   | 單一參考圖片（路徑或 URL） |
| `images` | 字串[] | 多張參考圖片（最多 5 張）  |
| `video`  | 字串   | 單一參考影片（路徑或 URL） |
| `videos` | 字串[] | 多個參考影片（最多 4 個）  |

### 樣式控制

| 參數              | 類型   | 描述                                                                      |
| ----------------- | ------ | ------------------------------------------------------------------------- |
| `aspectRatio`     | 字串   | `1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9` 或 `21:9` |
| `resolution`      | 字串   | `480P`、`720P`、`768P` 或 `1080P`                                         |
| `durationSeconds` | 數字   | 目標持續時間（以秒為單位，四捨五入至最接近的提供者支援值）                |
| `size`            | 字串   | 當提供者支援時的尺寸提示                                                  |
| `audio`           | 布林值 | 當支援時啟用產生的音訊                                                    |
| `watermark`       | 布林值 | 當支援時切換提供者浮水印                                                  |

### 進階

| 參數       | 類型 | 描述                                         |
| ---------- | ---- | -------------------------------------------- |
| `action`   | 字串 | `"generate"`（預設）、`"status"` 或 `"list"` |
| `model`    | 字串 | 提供者/模型覆寫（例如 `runway/gen4.5`）      |
| `filename` | 字串 | 輸出檔案名稱提示                             |

並非所有供應商都支援所有參數。OpenClaw 已將持續時間正規化為最接近供應商支援的值，並且當備用供應商公開不同的控制介面時，它還會重新映射轉換後的幾何提示，例如尺寸到長寬比。真正不支援的覆蓋設定會盡力忽略，並在工具結果中報告為警告。硬體能力限制（例如參考輸入過多）會在提交之前失敗。

工具結果會報告套用的設定。當 OpenClaw 在供應商備用期間重新映射持續時間或幾何形狀時，返回的 `durationSeconds`、`size`、`aspectRatio` 和 `resolution` 值反映的是實際提交的內容，而 `details.normalization` 則捕獲了從請求到套用的轉換過程。

參考輸入也會選擇執行時模式：

- 無參考媒體：`generate`
- 任何圖片參考：`imageToVideo`
- 任何影片參考：`videoToVideo`

混合圖片和影片參考並非穩定的共享功能介面。
請在每次請求中優先選擇一種參考類型。

## 操作

- **generate** (預設) -- 根據給定的提示詞和可選參考輸入建立影片。
- **status** -- 檢查目前工作階段中進行中影片任務的狀態，而不啟動另一個產生程序。
- **list** -- 顯示可用的供應商、模型及其功能。

## 模型選擇

產生影片時，OpenClaw 會依照以下順序解析模型：

1. **`model` 工具參數** -- 如果代理在呼叫中指定了此參數。
2. **`videoGenerationModel.primary`** -- 來自配置。
3. **`videoGenerationModel.fallbacks`** -- 依序嘗試。
4. **自動偵測** -- 使用具有有效驗證的供應商，從目前的預設供應商開始，然後按字母順序嘗試其餘供應商。

如果某個供應商失敗，系統會自動嘗試下一個候選者。如果所有候選者都失敗，錯誤資訊將包含每次嘗試的詳細資料。

如果您希望
影片產生僅使用明確的 `model`、`primary` 和 `fallbacks`
條目，請設定 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
      },
    },
  },
}
```

## 供應商備註

| 供應商   | 備註                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| 阿里雲   | 使用 DashScope/Model Studio 非同步端點。參考圖片和影片必須是遠端 `http(s)` URL。                                       |
| BytePlus | 僅支援單張圖片參考。                                                                                                   |
| ComfyUI  | 工作流程驅動的本機或雲端執行。透過配置的圖表支援文字生成影片和圖片生成影片。                                           |
| fal      | 對長時間執行的工作使用佇列支援的流程。僅支援單張圖片參考。                                                             |
| Google   | 使用 Gemini/Veo。支援一張圖片或一個影片參考。                                                                          |
| MiniMax  | 僅支援單張圖片參考。                                                                                                   |
| OpenAI   | 僅轉發 `size` 覆寫。其他樣式覆寫（`aspectRatio`、`resolution`、`audio`、`watermark`）將被忽略並顯示警告。              |
| Qwen     | 與阿里雲使用相同的 DashScope 後端。參考輸入必須是遠端 `http(s)` URL；本機檔案會被直接拒絕。                            |
| Runway   | 透過 data URIs 支援本機檔案。影片生成影片需要 `runway/gen4_aleph`。純文字執行會公開 `16:9` 和 `9:16` 長寬比。          |
| Together | 僅支援單張圖片參考。                                                                                                   |
| Vydra    | 直接使用 `https://www.vydra.ai/api/v1` 以避免認證遺失重新導向。`veo3` 打包為僅文字生成影片；`kling` 需要遠端圖片 URL。 |
| xAI      | 支援文字生成影片、圖片生成影片以及遠端影片編輯/擴充流程。                                                              |

## 供應商能力模式

共用的影片生成合約現在允許供應商宣告特定模式的功能，而不僅僅是單一的總體限制。新的供應商實作應優先使用明確的模式區塊：

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

諸如 `maxInputImages` 和 `maxInputVideos` 等總體欄位不足以宣告轉換模式支援。供應商應明確宣告 `generate`、`imageToVideo` 和 `videoToVideo`，即時測試、合約測試和共用的 `video_generate` 工具才能確定性驗證模式支援。

## 即時測試

共用打包供應商的選用即時覆蓋率：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Repo 包裝函式：

```bash
pnpm test:live:media video
```

此即時檔案會從 `~/.profile` 載入缺少的提供者環境變數，預設優先使用即時/env API 金鑰而非儲存的設定檔，並執行可透過本機媒體安全測試的已宣告模式：

- 針對掃描中的每個提供者進行 `generate`
- 當 `capabilities.imageToVideo.enabled` 時 `imageToVideo`
- 當 `capabilities.videoToVideo.enabled` 且提供者/模型在共用掃描中接受緩衝區支援的本機影片輸入時 `videoToVideo`

目前共用的 `videoToVideo` 即時通道涵蓋：

- 僅當您選擇 `runway/gen4_aleph` 時 `runway`

## 設定

在您的 OpenClaw 設定中設定預設的視訊生成模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

或透過 CLI：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## 相關

- [工具概述](/en/tools)
- [背景任務](/en/automation/tasks) -- 非同步視訊生成的任務追蹤
- [Alibaba Model Studio](/en/providers/alibaba)
- [BytePlus](/en/concepts/model-providers#byteplus-international)
- [ComfyUI](/en/providers/comfy)
- [fal](/en/providers/fal)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [OpenAI](/en/providers/openai)
- [Qwen](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [Together AI](/en/providers/together)
- [Vydra](/en/providers/vydra)
- [xAI](/en/providers/xai)
- [設定參考](/en/gateway/configuration-reference#agent-defaults)
- [模型](/en/concepts/models)
