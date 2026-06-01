---
summary: "使用 Ollama 執行 OpenClaw（雲端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw 與 Ollama 的原生 API (`/api/chat`) 整合，用於託管的雲端模型和本地/自託管的 Ollama 伺服器。您可以透過三種模式使用 Ollama：透過可存取的 Ollama 主機進行 `Cloud + Local`、針對 `https://ollama.com` 進行 `Cloud only`，或針對可存取的 Ollama 主機進行 `Local only`。

<Warning>**遠端 Ollama 使用者**：請勿在 OpenClaw 中使用 `/v1` OpenAI 相容的 URL (`http://host:11434/v1`)。這會中斷工具呼叫，且模型可能會將原始工具 JSON 以純文字形式輸出。請改用原生 Ollama API URL：`baseUrl: "http://host:11434"` (不要 `/v1`)。</Warning>

Ollama 提供者設定使用 `baseUrl` 作為標準金鑰。OpenClaw 也接受 `baseURL` 以相容於 OpenAI SDK 風格的範例，但新設定應優先使用 `baseUrl`。

## 驗證規則

<AccordionGroup>
  <Accordion title="本地和 LAN 主機">
    本地和 LAN Ollama 主機不需要真實的 bearer token。OpenClaw 僅針對 loopback、私人網路、`.local` 和純主機名稱的 Ollama 基礎 URL 使用本地 `ollama-local` 標記。
  </Accordion>
  <Accordion title="遠端和 Ollama Cloud 主機">
    遠端公開主機和 Ollama Cloud (`https://ollama.com`) 需要透過 `OLLAMA_API_KEY`、auth 設定檔或提供者的 `apiKey` 提供真實的憑證。
  </Accordion>
  <Accordion title="Custom provider ids">
    設定了 `api: "ollama"` 的自訂提供者 ID 遵循相同的規則。例如，指向私人 LAN Ollama 主機的 `ollama-remote` 提供者可以使用 `apiKey: "ollama-local"`，子代理程式將透過 Ollama 提供者掛鉤來解析該標記，而不是將其視為遺失的憑證。記憶體搜尋也可以將 `agents.defaults.memorySearch.provider` 設定為該自訂提供者 ID，以便嵌入使用對應的 Ollama 端點。
  </Accordion>
  <Accordion title="Auth profiles">
    `auth-profiles.json` 儲存提供者 ID 的憑證。將端點設定（`baseUrl`、`api`、模型 ID、標頭、逾時）放在 `models.providers.<id>` 中。較舊的平面 auth-profile 檔案（例如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）並非執行時期格式；請執行 `openclaw doctor --fix` 將其重寫為具有備份的標準 `ollama-windows:default` API 金鑰設定檔。該檔案中的 `baseUrl` 是為了相容性而存在的干擾資訊，應移至提供者設定中。
  </Accordion>
  <Accordion title="Memory embedding scope">
    當 Ollama 用於記憶體嵌入時，bearer auth 的範圍限定在宣告它的主機上：

    - 提供者層級的金鑰僅發送到該提供者的 Ollama 主機。
    - `agents.*.memorySearch.remote.apiKey` 僅發送到其遠端嵌入主機。
    - 純粹的 `OLLAMA_API_KEY` 環境變數值會被視為 Ollama Cloud 慣例，預設不會發送到本地或自託管的主機。

  </Accordion>
</AccordionGroup>

## 開始使用

選擇您偏好的設定方法和模式。

