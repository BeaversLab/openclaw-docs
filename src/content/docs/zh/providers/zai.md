---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API 密钥进行身份验证。在 Z.AI 控制台中创建您的 API 密钥。OpenClaw 使用 APIGLMGLMAPIAPIOpenClaw`zai`API 提供商配合 Z.AI API 密钥。

| 属性   | 值                                        |
| ------ | ----------------------------------------- |
| 提供商 | `zai`                                     |
| 认证   | `ZAI_API_KEY`（传统别名：`Z_AI_API_KEY`） |
| API    | Z.AI Chat Completions（Bearer 认证）      |

## GLM 模型

GLM 是一个模型系列，而非独立的提供商。在 OpenClaw 中，GLM 模型使用如 GLMOpenClawGLM`zai/glm-5.1` 的引用：提供商 `zai`，模型 ID `glm-5.1`。

## 入门指南

<Tabs>
  <Tab title="Auto-detect endpoint"OpenClawAPI>
    **最佳适用于：** 大多数用户。OpenClaw 会使用您的 API 密钥探测支持的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step title="Run 新手引导">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="Verify the 模型 is listed">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Explicit regional endpoint"API>
    **最佳适用于：** 想要强制使用特定 Coding Plan 或通用 API 表面的用户。

    <Steps>
      <Step title="Pick the right 新手引导 choice">
        ```bash
        # Coding Plan Global (recommended for Coding Plan users)
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN (China region)
        openclaw onboard --auth-choice zai-coding-cn

        # General API
        openclaw onboard --auth-choice zai-global

        # General API CN (China region)
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="Verify the 模型 is listed">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置示例

<Tip>`zai-api-key`OpenClawAPI 让 OpenClaw 从密钥中检测匹配的 Z.AI 端点并 自动应用正确的基础 URL。当您想要强制使用特定的 Coding Plan 或通用 API 表面时，请使用显式的区域选择。</Tip>

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  models: {
    providers: {
      zai: {
        // Example value. Onboarding writes the matching baseUrl for your endpoint.
        baseUrl: "https://api.z.ai/api/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

## 内置目录

OpenClaw 在插件清单中附带了捆绑的 OpenClaw`zai`GLM 提供商目录，因此只读
列表可以在不加载提供商运行时的情况下显示已知的 GLM 模型行：

```bash
openclaw models list --all --provider zai
```

清单支持的目录目前包括：

| 模型参考             | 备注     |
| -------------------- | -------- |
| `zai/glm-5.1`        | 默认模型 |
| `zai/glm-5`          |          |
| `zai/glm-5-turbo`    |          |
| `zai/glm-5v-turbo`   |          |
| `zai/glm-4.7`        |          |
| `zai/glm-4.7-flash`  |          |
| `zai/glm-4.7-flashx` |          |
| `zai/glm-4.6`        |          |
| `zai/glm-4.6v`       |          |
| `zai/glm-4.5`        |          |
| `zai/glm-4.5-air`    |          |
| `zai/glm-4.5-flash`  |          |
| `zai/glm-4.5v`       |          |

<Tip>
GLM 模型可用作 GLM`zai/<model>`（例如：`zai/glm-5`）。
</Tip>

<Note>默认捆绑的模型参考是 `zai/glm-5.1`GLM。GLM 的版本和可用性 可能会发生变化；运行 `openclaw models list --all --provider zai` 以查看 您安装的版本已知的目录。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="GLMForward-resolving unknown GLM-5 models">
    未知的 `glm-5*` ID 仍然可以在捆绑的提供商路径上通过
    从 `glm-4.7`GLM 模板合成提供商拥有的元数据来进行前向解析，当该 ID
    匹配当前的 GLM-5 系列形状时。
  </Accordion>

  <Accordion title="Tool-call streaming">
    默认情况下为 Z.AI 工具调用流式传输启用 `tool_stream`。要禁用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="思考与保留思考">
    Z.AI 的思考功能遵循 OpenClaw 的 `/think` 控制。当思考关闭时，
    OpenClaw 会发送 `thinking: { type: "disabled" }` 以避免在可见文本之前
    将输出预算用于 `reasoning_content`。

    保留思考是可选加入的，因为 Z.AI 需要重放完整的历史 `reasoning_content`，这会增加提示词 token。请针对每个模型启用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.1": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    启用且思考开启时，OpenClaw 会发送
    `thinking: { type: "enabled", clear_thinking: false }` 并重放之前的
    `reasoning_content`，以生成相同的 OpenAI 兼容记录。

    高级用户仍然可以使用 `params.extra_body.thinking` 覆盖确切的提供商负载。

  </Accordion>

  <Accordion title="图像理解">
    捆绑的 Z.AI 插件注册了图像理解功能。

    | 属性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    图像理解是从已配置的 Z.AI 身份验证自动解析的——无需
    额外配置。

  </Accordion>

  <Accordion title="身份验证详情">
    - Z.AI 使用您的 API 密钥进行 Bearer 身份验证。
    - `zai-api-key` 新手引导选项会通过使用您的密钥探测支持的端点，来自动检测匹配的 Z.AI 端点。
    - 当您想强制使用特定的 API 接口时，请使用显式的区域选项 (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`)。
    - 旧版环境变量 `Z_AI_API_KEY` 仍然被接受；如果 `ZAI_API_KEY` 未设置，OpenClaw 会在启动时将其复制到 `ZAI_API_KEY`。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear" OpenClaw>
    完整的 OpenClaw 配置架构，包括提供商和模型设置。
  </Card>
</CardGroup>
