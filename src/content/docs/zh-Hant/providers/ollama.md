---
summary: "使用 Ollama 執行 OpenClaw（雲端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

# Ollama

OpenClaw 與 Ollama 的原生 API (`/api/chat`) 整合，以支援託管的雲端模型和本地/自託管的 Ollama 伺服器。您可以透過三種模式使用 Ollama：透過可存取的 Ollama 主機進行 `Cloud + Local`、針對 `https://ollama.com` 進行 `Cloud only`，或是針對可存取的 Ollama 主機進行 `Local only`。

<Warning>**遠端 Ollama 使用者**：請勿在 OpenClaw 中使用 `/v1` OpenAI 相容的 URL (`http://host:11434/v1`)。這會導致工具呼叫失效，且模型可能會以純文字輸出原始工具 JSON。請改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（不包含 `/v1`）。</Warning>

## 快速入門

選擇您偏好的設定方法和模式。

<Tabs>
  <Tab title="Onboarding (recommended)">
    **最適用於：** 建立可運作的 Ollama 雲端或本機設定的最快速途徑。

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard
        ```

        徎供應商清單中選取 **Ollama**。
      </Step>
      <Step title="Choose your mode">
        - **Cloud + Local** — 本機 Ollama 主機加上透過該主機路由的雲端模型
        - **Cloud only** — 透過 `https://ollama.com` 的託管 Ollama 模型
        - **Local only** — 僅限本機模型
      </Step>
      <Step title="Select a model">
        `Cloud only` 會提示輸入 `OLLAMA_API_KEY` 並建議託管雲端預設值。`Cloud + Local` 和 `Local only` 會要求輸入 Ollama 基礎 URL，探索可用模型，並在選取的本機模型尚未可用時自動拉取。`Cloud + Local` 還會檢查該 Ollama 主機是否已登入以進行雲端存取。
      </Step>
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### 非互動模式

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    您也可以選擇指定自訂基礎 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="手動設定">
    **最適合：** 對雲端或本地設定的完全控制。

    <Steps>
      <Step title="選擇雲端或本地">
        - **雲端 + 本地**：安裝 Ollama，使用 `ollama signin` 登入，並透過該主機路由雲端請求
        - **僅雲端**：搭配 `OLLAMA_API_KEY` 使用 `https://ollama.com`
        - **僅本地**：從 [ollama.com/download](https://ollama.com/download) 安裝 Ollama
      </Step>
      <Step title="拉取本地模型（僅本地）">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="為 OpenClaw 啟用 Ollama">
        對於 `Cloud only`，請使用您真實的 `OLLAMA_API_KEY`。對於主機支援的設定，任何佔位符值皆可運作：

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="檢查並設定您的模型">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        或在設定中設定預設值：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 雲端模型

<Tabs>
  <Tab title="雲端 + 本地">
    `Cloud + Local` 使用可連線的 Ollama 主機作為本地和雲端模型的控制點。這是 Ollama 偏好的混合式流程。

    在設定過程中使用 **雲端 + 本地**。OpenClaw 會提示輸入 Ollama 基礎 URL，從該主機探索本地模型，並檢查主機是否已使用 `ollama signin` 登入以進行雲端存取。當主機已登入時，OpenClaw 也會建議託管雲端預設值，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主機尚未登入，OpenClaw 將保持僅本地的設定，直到您執行 `ollama signin`。

  </Tab>

  <Tab title="僅限雲端">
    `Cloud only` 針對 Ollama 在 `https://ollama.com` 的託管 API 執行。

    請在設定期間使用 **僅限雲端**。OpenClaw 會提示輸入 `OLLAMA_API_KEY`，設定 `baseUrl: "https://ollama.com"`，並植入託管雲端模型清單。此路徑**不**需要本機 Ollama 伺服器或 `ollama signin`。

    在 `openclaw onboard` 期間顯示的雲端模型清單是從 `https://ollama.com/api/tags` 即時填充的，上限為 500 個條目，因此選擇器反映的是目前的託管目錄，而非靜態種子。如果 `ollama.com` 無法連線或在設定期間未傳回任何模型，OpenClaw 會回退至先前的硬編碼建議，因此導入仍能完成。

  </Tab>

  <Tab title="僅限本機">
    在僅限本機模式下，OpenClaw 會從設定的 Ollama 實例探索模型。此路徑適用於本機或自託管的 Ollama 伺服器。

    OpenClaw 目前建議將 `gemma4` 作為本機預設值。

  </Tab>
</Tabs>

## 模型探索 (隱式提供者)

當您設定 `OLLAMA_API_KEY`（或驗證設定檔）但**未**定義 `models.providers.ollama` 時，OpenClaw 會從位於 `http://127.0.0.1:11434` 的本機 Ollama 實例探索模型。

| 行為       | 詳細資訊                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 目錄查詢   | 查詢 `/api/tags`                                                                                                                               |
| 功能偵測   | 使用盡力而為的 `/api/show` 查找來讀取 `contextWindow` 並偵測功能（包括視覺）                                                                   |
| 視覺模型   | 對於被 `/api/show` 回報具有 `vision` 功能的模型，會被標記為具備影像處理能力 (`input: ["text", "image"]`)，因此 OpenClaw 會自動將影像注入提示中 |
| 推理偵測   | 使用模型名稱啟發式 (`r1`, `reasoning`, `think`) 標記 `reasoning`                                                                               |
| Token 上限 | 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限                                                                               |
| 成本       | 將所有成本設定為 `0`                                                                                                                           |

這樣可以避免手動輸入模型，同時讓目錄與本機 Ollama 實例保持同步。

```bash
# See what models are available
ollama list
openclaw models list
```

若要新增模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型將會自動被探索並可供使用。

<Note>如果您明確設定 `models.providers.ollama`，將會跳過自動探索，且您必須手動定義模型。請參閱下方的明確設定章節。</Note>

## 視覺與圖像描述

隨附的 Ollama 插件將 Ollama 註冊為具備圖像功能的媒體理解供應商。這讓 OpenClaw 可以透過本機或託管的 Ollama 視覺模型，路由明確的圖像描述請求和已配置的圖像模型預設值。

對於本機視覺功能，請下載支援圖像的模型：

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

然後使用 infer CLI 進行驗證：

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` 必須是完整的 `<provider/model>` 參考。設定後，`openclaw infer image describe` 會直接執行該模型，而不是因為模型支援原生視覺功能而跳過描述。

若要將 Ollama 設為傳入媒體的預設圖像理解模型，請配置 `agents.defaults.imageModel`：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

如果您手動定義 `models.providers.ollama.models`，請標記具備圖像輸入支援的視覺模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 會拒絕針對未標記為具備圖像功能之模型的圖像描述請求。使用隱含探索時，當 `/api/show` 回報視覺功能時，OpenClaw 會從 Ollama 讀取此資訊。

## 組態設定

<Tabs>
  <Tab title="基本 (隱含探索)">
    最簡單的純本機啟用路徑是透過環境變數：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果已設定 `OLLAMA_API_KEY`，您可以在供應商項目中省略 `apiKey`，OpenClaw 會為可用性檢查自動填入。
    </Tip>

  </Tab>

  <Tab title="明確 (手動模型)">
    當您需要託管雲端設定、Ollama 在另一個主機/連接埠上執行、您想要強制使用特定內容視窗或模型清單，或是您想要完全手動定義模型時，請使用明確設定。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab title="自訂基礎 URL">
    如果 Ollama 在不同的主機或連接埠上執行 (明確設定會停用自動探索，因此請手動定義模型)：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
          },
        },
      },
    }
    ```

    <Warning>
    請勿在 URL 中新增 `/v1`。`/v1` 路徑使用 OpenAI 相容模式，其中的工具呼叫並不可靠。請使用不帶路徑後綴的基礎 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

### 模型選擇

設定完成後，您所有的 Ollama 模型即可使用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## Ollama 網路搜尋

OpenClaw 支援將 **Ollama 網路搜尋** 作為內建的 `web_search` 提供者。

| 屬性 | 詳細資訊                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------- |
| 主機 | 使用您設定的 Ollama 主機（設定時為 `models.providers.ollama.baseUrl`，否則為 `http://127.0.0.1:11434`） |
| 驗證 | 無金鑰                                                                                                  |
| 需求 | Ollama 必須正在執行並使用 `ollama signin` 登入                                                          |

在 `openclaw onboard` 或 `openclaw configure --section web` 期間選擇 **Ollama 網路搜尋**，或設定：

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

<Note>如需完整的設定和行為詳細資訊，請參閱 [Ollama 網路搜尋](/zh-Hant/tools/ollama-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **Tool calling is not reliable in OpenAI-compatible mode.** Use this mode only if you need OpenAI format for a proxy and do not depend on native tool calling behavior.
    </Warning>

    如果您需要改用 OpenAI 相容端點（例如，在僅支援 OpenAI 格式的 Proxy 後方），請明確設定 `api: "openai-completions"`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // default: true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    此模式可能不會同時支援串流和工具呼叫。您可能需要在模型設定中使用 `params: { streaming: false }` 停用串流。

    當 Ollama 使用 `api: "openai-completions"` 時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 無聲地回退到 4096 的內容視窗。如果您的 Proxy 或上游服務拒絕未知的 `options` 欄位，請停用此行為：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="Context windows">
    對於自動探索的模型，OpenClaw 會使用 Ollama 回報的內容視窗（如果可用），否則會回退到 OpenClaw 使用的預設 Ollama 內容視窗。

    您可以在明確的提供者設定中覆寫 `contextWindow` 和 `maxTokens`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
              }
            ]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 預設會將名稱包含 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具備推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    無需額外設定 —— OpenClaw 會自動標記它們。

  </Accordion>

