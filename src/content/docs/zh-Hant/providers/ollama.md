---
summary: "使用 Ollama 執行 OpenClaw（雲端與本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw 整合了 Ollama 的原生 API (`/api/chat`)，用於託管的雲端模型以及本地/自行託管的 Ollama 伺服器。您可以透過三種模式使用 Ollama：`Cloud + Local` 透過可連線的 Ollama 主機、`Cloud only` 針對 `https://ollama.com`，或 `Local only` 針對可連線的 Ollama 主機。

<Warning>**遠端 Ollama 使用者**：請勿在 OpenClaw 中使用 `/v1` OpenAI 相容 URL (`http://host:11434/v1`)。這會破壞工具呼叫，且模型可能會將原始工具 JSON 以純文字形式輸出。請改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（無 `/v1`）。</Warning>

Ollama 提供者設定使用 `baseUrl` 作為標準金鑰。OpenClaw 也接受 `baseURL` 以相容於 OpenAI SDK 風格的範例，但新設定應優先使用 `baseUrl`。

## 驗證規則

<AccordionGroup>
  <Accordion title="本地與 LAN 主機">
    本地與 LAN Ollama 主機不需要真正的 bearer token。OpenClaw 僅針對 loopback、私人網路、`.local`，以及純主機名稱的 Ollama 基礎 URL 使用本地 `ollama-local` 標記。
  </Accordion>
  <Accordion title="遠端與 Ollama Cloud 主機">
    遠端公開主機和 Ollama Cloud (`https://ollama.com`) 需要透過 `OLLAMA_API_KEY`、驗證設定檔或提供者的 `apiKey` 提供真實憑證。
  </Accordion>
  <Accordion title="Custom provider ids">
    設定 `api: "ollama"` 的自訂供應商 ID 遵循相同的規則。例如，指向私人 LAN Ollama 主機的 `ollama-remote` 供應商可以使用 `apiKey: "ollama-local"`，子代理程式將透過 Ollama 供應商掛鈎來解析該標記，而不是將其視為遺失的憑證。
  </Accordion>
  <Accordion title="Memory embedding scope">
    當 Ollama 用於記憶體嵌入時，Bearer 認證的範圍限定於宣告它的主機：

    - 供應商層級的金鑰僅傳送至該供應商的 Ollama 主機。
    - `agents.*.memorySearch.remote.apiKey` 僅傳送至其遠端嵌入主機。
    - 純粹的 `OLLAMA_API_KEY` 環境變數值被視為 Ollama Cloud 慣例，預設不會傳送至本機或自託管主機。

  </Accordion>
</AccordionGroup>

## 開始使用

選擇您偏好的設定方法和模式。