<Tabs>
  <Tab title="入門指南（推薦）">
    **最適合：** 建立 Ollama 雲端或本機環境的最快途徑。

    <Steps>
      <Step title="執行入門指南">
        ```bash
        openclaw onboard
        ```

        徇供應商清單中選取 **Ollama**。
      </Step>
      <Step title="選擇您的模式">
        - **Cloud + Local** — 本機 Ollama 主機加上透過該主機路由的雲端模型
        - **Cloud only** — 透過 `https://ollama.com` 使用託管的 Ollama 模型
        - **Local only** — 僅使用本機模型

      </Step>
      <Step title="選擇模型">
        `Cloud only` 會提示輸入 `OLLAMA_API_KEY` 並建議託管的雲端預設值。`Cloud + Local` 和 `Local only` 會要求輸入 Ollama 基礎 URL，探索可用的模型，若選取的本機模型尚未提供，則會自動拉取。當 Ollama 回報已安裝的 `:latest` 標籤（例如 `gemma4:latest`）時，設定會顯示該已安裝的模型一次，而不會同時顯示 `gemma4` 和 `gemma4:latest` 或再次拉取裸別名。`Cloud + Local` 也會檢查該 Ollama 主機是否已登入以使用雲端存取。
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
    **最適用於：** 完全掌控雲端或本機設定。

    <Steps>
      <Step title="選擇雲端或本機">
        - **雲端 + 本機**：安裝 Ollama，使用 `ollama signin` 登入，並透過該主機路由雲端請求
        - **僅雲端**：使用 `https://ollama.com` 搭配 `OLLAMA_API_KEY`
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
        若是 `Cloud only`，請使用您的真實 `OLLAMA_API_KEY`。若是主機備援設定，則可使用任何預留位置值：

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
  <Tab title="雲端 + 本機">
    `Cloud + Local` 使用可連線的 Ollama 主機作為本機和雲端模型的控制點。這是 Ollama 偏好的混合式流程。

    在設定過程中使用 **雲端 + 本機**。OpenClaw 會提示輸入 Ollama 基礎 URL，從該主機探索本機模型，並檢查該主機是否已使用 `ollama signin` 登入以存取雲端。當主機已登入時，OpenClaw 也會建議託管的雲端預設值，例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`。

    若主機尚未登入，OpenClaw 將保持僅限本機的設定，直到您執行 `ollama signin` 為止。

  </Tab>

  <Tab title="僅雲端">
    `Cloud only` 針對 Ollama 在 `https://ollama.com` 的託管 API 執行。

    在設定期間使用 **僅雲端**。OpenClaw 會提示輸入 `OLLAMA_API_KEY`，設定 `baseUrl: "https://ollama.com"`，並初始化託管雲端模型清單。此路徑**不**需要本機 Ollama 伺服器或 `ollama signin`。

    在 `openclaw onboard` 期間顯示的雲端模型清單是從 `https://ollama.com/api/tags` 即時填充的，上限為 500 個條目，因此選擇器反映的是目前的託管目錄，而非靜態種子。如果在設定時無法連線到 `ollama.com` 或未傳回任何模型，OpenClaw 會退回之前的硬編碼建議，以確保引導流程仍能完成。

  </Tab>

  <Tab title="僅本機">
    在僅本機模式下，OpenClaw 會從設定的 Ollama 執行個體探索模型。此路徑適用於本機或自託管的 Ollama 伺服器。

    OpenClaw 目前建議將 `gemma4` 作為本機預設值。

  </Tab>
</Tabs>

## 模型探索（隱含提供者）

當您設定 `OLLAMA_API_KEY`（或驗證設定檔）但**未**定義 `models.providers.ollama` 或其他帶有 `api: "ollama"` 的自訂遠端提供者時，OpenClaw 會從位於 `http://127.0.0.1:11434` 的本機 Ollama 執行個體探索模型。

| 行為       | 詳情                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 目錄查詢   | 查詢 `/api/tags`                                                                                                                 |
| 功能檢測   | 使用盡力的 `/api/show` 查詢來讀取 `contextWindow`、擴充的 `num_ctx` Modelfile 參數，以及包含視覺/工具的功能                      |
| 視覺模型   | 由 `/api/show` 回報具有 `vision` 功能的模型會被標記為支援影像 (`input: ["text", "image"]`)，因此 OpenClaw 會自動將影像注入提示中 |
| 推理檢測   | 在可用時使用 `/api/show` 功能，包括 `thinking`；當 Ollama 省略功能時，則退回至模型名稱啟發式方法 (`r1`、`reasoning`、`think`)    |
| Token 限制 | 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限                                                                 |
| 成本       | 將所有成本設定為 `0`                                                                                                             |

這避免了手動輸入模型，同時讓目錄與本機 Ollama 實例保持同步。您可以在本機 `infer model run` 中使用完整的參照（例如 `ollama/<pulled-model>:latest`）；OpenClaw 會從 Ollama 的即時目錄中解析該已安裝的模型，無需手動編寫 `models.json` 條目。

