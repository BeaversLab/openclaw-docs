---
summary: "使用 Ollama 運行 OpenClaw（雲端和本機模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw 整合了 Ollama 的原生 API (`/api/chat`)，用於託管的雲端模型和本機/自託管的 Ollama 伺服器。您可以透過三種模式使用 Ollama：透過可存取的 Ollama 主機進行 `Cloud + Local`、針對 `https://ollama.com` 進行 `Cloud only`，或針對可存取的 Ollama 主機進行 `Local only`。

<Warning>**遠端 Ollama 使用者**：請勿在 OpenClaw 中使用 `/v1` OpenAI 相容 URL (`http://host:11434/v1`)。這會導致工具呼叫中斷，且模型可能會將原始工具 JSON 輸出為純文字。請改用原生的 Ollama API URL：`baseUrl: "http://host:11434"`（無 `/v1`）。</Warning>

Ollama 提供者設定使用 `baseUrl` 作為標準金鑰。OpenClaw 亦接受 `baseURL` 以與 OpenAI SDK 風格的範例相容，但新設定應優先使用 `baseUrl`。

## 驗證規則

<AccordionGroup>
  <Accordion title="本機和 LAN 主機">
    本機和區域網路 (LAN) Ollama 主機不需要真實的 bearer token。OpenClaw 僅對 loopback、私有網路、`.local` 和純主機名稱的 Ollama 基礎 URL 使用本機 `ollama-local` 標記。
  </Accordion>
  <Accordion title="遠端和 Ollama Cloud 主機">
    遠端公開主機和 Ollama Cloud (`https://ollama.com`) 需要透過 `OLLAMA_API_KEY`、驗證設定檔或提供者的 `apiKey` 提供真實憑證。
  </Accordion>
  <Accordion title="Custom provider ids">
    設定 `api: "ollama"` 的自訂供應商 ID 遵循相同的規則。例如，指向私有 LAN Ollama 主機的 `ollama-remote` 供應商可以使用 `apiKey: "ollama-local"`，子代理程式將透過 Ollama 供應商掛鉤解析該標記，而不是將其視為遺失的憑證。記憶體搜尋也可以將 `agents.defaults.memorySearch.provider` 設定為該自訂供應商 ID，以便嵌入使用匹配的 Ollama 端點。
  </Accordion>
  <Accordion title="Auth profiles">
    `auth-profiles.json` 儲存供應商 ID 的憑證。請將端點設定（`baseUrl`、`api`、模型 ID、標頭、逾時）放在 `models.providers.<id>` 中。較舊的扁平 auth-profile 檔案（例如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）不是執行時期格式；請執行 `openclaw doctor --fix` 將其重寫為具有備份的標準 `ollama-windows:default` API 金鑰設定檔。該檔案中的 `baseUrl` 是相容性干擾，應移至供應商設定。
  </Accordion>
  <Accordion title="Memory embedding scope">
    當 Ollama 用於記憶體嵌入時，bearer 驗證的範圍限定在宣告它的主機：

    - 供應商層級的金鑰僅傳送至該供應商的 Ollama 主機。
    - `agents.*.memorySearch.remote.apiKey` 僅傳送至其遠端嵌入主機。
    - 純粹的 `OLLAMA_API_KEY` 環境值被視為 Ollama Cloud 慣例，預設情況下不會傳送至本機或自託管主機。

  </Accordion>
</AccordionGroup>

## 開始使用

選擇您偏好的設定方法和模式。

