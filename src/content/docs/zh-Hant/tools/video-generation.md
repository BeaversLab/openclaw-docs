---
summary: "使用 14 個供應商後端從文字、圖片或現有影片生成影片"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "影片生成"
---

# 影片生成

OpenClaw 智慧體可以根據文字提示、參考圖片或現有影片來生成影片。系統支援十四種供應商後端，每個後端都提供不同的模型選項、輸入模式和功能集。智慧體會根據您的設定和可用的 API 金鑰自動選擇合適的供應商。

<Note>只有在至少有一個影片生成供應商可用時，`video_generate` 工具才會顯示。如果您在智慧體工具中看不到它，請設定供應商 API 金鑰或配置 `agents.defaults.videoGenerationModel`。</Note>

OpenClaw 將影片生成視為三種執行時模式：

- `generate` 用於沒有參考媒體的文字生成影片請求
- `imageToVideo` 當請求包含一張或多張參考圖片時
- `videoToVideo` 當請求包含一個或多個參考影片時

供應商可以支援這些模式的任何子集。該工具會在提交前驗證活動模式，並在 `action=list` 中回報支援的模式。

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

智慧體會自動呼叫 `video_generate`。不需要將工具加入允許清單。

## 生成影片時會發生什麼事

影片生成是非同步的。當智慧體在會話中呼叫 `video_generate` 時：

1. OpenClaw 將請求提交給提供者，並立即傳回工作 ID。
2. 提供者在背景處理工作（通常需要 30 秒到 5 分鐘，視提供者和解析度而定）。
3. 當影片準備好時，OpenClaw 會透過內部完成事件喚醒同一個會話。
4. 代理會將完成的影片貼回原始對話中。

當任務正在進行時，同一會話中重複的 `video_generate` 呼叫將回傳目前的任務狀態，而不是開始另一次生成。請使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 從 CLI 檢查進度。

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

重複預防：如果影片任務已經處於 `queued` 或 `running` 狀態，`video_generate` 將回傳現有的任務狀態，而不是開始新任務。請使用 `action: "status"` 明確檢查而不觸發新的生成。

## 支援的提供者

