---
summary: "OpenClawOllama使用 Ollama 运行 OpenClaw（云模型和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "OllamaOllama"
---

OpenClaw 与 Ollama 的原生 API (OpenClawOllamaAPI`/api/chat`OllamaOllama) 集成，用于托管云模型和本地/自托管 Ollama 服务器。您可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机进行 `Cloud + Local`Ollama，针对 `https://ollama.com` 进行 `Cloud only`，或针对可访问的 Ollama 主机进行 `Local only`Ollama。

<Warning>**远程 Ollama 用户**：请勿将 Ollama`/v1`OpenAI OpenAI 兼容 URL (`http://host:11434/v1`OpenClawOllamaAPI) 与 OpenClaw 一起使用。这会破坏工具调用，模型可能会将原始工具 JSON 作为纯文本输出。请改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（无 `/v1`）。</Warning>

Ollama 提供商配置使用 Ollama`baseUrl`OpenClaw 作为规范键。OpenClaw 也接受 `baseURL`OpenAI 以兼容 OpenAI SDK 风格的示例，但新配置应首选 `baseUrl`。

## 身份验证规则

<AccordionGroup>
  <Accordion title="Local and LAN hosts"OllamaOpenClaw>
    本地和局域网 Ollama 主机不需要真正的不记名令牌。OpenClaw 仅对环回、专用网络、`.local`Ollama 和裸主机名 Ollama 基础 URL 使用本地 `ollama-local` 标记。
  </Accordion>
  <Accordion title="Ollama远程和 Ollama Cloud 主机"Ollama>
    远程公共主机和 Ollama Cloud（`https://ollama.com`）需要通过 `OLLAMA_API_KEY`、身份验证配置文件或提供商的 `apiKey` 提供真实的凭证。
  </Accordion>
  <Accordion title="自定义提供商 ID">
    设置了 `api: "ollama"` 的自定义提供商 ID 遵循相同的规则。例如，指向私有局域网 Ollama 主机的 `ollama-remote`Ollama 提供商可以使用 `apiKey: "ollama-local"`Ollama，子代理将通过 Ollama 提供商钩子来解析该标记，而不是将其视为缺失的凭证。内存搜索也可以将 `agents.defaults.memorySearch.provider`Ollama 设置为该自定义提供商 ID，以便嵌入使用匹配的 Ollama 端点。
  </Accordion>
  <Accordion title="身份验证配置文件">
    `auth-profiles.json` 存储提供商 ID 的凭证。请将端点设置（`baseUrl`、`api`、模型 ID、标头、超时）放在 `models.providers.<id>` 中。较旧的平面身份验证配置文件（如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）并非运行时格式；请运行 `openclaw doctor --fix` 将其重写为规范的 `ollama-windows:default`API API 密钥配置文件并保留备份。该文件中的 `baseUrl` 是兼容性干扰信息，应移动到提供商配置中。
  </Accordion>
  <Accordion title="Memory embedding scope">
    当 Ollama 用于内存嵌入时，不记名认证 (bearer auth) 的范围限定在声明它的主机：

    - 提供商级别的密钥仅发送给该提供商的 Ollama 主机。
    - `agents.*.memorySearch.remote.apiKey` 仅发送给其远程嵌入主机。
    - 纯 `OLLAMA_API_KEY` 环境值被视为 Ollama Cloud 约定，默认不会发送到本地或自托管主机。

  </Accordion>
</AccordionGroup>

## 入门指南

选择您偏好的设置方法和模式。

