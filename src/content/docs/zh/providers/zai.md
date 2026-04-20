---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API 密钥进行身份验证。在 Z.AI 控制台中创建您的 API 密钥。OpenClaw 使用 `zai` 提供商配合 Z.AI API 密钥。

- 提供商：`zai`
- 身份验证：`ZAI_API_KEY`
- API：Z.AI Chat Completions (Bearer auth)

## 入门指南

<Tabs>
  <Tab title="Auto-detect endpoint">
    **最适用于：**大多数用户。OpenClaw 会从密钥中检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。

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
    **最适用于：**想要强制使用特定 Coding Plan 或通用 API 表面的用户。

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

## 捆绑的 GLM 目录

OpenClaw 目前为捆绑的 `zai` 提供商预设了以下内容：

| 模型引用             | 备注     |
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
GLM 模型以 `zai/<model>` 的形式提供（例如：`zai/glm-5`）。默认的捆绑模型引用是 `zai/glm-5.1`。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="转发解析未知的 GLM-5 模型">
    当 ID 匹配当前的 GLM-5 系列形状时，未知的 `glm-5*` ID 仍然通过从 `glm-4.7` 模板合成提供商拥有的元数据，在捆绑提供商路径上进行转发解析。
  </Accordion>

  <Accordion title="工具调用流式传输">
    默认情况下，为 Z.AI 工具调用流式传输启用了 `tool_stream`。要禁用它：

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

  <Accordion title="图像理解">
    捆绑的 Z.AI 插件注册了图像理解功能。

    | 属性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    图像理解功能是根据配置的 Z.AI 身份验证自动解析的——不需要
    额外的配置。

  </Accordion>

  <Accordion title="身份验证详细信息">
    - Z.AI 使用带有您的 API 密钥的 Bearer 身份验证。
    - `zai-api-key` 新手引导选项会根据密钥前缀自动检测匹配的 Z.AI 端点。
    - 当您想要强制使用特定的 API 接口时，请使用显式的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="GLM 模型系列" href="/zh/providers/glm" icon="microchip">
    GLM 的模型系列概述。
  </Card>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
