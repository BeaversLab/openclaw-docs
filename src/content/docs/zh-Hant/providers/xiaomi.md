---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用 Xiaomi OpenAI 相容端點並透過 API 金鑰進行驗證。請在 [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys) 中建立您的 API 金鑰，然後使用該金鑰設定內建的 `xiaomi` 提供者。

## 模型概覽

- **mimo-v2-flash**：預設文字模型，262144 token 上下文視窗
- **mimo-v2-pro**：推理文字模型，1048576 token 上下文視窗
- **mimo-v2-omni**：推理多模態模型，支援文字和圖片輸入，262144 token 上下文視窗
- Base URL: `https://api.xiaomimimo.com/v1`
- API: `openai-completions`
- Authorization: `Bearer $XIAOMI_API_KEY`

## CLI 設定

```exec
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## 設定片段

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

## 注意事項

- 預設模型參考：`xiaomi/mimo-v2-flash`。
- 其他內建模型：`xiaomi/mimo-v2-pro`、`xiaomi/mimo-v2-omni`。
- 當設定了 `XIAOMI_API_KEY`（或存在認證設定檔）時，提供者會自動注入。
- 請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 以了解提供者規則。
