---
summary: "使用 Ollama 运行 OpenClaw（云端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

OpenClaw 集成了 Ollama 的原生 API (`/api/chat`)，用于托管的云端模型和本地/自托管的 Ollama 服务器。你可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机进行 `Cloud + Local`，针对 `https://ollama.com` 进行 `Cloud only`，或针对可访问的 Ollama 主机进行 `Local only`。

<Warning>**远程 Ollama 用户**：不要将 `/v1` OpenAI 兼容的 URL (`http://host:11434/v1`) 与 OpenClaw 配合使用。这会破坏工具调用，模型可能会输出原始的工具 JSON 作为纯文本。请改用原生的 Ollama API URL：`baseUrl: "http://host:11434"`（不要 `/v1`）。</Warning>

## 入门指南

选择你偏好的设置方法和模式。

<Tabs>
  <Tab title="新手引导（推荐）">
    **最适合：** 快速搭建可用的 Ollama 云端或本地环境。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        ```

        从提供商列表中选择 **Ollama**。
      </Step>
      <Step title="选择您的模式">
        - **Cloud + Local** — 本地 Ollama 主机加上通过该主机路由的云端模型
        - **Cloud only** — 通过 `https://ollama.com` 托管的 Ollama 模型
        - **Local only** — 仅限本地模型
      </Step>
      <Step title="选择一个模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管的云端默认值。`Cloud + Local` 和 `Local only` 会询问 Ollama 基础 URL，发现可用模型，并在所选本地模型尚未可用时自动拉取。`Cloud + Local` 还会检查该 Ollama 主机是否已登录以进行云端访问。
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

  <Tab title="Manual setup">
    **最适合：** 完全控制云端或本地设置。

    <Steps>
      <Step title="Choose cloud or local">
        - **Cloud + Local**：安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **Cloud only**：将 `https://ollama.com` 与 `OLLAMA_API_KEY` 结合使用
        - **Local only**：从 [ollama.com/download](https://ollama.com/download) 安装 Ollama
      </Step>
      <Step title="Pull a local 模型 (local only)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="Enable Ollama for OpenClaw">
        对于 `Cloud only`，请使用您的真实 `OLLAMA_API_KEY`。对于由主机支持的后端设置，任何占位符值均可使用：

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspect and set your 模型">
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
    `Cloud + Local` 使用可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 首选的混合流程。

    在设置过程中使用 **Cloud + Local**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并检查该主机是否已使用 `ollama signin` 登录以进行云端访问。当主机已登录时，OpenClaw 还会建议托管的云端默认模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主机尚未登录，OpenClaw 将保持设置为仅限本地，直到您运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 针对位于 `https://ollama.com` 的 Ollama 托管 API 运行。

    在设置期间使用 **Cloud only**（仅限云端）。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并填充托管云模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

  </Tab>

  <Tab title="Local only">
    在仅限本地模式下，OpenClaw 从已配置的 Ollama 实例发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前建议将 `gemma4` 作为本地默认值。

  </Tab>
</Tabs>

## 模型发现（隐式提供商）

当您设置 `OLLAMA_API_KEY`（或认证配置文件）并且**未**定义 `models.providers.ollama` 时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例发现模型。

| 行为       | 详情                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询   | 查询 `/api/tags`                                                                                                                          |
| 功能检测   | 使用尽力而为的 `/api/show` 查询来读取 `contextWindow` 并检测功能（包括视觉功能）                                                          |
| 视觉模型   | 被 `/api/show` 报告具有 `vision` 功能的模型被标记为具备图像处理能力（`input: ["text", "image"]`），因此 OpenClaw 会自动将图像注入到提示中 |
| 推理检测   | 使用模型名称启发法标记 `reasoning`（`r1`、`reasoning`、`think`）                                                                          |
| Token 限制 | 将 `maxTokens` 设置为 OpenClaw 使用的默认 Ollama 最大 Token 上限                                                                          |
| 成本       | 将所有成本设置为 `0`                                                                                                                      |

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

<Note>如果您明确设置了 `models.providers.ollama`，则会跳过自动发现，您必须手动定义模型。请参阅下面的显式配置部分。</Note>

## 配置

<Tabs>
  <Tab title="Basic (implicit discovery)">
    仅通过环境变量启用本地功能的最简单路径是：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以在提供商条目中省略 `apiKey`，OpenClaw 将自动填充它以进行可用性检查。
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    当您想要托管云设置、Ollama 运行在其他主机/端口上、想要强制特定的上下文窗口或模型列表，或者想要完全手动定义模型时，请使用显式配置。

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
    请不要在 URL 中添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，其中工具调用不可靠。请使用不带路径后缀的基本 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

### 模型选择

配置完成后，您的所有 Ollama 模型均可用：

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

## Ollama 网络搜索

OpenClaw 支持将 **Ollama 网络搜索**作为内置的 `web_search` 提供商。

| 属性     | 详情                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| 主机     | 使用您配置的 Ollama 主机（如果设置了则使用 `models.providers.ollama.baseUrl`，否则使用 `http://127.0.0.1:11434`） |
| 身份验证 | 免密钥                                                                                                            |
| 要求     | Ollama 必须正在运行并已使用 `ollama signin` 登录                                                                  |

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Ollama 网络搜索**，或设置：

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

<Note>有关完整的设置和行为详细信息，请参阅 [Ollama 网络搜索](/en/tools/ollama-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **OpenAI 兼容模式下的工具调用不可靠。** 仅当您需要代理使用 OpenAI 格式且不依赖原生工具调用行为时，才使用此模式。
    </Warning>

    如果您需要改用 OpenAI 兼容端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

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

    当将 `api: "openai-completions"` 与 Ollama 结合使用时，OpenClaw 默认会注入 `options.num_ctx`，以防止 Ollama 默默回退到 4096 的上下文窗口。如果您的代理或上游拒绝未知的 `options` 字段，请禁用此行为：

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

  <Accordion title="Context windows">
    对于自动发现的模型，OpenClaw 会使用 Ollama 报告的上下文窗口（如果可用），否则将回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

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

  <Accordion title="Reasoning models">
    OpenClaw 默认将名称为 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力的模型。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    无需额外配置——OpenClaw 会自动标记它们。

  </Accordion>

<Accordion title="Model costs">Ollama 是免费的并且在本地运行，因此所有模型成本均设置为 $0。这适用于自动发现和手动定义的模型。</Accordion>

  <Accordion title="Memory embeddings">
    附带的 Ollama 插件为
    [memory search](/en/concepts/memory) 注册了一个内存嵌入提供商。它使用配置的 Ollama 基础 URL
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

    <Tip>
    如果您需要使用 OpenAI 兼容端点，请参阅上面的“旧版 OpenAI 兼容模式”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="Ollama not detected">
    确保 Ollama 正在运行，并且您设置了 `OLLAMA_API_KEY`（或身份验证配置文件），并且您**没有**定义显式的 `models.providers.ollama` 条目：

    ```bash
    ollama serve
    ```

    验证 API 是否可访问：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="No models available">
    如果未列出您的模型，请在本地拉取该模型或在 `models.providers.ollama` 中显式定义它。

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="Connection refused">
    检查 Ollama 是否在正确的端口上运行：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>更多帮助：[故障排除](/en/help/troubleshooting) 和 [常见问题](/en/help/faq)。</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/en/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="模型选择" href="/en/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama 网络搜索" href="/en/tools/ollama-search" icon="magnifying-glass">
    基于 Ollama 的网络搜索的完整设置和行为详细信息。
  </Card>
  <Card title="配置" href="/en/gateway/configuration" icon="gear">
    完整的配置参考。
  </Card>
</CardGroup>
