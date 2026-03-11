---
summary: "使用 Amazon Bedrock (Converse API) 模型"
read_when:
  - "You want to use Amazon Bedrock models with OpenClaw"
  - "You need AWS credential/region setup for model calls"
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以通过 pi‑ai 的 **Bedrock Converse** 流式提供程序使用
**Amazon Bedrock** 模型。Bedrock 身份验证使用 **AWS SDK 默认凭证链**，
而不是 API 密钥。

## pi‑ai 支持的内容

- 提供程序：%%P323%%
- API：%%P324%%
- 身份验证：AWS 凭证（环境变量、共享配置或实例角色）
- 区域：%%P325%% 或 %%P326%%（默认：%%P327%%）

## 自动模型发现

如果检测到 AWS 凭证，OpenClaw 可以自动发现支持**流式传输**和
**文本输出**的 Bedrock 模型。发现使用 %%P328%% 并被缓存
（默认：1 小时）。

配置选项位于 %%P329%% 下：

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

- 当存在 AWS 凭证时，%%P330%% 默认为 %%P331%%。
- %%P332%% 默认为 %%P333%% 或 %%P334%%，然后是 %%P335%%。
- %%P336%% 匹配 Bedrock 提供程序名称（例如 %%P337%%）。
- %%P338%% 是秒数；设置为 %%P339%% 以禁用缓存。
- %%P340%%（默认：%%P341%%）和 %%P342%%（默认：%%P343%%）
  用于发现的模型（如果您知道模型限制，可以覆盖）。

## 设置（手动）

1. 确保 AWS 凭证在 **gateway 主机**上可用：

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

2. 将 Bedrock 提供程序和模型添加到您的配置（不需要 %%P344%%）：

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

在附加了 IAM 角色的 EC2 实例上运行 OpenClaw 时，AWS SDK
将自动使用实例元数据服务 (IMDS) 进行身份验证。
但是，OpenClaw 的凭证检测目前仅检查环境变量，
而不检查 IMDS 凭证。

在附加了 IAM 角色的 EC2 实例上运行 OpenClaw 时，AWS SDK
将自动使用实例元数据服务 (IMDS) 进行身份验证。
但是，OpenClaw 的凭证检测目前仅检查环境变量，
而不检查 IMDS 凭证。

```bash
# Add to ~/.bashrc or your shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

**变通方法：** 设置 %%P345%% 以表示 AWS 凭证可用。
实际身份验证仍然通过 IMDS 使用实例角色。

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- %%P346%%（用于自动发现）

或附加托管策略 %%P347%%。

或附加托管策略 %%P347%%。

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

- Bedrock 要求在您的 AWS 账户/区域中启用**模型访问权限**。
- 自动发现需要 %%P348%% 权限。
- Bedrock 要求在您的 AWS 账户/区域中启用**模型访问权限**。
- 自动发现需要 %%P348%% 权限。
- 如果您使用配置文件，请在 gateway 主机上设置 %%P349%%。
- OpenClaw 按以下顺序显示凭证来源：%%P350%%，
  然后是 %%P351%% + %%P352%%，然后是 %%P353%%，然后是
  默认的 AWS SDK 链。
