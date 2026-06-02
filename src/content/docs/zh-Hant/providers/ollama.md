---
summary: "使用 Ollama 執行 OpenClaw（雲端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw 與 Ollama 的原生 API (`/api/chat`) 整合，以支援託管的雲端模型及本地/自託管的 Ollama 伺服器。您可以透過三種模式使用 Ollama：透過可連線的 Ollama 主機進行 `Cloud + Local`，針對 `https://ollama.com` 進行 `Cloud only`，或針對可連線的 Ollama 主機進行 `Local only`。

OpenClaw 也將 `ollama-cloud` 註冊為一流的託管供應商 ID，用於直接使用 Ollama Cloud。當您僅需要雲端路由且不想共用本地 `ollama` 供應商 ID 時，請使用類似 `ollama-cloud/kimi-k2.5:cloud` 的引用。

關於專用的僅雲端設定頁面，請參閱 [Ollama Cloud](/zh-Hant/providers/ollama-cloud)。

<Warning>**遠端 Ollama 使用者**：請勿搭配 OpenClaw 使用 `/v1` OpenAI 相容 URL (`http://host:11434/v1`)。這會破壞工具呼叫，且模型可能會將原始工具 JSON 輸出為純文字。請改用原生 Ollama API URL：`baseUrl: "http://host:11434"` (不包含 `/v1`)。</Warning>

Ollama 供應商設定使用 `baseUrl` 作為標準金鑰。為了與 OpenAI SDK 風格的範例相容，OpenClaw 也接受 `baseURL`，但新設定應優先使用 `baseUrl`。

## Auth rules

<AccordionGroup>
  <Accordion title="Local and LAN hosts">
    Local and LAN Ollama hosts do not need a real bearer token. OpenClaw uses the local `ollama-local` marker only for loopback, private-network, `.local`, and bare-hostname Ollama base URLs.
  </Accordion>
  <Accordion title="遠端和 Ollama Cloud 主機">
    遠端公共主機和 Ollama Cloud (`https://ollama.com`) 需要透過 `OLLAMA_API_KEY`、驗證設定檔或提供者的 `apiKey` 提供真實憑證。若要直接託管使用，建議優先使用提供者 `ollama-cloud`。
  </Accordion>
  <Accordion title="自訂提供者 ID">
    設定 `api: "ollama"` 的自訂提供者 ID 遵循相同的規則。例如，指向私人 LAN Ollama 主機的 `ollama-remote` 提供者可以使用 `apiKey: "ollama-local"`，子代理程式將透過 Ollama 提供者掛鈎解析該標記，而不是將其視為缺失的憑證。記憶體搜尋也可以將 `agents.defaults.memorySearch.provider` 設定為該自訂提供者 ID，以便嵌入使用匹配的 Ollama 端點。
  </Accordion>
  <Accordion title="驗證設定檔">
    `auth-profiles.json` 儲存提供者 ID 的憑證。將端點設定（`baseUrl`、`api`、模型 ID、標頭、逾時）放在 `models.providers.<id>` 中。較舊的平面驗證設定檔（例如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）並非執行時期格式；請執行 `openclaw doctor --fix` 將其重寫為標準的 `ollama-windows:default` API 金鑰設定檔並進行備份。該檔案中的 `baseUrl` 是相容性干擾資訊，應移至提供者設定。
  </Accordion>
  <Accordion title="記憶體嵌入範圍">
    當 Ollama 用於記憶體嵌入時，Bearer 驗證的範圍限定於宣告該驗證的主機：

    - 提供者層級的金鑰僅發送至該提供者的 Ollama 主機。
    - `agents.*.memorySearch.remote.apiKey` 僅發送至其遠端嵌入主機。
    - 純粹的 `OLLAMA_API_KEY` 環境變數值會被視為 Ollama Cloud 慣例，預設不會發送至本地或自託管主機。

  </Accordion>
</AccordionGroup>

## 開始使用

選擇您偏好的設定方法和模式。

