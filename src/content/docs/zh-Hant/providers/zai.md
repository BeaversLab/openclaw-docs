---
summary: "使用 Z.AI (GLM 模型) 搭配 OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它為 GLM 提供 REST API 並使用 API 金鑰進行身分驗證。請在 Z.AI 控制台中建立您的 API 金鑰。OpenClaw 使用 `zai` 提供者搭配 Z.AI API 金鑰。

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- API：Z.AI Chat Completions (Bearer auth)

## 開始使用

<Tabs>
  <Tab title="自動偵測端點">
    **最適用於：** 大多數使用者。OpenClaw 會從金鑰偵測相符的 Z.AI 端點，並自動套用正確的基礎 URL。

    <Steps>
      <Step title="執行入門引導">
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
    **最適用於：** 想要強制使用特定 Coding Plan 或一般 API 表面的使用者。

    <Steps>
      <Step title="選擇正確的入門選項">
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

## 內置目錄

OpenClaw 目前會以以下內容預先填充內建的 `zai` 提供者：

| 模型參照             | 備註     |
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
GLM 模型以 `zai/<model>` 的形式提供（例如：`zai/glm-5`）。預設的捆綁模型參考是 `zai/glm-5.1`。
</Tip>

## 進階設定

<AccordionGroup>
  <Accordion title="未知 GLM-5 模型的轉發解析">
    未知的 `glm-5*` ID 當符合目前的 GLM-5 系列形狀時，會透過從 `glm-4.7` 模板合成提供者擁有的中繼資料，在捆綁的提供者路徑上進行轉發解析。
  </Accordion>

  <Accordion title="工具呼叫串流">
    針對 Z.AI 的工具呼叫串流，預設啟用 `tool_stream`。若要停用它：

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

  <Accordion title="思考與保留的思考">
    Z.AI 思考遵循 OpenClaw 的 `/think` 控制。當思考關閉時，OpenClaw 會發送 `thinking: { type: "disabled" }` 以避免回應在可見文字之前將輸出預算花費在 `reasoning_content` 上。

    保留的思考為選用，因為 Z.AI 需要重新播放完整的歷史 `reasoning_content`，這會增加提示詞 token。請對每個模型啟用它：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.1": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    當啟用且思考開啟時，OpenClaw 會發送
    `thinking: { type: "enabled", clear_thinking: false }` 並為相同的 OpenAI 相容記錄重新播放先前的
    `reasoning_content`。

    進階使用者仍可透過 `params.extra_body.thinking` 覆寫確切的提供者負載。

  </Accordion>

  <Accordion title="圖片理解">
    捆綁的 Z.AI 外掛程式會註冊圖片理解。

    | 屬性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    圖片理解會從設定的 Z.AI 驗證自動解析 — 不需要
    額外的設定。

  </Accordion>

  <Accordion title="Auth details">
    - Z.AI 使用您的 API 金鑰進行 Bearer 認證。
    - `zai-api-key` 入門選項會從金鑰前綴自動偵測匹配的 Z.AI 端點。
    - 當您想要強制使用特定的 API 介面時，請使用明確的區域選項 (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`)。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="GLM model family" href="/zh-Hant/providers/glm" icon="microchip">
    GLM 模型系列概覽。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
</CardGroup>
