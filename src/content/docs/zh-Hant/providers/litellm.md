---
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以統一模型存取和成本追蹤"
title: "LiteLLM"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

[LiteLLM](https://litellm.ai) 是一個開放原始碼的 LLM 閘道，為 100 多個模型供應商提供統一的 API。透過 LiteLLM 路由 OpenClaw，以獲得集中的成本追蹤、日誌記錄，以及無需變更 OpenClAM 組態即可切換後端的靈活性。

<Tip>
**為什麼要將 LiteLLM 與 OpenClAM 搭配使用？**

- **成本追蹤** — 精確掌握 OpenClAM 在所有模型上的花費
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之間切換，無需變更設定
- **虛擬金鑰** — 建立具有花費上限的金鑰供 OpenClAM 使用
- **日誌記錄** — 完整的請求/回應日誌以利除錯
- **故障轉移** — 當主要提供商當機時自動切換

</Tip>

## 快速入門

<Tabs>
  <Tab title="入門指南（建議）">
    **最適用於：** 最快建立可運作的 LiteLLM 環境。

    <Steps>
      <Step title="執行入門指南">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```

        若要針對遠端 Proxy 進行非互動式設定，請明確傳遞 Proxy URL：

        ```bash
        openclaw onboard --non-interactive --auth-choice litellm-api-key --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="手動設定">
    **最適用於：** 完全掌控安裝和組態。

    <Steps>
      <Step title="啟動 LiteLLM Proxy">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="將 OpenClaw 指向 LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        就這樣。OpenClaw 現在會透過 LiteLLM 進行路由。
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

## 進階設定

### 圖像生成

LiteLLM 也可以透過 OpenAI 相容的
`/images/generations` 和 `/images/edits` 路由來支援 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下設定 LiteLLM 影像
模型：

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "litellm/gpt-image-2",
        timeoutMs: 180_000,
      },
    },
  },
}
```

諸如 `http://localhost:4000` 的 Loopback LiteLLM URL 無需全域
私人網路覆寫即可運作。對於 LAN 託管的 Proxy，請設定
`models.providers.litellm.request.allowPrivateNetwork: true`，因為 API 金鑰
將會傳送到設定的 Proxy 主機。

<AccordionGroup>
  <Accordion title="虛擬金鑰">
    建立一個專屬於 OpenClaw 並具有花費限制的金鑰：

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

    使用產生的金鑰作為 `LITELLM_API_KEY`。

  </Accordion>

  <Accordion title="模型路由">
    LiteLLM 可以將模型請求路由到不同的後端。在您的 LiteLLM `config.yaml` 中進行配置：

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

    OpenClaw 持續請求 `claude-opus-4-6` — LiteLLM 處理路由。

  </Accordion>

  <Accordion title="檢視使用情況">
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

  <Accordion title="代理行為備註">
    - LiteLLM 預設執行在 `http://localhost:4000` 上
    - OpenClaw 通過 LiteLLM 的代理樣式 OpenAI 相容 `/v1`
      端點進行連線
    - 原生僅限 OpenAI 的請求調整不適用於透過 LiteLLM 的請求：
      無 `service_tier`，無 Responses `store`，無提示快取提示，且無
      OpenAI 推理相容負載調整
    - 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
      不會在自訂 LiteLLM 基礎 URL 上注入
  </Accordion>
</AccordionGroup>

<Note>如需一般提供者配置和容錯移轉行為，請參閱 [模型提供者](/zh-Hant/concepts/model-providers)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="LiteLLM 文件" href="https://docs.litellm.ai" icon="book">
    官方 LiteLLM 文件和 API 參考資料。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和容錯移轉行為的概覽。
  </Card>
  <Card title="組態" href="/zh-Hant/gateway/configuration" icon="gear">
    完整組態參考資料。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
</CardGroup>
