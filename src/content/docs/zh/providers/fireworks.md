---
title: "Fireworks"
summary: "Fireworks 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) 通过兼容 OpenAI 的 API 提供开源权重和路由模型。OpenClaw 包含一个捆绑的 Fireworks 提供商插件。

| 属性     | 值                                                     |
| -------- | ------------------------------------------------------ |
| 提供商   | `fireworks`                                            |
| 身份验证 | `FIREWORKS_API_KEY`                                    |
| API      | 兼容 OpenAI 的聊天/补全                                |
| 基础 URL | `https://api.fireworks.ai/inference/v1`                |
| 默认模型 | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## 入门指南

<Steps>
  <Step title="通过新手引导设置 Fireworks 身份验证">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    这会将您的 Fireworks 密钥存储在 OpenClaw 配置中，并将 Fire Pass 入门模型设置为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## 非交互式示例

对于脚本或 CI 设置，请在命令行中传递所有值：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| 模型引用                                               | 名称                        | 输入       | 上下文  | 最大输出 | 备注                           |
| ------------------------------------------------------ | --------------------------- | ---------- | ------- | -------- | ------------------------------ |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | text,image | 256,000 | 256,000  | Fireworks 上的默认捆绑入门模型 |

<Tip>如果 Fireworks 发布了更新的模型，例如新的 Qwen 或 Gemma 版本，您可以使用其 Fireworks 模型 id 直接切换，而无需等待捆绑目录的更新。</Tip>

## 自定义 Fireworks 模型 id

OpenClaw 也接受动态 Fireworks 模型 id。使用 Fireworks 显示的确切模型或路由器 id，并在其前面加上 `fireworks/`。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 id 前缀如何工作">
    OpenClaw 中的每个 Fireworks 模型引用都以 `fireworks/` 开头，后跟 Fireworks 平台上的确切 id 或路由器路径。例如：

    - 路由器模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - 直接模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在构建 API 请求时会去除 `fireworks/` 前缀，并将剩余的路径发送到 Fireworks 端点。

  </Accordion>

  <Accordion title="Environment note">
    如果 Gateway(网关) 在您的交互式 shell 之外运行，请确保 `FIREWORKS_API_KEY` 对该进程也可用。

    <Warning>
    仅位于 `~/.profile` 中的密钥对 launchd/systemd 守护进程没有帮助，除非该环境也在此处被导入。请在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，以确保网关进程可以读取它。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Troubleshooting" href="/en/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
