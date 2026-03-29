---
summary: "在 OpenClaw 中使用 Synthetic 的 Anthropic 相容 API"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

Synthetic 公開了與 Anthropic 相容的端點。OpenClaw 將其註冊為
`synthetic` 提供者，並使用 Anthropic Messages API。

## 快速設定

1. 設定 `SYNTHETIC_API_KEY` (或執行下方的精靈)。
2. 執行上架：

```bash
openclaw onboard --auth-choice synthetic-api-key
```

預設模型設定為：

```
synthetic/hf:MiniMaxAI/MiniMax-M2.5
```

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

注意：OpenClaw 的 Anthropic 用戶端會在基礎 URL 附加 `/v1`，因此請使用
`https://api.synthetic.new/anthropic` (而非 `/anthropic/v1`)。如果 Synthetic 變更
了基礎 URL，請覆寫 `models.providers.synthetic.baseUrl`。

## 模型目錄

以下所有模型均使用成本 `0` (輸入/輸出/快取)。

| 模型 ID                                                | 內容視窗 | 最大 tokens | 推理  | 輸入        |
| ------------------------------------------------------ | -------- | ----------- | ----- | ----------- |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192000   | 65536       | false | 文字        |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256000   | 8192        | true  | 文字        |
| `hf:zai-org/GLM-4.7`                                   | 198000   | 128000      | false | 文字        |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128000   | 8192        | false | 文字        |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128000   | 8192        | false | 文字        |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128000   | 8192        | false | 文字        |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128000   | 8192        | false | 文字        |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159000   | 8192        | false | 文字        |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128000   | 8192        | false | 文字        |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524000   | 8192        | false | 文字        |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256000   | 8192        | false | 文字        |
| `hf:openai/gpt-oss-120b`                               | 128000   | 8192        | false | 文字        |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256000   | 8192        | false | 文字        |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256000   | 8192        | false | 文字        |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250000   | 8192        | false | 文字 + 圖片 |
| `hf:zai-org/GLM-4.5`                                   | 128000   | 128000      | false | 文字        |
| `hf:zai-org/GLM-4.6`                                   | 198000   | 128000      | false | 文字        |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128000   | 8192        | false | 文字        |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256000   | 8192        | true  | 文字        |

## 備註

- 模型參照使用 `synthetic/<modelId>`。
- 如果您啟用模型允許清單 (`agents.defaults.models`)，請新增您計劃使用的每個模型。
- 請參閱 [Model providers](/en/concepts/model-providers) 以了解提供者規則。
