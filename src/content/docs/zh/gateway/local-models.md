---
summary: "OpenClawOpenAI在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

本地模型是可行的。但它们对硬件、上下文大小和提示注入防御提出了更高的要求——显存较小或过度量化的显卡会截断上下文并导致安全泄露。本页面是面向高端本地技术栈和自定义 OpenAI 兼容本地服务器的观点性指南。为了获得最顺畅的新手引导，请从 [LM Studio](OpenAI/en/providers/lmstudioOllama) 或 [Ollama](/zh/providers/ollama) 和 `openclaw onboard` 开始。

对于仅应在选定的模型需要时才启动的本地服务器，请参阅
[Local 模型 services](/zh/gateway/local-model-services)。

## 硬件底线

目标要高：为了获得舒适的代理循环，**至少需要两台配置顶级的 Mac Studios 或等效的 GPU 设备（约 30,000 美元以上）**。单张 **24 GB** GPU 仅适用于延迟较高的轻量级提示。请始终运行**你能承载的最大的/完整版变体**；较小或大量量化的检查点会增加提示注入的风险（请参阅 [Security](/zh/gateway/security)）。

## 选择后端

| 后端                                         | 使用场景                                                            |
| -------------------------------------------- | ------------------------------------------------------------------- |
| [ds4](/zh/providers/ds4)                     | 在 macOS Metal 上运行的本地 DeepSeek V4 Flash，兼容 OpenAI 工具调用 |
| [LM Studio](/zh/providers/lmstudio)          | 首次本地设置、GUI 加载器、原生 Responses API                        |
| LiteLLM / OAI-proxy / 自定义 OpenAI 兼容代理 | 您代理另一个模型 API，并且需要 OpenClaw 将其视为 OpenAI             |
| MLX / vLLM / SGLang                          | 具有 OpenAI 兼容 HTTP 端点的高吞吐量自托管服务                      |
| [Ollama](Ollama/en/providers/ollama)         | CLI 工作流、模型库、免值守 systemd 服务                             |

