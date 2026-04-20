---
summary: "使用 vLLM 執行 OpenClaw（OpenAI 相容的本機伺服器）"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM 可以透過 **OpenAI 相容**的 HTTP API 來提供開源（及部分自訂）模型。OpenClaw 使用 `openai-completions` API 連線至 vLLM。

當您使用 `VLLM_API_KEY` 選擇加入時（如果您的伺服器未強制執行驗證，則任何值均可），且未定義明確的 `models.providers.vllm` 項目，OpenClaw 也可以從 vLLM **自動探索**可用的模型。

| 屬性         | 數值                               |
| ------------ | ---------------------------------- |
| 供應商 ID    | `vllm`                             |
| API          | `openai-completions` (OpenAI 相容) |
| 驗證         | `VLLM_API_KEY` 環境變數            |
| 預設基礎 URL | `http://127.0.0.1:8000/v1`         |

## 開始使用

<Steps>
  <Step title="使用 OpenAI 相容伺服器啟動 vLLM">
    您的基礎 URL 應公開 `/v1` 端點（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常運行於：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="設定 API 金鑰環境變數">
    如果您的伺服器未強制執行驗證，則任何值均可：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="選擇一個模型">
    替換為您的其中一個 vLLM 模型 ID：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型探索（隱式提供商）

當設定了 `VLLM_API_KEY`（或存在驗證設定檔）且您**未**定義 `models.providers.vllm` 時，OpenClaw 會查詢：

```
GET http://127.0.0.1:8000/v1/models
```

並將傳回的 ID 轉換為模型項目。

<Note>如果您明確設定了 `models.providers.vllm`，則會跳過自動探索，且您必須手動定義模型。</Note>

## 明確設定（手動模型）

在以下情況使用明確設定：

- vLLM 運行於不同的主機或連接埠
- 您想要鎖定 `contextWindow` 或 `maxTokens` 數值
- 您的伺服器需要真實的 API 金鑰（或者您想要控制標頭）

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

## 進階說明

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    vLLM 被視為代理風格的 OpenAI 相容 `/v1` 後端，而非原生
    OpenAI 端點。這意味著：

    | 行為 | 是否套用？ |
    |----------|----------|
    | 原生 OpenAI 請求塑形 | 否 |
    | `service_tier` | 未發送 |
    | 回應 `store` | 未發送 |
    | 提示快取提示 | 未發送 |
    | OpenAI 推理相容負載塑形 | 未套用 |
    | 隱藏的 OpenClaw 歸因標頭 | 未在自訂基礎 URL 上注入 |

  </Accordion>

  <Accordion title="Custom base URL">
    如果您的 vLLM 伺服器執行在非預設的主機或連接埠上，請在明確的提供者設定中設定 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="Server not reachable">
    檢查 vLLM 伺服器是否正在執行且可存取：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果您看到連線錯誤，請驗證主機、連接埠，以及 vLLM 是否以 OpenAI 相容伺服器模式啟動。

  </Accordion>

  <Accordion title="Auth errors on requests">
    如果請求因認證錯誤而失敗，請設定符合您伺服器設定的真實 `VLLM_API_KEY`，或在 `models.providers.vllm` 下明確設定提供者。

    <Tip>
    如果您的 vLLM 伺服器未強制執行認證，`VLLM_API_KEY` 的任何非空值都可作為 OpenClaw 的啟用訊號。
    </Tip>

  </Accordion>

  <Accordion title="No models discovered">
    自動探索需要設定 `VLLM_API_KEY` **並且** 沒有明確的 `models.providers.vllm` 設定項目。如果您已手動定義提供者，OpenClaw 將跳過探索並僅使用您宣告的模型。
  </Accordion>
</AccordionGroup>

<Warning>更多協助：[疑難排解](/en/help/troubleshooting) 和 [常見問題](/en/help/faq)。</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="OpenAI" href="/en/providers/openai" icon="bolt">
    原生 OpenAI 提供者和 OpenAI 相容路由行為。
  </Card>
  <Card title="OAuth 和驗證" href="/en/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重複使用規則。
  </Card>
  <Card title="故障排除" href="/en/help/troubleshooting" icon="wrench">
    常見問題及其解決方法。
  </Card>
</CardGroup>
