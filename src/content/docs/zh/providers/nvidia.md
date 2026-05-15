---
summary: "OpenAIAPIOpenClaw在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA 在 OpenAIAPI`https://integrate.api.nvidia.com/v1`API 提供了一个与 OpenAI 兼容的 API，供开源模型免费使用。请使用来自 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 密钥进行身份验证。

## 入门指南

<Steps>
  <Step title="API获取您的 API 密钥" API>
    在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 创建一个 API 密钥。
  </Step>
  <Step title="导出密钥并运行新手引导">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice nvidia-api-key ```</Step>
  <Step title="设置一个 NVIDIA 模型">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>如果您传递 `--nvidia-api-key` 而不是环境变量，该值将进入 shell 历史记录和 `ps` 输出中。请尽可能首选 `NVIDIA_API_KEY` 环境变量。</Warning>

对于非交互式设置，您也可以直接传递密钥：

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

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

| 模型引用                                   | 名称                         | 上下文  | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | -------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192    |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192    |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192    |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192    |

## 高级配置

<AccordionGroup>
  <Accordion title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量时，提供商会自动启用。
    除了密钥之外，不需要显式的提供商配置。
  </Accordion>

<Accordion title="目录和定价">捆绑的目录是静态的。由于 NVIDIA 目前为列出的模型提供免费 API 访问，因此源代码中的成本默认为 `0`API。</Accordion>

<Accordion title="OpenAIOpenAI 兼容的端点">NVIDIA 使用标准的 `/v1`OpenAI completions 端点。任何与 OpenAI 兼容的工具都应该可以直接与 NVIDIA 的基础 URL 配合使用。</Accordion>

  <Accordion title="自定义提供商响应缓慢">
    一些 NVIDIA 托管的自定义模型在发出第一个响应块之前，可能需要比默认模型空闲监视器更长的时间。对于自定义 NVIDIA 提供商条目，请提高提供商超时时间，而不是提高整个代理运行时超时时间：

    ```json5
    {
      models: {
        providers: {
          "custom-integrate-api-nvidia-com": {
            baseUrl: "https://integrate.api.nvidia.com/v1",
            api: "openai-completions",
            apiKey: "NVIDIA_API_KEY",
            timeoutSeconds: 300,
          },
        },
      },
      agents: {
        defaults: {
          models: {
            "custom-integrate-api-nvidia-com/meta/llama-3.1-70b-instruct": {
              params: { thinking: "off" },
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

<Tip>NVIDIA 模型目前免费使用。请查看 [build.nvidia.com](https://build.nvidia.com/) 以获取最新的可用性和速率限制详情。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
