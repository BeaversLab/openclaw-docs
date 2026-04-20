---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供了一个 OpenAI 兼容的 API，可免费
访问开源模型。使用来自 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 密钥进行身份验证。

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 创建一个 API 密钥。</Step>
  <Step title="导出密钥并运行新手引导">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice skip ```</Step>
  <Step title="设置 NVIDIA 模型">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>如果您传递 `--token` 而不是环境变量，该值将保留在 shell 历史记录中 并显示在 `ps` 输出中。如果可能，请首选 `NVIDIA_API_KEY` 环境变量。</Warning>

## 配置示例

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## 内置目录

| 模型参考                                   | 名称                         | 上下文  | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | -------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192    |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192    |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192    |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192    |

## 高级说明

<AccordionGroup>
  <Accordion title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量时，提供商会自动启用。
    除了密钥之外，不需要显式的提供商配置。
  </Accordion>

<Accordion title="目录和定价">捆绑的目录是静态的。由于 NVIDIA 目前为列出的模型提供免费 API 访问，成本默认在源代码中为 `0`。</Accordion>

  <Accordion title="OpenAI 兼容端点">
    NVIDIA 使用标准的 `/v1` 补全端点。任何 OpenAI 兼容的工具都应该与 NVIDIA 基础 URL 即插即用。
  </Accordion>
</AccordionGroup>

<Tip>NVIDIA 模型目前免费使用。请访问 [build.nvidia.com](https://build.nvidia.com/) 查看最新的可用性和 速率限制详情。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
