---
summary: "透過 video_generate 從文字、圖片或影片參考生成影片，橫跨 14 個提供者後端"
read_when:
  - Generating videos via the agent
  - Configuring video-generation providers and models
  - Understanding the video_generate tool parameters
title: "影片生成"
sidebarTitle: "影片生成"
---

OpenClaw 智慧體可以根據文字提示、參考圖片或現有影片生成影片。支援 14 種提供者後端，每個後端都有不同的模型選項、輸入模式和功能集。智慧體會根據您的設定和可用的 API 金鑰自動選擇正確的提供者。

<Note>只有在至少有一個影片生成提供者可用時，`video_generate` 工具才會出現。如果您在智慧體工具中沒有看到它，請設定提供者 API 金鑰或設定 `agents.defaults.videoGenerationModel`。</Note>

OpenClaw 將影片生成視為三種執行時模式：

- `generate` — 沒有參考媒體的文字生影片請求。
- `imageToVideo` — 請求包含一或多張參考圖片。
- `videoToVideo` — 請求包含一或多個參考影片。

提供者可以支援這些模式的任何子集。該工具會在提交前驗證使用中的模式，並在 `action=list` 中回報支援的模式。

## 快速開始

<Steps>
  <Step title="設定驗證">
    為任何支援的提供者設定 API 金鑰：

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step title="選擇預設模型（選用）">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step title="詢問智慧體">
    > Generate a 5-second cinematic video of a friendly lobster surfing at sunset.

    智慧體會自動呼叫 `video_generate`。不需要工具允許清單。

  </Step>
</Steps>

## 非同步生成如何運作

影片生成是非同步的。當智慧體在工作階段中呼叫 `video_generate` 時：

1. OpenClaw 會將請求提交給提供者，並立即傳回任務 ID。
2. 提供者會在背景處理工作（通常為 30 秒到 5 分鐘，具體取決於提供者和解析度）。
3. 當影片準備好時，OpenClaw 會透過內部完成事件喚醒同一個工作階段。
4. Agent 會將生成的影片貼回原本的對話中。

當工作正在執行時，在相同 session 中重複呼叫 `video_generate` 會傳回目前的任務狀態，而不是開始另一次生成。請使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 從 CLI 檢查進度。

在非 session 支援的 Agent 執行（例如直接工具呼叫）中，該工具會改為即時生成，並在同一輪次中傳回最終媒體路徑。

當供應商傳回位元組時，生成的影片檔案會儲存在 OpenClaw 管理的媒體儲存空間下。預設的生成影片儲存上限遵循影片媒體限制，而 `agents.defaults.mediaMaxMb` 可針對較大的渲染提高此上限。當供應商也傳回託管的輸出 URL 時，如果本機持續性儲存拒絕了過大的檔案，OpenClaw 可以傳遞該 URL 而不是讓任務失敗。

### 任務生命週期

| 狀態        | 含義                                                            |
| ----------- | --------------------------------------------------------------- |
| `queued`    | 任務已建立，等待供應商接受。                                    |
| `running`   | 供應商正在處理（通常為 30 秒到 5 分鐘，視供應商和解析度而定）。 |
| `succeeded` | 影片已就緒；Agent 會喚醒並將其貼到對話中。                      |
| `failed`    | 供應商錯誤或逾時；Agent 會喚醒並附上錯誤詳細資訊。              |

從 CLI 檢查狀態：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

如果影片任務在當前 session 中已經是 `queued` 或 `running`，`video_generate` 會傳回現有任務狀態，而不是開始一個新任務。請使用 `action: "status"` 明確檢查而不會觸發新的生成。

## 支援的供應商

