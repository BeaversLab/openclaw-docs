---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI 提供用於 GPT 模型的開發者 API，且透過 OpenAI 的 Codex 客戶端，Codex 也可作為 ChatGPT 方案的程式設計代理程式使用。OpenClaw 將這些介面分開，以便設定保持可預測。

OpenClaw 使用 `openai/*` 作為標準的 OpenAI 模型路由。內嵌代理預設開啟透過原生 Codex 應用程式伺服器執行時執行的 OpenAI 模型；針對圖片、嵌入、語音和即時功能等非代理 OpenAI 介面，直接 OpenAI API 金鑰驗證仍可使用。

- **代理模型** - 透過 Codex 執行時使用的 `openai/*` 模型；登入 Codex 驗證以使用 ChatGPT/Codex 訂閱，或者當您有意使用 API 金鑰驗證時，設定相容 Codex 的 OpenAI API 金鑰備份。
- **非代理 OpenAI API** - 透過 `OPENAI_API_KEY` 或 OpenAI API 金鑰加入直接存取 OpenAI Platform，並採用隨用隨付計費。
- **舊版設定** - `openclaw doctor --fix` 會將 `openai-codex/*` 模型參照修復為 `openai/*` 加上 Codex 執行時。

OpenAI 明確支援在外部工具和工作流程（如 OpenClaw）中使用訂閱 OAuth。

提供者、模型、執行時和通道是不同的層級。如果這些標籤混淆在一起，請在變更設定前先閱讀 [代理執行時](/zh-Hant/concepts/agent-runtimes)。

## 快速選擇

| 目標                                       | 使用                                              | 備註                                                                   |
| ------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 使用原生 Codex 執行時的 ChatGPT/Codex 訂閱 | `openai/gpt-5.5`                                  | 預設的 OpenAI 代理設定。使用 Codex 驗證登入。                          |
| 代理模型的直接 API 金鑰計費                | `openai/gpt-5.5` 加上相容 Codex 的 API 金鑰設定檔 | 使用 `auth.order.openai` 將備份放置在訂閱驗證之後。                    |
| 透過明確 PI 的直接 API 金鑰計費            | `openai/gpt-5.5` 加上提供者/模型執行時 `pi`       | 選擇一個正常的 `openai` API 金鑰設定檔。                               |
| 最新的 ChatGPT Instant API 別名            | `openai/chat-latest`                              | 僅限直接 API 金鑰。用於實驗的變動別名，非預設值。                      |
| 透過明確 PI 的 ChatGPT/Codex 訂閱驗證      | `openai/gpt-5.5` 加上提供者/模型執行時 `pi`       | 為相容性路由選擇一個 `openai-codex` 驗證設定檔。                       |
| 圖片生成或編輯                             | `openai/gpt-image-2`                              | 適用於 `OPENAI_API_KEY` 或 OpenAI Codex OAuth。                        |
| 透明背景圖片                               | `openai/gpt-image-1.5`                            | 使用 `outputFormat=png` 或 `webp` 和 `openai.background=transparent`。 |

## 命名對照

名稱相似但不可互換：

| 您看到的名稱                            | 層級                | 含義                                                                                                  |
| --------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `openai`                                | 供應商前綴          | 標準的 OpenAI 模型路由；代理回合使用 Codex 執行時。                                                   |
| `openai-codex`                          | 舊版驗證/設定檔前綴 | 較舊的 OpenAI Codex OAuth/訂閱設定檔命名空間。現有的設定檔和 `auth.order.openai-codex` 仍然可以使用。 |
| `codex` 外掛程式                        | 外掛                | 內建的 OpenClaw 外掛程式，提供原生 Codex 應用程式伺服器執行階段和 `/codex` 聊天控制項。               |
| provider/model `agentRuntime.id: codex` | 代理執行時          | 為匹配的內嵌回合強制使用原生 Codex 應用伺服器框架。                                                   |
| `/codex ...`                            | 聊天指令集          | 從對話中綁定/控制 Codex 應用伺服器執行緒。                                                            |
| `runtime: "acp", agentId: "codex"`      | ACP 會話路由        | 透過 ACP/acpx 執行 Codex 的明確備援路徑。                                                             |

這意味著組態可以刻意包含 `openai/*` 模型參照，而驗證設定檔仍指向 Codex 相容的認證資訊。對於新的組態，建議優先使用 `auth.order.openai`；現有的 `openai-codex:*` 設定檔和 `auth.order.openai-codex` 仍然受支援。`openclaw doctor --fix` 會將舊版的 `openai-codex/*` 模型參照重寫為標準的 OpenAI 模型路由。

