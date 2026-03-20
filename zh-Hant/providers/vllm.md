---
summary: "使用 vLLM 執行 OpenClaw (OpenAI 相容的本地伺服器)"
read_when:
  - 您希望針對本地 vLLM 伺服器執行 OpenClaw
  - 您希望使用自己的模型獲得 OpenAI 相容的 /v1 端點
title: "vLLM"
---

# vLLM

vLLM 可以透過 **OpenAI 相容** 的 HTTP API 提供開源 (以及部分自訂) 模型。OpenClaw 可以使用 `openai-completions` API 連接到 vLLM。

當您使用 `VLLM_API_KEY` 加入時 (如果您的伺服器不強制執行驗證，任何值皆可)，並且您未定義明確的 `models.providers.vllm` 項目，OpenClaw 也可以從 vLLM **自動探索** 可用的模型。

## 快速開始

1. 使用 OpenAI 相容伺服器啟動 vLLM。

您的基礎 URL 應公開 `/v1` 端點 (例如 `/v1/models`、`/v1/chat/completions`)。vLLM 通常運行於：

- `http://127.0.0.1:8000/v1`

2. 加入 (如果未設定驗證，任何值皆可)：

```bash
export VLLM_API_KEY="vllm-local"
```

3. 選擇一個模型 (替換為您其中一個 vLLM 模型 ID)：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## 模型探索 (隱含提供者)

當設定了 `VLLM_API_KEY` (或存在驗證設定檔) 且您 **未** 定義 `models.providers.vllm` 時，OpenClaw 將查詢：

- `GET http://127.0.0.1:8000/v1/models`

…並將傳回的 ID 轉換為模型項目。

如果您明確設定 `models.providers.vllm`，將跳過自動探索，且您必須手動定義模型。

## 明確設定 (手動模型)

在以下情況使用明確設定：

- vLLM 運行於不同的主機/連接埠。
- 您希望固定 `contextWindow`/`maxTokens` 值。
- 您的伺服器需要真實的 API 金鑰 (或者您希望控制標頭)。

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 疑難排解

- 檢查伺服器是否可連線：

```bash
curl http://127.0.0.1:8000/v1/models
```

- 如果請求因驗證錯誤而失敗，請設定符合您伺服器設定的真實 `VLLM_API_KEY`，或在 `models.providers.vllm` 下明確設定提供者。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
