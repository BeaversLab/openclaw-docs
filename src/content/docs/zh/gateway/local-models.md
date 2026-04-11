---
summary: "在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

# 本地模型

本地部署是可行的，但 OpenClaw 需要大型上下文 + 针对提示词注入的强大防御。小显卡会截断上下文并导致安全性泄露。目标定高一点：**≥2 台满配的 Mac Studio 或同等 GPU 设备（约 $30k+）**。单张 **24 GB** GPU 仅适用于负载较轻的提示词，且延迟较高。使用你能运行的**最大 / 完整版模型变体**；激进量化或“小型”检查点会增加提示词注入风险（参见 [Security](/en/gateway/security)）。

如果你想要最低摩擦的本地设置，请从 [Ollama](/en/providers/ollama) 和 `openclaw onboard` 开始。本页面是针对高端本地堆栈和自定义 OpenAI 兼容本地服务器的观点性指南。

## 推荐：LM Studio + 大型本地模型（Responses API）

当前最佳的本地技术栈。在 LM Studio 中加载一个大模型（例如，完整版的 Qwen、DeepSeek 或 Llama 版本），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理过程与最终文本分离开来。

```json5
{
  agents: {
    defaults: {
      model: { primary: “lmstudio/my-local-model” },
      models: {
        “anthropic/claude-opus-4-6”: { alias: “Opus” },
        “lmstudio/my-local-model”: { alias: “Local” },
      },
    },
  },
  models: {
    mode: “merge”,
    providers: {
      lmstudio: {
        baseUrl: “http://127.0.0.1:1234/v1”,
        apiKey: “lmstudio”,
        api: “openai-responses”,
        models: [
          {
            id: “my-local-model”,
            name: “Local Model”,
            reasoning: false,
            input: [“text”],
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
- 如果您的 LM Studio 版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，以便仅发送最终文本。

即使在运行本地模型时，也要保持托管模型的配置；使用 `models.mode: "merge"` 以确保回退功能可用。

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

交换主备顺序；保持相同的 providers 块和 `models.mode: "merge"`，以便在本地机器宕机时回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- OpenRouter 上也存在托管的 MiniMax/Kimi/GLM 变体，并具有区域固定端点（例如，美国托管）。请在那里选择区域变体，以将流量保留在您选择的司法管辖区内，同时仍使用 `models.mode: "merge"` 进行 OpenRouter/Anthropic 回退。
- 仅保留本地仍然是最强的隐私路径；当您需要提供商功能但又希望控制数据流时，托管式区域路由是中间地带。

## 其他 OpenAI 兼容的本地代理

如果 vLLM、LiteLLM、OAI-proxy 或自定义网关暴露了 OpenAI 风格的 `/v1` 端点，它们就可以工作。将上面的提供商块替换为您的端点和模型 ID：

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
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

保留 `models.mode: "merge"`，以便托管模型作为后备保持可用。

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生的
  OpenAI 端点
- 原生的仅限 OpenAI 的请求塑形在此不适用：没有
  `service_tier`，没有 Responses `store`，没有 OpenAI 推理兼容负载
  塑形，也没有提示词缓存提示
- 隐藏的 OpenClaw 归因标头 (`originator`, `version`, `User-Agent`)
  不会注入到这些自定义代理 URL 上

针对更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在聊天补全上仅接受字符串 `messages[].content`，而不接受
  结构化内容部分数组。请为
  这些端点设置
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 一些较小或更严格的本地后端在使用 OpenClaw 的完整
  agent-runtime 提示词形状时不稳定，尤其是当包含工具架构时。如果
  后端对微小的直接 `/v1/chat/completions` 调用有效，但在正常的
  OpenClaw agent 轮次中失败，请首先尝试
  `models.providers.<provider>.models[].compat.supportsTools: false`。
- 如果后端仍然仅在较大的 OpenClaw 运行中失败，剩余的问题
  通常是上游模型/服务器容量或后端错误，而不是 OpenClaw 的
  传输层问题。

## 故障排除

- Gateway(网关) 能连接到代理吗？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸载？重新加载；冷启动是常见的“挂起”原因。
- 上下文错误？降低 `contextWindow` 或提高你的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？
  在该模型条目上添加
  `compat.requiresStringContent: true`。
- 微小的直接 `/v1/chat/completions` 调用有效，但 `openclaw infer model run`
  在 Gemma 或其他本地模型上失败？首先使用
  `compat.supportsTools: false` 禁用工具架构，然后重新测试。如果服务器仍然仅在较大的 OpenClaw 提示词时崩溃，请将其视为上游服务器/模型限制。
- 安全性：本地模型跳过提供商端的过滤器；请保持代理范围狭窄并开启压缩，以限制提示词注入的爆炸半径。
