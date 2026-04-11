---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
title: "OpenAI"
---

# OpenAI

OpenAI 為 GPT 模型提供開發者 API。Codex 支援透過 **ChatGPT 登入** 進行訂閱存取，或透過 **API 金鑰** 登入進行按用量計費的存取。Codex cloud 需要使用 ChatGPT 登入。
OpenAI 明確支援在像 OpenClaw 這樣的外部工具/工作流程中使用訂閱 OAuth。

## 預設互動風格

OpenClaw 可以針對 `openai/*` 和
`openai-codex/*` 執行新增一個小型 OpenAI 專用的提示覆蓋層。預設情況下，該覆蓋層會讓助理保持熱情、協作、簡潔、直接，並在不取代基礎 OpenClaw 系統提示的前提下，表現得更具情感表達力。友好的覆蓋層也允許在自然合適的情況下偶爾使用表情符號，同時保持整體輸出的簡潔。

設定鍵：

`plugins.entries.openai.config.personality`

允許值：

- `"friendly"`：預設值；啟用 OpenAI 專用的覆蓋層。
- `"on"`：`"friendly"` 的別名。
- `"off"`：停用覆蓋層並僅使用基礎 OpenClaw 提示詞。

範圍：

- 適用於 `openai/*` 模型。
- 適用於 `openai-codex/*` 模型。
- 不會影響其他提供者。

此行為預設為開啟。如果您希望此設定在未來本地配置變動中保留，請明確保留 `"friendly"`：

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "friendly",
        },
      },
    },
  },
}
```

### 停用 OpenAI 提示詞覆蓋層

如果您想要未經修改的基礎 OpenClaw 提示詞，請將覆蓋層設為 `"off"`：

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "off",
        },
      },
    },
  },
}
```

您也可以直接使用配置 CLI 進行設定：

```bash
openclaw config set plugins.entries.openai.config.personality off
```

OpenClaw 在執行時會不區分大小寫地標準化此設定，因此像 `"Off"` 這樣的值仍然會停用友善的覆蓋層。

## 選項 A：OpenAI API 金鑰 (OpenAI Platform)

**最適合用於：** 直接 API 存取和依使用量計費。
從 OpenAI 儀表板取得您的 API 金鑰。

路由摘要：

- `openai/gpt-5.4` = 直接 OpenAI Platform API 路由
- 需要 `OPENAI_API_KEY` (或同等的 OpenAI 提供者配置)
- 在 OpenClaw 中，ChatGPT/Codex 登入是透過 `openai-codex/*` 路由，而非 `openai/*`

### CLI 設定

