---
summary: "在 OpenClaw 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
title: "OpenAI"
---

# OpenAI

OpenAI 为 GPT 模型提供开发者 API。Codex 支持通过 **ChatGPT 登录** 进行订阅访问，或通过 **API 密钥** 登录进行按量付费访问。Codex 云端需要 ChatGPT 登录。
OpenAI 明确支持在外部工具/工作流（如 OpenClaw）中使用订阅 OAuth。

## 默认交互风格

OpenClaw 可以为 `openai/*` 和
`openai-codex/*` 运行添加一个特定的 OpenAI 提示叠加层。默认情况下，该叠加层保持助手热情、协作、简洁、直接，并更具情感表现力，
而不会替换基础的 OpenClaw 系统提示。友好的叠加层
还允许在自然合适的情况下偶尔使用表情符号，同时保持整体
输出简洁。

配置键：

`plugins.entries.openai.config.personality`

允许的值：

- `"friendly"`：默认值；启用特定于 OpenAI 的叠加层。
- `"on"`：`"friendly"` 的别名。
- `"off"`：禁用覆盖层并仅使用基础 OpenClaw 提示。

范围：

- 适用于 `openai/*` 模型。
- 适用于 `openai-codex/*` 模型。
- 不影响其他提供商。

此行为默认开启。如果您希望该设置在未来本地配置更迭中保持不变，请显式保留 `"friendly"`：

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "friendly",
        },
      },
    },
  },
}
```

### 禁用 OpenAI 提示覆盖层

如果您想要未修改的基础 OpenClaw 提示，请将覆盖层设置为 `"off"`：

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "off",
        },
      },
    },
  },
}
```

您也可以使用配置 CLI 直接进行设置：

```bash
openclaw config set plugins.entries.openai.config.personality off
```

OpenClaw 在运行时会以不区分大小写的方式规范化此设置，因此像 `"Off"` 这样的值仍然会禁用友好覆盖层。

## 选项 A：OpenAI API 密钥（OpenAI 平台）

**最适合：** 直接的 API 访问和按使用量计费。
从 API 仪表板获取您的 OpenAI 密钥。

路由摘要：

- `openai/gpt-5.4` = 直接 OpenAI 平台 API 路由
- 需要 `OPENAI_API_KEY`（或等效的 OpenAI 提供商配置）
- 在 OpenClaw 中，ChatGPT/Codex 登录通过 `openai-codex/*` 路由，而不是 `openai/*`

### CLI 设置

