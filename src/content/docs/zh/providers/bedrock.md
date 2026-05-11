---
summary: "通过 OpenClaw 使用 Amazon Bedrock (Converse API) 模型"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

OpenClaw 可以通过 pi-ai 的 **Bedrock Converse** 流式提供商使用 **Amazon Bedrock** 模型。Bedrock 认证使用 **AWS SDK 默认凭证链**，而不是 API 密钥。

| 属性   | 值                                                        |
| ------ | --------------------------------------------------------- |
| 提供商 | `amazon-bedrock`                                          |
| API    | `bedrock-converse-stream`                                 |
| 认证   | AWS 凭证（环境变量、共享配置或实例角色）                  |
| 区域   | `AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`） |

## 入门指南

选择您偏好的认证方法并按照设置步骤操作。

<Tabs>
  <Tab title="访问密钥 / 环境变量">
    **最适用于：** 开发者机器、CI 或您直接管理 AWS 凭证的主机。

    <Steps>
      <Step title="在网关主机上设置 AWS 凭证">
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
      </Step>
      <Step title="将 Bedrock 提供商和模型添加到您的配置中">
        不需要 `apiKey`。使用 `auth: "aws-sdk"` 配置提供商：

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
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    使用环境标记认证（`AWS_ACCESS_KEY_ID`、`AWS_PROFILE` 或 `AWS_BEARER_TOKEN_BEDROCK`）时，OpenClaw 会自动启用隐式 Bedrock 提供商进行模型发现，而无需额外配置。
    </Tip>

  </Tab>

  <Tab title="EC2 实例角色 (IMDS)">
    **最适合：** 附加了 IAM 角色的 EC2 实例，使用实例元数据服务进行身份验证。

    <Steps>
      <Step title="显式启用发现">
        使用 IMDS 时，OpenClaw 无法仅通过环境标记检测 AWS 身份验证，因此您必须选择加入：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="（可选）为自动模式添加环境标记">
        如果您还希望基于环境标记的自动检测路径有效（例如，对于 `openclaw status` 界面）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        您 **不** 需要虚假的 API 密钥。
      </Step>
      <Step title="验证模型是否被发现">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    附加到您的 EC2 实例的 IAM 角色必须具有以下权限：

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels` （用于自动发现）
    - `bedrock:ListInferenceProfiles` （用于推理配置文件发现）

    或附加托管策略 `AmazonBedrockFullAccess`。
    </Warning>

    <Note>
    仅当您特别需要为自动模式或状态界面提供环境标记时，才需要 `AWS_PROFILE=default`。实际的 Bedrock 运行时身份验证路径使用 AWS SDK 默认链，因此即使没有环境标记，IMDS 实例角色身份验证仍然有效。
    </Note>

  </Tab>
</Tabs>

## 自动模型发现

OpenClaw 可以自动发现支持 **流式传输**
和 **文本输出** 的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 和
`bedrock:ListInferenceProfiles`，结果会被缓存（默认：1 小时）。

隐式提供商的启用方式：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 为 `true`，
  即使没有 AWS 环境标记，OpenClaw 也会尝试进行发现。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未设置，
  OpenClaw 仅在看到以下 AWS 身份验证标记之一时才会自动添加
  隐式 Bedrock 提供商：
  `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY` 或 `AWS_PROFILE`。
- 实际的 Bedrock 运行时认证路径仍使用 AWS SDK 默认链，因此共享配置、SSO 和 IMDS 实例角色认证即使在设备发现需要 `enabled: true` 选择加入时也能工作。

<Note>对于显式的 `models.providers["amazon-bedrock"]` 条目，OpenClaw 仍然可以从 AWS 环境标记（如 `AWS_BEARER_TOKEN_BEDROCK`）提前解析 Bedrock 环境标记认证，而无需强制加载完整的运行时认证。实际的模型调用认证路径仍使用 AWS SDK 默认链。</Note>

<AccordionGroup>
  <Accordion title="设备发现 config options">
    配置选项位于 `plugins.entries.amazon-bedrock.config.discovery` 下：

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              discovery: {
                enabled: true,
                region: "us-east-1",
                providerFilter: ["anthropic", "amazon"],
                refreshInterval: 3600,
                defaultContextWindow: 32000,
                defaultMaxTokens: 4096,
              },
            },
          },
        },
      },
    }
    ```

    | 选项 | 默认值 | 描述 |
    | ------ | ------- | ----------- |
    | `enabled` | auto | 在自动模式下，OpenClaw 仅在看到支持的 AWS 环境标记时才启用隐式 Bedrock 提供商。设置 `true` 以强制进行设备发现。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用于 API 调用的 AWS 区域。 |
    | `providerFilter` | (all) | 匹配 Bedrock 提供商名称（例如 `anthropic`、`amazon`）。 |
    | `refreshInterval` | `3600` | 缓存持续时间（秒）。设置为 `0` 以禁用缓存。 |
    | `defaultContextWindow` | `32000` | 用于已发现模型的上下文窗口（如果您知道模型限制，请覆盖）。 |
    | `defaultMaxTokens` | `4096` | 用于已发现模型的最大输出令牌（如果您知道模型限制，请覆盖）。 |

  </Accordion>
