---
title: "Kilo Gateway"
summary: "使用 Kilo Gateway 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway 提供了一個 **統一 API**，可將請求路由到位於單一端點和 API 金鑰後方的多種模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可使用。

## 取得 API 金鑰

1. 前往 [app.kilo.ai](https://app.kilo.ai)
2. 登入或建立帳戶
3. 前往 API 金鑰並產生新的金鑰

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

- 規劃、除錯和編排任務會路由到 Claude Opus
- 程式碼撰寫和探索任務會路由到 Claude Sonnet

## 可用模型

OpenClaw 會在啟動時動態探索 Kilo Gateway 上的可用模型。使用
`/models kilocode` 查看您帳戶可用的完整模型清單。

閘道上可用的任何模型都可以使用 `kilocode/` 前綴：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## 備註

- 模型參考是 `kilocode/<model-id>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 預設模型：`kilocode/kilo/auto`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/en/concepts/model-providers)。
- Kilo Gateway 在底層使用帶有您 API 金鑰的 Bearer 權杖。
