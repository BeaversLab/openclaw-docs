---
summary: "通过 OpenClaw 使用 Amazon Bedrock (Converse API) 模型"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以通过 pi‑ai 的 **Bedrock Converse** 流式提供程序使用 **Amazon Bedrock** 模型。Bedrock 认证使用 **AWS SDK 默认凭证链**，而不是 API 密钥。

## pi-ai 支持的功能

- 提供商：`amazon-bedrock`
- API：`bedrock-converse-stream`
- 认证：AWS 凭证（环境变量、共享配置或实例角色）
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）

## 自动模型发现

如果检测到 AWS 凭证，OpenClaw 可以自动发现支持 **streaming** 和 **text output** 的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 并会被缓存（默认：1 小时）。

配置选项位于 `models.bedrockDiscovery` 下：

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

注意：

- 当存在 AWS 凭证时，`enabled` 默认为 `true`。
- `region` 默认为 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，然后是 `us-east-1`。
- `providerFilter` 匹配 Bedrock 提供商名称（例如 `anthropic`）。
- `refreshInterval` 单位为秒；设置为 `0` 可禁用缓存。
- `defaultContextWindow`（默认：`32000`）和 `defaultMaxTokens`（默认：`4096`）
  用于发现的模型（如果您知道模型的限制，可以覆盖）。

## 新手引导

1. 确保在 **gateway host** 上有可用的 AWS 凭证:

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

当在附加了 IAM 角色的 EC2 实例上运行 OpenClaw 时，AWS SDK 将自动使用实例元数据服务 (IMDS) 进行身份验证。但是，OpenClaw 的凭证检测目前仅检查环境变量，而不检查 IMDS 凭证。

**变通方法：** 设置 `AWS_PROFILE=default` 以指示 AWS 凭证
可用。实际身份验证仍通过 IMDS 使用实例角色。

```bash
# Add to ~/.bashrc or your shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 实例角色所需的 **IAM 权限**:

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels`（用于自动发现）

或者附加托管策略 `AmazonBedrockFullAccess`。

## 快速设置 (AWS 路径)

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

## 注意

- Bedrock 要求在您的 AWS 账户/区域中启用 **模型访问权限** (模型 access)。
- 自动发现需要 `bedrock:ListFoundationModels` 权限。
- 如果您使用配置文件，请在网关主机上设置 `AWS_PROFILE`。
- OpenClaw 按以下顺序提取凭证源：`AWS_BEARER_TOKEN_BEDROCK`，
  然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是
  默认的 AWS SDK 链。
- 推理支持取决于模型；请查看 Bedrock 模型卡片以了解
  当前功能。
- 如果您更喜欢托管密钥流程，还可以在 Bedrock 前面放置一个 OpenAI 兼容的代理，并将其配置为 OpenAI 提供商。

## Guardrails

您可以通过在 `amazon-bedrock` 插件配置中添加 `guardrail` 对象，将 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) 应用于所有 Bedrock 模型调用。Guardrails 允许您执行内容过滤、主题拒绝、词汇过滤、敏感信息过滤和上下文基础检查。

```json5
{
  plugins: {
    entries: {
      "amazon-bedrock": {
        config: {
          guardrail: {
            guardrailIdentifier: "abc123", // guardrail ID or full ARN
            guardrailVersion: "1", // version number or "DRAFT"
            streamProcessingMode: "sync", // optional: "sync" or "async"
            trace: "enabled", // optional: "enabled", "disabled", or "enabled_full"
          },
        },
      },
    },
  },
}
```

- `guardrailIdentifier`（必需）接受防护栏 ID（例如 `abc123`）或完整的 ARN（例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。
- `guardrailVersion`（必需）指定要使用哪个已发布的版本，或者指定 `"DRAFT"` 以使用工作草稿。
- `streamProcessingMode`（可选）控制在流式传输期间是同步（`"sync"`）还是异步（`"async"`）运行防护栏评估。如果省略，Bedrock 将使用其默认行为。
- `trace`（可选）在 API 响应中启用防护栏跟踪输出。设置为 `"enabled"` 或 `"enabled_full"` 以进行调试；在生产环境中省略或设置为 `"disabled"`。

网关使用的 IAM 主体除了必须具有标准调用权限外，还必须具有 `bedrock:ApplyGuardrail` 权限。