<Tabs>
  <Tab title="Onboarding (recommended)">
    **最適用於：** 建立可運作的 Ollama 雲端或本地設定的最快途徑。

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard
        ```

        從供應商清單中選取 **Ollama**。
      </Step>
      <Step title="Choose your mode">
        - **Cloud + Local** — 本地 Ollama 主機加上透過該主機路由的雲端模型
        - **Cloud only** — 透過 `https://ollama.com` 的託管 Ollama 模型
        - **Local only** — 僅限本地模型

      </Step>
      <Step title="Select a model">
        `Cloud only` 會提示輸入 `OLLAMA_API_KEY` 並建議託管的雲端預設值。`Cloud + Local` 和 `Local only` 會詢問 Ollama 基礎 URL，探索可用的模型，且若選取的本地模型尚未可用，會自動拉取。當 Ollama 回報已安裝的 `:latest` 標籤（例如 `gemma4:latest`）時，設定會顯示該已安裝的模型一次，而不會同時顯示 `gemma4` 和 `gemma4:latest` 或再次拉取純別名。`Cloud + Local` 也會檢查該 Ollama 主機是否已登入以使用雲端存取。
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

    選擇性指定自訂基礎 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="手動設定">
    **最適用於：** 完全掌控雲端或本機設定。

    <Steps>
      <Step title="選擇雲端或本機">
        - **雲端 + 本機**：安裝 Ollama，使用 `ollama signin` 登入，並透過該主機路由雲端請求
        - **僅雲端**：搭配 `OLLAMA_API_KEY` 使用 `https://ollama.com`
        - **僅本機**：從 [ollama.com/download](https://ollama.com/download) 安裝 Ollama

      </Step>
      <Step title="拉取本機模型 (僅本機)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="為 OpenClaw 啟用 Ollama">
        若使用 `Cloud only`，請使用您的真實 `OLLAMA_API_KEY`。對於由主機支援的設定，任何預留位置值均可運作：

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

        或是在設定中設定預設值：

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
    `Cloud + Local` 使用可連線的 Ollama 主機作為本機和雲端模型的控制點。這是 Ollama 首選的混合式流程。

    在設定期間使用 **雲端 + 本機**。OpenClaw 會提示輸入 Ollama 基礎 URL，從該主機探索本機模型，並檢查該主機是否已使用 `ollama signin` 登入以存取雲端。當主機已登入時，OpenClaw 也會建議受管雲端預設模型，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    若主機尚未登入，OpenClaw 會將設定保持為僅限本機，直到您執行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 針對 `https://ollama.com` 的 Ollama 託管 API 運行。

    在設定期間使用 **Cloud only**。OpenClaw 會提示輸入 `OLLAMA_API_KEY`，設定 `baseUrl: "https://ollama.com"`，並植入託管的雲端模型列表。此路徑**不**需要本機 Ollama 伺服器或 `ollama signin`。

    在 `openclaw onboard` 期間顯示的雲端模型列表是從 `https://ollama.com/api/tags` 即時填充的，上限為 500 個條目，因此選擇器反映的是當前的託管目錄，而不是靜態種子。如果在設定期間 `ollama.com` 無法連線或未返回任何模型，OpenClaw 會退回到先前的硬編碼建議，以便仍能完成上線。

    您也可以直接配置一流的雲端提供商：

    ```bash
    openclaw onboard --auth-choice ollama-cloud
    openclaw models set ollama-cloud/kimi-k2.5:cloud
    ```

  </Tab>

  <Tab title="Local only">
    在僅限本機的模式下，OpenClaw 會從已設定的 Ollama 實例中探索模型。此路徑適用於本機或自託管的 Ollama 伺服器。

    OpenClaw 目前建議使用 `gemma4` 作為本機預設值。

  </Tab>
</Tabs>

## 模型探索（隱含提供商）

當您設定 `OLLAMA_API_KEY`（或驗證設定檔）並**未**定義 `models.providers.ollama` 或其他具有 `api: "ollama"` 的自訂遠端提供商時，OpenClaw 會從位於 `http://127.0.0.1:11434` 的本機 Ollama 實例中探索模型。

| 行為       | 詳細資訊                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 目錄查詢   | 查詢 `/api/tags`                                                                                                                      |
| 功能偵測   | 使用盡力的 `/api/show` 查詢來讀取 `contextWindow`、展開的 `num_ctx` Modelfile 參數，以及包括視覺/工具在內的功能                       |
| 視覺模型   | 由 `/api/show` 回報具有 `vision` 功能的模型會被標記為具備影像功能（`input: ["text", "image"]`），因此 OpenClaw 會自動將影像注入提示中 |
| 推理偵測   | 在可用時使用 `/api/show` 功能，包括 `thinking`；當 Ollama 省略功能時，回退至模型名稱啟發式方法（`r1`、`reasoning`、`think`）          |
| Token 限制 | 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限                                                                      |
| 成本       | 將所有成本設定為 `0`                                                                                                                  |

這避免了手動輸入模型，同時保持目錄與本地 Ollama 實例同步。您可以在本地 `infer model run` 中使用完整的參照，例如 `ollama/<pulled-model>:latest`；OpenClaw 會從 Ollama 的即時目錄中解析該已安裝的模型，無需手動編寫 `models.json` 條目。

對於已登入的 Ollama 主機，某些 `:cloud` 模型可能透過 `/api/chat`
和 `/api/show` 在它們出現在 `/api/tags` 中之前就可以使用。當您明確選擇一個
完整的 `ollama/<model>:cloud` 參照時，OpenClaw 會使用
`/api/show` 驗證該確切的缺失模型，並僅在 Ollama 確認模型
元資料時將其新增至執行時目錄。拼寫錯誤仍會因未知模型而失敗，而不會被自動建立。

```bash
# See what models are available
ollama list
openclaw models list
```

若要進行避免完整代理工具介面的狹窄文字生成冒煙測試，
請使用帶有完整 Ollama 模型參照的本地 `infer model run`：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

該路徑仍使用 OpenClaw 配置的提供者、驗證和原生 Ollama
傳輸，但它不會啟動聊天代理回合或載入 MCP/工具上下文。如果
此操作成功而正常代理回覆失敗，請接著排查模型的代理
提示/工具容量。

若要在同一個精簡路徑上進行狹隘的視覺模型冒煙測試，請將一或多個
影像檔案新增至 `infer model run`。這會將提示和影像直接傳送至
選定的 Ollama 視覺模型，而不會載入聊天工具、記憶或先前的
會話上下文：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受被偵測為 `image/*` 的檔案，包括常見的 PNG、
JPEG 和 WebP 輸入。非影像檔案會在呼叫 Ollama 之前被拒絕。
對於語音識別，請改用 `openclaw infer audio transcribe`。

當您使用 `/model ollama/<model>` 切換對話時，OpenClaw 會將其視為精確的使用者選擇。如果設定的 Ollama `baseUrl` 無法連線，下一次回覆將會因提供者錯誤而失敗，而不是靜默地從另一個設定的後備模型回答。

隔離的 cron 任務在啟動代理回合之前會執行一項額外的本機安全檢查。如果選取的模型解析為本機、私有網路或 `.local` Ollama 提供者，且 `/api/tags` 無法連線，OpenClaw 會將該 cron 執行記錄為 `skipped`，並在錯誤文字中包含選取的 `ollama/<model>`。端點預檢會快取 5 分鐘，因此多個指向同一個已停止 Ollama 守護程序的 cron 任務不會全部發起失敗的模型請求。

針對本機 Ollama，即時驗證本機文字路徑、原生串流路徑和嵌入：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

若要進行 Ollama Cloud API 金鑰冒煙測試，請將即時測試指向 `https://ollama.com` 並從當前目錄中選擇一個託管模型：

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

雲端冒煙測試會執行文字、原生串流和網路搜尋。預設情況下，它會跳過 `https://ollama.com` 的嵌入，因為 Ollama Cloud API 金鑰可能未授權 `/api/embed`。當您明確希望如果設定的雲端金鑰無法使用嵌入端點時，即時測試應失敗，請設定 `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1`。

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型將自動被發現並可供使用。

<Note>如果您明確設定了 `models.providers.ollama`，或配置了具有 `api: "ollama"` 的自訂遠端提供者（例如 `models.providers.ollama-cloud`），則會跳過自動發現，您必須手動定義模型。諸如 `http://127.0.0.2:11434` 的回環自訂提供者仍被視為本機。請參閱下方的明確配置部分。</Note>

## 視覺與圖片描述

隨附的 Ollama 外掛將 Ollama 註冊為具備圖片功能的媒體理解提供者。這讓 OpenClaw 可以透過本機或託管的 Ollama 視覺模型，來路由明確的圖片描述請求和設定的圖片模型預設值。

對於本機視覺功能，請拉取一個支援圖片的模型：

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

`--model` 必須是完整的 `<provider/model>` ref。當設定此項時，`openclaw infer image describe` 會直接執行該模型，而不是跳過描述，因為該模型支援原生視覺功能。

當您想要 OpenClaw 的圖像理解提供者流程、已配置的 `agents.defaults.imageModel` 以及圖像描述輸出形狀時，請使用 `infer image describe`。當您想要使用自訂提示詞和一張或多張圖像進行原始多模態模型探查時，請使用 `infer model run --file`。

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

建議使用完整的 `ollama/<model>` ref。如果相同的模型在 `models.providers.ollama.models` 中以 `input: ["text", "image"]` 列出，且沒有其他已配置的圖像提供者公開該裸露模型 ID，OpenClaw 也會將裸露的 `imageModel` ref（例如 `qwen2.5vl:7b`）正規化為 `ollama/qwen2.5vl:7b`。如果多個已配置的圖像提供者具有相同的裸露 ID，請明確使用提供者前綴。

緩慢的本地視覺模型可能比雲端模型需要更長的圖像理解逾時時間。當 Ollama 嘗試在硬體受限的環境中分配完整的廣告視覺上下文時，它們也可能會當機或停止。當您僅需要正常的圖像描述輪次時，請設定功能逾時，並在模型條目中限制 `num_ctx`：

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

此逾時時間適用於傳入圖像理解以及代理在輪次期間可以呼叫的明確 `image` 工具。提供者層級的 `models.providers.ollama.timeoutSeconds` 仍控制正常模型呼叫的基礎 Ollama HTTP 請求防護。

透過下列方式針對本地 Ollama 即時驗證明確的圖像工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手動定義 `models.providers.ollama.models`，請使用圖像輸入支援標記視覺模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 會拒絕對未標記為支援圖像的模型的圖像描述請求。使用隱含探索時，當 `/api/show` 回報視覺功能時，OpenClaw 會從 Ollama 讀取此資訊。

## Configuration

<Tabs>
  <Tab title="Basic (implicit discovery)">
    最簡單的僅限本地啟用途徑是透過環境變數：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果設定了 `OLLAMA_API_KEY`，您可以在提供者條目中省略 `apiKey`，OpenClaw 將會為可用性檢查填入它。
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    當您想要託管的雲端設定、Ollama 運行在其他主機/連接埠上、您想要強制特定的上下文視窗或模型列表，或者您想要完全手動的模型定義時，請使用顯式設定。

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

  <Tab title="Custom base URL">
    如果 Ollama 運行在不同的主機或連接埠上（顯式設定會停用自動發現，因此請手動定義模型）：

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
    請勿在 URL 中新增 `/v1`。`/v1` 路徑使用 OpenAI 相容模式，其中的工具呼叫不可靠。請使用不帶路徑後綴的基本 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

## 常見做法

將這些作為起點，並將模型 ID 替換為 `ollama list` 或 `openclaw models list --provider ollama` 中的確切名稱。

<AccordionGroup>
  <Accordion title="Local model with auto-discovery">
    當 Ollama 與 Gateway 運行在同一台機器上，並且您希望 OpenClaw 自動發現已安裝的模型時，請使用此選項。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此途徑使設定保持極簡。除非您想要手動定義模型，否則請勿新增 `models.providers.ollama` 區塊。

  </Accordion>

  <Accordion title="LAN Ollama host with manual models">
    對於 LAN 主機，請使用原生的 Ollama URL。請勿新增 `/v1`。

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

    `contextWindow` 是 OpenClaw 端的上下文預算。`params.num_ctx` 會發送給 Ollama 用於請求。當您的硬體無法運行模型宣稱的完整上下文時，請保持它們一致。

  </Accordion>

  <Accordion title="僅限 Ollama Cloud">
    當您未執行本地守護程式並直接使用託管的 Ollama 模型時，請使用此選項。

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

  <Accordion title="透過已登入的守護程式使用雲端與本地">
    當本地或區域網路 Ollama 守護程式已使用 `ollama signin` 登入，且應同時提供本地模型與 `:cloud` 模型時，請使用此選項。

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
    當您擁有多個 Ollama 伺服器時，請使用自訂提供者 ID。每個提供者都有自己的主機、模型、驗證、逾時設定和模型參照。

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

    當 OpenClaw 發送請求時，會移除使用中的提供者前綴，因此 `ollama-large/qwen3.5:27b` 到達 Ollama 時會變成 `qwen3.5:27b`。

  </Accordion>

  <Accordion title="精簡的本地模型設定檔">
    某些本地模型可以回答簡單的提示詞，但在處理完整的代理工具介面時可能會遇到困難。在更改全域執行時設定之前，請先嘗試限制工具和上下文。

    ```json5
    {
      agents: {
        list: [
          {
            id: "local",
            experimental: {
              localModelLean: true,
            },
            model: { primary: "ollama/gemma4" },
          },
        ],
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

    僅當模型或伺服器在工具架構上穩定失敗時，才使用 `compat.supportsTools: false`。這會犧牲代理功能以換取穩定性。
    `localModelLean` 會從代理介面中移除瀏覽器、cron 和訊息工具，但它不會變更 Ollama 的執行時上下文或思考模式。對於會陷入迴圈或在隱藏推理上耗盡回應預算的小型 Qwen 風格思考模型，請將其與明確的 `params.num_ctx` 和 `params.thinking: false` 搭配使用。

  </Accordion>
</AccordionGroup>

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

也支援自訂 Ollama 提供者 ID。當模型參照使用使用中的
提供者前綴（例如 `ollama-spark/qwen3:32b`）時，OpenClaw 會在呼叫 Ollama 之前僅移除該
前綴，以便伺服器接收到 `qwen3:32b`。

對於緩慢的本機模型，請在增加整個代理程式執行逾時之前，優先考慮針對提供者的請求調整：

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

`timeoutSeconds` 套用於模型 HTTP 請求，包括連線設定、標頭、主體串流以及總共的 guard-fetch 中止。`params.keep_alive` 會作為頂層 `keep_alive` 轉發給 Ollama 用於原生 `/api/chat` 請求；當第一輪載入時間是瓶頸時，請針對每個模型進行設定。

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

對於遠端主機，請將 `127.0.0.1` 替換為 `baseUrl` 中使用的主機。如果 `curl` 可以運作但 OpenClaw 無法，請檢查 Gateway 是否執行於不同的機器、容器或服務帳戶上。

## Ollama 網路搜尋

OpenClaw 支援 **Ollama 網路搜尋** 作為內建的 `web_search` 提供者。

| 屬性 | 詳細資訊                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 主機 | 使用您設定的 Ollama 主機（設定時為 `models.providers.ollama.baseUrl`，否則為 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用託管的 API |
| 驗證 | 對於已登入的本機 Ollama 主機無需金鑰；直接進行 `https://ollama.com` 搜尋或對受保護主機進行驗證時，需要 `OLLAMA_API_KEY` 或已設定的提供者驗證     |
| 需求 | 本機/自託管主機必須執行並使用 `ollama signin` 登入；直接託管搜尋需要 `baseUrl: "https://ollama.com"` 加上真實的 Ollama API 金鑰                  |

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

對於已登入的本機 daemon，OpenClaw 會使用 daemon 的 `/api/experimental/web_search` 代理。對於 `https://ollama.com`，它會直接呼叫託管的 `/api/web_search` 端點。

<Note>如需完整的設定和行為詳細資訊，請參閱 [Ollama 網路搜尋](/zh-Hant/tools/ollama-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="舊版 OpenAI 相容模式">
    <Warning>
    **工具呼叫在 OpenAI 相容模式下並不可靠。** 僅在您需要針對代理程式使用 OpenAI 格式且不依賴原生工具呼叫行為時，才使用此模式。
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

    此模式可能無法同時支援串流和工具呼叫。您可能需要在模型設定中停用串流，使用 `params: { streaming: false }`。

    當 `api: "openai-completions"` 與 Ollama 搭配使用時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 靜默回退至 4096 的內容視窗。如果您的代理程式/上游伺服器拒絕未知的 `options` 欄位，請停用此行為：

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
    對於自動發現的模型，OpenClaw 會在可用時使用 Ollama 回報的上下文視窗，包括來自自訂 Modelfile 的較大 `PARAMETER num_ctx` 值。否則，它會回退到 OpenClaw 使用的預設 Ollama 上下文視窗。

    您可以為該 Ollama 提供者下的每個模型設定提供者層級的 `contextWindow`、`contextTokens` 和 `maxTokens` 預設值，然後在需要時為每個模型進行覆寫。`contextWindow` 是 OpenClaw 的提示和壓縮預算。原生 Ollama 請求會保持 `options.num_ctx` 未設置，除非您明確設定 `params.num_ctx`，以便 Ollama 可以套用其自己的模型、`OLLAMA_CONTEXT_LENGTH` 或基於 VRAM 的預設值。若要在不重建 Modelfile 的情況下限制或強制 Ollama 的每次請求執行時上下文，請設定 `params.num_ctx`；無效、零、負值和非有限值將被忽略。如果您升級了僅使用 `contextWindow` 或 `maxTokens` 來強制原生 Ollama 請求上下文的舊設定，請執行 `openclaw doctor --fix` 將那些明確的提供者或模型預算複製到 `params.num_ctx` 中。OpenAI 相容的 Ollama 配接器預設仍會從設定的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒絕 `options`，請使用 `injectNumCtxForOpenAICompat: false` 停用此功能。

    原生 Ollama 模型條目也接受 `params` 下的常見 Ollama 執行時選項，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 僅轉發 Ollama 請求金鑰，因此 OpenClaw 執行時參數（如 `streaming`）不會洩漏給 Ollama。使用 `params.think` 或 `params.thinking` 來發送頂層 Ollama `think`；`false` 會停用 Qwen 風格思考模型的 API 層級思考。

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

    每個模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也可以運作。如果同時設定了兩者，則明確的提供者模型條目優先於代理預設值。

  </Accordion>

  <Accordion title="思考控制">
    對於原生 Ollama 模型，OpenClaw 會按照 Ollama 期望的方式轉發思考控制：頂層 `think`，而非 `options.think`。如果自動發現的模型的 `/api/show` 回應包含 `thinking` 功能，則會暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思考模型僅暴露 `/think off`。

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

    每個模型的 `params.think` 或 `params.thinking` 可以針對特定已配置的模型停用或強制執行 Ollama API 思考。當目前執行僅具有隱含的預設 `off` 時，OpenClaw 會保留這些顯式的模型參數；非關閉的執行時命令（例如 `/think medium`）仍然會覆蓋目前的執行。

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 預設將名稱諸如 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具備推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    不需要額外的配置。OpenClaw 會自動標記它們。

  </Accordion>

<Accordion title="模型成本">Ollama 是免費的並在本地運行，因此所有模型成本都設為 $0。這適用於自動發現和手動定義的模型。</Accordion>

  <Accordion title="記憶體嵌入">
    內建的 Ollama 外掛為 [記憶體搜尋](/zh-Hant/concepts/memory) 註冊了一個記憶體嵌入提供者。它使用設定的 Ollama 基礎 URL
    和 API 金鑰，呼叫 Ollama 目前的 `/api/embed` 端點，並盡可能將
    多個記憶體區塊打包成一個 `input` 請求。

    當 `proxy.enabled=true` 時，向源自設定 `baseUrl` 的精確
    主機本地 loopback origin 發出的 Ollama 記憶體嵌入請求會
    使用 OpenClaw 的受守護直接路徑，而非受管理的轉送代理。設定
    的主機名稱本身必須是 `localhost` 或 loopback IP 字面值；
    僅解析為 loopback 的 DNS 名稱仍會使用受管理的代理路徑。
    LAN、tailnet、私人網路和公開的 Ollama 主機也維持在
    受管理的代理路徑上。重新導向至其他主機或連接埠不會繼承信任。
    操作員仍可以設定全域 `proxy.loopbackMode: "proxy"` 選項來
    將 loopback 流量傳送透過代理，或 `proxy.loopbackMode: "block"`
    以在建立連線前拒絕 loopback 連線；請參閱
    [受管理的代理](/zh-Hant/security/network-proxy#gateway-loopback-mode) 以了解
    此設定的程序範圍效果。

    | 屬性      | 值               |
    | ------------- | ------------------- |
    | 預設模型 | `nomic-embed-text`  |
    | 自動拉取     | 是 — 如果嵌入模型不存在於本地則會自動拉取 |

    查詢時嵌入會對要求或建議使用檢索前綴的模型使用檢索前綴，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。記憶體文件批次保持原始狀態，因此現有索引不需要格式遷移。

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

    若為遠端嵌入主機，請將 auth 限制範圍設為該主機：

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

  <Accordion title="串流配置">
    OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，它完全同時支援串流和工具呼叫。不需要特殊配置。

    對於原生 `/api/chat` 請求，OpenClaw 也會將思考控制直接轉發給 Ollama：`/think off` 和 `openclaw agent --thinking off` 會發送頂層 `think: false`，除非設定了明確的模型 `params.think`/`params.thinking` 值，而 `/think low|medium|high` 則會發送相符的頂層 `think` 努力程度字串。`/think max` 對應到 Ollama 最高的原生努力程度，`think: "high"`。

    <Tip>
    如果您需要使用相容 OpenAI 的端點，請參閱上方的「Legacy OpenAI-compatible mode」章節。在該模式下，串流和工具呼叫可能無法同時運作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="WSL2 當機迴圈（反覆重啟）">
    在搭載 NVIDIA/CUDA 的 WSL2 上，Ollama 官方 Linux 安裝程式會建立一個帶有 `Restart=always` 的 `ollama.service` systemd unit。如果該服務在 WSL2 啟動期間自動啟動並載入 GPU 支援的模型，Ollama 可能會在載入模型時鎖定主機記憶體。Hyper-V 記憶體回收機制並非總是能回收那些被鎖定的頁面，因此 Windows 可能會終止 WSL2 VM，systemd 隨後再次啟動 Ollama，導致迴圈不斷重複。

    常見跡象：

    - 從 Windows 端反覆重啟或終止 WSL2
    - 在 WSL2 啟動後不久，`app.slice` 或 `ollama.service` 出現高 CPU 使用率
    - 收到來自 systemd 的 SIGTERM 訊號，而非 Linux OOM-killer 事件

    當 OpenClaw 偵測到 WSL2、啟用了 `ollama.service` 並搭配 `Restart=always`，且看見可見的 CUDA 標記時，會記錄啟動警告。

    緩解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    將此新增到 Windows 端的 `%USERPROFILE%\.wslconfig`，然後執行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服務環境中設定較短的 keep-alive 時間，或者僅在需要時手動啟動 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    請參閱 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="偵測不到 Ollama">
    請確保 Ollama 正在運作，且您已設定 `OLLAMA_API_KEY`（或驗證設定檔 profile），並且您**沒有**定義明確的 `models.providers.ollama` 項目：

    ```bash
    ollama serve
    ```

    驗證 API 是否可存取：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="沒有可用的模型">
    如果您的模型未列出，請在本地 pull 該模型，或在 `models.providers.ollama` 中明確定義它。

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
    從執行 Gateway 的同一台機器和運行時進行驗證：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常見原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 在 Docker 或另一台主機上運行。
    - URL 使用了 `/v1`，這會選擇 OpenAI 相容行為而不是原生的 Ollama。
    - 遠端主機需要在 Ollama 端調整防火牆或區域網路綁定設定。
    - 模型存在於您筆記型電腦的守護程序中，但不存在於遠端守護程序上。

  </Accordion>

  <Accordion title="Model outputs tool JSON as text">
    這通常表示提供者正在使用 OpenAI 相容模式，或者模型無法處理 tool schema。

    建議優先使用原生 Ollama 模式：

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

    如果小型本地模型仍然無法處理 tool schema，請在該模型條目上設定 `compat.supportsTools: false` 並重新測試。

  </Accordion>

  <Accordion title="Kimi or GLM returns garbled symbols">
    託管的 Kimi/GLM 回應如果是長串的非語言符號，會被視為失敗的提供者輸出，而不是成功的助手回答。這讓正常的重試、後備或錯誤處理能夠接管，而不會將損壞的文字保存到會話中。

    如果這種情況反覆發生，請記錄原始模型名稱、當前會話檔案，以及執行是使用了 `Cloud + Local` 還是 `Cloud only`，然後嘗試一個新的會話和後備模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="Cold local model times out">
    大型本地模型在開始串流之前可能需要很長的首次載入時間。請將逾時限定在 Ollama 提供者範圍內，並選擇性地要求 Ollama 在回合之間保持模型載入狀態：

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
    許多 Ollama 模型宣稱的上下文大小超過了您的硬體所能舒適運行的範圍。除非您設定了 `params.num_ctx`，否則原生 Ollama 會使用 Ollama 自己的執行時期上下文預設值。當您需要可預測的首個 token 延遲時，請同時限制 OpenClaw 的預算和 Ollama 的請求上下文：

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

    如果 OpenClaw 發送的提示詞過多，請先降低 `contextWindow`。如果 Ollama 載入的執行時期上下文對機器而言太大，請降低 `params.num_ctx`。如果生成時間過長，請降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>更多協助：[疑難排解](/zh-Hant/help/troubleshooting) 與 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障轉移行為的概覽。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
  <Card title="Ollama Web Search" href="/zh-Hant/tools/ollama-search" icon="magnifying-glass">
    Ollama 驅動網頁搜尋的完整設定和行為詳情。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參照。
  </Card>
</CardGroup>
