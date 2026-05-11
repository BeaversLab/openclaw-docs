---
summary: "使用 OpenClaw 运行 Ollama（云端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw 与 Ollama 的原生 API (`/api/chat`) 集成，用于托管的云模型和本地/自托管 Ollama 服务器。您可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机进行 `Cloud + Local`，针对 `https://ollama.com` 进行 `Cloud only`，或针对可访问的 Ollama 主机进行 `Local only`。

<Warning>**远程 Ollama 用户**：请勿将 `/v1` OpenAI 兼容 URL (`http://host:11434/v1`) 与 OpenClaw 配合使用。这会破坏工具调用，模型可能会将原始工具 JSON 输出为纯文本。请改用原生 Ollama API API URL：`baseUrl: "http://host:11434"`（不含 `/v1`）。</Warning>

Ollama 提供商配置使用 `baseUrl` 作为规范键。OpenClaw 也接受 `baseURL` 以兼容 OpenAI SDK 风格的示例，但新配置应首选 `baseUrl`。

## 身份验证规则

<AccordionGroup>
  <Accordion title="Local and LAN hosts">
    本地和局域网 Ollama 主机不需要真正的不记名令牌。OpenClaw 仅对环回、专用网络、`.local` 和纯主机名 Ollama 基础 URL 使用本地 `ollama-local` 标记。
  </Accordion>
  <Accordion title="Remote and Ollama Cloud hosts">
    远程公共主机和 Ollama 云端 (`https://ollama.com`) 需要通过 `OLLAMA_API_KEY`、身份验证配置文件或提供商的 `apiKey` 提供真实凭据。
  </Accordion>
  <Accordion title="Custom 提供商 ids">
    设置了 `api: "ollama"` 的自定义提供商 ID 遵循相同的规则。例如，指向私有局域网 Ollama 主机的 `ollama-remote` 提供商可以使用 `apiKey: "ollama-local"`，子代理将通过 Ollama 提供商钩子解析该标记，而不是将其视为缺失的凭据。
  </Accordion>
  <Accordion title="Memory embedding scope">
    当 Ollama 用于记忆嵌入时，Bearer 身份验证的范围限定于声明它的主机：

    - 提供商级别的密钥仅发送到该提供商的 Ollama 主机。
    - `agents.*.memorySearch.remote.apiKey` 仅发送到其远程嵌入主机。
    - 纯 `OLLAMA_API_KEY` 环境值被视为 Ollama Cloud 约定，默认情况下不发送到本地或自托管主机。

  </Accordion>
</AccordionGroup>

## 入门指南

选择您偏好的设置方法和模式。

<Tabs>
  <Tab title="新手引导（推荐）">
    **最适用于：** 快速搭建可用的 Ollama 云端或本地环境。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard
        ```

        从提供商列表中选择 **Ollama**。
      </Step>
      <Step title="选择模式">
        - **Cloud + Local** — 本地 Ollama 主机加上通过该主机路由的云端模型
        - **Cloud only** — 通过 `https://ollama.com` 托管的 Ollama 模型
        - **Local only** — 仅限本地模型
      </Step>
      <Step title="选择模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议使用托管的云端默认设置。`Cloud + Local` 和 `Local only` 会询问 Ollama 基础 URL，发现可用模型，并在所选本地模型尚不可用时自动拉取。当 Ollama 报告已安装的 `:latest` 标签（例如 `gemma4:latest`）时，设置会显示一次该已安装模型，而不是同时显示 `gemma4` 和 `gemma4:latest` 或再次拉取裸别名。`Cloud + Local` 还会检查该 Ollama 主机是否已登录以进行云端访问。
      </Step>
      <Step title="验证模型可用性">
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
    **最适用于**：对云端或本地设置进行完全控制。

    <Steps>
      <Step title="选择云端或本地">
        - **云端 + 本地**：安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **仅云端**：使用 `https://ollama.com` 配合 `OLLAMA_API_KEY`
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
        对于 `Cloud only`，请使用真实的 `OLLAMA_API_KEY`。对于基于主机的设置，任何占位符值均可使用：

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
    `Cloud + Local` 使用可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 首选的混合流程。

    在设置过程中使用 **云端 + 本地**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并使用 `ollama signin` 检查主机是否已登录以进行云端访问。当主机已登录时，OpenClaw 还会建议托管的云端默认模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主机尚未登录，OpenClaw 将保持设置为仅本地模式，直到您运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 针对 Ollama 的托管 API 运行，地址为 `https://ollama.com`。

    在设置期间使用 **Cloud only**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并植入托管的云模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

    在 `openclaw onboard` 期间显示的云模型列表是从 `https://ollama.com/api/tags` 实时填充的，上限为 500 个条目，因此选择器反映的是当前的托管目录，而不是静态种子。如果在设置时 `ollama.com` 无法访问或未返回模型，OpenClaw 会回退到之前的硬编码建议，以便新手引导仍能完成。

  </Tab>

  <Tab title="Local only">
    在仅本地模式下，OpenClaw 从配置的 Ollama 实例中发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前建议将 `gemma4` 作为本地默认值。

  </Tab>
