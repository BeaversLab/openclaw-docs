---
summary: "使用 Kilo Gateway 的統一 API 存取 OpenClaw 中的多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway 提供了一個 **unified API**，可以將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

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

- 規劃、除錯和編排任務會路由至 Claude Opus
- 程式碼撰寫和探索任務會路由至 Claude Sonnet

## 可用模型

OpenClaw 會在啟動時從 Kilo Gateway 動態探索可用的模型。使用
`/models kilocode` 查看您帳戶可用的完整模型列表。

閘道上可用的任何模型都可以使用 `kilocode/` 前綴：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...and many more
```

## 備註

- 模型參照為 `kilocode/<model-id>` (例如 `kilocode/anthropic/claude-sonnet-4`)。
- 預設模型：`kilocode/kilo/auto`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 如需更多模型/提供者選項，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
- Kilo Gateway 在底層使用帶有您的 API 金鑰的 Bearer token。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