對於已登入的 Ollama 主機，在 `/api/tags` 顯示之前，某些 `:cloud` 模型可能可以透過 `/api/chat` 和 `/api/show` 使用。當您明確選擇完整的 `ollama/<model>:cloud` 參照時，OpenClaw 會使用 `/api/show` 驗證該確切的缺失模型，並且僅在 Ollama 確認模型元資料時才將其新增至執行時目錄。拼寫錯誤仍會因為未知模型而失敗，而不是自動建立。

```bash
# See what models are available
ollama list
openclaw models list
```

若要進行避免完整代理工具表面的簡單文字生成冒煙測試，請使用具有完整 Ollama 模型參照的本機 `infer model run`：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

該路徑仍然使用 OpenClaw 設定的提供者、驗證和原生 Ollama 傳輸，但它不會啟動聊天代理回合或載入 MCP/工具上下文。如果此操作成功但正常的代理回覆失敗，請接著對模型的代理提示/工具容量進行故障排除。

若要在相同的精簡路徑上進行簡單的視覺模型冒煙測試，請將一或多個影像檔案新增至 `infer model run`。這會將提示和影像直接傳送至選定的 Ollama 視覺模型，而不會載入聊天工具、記憶體或先前的會話內容：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受被偵測為 `image/*` 的檔案，包括常見的 PNG、JPEG 和 WebP 輸入。非影像檔案會在呼叫 Ollama 之前被拒絕。對於語音識別，請改用 `openclaw infer audio transcribe`。

當您使用 `/model ollama/<model>` 切換對話時，OpenClaw 會將其視為確切的使用者選擇。如果設定的 Ollama `baseUrl` 無法連線，則下一次回覆會因提供者錯誤而失敗，而不是靜默地從另一個設定的後備模型回答。

隔離的 cron 任務在啟動代理週期之前會進行一次額外的本地安全檢查。如果選定的模型解析為本地、私有網路或 `.local` Ollama 提供者，且 `/api/tags` 無法連線，OpenClaw 會將該次 cron 執行記錄為 `skipped`，並在錯誤文字中包含選定的 `ollama/<model>`。端點的預檢會快取 5 分鐘，因此多個指向同一個已停止 Ollama 守護程序的 cron 任務不會全部啟動失敗的模型請求。

使用以下指令針對本機 Ollama 即時驗證本機文字路徑、原生串流路徑和嵌入：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

針對 Ollama Cloud API 金鑰的冒煙測試，請將即時測試指向 `https://ollama.com` 並從目前的目錄中選擇一個託管模型：

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

雲端冒煙測試會執行文字、原生串流和網路搜尋。它預設會跳過 `https://ollama.com` 的嵌入操作，因為 Ollama Cloud API 金鑰可能未授權 `/api/embed`。當您明確希望在設定的雲端金鑰無法使用嵌入端點時讓即時測試失敗，請設定 `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1`。

若要新增模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型將會被自動發現並可供使用。

<Note>如果您明確設定了 `models.providers.ollama`，或是配置了自訂的遠端提供者（例如帶有 `api: "ollama"` 的 `models.providers.ollama-cloud`），則會跳過自動發現功能，您必須手動定義模型。諸如 `http://127.0.0.2:11434` 之類的迴路自訂提供者仍會被視為本地。請參閱下方的明確配置章節。</Note>

## 視覺與圖片描述

隨附的 Ollama 外掛程式會將 Ollama 註冊為具備圖片功能的媒體理解提供者。這讓 OpenClaw 可以透過本地或託管的 Ollama 視覺模型來路由明確的圖片描述請求和設定的圖片模型預設值。

對於本地視覺功能，請拉取一個支援圖片的模型：

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

當您需要 OpenClaw 的圖片理解提供者流程、已配置的 `agents.defaults.imageModel` 以及圖片描述輸出形狀時，請使用 `infer image describe`。當您需要使用自訂提示詞以及一或多張圖片進行原始多模態模型探測時，請使用 `infer model run --file`。

要將 Ollama 設定為傳入媒體的預設圖片理解模型，請設定 `agents.defaults.imageModel`：

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

建議優先使用完整的 `ollama/<model>` 參照。如果同一個模型在 `models.providers.ollama.models` 中以 `input: ["text", "image"]` 列出，且沒有其他已配置的圖片提供者暴露該裸露的模型 ID，OpenClaw 也會將裸露的 `imageModel` 參照（例如 `qwen2.5vl:7b`）正規化為 `ollama/qwen2.5vl:7b`。如果有多個已配置的圖片提供者具有相同的裸露 ID，請明確使用提供者前綴。

