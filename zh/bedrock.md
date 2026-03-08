---
summary: "在 OpenClaw 中使用 Amazon Bedrock（Converse API）模型"
read_when:
  - 你想在 OpenClaw 中使用 Amazon Bedrock 模型
  - 你需要配置 AWS 认证/区域以调用模型
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 通过 pi‑ai 的 **Bedrock Converse** 流式 provider 使用 **Amazon Bedrock** 模型。
Bedrock 认证使用 **AWS SDK 默认凭据链**，而不是 API key。

## pi‑ai 支持范围

- Provider：`amazon-bedrock`
- API：`bedrock-converse-stream`
- 认证：AWS 凭据（环境变量、共享配置或实例角色）
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）

## 自动模型发现

如果检测到 AWS 凭据，OpenClaw 可以自动发现支持**流式**和**文本输出**的
Bedrock 模型。发现使用 `bedrock:ListFoundationModels` 并缓存（默认：1 小时）。

配置选项位于 `models.bedrockDiscovery`：

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

说明：

- 当存在 AWS 凭据时，`enabled` 默认 `true`。
- `region` 默认取 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，再回退到 `us-east-1`。
- `providerFilter` 匹配 Bedrock provider 名称（如 `anthropic`）。
- `refreshInterval` 单位为秒；设为 `0` 可禁用缓存。
- `defaultContextWindow`（默认：`32000`）与 `defaultMaxTokens`（默认：`4096`）
  用于被发现的模型（若你了解模型限制可覆盖）。

## 手动设置

1. 确保 **gateway 主机**上可用 AWS 凭据：

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

2. 在配置中添加 Bedrock provider 与模型（无需 `apiKey`）：

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
            id: "anthropic.claude-opus-4-5-20251101-v1:0",
            name: "Claude Opus 4.5 (Bedrock)",
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
      model: { primary: "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0" },
    },
  },
}
```

## EC2 实例角色

当 OpenClaw 运行在带 IAM role 的 EC2 实例上时，AWS SDK 会自动通过
实例元数据服务（IMDS）进行认证。
但 OpenClaw 目前仅检测环境变量中的凭据，而不检查 IMDS 凭据。

**变通方案：** 设置 `AWS_PROFILE=default` 表示 AWS 凭据可用。
实际认证仍会通过 IMDS 使用实例角色完成。

```bash
# Add to ~/.bashrc or your shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 实例角色**所需 IAM 权限**：

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels`（用于自动发现）

或直接绑定托管策略 `AmazonBedrockFullAccess`。

**快速设置：**

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

## 备注

- Bedrock 需要在你的 AWS 账户/区域中启用**模型访问**。
- 自动发现需要 `bedrock:ListFoundationModels` 权限。
- 如果使用 profiles，请在 gateway 主机上设置 `AWS_PROFILE`。
- OpenClaw 按以下顺序识别凭据来源：`AWS_BEARER_TOKEN_BEDROCK`，
  然后 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，再到 `AWS_PROFILE`，
  最后是 AWS SDK 默认链。
- Reasoning 支持取决于模型；请查看 Bedrock 模型卡以确认能力。
- 如果你偏好托管 key 流程，也可以在 Bedrock 前放一个 OpenAI 兼容代理，
  然后以 OpenAI provider 配置。
