---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Vercel AI Gateway

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供統一的 API，可透過單一端點存取數百個模型。

- 供應商：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- API：相容 Anthropic Messages
- OpenClaw 會自動探索 Gateway `/v1/models` 型錄，因此 `/models vercel-ai-gateway`
  包含目前的模型參考，例如 `vercel-ai-gateway/openai/gpt-5.4`。

## 快速開始

1. 設定 API 金鑰（建議：為 Gateway 儲存它）：

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}
```

## 非互動式範例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 環境注意事項

如果 Gateway 以守護程式（launchd/systemd）執行，請確認 `AI_GATEWAY_API_KEY`
對該行程可用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 模型 ID 簡寫

OpenClaw 接受 Vercel Claude 簡寫模型參考，並在執行時將其正規化：

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
