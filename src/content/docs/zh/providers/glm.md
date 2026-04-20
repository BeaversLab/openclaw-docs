---
summary: "GLM 模型系列概述 + 如何在 OpenClaw 中使用它"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM (智谱)"
---

# GLM 模型

GLM 是通过 Z.AI 平台提供的 **模型系列**（而非公司）。在 OpenClaw 中，可以通过 `zai` 提供商和类似 `zai/glm-5` 的模型 ID 来访问 GLM 模型。

## 入门指南

<Steps>
  <Step title="选择一个身份验证路由并运行新手引导">
    选择与您的 Z.AI 计划和区域相匹配的新手引导选项：

    | 身份验证选项 | 最适合 |
    | ----------- | -------- |
    | `zai-api-key` | 通过端点自动检测进行通用 API 密钥设置 |
    | `zai-coding-global` | Coding Plan 用户（全球） |
    | `zai-coding-cn` | Coding Plan 用户（中国区域） |
    | `zai-global` | 通用 API（全球） |
    | `zai-cn` | 通用 API（中国区域） |

    ```bash
    # Example: generic auto-detect
    openclaw onboard --auth-choice zai-api-key

    # Example: Coding Plan global
    openclaw onboard --auth-choice zai-coding-global
    ```

  </Step>
  <Step title="将 GLM 设置为默认模型">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## 配置示例

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>`zai-api-key` 允许 OpenClaw 从密钥中检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当您想要强制使用特定的 Coding Plan 或通用 API 接口时，请使用显式的区域选项。</Tip>

## 捆绑的 GLM 模型

OpenClaw 目前使用以下 GLM 引用为捆绑的 `zai` 提供商做种子：

| 模型            | 模型             |
| --------------- | ---------------- |
| `glm-5.1`       | `glm-4.7`        |
| `glm-5`         | `glm-4.7-flash`  |
| `glm-5-turbo`   | `glm-4.7-flashx` |
| `glm-5v-turbo`  | `glm-4.6`        |
| `glm-4.5`       | `glm-4.6v`       |
| `glm-4.5-air`   |                  |
| `glm-4.5-flash` |                  |
| `glm-4.5v`      |                  |

<Note>默认的捆绑模型引用是 `zai/glm-5.1`。GLM 的版本和可用性 可能会发生变化；请查看 Z.AI 的文档以获取最新信息。</Note>

## 高级说明

<AccordionGroup>
  <Accordion title="Endpoint auto-detection">
    当您使用 `zai-api-key` 身份验证选项时，OpenClaw 会检查密钥格式
    以确定正确的 Z.AI 基础 URL。显式的区域选项
    (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) 将覆盖
    自动检测并直接固定端点。
  </Accordion>

  <Accordion title="Provider details">
    GLM 模型由 `zai` 运行时提供商提供服务。有关完整的提供商
    配置、区域端点和其他功能，请参阅
    [Z.AI 提供商 docs](/en/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Z.AI 提供商" href="/en/providers/zai" icon="server">
    完整的 Z.AI 提供商配置和区域端点。
  </Card>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
