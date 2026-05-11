---
summary: "通过 OpenClaw 使用 Amazon Bedrock Mantle（OpenAI 兼容）模型"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

OpenClaw 包含一个捆绑的 **Amazon Bedrock Mantle** 提供商，它连接到
Mantle OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准
`/v1/chat/completions` 表面托管开源和
第三方模型（GPT-OSS、Qwen、Kimi、GLM 和类似模型）。

| 属性      | 值                                                                                   |
| --------- | ------------------------------------------------------------------------------------ |
| 提供商 ID | `amazon-bedrock-mantle`                                                              |
| API       | `openai-completions` (OpenAI 兼容) 或 `anthropic-messages` (Anthropic Messages 路由) |
| 身份验证  | 显式 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 凭证链 bearer-token 生成                      |
| 默认区域  | `us-east-1` (使用 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆盖)                         |

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="显式 bearer token">
    **最适用于：** 您已经拥有 Mantle bearer token 的环境。

    <Steps>
      <Step title="在网关主机上设置 bearer token">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        可选设置区域（默认为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证是否发现了模型">
        ```bash
        openclaw models list
        ```

        发现的模型显示在 `amazon-bedrock-mantle` 提供商下。除非
        您想要覆盖默认值，否则无需其他配置。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 凭证">
    **最适合：** 使用与 AWS SDK 兼容的凭证（共享配置、SSO、Web 身份、实例或任务角色）。

    <Steps>
      <Step title="在网关主机上配置 AWS 凭证">
        任何与 AWS SDK 兼容的身份验证源均可使用：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型是否已发现">
        ```bash
        openclaw models list
        ```

        OpenClaw 会自动根据凭证链生成 Mantle 不记名令牌 (bearer token)。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会从 AWS 默认凭证链为您铸造不记名令牌，包括共享凭证/配置文件、SSO、Web 身份以及实例或任务角色。
    </Tip>

  </Tab>
</Tabs>

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会直接使用它。否则，
OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle 不记名令牌 (bearer token)。然后，它通过查询该区域的 `/v1/models` 端点来发现可用的 Mantle 模型。

| 行为         | 详情            |
| ------------ | --------------- |
| 设备发现缓存 | 结果缓存 1 小时 |
| IAM 令牌刷新 | 每小时          |

<Note>不记名令牌 (bearer token) 与标准 [Amazon Bedrock](/zh/providers/bedrock) 提供商使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。</Note>

### 支持的区域

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## 手动配置

如果您更喜欢显式配置而不是自动发现：

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

## 高级配置

<AccordionGroup>
  <Accordion title="Reasoning support">
    推理支持是从包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式的模型ID推断出来的。在发现过程中，OpenClaw 会自动为匹配的模型设置 `reasoning: true`。
  </Accordion>

<Accordion title="Endpoint unavailability">如果 Mantle 端点不可用或未返回任何模型，该提供商将被静默跳过。OpenClaw 不会报错；其他配置的提供商会继续正常工作。</Accordion>

  <Accordion title="Claude Opus 4.7 via the Anthropic Messages route">
    Mantle 还公开了一个 Anthropic Messages 路由，该路由通过相同的持有者身份验证流式传输路径传输 Claude 模型。Claude Opus 4.7 (`amazon-bedrock-mantle/claude-opus-4.7`) 可以通过提供商拥有的流式传输调用此路由，因此 AWS 持有者令牌不会被视为 Anthropic API 密钥。

    当您在 Mantle 提供商上固定 Anthropic Messages 模型时，OpenClaw 会针对该模型使用 `anthropic-messages` API 曲面，而不是 `openai-completions`。身份验证仍来自 `AWS_BEARER_TOKEN_BEDROCK`（或铸造的 IAM 持有者令牌）。

    ```json5
    {
      models: {
        providers: {
          "amazon-bedrock-mantle": {
            models: [
              {
                id: "claude-opus-4.7",
                name: "Claude Opus 4.7",
                api: "anthropic-messages",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1000000,
                maxTokens: 32000,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Relationship to Amazon Bedrock 提供商">
    Bedrock Mantle 是一个与标准 [Amazon Bedrock](/zh/providers/bedrock) 提供商分开的提供商。Mantle 使用 OpenAI 兼容的 `/v1` 曲面，而标准 Bedrock 提供商使用原生 Bedrock API。

    这两个提供商在存在时共享相同的 `AWS_BEARER_TOKEN_BEDROCK` 凭证。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/zh/providers/bedrock" icon="cloud">
    用于 Anthropic Claude、Titan 和其他模型的原生 Bedrock 提供商。
  </Card>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 和 auth" href="/zh/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
