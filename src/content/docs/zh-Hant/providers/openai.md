---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI 提供用於 GPT 模型的開發者 API，且透過 OpenAI 的 Codex 客戶端，Codex 也可作為 ChatGPT 方案的程式設計代理程式使用。OpenClaw 將這些介面分開，以便設定保持可預測。

OpenClaw 支援三種 OpenAI 系列路由。模型前綴會選擇提供者/驗證路由；獨立的執行時設定則會選擇由誰執行嵌入式代理程式迴圈：

- **API 金鑰** — 直接存取 OpenAI Platform 並依使用量計費 (`openai/*` 模型)
- **透過 PI 的 Codex 訂閱** — 使用訂閱存取權登入 ChatGPT/Codex (`openai-codex/*` 模型)
- **Codex 應用程式伺服器綁定** — 原生 Codex 應用程式伺服器執行 (`openai/*` 模型加上 `agents.defaults.agentRuntime.id: "codex"`)

OpenAI 明確支援在外部工具和工作流程（如 OpenClaw）中使用訂閱 OAuth。

提供者、模型、執行時和通道是不同的層級。如果這些標籤混淆在一起，請在變更設定前先閱讀 [代理程式執行時](/zh-Hant/concepts/agent-runtimes)。

## 快速選擇

| 目標                                        | 使用                                             | 備註                                                                   |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| 直接 API 金鑰計費                           | `openai/gpt-5.5`                                 | 設定 `OPENAI_API_KEY` 或執行 OpenAI API 金鑰入門。                     |
| 具有 ChatGPT/Codex 訂閱驗證的 GPT-5.5       | `openai-codex/gpt-5.5`                           | 用於 Codex OAuth 的預設 PI 路由。訂閱設定的最佳首選。                  |
| 具有原生 Codex 應用程式伺服器行為的 GPT-5.5 | `openai/gpt-5.5` 加上 `agentRuntime.id: "codex"` | 強制該模型參考使用 Codex 應用程式伺服器綁定。                          |
| 影像生成或編輯                              | `openai/gpt-image-2`                             | 適用於 `OPENAI_API_KEY` 或 OpenAI Codex OAuth。                        |
| 透明背景影像                                | `openai/gpt-image-1.5`                           | 使用 `outputFormat=png` 或 `webp` 和 `openai.background=transparent`。 |

## 命名對應

這些名稱相似但不可互換：

| 您看到的名稱                       | 層級           | 含義                                                                                |
| ---------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `openai`                           | 提供者前綴     | 直接 OpenAI Platform API 路由。                                                     |
| `openai-codex`                     | 提供者前綴     | 透過一般的 OpenClaw PI 執行器進行 OpenAI Codex OAuth/訂閱路由。                     |
| `codex` 外掛程式                   | 外掛程式       | 內建的 OpenClaw 外掛程式，提供原生 Codex 應用程式伺服器執行時和 `/codex` 聊天控制。 |
| `agentRuntime.id: codex`           | 代理程式執行時 | 針對嵌入回合強制使用原生 Codex 應用程式伺服器工具。                                 |
| `/codex ...`                       | 聊天指令集     | 從對話中綁定/控制 Codex 應用程式伺服器執行緒。                                      |
| `runtime: "acp", agentId: "codex"` | ACP 會話路由   | 透過 ACP/acpx 執行 Codex 的明確後援路徑。                                           |

這表示組態可以刻意同時包含 `openai-codex/*` 和
`codex` 外掛程式。當您想要透過 PI 進行 Codex OAuth，同時也想要
原生 `/codex` 聊天控制可用時，這是有效的。`openclaw doctor` 會針對該
組合發出警告，以便您確認這是有意的；它不會重寫組態。

<Note>GPT-5.5 可透過直接的 OpenAI Platform API 金鑰存取和 訂閱/OAuth 路由取得。請使用 `openai/gpt-5.5` 進行直接 `OPENAI_API_KEY` 流量、使用 `openai-codex/gpt-5.5` 透過 PI 進行 Codex OAuth，或 使用含有 `agentRuntime.id: "codex"` 的 `openai/gpt-5.5` 來啟用原生 Codex 應用程式伺服器工具。</Note>

