---
summary: "使用 OpenClaw 的 Amazon Bedrock (Converse API) 模型"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以透過 pi‑ai 的 **Bedrock Converse** 串流提供者使用 **Amazon Bedrock** 模型。Bedrock 驗證使用 **AWS SDK 預設憑證鏈**，而非 API 金鑰。

## pi-ai 支援項目

- 提供者: `amazon-bedrock`
- API: `bedrock-converse-stream`
- 驗證: AWS 憑證 (環境變數、共用設定或執行個體角色)
- 區域: `AWS_REGION` 或 `AWS_DEFAULT_REGION` (預設: `us-east-1`)

## 自動模型探索

如果偵測到 AWS 憑證，OpenClaw 可以自動發現支援 **串流** 和 **文字輸出** 的 Bedrock 模型。發現使用 `bedrock:ListFoundationModels` 並會快取（預設：1 小時）。

組態選項位於 `models.bedrockDiscovery` 之下：

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

備註：

- 當存在 AWS 憑證時，`enabled` 預設為 `true`。
- `region` 預設為 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，然後是 `us-east-1`。
- `providerFilter` 符合 Bedrock 提供者名稱（例如 `anthropic`）。
- `refreshInterval` 是秒數；設為 `0` 以停用快取。
- `defaultContextWindow` (預設值: `32000`) 和 `defaultMaxTokens` (預設值: `4096`)
  用於已探索的模型 (如果您知道您的模型限制，可以覆寫)。

## 入門指南

1. 確保 **gateway host** 上有可用的 AWS 憑證:

```exec
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# Optional:
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="your-profile"
# Optional (Bedrock API key/bearer token):
export AWS_BEARER_TOKEN_BEDROCK="..."
```

2. 將 Bedrock 提供者和模型新增至您的設定 (不需要 `apiKey`):

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

## EC2 執行個體角色

當在附加了 IAM 角色的 EC2 執行個體上執行 OpenClaw 時，AWS SDK
會自動使用執行個體中繼資料服務 (IMDS) 進行驗證。
然而，OpenClaw 的憑證偵測目前僅檢查環境
變數，而不檢查 IMDS 憑證。

**變通方法:** 設定 `AWS_PROFILE=default` 以表示 AWS 憑證
可用。實際的驗證仍會透過 IMDS 使用執行個體角色。

```exec
# Add to ~/.bashrc or your shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 執行個體角色的 **所需 IAM 權限:**

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels` （用於自動探索）

或附加受管理原則 `AmazonBedrockFullAccess`。

## 快速設定（AWS 路徑）

```exec
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

## 注意事項

- Bedrock 要求在您的 AWS 帳戶/區域中啟用**模型存取權**。
- 自動探索需要 `bedrock:ListFoundationModels` 權限。
- 如果您使用設定檔，請在閘道主機上設定 `AWS_PROFILE`。
- OpenClaw 按此順序公開憑證來源：`AWS_BEARER_TOKEN_BEDROCK`，然後是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，接著是 `AWS_PROFILE`，最後是預設的 AWS SDK 鏈。
- 推論支援取決於模型；請查看 Bedrock 模型卡片以了解目前的功能。
- 如果您偏好託管金鑰流程，也可以在 Bedrock 前放置一個 OpenAI 相容的
  代理，並將其設定為 OpenAI 提供者。
