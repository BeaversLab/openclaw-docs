---
summary: "在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI 提供 GPT 模型的开发者 API，并且通过 OpenAI 的 Codex 客户端，Codex 也可作为 ChatGPT 计划的编码代理使用。OpenClaw 将这些界面分开，以便配置保持可预测。

OpenClaw 支持三种 OpenAI 系列路由。模型前缀选择提供商/身份验证路由；一个单独的运行时设置选择谁执行嵌入式代理循环：

- **API 密钥** — 直接访问 OpenAI 平台，按使用量计费 (`openai/*` 模型)
- **通过 PI 的 Codex 订阅** — 使用订阅访问权限登录 ChatGPT/Codex (`openai-codex/*` 模型)
- **Codex 应用服务器连接工具** — 原生 Codex 应用服务器执行 (`openai/*` 模型加上 `agents.defaults.agentRuntime.id: "codex"`)

OpenAI 明确支持在外部工具和工作流程（如 OpenClaw）中使用订阅 OAuth。

提供商、模型、运行时和渠道是独立的层级。如果这些标签混淆在一起，请在更改配置之前阅读 [代理运行时](/zh/concepts/agent-runtimes)。

## 快速选择

| 目标                                        | 使用                                             | 备注                                                                   |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| 直接 API 密钥计费                           | `openai/gpt-5.5`                                 | 设置 `OPENAI_API_KEY` 或运行 OpenAI API 密钥新手引导。                 |
| 通过 ChatGPT/Codex 订阅身份验证使用 GPT-5.5 | `openai-codex/gpt-5.5`                           | Codex OAuth 的默认 PI 路由。订阅设置的最佳首选。                       |
| 通过原生 Codex 应用服务器行为使用 GPT-5.5   | `openai/gpt-5.5` 加上 `agentRuntime.id: "codex"` | 强制该模型引用使用 Codex 应用服务器连接工具。                          |
| 图像生成或编辑                              | `openai/gpt-image-2`                             | 适用于 `OPENAI_API_KEY` 或 OpenAI Codex OAuth。                        |
| 透明背景图像                                | `openai/gpt-image-1.5`                           | 使用 `outputFormat=png` 或 `webp` 和 `openai.background=transparent`。 |

## 命名映射

名称相似但不可互换：

| 您看到的名称                       | 层级         | 含义                                                                        |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `openai`                           | 提供商前缀   | 直接 OpenAI 平台 API 路由。                                                 |
| `openai-codex`                     | 提供商前缀   | 通过常规 OpenAI PI 运行器接入 OAuth Codex OpenClaw/订阅 路由。              |
| `codex` 插件                       | 插件         | 捆绑的 OpenClaw 插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控制。 |
| `agentRuntime.id: codex`           | 代理运行时   | 强制为嵌入轮次使用原生 Codex 应用服务器套具。                               |
| `/codex ...`                       | 聊天命令集   | 从对话中绑定/控制 Codex 应用服务器线程。                                    |
| `runtime: "acp", agentId: "codex"` | ACP 会话路由 | 通过 ACP/acpx 运行 Codex 的显式回退路径。                                   |

这意味着配置可以有意同时包含 `openai-codex/*` 和
`codex` 插件。当您希望通过 PI 使用 Codex OAuth 并且还希望
原生 `/codex` 聊天控制可用时，这是有效的。 `openclaw doctor` 会针对该
组合发出警告，以便您可以确认这是有意的；它不会重写该组合。

<Note>GPT-5.5 可通过直接 OpenAI 平台 API 密钥访问和 订阅/OAuth 路由获得。使用 `openai/gpt-5.5` 进行直接的 `OPENAI_API_KEY` 流量传输，使用 `openai-codex/gpt-5.5` 通过 PI 进行 Codex OAuth，或 使用带有 `agentRuntime.id: "codex"` 的 `openai/gpt-5.5` 来使用原生 Codex 应用服务器套具。</Note>

<Note>启用 OpenAI 插件或选择 `openai-codex/*` 模型，并不会 启用捆绑的 Codex 应用服务器插件。 OpenClaw 仅在您使用 `agentRuntime.id: "codex"` 显式选择原生 Codex 套具或使用旧版 `codex/*` 模型引用时 才会启用该插件。 如果启用了捆绑的 `codex` 插件，但 `openai-codex/*` 仍通过 PI 解析， `openclaw doctor` 将发出警告并保持路由不变。</Note>

