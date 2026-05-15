---
summary: "在 OpenClaw 中使用 Amazon Bedrock (Converse API) 模型"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

OpenClaw 可以透過 pi-ai 的 **Bedrock Converse** 串流提供者來使用 **Amazon Bedrock** 模型。Bedrock 驗證使用的是 **AWS SDK 預設憑證鏈**，而不是 API 金鑰。

| 屬性   | 數值                                                       |
| ------ | ---------------------------------------------------------- |
| 提供者 | `amazon-bedrock`                                           |
| API    | `bedrock-converse-stream`                                  |
| 驗證   | AWS 憑證 (環境變數、共享設定或實例角色)                    |
| 區域   | `AWS_REGION` 或 `AWS_DEFAULT_REGION` (預設值：`us-east-1`) |

## 開始使用

選擇您偏好的驗證方法，並依照設定步驟進行。

<Tabs>
  <Tab title="存取金鑰 / 環境變數">
    **最適用於：** 開發機器、CI，或您直接管理 AWS 憑證的主機。

    <Steps>
      <Step title="在 Gateway 主機上設定 AWS 憑證">
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
      <Step title="將 Bedrock 提供者和模型新增至您的設定檔">
        不需要 `apiKey`。請使用 `auth: "aws-sdk"` 設定提供者：

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
        使用 IMDS 時，OpenClaw 無法僅透過環境標記偵測 AWS 驗證，因此您必須選擇加入：

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="選擇性地為自動模式新增環境標記">
        如果您還希望環境標記自動偵測路徑運作（例如，對於 `openclaw status` 介面）：

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        您**不**需要假的 API 金鑰。
      </Step>
      <Step title="驗證模型已探索到">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    附加至您的 EC2 執行個體的 IAM 角色必須具備下列權限：

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels` (用於自動探索)
    - `bedrock:ListInferenceProfiles` (用於推論設定檔探索)

    或附加受管理政策 `AmazonBedrockFullAccess`。
    </Warning>

    <Note>
    只有當您特別需要用於自動模式或狀態介面的環境標記時，才需要 `AWS_PROFILE=default`。實際的 Bedrock 執行階段驗證路徑使用 AWS SDK 預設鏈，因此即使沒有環境標記，IMDS 執行個體角色驗證也能運作。
    </Note>

  </Tab>
</Tabs>

## 自動模型探索

OpenClaw 可以自動探索支援 **串流**
和 **文字輸出** 的 Bedrock 模型。探索使用 `bedrock:ListFoundationModels` 和
`bedrock:ListInferenceProfiles`，結果會被快取 (預設：1 小時)。

如何啟用隱含提供者：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 為 `true`，
  即使沒有 AWS 環境標記，OpenClaw 也會嘗試進行探索。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未設定，
  OpenClaw 只有在看到下列其中一個 AWS 驗證標記時，才會自動新增
  隱含的 Bedrock 提供者：
  `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY` 或 `AWS_PROFILE`。
- 實際的 Bedrock 執行時驗證路徑仍使用 AWS SDK 預設鏈，因此即使發現需要 `enabled: true` 才能選擇加入，共用設定、SSO 和 IMDS 執行個體角色驗證仍然可以運作。

<Note>對於明確的 `models.providers["amazon-bedrock"]` 項目，OpenClaw 仍然可以透過 AWS 環境標記（例如 `AWS_BEARER_TOKEN_BEDROCK`）提早解析 Bedrock 環境標記驗證，而無需強制進行完整的執行時驗證載入。實際的模型呼叫驗證路徑仍使用 AWS SDK 預設鏈。</Note>

<AccordionGroup>
  <Accordion title="探索組態選項">
    組態選項位於 `plugins.entries.amazon-bedrock.config.discovery` 之下：

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
    | `enabled` | auto | 在自動模式下，OpenClaw 僅在看到支援的 AWS 環境標記時才會啟用隱含的 Bedrock 提供者。設定 `true` 以強制探索。 |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | 用於探索 API 呼叫的 AWS 區域。 |
    | `providerFilter` | (all) | 符合 Bedrock 提供者名稱（例如 `anthropic`、`amazon`）。 |
    | `refreshInterval` | `3600` | 快取持續時間（以秒為單位）。設定為 `0` 以停用快取。 |
    | `defaultContextWindow` | `32000` | 用於已探索模型的內容視窗（如果您知道模型限制，則覆蓋此設定）。 |
    | `defaultMaxTokens` | `4096` | 用於已探索模型的最大輸出 token（如果您知道模型限制，則覆蓋此設定）。 |

  </Accordion>
</AccordionGroup>

## 快速設定 (AWS 路徑)

此逐步解說會建立 IAM 角色、附加 Bedrock 權限、關聯執行個體設定檔，並在 EC2 主機上啟用 OpenClaw 探索。

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

## 進階配置

<AccordionGroup>
  <Accordion title="推論設定檔">
    OpenClaw 會與基礎模型一起發現 **區域和全域推論設定檔**。當設定檔對應到已知的基礎模型時，
    該設定檔會繼承該模型的功能（上下文視窗、最大 token 數、
    推理、視覺），並且會自動注入正確的 Bedrock 請求區域。
    這意味著跨區域 Claude 設定檔無需手動覆寫提供者即可運作。

    推論設定檔 ID 看起來像 `us.anthropic.claude-opus-4-6-v1:0` (區域)
    或 `anthropic.claude-opus-4-6-v1:0` (全域)。如果支援模型已經
    在發現結果中，該設定檔會繼承其完整功能集；
    否則會套用安全的預設值。

    不需要額外的組態。只要啟用了發現功能並且 IAM 主體具有
    `bedrock:ListInferenceProfiles`，設定檔就會與基礎模型一起出現在
    `openclaw models list` 中。

  </Accordion>

  <Accordion title="服務層級">
    部分 Bedrock 模型支援 `service_tier` 參數以針對成本
    或延遲進行最佳化。可用的層級如下：

    | 層級 | 描述 |
    |------|-------------|
    | `default` | 標準 Bedrock 層級 |
    | `flex` | 針對可容忍較高延遲的工作負載提供折扣處理 |
    | `priority` | 針對對延遲敏感的工作負載提供優先處理 |
    | `reserved` | 針對穩定狀態工作負載的保留容量 |

    透過 `agents.defaults.params` 為 Bedrock 模型請求設定
    `serviceTier` (或 `service_tier`)，或在
    `agents.defaults.models["<model-key>"].params` 中針對各個模型進行設定：

    ```json5
    {
      agents: {
        defaults: {
          params: {
            serviceTier: "flex", // applies to all models
          },
          models: {
            "amazon-bedrock/mistral.mistral-large-3-675b-instruct": {
              params: {
                serviceTier: "priority", // per-model override
              },
            },
          },
        },
      },
    }
    ```

    有效的數值包括 `default`、`flex`、`priority` 和 `reserved`。並非所有
    模型都支援所有層級 — 如果請求了不支援的層級，Bedrock 將
    會傳回驗證錯誤。注意：錯誤訊息多少有些誤導性；
    它可能會顯示「提供的模型識別碼無效」，而不是指出
    不支援的服務層級。如果您看到此錯誤，請檢查模型
    是否支援所請求的層級。

  </Accordion>

<Accordion title="Claude Opus 4.7 溫度">
  Bedrock 會拒絕 Claude Opus 4.7 的 `temperature` 參數。對於任何 Opus 4.7 Bedrock 引用，OpenClaw 會自動省略 `temperature`，包括：基礎模型 ID、命名推斷設定檔、透過 `bedrock:GetInferenceProfile` 解析為 Opus 4.7 的應用程式推斷設定檔，以及帶有可選區域前綴（`us.`、`eu.`、`ap.`、`apac.`、`au.`、`jp.`、`global.`）的點狀 `opus-4.7` 變體。不需要任何配置選項，此省略操作同時適用於請求選項物件和
  `inferenceConfig` payload 欄位。
</Accordion>

  <Accordion title="防護機制">
    您可以透過在 `amazon-bedrock` 外掛程式設定中新增 `guardrail` 物件，將 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
    套用至所有 Bedrock 模型呼叫。防護機制讓您可以強制執行內容過濾、
    主題拒絕、詞彙過濾、敏感資訊過濾和情境
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

    | 選項 | 必要 | 說明 |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | 是 | 防護機制 ID (例如 `abc123`) 或完整 ARN (例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`)。 |
    | `guardrailVersion` | 是 | 已發布的版本號碼，或針對工作草稿使用 `"DRAFT"`。 |
    | `streamProcessingMode` | 否 | 串流期間的防護機制評估使用 `"sync"` 或 `"async"`。如果省略，Bedrock 將使用其預設值。 |
    | `trace` | 否 | 除錯時使用 `"enabled"` 或 `"enabled_full"`；正式環境請省略或設為 `"disabled"`。 |

    <Warning>
    閘道使用的 IAM 主體除了標準的叫用權限外，還必須具備 `bedrock:ApplyGuardrail` 權限。
    </Warning>

  </Accordion>

  <Accordion title="用於記憶體搜尋的嵌入">
    Bedrock 也可以充當
    [記憶體搜尋](/zh-Hant/concepts/memory-search)的嵌入提供商。這是與
    推理提供商分開配置的 —— 將 `agents.defaults.memorySearch.provider` 設定為 `"bedrock"`：

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

    Bedrock 嵌入使用與推理相同的 AWS SDK 憑證鏈（實例
    角色、SSO、存取金鑰、共享設定和 Web 身分）。不需要
    API 金鑰。當 `provider` 為 `"auto"` 時，如果該
    憑證鏈成功解析，則會自動偵測 Bedrock。

    支援的嵌入模型包括 Amazon Titan Embed (v1, v2)、Amazon Nova
    Embed、Cohere Embed (v3, v4) 和 TwelveLabs Marengo。請參閱
    [記憶體組態參考 -- Bedrock](/zh-Hant/reference/memory-config#bedrock-embedding-config)
    以取得完整模型清單和維度選項。

  </Accordion>

  <Accordion title="注意事項與警告">
    - Bedrock 需要在您的 AWS 帳戶/區域中啟用 **模型存取權**。
    - 自動探索需要 `bedrock:ListFoundationModels` 和
      `bedrock:ListInferenceProfiles` 權限。
    - 如果您依賴自動模式，請在
      閘道主機上設定其中一個支援的 AWS 認證環境標記。如果您偏好不帶環境標記的 IMDS/共享設定認證，請設定
      `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
    - OpenClaw 依此順序顯示憑證來源：`AWS_BEARER_TOKEN_BEDROCK`，
      然後是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然後是 `AWS_PROFILE`，接著是
      預設的 AWS SDK 鏈。
    - 推理支援取決於模型；請查看 Bedrock 模型卡片以了解
      目前功能。
    - 如果您偏好受管理的金鑰流程，您也可以在 Bedrock 前放置一個 OpenAI 相容的
      代理，並將其設定為 OpenAI 提供商。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供商、模型參照和容錯移轉行為。
  </Card>
  <Card title="記憶體搜尋" href="/zh-Hant/concepts/memory-search" icon="magnifying-glass">
    用於記憶體搜尋設定的 Bedrock 嵌入。
  </Card>
  <Card title="記憶體設定參考" href="/zh-Hant/reference/memory-config#bedrock-embedding-config" icon="database">
    完整的 Bedrock 嵌入模型清單和維度選項。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解和常見問題。
  </Card>
</CardGroup>
