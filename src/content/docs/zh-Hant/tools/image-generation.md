---
summary: "使用設定的提供商（OpenAI、Google Gemini、fal、MiniMax、ComfyUI、Vydra）產生和編輯圖片"
read_when:
  - Generating images via the agent
  - Configuring image generation providers and models
  - Understanding the image_generate tool parameters
title: "圖片產生"
---

# 圖片產生

`image_generate` 工具讓代理程式 (agent) 使用您設定的供應商建立和編輯圖片。產生的圖片會在代理程式的回覆中自動以媒體附件的形式傳送。

<Note>此工具僅在至少有一個圖片產生供應商可用時才會出現。如果您在代理程式的工具中看不到 `image_generate`，請設定 `agents.defaults.imageGenerationModel` 或設定供應商 API 金鑰。</Note>

## 快速入門

1. 為至少一個供應商設定 API 金鑰 (例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`)。
2. 選擇性設定您的偏好模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

3. 告訴代理程式：_"產生一張友善的龍蝦吉祥物圖片。"_

代理程式會自動呼叫 `image_generate`。不需要將工具加入允許清單 — 當有供應商可用時，它預設為啟用狀態。

## 支援的供應商

| 供應商  | 預設模型                         | 編輯支援                       | API 金鑰                                              |
| ------- | -------------------------------- | ------------------------------ | ----------------------------------------------------- |
| OpenAI  | `gpt-image-1`                    | 是（最多 5 張圖片）            | `OPENAI_API_KEY`                                      |
| Google  | `gemini-3.1-flash-image-preview` | 是                             | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| fal     | `fal-ai/flux/dev`                | 是                             | `FAL_KEY`                                             |
| MiniMax | `image-01`                       | 是 (主體參考)                  | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| ComfyUI | `workflow`                       | 是（1 張圖片，由工作流程設定） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用於雲端     |
| Vydra   | `grok-imagine`                   | 否                             | `VYDRA_API_KEY`                                       |

使用 `action: "list"` 在執行時檢查可用的提供商和模型：

```
/tool image_generate action=list
```

## 工具參數

| 參數          | 類型   | 描述                                                                            |
| ------------- | ------ | ------------------------------------------------------------------------------- |
| `prompt`      | 字串   | 圖片生成提示（`action: "generate"` 必填）                                       |
| `action`      | 字串   | `"generate"`（預設）或 `"list"` 用以檢查提供商                                  |
| `model`       | 字串   | 提供商/模型覆寫，例如 `openai/gpt-image-1`                                      |
| `image`       | 字串   | 編輯模式的單一參考圖片路徑或 URL                                                |
| `images`      | 字串[] | 編輯模式的多張參考圖片（最多 5 張）                                             |
| `size`        | 字串   | 尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`1024x1792`、`1792x1024`       |
| `aspectRatio` | 字串   | 長寬比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` |
| `resolution`  | 字串   | 解析度提示：`1K`、`2K` 或 `4K`                                                  |
| `count`       | 數字   | 要生成的圖片數量（1–4）                                                         |
| `filename`    | 字串   | 輸出檔名提示                                                                    |

並非所有提供商都支援所有參數。該工具會傳遞每個提供商支援的參數，忽略其餘參數，並在工具結果中回報被捨棄的覆蓋設定。

## 設定

### 模型選擇

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供商選擇順序

生成圖像時，OpenClaw 會按以下順序嘗試提供商：

1. 來自工具呼叫的 **`model` 參數**（如果代理指定了一個）
2. 來自配置的 **`imageGenerationModel.primary`**
3. 按順序排列的 **`imageGenerationModel.fallbacks`**
4. **自動檢測** — 僅使用經過驗證支援的提供商預設值：
   - 當前的預設提供商優先
   - 其餘已註冊的圖像生成提供商按提供商 ID 順序

如果提供商失敗（認證錯誤、速率限制等），系統會自動嘗試下一個候選者。如果全部失敗，錯誤訊息將包含每次嘗試的詳細資訊。

註記：

- 自動檢測具備驗證感知能力。只有在 OpenClaw 實際上能夠通過驗證該提供商時，其預設值才會進入候選清單。
- 使用 `action: "list"` 檢查目前已註冊的提供商、其預設模型以及驗證環境變數提示。

### 圖像編輯

OpenAI、Google、fal、MiniMax 和 ComfyUI 支援編輯參考圖像。請傳遞參考圖像路徑或 URL：

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI 和 Google 透過 `images` 參數支援最多 5 張參考圖像。fal、MiniMax 和 ComfyUI 支援 1 張。

MiniMax 圖像生成可透過兩種捆綁的 MiniMax 驗證路徑使用：

- `minimax/image-01` 用於 API 金鑰設定
- `minimax-portal/image-01` 用於 OAuth 設定

## 提供商功能

| 功能              | OpenAI              | Google              | fal             | MiniMax                  | ComfyUI                      | Vydra      |
| ----------------- | ------------------- | ------------------- | --------------- | ------------------------ | ---------------------------- | ---------- |
| 生成              | 是（最多 4 張）     | 是（最多 4 張）     | 是（最多 4 張） | 是（最多 9 張）          | 是（工作流程定義的輸出）     | 是（1 張） |
| 編輯/參考         | 是（最多 5 張圖像） | 是（最多 5 張圖像） | 是（1 張圖像）  | 是（1 張圖像，主體參考） | 是（1 張圖像，工作流程配置） | 否         |
| 尺寸控制          | 是                  | 是                  | 是              | 否                       | 否                           | 否         |
| 長寬比            | 否                  | 是                  | 是（僅限生成）  | 是                       | 否                           | 否         |
| 解析度 (1K/2K/4K) | 否                  | 是                  | 是              | 否                       | 否                           | 否         |

## 相關

- [工具概覽](/en/tools) — 所有可用的代理工具
- [fal](/en/providers/fal) — fal 圖像和影片提供商設定
- [ComfyUI](/en/providers/comfy) — 本地 ComfyUI 和 Comfy Cloud 工作流程設定
- [Google (Gemini)](/en/providers/google) — Gemini 影像提供者設定
- [MiniMax](/en/providers/minimax) — MiniMax 影像提供者設定
- [OpenAI](/en/providers/openai) — OpenAI Images 提供者設定
- [Vydra](/en/providers/vydra) — Vydra 影像、影片和語音設定
- [Configuration Reference](/en/gateway/configuration-reference#agent-defaults) — `imageGenerationModel` 設定
- [Models](/en/concepts/models) — 模型設定與失效切換