緩慢的本地視覺模型可能比雲端模型需要更長的圖片理解逾時時間。當 Ollama 嘗試在受限硬體上分配完整的廣告視覺上下文時，它們也可能會當機或停止。當您只需要正常的圖片描述輪次時，請在模型條目上設定功能逾時時間，並限制 `num_ctx`：

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

此逾時時間適用於傳入的圖片理解以及代理人在輪次期間可以呼叫的明確 `image` 工具。提供者層級的 `models.providers.ollama.timeoutSeconds` 仍然控制著正常模型呼叫的底層 Ollama HTTP 請求防護。

使用以下指令對本地 Ollama 即時驗證明確圖片工具：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手動定義 `models.providers.ollama.models`，請標記支援圖片輸入的視覺模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 會拒絕針對未標記為支援圖片功能的模型的圖片描述請求。透過隱含探索，當 `/api/show` 回報視覺功能時，OpenClaw 會從 Ollama 讀取此資訊。

## 配置

<Tabs>
  <Tab title="Basic (implicit discovery)">
    最簡單的僅本地啟用路徑是透過環境變數：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果設定了 `OLLAMA_API_KEY`，您可以在提供者條目中省略 `apiKey`，OpenClaw 將會自動填入以進行可用性檢查。
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    當您想要設定雲端託管、Ollama 運行在其他主機/連接埠、您想要強制指定特定的上下文視窗或模型清單，或者您想要完全手動定義模型時，請使用顯式組態。

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
    如果 Ollama 運行在不同的主機或連接埠上（顯式組態會停用自動探索，因此請手動定義模型）：

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
    請不要在 URL 中新增 `/v1`。`/v1` 路徑使用 OpenAI 相容模式，其中的工具呼叫並不可靠。請使用不帶路徑後綴的基本 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

## 常用配方

使用這些作為起點，並將模型 ID 替換為 `ollama list` 或 `openclaw models list --provider ollama` 中的確切名稱。

<AccordionGroup>
  <Accordion title="Local model with auto-discovery">
    當 Ollama 與 Gateway 運行在同一台機器上，且您希望 OpenClaw 自動探索已安裝的模型時，請使用此方式。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此路徑可將組態保持在最簡。除非您想要手動定義模型，否則請勿新增 `models.providers.ollama` 區塊。

  </Accordion>

  <Accordion title="LAN Ollama host with manual models">
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

    `contextWindow` 是 OpenClaw 端的上下文預算。`params.num_ctx` 會發送給 Ollama 以進行請求。當您的硬體無法執行模型的完整標稱上下文時，請保持這兩者一致。

  </Accordion>

  <Accordion title="僅限 Ollama Cloud">
    當您不執行本機 daemon 並且想要直接使用託管的 Ollama 模型時使用此選項。

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

  <Accordion title="透過已登入 daemon 的雲端與本機模式">
    當本機或區域網路 Ollama daemon 已使用 `ollama signin` 登入，且應同時提供本機模型和 `:cloud` 模型時使用此選項。

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
    當您擁有一個以上的 Ollama 伺服器時，請使用自訂提供者 ID。每個提供者都有自己的主機、模型、驗證、逾時設定和模型參照。

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

  <Accordion title="精簡本機模型設定檔">
    某些本機模型可以回答簡單的提示詞，但無法處理完整的代理工具介面。在變更全域執行時設定之前，請先嘗試限制工具和上下文。

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

    僅當模型或伺服器在工具架構上持續失敗時，才使用 `compat.supportsTools: false`。這會以代理能力換取穩定性。
    `localModelLean` 會從代理介面中移除瀏覽器、cron 和訊息工具，但它不會改變 Ollama 的執行時上下文或思考模式。將其與明確的 `params.num_ctx` 和 `params.thinking: false` 搭配使用，適用於會陷入迴圈或將回應預算花費在隱藏推理上的小型 Qwen 風格思考模型。

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

也支援自訂 Ollama 提供者 ID。當模型參照使用使用中的提供者前綴（例如 `ollama-spark/qwen3:32b`）時，OpenClaw 會在呼叫 Ollama 之前僅移除該前綴，以便伺服器接收 `qwen3:32b`。

