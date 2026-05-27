---
summary: "使用 OpenClaw 透過 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI 是 **GLM** 模型的 API 平台。它為 GLM 提供 REST API，並使用 API 金鑰進行身份驗證。在 Z.AI 主控台中建立您的 API 金鑰。
OpenClaw 使用 Z.AI API 金鑰搭配 `zai` 提供者。

| 屬性   | 值                                       |
| ------ | ---------------------------------------- |
| 提供者 | `zai`                                    |
| 驗證   | `ZAI_API_KEY` (舊版別名: `Z_AI_API_KEY`) |
| API    | Z.AI 聊天完成 (Bearer 驗證)              |

## GLM 模型

GLM 是一個模型系列，不是單獨的提供者。在 OpenClaw 中，GLM 模型使用
參照，例如 `zai/glm-5.1`：提供者 `zai`，模型 ID `glm-5.1`。

## 快速入門

<Tabs>
  <Tab title="自動偵測端點">
    **最適合：** 大多數使用者。OpenClaw 會使用您的 API 金鑰探測支援的 Z.AI 端點，並自動套用正確的基底 URL。

    <Steps>
      <Step title="執行入門">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="驗證模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="明確指定區域端點">
    **最適合：** 想要強制使用特定 Coding Plan 或一般 API 表面的使用者。

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
      <Step title="驗證模型已列出">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 設定範例

<Tip>`zai-api-key` 讓 OpenClaw 能從金鑰偵測相符的 Z.AI 端點，並 自動套用正確的基底 URL。當您想要強制使用特定 Coding Plan 或一般 API 表面時，請使用明確的區域選項。</Tip>

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  models: {
    providers: {
      zai: {
        // Example value. Onboarding writes the matching baseUrl for your endpoint.
        baseUrl: "https://api.z.ai/api/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

## 內建目錄

OpenClaw 在外掛程式清單中隨附了捆綁的 `zai` 提供者目錄，因此唯讀
列表可以在不載入提供者執行階段的情況下顯示已知的 GLM 項目：

```bash
openclaw models list --all --provider zai
```

目前支援的清單包含：

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
GLM 模型可作為 `zai/<model>` 使用（例如：`zai/glm-5`）。
</Tip>

<Note>預設捆綁的模型參考是 `zai/glm-5.1`。GLM 版本和可用性可能會變更；請執行 `openclaw models list --all --provider zai` 以查看您安裝的版本所知的目錄。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Forward-resolving unknown GLM-5 models">
    未知的 `glm-5*` ID 仍會在捆綁的提供者路徑上進行正向解析，
    當 ID 符合目前的 GLM-5 系列形狀時，會從 `glm-4.7` 樣板合成提供者擁有的中繼資料。
  </Accordion>

  <Accordion title="Tool-call streaming">
    Z.AI 工具呼叫串流預設已啟用 `tool_stream`。若要停用它：

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
    Z.AI 思考遵循 OpenClaw 的 `/think` 控制。當思考關閉時，
    OpenClaw 會發送 `thinking: { type: "disabled" }` 以避免回應在可見文字之前將輸出預算花費在 `reasoning_content` 上。

    保留的思考是選擇加入的，因為 Z.AI 需要重播完整的歷史 `reasoning_content`，這會增加提示詞 token。請針對每個模型啟用它：

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
    `thinking: { type: "enabled", clear_thinking: false }` 並重播先前的
    `reasoning_content` 以取得相同的 OpenAI 相容對話紀錄。

    進階使用者仍然可以透過
    `params.extra_body.thinking` 覆寫確切的供應商 payload。

  </Accordion>

  <Accordion title="影像理解">
    內建的 Z.AI 外掛會註冊影像理解功能。

    | 屬性      | 值       |
    | ------------- | ----------- |
    | 模型         | `glm-4.6v`  |

    影像理解會從已設定的 Z.AI 驗證自動解析 — 不需要
    額外的設定。

  </Accordion>

  <Accordion title="驗證詳細資訊">
    - Z.AI 使用您的 API 金鑰進行 Bearer 驗證。
    - `zai-api-key` 上線選項會透過使用您的金鑰探查支援的端點，自動偵測相符的 Z.AI 端點。
    - 當您想要強制使用特定的 API 時，請使用明確的區域選項 (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`)。
    - 舊版環境變數 `Z_AI_API_KEY` 仍然被接受；如果未設定 `ZAI_API_KEY`，OpenClaw 會在啟動時將其複製到 `ZAI_API_KEY`。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 設定架構，包括提供者和模型設定。
  </Card>
</CardGroup>
