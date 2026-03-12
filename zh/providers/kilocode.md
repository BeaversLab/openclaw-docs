---
summary: "在 OpenClaw 中使用 Kilo Gateway 的统一 API 访问多个模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway 提供了一个**统一 API**，它将请求路由到单个端点和 API 密钥后面的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 获取 API 密钥

1. 前往 [app.kilo.ai](https://app.kilo.ai)
2. 登录或创建账户
3. 导航至 API Keys 并生成一个新密钥

## CLI 设置

```bash
openclaw onboard --kilocode-api-key <key>
```

或设置环境变量：

```bash
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## 配置片段

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

## 默认模型

默认模型是 `kilocode/kilo/auto`，这是一个智能路由模型，可根据任务自动选择最佳的基础模型：

- 规划、调试和编排任务路由至 Claude Opus
- 代码编写和探索任务路由至 Claude Sonnet

## 可用模型

OpenClaw 在启动时会从 Kilo Gateway 动态发现可用模型。使用
`/models kilocode` 查看您的账户可用的完整模型列表。

网关上可用的任何模型均可配合 `kilocode/` 前缀使用：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## 备注

- 模型引用为 `kilocode/<model-id>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 默认模型：`kilocode/kilo/auto`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 有关更多模型/提供商选项，请参阅 [/concepts/model-providers](/zh/en/concepts/model-providers)。
- Kilo Gateway 在底层使用带有您的 API 密钥的 Bearer 令牌。
