---
title: "Kilo Gateway"
summary: "Use Kilo Gateway's unified API to access many models in OpenClaw"
read_when:
  - 您想要使用單一 API 金鑰來存取多個 LLM
  - 您想要在 OpenClaw 中透過 Kilo Gateway 執行模型
---

# Kilo Gateway

Kilo Gateway 提供一個**統一 API**，將請求路由到單一端點和 API 金鑰後方的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 取得 API 金鑰

1. 前往 [app.kilo.ai](https://app.kilo.ai)
2. 登入或建立帳戶
3. 前往 API Keys 並產生新的金鑰

## CLI 設定

```bash
openclaw onboard --kilocode-api-key <key>
```

或是設定環境變數：

```bash
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## 設定片段

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

## 預設模型

預設模型是 `kilocode/kilo/auto`，這是一個智慧路由模型，會根據任務自動選擇最佳的底層模型：

- 規劃、偵錯和編排任務會路由到 Claude Opus
- 程式碼撰寫和探索任務會路由到 Claude Sonnet

## 可用模型

OpenClaw 會在啟動時動態探索 Kilo Gateway 上的可用模型。使用
`/models kilocode` 查看您的帳戶可用的完整模型列表。

閘道上可用的任何模型都可以使用 `kilocode/` 前綴：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## 備註

- 模型參照是 `kilocode/<model-id>` (例如 `kilocode/anthropic/claude-sonnet-4`)。
- 預設模型：`kilocode/kilo/auto`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
- Kilo Gateway 在底層使用包含您 API 金鑰的 Bearer token。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
