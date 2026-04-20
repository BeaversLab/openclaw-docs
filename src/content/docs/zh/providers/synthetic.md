---
summary: "在 OpenClaw 中使用 Synthetic 的 Anthropic 兼容 API"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

[Synthetic](https://synthetic.new) 公开了 Anthropic 兼容的端点。
OpenClaw 将其注册为 `synthetic` 提供商并使用 Anthropic
Messages API。

| 属性     | 值                                    |
| -------- | ------------------------------------- |
| 提供商   | `synthetic`                           |
| 认证     | `SYNTHETIC_API_KEY`                   |
| API      | Anthropic Messages                    |
| 基础 URL | `https://api.synthetic.new/anthropic` |

## 入门指南

<Steps>
  <Step title="获取 API 密钥">从您的 Synthetic 账户获取一个 `SYNTHETIC_API_KEY`，或者让 新手引导向导提示您输入一个。</Step>
  <Step title="运行新手引导">```bash openclaw onboard --auth-choice synthetic-api-key ```</Step>
  <Step title="验证默认模型">完成新手引导后，默认模型设置为： ``` synthetic/hf:MiniMaxAI/MiniMax-M2.5 ```</Step>
</Steps>

<Warning>OpenClaw 的 OpenClaw 客户端会自动在基础 URL 后附加 `/v1`，因此请使用 `https://api.synthetic.new/anthropic`（而不是 `/anthropic/v1`）。如果 Synthetic 更改了其基础 URL，请覆盖 `models.providers.synthetic.baseUrl`。</Warning>

## 配置示例

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

## 模型目录

所有 Synthetic 模型均使用成本 `0`（输入/输出/缓存）。

| 模型 ID                                                | 上下文窗口 | 最大令牌数 | 推理 | 输入        |
| ------------------------------------------------------ | ---------- | ---------- | ---- | ----------- |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192,000    | 65,536     | 否   | text        |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256,000    | 8,192      | 是   | text        |
| `hf:zai-org/GLM-4.7`                                   | 198,000    | 128,000    | 否   | text        |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128,000    | 8,192      | 否   | text        |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128,000    | 8,192      | 否   | text        |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128,000    | 8,192      | 否   | text        |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128,000    | 8,192      | 否   | text        |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159,000    | 8,192      | 否   | text        |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128,000    | 8,192      | 否   | text        |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524,000    | 8,192      | 否   | text        |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256,000    | 8,192      | 否   | text        |
| `hf:moonshotai/Kimi-K2.5`                              | 256,000    | 8,192      | 是   | 文本 + 图像 |
| `hf:openai/gpt-oss-120b`                               | 128,000    | 8,192      | 否   | 文本        |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256,000    | 8,192      | 否   | text        |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256,000    | 8,192      | 否   | text        |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250,000    | 8,192      | 否   | 文本 + 图像 |
| `hf:zai-org/GLM-4.5`                                   | 128,000    | 128,000    | 否   | text        |
| `hf:zai-org/GLM-4.6`                                   | 198,000    | 128,000    | 否   | 文本        |
| `hf:zai-org/GLM-5`                                     | 256,000    | 128,000    | 是   | 文本 + 图像 |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128,000    | 8,192      | 否   | 文本        |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256,000    | 8,192      | 是   | 文本        |

<Tip>
模型引用使用格式 `synthetic/<modelId>`。使用
`openclaw models list --provider synthetic` 查看您的账户上可用的所有
模型。
</Tip>

<AccordionGroup>
  <Accordion title="模型允许列表">
    如果您启用了模型允许列表 (`agents.defaults.models`)，请添加您
    计划使用的每一个 Synthetic 模型。不在允许列表中的模型将对
    代理隐藏。
  </Accordion>

  <Accordion title="Base URL override">
    如果 Synthetic 更改了其 API 端点，请在配置中覆盖 base URL：

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

    请记住，OpenClaw 会自动附加 `/v1`。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    提供商规则、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    包含提供商设置的完整配置架构。
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Synthetic 仪表板和 API 文档。
  </Card>
</CardGroup>
