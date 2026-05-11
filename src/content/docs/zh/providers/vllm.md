---
summary: "使用 vLLM（兼容 OpenAI 的本地服务器）运行 OpenClaw"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM 可以通过兼容 **OpenAI** 的 HTTP API 提供开源（以及部分自定义）模型。OpenClaw 使用 `openai-completions` API 连接到 vLLM。

当您选择使用 `VLLM_API_KEY`（如果您的服务器不强制身份验证，则任何值均可）并且未定义显式的 `models.providers.vllm` 条目时，OpenClaw 也可以从 vLLM **自动发现** 可用的模型。

OpenClaw 将 `vllm` 视为支持流式使用计数的本地兼容 OpenAI 的提供商，因此状态/上下文 token 计数可以从
`stream_options.include_usage` 响应中更新。

| 属性         | 值                                 |
| ------------ | ---------------------------------- |
| 提供商 ID    | `vllm`                             |
| API          | `openai-completions` (兼容 OpenAI) |
| 身份验证     | `VLLM_API_KEY` 环境变量            |
| 默认基础 URL | `http://127.0.0.1:8000/v1`         |

## 入门指南

<Steps>
  <Step title="启动兼容 OpenAI 的 vLLM 服务器">
    您的基础 URL 应公开 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 通常运行在：

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="设置 API 密钥环境变量">
    如果您的服务器不强制身份验证，则任何值均可：

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
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## 模型发现（隐式提供商）

当设置了 `VLLM_API_KEY`（或存在身份验证配置文件）并且您**未**定义 `models.providers.vllm` 时，OpenClaw 将查询：

```
GET http://127.0.0.1:8000/v1/models
```

并将返回的 ID 转换为模型条目。

<Note>如果您显式设置了 `models.providers.vllm`，则跳过自动发现，您必须手动定义模型。</Note>

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

## 高级配置

<AccordionGroup>
  <Accordion title="代理式行为">
    vLLM 被视为代理式的 OpenAI 兼容 `/v1` 后端，而不是原生的
    OpenAI 端点。这意味着：

    | 行为 | 是否应用? |
    |----------|----------|
    | 原生 OpenAI 请求塑形 | 否 |
    | `service_tier` | 不发送 |
    | 响应 `store` | 不发送 |
    | 提示词缓存提示 | 不发送 |
    | OpenAI 推理兼容负载塑形 | 不应用 |
    | 隐藏的 OpenClaw 归因标头 | 不在自定义基础 URL 上注入 |

  </Accordion>

  <Accordion title="Qwen thinking controls">
    对于通过 vLLM 提供的 Qwen 模型，当服务器期望
    Qwen 聊天模板 kwargs 时，请在模型条目上设置
    `params.qwenThinkingFormat: "chat-template"`。OpenClaw 会将 `/think off` 映射为：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    非 `off` 思考级别会发送 `enable_thinking: true`。如果您的端点期望
    DashScope 风格的顶级标志，请改用 `params.qwenThinkingFormat: "top-level"` 在请求根目录
    发送 `enable_thinking`。Snake_case 格式的 `params.qwen_thinking_format` 也是可接受的。

  </Accordion>

  <Accordion title="Nemotron 3 thinking controls">
    vLLM/Nemotron 3 可以使用聊天模板 kwargs 来控制推理结果是
    作为隐藏推理返回还是作为可见的答案文本返回。当 OpenClaw 会话
    使用 `vllm/nemotron-3-*` 且关闭思考功能时，捆绑的 vLLM 插件会发送：

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    要自定义这些值，请在模型参数下设置 `chat_template_kwargs`。
    如果您还设置了 `params.extra_body.chat_template_kwargs`，该值将具有最终优先级，
    因为 `extra_body` 是最后的请求正文覆盖。

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

  <Accordion title="Qwen 工具调用显示为文本">
    首先确保 vLLM 启动时使用了针对该模型的正确工具调用解析器和聊天模板。例如，vLLM 文档中针对 Qwen2.5 模型记录了 `hermes`，针对 Qwen3-Coder 模型记录了 `qwen3_xml`。

    症状：

    - 技能或工具从未运行
    - 助手打印原始 JSON/XML，例如 `{"name":"read","arguments":...}`
    - 当 OpenClaw 发送 `tool_choice: "auto"` 时，vLLM 返回空的 `tool_calls` 数组

    某些 Qwen/vLLM 组合仅在使用 `tool_choice: "required"` 时才返回结构化工具调用。对于这些模型条目，请使用 `params.extra_body` 强制设置 OpenAI 兼容的请求字段：

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
    ```

    您也可以从 CLI 应用相同的覆盖：

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    这是一个选择性启用的兼容性变通方案。它使每个使用工具的模型轮次都需要一个工具调用，因此仅将该设置用于行为可接受的专用本地模型条目。不要将其用作所有 vLLM 模型的全局默认值，也不要使用盲目地将任意助手文本转换为可执行工具调用的代理。

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
  <Accordion title="首次响应缓慢或远程服务器超时">
    对于大型本地模型、远程 LAN 主机或 tailnet 链接，请设置一个提供商范围的请求超时：

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

    `timeoutSeconds` 仅适用于 vLLM 模型 HTTP 请求，包括连接设置、响应头、主体流传输以及整个受保护获取的终止操作。在增加 `agents.defaults.timeoutSeconds`（控制整个代理运行）之前，请优先使用此设置。

  </Accordion>

  <Accordion title="无法连接到服务器">
    检查 vLLM 服务器是否正在运行且可访问：

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    如果看到连接错误，请验证主机、端口以及 vLLM 是否以 OpenAI 兼容的服务器模式启动。
    对于显式的环回、局域网或 Tailscale 端点，还需设置
    `models.providers.vllm.request.allowPrivateNetwork: true`；提供商
    请求默认会阻止私有网络 URL，除非该提供商被
    显式信任。

  </Accordion>

  <Accordion title="请求出现认证错误">
    如果请求因认证错误而失败，请设置一个与服务器配置相匹配的真实 `VLLM_API_KEY`，或在 `models.providers.vllm` 下显式配置提供商。

    <Tip>
    如果您的 vLLM 服务器不强制执行认证，`VLLM_API_KEY` 的任何非空值均可作为 OpenClaw 的选择加入信号。
    </Tip>

  </Accordion>

<Accordion title="未发现模型">自动发现需要设置 `VLLM_API_KEY` 并且没有显式的 `models.providers.vllm` 配置条目。如果您已手动定义提供商，OpenClaw 将跳过发现并仅使用您声明的模型。</Accordion>

  <Accordion title="工具呈现为原始文本">
    如果 Qwen 模型打印 JSON/XML 工具语法而不是执行技能，
    请检查上文高级配置中的 Qwen 指南。通常的修复方法是：

    - 使用适用于该模型的正确解析器/模板启动 vLLM
    - 使用 `openclaw models list --provider vllm` 确认确切的模型 ID
    - 添加专用的每个模型 `params.extra_body.tool_choice: "required"`
      覆盖，仅当 `tool_choice: "auto"` 仍返回空或仅文本
      工具调用时

  </Accordion>
</AccordionGroup>

<Warning>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OpenAI" href="/zh/providers/openai" icon="bolt">
    原生 OpenAI 提供商和 OpenAI 兼容路由行为。
  </Card>
  <Card title="OAuth and auth" href="/zh/gateway/authentication" icon="key">
    认证详细信息和凭据重用规则。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
