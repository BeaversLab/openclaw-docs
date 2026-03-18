---
summary: "使用 SGLang 執行 OpenClaw（OpenAI 相容的自託管伺服器）"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

# SGLang

SGLang 可以透過 **OpenAI 相容** 的 HTTP API 服務開源模型。
OpenClaw 可以使用 `openai-completions` API 連接到 SGLang。

當您使用 `SGLANG_API_KEY` 加入選用（如果您的伺服器不強制執行驗證，則任何值皆有效）
且未定義明確的 `models.providers.sglang` 項目時，OpenClaw 也可以從 SGLang **自動探索** 可用模型。

## 快速開始

1. 使用 OpenAI 相容伺服器啟動 SGLang。

您的基底 URL 應公開 `/v1` 端點（例如 `/v1/models`、
`/v1/chat/completions`）。SGLang 通常運行於：

- `http://127.0.0.1:30000/v1`

2. 加入選用（如果未設定驗證，任何值皆有效）：

```bash
export SGLANG_API_KEY="sglang-local"
```

3. 執行上架程式並選擇 `SGLang`，或直接設定模型：

```bash
openclaw onboard
```

```json5
{
  agents: {
    defaults: {
      model: { primary: "sglang/your-model-id" },
    },
  },
}
```

## 模型探索（隱含提供者）

當設定 `SGLANG_API_KEY`（或存在驗證設定檔）且您 **不**
定義 `models.providers.sglang` 時，OpenClaw 將會查詢：

- `GET http://127.0.0.1:30000/v1/models`

並將傳回的 ID 轉換為模型項目。

如果您明確設定 `models.providers.sglang`，將會跳過自動探索，
且您必須手動定義模型。

## 明確設定（手動模型）

在以下情況使用明確設定：

- SGLang 運行於不同的主機/連接埠。
- 您想要固定 `contextWindow`/`maxTokens` 值。
- 您的伺服器需要真實的 API 金鑰（或您想要控制標頭）。

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
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
curl http://127.0.0.1:30000/v1/models
```

- 如果請求因驗證錯誤而失敗，請設定符合您伺服器設定的真實 `SGLANG_API_KEY`，
  或在 `models.providers.sglang` 下明確設定提供者。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
