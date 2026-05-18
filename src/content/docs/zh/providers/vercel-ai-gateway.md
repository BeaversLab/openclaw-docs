---
summary: "Vercel AI Gateway(网关) 设置（身份验证 + 模型选择）"
title: "Vercel AI Gateway(网关)"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

The [Vercel AI Gateway(网关)](https://vercel.com/ai-gateway) provides a unified API to
access hundreds of models through a single endpoint.

| 属性     | 值                         |
| -------- | -------------------------- |
| 提供商   | `vercel-ai-gateway`        |
| 身份验证 | `AI_GATEWAY_API_KEY`       |
| API      | Anthropic Messages 兼容    |
| 模型目录 | 通过 `/v1/models` 自动发现 |

<Tip>OpenClaw 会自动发现 Gateway(网关) `/v1/models` 目录，因此 `/models vercel-ai-gateway` 包含当前的模型引用，例如 `vercel-ai-gateway/openai/gpt-5.5` 和 `vercel-ai-gateway/moonshotai/kimi-k2.6`。</Tip>

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    运行新手引导并选择 AI Gateway(网关) 身份验证选项：

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="设置默认模型">
    将模型添加到您的 OpenClaw 配置中：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本或 CI 设置，请在命令行中传递所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 模型 ID 简写

OpenClaw 接受 Vercel Claude 简写模型引用，并在
运行时将其规范化：

| 简写输入                            | 规范化的模型引用                              |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>您可以在配置中使用简写或完全限定的模型引用。 OpenClaw 会自动解析规范形式。</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="Environment variable for daemon processes">
    If the OpenClaw Gateway(网关) runs as a daemon (launchd/systemd), make sure
    `AI_GATEWAY_API_KEY` is available to that process.

    <Warning>
    A key exported only in an interactive shell will not be visible to a
    launchd/systemd daemon unless that environment is explicitly imported. Set
    the key in `~/.openclaw/.env` or via `env.shellEnv` to ensure the gateway
    process can read it.
    </Warning>

  </Accordion>

  <Accordion title="Provider routing">
    Vercel AI Gateway(网关) routes requests to the upstream 提供商 based on the 模型
    ref prefix. For example, `vercel-ai-gateway/anthropic/claude-opus-4.6` routes
    through Anthropic, while `vercel-ai-gateway/openai/gpt-5.5` routes through
    OpenAI and `vercel-ai-gateway/moonshotai/kimi-k2.6` routes through
    MoonshotAI. Your single `AI_GATEWAY_API_KEY` handles authentication for all
    upstream providers.
  </Accordion>
  <Accordion title="Thinking levels">
    `/think` options follow trusted upstream 模型 prefixes when OpenClaw knows
    the upstream 提供商 contract. `vercel-ai-gateway/anthropic/...` uses the
    Claude thinking profile, including adaptive defaults for Claude 4.6 models.
    `vercel-ai-gateway/openai/gpt-5.4`, `gpt-5.5`, and Codex-style refs expose
    `/think xhigh` just like the direct OpenAI/OpenAI Codex providers. Other
    namespaced refs keep the normal reasoning levels unless their catalog
    metadata declares more.
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
