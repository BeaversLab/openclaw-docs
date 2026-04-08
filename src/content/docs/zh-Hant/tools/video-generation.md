---
summary: "使用 12 個供應商後端，從文字、圖片或現有影片生成影片"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "影片生成"
---

# 影片生成

OpenClaw 智慧體可以根據文字提示、參考圖片或現有影片來生成影片。支援 12 個供應商後端，每個後端都有不同的模型選項、輸入模式和功能集。智慧體會根據您的設定和可用的 API 金鑰自動選擇合適的供應商。

<Note>The `video_generate` tool only appears when at least one video-generation provider is available. If you do not see it in your agent tools, set a provider API key or configure `agents.defaults.videoGenerationModel`.</Note>

## 快速開始

1. 為任何支援的供應商設定 API 金鑰：

```bash
export GEMINI_API_KEY="your-key"
```

2. 可選擇指定預設模型：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. 要求智慧體：

> 生成一隻友善的龍蝦在日落時衝浪的 5 秒電影級影片。

智慧體會自動呼叫 `video_generate`。不需要將工具列入白名單。

## 生成影片時會發生什麼

影片生成是非同步的。當智慧體在會話中呼叫 `video_generate` 時：

1. OpenClaw 會向供應商提交請求，並立即傳回任務 ID。
2. 供應商會在後台處理工作（通常需要 30 秒到 5 分鐘，具體取決於供應商和解析度）。
3. 當影片準備好後，OpenClaw 會透過內部完成事件喚醒同一個會話。
4. 智慧體會將完成的影片張貼回原始對話中。

當工作正在進行時，同一會話中重複的 `video_generate` 呼叫會傳回目前的任務狀態，而不是開始另一個生成作業。請使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 從 CLI 檢查進度。

在非會話支援的智慧體執行中（例如，直接呼叫工具），該工具會退回到內聯生成，並在同一回合中傳回最終媒體路徑。

## 支援的供應商

| 供應商   | 預設模型                        | 文字           | 圖片參考            | 影片參考       | API 金鑰                                 |
| -------- | ------------------------------- | -------------- | ------------------- | -------------- | ---------------------------------------- |
| Alibaba  | `wan2.6-t2v`                    | 是             | 是 (遠端 URL)       | 是 (遠端 URL)  | `MODELSTUDIO_API_KEY`                    |
| BytePlus | `seedance-1-0-lite-t2v-250428`  | 是             | 1 張圖片            | 否             | `BYTEPLUS_API_KEY`                       |
| ComfyUI  | `workflow`                      | 是             | 1 張圖片            | 否             | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal      | `fal-ai/minimax/video-01-live`  | 是             | 1 張圖片            | 否             | `FAL_KEY`                                |
| Google   | `veo-3.1-fast-generate-preview` | 是             | 1 張圖片            | 1 部影片       | `GEMINI_API_KEY`                         |
| MiniMax  | `MiniMax-Hailuo-2.3`            | 是             | 1 張圖片            | 否             | `MINIMAX_API_KEY`                        |
| OpenAI   | `sora-2`                        | 是             | 1 張圖片            | 1 部影片       | `OPENAI_API_KEY`                         |
| Qwen     | `wan2.6-t2v`                    | 是（遠端 URL） | 是（遠端 URL）      | 是（遠端 URL） | `QWEN_API_KEY`                           |
| Runway   | `gen4.5`                        | 是             | 1 張圖片            | 1 部影片       | `RUNWAYML_API_SECRET`                    |
| Together | `Wan-AI/Wan2.2-T2V-A14B`        | 是             | 1 張圖片            | 否             | `TOGETHER_API_KEY`                       |
| Vydra    | `veo3`                          | 是             | 1 張圖片（`kling`） | 否             | `VYDRA_API_KEY`                          |
| xAI      | `grok-imagine-video`            | 是             | 1 張圖片            | 1 部影片       | `XAI_API_KEY`                            |

