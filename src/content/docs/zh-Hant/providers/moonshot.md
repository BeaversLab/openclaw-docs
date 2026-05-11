---
summary: "設定 Moonshot K2 與 Kimi Coding（個別供應商 + 金鑰）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

Moonshot 提供了與 OpenAI 相容端點的 Kimi API。設定供應商並將預設模型設為 `moonshot/kimi-k2.6`，或使用 `kimi/kimi-code` 的 Kimi Coding。

<Warning>Moonshot 和 Kimi Coding 是**分開的供應商**。API 金鑰不可互換，端點不同，且模型參照也不同（`moonshot/...` vs `kimi/...`）。</Warning>

## 內建模型目錄

[//]: # "moonshot-kimi-k2-ids:start"

| 模型參照                          | 名稱                   | 推理 | 輸入       | 語境    | 最大輸出 |
| --------------------------------- | ---------------------- | ---- | ---------- | ------- | -------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6              | 否   | 文字、圖片 | 262,144 | 262,144  |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | 否   | 文字、圖片 | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | 是   | 文字       | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | 是   | 文字       | 262,144 | 262,144  |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | 否   | 文字       | 256,000 | 16,384   |

[//]: # "moonshot-kimi-k2-ids:end"

目前 Moonshot 託管的 K2 模型的組合成本估計採用 Moonshot 發布的隨付費率：Kimi K2.6 為快取命中 $0.16/MTok，輸入 $0.95/MTok，輸出 $4.00/MTok；Kimi K2.5 為快取命中 $0.10/MTok，輸入 $0.60/MTok，輸出 $3.00/MTok。除非您在設定中覆寫，否則其他舊版目錄項目會保留零成本的預留位置。

## 開始使用

選擇您的供應商並依照設定步驟操作。

<Tabs>
  <Tab title="Moonshot API">
    **最適用於：** 透過 Moonshot 開放平台使用的 Kimi K2 模型。

    <Steps>
      <Step title="選擇您的端點區域">
        | Auth choice            | Endpoint                       | Region        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | International |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | China         |
      </Step>
      <Step title="執行入門設定">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        或是針對中國端點：

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.6" },
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
      <Step title="執行即時冒煙測試">
        當您想要驗證模型存取和成本追蹤，而又不想影響您正常的工作階段時，請使用獨立的狀態目錄：

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking off \
          --json
        ```

        JSON 回應應該會回報 `provider: "moonshot"` 和
        `model: "kimi-k2.6"`。當 Moonshot 回傳使用量中繼資料時，助理抄錄條目會在 `usage.cost` 下儲存標準化的 token 使用量加上估計成本。
      </Step>
    </Steps>

    ### 設定範例

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.6": { alias: "Kimi K2.6" },
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
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.6, output: 3, cacheRead: 0.1, cacheWrite: 0 },
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
    Kimi Coding 使用與 Moonshot (`moonshot/...`) 不同的 API 金鑰和提供者前綴 (`kimi/...`)。舊版模型參照 `kimi/k2p5` 仍作為相容性 ID 被接受。
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

OpenClaw 也隨附 **Kimi** 作為 `web_search` 提供者，由 Moonshot 網路搜尋提供支援。

<Steps>
  <Step title="Run interactive web search setup">
    ```bash
    openclaw configure --section web
    ```

    在網路搜尋區段中選擇 **Kimi** 以儲存
    `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step title="Configure the web search region and model">
    互動式設定會提示您輸入：

    | 設定                | 選項                                                                 |
    | ------------------- | -------------------------------------------------------------------- |
    | API 區域            | `https://api.moonshot.ai/v1` (國際) 或 `https://api.moonshot.cn/v1` (中國) |
    | 網路搜尋模型        | 預設為 `kimi-k2.6`                                             |

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
            model: "kimi-k2.6",
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

## 進階設定

<AccordionGroup>
  <Accordion title="Native thinking mode">
    Moonshot Kimi 支援二進位原生思維：

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    透過 `agents.defaults.models.<provider/model>.params` 針對每個模型進行設定：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "disabled" },
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 也會為 Moonshot 對應執行時的 `/think` 層級：

    | `/think` 層級       | Moonshot 行為          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非關閉層級    | `thinking.type=enabled`    |

    <Warning>
    當啟用 Moonshot 思維時，`tool_choice` 必須是 `auto` 或 `none`。為了相容性，OpenClaw 會將不相容的 `tool_choice` 值正規化為 `auto`。
    </Warning>

    Kimi K2.6 也接受一個可選的 `thinking.keep` 欄位，用於控制
    `reasoning_content` 的多輪保留。將其設定為 `"all"` 以在輪次之間保留完整的
    推理過程；省略它（或保留為 `null`）以使用伺服器
    預設策略。OpenClaw 僅會為 `moonshot/kimi-k2.6` 轉發
    `thinking.keep`，並會將其從其他模型中移除。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "enabled", keep: "all" },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Tool call id sanitization">
    Moonshot Kimi 提供的 tool_call id 格式如 `functions.<name>:<index>`。OpenClaw 會保留這些 id 不變，以便多輪工具呼叫能正常運作。

    若要在自訂的 OpenAI 相容供應商上強制執行嚴格的清理，請設定 `sanitizeToolCallIds: true`：

    ```json5
    {
      models: {
        providers: {
          "my-kimi-proxy": {
            api: "openai-completions",
            sanitizeToolCallIds: true,
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="串流使用量的相容性">
    原生 Moonshot 端點（`https://api.moonshot.ai/v1` 和
    `https://api.moonshot.cn/v1`）在共享的 `openai-completions` 傳輸上宣稱支援串流使用量相容性。OpenClaw 金鑰會關閉端點功能，因此針對相同原生 Moonshot 主機的相容自訂提供者 ID 會繼承相同的串流使用量行為。

    透過隨附的 K2.6 定價，包含輸入、輸出和快取讀取權杖的串流使用量也會轉換為 `/status`、`/usage full`、`/usage cost` 和逐字稿支援的會計核算的本地預估美元成本。

  </Accordion>

  <Accordion title="端點與模型參考參考資料">
    | 提供者   | 模型參考前綴 | 端點                      | 授權環境變數        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding 端點          | `KIMI_API_KEY`      |
    | 網路搜尋 | N/A              | 與 Moonshot API 區域相同   | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` |

    - Kimi 網路搜尋使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，並預設為 `https://api.moonshot.ai/v1`，模型為 `kimi-k2.6`。
    - 如有需要，請在 `models.providers` 中覆寫定價和情境中繼資料。
    - 如果 Moonshot 發布了模型的不同情境限制，請相應調整 `contextWindow`。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參考和故障轉移行為。
  </Card>
  <Card title="網路搜尋" href="/zh-Hant/tools/web" icon="magnifying-glass">
    設定網路搜尋供應商，包括 Kimi。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    供應商、模型和外掛程式的完整設定架構。
  </Card>
  <Card title="Moonshot 開放平台" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 金鑰管理與文件。
  </Card>
</CardGroup>
