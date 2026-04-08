---
summary: "使用 Amazon Bedrock (Converse API) 模型搭配 OpenClaw"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以透過 pi‑ai 的 **Bedrock Converse** 串流提供者使用 **Amazon Bedrock** 模型。Bedrock 驗證使用 **AWS SDK 預設憑證鏈**，而非 API 金鑰。

## pi-ai 支援項目

- 提供者：`amazon-bedrock`
- API：`bedrock-converse-stream`
- Auth: AWS 憑證 (環境變數、共享設定或執行個體角色)
- 區域：`AWS_REGION` 或 `AWS_DEFAULT_REGION` (預設：`us-east-1`)

## 自動模型探索

OpenClaw 可以自動發現支援 **串流**
與 **文字輸出** 的 Bedrock 模型。發現過程使用 `bedrock:ListFoundationModels` 和
`bedrock:ListInferenceProfiles`，結果會被快取 (預設：1 小時)。

隱含提供者如何啟用：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 為 `true`，
  即使沒有 AWS 環境標記，OpenClaw 也會嘗試進行發現。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未設定，
  OpenClaw 只有在看到下列其中一個 AWS 驗證標記時，才會自動新增
  隱含的 Bedrock 提供者：
  `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`，或 `AWS_PROFILE`。
- 實際的 Bedrock 執行時驗證路徑仍使用 AWS SDK 預設鏈，因此
  共用設定、SSO 和 IMDS 實例角色驗證即使在發現
  需要設定 `enabled: true` 才能啟用時也能運作。

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

備註：

- `enabled` 預設為自動模式。在自動模式下，OpenClaw 只有在看到支援的 AWS 環境標記時，才會啟用
  隱含的 Bedrock 提供者。
- `region` 預設為 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，然後是 `us-east-1`。
- `providerFilter` 符合 Bedrock 提供者名稱 (例如 `anthropic`)。
- `refreshInterval` 單位為秒；設為 `0` 可停用快取。
- `defaultContextWindow` (預設：`32000`) 和 `defaultMaxTokens` (預設：`4096`)
  用於已發現的模型 (如果您知道您的模型限制，可進行覆寫)。
- 對於明確的 `models.providers["amazon-bedrock"]` 項目，OpenClaw 仍可
  透過 AWS 環境標記（如
  `AWS_BEARER_TOKEN_BEDROCK`）提前解析 Bedrock 環境標記驗證，而無需強制執行完整的執行時期驗證載入。
  實際的模型呼叫驗證路徑仍使用 AWS SDK 預設鏈。

## 上架設定

1. 確保 AWS 憑證可在 **gateway host** 上使用：

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

2. 將 Bedrock 提供者與模型新增至您的設定中（不需要 `apiKey`）：

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

## EC2 實例角色

當在附加了 IAM 角色的 EC2 實例上執行 OpenClaw 時，AWS SDK
可以使用執行個體中繼資料服務 (IMDS) 進行驗證。對於 Bedrock
模型探索，除非您明確設定
`plugins.entries.amazon-bedrock.config.discovery.enabled: true`，否則 OpenClaw 僅會從 AWS 環境
標記自動啟用隱含提供者。

針對支援 IMDS 的主機的建議設定：

- 將 `plugins.entries.amazon-bedrock.config.discovery.enabled` 設定為 `true`。
- 設定 `plugins.entries.amazon-bedrock.config.discovery.region` (或匯出 `AWS_REGION`)。
- 您**不**需要虛假的 API 金鑰。
- 只有在您特別需要自動模式或狀態介面的環境標記時，
  才需要 `AWS_PROFILE=default`。

```bash
# Recommended: explicit discovery enable + region
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# Optional: add an env marker if you want auto mode without explicit enable
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 實例角色的 **必要 IAM 權限**：

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels` (用於自動探索)
- `bedrock:ListInferenceProfiles` (用於推論設定檔探索)

或附加受管政策 `AmazonBedrockFullAccess`。

