---
summary: "透過 video_generate 從文字、圖片或影片參照生成影片，支援 16 個提供者後端"
read_when:
  - Generating videos via the agent
  - Configuring video-generation providers and models
  - Understanding the video_generate tool parameters
title: "影片生成"
sidebarTitle: "影片生成"
---

OpenClaw 智慧體可以根據文字提示、參考圖片或現有影片生成影片。支援 16 種提供者後端，每種後端都有不同的模型選項、輸入模式和功能集。智慧體會根據您的設定和可用的 API 金鑰自動選擇合適的提供者。

<Note>`video_generate` 工具僅在至少有一個影片生成提供者可用時才會出現。如果您在智慧體工具中看不到它，請設定提供者 API 金鑰或設定 `agents.defaults.videoGenerationModel`。</Note>

OpenClaw 將影片生成視為三種執行時模式：

- `generate` - 沒有參考媒體的文字生成影片請求。
- `imageToVideo` - 請求包含一或多張參考圖片。
- `videoToVideo` - 請求包含一或多個參考影片。

提供者可以支援這些模式的任何子集。該工具會在提交前驗證作用中的模式，並在 `action=list` 中回報支援的模式。

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
  <Step title="請求智慧體">
    > 生成一隻友善的龍蝦在日落時衝浪的 5 秒電影感影片。

    智慧體會自動呼叫 `video_generate`。不需要允許清單工具。

  </Step>
</Steps>

## 非同步生成如何運作

影片生成是非同步的。當智慧體在工作階段中呼叫 `video_generate` 時：

1. OpenClaw 會將請求提交給提供者，並立即傳回任務 ID。
2. 提供者會在背景處理工作（通常為 30 秒到數分鐘，視提供者和解析度而定；緩慢的佇列支援提供者可能執行到設定的逾時時間）。
3. 當影片準備好時，OpenClaw 會透過內部完成事件喚醒同一個工作階段。
4. 代理會透過工作階段的一般可見回覆模式告知使用者：若是自動模式則在最終回覆傳遞時；若工作階段需要訊息工具則為 `message(action="send")`。如果請求者工作階段處於非活動狀態或其喚醒失敗，且完成回覆中仍缺少部分生成的影片，OpenClaw 會傳送一個等幂的直接後援（fallback），其中僅包含缺失的影片。

當任務正在進行時，同一工作階段中重複的 `video_generate` 呼叫會傳回目前的任務狀態，而不是開始另一個生成作業。請使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 從 CLI 檢查進度。

在非 session 支援的 Agent 執行（例如直接工具呼叫）中，該工具會改為即時生成，並在同一輪次中傳回最終媒體路徑。

當提供者傳回位元組時，生成的影片檔案會儲存在 OpenClaw 管理的媒體儲存空間下。預設的生成影片儲存上限遵循影片媒體限制，而 `agents.defaults.mediaMaxMb` 會為較大的渲染提升此上限。當提供者也傳回託管輸出 URL 時，如果本機持續性拒絕過大的檔案，OpenClaw 可以傳遞該 URL 而不是讓任務失敗。

### 任務生命週期

| 狀態        | 含義                                                               |
| ----------- | ------------------------------------------------------------------ |
| `queued`    | 任務已建立，等待供應商接受。                                       |
| `running`   | 提供商正在處理（通常為 30 秒到幾分鐘，具體取決於提供商和解析度）。 |
| `succeeded` | 影片已就緒；Agent 會喚醒並將其貼到對話中。                         |
| `failed`    | 供應商錯誤或逾時；Agent 會喚醒並附上錯誤詳細資訊。                 |

從 CLI 檢查狀態：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

如果目前的影片任務已經是 `queued` 或 `running`，`video_generate` 將傳回現有的任務狀態，而不是開始新任務。使用 `action: "status"` 可在不觸發新生成的情況下明確檢查狀態。

## 支援的供應商

