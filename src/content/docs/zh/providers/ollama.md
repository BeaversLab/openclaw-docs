---
summary: "OpenClawOllama使用 Ollama 运行 OpenClaw（云端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "OllamaOllama"
---

OpenClaw 与 Ollama 的原生 API (OpenClawOllamaAPI`/api/chat`OllamaOllama) 集成，用于托管的云端模型和本地/自托管的 Ollama 服务器。您可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机进行 `Cloud + Local`Ollama，针对 `https://ollama.com` 进行 `Cloud only`，或者针对可访问的 Ollama 主机进行 `Local only`Ollama。

<Warning>**远程 Ollama 用户**：请勿在 OpenClaw 中使用 Ollama`/v1`OpenAI OpenAI 兼容的 URL (`http://host:11434/v1`OpenClawOllamaAPI)。这会破坏工具调用，模型可能会将原始工具 JSON 输出为纯文本。请改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（无 `/v1`）。</Warning>

Ollama 提供商配置使用 Ollama`baseUrl`OpenClaw 作为规范键。OpenClaw 也接受 `baseURL`OpenAI 以兼容 OpenAI SDK 风格的示例，但新配置应优先使用 `baseUrl`。

## 身份验证规则

<AccordionGroup>
  <Accordion title="Local and LAN hosts"OllamaOpenClaw>
    本地和局域网 Ollama 主机不需要真正的不记名令牌。OpenClaw 仅对环回、专用网络、`.local`Ollama 和裸主机名 Ollama 基础 URL 使用本地 `ollama-local` 标记。
  </Accordion>
  <Accordion title="OllamaRemote and Ollama Cloud hosts"Ollama>
    远程公共主机和 Ollama Cloud (`https://ollama.com`) 需要通过 `OLLAMA_API_KEY`、身份验证配置文件或提供商的 `apiKey` 提供真实的凭据。
  </Accordion>
  <Accordion title="Custom 提供商 ids">
    设置了 `api: "ollama"` 的自定义提供商 ID 遵循相同的规则。例如，指向私有局域网 Ollama 主机的 `ollama-remote`Ollama 提供商可以使用 `apiKey: "ollama-local"`Ollama，子代理将通过 Ollama 提供商钩子解析该标记，而不是将其视为缺失的凭据。内存搜索也可以将 `agents.defaults.memorySearch.provider`Ollama 设置为该自定义提供商 ID，以便嵌入使用匹配的 Ollama 端点。
  </Accordion>
  <Accordion title="Auth profiles">
    `auth-profiles.json` 存储提供商 ID 的凭据。将端点设置（`baseUrl`、`api`、模型 ID、标头、超时）放在 `models.providers.<id>` 中。较旧的平面身份验证配置文件文件（例如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）不是运行时格式；请运行 `openclaw doctor --fix` 将它们重写为规范的 `ollama-windows:default`API API 密钥配置文件并进行备份。该文件中的 `baseUrl` 是兼容性干扰项，应移动到提供商配置中。
  </Accordion>
  <Accordion title="Memory embedding scope">
    当 Ollama 用于内存嵌入时，Bearer 认证的作用域限定在其声明的主机：

    - 提供商级别的密钥仅发送到该提供商的 Ollama 主机。
    - `agents.*.memorySearch.remote.apiKey` 仅发送到其远程嵌入主机。
    - 纯 `OLLAMA_API_KEY` 环境值被视为 Ollama Cloud 约定，默认不发送到本地或自托管主机。

  </Accordion>
</AccordionGroup>

## 入门指南

选择您偏好的设置方法和模式。

