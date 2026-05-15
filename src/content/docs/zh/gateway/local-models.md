---
summary: "OpenClawOpenAI在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

本地模型是可行的。但它们也对硬件、上下文大小和提示词注入防御提出了更高要求——较小或过度量化的显卡会截断上下文并导致安全性泄漏。本页面是关于高端本地堆栈和自定义 OpenAI 兼容本地服务器的观点性指南。为了获得最低阻力的新手引导，请从 [LM Studio](OpenAI/en/providers/lmstudioOllama) 或 [Ollama](/zh/providers/ollama) 和 `openclaw onboard` 开始。

## 硬件底线

目标要高：为了获得舒适的智能体循环，**需要 ≥2 台满配的 Mac Studio 或同等级别的 GPU 装置（约 3 万美元以上）**。单张 **24 GB** 的 GPU 仅能以较高延迟处理较轻量的提示词。请始终运行**你能托管的最大的 / 完整尺寸的变体**；较小或重度量化的检查点会增加提示词注入的风险（参见[安全性](/zh/gateway/security)）。

## 选择后端

| 后端                                         | 使用场景                                                  |
| -------------------------------------------- | --------------------------------------------------------- |
| [LM Studio](/zh/providers/lmstudio)          | 首次本地设置、GUI 加载器、原生 Responses API              |
| [Ollama](Ollama/en/providers/ollama)         | CLI 工作流、模型库、免维护 systemd 服务                   |
| MLX / vLLM / SGLang                          | 具有 OpenAI 兼容 HTTP 端点的高吞吐量自托管服务            |
| LiteLLM / OAI-proxy / 自定义 OpenAI 兼容代理 | 你代理了另一个模型 API，并且需要 OpenClaw 将其视为 OpenAI |

