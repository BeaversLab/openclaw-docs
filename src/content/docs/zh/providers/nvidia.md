---
summary: "OpenAIAPIOpenClaw在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供了一个与 OpenAI 兼容的 API，可免费用于开源模型。使用来自 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 的 API 密钥进行身份验证。

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">在 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 创建一个 API 密钥。</Step>
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

## 精选目录

当配置了 NVIDIA API 密钥时，OpenClaw 设置和模型选择路径会尝试从 `https://assets.ngc.nvidia.com/products/api-catalog/featured-models.json` 获取 NVIDIA 的公共精选模型目录，并将排序结果缓存 24 小时。因此，来自 build.nvidia.com 的新精选模型会立即出现在设置和模型选择界面中，而无需等待 OpenClaw 发布新版本。

获取操作对 `assets.ngc.nvidia.com` 使用固定的 HTTPS 主机策略。如果未配置 NVIDIA API 密钥，或者该公共目录不可用或格式错误，OpenClaw 将回退到下方的捆绑目录。

## 捆绑回退目录

| 模型引用                                   | 名称                         | 上下文  | 最大输出 | 备注               |
| ------------------------------------------ | ---------------------------- | ------- | -------- | ------------------ |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192    | 精选回退           |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192    | 精选回退           |
| `nvidia/minimaxai/minimax-m2.7`            | Minimax M2.7                 | 196,608 | 8,192    | 精选回退           |
| `nvidia/z-ai/glm-5.1`                      | GLM 5.1                      | 202,752 | 8,192    | 精选回退           |
| `nvidia/minimaxai/minimax-m2.5`            | MiniMax M2.5                 | 196,608 | 8,192    | 已弃用，升级兼容性 |
| `nvidia/z-ai/glm5`                         | GLM-5                        | 202,752 | 8,192    | 已弃用，升级兼容性 |

## 高级配置

<AccordionGroup>
  <Accordion title="自动启用行为">
    当设置了 `NVIDIA_API_KEY` 环境变量时，该提供商会自动启用。
    除了密钥之外，不需要显式的提供商配置。
  </Accordion>

<Accordion title="目录与定价" OpenClaw>
  当配置了 NVIDIA 身份验证时，OpenClaw 会优先使用 NVIDIA 的公共精选模型目录，并将其缓存 24 小时。内置的回退目录是静态的，保留了已弃用的已发布引用以用于升级兼容性。由于 NVIDIA 目前为列出的模型提供免费 API 访问，因此成本默认在源中为 `0`API。
</Accordion>

<Accordion title="OpenAIOpenAI 兼容端点">NVIDIA 使用标准的 `/v1`OpenAI 补全端点。任何与 OpenAI 兼容的工具都应该能直接与 NVIDIA 基础 URL 配合使用。</Accordion>

  <Accordion title="慢速自定义提供商响应">
    某些 NVIDIA 托管的自定义模型在发出第一个响应块之前，可能需要比默认模型空闲看门狗更长的时间。对于自定义 NVIDIA 提供商条目，请提高提供商超时时间，而不是提高整个代理运行时超时时间：

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

<Tip>NVIDIA 模型目前可免费使用。请查看 [build.nvidia.com](https://build.nvidia.com/) 了解最新的可用性和速率限制详情。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