| 供應商                | 預設模型                        | 文字 | 圖片參考                                         | 影片參考                                | 驗證                                     |
| --------------------- | ------------------------------- | :--: | ------------------------------------------------ | --------------------------------------- | ---------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |  ✓   | 是 (遠端 URL)                                    | 是 (遠端 URL)                           | `MODELSTUDIO_API_KEY`                    |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       |  ✓   | 最多 2 張圖片 (僅限 I2V 模型；第一幀 + 最後一幀) | -                                       | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       |  ✓   | 最多 2 張圖片 (透過角色指定第一幀 + 最後一幀)    | -                                       | `BYTEPLUS_API_KEY`                       |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |  ✓   | 最多 9 弅參考圖片                                | 最多 3 部影片                           | `BYTEPLUS_API_KEY`                       |
| ComfyUI               | `workflow`                      |  ✓   | 1 張圖片                                         | -                                       | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| DeepInfra             | `Pixverse/Pixverse-T2V`         |  ✓   | -                                                | -                                       | `DEEPINFRA_API_KEY`                      |
| fal                   | `fal-ai/minimax/video-01-live`  |  ✓   | 1 張圖片；使用 Seedance 參考影片生成最多 9 張    | 使用 Seedance 參考影片生成最多 3 部影片 | `FAL_KEY`                                |
| Google                | `veo-3.1-fast-generate-preview` |  ✓   | 1 張圖片                                         | 1 部影片                                | `GEMINI_API_KEY`                         |
| MiniMax               | `MiniMax-Hailuo-2.3`            |  ✓   | 1 張圖片                                         | -                                       | `MINIMAX_API_KEY` 或 MiniMax OAuth       |
| OpenAI                | `sora-2`                        |  ✓   | 1 張圖片                                         | 1 部影片                                | `OPENAI_API_KEY`                         |
| OpenRouter            | `google/veo-3.1-fast`           |  ✓   | 最多 4 張圖片（首幀/尾幀或參考圖）               | -                                       | `OPENROUTER_API_KEY`                     |
| Qwen                  | `wan2.6-t2v`                    |  ✓   | 是（遠端 URL）                                   | 是（遠端 URL）                          | `QWEN_API_KEY`                           |
| Runway                | `gen4.5`                        |  ✓   | 1 張圖片                                         | 1 部影片                                | `RUNWAYML_API_SECRET`                    |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |  ✓   | `Wan-AI/Wan2.2-I2V-A14B` 僅                      | -                                       | `TOGETHER_API_KEY`                       |
| Vydra                 | `veo3`                          |  ✓   | 1 張圖片 (`kling`)                               | -                                       | `VYDRA_API_KEY`                          |
| xAI                   | `grok-imagine-video`            |  ✓   | 1 張首幀圖片或多達 7 個 `reference_image`        | 1 部影片                                | `XAI_API_KEY`                            |

