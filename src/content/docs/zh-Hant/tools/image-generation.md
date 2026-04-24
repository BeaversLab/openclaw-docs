---
summary: "使用設定的供應商（OpenAI、Google Gemini、fal、MiniMax、ComfyUI、Vydra、xAI）生成與編輯圖片"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "圖片生成"
---

# 圖片產生

`image_generate` 工具讓代理程式使用您設定的供應商建立與編輯圖片。生成的圖片會以媒體附件的形式自動包含在代理程式的回覆中。

<Note>當至少有一個圖片生成供應商可用時，才會顯示此工具。如果您在代理程式的工具中看不到 `image_generate`，請設定 `agents.defaults.imageGenerationModel` 或設定供應商 API 金鑰。</Note>

## 快速入門

1. 為至少一個供應商設定 API 金鑰（例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`）。
2. 選擇性設定您的偏好模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
      },
    },
  },
}
```

3. 告訴代理程式：_"產生一張友善的龍蝦吉祥物圖片。"_

代理程式會自動呼叫 `image_generate`。不需要將工具加入允許清單 — 當供應商可用時，此功能預設為啟用。

## 支援的供應商

| 供應商  | 預設模型                         | 編輯支援                       | API 金鑰                                              |
| ------- | -------------------------------- | ------------------------------ | ----------------------------------------------------- |
| OpenAI  | `gpt-image-2`                    | 是（最多 5 張圖片）            | `OPENAI_API_KEY`                                      |
| Google  | `gemini-3.1-flash-image-preview` | 是                             | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| fal     | `fal-ai/flux/dev`                | 是                             | `FAL_KEY`                                             |
| MiniMax | `image-01`                       | 是 (主體參考)                  | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| ComfyUI | `workflow`                       | 是（1 張圖片，由工作流程設定） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用於雲端     |
| Vydra   | `grok-imagine`                   | 否                             | `VYDRA_API_KEY`                                       |
| xAI     | `grok-imagine-image`             | 是（最多 5 張圖片）            | `XAI_API_KEY`                                         |

使用 `action: "list"` 在執行時檢查可用的供應商與模型：

```
/tool image_generate action=list
```

## 工具參數

| 參數          | 類型     | 描述                                                                            |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `prompt`      | 字串     | 圖片生成提示（`action: "generate"` 必需）                                       |
| `action`      | 字串     | `"generate"`（預設）或 `"list"` 以檢查供應商                                    |
| `model`       | 字串     | 供應商/模型覆寫，例如 `openai/gpt-image-2`                                      |
| `image`       | 字串     | 編輯模式的單一參考圖片路徑或 URL                                                |
| `images`      | string[] | 編輯模式的多張參考圖片（最多 5 張）                                             |
| `size`        | string   | 尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`       |
| `aspectRatio` | string   | 長寬比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` |
| `resolution`  | string   | 解析度提示：`1K`、`2K` 或 `4K`                                                  |
| `count`       | number   | 要生成的圖片數量（1–4）                                                         |
| `filename`    | string   | 輸出檔名提示                                                                    |

並非所有提供者都支援所有參數。當備援提供者支援接近的幾何選項而非精確要求的選項時，OpenClaw 會在提交前重新對應到最接近的支援尺寸、長寬比或解析度。真正不支援的覆寫仍會在工具結果中回報。

工具結果會回報套用的設定。當 OpenClaw 在提供者備援期間重新對應幾何參數時，傳回的 `size`、`aspectRatio` 和 `resolution` 數值會反映實際傳送的內容，而 `details.normalization` 則會擷取從請求到套用的轉換。

## 配置

### 模型選擇

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供者選擇順序

產生圖片時，OpenClaw 會依以下順序嘗試提供者：

1. 來自工具呼叫的 **`model` 參數**（如果代理指定了一個）
2. 來自配置的 **`imageGenerationModel.primary`**
3. 依序排列的 **`imageGenerationModel.fallbacks`**
4. **自動偵測** —— 僅使用具備驗證支援的提供者預設值：
   - 目前的預設提供者優先
   - 剩餘已註冊的圖片生成提供者，依提供者 ID 順序

如果提供者失敗（例如：驗證錯誤、速率限制等），系統會自動嘗試下一個候選者。如果全部失敗，錯誤訊息會包含每次嘗試的詳細資訊。

備註：

- 自動偵測具有驗證感知能力。只有當 OpenClaw 實際上能夠對該提供者進行驗證時，該提供者的預設選項才會進入候選清單。
- 預設情況下會啟用自動偵測。如果您希望影像生成僅使用明確指定的
  `model`、`primary` 和 `fallbacks`
  項目，請設定 `agents.defaults.mediaGenerationAutoProviderFallback: false`。
