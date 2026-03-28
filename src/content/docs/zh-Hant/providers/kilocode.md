---
title: "Kilo Gateway"
summary: "使用 Kilo Gateway 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway 提供了一個 **統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 取得 API 金鑰

1. 前往 [app.kilo.ai](https://app.kilo.ai)
2. 登入或建立帳號
3. 前往 API 金鑰並產生新的金鑰

## CLI 設定

```exec
openclaw onboard --kilocode-api-key <key>
```

或是設定環境變數：

```exec
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

預設模型是 `kilocode/kilo/auto`，這是一個智慧路由模型，會根據任務自動選擇最佳底層模型：

- 規劃、除錯和協調任務會路由到 Claude Opus
- 程式碼撰寫和探索任務會路由到 Claude Sonnet

## 可用模型

OpenClaw 會在啟動時從 Kilo Gateway 動態探索可用的模型。請使用
`/models kilocode` 來查看您的帳戶可用的完整模型清單。

任何在 Gateway 上可用的模型都可以搭配 `kilocode/` 前綴使用：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## 注意事項

- 模型參照是 `kilocode/<model-id>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 預設模型：`kilocode/kilo/auto`
- Base URL：`https://api.kilo.ai/api/gateway/`
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
- Kilo Gateway 在底層使用含有您的 API 金鑰的 Bearer token。
