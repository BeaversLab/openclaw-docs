---
title: "Arcee AI"
summary: "Arcee AI 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) 通过兼容 OpenAI 的 API 提供对 Trinity 混合专家模型系列的访问。所有 Trinity 模型均采用 Apache 2.0 许可。

可以直接通过 Arcee 平台或通过 [OpenRouter](/zh/providers/openrouter) 访问 Arcee AI 模型。

| 属性     | 值                                                                                   |
| -------- | ------------------------------------------------------------------------------------ |
| 提供商   | `arcee`                                                                              |
| 身份验证 | `ARCEEAI_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter）                  |
| API      | 兼容 OpenAI                                                                          |
| Base URL | `https://api.arcee.ai/api/v1`（直接）或 `https://openrouter.ai/api/v1`（OpenRouter） |

## 入门指南

<Tabs>
  <Tab title="Direct (Arcee platform)">
    <Steps>
      <Step title="获取 API 密钥">
        在 [Arcee AI](https://chat.arcee.ai/) 创建 API 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice arceeai-api-key
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="Via OpenRouter">
    <Steps>
      <Step title="获取 API 密钥">
        在 [API](https://openrouter.ai/keys) 创建 OpenRouter 密钥。
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice arceeai-openrouter
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```

        相同的模型引用适用于直接和 OpenRouter 设置（例如 `arcee/trinity-large-thinking`）。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 非交互式设置

<Tabs>
  <Tab title="直接（Arcee 平台）">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab title="通过 OpenRouter">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

## 内置目录

OpenClaw 目前附带此捆绑的 Arcee 目录：

| 模型引用                       | 名称                   | 输入 | 上下文 | 成本（输入/输出每 1M） | 备注                         |
| ------------------------------ | ---------------------- | ---- | ------ | ---------------------- | ---------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | 文本 | 256K   | $0.25 / $0.90          | 默认模型；启用推理           |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | 文本 | 128K   | $0.25 / $1.00          | 通用；400B 参数，13B 激活    |
| `arcee/trinity-mini`           | Trinity Mini 26B       | 文本 | 128K   | $0.045 / $0.15         | 快速且具有成本效益；函数调用 |

<Tip>新手引导预设将 `arcee/trinity-large-thinking` 设置为默认模型。</Tip>

## 支持的功能

| 功能                                | 支持                         |
| ----------------------------------- | ---------------------------- |
| 流式传输                            | 是                           |
| 工具使用 / 函数调用                 | 是                           |
| 结构化输出（JSON 模式和 JSON 架构） | 是                           |
| 扩展思考                            | 是（Trinity Large Thinking） |

<AccordionGroup>
  <Accordion title="环境说明">
    如果 Gateway(网关) 作为守护进程运行，请确保该进程可以访问 `ARCEEAI_API_KEY`
    （或 `OPENROUTER_API_KEY`）（例如，在
    `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
  </Accordion>

  <Accordion title="OpenRouter 路由">
    通过 OpenRouter 使用 Arcee 模型时，应用相同的 `arcee/*` 模型引用。
    OpenClaw 会根据您的身份验证选择透明地处理路由。有关 OpenRouter
    特定的配置详细信息，请参阅 [OpenRouter 提供商文档](/zh/providers/openrouter)。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/zh/providers/openrouter" icon="shuffle">
    通过单个 API 密钥访问 Arcee 模型和许多其他模型。
  </Card>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
</CardGroup>
