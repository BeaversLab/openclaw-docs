---
summary: "配置 Moonshot K2 與 Kimi Coding（分開的供應商 + 金鑰）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供具有 OpenAI 相容端點的 Kimi API。配置供應商並將預設模型設定為 `moonshot/kimi-k2.5`，或使用 `kimi/kimi-code` 進行 Kimi Coding。

<Warning>Moonshot 和 Kimi Coding 是**分開的供應商**。金鑰不可互換，端點不同，模型參照也不同 (`moonshot/...` vs `kimi/...`)。</Warning>

## 內建模型目錄

[//]: # "moonshot-kimi-k2-ids:start"

| 模型參照                          | 名稱                   | 推理 | 輸入       | 內容    | 最大輸出 |
| --------------------------------- | ---------------------- | ---- | ---------- | ------- | -------- |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | 否   | 文字、圖片 | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | 是   | 文字       | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | 是   | 文字       | 262,144 | 262,144  |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | 否   | 文字       | 256,000 | 16,384   |

[//]: # "moonshot-kimi-k2-ids:end"

## 開始使用

選擇您的供應商並依照設定步驟操作。

<Tabs>
  <Tab title="Moonshot API">
    **最適合用於：** 透過 Moonshot 開放平台使用 Kimi K2 模型。

    <Steps>
      <Step title="選擇您的端點區域">
        | 驗證選項            | 端點                       | 區域        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | 國際 |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | 中國         |
      </Step>
      <Step title="執行入門設定">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        或針對中國端點：

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.5" },
            },
          },
        }
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
    </Steps>

    ### Config 範例

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.5" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
            "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
            "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
            "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
            // moonshot-kimi-k2-aliases:end
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              // moonshot-kimi-k2-models:start
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking",
                name: "Kimi K2 Thinking",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking-turbo",
                name: "Kimi K2 Thinking Turbo",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-turbo",
                name: "Kimi K2 Turbo",
                reasoning: false,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 16384,
              },
              // moonshot-kimi-k2-models:end
            ],
          },
        },
      },
    }
    ```

  </Tab>

  <Tab title="Kimi Coding">
    **最適合：** 透過 Kimi Coding 端點進行以程式碼為中心的任務。

    <Note>
    Kimi Coding 使用與 Moonshot (`moonshot/...`) 不同的 API 金鑰與提供者前綴 (`kimi/...`)。舊版模型參考 `kimi/k2p5` 仍被接受為相容性 ID。
    </Note>

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice kimi-code-api-key
        ```
      </Step>
      <Step title="Set a default model">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "kimi/kimi-code" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider kimi
        ```
      </Step>
    </Steps>

    ### 設定範例

    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-code" },
          models: {
            "kimi/kimi-code": { alias: "Kimi" },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## Kimi 網路搜尋

OpenClaw 也提供 **Kimi** 作為 `web_search` 提供者，由 Moonshot 網路搜尋支援。

<Steps>
  <Step title="Run interactive web search setup">
    ```bash
    openclaw configure --section web
    ```

    在網路搜尋區段中選擇 **Kimi** 以儲存
    `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step title="Configure the web search region and model">
    互動式設定會提示以下內容：

    | 設定                | 選項                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | API 區域            | `https://api.moonshot.ai/v1` (國際) 或 `https://api.moonshot.cn/v1` (中國) |
    | 網路搜尋模型        | 預設為 `kimi-k2.5`                                             |

  </Step>
</Steps>

設定位於 `plugins.entries.moonshot.config.webSearch` 之下：

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## 進階

<AccordionGroup>
  <Accordion title="原生思考模式">
    Moonshot Kimi 支援二進位原生思考：

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    透過 `agents.defaults.models.<provider/model>.params` 為每個模型進行配置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.5": {
              params: {
                thinking: { type: "disabled" },
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 也會對應 Moonshot 的執行時 `/think` 層級：

    | `/think` 層級       | Moonshot 行為          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非 off 層級    | `thinking.type=enabled`    |

    <Warning>
    當啟用 Moonshot 思考模式時，`tool_choice` 必須是 `auto` 或 `none`。OpenClaw 會將不相容的 `tool_choice` 值正規化為 `auto` 以確保相容性。
    </Warning>

  </Accordion>

<Accordion title="串流使用相容性">原生 Moonshot 端點（`https://api.moonshot.ai/v1` 和 `https://api.moonshot.cn/v1`）在共用的 `openai-completions` 傳輸上宣稱支援串流使用相容性。OpenClaw 會據此設定端點功能，因此針對相同原生 Moonshot 主機的相容自訂供應商 ID 會繼承相同的串流使用行為。</Accordion>

  <Accordion title="端點與模型參考">
    | 提供商   | 模型參考前綴 | 端點                      | 認證環境變數        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding 端點          | `KIMI_API_KEY`      |
    | 網路搜尋 | N/A              | 與 Moonshot API 區域相同   | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` |

    - Kimi 網路搜尋使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，並預設為 `https://api.moonshot.ai/v1` 且模型為 `kimi-k2.5`。
    - 如有需要，請在 `models.providers` 中覆寫定價與情境元數據。
    - 如果 Moonshot 發布了某個模型的不同情境限制，請相應調整 `contextWindow`。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供商、模型參考和故障轉移行為。
  </Card>
  <Card title="網路搜尋" href="/en/tools/web-search" icon="magnifying-glass">
    設定網路搜尋提供商，包括 Kimi。
  </Card>
  <Card title="設定參考" href="/en/gateway/configuration-reference" icon="gear">
    提供商、模型和外掛程式的完整設定架構。
  </Card>
  <Card title="Moonshot 開放平台" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 金鑰管理與文件。
  </Card>
</CardGroup>
