---
summary: "在 OpenClaw 中使用 StepFun 模型"
read_when:
  - You want StepFun models in OpenClaw
  - You need StepFun setup guidance
title: "StepFun"
---

# StepFun

OpenClaw 包含一個捆綁的 StepFun 提供者插件，具有兩個提供者 ID：

- `stepfun` 用於標準端點
- `stepfun-plan` 用於 Step Plan 端點

內建目錄目前因介面而異：

- 標準：`step-3.5-flash`
- Step Plan：`step-3.5-flash`、`step-3.5-flash-2603`

## 區域和端點概覽

- 中國標準端點：`https://api.stepfun.com/v1`
- 全球標準端點：`https://api.stepfun.ai/v1`
- 中國 Step Plan 端點：`https://api.stepfun.com/step_plan/v1`
- 全球 Step Plan 端點：`https://api.stepfun.ai/step_plan/v1`
- Auth 環境變數：`STEPFUN_API_KEY`

在 `.com` 端點使用中國金鑰，在 `.ai`
端點使用全球金鑰。

## CLI 設定

互動式設定：

```bash
openclaw onboard
```

選擇其中一個驗證選項：

- `stepfun-standard-api-key-cn`
- `stepfun-standard-api-key-intl`
- `stepfun-plan-api-key-cn`
- `stepfun-plan-api-key-intl`

非互動式範例：

```bash
openclaw onboard --auth-choice stepfun-standard-api-key-intl --stepfun-api-key "$STEPFUN_API_KEY"
openclaw onboard --auth-choice stepfun-plan-api-key-intl --stepfun-api-key "$STEPFUN_API_KEY"
```

## 模型參考

- 標準預設模型：`stepfun/step-3.5-flash`
- Step Plan 預設模型：`stepfun-plan/step-3.5-flash`
- Step Plan 替代模型：`stepfun-plan/step-3.5-flash-2603`

## 內建目錄

標準 (`stepfun`)：

| 模型參考                 | 上下文  | 最大輸出 | 備註         |
| ------------------------ | ------- | -------- | ------------ |
| `stepfun/step-3.5-flash` | 262,144 | 65,536   | 預設標準模型 |

Step Plan (`stepfun-plan`)：

| 模型參考                           | 上下文  | 最大輸出 | 備註                  |
| ---------------------------------- | ------- | -------- | --------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536   | 預設 Step Plan 模型   |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536   | 額外的 Step Plan 模型 |

## 設定片段

標準提供者：

```json5
{
  env: { STEPFUN_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
  models: {
    mode: "merge",
    providers: {
      stepfun: {
        baseUrl: "https://api.stepfun.ai/v1",
        api: "openai-completions",
        apiKey: "${STEPFUN_API_KEY}",
        models: [
          {
            id: "step-3.5-flash",
            name: "Step 3.5 Flash",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

Step Plan 提供者：

```json5
{
  env: { STEPFUN_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
  models: {
    mode: "merge",
    providers: {
      "stepfun-plan": {
        baseUrl: "https://api.stepfun.ai/step_plan/v1",
        api: "openai-completions",
        apiKey: "${STEPFUN_API_KEY}",
        models: [
          {
            id: "step-3.5-flash",
            name: "Step 3.5 Flash",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
          {
            id: "step-3.5-flash-2603",
            name: "Step 3.5 Flash 2603",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 備註

- 該提供者已隨附於 OpenClaw 中，因此無需單獨安裝插件。
- `step-3.5-flash-2603` 目前僅在 `stepfun-plan` 上公開。
- 單一授權流程會同時為 `stepfun` 和 `stepfun-plan` 寫入符合區域的設定檔，因此可以同時探索這兩個介面。
- 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 來檢查或切換模型。
- 如需更廣泛的提供者概覽，請參閱 [Model providers](/en/concepts/model-providers)。
