---
title: "LiteLLM"
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以獲得統一的模型存取和成本追蹤"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一個開源 LLM 閘道，為 100 多個模型供應商提供統一的 API。透過 LiteLLM 路由 OpenClaw，以獲得集中化的成本追蹤、記錄，以及無需變更 OpenClaw 設定即可切換後端的靈活性。

## 為什麼將 LiteLLM 與 OpenClD 搭配使用？

- **成本追蹤** — 確切掌握 OpenClaw 在所有模型上的花費
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之間切換，無需變更設定
- **虛擬金鑰** — 為 OpenClaw 建立具有花費限額的金鑰
- **記錄** — 完整的請求/回應記錄，用於除錯
- **容錯移轉** — 當您的主要供應商停機時自動故障轉移

## 快速開始

### 透過入門引導

```exec
openclaw onboard --auth-choice litellm-api-key
```

### 手動設定

1. 啟動 LiteLLM Proxy：

```exec
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. 將 OpenClaw 指向 LiteLLM：

```exec
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

這樣就完成了。OpenClaw 現在會透過 LiteLLM 進行路由。

## 設定

### 環境變數

```exec
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

為 OpenClaw 建立一個具有花費上限的專用金鑰：

```exec
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

## 模型路由

LiteLLM 可以將模型請求路由到不同的後端。在您的 LiteLLM `config.yaml` 中進行設定：

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

OpenClaw 持續請求 `claude-opus-4-6` — LiteLLM 負責處理路由。

## 檢視使用情況

檢查 LiteLLM 的儀表板或 API：

```exec
# Key info
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# Spend logs
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## 注意事項

- LiteLLM 預設運作在 `http://localhost:4000` 上
- OpenClaw 透過相容 OpenAI 的 `/v1/chat/completions` 端點進行連接
- 所有 OpenClaw 功能皆可透過 LiteLLM 運作 — 無任何限制

## 另請參閱

- [LiteLLM Docs](https://docs.litellm.ai)
- [Model Providers](/zh-Hant/concepts/model-providers)
