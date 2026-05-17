---
summary: "Amazon BedrockOpenAIOpenClaw通过 OpenClaw 使用 Amazon Bedrock Mantle (OpenAI 兼容) 模型"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon BedrockAmazon Bedrock Mantle"
---

OpenClaw 包含一个捆绑的 **Amazon Bedrock Mantle** 提供商，用于连接到 Mantle OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准 OpenClawAmazon BedrockOpenAIQwenGLM`/v1/chat/completions` 接口托管开源和第三方模型（GPT-OSS、Qwen、Kimi、GLM 及类似模型）。

| 属性      | 值                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------- |
| 提供商 ID | `amazon-bedrock-mantle`                                                                             |
| API       | `openai-completions`OpenAI (OpenAI 兼容) 或 `anthropic-messages`Anthropic (Anthropic Messages 路由) |
| 身份验证  | 显式 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 凭证链不记名令牌 生成                                        |
| 默认区域  | `us-east-1` (使用 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆盖)                                        |

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="显式不记名令牌">
    **最适用于：** 您已经拥有 Mantle 不记名令牌的环境。

    <Steps>
      <Step title="在网关主机上设置不记名令牌">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        可选地设置区域（默认为 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型是否已发现">
        ```bash
        openclaw models list
        ```

        被发现的模型出现在 `amazon-bedrock-mantle` 提供商下。除非您想要覆盖默认设置，否则无需额外配置。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 凭证">
    **最适用于：** 使用兼容 AWS SDK 的凭证（共享配置、SSO、Web 身份、实例或任务角色）。

    <Steps>
      <Step title="在网关主机上配置 AWS 凭证">
        任何兼容 AWS SDK 的身份验证源均可使用：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="验证模型是否已发现">
        ```bash
        openclaw models list
        ```OpenClaw

        OpenClaw 会自动根据凭证链生成 Mantle 不记名令牌（bearer token）。
      </Step>
    </Steps>

    <Tip>
    当未设置 `AWS_BEARER_TOKEN_BEDROCK`OpenClaw 时，OpenClaw 会为您从 AWS 默认凭证链铸造不记名令牌，包括共享凭证/配置文件、SSO、Web 身份以及实例或任务角色。
    </Tip>

  </Tab>
</Tabs>

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK`OpenClawOpenClaw 时，OpenClaw 将直接使用它。否则，
OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle 不记名令牌。然后，它通过查询该区域的
`/v1/models` 端点来发现可用的 Mantle 模型。

| 行为         | 详情            |
| ------------ | --------------- |
| 设备发现缓存 | 结果缓存 1 小时 |
| IAM 令牌刷新 | 每小时          |

若要启用 Mantle 插件但禁止自动发现和 IAM 不记名令牌生成，请禁用插件拥有的发现切换开关：

```bash
openclaw config set plugins.entries.amazon-bedrock-mantle.config.discovery.enabled false
```

<Note>不记名令牌与标准 [Amazon Bedrock](/zh/providers/bedrock) 提供商所使用的 `AWS_BEARER_TOKEN_BEDROCK`Amazon Bedrock 相同。</Note>

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
  <Accordion title="推理支持">
    推理支持是根据包含类似 `thinking`、`reasoner` 或 `gpt-oss-120b`OpenClaw 模式的模型 ID 推断出来的。在发现过程中，OpenClaw 会自动为匹配的模型设置 `reasoning: true`。
  </Accordion>

<Accordion title="端点不可用" OpenClaw>
  如果 Mantle 端点不可用或未返回任何模型，该提供商将被静默跳过。OpenClaw 不会报错；其他配置的提供商继续正常工作。
</Accordion>

  <Accordion title="Anthropic通过 Anthropic Messages 路由使用 Claude Opus 4.7"Anthropic>
    Mantle 还公开了一条 Anthropic Messages 路由，通过相同的持有者认证流式路径传输 Claude 模型。Claude Opus 4.7 (`amazon-bedrock-mantle/claude-opus-4.7`AnthropicAPIAnthropicOpenClaw) 可通过此路由调用，使用提供商拥有的流式传输，因此 AWS 持有者令牌不会被视为 Anthropic API 密钥。

    当您在 Mantle 提供商上固定 Anthropic Messages 模型时，OpenClaw 对该模型使用 `anthropic-messages`API API 表面而不是 `openai-completions`。身份验证仍来自 `AWS_BEARER_TOKEN_BEDROCK`（或铸造的 IAM 持有者令牌）。

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

  <Accordion title="Amazon Bedrock与 Amazon Bedrock 提供商的关系"Amazon Bedrock>
    Bedrock Mantle 是与标准 [Amazon Bedrock](/zh/providers/bedrockOpenAI) 提供商分开的提供商。Mantle 使用兼容 OpenAI 的 `/v1`API 表面，而标准 Bedrock 提供商使用原生 Bedrock API。

    两个提供商共享相同的 `AWS_BEARER_TOKEN_BEDROCK` 凭据（如果存在）。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Amazon BedrockAmazon Bedrock" href="/zh/providers/bedrock" icon="cloud" Anthropic>
    适用于 Anthropic Claude、Titan 和其他模型的 Bedrock 原生提供商。
  </Card>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OAuthOAuth and auth" href="/zh/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    常见问题及其解决方法。
  </Card>
</CardGroup>
