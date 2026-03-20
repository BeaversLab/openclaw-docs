---
title: "Cloudflare AI Gateway"
summary: "Cloudflare AI Gateway 設定（驗證 + 模型選擇）"
read_when:
  - 您想使用 Cloudflare AI Gateway 搭配 OpenClaw
  - 您需要帳戶 ID、Gateway ID 或 API 金鑰環境變數
---

# Cloudflare AI Gateway

Cloudflare AI Gateway 位於供應商 API 的前端，讓您可以新增分析、快取和控制。對於 Anthropic，OpenClaw 會透過您的 Gateway 端點使用 Anthropic Messages API。

- Provider: `cloudflare-ai-gateway`
- Base URL: `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Default model: `cloudflare-ai-gateway/claude-sonnet-4-5`
- API key: `CLOUDFLARE_AI_GATEWAY_API_KEY` (您的供應商 API 金鑰，用於透過 Gateway 發出的請求)

對於 Anthropic 模型，請使用您的 Anthropic API 金鑰。

## 快速開始

1. 設定供應商 API 金鑰和 Gateway 詳細資訊：

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
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

如果您在 Cloudflare 中啟用了 Gateway 驗證，請新增 `cf-aig-authorization` 標頭（這是除了您的供應商 API 金鑰之外額外新增的）。

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

如果 Gateway 以 Daemon 形式執行（launchd/systemd），請確保該程序可以使用 `CLOUDFLARE_AI_GATEWAY_API_KEY`（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