</Tabs>

## 模型发现（隐式提供商）

当您设置 `OLLAMA_API_KEY`（或身份验证配置文件）并且**不**定义 `models.providers.ollama` 或使用 `api: "ollama"` 定义其他自定义远程提供商时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例中发现模型。

| 行为       | 详情                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询   | 查询 `/api/tags`                                                                                                                          |
| 功能检测   | 使用尽力而为的 `/api/show` 查找来读取 `contextWindow`、扩展的 `num_ctx` Modelfile 参数以及包括视觉/工具在内的功能                         |
| 视觉模型   | 具有由 `/api/show` 报告的 `vision` 功能的模型被标记为具有图像能力（`input: ["text", "image"]`），因此 OpenClaw 会自动将图像注入到提示词中 |
| 推理检测   | 使用模型名称启发式方法标记 `reasoning`（`r1`、`reasoning`、`think`）                                                                      |
| Token 限制 | 设置 `maxTokens` 为 OpenClaw 使用的默认 Ollama 最大 token 上限                                                                            |
| 成本       | 将所有成本设置为 `0`                                                                                                                      |

这避免了手动输入模型，同时使目录与本地 Ollama 实例保持一致。

```bash
# See what models are available
ollama list
openclaw models list
```

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型将被自动发现并可用。

<Note>如果您显式设置了 `models.providers.ollama`，或配置了使用 `api: "ollama"` 的自定义远程提供商（例如 `models.providers.ollama-cloud`），则将跳过自动发现，您必须手动定义模型。诸如 `http://127.0.0.2:11434` 之类的环回自定义提供商仍被视为本地提供商。请参阅下面的显式配置部分。</Note>

## 视觉与图像描述

捆绑的 Ollama 插件将 Ollama 注册为具有图像功能的媒体理解提供商。这使得 OpenClaw 可以通过本地或托管的 Ollama 视觉模型路由显式的图像描述请求和配置的图像模型默认值。

对于本地视觉功能，请拉取支持图像的模型：

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

`--model` 必须是完整的 `<provider/model>` 引用。当设置此项后，`openclaw infer image describe` 将直接运行该模型，而不是跳过描述，因为该模型支持原生视觉功能。

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

缓慢的本地视觉模型可能比云模型需要更长的图像理解超时时间。当 Ollama 试图在受限硬件上分配完整的广告视觉上下文时，它们也可能崩溃或停止。设置功能超时时间，并且当您只需要正常的图像描述轮次时，请在模型条目上限制 `num_ctx`：

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

此超时时间适用于传入图像理解以及代理可以在一轮中调用的显式 `image` 工具。提供商级别的 `models.providers.ollama.timeoutSeconds` 仍然控制正常模型调用的底层 Ollama HTTP 请求保护。

使用以下命令针对本地 Ollama 实时验证显式图像工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手动定义 `models.providers.ollama.models`，请标记视觉模型以支持图像输入：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝针对未标记为具备图像处理能力的模型的图像描述请求。通过隐式发现，当 `/api/show` 报告视觉能力时，OpenClaw 会从 Ollama 读取此信息。

