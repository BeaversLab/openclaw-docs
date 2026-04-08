---
summary: "在 OpenClaw 中使用 Amazon Bedrock Mantle (OpenAI 兼容) 模型"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw 包含一个捆绑的 **Amazon Bedrock Mantle** 提供商，它连接到
Mantle OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准
`/v1/chat/completions` 接口托管开源和
第三方模型（GPT-OSS、Qwen、Kimi、GLM 等）。

## OpenClaw 支持的内容

- 提供商：`amazon-bedrock-mantle`
- API：`openai-completions` (OpenAI 兼容)
- 身份验证：显式 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 凭证链不记名令牌生成
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION` (默认值：`us-east-1`)

## 自动模型发现

当设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 将直接使用它。否则，
OpenClaw 会尝试从 AWS 默认
凭证链生成 Mantle 不记名令牌，包括共享凭证/配置文件、SSO、Web
身份以及实例或任务角色。然后，它通过查询该区域的 `/v1/models` 端点来发现可用的 Mantle
模型。发现结果会
缓存 1 小时，并且 IAM 派生的不记名令牌每小时刷新一次。

支持的区域：`us-east-1`、`us-east-2`、`us-west-2`、`ap-northeast-1`、
`ap-south-1`、`ap-southeast-3`、`eu-central-1`、`eu-west-1`、`eu-west-2`、
`eu-south-1`、`eu-north-1`、`sa-east-1`。

## 新手引导

1. 在 **网关主机** 上选择一种身份验证路径：

显式不记名令牌：

```bash
export AWS_BEARER_TOKEN_BEDROCK="..."
# Optional (defaults to us-east-1):
export AWS_REGION="us-west-2"
```

IAM 凭证：

```bash
# Any AWS SDK-compatible auth source works here, for example:
export AWS_PROFILE="default"
export AWS_REGION="us-west-2"
```

2. 验证模型是否已发现：

```bash
openclaw models list
```

发现的模型会显示在 `amazon-bedrock-mantle` 提供商下。除非您想要覆盖默认设置，否则
不需要额外的配置。

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

## 注意事项

- 当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 可以使用兼容 AWS SDK 的 IAM 凭证为您生成 Mantle 持有者令牌。
- 持有者令牌与标准 [Amazon Bedrock](/en/providers/bedrock) 提供商所使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。
- 根据包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式的模型 ID，可以推断出是否支持推理功能。
- 如果 Mantle 端点不可用或未返回任何模型，该提供商将被静默跳过。