<Tabs>
  <Tab title="入門指南（推薦）">
    **最適用於：** 快速建立可運作的 Ollama 雲端或本機設定。

    <Steps>
      <Step title="執行入門指南">
        ```bash
        openclaw onboard
        ```

        徇供應商列表中選取 **Ollama**。
      </Step>
      <Step title="選擇您的模式">
        - **雲端 + 本機** — 本機 Ollama 主機加上透過該主機路由的雲端模型
        - **僅雲端** — 透過 `https://ollama.com` 的託管 Ollama 模型
        - **僅本機** — 僅本機模型
      </Step>
      <Step title="選擇模型">
        `Cloud only` 會提示輸入 `OLLAMA_API_KEY` 並建議託管的雲端預設值。`Cloud + Local` 和 `Local only` 會詢問 Ollama 基礎 URL、探索可用的模型，且如果選取的本機模型尚未提供，則會自動拉取。當 Ollama 回報已安裝的 `:latest` 標籤（例如 `gemma4:latest`）時，設定會顯示該已安裝的模型一次，而不是同時顯示 `gemma4` 和 `gemma4:latest` 或再次拉取裸別名。`Cloud + Local` 也會檢查該 Ollama 主機是否已登入以進行雲端存取。
      </Step>
      <Step title="驗證模型是否可用">
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
    **最適用於：** 對雲端或本機設定擁有完全控制權。

    <Steps>
      <Step title="選擇雲端或本機">
        - **Cloud + Local**：安裝 Ollama，使用 `ollama signin` 登入，並透過該主機路由雲端請求
        - **Cloud only**：搭配 `OLLAMA_API_KEY` 使用 `https://ollama.com`
        - **Local only**：從 [ollama.com/download](https://ollama.com/download) 安裝 Ollama
      </Step>
      <Step title="拉取本機模型（僅限本機）">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="為 OpenClaw 啟用 Ollama">
        若為 `Cloud only`，請使用您的真實 `OLLAMA_API_KEY`。對於由主機支援的設定，任何預留位置值皆可運作：

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
  <Tab title="Cloud + Local">
    `Cloud + Local` 使用可連線的 Ollama 主機作為本機與雲端模型的控制點。這是 Ollama 偏好的混合式流程。

    在設定期間使用 **Cloud + Local**。OpenClaw 會提示輸入 Ollama 基礎 URL，從該主機探索本機模型，並檢查主機是否已使用 `ollama signin` 登入以進行雲端存取。當主機已登入時，OpenClaw 也會建議託管的雲端預設值，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    若主機尚未登入，OpenClaw 會將設定保持為僅限本機，直到您執行 `ollama signin`。

  </Tab>

  <Tab title="僅限雲端">
    `Cloud only` 針對位於 `https://ollama.com` 的 Ollama 託管 API 執行。

    設定期間請使用 **僅限雲端**。OpenClaw 會提示輸入 `OLLAMA_API_KEY`，設定 `baseUrl: "https://ollama.com"`，並植入託管的雲端模型清單。此路徑**不**需要本機 Ollama 伺服器或 `ollama signin`。

    `openclaw onboard` 期間顯示的雲端模型清單是從 `https://ollama.com/api/tags` 即時填充的，上限為 500 個項目，因此選擇器反映的是目前的託管目錄，而不是靜態的種子值。如果 `ollama.com` 在設定時無法連線或未傳回任何模型，OpenClaw 會回退到先前的硬編碼建議，以便完成設定流程。

  </Tab>

  <Tab title="僅限本機">
    在僅本機模式下，OpenClaw 會從設定的 Ollama 執行個體探索模型。此路徑適用於本機或自託管的 Ollama 伺服器。

    OpenClaw 目前建議使用 `gemma4` 作為本機預設值。

  </Tab>
</Tabs>

## 模型探索（隱性提供者）

當您設定 `OLLAMA_API_KEY`（或驗證設定檔）但**未**定義 `models.providers.ollama` 或其他具有 `api: "ollama"` 的自訂遠端提供者時，OpenClaw 會從位於 `http://127.0.0.1:11434` 的本機 Ollama 執行個體探索模型。

| 行為       | 詳細資訊                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 目錄查詢   | 查詢 `/api/tags`                                                                                                                 |
| 功能檢測   | 使用盡力而為的 `/api/show` 查詢來讀取 `contextWindow`、擴充的 `num_ctx` Modelfile 參數，以及包括視覺/工具在內的功能              |
| 視覺模型   | 由 `/api/show` 回報具有 `vision` 功能的模型會被標記為支援圖像 (`input: ["text", "image"]`)，因此 OpenClaw 會自動將圖像注入提示中 |
| 推理檢測   | 使用模型名稱啟發法標記 `reasoning` (`r1`、`reasoning`、`think`)                                                                  |
| Token 限制 | 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限                                                                 |
| 費用       | 將所有費用設定為 `0`                                                                                                             |

這避免了手動輸入模型，同時保持目錄與本機 Ollama 執行個體同步。

```bash
# See what models are available
ollama list
openclaw models list
```

若要新增模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型將會自動被發現並可供使用。

<Note>如果您明確設定了 `models.providers.ollama`，或是設定了具有 `api: "ollama"` 的自訂遠端供應商（例如 `models.providers.ollama-cloud`），將會跳過自動發現功能，您必須手動定義模型。例如 `http://127.0.0.2:11434` 的回送自訂供應商仍會被視為本機。請參閱下方的明確設定部分。</Note>

## 視覺與圖片描述

內建的 Ollama 外掛程式將 Ollama 註冊為具備圖片功能的媒體理解供應商。這讓 OpenClaw 可以透過本機或託管的 Ollama 視覺模型來路由明確的圖片描述請求以及設定的圖片模型預設值。

若要使用本機視覺功能，請拉取支援圖片的模型：

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

`--model` 必須是完整的 `<provider/model>` 參考。當它被設定時，`openclaw infer image describe` 會直接執行該模型，而不是因為模型支援原生視覺功能而跳過描述。

若要將 Ollama 設定為傳入媒體的預設圖片理解模型，請設定 `agents.defaults.imageModel`：

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

緩慢的本機視覺模型可能需要比雲端模型更長的圖片理解逾時時間。當 Ollama 嘗試在受限硬體上配置完整宣傳的視覺上下文時，它們也可能當機或停止。當您只需要一般的圖片描述輪次時，請設定功能逾時時間，並在模型項目上限制 `num_ctx`：

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

此逾時時間適用於傳入的圖片理解以及代理程式在輪次期間可以呼叫的明確 `image` 工具。供應商層級的 `models.providers.ollama.timeoutSeconds` 仍然控制正常模型呼叫的底層 Ollama HTTP 請求防護。

使用以下指令針對本機 Ollama 即時驗證明確的圖片工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手動定義 `models.providers.ollama.models`，請標記具有圖片輸入支援的視覺模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

對於未標記為具備影像功能的模型，OpenClaw 會拒絕其圖片描述請求。使用隱式探索時，當 `/api/show` 回報視覺能力時，OpenClaw 會從 Ollama 讀取此資訊。

## 設定

<Tabs>
  <Tab title="基本 (隱式探索)">
    最簡單的僅限本機啟用方式是透過環境變數：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果設定了 `OLLAMA_API_KEY`，您可以在供應商項目中省略 `apiKey`，OpenClaw 會為可用性檢查填寫它。
    </Tip>

  </Tab>

  <Tab title="明確 (手動模型)">
    當您想要設定託管的雲端環境、Ollama 在另一個主機/連接埠上執行、您想要強制使用特定的內容視窗或模型列表，或者您想要完全手動定義模型時，請使用明確設定。

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
    如果 Ollama 在不同的主機或連接埠上執行（明確設定會停用自動探索，因此請手動定義模型）：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
            timeoutSeconds: 300, // Optional: give cold local models longer to connect and stream
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // Optional: keep the model loaded between turns
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    請勿在 URL 中新增 `/v1`。`/v1` 路徑使用 OpenAI 相容模式，其中工具呼叫並不可靠。請使用不帶路徑尾碼的 Ollama 基礎 URL。
    </Warning>

  </Tab>
</Tabs>

## 常見配方

使用這些作為起點，並將模型 ID 替換為 `ollama list` 或 `openclaw models list --provider ollama` 中的確切名稱。

<AccordionGroup>
  <Accordion title="具有自動探索功能的本機模型">
    當 Ollama 與 Gateway 在同一台機器上執行，且您希望 OpenClaw 自動探索已安裝的模型時，請使用此選項。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此途徑可將設定保持在最低限度。除非您想要手動定義模型，否則請勿新增 `models.providers.ollama` 區塊。

  </Accordion>

  <Accordion title="LAN Ollama host with manual models">
    對於區域網路主機，使用原生的 Ollama URLs。請勿新增 `/v1`。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` 是 OpenClaw 端的 context budget。`params.num_ctx` 會發送給 Ollama 以發出請求。當您的硬體無法執行模型完整宣稱的 context 時，請保持這兩者一致。

  </Accordion>

  <Accordion title="Ollama Cloud only">
    當您未執行本地守護程式並希望直接使用託管的 Ollama 模型時使用此選項。

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

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
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Cloud plus local through a signed-in daemon">
    當本地或區域網路 Ollama 守護程式已登入 `ollama signin` 且應同時提供本地模型和 `:cloud` 模型時使用此選項。

    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Multiple Ollama hosts">
    當您擁有多個 Ollama 伺服器時，請使用自訂的供應商 ID。每個供應商都有自己的 host、models、auth、timeout 和 model refs。

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    當 OpenClaw 發送請求時，使用中的供應商前綴會被移除，因此 `ollama-large/qwen3.5:27b` 會以 `qwen3.5:27b` 的形式到達 Ollama。

  </Accordion>

  <Accordion title="精簡本地模型配置">
    某些本地模型可以回應簡單的提示，但難以應付完整的代理工具介面。在更改全域執行時設定之前，請先從限制工具和上下文開始。

    ```json5
    {
      agents: {
        defaults: {
          experimental: {
            localModelLean: true,
          },
          model: { primary: "ollama/gemma4" },
        },
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    僅當模型或伺服器無法可靠地處理工具架構時，才使用 `compat.supportsTools: false`。它以犧牲代理能力為代價換取穩定性。
    `localModelLean` 會從代理介面中移除瀏覽器、cron 和訊息工具，但它不會更改 Ollama 的執行時上下文或思考模式。對於會迴圈或將回應預算花費在隱藏推理上的小型 Qwen 風格思考模型，請將其與明確的 `params.num_ctx` 和 `params.thinking: false` 搭配使用。

  </Accordion>
</AccordionGroup>

### 模型選擇

設定完成後，您的所有 Ollama 模型均可用：

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

也支援自訂 Ollama 提供者 ID。當模型參照使用有效的
提供者前綴（例如 `ollama-spark/qwen3:32b`）時，OpenClaw 會在呼叫 Ollama 之前僅移除該
前綴，以便伺服器接收 `qwen3:32b`。

對於速度較慢的本地模型，在提高整個代理執行時逾時之前，請優先考慮提供者範圍的請求調整：

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` 適用於模型 HTTP 請求，包括連線設定、
標頭、主體串流以及總體受防護的取得中止。`params.keep_alive`
會作為頂層 `keep_alive` 轉發給 Ollama，用於原生 `/api/chat` 請求；
當第一輪載入時間是瓶頸時，請針對每個模型進行設定。

### 快速驗證

```bash
# Ollama daemon visible to this machine
curl http://127.0.0.1:11434/api/tags

# OpenClaw catalog and selected model
openclaw models list --provider ollama
openclaw models status

# Direct model smoke
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

對於遠端主機，請將 `127.0.0.1` 替換為 `baseUrl` 中使用的主機。如果 `curl` 可行但 OpenClaw 不可行，請檢查 Gateway 是否在不同的機器、容器或服務帳戶上執行。

## Ollama 網路搜尋

OpenClaw 支援 **Ollama 網路搜尋** 作為內建的 `web_search` 提供者。

| 屬性 | 詳細資訊                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 主機 | 使用您設定的 Ollama 主機（設定時為 `models.providers.ollama.baseUrl`，否則為 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用託管的 API |
| 驗證 | 已登入的本機 Ollama 主機無需金鑰；直接進行 `https://ollama.com` 搜尋或需要身份驗證的主機則需要 `OLLAMA_API_KEY` 或設定的提供者驗證               |
| 需求 | 本機/自託管主機必須正在執行並已使用 `ollama signin` 登入；直接託管搜尋需要 `baseUrl: "https://ollama.com"` 加上真實的 Ollama API 金鑰            |

在 `openclaw onboard` 或 `openclaw configure --section web` 期間選擇 **Ollama Web Search**，或設定：

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

透過 Ollama Cloud 進行直接託管搜尋：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

對於已登入的本機守護程序，OpenClaw 使用守護程序的 `/api/experimental/web_search` 代理。對於 `https://ollama.com`，它會直接呼叫託管的 `/api/web_search` 端點。

<Note>如需完整的設定和行為詳情，請參閱 [Ollama Web Search](/zh-Hant/tools/ollama-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **工具呼叫在 OpenAI 相容模式下並不可靠。** 僅當您需要代理使用 OpenAI 格式且不依賴原生工具呼叫行為時，才使用此模式。
    </Warning>

    如果您改為需要使用 OpenAI 相容端點（例如，在僅支援 OpenAI 格式的代理後面），請明確設定 `api: "openai-completions"`：

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

    當 Ollama 使用 `api: "openai-completions"` 時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 無聲回退到 4096 的上下文視窗。如果您的代理/上游伺服器拒絕未知的 `options` 欄位，請停用此行為：

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

  <Accordion title="內容視窗">
    對於自動探索到的模型，OpenClaw 儘可能使用 Ollama 回報的內容視窗，包括來自自訂 Modelfile 的較大 `PARAMETER num_ctx` 值。否則，它會回退到 OpenClaw 使用的預設 Ollama 內容視窗。

    您可以為該 Ollama 提供者下的每個模型設定提供者層級的 `contextWindow`、`contextTokens` 和 `maxTokens` 預設值，然後在需要時針對每個模型進行覆蓋。`contextWindow` 是 OpenClaw 的提示詞和壓縮預算。原生 Ollama 請求會保留 `options.num_ctx` 為未設定，除非您明確設定 `params.num_ctx`，以便 Ollama 可以應用自己的模型、`OLLAMA_CONTEXT_LENGTH` 或基於 VRAM 的預設值。若要在不重建 Modelfile 的情況下限制或強制執行 Ollama 的每次請求執行階段內容，請設定 `params.num_ctx`；無效、零、負數和非有限值將被忽略。OpenAI 相容的 Ollama 配接器仍預設會從設定的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒絕 `options`，請使用 `injectNumCtxForOpenAICompat: false` 將其停用。

    原生 Ollama 模型條目也接受 `params` 下的常見 Ollama 執行階段選項，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 僅轉發 Ollama 請求金鑰，因此諸如 `streaming` 等 OpenClaw 執行階段參數不會洩漏到 Ollama。使用 `params.think` 或 `params.thinking` 發送頂層 Ollama `think`；`false` 會停用 Qwen 風格思考模型的 API 層級思考。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    針對每個模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也可以運作。如果同時設定了兩者，明確的提供者模型條目將優先於代理程式預設值。

  </Accordion>

  <Accordion title="Thinking control">
    對於原生 Ollama 模型，OpenClaw 會按照 Ollama 預期的方式轉發思考控制：頂層 `think`，而不是 `options.think`。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    您也可以設定模型預設值：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    針對特定模型的 `params.think` 或 `params.thinking` 可以針對特定設定的模型停用或強制執行 Ollama API 思考。執行時指令（如 `/think off`）仍然適用於當前的執行。

  </Accordion>

  <Accordion title="Reasoning models">
    OpenClaw 預設將名稱為 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具有推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    不需要額外設定。OpenClaw 會自動將其標記。

  </Accordion>

<Accordion title="Model costs">Ollama 是免費且在本地運行的，因此所有模型成本均設為 $0。這適用於自動探索和手動定義的模型。</Accordion>

  <Accordion title="記憶嵌入">
    內建的 Ollama 外掛為 [記憶搜尋](/zh-Hant/concepts/memory) 註冊了一個記憶嵌入提供者。它使用已配置的 Ollama 基礎 URL
    和 API 金鑰，呼叫 Ollama 目前 `/api/embed` 端點，並盡可能將
    多個記憶區塊批次處理為一個 `input` 請求。

    | 屬性      | 值               |
    | ------------- | ------------------- |
    | 預設模型 | `nomic-embed-text`  |
    | 自動拉取     | 是 — 如果本地不存在，會自動拉取嵌入模型 |

    查詢時的嵌入會針對需要或建議使用檢索前綴的模型使用前綴，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。記憶文件批次保持原始狀態，因此現有索引不需要遷移格式。

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

    對於遠端嵌入主機，請將鑑權範圍限制在該主機：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              model: "nomic-embed-text",
              apiKey: "ollama-local",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="串流配置">
    OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，它完全支援同時進行串流和工具呼叫。不需要特殊配置。

    對於原生 `/api/chat` 請求，OpenClaw 也會將思考控制直接轉發給 Ollama：`/think off` 和 `openclaw agent --thinking off` 發送頂層 `think: false`，而 `/think low|medium|high` 則發送對應的頂層 `think` 努力程度字串。`/think max` 對應到 Ollama 最高的原生努力程度，`think: "high"`。

    <Tip>
    如果您需要使用 OpenAI 相容端點，請參閱上方的「舊版 OpenAI 相容模式」一節。在該模式下，串流和工具呼叫可能無法同時運作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="WSL2 當機迴圈 (重複重啟)">
    在具備 NVIDIA/CUDA 的 WSL2 環境中，Ollama 官方 Linux 安裝程式會建立一個使用 `ollama.service` 的 systemd 單元並啟用 `Restart=always`。如果該服務在 WSL2 啟動期間自動啟動並載入 GPU 支援的模型，Ollama 可能會在模型載入時鎖定主機記憶體。Hyper-V 記憶體回收機制並不總是能回收這些被鎖定的頁面，因此 Windows 可能會終止 WSL2 虛擬機，接著 systemd 重新啟動 Ollama，如此週而復始。

    常見跡象：

    - 從 Windows 端重複重啟或終止 WSL2
    - WSL2 啟動後不久，`app.slice` 或 `ollama.service` 佔用較高 CPU
    - 收到來自 systemd 的 SIGTERM 訊號，而非 Linux OOM-killer 事件

    當 OpenClaw 偵測到 WSL2、啟用了 `ollama.service` 且設定為 `Restart=always`，並發現可見的 CUDA 標記時，會記錄啟動警告。

    解決方法：

    ```bash
    sudo systemctl disable ollama
    ```

    將此內容新增至 Windows 端的 `%USERPROFILE%\.wslconfig`，然後執行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服務環境中設定較短的保持連線時間，或者僅在需要時手動啟動 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    請參閱 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="偵測不到 Ollama">
    請確保 Ollama 正在運作，且您已設定 `OLLAMA_API_KEY` (或驗證設定檔)，並且**沒有**定義明確的 `models.providers.ollama` 項目：

    ```bash
    ollama serve
    ```

    驗證 API 是否可存取：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="沒有可用的模型">
    如果您的模型未列出，請在本地拉取模型，或在 `models.providers.ollama` 中明確定義它。

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="連線被拒">
    請檢查 Ollama 是否在正確的連接埠上運作：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="Remote host works with curl but not OpenClaw">
    請從執行 Gateway 的相同機器和執行時進行驗證：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常見原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 在 Docker 中或在另一台主機上執行。
    - URL 使用了 `/v1`，這會選擇 OpenAI 相容行為，而非原生 Ollama。
    - 遠端主機需要在 Ollama 端進行防火牆或 LAN 綁定變更。
    - 模型存在於您筆記型電腦的 daemon 上，但不存在於遠端 daemon 上。

  </Accordion>

  <Accordion title="Model outputs tool JSON as text">
    這通常表示供應商正在使用 OpenAI 相容模式，或者是模型無法處理 tool schemas。

    建議使用原生 Ollama 模式：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    如果小型本機模型仍然在 tool schemas 上失敗，請在該模型項目上設定 `compat.supportsTools: false` 並重新測試。

  </Accordion>

  <Accordion title="Cold local model times out">
    大型本機模型在開始串流之前可能需要很長的初次載入時間。請將逾時限制在 Ollama 供應商範圍內，並可選擇要求 Ollama 在回合之間保持模型載入狀態：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    如果主機本身接受連線的速度很慢，`timeoutSeconds` 也會延長此供應商受保護的 Undici 連線逾時時間。

  </Accordion>

  <Accordion title="Large-context model is too slow or runs out of memory">
    許多 Ollama 模型宣稱的 context 大小超過了您的硬體所能舒適執行的範圍。除非您設定 `params.num_ctx`，否則原生 Ollama 會使用 Ollama 自己的執行時 context 預設值。當您想要可預測的首 token 延遲時，請同時限制 OpenClaw 的預算和 Ollama 的請求 context：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    如果 OpenClaw 發送的提示太多，請先降低 `contextWindow`。如果 Ollama 載入的執行時 context 對機器而言太大，請降低 `params.num_ctx`。如果生成執行時間太長，請降低 `maxTokens`。

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
    Ollama 驅動的網路搜尋的完整設定和行為詳情。
  </Card>
  <Card title="設定" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考。
  </Card>
</CardGroup>