<Note>GPT-5.5 可透過直接 OpenAI Platform API 金鑰存取和 訂閱/OAuth 路由取得。若要使用 ChatGPT/Codex 訂閱加上原生 Codex 執行，請使用 `openai/gpt-5.5`；未設定的執行時設定現在會為 OpenAI 代理回合選取 Codex 框架。僅當您想要為 OpenAI 代理模型使用直接 API 金鑰驗證時， 才使用 OpenAI API 金鑰設定檔。</Note>

<Note>OpenAI 代理模型輪替需要內建的 Codex app-server 外掛。明確的 PI 執行時間設定仍可作為選用的相容性途徑。當使用 `openai-codex` 驗證設定檔明確選擇 PI 時，OpenClaw 會將 公用模型參照保持為 `openai/*`，並透過傳統 Codex-auth 傳輸層在內部路由 PI。請執行 `openclaw doctor --fix` 以修復過時的 `openai-codex/*` 模型參照，或非來自 明確執行時間設定的舊 PI 會話釘選。</Note>

## OpenClaw 功能支援

| OpenAI 功能           | OpenClaw 介面                                                          | 狀態                               |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| 聊天 / 回應           | `openai/<model>` 模型提供者                                            | 是                                 |
| Codex 訂閱模型        | `openai/<model>` 搭配 `openai-codex` OAuth                             | 是                                 |
| 傳統 Codex 模型參照   | `openai-codex/<model>`                                                 | 由 doctor 修復為 `openai/<model>`  |
| Codex app-server 掛接 | 省略執行時間或提供者/模型 `agentRuntime.id: codex` 的 `openai/<model>` | 是                                 |
| 伺服器端網路搜尋      | 原生 OpenAI Responses 工具                                             | 是，當啟用網路搜尋且未釘選提供者時 |
| 圖片                  | `image_generate`                                                       | 是                                 |
| 影片                  | `video_generate`                                                       | 是                                 |
| 文字轉語音            | `messages.tts.provider: "openai"` / `tts`                              | 是                                 |
| 批次語音轉文字        | `tools.media.audio` / 媒體理解                                         | 是                                 |
| 串流語音轉文字        | 語音通話 `streaming.provider: "openai"`                                | 是                                 |
| 即時語音              | 語音通話 `realtime.provider: "openai"` / 控制介面交談                  | 是                                 |
| 嵌入向量              | 記憶體嵌入向量提供者                                                   | 是                                 |

## 記憶體嵌入向量

OpenClaw 可以使用 OpenAI 或與 OpenAI 相容的嵌入端點，用於
`memory_search` 索引和查詢嵌入向量：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

