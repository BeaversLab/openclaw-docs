---
summary: "通过 Amazon Bedrock 使用 API (Converse OpenClaw) 模型"
read_when:
  - 您想通过 Amazon Bedrock 使用 OpenClaw 模型
  - 您需要为模型调用设置 AWS 凭证/区域
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以通过 pi-ai 的 **Bedrock Converse** 流式提供商使用 **Amazon Bedrock** 模型。Bedrock 身份验证使用 **AWS SDK 默认凭证链**，而不是 API 密钥。

## pi-ai 支持的内容

- 提供商：`amazon-bedrock`
- API：`bedrock-converse-stream`
- 身份验证：AWS 凭证（环境变量、共享配置或实例角色）
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）

## 自动模型设备发现

如果检测到 AWS 凭证，OpenClaw 可以自动发现支持 **流式传输** 和 **文本输出** 的 Bedrock 模型。设备发现使用 `bedrock:ListFoundationModels` 并被缓存（默认：1 小时）。

配置选项位于 `models.bedrockDiscovery` 之下：

```json5
{
  models: {
    bedrockDiscovery: {
      enabled: true,
      region: "us-east-1",
      providerFilter: ["anthropic", "amazon"],
      refreshInterval: 3600,
      defaultContextWindow: 32000,
      defaultMaxTokens: 4096,
    },
  },
}
```

备注：

- 当存在 AWS 凭证时，`enabled` 默认为 `true`。
- `region` 默认为 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，然后是 `us-east-1`。
- `providerFilter` 匹配 Bedrock 提供商名称（例如 `anthropic`）。
- `refreshInterval` 为秒数；设置为 `0` 以禁用缓存。
- `defaultContextWindow`（默认：`32000`）和 `defaultMaxTokens`（默认：`4096`）
  用于已发现的模型（如果您知道模型限制，请覆盖）。

## 新手引导

1. 确保 AWS 凭证在 **网关主机** 上可用：

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# Optional:
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="your-profile"
# Optional (Bedrock API key/bearer token):
export AWS_BEARER_TOKEN_BEDROCK="..."
```

2. 将 Bedrock 提供商和模型添加到您的配置中（不需要 `apiKey`）：

```json5
{
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [
          {
            id: "us.anthropic.claude-opus-4-6-v1:0",
            name: "Claude Opus 4.6 (Bedrock)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
    },
  },
}
```

## EC2 实例角色

在附加了 IAM 角色的 EC2 实例上运行 OpenClaw 时，AWS SDK 将自动使用实例元数据服务 (IMDS) 进行身份验证。但是，OpenClaw 的凭证检测目前仅检查环境变量，而不检查 IMDS 凭证。

**变通方法：** 设置 `AWS_PROFILE=default` 以表明 AWS 凭证可用。实际身份验证仍通过 IMDS 使用实例角色。

```bash
# Add to ~/.bashrc or your shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 实例角色的 **所需 IAM 权限**：

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels`（用于自动发现）

或附加托管策略 `AmazonBedrockFullAccess`。

## 快速设置（AWS 路径）

```bash
# 1. Create IAM role and instance profile
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. Attach to your EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. On the EC2 instance, enable discovery
openclaw config set models.bedrockDiscovery.enabled true
openclaw config set models.bedrockDiscovery.region us-east-1

# 4. Set the workaround env vars
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## 注意事项

- Bedrock 要求在您的 AWS 账户/区域中启用 **模型访问权限**。
- 自动发现需要 `bedrock:ListFoundationModels` 权限。
- 如果您使用配置文件，请在网关主机上设置 `AWS_PROFILE`。
- OpenClaw 按以下顺序提供凭证源：`AWS_BEARER_TOKEN_BEDROCK`，然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是默认的 AWS SDK 链。
- 推理支持取决于模型；请查看 Bedrock 模型卡以了解当前功能。
- 如果您偏好托管密钥流程，也可以在 Bedrock 前放置一个 OpenAI 兼容的代理，并将其配置为 OpenAI 提供商。

import zh from "/components/footer/zh.mdx";

<zh />
