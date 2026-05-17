---
summary: "OpenClawOpenAI在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

本地模型是可行的。它们同时也提高了对硬件、上下文大小和提示词注入防御的要求——较小或过度量化的显卡会截断上下文并泄露安全性。本页面是针对高端本地技术栈和自定义 OpenAI-compatible 本地服务器的观点指南。为了获得最低摩擦的新手引导，请从 [LM Studio](/zh/providers/lmstudio) 或 [Ollama](/zh/providers/ollama) 和 `openclaw onboard` 开始。

对于仅在所选模型需要时才应启动的本地服务器，请参阅
[Local 模型 services](/zh/gateway/local-model-services)。

## 硬件底线

目标要高：**≥2 台满配的 Mac Studio 或同等 GPU 设备（约 $30k+）** 以获得舒适的 Agent 循环体验。单个 **24 GB** GPU 仅适用于较轻量的提示，且延迟较高。始终运行你能托管的**最大 / 完整版变体**；过小或重度量化的检查点会增加提示注入风险（参见 [安全]/en/gateway/security）。

## 选择后端

| 后端                                         | 使用场景                                            |
| -------------------------------------------- | --------------------------------------------------- |
| [LM Studio]/en/providers/lmstudio            | 首次本地设置，GUI 加载器，原生 Responses API        |
| [Ollama](/zh/providers/ollama)               | CLI 工作流，模型库，免管理的 systemd 服务           |
| MLX / vLLM / SGLang                          | 使用兼容 OpenAI 的 HTTP 端点进行高吞吐量自托管服务  |
| LiteLLM / OAI-proxy / 自定义 OpenAI 兼容代理 | 您代理另一个模型API，并且需要OpenClaw将其视为OpenAI |

