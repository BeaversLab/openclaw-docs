---
title: "Cloudflare AI Gateway"
summary: "Cloudflare AI Gateway 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

# Cloudflare AI Gateway

Cloudflare AI Gateway 位於供應商 API 的前端，可讓您新增分析、快取和控制項。對於 Anthropic，OpenClaw 會透過您的 Gateway 端點使用 Anthropic Messages API。

- 提供者：`cloudflare-ai-gateway`
- Base URL：`https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- 預設模型：`cloudflare-ai-gateway/claude-sonnet-4-6`
- API 金鑰：`CLOUDFLARE_AI_GATEWAY_API_KEY`（您透過 Gateway 發出請求時使用的提供者 API 金鑰）

對於 Anthropic 模型，請使用您的 Anthropic API 金鑰。

## 快速入門

1. 設定提供者 API 金鑰與 Gateway 詳細資訊：

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-6" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## 已驗證的 Gateway

如果您在 Cloudflare 中啟用了 Gateway 驗證，請新增 `cf-aig-authorization` 標頭（這是除了您的提供者 API 金鑰之外的額外設定）。

```json5
{
  models: {
    providers: {
      "cloudflare-ai-gateway": {
        headers: {
          "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
        },
      },
    },
  },
}
```

## 環境注意事項

如果 Gateway 作為守護程式 執行，請確保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 可供該行程使用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