| 提供者                | 預設模型                        | 文字 | 圖片參照                                          | 影片參照         | API 金鑰                                 |
| --------------------- | ------------------------------- | ---- | ------------------------------------------------- | ---------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    | Yes  | Yes (remote URL)                                  | Yes (remote URL) | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       | Yes  | 最多 2 張圖片（僅限 I2V 模型；第一幀 + 最後一幀） | No               | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       | Yes  | 最多 2 張圖片（透過角色指定首尾幀）               | No               | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  | Yes  | 最多 9 張參考圖片                                 | 最多 3 部影片    | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      | Yes  | 1 張圖片                                          | 否               | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  | Yes  | 1 張圖片                                          | No               | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` | Yes  | 1 張圖片                                          | 1 部影片         | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            | Yes  | 1 張圖片                                          | 否               | `MINIMAX_API_KEY`                        |
| OpenAI                | `sora-2`                        | Yes  | 1 張圖片                                          | 1 部影片         | `OPENAI_API_KEY`                         |
| Qwen                  | `wan2.6-t2v`                    | Yes  | 是（遠端 URL）                                    | 是（遠端 URL）   | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        | Yes  | 1 張圖片                                          | 1 部影片         | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        | Yes  | 1 張圖片                                          | 否               | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          | 是   | 1 張圖片（`kling`）                               | 否               | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            | 是   | 1 張圖片                                          | 1 部影片         | `XAI_API_KEY`                            |

部分提供者接受額外或替代的 API 金鑰環境變數。詳情請參閱各別的[提供者頁面](#related)。

執行 `video_generate action=list` 以在執行時檢查可用的提供者、模型和
執行模式。

### 宣告的能力矩陣

這是 `video_generate`、合約測試
和共用即時掃描所使用的明確模式合約。

| 提供者   | `generate` | `imageToVideo` | `videoToVideo` | 目前的共用即時通道                                                                                                                       |
| -------- | ---------- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba  | 是         | 是             | 是             | `generate`、`imageToVideo`；`videoToVideo` 跳過，因為此提供者需要遠端 `http(s)` 影片 URL                                                 |
| BytePlus | 是         | 是             | 否             | `generate`、`imageToVideo`                                                                                                               |
| ComfyUI  | 是         | 是             | 否             | 不在共用掃描中；特定工作流程的涵蓋範圍位於 Comfy 測試中                                                                                  |
| fal      | 是         | 是             | 否             | `generate`、`imageToVideo`                                                                                                               |
| Google   | 是         | 是             | 是             | `generate`, `imageToVideo`; shared `videoToVideo` skipped because the current buffer-backed Gemini/Veo sweep does not accept that input  |
| MiniMax  | 是         | 是             | 否             | `generate`, `imageToVideo`                                                                                                               |
| OpenAI   | 是         | 是             | 是             | `generate`, `imageToVideo`; shared `videoToVideo` skipped because this org/input path currently needs provider-side inpaint/remix access |
| Qwen     | 是         | 是             | 是             | `generate`, `imageToVideo`; `videoToVideo` skipped because this provider needs remote `http(s)` video URLs                               |
| Runway   | 是         | 是             | 是             | `generate`, `imageToVideo`; `videoToVideo` runs only when the selected model is `runway/gen4_aleph`                                      |
| Together | 是         | 是             | 否             | `generate`, `imageToVideo`                                                                                                               |
| Vydra    | 是         | 是             | 否             | `generate`; shared `imageToVideo` skipped because bundled `veo3` is text-only and bundled `kling` requires a remote image URL            |
| xAI      | 是         | 是             | 是             | `generate`, `imageToVideo`; `videoToVideo` skipped because this provider currently needs a remote MP4 URL                                |

## 工具參數

### 必填

| 參數     | 類型 | 說明                                              |
| -------- | ---- | ------------------------------------------------- |
| `prompt` | 字串 | 要生成影片的文字描述（`action: "generate"` 所需） |

### 內容輸入

| 參數         | 類型     | 說明                                                                                           |
| ------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `image`      | 字串     | 單一參考圖片（路徑或 URL）                                                                     |
| `images`     | string[] | 多張參考圖片（最多 9 張）                                                                      |
| `imageRoles` | string[] | 與組合圖片清單對應的可選逐位置角色提示。標準值：`first_frame`、`last_frame`、`reference_image` |
| `video`      | 字串     | 單一參考影片（路徑或 URL）                                                                     |
| `videos`     | string[] | 多個參考影片（最多 4 個）                                                                      |
| `videoRoles` | string[] | 可選的每個位置的角色提示，與合併的影片清單相對應。標準值：`reference_video`                    |
| `audioRef`   | string   | 單一參考音訊（路徑或 URL）。當供應商支援音訊輸入時用於背景音樂或語音參考等用途                 |
| `audioRefs`  | string[] | 多個參考音訊（最多 3 個）                                                                      |
| `audioRoles` | string[] | 可選的每個位置的角色提示，與合併的音訊清單相對應。標準值：`reference_audio`                    |

角色提示會原樣轉發給供應商。標準值來自
`VideoGenerationAssetRole` 聯集，但供應商可能接受額外的
角色字串。`*Roles` 陣列的項目數不得超過對應的參考清單；
差一錯誤會導致明確的失敗訊息。使用空字串讓位置保持未設定狀態。

### 樣式控制

| 參數              | 類型    | 描述                                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------------------- |
| `aspectRatio`     | 字串    | `1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` 或 `adaptive` |
| `resolution`      | string  | `480P`、`720P`、`768P` 或 `1080P`                                                     |
| `durationSeconds` | number  | 目標持續時間，以秒為單位（四捨五入至最接近的供應商支援值）                            |
| `size`            | string  | 當供應商支援時的大小提示                                                              |
| `audio`           | boolean | 當支援時在輸出中啟用生成的音訊。這與 `audioRef*`（輸入）不同                          |
| `watermark`       | boolean | 當支援時切換供應商浮水印                                                              |

`adaptive` 是一個特定於供應商的標記：它會按原樣轉發給在其功能中聲明 `adaptive` 的供應商（例如 BytePlus Seedance 使用它從輸入影像尺寸自動檢測縱橫比）。未聲明它的供應商會透過工具結果中的 `details.ignoredOverrides` 顯示該值，以便丟棄內容可見。

### 進階

| 參數              | 類型   | 描述                                                                                                                                                                                                                                             |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `action`          | string | `"generate"`（預設）、`"status"` 或 `"list"`                                                                                                                                                                                                     |
| `model`           | string | 供應商/模型覆寫（例如 `runway/gen4.5`）                                                                                                                                                                                                          |
| `filename`        | string | 輸出檔名提示                                                                                                                                                                                                                                     |
| `providerOptions` | object | 作為 JSON 物件的特定供應商選項（例如 `{"seed": 42, "draft": true}`）。聲明類型架構的供應商會驗證鍵和類型；未知鍵或不匹配會在備援期間跳過候選。沒有聲明架構的供應商會按原樣接收選項。執行 `video_generate action=list` 以查看每個供應商接受的內容 |

並非所有供應商都支援所有參數。OpenClaw 已經將持續時間標準化為最接近的供應商支援值，並且當備援供應商公開不同的控制介面時，它還會重新映射轉換後的幾何提示，例如尺寸到縱橫比。真正不支援的覆寫會盡力忽略，並在工具結果中作為警告報告。硬性功能限制（例如參考輸入過多）會在提交前失敗。

工具結果會報告應用的設定。當 OpenClaw 在供應商備援期間重新映射持續時間或幾何形狀時，返回的 `durationSeconds`、`size`、`aspectRatio` 和 `resolution` 值反映的是提交的內容，而 `details.normalization` 捕獲的是從請求到應用的轉換。

參考輸入也會選擇執行時模式：

- 無參考媒體：`generate`
- 任何影像參考：`imageToVideo`
- 任何影片參考：`videoToVideo`
- 參考音訊輸入不會改變解析出的模式；它們會套用在圖片/影片參考所選擇的任何模式之上，且僅適用於宣告了 `maxInputAudios` 的供應商。

混合的圖片和影片參考並非穩定的共享功能介面。
每個請求請優先使用一種參考類型。

#### 後備與類型選項

某些功能檢查是在後備層級而非工具邊界應用的，以便超出主要供應商限制的請求仍能在支援的後備供應商上執行：

- 如果目前候選者未宣告 `maxInputAudios`（或將其宣告為
  `0`），則當請求包含音訊參考時將跳過該候選者，並嘗試下一個候選者。
- 如果目前候選者的 `maxDurationSeconds` 低於請求的
  `durationSeconds`，且該候選者未宣告
  `supportedDurationSeconds` 清單，則將跳過該候選者。
- 如果請求包含 `providerOptions` 且目前候選者明確宣告了類型化的 `providerOptions` 架構，則當提供的金鑰不在架構中或值類型不符時，將跳過該候選者。尚未宣告架構的供應商將原樣接收選項（向後相容的直通傳遞）。供應商可以透過宣告空架構（`capabilities.providerOptions: {}`）明確選擇退出所有供應商選項，這會導致與類型不符相同的跳過結果。

請求中的第一個跳過原因會以 `warn` 紀錄，以便操作員了解何時略過了其主要供應商；隨後的跳過以 `debug` 紀錄，以保持冗長的後備鏈安靜。如果所有候選者都被跳過，聚合的錯誤會包含每個候選者的跳過原因。

## 動作

- **generate** (預設) -- 根據給定的提示詞和可選的參考輸入建立影片。
- **status** -- 檢查目前工作階段中進行中影片任務的狀態，而不啟動另一個生成程序。
- **list** -- 顯示可用的供應商、模型及其功能。

## 模型選擇

生成影片時，OpenClaw 會依照以下順序解析模型：

1. **`model` 工具參數** -- 如果代理程式在呼叫中指定了此參數。
2. **`videoGenerationModel.primary`** -- 從配置。
3. **`videoGenerationModel.fallbacks`** -- 按順序嘗試。
4. **Auto-detection** -- 使用具有有效驗證的提供者，從當前預設提供者開始，然後按字母順序使用其餘提供者。

如果提供者失敗，將自動嘗試下一個候選者。如果所有候選者都失敗，錯誤資訊將包含每次嘗試的詳細資料。

如果您希望影片生成僅使用明確的 `model`、`primary` 和 `fallbacks` 條目，請設定 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

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

## 提供者備註

| 提供者                | 備註                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba               | 使用 DashScope/Model Studio 非同步端點。參考圖片和影片必須是遠端 `http(s)` URL。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BytePlus (1.0)        | 提供者 ID `byteplus`。模型：`seedance-1-0-pro-250528` (預設)、`seedance-1-0-pro-t2v-250528`、`seedance-1-0-pro-fast-251015`、`seedance-1-0-lite-t2v-250428`、`seedance-1-0-lite-i2v-250428`。T2V 模型 (`*-t2v-*`) 不接受圖片輸入；I2V 模型和一般 `*-pro-*` 模型支援單一參考圖片 (第一幀)。依位置傳遞圖片或設定 `role: "first_frame"`。當提供圖片時，T2V 模型 ID 會自動切換到對應的 I2V 變體。支援的 `providerOptions` 鍵：`seed` (數字)、`draft` (布林值，強制 480p)、`camera_fixed` (布林值)。                                                                                                                  |
| BytePlus Seedance 1.5 | 需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark) 插件。供應商 ID 為 `byteplus-seedance15`。模型：`seedance-1-5-pro-251215`。使用統一的 `content[]` API。最多支援 2 張輸入圖片 (first_frame + last_frame)。所有輸入必須是遠端 `https://` URL。在每張圖片上設定 `role: "first_frame"` / `"last_frame"`，或按位置傳遞圖片。`aspectRatio: "adaptive"` 會從輸入圖片自動偵測長寬比。`audio: true` 對應至 `generate_audio`。`providerOptions.seed` (數字) 會被轉發。                                                                                                     |
| BytePlus Seedance 2.0 | 需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark) 插件。供應商 ID 為 `byteplus-seedance2`。模型：`dreamina-seedance-2-0-260128`、`dreamina-seedance-2-0-fast-260128`。使用統一的 `content[]` API。最多支援 9 張參考圖片、3 個參考影片和 3 個參考音訊。所有輸入必須是遠端 `https://` URL。在每個資產上設定 `role` — 支援的值：`"first_frame"`、`"last_frame"`、`"reference_image"`、`"reference_video"`、`"reference_audio"`。`aspectRatio: "adaptive"` 會從輸入圖片自動偵測長寬比。`audio: true` 對應至 `generate_audio`。`providerOptions.seed` (數字) 會被轉發。 |
| ComfyUI               | 工作流程驅動的本機或雲端執行。透過配置的圖形支援文字生成影片和圖片生成影片。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| fal                   | 針對長時間執行的工作使用佇列備援流程。僅支援單一圖片參考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Google                | 使用 Gemini/Veo。支援一張圖片或一個影片參考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| MiniMax               | 僅支援單一圖片參考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| OpenAI                | 僅轉發 `size` 覆蓋。其他樣式覆蓋 (`aspectRatio`、`resolution`、`audio`、`watermark`) 將被忽略並顯示警告。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Qwen                  | 與阿里雲相同的 DashScope 後端。參考輸入必須是遠端 `http(s)` URL；本機檔案會被拒絕。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Runway                | 透過 data URI 支援本機檔案。影片生影片需要 `runway/gen4_aleph`。純文字執行公開 `16:9` 和 `9:16` 長寬比。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Together              | 僅支援單一圖片參考。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Vydra                 | 直接使用 `https://www.vydra.ai/api/v1` 以避免遺失認證的重新導向。`veo3` 僅捆綁為文字生影片；`kling` 需要遠端圖片 URL。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| xAI                   | 支援文字生影片、圖片生影片以及遠端影片編輯/延伸流程。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 供應商能力模式