部分提供者接受額外或替代的 API 金鑰環境變數。詳情請參閱個別[提供者頁面](#related)。

執行 `video_generate action=list` 以在執行時檢查可用的提供者、模型和執行模式。

### 功能矩陣

由 `video_generate`、合約測試和共用即時掃描所使用的明確模式合約：

| 供應商     | `generate` | `imageToVideo` | `videoToVideo` | 目前的共用即時通道                                                                                          |
| ---------- | :--------: | :------------: | :------------: | ----------------------------------------------------------------------------------------------------------- |
| Alibaba    |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；因為此提供者需要遠端 `http(s)` 視訊 URL，所以跳過 `videoToVideo`                |
| BytePlus   |     ✓      |       ✓        |       -        | `generate`、`imageToVideo`                                                                                  |
| ComfyUI    |     ✓      |       ✓        |       -        | 不在共用掃描中；特定工作流程的覆蓋範圍位於 Comfy 測試中                                                     |
| DeepInfra  |     ✓      |       -        |       -        | `generate`；原生 DeepInfra 視訊架構在打包合約中為文字生成視訊                                               |
| fal        |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；僅在使用 Seedance 參考生成視訊時 `videoToVideo`                                 |
| Google     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；共用 `videoToVideo` 被跳過，因為目前的緩衝支援 Gemini/Veo 掃描不接受該輸入      |
| MiniMax    |     ✓      |       ✓        |       -        | `generate`、`imageToVideo`                                                                                  |
| OpenAI     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；共用 `videoToVideo` 被跳過，因為此 org/input 路徑目前需要提供者端視訊編輯存取權 |
| OpenRouter |     ✓      |       ✓        |       -        | `generate`、`imageToVideo`                                                                                  |
| Qwen       |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 已跳過，因為此提供者需要遠端 `http(s)` 視訊 URL                  |
| Runway     |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 僅在選取的模型為 `runway/gen4_aleph` 時執行                      |
| Together   |     ✓      |       ✓        |       -        | `generate`、`imageToVideo`                                                                                  |
| Vydra      |     ✓      |       ✓        |       -        | `generate`；共用的 `imageToVideo` 已跳過，因為套件 `veo3` 僅支援文字，且套件 `kling` 需要遠端圖片 URL       |
| xAI        |     ✓      |       ✓        |       ✓        | `generate`、`imageToVideo`；`videoToVideo` 已跳過，因為此提供者目前需要遠端 MP4 URL                         |

## Tool parameters

### Required

<ParamField path="prompt" type="string" required>
  待生成視訊的文字描述。`action: "generate"` 的必要項目。
</ParamField>

### Content inputs

<ParamField path="image" type="string">
  單一參考圖片（路徑或 URL）。
</ParamField>
<ParamField path="images" type="string[]">
  多張參考圖片（最多 9 張）。
</ParamField>
<ParamField path="imageRoles" type="string[]">
  與合併圖片列表平行的選用性每個位置角色提示。 標準值：`first_frame`、`last_frame`、`reference_image`。
</ParamField>
<ParamField path="video" type="string">
  單一參考影片（路徑或 URL）。
</ParamField>
<ParamField path="videos" type="string[]">
  多個參考影片（最多 4 個）。
</ParamField>
<ParamField path="videoRoles" type="string[]">
  與合併影片列表平行的選用性每個位置角色提示。 標準值：`reference_video`。
</ParamField>
<ParamField path="audioRef" type="string">
  單一參考音訊（路徑或 URL）。當供應商支援音訊輸入時，用於背景音樂或人聲參考。
</ParamField>
<ParamField path="audioRefs" type="string[]">
  多個參考音訊（最多 3 個）。
</ParamField>
<ParamField path="audioRoles" type="string[]">
  與合併音訊列表平行的選用性每個位置角色提示。 標準值：`reference_audio`。
</ParamField>

<Note>角色提示會原樣轉發給供應商。標準值來自 `VideoGenerationAssetRole` 聯集，但供應商可能接受額外的角色字串。`*Roles` 陣列的項目數不得超過對應的參考列表；相差一個的錯誤會導致明確的失敗訊息。 使用空字串來保留位置不設定。對於 xAI，將每個圖片角色設為 `reference_image` 以使用其 `reference_images` 生成模式；針對單圖片圖片轉影片，請省略角色或使用 `first_frame`。</Note>

### 樣式控制

<ParamField path="aspectRatio" type="string">
  長寬比提示，例如 `1:1`、`16:9`、`9:16`、`adaptive` 或供應商特定的值。OpenClaw 會根據各個供應商對不支援的值進行正規化或忽略。
</ParamField>
<ParamField path="resolution" type="string">
  解析度提示，例如 `480P`、`720P`、`768P`、`1080P`、`4K` 或供應商特定的值。OpenClaw 會根據各個供應商對不支援的值進行正規化或忽略。
</ParamField>
<ParamField path="durationSeconds" type="number">
  目標持續時間，以秒為單位（四捨五入至最接近的供應商支援值）。
</ParamField>
<ParamField path="size" type="string">
  當供應商支援時的尺寸提示。
</ParamField>
<ParamField path="audio" type="boolean">
  當支援時，在輸出中啟用生成的音訊。與 `audioRef*`（輸入）不同。
</ParamField>
<ParamField path="watermark" type="boolean">
  當支援時切換供應商浮水印。
</ParamField>

`adaptive` 是一個供應商特定的標記：它會原樣轉發給在其功能中聲明 `adaptive` 的供應商（例如 BytePlus Seedance 使用它從輸入圖片尺寸自動偵測長寬比）。未聲明此標記的供應商會透過工具結果中的 `details.ignoredOverrides` 顯示該值，以便可以看到捨棄的情況。

### 進階

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 傳回目前的工作階段任務；`"list"` 檢視提供者。
</ParamField>
<ParamField path="model" type="string">提供者/模型覆寫（例如 `runway/gen4.5`）。</ParamField>
<ParamField path="filename" type="string">輸出檔名提示。</ParamField>
<ParamField path="timeoutMs" type="number">選用的提供者操作逾時時間（毫秒）。若省略，OpenClaw 會使用已設定的 `agents.defaults.videoGenerationModel.timeoutMs`，否則使用外掛作者設定的提供者預設值（若存在）。</ParamField>
<ParamField path="providerOptions" type="object">
  提供者特定選項，以 JSON 物件形式呈現（例如 `{"seed": 42, "draft": true}`）。
  宣告型別架構的提供者會驗證金鑰與類型；未知的
  金鑰或類型不符會在後援期間跳過該候選項。未宣告
  架構的提供者會原樣接收選項。執行 `video_generate action=list`
  以查看各提供者接受哪些選項。
</ParamField>

<Note>並非所有提供者都支援所有參數。OpenClaw 會將持續時間正規化為 最接近提供者支援的值，並在後援提供者公開不同的 控制介面時，重新映射已翻譯的幾何提示（例如 尺寸到長寬比）。真正不支援的覆寫會盡力忽略，並在工具結果中回報為警告。硬體能力限制 （例如參考輸入過多）會在提交前失敗。工具結果 會回報已套用的設定；`details.normalization` 會擷取任何 從請求到套用的轉換。</Note>

參考輸入會選擇執行時期模式：

- 無參考媒體 → `generate`
- 任何圖片參考 → `imageToVideo`
- 任何影片參考 → `videoToVideo`
- 參考音訊輸入**不會**改變解析模式；它們會套用在
  圖片/影片參考所選取的任何模式之上，且僅適用於
  宣告 `maxInputAudios` 的提供者。

混合圖片和影片參考並非穩定的共享功能介面。每次請請求請優先使用一種參考類型。

#### 後援與類型選項

某些能力檢查是在備援層而非工具邊界應用的，因此超過主要提供者限制的請求仍可在有能力的備援提供者上執行：

- 當請求包含音訊參考時，聲明不支援 `maxInputAudios`（或 `0`）的有效候選會被跳過，並嘗試下一個候選。
- 若有效候選的 `maxDurationSeconds` 低於請求的 `durationSeconds`
  且未聲明 `supportedDurationSeconds` 列表 → 跳過。
- 如果請求包含 `providerOptions` 且有效候選明確
  聲明了類型化的 `providerOptions` 結構描述 → 如果提供的鍵不在結構描述中或數值類型不符則跳過。未聲明結構描述的提供者會按原樣接收選項（向後相容的透傳）。提供者可以透過聲明空結構描述（`capabilities.providerOptions: {}`）來選擇不接受所有提供者選項，這會導致與類型不符時相同的跳過結果。

請求中的第一次跳過原因會以 `warn` 記錄，以便操作員查看其
主要提供者何時被跳過；後續跳過會以 `debug` 記錄，以
保持長串後援鏈的安靜。如果每個候選都被跳過，
聚合錯誤會包含每個候選的跳過原因。

## 動作

| 動作       | 用途                                                             |
| ---------- | ---------------------------------------------------------------- |
| `generate` | 預設。根據給定的提示詞和可選的參考輸入建立影片。                 |
| `status`   | 檢查目前工作階段中進行中影片任務的狀態，而不啟動另一個生成工作。 |
| `list`     | 顯示可用的提供者、模型及其能力。                                 |

## 模型選擇

OpenClaw 依以下順序解析模型：

1. **`model` 工具參數** - 如果代理在呼叫中指定了一個。
2. 來自組態的 **`videoGenerationModel.primary`**。
3. **`videoGenerationModel.fallbacks`** 按順序。
4. **自動偵測** - 具有有效驗證的提供者，從
   目前的預設提供者開始，然後是依字母順序排列的
   其餘提供者。

如果提供者失敗，會自動嘗試下一個候選者。如果所有
候選者都失敗，錯誤會包含每次嘗試的詳細資訊。

設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅
使用明確的 `model`、`primary` 和 `fallbacks` 項目。

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
    提供商 ID：`byteplus`。

    模型：`seedance-1-0-pro-250528`（預設）、
    `seedance-1-0-pro-t2v-250528`、`seedance-1-0-pro-fast-251015`、
    `seedance-1-0-lite-t2v-250428`、`seedance-1-0-lite-i2v-250428`。

    T2V 模型（`*-t2v-*`）不接受圖片輸入；I2V 模型和
    一般 `*-pro-*` 模型支援單一參考圖片（第一
    幀）。請以位置方式傳遞圖片或設定 `role: "first_frame"`。
    當提供圖片時，T2V 模型 ID 會自動切換至對應的 I2V
    變體。

    支援的 `providerOptions` 金鑰：`seed`（數字）、`draft`（布林值 -
    強制 480p）、`camera_fixed`（布林值）。

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    外掛程式。提供商 ID：`byteplus-seedance15`。模型：
    `seedance-1-5-pro-251215`。

    使用統一的 `content[]` API。最多支援 2 張輸入圖片
    （`first_frame` + `last_frame`）。所有輸入必須是遠端 `https://`
    URL。請在每張圖片上設定 `role: "first_frame"` / `"last_frame"`，或
    以位置方式傳遞圖片。

    `aspectRatio: "adaptive"` 會自動從輸入圖片偵測比例。
    `audio: true` 對應至 `generate_audio`。`providerOptions.seed`
    （數字）會被轉發。

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    需要 [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    插件。供應商 ID：`byteplus-seedance2`。模型：
    `dreamina-seedance-2-0-260128`、
    `dreamina-seedance-2-0-fast-260128`。

    使用統一的 `content[]` API。支援最多 9 張參考圖片、
    3 個參考影片和 3 個參考音訊。所有輸入必須是遠端
    `https://` URL。在每個資產上設定 `role` - 支援的值：
    `"first_frame"`、`"last_frame"`、`"reference_image"`、
    `"reference_video"`、`"reference_audio"`。

    `aspectRatio: "adaptive"` 會從輸入圖片自動偵測長寬比。
    `audio: true` 會對應到 `generate_audio`。`providerOptions.seed`
    (數字) 會被轉發。

  </Accordion>
  <Accordion title="ComfyUI">
    透過工作流程驅動的本地端或雲端執行。透過設定的圖表
    支援文字轉影片和圖片轉影片。
  </Accordion>
  <Accordion title="fal">
    針對長時間執行的工作，使用佇列支援的流程。預設情況下，OpenClaw 最多等待 20
    分鐘，才會將進行中的 fal 佇列工作視為
n    逾時。大多數 fal 影片模型
    接受單一圖片參考。Seedance 2.0 參考轉影片
    模型接受最多 9 張圖片、3 個影片和 3 個音訊參考，
    總共最多 12 個參考檔案。
  </Accordion>
  <Accordion title="Google (Gemini / Veo)">
    支援一張圖片或一個影片參考。由於 Gemini API 拒絕
    目前 Veo 影片生成功能的 `generateAudio` 參數，因此
    在 Gemini API 路徑上會忽略產生音訊的請求並發出警告。
  </Accordion>
  <Accordion title="MiniMax">
    僅支援單一圖片參考。MiniMax 接受 `768P` 和 `1080P`
    解析度；諸如 `720P` 的請求會在提交前
    標準化為最接近的支援值。
  </Accordion>
  <Accordion title="OpenAI">
    僅轉發 `size` 覆寫。其他樣式覆寫
    (`aspectRatio`、`resolution`、`audio`、`watermark`) 將被忽略並
    發出警告。
  </Accordion>
  <Accordion title="OpenRouter">
    使用 OpenRouter 的異步 `/videos` API。OpenClaw 提交
    工作，輪詢 `polling_url`，並下載 `unsigned_urls` 或
    記錄的工作內容端點。捆綁的 `google/veo-3.1-fast` 預設
    宣告支援 4/6/8 秒的持續時間、`720P`/`1080P` 解析度，以及
    `16:9`/`9:16` 長寬比。
  </Accordion>
  <Accordion title="Qwen">
    與 Alibaba 使用相同的 DashScope 後端。參考輸入必須是遠端
    `http(s)` URL；本機檔案會在開始時被拒絕。
  </Accordion>
  <Accordion title="Runway">
    透過 data URI 支援本機檔案。影片生成影片需要
    `runway/gen4_aleph`。僅文字執行會公開 `16:9` 和 `9:16` 長寬
    比。
  </Accordion>
  <Accordion title="Together">
    僅支援單一圖片參考。
  </Accordion>
  <Accordion title="Vydra">
    直接使用 `https://www.vydra.ai/api/v1` 以避免丟失驗證的
    重新導向。`veo3` 捆綁為僅文字生成影片；`kling` 需要
    遠端圖片 URL。
  </Accordion>
  <Accordion title="xAI">
    支援文字生成影片、單一第一幀圖片生成影片，透過 xAI `reference_images` 最多 7 個
    `reference_image` 輸入，以及遠端
    影片編輯/擴充流程。
  </Accordion>
</AccordionGroup>

## 供應商功能模式

共享的影片生成合約支援特定模式的功能，而不僅是單一的總體限制。新的供應商實作應優先使用明確的模式區塊：

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

諸如 `maxInputImages` 和 `maxInputVideos` 之類的扁平聚合欄位並
**不足以**宣告轉換模式支援。供應商應
明確宣告 `generate`、`imageToVideo` 和 `videoToVideo`，以便即時
測試、合約測試和共用的 `video_generate` 工具能夠確定性地
驗證模式支援。

當供應商中的某個模型比其他模型支援更廣泛的參考輸入時，請使用 `maxInputImagesByModel`、`maxInputVideosByModel` 或 `maxInputAudiosByModel`，而不是提高模式範圍的限制。

## 即時測試

共享打包供應商的選用即時覆蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Repo 包裝器：

```bash
pnpm test:live:media video
```

此即時檔案預設會優先使用已匯出的供應商環境變數，而非儲存的驗證設定檔，並預設執行釋放安全的冒煙測試：

- 針對掃描中的每個非 FAL 供應商執行 `generate`。
- 一秒鐘的龍蝦提示。
- 來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS`（預設為 `180000`）的單一供應商操作上限。

FAL 為選用，因為供應商端的佇列延遲可能會主導發行時間：

```bash
pnpm test:live:media video --video-providers fal
```

設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以同時執行共用的掃描可以透過本機媒體安全運作的已宣告轉換模式：

- 當 `capabilities.imageToVideo.enabled` 時執行 `imageToVideo`。
- 當 `capabilities.videoToVideo.enabled` 且供應商/模型在共用的掃描中接受緩衝區支援的本機影片輸入時，執行 `videoToVideo`。

目前共用的 `videoToVideo` 即時通道僅在您選擇 `runway/gen4_aleph` 時涵蓋 `runway`。

## 組態

在您的 OpenClaw 配置中設定預設的視訊生成模型：

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

- [阿里雲模型工作室](/zh-Hant/providers/alibaba)
- [背景任務](/zh-Hant/automation/tasks) - 用於非同步影片產生的任務追蹤
- [BytePlus](/zh-Hant/concepts/model-providers#byteplus-international)
- [ComfyUI](/zh-Hant/providers/comfy)
- [組態參考](/zh-Hant/gateway/config-agents#agent-defaults)
- [fal](/zh-Hant/providers/fal)
- [Google (Gemini)](/zh-Hant/providers/google)
- [MiniMax](/zh-Hant/providers/minimax)
- [模型](/zh-Hant/concepts/models)
- [OpenAI](/zh-Hant/providers/openai)
- [Qwen](/zh-Hant/providers/qwen)
- [Runway](/zh-Hant/providers/runway)
- [Together AI](/zh-Hant/providers/together)
- [工具概覽](/zh-Hant/tools)
- [Vydra](/zh-Hant/providers/vydra)
- [xAI](/zh-Hant/providers/xai)
