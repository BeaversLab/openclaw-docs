---
summary: "使用 DeepInfra 的統一 API 來存取 OpenClaw 中最受歡迎的開放原始碼和前沿模型"
read_when:
  - You want a single API key for the top open source LLMs
  - You want to run models via DeepInfra's API in OpenClaw
title: "DeepInfra"
---

DeepInfra 提供了一個 **unified API**，可將請求路由到位於單一端點和 API 金鑰後的最受歡迎的開放原始碼和前沿模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 取得 API 金鑰

1. 前往 [https://deepinfra.com/](https://deepinfra.com/)
2. 登入或建立帳號
3. 前往 Dashboard / Keys 並產生新的 API 金鑰，或使用自動建立的金鑰

## CLI 設定

```bash
openclaw onboard --deepinfra-api-key <key>
```

或設定環境變數：

```bash
export DEEPINFRA_API_KEY="<your-deepinfra-api-key>" # pragma: allowlist secret
```

## 設定程式碼片段

```json5
{
  env: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V4-Flash" },
    },
  },
}
```

## 支援的 OpenClaw 介面

內建外掛程式會註冊所有符合目前 OpenClaw 提供者合約的 DeepInfra 介面。聊天、影像生成和視訊生成會在 `DEEPINFRA_API_KEY` 已設定時，從 `/v1/openai/models?sort_by=openclaw&filter=with_meta` 即時更新其型錄；其他介面則使用以下策劃的靜態預設值。

| 介面                  | 預設模型                                                                                | OpenClaw config/tool                                     |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Chat / model provider | 來自即時型錄的第一個聊天標記項目 (資訊清單後備 `deepseek-ai/DeepSeek-V4-Flash`)         | `agents.defaults.model`                                  |
| 圖片產生/編輯         | 來自即時型錄的第一個 `image-gen` 標記項目 (靜態後備 `black-forest-labs/FLUX-1-schnell`) | `image_generate`, `agents.defaults.imageGenerationModel` |
| 媒體理解              | `moonshotai/Kimi-K2.5` 用於影像                                                         | 輸入圖片理解                                             |
| 語音轉文字            | `openai/whisper-large-v3-turbo`                                                         | 輸入音訊轉錄                                             |
| 文字轉語音            | `hexgrad/Kokoro-82M`                                                                    | `messages.tts.provider: "deepinfra"`                     |
| 影片產生              | 來自即時型錄的第一個 `video-gen` 標記項目 (靜態後備 `Pixverse/Pixverse-T2V`)            | `video_generate`, `agents.defaults.videoGenerationModel` |
| 記憶嵌入              | `BAAI/bge-m3`                                                                           | `agents.defaults.memorySearch.provider: "deepinfra"`     |

DeepInfra 也公開了重新排序、分類、物件偵測和其他
原生模型類型。OpenClaw 目前對於這些類別沒有一等的提供者
合約，因此此外掛程式尚未註冊它們。

## 可用模型

OpenClaw 會在啟動時動態探索可用的 DeepInfra 模型。使用 `/models deepinfra` 來查看可用模型的完整清單。

[DeepInfra.com](https://deepinfra.com/) 上可用的任何模型都可以搭配 `deepinfra/` 前綴使用：

```
deepinfra/deepseek-ai/DeepSeek-V4-Flash
deepinfra/deepseek-ai/DeepSeek-V3.2
deepinfra/MiniMaxAI/MiniMax-M2.5
deepinfra/moonshotai/Kimi-K2.5
deepinfra/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B
deepinfra/zai-org/GLM-5.1
...and many more
```

## 註記

- 模型參照為 `deepinfra/<provider>/<model>` (例如 `deepinfra/Qwen/Qwen3-Max`)。
- 預設模型：`deepinfra/deepseek-ai/DeepSeek-V4-Flash`
- 基底 URL：`https://api.deepinfra.com/v1/openai`
- 原生視訊生成使用 `https://api.deepinfra.com/v1/inference/<model>`。

## 相關

- [模型提供者](/zh-Hant/concepts/model-providers)
- [所有提供者](/zh-Hant/providers/index)
