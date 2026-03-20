---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 設定（驗證 + 模型選擇）"
read_when:
  - 您想將 Vercel AI Gateway 與 OpenClaw 搭配使用
  - 您需要 API 金鑰環境變數或 CLI 驗證選項
---

# Vercel AI Gateway

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供統一的 API，可透過單一端點存取數百種模型。

- 提供者：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- API：相容 Anthropic Messages
- OpenClaw 會自動發現 Gateway `/v1/models` 目錄，因此 `/models vercel-ai-gateway`
  包含目前的模型參照，例如 `vercel-ai-gateway/openai/gpt-5.4`。

## 快速入門

1. 設定 API 金鑰（建議：為 Gateway 儲存金鑰）：

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
可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過
`env.shellEnv`）。

## 模型 ID 簡寫

OpenClaw 接受 Vercel Claude 簡寫模型參照，並在執行時將其標準化：

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
