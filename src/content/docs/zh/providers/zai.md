---
summary: "GLMOpenClaw在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API 密钥
进行身份验证。在 Z.AI 控制台中创建您的 API 密钥。OpenClaw 使用 APIGLMGLMAPIAPIOpenClaw`zai`API 提供商
并搭配 Z.AI API 密钥。

- 提供商： `zai`
- 身份验证： `ZAI_API_KEY`
- API：Z.AI Chat Completions (Bearer auth)

## 入门指南

<Tabs>
  <Tab title="自动检测端点"OpenClaw>
    **最适用于：** 大多数用户。OpenClaw 会根据密钥检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="验证模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="指定区域端点"API>
    **最适用于：** 希望强制使用特定 Coding Plan 或常规 API 接口的用户。

    <Steps>
      <Step title="选择正确的新手引导选项">
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
      <Step title="设置默认模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="验证模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 内置目录

OpenClaw 在插件清单中附带了捆绑的 OpenClaw`zai`GLM 提供商目录，因此只读
列表可以在不加载提供商运行时的情况下显示已知的 GLM 行：

```bash
openclaw models list --all --provider zai
```

当前支持清单支持的目录包括：

| 模型参考             | 注意事项 |
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
GLM 模型作为 GLM`zai/<model>` 可用（例如：`zai/glm-5`）。默认的捆绑模型引用是 `zai/glm-5.1`。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="GLM未知 GLM-5 模型的前向解析">
    当 `glm-5*` id 匹配当前的 GLM-5 系列形态时，未知的 `glm-5*` id 仍然会通过从 `glm-4.7`GLM 模板合成提供商拥有的元数据，在捆绑提供商路径上进行前向解析。
  </Accordion>

  <Accordion title="工具调用流式传输">
    对于 Z.AI 工具调用流式传输，`tool_stream` 默认已启用。要禁用它：

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

  <Accordion title="思考与保留思考"OpenClaw>
    Z.AI 的思考功能遵循 OpenClaw 的 `/think`OpenClaw 控制。当思考关闭时，
    OpenClaw 会发送 `thinking: { type: "disabled" }`，以避免响应在输出可见文本之前
    将输出预算消耗在 `reasoning_content` 上。

    保留思考是可选启用的，因为 Z.AI 需要完整重放历史
    `reasoning_content`，这会增加提示词 token。请按模型启用它：

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
    ```OpenClaw

    当启用且思考开启时，OpenClaw 会发送
    `thinking: { type: "enabled", clear_thinking: false }` 并重放先前的
    `reasoning_content`OpenAI，以生成相同的 OpenAI 兼容记录。

    高级用户仍可以使用
    `params.extra_body.thinking` 覆盖确切的提供商负载。

  </Accordion>

  <Accordion title="图像理解">
    捆绑的 Z.AI 插件注册了图像理解功能。

    | 属性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    图像理解功能会根据配置的 Z.AI 身份验证自动解析——无需
    额外配置。

  </Accordion>

  <Accordion title="身份验证详情"API>
    - Z.AI 使用您的 API 密钥进行 Bearer 身份验证。
    - `zai-api-key` 新手引导选择会根据密钥前缀自动检测匹配的 Z.AI 端点。
    - 当您想强制使用特定的 API 接口时，请使用显式区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`API）。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="GLMGLM 模型系列" href="/en/providers/glm" icon="microchip" GLM>
    GLM 模型系列概览。
  </Card>
  <Card title="模型选择" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
