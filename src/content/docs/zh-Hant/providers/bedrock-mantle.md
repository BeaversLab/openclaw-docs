---
summary: "在 OpenClaw 中使用 Amazon Bedrock Mantle（相容 OpenAI）模型"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw 包含一個內建的 **Amazon Bedrock Mantle** 提供者，可連線至
Mantle 的 OpenAI 相容端點。Mantle 透過由 Bedrock 基礎設施支援的標準
`/v1/chat/completions` 介面，託管開源和第三方模型（GPT-OSS、Qwen、Kimi、GLM 和類似模型）。

| 屬性      | 值                                                                |
| --------- | ----------------------------------------------------------------- |
| 提供者 ID | `amazon-bedrock-mantle`                                           |
| API       | `openai-completions` (OpenAI 相容)                                |
| 驗證      | 明確的 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 憑證鏈 bearer token 產生 |
| 預設區域  | `us-east-1` (可使用 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆寫)    |

## 開始使用

選擇您偏好的驗證方式，並依照設定步驟操作。

<Tabs>
  <Tab title="明確 bearer token">
    **最適用於：** 您已經擁有 Mantle bearer token 的環境。

    <Steps>
      <Step title="在 gateway 主機上設定 bearer token">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        選擇性地設定區域（預設為 `us-east-1`）：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="驗證模型是否已被探索到">
        ```bash
        openclaw models list
        ```

        探索到的模型會出現在 `amazon-bedrock-mantle` 提供者下。除非您想要覆寫預設值，否則
        不需要額外的設定。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 憑證">
    **最適用於：** 使用與 AWS SDK 相容的憑證（共用設定、SSO、Web 身份、執行個體或任務角色）。

    <Steps>
      <Step title="在閘道主機上設定 AWS 憑證">
        任何與 AWS SDK 相容的身分驗證來源均可運作：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="驗證模型是否已探索到">
        ```bash
        openclaw models list
        ```

        OpenClaw 會自動透過憑證鏈產生 Mantle 持有者權杖。
      </Step>
    </Steps>

    <Tip>
    當未設定 `AWS_BEARER_TOKEN_BEDROCK` 時，OpenClaw 會代表您從 AWS 預設憑證鏈鑄造持有者權杖，包括共用憑證/設定設定檔、SSO、Web 身份，以及執行個體或任務角色。
    </Tip>

  </Tab>
</Tabs>

## 自動模型探索

當設定 `AWS_BEARER_TOKEN_BEDROCK` 時，OpenClaw 會直接使用它。否則，
OpenClaw 會嘗試從 AWS 預設憑證鏈產生 Mantle 持有者權杖。然後透過查詢
該區域的 `/v1/models` 端點來探索可用的 Mantle 模型。

| 行為             | 詳細資訊        |
| ---------------- | --------------- |
| 探索快取         | 結果快取 1 小時 |
| IAM 權杖重新整理 | 每小時          |

<Note>持有者權杖與標準 [Amazon Bedrock](/en/providers/bedrock) 提供者使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。</Note>

### 支援的區域

`us-east-1`、`us-east-2`、`us-west-2`、`ap-northeast-1`、
`ap-south-1`、`ap-southeast-3`、`eu-central-1`、`eu-west-1`、`eu-west-2`、
`eu-south-1`、`eu-north-1`、`sa-east-1`。

## 手動設定

如果您偏好明確設定而非自動探索：

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

## 進階說明

<AccordionGroup>
  <Accordion title="Reasoning support">
    Reasoning support is inferred from model IDs containing patterns like
    `thinking`, `reasoner`, or `gpt-oss-120b`. OpenClaw sets `reasoning: true`
    automatically for matching models during discovery.
  </Accordion>

<Accordion title="Endpoint unavailability">If the Mantle endpoint is unavailable or returns no models, the provider is silently skipped. OpenClaw does not error; other configured providers continue to work normally.</Accordion>

  <Accordion title="Relationship to Amazon Bedrock provider">
    Bedrock Mantle is a separate provider from the standard
    [Amazon Bedrock](/en/providers/bedrock) provider. Mantle uses an
    OpenAI-compatible `/v1` surface, while the standard Bedrock provider uses
    the native Bedrock API.

    Both providers share the same `AWS_BEARER_TOKEN_BEDROCK` credential when
    present.

  </Accordion>
</AccordionGroup>

## Related

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/en/providers/bedrock" icon="cloud">
    Native Bedrock provider for Anthropic Claude, Titan, and other models.
  </Card>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    Choosing providers, model refs, and failover behavior.
  </Card>
  <Card title="OAuth and auth" href="/en/gateway/authentication" icon="key">
    Auth details and credential reuse rules.
  </Card>
  <Card title="Troubleshooting" href="/en/help/troubleshooting" icon="wrench">
    Common issues and how to resolve them.
  </Card>
</CardGroup>