## 快速設定 (AWS 路徑)

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

## 推論設定檔

OpenClaw 會與基礎模型一起探索 **區域和全域推論設定檔**。當設定檔對應到已知的基礎模型時，
該設定檔會繼承該模型的功能 (context window, max tokens,
reasoning, vision)，並且會自動注入正確的 Bedrock 請求區域。
這意味著跨區域 Claude 設定檔無需手動
覆寫提供者即可運作。

推論設定檔 ID 看起來像 `us.anthropic.claude-opus-4-6-v1:0` (區域)
或 `anthropic.claude-opus-4-6-v1:0` (全域)。如果支援模型已經
在探索結果中，設定檔會繼承其完整的功能集；
否則將套用安全的預設值。

不需要額外配置。只要啟用了探索功能且 IAM 主體具有 `bedrock:ListInferenceProfiles`，設定檔就會與 `openclaw models list` 中的基礎模型一起顯示。

## 注意事項

- Bedrock 需要在您的 AWS 帳戶/區域中啟用 **模型存取權**。
- 自動探索需要 `bedrock:ListFoundationModels` 和
  `bedrock:ListInferenceProfiles` 權限。
- 如果您依賴自動模式，請在閘道主機上設定其中一個支援的 AWS 認證環境標記。如果您偏好不使用環境標記的 IMDS/共用設定檔認證，請設定
  `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
- OpenClaw 會依照以下順序呈現認證來源：`AWS_BEARER_TOKEN_BEDROCK`，
  接著是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，然後是 `AWS_PROFILE`，最後是
  預設的 AWS SDK 鏈。
- 推理支援取決於模型；請查看 Bedrock 模型卡片以了解目前的最新功能。
- 如果您偏好受控金鑰流程，也可以在 Bedrock 前方放置一個 OpenAI 相容的
  代理程式，並將其設定為 OpenAI 提供者。

## Guardrails

您可以透過將 `guardrail` 物件新增至
`amazon-bedrock` 外掛程式設定，將 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
套用至所有 Bedrock 模型呼叫。Guardrails 讓您能夠強制執行內容過濾、
主題拒絕、文字過濾、敏感資訊過濾和情境
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

- `guardrailIdentifier` (必要) 接受 guardrail ID (例如 `abc123`) 或
  完整 ARN (例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`)。
- `guardrailVersion` (必要) 指定要使用哪個已發佈的版本，或
  指定 `"DRAFT"` 以使用工作草稿。
- `streamProcessingMode` (選用) 控制在串流期間，guardrail 評估是以
  同步 (`"sync"`) 還是非同步 (`"async"`) 方式執行。如果
  省略，Bedrock 將使用其預設行為。
- `trace` (選用) 啟用 API 回應中的 guardrail 追蹤輸出。設定為
  `"enabled"` 或 `"enabled_full"` 以進行偵錯；為了
  生產環境，請省略或設定 `"disabled"`。

閘道使用的 IAM 主體除了標準的叫用權限外，還必須具有 `bedrock:ApplyGuardrail` 權限。

## 用於記憶體搜尋的嵌入

Bedrock 也可以作為[記憶體搜尋](/en/concepts/memory-search)的嵌入提供者。這與推論提供者分開設定 — 將 `agents.defaults.memorySearch.provider` 設定為 `"bedrock"`：

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

Bedrock 嵌入使用與推論相同的 AWS SDK 憑證鏈（執行個體角色、SSO、存取金鑰、共用設定和 Web 身分）。不需要 API 金鑰。當 `provider` 為 `"auto"` 時，如果該憑證鏈成功解析，則會自動偵測 Bedrock。

支援的嵌入模型包括 Amazon Titan Embed (v1, v2)、Amazon Nova Embed、Cohere Embed (v3, v4) 和 TwelveLabs Marengo。如需完整的模型清單和維度選項，請參閱[記憶體設定參考 — Bedrock](/en/reference/memory-config#bedrock-embedding-config)。