<Accordion title="模型費用">Ollama 是免費的且在本地運行，因此所有模型費用均設為 $0。這適用於自動發現和手動定義的模型。</Accordion>

  <Accordion title="記憶嵌入">
    內建的 Ollama 外掛為
    [記憶搜尋](/zh-Hant/concepts/memory) 註冊了一個記憶嵌入提供者。它使用已設定的 Ollama 基礎 URL
    和 API 金鑰。

    | 屬性      | 值               |
    | ------------- | ------------------- |
    | 預設模型 | `nomic-embed-text`  |
    | 自動拉取     | 是 — 如果嵌入模型不在本地，會自動拉取 |

    若要選擇 Ollama 作為記憶搜尋的嵌入提供者：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="串流設定">
    OpenClaw 的 Ollama 整合預設使用 **原生的 Ollama API** (`/api/chat`)，完全支援同時進行串流和工具呼叫。無需特殊設定。

    對於原生的 `/api/chat` 請求，OpenClaw 也會直接將思考控制轉發給 Ollama：`/think off` 和 `openclaw agent --thinking off` 會發送頂層 `think: false`，而非 `off` 的思考層級則發送 `think: true`。

    <Tip>
    如果您需要使用 OpenAI 相容的端點，請參閱上方的「舊版 OpenAI 相容模式」章節。在該模式下，串流和工具呼叫可能無法同時運作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="未偵測到 Ollama">
    請確保 Ollama 正在運行，並且您設定了 `OLLAMA_API_KEY`（或認證設定檔），且您**沒有**定義明確的 `models.providers.ollama` 條目：

    ```bash
    ollama serve
    ```

    驗證 API 是否可存取：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="沒有可用的模型">
    如果未列出您的模型，請在本機拉取模型或在 `models.providers.ollama` 中明確定義它。

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="連線被拒">
    檢查 Ollama 是否在正確的連接埠上運行：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="模型提供者" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障轉移行為的概覽。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
  <Card title="Ollama 網路搜尋" href="/zh-Hant/tools/ollama-search" icon="magnifying-glass">
    Ollama 驅動網路搜尋的完整設定和行為細節。
  </Card>
  <Card title="設定" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考。
  </Card>
</CardGroup>
