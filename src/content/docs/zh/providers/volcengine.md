---
title: "火山引擎 (Doubao)"
summary: "火山引擎设置 (Doubao 模型，通用 + 编码端点)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Volcengine 提供商允许访问托管在 Volcano Engine 上的 Doubao 模型和第三方模型，并为通用和编码工作负载提供单独的端点。

| 详情   | 值                                             |
| ------ | ---------------------------------------------- |
| 提供商 | `volcengine` (通用) + `volcengine-plan` (编码) |
| 认证   | `VOLCANO_ENGINE_API_KEY`                       |
| API    | OpenAI-兼容                                    |

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    运行交互式新手引导：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    这将通过单个 API 密钥同时注册通用 (`volcengine`) 和编码 (`volcengine-plan`) 提供商。

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="验证模型可用">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
对于非交互式设置 (CI、脚本)，请直接传递密钥：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## 提供商和端点

| 提供商            | 端点                                      | 使用场景 |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 编码模型 |

<Note>两个提供商均通过单个 API 密钥进行配置。设置会自动注册两者。</Note>

## 可用模型

<Tabs>
  <Tab title="通用 (volcengine)">
    | 模型参考 | 名称 | 输入 | 上下文 | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | text, image | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text, image | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | text, image |
    256,000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | text, image | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | text, image | 128,000 |
  </Tab>
  <Tab title="Coding (volcengine-plan)">
    | 模型引用 | 名称 | 输入 | 上下文 | | ------------------------------------------------- | ------------------------ | ----- | ------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | 文本 | 256,000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | 文本 | 256,000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | 文本 | 200,000 | | `volcengine-plan/kimi-k2-thinking` | Kimi K2
    Thinking | 文本 | 256,000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | 文本 | 256,000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | 文本 | 256,000 |
  </Tab>
</Tabs>

## 高级说明

<AccordionGroup>
  <Accordion title="Default 模型 after 新手引导">
    `openclaw onboard --auth-choice volcengine-api-key` 目前将
    `volcengine-plan/ark-code-latest` 设置为默认模型，同时注册
    通用 `volcengine` 目录。
  </Accordion>

<Accordion title="Model picker fallback behavior">在新手引导/配置模型选择期间，Volcengine 身份验证选择优先 同时选择 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未 加载，OpenClaw 将回退到未过滤的目录，而不是显示 空的提供商范围选择器。</Accordion>

  <Accordion title="Environment variables for daemon processes">
    如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保
    `VOLCANO_ENGINE_API_KEY` 对该进程可用（例如，在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

<Warning>当将 OpenClaw 作为后台服务运行时，在您的 交互式 shell 中设置的环境变量不会自动继承。请参阅上面的守护进程说明。</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration" href="/zh/configuration" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/zh/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
