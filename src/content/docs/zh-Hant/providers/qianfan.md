---
summary: "使用 Qianfan 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

# Qianfan 提供者指南

Qianfan 是百度的 MaaS 平台，提供了一個**統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可使用。

## 先決條件

1. 具備 Qianfan API 存取權限的百度雲帳戶
2. 來自 Qianfan 控制台的 API 金鑰
3. 系統上已安裝 OpenClaw

## 取得您的 API 金鑰

1. 造訪 [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 建立新應用程式或選取現有應用程式
3. 產生 API 金鑰（格式：`bce-v3/ALTAK-...`）
4. 複製 API 金鑰以供 OpenClaw 使用

## CLI 設定

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 配置片段

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

## 注意事項

- 預設套件模型參照：`qianfan/deepseek-v3.2`
- 預設基礎 URL：`https://qianfan.baidubce.com/v2`
- 套件目錄目前包含 `deepseek-v3.2` 和 `ernie-5.0-thinking-preview`
- 僅在您需要自訂基礎 URL 或模型元資料時，才新增或覆寫 `models.providers.qianfan`
- Qianfan 透過 OpenAI 相容的傳輸路徑運作，而非原生 OpenAI 請求塑形

## 相關文件

- [OpenClaw 配置](/en/gateway/configuration)
- [模型提供者](/en/concepts/model-providers)
- [Agent 設定](/en/concepts/agent)
- [Qianfan API 文件](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