## OpenClaw 功能覆盖

| OpenAI 功能          | OpenClaw 界面                                         | 状态                               |
| -------------------- | ----------------------------------------------------- | ---------------------------------- |
| 聊天 / 响应          | `openai/<model>` 模型提供商                           | 是                                 |
| Codex 订阅模型       | 带有 `openai-codex` OAuth 的 `openai-codex/<model>`   | 是                                 |
| Codex 应用服务器套具 | `openai/<model>` 使用 `agentRuntime.id: codex`        | 是                                 |
| 服务器端网页搜索     | 原生 OpenAI Responses 工具                            | 是，当启用网页搜索且未固定提供商时 |
| 图像                 | `image_generate`                                      | 是                                 |
| 视频                 | `video_generate`                                      | 是                                 |
| 文本转语音           | `messages.tts.provider: "openai"` / `tts`             | 是                                 |
| 批量语音转文本       | `tools.media.audio` / 媒体理解                        | 是                                 |
| 流式语音转文本       | 语音通话 `streaming.provider: "openai"`               | 是                                 |
| 实时语音             | 语音通话 `realtime.provider: "openai"` / 控制界面对话 | 是                                 |
| 嵌入                 | 内存嵌入提供商                                        | 是                                 |

## 内存嵌入

OpenClaw 可以使用 OpenAI，或与 OpenAI 兼容的嵌入端点，用于
`memory_search` 索引和查询嵌入：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

