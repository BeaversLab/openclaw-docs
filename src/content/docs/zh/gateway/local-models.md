---
summary: "在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

本地部署是可行的，但 OpenClaw 需要大上下文 + 强有力的提示词注入防御。小显卡会截断上下文并泄露安全性。目标要高：**≥2 台满配的 Mac Studio 或同等 GPU 设备（约 $30k+）**。单块 **24 GB** GPU 仅适用于较轻的提示词且延迟较高。使用你能运行的**最大/完整版模型变体**；激进量化或“小”检查点会增加提示词注入风险（参见 [安全](/zh/gateway/security)）。

如果你想要最低摩擦的本地设置，请从 [LM Studio](/zh/providers/lmstudio) 或 [Ollama](/zh/providers/ollama) 和 `openclaw onboard` 开始。本页面是针对高端本地堆栈和自定义 OpenAI 兼容本地服务器的意见性指南。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方 Ollama Linux 安装程序会启用带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 设置上，自动启动可能会在启动期间重新加载上一个模型并固定主机内存。如果你在启用 Ollama 后 WSL2 VM 反复重启，请参阅 [WSL2 崩溃循环](/zh/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推荐：LM Studio + 大型本地模型（Responses API）

目前最佳的本地堆栈。在 LM Studio 中加载一个大型模型（例如，完整版 Qwen、DeepSeek 或 Llama 构建），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分离。

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
- 在 LM Studio 中，下载**可用的最大模型构建**（避免“small”/重度量化变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出了它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型已加载；冷加载会增加启动延迟。
- 如果你的 LM Studio 构建不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，以便仅发送最终文本。

即使在本地运行时也要保持托管模型的配置；使用 `models.mode: "merge"` 以便回退保持可用。

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

### 本地优先，托管作为安全网

交换主备顺序；保留相同的 providers 代码块和 `models.mode: "merge"`，以便当本地机器故障时可以回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- 托管的 MiniMax/Kimi/GLM 变体也存在于 OpenRouter 上，并具有区域固定的端点（例如，美国托管）。在那里选择区域变体，以将流量保留在您选择的司法管辖区内，同时仍使用 `models.mode: "merge"` 作为 Anthropic/OpenAI 的回退。
- 仅保留本地仍然是最强的隐私路径；当您需要提供商功能但又希望控制数据流时，托管式区域路由是中间地带。

## 其他 OpenAI 兼容的本地代理

如果 MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自定义网关暴露 OpenAI 风格的 `/v1/chat/completions` 端点，则它们可以工作。除非后端明确记录了 `/v1/responses` 支持，否则请使用 Chat Completions 适配器。将上面的提供商代码块替换为您的端点和模型 ID：

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

如果在具有 `baseUrl` 的自定义提供商上省略了 `api`，则 OpenClaw 默认为 `openai-completions`。诸如 `127.0.0.1` 之类的环回端点会自动受信任；LAN、tailnet 和私有 DNS 端点仍然需要 `request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是特定于提供商的。不要在那里包含提供商前缀。例如，使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用此目录 ID 和模型引用：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

保留 `models.mode: "merge"`，以便托管模型作为回退保持可用。对缓慢的本地或远程模型服务器使用 `models.providers.<id>.timeoutSeconds`，然后再引发 `agents.defaults.timeoutSeconds`。提供商超时仅适用于模型 HTTP 请求，包括连接、标头、正文流传输以及受保护的提取中止。

<Note>对于自定义 OpenAI 兼容的提供商，当 `baseUrl` 解析为环回地址、私有 LAN、`.local` 或裸主机名时，允许持久化非机密本地标记（例如 `apiKey: "ollama-local"`）。OpenClaw 将其视为有效的本地凭据，而不是报告缺失密钥。对于接受公共主机名的任何提供商，请使用真实值。</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生
  OpenAI 端点
- 原生的 OpenAI 专用请求整形在此处不适用：无
  `service_tier`，无 Responses `store`，无 OpenAI 推理兼容负载
  整形，也无提示词缓存提示
- 隐藏的 OpenClaw 归因标头（`originator`、`version`、`User-Agent`）
  不会注入到这些自定义代理 URL 中

针对更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在聊天补全中仅接受字符串 `messages[].content`，而不接受
  结构化的内容部分数组。请为
  这些端点设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 某些本地模型以文本形式发出独立的带括号工具请求，例如
  `[tool_name]` 后跟 JSON 以及 `[END_TOOL_REQUEST]`。OpenClaw 仅当名称与该轮次注册的
  工具完全匹配时，才会将这些提升为真正的工具调用；否则，该块将被视为不支持的文本，并
  对用户可见的回复隐藏。
- 如果模型发出的 JSON、XML 或 ReAct 风格文本看起来像工具调用，
  但提供商未发出结构化调用，OpenClaw 会将其保留为
  文本，并在运行 ID、提供商/模型、检测到的模式以及
  工具名称可用时记录警告。应将其视为提供商/模型的工具调用
  不兼容，而非已完成的工具运行。
- 如果工具显示为助手文本而不是运行，例如原始 JSON、
  XML、ReAct 语法，或提供商响应中为空的 `tool_calls` 数组，
  请首先验证服务器是否使用支持工具调用的聊天模板/解析器。对于
  解析器仅在强制使用工具时才工作的 OpenAI 兼容聊天补全后端，请设置每个模型的请求覆盖，而不是依赖文本
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

  仅对每个正常轮次都应调用工具的模型/会话使用此选项。
  它会覆盖 OpenClaw 的默认代理值 `tool_choice: "auto"`。
  将 `local/my-local-model` 替换为 `openclaw models list` 显示的确切提供商/模型引用。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 一些较小或较严格的本地后端在处理 OpenClaw 的完整 agent-runtime 提示形状时可能不稳定，尤其是在包含工具模式时。如果后端在处理微小的直接 `/v1/chat/completions` 调用时有效，但在正常的 OpenClaw agent 轮次中失败，请首先尝试 `agents.defaults.experimental.localModelLean: true` 以移除重量级的默认工具，如 `browser`、`cron` 和 `message`；这是一个实验性标志，而非稳定的默认模式设置。请参阅 [实验性功能](/zh/concepts/experimental-features)。如果仍然失败，请尝试 `models.providers.<provider>.models[].compat.supportsTools: false`。
- 如果后端仅在较大的 OpenClaw 运行中失败，剩余问题通常是上游模型/服务器容量或后端错误，而不是 OpenClaw 的传输层问题。

## 故障排除

- Gateway(网关) 可以访问代理吗？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型是否已卸载？请重新加载；冷启动是常见的“挂起”原因。
- 本地服务器显示 `terminated`、`ECONNRESET`，或在轮次中途关闭流？OpenClaw 会在诊断中记录一个低基数的 `model.call.error.failureKind` 以及 OpenClaw 进程 RSS/堆快照。对于 LM Studio/Ollama 的内存压力，请将该时间戳与服务器日志或 macOS 崩溃/jetsam 日志进行匹配，以确认模型服务器是否被终止。
- 当检测到的上下文窗口低于 **32k** 时，OpenClaw 会发出警告，并在低于 **16k** 时进行阻止。如果遇到此预检错误，请提高服务器/模型的上下文限制或选择更大的模型。
- 上下文错误？降低 `contextWindow` 或提高服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？在该模型条目上添加 `compat.requiresStringContent: true`。
- 微小的直接 `/v1/chat/completions` 调用有效，但 `openclaw infer model run` 在 Gemma 或其他本地模型上失败？首先使用 `compat.supportsTools: false` 禁用工具模式，然后重新测试。如果服务器仍然仅在较大的 OpenClaw 提示时崩溃，则将其视为上游服务器/模型的限制。
- 工具调用显示为原始 JSON/XML/ReAct 文本，或者提供商返回空的 `tool_calls` 数组？不要添加盲目将助手文本转换为工具执行的代理。请先修复服务器聊天模板/解析器。如果模型仅在强制使用工具时才工作，请在上方添加针对该模型的 `params.extra_body.tool_choice: "required"` 覆盖设置，并且该模型条目仅用于预期在每一轮都会调用工具的会话。
- 安全性：本地模型会跳过提供商端的过滤器；请保持代理范围狭窄并启用压缩，以限制提示注入的爆炸半径。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [模型故障转移](/zh/concepts/model-failover)
