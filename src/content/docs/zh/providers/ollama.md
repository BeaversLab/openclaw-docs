---
summary: "使用 OpenClaw 运行 Ollama（云端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

# Ollama

OpenClaw 与 Ollama 的原生 API (`/api/chat`) 集成，用于托管的云端模型和本地/自托管的 Ollama 服务器。您可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机使用 `Cloud + Local`，针对 `https://ollama.com` 使用 `Cloud only`，或者针对可访问的 Ollama 主机使用 `Local only`。

<Warning>**Remote Ollama 用户**: 请勿在 OpenClaw 中使用 `/v1` OpenAI 兼容的 URL (`http://host:11434/v1`)。这会破坏工具调用，模型可能会将原始工具 JSON 输出为纯文本。请改用原生的 Ollama API URL：`baseUrl: "http://host:11434"`（不含 `/v1`）。</Warning>

## 入门指南

选择你偏好的设置方法和模式。

<Tabs>
  <Tab title="新手引导（推荐）">
    **最适合：** 快速构建可用的 Ollama 云端或本地设置。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        ```

        从提供商列表中选择 **Ollama**。
      </Step>
      <Step title="选择您的模式">
        - **Cloud + Local** — 本地 Ollama 主机加上通过该主机路由的云模型
        - **Cloud only** — 通过 `https://ollama.com` 托管的 Ollama 模型
        - **Local only** — 仅限本地模型
      </Step>
      <Step title="选择一个模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管的云默认值。`Cloud + Local` 和 `Local only` 会询问 Ollama 基础 URL，发现可用模型，并在所选本地模型尚不可用时自动拉取。`Cloud + Local` 还会检查该 Ollama 主机是否已登录以进行云访问。
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### 非交互模式

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    或者指定自定义基础 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="手动设置">
    **最适用于：** 对云端或本地设置进行完全控制。

    <Steps>
      <Step title="选择云端或本地">
        - **云端 + 本地**：安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **仅云端**：将 `https://ollama.com` 与 `OLLAMA_API_KEY` 配合使用
        - **仅本地**：从 [ollama.com/download](https://ollama.com/download) 安装 Ollama
      </Step>
      <Step title="拉取本地模型（仅限本地）">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="为 OpenClaw 启用 Ollama">
        对于 `Cloud only`，请使用您真实的 `OLLAMA_API_KEY`。对于由主机支持的设置，任何占位符值均可使用：

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="检查并设置您的模型">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        或者在配置中设置默认值：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 云端模型

<Tabs>
  <Tab title="Cloud + Local">
    `Cloud + Local` 使用一个可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 推荐的混合流程。

    在设置过程中使用 **Cloud + Local**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并检查该主机是否通过 `ollama signin` 登录以进行云访问。当主机已登录时，OpenClaw 还会建议托管的云默认模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主机尚未登录，OpenClaw 将保持设置为仅限本地，直到您运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 针对 Ollama 在 `https://ollama.com` 托管的 API 运行。

    在设置期间使用 **Cloud only**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并填充托管的云模型列表。此路径 **不** 需要本地 Ollama 服务器或 `ollama signin`。

    在 `openclaw onboard` 期间显示的云模型列表是从 `https://ollama.com/api/tags` 实时填充的，上限为 500 个条目，因此选择器反映的是当前托管的目录，而不是静态种子。如果在设置时 `ollama.com` 无法访问或未返回任何模型，OpenClaw 将回退到之前的硬编码建议，以便新手引导仍能完成。

  </Tab>

  <Tab title="仅限本地">
    在仅本地模式下，OpenClaw 从已配置的 Ollama 实例发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前建议将 `gemma4` 作为本地默认选项。

  </Tab>
</Tabs>

## 模型发现（隐式提供商）

当您设置 `OLLAMA_API_KEY`（或身份验证配置文件）且**未**定义 `models.providers.ollama` 时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例发现模型。

| 行为       | 详情                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询   | 查询 `/api/tags`                                                                                                                                                    |
| 功能检测   | 使用尽力而为的 `/api/show` 查找来读取 `contextWindow` 并检测功能（包括视觉功能）                                                                                    |
| 视觉模型   | Models with a `vision` capability reported by `/api/show` are marked as image-capable (`input: ["text", "image"]`), so OpenClaw auto-injects images into the prompt |
| 推理检测   | Marks `reasoning` with a 模型-name heuristic (`r1`, `reasoning`, `think`)                                                                                           |
| Token 限制 | Sets `maxTokens` to the default Ollama max-token cap used by OpenClaw                                                                                               |
| 成本       | Sets all costs to `0`                                                                                                                                               |

这避免了手动输入模型，同时保持目录与本地 Ollama 实例一致。

```bash
# See what models are available
ollama list
openclaw models list
```

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型将被自动发现并可供使用。

<Note>If you set `models.providers.ollama` explicitly, auto-discovery is skipped and you must define models manually. See the explicit config section below.</Note>

## Vision and image description

捆绑的 Ollama 插件将 Ollama 注册为具备图像功能的媒体理解提供商。这让 OpenClaw 可以通过本地或托管的 Ollama 视觉模型，路由显式的图像描述请求和配置的图像模型默认值。

对于本地视觉功能，请拉取一个支持图像的模型：

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

然后使用 infer CLI 进行验证：

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` 必须是完整的 `<provider/model>` 引用。当设置此项时，`openclaw infer image describe` 将直接运行该模型，而不是因为该模型支持原生视觉而跳过描述。

要将 Ollama 设为传入媒体的默认图像理解模型，请配置 `agents.defaults.imageModel`：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

如果您手动定义 `models.providers.ollama.models`，请为支持图像输入的视觉模型添加标记：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝针对未标记为具备图像功能模型的图像描述请求。使用隐式发现时，当 `/api/show` 报告视觉能力时，OpenClaw 会从 Ollama 读取此信息。

## 配置

<Tabs>
  <Tab title="Basic (implicit discovery)">
    仅启用本地功能的最简单路径是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以在提供商条目中省略 `apiKey`，OpenClaw 将会为可用性检查填充它。
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    当您需要托管云设置、Ollama 在另一主机/端口上运行、希望强制特定的上下文窗口或模型列表，或者需要完全手动的模型定义时，请使用显式配置。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab title="Custom base URL">
    如果 Ollama 运行在不同的主机或端口上（显式配置会禁用自动发现，因此请手动定义模型）：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
          },
        },
      },
    }
    ```

    <Warning>
    请勿在 URL 中添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，其中工具调用不可靠。请使用不带路径后缀的基础 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

### 模型选择

配置完成后，您所有的 Ollama 模型均可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## Ollama Web Search

OpenClaw 支持将 **Ollama Web Search** 作为内置的 `web_search` 提供商。

| 属性 | 详细信息                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------- |
| 主机 | 使用您配置的 Ollama 主机（如果设置了 `models.providers.ollama.baseUrl`，则使用该值，否则使用 `http://127.0.0.1:11434`） |
| 认证 | 无密钥                                                                                                                  |
| 要求 | Ollama 必须正在运行，并且已使用 `ollama signin` 登录                                                                    |

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Ollama Web Search**，或设置：

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

<Note>有关完整的设置和行为详细信息，请参阅 [Ollama Web Search](/zh/tools/ollama-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **工具调用在 OpenAI-compatible 模式下不可靠。** 仅当您需要代理使用 OpenAI 格式且不依赖原生工具调用行为时才使用此模式。
    </Warning>

    如果您需要改为使用 OpenAI-compatible 端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // default: true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    此模式可能无法同时支持流式传输和工具调用。您可能需要在模型配置中使用 `params: { streaming: false }` 禁用流式传输。

    当与 Ollama 一起使用 `api: "openai-completions"` 时，OpenClaw 默认注入 `options.num_ctx`，以便 Ollama 不会静默回退到 4096 上下文窗口。如果您的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="上下文窗口">
    对于自动发现的模型，如果 Ollama 报告了上下文窗口，OpenClaw 会使用该值，否则它会回退到 Ollama 使用的默认 Ollama 上下文窗口。

    您可以在显式提供商配置中覆盖 `contextWindow` 和 `maxTokens`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
              }
            ]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 默认将名称包含 `deepseek-r1`、`reasoning` 或 `think` 等的模型视为具备推理能力的模型。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    无需额外配置 —— OpenClaw 会自动将其标记。

  </Accordion>

