---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API，并使用 API 密鑰進行身份驗證。請在 Z.AI 控制台中建立您的 API 密鑰。OpenClaw 使用 `zai` 提供者搭配 Z.AI API 密鑰。

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- API：Z.AI Chat Completions (Bearer 驗證)

## 快速入門

<Tabs>
  <Tab title="自動偵測端點">
    **最適合：**大多數使用者。OpenClaw 會從金鑰偵測相符的 Z.AI 端點，並自動套用正確的基底 URL。

    <Steps>
      <Step title="執行引導設定">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="明確指定區域端點">
    **最適合：**想要強制使用特定編碼方案或一般 API 介面的使用者。

    <Steps>
      <Step title="選擇正確的引導設定選項">
        ```bash
        # Coding Plan Global (recommended for Coding Plan users)
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN (China region)
        openclaw onboard --auth-choice zai-coding-cn

        # General API
        openclaw onboard --auth-choice zai-global

        # General API CN (China region)
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 隨附的 GLM 目錄

OpenClaw 目前使用以下內容初始化隨附的 `zai` 提供者：

| 模型參考             | 備註     |
| -------------------- | -------- |
| `zai/glm-5.1`        | 預設模型 |
| `zai/glm-5`          |          |
| `zai/glm-5-turbo`    |          |
| `zai/glm-5v-turbo`   |          |
| `zai/glm-4.7`        |          |
| `zai/glm-4.7-flash`  |          |
| `zai/glm-4.7-flashx` |          |
| `zai/glm-4.6`        |          |
| `zai/glm-4.6v`       |          |
| `zai/glm-4.5`        |          |
| `zai/glm-4.5-air`    |          |
| `zai/glm-4.5-flash`  |          |
| `zai/glm-4.5v`       |          |

<Tip>
GLM 模型可用作 `zai/<model>`（例如：`zai/glm-5`）。預設的打包模型參照為 `zai/glm-5.1`。
</Tip>

## 進階設定

<AccordionGroup>
  <Accordion title="Forward-resolving unknown GLM-5 models">
    未知的 `glm-5*` ID 若符合目前 GLM-5 系列的形狀，仍會透過從 `glm-4.7` 樣板綜合供應商擁有的元資料，在打包的供應商路徑上進行向前解析。
  </Accordion>

  <Accordion title="Tool-call streaming">
    針對 Z.AI 工具呼叫串流，預設已啟用 `tool_stream`。若要停用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Image understanding">
    打包的 Z.AI 外掛程式已註冊圖片理解功能。

    | 屬性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    圖片理解會從設定的 Z.AI 驗證資訊自動解析 — 無需額外設定。

  </Accordion>

  <Accordion title="Auth details">
    - Z.AI 使用與您的 API 金鑰搭配的 Bearer 驗證。
    - `zai-api-key` 入門選項會根據金鑰字首自動偵測相符的 Z.AI 端點。
    - 當您想要強制使用特定的 API 介面時，請使用明確的區域選項（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="GLM model family" href="/en/providers/glm" icon="microchip">
    GLM 模型系列概覽。
  </Card>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
</CardGroup>
