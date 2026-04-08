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
openclaw onboard --auth-choice kilocode-api-key
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

預設模型為 `kilocode/kilo/auto`，這是一個由 Kilo Gateway 管理的供應商擁有的智慧路由模型。

OpenClaw 將 `kilocode/kilo/auto` 視為穩定的預設參考，但並未發布該路由的基於來源的任務到上游模型映射。

## 可用模型

OpenClaw 在啟動時會動態從 Kilo Gateway 探索可用模型。使用 `/models kilocode` 查看您的帳戶可用的完整模型列表。

閘道上可用的任何模型都可以與 `kilocode/` 前綴一起使用：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.4
kilocode/google/gemini-3-pro-preview
...and many more
```

## 註記

- 模型參考為 `kilocode/<model-id>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 預設模型：`kilocode/kilo/auto`
- Base URL：`https://api.kilo.ai/api/gateway/`
- 隨附的回退目錄總是包含 `kilocode/kilo/auto` (`Kilo Auto`)，並帶有
  `input: ["text", "image"]`、`reasoning: true`、`contextWindow: 1000000`
  和 `maxTokens: 128000`
- 在啟動時，OpenClaw 會嘗試 `GET https://api.kilo.ai/api/gateway/models` 並
  將探索到的模型合併到靜態回退目錄之前
- `kilocode/kilo/auto` 背後的精確上游路由由 Kilo Gateway 擁有，
  而非硬編碼在 OpenClaw 中
- Kilo Gateway 在原始碼中記載為與 OpenRouter 相容，因此它保持
  在代理式 OpenAI 相容路徑上，而不是原生 OpenAI 請求塑形
- 基於 Gemini 的 Kilo 參考保持在代理 Gemini 路徑上，因此 OpenClaw 在該處保留
  Gemini 思維簽章清理，而不啟用原生 Gemini
  重播驗證或引導重寫。
- Kilo 的共享串流包裝器會新增供應商應用程式標頭並針對支援的具體模型參考正規化
  代理推理有效載荷。`kilocode/kilo/auto`
  和其他不支援代理推理的提示會跳過該推理注入。
- 如需更多模型/供應商選項，請參閱 [/concepts/model-providers](/en/concepts/model-providers)。
- Kilo Gateway 在底層使用具有您的 API 金鑰的 Bearer 權杖。