<Tabs>
  <Tab title="新手引导（推荐）"Ollama>
    **适用于：** 最快搭建可用的 Ollama 云端或本地环境。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        ```Ollama

        从提供商列表中选择 **Ollama**。
      </Step>
      <Step title="选择您的模式"OllamaOllama>
        - **Cloud + Local** — 本地 Ollama 主机加上通过该主机路由的云模型
        - **Cloud only** — 通过 `https://ollama.com` 托管的 Ollama 模型
        - **Local only** — 仅限本地模型

      </Step>
      <Step title="选择模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管的云默认值。`Cloud + Local` 和 `Local only`OllamaOllama 会询问 Ollama 基础 URL，发现可用模型，并在所选本地模型尚未可用时自动拉取。当 Ollama 报告已安装的 `:latest` 标签（例如 `gemma4:latest`）时，设置会显示该已安装模型一次，而不是同时显示 `gemma4` 和 `gemma4:latest` 或再次拉取裸别名。`Cloud + Local`Ollama 还会检查该 Ollama 主机是否已登录以进行云访问。
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

    可选指定自定义基础 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="Manual setup">
    **Best for:** 完全控制云端或本地设置。

    <Steps>
      <Step title="Choose cloud or local"Ollama>
        - **Cloud + Local**: 安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **Cloud only**: 将 `https://ollama.com` 与 `OLLAMA_API_KEY`Ollama 结合使用
        - **Local only**: 从 [ollama.com/download](https://ollama.com/download) 安装 Ollama

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
      <Step title="OllamaOpenClawEnable Ollama for OpenClaw">
        对于 `Cloud only`，请使用您真实的 `OLLAMA_API_KEY`。对于基于主机的设置，任何占位符值均可使用：

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

        或在配置中设置默认值：

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
    `Cloud + Local`OllamaOllamaOpenClawOllama 使用可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 首选的混合流程。

    在设置过程中使用 **云端 + 本地**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并检查该主机是否已使用 `ollama signin`OpenClaw 登录以进行云端访问。当主机已登录时，OpenClaw 还会建议托管的云端默认模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`OpenClaw。

    如果主机尚未登录，OpenClaw 会将设置保持为仅本地模式，直到您运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 针对 OllamaAPI 托管的 API（位于 `https://ollama.com`）运行。

    设置期间请使用 **Cloud only**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并初始化托管云模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

    `openclaw onboard` 期间显示的云模型列表是从 `https://ollama.com/api/tags` 实时填充的，上限为 500 个条目，因此选择器反映的是当前托管的目录，而不是静态种子。如果在设置时 `ollama.com` 无法访问或未返回模型，OpenClaw 将回退到以前的硬编码建议，以便新手引导仍能完成。

  </Tab>

  <Tab title="Local only">
    在仅本地模式下，OpenClaw 从配置的 Ollama 实例中发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前建议将 `gemma4` 作为本地默认值。

  </Tab>
</Tabs>

## 模型发现（隐式提供商）

当您设置 `OLLAMA_API_KEY`（或身份验证配置文件）并且**未**定义 `models.providers.ollama` 或使用 `api: "ollama"` 定义其他自定义远程提供商时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例中发现模型。

| 行为       | 详情                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询   | 查询 `/api/tags`                                                                                                                              |
| 功能检测   | 使用尽力而为的 `/api/show` 查询来读取 `contextWindow`、扩展的 `num_ctx` Modelfile 参数，以及包括视觉/工具在内的功能                           |
| 视觉模型   | 由 `/api/show` 报告具有 `vision` 能力的模型会被标记为具备图像处理能力（`input: ["text", "image"]`），因此 OpenClaw 会自动将图像注入到提示词中 |
| 推理检测   | 在可用时使用 `/api/show` 的能力，包括 `thinking`；当 Ollama 省略能力信息时，回退到模型名称启发式规则（`r1`、`reasoning`、`think`）            |
| Token 限制 | 将 `maxTokens` 设置为 Ollama 使用的默认 OpenClaw 最大 token 上限                                                                              |
| 成本       | 将所有成本设置为 `0`                                                                                                                          |

这避免了手动输入模型，同时保持目录与本地 Ollama 实例同步。你可以在本地 `infer model run` 中使用完整引用，例如 `ollama/<pulled-model>:latest`；OpenClaw 会从 Ollama 的实时目录中解析该已安装的模型，而无需手写 `models.json` 条目。

对于已登录的 Ollama 主机，某些 `:cloud` 模型在出现在 `/api/tags` 中之前，可能可以通过 `/api/chat`
和 `/api/show` 使用。当你显式选择完整的
`ollama/<model>:cloud` 引用时，OpenClaw 会使用 `/api/show` 验证该确切缺失的模型，
并且仅当 Ollama 确认模型元数据时才将其添加到运行时目录中。拼写错误仍会作为未知模型失败，而不会被自动创建。

```bash
# See what models are available
ollama list
openclaw models list
```

为了避免完整的 agent 工具表面，进行狭义的文本生成冒烟测试，
请在本地 `infer model run` 中使用完整的 Ollama 模型引用：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

该路径仍然使用 OpenClaw 配置的提供商、身份验证和原生 Ollama 传输，但它不会启动聊天代理回合或加载 MCP/工具上下文。如果此操作成功而正常代理回复失败，请接着排查该模型的代理提示词/工具容量。

若要在同一条精简路径上进行窄范围的视觉模型冒烟测试，请将一个或多个图像文件添加到 `infer model run`。这会将提示词和图像直接发送到选定的 Ollama 视觉模型，而无需加载聊天工具、记忆或先前的会话上下文：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受被检测为 `image/*` 的文件，包括常见的 PNG、JPEG 和 WebP 输入。非图像文件会在调用 Ollama 之前被拒绝。对于语音识别，请改用 `openclaw infer audio transcribe`。

当您使用 `/model ollama/<model>` 切换对话时，OpenClaw 会将其视为精确的用户选择。如果配置的 Ollama `baseUrl` 无法访问，下一次回复将因提供商错误而失败，而不是静默地从其他配置的回退模型进行回答。

隔离的 cron 作业在启动代理回合之前会进行一次额外的本地安全检查。如果选定的模型解析为本地、专用网络或 `.local` Ollama 提供商，且 `/api/tags` 无法访问，OpenClaw 会将该 cron 运行记录为 `skipped`，并在错误文本中包含选定的 `ollama/<model>`。端点预检会缓存 5 分钟，因此多个指向同一已停止 Ollama 守护进程的 cron 作业不会全部发起失败的模型请求。

针对本地 Ollama 实时验证本地文本路径、原生流路径和嵌入功能，请使用：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型将被自动发现并可供使用。

<Note>如果您显式设置了 `models.providers.ollama`，或者配置了带有 `api: "ollama"` 的自定义远程提供商（例如 `models.providers.ollama-cloud`），则将跳过自动发现，您必须手动定义模型。诸如 `http://127.0.0.2:11434` 之类的环回自定义提供商仍被视为本地。请参阅下面的显式配置部分。</Note>

## 视觉和图像描述

捆绑的 Ollama 插件将 Ollama 注册为具有图像功能的媒体理解提供商。这使得 OpenClaw 可以通过本地或托管的 Ollama 视觉模型路由显式的图像描述请求和配置的图像模型默认值。

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

`--model` 必须是完整的 `<provider/model>` 引用。当设置此项时，由于该模型支持原生视觉，`openclaw infer image describe` 将直接运行该模型，而不是跳过描述。

当您想要 OpenClaw 的图像理解提供商流程、配置的 `agents.defaults.imageModel` 和图像描述输出形状时，请使用 `infer image describe`。当您想要使用自定义提示和一个或多个图像进行原始多模态模型探测时，请使用 `infer model run --file`。

要使 Ollama 成为传入媒体的默认图像理解模型，请配置 `agents.defaults.imageModel`：

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

首选完整的 `ollama/<model>` 引用。如果同一模型在 `models.providers.ollama.models` 下以 `input: ["text", "image"]` 列出，并且没有其他配置的图像提供商暴露该裸模型 ID，那么 OpenClaw 还会将诸如 `qwen2.5vl:7b` 之类的裸 `imageModel` 引用规范化为 `ollama/qwen2.5vl:7b`。如果多个配置的图像提供商具有相同的裸 ID，请显式使用提供商前缀。

本地视觉模型较慢时，可能需要比云模型更长的图像理解超时时间。在受限硬件上，当 Ollama 尝试分配全部 advertised 视觉上下文时，它们也可能崩溃或停止。当您只需要常规的图像描述回合时，请在模型条目中设置功能超时时间，并限制 Ollama`num_ctx`：

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

此超时时间适用于传入的图像理解和代理在回合期间可以调用的显式 `image` 工具。提供商级别的 `models.providers.ollama.timeoutSeconds`Ollama 仍然控制常规模型调用的底层 Ollama HTTP 请求守卫。

使用以下命令针对本地 Ollama 实时验证显式图像工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手动定义 `models.providers.ollama.models`，请将支持图像输入的视觉模型标记出来：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

对于未标记为具备图像能力的模型，OpenClaw 会拒绝其图像描述请求。使用隐式发现时，当 OpenClawOpenClawOllama`/api/show` 报告视觉能力时，OpenClaw 会从 Ollama 读取此信息。

## 配置

<Tabs>
  <Tab title="基础（隐式发现）">
    最简单的纯本地启用路径是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以在提供商条目中省略 `apiKey`OpenClaw，OpenClaw 将填充它以进行可用性检查。
    </Tip>

  </Tab>

  <Tab title="显式（手动模型）"Ollama>
    当您需要托管云设置、Ollama 在另一个主机/端口上运行、您想要强制特定的上下文窗口或模型列表，或者您想要完全手动的模型定义时，请使用显式配置。

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

  <Tab title="自定义基础 URL">
    如果 Ollama 运行在不同的主机或端口上（显式配置会禁用自动发现，因此请手动定义模型）：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
            timeoutSeconds: 300, // Optional: give cold local models longer to connect and stream
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // Optional: keep the model loaded between turns
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    请勿在 URL 中添加 `/v1`。`/v1` 路径使用的是 OpenAI 兼容模式，其中工具调用不可靠。请使用不带路径后缀的基础 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

## 常用配置示例

将这些作为起点，并将模型 ID 替换为 `ollama list` 或 `openclaw models list --provider ollama` 中的确切名称。

<AccordionGroup>
  <Accordion title="本地模型与自动发现">
    当 Ollama 与 Gateway(网关) 运行在同一台机器上，并且您希望 OpenClaw 自动发现已安装的模型时，请使用此方式。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此路径可将配置保持在最低限度。除非您想手动定义模型，否则请勿添加 `models.providers.ollama` 块。

  </Accordion>

  <Accordion title="带有手动模型的局域网 Ollama 主机">
    对局域网主机使用原生的 Ollama URL。请勿添加 `/v1`。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` 是 OpenClaw 端的上下文预算。`params.num_ctx` 会被发送给 Ollama 用于请求。当您的硬件无法运行模型所宣称的完整上下文时，请保持两者一致。

  </Accordion>

  <Accordion title="仅限 Ollama 云">
    当您不运行本地守护进程并希望直接使用托管的 Ollama 模型时，请使用此方式。

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

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
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="通过已登录守护进程连接云端和本地">
    当本地或局域网 Ollama 守护进程使用 `ollama signin` 登录，且应同时提供本地模型和 `:cloud` 模型时使用此选项。

    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="多个 Ollama 主机">
    当您拥有多个 Ollama 服务器时，请使用自定义提供商 ID。每个提供商都有自己的主机、模型、身份验证、超时和模型引用。

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    当 OpenClaw 发送请求时，活动的提供商前缀会被剥离，因此 `ollama-large/qwen3.5:27b` 会以 `qwen3.5:27b` 的形式到达 Ollama。

  </Accordion>

  <Accordion title="精简本地模型配置">
    某些本地模型可以回答简单的提示词，但在处理完整的代理工具界面时会遇到困难。首先尝试限制工具和上下文，然后再更改全局运行时设置。

    ```json5
    {
      agents: {
        list: [
          {
            id: "local",
            experimental: {
              localModelLean: true,
            },
            model: { primary: "ollama/gemma4" },
          },
        ],
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    仅当模型或服务器在工具架构上可靠地失败时，才使用 `compat.supportsTools: false`。它以牺牲代理能力为代价换取稳定性。
    `localModelLean` 会从代理界面中移除浏览器、cron 和消息工具，但它不会更改 Ollama 的运行时上下文或思考模式。对于存在循环或将响应预算用于隐藏推理的小型 Qwen 风格思考模型，请将其与显式的 `params.num_ctx` 和 `params.thinking: false` 搭配使用。

  </Accordion>
</AccordionGroup>

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

还支持自定义 Ollama 提供商 ID。当模型引用使用活动提供商前缀（例如 `ollama-spark/qwen3:32b`）时，OpenClaw 会在调用 Ollama 之前仅剥离该前缀，以便服务器接收 `qwen3:32b`。

对于缓慢的本地模型，在增加整个代理运行时超时之前，请优先考虑提供商范围的请求调整：

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` 适用于模型 HTTP 请求，包括连接设置、标头、主体流传输以及受保护的获取中止。`params.keep_alive` 作为顶级 `keep_alive` 被转发到 Ollama 的原生 `/api/chat` 请求中；当首轮加载时间是瓶颈时，请针对每个模型进行设置。

### 快速验证

```bash
# Ollama daemon visible to this machine
curl http://127.0.0.1:11434/api/tags

# OpenClaw catalog and selected model
openclaw models list --provider ollama
openclaw models status

# Direct model smoke
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 中使用的主机。如果 `curl` 可用但 OpenClaw 不可用，请检查 Gateway(网关) 是否运行在不同的机器、容器或服务帐户上。

## Ollama Web Search

OpenClaw 将 **Ollama Web Search** 作为捆绑的 `web_search` 提供商提供支持。

| 属性     | 详细信息                                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主机     | 使用您配置的 Ollama 主机（如果设置了则使用 `models.providers.ollama.baseUrl`，否则使用 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用托管的 API |
| 身份验证 | 对于已登录的本地 Ollama 主机无需密钥；对于直接 `https://ollama.com` 搜索或受身份验证保护的主机，使用 `OLLAMA_API_KEY` 或配置的提供商身份验证               |
| 要求     | 本地/自托管主机必须正在运行并已使用 `ollama signin` 登录；直接托管搜索需要 `baseUrl: "https://ollama.com"` 以及真实的 Ollama API 密钥                      |

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Ollama Web Search**，或进行设置：

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

对于通过 Ollama Cloud 进行的直接托管搜索：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

对于已登录的本地守护进程，OpenClaw 使用守护进程的 `/api/experimental/web_search` 代理。对于 `https://ollama.com`，它直接调用托管的 `/api/web_search` 端点。

<Note>有关完整的设置和行为详细信息，请参阅 [Ollama Web Search](Ollama/en/tools/ollama-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="OpenAILegacy OpenAI-compatible mode"OpenAIOpenAIOpenAIOpenAI>
    <Warning>
    **在 OpenAI 兼容模式下，工具调用不可靠。** 仅当您需要代理使用 OpenAI 格式且不依赖原生工具调用行为时，才使用此模式。
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

    当 `api: "openai-completions"`OllamaOpenClaw 与 Ollama 一起使用时，OpenClaw 默认会注入 `options.num_ctx`Ollama，以防止 Ollama 默默回退到 4096 的上下文窗口。如果您的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

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

  <Accordion title="上下文窗口"OpenClawOllama>
    对于自动发现的模型，OpenClaw 会尽可能使用 Ollama 报告的上下文窗口，包括来自自定义 Modelfile 的较大 `PARAMETER num_ctx`OllamaOpenClaw 值。否则，它将回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    您可以为该 Ollama 提供商下的每个模型设置提供商级别的 `contextWindow`、`contextTokens` 和 `maxTokens`Ollama 默认值，然后根据需要针对每个模型进行覆盖。`contextWindow`OpenClawOllama 是 OpenClaw 的提示和压缩预算。原生 Ollama 请求除非您明确配置 `params.num_ctx`Ollama，否则会将 `options.num_ctx` 保持未设置状态，以便 Ollama 可以应用其自己的模型、`OLLAMA_CONTEXT_LENGTH`Ollama 或基于 VRAM 的默认值。要在不重建 Modelfile 的情况下限制或强制 Ollama 的每次请求运行时上下文，请设置 `params.num_ctx`；无效、零、负和非有限值将被忽略。如果您升级了仅使用 `contextWindow` 或 `maxTokens`Ollama 来强制原生 Ollama 请求上下文的旧配置，请运行 `openclaw doctor --fix`，将这些明确的提供商或模型预算复制到 `params.num_ctx`OpenAIOllama 中。OpenAI 兼容的 Ollama 适配器默认仍然会根据配置的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒绝 `options`OllamaOllama，请使用 `injectNumCtxForOpenAICompat: false` 禁用该功能。

    原生 Ollama 模型条目还接受 `params` 下的常见 Ollama 运行时选项，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`OpenClawOllamaOpenClaw。OpenClaw 仅转发 Ollama 请求键，因此 OpenClaw 运行时参数（如 `streaming`Ollama）不会泄露给 Ollama。使用 `params.think` 或 `params.thinking`Ollama 发送顶级 Ollama `think`；`false`APIQwen 会禁用 Qwen 风格思考模型的 API 级思考。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    每个模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也可以工作。如果两者都配置了，则明确的提供商模型条目优先于代理默认值。

  </Accordion>

  <Accordion title="思维控制"OllamaOpenClawOllama>
    对于原生 Ollama 模型，OpenClaw 会按照 Ollama 期望的方式转发思维控制：顶层 `think`，而不是 `options.think`。如果自动发现的模型其 `/api/show` 响应包含 `thinking` 功能，则会暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思维模型仅暴露 `/think off`。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    您也可以设置模型默认值：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    针对特定模型的 `params.think` 或 `params.thinking`OllamaAPIOpenClaw 可以禁用或强制特定已配置模型的 Ollama API 思维功能。当当前运行仅具有隐式默认值 `off` 时，OpenClaw 会保留这些显式模型参数；诸如 `/think medium` 之类的非关闭运行时命令仍会覆盖当前运行。

  </Accordion>

  <Accordion title="推理模型"OpenClaw>
    OpenClaw 默认将名称中包含 `deepseek-r1`、`reasoning` 或 `think` 等的模型视为具备推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```OpenClaw

    无需额外配置。OpenClaw 会自动标记它们。

  </Accordion>

<Accordion title="模型成本" Ollama>
  Ollama 是免费且在本地运行的，因此所有模型成本均设置为 $0。这适用于自动发现和手动定义的模型。
</Accordion>

  <Accordion title="Memory embeddings">
    捆绑的 Ollama 插件注册了一个用于
    [memory search](/en/concepts/memory) 的内存嵌入提供商。它使用配置的 Ollama 基础 URL
    和 API 密钥，调用 Ollama 当前的 `/api/embed` 端点，并尽可能
    将多个内存块批处理为一个 `input` 请求。

    当 `proxy.enabled=true` 时，发往从配置的 `baseUrl` 派生的
    精确主机本地环回源的 Ollama 内存嵌入请求使用
    OpenClaw 的受保护直接路径，而不是托管转发代理。
    配置的主机名本身必须是 `localhost` 或环回 IP 字面量；
    仅解析为环回的 DNS 名称仍使用托管代理路径。
    LAN、tailnet、专用网络和公共 Ollama 主机也保持在
    托管代理路径上。重定向到另一个主机或端口不会继承信任。
    操作员仍可以设置全局 `proxy.loopbackMode: "proxy"` 设置
    以通过代理发送环回流量，或设置 `proxy.loopbackMode: "block"`
    以在打开连接之前拒绝环回连接；有关
    此设置的进程范围效果，请参阅
    [Managed proxy](/en/security/network-proxy#gateway-loopback-mode)。

    | Property      | Value               |
    | ------------- | ------------------- |
    | Default 模型 | `nomic-embed-text`  |
    | Auto-pull     | Yes — the embedding 模型 is pulled automatically if not present locally |

    查询时嵌入使用检索前缀针对需要或推荐它们的模型，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。内存文档批次保持原始状态，因此现有索引不需要格式迁移。

    要选择 Ollama 作为内存搜索嵌入提供商：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              // Default for Ollama. Raise on larger hosts if reindexing is too slow.
              nonBatchConcurrency: 1,
            },
          },
        },
      },
    }
    ```

    对于远程嵌入主机，请将身份验证范围限制在该主机：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            model: "nomic-embed-text",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              apiKey: "ollama-local",
              nonBatchConcurrency: 2,
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式传输配置">
    OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API** (`/api/chat`)，它同时完全支持流式传输和工具调用。无需特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 还会直接将思考控制权转发给 Ollama：除非配置了显式的模型 `params.think`/`params.thinking` 值，否则 `/think off` 和 `openclaw agent --thinking off` 会发送顶级 `think: false`；而 `/think low|medium|high` 会发送匹配的顶级 `think` 努力程度字符串。`/think max` 映射到 Ollama 最高的原生努力程度，即 `think: "high"`。

    <Tip>
    如果您需要使用 OpenAI 兼容的端点，请参阅上面的“Legacy OpenAI-compatible mode”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="WSL2WSL2 崩溃循环（重复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 上，官方 Ollama Linux 安装程序会创建一个带有 `Restart=always` 的 `ollama.service` systemd 单元。如果该服务在 WSL2 启动期间自动启动并加载了 GPU 支持的模型，Ollama 可能会在加载模型时锁定主机内存。Hyper-V 内存回收机制并不总是能回收这些被锁定的页面，因此 Windows 可能会终止 WSL2 虚拟机，systemd 随后再次启动 Ollama，如此循环往复。

    常见迹象：

    - WSL2 反复重启或从 Windows 侧终止
    - WSL2 启动后不久，`app.slice` 或 `ollama.service` 占用 CPU 过高
    - 收到来自 systemd 的 SIGTERM 信号，而非 Linux 的 OOM-killer 事件

    当 OpenClaw 检测到 WSL2、启用了带有 `Restart=always` 的 `ollama.service` 以及可见的 CUDA 标记时，会记录启动警告。

    缓解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    将此内容添加到 Windows 侧的 `%USERPROFILE%\.wslconfig` 中，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服务环境中设置较短的保持活动（keep-alive）时间，或者仅在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    请参阅 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    请确保 Ollama 正在运行，并且您设置了 `OLLAMA_API_KEY`（或身份验证配置文件），并且您**没有**定义显式的 `models.providers.ollama` 条目：

    ```bash
    ollama serve
    ```

    验证 API 是否可访问：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="没有可用的模型">
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

  <Accordion title="OpenClaw远程主机适用于 curl 但不适用于 OpenClaw"Gateway(网关)>
    请从运行 Gateway(网关) 的同一机器和运行时进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`Gateway(网关)Docker，但 Gateway(网关) 运行在 Docker 或另一台主机上。
    - URL 使用了 `/v1`OpenAIOllamaOllama，这会选择 OpenAI 兼容行为，而不是 Ollama 原生模式。
    - 远程主机需要在 Ollama 端更改防火墙或 LAN 绑定设置。
    - 模型存在于您笔记本电脑的守护进程中，但不存在于远程守护进程中。

  </Accordion>

  <Accordion title="模型将工具 JSON 作为文本输出"OpenAIOllama>
    这通常意味着提供商正在使用 OpenAI 兼容模式，或者该模型无法处理工具架构。

    优先使用 Ollama 原生模式：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    如果小型本地模型在工具架构上仍然失败，请在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

  </Accordion>

  <Accordion title="GLMKimi 或 GLM 返回乱码符号"GLM>
    托管的 Kimi/GLM 响应如果是长串的非语言符号，将被视为失败的提供商输出，而不是成功的助手回答。这使得正常的重试、回退或错误处理可以接管，而不会将损坏的文本持久化到会话中。

    如果这种情况反复发生，请捕获原始模型名称、当前会话文件，以及运行使用的是 `Cloud + Local` 还是 `Cloud only`，然后尝试一个新的会话和一个回退模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="Cold local 模型 times out">
    大型本地模型在开始流式传输之前可能需要很长的首次加载时间。请将超时范围限定在 Ollama 提供商，并可以选择要求 Ollama 在对话轮次之间保持模型加载状态：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    如果主机本身接受连接的速度很慢，`timeoutSeconds` 也会延长此提供商受保护的 Undici 连接超时时间。

  </Accordion>

  <Accordion title="Large-context 模型 is too slow or runs out of memory">
    许多 Ollama 模型宣传的上下文大小可能超过了您的硬件所能舒适运行的范围。原生 Ollama 使用 Ollama 自己的运行时上下文默认值，除非您设置了 `params.num_ctx`。当您需要可预测的首字延迟时，请同时限制 OpenClaw 的预算和 Ollama 的请求上下文：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    如果 OpenClaw 发送的提示词过多，请先降低 `contextWindow`。如果 Ollama 加载的运行时上下文对机器来说过大，请降低 `params.num_ctx`。如果生成时间过长，请降低 `maxTokens`。

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
  <Card title="OllamaOllama Web Search" href="/zh/tools/ollama-search" icon="magnifying-glass" Ollama>
    由 Ollama 驱动的网络搜索的完整设置和行为详情。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整的配置参考。
  </Card>
</CardGroup>