<Accordion title="Model costs">Ollama 是免费的且在本地运行，因此所有模型成本均设置为 0 美元。这适用于自动发现和手动定义的模型。</Accordion>

  <Accordion title="Memory embeddings">
    捆绑的 Ollama 插件注册了一个内存嵌入提供商，用于
    [内存搜索](/zh/concepts/memory)。它使用配置的 Ollama 基础 URL
    和 API 密钥。

    | 属性      | 值               |
    | ------------- | ------------------- |
    | 默认模型 | `nomic-embed-text`  |
    | 自动拉取     | 是 — 如果本地不存在，嵌入模型将自动拉取 |

    要选择 Ollama 作为内存搜索嵌入提供商：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Streaming configuration">
    OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API** (`/api/chat`)，它完全支持同时进行流式传输和工具调用。无需特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 还会将思考控制直接转发给 Ollama：`/think off` 和 `openclaw agent --thinking off` 发送顶层 `think: false`，而非 `off` 思考级别则发送 `think: true`。

    <Tip>
    如果您需要使用 OpenAI 兼容端点，请参阅上面的“Legacy OpenAI-compatible mode”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="未检测到 Ollama">
    确保 Ollama 正在运行，并且您设置了 `OLLAMA_API_KEY`（或身份验证配置文件），并且您**没有**定义显式的 `models.providers.ollama` 条目：

    ```bash
    ollama serve
    ```

    验证 API 是否可访问：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="无可用模型">
    如果未列出您的模型，请在本地拉取该模型或在 `models.providers.ollama` 中显式定义它。

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="连接被拒绝">
    检查 Ollama 是否在正确的端口上运行：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="模型选择" href="/zh/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama 网络搜索" href="/zh/tools/ollama-search" icon="magnifying-glass">
    由 Ollama 驱动的网络搜索的完整设置和行为详细信息。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
