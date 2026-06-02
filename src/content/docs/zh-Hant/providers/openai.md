---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI 提供 GPT 模型的開發者 API，並且透過 OpenAI 的 Codex 用戶端，Codex 也可作為 ChatGPT 方案的程式撰寫代理程式使用。OpenClaw 使用一個提供者 ID，即 `openai`，來處理這兩種驗證形態。

OpenClaw 使用 `openai/*` 作為標準的 OpenAI 模型路由。嵌入式代理程式預設會透過原生 Codex 應用程式伺服器執行階段來啟動 OpenAI 模型；對於非代理程式的 OpenAI 介面（例如圖片、嵌入、語音與即時功能），則仍可使用直接的 OpenAI API 金鑰驗證。

- **代理程式模型** - 透過 Codex 執行階段使用 `openai/*` 模型；登入 Codex 驗證以使用 ChatGPT/Codex 訂閱，或者當您刻意想要使用 API 金鑰驗證時，設定相容 Codex 的 OpenAI API 金鑰備援。
- **非代理程式 OpenAI API** - 透過 `OPENAI_API_KEY` 或 OpenAI API 金鑰加入，直接存取 OpenAI Platform 並依使用量計費。
- **舊版設定** - 舊版 Codex 模型參照會由 `openclaw doctor --fix` 修復為 `openai/*` 並加上 Codex 執行階段。

OpenAI 明確支援在外部工具和工作流程（如 OpenClaw）中使用訂閱 OAuth。

提供者、模型、執行階段與管道是分層的。如果這些標籤混淆在一起，請在變更設定前先閱讀 [代理程式執行階段](/zh-Hant/concepts/agent-runtimes)。

## 快速選擇

| 目標                                       | 使用                                              | 備註                                                                   |
| ------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 使用原生 Codex 執行時的 ChatGPT/Codex 訂閱 | `openai/gpt-5.5`                                  | 預設的 OpenAI 代理設定。使用 Codex 驗證登入。                          |
| 代理模型的直接 API 金鑰計費                | `openai/gpt-5.5` 加上相容 Codex 的 API 金鑰設定檔 | 使用 `auth.order.openai` 將備份放在訂閱驗證之後。                      |
| 透過明確的 OpenClaw 直接使用 API 金鑰計費  | `openai/gpt-5.5` 加上提供者/模型運行時 `openclaw` | 選擇標準的 `openai` API 金鑰設定檔。                                   |
| 最新的 ChatGPT Instant API 別名            | `openai/chat-latest`                              | 僅限直接 API 金鑰。用於實驗的變動別名，非預設值。                      |
| 透過 OpenClaw 使用 ChatGPT/Codex 訂閱驗證  | `openai/gpt-5.5` 加上提供者/模型運行時 `openclaw` | 為相容性路由選取一個 `openai` OAuth 設定檔。                           |
| 圖片生成或編輯                             | `openai/gpt-image-2`                              | 可與 `OPENAI_API_KEY` 或 OpenAI Codex OAuth 搭配使用。                 |
| 透明背景圖片                               | `openai/gpt-image-1.5`                            | 使用 `outputFormat=png` 或 `webp` 和 `openai.background=transparent`。 |

## 命名對照

名稱相似但不可互換：

| 您看到的名稱                            | 層級          | 含義                                                                        |
| --------------------------------------- | ------------- | --------------------------------------------------------------------------- |
| `openai`                                | 供應商前綴    | 標準的 OpenAI 模型路由；代理回合使用 Codex 執行時。                         |
| legacy OpenAI Codex prefix              | Legacy prefix | 舊版模型/設定檔命名空間。`openclaw doctor --fix` 會將其遷移至 `openai`。    |
| `codex` 插件                            | 外掛          | 內建的 OpenClaw 插件，提供原生 Codex 應用伺服器執行時和 `/codex` 聊天控制。 |
| provider/model `agentRuntime.id: codex` | 代理執行時    | 為匹配的內嵌回合強制使用原生 Codex 應用伺服器框架。                         |
| `/codex ...`                            | 聊天指令集    | 從對話中綁定/控制 Codex 應用伺服器執行緒。                                  |
| `runtime: "acp", agentId: "codex"`      | ACP 會話路由  | 透過 ACP/acpx 執行 Codex 的明確備援路徑。                                   |

這意味著設定檔可以刻意包含 `openai/*` 模型參照，同時驗證設定檔指向 API 金鑰或 ChatGPT/Codex OAuth 憑證。請使用 `auth.order.openai` 進行設定；`openclaw doctor --fix` 會將舊版 Codex 模型參照、舊版 Codex 驗證設定檔 ID 和舊版 Codex 驗證順序重寫為標準 OpenAI 路由。

