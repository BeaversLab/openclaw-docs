---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一個 **統一 API**，將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## CLI 設定

```bash
openclaw onboard --auth-choice openrouter-api-key
```

## 設定片段

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 注意事項

- 模型參考為 `openrouter/<provider>/<model>`。
- 預設使用 `openrouter/auto` 進入。稍後使用 `openclaw models set openrouter/<provider>/<model>` 切換到特定模型。
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/en/concepts/model-providers)。
- OpenRouter 在底層使用包含您的 API 金鑰的 Bearer token。
- 在真實的 OpenRouter 請求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 也會新增 OpenRouter 記錄的應用程式歸因標頭：`HTTP-Referer: https://openclaw.ai`、`X-OpenRouter-Title: OpenClaw` 和 `X-OpenRouter-Categories: cli-agent`。
- 在驗證的 OpenRouter 路由上，Anthropic 模型參考也會保留 OpenClaw 用於在系統/開發者提示區塊上更好地重用提示快取的 OpenRouter 專屬 Anthropic `cache_control` 標記。
- 如果您將 OpenRouter 提供者指向其他代理/基礎 URL，OpenClaw 將不會注入那些 OpenRouter 專屬標頭或 Anthropic 快取標記。
- OpenRouter 仍然透過代理樣式的 OpenAI 相容路徑運作，因此不會轉發原生僅 OpenAI 的請求塑造，例如 `serviceTier`、Responses `store`、OpenAI 推理相容負載和提示快取提示。
- Gemini 支援的 OpenRouter 參考保持在代理 Gemini 路徑上：OpenClaw 會在此保留 Gemini 思考簽章清理，但不會啟用原生 Gemini 重播驗證或引導重寫。
- 在支援的非 `auto` 路由上，OpenClaw 會將選取的思考層級對應到 OpenRouter 代理推理負載。不支援的模型提示和 `openrouter/auto` 將跳過該推理注入。
- 如果您在模型參數下傳遞 OpenRouter 提供者路由，OpenClaw 將在共用串流包裝函式執行之前，將其作為 OpenRouter 路由中繼資料轉發。