對於緩慢的本機模型，在提高整個代理程式執行階段逾時之前，請優先考慮提供者範圍的請求調整：

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

`timeoutSeconds` 適用於模型 HTTP 請求，包括連線設定、標頭、主體串流以及總受防護的取得中止。`params.keep_alive` 會作為頂層 `keep_alive` 轉送至 Ollama，用於原生 `/api/chat` 請求；當第一輪載入時間為瓶頸時，請針對每個模型進行設定。

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

對於遠端主機，請將 `127.0.0.1` 替換為 `baseUrl` 中使用的主機。如果 `curl` 可運作但 OpenClaw 不可行，請檢查 Gateway 是否執行於不同的機器、容器或服務帳戶上。

## Ollama 網路搜尋

OpenClaw 支援 **Ollama 網路搜尋** 作為內建的 `web_search` 提供者。

| 屬性 | 詳細資訊                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 主機 | 使用您設定的 Ollama 主機（設定時為 `models.providers.ollama.baseUrl`，否則為 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用託管的 API |
| 驗證 | 對於已登入的本機 Ollama 主機不需要金鑰；對於直接 `https://ollama.com` 搜尋或受驗證保護的主機，則需要 `OLLAMA_API_KEY` 或已設定的提供者驗證       |
| 需求 | 本機/自我託管主機必須正在執行並已使用 `ollama signin` 登入；直接託管搜尋需要 `baseUrl: "https://ollama.com"` 加上真實的 Ollama API 金鑰          |

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

對於已登入的本機守護程式，OpenClaw 使用守護程式的 `/api/experimental/web_search` 代理程式。對於 `https://ollama.com`，它會直接呼叫託管的 `/api/web_search` 端點。

