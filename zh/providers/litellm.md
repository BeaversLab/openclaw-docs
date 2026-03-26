---
title: "LiteLLM"
summary: "通过 LiteLLM 代理运行 OpenClaw，以实现统一的模型访问和成本跟踪"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一个开源 LLM 网关，提供统一的 API 接入 100 多个模型提供商。通过 LiteLLM 路由 OpenClaw，即可获得集中的成本跟踪、日志记录，以及无需更改 OpenClaw 配置即可灵活切换后端的能力。

## 为什么要将 LiteLLM 与 OpenClaw 结合使用？

- **成本跟踪** — 精确查看 OpenClaw 在所有模型上的花费
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之间切换，无需更改配置
- **虚拟密钥** — 为 OpenClaw 创建具有消费限制的密钥
- **日志记录** — 完整的请求/响应日志，便于调试
- **故障转移** — 如果主提供商宕机，自动切换

## 快速开始

### 通过新手引导

```bash
openclaw onboard --auth-choice litellm-api-key
```

### 手动设置

1. 启动 LiteLLM 代理：

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. 将 OpenClaw 指向 LiteLLM：

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

这就完成了。OpenClam 现在通过 LiteLLM 进行路由。

## 配置

### 环境变量

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### 配置文件

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
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
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## 虚拟密钥

为 OpenClaw 创建具有消费限制的专用密钥：

```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "openclaw",
    "max_budget": 50.00,
    "budget_duration": "monthly"
  }'
```

将生成的密钥用作 `LITELLM_API_KEY`。

## 模型路由

LiteLLM 可以将模型请求路由到不同的后端。在您的 LiteLLM `config.yaml` 中进行配置：

```yaml
model_list:
  - model_name: claude-opus-4-6
    litellm_params:
      model: claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY
```

OpenClaw 持续请求 `claude-opus-4-6` — LiteLLM 负责处理路由。

## 查看使用情况

检查 LiteLLM 的仪表盘或 API：

```bash
# Key info
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# Spend logs
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## 备注

- LiteLLM 默认运行在 `http://localhost:4000` 上
- OpenClaw 通过兼容 OpenAI 的 `/v1/chat/completions` 端点进行连接
- 所有 OpenClaw 功能均可通过 LiteLLM 正常工作 — 无任何限制

## 另请参阅

- [LiteLLM 文档](https://docs.litellm.ai)
- [模型提供商](/zh/concepts/model-providers)

import zh from "/components/footer/zh.mdx";

<zh />