| 供應商                | 預設模型                        | 文字 | 圖片參考                                              | 影片參考                                        | 驗證                                     |
| --------------------- | ------------------------------- | :--: | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |  ✓   | 是 (遠端 URL)                                         | 是 (遠端 URL)                                   | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       |  ✓   | 最多 2 張圖片 (僅限 I2V 模型；第一幀 + 最後一幀)      | —                                               | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       |  ✓   | 最多 2 張圖片 (透過角色指定第一幀 + 最後一幀)         | —                                               | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |  ✓   | 最多 9 弅參考圖片                                     | 最多 3 部影片                                   | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |  ✓   | 1 張圖片                                              | —                                               | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  |  ✓   | 1 張圖片；若使用 Seedance 參考影片轉視頻最多可至 9 張 | 若使用 Seedance 參考影片轉視頻最多可至 3 部影片 | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |  ✓   | 1 張圖片                                              | 1 部影片                                        | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            |  ✓   | 1 張圖片                                              | —                                               | `MINIMAX_API_KEY` 或 MiniMax OAuth       |
| OpenAI                | `sora-2`                        |  ✓   | 1 張圖片                                              | 1 部影片                                        | `OPENAI_API_KEY`                         |
| Qwen                  | `wan2.6-t2v`                    |  ✓   | 是 (遠端 URL)                                         | 是 (遠端 URL)                                   | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |  ✓   | 1 張圖片                                              | 1 部影片                                        | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |  ✓   | 1 張圖片                                              | —                                               | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |  ✓   | 1 張圖片 (`kling`)                                    | —                                               | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |  ✓   | 1 張首幀圖片或最多 7 個 `reference_image`s            | 1 部影片                                        | `XAI_API_KEY`                            |