```bash
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置代码片段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

OpenAI 当前的 API 模型文档列出了 `gpt-5.4` 和 `gpt-5.4-pro` 用于直接
OpenAI API 使用。OpenClaw 将两者通过 `openai/*` 响应路径进行转发。
OpenClaw 有意抑制了过时的 `openai/gpt-5.3-codex-spark` 行，
因为直接的 OpenAI API 调用会在实时流量中拒绝它。

OpenClaw **不会** 在直接的 OpenAI
API 路径上暴露 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍然为该模型内置了一行，但实时的 OpenAI API
请求目前会拒绝它。Spark 在 OpenClaw 中被视为仅限 Codex 使用。

## 图像生成

捆绑的 `openai` 插件也通过共享的
`image_generate` 工具注册图像生成。

- 默认图像模型：`openai/gpt-image-1`
- 生成：每个请求最多 4 张图像
- 编辑模式：已启用，最多 5 张参考图像
- 支持 `size`
- 当前 OpenAI 特定的注意事项：OpenClaw 目前不会将 `aspectRatio` 或
  `resolution` 覆盖参数转发给 OpenAI Images OpenAI

要将 OpenAI 用作默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/en/tools/image-generation)。

## 视频生成

捆绑的 `openai` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`openai/sora-2`
- 模式：文本生成视频、图像生成视频以及单视频参考/编辑流程
- 当前限制：1 个图像或 1 个视频参考输入
- 当前 OpenAI 特定的注意事项：OpenClaw 目前仅转发原生 OpenAI 视频生成的 `size`
  覆盖参数。不支持的可选覆盖参数（例如 `aspectRatio`、`resolution`、`audio` 和 `watermark`）将被忽略
  并作为工具警告报告回来。

要将 OpenAI 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openai/sora-2",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅 [视频生成](/en/tools/video-generation)。

## 选项 B：OpenAI Code (Codex) 订阅

**最适用于：** 使用 ChatGPT/Codex 订阅访问而不是 API 密钥。
Codex 云需要 ChatGPT 登录，而 Codex CLI 支持 ChatGPT 或 API 密钥登录。

路由摘要：

- `openai-codex/gpt-5.4` = ChatGPT/Codex OAuth 路由
- 使用 ChatGPT/Codex 登录，而不是直接的 OpenAI Platform API 密钥
- 提供商对 `openai-codex/*` 的限制可能与 ChatGPT Web/应用体验不同

### CLI 设置 (Codex OAuth)

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### 配置代码片段 (Codex 订阅)

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

OpenAI 当前的 Codex 文档列出 `gpt-5.4` 为当前的 Codex 模型。OpenClaw
将其映射到 `openai-codex/gpt-5.4` 以用于 ChatGPT/Codex OpenAI 用法。

此路由故意与 `openai/gpt-5.4` 分开。如果您想要
直接的 OpenAI Platform API 路径，请使用带有 API 密钥的 `openai/*`。如果您想要
ChatGPT/Codex 登录，请使用 `openai-codex/*`。

如果新手引导重用了现有的 Codex CLI 登录，这些凭据将由 Codex CLI 管理。过期后，OpenClaw 会首先重新读取外部 Codex 源，并且当提供商可以刷新它时，会将刷新后的凭据写回 Codex 存储，而不是在单独的仅限 OpenClaw 的副本中取得所有权。

如果您的 Codex 账户有权使用 Codex Spark，OpenClaw 也支持：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 将 Codex Spark 视为仅限 Codex。它不暴露直接的 `openai/gpt-5.3-codex-spark` API 密钥路径。

当 `pi-ai` 发现 `openai-codex/gpt-5.3-codex-spark` 时，OpenClaw 也会保留它。请将其视为依赖于权利的实验性功能：Codex Spark 不同于 GPT-5.4 `/fast`，其可用性取决于已登录的 Codex / ChatGPT 账户。

### Codex 上下文窗口上限

OpenClaw 将 Codex 模型元数据和运行时上下文上限视为独立的值。

对于 `openai-codex/gpt-5.4`：

- 原生 `contextWindow`：`1050000`
- 默认运行时 `contextTokens` 上限：`272000`

这样既保持了模型元数据的真实性，又保留了实践中具有更好延迟和质量特征的较小默认运行时窗口。

如果您想要不同的有效上限，请设置 `models.providers.<provider>.models[].contextTokens`：

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [
          {
            id: "gpt-5.4",
            contextTokens: 160000,
          },
        ],
      },
    },
  },
}
```

仅当您声明或覆盖原生模型元数据时才使用 `contextWindow`。当您想要限制运行时上下文预算时使用 `contextTokens`。

### 传输默认值

OpenClaw 使用 `pi-ai` 进行模型流式传输。对于 `openai/*` 和 `openai-codex/*`，默认传输方式为 `"auto"`（WebSocket 优先，然后 SSE 回退）。

在 `"auto"` 模式下，OpenClaw 还会在回退到 SSE 之前重试一次早期的、可重试的 WebSocket 失败。强制的 `"websocket"` 模式仍然会直接显示传输错误，而不是将其隐藏在回退机制之后。

在 `"auto"` 模式下发生连接或早期轮次 WebSocket 失败后，OpenClaw 会将该会话的 WebSocket 路径标记为降级状态约 60 秒，并在冷却期间通过 SSE 发送后续轮次，而不是在传输方式之间反复切换。

对于原生 OpenAI 系列端点（`openai/*`、`openai-codex/*` 和 Azure OpenAI Responses），OpenClaw 还会将稳定的会话和轮次标识状态附加到请求中，以便重试、重新连接和 SSE 回退与同一对话标识保持一致。在原生 OpenAI 系列路由上，这包括稳定的会话/轮次请求标识头以及匹配的传输元数据。

OpenClaw 还会在传输变体的使用计数到达会话/状态界面之前对其进行归一化处理。原生 OpenAI/Codex Responses 流量可能会将使用情况报告为 `input_tokens` / `output_tokens` 或 `prompt_tokens` / `completion_tokens`；OpenAI 会将这些视为 `/status`、`/usage` 和会话日志的相同输入和输出计数器。当原生 WebSocket 流量省略 `total_tokens`（或报告 `0`）时，OpenClaw 会回退到归一化的输入 + 输出总数，以便会话/状态显示保持填充。

您可以设置 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：强制使用 SSE
- `"websocket"`：强制使用 WebSocket
- `"auto"`：尝试 WebSocket，然后回退到 SSE

对于 `openai/*`（Responses API），当使用 WebSocket 传输时，OpenClaw 默认也会启用 WebSocket 预热（`openaiWsWarmup: true`）。

相关的 OpenAI 文档：

- [带有 WebSocket 的实时 API](https://platform.openai.com/docs/guides/realtime-websocket)
- [流式 API 响应 (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

```json5
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.4" },
      models: {
        "openai-codex/gpt-5.4": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}
```

### OpenAI WebSocket 预热

OpenAI 文档将预热描述为可选。OpenClaw 默认为 `openai/*` 启用它，以减少使用 WebSocket 传输时的第一轮次延迟。

### 禁用预热

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: false,
          },
        },
      },
    },
  },
}
```

### 显式启用预热

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: true,
          },
        },
      },
    },
  },
}
```

### OpenAI 和 Codex 优先处理

OpenAI 的 API 通过 `service_tier=priority` 公开了优先处理。在
OpenClaw 中，设置 `agents.defaults.models["<provider>/<model>"].params.serviceTier`
以在原生 OpenAI/Codex Responses 端点上传递该字段。

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

支持的值为 `auto`、`default`、`flex` 和 `priority`。

OpenClaw 会将 `params.serviceTier` 转发给直接的 `openai/*` Responses
请求以及 `openai-codex/*` Codex Responses 请求，前提是这些模型指向
原生 OpenAI/Codex 端点。

重要行为：

- 直接的 `openai/*` 必须针对 `api.openai.com`
- `openai-codex/*` 必须针对 `chatgpt.com/backend-api`
- 如果您将任一提供商通过另一个基础 URL 或代理进行路由，OpenClaw 将保持 `service_tier` 不变

### OpenAI 快速模式

OpenClaw 为 `openai/*` 和
`openai-codex/*` 会话提供了一个共享的快速模式开关：

- 聊天/UI：`/fast status|on|off`
- 配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`

启用快速模式时，OpenClaw 会将其映射到 OpenAI 优先处理：

- 针对 `api.openai.com` 的直接 `openai/*` Responses 调用会发送 `service_tier = "priority"`
- 针对 `chatgpt.com/backend-api` 的 `openai-codex/*` Responses 调用也会发送 `service_tier = "priority"`
- 现有的有效载荷 `service_tier` 值将保留
- 快速模式不会重写 `reasoning` 或 `text.verbosity`

具体对于 GPT 5.4，最常见的设置是：

- 在使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 的会话中发送 `/fast on`
- 或设置 `agents.defaults.models["openai/gpt-5.4"].params.fastMode = true`
- 如果您还使用 Codex OAuth，请同时设置 `agents.defaults.models["openai-codex/gpt-5.4"].params.fastMode = true`

示例：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
      },
    },
  },
}
```

会话覆盖优先于配置。在会话 UI 中清除会话覆盖
会将会话恢复为配置的默认值。

### 原生 OpenAI 与 OpenAI 兼容路由

OpenClaw 将直接的 OpenAI、Codex 和 Azure OpenAI 端点与通用的 OpenAI 兼容 `/v1` 代理区别对待：

- 当您明确禁用推理时，原生 `openai/*`、`openai-codex/*` 和 Azure OpenAI 路由会保持 `reasoning: { effort: "none" }` 完整无损
- 原生 OpenAI 系列路由默认将工具架构设置为严格模式
- 隐藏的 OpenClaw 归属标头（`originator`、`version` 和
  `User-Agent`）仅附加到经过验证的原生 OpenAI 主机
  （`api.openai.com`）和原生 Codex 主机（`chatgpt.com/backend-api`）
- 原生 OpenAI/Codex 路由保留 OpenAI 专用的请求整形，例如
  `service_tier`、Responses `store`、OpenAI 推理兼容负载以及
  提示缓存提示
- 代理风格的 OpenAI 兼容路由保持较宽松的兼容行为，并且
  不强制执行严格的工具架构、原生专用的请求整形或隐藏的
  OpenAI/Codex 归属标头

Azure OpenAI 在传输和兼容行为方面仍属于原生路由类别，但它
不会接收隐藏的 OpenAI/Codex 归属标头。

这样既保留了当前的原生 OpenAI Responses 行为，又不会将较旧的
OpenAI 兼容垫片强加给第三方 `/v1` 后端。

### OpenAI Responses 服务端压缩

对于直接的 OpenAI Responses 模型（在 `api.openai.com` 上使用 `baseUrl` 和
`api: "openai-responses"` 的 `openai/*`），OpenClaw 现在自动启用 OpenAI 服务端
压缩负载提示：

- 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

默认情况下，`compact_threshold` 是模型 `contextWindow` 的 `70%`（或在不可用时为 `80000`
）。

### 显式启用服务端压缩

当您想强制在兼容的 Responses 模型上注入 `context_management` 时使用此选项（例如 Azure OpenAI Responses）：

```json5
{
  agents: {
    defaults: {
      models: {
        "azure-openai-responses/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
          },
        },
      },
    },
  },
}
```

### 使用自定义阈值启用

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

### 禁用服务器端压缩

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}
```

`responsesServerCompaction` 仅控制 `context_management` 注入。
直接 OpenAI 响应模型仍会强制使用 `store: true`，除非兼容性设置了
`supportsStore: false`。

## 注意事项

- 模型引用始终使用 `provider/model`（参见 [/concepts/models](/en/concepts/models)）。
- 身份验证详细信息和重用规则位于 [/concepts/oauth](/en/concepts/oauth)。
