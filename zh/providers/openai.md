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

## 选项 A：OpenAI API 密钥 (OpenAI Platform)

**最适用于：** 直接 API 访问和按使用量计费。
从 OpenAI 仪表板获取您的 API 密钥。

### CLI 设置

```bash
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置片段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

OpenAI 当前的 API 模型文档列出了 `gpt-5.4` 和 `gpt-5.4-pro` 用于直接的
OpenAI API 使用。OpenClaw 通过 `openai/*` Responses 路径转发两者。
OpenClaw 故意抑制了过时的 `openai/gpt-5.3-codex-spark` 行，
因为直接的 OpenAI API 调用会在实时流量中拒绝它。

OpenClaw **不**在直接的 OpenAI
API 路径上暴露 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍然为该模型内置了一行，但实时的 OpenAI API
请求目前会拒绝它。Spark 在 OpenClaw 中被视为仅限 Codex 使用。

## 选项 B：OpenAI Code (Codex) 订阅

**最适合：** 使用 ChatGPT/Codex 订阅访问而不是 API 密钥。
Codex cloud 需要 ChatGPT 登录，而 Codex CLI 支持 ChatGPT 或 API 密钥登录。

### CLI 设置 (Codex OAuth)

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### 配置代码段 (Codex 订阅)

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

OpenAI 当前的 Codex 文档将 `gpt-5.4` 列为当前的 Codex 模型。OpenClaw
将其映射到 `openai-codex/gpt-5.4` 以供 ChatGPT/Codex OAuth 使用。

如果您的 Codex 账户有权使用 Codex Spark，OpenClaw 也支持：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 将 Codex Spark 视为仅限 Codex 使用。它不暴露直接的
`openai/gpt-5.3-codex-spark` API 密钥路径。

当 `pi-ai`
发现它时，OpenClaw 也会保留 `openai-codex/gpt-5.3-codex-spark`。请将其视为依赖授权且具有实验性功能：Codex Spark
与 GPT-5.4 `/fast` 是分开的，其可用性取决于登录的 Codex /
ChatGPT 账户。

### 传输默认值

OpenClaw 使用 `pi-ai` 进行模型流式传输。对于 `openai/*` 和
`openai-codex/*`，默认传输方式为 `"auto"`（优先 WebSocket，然后是 SSE
回退）。

您可以设置 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：强制使用 SSE
- `"websocket"`：强制使用 WebSocket
- `"auto"`：尝试 WebSocket，然后回退到 SSE

对于 `openai/*` (Responses API)，当使用 WebSocket 传输时，OpenClaw 默认也会启用 WebSocket 预热（`openaiWsWarmup: true`）。

相关的 OpenAI 文档：

- [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
- [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

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

OpenAI 文档将预热描述为可选。OpenClaw 默认为 `openai/*` 启用它，以减少使用 WebSocket 传输时的首轮延迟。

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

### OpenAI 优先处理

OpenAI 的 API 通过 `service_tier=priority` 暴露优先级处理。在 OpenClaw 中，设置 `agents.defaults.models["openai/<model>"].params.serviceTier` 以在直接的 `openai/*` Responses 请求中传递该字段。

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
      },
    },
  },
}
```

支持的值包括 `auto`、`default`、`flex` 和 `priority`。

### OpenAI 快速模式

OpenClaw 为 `openai/*` 和 `openai-codex/*` 会话公开了一个共享的快速模式开关：

- 聊天/UI：`/fast status|on|off`
- 配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`

启用快速模式后，OpenClaw 将应用低延迟的 OpenAI 配置文件：

- 当负载未指定推理（reasoning）时 `reasoning.effort = "low"`
- 当负载未指定详细程度（verbosity）时 `text.verbosity = "low"`
- 对于直接调用 `api.openai.com` 的 `openai/*` Responses `service_tier = "priority"`

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

会话覆盖优先于配置。在会话 UI 中清除会话覆盖会使会话恢复为配置的默认值。

### OpenAI Responses 服务端压缩

对于直接的 OpenAI Responses 模型（在 `api.openai.com` 上使用 `api: "openai-responses"` 并带有 `baseUrl` 的 `openai/*`），OpenClaw 现在自动启用 OpenAI 服务器端压缩负载提示：

- 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

默认情况下，`compact_threshold` 是模型 `contextWindow` 的 `70%`（或不可用时的 `80000`）。

### 显式启用服务端压缩

当您想要在兼容的 Responses 模型上强制注入 `context_management` 时使用此选项（例如 Azure OpenAI Responses）：

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

### 禁用服务端压缩

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

`responsesServerCompaction` 仅控制 `context_management` 的注入。
直接的 OpenAI Responses 模型仍然强制 `store: true`，除非 compat 设置了
`supportsStore: false`。

## 注意事项

- 模型引用始终使用 `provider/model`（参见 [/concepts/models](/zh/en/concepts/models)）。
- 身份验证详情和重用规则请参阅 [/concepts/oauth](/zh/en/concepts/oauth)。

import zh from '/components/footer/zh.mdx';

<zh />
