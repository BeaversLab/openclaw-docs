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

- **API 密钥** — 直接访问 OpenAI 平台，采用按使用量计费 (`openai/*` 模型)
- **Codex 订阅** — 使用订阅权限登录 ChatGPT/Codex (`openai-codex/*` 模型)

OpenAI 明确支持在外部工具和工作流（如 OpenClaw）中使用订阅 OAuth。

## OpenClaw 功能覆盖

| OpenAI 能力      | OpenClaw 接口                             | 状态                               |
| ---------------- | ----------------------------------------- | ---------------------------------- |
| 聊天 / 响应      | `openai/<model>` 模型提供商               | 是                                 |
| Codex 订阅模型   | `openai-codex/<model>` 模型提供商         | 是                                 |
| 服务器端网络搜索 | 原生 OpenAI Responses 工具                | 是，当启用网络搜索且未固定提供商时 |
| 图像             | `image_generate`                          | 是                                 |
| 视频             | `video_generate`                          | 是                                 |
| 文本转语音       | `messages.tts.provider: "openai"` / `tts` | 是                                 |
| 批量语音转文字   | `tools.media.audio` / 媒体理解            | 是                                 |
| 流式语音转文字   | 语音呼叫 `streaming.provider: "openai"`   | 是                                 |
| 实时语音         | 语音呼叫 `realtime.provider: "openai"`    | 是                                 |
| 嵌入             | 记忆嵌入提供商                            | 是                                 |

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="API key (OpenAI Platform)">
    **最适用于：** 直接访问 API 和基于使用量的计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        从 [OpenAI Platform 控制台](https://platform.openai.com/api-keys) 创建或复制一个 API 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或者直接传入密钥：

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

    ### 路由概览

    | 模型引用 | 路由 | 认证 |
    |-----------|-------|------|
    | `openai/gpt-5.4` | Direct OpenAI Platform API | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | Direct OpenAI Platform API | `OPENAI_API_KEY` |

    <Note>
    ChatGPT/Codex 登录是通过 `openai-codex/*` 路由的，而不是 `openai/*`。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw **不**会在直接 API 路径上暴露 `openai/gpt-5.3-codex-spark`。实时的 OpenAI API 请求会拒绝该模型。Spark 仅限 Codex 使用。
    </Warning>

  </Tab>

  <Tab title="Codex 订阅">
    **最适用于：** 使用您的 ChatGPT/Codex 订阅，而不是单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或者直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头或对回调不友好的设置，添加 `--device-code` 以使用 ChatGPT 设备码流程登录，而不是本地主机浏览器回调：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.4
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 路由 | 认证 |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Codex 登录 |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Codex 登录（取决于权限）|

    <Note>
    此路由有意与 `openai/gpt-5.4` 分开。使用带有 API 密钥的 `openai/*` 进行直接平台访问，并使用 `openai-codex/*` 进行 Codex 订阅访问。
    </Note>

    ### 配置示例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Note>
    新手引导不再从 `~/.codex` 导入 OAuth 资料。使用浏览器 OAuth（默认）或上述设备码流程登录 —— OpenClaw 在其自己的代理身份验证存储中管理生成的凭据。
    </Note>

    ### 上下文窗口上限

    OpenClaw 将模型元数据和运行时上下文上限视为单独的值。

    对于 `openai-codex/gpt-5.4`：

    - 原生 `contextWindow`：`1050000`
    - 默认运行时 `contextTokens` 上限：`272000`

    较小的默认上限实际上具有更好的延迟和质量特性。使用 `contextTokens` 覆盖它：

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

内置的 `openai` 插件通过 `image_generate` 工具注册图像生成功能。

| 功能                 | 值                          |
| -------------------- | --------------------------- |
| 默认模型             | `openai/gpt-image-2`        |
| 每次请求的最大图像数 | 4                           |
| 编辑模式             | 已启用（最多 5 张参考图片） |
| 尺寸覆盖             | 支持，包括 2K/4K 尺寸       |
| 长宽比 / 分辨率      | 未转发至 OpenAI 图像 API    |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>请参阅 [图像生成](/zh/tools/image-generation) 了解共享的工具参数、提供商选择和故障转移行为。</Note>

`gpt-image-2` 是 OpenAI 文本生成图像和图像编辑的默认模型。`gpt-image-1` 仍可用作显式模型覆盖，但新的 OpenAI 图像工作流应使用 `openai/gpt-image-2`。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

编辑：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## 视频生成

捆绑的 `openai` 插件通过 `video_generate` 工具注册视频生成。

| 功能     | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 默认模型 | `openai/sora-2`                                                          |
| 模式     | 文本到视频、图像到视频、单个视频编辑                                     |
| 参考输入 | 1 张图像或 1 个视频                                                      |
| 尺寸覆盖 | 支持                                                                     |
| 其他覆盖 | `aspectRatio`、`resolution`、`audio`、`watermark` 将被忽略并发出工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>有关共享工具参数、提供商选择和故障转移行为，请参阅[视频生成](/zh/tools/video-generation)。</Note>

## GPT-5 提示词贡献

OpenClaw 为跨提供商的 GPT-5 系列运行添加了共享的 GPT-5 提示词贡献。它按模型 ID 应用，因此 `openai/gpt-5.4`、`openai-codex/gpt-5.4`、`openrouter/openai/gpt-5.4`、`opencode/gpt-5.4` 以及其他兼容的 GPT-5 引用会获得相同的叠加层。较旧的 GPT-4.x 模型则不会。

捆绑的原生 Codex 鞍座提供商 (`codex/*`) 通过 Codex 应用服务器开发者说明使用相同的 GPT-5 行为和心跳叠加层，因此即使 Codex 拥有鞍座提示词的其余部分，`codex/gpt-5.x` 会话仍保持相同的跟进和主动心跳指导。

GPT-5 贡献添加了一个标记的行为契约，用于角色持久性、执行安全性、工具纪律、输出形状、完成检查和验证。特定频道的回复和静默消息行为保留在共享的 OpenClaw 系统提示和出站交付策略中。对于匹配的模型，GPT-5 指引始终处于启用状态。友好的交互样式层是独立的且可配置的。

| 值                   | 效果                 |
| -------------------- | -------------------- |
| `"friendly"`（默认） | 启用友好的交互样式层 |
| `"on"`               | `"friendly"` 的别名  |
| `"off"`              | 仅禁用友好样式层     |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>值在运行时不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好样式层。</Tip>

<Note>当未设置共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置时，仍会读取旧版 `plugins.entries.openai.config.personality` 作为兼容性回退。</Note>

## 语音和语音

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    内置的 `openai` 插件为 `messages.tts` 表面注册了语音合成功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 语音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未设置) |
    | 指令 | `messages.tts.providers.openai.instructions` | (未设置，仅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音笔记使用 `opus`，文件使用 `mp3` |
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
    设置 `OPENAI_TTS_BASE_URL` 可覆盖 TTS 基础 URL，而不会影响聊天 API 端点。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    随附的 `openai` 插件通过
    OpenClaw 的媒体理解转录表面注册了批量语音转文本功能。

    - 默认模型： `gpt-4o-transcribe`
    - 端点： OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：多部分音频文件上传
    - OpenClaw 在任何使用
      `tools.media.audio` 进行入站音频转录的地方均支持此功能，包括 Discord 语音频道片段和频道
      音频附件

    若要强制 OpenAI 用于入站音频转录：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    当由共享音频媒体配置或单次调用转录请求提供时，语言和提示提示将转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时转录功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | (未设置) |
    | 提示词 | `...openai.prompt` | (未设置) |
    | 静音持续时间 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | API 密钥 | `...openai.apiKey` | 回退至 `OPENAI_API_KEY` |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，并使用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音频。此流式提供商用于 Voice Call 的实时转录路径；Discord 语音目前录制短片段并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时语音功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | 语音 | `...openai.voice` | `alloy` |
    | 温度 | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音时长 | `...openai.silenceDurationMs` | `500` |
    | API 密钥 | `...openai.apiKey` | 回退至 `OPENAI_API_KEY` |

    <Note>
    通过 `azureEndpoint` 和 `azureDeployment` 配置键支持 Azure OpenAI。支持双向工具调用。使用 G.711 u-law 音频格式。
    </Note>

  </Accordion>
</AccordionGroup>

## 高级配置

<AccordionGroup>
  <Accordion title="传输方式（WebSocket 与 SSE）">
    OpenClaw 对 `openai/*` 和 `openai-codex/*` 均优先使用 WebSocket，并回退到 SSE（`"auto"`）。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期的 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级约 60 秒，并在冷却期间使用 SSE
    - 附加稳定的会话和轮次标识头，用于重试和重新连接
    - 跨传输变体标准化使用计数器（`input_tokens` / `prompt_tokens`）

    | 值 | 行为 |
    |-------|----------|
    | `"auto"`（默认）| 优先使用 WebSocket，回退到 SSE |
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
    - [使用 WebSocket 的 Realtime API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [流式 API 响应 (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket warm-up">
    OpenClaw 默认为 `openai/*` 启用 WebSocket 预热以减少首轮延迟。

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

<a id="openai-fast-mode"></a>

  <Accordion title="Fast mode">
    OpenClaw 为 `openai/*` 和 `openai-codex/*` 提供了一个共享的快速模式切换开关：

    - **Chat/UI:** `/fast status|on|off`
    - **Config:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 会将快速模式映射到 OpenAI 的优先处理（`service_tier = "priority"`）。现有的 `service_tier` 值会被保留，快速模式不会重写 `reasoning` 或 `text.verbosity`。

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
    会话覆盖优先于配置。在 Sessions UI 中清除会话覆盖会将会话恢复为配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)">
    OpenAI 的 API 通过 `service_tier` 暴露了优先处理功能。在 OpenClaw 中按模型进行设置：

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
    `serviceTier` 仅会转发到原生 OpenAI 端点 (`api.openai.com`) 和原生 Codex 端点 (`chatgpt.com/backend-api`)。如果您通过代理路由任一提供商，OpenClaw 将保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="服务器端压缩 (Responses API)">
    对于直接的 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenClaw 会自动启用服务器端压缩：

    - 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（或在不可用时使用 `80000`）

    <Tabs>
      <Tab title="显式启用">
        适用于 Azure OpenAI Responses 等兼容端点：

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
    `responsesServerCompaction` 仅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍然会强制 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    对于 `openai/*` 和 `openai-codex/*` 上的 GPT-5 系列运行，OpenClaw 可以使用更严格的嵌入式执行合约：

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
    - 不再将仅有计划的轮次视为成功的进度（当有工具操作可用时）
    - 使用立即操作的引导重试该轮次
    - 针对大量工作自动启用 `update_plan`
    - 如果模型持续规划而不采取操作，则显示明确的受阻状态

    <Note>
    仅适用于 OpenAI 和 Codex GPT-5 系列运行。其他提供商和较旧的模型系列保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 将直接 OpenAI、Codex 和 Azure OpenAI 端点与通用 OpenAI 兼容的 `/v1` 代理区别对待：

    **原生路由**（`openai/*`、`openai-codex/*`、Azure OpenAI）：
    - 仅对支持 OpenAI `none` 工作的模型保留 `reasoning: { effort: "none" }`
    - 省略针对拒绝 `reasoning.effort: "none"` 的模型或代理的禁用推理
    - 默认工具架构为严格模式
    - 仅在经过验证的原生主机上附加隐藏的归因标头
    - 保留仅 OpenAI 的请求塑形（`service_tier`、`store`、reasoning-compat、prompt-cache 提示）

    **代理/兼容路由：**
    - 使用较宽松的兼容行为
    - 不强制使用严格工具架构或仅原生标头

    Azure OpenAI 使用原生传输和兼容行为，但不会接收隐藏的归因标头。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="OAuth 和 auth" href="/zh/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
</CardGroup>