当后端支持时（LM Studio 支持），请使用 Responses API (API`api: "openai-responses"`)。否则请坚持使用 Chat Completions (`api: "openai-completions"`)。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方 Ollama Linux 安装程序会启用一个带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 设置上，自动启动可能会在启动期间重新加载最后一个模型并固定主机内存。如果在启用 WSL2 后你的 Ollama VM 反复重启，请参阅 [WSL2 崩溃循环](/zh/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推荐：LM Studio + 大型本地模型（Responses API）

目前最佳的本地技术栈。在 LM Studio 中加载一个大型模型（例如，完整版本的 Qwen、DeepSeek 或 Llama 版本），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分离开来。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**设置清单**

- 安装 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下载**可用的最大模型版本**（避免“small”/重度量化变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出了它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型加载；冷加载会增加启动延迟。
- 如果你的 LM Studio 版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，以便仅发送最终文本。

即使在本地运行时，也要保持托管模型已配置；使用 `models.mode: "merge"` 以便回退保持可用。

### 混合配置：托管为主，本地为回退

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### 本地优先，托管兜底

交换主回退顺序；保持相同的 providers 块和 `models.mode: "merge"`，以便当本地机器宕机时可以回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- OpenRouter 上也提供了托管的 MiniMax/Kimi/GLM 变体，并带有区域固定端点（例如，美国托管）。在那里选择区域变体，可以将流量保留在您选择的司法管辖区内，同时仍使用 MiniMaxGLMOpenRouter`models.mode: "merge"`AnthropicOpenAI 作为 Anthropic/OpenAI 的回退方案。
- 纯本地仍然是最强的隐私路径；当您需要提供商功能但希望控制数据流时，托管区域路由是折中方案。

## 其他兼容 OpenAI 的本地代理

MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自定义网关，只要它们暴露了 OpenAI 风格的 `/v1/chat/completions` 端点即可工作。除非后端明确记录了 `/v1/responses` 支持，否则请使用 Chat Completions 适配器。将上面的提供商块替换为您的端点和模型 ID：

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

如果在使用带有 `baseUrl` 的自定义提供商时省略了 `api`，OpenClaw 默认为 `openai-completions`。自定义/本地提供商条目会信任为其精确配置的 `baseUrl` 源站以进行受保护的模型请求，包括环回、局域网、tailnet 和私有 DNS 主机。对其他私有源站的请求仍然需要 `request.allowPrivateNetwork: true`；如果没有明确选择加入，元数据/链路本地源站仍然被阻止。将其设置为 `false` 可以选择退出精确源站信任。

`models.providers.<id>.models[].id` 值是特定于提供商的。不要在那里包含提供商前缀。例如，使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用此目录 ID 和模型引用：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理的视觉模型上设置 `input: ["text", "image"]`，以便将图像附件注入到智能体轮次中。交互式自定义提供商新手引导会推断常见的视觉模型 ID，并且仅询问未知名称。非交互式新手引导使用相同的推断；对于未知的视觉 ID，请使用 `--custom-image-input`；当看似已知的模型在您的端点后实际上是仅文本模型时，请使用 `--custom-text-input`。

保留 `models.mode: "merge"`，以便托管模型保持作为备用可用。在提高 `agents.defaults.timeoutSeconds` 之前，请为缓慢的本地或远程模型服务器使用 `models.providers.<id>.timeoutSeconds`。提供商超时仅适用于模型 HTTP 请求，包括连接、头部、正文流传输以及总的受保护获取中止。如果智能体或运行超时较低，也请提高该上限，因为提供商超时无法延长整个智能体运行。

<Note>对于自定义 OpenAI 兼容提供商，当 `baseUrl` 解析为环回地址、专用局域网、`.local` 或纯主机名时，允许保留非机密本地标记（如 `apiKey: "ollama-local"`）。OpenClaw 将其视为有效的本地凭据，而不是报告缺少密钥。对于任何接受公共主机名的提供商，请使用真实值。</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生
  OpenAI 端点
- 原生 OpenAI 专属的请求塑形在此不适用：没有
  `service_tier`，没有 Responses `store`，没有 OpenAI 推理兼容负载
  塑形，也没有提示缓存提示
- 隐藏的 OpenClaw 归因头部（`originator`、`version`、`User-Agent`）
  不会注入到这些自定义代理 URL 上

更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在聊天补全上仅接受字符串 `messages[].content`，而不接受
  结构化的内容部分数组。请为
  这些端点设置
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 一些本地模型会发出独立的带括号的工具请求作为文本，例如
  `[tool_name]` 后跟 JSON 和 `[END_TOOL_REQUEST]`OpenClaw。OpenClaw 仅当
  该名称完全匹配为该回合注册的
  工具名称时，才会将其提升为真正的工具调用；否则，该块将被视为不支持的文本，并
  从用户可见的回复中隐藏。
- 如果模型发出看起来像工具调用的 JSON、XML 或 ReAct 风格文本，
  但提供商未发出结构化调用，OpenClaw 会将其保留为
  文本并记录一条包含运行 ID、提供商/模型、检测到的模式以及
  工具名称（如果可用）的警告。应将其视为提供商/模型的工具调用
  不兼容，而不是已完成的工具运行。
- 如果工具显示为助手文本而不是正在运行，例如原始 JSON、
  XML、ReAct 语法，或提供商响应中空的 `tool_calls`OpenAI 数组，
  首先请验证服务器是否正在使用支持工具调用的聊天模板/解析器。对于
  解析器仅在强制使用工具时才工作的 OpenAI 兼容聊天补全后端，请设置逐模型请求覆盖，而不是依赖文本
  解析：

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
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

  仅对每个正常回合都应调用工具的模型/会话使用此选项。
  它会覆盖 OpenClaw 的默认代理值 OpenClaw`tool_choice: "auto"`。
  请将 `local/my-local-model` 替换为 `openclaw models list` 显示的
  确切提供商/模型引用。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自定义 OpenAI 兼容模型接受内置配置文件之外的 OpenAI 推理投入（efforts），
  请在模型兼容块中声明它们。在此处添加 OpenAIOpenAI`"xhigh"`
  会使 `/think xhigh`Gateway(网关)、会话选择器、Gateway 验证和 `llm-task`
  验证为该配置的提供商/模型引用暴露相应级别：

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "GPT 5.4 via local proxy",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## 更小或更严格的后端

如果模型加载正常但完整的代理回合行为异常，请采用自上而下的方法 —— 首先确认传输，然后缩小问题范围。

1. **确认本地模型本身有响应。** 没有工具，没有代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **确认 Gateway(网关) 路由。** 仅发送提供的提示 — 跳过记录、AGENTS 引导程序、上下文引擎组装、工具和捆绑的 MCP 服务器，但仍会执行 Gateway(网关) 路由、身份验证和提供商 选择：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **尝试精简模式。** 如果两个探针都通过了，但真正的代理轮次因工具调用格式错误或提示词过大而失败，请启用 `agents.defaults.experimental.localModelLean: true`。它会丢弃三个最重的默认工具（`browser`、`cron`、`message`），从而使提示词形状更小、更不易出错。有关完整说明、何时使用它以及如何确认它已开启，请参阅 [实验性功能 → 本地模型精简模式](/zh/concepts/experimental-features#local-model-lean-mode)。

4. **作为最后的手段完全禁用工具。** 如果精简模式还不够，请为该模型条目设置 `models.providers.<provider>.models[].compat.supportsTools: false`。然后，代理将在该模型上不通过工具调用运行。

5. **除此之外，瓶颈在于上游。** 如果在精简模式和 OpenClaw`supportsTools: false`OpenClaw 之后，后端仍然仅在较大的 OpenClaw 运行时失败，那么剩下的问题通常是上游模型或服务器容量 — 上下文窗口、GPU 内存、kv-cache 驱逐或后端错误。在这一点上，它不是 OpenClaw 的传输层。

## 故障排除

- Gateway(网关) 能到达代理吗？ Gateway(网关)`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸载？重新加载；冷启动是常见的“挂起”原因。
- 本地服务器说 `terminated`、`ECONNRESET`OpenClaw 或在轮次中途关闭流？
  OpenClaw 会记录一个低基数的 `model.call.error.failureKind`OpenClawOllamamacOS 以及
  OpenClaw 进程 RSS/堆快照在诊断信息中。对于 LM Studio/Ollama
  内存压力，请将该时间戳与服务器日志或 macOS 崩溃 /
  jetsam 日志进行匹配，以确认模型服务器是否已被终止。
- OpenClaw 根据检测到的模型窗口或当 OpenClaw`agents.defaults.contextTokens` 降低有效窗口时的无上限模型窗口，派生上下文窗口预检阈值。当低于 20% 时它会发出警告，下限为 **8k**。硬性阻断使用 10% 的阈值，下限为 **4k**，并上限设为有效上下文窗口，因此过大的模型元数据无法拒绝其他情况下有效的用户上限。如果您遇到该预检，请提高服务器/模型上下文限制或选择更大的模型。
- 出现上下文错误？降低 `contextWindow` 或提高您的服务器限制。
- OpenAI 兼容服务器返回 OpenAI`messages[].content ... expected a string`？
  在该模型条目上添加 `compat.requiresStringContent: true`。
- OpenAI 兼容服务器返回 OpenAI`validation.keys` 或提示消息条目仅允许 `role` 和 `content`？
  在该模型条目上添加 `compat.strictMessageKeys: true`。
- 直接微小的 `/v1/chat/completions` 调用有效，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失败？首先检查提供商 URL、模型引用、身份验证
  标记和服务器日志；本地 `model run` 不包含代理工具。
  如果本地 `model run` 成功但更大的代理轮次失败，请使用 `localModelLean` 或 `compat.supportsTools: false` 减少代理工具面。
- 工具调用显示为原始 JSON/XML/ReAct 文本，或者提供商返回空的
  `tool_calls` 数组？不要添加盲目将助手文本转换为工具执行的代理。首先修复服务器聊天模板/解析器。如果
  模型仅在强制使用工具时有效，请在上面添加特定模型的
  `params.extra_body.tool_choice: "required"` 覆盖，并且仅将该模型
  条目用于预计每轮都会进行工具调用的会话。
- 安全性：本地模型跳过提供商端的过滤器；保持代理范围狭窄并启用压缩以限制提示注入的爆炸半径。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [模型故障转移](/zh/concepts/model-failover)