共用的影片生成合約現在允許供應商宣告特定模式的功能，而不僅僅是扁平的總體限制。新的供應商實作應優先使用明確的模式區塊：

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

諸如 `maxInputImages` 和 `maxInputVideos` 之類的扁平總體欄位不足以宣佈轉換模式支援。供應商應明確宣告 `generate`、`imageToVideo` 和 `videoToVideo`，以便即時測試、合約測試和共用的 `video_generate` 工具能決定性地驗證模式支援。

## 即時測試

選用的共用捆綁供應商即時覆蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Repo 包裝器：

```bash
pnpm test:live:media video
```

此即時檔案從 `~/.profile` 載入缺失的供應商環境變數，預設優先使用 live/env API 金鑰而非儲存的認證設定檔，並預設執行釋出安全的冒煙測試：

- 掃描中每個非 FAL 供應商的 `generate`
- 一秒鐘龍蝦提示
- 來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個供應商操作上限
  (預設為 `180000`)

FAL 為選用，因為供應商端佇列延遲可能佔據大部分釋出時間：

```bash
pnpm test:live:media video --video-providers fal
```

設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以也執行共用的掃描能以本機媒體安全執行的已宣告轉換模式：

- 當 `capabilities.imageToVideo.enabled` 時 `imageToVideo`
- 當 `capabilities.videoToVideo.enabled` 且提供者/模型
  在共同測試中接受緩衝支援的本機影片輸入時，`videoToVideo`

目前共同的 `videoToVideo` 實時通道涵蓋：

- 僅當您選擇 `runway/gen4_aleph` 時 `runway`

## 配置

在您的 OpenClaw 配置中設定預設的影片生成模型：

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

- [工具總覽](/zh-Hant/tools)
- [背景任務](/zh-Hant/automation/tasks) -- 非同步影片生成的任務追蹤
- [Alibaba Model Studio](/zh-Hant/providers/alibaba)
- [BytePlus](/zh-Hant/concepts/model-providers#byteplus-international)
- [ComfyUI](/zh-Hant/providers/comfy)
- [fal](/zh-Hant/providers/fal)
- [Google (Gemini)](/zh-Hant/providers/google)
- [MiniMax](/zh-Hant/providers/minimax)
- [OpenAI](/zh-Hant/providers/openai)
- [Qwen](/zh-Hant/providers/qwen)
- [Runway](/zh-Hant/providers/runway)
- [Together AI](/zh-Hant/providers/together)
- [Vydra](/zh-Hant/providers/vydra)
- [xAI](/zh-Hant/providers/xai)
- [配置參考](/zh-Hant/gateway/configuration-reference#agent-defaults)
- [模型](/zh-Hant/concepts/models)
