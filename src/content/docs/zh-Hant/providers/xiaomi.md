---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用與 OpenAI 相容的 Xiaomi
端點以及 API 金鑰驗證。請在 [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys) 中建立您的 API 金鑰，然後使用該金鑰設定
隨附的 `xiaomi` 提供者。

## 內建目錄

- Base URL：`https://api.xiaomimimo.com/v1`
- API：`openai-completions`
- 授權：`Bearer $XIAOMI_API_KEY`

| 模型參照               | 輸入       | 內容      | 最大輸出 | 備註             |
| ---------------------- | ---------- | --------- | -------- | ---------------- |
| `xiaomi/mimo-v2-flash` | 文字       | 262,144   | 8,192    | 預設模型         |
| `xiaomi/mimo-v2-pro`   | 文字       | 1,048,576 | 32,000   | 啟用推理         |
| `xiaomi/mimo-v2-omni`  | 文字、影像 | 262,144   | 32,000   | 啟用推理的多模態 |

## CLI 設定

```bash
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

## 備註

- 預設模型參照：`xiaomi/mimo-v2-flash`。
- 其他內建模型：`xiaomi/mimo-v2-pro`、`xiaomi/mimo-v2-omni`。
- 當設定 `XIAOMI_API_KEY` 時（或存在驗證設定檔），提供者會自動注入。
- 請參閱 [/concepts/model-providers](/en/concepts/model-providers) 以了解提供者規則。
