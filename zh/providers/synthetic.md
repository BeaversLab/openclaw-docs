> [!NOTE]
> 本页正在翻译中。

---
summary: "在 OpenClaw 中使用 Synthetic 的 Anthropic 兼容 API"
read_when:
  - 想将 Synthetic 作为模型提供商
  - 需要 Synthetic API key 或 base URL 配置
---
# Synthetic

Synthetic 暴露 Anthropic 兼容端点。OpenClaw 将其注册为 `synthetic` provider，并使用 Anthropic Messages API。

## 快速配置

1) 设置 `SYNTHETIC_API_KEY`（或运行下面的向导）。
2) 运行 onboarding：

```bash
openclaw onboard --auth-choice synthetic-api-key
```

默认模型设置为：

```
synthetic/hf:MiniMaxAI/MiniMax-M2.1
```

## 配置示例

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.1" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.1": { alias: "MiniMax M2.1" } }
    }
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
            id: "hf:MiniMaxAI/MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536
          }
        ]
      }
    }
  }
}
```

注意：OpenClaw 的 Anthropic 客户端会在 base URL 后追加 `/v1`，因此请使用
`https://api.synthetic.new/anthropic`（不要用 `/anthropic/v1`）。若 Synthetic 更改 base URL，
请覆盖 `models.providers.synthetic.baseUrl`。

## 模型目录

以下模型成本均为 `0`（输入/输出/缓存）。

| Model ID | 上下文窗口 | 最大 tokens | 推理 | 输入 |
| --- | --- | --- | --- | --- |
| `hf:MiniMaxAI/MiniMax-M2.1` | 192000 | 65536 | false | text |
| `hf:moonshotai/Kimi-K2-Thinking` | 256000 | 8192 | true | text |
| `hf:zai-org/GLM-4.7` | 198000 | 128000 | false | text |
| `hf:deepseek-ai/DeepSeek-R1-0528` | 128000 | 8192 | false | text |
| `hf:deepseek-ai/DeepSeek-V3-0324` | 128000 | 8192 | false | text |
| `hf:deepseek-ai/DeepSeek-V3.1` | 128000 | 8192 | false | text |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus` | 128000 | 8192 | false | text |
| `hf:deepseek-ai/DeepSeek-V3.2` | 159000 | 8192 | false | text |
| `hf:meta-llama/Llama-3.3-70B-Instruct` | 128000 | 8192 | false | text |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524000 | 8192 | false | text |
| `hf:moonshotai/Kimi-K2-Instruct-0905` | 256000 | 8192 | false | text |
| `hf:openai/gpt-oss-120b` | 128000 | 8192 | false | text |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507` | 256000 | 8192 | false | text |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct` | 256000 | 8192 | false | text |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct` | 250000 | 8192 | false | text + image |
| `hf:zai-org/GLM-4.5` | 128000 | 128000 | false | text |
| `hf:zai-org/GLM-4.6` | 198000 | 128000 | false | text |
| `hf:deepseek-ai/DeepSeek-V3` | 128000 | 8192 | false | text |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507` | 256000 | 8192 | true | text |

## 说明

- 模型引用使用 `synthetic/<modelId>`。
- 若启用了模型 allowlist（`agents.defaults.models`），请将要用的模型全部加入。
- Provider 规则参见 [Model providers](/zh/concepts/model-providers)。