<Note>如需完整的設定和行為詳細資訊，請參閱 [Ollama 網路搜尋](/zh-Hant/tools/ollama-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Legacy OpenAI-compatible mode">
    <Warning>
    **在 OpenAI 相容模式下，工具呼叫並不可靠。** 僅在您需要為代理使用 OpenAI 格式且不依賴原生工具呼叫行為時才使用此模式。
    </Warning>

    如果您需要改用 OpenAI 相容端點（例如，在僅支援 OpenAI 格式的代理後面），請明確設定 `api: "openai-completions"`：

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

    此模式可能無法同時支援串流和工具呼叫。您可能需要在模型設定中使用 `params: { streaming: false }` 停用串流。

    當 Ollama 使用 `api: "openai-completions"` 時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 無聲地回退到 4096 的上下文視窗。如果您的代理/上游伺服器拒絕未知的 `options` 欄位，請停用此行為：

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
    針對自動探索的模型，OpenClaw 會在可用時使用 Ollama 回報的上下文視窗，包括來自自訂 Modelfile 的較大 `PARAMETER num_ctx` 值。否則，它會回退到 OpenClaw 使用的預設 Ollama 上下文視窗。

    您可以為該 Ollama 提供者下的每個模型設定提供者層級的 `contextWindow`、`contextTokens` 和 `maxTokens` 預設值，然後在需要時針對每個模型進行覆寫。`contextWindow` 是 OpenClaw 的提示和壓縮預算。原生 Ollama 請求會保持 `options.num_ctx` 為未設定，除非您明確設定 `params.num_ctx`，以便 Ollama 可以套用其自己的模型、`OLLAMA_CONTEXT_LENGTH` 或基於 VRAM 的預設值。若要在不重建 Modelfile 的情況下限制或強制 Ollama 的每次請求執行時上下文，請設定 `params.num_ctx`；無效、零、負和非有限的值將被忽略。如果您升級了僅使用 `contextWindow` 或 `maxTokens` 來強制原生 Ollama 請求上下文的舊設定，請執行 `openclaw doctor --fix` 將這些明確的提供者或模型預算複製到 `params.num_ctx`。OpenAI 相容的 Ollama 介接器預設仍會從設定的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒絕 `options`，請使用 `injectNumCtxForOpenAICompat: false` 停用此功能。

    原生 Ollama 模型條目也接受 `params` 下的常見 Ollama 執行時選項，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 僅轉發 Ollama 請求金鑰，因此不會將 OpenClaw 執行時參數（例如 `streaming`）洩漏給 Ollama。使用 `params.think` 或 `params.thinking` 來發送頂層 Ollama `think`；`false` 停用 Qwen 風格思考模型的 API 層級思考。

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

    每個模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也可以使用。如果兩者都有設定，明確的提供者模型條目會優先於代理預設。

  </Accordion>

  <Accordion title="思考控制">
    對於原生 Ollama 模型，OpenClaw 會按照 Ollama 預期的方式轉發思考控制：頂層 `think`，而不是 `options.think`。自動發現的模型如果其 `/api/show` 回應包含 `thinking` 功能，則會公開 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思考模型僅公開 `/think off`。

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

    針對特定模型的 `params.think` 或 `params.thinking` 可以針對特定已設定的模型停用或強制執行 Ollama API 思考。當目前執行僅具備隱含預設值 `off` 時，OpenClaw 會保留這些明確的模型參數；非關閉的執行階段指令（例如 `/think medium`）仍然會覆蓋目前執行設定。

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 預設將名稱包含 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具備推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    不需要額外的設定。OpenClaw 會自動將其標記。

  </Accordion>

<Accordion title="模型成本">Ollama 是免費且在本地執行的，因此所有模型成本均設為 $0。這適用於自動發現和手動定義的模型。</Accordion>

  <Accordion title="記憶體嵌入">
    內建的 Ollama 外掛為 [記憶體搜尋](/zh-Hant/concepts/memory) 註冊了一個記憶體嵌入提供者。它使用設定的 Ollama 基礎 URL
    和 API 金鑰，呼叫 Ollama 目前的 `/api/embed` 端點，並在可能時將
    多個記憶體區塊批次處理為一個 `input` 請求。

    當 `proxy.enabled=true` 時，從設定的 `baseUrl` 衍生的精確
    主機本地 loopback 來源的 Ollama 記憶體嵌入請求會使用 OpenClaw 的受防護直接路徑，而不是受管理的轉發代理程式。
    設定的主機名稱本身必須是 `localhost` 或 loopback IP 字面值；
    僅解析為 loopback 的 DNS 名稱仍會使用受管理的代理程式路徑。
    LAN、tailnet、私人網路和公開的 Ollama 主機也會保持在受管理的代理程式路徑上。
    重新導向至其他主機或連接埠不會繼承信任。
    操作員仍可設定全域 `proxy.loopbackMode: "proxy"` 設定，
    讓 loopback 流量通過代理程式，或設定 `proxy.loopbackMode: "block"`
    在開啟連線前拒絕 loopback 連線；請參閱
    [受管理的代理程式](/zh-Hant/security/network-proxy#gateway-loopback-mode) 以了解
    此設定的程序範圍效果。

    | 屬性      | 值               |
    | ------------- | ------------------- |
    | 預設模型 | `nomic-embed-text`  |
    | 自動拉取     | 是 — 如果嵌入模型不存在於本機，則會自動拉取 |

    查詢時的嵌入會對需要或建議的模型使用檢索前綴，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。記憶體文件批次保持原始狀態，因此現有索引不需要進行格式遷移。

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

    若為遠端嵌入主機，請將驗證範圍限制在該主機：

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
    OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，完全同時支援串流和工具呼叫。無需特殊設定。

    對於原生 `/api/chat` 請求，OpenClaw 也會將思維控制直接轉發給 Ollama：`/think off` 和 `openclaw agent --thinking off` 會發送頂層 `think: false`，除非設定了明確的 model `params.think`/`params.thinking` 值；而 `/think low|medium|high` 則會發送相符的頂層 `think` effort 字串。`/think max` 對應到 Ollama 最高的原生 effort，`think: "high"`。

    <Tip>
    如果您需要使用 OpenAI 相容端點，請參閱上方的「Legacy OpenAI-compatible mode」章節。在該模式下，串流和工具呼叫可能無法同時運作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="WSL2 崩潰迴圈（重複重啟）">
    在搭配 NVIDIA/CUDA 的 WSL2 環境中，官方的 Ollama Linux 安裝程式會建立一個帶有 `Restart=always` 的 `ollama.service` systemd unit。如果該服務在 WSL2 開機期間自動啟動並載入 GPU 支援的模型，Ollama 可能會在模型載入時鎖定主機記憶體。Hyper-V 記憶體回收機制並不總是能回收那些被鎖定的頁面，因此 Windows 可能會終止 WSL2 VM，systemd 會再次啟動 Ollama，然後這個迴圈不斷重複。

    常見現象：

    - WSL2 從 Windows 端重複重啟或終止
    - WSL2 啟動後不久，`app.slice` 或 `ollama.service` 出現高 CPU 使用率
    - 收到來自 systemd 的 SIGTERM 訊號，而不是 Linux OOM-killer 事件

    當 OpenClaw 偵測到 WSL2、啟用帶有 `Restart=always` 的 `ollama.service`，以及可見的 CUDA 標記時，會記錄一個啟動警告。

    緩解措施：

    ```bash
    sudo systemctl disable ollama
    ```

    將此內容新增至 Windows 端的 `%USERPROFILE%\.wslconfig`，然後執行 `wsl --shutdown`：

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

  <Accordion title="未偵測到 Ollama">
    請確保 Ollama 正在執行，且您已設定 `OLLAMA_API_KEY`（或認證設定檔），並且您**沒有**定義明確的 `models.providers.ollama` 項目：

    ```bash
    ollama serve
    ```

    驗證 API 是否可存取：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="沒有可用的模型">
    如果您的模型未被列出，請在本地 pull 該模型或在 `models.providers.ollama` 中明確定義它。

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="連線被拒">
    請檢查 Ollama 是否在正確的連接埠上執行：

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="Remote host works with curl but not OpenClaw">
    請從執行 Gateway 的同一台機器和執行環境進行驗證：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常見原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 在 Docker 中或在另一台主機上執行。
    - URL 使用了 `/v1`，這會選擇 OpenAI 相容行為而非 Ollama 原生模式。
    - 遠端主機需要在 Ollama 端進行防火牆或區域網路 (LAN) 繫結的變更。
    - 模型存在於您筆記型電腦的 daemon 上，但不存在於遠端 daemon 上。

  </Accordion>

  <Accordion title="Model outputs tool JSON as text">
    這通常代表提供者正在使用 OpenAI 相容模式，或者是該模型無法處理工具架構 (tool schemas)。

    建議優先使用 Ollama 原生模式：

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

    如果小型本地模型在工具架構上仍然失敗，請在該模型項目上設定 `compat.supportsTools: false` 並重新測試。

  </Accordion>

  <Accordion title="Kimi or GLM returns garbled symbols">
    託管的 Kimi/GLM 回應如果是長串的非語言符號，將被視為失敗的提供者輸出，而非成功的助理回答。這樣一來，正常的重試、備援或錯誤處理機制便會接手，而不會將損壞的文字存入工作階段中。

    如果反覆發生此情況，請記錄原始模型名稱、目前的工作階段檔案，以及執行時使用了 `Cloud + Local` 還是 `Cloud only`，然後嘗試建立新的工作階段並使用備援模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="Cold local model times out">
    大型本地模型可能需要很長的初次載入時間才能開始串流。請將逾時設定範圍限縮在 Ollama 提供者，並可選擇要求 Ollama 在輪次之間保持模型載入：

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

    如果主機本身接受連線的速度很慢，`timeoutSeconds` 也會延長此提供者受保護的 Undici 連線逾時時間。

  </Accordion>

  <Accordion title="Large-context model is too slow or runs out of memory">
    許多 Ollama 模型宣稱的上下文大小超過您的硬體能夠舒適運行的範圍。原生 Ollama 使用 Ollama 自己的運行時上下文預設值，除非您設定了 `params.num_ctx`。當您想要可預測的首字元延遲時，請同時限制 OpenClaw 的預算和 Ollama 的請求上下文：

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

    如果 OpenClaw 發送的提示過多，請先降低 `contextWindow`。如果 Ollama 正在載入對機器而言過大的運行時上下文，請降低 `params.num_ctx`。如果生成時間過長，請降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>更多協助：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障轉移行為的概覽。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/models" icon="brain">
    如何選擇和設定模型。
  </Card>
  <Card title="Ollama Web Search" href="/zh-Hant/tools/ollama-search" icon="magnifying-glass">
    Ollama 驅動的網路搜尋的完整設定和行為細節。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考。
  </Card>
</CardGroup>