部分供應商接受額外或備用的 API 金鑰環境變數。詳情請參閱個別[供應商頁面](#related)。

執行 `video_generate action=list` 以檢查執行時可用的供應商和模型。

## 工具參數

### 必要

| 參數     | 類型 | 描述                                              |
| -------- | ---- | ------------------------------------------------- |
| `prompt` | 字串 | 要生成影片的文字描述（`action: "generate"` 必要） |

### 內容輸入

| 參數     | 類型     | 描述                       |
| -------- | -------- | -------------------------- |
| `image`  | 字串     | 單一參考圖片（路徑或 URL） |
| `images` | string[] | 多張參考圖片（最多 5 張）  |
| `video`  | 字串     | 單一參考影片（路徑或 URL） |
| `videos` | string[] | 多部參考影片（最多 4 部）  |

### 樣式控制

| 參數              | 類型    | 描述                                                                    |
| ----------------- | ------- | ----------------------------------------------------------------------- |
| `aspectRatio`     | 字串    | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` |
| `resolution`      | string  | `480P`, `720P` 或 `1080P`                                               |
| `durationSeconds` | number  | 目標長度，以秒為單位（四捨五入至供應商支援的最接近值）                  |
| `size`            | string  | 當供應商支援時的尺寸提示                                                |
| `audio`           | boolean | 當支援時啟用生成的音訊                                                  |
| `watermark`       | boolean | 當支援時切換供應商浮水印                                                |

### 進階

| 參數       | 類型   | 描述                                         |
| ---------- | ------ | -------------------------------------------- |
| `action`   | string | `"generate"`（預設）、`"status"` 或 `"list"` |
| `model`    | string | 供應商/模型覆寫（例如 `runway/gen4.5`）      |
| `filename` | string | 輸出檔名提示                                 |

並非所有供應商都支援所有參數。不支援的覆寫會盡力忽略，並在工具結果中作為警告回報。硬體能力限制（例如參考輸入過多）會在提交前失敗。

## 動作

- **generate**（預設）——根據給定的提示和可選的參考輸入建立影片。
- **status**——檢查目前工作階段中正在進行的影片任務狀態，而不啟動另一個生成。
- **list**——顯示可用的供應商、模型及其功能。

## 模型選擇

當生成影片時，OpenClaw 會依以下順序解析模型：

1. **`model` 工具參數**——如果代理在呼叫中指定了一個。
2. **`videoGenerationModel.primary`**——來自設定。
3. **`videoGenerationModel.fallbacks`**——依順序嘗試。
4. **自動偵測**——使用具有有效驗證的供應商，從目前的預設供應商開始，然後按字母順序使用剩餘的供應商。

如果某個提供者失敗，系統會自動嘗試下一個候選者。如果所有候選者都失敗，錯誤訊息會包含每次嘗試的詳細資訊。

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

## 提供者注意事項

| 提供者   | 注意事項                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Alibaba  | 使用 DashScope/Model Studio 非同步端點。參考圖片和影片必須是遠端 `http(s)` URL。                                         |
| BytePlus | 僅支援單一圖片參考。                                                                                                     |
| ComfyUI  | 由工作流程驅動的本地或雲端執行。透過配置的圖表支援文字產生影片和圖片產生影片。                                           |
| fal      | 對長時間執行的工作使用佇列支援的流程。僅支援單一圖片參考。                                                               |
| Google   | 使用 Gemini/Veo。支援一張圖片或一段影片參考。                                                                            |
| MiniMax  | 僅支援單一圖片參考。                                                                                                     |
| OpenAI   | 僅轉發 `size` 覆蓋值。其他樣式覆蓋值 (`aspectRatio`、`resolution`、`audio`、`watermark`) 將被忽略並顯示警告。            |
| Qwen     | 使用與 Alibaba 相同的 DashScope 後端。參考輸入必須是遠端 `http(s)` URL；本地檔案會在開始時被拒絕。                       |
| Runway   | 透過 data URI 支援本地檔案。影片生成影片需要 `runway/gen4_aleph`。純文字執行會公開 `16:9` 和 `9:16` 長寬比。             |
| Together | 僅支援單一圖片參考。                                                                                                     |
| Vydra    | 直接使用 `https://www.vydra.ai/api/v1` 以避免遺失驗證的重新導向。`veo3` 打包為僅文字生成影片；`kling` 需要遠端圖片 URL。 |
| xAI      | 支援文字生成影片、圖片生成影片，以及遠端影片編輯/擴充流程。                                                              |

## 設定

在您的 OpenClaw 設定中設定預設的影片生成模型：

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

## 相關連結

- [工具概覽](/en/tools)
- [背景工作](/en/automation/tasks) -- 非同步影片生成的工作追蹤
- [Alibaba Model Studio](/en/providers/alibaba)
- [BytePlus](/en/providers/byteplus)
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
- [配置參考](/en/gateway/configuration-reference#agent-defaults)
- [模型](/en/concepts/models)