## 配置

<Tabs>
  <Tab title="Basic (implicit discovery)">
    最简单的仅本地启用路径是通过环境变量实现的：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以在提供商条目中省略 `apiKey`，OpenClaw 将会为可用性检查填充它。
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    当您希望进行托管云设置、Ollama 运行在另一主机/端口上、希望强制特定的上下文窗口或模型列表，或者想要完全手动的模型定义时，请使用显式配置。

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
    请勿在 URL 中添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，在该模式下工具调用不可靠。请使用不带路径后缀的基本 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

## 常用方案

使用这些作为起点，并将模型 ID 替换为 `ollama list` 或 `openclaw models list --provider ollama` 中的确切名称。

<AccordionGroup>
  <Accordion title="Local 模型 with auto-discovery">
    当 Ollama 与 Gateway 运行在同一台机器上，并且您希望 OpenClaw 自动发现已安装的模型时，请使用此方法。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此路径使配置保持最小化。除非您想手动定义模型，否则不要添加 `models.providers.ollama` 块。

  </Accordion>

  <Accordion title="具有手动模型的局域网 Ollama 主机">
    对局域网主机使用原生的 Ollama URL。不要添加 `/v1`。

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

    `contextWindow` 是 OpenClaw 端的上下文预算。`params.num_ctx` 会随请求发送给 Ollama。当您的硬件无法运行模型所宣传的完整上下文时，请保持两者一致。

  </Accordion>

  <Accordion title="仅限 Ollama Cloud">
    当您没有运行本地守护进程并希望直接使用托管的 Ollama 模型时，请使用此选项。

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

  <Accordion title="通过已登录的守护进程实现云端加本地模式">
    当本地或局域网 Ollama 守护进程已使用 `ollama signin` 登录，并且应同时服务于本地模型和 `:cloud` 模型时，请使用此选项。

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
    当您拥有多个 Ollama 服务器时，请使用自定义提供商 ID。每个提供商都有自己的主机、模型、认证、超时和模型引用。

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
    一些本地模型可以回答简单的提示，但在处理完整的代理工具集时会感到吃力。在更改全局运行时设置之前，请先限制工具和上下文。

    ```json5
    {
      agents: {
        defaults: {
          experimental: {
            localModelLean: true,
          },
          model: { primary: "ollama/gemma4" },
        },
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

    仅当模型或服务器在工具架构上可靠地失败时，才使用 `compat.supportsTools: false`。它以代理能力为代价换取稳定性。
    `localModelLean` 会从代理表面移除浏览器、cron 和消息工具，但它不会更改 Ollama 的运行时上下文或思维模式。将其与显式的 `params.num_ctx` 和 `params.thinking: false` 配合使用，适用于那些会循环或在隐藏推理上消耗响应预算的小型 Qwen 风格思维模型。

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

还支持自定义 Ollama 提供商 ID。当模型引用使用活动的提供商前缀（例如 `ollama-spark/qwen3:32b`）时，OpenClaw 在调用 Ollama 之前仅剥离该前缀，以便服务器接收 `qwen3:32b`。

对于速度较慢的本地模型，在提高整个代理运行时超时之前，请优先考虑提供商范围的请求调整：

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

`timeoutSeconds` 适用于模型 HTTP 请求，包括连接设置、标头、主体流传输以及总的受保护提取中止操作。`params.keep_alive` 作为顶级 `keep_alive` 转发给 Ollama，用于原生 `/api/chat` 请求；当首轮加载时间是瓶颈时，请按模型设置它。

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

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 中使用的主机。如果 `curl` 工作正常但 OpenClaw 不工作，请检查 Gateway(网关) 是否运行在不同的机器、容器或服务帐户上。

## Ollama 网络搜索

OpenClaw 支持将 **Ollama 网络搜索**作为捆绑的 `web_search` 提供商。

| 属性     | 详情                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主机     | 使用您配置的 Ollama 主机（如果设置了 `models.providers.ollama.baseUrl`，否则使用 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用托管的 API |
| 身份验证 | 对于已登录的本地 Ollama 主机，无需密钥；对于直接 `https://ollama.com` 搜索或受身份验证保护的主机，使用 `OLLAMA_API_KEY` 或配置的提供商身份验证       |
| 要求     | 本地/自托管主机必须正在运行并已通过 `ollama signin` 登录；直接托管搜索需要 `baseUrl: "https://ollama.com"` 以及真实的 Ollama API 密钥                |

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

