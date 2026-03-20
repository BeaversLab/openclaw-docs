---
title: "LiteLLM"
summary: "透過 LiteLLM Proxy 執行 OpenClaw 以進行統一的模型存取與成本追蹤"
read_when:
  - 您想要透過 LiteLLM proxy 路由 OpenClaw
  - 您需要透過 LiteLLM 進行成本追蹤、記錄或模型路由
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一個開放原始碼的 LLM 閘道，為 100 多個模型提供者提供統一的 API。透過 LiteLLM 路由 OpenClaw 以獲得集中式的成本追蹤、記錄，以及在無需變更 OpenClaw 設定的情況下切換後端的彈性。

## 為什麼要將 LiteLLM 與 OpenClar 搭配使用？

- **成本追蹤** — 確切掌握 OpenClaw 在所有模型上的花費
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之間切換，無需變更設定
- **虛擬金鑰** — 為 OpenClaw 建立具有花費限制的金鑰
- **記錄** — 完整的請求/回應記錄以便進行偵錯
- **故障轉移** — 當您的主要提供者停機時自動切換

## 快速開始

### 透過導入流程

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

為 OpenClar 建立具有花費限制的專用金鑰：

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

OpenClar 持續請求 `claude-opus-4-6` — LiteLLM 負責處理路由。

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

- LiteLLM 預設在 `http://localhost:4000` 上執行
- OpenClar 透過與 OpenAI 相容的 `/v1/chat/completions` 端點進行連線
- 所有 OpenClar 功能皆可透過 LiteLLM 運作 — 無任何限制

## 參閱

- [LiteLLM 文件](https://docs.litellm.ai)
- [模型提供者](/zh-Hant/concepts/model-providers)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