<Note>GPT-5.5 可透過直接 OpenAI Platform API 金鑰存取與訂閱/OAuth 路由取得。若要使用 ChatGPT/Codex 訂閱加上原生 Codex 執行，請使用 `openai/gpt-5.5`；未設定的執行階段設定現在會為 OpenAI 代理程式回合選取 Codex 支援系統。僅在您想要對 OpenAI 代理程式模型使用直接 API 金鑰驗證時，才使用 OpenAI API 金鑰設定檔。</Note>

<Note>OpenAI 代理模型輪次需要捆綁的 Codex 應用伺服器外掛程式。明確的 OpenClaw 執行時配置仍然可作為選用兼容路徑。當透過 `openai` OAuth 設定檔明確選擇 OpenClaw 時，OpenClaw 會將 公開模型參照保持為 `openai/*`，並在內部透過 Codex 認證 傳輸進行路由。執行 `openclaw doctor --fix` 以修復過時的 舊版 Codex 模型參照 `codex-cli/*`，或修復非來自 明確執行時配置的舊執行時會話釘選。</Note>

## OpenClaw 功能支援

| OpenAI 功能           | OpenClaw 介面                                                                            | 狀態                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 聊天 / 回應           | `openai/<model>` 模型提供者                                                              | 是                                                       |
| Codex 訂閱模型        | `openai/<model>` 搭配 OpenAI OAuth                                                       | 是                                                       |
| 傳統 Codex 模型參照   | 舊版 Codex 模型參照或 `codex-cli/<model>`                                                | 由 doctor 修復為 `openai/<model>`                        |
| Codex app-server 掛接 | `openai/<model>` 搭配省略的執行時或提供者/模型 `agentRuntime.id: codex`                  | 是                                                       |
| 伺服器端網路搜尋      | 原生 OpenAI Responses 工具                                                               | 是，當啟用網路搜尋且未釘選提供者時                       |
| 圖片                  | `image_generate`                                                                         | 是                                                       |
| 影片                  | `video_generate`                                                                         | 是                                                       |
| 文字轉語音            | `messages.tts.provider: "openai"` / `tts`                                                | 是                                                       |
| 批次語音轉文字        | `tools.media.audio` / 媒體理解                                                           | 是                                                       |
| 串流語音轉文字        | 語音通話 `streaming.provider: "openai"`                                                  | 是                                                       |
| 即時語音              | 語音通話 `realtime.provider: "openai"` / 控制介面對話 `talk.realtime.provider: "openai"` | 是（需要 OpenAI Platform 點數，而非 Codex/ChatGPT 訂閱） |
| 嵌入向量              | 記憶體嵌入向量提供者                                                                     | 是                                                       |

<Note>
  OpenAI Realtime 語音（由 Voice Call 的 `realtime.provider: "openai"` 和
  Control UI Talk with `talk.realtime.provider: "openai"` 使用）會透過公開的
  **OpenAI Platform Realtime API**，這是向 OpenAI Platform 點數計費，
  而非 Codex/ChatGPT 訂閱額度。一個擁有健康 OpenAI OAuth 且能正常
  執行 Codex 支援的聊天模型的帳戶，如果同一個 OpenAI 組織未設
  定 Platform 計費，仍然可能在第一次 Realtime 回合時遇到
  `insufficient_quota` / "You exceeded your current
  quota"（您已超過目前的額度）錯誤。

