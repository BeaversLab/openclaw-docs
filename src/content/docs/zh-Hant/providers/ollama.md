---
summary: "使用 Ollama 運行 OpenClaw（雲端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

OpenClaw 與 Ollama 的原生 API (`/api/chat`) 整合，用於託管的雲端模型和本地/自託管的 Ollama 伺服器。您可以透過三種模式使用 Ollama：透過可連線的 Ollama 主機進行 `Cloud + Local`，對 `https://ollama.com` 執行 `Cloud only`，或對可連線的 Ollama 主機執行 `Local only`。

<Warning>**遠端 Ollama 使用者**：請勿在 OpenClaw 中使用 `/v1` OpenAI 相容的 URL (`http://host:11434/v1`)。這會導致工具呼叫失效，且模型可能會以純文字形式輸出原始工具 JSON。請改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（無 `/v1`）。</Warning>

## 快速入門

選擇您偏好的設定方法和模式。

<Tabs>
  <Tab title="Onboarding (recommended)">
    **最適合：** 建立可運作的 Ollama 雲端或本機設定最快的途徑。

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
        `Cloud only` 會提示輸入 `OLLAMA_API_KEY` 並建議託管的雲端預設值。`Cloud + Local` 和 `Local only` 會詢問 Ollama 基礎 URL，探索可用的模型，如果選取的本機模型尚未可用，則會自動拉取。`Cloud + Local` 也會檢查該 Ollama 主機是否已登入以進行雲端存取。
      </Step>
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### Non-interactive mode

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    選擇性指定自訂基礎 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="Manual setup">
    **最適用於：** 對雲端或本機設定的完全控制。

    <Steps>
      <Step title="Choose cloud or local">
        - **雲端 + 本機**：安裝 Ollama，使用 `ollama signin` 登入，並透過該主機路由雲端請求
        - **僅雲端**：使用帶有 `OLLAMA_API_KEY` 的 `https://ollama.com`
        - **僅本機**：從 [ollama.com/download](https://ollama.com/download) 安裝 Ollama
      </Step>
      <Step title="Pull a local model (local only)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="Enable Ollama for OpenClaw">
        對於 `Cloud only`，請使用您真實的 `OLLAMA_API_KEY`。對於由主機支援的設定，任何預留位置值均可運作：

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspect and set your model">
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
  <Tab title="Cloud + Local">
    `Cloud + Local` 使用可連線的 Ollama 主機作為本機和雲端模型的控制點。這是 Ollama 偏好的混合流程。

    在設定過程中請使用 **Cloud + Local**。OpenClaw 會提示輸入 Ollama 基礎 URL，從該主機探索本機模型，並檢查主機是否已使用 `ollama signin` 登入以進行雲端存取。當主機已登入時，OpenClaw 也會建議託管的雲端預設模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主機尚未登入，OpenClaw 會將設定保持為僅限本機，直到您執行 `ollama signin`。

  </Tab>

  <Tab title="僅限雲端">
    `Cloud only` 針對 `https://ollama.com` 的 Ollama 託管 API 運行。

    在設定期間使用 **僅限雲端**。OpenClaw 會提示輸入 `OLLAMA_API_KEY`，設定 `baseUrl: "https://ollama.com"`，並植入託管的雲端模型清單。此路徑**不**需要本機 Ollama 伺服器或 `ollama signin`。

  </Tab>

  <Tab title="僅限本機">
    在僅限本機模式中，OpenClaw 會從設定的 Ollama 實例探索模型。此路徑適用於本機或自託管的 Ollama 伺服器。

    OpenClaw 目前建議將 `gemma4` 作為本機預設值。

  </Tab>
</Tabs>

## 模型探索 (隱式提供者)

當您設定 `OLLAMA_API_KEY` (或驗證設定檔) 且**未**定義 `models.providers.ollama` 時，OpenClaw 會從 `http://127.0.0.1:11434` 的本機 Ollama 實例探索模型。

| 行為       | 詳細資訊                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 目錄查詢   | 查詢 `/api/tags`                                                                                                                   |
| 功能偵測   | 使用盡力而為的 `/api/show` 查詢來讀取 `contextWindow` 並偵測功能 (包括視覺)                                                        |
| 視覺模型   | 由 `/api/show` 回報具備 `vision` 功能的模型會被標記為支援影像 (`input: ["text", "image"]`)，因此 OpenClaw 會自動將影像插入提示詞中 |
| 推理偵測   | 使用模型名稱啟發式方法標記 `reasoning` (`r1`、`reasoning`、`think`)                                                                |
| Token 上限 | 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 Token 上限                                                                   |
| 成本       | 將所有成本設定為 `0`                                                                                                               |

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

<Note>如果您明確設定 `models.providers.ollama`，將會跳過自動探索，您必須手動定義模型。請參閱下方的明確設定區段。</Note>

## 設定

<Tabs>
  <Tab title="基礎（隱式探索）">
    最簡單的僅限本機啟用路徑是透過環境變數：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果設定了 `OLLAMA_API_KEY`，您可以在供應商條目中省略 `apiKey`，OpenClaw 將會自動填寫以進行可用性檢查。
    </Tip>

  </Tab>

  <Tab title="顯式（手動模型）">
    當您想要設定託管的雲端、Ollama 運行在其他主機/連接埠上、您想要強制特定的內容視窗或模型列表，或者您想要完全手動的模型定義時，請使用顯式設定。

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
    如果 Ollama 運行在不同的主機或連接埠上（顯式設定會停用自動探索，因此請手動定義模型）：

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
    請勿在 URL 中新增 `/v1`。`/v1` 路徑使用的是 OpenAI 相容模式，其中的工具呼叫並不可靠。請使用不帶路徑後綴的基礎 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

### 模型選擇

設定完成後，您所有的 Ollama 模型皆可供使用：

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

OpenClaw 支援 **Ollama 網路搜尋** 作為內建的 `web_search` 供應商。

| 屬性 | 詳細資訊                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 主機 | 使用您設定的 Ollama 主機（若已設定則為 `models.providers.ollama.baseUrl`，否則為 `http://127.0.0.1:11434`） |
| 驗證 | 無金鑰                                                                                                      |
| 需求 | Ollama 必須正在運行並且已使用 `ollama signin` 登入                                                          |

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

<Note>有關完整的設定和行為細節，請參閱 [Ollama 網路搜尋](/zh-Hant/tools/ollama-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="舊版 OpenAI 相容模式">
    <Warning>
    **Tool calling 在 OpenAI 相容模式下並不可靠。** 僅在您需要為代理程式使用 OpenAI 格式且不依賴原生工具呼叫行為時使用此模式。
    </Warning>

    如果您需要改用 OpenAI 相容端點（例如，在僅支援 OpenAI 格式的代理程式後方），請明確設定 `api: "openai-completions"`：

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

    此模式可能無法同時支援串流和工具呼叫。您可能需要在模型設定中停用串流功能，設定 `params: { streaming: false }`。

    當 `api: "openai-completions"` 與 Ollama 搭配使用時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 靜默回退至 4096 的上下文視窗。如果您的代理程式/上游伺服器拒絕未知的 `options` 欄位，請停用此行為：

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

  <Accordion title="上下文視窗">
    對於自動探索的模型，OpenClaw 會在可用時使用 Ollama 回報的上下文視窗，否則會回退至 OpenClaw 使用的預設 Ollama 上下文視窗。

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
    OpenClaw 預設將名稱包含 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具備推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    不需要額外設定 —— OpenClaw 會自動標記這些模型。

  </Accordion>

<Accordion title="模型成本">Ollama 是免費且在本機執行的，因此所有模型成本均設為 $0。這同時適用於自動探索和手動定義的模型。</Accordion>

  <Accordion title="記憶體嵌入">
    內建的 Ollama 外掛為
    [記憶體搜尋](/zh-Hant/concepts/memory)註冊了一個記憶體嵌入提供者。它使用設定的 Ollama 基礎 URL
    和 API 金鑰。

    | 屬性      | 值               |
    | ------------- | ------------------- |
    | 預設模型 | `nomic-embed-text`  |
    | 自動拉取     | 是 — 如果本機不存在，嵌入模型將自動拉取 |

    若要選擇 Ollama 作為記憶體搜尋嵌入提供者：

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
    OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，它完全支援同時進行串流和工具呼叫。不需要特殊設定。

    <Tip>
    如果您需要使用 OpenAI 相容端點，請參閱上方的「舊版 OpenAI 相容模式」一節。在該模式下，串流和工具呼叫可能無法同時運作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="偵測不到 Ollama">
    請確保 Ollama 正在運作，且您已設定 `OLLAMA_API_KEY` (或身分驗證設定檔)，並且您**沒有**定義明確的 `models.providers.ollama` 項目：

    ```bash
    ollama serve
    ```

    驗證 API 是否可存取：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="沒有可用的模型">
    如果您的模型未列出，請在本機拉取模型或在 `models.providers.ollama` 中明確定義它。

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="連線被拒">
    檢查 Ollama 是否在正確的連接埠上運作：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>更多協助：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參考和故障轉移行為的概覽。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和配置模型。
  </Card>
  <Card title="Ollama Web Search" href="/zh-Hant/tools/ollama-search" icon="magnifying-glass">
    由 Ollama 驅動的網路搜尋的完整設定和行為詳情。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整配置參考。
  </Card>
</CardGroup>