<Tabs>
  <Tab title="新手引导 (推荐)"Ollama>
    **最适合：** 快速搭建可用的 Ollama 云端或本地环境。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        ```Ollama

        从提供商列表中选择 **Ollama**。
      </Step>
      <Step title="选择模式"OllamaOllama>
        - **Cloud + Local** — 本地 Ollama 主机加上通过该主机路由的云模型
        - **Cloud only** — 通过 `https://ollama.com` 托管的 Ollama 模型
        - **Local only** — 仅限本地模型

      </Step>
      <Step title="选择模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管的云默认模型。`Cloud + Local` 和 `Local only`OllamaOllama 会要求提供 Ollama 基础 URL，发现可用模型，并在所选本地模型尚不可用时自动拉取。当 Ollama 报告已安装的 `:latest` 标签（例如 `gemma4:latest`）时，设置会显示该已安装模型一次，而不是同时显示 `gemma4` 和 `gemma4:latest` 或再次拉取裸别名。`Cloud + Local`Ollama 还会检查该 Ollama 主机是否已登录以进行云访问。
      </Step>
      <Step title="验证模型可用">
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

  <Tab title="手动设置">
    **最适用于：** 对云端或本地设置拥有完全控制权。

    <Steps>
      <Step title="选择云端或本地"Ollama>
        - **云端 + 本地**：安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **仅云端**：将 `https://ollama.com` 与 `OLLAMA_API_KEY`Ollama 配合使用
        - **仅本地**：从 [ollama.com/download](https://ollama.com/download) 安装 Ollama

      </Step>
      <Step title="拉取本地模型（仅本地）">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="OllamaOpenClaw为 OpenClaw 启用 Ollama">
        对于 `Cloud only`，请使用您真实的 `OLLAMA_API_KEY`。对于主机支持的设置，任何占位符值均可使用：

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
  <Tab title="云端 + 本地">
    `Cloud + Local`OllamaOllamaOpenClawOllama 使用可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 首选的混合流程。

    在设置过程中使用 **云端 + 本地**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并检查该主机是否已使用 `ollama signin`OpenClaw 登录以进行云端访问。当主机已登录时，OpenClaw 还会建议托管的云端默认模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`OpenClaw。

    如果主机尚未登录，OpenClaw 将使设置保持仅本地模式，直到您运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only`OllamaAPI 针对托管在 `https://ollama.com`OpenClaw 的 Ollama 托管 API 运行。

    在设置过程中使用 **Cloud only**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`Ollama，并填充托管云模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

    在 `openclaw onboard` 期间显示的云模型列表是从 `https://ollama.com/api/tags` 实时填充的，上限为 500 个条目，因此选择器反映的是当前的托管目录，而不是静态种子。如果在设置时 `ollama.com`OpenClaw 无法访问或未返回模型，OpenClaw 会回退到以前的硬编码建议，以便新手引导仍能完成。

  </Tab>

  <Tab title="Local only"OpenClawOllamaOllamaOpenClaw>
    在仅本地模式下，OpenClaw 从配置的 Ollama 实例中发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前建议将 `gemma4` 作为本地默认值。

  </Tab>
</Tabs>

## 模型发现（隐式提供商）

当您设置了 `OLLAMA_API_KEY`（或身份验证配置文件）并且**不**定义 `models.providers.ollama` 或其他带有 `api: "ollama"`OpenClawOllama 的自定义远程提供商时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例中发现模型。

| 行为       | 详情                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询   | 查询 `/api/tags`                                                                                                                               |
| 功能检测   | 使用尽力而为的 `/api/show` 查找来读取 `contextWindow`、扩展的 `num_ctx` Modelfile 参数以及包括视觉/工具在内的能力                              |
| 视觉模型   | 对于由 `/api/show` 报告具有 `vision` 能力的模型，会被标记为支持图像 (`input: ["text", "image"]`OpenClaw)，因此 OpenClaw 会自动将图像注入提示中 |
| 推理检测   | 在可用时使用 `/api/show` 功能，包括 `thinking`；当 Ollama 省略功能时，回退到模型名称启发式（`r1`、`reasoning`、`think`）                       |
| Token 限制 | 将 `maxTokens` 设置为 Ollama 使用的默认 OpenClaw 最大 token 限制                                                                               |
| 成本       | 将所有成本设置为 `0`                                                                                                                           |

这避免了手动输入模型，同时保持目录与本地 Ollama 实例同步。您可以在本地 `infer model run` 中使用完整的引用（例如 `ollama/<pulled-model>:latest`）；OpenClaw 从 Ollama 的实时目录中解析该已安装的模型，而无需手写 `models.json` 条目。

对于已登录的 Ollama 主机，某些 `:cloud` 模型可能会在出现在 `/api/tags` 中之前，通过 `/api/chat` 和 `/api/show` 使用。当您显式选择完整的 `ollama/<model>:cloud` 引用时，OpenClaw 会使用 `/api/show` 验证该确切缺失的模型，并且仅在 Ollama 确认模型元数据时将其添加到运行时目录中。拼写错误的模型仍然会作为未知模型失败，而不会被自动创建。

```bash
# See what models are available
ollama list
openclaw models list
```

为了避免使用完整的代理工具界面而进行简单的文本生成冒烟测试，请在本地 `infer model run` 中使用完整的 Ollama 模型引用：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

该路径仍然使用 OpenClaw 配置的提供商、身份验证和原生 Ollama 传输，但它不会启动聊天代理回合或加载 MCP/工具上下文。如果此操作成功而正常代理回复失败，请接着排查该模型的代理提示词/工具容量。

要在同一条精简路径上对视觉模型进行简单的冒烟测试，请将一个或多个图像文件添加到 `infer model run` 中。这会将提示和图像直接发送到选定的 Ollama 视觉模型，而无需加载聊天工具、记忆或先前的会话上下文：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受检测为 `image/*` 的文件，包括常见的 PNG、JPEG 和 WebP 输入。非图像文件将在调用 Ollama 之前被拒绝。对于语音识别，请改用 `openclaw infer audio transcribe`。

当您使用 `/model ollama/<model>`OpenClawOllama 切换对话时，OpenClaw 会将其
视为精确的用户选择。如果配置的 Ollama `baseUrl`
无法访问，下一次回复将失败并显示提供商错误，而不是默默从
另一个配置的回退模型进行回答。

独立的 cron 作业在开始代理轮次之前会进行一次额外的本地安全检查。如果所选模型解析为本地、私有网络或 `.local`Ollama
Ollama 提供商，且 `/api/tags`OpenClaw 无法访问，OpenClaw 会将该 cron 运行记录为
`skipped`，并在错误文本中包含所选的 `ollama/<model>`Ollama。端点
预检缓存时间为 5 分钟，因此多个指向同一已停止
Ollama 守护进程的 cron 作业不会全部启动失败的模型请求。

针对本地 Ollama 实时验证本地文本路径、原生流路径和嵌入功能，请使用：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

对于 Ollama Cloud API 密钥冒烟测试，将实时测试指向 OllamaAPI`https://ollama.com`
并从当前目录中选择一个托管模型：

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

云冒烟测试运行文本、原生流和网络搜索。对于 `https://ollama.com`OllamaAPI，默认情况下它会跳过嵌入，
因为 Ollama Cloud API 密钥可能未授权
`/api/embed`。当您明确希望
如果配置的云密钥无法使用嵌入端点时实时测试失败，请设置 `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1`。

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型将被自动发现并可供使用。

<Note>如果您显式设置 `models.providers.ollama`，或配置自定义远程提供商（如 `models.providers.ollama-cloud` 并带有 `api: "ollama"`），则会跳过自动发现，您必须手动定义模型。诸如 `http://127.0.0.2:11434` 之类的环回自定义提供商仍被视为本地。请参阅下面的显式配置部分。</Note>

## 视觉和图像描述

附带的 Ollama 插件将 Ollama 注册为具有图像能力的媒体理解提供商。这让 OpenClaw 能够通过本地或托管的 Ollama 视觉模型来路由显式的图像描述请求和配置的图像模型默认值。

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

`--model` 必须是完整的 `<provider/model>` 引用。当设置后，`openclaw infer image describe` 会直接运行该模型，而不是跳过描述，因为该模型支持原生视觉。

当您想要 OpenClaw 的图像理解提供商流程、配置的 `agents.defaults.imageModel` 和图像描述输出形状时，请使用 `infer image describe`。当您想要使用自定义提示和一张或多张图像对原始多模态模型进行探测时，请使用 `infer model run --file`。

要将 Ollama 设置为传入媒体的默认图像理解模型，请配置 `agents.defaults.imageModel`：

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

首选完整的 `ollama/<model>` 引用。如果同一个模型在 `models.providers.ollama.models` 下被列出并带有 `input: ["text", "image"]`，并且没有其他配置的图像提供商暴露该裸模型 ID，OpenClaw 也会将裸 `imageModel` 引用（例如 `qwen2.5vl:7b`）标准化为 `ollama/qwen2.5vl:7b`。如果有多个配置的图像提供商具有相同的裸 ID，请显式使用提供商前缀。

缓慢的本地视觉模型可能需要比云端模型更长的图像理解超时时间。当 Ollama 尝试在受限硬件上分配完整的宣传视觉上下文时，它们也可能崩溃或停止。当您只需要正常的图像描述轮次时，请设置功能超时时间，并在模型条目上限制 `num_ctx`：

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

此超时适用于入站图像理解以及代理在轮次中可以调用的显式 `image` 工具。提供商级别的 `models.providers.ollama.timeoutSeconds`Ollama 仍然控制正常模型调用的基础 Ollama HTTP 请求守卫。

针对本地 Ollama 实时验证显式图像工具，请使用：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手动定义 `models.providers.ollama.models`，请标记支持图像输入的视觉模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝针对未标记为具备图像能力的模型的图像描述请求。在隐式发现模式下，当 OpenClawOpenClawOllama`/api/show` 报告视觉能力时，OpenClaw 会从 Ollama 读取此信息。

## 配置

<Tabs>
  <Tab title="基础（隐式发现）">
    仅启用本地功能的最简单方法是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以在提供商条目中省略 `apiKey`OpenClaw，OpenClaw 将为可用性检查填充它。
    </Tip>

  </Tab>

  <Tab title="显式（手动模型）"Ollama>
    当您需要托管云设置、Ollama 在另一个主机/端口上运行、想要强制特定的上下文窗口或模型列表，或者想要完全手动定义模型时，请使用显式配置。

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

  <Tab title="自定义基础 URL"Ollama>
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
    请勿在 URL 中添加 `/v1`。`/v1`OpenAIOllama 路径使用 OpenAI 兼容模式，其中工具调用不可靠。请使用不带路径后缀的基础 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

## 常用方法

使用这些作为起点，并将模型 ID 替换为 `ollama list` 或 `openclaw models list --provider ollama` 中的确切名称。

<AccordionGroup>
  <Accordion title="Local 模型 with auto-discovery"OllamaGateway(网关)OpenClaw>
    当 Ollama 与 Gateway(网关) 在同一台机器上运行，并且您希望 OpenClaw 自动发现已安装的模型时，请使用此方法。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此路径保持配置最少。除非您想手动定义模型，否则不要添加 `models.providers.ollama` 块。

  </Accordion>

  <Accordion title="OllamaLAN Ollama host with manual models"Ollama>
    对 LAN 主机使用原生 Ollama URL。不要添加 `/v1`。

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

    `contextWindow`OpenClaw 是 OpenClaw 端的上下文预算。`params.num_ctx`Ollama 会发送给 Ollama 用于请求。当您的硬件无法运行模型完整标称上下文时，请保持它们一致。

  </Accordion>

  <Accordion title="OllamaOllama Cloud only"Ollama>
    当您不运行本地守护进程并且希望直接使用托管的 Ollama 模型时，请使用此方法。

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

  <Accordion title="Cloud plus local through a signed-in daemon"Ollama>
    当本地或 LAN Ollama 守护进程已使用 `ollama signin` 登录，并且应同时提供本地模型和 `:cloud` 模型时，请使用此方法。

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

  <Accordion title="OllamaMultiple Ollama hosts"Ollama>
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
    ```OpenClaw

    当 OpenClaw 发送请求时，活动的提供商前缀会被剥离，因此 `ollama-large/qwen3.5:27b`Ollama 会以 `qwen3.5:27b` 的形式到达 Ollama。

  </Accordion>

  <Accordion title="Lean local 模型 profile">
    一些本地模型可以回答简单的提示，但难以应对完整的代理工具表面。在更改全局运行时设置之前，请先限制工具和上下文。

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

    仅当模型或服务器在工具架构上持续失败时，才使用 `compat.supportsTools: false`。它以代理能力为代价换取稳定性。
    `localModelLean` 会从代理表面移除浏览器、cron 和消息工具，但它不会更改 Ollama 的运行时上下文或思维模式。对于会循环或将响应预算花费在隐藏推理上的小型 Qwen 风格思维模型，请将其与显式的 `params.num_ctx` 和 `params.thinking: false` 配对使用。

  </Accordion>
</AccordionGroup>

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

也支持自定义 Ollama 提供商 ID。当模型引用使用活动的
提供商前缀（例如 `ollama-spark/qwen3:32b`）时，OpenClaw 在调用 Ollama 之前仅剥离该
前缀，以便服务器接收 `qwen3:32b`。

对于速度较慢的本地模型，在提高整个代理运行时超时之前，请优先调整提供商范围的请求：

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

`timeoutSeconds` 适用于模型 HTTP 请求，包括连接设置、
标头、正文流传输以及总的受保护获取中止。`params.keep_alive`
作为顶级 `keep_alive` 被转发到 Ollama，位于原生 `/api/chat` 请求上；
当首轮加载时间是瓶颈时，请逐个模型进行设置。

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

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 中使用的主机。如果 `curl` 可以工作但 OpenClaw 不能，请检查 Gateway(网关) 是否运行在不同的机器、容器或服务帐户上。

## Ollama 网络搜索

OpenClaw 支持将 **Ollama Web Search** 作为内置 OpenClawOllama`web_search` 提供商。

| 属性 | 详情                                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主机 | 使用您配置的 Ollama 主机（设置时为 Ollama`models.providers.ollama.baseUrl`，否则为 `http://127.0.0.1:11434`）；`https://ollama.com`API 直接使用托管的 API |
| 认证 | 对于已登录的本地 Ollama 主机无需密钥；对于直接的 `https://ollama.com` 搜索或受认证保护的主机，需要 Ollama`OLLAMA_API_KEY` 或已配置的提供商认证            |
| 要求 | 本地/自托管主机必须正在运行并已使用 `ollama signin` 登录；直接托管搜索需要 `baseUrl: "https://ollama.com"`OllamaAPI 加上真实的 Ollama API 密钥            |

在 Ollama`openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Ollama Web Search**，或设置：

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

对于已登录的本地守护进程，OpenClaw 使用该守护进程的 OpenClaw`/api/experimental/web_search` 代理。对于 `https://ollama.com`，它会直接调用托管的 `/api/web_search` 端点。

<Note>有关完整的设置和行为详细信息，请参阅 [Ollama Web Search](Ollama/en/tools/ollama-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **工具调用在 OpenAI-compatible mode 模式下不可靠。** 仅当您需要代理使用 OpenAI 格式且不依赖原生工具调用行为时，才使用此模式。
    </Warning>

    如果您需要改用 OpenAI-compatible 端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

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

    当与 Ollama 一起使用 `api: "openai-completions"` 时，OpenClaw 默认会注入 `options.num_ctx`，以免 Ollama 无提示回退到 4096 的上下文窗口。如果您的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

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
    对于自动发现的模型，OpenClaw 在可用时使用 Ollama 报告的上下文窗口，包括来自自定义 Modelfile 的更大 `PARAMETER num_ctx`OllamaOpenClaw 值。否则，它会回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    您可以为该 Ollama 提供商下的每个模型设置提供商级别的 `contextWindow`、`contextTokens` 和 `maxTokens`Ollama 默认值，然后在需要时针对每个模型进行覆盖。`contextWindow`OpenClawOllama 是 OpenClaw 的提示词和压缩预算。原生 Ollama 请求保持 `options.num_ctx` 未设置，除非您显式配置 `params.num_ctx`Ollama，因此 Ollama 可以应用其自身的模型、`OLLAMA_CONTEXT_LENGTH`Ollama 或基于 VRAM 的默认值。要在不重建 Modelfile 的情况下限制或强制 Ollama 的每次请求运行时上下文，请设置 `params.num_ctx`；无效、零、负数和非有限值将被忽略。如果您升级了仅使用 `contextWindow` 或 `maxTokens`Ollama 来强制原生 Ollama 请求上下文的旧配置，请运行 `openclaw doctor --fix`，将这些显式的提供商或模型预算复制到 `params.num_ctx`OpenAIOllama 中。OpenAI 兼容的 Ollama 适配器默认仍会从配置的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒绝 `options`OllamaOllama，请使用 `injectNumCtxForOpenAICompat: false` 禁用该功能。

    原生 Ollama 模型条目还接受 `params` 下的常见 Ollama 运行时选项，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`OpenClawOllamaOpenClaw。OpenClaw 仅转发 Ollama 请求键，因此 OpenClaw 运行时参数（如 `streaming`Ollama）不会泄露给 Ollama。使用 `params.think` 或 `params.thinking`Ollama 发送顶级 Ollama `think`；`false`APIQwen 禁用 Qwen 风格思维模型的 API 级别思考。

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

    针对特定模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也可行。如果两者都已配置，显式的提供商模型条目将优先于代理默认值。

  </Accordion>

  <Accordion title="Thinking control"OllamaOpenClawOllama>
    对于原生 Ollama 模型，OpenClaw 会按照 Ollama 的期望方式转发思维控制：顶层的 `think`，而不是 `options.think`。如果自动发现的模型的 `/api/show` 响应包含 `thinking` 功能，则会暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思维模型仅暴露 `/think off`。

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

    针对特定模型的 `params.think` 或 `params.thinking`OllamaAPIOpenClaw 可以禁用或强制为特定配置的模型启用 Ollama API 思维功能。当活动运行仅具有隐式默认 `off` 时，OpenClaw 会保留这些显式的模型参数；非运行时命令（例如 `/think medium`）仍然会覆盖活动运行。

  </Accordion>

  <Accordion title="Reasoning models"OpenClaw>
    OpenClaw 默认将名称类似于 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```OpenClaw

    无需额外配置。OpenClaw 会自动标记它们。

  </Accordion>

<Accordion title="Model costs" Ollama>
  Ollama 是免费的并且在本地运行，因此所有模型成本均设为 $0。这适用于自动发现和手动定义的模型。
</Accordion>

  <Accordion title="Memory embeddings">
    捆绑的 Ollama 插件为
    [memory search](/en/concepts/memory) 注册了一个内存嵌入提供商。
    它使用配置的 Ollama 基础 URL
    和 API 密钥，调用 Ollama 当前的 `/api/embed` 端点，并在可能时将
    多个内存块批量处理为一个 `input` 请求。

    当 `proxy.enabled=true` 时，发送到由配置的 `baseUrl` 派生的精确主机本地 loopback 源的
    Ollama 内存嵌入请求使用
    OpenClaw 的受保护直接路径，而不是托管转发代理。
    配置的主机名本身必须是 `localhost` 或 loopback IP 字面量；
    仅解析为 loopback 的 DNS 名称仍使用托管代理路径。
    LAN、tailnet、私有网络和公共 Ollama 主机也保持在
    托管代理路径上。重定向到其他主机或端口不会继承信任。
    操作员仍可设置全局 `proxy.loopbackMode: "proxy"` 选项以
    通过代理发送 loopback 流量，或设置 `proxy.loopbackMode: "block"`
    以在打开连接之前拒绝 loopback 连接；请参阅
    [Managed proxy](/en/security/network-proxy#gateway-loopback-mode) 了解
    此设置的进程范围影响。

    | Property      | Value               |
    | ------------- | ------------------- |
    | Default 模型 | `nomic-embed-text`  |
    | Auto-pull     | Yes — the embedding 模型 is pulled automatically if not present locally |

    查询时嵌入会对要求或推荐使用检索前缀的模型使用前缀，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。内存文档批次保持原始格式，因此现有索引不需要格式迁移。

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

    对于远程嵌入主机，请将 auth 限制在该主机：

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

  <Accordion title="流式配置"OpenClawOllamaOllamaAPI>
    OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API** (`/api/chat`)，完全支持同时进行流式传输和工具调用。无需特殊配置。

    对于原生 `/api/chat`OpenClawOllama 请求，OpenClaw 还会将推理控制直接转发给 Ollama：`/think off` 和 `openclaw agent --thinking off` 会发送顶层 `think: false`，除非配置了显式的模型 `params.think`/`params.thinking` 值；而 `/think low|medium|high` 则会发送匹配的顶层 `think` 推理强度字符串。`/think max`Ollama 映射到 Ollama 的最高原生推理强度 `think: "high"`OpenAIOpenAI。

    <Tip>
    如果您需要使用 OpenAI 兼容端点，请参阅上面的“旧版 OpenAI 兼容模式”一节。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="WSL2WSL2 崩溃循环（反复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 上，官方 Ollama Linux 安装程序会创建一个带有 `Restart=always` 的 `ollama.service` systemd 单元。如果该服务在 WSL2 启动期间自动启动并加载了 GPU 支持的模型，Ollama 可能会在模型加载时锁定主机内存。Hyper-V 内存回收机制并不总是能回收这些被锁定的页面，因此 Windows 可能会终止 WSL2 虚拟机，systemd 随后再次启动 Ollama，从而导致循环往复。

    常见现象：

    - WSL2 端反复重启或终止 Windows
    - 在 WSL2 启动后不久，`app.slice` 或 `ollama.service` 占用较高 CPU
    - 收到来自 systemd 的 SIGTERM 信号，而不是 Linux 的 OOM-killer 事件

    当检测到 OpenClaw、启用了带有 `Restart=always` 的 `ollama.service` 以及可见的 CUDA 标记时，WSL2 会记录一条启动警告。

    缓解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    将此添加到 Windows 端的 `%USERPROFILE%\.wslconfig` 中，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服务环境中设置更短的 keep-alive 时间，或者仅在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    请确保 Ollama 正在运行，并且您已设置 `OLLAMA_API_KEY`（或身份验证配置文件），并且**没有**定义显式的 `models.providers.ollama` 条目：

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

  <Accordion title="Remote host works with curl but not OpenClaw">
    从运行 Gateway(网关) 的同一台机器和运行时进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway(网关) 运行在 Docker 或另一台主机上。
    - URL 使用了 `/v1`，这会选择 OpenAI 兼容行为而不是原生 Ollama。
    - 远程主机需要在 Ollama 端更改防火墙或局域网绑定设置。
    - 模型存在于您笔记本电脑的守护进程中，但不存在于远程守护进程中。

  </Accordion>

  <Accordion title="Model outputs 工具 JSON as text">
    这通常意味着提供商正在使用 OpenAI 兼容模式，或者该模型无法处理工具架构。

    首选原生 Ollama 模式：

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

    如果小型本地模型仍然无法处理工具架构，请在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

  </Accordion>

  <Accordion title="GLMKimi 或 GLM 返回乱码符号"GLM>
    托管的 Kimi/GLM 响应如果是连续的长串非语言符号，将被视为提供商输出失败，而不是成功的助手回答。这允许正常的重试、回退或错误处理接管，而不会将损坏的文本持久化到会话中。

    如果这种情况反复发生，请记录原始模型名称、当前会话文件以及运行使用的是 `Cloud + Local` 还是 `Cloud only`，然后尝试一个新的会话和回退模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="冷启动本地模型超时"OllamaOllama>
    大型本地模型在开始流式传输之前可能需要很长的首次加载时间。请将超时范围限制在 Ollama 提供商，并可选择要求 Ollama 在轮次之间保持模型加载状态：

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

    如果主机本身接受连接很慢，`timeoutSeconds` 也会延长该提供商受保护的 Undici 连接超时。

  </Accordion>

  <Accordion title="大上下文模型太慢或内存不足"OllamaOllamaOllama>
    许多 Ollama 模型宣称的上下文大小可能超过您的硬件能够舒适运行的范围。原生 Ollama 除非您设置 `params.num_ctx`OpenClawOllama，否则使用 Ollama 自己的运行时上下文默认值。当您需要可预测的首字延迟时，请限制 OpenClaw 的预算和 Ollama 的请求上下文：

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

    如果 OpenClaw 发送的提示太多，请先降低 `contextWindow`OpenClaw。如果 Ollama 加载的运行时上下文对机器来说太大，请降低 `params.num_ctx`Ollama。如果生成运行时间太长，请降低 `maxTokens`。

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
    Ollama 驱动的网络搜索的完整设置和行为详细信息。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
