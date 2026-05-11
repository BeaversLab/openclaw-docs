---
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以實現統一的模型存取與成本追蹤"
title: "LiteLLM"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

[LiteLLM](https://litellm.ai) 是一個開放原始碼的 LLM Gateway，為 100 多個模型提供商提供統一的 API。透過 LiteLLM 路由 OpenClaw，即可獲得集中的成本追蹤、日誌記錄，以及無需變更 OpenClAM 設定即可切換後端的靈活性。

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
  <Tab title="引導設定（推薦）">
    **最適合：** 建立可運作的 LiteLLM 環境的最快途徑。

    <Steps>
      <Step title="執行引導設定">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="手動設定">
    **最適合：** 對安裝與設定擁有完全控制權。

    <Steps>
      <Step title="啟動 LiteLLM Proxy">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="將 OpenClAM 指向 LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        這樣就完成了。OpenClAM 現在會透過 LiteLLM 進行路由。
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

LiteLLM 也可以透過相容 OpenAI 的
`/images/generations` 與 `/images/edits` 路由來支援 `image_generate` 工具。請在 `agents.defaults.imageGenerationModel` 下設定 LiteLLM 圖像模型：

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

諸如 `http://localhost:4000` 的 Loopback LiteLLM URL 可在無需全域
private-network 旁路的情況下運作。對於於 LAN 託管的 Proxy，請設定
`models.providers.litellm.request.allowPrivateNetwork: true`，因為 API 金鑰
將會被傳送至設定的 Proxy 主機。

<AccordionGroup>
  <Accordion title="虛擬金鑰">
    為 OpenClaw 建立具有支出限制的專用金鑰：

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

    OpenClaw 繼續請求 `claude-opus-4-6` — LiteLLM 處理路由。

  </Accordion>

  <Accordion title="查看使用情況">
    查看 LiteLLM 的儀表板或 API：

    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="代理行為注意事項">
    - LiteLLM 預設運行在 `http://localhost:4000` 上
    - OpenClaw 通過 LiteLLM 的代理式 OpenAI 相容 `/v1`
      端點進行連接
    - 原生僅限 OpenAI 的請求整形不適用於通過 LiteLLM：
      無 `service_tier`，無 Responses `store`，無提示快取提示，且無
      OpenAI 推理相容負載整形
    - 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
      不會在自訂 LiteLLM 基礎 URL 上注入
  </Accordion>
</AccordionGroup>

<Note>有關一般提供者配置和故障轉移行為，請參閱 [模型提供者](/zh-Hant/concepts/model-providers)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="LiteLLM 文件" href="https://docs.litellm.ai" icon="book">
    官方 LiteLLM 文件和 API 參考資料。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參考和故障轉移行為的概覽。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整的配置參考。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和配置模型。
  </Card>
</CardGroup>