- 使用 `action: "list"` 來檢查目前已註冊的提供者、其預設模型以及驗證環境變數提示。

### 影像編輯

OpenAI、Google、fal、MiniMax、ComfyUI 和 xAI 支援編輯參考影像。請傳入參考影像路徑或 URL：

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、Google 和 xAI 透過 `images` 參數支援最多 5 張參考影像。fal、MiniMax 和 ComfyUI 支援 1 張。

### OpenAI `gpt-image-2`

OpenAI 影像生成預設為 `openai/gpt-image-2`。較舊的
`openai/gpt-image-1` 模型仍可被明確選取，但新的 OpenAI
影像生成和影像編輯請求應使用 `gpt-image-2`。

`gpt-image-2` 支援透過同一個 `image_generate` 工具進行文字轉影像生成和參考影像編輯。OpenClaw 會將 `prompt`、
`count`、`size` 和參考影像轉發給 OpenAI。OpenAI 不會直接接收
`aspectRatio` 或 `resolution`；在可能的情況下，OpenClaw 會將這些對應為
支援的 `size`，否則該工具會將其回報為已忽略的覆寫設定。

生成一張 4K 橫向影像：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```

生成兩張方形影像：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```

編輯一張本機參考影像：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```

使用多個參考進行編輯：

```
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```

MiniMax 影像生成可透過兩種內建的 MiniMax 驗證路徑使用：

- 針對 API 金鑰設定使用 `minimax/image-01`
- 針對 OAuth 設定使用 `minimax-portal/image-01`

## 提供者功能

| 功能               | OpenAI              | Google              | fal             | MiniMax                  | ComfyUI                    | Vydra   | xAI                 |
| ------------------ | ------------------- | ------------------- | --------------- | ------------------------ | -------------------------- | ------- | ------------------- |
| 生成               | 是（最多 4 張）     | 是（最多 4 張）     | 是（最多 4 張） | 是（最多 9 張）          | 是（工作流定義的輸出）     | 是（1） | 是（最多 4 張）     |
| 編輯/參考          | 是（最多 5 張圖片） | 是（最多 5 張圖片） | 是（1 張圖片）  | 是（1 張圖片，主體參考） | 是（1 張圖片，工作流配置） | 否      | 是（最多 5 張圖片） |
| 尺寸控制           | 是（最高 4K）       | 是                  | 是              | 否                       | 否                         | 否      | 否                  |
| 長寬比             | 否                  | 是                  | 是（僅生成）    | 是                       | 否                         | 否      | 是                  |
| 解析度（1K/2K/4K） | 否                  | 是                  | 是              | 否                       | 否                         | 否      | 是（1K/2K）         |

### xAI `grok-imagine-image`

內建的 xAI 提供者對僅提示詞的請求使用 `/v1/images/generations`，
當存在 `image` 或 `images` 時則使用 `/v1/images/edits`。

- 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-pro`
- 數量：最多 4 張
- 參考：一個 `image` 或最多五個 `images`
- 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
- 解析度：`1K`、`2K`
- 輸出：作為 OpenClaw 管理的圖片附件返回

OpenClaw 刻意不公開 xAI 原生的 `quality`、`mask`、`user` 或
額外的僅原生長寬比，直到這些控制項存在於共用的
跨提供者 `image_generate` 合約中。

## 相關

- [工具總覽](/zh-Hant/tools) — 所有可用的代理工具
- [fal](/zh-Hant/providers/fal) — fal 圖片和視訊提供者設定
- [ComfyUI](/zh-Hant/providers/comfy) — 本地 ComfyUI 和 Comfy Cloud 工作流程設定
- [Google (Gemini)](/zh-Hant/providers/google) — Gemini 圖片提供者設定
- [MiniMax](/zh-Hant/providers/minimax) — MiniMax 圖片提供者設定
- [OpenAI](/zh-Hant/providers/openai) — OpenAI Images 提供者設定
- [Vydra](/zh-Hant/providers/vydra) — Vydra 圖片、視訊和語音設定
- [xAI](/zh-Hant/providers/xai) — Grok 圖片、視訊、搜尋、程式碼執行和 TTS 設定
- [配置參考](/zh-Hant/gateway/configuration-reference#agent-defaults) — `imageGenerationModel` config
- [模型](/zh-Hant/concepts/models) — 模型配置與故障轉移
