---
summary: "在 OpenClaw 中使用 Mistral 模型和 Voxtral 转录"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw 支持 Mistral 用于文本/图像模型路由 (`mistral/...`) 以及通过 Voxtral 进行的媒体理解音频转录。
Mistral 也可用于记忆嵌入 (`memorySearch.provider = "mistral"`)。

- 提供商: `mistral`
- 认证: `MISTRAL_API_KEY`
- API: Mistral Chat Completions (`https://api.mistral.ai/v1`)

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">
    在 [Mistral Console](https://console.mistral.ai/) 中创建一个 API 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或者直接传入密钥:

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="验证模型可用性">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## 内置 LLM 目录

OpenClaw 目前附带此捆绑的 Mistral 目录:

| 模型引用                         | 输入        | 上下文  | 最大输出 | 备注                                                        |
| -------------------------------- | ----------- | ------- | -------- | ----------------------------------------------------------- |
| `mistral/mistral-large-latest`   | text, image | 262,144 | 16,384   | 默认模型                                                    |
| `mistral/mistral-medium-2508`    | text, image | 262,144 | 8,192    | Mistral Medium 3.1                                          |
| `mistral/mistral-small-latest`   | text, image | 128,000 | 16,384   | Mistral Small 4；可通过 API `reasoning_effort` 调整推理能力 |
| `mistral/pixtral-large-latest`   | 文本、图像  | 128,000 | 32,768   | Pixtral                                                     |
| `mistral/codestral-latest`       | text        | 256,000 | 4,096    | 编程                                                        |
| `mistral/devstral-medium-latest` | text        | 262,144 | 32,768   | Devstral 2                                                  |
| `mistral/magistral-small`        | 文本        | 128,000 | 40,000   | 具备推理能力                                                |

## 音频转录 (Voxtral)

通过媒体理解流水线使用 Voxtral 进行音频转录。

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

<Tip>媒体转录路径使用 `/v1/audio/transcriptions`。Mistral 的默认音频模型是 `voxtral-mini-latest`。</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="Adjustable reasoning (mistral-small-latest)">
    `mistral/mistral-small-latest` 映射到 Mistral Small 4，并支持通过 `reasoning_effort` 在聊天补全 API 上使用[可调整推理](https://docs.mistral.ai/capabilities/reasoning/adjustable)（`none` 最大限度减少输出中的额外思考；`high` 在最终答案之前展示完整的思考轨迹）。

    OpenClaw 将会话 **thinking** 级别映射到 Mistral 的 API：

    | OpenClaw thinking 级别                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    其他捆绑的 Mistral 目录模型不使用此参数。当您需要 Mistral 原生的推理优先行为时，请继续使用 `magistral-*` 模型。
    </Note>

  </Accordion>

  <Accordion title="Memory embeddings">
    Mistral 可以通过 `/v1/embeddings` 提供记忆嵌入（默认模型：`mistral-embed`）。

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="Auth and base URL">
    - Mistral 身份验证使用 `MISTRAL_API_KEY`。
    - 提供商基础 URL 默认为 `https://api.mistral.ai/v1`。
    - 新手引导默认模型是 `mistral/mistral-large-latest`。
    - Z.AI 使用带有您的 API 密钥的 Bearer 身份验证。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Media understanding" href="/zh/tools/media-understanding" icon="microphone">
    音频转录设置和提供商选择。
  </Card>
</CardGroup>
