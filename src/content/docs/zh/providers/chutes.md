---
summary: "Chutes 设置（OAuth 或 API 密钥、模型发现、别名）"
title: "Chutes"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

[Chutes](https://chutes.ai) 通过 OpenAI 兼容的 OpenAI 公开源模型目录。OpenClaw 支持绑定的 `chutes` 提供商的浏览器 API 和直接 OpenClaw 密钥认证。

| 属性     | 值                          |
| -------- | --------------------------- |
| 提供商   | `chutes`                    |
| API      | OpenAI 兼容                 |
| Base URL | `https://llm.chutes.ai/v1`  |
| 认证     | OAuth 或 API 密钥（见下文） |

## 入门指南

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="运行 OAuth 新手引导流程">```bash openclaw onboard --auth-choice chutes ``` OpenClaw 在本地启动浏览器流程，或在远程/无头主机上显示 URL + 重定向粘贴流程。OAuth 令牌通过 OpenClaw 认证配置文件自动刷新。</Step>
      <Step title="验证默认模型">完成新手引导后，默认模型将设置为 `chutes/zai-org/GLM-4.7-TEE`，并且绑定的 Chutes 目录已注册。</Step>
    </Steps>
  </Tab>
  <Tab title="API 密钥">
    <Steps>
      <Step title="获取 API 密钥">在 [chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys) 创建密钥。</Step>
      <Step title="运行 API 密钥新手引导流程">```bash openclaw onboard --auth-choice chutes-api-key ```</Step>
      <Step title="验证默认模型">完成新手引导后，默认模型将设置为 `chutes/zai-org/GLM-4.7-TEE`，并且绑定的 Chutes 目录已注册。</Step>
    </Steps>
  </Tab>
</Tabs>

<Note>两种认证路径都会注册绑定的 Chutes 目录并将默认模型设置为 `chutes/zai-org/GLM-4.7-TEE`。运行时环境变量：`CHUTES_API_KEY`、`CHUTES_OAUTH_TOKEN`。</Note>

## 设备发现行为

当 Chutes 身份验证可用时，OpenClaw 会使用该凭据查询 Chutes 目录并使用发现的模型。如果发现失败，OpenClaw 会回退到捆绑的静态目录，以便新手引导和启动仍能正常工作。

## 默认别名

OpenClaw 为捆绑的 Chutes 目录注册了三个便捷别名：

| 别名            | 目标模型                                              |
| --------------- | ----------------------------------------------------- |
| `chutes-fast`   | `chutes/zai-org/GLM-4.7-FP8`                          |
| `chutes-pro`    | `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes-vision` | `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |

## 内置入门目录

捆绑的回退目录包括当前的 Chutes 引用：

| 模型引用                                              |
| ----------------------------------------------------- |
| `chutes/zai-org/GLM-4.7-TEE`                          |
| `chutes/zai-org/GLM-5-TEE`                            |
| `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`             |
| `chutes/moonshotai/Kimi-K2.5-TEE`                     |
| `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |
| `chutes/Qwen/Qwen3-Coder-Next-TEE`                    |
| `chutes/openai/gpt-oss-120b-TEE`                      |

## 配置示例

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="OAuth 覆盖">
    您可以使用可选的环境变量自定义 OAuth 流程：

    | 变量 | 用途 |
    | -------- | ------- |
    | `CHUTES_CLIENT_ID` | 自定义 OAuth 客户端 ID |
    | `CHUTES_CLIENT_SECRET` | 自定义 OAuth 客户端密钥 |
    | `CHUTES_OAUTH_REDIRECT_URI` | 自定义重定向 URI |
    | `CHUTES_OAUTH_SCOPES` | 自定义 OAuth 作用域 |

    请参阅 [Chutes OAuth 文档](https://chutes.ai/docs/sign-in-with-chutes/overview)
    了解重定向应用要求和帮助。

  </Accordion>

  <Accordion title="备注">
    - API 密钥和 OAuth 发现均使用相同的 `chutes` 提供商 ID。
    - Chutes 模型注册为 `chutes/<model-id>`。
    - 如果启动时发现失败，将自动使用捆绑的静态目录。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    提供商规则、模型引用和故障转移行为。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear">
    包括提供商设置在内的完整配置架构。
  </Card>
  <Card title="Chutes" href="https://chutes.ai" icon="arrow-up-right-from-square">
    Chutes 仪表板和 API 文档。
  </Card>
  <Card title="Chutes API keys" href="https://chutes.ai/settings/api-keys" icon="key">
    创建和管理 Chutes API 密钥。
  </Card>
</CardGroup>
