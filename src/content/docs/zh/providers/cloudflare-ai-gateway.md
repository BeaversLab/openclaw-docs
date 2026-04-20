---
title: "Cloudflare AI Gateway(网关)"
summary: "Cloudflare AI Gateway(网关) 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

# Cloudflare AI Gateway(网关) 网关

Cloudflare AI Gateway(网关) 网关 位于提供商 API 的前端，允许您添加分析、缓存和控制功能。对于 Anthropic，OpenClaw 通过您的 Gateway(网关) 网关 端点使用 Anthropic Messages API。

| 属性     | 值                                                                                       |
| -------- | ---------------------------------------------------------------------------------------- |
| 提供商   | `cloudflare-ai-gateway`                                                                  |
| 基础 URL | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`               |
| 默认模型 | `cloudflare-ai-gateway/claude-sonnet-4-5`                                                |
| API 密钥 | `CLOUDFLARE_AI_GATEWAY_API_KEY` （您通过 Gateway(网关) 发起请求所使用的提供商 API 密钥） |

<Note>对于通过 Cloudflare AI Gateway(网关) 路由的 Anthropic 模型，请使用您的 **Anthropic API 密钥**作为提供商密钥。</Note>

## 入门指南

<Steps>
  <Step title="设置提供商 API 密钥和 Gateway(网关) 详情">
    运行新手引导并选择 Cloudflare AI Gateway(网关) 身份验证选项：

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    系统将提示您输入账户 ID、Gateway(网关) ID 和 API 密钥。

  </Step>
  <Step title="设置默认模型">
    将该模型添加到您的 OpenClaw 配置中：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
        },
      },
    }
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本化或 CI 设置，请在命令行中传递所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## 高级配置

<AccordionGroup>
  <Accordion title="已验证的 Gateway(网关)">
    如果您在 Cloudflare 中启用了 Gateway(网关) 身份验证，请添加 `cf-aig-authorization` 请求头。这是在您提供商 API 密钥**之外**的设置。

    ```json5
    {
      models: {
        providers: {
          "cloudflare-ai-gateway": {
            headers: {
              "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
            },
          },
        },
      },
    }
    ```

    <Tip>
    `cf-aig-authorization` 请求头用于向 Cloudflare Gateway(网关) 本身进行身份验证，而提供商 API 密钥（例如您的 Anthropic 密钥）用于向上游提供商进行身份验证。
    </Tip>

  </Accordion>

  <Accordion title="Environment note">
    如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 对该进程可用。

    <Warning>
    仅存在于 `~/.profile` 中的密钥对 launchd/systemd 守护进程无效，除非该环境也已在那里导入。在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 设置，以确保网关进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Troubleshooting" href="/en/help/troubleshooting" icon="wrench">
    通用故障排除和常见问题。
  </Card>
</CardGroup>
