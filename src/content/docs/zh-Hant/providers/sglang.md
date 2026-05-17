---
summary: "使用 SGLang 執行 OpenClaw（相容 OpenAI 的自託管伺服器）"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

SGLang 透過 OpenAI 相容的 HTTP API 提供開放權重模型。OpenClaw 使用 `openai-completions` 提供者系列連接到 SGLang，並自動探索可用的模型。

| 屬性           | 值                                                      |
| -------------- | ------------------------------------------------------- |
| 提供者 ID      | `sglang`                                                |
| 外掛程式       | 內建，`enabledByDefault: true`                          |
| 授權環境變數   | `SGLANG_API_KEY` （如果伺服器沒有授權，則為任何非空值） |
| 入門旗標       | `--auth-choice sglang`                                  |
| API            | OpenAI 相容 （`openai-completions`）                    |
| 預設基礎 URL   | `http://127.0.0.1:30000/v1`                             |
| 預設模型佔位符 | `sglang/Qwen/Qwen3-8B`                                  |
| 串流使用方式   | 是 （`supportsStreamingUsage: true`）                   |
| 定價           | 標記為外部免費 （`modelPricing.external: false`）       |

當您使用 `SGLANG_API_KEY` 選擇加入時，OpenClaw 也會從 SGLang **自動探索** 可用的模型。當您同時配置了自訂 SGLang 基礎 URL 時，請在 `agents.defaults.models` 中使用 `sglang/*` 以保持探索動態。請參閱下方的 [Model discovery (implicit provider)](#model-discovery-implicit-provider)。

## 開始使用

<Steps>
  <Step title="啟動 SGLang">
    使用與 OpenAI 相容的伺服器啟動 SGLang。您的基礎 URL 應公開
    `/v1` 端點（例如 `/v1/models`、`/v1/chat/completions`）。SGLang
    通常運行於：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="設定 API 金鑰">
    如果您的伺服器未設定授權，則任何值均可運作：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="執行入門或直接設定模型">
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

## 模型探索 （隱含提供者）

當設定了 `SGLANG_API_KEY`（或存在驗證設定檔）且您**未**
定義 `models.providers.sglang` 時，OpenClaw 將會查詢：

- `GET http://127.0.0.1:30000/v1/models`

並將傳回的 ID 轉換為模型項目。

<Note>如果您明確設定了 `models.providers.sglang`，OpenClaw 預設會使用您宣告的 模型。當您希望 OpenClaw 查詢該設定提供者的 `/models` 端點並包含 所有宣佈的 SGLang 模型時，請將 `"sglang/*": {}` 新增至 `agents.defaults.models`。</Note>

## 明確設定 （手動模型）

在以下情況使用明確設定：

- SGLang 運行在不同的主機/連接埠上。
- 您想要固定 `contextWindow`/`maxTokens` 值。
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

## 進階組態

<AccordionGroup>
  <Accordion title="Proxy 樣式行為">
    SGLang 被視為 Proxy 樣式的 OpenAI 相容 `/v1` 後端，而非
    原生 OpenAI 端點。

    | 行為 | SGLang |
    |----------|--------|
    | 僅限 OpenAI 的請求塑形 | 未套用 |
    | `service_tier`、回應 `store`、提示快取提示 | 未傳送 |
    | 推理相容酬載塑形 | 未套用 |
    | 隱藏的歸因標頭 (`originator`、`version`、`User-Agent`) | 未在自訂 SGLang 基礎 URL 上注入 |

  </Accordion>

  <Accordion title="疑難排解">
    **伺服器無法連線**

    確認伺服器正在運行並有回應：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **驗證錯誤**

    如果請求因驗證錯誤而失敗，請設定一個符合您伺服器設定的真實 `SGLANG_API_KEY`，或在 `models.providers.sglang` 下明確設定供應商。

    <Tip>
    如果您在未啟用驗證的情況下執行 SGLang，`SGLANG_API_KEY` 的任何非空值都足以啟用模型探索功能。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    包含供應商項目的完整組態架構。
  </Card>
</CardGroup>