<Tabs>
  <Tab title="入門指南（推薦）">
    **最適用於：** 快速搭建可用的 Ollama 雲端或本地環境。

    <Steps>
      <Step title="執行入門指南">
        ```bash
        openclaw onboard
        ```

        徹供應商列表中選擇 **Ollama**。
      </Step>
      <Step title="選擇您的模式">
        - **雲端 + 本地** — 本地 Ollama 主機加上透過該主機路由的雲端模型
        - **僅雲端** — 透過 `https://ollama.com` 使用託管的 Ollama 模型
        - **僅本地** — 僅限本地模型

      </Step>
      <Step title="選擇一個模型">
        `Cloud only` 會提示輸入 `OLLAMA_API_KEY` 並建議託管雲端預設值。`Cloud + Local` 和 `Local only` 會詢問 Ollama 基礎 URL、探索可用模型，並在選定的本地模型尚未可用時自動拉取。當 Ollama 回報已安裝的 `:latest` 標籤（例如 `gemma4:latest`）時，設定過程只會顯示該已安裝的模型一次，而不會同時顯示 `gemma4` 和 `gemma4:latest` 或再次拉取該裸別名。`Cloud + Local` 也會檢查該 Ollama 主機是否已登入以使用雲端存取。
      </Step>
      <Step title="驗證模型可用">
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
    **最適合：** 完全掌控雲端或本機設定。

    <Steps>
      <Step title="選擇雲端或本機">
        - **雲端 + 本機**：安裝 Ollama，使用 `ollama signin` 登入，並透過該主機路由雲端請求
        - **僅雲端**：搭配 `OLLAMA_API_KEY` 使用 `https://ollama.com`
        - **僅本機**：從 [ollama.com/download](https://ollama.com/download) 安裝 Ollama

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
        對於 `Cloud only`，請使用您真實的 `OLLAMA_API_KEY`。對於由主機支援的設定，任何預留位置值皆可使用：

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

        或者在 config 中設定預設值：

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
  <Tab title="雲端 + 本機">
    `Cloud + Local` 使用一個可連線的 Ollama 主機作為本機和雲端模型的控制點。這是 Ollama 偏好的混合流程。

    在設定過程中使用 **雲端 + 本機**。OpenClaw 會提示輸入 Ollama 基礎 URL，從該主機探索本機模型，並檢查該主機是否已使用 `ollama signin` 登入以進行雲端存取。當主機已登入時，OpenClaw 也會建議託管的雲端預設值，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    如果主機尚未登入，OpenClaw 會將設定保持為僅限本機，直到您執行 `ollama signin` 為止。

  </Tab>

  <Tab title="僅限雲端">
    `Cloud only` 運行於 Ollama 在 `https://ollama.com` 的託管 API 上。

    在設定過程中請使用 **僅限雲端**。OpenClaw 會提示輸入 `OLLAMA_API_KEY`，設定 `baseUrl: "https://ollama.com"`，並植入託管雲端模型清單。此路徑**不**需要本機 Ollama 伺服器或 `ollama signin`。

    在 `openclaw onboard` 期間顯示的雲端模型清單是從 `https://ollama.com/api/tags` 即時填充的，上限為 500 個項目，因此選擇器反映的是目前的託管目錄，而不是靜態種子。如果在設定時 `ollama.com` 無法連線或未返回模型，OpenClaw 會回退至先前的硬編碼建議，以便完成入門流程。

  </Tab>

  <Tab title="僅限本機">
    在僅限本機模式下，OpenClaw 會從已設定的 Ollama 執行個體探索模型。此路徑適用於本機或自託管的 Ollama 伺服器。

    OpenClaw 目前建議將 `gemma4` 作為本機預設值。

  </Tab>
</Tabs>

## 模型探索（隱含提供者）

當您設定 `OLLAMA_API_KEY`（或驗證設定檔）並且**未**定義 `models.providers.ollama` 或其他具有 `api: "ollama"` 的自訂遠端提供者時，OpenClaw 會從位於 `http://127.0.0.1:11434` 的本機 Ollama 執行個體探索模型。

| 行為       | 詳情                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 目錄查詢   | 查詢 `/api/tags`                                                                                                                             |
| 功能檢測   | 使用盡力而為的 `/api/show` 查詢來讀取 `contextWindow`、展開的 `num_ctx` Modelfile 參數，以及包含視覺/工具在內的功能                          |
| 視覺模型   | 具有由 `/api/show` 回報的 `vision` 功能的模型會被標記為具備圖像處理能力 (`input: ["text", "image"]`)，因此 OpenClaw 會自動將圖像注入提示詞中 |
| 推理檢測   | 在可用時使用 `/api/show` 功能，包括 `thinking`；當 Ollama 省略功能資訊時，會回退到模型名稱啟發式方法（`r1`、`reasoning`、`think`）           |
| Token 限制 | 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限                                                                             |
| 成本       | 將所有成本設定為 `0`                                                                                                                         |

這避免了手動輸入模型條目，同時保持目錄與本地 Ollama 實例同步。您可以在本地 `infer model run` 中使用完整的參考，例如 `ollama/<pulled-model>:latest`；OpenClaw 會從 Ollama 的即時目錄中解析該已安裝的模型，而無需手動撰寫 `models.json` 條目。

對於已登入的 Ollama 主機，部分 `:cloud` 模型可能透過 `/api/chat` 和 `/api/show` 在其出現在 `/api/tags` 中之前即可使用。當您明確選擇完整的 `ollama/<model>:cloud` 參考時，OpenClaw 會使用 `/api/show` 驗證該確切的缺失模型，並且只有在 Ollama 確認模型元資料時才會將其加入至執行時目錄。拼寫錯誤仍會因為未知模型而失敗，而不是被自動建立。

```bash
# See what models are available
ollama list
openclaw models list
```

若要進行避免完整代理工具介面的狹窄文字生成煙霧測試，請搭配完整的 Ollama 模型參考使用本地 `infer model run`：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

該路徑仍然使用 OpenClaw 設定的提供者、驗證和原生 Ollama 傳輸，但它不會啟動聊天代理回合或載入 MCP/工具上下文。如果此操作成功但正常的代理回覆失敗，請接著對模型的代理提示/工具容量進行故障排除。

若要在相同的精簡路徑上進行狹隘的視覺模型煙霧測試，請將一或多個影像檔案加入 `infer model run`。這會將提示和影像直接傳送至選定的 Ollama 視覺模型，而不會載入聊天工具、記憶或先前的會話上下文：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受偵測為 `image/*` 的檔案，包括常見的 PNG、JPEG 和 WebP 輸入。非影像檔案會在呼叫 Ollama 之前被拒絕。對於語音識別，請改用 `openclaw infer audio transcribe`。

當您使用 `/model ollama/<model>` 切換對話時，OpenClaw 會將其
視為精確的使用者選擇。如果設定的 Ollama `baseUrl`
無法連線，下一次回覆將會失敗並顯示提供者錯誤，而不是
從另一個設定的後備模型靜默回應。

隔離的 cron 工作在啟動代理程式輪次之前，會進行一次額外的本機安全檢查。
如果選取的模型解析為本機、私有網路或 `.local`
Ollama 提供者，且 `/api/tags` 無法連線，OpenClaw 會將該 cron 執行記錄為
`skipped`，並在錯誤文字中包含選取的 `ollama/<model>`。端點
預檢會被快取 5 分鐘，因此指向同一個已停止 Ollama 守護程式的多個
cron 工作不會全都發起失敗的模型請求。

使用以下指令針對本機 Ollama 即時驗證本機文字路徑、原生串流路徑和嵌入：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

若要新增模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型將會自動被發現並可供使用。

<Note>如果您明確設定了 `models.providers.ollama`，或是設定自訂遠端提供者（例如使用 `api: "ollama"` 的 `models.providers.ollama-cloud`），則會跳過自動發現，且您必須手動定義模型。諸如 `http://127.0.0.2:11434` 的回環自訂提供者仍會被視為本機。請參閱下方的明確設定部分。</Note>

## 視覺與圖片描述

內建的 Ollama 外掛程式會將 Ollama 註冊為具備圖片功能的媒體理解提供者。這讓 OpenClaw 可以透過本機或託管的 Ollama 視覺模型，路由明確的圖片描述請求和設定的圖片模型預設值。

對於本機視覺功能，請拉取支援圖片的模型：

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

當您想要 OpenClaw 的圖像理解提供者流程、配置的 `agents.defaults.imageModel` 以及圖像描述輸出形狀時，請使用 `infer image describe`。當您想要使用自訂提示詞以及一張或多張圖像來進行原始多模態模型探查時，請使用 `infer model run --file`。

若要將 Ollama 設為傳入媒體的預設圖像理解模型，請設定 `agents.defaults.imageModel`：

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

優先使用完整的 `ollama/<model>` 參照。如果相同的模型在 `models.providers.ollama.models` 中以 `input: ["text", "image"]` 列出，且沒有其他已配置的圖像提供者暴露該裸露模型 ID，OpenClaw 也會將裸露的 `imageModel` 參照（例如 `qwen2.5vl:7b`）正規化為 `ollama/qwen2.5vl:7b`。如果多個已配置的圖像提供者具有相同的裸露 ID，請明確使用提供者前綴。

緩慢的本機視覺模型可能需要比雲端模型更長的圖像理解逾時時間。當 Ollama 嘗試在受限硬體上分配完整的廣告視覺上下文時，它們也可能當機或停止。當您只需要正常的圖像描述輪次時，請設定功能逾時，並在模型條目上設定 `num_ctx` 上限：

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

此逾時適用於傳入的圖像理解以及代理程式在輪次期間可以呼叫的明確 `image` 工具。提供者層級的 `models.providers.ollama.timeoutSeconds` 仍然控制正常模型呼叫的底層 Ollama HTTP 請求防護。

透過以下方式針對本機 Ollama 即時驗證明確的圖像工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手動定義 `models.providers.ollama.models`，請標記支援圖像輸入的視覺模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 會拒絕對未標記為具備圖像功能之模型的圖像描述請求。使用隱含探索時，當 `/api/show` 回報視覺功能時，OpenClaw 會從 Ollama 讀取此資訊。

## 配置

<Tabs>
  <Tab title="基本（隱式探索）">
    最簡單的純本地啟用方式是透過環境變數：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果設定了 `OLLAMA_API_KEY`，您可以在供應商項目中省略 `apiKey`，OpenClaw 會為可用性檢查填入該值。
    </Tip>

  </Tab>

  <Tab title="明確（手動模型）">
    當您需要託管雲端設置、Ollama 運行在其他主機/埠上、您想要強制特定的上下文視窗或模型列表，或者您想要完全手動的模型定義時，請使用明確配置。

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
    如果 Ollama 運行在不同的主機或埠上（明確配置會停用自動探索，因此請手動定義模型）：

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
    請勿在 URL 中新增 `/v1`。`/v1` 路徑使用的是 OpenAI 相容模式，其中工具呼叫並不可靠。請使用不帶路徑後綴的 Ollama 基礎 URL。
    </Warning>

  </Tab>
</Tabs>

## 常用配方

將這些作為起點，並將模型 ID 替換為 `ollama list` 或 `openclaw models list --provider ollama` 中的確切名稱。

<AccordionGroup>
  <Accordion title="具有自動探索的本地模型">
    當 Ollama 與 Gateway 運行在同一台機器上，並且您希望 OpenClaw 自動探索已安裝的模型時，請使用此方式。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    這種方式使配置保持最小化。除非您想要手動定義模型，否則請勿新增 `models.providers.ollama` 區塊。

  </Accordion>

  <Accordion title="具有手動模型的 LAN Ollama 主機">
    對於 LAN 主機，請使用原生 Ollama URL。請勿新增 `/v1`。

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

    `contextWindow` 是 OpenClaw 端的上下文預算。`params.num_ctx` 會被發送給 Ollama 以進行請求。當您的硬體無法運行模型廣告的完整上下文時，請保持它們一致。

  </Accordion>

  <Accordion title="僅限 Ollama Cloud">
    當您未執行本機守護程式並且想要直接使用託管的 Ollama 模型時，請使用此選項。

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

  <Accordion title="透過已登入的守護程式同時使用雲端與本機">
    當本機或區域網路 Ollama 守護程式已使用 `ollama signin` 登入，且應同時提供本機模型和 `:cloud` 模型時，請使用此選項。

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

  <Accordion title="多個 Ollama 主機">
    當您擁有多個 Ollama 伺服器時，請使用自訂提供者 ID。每個提供者都有自己的主機、模型、驗證、逾時和模型參照。

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

    當 OpenClaw 發送請求時，會移除使用中的提供者前綴，因此 `ollama-large/qwen3.5:27b` 會以 `qwen3.5:27b` 的形式到達 Ollama。

  </Accordion>

  <Accordion title="精簡的本機模型設定檔">
    某些本機模型可以回答簡單的提示詞，但在處理完整的代理程式工具介面時會感到吃力。在變更全域執行時設定之前，請先嘗試限制工具和內容。

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

    僅當模型或伺服器在工具架構上穩定失敗時，才使用 `compat.supportsTools: false`。這會以犧牲代理程式能力為代價來換取穩定性。
    `localModelLean` 會從代理程式介面中移除瀏覽器、cron 和訊息工具，但它不會變更 Ollama 的執行時內容或思考模式。將其與明確的 `params.num_ctx` 和 `params.thinking: false` 搭配使用，適用於會迴圈或將回應預算花費在隱藏推理上的小型 Qwen 風格思考模型。

  </Accordion>
</AccordionGroup>

### 模型選擇

設定完成後，您所有的 Ollama 模型皆可使用：

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

也支援自訂 Ollama 提供者 ID。當模型參照使用使用中的
提供者前綴時（例如 `ollama-spark/qwen3:32b`），OpenClaw 會在呼叫 Ollama 之前僅移除該
前綴，以便伺服器接收 `qwen3:32b`。

對於緩慢的本地模型，在提高整個代理程式執行逾時之前，請優先考慮提供者範圍的請求調整：

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

`timeoutSeconds` 適用於模型 HTTP 請求，包括連線設定、標頭、主體串流以及總共的受防護提取中止。`params.keep_alive` 會作為頂層 `keep_alive` 轉發給 Ollama，用於原生 `/api/chat` 請求；當第一輪載入時間是瓶頸時，請針對每個模型進行設定。

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

對於遠端主機，請將 `127.0.0.1` 替換為 `baseUrl` 中使用的主機。如果 `curl` 可行但 OpenClaw 無法運作，請檢查 Gateway 是否執行於不同的機器、容器或服務帳戶上。

## Ollama Web Search

OpenClaw 支援將 **Ollama Web Search** 作為內建的 `web_search` 提供者。

| 屬性 | 詳細資訊                                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 主機 | 使用您設定的 Ollama 主機（設定時為 `models.providers.ollama.baseUrl`，否則為 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用託管 API |
| 驗證 | 對於已登入的本地 Ollama 主機無需金鑰；對於直接 `https://ollama.com` 搜尋或受驗證保護的主機，則需要 `OLLAMA_API_KEY` 或已設定的提供者驗證       |
| 需求 | 本地/自託管主機必須正在執行並已使用 `ollama signin` 登入；直接託管搜尋需要 `baseUrl: "https://ollama.com"` 加上真實的 Ollama API 金鑰          |

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

若要透過 Ollama Cloud 進行直接託管搜尋：

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

對於已登入的本地守護程式，OpenClaw 會使用守護程式的 `/api/experimental/web_search` 代理程式。對於 `https://ollama.com`，它會直接呼叫託管的 `/api/web_search` 端點。

<Note>有關完整的設定和行為詳細資訊，請參閱 [Ollama Web Search](/zh-Hant/tools/ollama-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **在 OpenAI 相容模式中，工具呼叫並不可靠。** 僅在您需要針對代理使用 OpenAI 格式且不依賴原生工具呼叫行為時，才使用此模式。
    </Warning>

    如果您需要改用 OpenAI 相容端點（例如，在僅支援 OpenAI 格式的代理之後），請明確設定 `api: "openai-completions"`：

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

    此模式可能無法同時支援串流和工具呼叫。您可能需要在模型設定中透過 `params: { streaming: false }` 停用串流。

    當 `api: "openai-completions"` 與 Ollama 搭配使用時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 無聲回退至 4096 的上下文視窗。如果您的代理/上游拒絕未知的 `options` 欄位，請停用此行為：

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
    對於自動探索的模型，OpenClaw 優先使用 Ollama 回報的內容視窗（如果可用），包括來自自訂 Modelfile 的較大 `PARAMETER num_ctx` 值。否則，它會回退到 OpenClaw 使用的預設 Ollama 內容視窗。

    您可以為該 Ollama 提供者下的每個模型設定提供者層級的 `contextWindow`、`contextTokens` 和 `maxTokens` 預設值，然後在需要時針對每個模型進行覆寫。`contextWindow` 是 OpenClaw 的提示和壓縮預算。原生 Ollama 請求除非您明確設定 `params.num_ctx`，否則會讓 `options.num_ctx` 保持未設置，以便 Ollama 套用自己的模型、`OLLAMA_CONTEXT_LENGTH` 或基於 VRAM 的預設值。若要在不重建 Modelfile 的情況下限制或強制執行 Ollama 的每次請求執行時內容，請設定 `params.num_ctx`；無效、零、負數和非有限的值將被忽略。OpenAI 相容的 Ollama 配接器預設仍會從設定的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒絕 `options`，請使用 `injectNumCtxForOpenAICompat: false` 停用此功能。

    原生 Ollama 模型條目也接受 `params` 下的常見 Ollama 執行時選項，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 僅轉發 Ollama 請求金鑰，因此 OpenClaw 執行時參數（如 `streaming`）不會洩漏到 Ollama。使用 `params.think` 或 `params.thinking` 來發送頂層 Ollama `think`；`false` 會停用 Qwen 風格思考模型的 API 層級思考。

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

    針對每個模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也適用。如果兩者都設定了，明確的提供者模型條目將優先於代理程式預設值。

  </Accordion>

  <Accordion title="思維控制">
    對於原生 Ollama 模型，OpenClaw 會按照 Ollama 預期的方式轉發思維控制：使用頂層的 `think`，而不是 `options.think`。如果自動發現的模型其 `/api/show` 回應包含 `thinking` 能力，則會暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思維模型則僅暴露 `/think off`。

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

    針對特定模型的 `params.think` 或 `params.thinking` 可以停用或強制特定配置模型的 Ollama API 思維模式。當目前執行僅具有隱含預設值 `off` 時，OpenClaw 會保留這些明確的模型參數；非關閉的執行時期指令（例如 `/think medium`）仍會覆蓋目前的執行。

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 預設會將名稱包含 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具備推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    無需額外配置。OpenClaw 會自動標記這些模型。

  </Accordion>

<Accordion title="模型成本">Ollama 是免費且在本地運行的，因此所有模型成本均設為 $0。這適用於自動發現和手動定義的模型。</Accordion>

  <Accordion title="記憶體嵌入">
    內建的 Ollama 外掛程式會為 [記憶體搜尋](/zh-Hant/concepts/memory) 註冊一個記憶體嵌入提供者。它使用設定的 Ollama 基礎 URL
    和 API 金鑰，呼叫 Ollama 目前的 `/api/embed` 端點，並盡可能將
    多個記憶體區塊批次處理為單一 `input` 請求。

    | 屬性      | 值               |
    | ------------- | ------------------- |
    | 預設模型 | `nomic-embed-text`  |
    | 自動拉取     | 是 — 如果本機沒有嵌入模型，會自動拉取 |

    查詢時的嵌入會對需要或建議使用檢索前綴的模型使用前綴，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。記憶體文件批次保持原始格式，因此現有索引不需要進行格式遷移。

    若要選擇 Ollama 作為記憶體搜尋嵌入提供者：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              // Default for Ollama. Raise on larger hosts if reindexing is too slow.
              nonBatchConcurrency: 1,
            },
          },
        },
      },
    }
    ```

    對於遠端嵌入主機，請將驗證範圍限制在該主機：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            model: "nomic-embed-text",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              apiKey: "ollama-local",
              nonBatchConcurrency: 2,
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="串流設定">
    OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，完全同時支援串流和工具呼叫。不需要特殊設定。

    對於原生 `/api/chat` 請求，OpenClaw 也會直接將思考控制轉發給 Ollama：`/think off` 和 `openclaw agent --thinking off` 會傳送頂層 `think: false`，除非設定明確的模型 `params.think`/`params.thinking` 值；而 `/think low|medium|high` 會傳送相符的頂層 `think` 努力字串。`/think max` 對應到 Ollama 最高的原生努力程度，`think: "high"`。

    <Tip>
    如果您需要使用相容 OpenAI 的端點，請參閱上方的「Legacy OpenAI-compatible mode」章節。在該模式下，串流和工具呼叫可能無法同時運作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="WSL2 崩潰循環（反覆重啟）">
    在具有 NVIDIA/CUDA 的 WSL2 上，官方的 Ollama Linux 安裝程式會建立一個具有 `Restart=always` 的 `ollama.service` systemd unit。如果該服務在 WSL2 啟動期間自動啟動並載入 GPU 支援的模型，Ollama 可能會在載入模型時鎖定主機記憶體。Hyper-V 記憶體回收機制並非總是能回收這些被鎖定的頁面，因此 Windows 可能會終止 WSL2 VM，systemd 隨後再次啟動 Ollama，循環便如此重複。

    常見跡象：

    - 從 Windows 端反覆重啟或終止 WSL2
    - WSL2 啟動後不久，`app.slice` 或 `ollama.service` 出現高 CPU 使用率
    - 收到來自 systemd 的 SIGTERM，而不是 Linux OOM-killer 事件

    當 OpenClaw 偵測到 WSL2、啟用了帶有 `Restart=always` 的 `ollama.service` 以及可見的 CUDA 標記時，會記錄啟動警告。

    緩解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    將此新增至 Windows 端的 `%USERPROFILE%\.wslconfig`，然後執行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服務環境中設定較短的 keep-alive 時間，或者僅在需要時手動啟動 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    參閱 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未偵測到 Ollama">
    請確保 Ollama 正在運作，並且您已設定 `OLLAMA_API_KEY`（或驗證設定檔），且您**沒有**定義明確的 `models.providers.ollama` 項目：

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
    請檢查 Ollama 是否在正確的連接埠上運作：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="遠端主機適用於 curl 但不適用於 OpenClaw">
    請從執行 Gateway 的同一台機器和運行環境進行驗證：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常見原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 執行於 Docker 或另一台主機上。
    - URL 使用了 `/v1`，這會選取 OpenAI 相容行為而非原生的 Ollama。
    - 遠端主機需要在 Ollama 端進行防火牆或區域網路 (LAN) 綁定變更。
    - 模型存在於您筆記型電腦的守护程序上，但不存在於遠端守护程序上。

  </Accordion>

  <Accordion title="模型將工具 JSON 輸出為文字">
    這通常表示提供者正在使用 OpenAI 相容模式，或者模型無法處理工具架構。

    請優先使用原生 Ollama 模式：

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

    如果小型本地模型在工具架構上仍然失敗，請在該模型條目上設定 `compat.supportsTools: false` 並重新測試。

  </Accordion>

  <Accordion title="Kimi 或 GLM 傳回亂碼符號">
    託管的 Kimi/GLM 回應若是出現長串的非語言符號，將被視為失敗的提供者輸出，而非成功的助手回答。這讓一般的重試、後備或錯誤處理能夠接管，而不會將損毀的文字持久化至工作階段中。

    如果反覆發生，請記錄原始模型名稱、目前的工作階段檔案，以及執行過程使用了 `Cloud + Local` 還是 `Cloud only`，然後嘗試建立新的工作階段並使用後備模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="冷啟動本地模型逾時">
    大型本地模型在開始串流之前可能需要很長的初次載入時間。請將逾時設定限定於 Ollama 提供者，並選擇性要求 Ollama 在回合之間保持模型載入：

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

    如果主機本身接受連線的速度很慢，`timeoutSeconds` 也會延長此提供者的受保護 Undici 連線逾時時間。

  </Accordion>

  <Accordion title="Large-context model is too slow or runs out of memory">
    許多 Ollama 模型宣稱支援的上下文大小，超過了您的硬體能夠順利運作的範圍。除非您設定了 `params.num_ctx`，否則原生 Ollama 會使用 Ollama 自己的運行時上下文預設值。當您需要可預測的首 token 延遲時，請同時限制 OpenClaw 的預算以及 Ollama 的請求上下文：

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

    如果 OpenClaw 發送了過多的提示詞，請先降低 `contextWindow`。如果 Ollama 載入的運行時上下文對機器來說太大，請降低 `params.num_ctx`。如果生成時間過長，請降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>更多協助：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關內容

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障轉移行為的概觀。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
  <Card title="Ollama Web Search" href="/zh-Hant/tools/ollama-search" icon="magnifying-glass">
    Ollama 驅動的網路搜尋的完整設定和行為細節。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整的設定參考。
  </Card>
</CardGroup>