對於需要非對稱嵌入標籤的 OpenAI 相容端點，請在 `memorySearch` 下設定 `queryInputType` 和 `documentInputType`。OpenClaw 會將這些作為提供者特定的 `input_type` 請求欄位轉發：查詢嵌入使用 `queryInputType`；索引的記憶區塊和批次索引則使用 `documentInputType`。請參閱 [Memory configuration reference](/zh-Hant/reference/memory-config#provider-specific-config) 以取得完整範例。

## 快速入門

選擇您偏好的驗證方法並依照設定步驟操作。

<Tabs>
  <Tab title="API 金鑰 (OpenAI Platform)">
    **最適用於：** 直接 API 存取與依用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [OpenAI Platform 儀表板](https://platform.openai.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行導覽">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接傳入金鑰：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="驗證模型可用性">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref              | Runtime config             | Route                       | Auth             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omitted / provider/model `agentRuntime.id: "codex"` | Codex app-server harness | Codex-compatible OpenAI profile |
    | `openai/gpt-5.4-mini` | omitted / provider/model `agentRuntime.id: "codex"` | Codex app-server harness | Codex-compatible OpenAI profile |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "pi"`              | PI embedded runtime      | `openai` profile or selected `openai-codex` profile |

    <Note>
    `openai/*` 代理模型使用 Codex app-server harness。若要對代理模型使用 API 金鑰驗證，請建立相容 Codex 的 API 金鑰設定檔並使用 `auth.order.openai` 排序；`OPENAI_API_KEY` 仍是非代理 OpenAI API 介面的直接後援。較舊的 `auth.order.openai-codex` 項目仍可使用。
    </Note>

    ### 設定範例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    若要透過 OpenAI API 嘗試 ChatGPT 目前的 Instant 模型，請將模型設為 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` 是一個移動別名。OpenAI 將其記錄為 ChatGPT 中使用的最新 Instant 模型，並建議生產環境 API 使用 `gpt-5.5`，因此除非您明確想要該別名行為，否則請將 `openai/gpt-5.5` 保留為穩定的預設值。此別名目前僅接受 `medium` 文字詳細度，因此 OpenClaw 會對此模型標準化不相容的 OpenAI 文字詳細度覆寫。

    <Warning>
    OpenClaw **不會**公開 `openai/gpt-5.3-codex-spark`。即時 OpenAI API 要求會拒絕該模型，且目前的 Codex 目錄也未公開該模型。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **最適用於：** 使用您的 ChatGPT/Codex 訂閱搭配原生 Codex 應用程式伺服器執行，而非使用個別的 API 金鑰。Codex cloud 需要 ChatGPT 登入。

    <Steps>
      <Step title="執行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接執行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        對於無介面或對回調不友善的設定，請加入 `--device-code` 以使用 ChatGPT 裝置碼流程登入，而非本機瀏覽器回調：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="使用標準 OpenAI 模型路由">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        預設路徑不需要執行時期組態。OpenAI 代理程式回合會
        自動選取原生 Codex 應用程式伺服器執行時期，且當選擇此路由時，
        OpenClaw 會安裝或修復隨附的 Codex 外掛程式。
      </Step>
      <Step title="驗證 Codex 驗證是否可用">
        ```bash
        openclaw models list --provider openai-codex
        ```

        閘道執行後，在聊天中傳送 `/codex status` 或 `/codex models`
        以驗證原生應用程式伺服器執行時期。
      </Step>
    </Steps>

    ### 路由摘要

    | 模型參照 | 執行時期組態 | 路由 | 驗證 |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | 省略 / provider/model `agentRuntime.id: "codex"` | 原生 Codex 應用程式伺服器擴充 | Codex 登入或已排序的 `openai` 驗證設定檔 |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "pi"` | 內部 Codex 驗證傳輸的 PI 內嵌執行時期 | 已選取的 `openai-codex` 設定檔 |
    | `openai-codex/gpt-5.5` | 由 doctor 修復 | 重寫為 `openai/gpt-5.5` 的舊版路由 | 現有 `openai-codex` 設定檔 |

    <Warning>
    請勿設定較舊的 `openai-codex/gpt-5.1*`、`openai-codex/gpt-5.2*` 或
    `openai-codex/gpt-5.3*` 模型參照。ChatGPT/Codex OAuth 帳戶現在會拒絕
    那些模型。請使用 `openai/gpt-5.5`；OpenAI 代理程式回合現在預設會選取 Codex
    執行時期。
    </Warning>

    <Note>
    `openai-codex/*` 模型前綴是由 doctor 修復的舊版組態。對於
    常見的訂閱加上原生執行時期設定，請使用 Codex 驗證登入，
    但將模型參照維持為 `openai/gpt-5.5`。新組態應將 OpenAI
    代理程式驗證順序置於 `auth.order.openai` 之下；較舊的 `auth.order.openai-codex`
    項目仍然有效。
    </Note>

    ### 組態範例

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
    }
    ```

    如果有 API 金鑰備份，請將模型維持在 `openai/gpt-5.5` 並將
    驗證順序置於 `openai` 之下。OpenClaw 會先嘗試訂閱，接著
    是 API 金鑰，同時維持在 Codex 擴充上：

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
      auth: {
        order: {
          openai: [
            "openai-codex:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    入門流程不再從 `~/.codex` 匯入 OAuth 資料。請使用瀏覽器 OAuth (預設) 或上述裝置碼流程登入 — OpenClaw 會在自己的代理程式驗證存放區中管理產生的認證。
    </Note>

    ### 檢查並復原 Codex OAuth 路由

    使用這些指令來查看您的預設
    代理程式正在使用哪個模型、執行時期和驗證路由：

    ```bash
    openclaw models status
    openclaw models auth list --provider openai-codex
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    針對特定代理程式，請加入 `--agent <id>`：

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai-codex
    ```

    如果較舊的組態仍有 `openai-codex/gpt-*` 或過時的 OpenAI PI
    工作階段固定項，且沒有明確的執行時期組態，請修復它：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai-codex` 顯示沒有可用的設定檔，請
    再次登入：

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    `openai/*` 是透過 Codex 的 OpenAI 代理程式回合的模型路由。
    `openai-codex` 驗證/設定檔提供者 ID 對於現有
    設定檔和 CLI 列表仍被接受。

    ### 狀態指示器

    聊天 `/status` 會顯示目前工作階段啟用的是哪個模型執行時期。
    隨附的 Codex 應用程式伺服器擴充會顯示為 `Runtime: OpenAI Codex`，用於
    OpenAI 代理程式模型回合。過時的 PI 工作階段固定項會被修復為 Codex，除非
    組態明確固定為 PI。

    ### Doctor 警告

    如果組態或
    工作階段狀態中仍有 `openai-codex/*` 路由或過時的 OpenAI PI 固定項，
    `openclaw doctor --fix` 會將其重寫為 `openai/*`，並搭配
    Codex 執行時期，除非明確設定 PI。

    ### 語境視窗上限

    OpenClaw 將模型中繼資料和執行時期語境上限視為不同的值。

    對於透過 Codex OAuth 目錄的 `openai/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 預設執行時期 `contextTokens` 上限：`272000`

    較小的預設上限在實務上具有更好的延遲和品質特性。使用 `contextTokens` 覆寫它：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 來宣告原生模型中繼資料。使用 `contextTokens` 來限制執行時期語境預算。
    </Note>

    ### 目錄復原

    當 `gpt-5.5` 存在時，OpenClaw 會使用上游 Codex 目錄中繼資料。
    如果即時 Codex 探索在帳戶已驗證時省略了 `gpt-5.5` 資料列，
    OpenClaw 會綜合該 OAuth 模型資料列，讓 cron、子代理程式和設定的預設模型執行不會因
    `Unknown model` 而失敗。

  </Tab>
</Tabs>

## 原生 Codex 應用伺服器驗證

原生的 Codex app-server harness 使用 `openai/*` 模型引用加上省略的
运行时配置或提供者/模型 `agentRuntime.id: "codex"`，但其验证方式
仍基于账户。OpenClaw 按以下顺序选择验证：

1. 用于代理的有序 OpenAI 验证配置文件，最好位于
   `auth.order.openai` 下。现有的 `openai-codex:*` 配置文件和
   `auth.order.openai-codex` 对于较旧的安装仍然有效。
2. 應用伺服器的現有帳戶，例如本機 Codex CLI ChatGPT 登入。
3. 仅适用于本地 stdio app-server 启动，`CODEX_API_KEY`，然后
   `OPENAI_API_KEY`，当 app-server 报告没有账户但仍需要
   OpenAI 验证时。

这意味着本地的 ChatGPT/Codex 订阅登录不会被仅仅因为网关进程也有用于直接 OpenAI 模型
或嵌入的 `OPENAI_API_KEY` 而替换。Env API-key 回退仅限本地 stdio 无账户路径；它
不会被发送到 WebSocket app-server 连接。当选择了订阅式 Codex
配置文件时，OpenClaw 还会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY`
排除在生成的 stdio app-server 子进程之外，并通过 app-server 登录 RPC 发送所选凭据。
当该订阅配置文件被 Codex 使用限制阻止时，OpenClaw 可以轮换到下一个有序的 `openai:*` API-key
配置文件，而无需更改所选模型或退出 Codex harness。一旦订阅重置时间通过，订阅配置文件将
再次有资格使用。

## 影像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册图像生成。
它支持通过同一个 `openai/gpt-image-2` 模型引用进行 OpenAI API-key 图像生成和 Codex OAuth 图像
生成。

| 功能               | OpenAI API 金鑰             | Codex OAuth                 |
| ------------------ | --------------------------- | --------------------------- |
| 模型引用           | `openai/gpt-image-2`        | `openai/gpt-image-2`        |
| 驗證               | `OPENAI_API_KEY`            | OpenAI Codex OAuth 登入     |
| 傳輸               | OpenAI Images API           | Codex Responses 後端        |
| 每次請求最大影像數 | 4                           | 4                           |
| 編輯模式           | 已啟用（最多 5 張參考影像） | 已啟用（最多 5 張參考影像） |
| 尺寸覆寫           | 支援，包括 2K/4K 尺寸       | 支援，包括 2K/4K 尺寸       |
| 長寬比 / 解析度    | 不轉發至 OpenAI Images API  | 安全時對應至支援的尺寸      |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>请参阅 [Image Generation](/zh-Hant/tools/image-generation) 以了解共享工具参数、提供者选择和故障转移行为。</Note>

`gpt-image-2` 是 OpenAI 文字生成圖片和圖片編輯的預設選項。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作為明確的模型覆寫使用。使用 `openai/gpt-image-1.5` 以取得透明背景的 PNG/WebP 輸出；目前的 `gpt-image-2` API 會拒絕 `background: "transparent"`。

對於透明背景的要求，代理程式應該使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"`，以及 `background: "transparent"` 來呼叫 `image_generate`；較舊的 `openai.background` 提供者選項仍然被接受。OpenClaw 透過將預設的 `openai/gpt-image-2` 透明要求重寫為 `gpt-image-1.5`，來保護公開的 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自訂的 OpenAI 相容端點則會保留其設定的部署/模型名稱。

相同的設置也會公開用於無頭 CLI 執行：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

當從輸入檔案開始時，請搭配 `openclaw infer image edit` 使用相同的 `--output-format` 和 `--background` 旗標。`--openai-background` 仍可作為 OpenAI 專用的別名使用。

對於 Codex OAuth 安裝，請保留相同的 `openai/gpt-image-2` 參照。當設定 `openai-codex` OAuth 設定檔時，OpenClaw 會解析該儲存的 OAuth 存取權杖，並透過 Codex Responses 後端傳送圖片要求。它不會先嘗試 `OPENAI_API_KEY` 或針對該要求無提示地回退至 API 金鑰。當您想要改用直接的 OpenAI Images API 路由時，請使用 API 金鑰、自訂基礎 URL 或 Azure 端點明確設定 `models.providers.openai`。如果該自訂圖片端點位於受信任的 LAN/私人位址上，請也設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非有此加入選項，否則 OpenClaw 會保持封鎖私人/內部 OpenAI 相容圖片端點。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

生成透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

編輯：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## 視訊生成

內建的 `openai` 外掛程式透過 `video_generate` 工具註冊影片生成功能。

| 功能     | 值                                                                           |
| -------- | ---------------------------------------------------------------------------- |
| 預設模型 | `openai/sora-2`                                                              |
| 模式     | 文字生成影片、圖片生成影片、單一影片編輯                                     |
| 參考輸入 | 1 張圖片或 1 部影片                                                          |
| 尺寸覆寫 | 支援                                                                         |
| 其他覆寫 | `aspectRatio`、`resolution`、`audio` 和 `watermark` 會被忽略，並顯示工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>請參閱 [視訊生成](/zh-Hant/tools/video-generation) 以了解共享工具參數、提供者選擇和容錯移轉行為。</Note>

## GPT-5 提示詞貢獻

OpenClaw 為跨提供者的 GPT-5 系列執行添加了共享的 GPT-5 提示詞貢獻。它依模型 ID 套用，因此 `openai/gpt-5.5`、舊版修復前參照（例如 `openai-codex/gpt-5.5`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5`）以及其他相容的 GPT-5 參照都會收到相同的疊加層。較舊的 GPT-4.x 模型則不會。

隨附的原生 Codex 駝具透過 Codex 應用伺服器開發者指示使用相同的 GPT-5 行為和心跳疊加層，因此透過 Codex 路由的 `openai/gpt-5.x` 工作階段即使 Codex 擁有其餘的駝具提示詞，仍能保持相同的貫徹執行和主動心跳指導。

GPT-5 貢獻為角色持久性、執行安全性、工具紀律、輸出形狀、完成檢查和驗證新增了帶有標籤的行為合約。特定頻道的回覆和無訊息行為保留在共用的 OpenClaw 系統提示詞和出站傳遞原則中。GPT-5 指引對符合的模型始終啟用。友善的互動樣式層是分開的且可設定。

| 值                   | 效果                |
| -------------------- | ------------------- |
| `"friendly"`（預設） | 啟用友善互動樣式層  |
| `"on"`               | `"friendly"` 的別名 |
| `"off"`              | 僅停用友善樣式層    |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>數值在執行時不區分大小寫，因此 `"Off"` 和 `"off"` 都會停用友善樣式層。</Tip>

<Note>當未設定共享的 `agents.defaults.promptOverlays.gpt5.personality` 設定時，仍會讀取舊版 `plugins.entries.openai.config.personality` 作為相容性後備。</Note>

## 語音與語音合成

<AccordionGroup>
  <Accordion title="語音合成 (TTS)">
    內建的 `openai` 外掛程式會為 `messages.tts` 介面註冊語音合成功能。

    | 設定 | Config 路徑 | 預設值 |
    |---------|------------|---------|
    | Model | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voice | `messages.tts.providers.openai.voice` | `coral` |
    | Speed | `messages.tts.providers.openai.speed` | (未設定) |
    | Instructions | `messages.tts.providers.openai.instructions` | (未設定，僅限 `gpt-4o-mini-tts`) |
    | Format | `messages.tts.providers.openai.responseFormat` | 語音備忘錄為 `opus`，檔案為 `mp3` |
    | API key | `messages.tts.providers.openai.apiKey` | 會回退至 `OPENAI_API_KEY` |
    | Base URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Extra body | `messages.tts.providers.openai.extraBody` / `extra_body` | (未設定) |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用語音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 會在 OpenClaw 產生的欄位之後，合併到 `/audio/speech` 請求 JSON 中，因此請將其用於需要額外金鑰（例如 `lang`）的 OpenAI 相容端點。原型金鑰將會被忽略。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    設定 `OPENAI_TTS_BASE_URL` 以覆寫 TTS 基礎 URL，而不會影響聊天 API 端點。OpenAI TTS 仍然透過 API 金鑰進行設定；若是僅限 OAuth 的即時回話，請使用 Realtime 語音路徑，而不是代理模式 STT -> TTS 語音。
    </Note>

  </Accordion>

  <Accordion title="語音轉文字">
    內建的 `openai` 外掛程式透過 OpenClaw 的媒體理解轉錄表面註冊批次語音轉文字功能。

    - 預設模型：`gpt-4o-transcribe`
    - 端點：OpenAI REST `/v1/audio/transcriptions`
    - 輸入路徑：多部分音訊檔案上傳
    - OpenClaw 在任何使用 `tools.media.audio` 進行傳入音訊轉錄的地方皆提供支援，包括 Discord 語音頻道區段和頻道音訊附件

    若要針對傳入音訊轉錄強制使用 OpenAI：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    當共用音訊媒體設定或單次轉錄請求提供語言和提示提示時，這些資訊會轉送至 OpenAI。

  </Accordion>

  <Accordion title="即時轉錄">
    內建的 `openai` 外掛程式為語音通話外掛程式註冊即時轉錄功能。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 語言 | `...openai.language` | (未設定) |
    | 提示 | `...openai.prompt` | (未設定) |
    | 靜音持續時間 | `...openai.silenceDurationMs` | `800` |
    | VAD 臨界值 | `...openai.vadThreshold` | `0.5` |
    | 驗證 | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai-codex` OAuth | API 金鑰直接連線；OAuth 會產生即時轉錄用戶端密碼 |

    <Note>
    使用 WebSocket 連線到 `wss://api.openai.com/v1/realtime`，並搭配 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音訊。當僅設定 `openai-codex` OAuth 時，閘道會在開啟 WebSocket 之前產生暫時的即時轉錄用戶端密碼。此串流提供者是用於語音通話的即時轉錄路徑；Discord 語音目前會錄製短區段，並改用批次 `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    隨附的 `openai` 外掛程式會為 Voice Call 外掛程式註冊即時語音。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voice | `...openai.voice` | `alloy` |
    | Temperature (Azure deployment bridge) | `...openai.temperature` | `0.8` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | Silence duration | `...openai.silenceDurationMs` | `500` |
    | Prefix padding | `...openai.prefixPaddingMs` | `300` |
    | Reasoning effort | `...openai.reasoningEffort` | (unset) |
    | Auth | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai-codex` OAuth | Browser Talk 和非 Azure 後端橋接器可以使用 Codex OAuth |

    `gpt-realtime-2` 可用的內建 Realtime 語音：`alloy`、`ash`、
    `ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin`、`cedar`。
    OpenAI 建議使用 `marin` 和 `cedar` 以獲得最佳的 Realtime 品質。這
    是與上述文字轉語音語音不同的一組；請勿假設 TTS
    語音（例如 `fable`、`nova` 或 `onyx`）對於 Realtime 會話是有效的。

    <Note>
    後端 OpenAI realtime 橋接器使用 GA Realtime WebSocket 會話形狀，不接受 `session.temperature`。Azure OpenAI 部署可透過 `azureEndpoint` 和 `azureDeployment` 獲得，並保持與部署相容的會話形狀。支援雙向工具呼叫和 G.711 u-law 音訊。
    </Note>

    <Note>
    Realtime 語音是在建立會話時選取的。OpenAI 允許大多數
    會話欄位稍後變更，但在該會話中
    模型發出音訊後，語音無法變更。OpenClaw 目前將
    內建 Realtime 語音 ID 公開為字串。
    </Note>

    <Note>
    Control UI Talk 使用 OpenAI 瀏覽器 realtime 會話，並搭配 Gateway 產生的
    暫時性用戶端密鑰，以及針對
    OpenAI Realtime API 的直接瀏覽器 WebRTC SDP 交換。當未設定直接 OpenAI API 金鑰時，
    Gateway 可以使用選定的 `openai-codex` OAuth
    設定檔來產生該用戶端密鑰。Gateway 中繼和 Voice Call 後端 realtime WebSocket 橋接器對於
    原生 OpenAI 端點使用相同的 OAuth 後援。維護者即時
    驗證可透過
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 使用；
    OpenAI 端點會在不記錄密鑰的情況下驗證後端 WebSocket 橋接器和瀏覽器
    WebRTC SDP 交換。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端點

內建的 `openai` 提供者可以透過覆寫基礎 URL 來針對 Azure OpenAI 資源進行影像生成。在影像生成路徑上，OpenClaw 會偵測 `models.providers.openai.baseUrl` 上的 Azure 主機名稱，並自動切換至 Azure 的請求格式。

<Note>即時語音使用單獨的設定路徑 (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) 且不受 `models.providers.openai.baseUrl` 影響。請參閱 [Voice and speech](#voice-and-speech) 下的 **Realtime voice** 手風琴選項以了解其 Azure 設定。</Note>

在以下情況使用 Azure OpenAI：

- 您已經擁有 Azure OpenAI 訂閱、配額或企業合約
- 您需要 Azure 提供的區域資料常駐或合規性控制
- 您希望讓流量保留在現有的 Azure 租用戶內

### 設定

若要透過內建的 `openai` 提供者進行 Azure 影像生成，請將
`models.providers.openai.baseUrl` 指向您的 Azure 資源，並將 `apiKey` 設定為
Azure OpenAI 金鑰（而非 OpenAI Platform 金鑰）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw 會針對 Azure 影像生成路徑辨識這些 Azure 主機尾碼：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

針對辨識出的 Azure 主機上的影像生成請求，OpenClaw 會：

- 傳送 `api-key` 標頭而非 `Authorization: Bearer`
- 使用部署範圍的路徑 (`/openai/deployments/{deployment}/...`)
- 將 `?api-version=...` 附加至每個請求
- 針對 Azure 影像生成呼叫使用 600 秒的預設請求逾時。
  每次呼叫的 `timeoutMs` 值仍會覆寫此預設值。

其他基礎 URL（公開的 OpenAI、OpenAI 相容的 Proxy）則會保持標準的 OpenAI 影像請求格式。

<Note>`openai` 提供者之影像生成路徑的 Azure 路由需要 OpenClaw 2026.4.22 或更新版本。較早版本會將任何自訂 `openai.baseUrl` 視為公開的 OpenAI 端點，並且對 Azure 影像部署會失敗。</Note>

### API 版本

設定 `AZURE_OPENAI_API_VERSION` 以釘選特定的 Azure 預覽或 GA 版本
給 Azure 影像生成路徑：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

當未設定變數時，預設值為 `2024-12-01-preview`。

### 模型名稱即為部署名稱

Azure OpenAI 將模型綁定至部署。對於透過內建 `openai` 提供者路由的 Azure 影像生成請求，OpenClaw 中的 `model` 欄位必須是您在 Azure 入口網站中設定的 **Azure 部署名稱**，而非
公開的 OpenAI 模型 ID。

如果您建立一個名為 `gpt-image-2-prod` 且提供 `gpt-image-2` 服務的部署：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名稱規則也適用於透過內建 `openai` 提供者路由的影像生成呼叫。

### 區域可用性

Azure 影像生成目前僅在部分區域提供（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、`uaenorth`）。在建立部署前，請檢查 Microsoft 目前的區域清單，並確認您的區域提供該特定模型。

### 參數差異

Azure OpenAI 與公共 OpenAI 並非總是接受相同的影像參數。Azure 可能會拒絕公共 OpenAI 允許的選項（例如 `gpt-image-2` 上的某些 `background` 值），或僅在特定模型版本上公開這些選項。這些差異來自 Azure 和底層模型，而非 OpenClaw。如果 Azure 請求因驗證錯誤而失敗，請在 Azure 入口網站中檢查您的特定部署和 API 版本所支援的參數集。

<Note>
Azure OpenAI 使用原生傳輸和相容性行為，但不會接收 OpenClaw 的隱藏歸因標頭 — 請參閱 [Advanced configuration](#advanced-configuration) 下的 **Native vs OpenAI-compatible routes** 手風琴選單。

對於 Azure 上的聊天或 Responses 流量（超出影像生成範圍），請使用入門流程或專用的 Azure 提供者設定 — 僅靠 `openai.baseUrl` 不會採用 Azure API/auth 形式。存在一個獨立的 `azure-openai-responses/*` 提供者；請參閱下方的 Server-side compaction 手風琴選單。

</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="傳輸方式 (WebSocket 與 SSE)">
    OpenClaw 對於 `openai/*` 採用 WebSocket 優先並 SSE 備援 (`"auto"`) 的策略。

    在 `"auto"` 模式下，OpenClaw 會：
    - 在回退至 SSE 前重試一次早期的 WebSocket 失敗
    - 失敗後，將 WebSocket 標記為降級約 60 秒，並在冷卻期間使用 SSE
    - 附加穩定的會話和輪次識別標頭，用於重試和重新連線
    - 對不同傳輸變體的使用計數器 (`input_tokens` / `prompt_tokens`) 進行標準化

    | 數值 | 行為 |
    |-------|----------|
    | `"auto"` (預設) | WebSocket 優先，SSE 備援 |
    | `"sse"` | 僅強制使用 SSE |
    | `"websocket"` | 僅強制使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相關的 OpenAI 文件：
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 為 `openai/*` 提供了一個共用的快速模式切換開關：

    - **聊天/介面：** `/fast status|on|off`
    - **設定：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    啟用後，OpenClaw 會將快速模式對應到 OpenAI 優先處理 (`service_tier = "priority"`)。現有的 `service_tier` 值會被保留，且快速模式不會重寫 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    會話覆寫優先於設定。在 Sessions 介面中清除會話覆寫會將該會話恢復為設定的預設值。
    </Note>

  </Accordion>

  <Accordion title="優先處理 (service_tier)">
    OpenAI 的 API 透過 `service_tier` 公開優先處理功能。您可以在 OpenClaw 中針對每個模型進行設定：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支援的值包括：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 僅會轉送至原生 OpenAI 端點 (`api.openai.com`) 和原生 Codex 端點 (`chatgpt.com/backend-api`)。如果您透過 Proxy 路由任一提供者，OpenClaw 將不會改動 `service_tier`。
    </Warning>

  </Accordion>

  <Accordion title="Server-side compaction (Responses API)">
    對於直接的 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenAI 插件的 Pi-harness 串流包裝器會自動啟用伺服器端壓縮：

    - 強制 `store: true`（除非模型相容性設定了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 預設 `compact_threshold`：`contextWindow` 的 70%（或在不可用時為 `80000`）

    這適用於內建 Pi harness 路徑以及嵌入式執行所使用的 OpenAI provider hooks。原生 Codex app-server harness 透過 Codex 管理其自己的上下文，並由 OpenAI 的預設代理路由或 provider/model 執行時原則設定。

    <Tabs>
      <Tab title="Enable explicitly">
        對於相容的端點（如 Azure OpenAI Responses）很有用：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Custom threshold">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Disable">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 僅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍然會強制 `store: true`，除非相容性設定了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    對於 `openai/*` 上的 GPT-5 系列執行，OpenClaw 可以使用更嚴格的嵌入式執行合約：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    啟用 `strict-agentic` 後，OpenClaw：
    - 當有工具動作可用時，不再將僅計劃的回合視為成功的進度
    - 使用立即行動的引導重試該回合
    - 針對實質性工作自動啟用 `update_plan`
    - 如果模型持續計劃而不採取行動，則顯示明確的封鎖狀態

    <Note>
    僅限於 OpenAI 和 Codex GPT-5 系列執行。其他 provider 和較舊的模型系列保持預設行為。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 對直接 OpenAI、Codex 和 Azure OpenAI 端點的處理方式不同於一般的 OpenAI 相容 `/v1` 代理伺服器：

    **原生路由** (`openai/*`、Azure OpenAI)：
    - 僅針對支援 OpenAI `none` 計畫的模型保留 `reasoning: { effort: "none" }`
    - 省略會拒絕 `reasoning.effort: "none"` 的模型或代理伺服器的停用推理功能
    - 將工具架構預設為嚴格模式
    - 僅在已驗證的原生主機上附加隱藏的歸因標頭
    - 保留 OpenAI 專用的請求塑形 (`service_tier`、`store`、reasoning-compat、prompt-cache hints)

    **代理伺服器/相容路由：**
    - 使用較寬鬆的相容行為
    - 從非原生 `openai-completions` 載荷中移除 Completions `store`
    - 接受 OpenAI 相容 Completions 代理伺服器的進階 `params.extra_body`/`params.extraBody` 透傳 JSON
    - 接受 OpenAI 相容 Completions 代理伺服器 (例如 vLLM) 的 `params.chat_template_kwargs`
    - 不強制執行嚴格的工具架構或僅限原生的標頭

    Azure OpenAI 使用原生傳輸和相容行為，但不會接收隱藏的歸因標頭。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用的影像工具參數和提供者選擇。
  </Card>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數和提供者選擇。
  </Card>
  <Card title="OAuth 和 auth" href="/zh-Hant/gateway/authentication" icon="key">
    Auth 詳細資訊與憑證重用規則。
  </Card>
</CardGroup>
