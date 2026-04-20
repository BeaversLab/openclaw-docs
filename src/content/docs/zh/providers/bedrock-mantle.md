---
summary: "将 Amazon Bedrock Mantle（OpenAI 兼容）模型与 OpenClaw 配合使用"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw 包含一个捆绑的 **Amazon Bedrock Mantle** 提供商，该提供商连接到
Mantle OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准
`/v1/chat/completions` 表面托管开源和
第三方模型（GPT-OSS、Qwen、Kimi、GLM 和类似模型）。

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 提供商 ID | `amazon-bedrock-mantle`                                      |
| API       | `openai-completions` (OpenAI 兼容)                           |
| 认证      | 显式 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 凭证链不记名令牌生成  |
| 默认区域  | `us-east-1` (通过 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆盖) |

## 入门指南

选择您首选的认证方法并按照设置步骤操作。

<Tabs>
  <Tab title="显式不记名令牌">
    **最适用于：** 您已经拥有 Mantle 不记名令牌的环境。

    <Steps>
      <Step title="在网关主机上设置不记名令牌">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        （可选）设置区域（默认为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型是否已发现">
        ```bash
        openclaw models list
        ```

        发现的模型将显示在 `amazon-bedrock-mantle` 提供商下。除非
        您想要覆盖默认值，否则无需进行其他配置。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 凭证">
    **最佳用于：** 使用与 AWS SDK 兼容的凭证（共享配置、SSO、Web 身份、实例或任务角色）。

    <Steps>
      <Step title="在网关主机上配置 AWS 凭证">
        任何与 AWS SDK 兼容的身份验证源均可使用：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型已发现">
        ```bash
        openclaw models list
        ```

        OpenClaw 会自动从凭证链生成 Mantle 持有者令牌。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会代表您从 AWS 默认凭证链铸造持有者令牌，包括共享凭证/配置文件、SSO、Web 身份以及实例或任务角色。
    </Tip>

  </Tab>
</Tabs>

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 将直接使用它。否则，
OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle 持有者令牌。然后，它通过查询该区域的 `/v1/models` 端点来发现可用的 Mantle 模型。

| 行为         | 详情            |
| ------------ | --------------- |
| 发现缓存     | 结果缓存 1 小时 |
| IAM 令牌刷新 | 每小时          |

<Note>持有者令牌与标准 [Amazon Bedrock](/en/providers/bedrock) 提供商使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。</Note>

### 支持的区域

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## 手动配置

如果您倾向于使用显式配置而不是自动发现：

```json5
{
  models: {
    providers: {
      "amazon-bedrock-mantle": {
        baseUrl: "https://bedrock-mantle.us-east-1.api.aws/v1",
        api: "openai-completions",
        auth: "api-key",
        apiKey: "env:AWS_BEARER_TOKEN_BEDROCK",
        models: [
          {
            id: "gpt-oss-120b",
            name: "GPT-OSS 120B",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

## 高级说明

<AccordionGroup>
  <Accordion title="Reasoning support">
    推理支持是根据包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式的模型ID推断的。在发现过程中，OpenClaw 会自动为匹配的模型设置 `reasoning: true`。
  </Accordion>

<Accordion title="Endpoint unavailability">如果 Mantle 端点不可用或未返回任何模型，该提供商将被静默跳过。OpenClaw 不会报错；其他配置的提供商将继续正常工作。</Accordion>

  <Accordion title="Relationship to Amazon Bedrock 提供商">
    Bedrock Mantle 是与标准 [Amazon Bedrock](/en/providers/bedrock) 提供商分开的提供商。Mantle 使用 OpenAI 兼容的 `/v1` 表面，而标准 Bedrock 提供商使用原生的 Bedrock API。

    两个提供商在存在时共享同一个 `AWS_BEARER_TOKEN_BEDROCK` 凭证。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/en/providers/bedrock" icon="cloud">
    用于 Anthropic Claude、Titan 和其他模型的原生 Bedrock 提供商。
  </Card>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth and auth" href="/en/gateway/authentication" icon="key">
    身份验证详情和凭证重用规则。
  </Card>
  <Card title="Troubleshooting" href="/en/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
