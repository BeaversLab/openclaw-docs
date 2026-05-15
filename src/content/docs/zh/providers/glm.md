---
summary: "GLMOpenClawGLM 模型系列概览及其在 OpenClaw 中的使用方法"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLMGLM (Zhipu)"
---

GLM 是一个通过 [Z.AI](https://z.ai) 平台提供的模型系列（而非公司）。在 OpenClaw 中，可以通过内置的 `zai` 提供商使用类似 `zai/glm-5.1` 的引用来访问 GLM 模型。

| 属性         | 值                                                                          |
| ------------ | --------------------------------------------------------------------------- |
| 提供商 ID    | `zai`                                                                       |
| 插件         | 内置，`enabledByDefault: true`                                              |
| 认证环境变量 | `ZAI_API_KEY` 或 `Z_AI_API_KEY`                                             |
| 新手引导选项 | `zai-api-key`, `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn` |
| API          | OpenAI-compatible                                                           |
| 默认基础 URL | `https://api.z.ai/api/paas/v4`                                              |
| 建议默认值   | `zai/glm-5.1`                                                               |
| 默认图像模型 | `zai/glm-4.6v`                                                              |

## 入门指南

<Steps>
  <Step title="Choose an auth route and run 新手引导">
    选择与您的 Z.AI 计划和区域相匹配的新手引导选项。通用的 `zai-api-key`API 选项会根据密钥的格式自动检测匹配的端点；当您想要强制使用特定的 Coding Plan 或通用 API 接口时，请使用显式的区域选项。

    | Auth choice         | Best for                                            |
    | ------------------- | --------------------------------------------------- |
    | `zai-api-key`API       | 支持端点自动检测的通用 API 密钥                        |
    | `zai-coding-global` | Coding Plan 用户（全球）                          |
    | `zai-coding-cn`     | Coding Plan 用户（中国区域）                    |
    | `zai-global`API        | 通用 API（全球）                                |
    | `zai-cn`API            | 通用 API（中国区域）                          |

    <CodeGroup>

```bash Auto-detect
openclaw onboard --auth-choice zai-api-key
```

```bash Coding Plan (global)
openclaw onboard --auth-choice zai-coding-global
```

```bash Coding Plan (China)
openclaw onboard --auth-choice zai-coding-cn
```

```bash General API (global)
openclaw onboard --auth-choice zai-global
```

```bash General API (China)
openclaw onboard --auth-choice zai-cn
```

    </CodeGroup>

  </Step>
  <Step title="GLM将 GLM 设置为默认模型">
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

<Tip>`zai-api-key`OpenClawAPI 允许 OpenClaw 根据密钥形状检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当您想要固定特定的 Coding Plan 或通用 API 表面时，请使用显式的区域选项。</Tip>

## 内置目录

内置的 `zai`GLM 提供商预设了 13 个 GLM 模型引用。除非另有说明，所有条目均支持推理；`glm-5v-turbo` 和 `glm-4.6v` 除了文本外还接受图像输入。

| 模型引用             | 备注                                  |
| -------------------- | ------------------------------------- |
| `zai/glm-5.1`        | 默认模型。推理，仅文本，202k 上下文。 |
| `zai/glm-5`          | 推理，仅文本，202k 上下文。           |
| `zai/glm-5-turbo`    | 推理，仅文本，202k 上下文。           |
| `zai/glm-5v-turbo`   | 推理，文本 + 图像，202k 上下文。      |
| `zai/glm-4.7`        | 推理，仅文本，204k 上下文。           |
| `zai/glm-4.7-flash`  | 推理，仅文本，200k 上下文。           |
| `zai/glm-4.7-flashx` | 推理，仅文本。                        |
| `zai/glm-4.6`        | 推理，仅文本。                        |
| `zai/glm-4.6v`       | 推理，文本 + 图像。默认图像模型。     |
| `zai/glm-4.5`        | 推理，仅文本。                        |
| `zai/glm-4.5-air`    | 推理，仅文本。                        |
| `zai/glm-4.5-flash`  | 推理，仅文本。                        |
| `zai/glm-4.5v`       | 推理，文本 + 图像。                   |

<Note>GLM 版本和可用性可能会发生变化。运行 GLM`openclaw models list --provider zai` 以查看您已安装版本已知的目录行，并查看 Z.AI 的文档以获取新增或已弃用的模型。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="端点自动检测">
    当您使用 `zai-api-key`OpenClaw 认证选项时，OpenClaw 会检查密钥形状以确定正确的 Z.AI 基础 URL。显式的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）将覆盖自动检测并直接固定端点。
  </Accordion>

  <Accordion title="Provider details"GLM>
    GLM 模型由 `zai` 运行时提供商提供服务。有关完整的提供商配置、区域端点和其他功能，请参阅 [Z.AI 提供商 page](/zh/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Z.AI 提供商" href="/zh/providers/zai" icon="server">
    完整的 Z.AI 提供商配置和区域端点。
  </Card>
  <Card title="Model providers" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/zh/tools/thinking" icon="brain">
    具备推理能力的 GLM 系列的 `/think` 级别。
  </Card>
  <Card title="模型常见问题" href="/zh/help/faq-models" icon="circle-question">
    身份验证配置文件、切换模型以及解决“no profile”错误。
  </Card>
</CardGroup>
