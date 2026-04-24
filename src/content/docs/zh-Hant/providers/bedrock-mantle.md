---
summary: "使用 Amazon Bedrock Mantle (OpenAI 相容) 模型與 OpenClaw"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw 包含一個內建的 **Amazon Bedrock Mantle** 提供者，可連線至
Mantle OpenAI 相容端點。Mantle 透過由 Bedrock 基礎設施支援的標準
`/v1/chat/completions` 介面，託管開源和
第三方模型 (GPT-OSS、Qwen、Kimi、GLM 和類似模型)。

| 屬性      | 值                                                                                   |
| --------- | ------------------------------------------------------------------------------------ |
| 提供者 ID | `amazon-bedrock-mantle`                                                              |
| API       | `openai-completions` (OpenAI 相容) 或 `anthropic-messages` (Anthropic Messages 路由) |
| 驗證      | 明確的 `AWS_BEARER_TOKEN_BEDROCK` 或 IAM 憑證鏈不記名 token 產生                     |
| 預設區域  | `us-east-1` (使用 `AWS_REGION` 或 `AWS_DEFAULT_REGION` 覆寫)                         |

## 開始使用

選擇您偏好的驗證方式，並依照設定步驟操作。

<Tabs>
  <Tab title="明確的不記名 token">
    **最適用於：** 您已經擁有 Mantle 不記名 token 的環境。

    <Steps>
      <Step title="在閘道主機上設定不記名 token">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        選擇性地設定區域 (預設為 `us-east-1`)：

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="驗證模型是否已發現">
        ```bash
        openclaw models list
        ```

        發現的模型會出現在 `amazon-bedrock-mantle` 提供者之下。除非您想要覆寫預設值，否則
        不需要額外的設定。
      </Step>
    </Steps>

  </Tab>

  <Tab title="IAM 憑證">
    **最適用於：** 使用與 AWS SDK 相容的憑證（共用設定、SSO、Web 身分、執行個體或工作角色）。

    <Steps>
      <Step title="在閘道主機上設定 AWS 憑證">
        任何與 AWS SDK 相容的驗證來源均可運作：

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="驗證已探索的模型">
        ```bash
        openclaw models list
        ```

        OpenClaw 會自動從憑證鏈產生 Mantle 持有人權杖。
      </Step>
    </Steps>

    <Tip>
    當未設定 `AWS_BEARER_TOKEN_BEDROCK` 時，OpenClaw 會代表您從 AWS 預設憑證鏈產生持有人權杖，包括共用憑證/設定設定檔、SSO、Web 身分，以及執行個體或工作角色。
    </Tip>

  </Tab>
</Tabs>

## 自動模型探索

當設定 `AWS_BEARER_TOKEN_BEDROCK` 時，OpenClaw 會直接使用它。否則，
OpenClaw 會嘗試從 AWS 預設憑證鏈產生 Mantle 持有人權杖。接著，透過查詢該區域的 `/v1/models` 端點來探索可用的 Mantle 模型。

| 行為             | 詳細資訊        |
| ---------------- | --------------- |
| 探索快取         | 結果快取 1 小時 |
| IAM 權杖重新整理 | 每小時          |

<Note>持有人權杖與標準 [Amazon Bedrock](/zh-Hant/providers/bedrock) 提供者所使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。</Note>

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
  <Accordion title="推理支援">
    推理支援是依據包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式的模型 ID 推斷而來。在探索期間，OpenClaw 會針對符合的模型自動設定 `reasoning: true`。
  </Accordion>

<Accordion title="端點無法使用">如果 Mantle 端點無法使用或未傳回任何模型，該提供者會被 靜略過。OpenClaw 不會報錯；其他已設定的提供者 會繼續正常運作。</Accordion>

  <Accordion title="透過 Anthropic Messages 路由使用 Claude Opus 4.7">
    Mantle 也公開了 Anthropic Messages 路由，透過相同的持有人驗證串流路徑傳輸 Claude 模型。Claude Opus 4.7 (`amazon-bedrock-mantle/claude-opus-4.7`) 可透過此路由呼叫，並使用提供者擁有的串流功能，因此 AWS 持有人權杖不會被視為 Anthropic API 金鑰。

    當您在 Mantle 提供者上釘選 Anthropic Messages 模型時，OpenClaw 會對該模型使用 `anthropic-messages` API 介面，而非 `openai-completions`。驗證仍來自 `AWS_BEARER_TOKEN_BEDROCK` (或產生的 IAM 持有人權杖)。

    ```json5
    {
      models: {
        providers: {
          "amazon-bedrock-mantle": {
            models: [
              {
                id: "claude-opus-4.7",
                name: "Claude Opus 4.7",
                api: "anthropic-messages",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1000000,
                maxTokens: 32000,
              },
            ],
          },
        },
      },
    }
    ```

    對於探索到的 Mantle 模型，其視窗中繼資料會在可用時使用已知的發布限制，並對於未列出的模型採用保守的後備方案，因此壓縮和溢位處理能對較新的條目正確運作，而不會誇報未知模型。

  </Accordion>

  <Accordion title="與 Amazon Bedrock 提供者的關係">
    Bedrock Mantle 是一個與標準
    [Amazon Bedrock](/zh-Hant/providers/bedrock) 提供者分開的提供者。Mantle 使用的是
    相容 OpenAI 的 `/v1` 介面，而標準 Bedrock 提供者使用的是
    原生 Bedrock API。

    這兩個提供者在存在時共用相同的 `AWS_BEARER_TOKEN_BEDROCK` 憑證。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/zh-Hant/providers/bedrock" icon="cloud">
    用於 Anthropic Claude、Titan 及其他模型的原生 Bedrock 提供者。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="OAuth and auth" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊與憑證重複使用規則。
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    常見問題與解決方法。
  </Card>
</CardGroup>
