---
summary: "使用 OpenClaw 中的 StepFun 模型"
read_when:
  - You want StepFun models in OpenClaw
  - You need StepFun setup guidance
title: "StepFun"
---

# StepFun

OpenClaw 包含一个捆绑的 StepFun 提供商插件，具有两个提供商 ID：

- `stepfun` 用于标准端点
- `stepfun-plan` 用于 Step Plan 端点

<Warning>Standard 和 Step Plan 是拥有不同端点和模型引用前缀（`stepfun/...` vs `stepfun-plan/...`）的**独立提供商**。请在中国端点 `.com` 使用中国密钥，在全球端点 `.ai` 使用全球密钥。</Warning>

## 区域和端点概述

| 端点      | 中国 (`.com`)                          | 全球 (`.ai`)                          |
| --------- | -------------------------------------- | ------------------------------------- |
| Standard  | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| Step Plan | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

Auth 环境变量: `STEPFUN_API_KEY`

## 内置目录

Standard (`stepfun`)：

| 模型引用                 | 上下文  | 最大输出 | 备注               |
| ------------------------ | ------- | -------- | ------------------ |
| `stepfun/step-3.5-flash` | 262,144 | 65,536   | 默认 Standard 模型 |

Step Plan (`stepfun-plan`)：

| 模型引用                           | 上下文  | 最大输出 | 备注                  |
| ---------------------------------- | ------- | -------- | --------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536   | 默认 Step Plan 模型   |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536   | 额外的 Step Plan 模型 |

## 入门指南

选择您的提供商界面并按照设置步骤操作。

<Tabs>
  <Tab title="Standard">
    **适用场景：** 通过标准 StepFun 端点进行通用使用。

    <Steps>
      <Step title="选择您的端点区域">
        | 认证选择                      | 端点                         | 区域        |
        | -------------------------------- | -------------------------------- | ------------- |
        | `stepfun-standard-api-key-intl`  | `https://api.stepfun.ai/v1`     | 国际 |
        | `stepfun-standard-api-key-cn`    | `https://api.stepfun.com/v1`    | 中国         |
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl
        ```

        或对于中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-cn
        ```
      </Step>
      <Step title="非交互式替代方案">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider stepfun
        ```
      </Step>
    </Steps>

    ### 模型引用

    - 默认模型：`stepfun/step-3.5-flash`

  </Tab>

  <Tab title="Step Plan">
    **适用场景：** Step Plan 推理端点。

    <Steps>
      <Step title="选择您的端点区域">
        | 认证选择                  | 端点                                | 区域        |
        | ---------------------------- | --------------------------------------- | ------------- |
        | `stepfun-plan-api-key-intl`  | `https://api.stepfun.ai/step_plan/v1`  | 国际 |
        | `stepfun-plan-api-key-cn`    | `https://api.stepfun.com/step_plan/v1` | 中国         |
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl
        ```

        或对于中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-cn
        ```
      </Step>
      <Step title="非交互式替代方案">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider stepfun-plan
        ```
      </Step>
    </Steps>

    ### 模型引用

    - 默认模型：`stepfun-plan/step-3.5-flash`
    - 备用模型：`stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

## 高级

<AccordionGroup>
  <Accordion title="完整配置：标准提供商">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
      agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          stepfun: {
            baseUrl: "https://api.stepfun.ai/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="完整配置：Step Plan 提供商">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
      agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          "stepfun-plan": {
            baseUrl: "https://api.stepfun.ai/step_plan/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
              {
                id: "step-3.5-flash-2603",
                name: "Step 3.5 Flash 2603",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="注意事项">
    - 该提供商已捆绑在 OpenClaw 中，因此无需单独安装插件。
    - `step-3.5-flash-2603` 目前仅在 `stepfun-plan` 上公开。
    - 单个认证流程会为 `stepfun` 和 `stepfun-plan` 同时写入匹配区域的配置文件，因此两者可以一起被发现。
    - 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 来检查或切换模型。
  </Accordion>
</AccordionGroup>

<Note>有关更广泛的提供商概述，请参阅 [模型提供商](/zh/concepts/model-providers)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    提供商、模型和插件的完整配置架构。
  </Card>
  <Card title="模型选择" href="/zh/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="StepFun 平台" href="https://platform.stepfun.com" icon="globe">
    StepFun API 密钥管理和文档。
  </Card>
</CardGroup>
