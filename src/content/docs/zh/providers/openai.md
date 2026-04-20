---
summary: "在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

# OpenAI

OpenAI 为 GPT 模型提供开发者 API。OpenClaw 支持两种认证方式：

- **API 密钥** — 直接访问 OpenAI 平台，采用按量计费（`openai/*` 模型）
- **Codex 订阅** — 使用订阅权限登录 ChatGPT/Codex（`openai-codex/*` 模型）

OpenAI 明确支持在外部工具和工作流（如 OpenClaw）中使用订阅 OAuth。

## 入门指南

选择您偏好的认证方式并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥 (OpenAI 平台)">
    **最适用于：** 直接 API 访问和按量计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        从 [OpenAI 平台仪表板](https://platform.openai.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型参考 | 路由 | 认证 |
    |-----------|-------|------|
    | `openai/gpt-5.4` | 直接 OpenAI 平台 API | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | 直接 OpenAI 平台 API | `OPENAI_API_KEY` |

    <Note>
    ChatGPT/Codex 登录通过 `openai-codex/*` 路由，而非 `openai/*`。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw 在直接 API 路径上**不**公开 `openai/gpt-5.3-codex-spark`。实时的 OpenAI API 请求会拒绝该模型。Spark 仅限 Codex。
    </Warning>

  </Tab>

  <Tab title="Codex 订阅">
    **最适用于：** 使用您的 ChatGPT/Codex 订阅，而不是单独的 API 密钥。Codex 云需要 ChatGPT 登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或者直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.4
        ```
      </Step>
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 路由 | 认证 |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Codex 登录 |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Codex 登录（取决于权限） |

    <Note>
    此路由有意与 `openai/gpt-5.4` 分开。使用带有 API 密钥的 `openai/*` 进行直接平台访问，使用 `openai-codex/*` 进行 Codex 订阅访问。
    </Note>

    ### 配置示例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Tip>
    如果新手引导重用了现有的 Codex CLI 登录信息，这些凭据仍由 Codex CLI 管理。过期后，OpenClaw 会先重新读取外部 Codex 源，然后将刷新后的凭据写回 Codex 存储。
    </Tip>

    ### 上下文窗口上限

    OpenClaw 将模型元数据和运行时上下文上限视为独立的值。

    对于 `openai-codex/gpt-5.4`：

    - 原生 `contextWindow`：`1050000`
    - 默认运行时 `contextTokens` 上限：`272000`

    较小的默认上限在实际使用中具有更好的延迟和质量特征。使用 `contextTokens` 覆盖它：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.4", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens` 限制运行时上下文预算。
    </Note>

  </Tab>
</Tabs>

## 图像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册图像生成功能。

| 功能                 | 值                          |
| -------------------- | --------------------------- |
| 默认模型             | `openai/gpt-image-1`        |
| 每次请求的最大图像数 | 4                           |
| 编辑模式             | 已启用（最多 5 张参考图像） |
| 尺寸覆盖             | 支持                        |
| 纵横比 / 分辨率      | 不转发至 OpenAI 图像 API    |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-1" },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/zh/tools/image-generation)。</Note>

## 视频生成

捆绑的 `openai` 插件通过 `video_generate` 工具注册视频生成。

| 功能     | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 默认模型 | `openai/sora-2`                                                          |
| 模式     | 文本生成视频、图像生成视频、单视频编辑                                   |
| 参考输入 | 1 张图像或 1 个视频                                                      |
| 尺寸覆盖 | 支持                                                                     |
| 其他覆盖 | `aspectRatio`、`resolution`、`audio`、`watermark` 将被忽略并显示工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅 [视频生成](/zh/tools/video-generation)。</Note>

## 个性覆盖

OpenClaw 为 `openai/*` 和 `openai-codex/*` 运行添加了一个小型的 OpenAI 专用提示覆盖。该覆盖使助手保持热情、协作、简洁，并更具情感表达力，且不会替换基础系统提示。

| 值                  | 效果                     |
| ------------------- | ------------------------ |
| `"friendly"` (默认) | 启用 OpenAI 专用覆盖     |
| `"on"`              | `"friendly"` 的别名      |
| `"off"`             | 仅使用基础 OpenClaw 提示 |

<Tabs>
  <Tab title="配置">
    ```json5
    {
      plugins: {
        entries: {
          openai: { config: { personality: "friendly" } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set plugins.entries.openai.config.personality off
    ```
  </Tab>
</Tabs>

<Tip>值在运行时不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用覆盖层。</Tip>

## 语音和语音合成

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    内置的 `openai` 插件为 `messages.tts` 表面注册了语音合成功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 语音 | `messages.tts.providers.openai.voice` | `coral` |
    | 语速 | `messages.tts.providers.openai.speed` | (未设置) |
    | 指令 | `messages.tts.providers.openai.instructions` | (未设置，仅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音备注为 `opus`，文件为 `mp3` |
    | API 密钥 | `messages.tts.providers.openai.apiKey` | 回退到 `OPENAI_API_KEY` |
    | 基础 URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用语音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 以覆盖 TTS 基础 URL，而不影响聊天 API 端点。
    </Note>

  </Accordion>

  <Accordion title="Realtime transcription">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时转录。

    | Setting | Config path | Default |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Silence duration | `...openai.silenceDurationMs` | `800` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | API key | `...openai.apiKey` | Falls back to `OPENAI_API_KEY` |

    <Note>
    Uses a WebSocket connection to `wss://api.openai.com/v1/realtime` with G.711 u-law audio.
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时语音。

    | Setting | Config path | Default |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | Voice | `...openai.voice` | `alloy` |
    | Temperature | `...openai.temperature` | `0.8` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | Silence duration | `...openai.silenceDurationMs` | `500` |
    | API key | `...openai.apiKey` | Falls back to `OPENAI_API_KEY` |

    <Note>
    Supports Azure OpenAI via `azureEndpoint` and `azureDeployment` config keys. Supports bidirectional 工具 calling. Uses G.711 u-law audio format.
    </Note>

  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="传输方式（WebSocket 与 SSE）">
    OpenClaw 优先使用 WebSocket，并将 SSE 作为回退方案 (`"auto"`)，这适用于 `openai/*` 和 `openai-codex/*`。

    在 `"auto"` 模式下，OpenClaw 会：
    - 在回退到 SSE 之前重试一次早期的 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级状态约 60 秒，并在冷却期间使用 SSE
    - 附加稳定的会话和轮次标识头信息，以便进行重试和重新连接
    - 跨不同的传输方式标准化使用计数器 (`input_tokens` / `prompt_tokens`)

    | 值 | 行为 |
    |-------|----------|
    | `"auto"` (默认) | 优先 WebSocket，SSE 回退 |
    | `"sse"` | 强制仅使用 SSE |
    | `"websocket"` | 强制仅使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai-codex/gpt-5.4": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相关 OpenAI 文档：
    - [基于 WebSocket 的实时 API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [API 流式响应 (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket 预热">
    OpenClaw 默认为 `openai/*` 启用 WebSocket 预热，以减少首轮延迟。

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 为 `openai/*` 和 `openai-codex/*` 提供了一个共享的快速模式切换开关：

    - **聊天/UI：** `/fast status|on|off`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 会将快速模式映射到 OpenAI 的优先处理 (`service_tier = "priority"`)。现有的 `service_tier` 值将被保留，且快速模式不会重写 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { fastMode: true } },
            "openai-codex/gpt-5.4": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。在会话 UI 中清除会话覆盖后，会话将恢复为配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="优先处理 (service_tier)">
    OpenAI 的 API 通过 `service_tier` 暴露了优先处理功能。在 OpenClaw 中为每个模型进行设置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { serviceTier: "priority" } },
            "openai-codex/gpt-5.4": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 仅会转发到原生 OpenAI 端点 (`api.openai.com`) 和原生 Codex 端点 (`chatgpt.com/backend-api`)。如果您通过代理路由任一提供商，OpenClaw 将不会改动 `service_tier`。
    </Warning>

  </Accordion>

  <Accordion title="服务器端压缩 (Responses API)">
    对于直接连接的 OpenAI Responses 模型 (`openai/*` 于 `api.openai.com` 上)，OpenClaw 会自动启用服务器端压缩：

    - 强制启用 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（如果不可用则为 `80000`）

    <Tabs>
      <Tab title="显式启用">
        适用于兼容的端点，例如 Azure OpenAI Responses：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.4": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="自定义阈值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="禁用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 仅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍会强制启用 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    对于在 `openai/*` 和 `openai-codex/*` 上运行的 GPT-5 系列，OpenClaw 可以使用更严格的嵌入式执行协定：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic` 时，OpenClaw：
    - 当工具操作可用时，不再将仅计划的轮次视为成功的进度
    - 使用立即行动的引导重试该轮次
    - 为实质工作自动启用 `update_plan`
    - 如果模型持续计划而不采取行动，则显示明确的阻塞状态

    <Note>
    仅限于 OpenAI 和 Codex GPT-5 系列运行。其他提供商和较旧的模型系列保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 对直接 OpenAI、Codex 和 Azure OpenAI 端点的处理方式不同于通用的 OpenAI 兼容 `/v1` 代理：

    **Native routes** (`openai/*`, `openai-codex/*`, Azure OpenAI):
    - 在明确禁用推理时保持 `reasoning: { effort: "none" }` 完整
    - 默认将工具架构设置为严格模式
    - 仅在经过验证的原生主机上附加隐藏的归属标头
    - 保持 OpenAI 专用的请求整形 (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Proxy/compatible routes:**
    - 使用较宽松的兼容行为
    - 不强制执行严格的工具架构或仅限原生的标头

    Azure OpenAI 使用原生传输和兼容行为，但不接收隐藏的归属标头。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Image generation" href="/zh/tools/image-generation" icon="image">
    共享的图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="OAuth 和认证" href="/zh/gateway/authentication" icon="key">
    认证详细信息和凭据重用规则。
  </Card>
</CardGroup>
