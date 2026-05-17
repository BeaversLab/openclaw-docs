---
summary: "OpenClawOpenAI将 OpenClaw 与 vLLM（OpenAI 兼容的本地服务器）结合使用"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM 可以通过 **OpenAI 兼容** 的 HTTP API 来提供开源（以及部分自定义）模型。OpenClaw 使用 `openai-completions` API 连接到 vLLM。

OpenClaw 也可以从 vLLM **自动发现** 可用模型，当你选择使用 `VLLM_API_KEY` 时（如果你的服务器不强制认证，任何值都可以）。当你还配置了自定义 vLLM 基础 URL 时，请在 `agents.defaults.models` 中使用 `vllm/*` 以保持发现动态更新。

OpenClaw 将 OpenClaw`vllm`OpenAI 视为支持流式使用计费的本地 OpenAI 兼容提供商，因此状态/上下文 token 计数可以从 `stream_options.include_usage` 响应中更新。

| 属性         | 值                                        |
| ------------ | ----------------------------------------- |
| 提供商 ID    | `vllm`                                    |
| API          | `openai-completions`OpenAI（OpenAI 兼容） |
| 身份验证     | `VLLM_API_KEY` 环境变量                   |
| 默认基础 URL | `http://127.0.0.1:8000/v1`                |

## 入门指南

<Steps>
  <Step title="OpenAI启动兼容 OpenAI 的 vLLM 服务器">
    您的基础 URL 应公开 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API 密钥环境变量">
    如果您的服务器不强制进行身份验证，则可以使用任意值：

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="选择模型">
    替换为您的 vLLM 模型 ID 之一：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型发现（隐式提供商）

当设置了 `VLLM_API_KEY`（或存在身份验证配置文件）并且您**未**定义 `models.providers.vllm` 时，OpenClaw 会查询：

```
GET http://127.0.0.1:8000/v1/models
```

并将返回的 ID 转换为模型条目。

<Note>如果您显式设置了 `models.providers.vllm`OpenClaw，OpenClaw 默认将使用您声明的模型。当您希望 OpenClaw 查询该已配置提供商的 `/models` 端点并包含所有 advertised vLLM 模型时，请将 `"vllm/*": {}` 添加到 `agents.defaults.models`OpenClaw 中。</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- vLLM 运行在不同的主机或端口上
- 您想要固定 `contextWindow` 或 `maxTokens` 值
- 您的服务器需要真实的 API 密钥（或者您想要控制请求头）
- 您连接到受信任的环回、LAN 或 Tailscale vLLM 端点

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        request: { allowPrivateNetwork: true },
        timeoutSeconds: 300, // Optional: extend connect/header/body/request timeout for slow local models
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

要保持此提供商的动态而无需手动列出每个模型，请将提供商通配符添加到可见模型目录：