当后端支持时（LM Studio 支持），请使用 Responses API (API`api: "openai-responses"`)。否则请坚持使用 Chat Completions (`api: "openai-completions"`)。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方的 Ollama Linux 安装程序会启用一个带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 设置中，自动启动可能会在启动期间重新加载最后一个模型并锁定主机内存。如果您的 WSL2 虚拟机在启用 Ollama 后反复重启，请参阅 [WSL2 崩溃循环](/zh/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推荐：LM Studio + 大型本地模型 (Responses API)

目前最佳的本地技术栈。在 LM Studio 中加载一个大型模型（例如，完整尺寸的 Qwen、DeepSeek 或 Llama 版本），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分离开来。

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
- 在 LM Studio 中，下载**可用的最大模型版本**（避免“small”/重度量化变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出了该模型。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型已加载；冷加载会增加启动延迟。
- 如果您的 LM Studio 版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，以便仅发送最终文本。

即使在本地运行时，也要保持托管模型的配置；使用 `models.mode: "merge"` 以便回退保持可用。

### 混合配置：托管为主，本地为备

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

交换主回退顺序；保持相同的 providers 块和 `models.mode: "merge"`，以便在本地机器宕机时可以回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- OpenRouter 上也存在托管的 MiniMax/Kimi/GLMOpenRouter 变体，并具有区域固定的端点（例如，美国托管）。在那里选择区域变体，可以在将流量保留在您选择的司法管辖区内的同时，仍使用 `models.mode: "merge"` 作为 Anthropic/OpenAI 的后备。
- 纯本地仍然是最强的隐私路径；当您需要提供商功能但希望控制数据流时，托管的区域路由是折中方案。

## 其他兼容 OpenAI 的本地代理

如果它们暴露了 OpenAI 风格的 `/v1/chat/completions` 端点，MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自定义网关都可以工作。除非后端明确记录了 `/v1/responses` 支持，否则请使用 Chat Completions 适配器。将上面的提供商块替换为您的端点和模型 ID：

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

如果具有 `baseUrl` 的自定义提供商上省略了 `api`，OpenClaw 默认为 `openai-completions`。诸如 `127.0.0.1` 之类的环回端点会自动受信任；LAN、tailnet 和私有 DNS 端点仍需要 `request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是特定于提供商的。不要在那里包含提供商前缀。例如，使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用此目录 ID 和模型引用：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理的视觉模型上设置 `input: ["text", "image"]`，以便将图像附件注入到代理轮次中。交互式自定义提供商新手引导会推断常见的视觉模型 ID，并仅询问未知名称。非交互式新手引导使用相同的推断；对于未知的视觉 ID 使用 `--custom-image-input`，或者当已知外观的模型在您的端点后仅为文本时使用 `--custom-text-input`。

保留 `models.mode: "merge"`，以便托管模型作为后备保持可用。
在提高 `agents.defaults.timeoutSeconds` 之前，请针对缓慢的本地或远程模型服务器使用 `models.providers.<id>.timeoutSeconds`。提供商超时仅适用于模型 HTTP 请求，包括连接、头部、正文流传输以及整个受保护的获取中止。

<Note>对于自定义的 OpenAI 兼容提供商，当 `baseUrl` 解析为环回地址、私有局域网、`.local`OpenAI 或裸主机名时，允许持久化非机密本地标记（如 OpenClaw`apiKey: "ollama-local"`）。OpenClaw 会将其视为有效的本地凭据，而不会报告密钥缺失。对于接受公共主机名的任何提供商，请使用真实值。</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生
  OpenAI 端点
- 原生的仅限 OpenAI 的请求塑形在此不适用：无
  OpenAI`service_tier`，无 Responses `store`OpenAI，无 OpenAI 推理兼容负载
  塑形，且无提示缓存提示
- 隐藏的 OpenClaw 归属头部（OpenClaw`originator`、`version`、`User-Agent`）
  不会注入到这些自定义代理 URL 上

针对更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在聊天补全上仅接受字符串 `messages[].content`，而不接受
  结构化内容部分数组。请为
  这些端点设置
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 某些本地模型会将独立的带括号工具请求作为文本发出，例如
  后跟 JSON 的 `[tool_name]` 和 `[END_TOOL_REQUEST]`OpenClaw。仅当名称与该轮次注册的工具
  完全匹配时，OpenClaw 才会将这些提升为真正的工具调用；否则，该块将被视为不支持的文本，并
  在用户可见的回复中隐藏。
- 如果模型发出的 JSON、XML 或 ReAct 风格的文本看起来像工具调用，但提供商未发出结构化调用，则 OpenClaw 会将其保留为文本，并记录一条包含运行 ID、提供商/模型、检测到的模式以及工具名称（如果有）的警告。应将其视为提供商/模型工具调用不兼容，而不是已完成的工具运行。
- 如果工具显示为助手文本而不是运行，例如提供商响应中的原始 JSON、XML、ReAct 语法或空的 `tool_calls` 数组，请首先验证服务器是否正在使用支持工具调用的聊天模板/解析器。对于仅在使用工具被强制时解析器才工作的 OpenAI 兼容 Chat Completions 后端，请设置每个模型的请求覆盖，而不是依赖文本解析：

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

  仅对每个正常回合都应调用工具的模型/会话使用此设置。它会覆盖 OpenClaw 的默认代理值 `tool_choice: "auto"`。将 `local/my-local-model` 替换为 `openclaw models list` 显示的确切提供商/模型引用。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自定义 OpenAI 兼容模型接受内置配置文件之外的 OpenAI 推理工作负载 (reasoning efforts)，请在模型兼容块中声明它们。在此处添加 `"xhigh"` 会使 `/think xhigh`、会话选择器、Gateway(网关) 验证和 `llm-task` 验证为该配置的提供商/模型引用暴露该级别：

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

如果模型加载正常但完整的代理回合行为异常，请自上而下地进行排查 —— 首先确认传输，然后缩小排查范围。

1. **确认本地模型本身有响应。** 不使用工具，不使用代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **确认 Gateway(网关) 路由。** 仅发送提供的提示 —— 跳过记录、AGENTS 引导、上下文引擎组装、工具和捆绑的 MCP 服务器，但仍会执行 Gateway(网关) 路由、身份验证和提供商选择：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **尝试精简模式。** 如果两个探针都通过了，但实际的 Agent 轮次因格式错误的工具调用或过大的提示词而失败，请启用 `agents.defaults.experimental.localModelLean: true`。它会丢弃三个最重的默认工具（`browser`、`cron`、`message`），使提示词形状更小、更不易出错。请参阅 [实验功能 → 本地模型精简模式](/zh/concepts/experimental-features#local-model-lean-mode) 了解完整解释、何时使用它以及如何确认它已开启。

4. **作为最后的手段，完全禁用工具。** 如果精简模式还不够，请为该模型条目设置 `models.providers.<provider>.models[].compat.supportsTools: false`。然后，Agent 将在该模型上不使用工具调用进行操作。

5. **除此之外，瓶颈在于上游。** 如果在精简模式和 `supportsTools: false` 之后，后端仍然仅在较大的 OpenClaw 运行时失败，那么剩下的问题通常是上游模型或服务器容量的问题——上下文窗口、GPU 内存、kv-cache 驱逐或后端错误。此时这已不是 OpenClaw 的传输层问题。

## 故障排除

- Gateway(网关) 能访问代理吗？ `curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸载？重新加载；冷启动是常见的“挂起”原因。
- 本地服务器显示 `terminated`、`ECONNRESET`，或者在轮次中途关闭了流？
  OpenClaw 会在诊断信息中记录一个低基数的 `model.call.error.failureKind` 以及
  OpenClaw 进程的 RSS/堆快照。对于 LM Studio/Ollama
  的内存压力，请将该时间戳与服务器日志或 macOS 崩溃 /
  jetsam 日志进行匹配，以确认模型服务器是否被终止。
- OpenClaw 根据检测到的模型窗口推导上下文窗口预检阈值，或者当 `agents.defaults.contextTokens` 降低有效窗口时，根据无限制的模型窗口推导。它在低于 20% 时发出警告，下限为 **8k**。硬性阻断使用 10% 的阈值，下限为 **4k**，上限为有效上下文窗口，因此过大的模型元数据无法拒绝其他方面有效的用户上限。如果您遇到该预检，请提高服务器/模型上下文限制或选择更大的模型。
- 上下文错误？降低 `contextWindow` 或提高您的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？
  在该模型条目上添加 `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 调用有效，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失败？首先检查提供商 URL、模型引用、授权
  标记和服务器日志；本地 `model run` 不包含代理工具。
  如果本地 `model run` 成功但大型代理轮次失败，请使用 `localModelLean` 或 `compat.supportsTools: false` 减少代理工具范围。
- 工具调用显示为原始 JSON/XML/ReAct 文本，或者提供商返回了
  空的 `tool_calls` 数组？不要添加盲目将助手
  文本转换为工具执行的代理。首先修复服务器聊天模板/解析器。如果
  模型仅在强制使用工具时有效，请在上方添加逐模型的
  `params.extra_body.tool_choice: "required"` 覆盖，并且仅在期望每轮都有工具调用的会话中使用该模型条目。
- 安全性：本地模型会跳过提供商端过滤器；保持代理范围狭窄并开启压缩，以限制提示注入的破坏半径。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [模型故障转移](/zh/concepts/model-failover)
