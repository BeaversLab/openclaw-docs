---
summary: "OpenClaw在 OpenClaw 中使用 Mistral 模型和 Voxtral 转录"
read_when:
  - You want to use Mistral models in OpenClaw
  - You want Voxtral realtime transcription for Voice Call
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

OpenClaw 包含一个捆绑的 Mistral 插件，该插件注册了四个合约：聊天补全、媒体理解（Voxtral 批量转录）、语音通话的实时 STT（Voxtral Realtime）和记忆嵌入（OpenClaw`mistral-embed`）。

| 属性           | 值                                      |
| -------------- | --------------------------------------- |
| 提供商 ID      | `mistral`                               |
| 插件           | 捆绑，`enabledByDefault: true`          |
| 认证环境变量   | `MISTRAL_API_KEY`                       |
| 新手引导标志   | `--auth-choice mistral-api-key`         |
| 直接 CLI 标志  | `--mistral-api-key <key>`               |
| API            | OpenAI-兼容 (`openai-completions`)      |
| 基础 URL       | `https://api.mistral.ai/v1`             |
| 默认模型       | `mistral/mistral-large-latest`          |
| 嵌入模型       | `mistral-embed`                         |
| Voxtral 批处理 | `voxtral-mini-latest` (音频转录)        |
| Voxtral 实时   | `voxtral-mini-transcribe-realtime-2602` |

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">
    在 [Mistral Console](https://console.mistral.ai/) 中创建 API 密钥。
  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或者直接传入密钥：

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

[Mistral Medium 3.5](https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04)
是内置目录中当前的混合 Medium 模型：128B 密集权重、
文本和图像输入、256K 上下文、函数调用、结构化输出、编码，
以及通过 Chat Completions API 进行的可调节推理。当您想要 Mistral 较新的统一
代理/编码模型而不是默认的 `mistral/mistral-large-latest` 时，请使用
`mistral/mistral-medium-3-5`。

OpenClaw 目前附带此内置 Mistral 目录：

| 模型参考                         | 输入       | 上下文  | 最大输出 | 备注                                                    |
| -------------------------------- | ---------- | ------- | -------- | ------------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文本、图像 | 262,144 | 16,384   | 默认模型                                                |
| `mistral/mistral-medium-2508`    | 文本、图像 | 262,144 | 8,192    | Mistral Medium 3.1                                      |
| `mistral/mistral-medium-3-5`     | 文本，图像 | 262,144 | 8,192    | Mistral Medium 3.5；可调节推理                          |
| `mistral/mistral-small-latest`   | 文本，图像 | 128,000 | 16,384   | Mistral Small 4；通过 API `reasoning_effort` 可调节推理 |
| `mistral/pixtral-large-latest`   | 文本，图像 | 128,000 | 32,768   | Pixtral                                                 |
| `mistral/codestral-latest`       | 文本       | 256,000 | 4,096    | 编码                                                    |
| `mistral/devstral-medium-latest` | 文本       | 262,144 | 32,768   | Devstral 2                                              |
| `mistral/magistral-small`        | 文本       | 128,000 | 40,000   | 启用推理                                                |

新手引导完成后，在不启动 Gateway(网关) 的情况下对 Medium 3.5 进行冒烟测试：

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "Reply with exactly: mistral-ok" \
  --json
```

要在更改配置之前浏览捆绑的目录行：

```bash
openclaw models list --all --provider mistral --plain
```

## 音频转录

通过媒体理解流水线使用 Voxtral 进行批量音频转录。

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

## 语音通话流式 STT

内置的 `mistral` 插件将 Voxtral Realtime 注册为语音通话流式 STT 提供商。

| 设置     | 配置路径                                                               | 默认值                                  |
| -------- | ---------------------------------------------------------------------- | --------------------------------------- |
| API 密钥 | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 回退到 `MISTRAL_API_KEY`                |
| 模型     | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| 编码     | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| 采样率   | `...mistral.sampleRate`                                                | `8000`                                  |
| 目标延迟 | `...mistral.targetStreamingDelayMs`                                    | `800`                                   |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "mistral",
            providers: {
              mistral: {
                apiKey: "${MISTRAL_API_KEY}",
                targetStreamingDelayMs: 800,
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>OpenClaw 默认将 Mistral 实时 STT 设置为 8 kHz 的 `pcm_mulaw`，以便 Voice Call 可以直接转发 Twilio 媒体帧。仅当您的上游流已经是原始 PCM 时，才使用 `encoding: "pcm_s16le"` 和 匹配的 `sampleRate`。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="可调整推理">
    `mistral/mistral-small-latest` (Mistral Small 4) 和 `mistral/mistral-medium-3-5` 支持通过聊天补全 API (API) 进行[可调整推理](https://docs.mistral.ai/studio-api/conversations/reasoning/adjustable)，参数为 `reasoning_effort` (`none` 最小化输出中的额外思考；`high` 在最终答案前显示完整的思考轨迹)。对于 Medium 3.5 代理和代码用例，Mistral 推荐 `reasoning_effort="high"`。

    OpenClaw 将会话 **thinking** 级别映射到 Mistral 的 API (API)：

    | OpenClaw thinking 级别                          | Mistral `reasoning_effort` |
    | ------------------------------------------------ | -------------------------- |
    | **off** / **minimal**                            | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Warning>
    请勿将 Medium 3.5 推理模式与 `temperature: 0` 结合使用。Mistral
    HTTP API (API) 会拒绝 `reasoning_effort="high"` 加上 `temperature: 0` 的组合，并返回 400
    响应。请保持 temperature 未设置，以便 Mistral 使用其默认值，或者遵循
    [Medium 3.5 推荐设置](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)
    并使用 `temperature: 0.7` 进行高推理。对于确定性的直接
    答案，请将 thinking 关闭/设为最小，这样 OpenClaw 会在您降低 temperature 之前发送
    `reasoning_effort: "none"`。
    </Warning>

    用于 Medium 3.5 推理的模型范围配置示例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "mistral/mistral-medium-3-5" },
          models: {
            "mistral/mistral-medium-3-5": {
              params: { thinking: "high" },
            },
          },
        },
      },
    }
    ```

    <Note>
    其他绑定的 Mistral 目录模型不使用此参数。当您需要 Mistral 的原生推理优先行为时，请继续使用 `magistral-*` 模型。
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
    - Mistral auth uses `MISTRAL_API_KEY` (Bearer header).
    - Provider base URL defaults to `https://api.mistral.ai/v1` and accepts the standard OpenAI-compatible chat-completions request shape.
    - 新手引导 default 模型 is `mistral/mistral-large-latest`.
    - Override the base URL under `models.providers.mistral.baseUrl` only when Mistral explicitly publishes a regional endpoint you need.

  </Accordion>
</AccordionGroup>

## Related

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="媒体理解" href="/zh/nodes/media-understanding" icon="microphone">
    音频转录设置和提供商选择。
  </Card>
</CardGroup>