解決方法：在
[platform.openai.com/account/billing](https://platform.openai.com/account/billing)
為支援您即時憑證的組織充值 Platform 點數。Realtime 接受 Platform
`OPENAI_API_KEY`（透過 `talk.realtime.providers.openai.apiKey`
為 Control UI Talk 配置，或 `plugins.entries.voice-call.config.realtime.providers.openai.apiKey`
為 Voice Call 配置）或底層組織具備 Platform 計費的
`openai` OAuth 設定檔——這兩種路由都透過 Platform API
生成 Realtime 客戶端金鑰，因此無論哪種方式，組織都需要有足夠的
Platform 點數。對於聊天回合，您仍然可以針對同一個 OpenClaw 安裝
使用 Codex 支援的 `openai/*` 模型；Realtime 是唯一
需要 Platform 計費的路由。

</Note>

## 記憶嵌入

OpenClaw 可以使用 OpenAI 或相容 OpenAI 的嵌入端點來進行
`memory_search` 索引和查詢嵌入：

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

對於需要非對稱嵌入標籤的 OpenAI 相容端點，請在
`memorySearch` 下設定 `queryInputType` 和
`documentInputType`。OpenClaw 會將這些作為供應商特定的
`input_type` 請求欄位轉發：查詢嵌入使用
`queryInputType`；已索引的記憶區塊和批次索引則使用
`documentInputType`。請參閱 [Memory configuration reference](/zh-Hant/reference/memory-config#provider-specific-config) 以取得完整範例。

## 開始使用

選擇您偏好的驗證方式並依照設定步驟操作。

<Tabs>
  <Tab title="API 金鑰 (OpenAI Platform)">
    **最適合用於：** 直接存取 API 與依用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [OpenAI Platform 儀表板](https://platform.openai.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行導覽設定">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接傳入金鑰：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="驗證模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型參照              | 執行時期設定             | 路由                       | 驗證             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | 省略 / provider/model `agentRuntime.id: "codex"` | Codex app-server harness | 相容 Codex 的 OpenAI 設定檔 |
    | `openai/gpt-5.4-mini` | 省略 / provider/model `agentRuntime.id: "codex"` | Codex app-server harness | 相容 Codex 的 OpenAI 設定檔 |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "openclaw"`              | OpenClaw embedded runtime      | 選定的 `openai` 設定檔 |

    <Note>
    `openai/*` 代理模型使用 Codex app-server harness。若要對代理模型使用 API 金鑰驗證，請建立相容 Codex 的 API 金鑰設定檔並使用 `auth.order.openai` 排序；`OPENAI_API_KEY` 仍是非代理 OpenAI API 介面的直接後援。執行 `openclaw doctor --fix` 以遷移舊版 Codex 驗證排序項目。
    </Note>

    ### 設定範例

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    若要透過 OpenAI API 嘗試 ChatGPT 目前的 Instant 模型，請將模型設定為 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` 是一個動態別名。OpenAI 將其記錄為 ChatGPT 中使用的最新 Instant 模型，並建議在正式環境 API 使用中採用 `gpt-5.5`，因此除非您明確需要該別名行為，否則請將 `openai/gpt-5.5` 保持為穩定的預設值。該別名目前僅接受 `medium` 文本細緻度，因此 OpenClaw 會針對此模型正規化不相容的 OpenAI 文本細緻度覆寫。

    <Warning>
    OpenClaw **並未** 在直接的 OpenAI API 金鑰路由上公開 `gpt-5.3-codex-spark`。它僅在您的登入帳戶啟用時，透過 Codex 訂閱目錄項目提供。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **最適合：** 使用您的 ChatGPT/Codex 訂閱搭配原生 Codex app-server 執行，而非使用獨立的 API 金鑰。Codex cloud 需要 ChatGPT 登入。

    <Steps>
      <Step title="Run Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai
        ```

        或直接執行 OAuth：

        ```bash
        openclaw models auth login --provider openai
        ```

        針對無介面 或不支援回調 的設定，請加入 `--device-code` 以使用 ChatGPT 裝置碼流程 登入，而非本機瀏覽器回調：

        ```bash
        openclaw models auth login --provider openai --device-code
        ```
      </Step>
      <Step title="Use the canonical OpenAI model route">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        預設路徑不需要執行期 設定。OpenAI agent 輪次
        會自動選取原生 Codex app-server 執行期，當選擇此路徑時，OpenClaw
        會安裝或修復內建的 Codex 外掛。
      </Step>
      <Step title="Verify Codex auth is available">
        ```bash
        openclaw models list --provider openai
        ```

        閘道 執行後，在聊天中傳送 `/codex status` 或 `/codex models`
        以驗證原生 app-server 執行期。
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref | Runtime config | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | 省略 / provider/model `agentRuntime.id: "codex"` | 原生 Codex app-server 挂載 | Codex 登入或已排序的 `openai` auth profile |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "openclaw"` | 內含 Codex-auth 傳輸的 OpenClaw 嵌執行期 | 已選取的 `openai` OAuth profile |
    | legacy Codex GPT-5.5 ref | 由 doctor 修復 | 舊版路由已重寫為 `openai/gpt-5.5` | 已遷移的 OpenAI OAuth profile |
    | `codex-cli/gpt-5.5` | 由 doctor 修復 | 舊版 CLI 路由已重寫為 `openai/gpt-5.5` | Codex app-server auth |

    <Warning>
    針對新的訂閱支援 agent 設定，請優先使用 `openai/gpt-5.5`。較舊的
    舊版 Codex GPT refs 是舊版 OpenClaw 路由，並非原生 Codex 執行期
    路徑；當您想將其遷移至標準
    `openai/*` refs 時，請執行 `openclaw doctor --fix`。
    `gpt-5.3-codex-spark` 仍僅限於其 Codex 訂閱目錄
    宣告該模型的帳戶；該模型的直接 OpenAI API 金鑰
    與 Azure refs 仍保持隱藏。
    </Warning>

    <Note>
    舊版 Codex 模型前綴是由 doctor 修復的舊版設定。對於
    常見的訂閱加原生執行期設定，請使用 Codex auth 登入
    但將 model ref 保持為 `openai/gpt-5.5`。新設定應將 OpenAI
    agent auth order 置於 `auth.order.openai` 之下；doctor 會遷移較舊的
    舊版 Codex auth order 項目。
    </Note>

    ### 設定範例

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

    若要使用 API 金鑰備援，請將模型保持在 `openai/gpt-5.5` 上，並將
    auth order 置於 `openai` 之下。OpenClaw 會先嘗試訂閱，接著
    是 API 金鑰，同時維持在 Codex 挂載 上：

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
            "openai:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    Onboarding 不再從 `~/.codex` 匯入 OAuth 資料。請使用瀏覽器 OAuth (預設) 或上述裝置碼流程登入 — OpenClaw 會在其自身的 agent auth store 中管理產生的憑證。
    </Note>

    ### 檢查並復原 Codex OAuth 路由

    使用這些指令來查看您的預設
    agent 正在使用哪個模型、執行期與 auth 路由：

    ```bash
    openclaw models status
    openclaw models auth list --provider openai
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    針對特定 agent，請加入 `--agent <id>`：

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai
    ```

    如果較舊的設定仍有舊版 Codex GPT refs 或無明確執行期設定的過時 OpenAI 執行期
    session pin，請修復它：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai` 顯示無可用的 profile，請重新
    登入：

    ```bash
    openclaw models auth login --provider openai
    openclaw models status --probe --probe-provider openai
    ```

    當您想要在同一個 agent 中使用多個 Codex OAuth 登入，並稍後想透過 auth ordering 或 `/model ...@<profileId>` 控制它們時，請使用 `--profile-id`：

    ```bash
    openclaw models auth login --provider openai --profile-id openai:ritsuko
    openclaw models auth login --provider openai --profile-id openai:lain
    ```

    `openai/*` 是透過 Codex 的 OpenAI agent 輪次之模型路由。請執行
    `openclaw doctor --fix` 以在依賴 profile ordering 之前遷移較舊的舊版 OpenAI Codex 前綴 profile ids 與
    order 項目。

    ### 狀態指示器

    聊天指令 `/status` 會顯示目前作用中的模型執行期。
    內建的 Codex app-server 挂載 會顯示為 `Runtime: OpenAI Codex`，代表
    OpenAI agent 模型輪次。過時的 OpenAI 執行期 session pins 會被修復為 Codex，除非
    設定明確指定了 OpenClaw。

    ### Doctor 警告

    如果舊版 Codex 模型 refs 或過時的 OpenAI 執行期 pins 仍留在設定或
    session 狀態中，`openclaw doctor --fix` 會將其重寫為 `openai/*` 並搭配
    Codex 執行期，除非已明確設定 OpenClaw。

    ### Context window 上限

    OpenClaw 將模型元資料 與執行期 context 上限 視為分開的數值。

    透過 Codex OAuth 目錄的 `openai/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 預設執行期 `contextTokens` 上限：`272000`

    較小的預設上限在實務上具有更好的延遲與品質特性。請使用 `contextTokens` 覆寫它：

    ```json5
    {
      models: {
        providers: {
          openai: {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 來宣告原生模型元資料。使用 `contextTokens` 來限制執行期 context 預算。
    </Note>

    ### 目錄復原

    OpenClaw 使用上游 Codex 目錄元資料作為 `gpt-5.5`，當它
    存在時。如果實時 Codex 探索 在帳戶已通過驗證時
    省略了 `gpt-5.5` 項目，OpenClaw 會綜合該 OAuth 模型項目，讓
    cron、sub-agent 與已設定的 default-model 執行不會因
    `Unknown model` 而失敗。

  </Tab>
</Tabs>

## 原生 Codex 應用程式伺服器驗證

原生 Codex 應用程式伺服器配接器使用 `openai/*` 模型引用加上省略的執行時期組態或提供者/模型 `agentRuntime.id: "codex"`，但其身分驗證仍然是基於帳戶的。OpenClaw 會按以下順序選擇身分驗證：

1. 為代理程式排序的 OpenAI 身分驗證設定檔，最好位於
   `auth.order.openai` 之下。執行 `openclaw doctor --fix` 以遷移較舊的
   舊版 Codex 身分驗證設定檔 ID 和舊版 Codex 身分驗證順序。
2. 應用程式伺服器的現有帳戶，例如本機 Codex CLI ChatGPT 登入。
3. 僅限於本地 stdio 應用程式伺服器啟動，`CODEX_API_KEY`，然後是
   `OPENAI_API_KEY`，當應用程式伺服器回報沒有帳戶但仍需要
   OpenAI 身分驗證時。

這意味著本地的 ChatGPT/Codex 訂閱登入不會僅僅因為閘道程序也有用於直接 OpenAI 模型或嵌入的 `OPENAI_API_KEY` 而被取代。環境變數 API 金鑰後備僅是本地 stdio 無帳戶路徑；它不會被傳送到 WebSocket 應用程式伺服器連線。當選擇了訂閱式的 Codex 設定檔時，OpenClaw 也會將 `CODEX_API_KEY` 和 `OPENAI_API_KEY` 排除在產生的 stdio 應用程式伺服器子程序之外，並透過應用程式伺服器登入 RPC 傳送選定的認證。當該訂閱設定檔被 Codex 使用限制封鎖時，OpenClaw 可以輪替到下一個排序的 `openai:*` API 金鑰設定檔，而無需變更選定的模型或退出 Codex 配接器。一旦訂閱重設時間通過，訂閱設定檔便再次有資格使用。

## 影像生成

內建的 `openai` 外掛程式透過 `image_generate` 工具註冊影像生成。
它支援透過相同的 `openai/gpt-image-2` 模型引用進行 OpenAI API 金鑰影像生成和 Codex OAuth 影像生成。

| 功能               | OpenAI API 金鑰              | Codex OAuth                 |
| ------------------ | ---------------------------- | --------------------------- |
| 模型參照           | `openai/gpt-image-2`         | `openai/gpt-image-2`        |
| 驗證               | `OPENAI_API_KEY`             | OpenAI Codex OAuth 登入     |
| 傳輸               | OpenAI Images API            | Codex Responses 後端        |
| 每次請求最大影像數 | 4                            | 4                           |
| 編輯模式           | 已啟用（最多 5 張參考影像）  | 已啟用（最多 5 張參考影像） |
| 尺寸覆寫           | 支援，包括 2K/4K 尺寸        | 支援，包括 2K/4K 尺寸       |
| 長寬比 / 解析度    | 不會轉發至 OpenAI Images API | 在安全時會對應至支援的尺寸  |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>請參閱 [影像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

`gpt-image-2` 是 OpenAI 文字生成圖片和圖片編輯的預設選項。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作為明確的模型覆寫使用。使用 `openai/gpt-image-1.5` 以取得透明背景的 PNG/WebP 輸出；目前的 `gpt-image-2` API 會拒絕 `background: "transparent"`。

對於透明背景請求，代理程式應呼叫 `image_generate` 並搭配 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"`，以及 `background: "transparent"`；較舊的 `openai.background` 提供者選項仍被接受。OpenClaw 也透過將預設的 `openai/gpt-image-2` 透明請求重寫為 `gpt-image-1.5`，來保護公開的 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自訂的 OpenAI 相容端點會保留其設定的部署/模型名稱。

相同的設定也會公開給無頭 CLI 執行使用：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

當從輸入檔案開始時，請將相同的 `--output-format` 和 `--background` 旗標與 `openclaw infer image edit` 搭配使用。`--openai-background` 仍可作為 OpenAI 專用的別名使用。

對於 ChatGPT/Codex OAuth 安裝，請保留相同的 `openai/gpt-image-2` 參照。當設定 `openai` OAuth 設定檔時，OpenClaw 會解析該儲存的 OAuth 存取權杖，並透過 Codex Responses 後端傳送圖片請求。它不會先嘗試 `OPENAI_API_KEY` 或靜默地回退至該請求的 API 金鑰。當您改為需要直接的 OpenAI Images API 路由時，請使用 API 金鑰、自訂基底 URL 或 Azure 端點明確設定 `models.providers.openai`。如果該自訂圖片端點位於受信任的 LAN/私人位址上，請同時設定 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非存在此選用加入設定，否則 OpenClaw 將會阻止私人/內部 OpenAI 相容圖片端點。

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

隨附的 `openai` 外掛程式透過 `video_generate` 工具註冊影片生成功能。

| 功能     | 數值                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 預設模型 | `openai/sora-2`                                                            |
| 模式     | 文字轉視訊、圖像轉視訊、單一視訊編輯                                       |
| 參考輸入 | 1 張圖像或 1 個視訊                                                        |
| 尺寸覆寫 | 支援文字轉視訊和圖像轉視訊                                                 |
| 其他覆寫 | `aspectRatio`、`resolution`、`audio`、`watermark` 將被忽略，並顯示工具警告 |

OpenAI 影片轉影片請求會使用帶有影像 `input_reference` 的 `POST /v1/videos`。單一影片編輯會使用帶有上傳影片在 `video` 欄位中的 `POST /v1/videos/edits`。

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>請參閱 [Video Generation](/zh-Hant/tools/video-generation) 以了解共享工具參數、提供者選擇和容錯移轉行為。</Note>

## GPT-5 提示詞貢獻

OpenClaw 為 OpenClaw 組合的提示介面上執行的 GPT-5 系列模型，新增了共享的 GPT-5 提示貢獻。此貢獻依模型 ID 套用，因此 OpenClaw/提供者路由（例如舊版修復前參照（舊版 Codex GPT-5.5 參照）、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他相容的 GPT-5 參照）會收到相同的疊加層。舊版 GPT-4.x 模型則不會。

隨附的原生 Codex 鞍座不會透過 Codex app-server 開發者指令接收此 OpenClaw GPT-5 覆蓋層。原生 Codex 保留 Codex 擁有的基礎、模型和專案文件行為，而 OpenClaw 會對原生執行緒停用 Codex 的內建個性，以便代理程式工作區個性檔案保持權威性。OpenClaw 僅貢獻執行階段內容，例如管道交付、OpenClaw 動態工具、ACP 委派、工作區內容和 OpenClaw 技能。

GPT-5 貢獻會為個體持久性、執行安全性、工具紀律、輸出形狀、完成檢查以及對比符合 OpenClaw 組合提示的驗證，新增標記的行為合約。特定管道的回覆和無訊息行為保留在共用的 OpenClaw 系統提示和輸出交付原則中。友善的互動風格層是分開的，且可設定。

| 值                  | 效果                 |
| ------------------- | -------------------- |
| `"friendly"` (預設) | 啟用友善的互動風格層 |
| `"on"`              | `"friendly"` 的別名  |
| `"off"`             | 僅停用友善風格層     |

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

<Note>當未設定共享的 `agents.defaults.promptOverlays.gpt5.personality` 設定時，仍會讀取舊版 `plugins.entries.openai.config.personality` 作為相容性備援方案。</Note>

## 語音和語音

<AccordionGroup>
  <Accordion title="語音合成 (TTS)">
    內建的 `openai` 外掛程式會為 `messages.tts` 介面註冊語音合成功能。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 語音 | `messages.tts.providers.openai.speakerVoice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未設定) |
    | 指令 | `messages.tts.providers.openai.instructions` | (未設定，僅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 語音備忘錄為 `opus`，檔案為 `mp3` |
    | API 金鑰 | `messages.tts.providers.openai.apiKey` | 會回退至 `OPENAI_API_KEY` |
    | 基礎 URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | 額外主體 | `messages.tts.providers.openai.extraBody` / `extra_body` | (未設定) |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用語音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 會在 OpenClaw 產生的欄位之後，合併到 `/audio/speech` 請求 JSON 中，因此請將其用於需要額外金鑰的 OpenAI 相容端點，例如 `lang`。Prototype 金鑰會被忽略。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", speakerVoice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    設定 `OPENAI_TTS_BASE_URL` 可覆寫 TTS 基礎 URL，而不會影響聊天 API 端點。OpenAI TTS 仍透過 API 金鑰設定；若僅使用 OAuth 的即時對話，請使用 Realtime 語音路徑，而非代理模式 STT -> TTS 語音。
    </Note>

  </Accordion>

  <Accordion title="語音轉文字">
    內建的 `openai` 外掛程式透過 OpenClaw 的媒體理解轉錄介面註冊批次語音轉文字。

    - 預設模型：`gpt-4o-transcribe`
    - 端點：OpenAI REST `/v1/audio/transcriptions`
    - 輸入路徑：多部分音訊檔案上傳
    - 在任何使用 `tools.media.audio` 的輸入音訊轉錄情境下皆受 OpenClaw 支援，包括 Discord 語音頻道片段與頻道音訊附件

    若要針對輸入音訊轉錄強制使用 OpenAI：

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

    當共用音訊媒體設定或單次轉錄請求提供語言與提示提示時，這些資訊會轉發至 OpenAI。

  </Accordion>

  <Accordion title="即時轉錄">
    內建的 `openai` 外掛程式會為語音通話外掛程式註冊即時轉錄功能。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 語言 | `...openai.language` | (未設定) |
    | 提示 | `...openai.prompt` | (未設定) |
    | 靜音持續時間 | `...openai.silenceDurationMs` | `800` |
    | VAD 臨界值 | `...openai.vadThreshold` | `0.5` |
    | 驗證 | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai` OAuth | API 金鑰會直接連線；OAuth 會建立即時轉錄用戶端密鑰 |

    <Note>
    使用 WebSocket 連線至 `wss://api.openai.com/v1/realtime`，並採用 G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音訊。當僅設定 `openai` OAuth 時，Gateway 會在開啟 WebSocket 之前建立暫時性的即時轉錄用戶端密鑰。此串流提供者適用於語音通話的即時轉錄路徑；Discord 語音目前則是錄製短片段，並改用批次 `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="即時語音">
    內建的 `openai` 外掛程式會為 Voice Call 外掛程式註冊即時語音。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | 語音 | `...openai.voice` | `alloy` |
    | 溫度 (Azure 部署橋接器) | `...openai.temperature` | `0.8` |
    | VAD 閾值 | `...openai.vadThreshold` | `0.5` |
    | 靜音持續時間 | `...openai.silenceDurationMs` | `500` |
    | 前綴填充 | `...openai.prefixPaddingMs` | `300` |
    | 推理耗能 | `...openai.reasoningEffort` | (未設定) |
    | 驗證 | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai` OAuth | 瀏覽器 Talk 和非 Azure 後端橋接器可以使用 OpenAI OAuth |

    `gpt-realtime-2` 可用的內建即時語音：`alloy`、`ash`、
    `ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin`、`cedar`。
    OpenAI 建議使用 `marin` 和 `cedar` 以獲得最佳的即時品質。這是與上述文字轉語音不同的組合；請勿假設 TTS 語音（例如 `fable`、`nova` 或 `onyx`）對即時工作階段有效。

    <Note>
    後端 OpenAI 即時橋接器使用 GA Realtime WebSocket 工作階段格式，該格式不接受 `session.temperature`。Azure OpenAI 部署仍可透過 `azureEndpoint` 和 `azureDeployment` 使用，並保持與部署相容的工作階段格式。支援雙向工具呼叫和 G.711 u-law 音訊。
    </Note>

    <Note>
    即時語音是在建立工作階段時選取的。OpenAI 允許大多數工作階段欄位稍後變更，但在該工作階段中模型發出音訊後，就無法變更語音。OpenClaw 目前會將內建的即時語音 ID 以字串形式公開。
    </Note>

    <Note>
    Control UI Talk 使用 OpenAI 瀏覽器即時工作階段，搭配 Gateway 產生的暫時用戶端密鑰，以及直接針對 OpenAI Realtime API 的瀏覽器 WebRTC SDP 交換。當未設定直接的 OpenAI API 金鑰時，Gateway 可以使用選取的 `openai` OAuth 設定檔來產生該用戶端密鑰。Gateway 中繼和 Voice Call 後端即時 WebSocket 橋接器會針對原生 OpenAI 端點使用相同的 OAuth 後備機制。維護者即時驗證可透過 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 使用；OpenAI 端點會驗證後端 WebSocket 橋接器和瀏覽器 WebRTC SDP 交換，而不會記錄密鑰。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端點

內建的 `openai` 提供者可以透過覆寫基礎 URL，將 Azure OpenAI 資源做為圖像生成的目標。在圖像生成路徑上，OpenClaw 會偵測 `models.providers.openai.baseUrl` 上的 Azure 主機名稱，並自動切換至 Azure 的請求格式。

<Note>即時語音使用單獨的設定路徑 (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) 且不受 `models.providers.openai.baseUrl` 影響。請參閱 [語音與說話](#voice-and-speech) 下的 **Realtime voice** (即時語音) 項目以取得其 Azure 設定。</Note>

使用 Azure OpenAI 的時機：

- 您已經擁有 Azure OpenAI 訂閱、配額或企業協議
- 您需要 Azure 提供的區域資料駐留或合規性控制
- 您希望將流量保留在現有的 Azure 租用戶內

### 設定

若要透過內建的 `openai` 提供者進行 Azure 圖像生成，請將
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

OpenClaw 會為 Azure 圖像生成路由識別以下 Azure 主機後綴：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

針對已識別 Azure 主機上的圖像生成請求，OpenClaw 會：

- 傳送 `api-key` 標頭而非 `Authorization: Bearer`
- 使用部署範圍的路徑 (`/openai/deployments/{deployment}/...`)
- 將 `?api-version=...` 附加至每個請求
- 對 Azure 圖像生成呼叫使用 600 秒的預設請求逾時。
  每次呼叫的 `timeoutMs` 值仍會覆寫此預設值。

其他基礎 URL（公開 OpenAI、OpenAI 相容代理伺服器）則會維持標準的 OpenAI 圖像請求格式。

<Note>`openai` 提供者之圖像生成路徑的 Azure 路由需要 OpenClaw 2026.4.22 或更新版本。較早的版本會將任何自訂 `openai.baseUrl` 視為公開的 OpenAI 端點，對於 Azure 圖像部署將會失敗。</Note>

### API 版本

設定 `AZURE_OPENAI_API_VERSION` 以釘選特定的 Azure 預覽或 GA 版本
給 Azure 圖像生成路徑：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

若未設定變數，預設值為 `2024-12-01-preview`。

### 模型名稱即為部署名稱

Azure OpenAI 會將模型繫結至部署。對於透過內建 `openai` 提供者路由的 Azure 圖像生成請求，OpenClaw 中的 `model` 欄位必須是您在 Azure 入口網站中設定的 **Azure 部署名稱**，而非
公開的 OpenAI 模型 ID。

如果您建立一個名為 `gpt-image-2-prod` 且提供 `gpt-image-2` 的部署：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名稱規則也適用於透過內建 `openai` 提供者路由的影像生成呼叫。

### 區域可用性

Azure 影像生成目前僅在部分區域提供（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、`uaenorth`）。在建立部署前，請檢查 Microsoft 目前的區域清單，並確認您的區域提供該特定模型。

### 參數差異

Azure OpenAI 與公開 OpenAI 並非總是接受相同的影像參數。Azure 可能會拒絕公開 OpenAI 允許的選項（例如 `gpt-image-2` 上的某些 `background` 值），或僅在特定模型版本中公開這些選項。這些差異來自 Azure 和基礎模型，而非 OpenClaw。如果 Azure 請求因驗證錯誤而失敗，請在 Azure 入口網站中檢查您的特定部署和 API 版本所支援的參數集。

<Note>
Azure OpenAI 使用原生傳輸和相容行為，但不會接收 OpenClaw 的隱藏歸因標頭 — 請參閱 [Advanced configuration](#advanced-configuration) 下的 **Native vs OpenAI-compatible routes** 手風琴。

對於 Azure 上的聊天或 Responses 流量（影像生成之外），請使用入門流程或專用的 Azure 提供者設定 — 單獨使用 `openai.baseUrl` 不會採用 Azure API/auth 形式。存在一個獨立的 `azure-openai-responses/*` 提供者；請參閱下方的 Server-side compaction 手風琴。

</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="傳輸 (WebSocket vs SSE)">
    OpenClaw 使用 WebSocket 優先並備援 SSE (`"auto"`) 來處理 `openai/*`。

    在 `"auto"` 模式下，OpenClaw：
    - 在備援至 SSE 前重試一次早期的 WebSocket 失敗
    - 失敗後，將 WebSocket 標記為降級約 60 秒，並在冷卻期間使用 SSE
    - 為重試和重新連線附加穩定的 session 和 turn 身份標頭
    - 跨傳輸變體正規化使用計數器 (`input_tokens` / `prompt_tokens`)

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

    相關 OpenAI 文件：
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 為 `openai/*` 提供了一個共用的快速模式切換開關：

    - **聊天/UI：** `/fast status|on|off`
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
    Session 覆蓋設定優先於組態設定。在 Sessions UI 中清除 session 覆蓋設定會將 session 返回至設定的預設值。
    </Note>

  </Accordion>

  <Accordion title="優先處理 (service_tier)">
    OpenAI 的 API 透過 `service_tier` 公開優先處理功能。請在 OpenClaw 中為每個模型進行設定：

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

    支援的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 僅會轉發至原生 OpenAI 端點 (`api.openai.com`) 和原生 Codex 端點 (`chatgpt.com/backend-api`)。如果您透過代理路由任一供應商，OpenClaw 將不會處理 `service_tier`。
    </Warning>

  </Accordion>

  <Accordion title="伺服器端壓縮 (Responses API)">
    針對直接使用 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenAI 插件的 OpenClaw 串流包裝器會自動啟用伺服器端壓縮：

    - 強制啟用 `store: true`（除非模型相容性設定設為 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 預設 `compact_threshold`：`contextWindow` 的 70%（或在不可用時設為 `80000`）

    這適用於內建的 OpenClaw 執行路徑，以及嵌入式執行所使用的 OpenAI 提供者掛鉤。原生的 Codex 應用伺服器透過 Codex 管理自己的上下文，並由 OpenAI 的預設代理路由或提供者/模型執行時期原則進行配置。

    <Tabs>
      <Tab title="明確啟用">
        適用於相容的端點，例如 Azure OpenAI Responses：

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
      <Tab title="自訂閾值">
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
      <Tab title="停用">
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
    `responsesServerCompaction` 僅控制 `context_management` 的注入。直接 OpenAI Responses 模型仍會強制啟用 `store: true`，除非相容性設定設為 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="嚴格代理 GPT 模式">
    針對在 `openai/*` 上執行的 GPT-5 系列運作，OpenClaw 可以使用更嚴格的嵌入式執行合約：

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic` 時，OpenClaw 會：
    - 當有工具動作可用時，不再將僅計劃的回合視為成功的進度
    - 使用立即行動引導重試該回合
    - 針對實質工作自動啟用 `update_plan`
    - 如果模型持續規劃而未行動，則顯示明確的封鎖狀態

    <Note>
    僅限於 OpenAI 和 Codex 的 GPT-5 系列運作。其他提供者和舊版模型系列會保持預設行為。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 會將直接連線的 OpenAI、Codex 和 Azure OpenAI 端點，與一般的 OpenAI 相容 `/v1` 代理伺服器區分對待：

    **原生路由** (`openai/*`, Azure OpenAI):
    - 僅針對支援 OpenAI `none` 方案的模型保留 `reasoning: { effort: "none" }`
    - 針對拒絕 `reasoning.effort: "none"` 的模型或代理伺服器，省略停用的推理功能
    - 預設將工具架構設為嚴格模式
    - 僅在驗證過的原生主機上附加隱藏的歸因標頭
    - 保留 OpenAI 專用的請求塑形 (`service_tier`、`store`、reasoning-compat、prompt-cache hints)

    **代理伺服器/相容路由：**
    - 使用較寬鬆的相容行為
    - 從非原生的 `openai-completions` 載荷中移除 Completions `store`
    - 接受 OpenAI 相容 Completions 代理伺服器的高階 `params.extra_body`/`params.extraBody` 透傳 JSON
    - 接受 OpenAI 相容 Completions 代理伺服器（如 vLLM）的 `params.chat_template_kwargs`
    - 不強制執行嚴格的工具架構或原生專用標頭

    Azure OpenAI 使用原生傳輸和相容行為，但不會收到隱藏的歸因標頭。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照與容錯移轉行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用的影像工具參數與供應商選擇。
  </Card>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與供應商選擇。
  </Card>
  <Card title="OAuth 和驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重複使用規則。
  </Card>
</CardGroup>