当后端支持时，使用 Responses API (`api: "openai-responses"`)（LM Studio 支持）。否则，请坚持使用 Chat Completions (`api: "openai-completions"`)。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方的 Ollama Linux 安装程序启用了带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 设置中，自动启动可能会在启动期间重新加载上一个模型并占用主机内存。如果在启用 WSL2 后您的 Ollama VM 反复重启，请参阅 [WSL2 崩溃循环](/zh/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推荐：LM Studio + 大型本地模型（Responses API）

目前最佳的本地技术栈。在 LM Studio 中加载一个大型模型（例如，完整版的 Qwen、DeepSeek 或 Llama 版本），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理过程与最终文本分离开来。

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
- 在 LM Studio 中，下载**可用的最大模型构建**（避免使用“small”/重度量化版本），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 中列出了它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型已加载状态；冷加载会增加启动延迟。
- 如果您的 LM Studio 版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，以便仅发送最终文本。

即使在运行本地模型时，也要保持托管模型的配置；使用 `models.mode: "merge"` 以确保回退方案可用。

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

### 本地优先，托管为安全网

交换主备顺序；保留相同的 providers 块和 `models.mode: "merge"`，以便当本地机器宕机时，可以回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- 托管版的 MiniMax/Kimi/GLM 变体也存在于 OpenRouter 上，并带有区域固定的端点（例如，美国托管）。在那里选择区域变体，以便在将流量保留在您选择的司法管辖区内的同时，仍使用 MiniMaxGLMOpenRouter`models.mode: "merge"`AnthropicOpenAI 作为 Anthropic/OpenAI 的后备。
- 仅限本地仍然是最强的隐私路径；当您需要提供商功能但希望控制数据流时，托管区域路由是折中方案。

## 其他 OpenAI 兼容的本地代理

MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自定义网关均可，前提是它们暴露 OpenAI 风格的 `/v1/chat/completions` 端点。请使用 Chat Completions 适配器，除非后端明确记录了 `/v1/responses` 支持。将上面的 提供商 代码块替换为您的端点和模型 ID：

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

如果在使用 `baseUrl` 的自定义提供商上省略了 `api`，OpenClaw 默认为
`openai-completions`。诸如 `127.0.0.1` 之类的环回端点会
自动受到信任；LAN、tailnet 和私有 DNS 端点仍然需要
`request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是提供商本地的。不要
在那里包含提供商前缀。例如，使用
`mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用此
目录 ID 和模型引用：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理的视觉模型上设置 `input: ["text", "image"]`，以便将图像附件注入到代理轮次中。交互式自定义提供商新手引导会推断常见的视觉模型 ID，并仅询问未知名称。非交互式新手引导使用相同的推断；对于未知的视觉 ID，请使用 `--custom-image-input`；当看似已知的模型在您的端点背后仅为文本模型时，请使用 `--custom-text-input`。

保留 `models.mode: "merge"`，以便托管模型作为回退选项保持可用。
对于缓慢的本地或远程模型服务器，请在提高 `agents.defaults.timeoutSeconds` 之前使用 `models.providers.<id>.timeoutSeconds`。提供商超时仅适用于模型 HTTP 请求，包括连接、标头、正文流传输以及受保护 fetch 的整体中止。

<Note>对于自定义 OpenAI 兼容的提供商，当 `baseUrl` 解析为环回地址、私有局域网、`.local`OpenAI 或纯主机名时，持久化非机密本地标记（例如 OpenClaw`apiKey: "ollama-local"`）是可以接受的。OpenClaw 会将其视为有效的本地凭据，而不是报告缺失密钥。对于接受公共主机名的任何提供商，请使用真实值。</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生 OpenAI 端点
- 原生的 OpenAI 专用请求整形在此不适用：没有 `service_tier`，没有 Responses `store`，没有 OpenAI 推理兼容负载整形，也没有提示缓存提示。
- 隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）
  不会注入到这些自定义代理 URL 中

与更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在 Chat Completions 上仅接受字符串 `messages[].content`，而不接受
  结构化 content-part 数组。请为
  这些端点设置
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 某些本地模型会以文本形式发出独立的带括号工具请求，例如
  `[tool_name]` 后接 JSON 和 `[END_TOOL_REQUEST]`。OpenClaw 仅当名称
  完全匹配该回合的已注册工具时，才会将这些请求提升为真正的工具调用；否则，该块将被视为不受支持的文本，
  并在用户可见的回复中隐藏。
- 如果一个模型发出了看起来像工具调用的 JSON、XML 或 ReAct 风格文本，但提供商没有发出结构化调用，OpenClaw 会将其保留为文本，并记录一条包含运行 ID、提供商/模型、检测到的模式以及可用工具名称的警告。应将其视为提供商/模型的工具调用不兼容，而不是一次完成的工具运行。
- 如果工具显示为助手文本而不是运行，例如原始 JSON、
  XML、ReAct 语法或提供商响应中的空 `tool_calls` 数组，
  首先验证服务器是否正在使用支持工具调用的聊天模板/解析器。对于
  解析器仅在强制使用工具时才工作的 OpenAI 兼容聊天补全后端，
  请设置针对每个模型的请求覆盖，而不是依赖文本
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

  仅在每个正常轮次都应调用工具的模型/会话中使用此项。
  它会覆盖 OpenClaw 的默认代理值 `tool_choice: "auto"`。
  将 `local/my-local-model` 替换为 `openclaw models list` 中显示的精确提供商/模型引用。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自定义 OpenAI 兼容模型接受内置配置文件之外的 OpenAI 推理工作，请在模型兼容块中声明它们。在此处添加 `"xhigh"` 会使 `/think xhigh`、会话选择器、Gateway(网关) 验证和 `llm-task` 验证为该配置的提供商/模型引用公开级别：

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

如果模型加载正常但完整代理回合行为异常，请采用自顶向下的方法排查——首先确认传输层，然后缩小排查范围。

1. **确认本地模型本身有响应。** 不使用工具，不使用代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **确认 Gateway(网关) 路由。** 仅发送提供的提示 — 跳过记录、AGENTS 引导程序、上下文引擎组装、工具和捆绑的 MCP 服务器，但仍然执行 Gateway(网关) 路由、身份验证和提供商选择：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **尝试精简模式。** 如果两次探测都通过了，但实际的代理轮次失败，表现为工具调用格式错误或提示过大，请启用 `agents.defaults.experimental.localModelLean: true`。它会丢弃三个最重的默认工具（`browser`、`cron`、`message`），从而使提示形状更小且更不易出错。请参阅 [实验性功能 → 本地模型精简模式](/zh/concepts/experimental-features#local-model-lean-mode) 了解完整说明、使用时机以及如何确认其已开启。

4. **完全禁用工具作为最后的手段。** 如果精简模式还不够，请为该模型条目设置 `models.providers.<provider>.models[].compat.supportsTools: false`。然后，该智能体将在该模型上运行而不进行工具调用。

5. **除此之外，瓶颈在于上游。** 如果后端在精简模式和 `supportsTools: false` 之后仍然仅在较大的 OpenClaw 运行时失败，剩余的问题通常是上游 OpenClaw 或服务器容量——上下文窗口、GPU 内存、KV 缓存逐出或后端错误。此时并非 OpenClaw 的传输层问题。

## 故障排除

- Gateway(网关)能否访问代理？Gateway(网关)`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型是否已卸载？重新加载；冷启动是常见的“挂起”原因。
- 本地服务器显示 `terminated`、`ECONNRESET`，或者在生成过程中关闭了流？
  OpenClaw 会记录一个基数值较低的 `model.call.error.failureKind` 以及
  诊断信息中的 OpenClaw 进程 RSS/堆快照。对于 LM Studio/Ollama
  内存压力情况，请将该时间戳与服务器日志或 macOS 崩溃/
  jetsam 日志进行比对，以确认模型服务器是否被终止。
- OpenClaw 从检测到的模型窗口推导上下文窗口预检阈值，或者当 OpenClaw`agents.defaults.contextTokens` 降低有效窗口时，从无上限的模型窗口推导。它在低于 20% 时发出警告，下限为 **8k**。硬性阻断使用 10% 的阈值，下限为 **4k**，并受限于有效上下文窗口，因此过大的模型元数据不会拒绝其他有效的用户上限。如果你遇到该预检限制，请提高服务器/模型上下文限制或选择更大的模型。
- 出现上下文错误？请降低 `contextWindow` 或提高您的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？
  在该模型条目上添加 `compat.requiresStringContent: true`。
- OpenAI 兼容的服务器返回 OpenAI`validation.keys` 或提示消息条目仅允许 `role` 和 `content`？
  在该模型条目上添加 `compat.strictMessageKeys: true`。
- 直接的小型 `/v1/chat/completions` 调用有效，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失败？请先检查提供商 URL、模型引用、auth
  标记和服务器日志；本地 `model run` 不包含代理工具。
  如果本地 `model run` 成功但更大的代理轮次失败，请通过 `localModelLean` 或 `compat.supportsTools: false` 减少代理工具表面。
- 工具调用显示为原始 JSON/XML/ReAct 文本，或者提供商返回一个空的 `tool_calls` 数组？不要添加盲目地将助手文本转换为工具执行的代理。首先修复服务器的聊天模板/解析器。如果模型仅在强制使用工具时才工作，请在上文添加每个 `params.extra_body.tool_choice: "required"` 的覆盖项，并且仅在每个回合都需要工具调出的会话中使用该模型条目。
- 安全性：本地模型会跳过提供商侧的过滤器；请保持代理的狭义性并开启压缩，以限制提示注入的波及范围。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [模型故障转移](/zh/concepts/model-failover)