<Note>啟用 OpenAI 外掛程式，或選擇 `openai-codex/*` 模型，並不會 啟用內建的 Codex 應用程式伺服器外掛程式。OpenClaw 僅在 您使用 `agentRuntime.id: "codex"` 明確選擇原生 Codex 工具或 使用舊版 `codex/*` 模型參照時，才會啟用該外掛程式。 如果已啟用內建的 `codex` 外掛程式，但 `openai-codex/*` 仍透過 PI 解析， `openclaw doctor` 會發出警告且保持路由不變。</Note>

## OpenClaw 功能覆蓋範圍

| OpenAI 功能              | OpenClaw 介面                                              | 狀態                               |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------- |
| 聊天 / 回應              | `openai/<model>` 模型提供者                                | 是                                 |
| Codex 訂閱模型           | 含有 `openai-codex` OAuth 的 `openai-codex/<model>`        | 是                                 |
| Codex 應用程式伺服器工具 | `openai/<model>` 搭配 `agentRuntime.id: codex`             | 是                                 |
| 伺服器端網路搜尋         | 原生 OpenAI Responses 工具                                 | 是，當啟用網路搜尋且未鎖定供應商時 |
| 圖片                     | `image_generate`                                           | 是                                 |
| 影片                     | `video_generate`                                           | 是                                 |
| 文字轉語音               | `messages.tts.provider: "openai"` / `tts`                  | 是                                 |
| 批次語音轉文字           | `tools.media.audio` / 媒體理解                             | 是                                 |
| 串流語音轉文字           | Voice Call `streaming.provider: "openai"`                  | 是                                 |
| 即時語音                 | Voice Call `realtime.provider: "openai"` / Control UI Talk | 是                                 |
| 嵌入                     | 記憶嵌入供應商                                             | 是                                 |

## 記憶嵌入

OpenClaw 可以使用 OpenAI 或相容 OpenAI 的嵌入端點來進行
`memory_search` 索引與查詢嵌入：

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

