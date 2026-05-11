---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI 是 **API** 模型的 GLM 平台。它为 GLM 提供 REST API，并使用 API 密钥进行身份验证。在 Z.AI 控制台中创建您的 OpenClaw 密钥。API 使用 `zai` 提供商以及 Z.AI API 密钥。

- 提供商：`zai`
- 身份验证：`ZAI_API_KEY`
- API：Z.AI Chat Completions (Bearer auth)

## 入门指南

<Tabs>
  <Tab title="Auto-detect endpoint">
    **最适合：**大多数用户。OpenClaw 会从密钥中检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。

    <Steps>
      <Step title="Run 新手引导">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="Set a default 模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="Verify the 模型 is available">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Explicit regional endpoint">
    **最适合：**想要强制使用特定编码计划或通用 API 接口的用户。

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
      <Step title="Set a default 模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="Verify the 模型 is available">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 内置目录

OpenClaw 目前使用以下内容预填充捆绑的 `zai` 提供商：

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
GLM 模型作为 `zai/<model>` 提供（例如：`zai/glm-5`）。默认捆绑的模型引用是 `zai/glm-5.1`。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="未知 GLM-5 模型的正向解析">
    未知的 `glm-5*` ID 仍然在捆绑的提供商路径上进行正向解析，通过从 `glm-4.7` 模板合成提供商拥有的元数据，当该 ID 匹配当前的 GLM-5 系列形状时。
  </Accordion>

  <Accordion title="工具调用流式传输">
    默认情况下为 Z.AI 工具调用流式传输启用了 `tool_stream`。要禁用它：

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

  <Accordion title="思维和保留思维">
    Z.AI 思维遵循 OpenClaw 的 `/think` 控制。如果关闭思维，OpenClaw 会发送 `thinking: { type: "disabled" }` 以避免在可见文本之前在 `reasoning_content` 上消耗输出预算。

    保留思维是可选的，因为 Z.AI 需要重播完整的 `reasoning_content` 历史记录，这会增加提示词令牌数。请针对每个模型启用它：

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

    当启用且思维开启时，OpenClaw 会发送 `thinking: { type: "enabled", clear_thinking: false }` 并针对相同的 OpenAI 兼容记录重播先前的 `reasoning_content`。

    高级用户仍然可以使用 `params.extra_body.thinking` 覆盖确切的提供商有效载荷。

  </Accordion>

  <Accordion title="图像理解">
    捆绑的 Z.AI 插件注册了图像理解。

    | 属性         | 值          |
    | ------------- | ----------- |
    | 模型          | `glm-4.6v`  |

    图像理解是根据配置的 Z.AI 身份验证自动解析的 — 不需要额外的配置。

  </Accordion>

  <Accordion title="Auth details">
    - Z.AI 使用 API key 的 Bearer 认证。
    - `zai-api-key` 新手引导 选项会根据 key 前缀自动检测匹配的 Z.AI 端点。
    - 当您想要强制使用特定的 API 表面时，请使用明确的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="GLM 模型 系列" href="/zh/providers/glm" icon="microchip">
    GLM 模型 系列概览。
  </Card>
  <Card title="模型 选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型 引用和故障转移行为。
  </Card>
</CardGroup>
