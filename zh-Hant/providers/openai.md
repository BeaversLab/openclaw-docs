---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
title: "OpenAI"
---

# OpenAI

OpenAI 提供用於 GPT 模型的開發者 API。Codex 支援透過 **ChatGPT 登入** 進行訂閱存取，或透過 **API 金鑰** 登入進行依用量計費的存取。Codex cloud 需要 ChatGPT 登入。
OpenAI 明確支援在外部工具/工作流程（如 OpenClaw）中使用訂閱 OAuth。

## 選項 A：OpenAI API 金鑰

**最適合：** 直接 API 存取與依用量計費。
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
OpenClaw 有意隱藏過時的 `openai/gpt-5.3-codex-spark` 項目，
因為直接 OpenAI API 呼叫會在實際流量中拒絕它。

OpenClaw 在直接 OpenAI
API 路徑上並不會公開 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍會隨附該模型的內建項目，但即時 OpenAI API
請求目前會拒絕它。Spark 在 OpenClaw 中被視為僅限 Codex 使用。

## 選項 B：OpenAI Code 訂閱

**最適合：** 使用 ChatGPT/Codex 訂閱存取以代替 API 金鑰。
Codex cloud 需要 ChatGPT 登入，而 Codex CLI 支援 ChatGPT 或 API 金鑰登入。

### CLI 設定

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### 設定片段

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

OpenAI 目前的 Codex 文件列出了 `gpt-5.4` 作為目前的 Codex 模型。OpenClaw
會將其對應至 `openai-codex/gpt-5.4` 以供 ChatGPT/Codex OAuth 使用。

如果您的 Codex 帳戶有權使用 Codex Spark，OpenClaw 也支援：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 將 Codex Spark 視為僅限 Codex 使用。它不會公開直接的
`openai/gpt-5.3-codex-spark` API 金鑰路徑。

當 `pi-ai`
發現 `openai-codex/gpt-5.3-codex-spark` 時，OpenClaw 也會加以保留。請將其視為依權限而定且實驗性的功能：Codex Spark 與
GPT-5.4 `/fast` 是分開的，且可用性取決於已登入的 Codex /
ChatGPT 帳戶。

### 傳輸預設值

OpenClaw 使用 `pi-ai` 進行模型串流傳輸。對於 `openai/*` 和 `openai-codex/*`，預設傳輸方式為 `"auto"`（優先使用 WebSocket，然後 SSE 後備）。

您可以設定 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：強制使用 SSE
- `"websocket"`：強制使用 WebSocket
- `"auto"`：嘗試 WebSocket，然後後備至 SSE

對於 `openai/*` (Responses API)，當使用 WebSocket 傳輸時，OpenClaw 預設也會啟用 WebSocket 預熱 (`openaiWsWarmup: true`)。

相關的 OpenAI 文件：

- [使用 WebSocket 的即時 API](https://platform.openai.com/docs/guides/realtime-websocket)
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

OpenAI 文件將預熱描述為可選。OpenClaw 對 `openai/*` 預設啟用它，以在使用 WebSocket 傳輸時減少第一輪延遲。

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

### OpenAI 優先處理

OpenAI 的 API 透過 `service_tier=priority` 公開優先處理功能。在 OpenClaw 中，設定 `agents.defaults.models["openai/<model>"].params.serviceTier` 以在直接 `openai/*` Responses 請求中傳遞該欄位。

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
      },
    },
  },
}
```

支援的值為 `auto`、`default`、`flex` 和 `priority`。

### OpenAI 快速模式

OpenClaw 為 `openai/*` 和 `openai-codex/*` 工作階段公開了一個共用的快速模式切換開關：

- 聊天/UI：`/fast status|on|off`
- 設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`

啟用快速模式時，OpenClaw 會套用低延遲的 OpenAI 設定檔：

- 當載荷未指定推理時 `reasoning.effort = "low"`
- 當載荷未指定詳細程度時 `text.verbosity = "low"`
- 對於對 `api.openai.com` 的直接 `openai/*` Responses 呼叫 `service_tier = "priority"`

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

工作階段覆寫優先於設定。在工作階段 UI 中清除工作階段覆寫，會將工作階段恢復為設定的預設值。

### OpenAI Responses 伺服器端壓縮

對於直接的 OpenAI Responses 模型（`openai/*` 使用 `api: "openai-responses"` 搭配 `baseUrl` 在 `api.openai.com` 上），OpenClaw 現在會自動啟用 OpenAI 伺服器端的壓縮 Payload 提示：

- 強制 `store: true`（除非模型相容性設定了 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

預設情況下，`compact_threshold` 是模型 `contextWindow` 的 `70%`（或當無法使用時為 `80000`）。

### 明確啟用伺服器端壓縮

當您想要在相容的 Responses 模型上強制注入 `context_management` 時使用此選項（例如 Azure OpenAI Responses）：

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

### 啟用並自訂閾值

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
直接的 OpenAI Responses 模型仍會強制 `store: true`，除非相容性設定 `supportsStore: false`。

## 備註

- 模型參考始終使用 `provider/model`（參見 [/concepts/models](/zh-Hant/concepts/models)）。
- 驗證詳細資訊與重用規則位於 [/concepts/oauth](/zh-Hant/concepts/oauth)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
