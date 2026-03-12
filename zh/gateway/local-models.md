---
summary: "在本地 LLM（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）上运行 OpenClaw"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

# 本地模型

本地部署是可行的，但 OpenClaw 需要大上下文 + 针对提示注入的强有力防御。小显卡会截断上下文并泄露安全风险。目标要高：**≥2 台满配的 Mac Studio 或同等的 GPU 集群（约 $30k+）**。单块 **24 GB** GPU 仅适用于较轻量的提示，且延迟较高。使用**你能运行的最大的 / 完整版模型变体**；激进量化的或“小”检查点会增加提示注入风险（参见[安全](/zh/en/gateway/security)）。

如果您想要最低摩擦力的本地设置，请从 [Ollama](/zh/en/providers/ollama) 和 `openclaw onboard` 开始。本页面是针对高端本地堆栈和自定义 OpenAI 兼容本地服务器的观点指南。

## 推荐：LM Studio + MiniMax M2.5（Responses API，完整版）

目前最佳的本地堆栈。在 LM Studio 中加载 MiniMax M2.5，启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分离。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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
- 在 LM Studio 中，下载**可用的最大的 MiniMax M2.5 版本**（避免“small”/重度量化变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出了该模型。
- 保持模型加载；冷加载会增加启动延迟。
- 如果您的 LM Studio 版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，坚持使用 Responses API，以便仅发送最终文本。

即使在本地运行时，也要保持托管模型的配置；使用 `models.mode: "merge"` 以便回退保持可用。

### 混合配置：托管主用，本地回退

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
        "lmstudio/minimax-m2.5-gs32": { alias: "MiniMax Local" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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

### 本地优先，托管安全网

交换主用和回退顺序；保持相同的 providers 区块和 `models.mode: "merge"`，以便当本地机器宕机时可以回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- OpenRouter 上也存在托管的 MiniMax/Kimi/GLM 变体，并具有区域固定端点（例如，美国托管）。在此处选择区域变体，以将流量保留在您选择的司法管辖区内，同时仍使用 `models.mode: "merge"` 作为 Anthropic/OpenAI 的后备。
- 仅限本地仍然是最强的隐私路径；当您需要提供商功能但希望控制数据流时，托管的区域路由是折衷方案。

## 其他兼容 OpenAI 的本地代理

如果它们公开了 OpenAI 风格的 `/v1` 端点，则 vLLM、LiteLLM、OAI-proxy 或自定义网关都可以工作。将上面的提供商块替换为您的端点和模型 ID：

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

保留 `models.mode: "merge"`，以便托管模型仍可作为后备使用。

## 故障排除

- 网关能否连接到代理？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型是否已卸载？重新加载；冷启动是常见的“挂起”原因。
- 出现上下文错误？降低 `contextWindow` 或提高您的服务器限制。
- 安全性：本地模型跳过提供商端的过滤器；保持代理范围狭窄并启用压缩，以限制提示注入的爆炸半径。
