---
summary: "在 OpenClaw 中使用 Synthetic 相容於 Anthropic 的 API"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

[Synthetic](https://synthetic.new) 提供相容於 Anthropic 的端點。
OpenClaw 將其註冊為 `synthetic` 提供者，並使用 Anthropic
Messages API。

| 屬性     | 值                                    |
| -------- | ------------------------------------- |
| 提供者   | `synthetic`                           |
| 驗證     | `SYNTHETIC_API_KEY`                   |
| API      | Anthropic Messages                    |
| 基礎 URL | `https://api.synthetic.new/anthropic` |

## 開始使用

<Steps>
  <Step title="取得 API 金鑰">從您的 Synthetic 帳戶取得 `SYNTHETIC_API_KEY`，或讓 入門精靈提示您輸入。</Step>
  <Step title="執行入門精靈">```bash openclaw onboard --auth-choice synthetic-api-key ```</Step>
  <Step title="驗證預設模型">完成入門精靈後，預設模型會設定為： ``` synthetic/hf:MiniMaxAI/MiniMax-M2.5 ```</Step>
</Steps>

<Warning>OpenClaw 的 Anthropic 用戶端會自動將 `/v1` 附加到基礎 URL，因此請使用 `https://api.synthetic.new/anthropic`（而非 `/anthropic/v1`）。如果 Synthetic 變更了其基礎 URL，請覆寫 `models.providers.synthetic.baseUrl`。</Warning>

## 設定範例

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 模型目錄

所有 Synthetic 模型皆使用成本 `0`（輸入/輸出/快取）。

| 模型 ID                                                | 內容視窗 | 最大權杖 | 推理 | 輸入        |
| ------------------------------------------------------ | -------- | -------- | ---- | ----------- |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192,000  | 65,536   | 否   | 文字        |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256,000  | 8,192    | 是   | 文字        |
| `hf:zai-org/GLM-4.7`                                   | 198,000  | 128,000  | 否   | 文字        |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128,000  | 8,192    | 否   | 文字        |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128,000  | 8,192    | 否   | 文字        |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128,000  | 8,192    | 否   | 文字        |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128,000  | 8,192    | 否   | 文字        |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159,000  | 8,192    | 否   | 文字        |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128,000  | 8,192    | 否   | 文字        |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524,000  | 8,192    | 否   | 文字        |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256,000  | 8,192    | 否   | 文字        |
| `hf:moonshotai/Kimi-K2.5`                              | 256,000  | 8,192    | 是   | 文字 + 圖片 |
| `hf:openai/gpt-oss-120b`                               | 128,000  | 8,192    | 否   | 文字        |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256,000  | 8,192    | 否   | 文字        |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256,000  | 8,192    | 否   | 文字        |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250,000  | 8,192    | 否   | 文字 + 圖片 |
| `hf:zai-org/GLM-4.5`                                   | 128,000  | 128,000  | 否   | 文字        |
| `hf:zai-org/GLM-4.6`                                   | 198,000  | 128,000  | 否   | 文字        |
| `hf:zai-org/GLM-5`                                     | 256,000  | 128,000  | 是   | 文字 + 圖片 |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128,000  | 8,192    | 否   | 文字        |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256,000  | 8,192    | 是   | 文字        |

<Tip>
模型參照使用 `synthetic/<modelId>` 格式。使用
`openclaw models list --provider synthetic` 以查看您帳戶上所有可用的
模型。
</Tip>

<AccordionGroup>
  <Accordion title="模型允許清單">
    如果您啟用模型允許清單 (`agents.defaults.models`)，請新增您計畫使用的
    每一個 Synthetic 模型。不在允許清單中的模型將會對
    代理隱藏。
  </Accordion>

  <Accordion title="覆寫 Base URL">
    如果 Synthetic 變更了其 API 端點，請在您的設定中覆寫 base URL：

    ```json5
    {
      models: {
        providers: {
          synthetic: {
            baseUrl: "https://new-api.synthetic.new/anthropic",
          },
        },
      },
    }
    ```

    請記住，OpenClaw 會自動附加 `/v1`。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型提供者" href="/en/concepts/model-providers" icon="layers">
    提供者規則、模型參照與故障轉移行為。
  </Card>
  <Card title="設定參考" href="/en/gateway/configuration-reference" icon="gear">
    完整的設定架構，包含提供者設定。
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Synthetic 儀表板與 API 文件。
  </Card>
</CardGroup>
