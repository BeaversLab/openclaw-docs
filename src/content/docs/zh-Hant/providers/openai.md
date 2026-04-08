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
- `"off"`：停用覆蓋層並僅使用基礎 OpenClaw 提示。

範圍：

- 適用於 `openai/*` 模型。
- 適用於 `openai-codex/*` 模型。
- 不影響其他提供者。

此行為預設為開啟。如果您希望該設定在未來的本地設定變動中保留，請明確保持 `"friendly"`：

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

### 停用 OpenAI 提示覆蓋層

如果您想要未經修改的基礎 OpenClaw 提示，請將覆蓋層設定為 `"off"`：

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

您也可以直接使用設定 CLI 進行設定：

```bash
openclaw config set plugins.entries.openai.config.personality off
```

## 選項 A：OpenAI API 金鑰

**最適合：** 直接 API 存取和按用量計費。
請從 OpenAI 儀表板取得您的 API 金鑰。

### CLI 設定

```bash
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### 設定片段

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

OpenAI 目前的 API 模型文件列出了 `gpt-5.4` 和 `gpt-5.4-pro` 用於直接
OpenAI API 使用。OpenClaw 透過 `openai/*` Responses 路徑轉發這兩者。
OpenClaw 故意抑制了過時的 `openai/gpt-5.3-codex-spark` 項目，
因為直接的 OpenAI API 呼叫在實際流量中會拒絕它。

OpenClaw 在直接的 OpenAI
API 路徑上並**未**公開 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍然針對該模型提供內建項目，但實時的 OpenAI API
請求目前會拒絕它。在 OpenClaw 中，Spark 被視為僅限 Codex 使用。

## 圖像生成

隨附的 `openai` 外掛程式也透過共用的 `image_generate` 工具註冊了影像生成功能。

- 預設影像模型：`openai/gpt-image-1`
- 生成：每個請求最多 4 張影像
- 編輯模式：已啟用，最多 5 張參考影像
- 支援 `size`
- 目前針對 OpenAI 的注意事項：OpenClaw 目前不會將 `aspectRatio` 或
  `resolution` 覆寫值轉發至 OpenAI Images API

若要將 OpenAI 用作預設影像提供者：

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

請參閱 [影像生成](/en/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。

## 影片生成

隨附的 `openai` 外掛程式也透過共用的 `video_generate` 工具註冊了影片生成功能。

- 預設影片模型：`openai/sora-2`
- 模式：文字產生影片、影像產生影片，以及單一影片參考/編輯流程
- 目前限制：1 個影像或 1 個影片參考輸入
- 目前針對 OpenAI 的注意事項：OpenClaw 目前僅針對原生 OpenAI 影片生成轉發 `size`
  覆寫值。不支援的選用覆寫值，例如 `aspectRatio`、`resolution`、`audio` 和 `watermark`，將會被忽略
  並作為工具警告回報。

若要將 OpenAI 用作預設影片提供者：

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

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。

## 選項 B：OpenAI Code (Codex) 訂閱

**最適用於：** 使用 ChatGPT/Codex 訂閱存取權，而非 API 金鑰。
Codex 雲端需要 ChatGPT 登入，而 Codex CLI 支援 ChatGPT 或 API 金鑰登入。

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

如果入職流程重複使用現有的 Codex CLI 登入，那些憑證將持續由 Codex CLI 管理。當過期時，OpenClaw 會先重新讀取外部 Codex 來源，並且當提供者能夠更新它時，會將更新後的憑證寫回 Codex 儲存空間，而不是在另一個僅屬於 OpenClaw 的副本中取得擁有權。

如果您的 Codex 帳戶有資格使用 Codex Spark，OpenClaw 也支援：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 將 Codex Spark 視為僅限 Codex。它不會公開直接的 `openai/gpt-5.3-codex-spark` API 金鑰路徑。

當 `pi-ai` 發現 `openai-codex/gpt-5.3-codex-spark` 時，OpenClaw 也會保留它。請將其視為依賴權限且具實驗性質：Codex Spark 與 GPT-5.4 `/fast` 是分開的，且可用性取決於登入的 Codex / ChatGPT 帳戶。

### Codex 內容視窗上限

OpenClaw 將 Codex 模型元資料和執行時間內容上限視為分開的值。

對於 `openai-codex/gpt-5.4`：

- 原生 `contextWindow`：`1050000`
- 預設執行時間 `contextTokens` 上限：`272000`

這在保留實際上具有更好延遲和品質特性的較小預設執行時間視窗的同時，保持了模型元資料的真實性。

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

僅在您宣告或覆寫原生模型元資料時才使用 `contextWindow`。當您想要限制執行時間內容預算時，請使用 `contextTokens`。

### 傳輸預設值

OpenClaw 使用 `pi-ai` 進行模型串流。對於 `openai/*` 和 `openai-codex/*`，預設傳輸方式為 `"auto"` (優先使用 WebSocket，然後 SSE 後備)。

在 `"auto"` 模式下，OpenClaw 在後退到 SSE 之前也會重試一次早期的、可重試的 WebSocket 失敗。強制 `"websocket"` 模式仍然會直接顯示傳輸錯誤，而不是將其隱藏在後備機制之後。

在 `"auto"` 模式下發生連線或早期回合 WebSocket 失敗後，OpenClaw 會將該會話的 WebSocket 路徑標記為降級約 60 秒，並在冷卻期間透過 SSE 傳送後續回合，而不是在傳輸之間反覆重試。

對於原生 OpenAI 系列端點 (`openai/*`、`openai-codex/*` 和 Azure OpenAI Responses)，OpenClaw 也會將穩定的會話和回合識別狀態附加到請求中，以便重試、重新連線和 SSE 後援保持與相同的對話識別一致。在原生 OpenAI 系列路由上，這包括穩定的會話/回合請求識別標頭以及匹配的傳輸中繼資料。

OpenClaw 也會在傳輸變體傳送到會話/狀態介面之前正規化 OpenAI 使用計數器。原生 OpenAI/Codex Responses 流量可能會將使用量回報為 `input_tokens` / `output_tokens` 或 `prompt_tokens` / `completion_tokens`；OpenClaw 會將這些視為 `/status`、`/usage` 和會話記錄的相同輸入和輸出計數器。當原生 WebSocket 流量省略 `total_tokens` (或回報 `0`) 時，OpenClaw 會退回到正規化的輸入 + 輸出總計，以便會話/狀態顯示保持填充狀態。

您可以設定 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：強制 SSE
- `"websocket"`：強制 WebSocket
- `"auto"`：嘗試 WebSocket，然後退回到 SSE

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

OpenAI 文件將預熱描述為可選的。OpenClaw 預設為 `openai/*` 啟用它，以在使用 WebSocket 傳輸時減少第一回合的延遲。

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

OpenAI 的 API 透過 `service_tier=priority` 公開優先處理功能。在
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

支援的數值包括 `auto`、`default`、`flex` 和 `priority`。

當這些模型指向原生 OpenAI/Codex 端點時，OpenClaw 會將 `params.serviceTier` 轉發至直接 `openai/*` Requests
請求以及 `openai-codex/*` Codex Responses 請求。

重要行為：

- 直接 `openai/*` 必須以 `api.openai.com` 為目標
- `openai-codex/*` 必須以 `chatgpt.com/backend-api` 為目標
- 如果您將任一供應商透過其他基礎 URL 或代理伺服器進行路由，OpenClaw 將保持 `service_tier` 不變

### OpenAI 快速模式

OpenClaw 為 `openai/*` 和
`openai-codex/*` 會話提供一個共用的快速模式切換開關：

- 聊天/UI：`/fast status|on|off`
- 設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`

啟用快速模式時，OpenClaw 會將其對應到 OpenAI 優先處理：

- 對 `api.openai.com` 的直接 `openai/*` Responses 呼叫會發送 `service_tier = "priority"`
- 對 `chatgpt.com/backend-api` 的 `openai-codex/*` Responses 呼叫也會發送 `service_tier = "priority"`
- 會保留現有 payload 中的 `service_tier` 數值
- 快速模式不會重寫 `reasoning` 或 `text.verbosity`

具體對於 GPT 5.4，最常見的設定方式是：

- 在使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 的會話中發送 `/fast on`
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

會話覆寫優先於設定。在 Sessions UI 中清除會話覆寫
會將會話恢復為設定的預設值。

### 原生 OpenAI 與 OpenAI 相容路由

OpenClaw 對待直接 OpenAI、Codex 和 Azure OpenAI 端點的方式不同於通用 OpenAI 相容的 `/v1` 代理：

- 原生 `openai/*`、`openai-codex/*` 和 Azure OpenAI 路由會在您明確停用推理時
  保持 `reasoning: { effort: "none" }` 完整
- 原生 OpenAI 系列路由預設將工具架構設為嚴格模式
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version` 和
  `User-Agent`）僅附加於已驗證的原生 OpenAI 主機
  （`api.openai.com`）和原生 Codex 主機（`chatgpt.com/backend-api`）
- 原生 OpenAI/Codex 路由會保留 OpenAI 專有的請求整形，例如
  `service_tier`、Responses `store`、OpenAI 推理相容載荷，以及
  提示快取提示
- 代理樣式的 OpenAI 相容路由保持較寬鬆的相容行為，並且
  不會強制執行嚴格的工具架構、僅限原生的請求整形或隱藏的
  OpenAI/Codex 歸因標頭

Azure OpenAI 在傳輸和相容行為方面仍屬於原生路由分類，
但它不會接收隱藏的 OpenAI/Codex 歸因標頭。

這保留了目前原生 OpenAI Responses 行為，而不會將較舊的
OpenAI 相容填充層強加給第三方 `/v1` 後端。

### OpenAI Responses 伺服器端壓縮

對於直接 OpenAI Responses 模型（`openai/*` 使用 `api: "openai-responses"` 搭配
`baseUrl` 於 `api.openai.com`），OpenClaw 現在會自動啟用 OpenAI 伺服器端
壓縮載荷提示：

- 強制 `store: true`（除非模型相容性設定 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

預設情況下，`compact_threshold` 是模型 `contextWindow` 的 `70%`（當不可用時則為 `80000`）。

### 明確啟用伺服器端壓縮

當您想要在相容的 Responses 模型上（例如 Azure OpenAI Responses）
強制注入 `context_management` 時，請使用此選項：

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

### 啟用並使用自訂閾值

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
直接 OpenAI Responses 模型仍會強制 `store: true`，除非 compat 設定了
`supportsStore: false`。

## 備註

- 模型參照始終使用 `provider/model` (請參閱 [/concepts/models](/en/concepts/models))。
- 驗證詳細資訊與重複使用規則位於 [/concepts/oauth](/en/concepts/oauth)。
