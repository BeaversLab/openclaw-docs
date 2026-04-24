---
summary: "使用 SGLang 執行 OpenClaw（相容 OpenAI 的自託管伺服器）"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

# SGLang

SGLang 可以透過 **OpenAI 相容** 的 HTTP API 來提供開源模型。
OpenClaw 可以使用 `openai-completions` API 連接到 SGLang。

當您使用 `SGLANG_API_KEY` 啟用時（如果您的伺服器未強制執行驗證，則任何值均可），
且您未定義明確的 `models.providers.sglang` 項目時，OpenClaw 也可以從 SGLang **自動探索** 可用的模型。

OpenClaw 將 `sglang` 視為支援串流使用量計算的本機 OpenAI 相容供應商，因此狀態/內容 token 計數可以從 `stream_options.include_usage` 回應更新。

## 快速入門

<Steps>
  <Step title="啟動 SGLang">
    使用 OpenAI 相容伺服器啟動 SGLang。您的基底 URL 應公開
    `/v1` 端點（例如 `/v1/models`、`/v1/chat/completions`）。SGLang
    通常運行於：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="設定 API 金鑰">
    如果您的伺服器未設定驗證，則任何值皆可運作：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="執行上架設定或直接設定模型">
    ```bash
    openclaw onboard
    ```

    或手動設定模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "sglang/your-model-id" },
        },
      },
    }
    ```

  </Step>
</Steps>

## 模型探索（隱含供應商）

當設定了 `SGLANG_API_KEY`（或存在驗證設定檔）且您**未**
定義 `models.providers.sglang` 時，OpenClaw 將會查詢：

- `GET http://127.0.0.1:30000/v1/models`

並將傳回的 ID 轉換為模型項目。

<Note>如果您明確設定 `models.providers.sglang`，則會跳過自動探索，且 您必須手動定義模型。</Note>

## 明確設定（手動模型）

使用明確設定於以下情況：

- SGLang 運行於不同的主機/連接埠。
- 您想要鎖定 `contextWindow`/`maxTokens` 值。
- 您的伺服器需要真實的 API 金鑰（或者您想要控制標頭）。

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

## 進階設定

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    SGLang 被視為代理風格的 OpenAI 相容 `/v1` 後端，而非
    原生 OpenAI 端點。

    | 行為 | SGLang |
    |----------|--------|
    | 僅限 OpenAI 的請求成型 | 不套用 |
    | `service_tier`、回應 `store`、提示快取提示 | 不傳送 |
    | 推理相容酬載成型 | 不套用 |
    | 隱藏的歸因標頭 (`originator`、`version`、`User-Agent`) | 不注入自訂 SGLang 基礎 URL |

  </Accordion>

  <Accordion title="Troubleshooting">
    **伺服器無法連線**

    驗證伺服器正在執行並回應：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **驗證錯誤**

    如果請求因驗證錯誤而失敗，請設定符合
    您伺服器設定的真實 `SGLANG_API_KEY`，或在
    `models.providers.sglang` 下明確設定提供者。

    <Tip>
    如果您在未啟用驗證的情況下執行 SGLang，任何非空值的
    `SGLANG_API_KEY` 都足以選擇加入模型探索。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的設定架構，包括提供者項目。
  </Card>
</CardGroup>
