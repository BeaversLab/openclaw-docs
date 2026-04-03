---
summary: "使用設定的供應商 (OpenAI, Google Gemini, fal, MiniMax) 產生及編輯圖片"
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
      imageGenerationModel: "openai/gpt-image-1",
    },
  },
}
```

3. 告訴代理程式：_"產生一張友善的龍蝦吉祥物圖片。"_

代理程式會自動呼叫 `image_generate`。不需要將工具加入允許清單 — 當有供應商可用時，它預設為啟用狀態。

## 支援的供應商

| 供應商  | 預設模型                         | 編輯支援      | API 金鑰                             |
| ------- | -------------------------------- | ------------- | ------------------------------------ |
| OpenAI  | `gpt-image-1`                    | 否            | `OPENAI_API_KEY`                     |
| Google  | `gemini-3.1-flash-image-preview` | 是            | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` |
| fal     | `fal-ai/flux/dev`                | 是            | `FAL_KEY`                            |
| MiniMax | `image-01`                       | 是 (主體參考) | `MINIMAX_API_KEY`                    |

使用 `action: "list"` 在執行時檢查可用的供應商和模型：

```
/tool image_generate action=list
```

## 工具參數

| 參數          | 類型     | 描述                                                                            |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `prompt`      | 字串     | 圖片產生提示詞 (`action: "generate"` 必填)                                      |
| `action`      | 字串     | `"generate"` (預設) 或 `"list"` 以檢查供應商                                    |
| `model`       | 字串     | 供應商/模型覆寫，例如 `openai/gpt-image-1`                                      |
| `image`       | 字串     | 編輯模式的單一參考圖片路徑或 URL                                                |
| `images`      | string[] | 編輯模式的多張參考圖片 (最多 5 張)                                              |
| `size`        | 字串     | 尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`1024x1792`、`1792x1024`       |
| `aspectRatio` | 字串     | 長寬比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9` |
| `resolution`  | 字串     | 解析度提示：`1K`、`2K` 或 `4K`                                                  |
| `count`       | 數字     | 要產生的圖片數量 (1–4)                                                          |
| `filename`    | 字串     | 輸出檔名提示                                                                    |

並非所有提供者都支援所有參數。此工具會傳遞各提供者支援的參數，並忽略其餘參數。

## 設定

### 模型選擇

```json5
{
  agents: {
    defaults: {
      // String form: primary model only
      imageGenerationModel: "google/gemini-3-pro-image-preview",

      // Object form: primary + ordered fallbacks
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供者選擇順序

產生圖片時，OpenClaw 會依下列順序嘗試提供者：

1. 來自工具呼叫的 **`model` 參數**（如果代理程式指定了一個）
2. 來自組態的 **`imageGenerationModel.primary`**
3. 依序排列的 **`imageGenerationModel.fallbacks`**
4. **自動偵測** — 查詢所有已註冊提供者的預設值，優先順序為：已設定的主要提供者、然後是 OpenAI、接著是 Google、最後是其他提供者

如果提供者失敗（驗證錯誤、速率限制等），系統會自動嘗試下一個候選者。如果全部失敗，錯誤訊息會包含每次嘗試的詳細資訊。

### 圖片編輯

Google、fal 和 MiniMax 支援編輯參考圖片。傳遞參考圖片路徑或 URL：

```
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

Google 透過 `images` 參數支援最多 5 張參考圖片。fal 和 MiniMax 支援 1 張。

## 提供者功能

| 功能              | OpenAI          | Google              | fal             | MiniMax                  |
| ----------------- | --------------- | ------------------- | --------------- | ------------------------ |
| 產生              | 是（最多 4 張） | 是（最多 4 張）     | 是（最多 4 張） | 是（最多 9 張）          |
| 編輯/參考         | 否              | 是（最多 5 張圖片） | 是（1 張圖片）  | 是（1 張圖片，主體參照） |
| 尺寸控制          | 是              | 是                  | 是              | 否                       |
| 長寬比            | 否              | 是                  | 是（僅限產生）  | 是                       |
| 解析度 (1K/2K/4K) | 否              | 是                  | 是              | 否                       |

## 相關

- [工具概覽](/en/tools) — 所有可用的代理工具
- [組態參考](/en/gateway/configuration-reference#agent-defaults) — `imageGenerationModel` 組態
- [模型](/en/concepts/models) — 模型組態與故障轉移
