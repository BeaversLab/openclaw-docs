---
summary: "使用 OpenClaw 的 StepFun 模型"
read_when:
  - You want StepFun models in OpenClaw
  - You need StepFun setup guidance
title: "StepFun"
---

OpenClaw 包含一個捆綁的 StepFun 提供者外掛，具有兩個提供者 ID：

- `stepfun` 用於標準端點
- `stepfun-plan` 用於 Step Plan 端點

<Warning>Standard 和 Step Plan 是具有不同端點和模型參考前綴的 **獨立提供者**（`stepfun/...` vs `stepfun-plan/...`）。請將中國金鑰用於 `.com` 端點，將全球金鑰用於 `.ai` 端點。</Warning>

## 區域與端點概覽

| 端點      | 中國 (`.com`)                          | 全球 (`.ai`)                          |
| --------- | -------------------------------------- | ------------------------------------- |
| Standard  | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| Step Plan | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

認證環境變數：`STEPFUN_API_KEY`

## 內建目錄

Standard (`stepfun`)：

| 模型參考                 | 語境    | 最大輸出 | 備註         |
| ------------------------ | ------- | -------- | ------------ |
| `stepfun/step-3.5-flash` | 262,144 | 65,536   | 預設標準模型 |

Step Plan (`stepfun-plan`)：

| 模型參考                           | 語境    | 最大輸出 | 備註                  |
| ---------------------------------- | ------- | -------- | --------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536   | 預設 Step Plan 模型   |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536   | 額外的 Step Plan 模型 |

## 開始使用

選擇您的提供者介面並依照設定步驟進行。

<Tabs>
  <Tab title="Standard">
    **最適合：** 透過標準 StepFun 端點進行一般用途使用。

    <Steps>
      <Step title="Choose your endpoint region">
        | Auth choice                      | Endpoint                         | Region        |
        | -------------------------------- | -------------------------------- | ------------- |
        | `stepfun-standard-api-key-intl`  | `https://api.stepfun.ai/v1`     | International |
        | `stepfun-standard-api-key-cn`    | `https://api.stepfun.com/v1`    | China         |
      </Step>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl
        ```

        Or for the China endpoint:

        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-cn
        ```
      </Step>
      <Step title="Non-interactive alternative">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider stepfun
        ```
      </Step>
    </Steps>

    ### Model refs

    - Default model: `stepfun/step-3.5-flash`

  </Tab>

  <Tab title="Step Plan">
    **最適合：** Step Plan 推理端點。

    <Steps>
      <Step title="Choose your endpoint region">
        | Auth choice                  | Endpoint                                | Region        |
        | ---------------------------- | --------------------------------------- | ------------- |
        | `stepfun-plan-api-key-intl`  | `https://api.stepfun.ai/step_plan/v1`  | International |
        | `stepfun-plan-api-key-cn`    | `https://api.stepfun.com/step_plan/v1` | China         |
      </Step>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl
        ```

        Or for the China endpoint:

        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-cn
        ```
      </Step>
      <Step title="Non-interactive alternative">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider stepfun-plan
        ```
      </Step>
    </Steps>

    ### Model refs

    - Default model: `stepfun-plan/step-3.5-flash`
    - Alternate model: `stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

## 進階設定

<AccordionGroup>
  <Accordion title="完整設定：標準供應商">
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
  </Accordion>

  <Accordion title="完整設定：Step Plan 供應商">
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
  </Accordion>

  <Accordion title="備註">
    - 此提供者已內建於 OpenClaw 中，因此無需額外安裝外掛程式。
    - `step-3.5-flash-2603` 目前僅在 `stepfun-plan` 上公開。
    - 單一驗證流程會同時為 `stepfun` 和 `stepfun-plan` 寫入符合區域的設定檔，因此兩個介面可以一起被探索到。
    - 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 來檢查或切換模型。

  </Accordion>
</AccordionGroup>

<Note>若要查看更廣泛的供應商概覽，請參閱[模型供應商](/zh-Hant/concepts/model-providers)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有供應商、模型參照和故障轉移行為的概覽。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    供應商、模型和外掛程式的完整設定架構。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
  <Card title="StepFun 平台" href="https://platform.stepfun.com" icon="globe">
    StepFun API 金鑰管理和文件。
  </Card>
</CardGroup>
