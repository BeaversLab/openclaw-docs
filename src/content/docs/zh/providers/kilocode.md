---
title: "Kilo Gateway(网关)"
summary: "使用 Kilo Gateway(网关) 的统一 API 访问 OpenClaw 中的许多模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway(网关)

Kilo Gateway(网关) 提供了一个 **统一 API**，可以将请求路由到单个端点和 API 密钥背后的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 可以通过切换基本 URL 来工作。

## 获取 API 密钥

1. 前往 [app.kilo.ai](https://app.kilo.ai)
2. 登录或创建账户
3. 导航到 API 密钥并生成一个新密钥

## CLI 设置

```bash
openclaw onboard --auth-choice kilocode-api-key
```

或者设置环境变量：

```bash
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## 配置代码段

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

默认模型是 `kilocode/kilo/auto`，这是一个由提供商拥有的智能路由模型，由 Kilo Gateway(网关) 管理。

OpenClaw 将 `kilocode/kilo/auto` 视为稳定的默认引用，但不会发布该路由的基于源的任务到上游模型的映射。

## 可用模型

OpenClaw 会在启动时从 Kilo Gateway(网关) 动态发现可用模型。使用
`/models kilocode` 查看您的账户可用的完整模型列表。

网关上可用的任何模型都可以使用 `kilocode/` 前缀：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.4
kilocode/google/gemini-3-pro-preview
...and many more
```

## 注

- 模型引用为 `kilocode/<model-id>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 默认模型：`kilocode/kilo/auto`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 捆绑的回退目录始终包含 `kilocode/kilo/auto` (`Kilo Auto`)，以及
  `input: ["text", "image"]`、`reasoning: true`、`contextWindow: 1000000`
  和 `maxTokens: 128000`
- 启动时，OpenClaw 会尝试 `GET https://api.kilo.ai/api/gateway/models` 并
  将发现的模型合并到静态回退目录之前
- `kilocode/kilo/auto` 背后的精确上游路由由 Kilo Gateway(网关) 拥有，
  而不是硬编码在 OpenClaw 中
- Kilo Gateway(网关) 在源代码中被记录为与 OpenRouter 兼容，因此它保留在
  代理风格的 OpenAI 兼容路径上，而不是原生 OpenAI 请求整形
- Gemini 支持的 Kilo 引用保留在代理-Gemini 路径上，因此 OpenClaw 会在此处保留
  Gemini 思维签名清理，而不启用原生 Gemini
  重放验证或引导重写。
- Kilo 的共享流包装器添加了提供商应用头，并对受支持的具体模型引用规范
  代理推理有效负载。`kilocode/kilo/auto`
  和其他不支持的代理推理提示将跳过该推理注入。
- 有关更多模型/提供商选项，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
- Kilo Gateway(网关) 在底层使用带有您的 API 密钥的 Bearer 令牌。