对于已登录的本地守护进程，OpenClaw 使用该守护进程的 `/api/experimental/web_search` 代理。对于 `https://ollama.com`，它直接调用托管 `/api/web_search` 端点。

<Note>有关完整的设置和行为详细信息，请参阅 [Ollama Web Search](/zh/tools/ollama-search)。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **在 OpenAI 兼容模式下，工具调用不可靠。** 仅当您需要代理的 OpenAI 格式且不依赖原生工具调用行为时，才使用此模式。
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

    此模式可能无法同时支持流式传输和工具调用。您可能需要在模型配置中禁用流式传输，即使用 `params: { streaming: false }`。

    当 `api: "openai-completions"` 与 Ollama 一起使用时，OpenClaw 默认注入 `options.num_ctx`，以防止 Ollama 无提示回退到 4096 上下文窗口。如果您的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

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
    对于自动发现的模型，如果可用，OpenClaw 使用 Ollama 报告的上下文窗口，包括来自自定义 Modelfile 的更大的 `PARAMETER num_ctx` 值。否则，它会回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    您可以为该 Ollama 提供商下的每个模型设置提供商级别的 `contextWindow`、`contextTokens` 和 `maxTokens` 默认值，然后根据需要按模型覆盖它们。`contextWindow` 是 OpenClaw 的提示和压缩预算。原生 Ollama 请求保持 `options.num_ctx` 未设置，除非您显式配置 `params.num_ctx`，以便 Ollama 可以应用其自己的模型、`OLLAMA_CONTEXT_LENGTH` 或基于 VRAM 的默认值。要在不重建 Modelfile 的情况下限制或强制 Ollama 的每次请求运行时上下文，请设置 `params.num_ctx`；无效、零、负数和非有限值将被忽略。OpenAI 兼容的 Ollama 适配器默认仍会从配置的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒绝 `options`，请使用 `injectNumCtxForOpenAICompat: false` 禁用它。

    原生 Ollama 模型条目还接受 `params` 下的常见 Ollama 运行时选项，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 仅转发 Ollama 请求键，因此不会将 OpenClaw 运行时参数（如 `streaming`）泄漏给 Ollama。使用 `params.think` 或 `params.thinking` 发送顶级 Ollama `think`；`false` 禁用 Qwen 风格思考模型的 API 级别思考。

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

    每个模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也可以。如果两者都已配置，则显式提供商模型条目优先于代理默认值。

  </Accordion>

  <Accordion title="Thinking control">
    对于原生 Ollama 模型，OpenClaw 会按照 Ollama 的预期转发思考控制：使用顶层 `think`，而不是 `options.think`。

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

    针对每个模型的 `params.think` 或 `params.thinking` 可以禁用或强制特定已配置模型的 Ollama API 思考。运行时命令（如 `/think off`）仍适用于当前运行。

  </Accordion>

  <Accordion title="Reasoning models">
    OpenClaw 默认将名称包含 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力的模型。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    无需额外配置。OpenClaw 会自动标记它们。

  </Accordion>