對於需要非對稱嵌入標籤的相容 OpenAI 端點，請在 `memorySearch` 下設定
`queryInputType` 和 `documentInputType`。OpenClaw 會將這些作為供應商專屬的 `input_type` 請求欄位轉發：查詢嵌入使用
`queryInputType`；已索引的記憶區塊和批次索引則使用
`documentInputType`。請參閱 [Memory configuration reference](/zh-Hant/reference/memory-config#provider-specific-config) 以取得完整範例。

## 開始使用

選擇您偏好的驗證方法，並依照設定步驟進行。

<Tabs>
  <Tab title="API 金鑰 (OpenAI Platform)">
    **最適用於：** 直接 API 存取和依用量計費。

    <Steps>
      <Step title="取得您的 API 金鑰">
        從 [OpenAI Platform 儀表板](https://platform.openai.com/api-keys) 建立或複製 API 金鑰。
      </Step>
      <Step title="執行入門設定">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或者直接傳入金鑰：

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

    | 模型參考              | 執行時期設定             | 路由                       | 驗證             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`       | 省略 / `agentRuntime.id: "pi"`    | Direct OpenAI Platform API  | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-mini`  | 省略 / `agentRuntime.id: "pi"`    | Direct OpenAI Platform API  | `OPENAI_API_KEY` |
    | `openai/gpt-5.5`       | `agentRuntime.id: "codex"`           | Codex app-server harness    | Codex app-server |

    <Note>
    `openai/*` 是直接 OpenAI API 金鑰路由，除非您明確強制使用
    Codex app-server harness。使用 `openai-codex/*` 透過
    預設 PI runner 進行 Codex OAuth，或是使用 `openai/gpt-5.5` 搭配
    `agentRuntime.id: "codex"` 進行原生 Codex app-server 執行。
    </Note>

    ### 設定範例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    <Warning>
    OpenClaw **不** 會公開 `openai/gpt-5.3-codex-spark`。即時 OpenAI API 請求會拒絕該模型，且目前的 Codex 型錄也不會公開它。
    </Warning>

  </Tab>

  <Tab title="Codex 訂閱">
    **最適合：** 使用您的 ChatGPT/Codex 訂閱，而非獨立的 API 金鑰。Codex 雲端需要 ChatGPT 登入。

    <Steps>
      <Step title="執行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接執行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        針對無頭或回調不友善的環境，加入 `--device-code` 以使用 ChatGPT 裝置碼流程登入，而非 localhost 瀏覽器回調：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="設定預設模型">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.5
        ```
      </Step>
      <Step title="驗證模型可用">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | 模型參照 | 執行時設定 | 路由 | 驗證 |
    |-----------|----------------|-------|------|
    | `openai-codex/gpt-5.5` | 省略 / `runtime: "pi"` | 經由 PI 的 ChatGPT/Codex OAuth | Codex 登入 |
    | `openai-codex/gpt-5.5` | `runtime: "auto"` | 除非外掛程式明確聲明 `openai-codex`，否則仍為 PI | Codex 登入 |
    | `openai/gpt-5.5` | `agentRuntime.id: "codex"` | Codex 應用程式伺服器駁具 | Codex 應用程式伺服器驗證 |

    <Note>
    請繼續使用 `openai-codex` 提供者 ID 進行驗證/設定檔指令。
    `openai-codex/*` 模型前綴也是 Codex OAuth 的明確 PI 路由。
    它不會選取或自動啟用內建的 Codex 應用程式伺服器駁具。
    </Note>

    ### 設定範例

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
    }
    ```

    <Note>
    入門流程不再從 `~/.codex` 匯入 OAuth 資料。請使用瀏覽器 OAuth (預設) 或上述裝置碼流程登入 — OpenClaw 會在其自己的代理程式驗證存放區中管理產生的憑證。
    </Note>

    ### 狀態指示器

    Chat `/status` 顯示目前工作階段使用的是哪個模型執行時。
    預設 PI 駁具顯示為 `Runtime: OpenClaw Pi Default`。當選取了
    內建的 Codex 應用程式伺服器駁具時，`/status` 會顯示
    `Runtime: OpenAI Codex`。現有工作階段會保留其記錄的駁具 ID，因此若您希望 `/status`
    反映新的 PI/Codex 選擇，請在變更 `agentRuntime` 後使用
    `/new` 或 `/reset`。

    ### Doctor 警告

    若在選取此分頁的 `openai-codex/*`
    路由時啟用了內建的 `codex` 外掛程式，
    `openclaw doctor` 將警告模型仍透過 PI 解析。
    當這是預期的訂閱驗證路由時，請保持設定不變。僅在您需要原生 Codex
    應用程式伺服器執行時，切換至 `openai/<model>` 加上
    `agentRuntime.id: "codex"`。

    ### 內容視窗上限

    OpenClaw 將模型中繼資料與執行時內容上限視為獨立值。

    針對透過 Codex OAuth 的 `openai-codex/gpt-5.5`：

    - 原生 `contextWindow`：`1000000`
    - 預設執行時 `contextTokens` 上限：`272000`

    較小的預設上限在實務上具有更好的延遲與品質特性。使用 `contextTokens` 覆寫它：

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
    使用 `contextWindow` 宣告原生模型中繼資料。使用 `contextTokens` 限制執行時內容預算。
    </Note>

    ### 目錄恢復

    當存在時，OpenClaw 對 `gpt-5.5` 使用上游 Codex 目錄中繼資料。
    若即時 Codex 探索在帳戶通過驗證時省略了 `openai-codex/gpt-5.5` 列，
    OpenClaw 會合成該 OAuth 模型列，以免 cron、子代理程式和已設定的預設模型執行因
    `Unknown model` 而失敗。

  </Tab>
</Tabs>

## 圖像生成

內建的 `openai` 外掛程式透過 `image_generate` 工具註冊圖像生成功能。
它支援透過相同的 `openai/gpt-image-2` 模型參照，進行 OpenAI API 金鑰圖像生成和 Codex OAuth 圖像生成。

| 功能                 | OpenAI API 金鑰            | Codex OAuth                |
| -------------------- | -------------------------- | -------------------------- |
| 模型參照             | `openai/gpt-image-2`       | `openai/gpt-image-2`       |
| 驗證                 | `OPENAI_API_KEY`           | OpenAI Codex OAuth 登入    |
| 傳輸                 | OpenAI Images API          | Codex Responses 後端       |
| 每次請求的最大圖像數 | 4                          | 4                          |
| 編輯模式             | 已啟用 (最多 5 張參考圖像) | 已啟用 (最多 5 張參考圖像) |
| 尺寸覆寫             | 支援，包括 2K/4K 尺寸      | 支援，包括 2K/4K 尺寸      |
| 長寬比 / 解析度      | 未轉送至 OpenAI Images API | 安全時對應至支援的尺寸     |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>請參閱 [圖像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

`gpt-image-2` 是 OpenAI 文字轉圖像生成和圖像編輯的預設值。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作為明確的模型覆寫使用。請使用 `openai/gpt-image-1.5` 取得透明背景的 PNG/WebP 輸出；目前的 `gpt-image-2` API 會拒絕 `background: "transparent"`。

對於透明背景請求，代理程式應使用 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"` 以及 `background: "transparent"` 呼叫 `image_generate`；較舊的 `openai.background` 提供者選項仍被接受。OpenClaw 也透過將預設的 `openai/gpt-image-2` 透明請求重寫為 `gpt-image-1.5`，來保護公用 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自訂的 OpenAI 相容端點會保留其設定的部署/模型名稱。

無介面 CLI 執行也會公開相同的設定：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

從輸入檔案啟動時，請搭配 `openclaw infer image edit` 使用相同的 `--output-format` 和 `--background` 標誌。
`--openai-background` 仍可作為 OpenAI 專用的別名使用。

對於 Codex OAuth 安裝，請保留相同的 `openai/gpt-image-2` 參照。當設定
`openai-codex` OAuth 設定檔時，OpenClaw 會解析該儲存的 OAuth
存取權杖，並透過 Codex Responses 後端傳送圖片請求。它不會
先嘗試 `OPENAI_API_KEY` 或靜默回退到該請求的 API 金鑰。
當您想要改用直接的 OpenAI Images API 路由時，請使用 API 金鑰、
自訂基礎 URL 或 Azure 端點明確設定 `models.providers.openai`。
如果該自訂圖片端點位於受信任的 LAN/私人位址上，請同時設定
`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非有此選擇加入設定，
否則 OpenClaw 會保持封鎖私人/內部 OpenAI 相容的圖片端點。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

產生透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

編輯：

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## 影片生成

內建的 `openai` 外掛程式透過 `video_generate` 工具註冊影片生成功能。

| 功能     | 數值                                                                     |
| -------- | ------------------------------------------------------------------------ |
| 預設模型 | `openai/sora-2`                                                          |
| 模式     | 文字轉影片、圖片轉影片、單一影片編輯                                     |
| 參考輸入 | 1 張圖片或 1 部影片                                                      |
| 尺寸覆寫 | 支援                                                                     |
| 其他覆寫 | `aspectRatio`、`resolution`、`audio`、`watermark` 會被忽略並顯示工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

## GPT-5 提示詞貢獻

OpenClaw 會為跨提供者的 GPT-5 系列執行新增一個共用的 GPT-5 提示詞貢獻。此貢獻依模型 ID 套用，因此 `openai-codex/gpt-5.5`、`openai/gpt-5.5`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 和其他相容的 GPT-5 參照會收到相同的疊加層。較舊的 GPT-4.x 模型則不會。

隨附的原生 Codex 套件透過 Codex 應用程式伺服器開發者指示，使用相同的 GPT-5 行為與心跳覆蓋層，因此透過 `agentRuntime.id: "codex"` 強制執行的 `openai/gpt-5.x` 會話，即使 Codex 擁有其餘的套件提示，仍能保持相同的貫徹執行與主動心跳指導。

GPT-5 貢獻為人格持久性、執行安全性、工具紀律、輸出形狀、完成檢查和驗證新增了標記的行為合約。特定頻道的回覆與無訊息行為保留在共用的 OpenClaw 系統提示與外寄傳遞原則中。GPT-5 指導對於匹配的模型始終啟用。友善的互動樣式層則是分開且可設定的。

| 值                   | 效果                 |
| -------------------- | -------------------- |
| `"friendly"`（預設） | 啟用友善的互動樣式層 |
| `"on"`               | `"friendly"` 的別名  |
| `"off"`              | 僅停用友善樣式層     |

<Tabs>
  <Tab title="設定">
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

<Note>當未設定共用的 `agents.defaults.promptOverlays.gpt5.personality` 設定時，舊版 `plugins.entries.openai.config.personality` 仍會作為相容性後援來讀取。</Note>

## 語音與語音

<AccordionGroup>
  <Accordion title="語音合成 (TTS)">
    內建的 `openai` 外掛程式會為 `messages.tts` 介面註冊語音合成功能。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 語音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | (未設定) |
    | 指令 | `messages.tts.providers.openai.instructions` | (未設定，僅限 `gpt-4o-mini-tts`) |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 語音備忘錄為 `opus`，檔案為 `mp3` |
    | API 金鑰 | `messages.tts.providers.openai.apiKey` | 回退至 `OPENAI_API_KEY` |
    | 基礎 URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用語音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

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
    設定 `OPENAI_TTS_BASE_URL` 以覆寫 TTS 基礎 URL，而不影響聊天 API 端點。
    </Note>

  </Accordion>

  <Accordion title="語音轉文字">
    內建的 `openai` 外掛程式透過 OpenClaw 的媒體理解轉錄介面註冊批次語音轉文字。

    - 預設模型：`gpt-4o-transcribe`
    - 端點：OpenAI REST `/v1/audio/transcriptions`
    - 輸入路徑：多部分音訊檔案上傳
    - 只要輸入音訊轉錄使用 `tools.media.audio`，OpenClaw 皆支援，包括 Discord 語音頻道片段和頻道音訊附件

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

    當共同音訊媒體設定或單次轉錄要求提供語言和提示時，這些提示會轉發給 OpenAI。

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
    | API 金鑰 | `...openai.apiKey` | 會回退至 `OPENAI_API_KEY` |

    <Note>
    使用 WebSocket 連線到 `wss://api.openai.com/v1/realtime`，音訊格式為 G.711 u-law (`g711_ulaw` / `audio/pcmu`)。此串流提供者用於語音通話的即時轉錄路徑；Discord 語音目前會錄製短片段，並改用批次 `tools.media.audio` 轉錄路徑。
    </Note>

  </Accordion>

  <Accordion title="即時語音">
    內建的 `openai` 外掛程式會為 Voice Call 外掛程式註冊即時語音功能。

    | 設定 | 設定路徑 | 預設值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-1.5` |
    | 語音 | `...openai.voice` | `alloy` |
    | 溫度 | `...openai.temperature` | `0.8` |
    | VAD 臨界值 | `...openai.vadThreshold` | `0.5` |
    | 靜音持續時間 | `...openai.silenceDurationMs` | `500` |
    | API 金鑰 | `...openai.apiKey` | 退回至 `OPENAI_API_KEY` |

    <Note>
    支援透過 `azureEndpoint` 和 `azureDeployment` 設定鍵使用 Azure OpenAI 進行後端即時橋接。支援雙向工具呼叫。使用 G.711 μ-law 音訊格式。
    </Note>

    <Note>
    Control UI Talk 使用 OpenAI 瀏覽器即時工作階段，搭配 Gateway 產生的
    暫時用戶端密鑰，以及針對 OpenAI Realtime API 的直接瀏覽器 WebRTC SDP 交換。
    維護者即時驗證功能可透過 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 使用；
    OpenAI 端會在 Node 中產生用戶端密鑰，使用模擬麥克風媒體產生瀏覽器 SDP 提議，
    將其發佈至 OpenAI，並套用 SDP 回應而不記錄秘密。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端點

內建的 `openai` 提供者可以透過覆寫基礎 URL 來指定 Azure OpenAI 資源以進行圖像
生成。在圖像生成路徑上，OpenClaw
會偵測 `models.providers.openai.baseUrl` 上的 Azure 主機名稱，並自動切換至
Azure 的要求形狀。

<Note>即時語音使用獨立的設定路徑 (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) 且不受 `models.providers.openai.baseUrl` 影響。請參閱 [語音與語音](#voice-and-speech) 下的 **即時 語音** 手風琴元件以了解其 Azure 設定。</Note>

在以下情況使用 Azure OpenAI：

- 您已經擁有 Azure OpenAI 訂閱、配額或企業協議
- 您需要 Azure 提供的區域資料駐留或合規性控制
- 您希望將流量保留在現有的 Azure 租用戶內

### 設定

若要透過內建的 `openai` 提供者進行 Azure 影像生成，請將 `models.providers.openai.baseUrl` 指向您的 Azure 資源，並將 `apiKey` 設定為 Azure OpenAI 金鑰（而非 OpenAI Platform 金鑰）：

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

OpenClaw 能識別 Azure 影像生成路徑的下列 Azure 主機後綴：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

針對向已識別 Azure 主機發出的影像生成請求，OpenClaw：

- 發送 `api-key` 標頭，而非 `Authorization: Bearer`
- 使用部署範圍的路徑 (`/openai/deployments/{deployment}/...`)
- 將 `?api-version=...` 附加至每個請求
- 對 Azure 影像生成呼叫使用 600 秒的預設請求逾時時間。各次呼叫的 `timeoutMs` 值仍會覆寫此預設值。

其他基底 URL（公開 OpenAI、OpenAI 相容代理伺服器）則保持標準的 OpenAI 影像請求結構。

<Note>`openai` 提供者影像生成路徑的 Azure 路由需要 OpenClaw 2026.4.22 或更新版本。較早版本會將任何自訂 `openai.baseUrl` 視為公開 OpenAI 端點，並會對 Azure 影像部署要求失敗。</Note>

### API 版本

設定 `AZURE_OPENAI_API_VERSION` 以指定特定的 Azure 預覽版或正式版 (GA) 版本用於 Azure 影像生成路徑：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

未設定此變數時，預設值為 `2024-12-01-preview`。

### 模型名稱即為部署名稱

Azure OpenAI 會將模型繫結至部署。對於透過內建 `openai` 提供者路由的 Azure 影像生成請求，OpenClaw 中的 `model` 欄位必須是您在 Azure 入口網站中設定的 **Azure 部署名稱**，而非公開 OpenAI 模型 ID。

如果您建立一個名為 `gpt-image-2-prod` 且提供 `gpt-image-2` 的部署：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名稱規則也適用於透過內建 `openai` 提供者路由的影像生成呼叫。

### 區域可用性

Azure 影像生成功能目前僅在部分區域提供（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、`uaenorth`）。在建立部署之前，請查看 Microsoft 的目前區域清單，並確認您的區域提供特定的模型。

### 參數差異

Azure OpenAI 和公開 OpenAI 並不總是接受相同的影像參數。
Azure 可能會拒絕公開 OpenAI 允許的選項（例如 `gpt-image-2` 上的特定 `background` 值），或僅在特定模型版本上提供這些選項。這些差異來自 Azure 和基礎模型，而非
OpenClaw。如果 Azure 請求因驗證錯誤而失敗，請在
Azure 入口網站中檢查您的特定部署和 API 版本支援的參數集。

<Note>
Azure OpenAI 使用原生傳輸和相容性行為，但不會接收
OpenClaw 的隱藏歸因標頭 — 請參閱 [進階設定](#advanced-configuration) 下的 **原生與 OpenAI 相容路線** 手風琴。

對於 Azure 上的聊天或 Responses 流量（超出影像生成範圍），請使用
入門流程或專用的 Azure 提供者設定 — 單獨使用 `openai.baseUrl`
並不會採用 Azure API/auth 形狀。存在一個獨立的
`azure-openai-responses/*` 提供者；請參閱
下方的伺服器端壓縮手風琴。

</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="傳輸方式 (WebSocket vs SSE)">
    OpenClaw 優先使用 WebSocket 並在需要時回退至 SSE (`"auto"`)，這適用於 `openai/*` 和 `openai-codex/*`。

    在 `"auto"` 模式下，OpenClaw:
    - 在回退至 SSE 之前重試一次早期的 WebSocket 失敗
    - 失敗後，將 WebSocket 標記為降級約 60 秒，並在冷卻期間使用 SSE
    - 附加穩定的會話和輪次標識標頭用於重試和重新連接
    - 在不同的傳輸變體之間正規化使用計數器 (`input_tokens` / `prompt_tokens`)

    | 數值 | 行為 |
    |-------|----------|
    | `"auto"` (預設) | 優先使用 WebSocket，回退至 SSE |
    | `"sse"` | 強制僅使用 SSE |
    | `"websocket"` | 強制僅使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
            "openai-codex/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相關的 OpenAI 文件:
    - [使用 WebSocket 的 Realtime API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [串流 API 回應 (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket 預熱">
    OpenClaw 預設為 `openai/*` 和 `openai-codex/*` 啟用 WebSocket 預熱，以減少第一輪的延遲。

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="快速模式">
    OpenClaw 為 `openai/*` 和 `openai-codex/*` 提供了一個共用的快速模式切換開關:

    - **聊天/UI:** `/fast status|on|off`
    - **設定:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    啟用後，OpenClaw 會將快速模式對應到 OpenAI 的優先處理 (`service_tier = "priority"`)。現有的 `service_tier` 值會被保留，且快速模式不會重寫 `reasoning` 或 `text.verbosity`。

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
    會話覆蓋設定優先於設定檔。在 Sessions UI 中清除會話覆蓋會讓該會話恢復為設定的預設值。
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

    支援的數值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 僅會轉送至原生 OpenAI 端點 (`api.openai.com`) 與原生 Codex 端點 (`chatgpt.com/backend-api`)。如果您透過 Proxy 路由至任一提供者，OpenClaw 將保持 `service_tier` 不變。
    </Warning>

  </Accordion>

  <Accordion title="伺服器端壓縮 (Responses API)">
    對於直接的 OpenAI Responses 模型 (`api.openai.com` 上的 `openai/*`)，OpenAI 外掛的 Pi-harness 串流包裝器會自動啟用伺服器端壓縮：

    - 強制使用 `store: true` (除非模型相容性設定了 `supportsStore: false`)
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 預設 `compact_threshold`：`contextWindow` 的 70% (或當無法使用時為 `80000`)

    這適用於內建的 Pi harness 路徑，以及嵌入式執行所使用的 OpenAI 提供者掛鉤。原生的 Codex 應用程式伺服器 harness 會透過 Codex 管理自己的上下文，並單獨使用 `agents.defaults.agentRuntime.id` 進行設定。

    <Tabs>
      <Tab title="明確啟用">
        對於相容的端點很有用，例如 Azure OpenAI Responses：

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
    `responsesServerCompaction` 僅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍會強制使用 `store: true`，除非相容性設定了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    針對在 `openai/*` 上執行的 GPT-5 系列，OpenClaw 可以使用更嚴格的嵌入式執行合約：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic`，OpenClaw：
    - 當有工具動作可用時，不再將僅計劃的回合視為成功的進度
    - 使用立即行動引導重試該回合
    - 針對重大工作自動啟用 `update_plan`
    - 如果模型持續計劃而不採取行動，則會顯示明確的封鎖狀態

    <Note>
    僅限於 OpenAI 和 Codex 的 GPT-5 系列執行。其他提供者和舊版模型系列保持預設行為。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 將直接連接的 OpenAI、Codex 和 Azure OpenAI 端點與通用 OpenAI 相容 `/v1` 代理伺服器區分對待：

    **原生路線** (`openai/*`, Azure OpenAI):
    - 僅對支援 OpenAI `none` 努力的模型保留 `reasoning: { effort: "none" }`
    - 省略拒絕 `reasoning.effort: "none"` 的模型或代理的停用推理
    - 預設工具架構為嚴格模式
    - 僅在經過驗證的原生主機上附加隱藏的歸因標頭
    - 保留 OpenAI 專用的請求塑形 (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **代理/相容路線：**
    - 使用較寬鬆的相容行為
    - 從非原生 `openai-completions` 載荷中移除 Completions `store`
    - 接受用於 OpenAI 相容 Completions 代理的高階 `params.extra_body`/`params.extraBody` 直通 JSON
    - 接受來自 vLLM 等 OpenAI 相容 Completions 代理的 `params.chat_template_kwargs`
    - 不強制執行嚴格的工具架構或僅限原生的標頭

    Azure OpenAI 使用原生傳輸和相容行為，但不會接收隱藏的歸因標頭。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="圖片生成" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數和提供者選擇。
  </Card>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數和提供者選擇。
  </Card>
  <Card title="OAuth 和驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重複使用規則。
  </Card>
</CardGroup>
