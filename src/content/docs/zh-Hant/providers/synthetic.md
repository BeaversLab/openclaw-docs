---
summary: "在 OpenClaw 中使用 Synthetic 的 Anthropic 相容 API"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

Synthetic 提供與 Anthropic 相容的端點。OpenClaw 將其註冊為 `synthetic` 提供者，並使用 Anthropic Messages API。

## 快速設定

1. 設定 `SYNTHETIC_API_KEY` (或執行下方的精靈)。
2. 執行入門流程：

```exec
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

注意：OpenClaw 的 Anthropic 客戶端會將 `/v1` 附加至基礎 URL，因此請使用 `https://api.synthetic.new/anthropic` (而非 `/anthropic/v1`)。如果 Synthetic 變更其基礎 URL，請覆寫 `models.providers.synthetic.baseUrl`。

## 模型目錄

下列所有模型均使用成本 `0` (輸入/輸出/快取)。

| 模型 ID                                                | 內容視窗 | 最大 Token | 推理  | 輸入         |
| ------------------------------------------------------ | -------- | ---------- | ----- | ------------ |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192000   | 65536      | false | text         |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256000   | 8192       | true  | text         |
| `hf:zai-org/GLM-4.7`                                   | 198000   | 128000     | false | text         |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128000   | 8192       | false | text         |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128000   | 8192       | false | text         |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128000   | 8192       | false | text         |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128000   | 8192       | false | text         |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159000   | 8192       | false | text         |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128000   | 8192       | false | text         |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524000   | 8192       | false | text         |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256000   | 8192       | false | text         |
| `hf:openai/gpt-oss-120b`                               | 128000   | 8192       | false | text         |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256000   | 8192       | false | text         |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256000   | 8192       | false | text         |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250000   | 8192       | false | text + image |
| `hf:zai-org/GLM-4.5`                                   | 128000   | 128000     | false | text         |
| `hf:zai-org/GLM-4.6`                                   | 198000   | 128000     | false | text         |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128000   | 8192       | false | text         |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256000   | 8192       | true  | text         |

## 備註

- 模型引用使用 `synthetic/<modelId>`。
- 如果您啟用模型允許列表 (`agents.defaults.models`)，請加入您
  計劃使用的每個模型。
- 請參閱 [模型供應商](/zh-Hant/concepts/model-providers) 以了解供應商規則。