```json5
{
  agents: {
    defaults: {
      models: {
        "vllm/*": {},
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="Proxy-style behavior">
    vLLM 被视为代理风格的 OpenAI 兼容 `/v1` 后端，而非原生
    OpenAI 端点。这意味着：

    | 行为 | 是否应用？ |
    |----------|----------|
    | 原生 OpenAI 请求塑形 | 否 |
    | `service_tier` | 未发送 |
    | 响应 `store` | 未发送 |
    | 提示缓存提示 | 未发送 |
    | OpenAI 推理兼容负载塑形 | 未应用 |
    | 隐藏的 OpenClaw 归属标头 | 不会注入到自定义基础 URL |

  </Accordion>

  <Accordion title="QwenQwen 思维控制">
    对于通过 vLLM 提供的 Qwen 模型，当
    服务器期望 Qwen 聊天模板 kwargs 时，请在
    模型条目上设置 `params.qwenThinkingFormat: "chat-template"`。OpenClaw 将 `/think off` 映射到：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 思维级别会发送 `enable_thinking: true`。如果您的端点
    改为期望 DashScope 风格的顶级标志，请使用
    `params.qwenThinkingFormat: "top-level"` 在
    请求根级别发送 `enable_thinking`。也接受蛇形命名法（snake-case）的 `params.qwen_thinking_format`。

  </Accordion>

  <Accordion title="Nemotron 3 思维控制">
    vLLM/Nemotron 3 可以使用 chat-template kwargs 来控制推理结果是
    作为隐藏推理返回还是作为可见的答案文本返回。当 OpenClaw 会话
    在关闭思考功能的情况下使用 `vllm/nemotron-3-*` 时，内置的 vLLM 插件会发送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    要自定义这些值，请在模型参数下设置 `chat_template_kwargs`。
    如果您还设置了 `params.extra_body.chat_template_kwargs`，该值将具有
    最终优先权，因为 `extra_body` 是最后一个请求体覆盖项。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/nemotron-3-super": {
              params: {
                chat_template_kwargs: {
                  enable_thinking: false,
                  force_nonempty_content: true,
                },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="QwenQwen 工具调用显示为文本">
    首先请确保启动 vLLM 时，为该模型配置了正确的工具调用解析器和聊天模板。例如，vLLM 文档中为 Qwen2.5 模型列出了 `hermes`，为 Qwen3-Coder 模型列出了 `qwen3_xml`。

    症状：

    - 技能或工具从未运行
    - 助手打印原始 JSON/XML，例如 `{"name":"read","arguments":...}`
    - 当 OpenClaw 发送 `tool_choice: "auto"`OpenClaw 时，vLLM 返回空的 `tool_calls`Qwen 数组

    某些 Qwen/vLLM 组合仅在请求使用 `tool_choice: "required"`OpenAI 时才返回结构化工具调用。对于这些模型条目，请使用 `params.extra_body` 强制设置 OpenAI 兼容的请求字段：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/Qwen-Qwen2.5-Coder-32B-Instruct": {
              params: {
                extra_body: {
                  tool_choice: "required",
                },
              },
            },
          },
        },
      },
    }
    ```

    将 `Qwen-Qwen2.5-Coder-32B-Instruct` 替换为以下命令返回的确切 ID：

    ```bash
    openclaw models list --provider vllm
    ```CLI

    您也可以从 CLI 应用相同的覆盖设置：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    这是一个可选的兼容性变通方案。它使得每次涉及工具的模型轮次都强制要求工具调用，因此请仅将其用于该行为可接受的专用本地模型条目。不要将其作为所有 vLLM 模型的全局默认值，也不要使用盲目地将任意助手文本转换为可执行工具调用的代理。

  </Accordion>

  <Accordion title="自定义基础 URL">
    如果您的 vLLM 服务器运行在非默认主机或端口上，请在显式提供商配置中设置 `baseUrl`：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="Slow first response or remote server timeout">
    对于大型本地模型、远程 LAN 主机或 tailnet 链接，请设置
    提供商范围的请求超时时间：

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            request: { allowPrivateNetwork: true },
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` 仅适用于 vLLM 模型的 HTTP 请求，包括
    连接建立、响应头、正文流传输以及整个
    guarded-fetch 中止操作。在增加
    `agents.defaults.timeoutSeconds` 之前应优先使用此设置，因为后者控制的是整个代理的运行。

  </Accordion>

  <Accordion title="Server not reachable">
    检查 vLLM 服务器是否正在运行且可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果出现连接错误，请验证主机、端口，以及 vLLM 是否以 OpenAI 兼容的服务器模式启动。
    对于明确的环回、LAN 或 Tailscale 端点，还需设置
    `models.providers.vllm.request.allowPrivateNetwork: true`；除非
    提供商被显式信任，否则提供商请求默认会阻止专用网络 URL。

  </Accordion>

  <Accordion title="请求上的身份验证错误">
    如果请求因身份验证错误而失败，请设置一个与您的服务器配置相匹配的真实 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下显式配置提供商。

    <Tip>
    如果您的 vLLM 服务器不强制执行身份验证，`VLLM_API_KEY` 的任何非空值都可以作为 OpenClaw 的选择加入信号。
    </Tip>

  </Accordion>

<Accordion title="No models discovered">自动发现需要设置 `VLLM_API_KEY`。如果您已定义 `models.providers.vllm`OpenClaw，OpenClaw 将仅使用您声明的模型，除非 `agents.defaults.models` 包含 `"vllm/*": {}`。</Accordion>

  <Accordion title="工具渲染为原始文本">
    如果 Qwen 模型输出 JSON/XML 工具语法而不是执行技能，
    请检查上文“高级配置”中的 Qwen 指南。通常的修复方法是：

    - 使用该模型正确的解析器/模板启动 vLLM
    - 使用 `openclaw models list --provider vllm` 确认确切的模型 ID
    - 添加专用的按模型 `params.extra_body.tool_choice: "required"`
      覆盖仅当 `tool_choice: "auto"` 仍然返回空或仅文本
      工具调用时

  </Accordion>
</AccordionGroup>

<Warning>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OpenAIOpenAI" href="/zh/providers/openai" icon="bolt" OpenAIOpenAI>
    原生 OpenAI 提供商和 OpenAI 兼容的路由行为。
  </Card>
  <Card title="OAuthOAuth 和 auth" href="/zh/gateway/authentication" icon="key">
    Auth 详细信息和凭据复用规则。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
