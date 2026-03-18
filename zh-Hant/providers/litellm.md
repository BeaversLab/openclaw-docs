---
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以進行統一的模型存取與成本追蹤"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一個開放原始碼的 LLM 閘道，為 100 多個模型提供者提供統一的 API。透過 LiteLLM 路由 OpenClaw，即可獲得集中式的成本追蹤、日誌記錄，以及在無需變更 OpenClaw 設定的情況下切換後端的彈性。

## 為什麼要將 LiteLLM 搭配 OpenClaw 使用？

- **成本追蹤** — 確切掌握 OpenClaw 在所有模型上的花費
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之間切換，無需變更設定
- **虛擬金鑰** — 建立 OpenClaw 專用的具備花費上限的金鑰
- **日誌記錄** — 完整的請求/回應日誌以利偵錯
- **故障轉移** — 當您的主要提供者離線時自動切換

## 快速入門

### 透過引導流程

```bash
openclaw onboard --auth-choice litellm-api-key
```

### 手動設定

1. 啟動 LiteLLM Proxy：

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. 將 OpenClam 指向 LiteLLM：

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

就這樣。OpenClaw 現在會透過 LiteLLM 進行路由。

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

## 虛擬金鑰

建立 OpenClaw 專用且具備花費限制的金鑰：

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

將產生的金鑰用於 `LITELLM_API_KEY`。

## 模型路由

LiteLLM 可以將模型請求路由至不同的後端。請在您的 LiteLLM `config.yaml` 中設定：

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

OpenClaw 持續請求 `claude-opus-4-6` — LiteLLM 會處理路由。

## 檢視使用量

檢查 LiteLLM 的儀表板或 API：

```bash
# Key info
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# Spend logs
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## 備註

- LiteLLM 預設執行於 `http://localhost:4000`
- OpenClaw 透過 OpenAI 相容的 `/v1/chat/completions` 端點進行連線
- 所有 OpenClaw 功能皆可透過 LiteLLM 運作 — 無任何限制

## 另請參閱

- [LiteLLM Docs](https://docs.litellm.ai)
- [Model Providers](/zh-Hant/concepts/model-providers)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
