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
  <Accordion title="Full config: Standard provider">
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

  <Accordion title="Full config: Step Plan 提供商">
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

  <Accordion title="Notes">
    - The 提供商 is bundled with OpenClaw, so there is no separate plugin install step.
    - `step-3.5-flash-2603` is currently exposed only on `stepfun-plan`.
    - A single auth flow writes region-matched profiles for both `stepfun` and `stepfun-plan`, so both surfaces can be discovered together.
    - Use `openclaw models list` and `openclaw models set <provider/model>` to inspect or switch models.
  </Accordion>
</AccordionGroup>

<Note>For the broader 提供商 overview, see [Model providers](/zh/concepts/model-providers).</Note>

## Related

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh/concepts/model-providers" icon="layers">
    Overview of all providers, 模型 refs, and failover behavior.
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear">
    Full config schema for providers, models, and plugins.
  </Card>
  <Card title="Model selection" href="/zh/concepts/models" icon="brain">
    How to choose and configure models.
  </Card>
  <Card title="StepFun Platform" href="https://platform.stepfun.com" icon="globe">
    StepFun API key management and documentation.
  </Card>
</CardGroup>
