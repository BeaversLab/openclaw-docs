---
summary: "設定 Moonshot K2 與 Kimi Coding（個別供應商 + 金鑰）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供與 OpenAI 相容端點的 Kimi API。設定
供應商並將預設模型設為 `moonshot/kimi-k2.6`，或是搭配
`kimi/kimi-code` 使用 Kimi Coding。

<Warning>Moonshot 和 Kimi Coding 是**獨立的供應商**。金鑰無法互通，端點不同，且模型參照也不同（`moonshot/...` vs `kimi/...`）。</Warning>

## 內建模型目錄

[//]: # "moonshot-kimi-k2-ids:start"

| 模型參照                          | 名稱                   | 推理 | 輸入       | 內容    | 最大輸出 |
| --------------------------------- | ---------------------- | ---- | ---------- | ------- | -------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6              | 否   | 文字、圖片 | 262,144 | 262,144  |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | 否   | 文字、圖片 | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | 是   | 文字       | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | 是   | 文字       | 262,144 | 262,144  |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | 否   | 文字       | 256,000 | 16,384   |

[//]: # "moonshot-kimi-k2-ids:end"

目前 Moonshot 託管的 K2 模型之組合成本估算使用 Moonshot 發布的隨用隨付費率：Kimi K2.6 為快取命中 $0.16/MTok、輸入 $0.95/MTok、輸出 $4.00/MTok；Kimi K2.5 為快取命中 $0.10/MTok、輸入 $0.60/MTok、輸出 $3.00/MTok。除非您在設定中覆寫，否則其他舊版目錄項目將保留零成本佔位符。

## 開始使用

選擇您的供應商並依照設定步驟操作。

<Tabs>
  <Tab title="Moonshot API">
    **最適用於：** 透過 Moonshot 開放平台使用 Kimi K2 模型。

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

        或是針對中國區端點：

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
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
      <Step title="執行即時冒煙測試">
        當您想要在不影響正常會話的情況下驗證模型存取權和成本追蹤時，
        請使用獨立的狀態目錄：

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking off \
          --json
        ```

        JSON 回應應回報 `provider: "moonshot"` 和
        `model: "kimi-k2.6"`。當 Moonshot 返回使用量中繼資料時，
        助手對話記錄項目會將標準化的 token 使用量和預估成本儲存在 `usage.cost` 下。
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
    Kimi Coding 使用與 Moonshot (`moonshot/...`) 不同的 API 金鑰和提供者前綴 (`kimi/...`)。舊版模型參考 `kimi/k2p5` 仍被接受為相容性 ID。
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

    ### Config example

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

OpenClaw 也隨附 **Kimi** 作為 `web_search` 提供者，由 Moonshot 網路搜尋支援。

<Steps>
  <Step title="Run interactive web search setup">
    ```bash
    openclaw configure --section web
    ```

    在網路搜尋區段中選擇 **Kimi** 以儲存
    `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step title="Configure the web search region and model">
    互動式設定會提示您設定：

    | Setting             | Options                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | API region          | `https://api.moonshot.ai/v1` (國際) 或 `https://api.moonshot.cn/v1` (中國) |
    | Web search model    | 預設為 `kimi-k2.6`                                             |

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

## 進階

<AccordionGroup>
  <Accordion title="原生思考模式">
    Moonshot Kimi 支援二元原生思考：

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    可以透過 `agents.defaults.models.<provider/model>.params` 針對每個模型進行設定：

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

    OpenClaw 也會對應 Moonshot 的執行時 `/think` 層級：

    | `/think` 層級       | Moonshot 行為          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非關閉層級    | `thinking.type=enabled`    |

    <Warning>
    當啟用 Moonshot 思考時，`tool_choice` 必須為 `auto` 或 `none`。為了相容性，OpenClaw 會將不相容的 `tool_choice` 值正規化為 `auto`。
    </Warning>

    Kimi K2.6 也接受一個可選的 `thinking.keep` 欄位，用於控制
    `reasoning_content` 的多輪保留。將其設為 `"all"` 可在輪次之間保留完整
    的推理過程；省略它（或保留為 `null`）則使用伺服器
    預設策略。OpenClaw 僅會為
    `moonshot/kimi-k2.6` 轉發 `thinking.keep`，並會從其他模型中將其移除。

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

  <Accordion title="工具呼叫 ID 清理化">
    Moonshot Kimi 在 OpenAI 相容傳輸層上提供形如 `functions.<name>:<index>` 的原生 tool_call id。OpenClaw 不再對 Moonshot 的這些 id 執行嚴格的清理，因此當服務層將處理過的 id 與原始工具定義進行比對時，透過 Kimi K2.6 的多輪 Agentic 流程可以在超過 2-3 輪工具呼叫後繼續正常運作。

    如果自訂的 OpenAI 相容供應商需要先前的行為，請在供應商設定項上設定 `sanitizeToolCallIds: true`。該標誌位於共用的 `openai-compatible` 重播系列上；Moonshot 預設連線至此退出選項。

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

  <Accordion title="Stream usage compatibility">
    Native Moonshot endpoints (`https://api.moonshot.ai/v1` and
    `https://api.moonshot.cn/v1`) advertise streaming usage compatibility on the
    shared `openai-completions` transport. OpenClaw keys that off endpoint
    capabilities, so compatible custom provider ids targeting the same native
    Moonshot hosts inherit the same streaming-usage behavior.

    With the bundled K2.6 pricing, streamed usage that includes input, output,
    and cache-read tokens is also converted into local estimated USD cost for
    `/status`, `/usage full`, `/usage cost`, and transcript-backed session
    accounting.

  </Accordion>

  <Accordion title="端點與模型參考對照">
    | Provider   | Model ref prefix | Endpoint                      | Auth env var        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding endpoint          | `KIMI_API_KEY`      |
    | Web search | N/A              | Same as Moonshot API region   | `KIMI_API_KEY` or `MOONSHOT_API_KEY` |

    - Kimi web search uses `KIMI_API_KEY` or `MOONSHOT_API_KEY`, and defaults to `https://api.moonshot.ai/v1` with model `kimi-k2.6`.
    - Override pricing and context metadata in `models.providers` if needed.
    - If Moonshot publishes different context limits for a model, adjust `contextWindow` accordingly.

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參考和故障轉移行為。
  </Card>
  <Card title="網路搜尋" href="/zh-Hant/tools/web" icon="magnifying-glass">
    設定網路搜尋提供者，包括 Kimi。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    提供者、模型和外掛程式的完整設定架構。
  </Card>
  <Card title="Moonshot 開放平台" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 金鑰管理和文件。
  </Card>
</CardGroup>
