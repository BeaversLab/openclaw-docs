---
summary: "使用 OpenClaw 的 Amazon Bedrock (Converse API) 模型"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以透過 pi-ai 的 **Bedrock Converse** 串流提供者使用 **Amazon Bedrock** 模型。Bedrock 驗證使用的是 **AWS SDK 預設憑證鏈**，而非 API 金鑰。

| 屬性   | 值                                                       |
| ------ | -------------------------------------------------------- |
| 提供者 | `amazon-bedrock`                                         |
| API    | `bedrock-converse-stream`                                |
| 驗證   | AWS 憑證 (環境變數、共享設定或執行個體角色)              |
| 區域   | `AWS_REGION` 或 `AWS_DEFAULT_REGION` (預設：`us-east-1`) |

## 開始使用

選擇您偏好的驗證方法並依照設定步驟進行。

<Tabs>
  <Tab title="存取金鑰 / 環境變數">
    **最適用於：** 開發機器、CI，或您直接管理 AWS 憑證的主機。

    <Steps>
      <Step title="在閘道主機上設定 AWS 憑證">
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
      <Step title="將 Bedrock 提供者和模型新增至您的設定">
        不需要 `apiKey`。使用 `auth: "aws-sdk"` 設定提供者：

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
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    使用環境標記驗證 (`AWS_ACCESS_KEY_ID`、`AWS_PROFILE` 或 `AWS_BEARER_TOKEN_BEDROCK`)，OpenClaw 會自動啟用隱含的 Bedrock 提供者以進行模型探索，無需額外設定。
    </Tip>

  </Tab>

  <Tab title="EC2 執行個體角色 (IMDS)">
    **最適用於：** 附加了 IAM 角色的 EC2 執行個體，使用執行個體中繼資料服務進行驗證。

    <Steps>
      <Step title="明確啟用探索">
        使用 IMDS 時，OpenClaw 無法僅透過環境變數標記偵測 AWS 驗證，因此您必須選擇加入：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="選擇性為自動模式新增環境變數標記">
        如果您還希望環境變數標記自動偵測路徑能夠運作（例如，針對 `openclaw status` 介面）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        您**不**需要虛假的 API 金鑰。
      </Step>
      <Step title="驗證模型已探索到">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    附加至您 EC2 執行個體的 IAM 角色必須具備下列權限：

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels` (用於自動探索)
    - `bedrock:ListInferenceProfiles` (用於推論設定檔探索)

    或附加受管政策 `AmazonBedrockFullAccess`。
    </Warning>

    <Note>
    只有當您特別需要自動模式或狀態介面的環境變數標記時，才需要 `AWS_PROFILE=default`。實際的 Bedrock 執行階段驗證路徑使用 AWS SDK 預設鏈，因此即使沒有環境變數標記，IMDS 執行個體角色驗證也能運作。
    </Note>

  </Tab>
</Tabs>

## 自動模型探索

OpenClaw 可以自動探索支援 **串流**
和 **文字輸出** 的 Bedrock 模型。探索使用 `bedrock:ListFoundationModels` 和
`bedrock:ListInferenceProfiles`，結果會被快取（預設：1 小時）。

隱含提供者如何啟用：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 為 `true`，
  即使沒有 AWS 環境變數標記，OpenClaw 也會嘗試探索。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未設定，
  OpenClaw 僅在看到下列其中一個 AWS 驗證標記時才會自動新增
  隱含 Bedrock 提供者：
  `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY` 或 `AWS_PROFILE`。
- 實際的 Bedrock 執行階段驗證路徑仍然使用 AWS SDK 預設鏈，因此即使當發現需要 `enabled: true` 才能加入時，共享設定、SSO 和 IMDS 執行個體角色驗證仍然可以運作。

<Note>對於明確的 `models.providers["amazon-bedrock"]` 項目，OpenClaw 仍然可以從 AWS 環境標記（例如 `AWS_BEARER_TOKEN_BEDROCK`）提早解析 Bedrock 環境標記驗證，而無需強制載入完整的執行階段驗證。實際的模型呼叫驗證路徑仍然使用 AWS SDK 預設鏈。</Note>

<AccordionGroup>
  <Accordion title="Discovery config options">
    設定選項位於 `plugins.entries.amazon-bedrock.config.discovery` 之下：

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

    | 選項 | 預設值 | 描述 |
    | ------ | ------- | ----------- |
    | `enabled` | auto | 在自動模式下，OpenClaw 僅在看到支援的 AWS 環境標記時才會啟用隱含的 Bedrock 提供者。設定 `true` 以強制發現。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用於發現 API 呼叫的 AWS 區域。 |
    | `providerFilter` | (全部) | 符合 Bedrock 提供者名稱（例如 `anthropic`、`amazon`）。 |
    | `refreshInterval` | `3600` | 快取持續時間（以秒為單位）。設定為 `0` 以停用快取。 |
    | `defaultContextWindow` | `32000` | 用於已發現模型的內容視窗（如果您知道模型的限制，請覆寫）。 |
    | `defaultMaxTokens` | `4096` | 用於已發現模型的最大輸出 Token（如果您知道模型的限制，請覆寫）。 |

  </Accordion>
</AccordionGroup>

## 快速設定 (AWS 路徑)

此逐步指南會建立 IAM 角色、附加 Bedrock 權限、關聯執行個體設定檔，並在 EC2 主機上啟用 OpenClaw 發現功能。

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

## 進階設定

<AccordionGroup>
  <Accordion title="Inference profiles">
    OpenClaw 會在發現基礎模型的同時，發現 **區域和全域推理設定檔**。當設定檔對應到已知的基礎模型時，該設定檔會繼承該模型的功能（上下文視窗、最大 token 數、推理、視覺），並且會自動注入正確的 Bedrock 請求區域。這意味著跨區域 Claude 設定檔無需手動覆寫提供者即可運作。

    推理設定檔 ID 看起來像 `us.anthropic.claude-opus-4-6-v1:0` (區域)
    或 `anthropic.claude-opus-4-6-v1:0` (全域)。如果支援模型已經在發現結果中，設定檔會繼承其完整功能集；否則會套用安全的預設值。

    不需要額外的配置。只要啟用了發現功能並且 IAM 主體擁有 `bedrock:ListInferenceProfiles`，設定檔就會與基礎模型一起出現在 `openclaw models list` 中。

  </Accordion>

  <Accordion title="Guardrails">
    您可以將 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
    應用於所有 Bedrock 模型調用，方法是在 `amazon-bedrock` 插件配置中新增一個 `guardrail` 物件。Guardrails 讓您可以強制執行內容過濾、
    主題拒絕、詞彙過濾、敏感資訊過濾以及上下文
    基礎檢查。

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

    | 選項 | 必填 | 說明 |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | 是 | Guardrail ID (例如 `abc123`) 或完整 ARN (例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`)。 |
    | `guardrailVersion` | 是 | 已發布的版本號，或 `"DRAFT"` 代表工作草稿。 |
    | `streamProcessingMode` | 否 | `"sync"` 或 `"async"` 用於串流期間的 guardrail 評估。如果省略，Bedrock 將使用其預設值。 |
    | `trace` | 否 | `"enabled"` 或 `"enabled_full"` 用於偵錯；在生產環境中省略或設定為 `"disabled"`。 |

    <Warning>
    閘道使用的 IAM 主體除了標準調用權限外，還必須擁有 `bedrock:ApplyGuardrail` 權限。
    </Warning>

  </Accordion>

  <Accordion title="用於記憶體搜尋的嵌入">
    Bedrock 也可以充當
    [記憶體搜尋](/en/concepts/memory-search) 的嵌入提供商。這與推論提供商是分開配置的——將 `agents.defaults.memorySearch.provider` 設定為 `"bedrock"`：

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

    Bedrock 嵌入使用與推論相同的 AWS SDK 憑證鏈 (執行個體
    角色、SSO、存取金鑰、共享設定和 Web 身份)。不需要 API 金鑰。
    當 `provider` 為 `"auto"` 時，如果該
    憑證鏈成功解析，則會自動偵測到 Bedrock。

    支援的嵌入模型包括 Amazon Titan Embed (v1, v2)、Amazon Nova
    Embed、Cohere Embed (v3, v4) 和 TwelveLabs Marengo。請參閱
    [記憶體組態參考 -- Bedrock](/en/reference/memory-config#bedrock-embedding-config)
    以取得完整的模型清單和維度選項。

  </Accordion>

  <Accordion title="注意事項與警告">
    - Bedrock 需要在您的 AWS 帳戶/區域中啟用 **模型存取權**。
    - 自動偵測需要 `bedrock:ListFoundationModels` 和
      `bedrock:ListInferenceProfiles` 權限。
    - 如果您依賴自動模式，請在
      閘道主機上設定支援的 AWS 驗證環境變數標記之一。如果您偏好沒有環境變數標記的 IMDS/共享設定驗證，請設定
      `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
    - OpenClaw 依序公開憑證來源：`AWS_BEARER_TOKEN_BEDROCK`，
      然後是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然後是 `AWS_PROFILE`，接著是
      預設的 AWS SDK 鏈。
    - 推理支援取決於模型；請查看 Bedrock 模型卡以了解
      目前的功能。
    - 如果您偏好受管理的金鑰流程，您也可以在 Bedrock 前方放置一個與 OpenAI 相容的
      代理程式，並將其設定為 OpenAI 提供商。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和容錯移轉行為。
  </Card>
  <Card title="記憶體搜尋" href="/en/concepts/memory-search" icon="magnifying-glass">
    用於記憶體搜尋設定的 Bedrock 嵌入。
  </Card>
  <Card title="記憶體設定參考" href="/en/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock 嵌入模型清單和維度選項。
  </Card>
  <Card title="疑難排解" href="/en/help/troubleshooting" icon="wrench">
    一般疑難排解和常見問題。
  </Card>
</CardGroup>
