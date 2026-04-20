---
title: "Vercel AI Gateway(网关)"
summary: "Vercel AI Gateway(网关) 设置 (身份验证 + 模型选择)"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Vercel AI Gateway(网关) 网关

[Vercel AI Gateway(网关)](https://vercel.com/ai-gateway) 提供统一的 API，
通过单个端点访问数百个模型。

| 属性     | 值                         |
| -------- | -------------------------- |
| 提供商   | `vercel-ai-gateway`        |
| 身份验证 | `AI_GATEWAY_API_KEY`       |
| API      | 兼容 Anthropic Messages    |
| 模型目录 | 通过 `/v1/models` 自动发现 |

<Tip>OpenClaw 会自动发现 Gateway(网关)的 `/v1/models` 目录，因此 `/models vercel-ai-gateway` 包含当前的模型引用，例如 `vercel-ai-gateway/openai/gpt-5.4`。</Tip>

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    运行新手引导 (新手引导) 并选择 AI Gateway(网关) 身份验证选项：

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

OpenClaw 接受 Vercel Claude 简写模型引用，并在运行时将其规范化：

| 简写输入                            | 规范化后的模型引用                            |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>您可以在配置中使用简写或完全限定的模型引用。 OpenClaw 会自动解析规范形式。</Tip>

## 高级说明

<AccordionGroup>
  <Accordion title="Environment variable for daemon processes">
    如果 OpenClaw Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保
    `AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对于 launchd/systemd
    守护进程是不可见的，除非明确导入该环境。请在
    `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，以确保 Gateway(网关) 进程可以
    读取它。
    </Warning>

  </Accordion>

  <Accordion title="Provider routing">
    Vercel AI Gateway(网关) 根据模型
    引用前缀将请求路由到上游提供商。例如，`vercel-ai-gateway/anthropic/claude-opus-4.6` 通过
    Anthropic 路由，而 `vercel-ai-gateway/openai/gpt-5.4` 通过
    OpenAI 路由。你唯一的 `AI_GATEWAY_API_KEY` 处理所有
    上游提供商的身份验证。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    一般故障排除和常见问题。
  </Card>
</CardGroup>