```bash
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置片段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

OpenAI 目前的 API 模型文件列出 `gpt-5.4` 和 `gpt-5.4-pro` 用於直接
OpenAI API 使用。OpenClaw 透過 `openai/*` 回應路徑轉發這兩者。
OpenClaw 故意隱藏了過時的 `openai/gpt-5.3-codex-spark` 項目，
因為直接 OpenAI API 呼叫會在實際連線中拒絕它。

OpenClaw **不會** 在直接 OpenAI
API 路徑上公開 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍然為該模型內建了一個項目，但目前的實時 OpenAI API
請求會拒絕它。Spark 在 OpenClaw 中被視為僅供 Codex 使用。

## 影像生成

內建的 `openai` 外掛也會透過共用的
`image_generate` 工具註冊影像生成。

- 預設影像模型：`openai/gpt-image-1`
- 生成：每個請求最多 4 張影像
- 編輯模式：已啟用，最多 5 張參考影像
- 支援 `size`
- 目前 OpenAI 特別注意事項：OpenClaw 目前不會將 `aspectRatio` 或
  `resolution` 覆寫轉發至 OpenAI Images API

若要使用 OpenAI 作為預設的影像提供者：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

請參閱 [影像生成](/en/tools/image-generation) 以了解共用工具
參數、提供者選擇和故障轉移行為。

## 影片生成

內建的 `openai` 外掛程式也會透過共用的
`video_generate` 工具註冊影片生成功能。

- 預設影片模型：`openai/sora-2`
- 模式：文字轉影片、圖片轉影片，以及單一影片參考/編輯流程
- 目前限制：1 張圖片或 1 個影片參考輸入
- 目前 OpenAI 特別注意事項：OpenClaw 目前僅針對原生 OpenAI 影片生成轉發 `size`
  覆寫。不支援的選用覆寫
  （例如 `aspectRatio`、`resolution`、`audio` 和 `watermark`）將被忽略
  並以工具警告的形式回報。

若要使用 OpenAI 作為預設的影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openai/sora-2",
      },
    },
  },
}
```

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具
參數、提供者選擇和故障轉移行為。

## 選項 B：OpenAI Code (Codex) 訂閱

**最適用於：** 使用 ChatGPT/Codex 訂閱存取權來取代 API 金鑰。
Codex cloud 需要登入 ChatGPT，而 Codex CLI 支援登入 ChatGPT 或 API 金鑰。

路由摘要：

- `openai-codex/gpt-5.4` = ChatGPT/Codex OAuth 路由
- 使用 ChatGPT/Codex 登入，而非直接使用 OpenAI Platform API 金鑰
- `openai-codex/*` 的提供者端限制可能與 ChatGPT 網頁/應用程式體驗不同

### CLI 設定 (Codex OAuth)

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### 設定片段 (Codex 訂閱)

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

OpenAI 目前的 Codex 文件將 `gpt-5.4` 列為目前的 Codex 模型。OpenClaw
會將其對應至 `openai-codex/gpt-5.4` 以供 ChatGPT/Codex OAuth 使用。

此路由特意與 `openai/gpt-5.4` 分開。如果您想要
直接使用 OpenAI Platform API 路徑，請搭配 API 金鑰使用 `openai/*`。如果您想要
使用 ChatGPT/Codex 登入，請使用 `openai-codex/*`。

如果入職 (onboarding) 重用現有的 Codex CLI 登入，那些憑證將由 Codex CLI 管理。過期時，OpenClaw 會先重新讀取外部 Codex 來源，並且當提供者能夠更新它時，將更新後的憑證寫回 Codex 儲存，而不是在單獨的僅限 OpenClaw 的副本中取得擁有權。

如果您的 Codex 帳戶有權使用 Codex Spark，OpenClaw 也支援：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 將 Codex Spark 視為僅限 Codex。它不會公開直接的
`openai/gpt-5.3-codex-spark` API 金鑰路徑。

OpenClaw 也會在 `pi-ai`
發現它時保留 `openai-codex/gpt-5.3-codex-spark`。將其視為依賴權限和實驗性的功能：Codex Spark 與
GPT-5.4 `/fast` 是分開的，且可用性取決於已登入的 Codex /
ChatGPT 帳戶。

### Codex 上下文視窗上限

OpenClaw 將 Codex 模型元數據和執行時間上下文上限視為分開的值。

對於 `openai-codex/gpt-5.4`：

- 原生 `contextWindow`: `1050000`
- 預設執行時間 `contextTokens` 上限：`272000`

這既保持了模型元數據的真實性，又保留了較小的預設執行時間視窗，該視窗在實際上具有更好的延遲和質量特性。

如果您想要不同的有效上限，請設定 `models.providers.<provider>.models[].contextTokens`：

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [
          {
            id: "gpt-5.4",
            contextTokens: 160000,
          },
        ],
      },
    },
  },
}
```

僅當您正在宣告或覆蓋原生模型元數據時，才使用 `contextWindow`。當您想要限制執行時間上下文預算時，請使用 `contextTokens`。

### 傳輸預設值

OpenClaw 使用 `pi-ai` 進行模型串流。對於 `openai/*` 和
`openai-codex/*`，預設傳輸方式為 `"auto"` (優先使用 WebSocket，然後是 SSE
後備)。

在 `"auto"` 模式下，OpenClaw 會在回退到 SSE 之前重試一次早期的、可重試的 WebSocket 失敗。
強制的 `"websocket"` 模式仍然會直接顯示傳輸錯誤，而不是將其隱藏在後備之後。

在 `"auto"` 模式下發生連線或早期輪次的 WebSocket 失敗後，OpenClaw 會將該會話的 WebSocket 路徑標記為約 60 秒的降級狀態，並在冷卻期間透過 SSE 傳送後續輪次，而不是在傳輸方式之間來回切換。

對於原生 OpenAI 系列端點（`openai/*`、`openai-codex/*` 和 Azure OpenAI Responses），OpenClaw 還會將穩定的會話和輪次身分狀態附加到請求中，以便重試、重新連線和 SSE 回退保持與同一個對話身分一致。在原生 OpenAI 系列路由上，這包括穩定的會話/輪次請求身分標頭以及匹配的傳輸中繼資料。

OpenClaw 還會在傳輸變體抵達會話/狀態介面之前，對 OpenAI 使用量計數器進行正規化。原生 OpenAI/Codex Responses 流量可能會將使用量回報為 `input_tokens` / `output_tokens` 或 `prompt_tokens` / `completion_tokens`；OpenClaw 會將其視為 `/status`、`/usage` 和會話日誌的相同輸入和輸出計數器。當原生 WebSocket 流量省略 `total_tokens`（或回報 `0`）時，OpenClaw 會回退到正規化的輸入 + 輸出總計，以便會話/狀態顯示保持填充狀態。

您可以設定 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：強制使用 SSE
- `"websocket"`：強制使用 WebSocket
- `"auto"`：先嘗試 WebSocket，然後回退到 SSE

對於 `openai/*` (Responses API)，當使用 WebSocket 傳輸時，OpenClaw 預設也會啟用 WebSocket 預熱 (`openaiWsWarmup: true`)。

相關的 OpenAI 文件：

- [使用 WebSocket 的 Realtime API](https://platform.openai.com/docs/guides/realtime-websocket)
- [串流 API 回應 (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

```json5
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.4" },
      models: {
        "openai-codex/gpt-5.4": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}
```

### OpenAI WebSocket 預熱

OpenAI 文件將預熱描述為可選。OpenClaw 對 `openai/*` 預設啟用它，以在使用 WebSocket 傳輸時減少第一輪的延遲。

### 停用預熱

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: false,
          },
        },
      },
    },
  },
}
```

### 明確啟用預熱

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: true,
          },
        },
      },
    },
  },
}
```

### OpenAI 和 Codex 優先處理

OpenAI 的 API 通過 `service_tier=priority` 公開了優先處理功能。在
OpenClaw 中，設定 `agents.defaults.models["<provider>/<model>"].params.serviceTier`
即可在原生的 OpenAI/Codex Responses 端點上傳遞該欄位。

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

支援的值為 `auto`、`default`、`flex` 和 `priority`。

當這些模型指向原生 OpenAI/Codex 端點時，OpenClaw 會將 `params.serviceTier` 轉發至直接的 `openai/*` Responses
請求以及 `openai-codex/*` Codex Responses 請求。

重要行為：

- 直接的 `openai/*` 必須以 `api.openai.com` 為目標
- `openai-codex/*` 必須以 `chatgpt.com/backend-api` 為目標
- 如果您將任一提供者路由透過另一個基礎 URL 或代理伺服器，OpenClaw 將保持 `service_tier` 不變

### OpenAI 快速模式

OpenClaw 為 `openai/*` 和
`openai-codex/*` 會話公開了一個共用的快速模式切換開關：

- 聊天/介面：`/fast status|on|off`
- 設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`

啟用快速模式時，OpenClaw 會將其對應到 OpenAI 優先處理：

- 對 `api.openai.com` 的直接 `openai/*` Responses 呼叫會傳送 `service_tier = "priority"`
- 對 `chatgpt.com/backend-api` 的 `openai-codex/*` Responses 呼叫也會傳送 `service_tier = "priority"`
- 現有的酬載 `service_tier` 值會被保留
- 快速模式不會改寫 `reasoning` 或 `text.verbosity`

特別是對於 GPT 5.4，最常見的設定是：

- 在使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 的會話中傳送 `/fast on`
- 或設定 `agents.defaults.models["openai/gpt-5.4"].params.fastMode = true`
- 如果您同時使用 Codex OAuth，也請設定 `agents.defaults.models["openai-codex/gpt-5.4"].params.fastMode = true`

範例：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
      },
    },
  },
}
```

會話覆寫優先於設定。在「會話」UI 中清除會話覆寫
會將會話還原為設定的預設值。

### 原生 OpenAI 與 OpenAI 相容路由的比較

OpenClaw 會將直接的 OpenAI、Codex 和 Azure OpenAI 端點與通用的 OpenAI 相容 `/v1` 代理區別對待：

- 原生 `openai/*`、`openai-codex/*` 和 Azure OpenAI 路由會在您明確停用推理時保持 `reasoning: { effort: "none" }` 完整
- 原生 OpenAI 系列路由會將工具架構預設為嚴格模式
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version` 和 `User-Agent`）僅會附加在經過驗證的原生 OpenAI 主機（`api.openai.com`）和原生 Codex 主機（`chatgpt.com/backend-api`）上
- 原生 OpenAI/Codex 路由會保留 OpenAI 專有的請求整形，例如 `service_tier`、Responses `store`、OpenAI 推理相容承載，以及提示快取提示
- 代理式 OpenAI 相容路由會保持較寬鬆的相容行為，並不會強制執行嚴格的工具架構、僅限原生的請求整形或隱藏的 OpenAI/Codex 歸因標頭

Azure OpenAI 在傳輸和相容行為方面保留在原生路由分類中，但它不會接收隱藏的 OpenAI/Codex 歸因標頭。

這保留了目前原生的 OpenAI Responses 行為，而不會將較舊的 OpenAI 相容填充層強加給第三方 `/v1` 後端。

### OpenAI Responses 伺服器端壓縮

對於直接的 OpenAI Responses 模型（在 `api.openai.com` 上使用 `api: "openai-responses"` 且帶有 `baseUrl` 的 `openai/*`），OpenClaw 現在會自動啟用 OpenAI 伺服器端壓縮承載提示：

- 強制執行 `store: true`（除非模型相容性設定 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

預設情況下，`compact_threshold` 是模型 `contextWindow` 的 `70%`（或在無法取得時為 `80000`）。

### 明確啟用伺服器端壓縮

當您想要在相容的 Responses 模型上強制注入 `context_management` 時（例如 Azure OpenAI Responses），請使用此選項：

```json5
{
  agents: {
    defaults: {
      models: {
        "azure-openai-responses/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
          },
        },
      },
    },
  },
}
```

### 使用自訂閾值啟用

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
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

### 停用伺服器端壓縮

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}
```

`responsesServerCompaction` 僅控制 `context_management` 的注入。
直接的 OpenAI Responses 模型仍會強制執行 `store: true`，除非 compat 設定了
`supportsStore: false`。

## 備註

- 模型參照始終使用 `provider/model`（請參閱 [/concepts/models](/en/concepts/models)）。
- 驗證詳情 + 重用規則位於 [/concepts/oauth](/en/concepts/oauth)。