</AccordionGroup>

## 快速设置（AWS 路径）

本演练将创建一个 IAM 角色，附加 Bedrock 权限，关联实例配置文件，并在 EC2 主机上启用 OpenClaw 设备发现。

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

# 3. On the EC2 instance, enable discovery explicitly
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. Optional: add an env marker if you want auto mode without explicit enable
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## 高级配置

<AccordionGroup>
  <Accordion title="Inference profiles">
    OpenClaw 会与基础模型一起发现**区域和全局推理配置文件**。当配置文件映射到已知的基础模型时，该配置文件将继承该模型的各项功能（上下文窗口、最大令牌数、推理、视觉），并自动注入正确的 Bedrock 请求区域。这意味着跨区域 Claude 配置文件无需手动覆盖提供商即可正常工作。

    推理配置文件 ID 的格式类似于 `us.anthropic.claude-opus-4-6-v1:0`（区域）或 `anthropic.claude-opus-4-6-v1:0`（全局）。如果基础模型已包含在发现结果中，该配置文件将继承其全部功能集；否则将应用安全的默认值。

    无需额外配置。只要启用了发现功能，且 IAM 主体具有 `bedrock:ListInferenceProfiles`，配置文件就会与基础模型一起出现在 `openclaw models list` 中。

  </Accordion>

  <Accordion title="防护措施">
    您可以通过在 `amazon-bedrock` 插件配置中添加 `guardrail` 对象，将 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) 应用于所有 Bedrock 模型调用。防护措施允许您执行内容过滤、主题拒绝、词语过滤、敏感信息过滤和上下文基础检查。

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

    | 选项 | 必填 | 描述 |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | 是 | 防护措施 ID（例如 `abc123`）或完整 ARN（例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。 |
    | `guardrailVersion` | 是 | 已发布的版本号，对于工作草稿则为 `"DRAFT"`。 |
    | `streamProcessingMode` | 否 | 用于流式传输期间防护措施评估的 `"sync"` 或 `"async"`。如果省略，Bedrock 将使用其默认值。 |
    | `trace` | 否 | 用于调试的 `"enabled"` 或 `"enabled_full"`；对于生产环境，请省略或设置为 `"disabled"`。 |

    <Warning>
    网关使用的 IAM 主体除了标准调用权限外，还必须拥有 `bedrock:ApplyGuardrail` 权限。
    </Warning>

  </Accordion>

  <Accordion title="用于记忆搜索的嵌入">
    Bedrock 也可以作为 [memory search](/zh/concepts/memory-search) 的嵌入提供商。
    这是与推理提供商分开配置的——将 `agents.defaults.memorySearch.provider` 设置为 `"bedrock"`：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "bedrock",
            model: "amazon.titan-embed-text-v2:0", // default
          },
        },
      },
    }
    ```

    Bedrock 嵌入使用与推理相同的 AWS SDK 凭证链（实例角色、
    SSO、访问密钥、共享配置和 Web 身份）。不需要 API 密钥。
    当 `provider` 为 `"auto"` 时，如果该凭证链
    解析成功，则会自动检测到 Bedrock。

    支持的嵌入模型包括 Amazon Titan Embed (v1, v2)、Amazon Nova
    Embed、Cohere Embed (v3, v4) 和 TwelveLabs Marengo。请参阅
    [Memory configuration reference -- Bedrock](/zh/reference/memory-config#bedrock-embedding-config)
    以获取完整的模型列表和维度选项。

  </Accordion>

  <Accordion title="注意事项和说明">
    - Bedrock 需要在您的 AWS 账户/区域中启用 **模型 access**。
    - 自动发现需要 `bedrock:ListFoundationModels` 和
      `bedrock:ListInferenceProfiles` 权限。
    - 如果您依赖自动模式，请在网关主机上设置支持的 AWS 认证环境标记之一。
      如果您更喜欢不带环境标记的 IMDS/共享配置认证，请设置
      `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
    - OpenClaw 按以下顺序显示凭证来源：`AWS_BEARER_TOKEN_BEDROCK`，
      然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然后是 `AWS_PROFILE`，最后是
      默认的 AWS SDK 链。
    - 推理支持取决于模型；请查看 Bedrock 模型卡以了解当前功能。
    - 如果您更喜欢托管密钥流，您也可以在 Bedrock 前面放置一个与 OpenAI 兼容的
      代理，并将其配置为 OpenAI 提供商。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Memory search" href="/zh/concepts/memory-search" icon="magnifying-glass">
    用于内存搜索配置的 Bedrock 嵌入。
  </Card>
  <Card title="Memory config reference" href="/zh/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock 嵌入模型列表和维度选项。
  </Card>
  <Card title="Troubleshooting" href="/zh/help/troubleshooting" icon="wrench">
    一般故障排除和常见问题。
  </Card>
</CardGroup>
