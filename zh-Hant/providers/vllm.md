---
summary: "使用 vLLM 執行 OpenClaw (OpenAI 相容的本地伺服器)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM 可以透過 **OpenAI 相容**的 HTTP API 來提供開源（及部分自訂）模型。OpenClaw 可以使用 `openai-completions` API 連接到 vLLM。

當您使用 `VLLM_API_KEY` 選擇加入時（如果您的伺服器未強制執行驗證，則任何值皆可），且您未定義明確的 `models.providers.vllm` 項目，OpenClaw 也可以從 vLLM **自動探索**可用的模型。

## 快速開始

1. 使用 OpenAI 相容的伺服器啟動 vLLM。

您的基礎 URL 應公開 `/v1` 端點（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常運行於：

- `http://127.0.0.1:8000/v1`

2. 選擇加入（如果未設定驗證，任何值皆可）：

```bash
export VLLM_API_KEY="vllm-local"
```

3. 選擇一個模型（替換為其中一個您的 vLLM 模型 ID）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## 模型探索（隱含供應商）

當設定了 `VLLM_API_KEY`（或存在驗證設定檔）且您**未**定義 `models.providers.vllm` 時，OpenClaw 將會查詢：

- `GET http://127.0.0.1:8000/v1/models`

……並將傳回的 ID 轉換為模型項目。

如果您明確設定了 `models.providers.vllm`，將會跳過自動探索，且您必須手動定義模型。

## 明確設定（手動模型）

在以下情況使用明確設定：

- vLLM 運行於不同的主機/連接埠。
- 您想要固定 `contextWindow`/`maxTokens` 值。
- 您的伺服器需要真實的 API 金鑰（或者您想要控制標頭）。

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

- 如果請求因驗證錯誤而失敗，請設定符合您伺服器設定的真實 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下明確設定供應商。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
