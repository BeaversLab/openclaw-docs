---
title: "LiteLLM"
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以獲得統一的模型存取與成本追蹤"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一個開源 LLM 閘道，為 100 多個模型提供商提供統一的 API。透過 LiteLLM 路由 OpenClaw 以獲得集中的成本追蹤、日誌記錄，以及無需變更 OpenClaw 設定即可切換後端的靈活性。

<Tip>
**為何在 OpenClaw 中使用 LiteLLM？**

- **成本追蹤** — 精確查看 OpenClaw 在所有模型上的花費
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之間切換，無需變更設定
- **虛擬金鑰** — 為 OpenClaw 建立具有花費限制的金鑰
- **日誌記錄** — 完整的請求/回應日誌以利除錯
- **故障轉移** — 如果主要提供商當機，自動進行故障轉移
  </Tip>

## 快速入門

<Tabs>
  <Tab title="Onboarding (recommended)">
    **最適合：** 建立可運作的 LiteLLM 設定的最快途徑。

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Manual setup">
    **最適合：** 對安裝和設定擁有完全控制權。

    <Steps>
      <Step title="Start LiteLLM Proxy">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="Point OpenClaw to LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        就這樣。OpenClaw 現在透過 LiteLLM 路由。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 設定

### 環境變數

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### 設定檔

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## 進階主題

<AccordionGroup>
  <Accordion title="Virtual keys">
    為 OpenClaw 建立具有花費限制的專用金鑰：

    ```bash
    curl -X POST "http://localhost:4000/key/generate" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key_alias": "openclaw",
        "max_budget": 50.00,
        "budget_duration": "monthly"
      }'
    ```

    將產生的金鑰用作 `LITELLM_API_KEY`。

  </Accordion>

  <Accordion title="Model routing">
    LiteLLM 可以將模型請求路由到不同的後端。在您的 LiteLLM `config.yaml` 中設定：

    ```yaml
    model_list:
      - model_name: claude-opus-4-6
        litellm_params:
          model: claude-opus-4-6
          api_key: os.environ/ANTHROPIC_API_KEY

      - model_name: gpt-4o
        litellm_params:
          model: gpt-4o
          api_key: os.environ/OPENAI_API_KEY
    ```

    OpenClaw 繼續請求 `claude-opus-4-6` — LiteLLM 處理路由。

  </Accordion>

  <Accordion title="Viewing usage">
    檢查 LiteLLM 的儀表板或 API：

    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="Proxy behavior notes">
    - LiteLLM 預設執行在 `http://localhost:4000`
    - OpenClaw 透過 LiteLLM 的 Proxy 樣式 OpenAI 相容 `/v1`
      端點連線
    - 原生僅限 OpenAI 的請求塑形不適用於透過 LiteLLM：
      無 `service_tier`、無 Responses `store`、無提示快取提示，且無
      OpenAI 推理相容負載塑形
    - 隱藏的 OpenClaw 歸因標頭 (`originator`、`version`、`User-Agent`)
      不會在自訂 LiteLLM 基礎 URL 上注入
  </Accordion>
</AccordionGroup>

<Note>如需一般供應商設定和失效轉移行為，請參閱 [Model Providers](/zh-Hant/concepts/model-providers)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="LiteLLM Docs" href="https://docs.litellm.ai" icon="book">
    官方 LiteLLM 文件和 API 參考資料。
  </Card>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有供應商、模型參照和失效轉移行為的概觀。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考資料。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
</CardGroup>
