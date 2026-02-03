---
summary: "在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - 需要从自有 GPU 机器提供模型
  - 接入 LM Studio 或 OpenAI 兼容代理
  - 需要更安全的本地模型建议
title: "本地模型"
---
# 本地模型

本地可行，但 OpenClaw 需要超大上下文与强抗提示注入能力。小卡会截断上下文并削弱安全。目标配置：**≥2 台顶配 Mac Studio 或等价 GPU 机（~$30k+）**。单张 **24 GB** GPU 仅适合轻量提示且延迟更高。尽量使用**你能运行的最大/完整模型变体**；激进量化或“小模型”会增加提示注入风险（见 [Security](/zh/gateway/security)）。

## 推荐：LM Studio + MiniMax M2.1（Responses API，完整版）

当前最佳本地栈。将 MiniMax M2.1 加载到 LM Studio，启用本地服务器（默认 `http://127.0.0.1:1234`），使用 Responses API 以保持推理与最终文本分离。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.1-gs32" },
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "lmstudio/minimax-m2.1-gs32": { alias: "Minimax" }
      }
    }
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
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

**设置清单**
- 安装 LM Studio：https://lmstudio.ai
- 在 LM Studio 下载**可用的最大 MiniMax M2.1 构建**（避免 “small”/重度量化），启动服务器，并确认 `http://127.0.0.1:1234/v1/models` 能列出它。
- 保持模型常驻；冷启动会增加延迟。
- 若 LM Studio 构建参数不同，请调整 `contextWindow`/`maxTokens`。
- WhatsApp 建议使用 Responses API，确保仅发送最终文本。

即便使用本地，也保留托管模型配置；使用 `models.mode: "merge"` 以保留回退。

### 混合配置：托管主模型 + 本地回退

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.1-gs32", "anthropic/claude-opus-4-5"]
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
        "lmstudio/minimax-m2.1-gs32": { alias: "MiniMax Local" },
        "anthropic/claude-opus-4-5": { alias: "Opus" }
      }
    }
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
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

### 本地优先 + 托管安全网

将 primary 与 fallback 顺序互换；保留相同 providers block 与 `models.mode: "merge"`，以便在本地宕机时回退 Sonnet 或 Opus。

### 区域托管 / 数据路由

- OpenRouter 也有托管的 MiniMax/Kimi/GLM 变体，支持区域固定端点（例如 US 托管）。可在保证 `models.mode: "merge"` 的同时选区域版本，以将流量限制在指定辖区，并保留 Anthropic/OpenAI 回退。
- 完全本地仍是隐私最强路径；区域托管是在需要 provider 功能但想控制数据流时的折中方案。

## 其他 OpenAI 兼容本地代理

vLLM、LiteLLM、OAI-proxy 或自定义网关只要暴露 OpenAI 风格 `/v1` 端点即可。用你的端点与模型 ID 替换上面的 provider block：

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
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

保持 `models.mode: "merge"` 以便托管模型仍可作为回退。

## 排查
- Gateway 是否可访问代理？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型未加载？重新加载；冷启动常导致“卡住”。
- 上下文错误？降低 `contextWindow` 或提高服务器限制。
- 安全：本地模型没有 provider 侧过滤；保持 agent 角色收敛并开启 compaction，降低提示注入的影响范围。