对于需要非对称嵌入标签的 OpenAI 兼容端点，请在 `memorySearch` 下设置
`queryInputType` 和 `documentInputType`。OpenClaw 会将这些作为特定于提供商的
`input_type` 请求字段进行转发：查询嵌入使用 `queryInputType`；索引的内存块和批量索引使用
`documentInputType`。有关完整示例，请参阅 [内存配置参考](/zh/reference/memory-config#provider-specific-config)。

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥 (OpenAI 平台)">
    **最适用于：** 直接 API 访问和使用量计费。

    <Steps>
      <Step title="获取您的 API 密钥">
        从 [OpenAI 平台仪表板](https://platform.openai.com/api-keys) 创建或复制 API 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或者直接传递密钥：

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

    | 模型引用              | 运行时配置             | 路由                       | 认证             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`       | omitted / `agentRuntime.id: "pi"`    | Direct OpenAI Platform API  | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-mini`  | omitted / `agentRuntime.id: "pi"`    | Direct OpenAI Platform API  | `OPENAI_API_KEY` |
    | `openai/gpt-5.5`       | `agentRuntime.id: "codex"`           | Codex app-server harness    | Codex app-server |

    <Note>
    `openai/*` 是直接 OpenAI API 密钥路由，除非您显式强制
    使用 Codex 应用服务器工具。使用 `openai-codex/*` 通过
    默认 PI 运行程序进行 Codex OAuth，或使用 `openai/gpt-5.5` 配合
    `agentRuntime.id: "codex"` 进行原生 Codex 应用服务器执行。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    <Warning>
    OpenClaw **不**暴露 `openai/gpt-5.3-codex-spark`。实时的 OpenAI API 请求会拒绝该模型，并且当前的 Codex 目录也不暴露它。
    </Warning>

  </Tab>

  <Tab title="Codex 订阅">
    **最佳选择：** 使用您的 ChatGPT/Codex 订阅，而不是单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或者直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头（headless）或不适合回调的设置，请添加 `--device-code` 以使用 ChatGPT 设备码流程登录，而不是本地浏览器回调：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.5
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型引用 | 运行时配置 | 路由 | 身份验证 |
    |-----------|----------------|-------|------|
    | `openai-codex/gpt-5.5` | 省略 / `runtime: "pi"` | 通过 PI 的 ChatGPT/Codex OAuth | Codex 登录 |
    | `openai-codex/gpt-5.5` | `runtime: "auto"` | 仍为 PI，除非插件显式声明 `openai-codex` | Codex 登录 |
    | `openai/gpt-5.5` | `agentRuntime.id: "codex"` | Codex 应用服务器适配器 | Codex 应用服务器身份验证 |

    <Note>
    请继续将 `openai-codex` 提供商 id 用于 auth/profile 命令。`openai-codex/*` 模型前缀也是 Codex OAuth 的显式 PI 路由。它不会选择或自动启用捆绑的 Codex 应用服务器适配器。
    </Note>

    ### 配置示例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
    }
    ```

    <Note>
    新手引导不再从 `~/.codex` 导入 OAuth 材料。请使用浏览器 OAuth（默认）或上述设备码流程登录 —— OpenClaw 会将生成的凭据管理在其自己的代理身份验证存储中。
    </Note>

    ### 状态指示器

    聊天 `/status` 显示当前会话处于活动状态的模型运行时。默认的 PI 适配器显示为 `Runtime: OpenClaw Pi Default`。当选择了捆绑的 Codex 应用服务器适配器时，`/status` 会显示 `Runtime: OpenAI Codex`。现有会话会保留其记录的适配器 id，因此如果您希望 `/status` 反映新的 PI/Codex 选择，请在更改 `agentRuntime` 后使用 `/new` 或 `/reset`。

    ### Doctor 警告

    如果启用了捆绑的 `codex` 插件且选中了此选项卡的 `openai-codex/*` 路由，`openclaw doctor` 将警告模型仍然通过 PI 解析。如果这是预期的订阅身份验证路由，请保持配置不变。仅当您需要原生 Codex 应用服务器执行时，才切换到 `openai/<model>` 加上 `agentRuntime.id: "codex"`。

    ### 上下文窗口上限

    OpenClaw 将模型元数据和运行时上下文上限视为单独的值。

    对于通过 Codex OAuth 的 `openai-codex/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 默认运行时 `contextTokens` 上限：`272000`

    较小的默认上限在实践中具有更好的延迟和质量特征。可以使用 `contextTokens` 覆盖它：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens` 限制运行时上下文预算。
    </Note>

    ### 目录恢复

    如果存在上游 Codex 目录元数据，OpenClaw 会将其用于 `gpt-5.5`。如果实时 Codex 发现省略了 `openai-codex/gpt-5.5` 行，而帐户已通过身份验证，OpenClaw 将综合该 OAuth 模型行，以便 cron、子代理和配置的默认模型运行不会因 `Unknown model` 而失败。

  </Tab>
</Tabs>

## 图像生成

内置的 `openai` 插件通过 `image_generate` 工具注册图像生成功能。
它支持通过同一个 `openai/gpt-image-2` 模型引用，进行 OpenAI API 密钥图像生成和 Codex OAuth 图像生成。

| 功能                 | OpenAI API 密钥              | Codex OAuth                 |
| -------------------- | ---------------------------- | --------------------------- |
| 模型引用             | `openai/gpt-image-2`         | `openai/gpt-image-2`        |
| 认证                 | `OPENAI_API_KEY`             | OpenAI Codex OAuth 登录     |
| 传输                 | OpenAI Images API            | Codex Responses 后端        |
| 每个请求的最大图像数 | 4                            | 4                           |
| 编辑模式             | 已启用（最多 5 张参考图像）  | 已启用（最多 5 张参考图像） |
| 尺寸覆盖             | 支持，包括 2K/4K 尺寸        | 支持，包括 2K/4K 尺寸       |
| 长宽比 / 分辨率      | 不会转发至 OpenAI Images API | 安全时映射到支持的尺寸      |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>参见 [Image Generation](/zh/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

`gpt-image-2` 是 OpenAI 文本生成图像和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可用作显式模型覆盖。使用 `openai/gpt-image-1.5` 获取透明背景 PNG/WebP 输出；当前的 `gpt-image-2` API 拒绝 `background: "transparent"`。

对于透明背景请求，代理应使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 以及 `background: "transparent"` 调用 `image_generate`；较旧的 `openai.background` 提供商选项仍被接受。OpenClaw 还通过将默认的 `openai/gpt-image-2` 透明请求重写为 `gpt-image-1.5`，来保护公共 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点保留其配置的部署/模型名称。

无头 CLI 运行中也公开了相同的设置：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

当从输入文件启动时，对 `openclaw infer image edit` 使用相同的 `--output-format` 和 `--background` 标志。
`--openai-background` 仍可作为 OpenAI 专用别名使用。

对于 Codex OAuth 安装，请保留相同的 `openai/gpt-image-2` 引用。当配置了 `openai-codex` OAuth 配置文件时，OpenClaw 会解析该存储的 OAuth 访问令牌，并通过 Codex Responses 后端发送图像请求。它不会首先尝试 `OPENAI_API_KEY` 或静默回退到 API 密钥。当您需要直接的 API Images OpenAI 路由时，请使用 API 密钥、自定义基础 URL 或 Azure 端点显式配置 `models.providers.openai`。
如果该自定义图像端点位于受信任的 LAN/专用地址上，还请设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非存在此选择加入选项，否则 OpenClaw 将阻止专用/内部 OpenAI 兼容的图像端点。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

生成透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
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
| 模式     | 文本生成视频、图像生成视频、单个视频编辑                                 |
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

<Note>请参阅[视频生成](/zh/tools/video-generation)了解共享工具参数、提供商选择和故障转移行为。</Note>

## GPT-5 提示词贡献

OpenClaw 为跨提供商的 GPT-5 系列运行添加了共享的 GPT-5 提示词贡献。它按模型 ID 应用，因此 `openai-codex/gpt-5.5`、`openai/gpt-5.5`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他兼容的 GPT-5 引用会收到相同的覆盖。较旧的 GPT-4.x 模型则不会。

内置的原生 Codex 控制器通过 Codex 应用服务器开发者指令使用相同的 GPT-5 行为和心跳覆盖，因此通过 `agentRuntime.id: "codex"` 强制执行的 `openai/gpt-5.x` 会话即使 Codex 拥有其余的控制器提示，也能保持相同的后续执行和主动心跳指导。

GPT-5 贡献增加了一个用于角色持久性、执行安全性、工具纪律、输出形状、完成检查和验证的标记行为契约。特定于频道的回复和静默消息行为保留在共享的 OpenClaw 系统提示和出站交付策略中。对于匹配的模型，GPT-5 指导始终处于启用状态。友好的交互风格层是独立且可配置的。

| 值                  | 效果                 |
| ------------------- | -------------------- |
| `"friendly"` (默认) | 启用友好的交互风格层 |
| `"on"`              | `"friendly"` 的别名  |
| `"off"`             | 仅禁用友好风格层     |

<Tabs>
  <Tab title="配置">
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

<Tip>在运行时值不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。</Tip>

<Note>当未设置共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置时，传统的 `plugins.entries.openai.config.personality` 仍将作为兼容性回退项被读取。</Note>

## 语音和语音

<AccordionGroup>
  <Accordion title="语音合成 (TTS)">
    附带的 `openai` 插件为 `messages.tts` 表面注册了语音合成功能。

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
    设置 `OPENAI_TTS_BASE_URL` 以覆盖 TTS 基础 URL，而不会影响聊天 API 端点。
    </Note>

  </Accordion>

  <Accordion title="语音转文字">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册批量语音转文字功能。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：多部分音频文件上传
    - OpenClaw 在任何使用 `tools.media.audio` 的入站音频转录处均受支持，包括 Discord 语音频道片段和频道音频附件

    如要强制使用 OpenAI 进行入站音频转录：

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

    当通过共享音频媒体配置或每次调用转录请求提供时，语言和提示提示词将转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为语音通话插件注册实时转录功能。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | (未设置) |
    | 提示 | `...openai.prompt` | (未设置) |
    | 静音持续时间 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | API 密钥 | `...openai.apiKey` | 回退至 `OPENAI_API_KEY` |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，采用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音频。此流式提供商用于语音通话的实时转录路径；Discord 语音目前录制短片段并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为语音通话插件注册实时语音。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-1.5` |
    | 语音 | `...openai.voice` | `alloy` |
    | 温度 | `...openai.temperature` | `0.8` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | 静音持续时间 | `...openai.silenceDurationMs` | `500` |
    | API 密钥 | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    <Note>
    支持通过 `azureEndpoint` 和 `azureDeployment` 配置键为后端实时桥接支持 Azure OpenAI。支持双向工具调用。使用 G.711 u-law 音频格式。
    </Note>

    <Note>
    控制 UI 通话使用具有 OpenAI 铸造的
    临时客户端密钥的 Gateway(网关) 浏览器实时会话，以及直接针对
    OpenAI 实时 API 的浏览器 WebRTC SDP 交换。
    维护者实时验证可通过 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 进行；
    OpenAI 端在 Node 中铸造客户端密钥，使用假麦克风媒体生成浏览器 SDP 提议，
    将其发布到 OpenAI，并在不记录密钥的情况下应用 SDP 应答。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 终结点

捆绑的 `openai` 提供商可以通过覆盖基础 URL 来定位 Azure OpenAI 资源以进行图像
生成。在图像生成路径上，OpenClaw
检测 `models.providers.openai.baseUrl` 上的 Azure 主机名，并自动
切换到 Azure 的请求形状。

<Note>实时语音使用单独的配置路径 (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) 并且不受 `models.providers.openai.baseUrl` 的影响。请参阅 [Voice and speech](#voice-and-speech) 下的 **Realtime voice**（实时语音）折叠面板以了解其 Azure 设置。</Note>

在以下情况使用 Azure OpenAI：

- 您已经拥有 Azure OpenAI 订阅、配额或企业协议
- 您需要 Azure 提供的区域数据驻留或合规控制
- 您希望将流量保留在现有的 Azure 租户内

### 配置

对于通过捆绑的 `openai` 提供商进行的 Azure 图像生成，请将 `models.providers.openai.baseUrl` 指向您的 Azure 资源，并将 `apiKey` 设置为 Azure OpenAI 密钥（而非 OpenAI 平台密钥）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

对于 Azure 图像生成路由，OpenClaw 可识别以下 Azure 主机后缀：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于可识别的 Azure 主机上的图像生成请求，OpenClaw 会：

- 发送 `api-key` 标头而不是 `Authorization: Bearer`
- 使用部署范围的路径 (`/openai/deployments/{deployment}/...`)
- 向每个请求附加 `?api-version=...`
- 对于 Azure 图像生成调用，使用 600 秒的默认请求超时。每次调用的 `timeoutMs` 值仍会覆盖此默认值。

其他基础 URL（公共 OpenAI、OpenAI 兼容代理）保留标准的 OpenAI 图像请求形状。

<Note>`openai` 提供商的图像生成路径的 Azure 路由需要 OpenClaw 2026.4.22 或更高版本。早期版本将任何自定义 `openai.baseUrl` 视为公共 OpenAI 端点，并且在 Azure 图像部署上将会失败。</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以固定特定的 Azure 预览版或正式版 (GA) 版本，用于 Azure 图像生成路径：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

未设置该变量时，默认为 `2024-12-01-preview`。

### 模型名称即部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供商路由的 Azure 图像生成请求，OpenClaw 中的 `model` 字段必须是您在 Azure 门户中配置的 **Azure 部署名称**，而不是公共 OpenAI 模型 id。

如果您创建了一个名为 `gpt-image-2-prod` 且提供 `gpt-image-2` 的部署：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名称规则适用于通过捆绑的 `openai` 提供商路由的图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、
`uaenorth`）。在创建部署之前，请查看 Microsoft 当前的区域列表，并确认您的区域是否提供特定的模型。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。
Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `background` 上的某些 `gpt-image-2` 值），或者仅在特定模型版本上公开它们。这些差异来自 Azure 和底层模型，而不是
OpenClaw。如果 Azure 请求因验证错误而失败，请检查 Azure 门户中您的特定部署和 API 版本支持的参数集。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不会接收
OpenClaw 的隐藏归属标头 — 请参阅 [Advanced configuration](#advanced-configuration) 下的 **Native vs OpenAI-compatible
routes**（原生与 API 兼容路由）折叠面板。

对于 Azure 上的聊天或 Responses 流量（超出图像生成的范围），请使用
新手引导 流程或专用的 Azure 提供商配置 — 单独使用 `openai.baseUrl`
无法采用 Azure API/auth 形状。存在一个单独的
`azure-openai-responses/*` 提供商；请参阅
下面的 Server-side compaction（服务器端压缩）折叠面板。

</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="传输（WebSocket 与 SSE）">
    OpenClaw 优先使用 WebSocket，并回退到 SSE (`"auto"`)，同时适用于 `openai/*` 和 `openai-codex/*`。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前重试一次早期的 WebSocket 失败
    - 失败后，将 WebSocket 标记为降级状态约 60 秒，并在冷却期间使用 SSE
    - 为重试和重新连接附加稳定的会话和轮次标识头
    - 跨传输变体标准化使用计数器 (`input_tokens` / `prompt_tokens`)

    | 值 | 行为 |
    |-------|----------|
    | `"auto"` (默认) | 优先 WebSocket，回退 SSE |
    | `"sse"` | 强制仅使用 SSE |
    | `"websocket"` | 强制仅使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
            "openai-codex/gpt-5.5": {
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

  <Accordion title="WebSocket 预热">
    OpenClaw 默认为 `openai/*` 和 `openai-codex/*` 启用 WebSocket 预热，以减少首轮延迟。

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
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

    启用后，OpenClaw 将快速模式映射到 OpenAI 优先处理 (`service_tier = "priority"`)。现有的 `service_tier` 值将被保留，且快速模式不会重写 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。在会话 UI 中清除会话覆盖将使会话恢复到配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)">
    OpenAI 的 API 通过 `service_tier` 暴露了优先处理功能。在 OpenClaw 中按模型进行设置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 仅会转发到原生 OpenAI 端点（`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`）。如果您通过代理路由任一提供商，OpenClaw 将保持 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="Server-side compaction (Responses API)">
    对于直接连接的 OpenAI Responses 模型（`openai/*` on `api.openai.com`），OpenAI 插件的 Pi-harness 流包装器会自动启用服务器端压缩：

    - 强制执行 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（或者当不可用时 `80000`）

    这适用于内置的 Pi harness 路径以及嵌入式运行所使用的 OpenAI 提供商钩子。原生 Codex 应用服务器 harness 通过 Codex 管理自己的上下文，并使用 `agents.defaults.agentRuntime.id` 单独配置。

    <Tabs>
      <Tab title="Enable explicitly">
        适用于兼容的端点，如 Azure OpenAI Responses：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Custom threshold">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
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
      <Tab title="Disable">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
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
    `responsesServerCompaction` 仅控制 `context_management` 的注入。直接连接的 OpenAI Responses 模型仍然会强制执行 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="严格代理 GPT 模式">
    对于在 `openai/*` 上运行的 GPT-5 系列，OpenClaw 可以使用更严格的嵌入式执行契约：

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
    - 当存在工具操作时，不再将仅计划的轮次视为成功的进展
    - 使用立即行动引导重试该轮次
    - 为实质性工作自动启用 `update_plan`
    - 如果模型持续计划而不采取行动，则显示明确的阻塞状态

    <Note>
    仅适用于 OpenAI 和 Codex GPT-5 系列运行。其他提供商和较旧的模型系列保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="原生与 OpenAI 兼容路由">
    OpenClaw 对直接 OpenAI、Codex 和 Azure OpenAI 端点的处理方式不同于通用的 OpenAI 兼容 `/v1` 代理：

    **原生路由**（`openai/*`，Azure OpenAI）：
    - 仅对支持 OpenAI `none` 工作的模型保留 `reasoning: { effort: "none" }`
    - 省略拒绝 `reasoning.effort: "none"` 的模型或代理的已禁用推理
    - 默认将工具架构设置为严格模式
    - 仅在验证的原生主机上附加隐藏的归因头
    - 保留 OpenAI 专用的请求整形（`service_tier`、`store`、reasoning-compat、prompt-cache 提示）

    **代理/兼容路由：**
    - 使用较宽松的兼容行为
    - 从非原生 `openai-completions` 载荷中剥离 Completions `store`
    - 接受 OpenAI 兼容 Completions 代理的高级 `params.extra_body`/`params.extraBody` 透传 JSON
    - 接受 vLLM 等 OpenAI 兼容 Completions 代理的 `params.chat_template_kwargs`
    - 不强制执行严格工具架构或仅限原生的头

    Azure OpenAI 使用原生传输和兼容行为，但不接收隐藏的归因头。

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
  <Card title="OAuth 和认证" href="/zh/gateway/authentication" icon="key">
    认证详细信息和凭据重用规则。
  </Card>
</CardGroup>
