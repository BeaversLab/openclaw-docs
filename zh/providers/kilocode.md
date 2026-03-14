---
summary: "使用 Kilo Gateway 网关 的统一 API 访问 OpenClaw 中的许多模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway 网关

Kilo Gateway 网关 提供了一个**统一 API**，它将请求路由到单个端点和 API 密钥后面的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

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

默认模型是 `kilocode/kilo/auto`，这是一种智能路由模型，会根据任务自动选择
最佳的底层模型：

- 规划、调试和编排任务路由至 Claude Opus
- 代码编写和探索任务路由至 Claude Sonnet

## 可用模型

OpenClaw 会在启动时从 Kilo Gateway 网关 动态发现可用模型。使用
`/models kilocode` 查看您的帐户可用的完整模型列表。

网关上可用的任何模型都可以与 `kilocode/` 前缀一起使用：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## 备注

- 模型引用为 `kilocode/<model-id>`（例如，`kilocode/anthropic/claude-sonnet-4`）。
- 默认模型：`kilocode/kilo/auto`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 有关更多模型/提供商选项，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
- Kilo Gateway 网关 在底层使用带有您的 API 密钥的 Bearer 令牌。

import zh from '/components/footer/zh.mdx';

<zh />