部分提供商接受額外或替代的 API 金鑰環境變數。詳情請參閱個別的
[提供商頁面](#related)。

執行 `video_generate action=list` 以在執行時檢查可用的提供商、模型和
執行模式。

### 功能矩陣

由 `video_generate`、合約測試和
共享即時 sweep 使用的明確模式合約：

| 提供商   | `generate` | `imageToVideo` | `videoToVideo` | 當前的共享即時通道                                                                                           |
| -------- | :--------: | :------------: | :------------: | ------------------------------------------------------------------------------------------------------------ |
| Alibaba  |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 已跳過，因為此提供商需要遠端 `http(s)` 影片 URL                   |
| BytePlus |     ✓      |       ✓        |       —        | `generate`, `imageToVideo`                                                                                   |
| ComfyUI  |     ✓      |       ✓        |       —        | 不在共享 sweep 中；特定工作流程的覆蓋範圍隨附於 Comfy 測試                                                   |
| fal      |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 僅在使用 Seedance 參考視頻時                                      |
| Google   |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; 共用的 `videoToVideo` 已跳過，因為目前支援緩衝區的 Gemini/Veo 掃描不接受該輸入   |
| MiniMax  |     ✓      |       ✓        |       —        | `generate`, `imageToVideo`                                                                                   |
| OpenAI   |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; 共用的 `videoToVideo` 已跳過，因為此組織/輸入路徑目前需要供應商端的重繪/混剪權限 |
| Qwen     |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 已跳過，因為此供應商需要遠端 `http(s)` 視頻 URL                   |
| Runway   |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 僅在選取的模型為 `runway/gen4_aleph` 時執行                       |
| Together |     ✓      |       ✓        |       —        | `generate`, `imageToVideo`                                                                                   |
| Vydra    |     ✓      |       ✓        |       —        | `generate`; 共用的 `imageToVideo` 已跳過，因為內建的 `veo3` 僅支援文字，而內建的 `kling` 需要遠端圖片 URL    |
| xAI      |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` 已跳過，因為此供應商目前需要遠端 MP4 URL                          |

## 工具參數

### 必要

<ParamField path="prompt" type="string" required>
  待生成視頻的文字描述。`action: "generate"` 的必要項目。
</ParamField>

### 內容輸入

<ParamField path="image" type="string">
  單一參考圖片（路徑或 URL）。
</ParamField>
<ParamField path="images" type="string[]">
  多張參考圖片（最多 9 張）。
</ParamField>
<ParamField path="imageRoles" type="string[]">
  可選的逐位置角色提示，與組合圖片列表平行。 標準值：`first_frame`、`last_frame`、`reference_image`。
</ParamField>
<ParamField path="video" type="string">
  單一參考影片（路徑或 URL）。
</ParamField>
<ParamField path="videos" type="string[]">
  多個參考影片（最多 4 個）。
</ParamField>
<ParamField path="videoRoles" type="string[]">
  可選的逐位置角色提示，與組合影片列表平行。 標準值：`reference_video`。
</ParamField>
<ParamField path="audioRef" type="string">
  單一參考音訊（路徑或 URL）。當供應商支援音訊輸入時，用於背景音樂或 聲音參考。
</ParamField>
<ParamField path="audioRefs" type="string[]">
  多個參考音訊（最多 3 個）。
</ParamField>
<ParamField path="audioRoles" type="string[]">
  可選的逐位置角色提示，與組合音訊列表平行。 標準值：`reference_audio`。
</ParamField>

<Note>角色提示會原樣轉發給供應商。標準值來自 `VideoGenerationAssetRole` 聯合型別，但供應商可能接受額外的 角色字串。`*Roles` 陣列的項目數不得超過對應的 參考列表；索引錯誤會導致明確的失敗訊息。請使用空字串讓位置保持未設定。 對於 xAI，請將每個圖片角色設定為 `reference_image` 以使用其 `reference_images` 生成模式； 若為單圖片圖生影片，請省略角色或使用 `first_frame`。</Note>

### 風格控制

<ParamField path="aspectRatio" type="string">
  `1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` 或 `adaptive`。
</ParamField>
<ParamField path="resolution" type="string">
  `480P`、`720P`、`768P` 或 `1080P`。
</ParamField>
<ParamField path="durationSeconds" type="number">
  目標持續時間，以秒為單位（四捨五入至提供商支援的最接近值）。
</ParamField>
<ParamField path="size" type="string">
  當提供商支援時的大小提示。
</ParamField>
<ParamField path="audio" type="boolean">
  當支援時，在輸出中啟用生成的音訊。這與 `audioRef*`（輸入）不同。
</ParamField>
<ParamField path="watermark" type="boolean">
  當支援時切換提供商浮水印。
</ParamField>

`adaptive` 是一個提供商特定的標記：它會原封不動地轉發給在其功能中宣告 `adaptive` 的提供商（例如 BytePlus Seedance 使用它來根據輸入影像尺寸自動偵測比例）。未宣告它的提供商會透過工具結果中的 `details.ignoredOverrides` 顯示該值，以便丟棄操作可見。

### 進階

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 會返回當前的 session task；`"list"` 用於檢查 providers。
</ParamField>
<ParamField path="model" type="string">Provider/model 覆寫（例如 `runway/gen4.5`）。</ParamField>
<ParamField path="filename" type="string">輸出檔名提示。</ParamField>
<ParamField path="timeoutMs" type="number">選用的 provider 請求逾時時間（毫秒）。</ParamField>
<ParamField path="providerOptions" type="object">
  特定 provider 的選項，格式為 JSON 物件（例如 `{"seed": 42, "draft": true}`）。
  宣告了型別 schema 的 providers 會驗證 key 與型別；未知的 key
  或型別不符會在 fallback 時跳過該候選項。未宣告 schema 的 providers
  會直接照收這些選項。執行 `video_generate action=list`
  以查看各 provider 接受的內容。
</ParamField>

<Note>並非所有 providers 都支援所有參數。OpenClaw 會將持續時間標準化為 最接近 provider 支援的值，並在 fallback provider 暴露不同的控制介面時 重新對映已轉譯的幾何提示（例如尺寸轉長寬比）。真正不支援的覆寫會盡力忽略 並在工具結果中回報為警告。硬體能力限制（例如參考輸入過多）會在提交前失敗。 工具結果會回報套用的設定；`details.normalization` 會捕捉從「請求」到「套用」的 轉換過程。</Note>

參考輸入會決定執行時模式：

- 無參考媒體 → `generate`
- 有任何圖片參考 → `imageToVideo`
- 有任何影片參考 → `videoToVideo`
- 參考音訊輸入**不會**改變解析出的模式；它們會疊加在
  圖片/影片參考所選擇的任何模式之上，且僅適用於
  宣告支援 `maxInputAudios` 的 providers。

混合圖片與影片參考並非穩定且共用的能力介面。請在每次請求中
偏好使用單一參考類型。

#### Fallback 與型別化選項

部分功能檢查是在備用層而非工具邊界進行的，因此超出主要提供者限制的請求仍可在支援的備用提供者上執行：

- 當請求包含音訊參考時，會跳過宣告未支援 `maxInputAudios`（或 `0`）的有效候選者；並嘗試下一個候選者。
- 有效候選者的 `maxDurationSeconds` 低於請求的 `durationSeconds`
  且未宣告 `supportedDurationSeconds` 列表 → 跳過。
- 請求包含 `providerOptions` 且有效候選者明確
  宣告了類型化的 `providerOptions` 結構描述 → 如果提供的金鑰
  不在結構描述中或數值類型不符，則跳過。未宣告
  結構描述的提供者會按原樣接收選項（向後相容
  的透傳）。提供者可以透過宣告空結構描述（`capabilities.providerOptions: {}`）來選擇不接收所有提供者選項，
  這會導致與類型不符時相同的跳過結果。

請求中的第一次跳過原因會以 `warn` 記錄，以便操作員知道
其主要提供者何時被略過；後續的跳過則以 `debug` 記錄，以
保持冗長的備用鏈安靜。如果每個候選者都被跳過，
則聚合的錯誤會包含每個候選者的跳過原因。

## 動作

| 動作       | 功能說明                                                         |
| ---------- | ---------------------------------------------------------------- |
| `generate` | 預設值。根據給定的提示詞和可選的參考輸入建立視訊。               |
| `status`   | 檢查目前工作階段中進行中的視訊任務狀態，而不啟動另一個產生程序。 |
| `list`     | 顯示可用的提供者、模型及其功能。                                 |

## 模型選擇

OpenClaw 依以下順序解析模型：

1. **`model` 工具參數** — 如果代理程式在呼叫中指定了其中一個。
2. 來自組態的 **`videoGenerationModel.primary`**。
3. 按順序的 **`videoGenerationModel.fallbacks`**。
4. **自動偵測** — 具有有效驗證的提供者，從
   目前的預設提供者開始，然後是依字母順序排列的
   其餘提供者。

如果提供者失敗，會自動嘗試下一個候選者。如果所有
候選者都失敗，錯誤會包含每次嘗試的詳細資訊。

設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅使用明確的 `model`、`primary` 和 `fallbacks` 項目。

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

## 供應商說明

<AccordionGroup>
  <Accordion title="Alibaba">
    使用 DashScope / Model Studio 非同步端點。參考圖片和
    影片必須是遠端 `http(s)` URL。
  </Accordion>
  <Accordion title="BytePlus (1.0)">
    供應商 ID：`byteplus`。

    模型：`seedance-1-0-pro-250528` (預設)、
    `seedance-1-0-pro-t2v-250528`、`seedance-1-0-pro-fast-251015`、
    `seedance-1-0-lite-t2v-250428`、`seedance-1-0-lite-i2v-250428`。

    T2V 模型 (`*-t2v-*`) 不接受圖片輸入；I2V 模型和
    通用 `*-pro-*` 模型支援單一參考圖片 (第一
    幀)。請依位置傳遞圖片或設定 `role: "first_frame"`。
    當提供圖片時，T2V 模型 ID 會自動切換至對應的 I2V
    變體。

    支援的 `providerOptions` 鍵：`seed` (數字)、`draft` (布林值 —
    強制 480p)、`camera_fixed` (布林值)。

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    外掛程式。供應商 ID：`byteplus-seedance15`。模型：
    `seedance-1-5-pro-251215`。

    使用統一的 `content[]` API。最多支援 2 個輸入圖片
    (`first_frame` + `last_frame`)。所有輸入必須是遠端 `https://`
    URL。請在每張圖片上設定 `role: "first_frame"` / `"last_frame"`，或
    依位置傳遞圖片。

    `aspectRatio: "adaptive"` 會從輸入圖片自動偵測比例。
    `audio: true` 對應至 `generate_audio`。`providerOptions.seed`
    (數字) 會被轉發。

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件。供應商 ID：`byteplus-seedance2`。模型：
    `dreamina-seedance-2-0-260128`、
    `dreamina-seedance-2-0-fast-260128`。

    使用統一的 `content[]` API。支援最多 9 張參考圖片、
    3 個參考影片和 3 個參考音訊。所有輸入必須是遠端
    `https://` URL。在每個資產上設定 `role` —— 支援的值：
    `"first_frame"`、`"last_frame"`、`"reference_image"`、
    `"reference_video"`、`"reference_audio"`。

    `aspectRatio: "adaptive"` 會從輸入圖片自動偵測比例。
    `audio: true` 對應到 `generate_audio`。`providerOptions.seed`
    （數字）會被轉發。

  </Accordion>
  <Accordion title="ComfyUI">
    由工作流程驅動的本地或雲端執行。透過配置的圖表支援
    文字生成影片和圖片生成影片。
  </Accordion>
  <Accordion title="fal">
    針對長時間執行的工作使用佇列支援流程。大多數 fal 影片模型
    接受單一圖片參考。Seedance 2.0 參考轉影片
    模型接受最多 9 張圖片、3 個影片和 3 個音訊參考，且
    最多 12 個參考檔案。
  </Accordion>
  <Accordion title="Google (Gemini / Veo)">
    支援一張圖片或一個影片參考。
  </Accordion>
  <Accordion title="MiniMax">
    僅支援單一圖片參考。
  </Accordion>
  <Accordion title="OpenAI">
    僅轉發 `size` 覆寫。其他樣式覆寫
    （`aspectRatio`、`resolution`、`audio`、`watermark`）將被忽略並
    顯示警告。
  </Accordion>
  <Accordion title="Qwen">
    與阿里雲相同的 DashScope 後端。參考輸入必須是遠端
    `http(s)` URL；本機檔案會在開始時被拒絕。
  </Accordion>
  <Accordion title="Runway">
    支援透過 data URI 的本機檔案。影片轉影片需要
    `runway/gen4_aleph`。純文字執行會公開 `16:9` 和 `9:16` 寬高比。
  </Accordion>
  <Accordion title="Together">
    僅支援單一圖片參考。
  </Accordion>
  <Accordion title="Vydra">
    直接使用 `https://www.vydra.ai/api/v1` 以避免遺失驗證的重導向。
    `veo3` 僅打包為文字轉影片；`kling` 需要
    遠端圖片 URL。
  </Accordion>
  <Accordion title="xAI">
    支援文字轉影片、單一第一幀圖片轉影片、透過 xAI `reference_images` 最多 7 個
    `reference_image` 輸入，以及遠端影片編輯/擴充流程。
  </Accordion>
</AccordionGroup>

## 供應商功能模式

共用的影片生成合約支援特定模式的功能，而不僅僅是平面的匯總限制。新的供應商實作應優先使用明確的模式區塊：

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
    maxInputImagesByModel: { "provider/reference-to-video": 9 },
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

平面匯總欄位（如 `maxInputImages` 和 `maxInputVideos`）並**不**足以宣佈轉換模式的支援。供應商應明確宣告
`generate`、`imageToVideo` 和 `videoToVideo`，以便即時測試、合約測試和共用的 `video_generate` 工具能夠決定性地驗證模式支援。

當某個供應商中的一個模型比其他模型具有更廣泛的參考輸入支援時，請使用 `maxInputImagesByModel`、`maxInputVideosByModel` 或
`maxInputAudiosByModel`，而不是提高整個模式的限制。

## 即時測試

共用的打包供應商的選用即時涵蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Repo 包裝器：

```bash
pnpm test:live:media video
```

此即時檔案會從 `~/.profile` 載入缺少的提供商環境變數，預設優先使用 live/env API 金鑰而非儲存的認證設定檔，並預設執行發布安全的冒煙測試：

- 針對掃描中的每個非 FAL 提供商執行 `generate`。
- 一秒鐘的龍蝦提示詞。
- 來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供商操作上限（預設為 `180000`）。

FAL 為選用，因為提供商端的佇列延遲可能會主導發布時間：

```bash
pnpm test:live:media video --video-providers fal
```

設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以同時執行共用的掃描可以使用本機媒體安全執行的已宣告轉換模式：

- 當 `capabilities.imageToVideo.enabled` 時，`imageToVideo`。
- 當 `capabilities.videoToVideo.enabled` 且提供商/模型在共用的掃描中接受緩衝支援的本機視訊輸入時，`videoToVideo`。

目前共用的 `videoToVideo` 即時通道僅在您選擇 `runway/gen4_aleph` 時涵蓋 `runway`。

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

- [阿里巴巴模型工作室](/zh-Hant/providers/alibaba)
- [背景任務](/zh-Hant/automation/tasks) — 非同步視訊生成的任務追蹤
- [BytePlus](/zh-Hant/concepts/model-providers#byteplus-international)
- [ComfyUI](/zh-Hant/providers/comfy)
- [設定參考](/zh-Hant/gateway/config-agents#agent-defaults)
- [fal](/zh-Hant/providers/fal)
- [Google (Gemini)](/zh-Hant/providers/google)
- [MiniMax](/zh-Hant/providers/minimax)
- [模型](/zh-Hant/concepts/models)
- [OpenAI](/zh-Hant/providers/openai)
- [Qwen](/zh-Hant/providers/qwen)
- [Runway](/zh-Hant/providers/runway)
- [Together AI](/zh-Hant/providers/together)
- [工具總覽](/zh-Hant/tools)
- [Vydra](/zh-Hant/providers/vydra)
- [xAI](/zh-Hant/providers/xai)
