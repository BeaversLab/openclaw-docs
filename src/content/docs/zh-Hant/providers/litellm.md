---
title: "LiteLLM"
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以獲得統一的模型存取與成本追蹤"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一個開源 LLM 閘道，提供統一的 API 以連接 100 多個模型供應商。透過 LiteLLM 路由 OpenClaw，即可獲得集中的成本追蹤、日誌記錄，以及在變更後端時無需修改 OpenClaw 設定的彈性。

## 為何將 LiteLLM 與 OpenClaw 搭配使用？

- **成本追蹤** — 確切查看 OpenClaw 在所有模型上的花費
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之間切換，無需變更設定
- **虛擬金鑰** — 為 OpenClaw 建立具有花費限制的金鑰
- **日誌記錄** — 完整的請求/回應日誌以便除錯
- **故障轉移** — 當您的主要提供商停機時自動切換

## 快速開始

### 透過上架

```bash
openclaw onboard --auth-choice litellm-api-key
```

### 手動設定

1. 啟動 LiteLLM Proxy：

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. 將 OpenClaw 指向 LiteLLM：

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

就這樣。OpenClaw 現在會透過 LiteLLM 路由。

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

為 OpenClaw 建立一個具有花費限制的專用金鑰：

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

## 模型路由

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

OpenClaw 持續請求 `claude-opus-4-6` — LiteLLM 負責處理路由。

## 查看使用量

查看 LiteLLM 的儀表板或 API：

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
- OpenClaw 透過 LiteLLM 的 Proxy 樣式 OpenAI 相容 `/v1`
  端點進行連接
- 僅適用於原生 OpenAI 的請求修整 (request shaping) 不會透過 LiteLLM 生效：
  沒有 `service_tier`、沒有 Responses `store`、沒有提示快取提示，也沒有
  OpenAI 推理相容的 Payload 修整
- 隱藏的 OpenClaw 歸屬標頭 (`originator`、`version`、`User-Agent`)
  不會在自訂的 LiteLLM 基礎 URL 上被注入

## 參見

- [LiteLLM Docs](https://docs.litellm.ai)
- [Model Providers](/en/concepts/model-providers)