<Accordion title="Model costs">Ollama 是免费的并在本地运行，因此所有模型成本均设置为 $0。这适用于自动发现和手动定义的模型。</Accordion>

  <Accordion title="Memory embeddings">
    捆绑的 Ollama 插件为[memory search](/zh/concepts/memory)注册了一个记忆嵌入提供商。它使用已配置的 Ollama 基础 URL 和 API 密钥，调用 Ollama 当前的 `/api/embed` 端点，并尽可能将多个记忆块分批处理为一个 `input` 请求。

    | 属性      | 值               |
    | ------------- | ------------------- |
    | 默认模型 | `nomic-embed-text`  |
    | 自动拉取     | 是 — 如果本地不存在，嵌入模型将自动拉取 |

    查询时的嵌入会对需要或推荐使用检索前缀的模型使用该前缀，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。记忆文档批次保持原始格式，因此现有索引不需要格式迁移。

    要选择 Ollama 作为记忆搜索嵌入提供商：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
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
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              model: "nomic-embed-text",
              apiKey: "ollama-local",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Streaming configuration">
    OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API** (`/api/chat`)，它完全支持同时进行流式传输和工具调用。无需特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 还会直接将思考控制转发给 Ollama：`/think off` 和 `openclaw agent --thinking off` 发送顶级 `think: false`，而 `/think low|medium|high` 发送匹配的顶级 `think` 努力字符串。`/think max` 映射到 Ollama 的最高原生努力程度，`think: "high"`。

    <Tip>
    如果您需要使用 OpenAI 兼容端点，请参阅上面的“Legacy OpenAI-compatible mode”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="WSL2 崩溃循环（反复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 上，官方 Ollama Linux 安装程序会创建一个带有 `Restart=always` 的 `ollama.service` systemd 单元。如果该服务在 WSL2 启动期间自动启动并加载了 GPU 支持的模型，Ollama 可能在模型加载时锁定主机内存。Hyper-V 内存回收机制并不总是能回收这些被锁定的页面，因此 Windows 可能会终止 WSL2 虚拟机，systemd 随后再次启动 Ollama，从而导致循环重复。

    常见迹象：

    - WSL2 反复重启或从 Windows 端被终止
    - WSL2 启动后不久，`app.slice` 或 `ollama.service` 占用 CPU 过高
    - 收到来自 systemd 的 SIGTERM 信号，而不是 Linux 的 OOM-killer 事件

    当检测到 OpenClaw、启用了带有 `Restart=always` 的 `ollama.service` 以及可见的 CUDA 标记时，WSL2 会记录启动警告。

    缓解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    将此添加到 Windows 端的 `%USERPROFILE%\.wslconfig` 中，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服务环境中设置更短的保持时间（keep-alive），或者仅在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    请确保 Ollama 正在运行，并且您已设置 `OLLAMA_API_KEY`（或身份验证配置文件），并且**未**定义显式的 `models.providers.ollama` 条目：

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

  <Accordion title="连接被拒绝">
    检查 Ollama 是否在正确的端口上运行：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="远程主机可通过 curl 访问但 OpenClaw 无法访问">
    请从运行 OpenClaw 的同一台机器和运行时进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway(网关) 运行在 Gateway(网关) 或另一台主机上。
    - URL 使用了 `/v1`，这会选择 Docker 兼容行为，而不是原生 OpenAI。
    - 远程主机需要在 Ollama 端更改防火墙或局域网绑定设置。
    - 模型存在于您笔记本电脑的守护进程中，但不在远程守护进程中。

  </Accordion>

  <Accordion title="模型将工具 JSON 作为文本输出">
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

    如果小型本地模型在工具架构上仍然失败，请在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

  </Accordion>

  <Accordion title="冷本地模型超时">
    大型本地模型在开始流式传输之前可能需要很长的首次加载时间。请将超时范围限制在 Ollama 提供商，并可选择要求 Ollama 在轮次之间保持模型加载：

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

    如果主机本身接受连接的速度很慢，`timeoutSeconds` 也会延长此提供程序的受保护 Undici 连接超时。

  </Accordion>

  <Accordion title="大上下文模型太慢或内存不足">
    许多 Ollama 模型宣传的上下文大小超过了您的硬件能够舒适运行的范围。原生 Ollama 使用 Ollama 自己的运行时上下文默认值，除非您设置了 `params.num_ctx`。当您想要可预测的首个令牌延迟时，请同时限制 OpenClaw 的预算和 Ollama 的请求上下文：

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

    如果 OpenClaw 发送的提示过多，请首先降低 `contextWindow`。如果 Ollama 正在加载的运行时上下文对机器来说太大，请降低 `params.num_ctx`。如果生成运行时间太长，请降低 `maxTokens`。

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
    基于 Ollama 的网络搜索的完整设置和行为详情。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
