---
summary: "在 OpenClaw 中透過 API 金鑰或 Codex 訂閱使用 OpenAI"
read_when:
  - 您想在 OpenClaw 中使用 OpenAI 模型
  - 您想要 Codex 訂閱驗證而非 API 金鑰
title: "OpenAI"
---

# OpenAI

OpenAI 提供適用於 GPT 模型的開發者 API。Codex 支援 **ChatGPT 登入** 以進行訂閱存取，或 **API 金鑰** 登入以進行依使用量計費的存取。Codex cloud 需要 ChatGPT 登入。OpenAI 明確支援在外部工具/工作流程（如 OpenClaw）中使用訂閱 OAuth。

## 選項 A：OpenAI API 金鑰 (OpenAI Platform)

**最適用於：** 直接 API 存取與依使用量計費。
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

OpenAI 目前的 API 模型文件列出了 `gpt-5.4` 和 `gpt-5.4-pro` 用於直接的 OpenAI API 使用。OpenClaw 會透過 `openai/*` 回應路徑轉發這兩者。
OpenClaw 刻意隱藏了過時的 `openai/gpt-5.3-codex-spark` 項目，因為直接的 OpenAI API 呼叫會在實際連線中拒絕該模型。

OpenClaw **不會** 在直接的 OpenAI API 路徑上公開 `openai/gpt-5.3-codex-spark`。`pi-ai` 仍然隨附該模型的內建項目，但目前的實際 OpenAI API 請求會拒絕它。在 OpenClaw 中，Spark 被視為僅限 Codex 使用。

## 選項 B：OpenAI Code (Codex) 訂閱

**最適用於：** 使用 ChatGPT/Codex 訂閱存取而非 API 金鑰。
Codex cloud 需要 ChatGPT 登入，而 Codex CLI 支援 ChatGPT 或 API 金鑰登入。

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

OpenAI 目前的 Codex 文件列出了 `gpt-5.4` 作為目前的 Codex 模型。OpenClaw 會將其對應到 `openai-codex/gpt-5.4` 以用於 ChatGPT/Codex OAuth 使用。

如果您的 Codex 帳戶有權使用 Codex Spark，OpenClaw 也支援：

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw 將 Codex Spark 視為僅限 Codex 使用。它不會公開直接的 `openai/gpt-5.3-codex-spark` API 金鑰路徑。

當 `pi-ai` 發現 `openai-codex/gpt-5.3-codex-spark` 時，OpenClaw 也會予以保留。請將其視為依據權限且具實驗性質：Codex Spark 與 GPT-5.4 `/fast` 是分開的，且可用性取決於登入的 Codex / ChatGPT 帳戶。

### 傳輸預設值

OpenClaw 使用 `pi-ai` 進行模型串流。對於 `openai/*` 和 `openai-codex/*`，預設的傳輸方式為 `"auto"` (優先使用 WebSocket，然後 SSE 備援)。

您可以設定 `agents.defaults.models.<provider/model>.params.transport`：

- `"sse"`：強制使用 SSE
- `"websocket"`：強制使用 WebSocket
- `"auto"`：嘗試使用 WebSocket，然後回退到 SSE

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

OpenAI 文件將預熱描述為可選項。OpenClaw 預設為 `openai/*` 啟用它，以減少使用 WebSocket 傳輸時的首輪延遲。

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

OpenAI 的 API 透過 `service_tier=priority` 公開優先處理功能。在 OpenClaw 中，設定 `agents.defaults.models["openai/<model>"].params.serviceTier` 即可在直接的 `openai/*` Responses 請求中傳遞該欄位。

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

OpenClaw 為 `openai/*` 和 `openai-codex/*` 會話提供了一個共用的快速模式切換開關：

- 聊天/使用者介面：`/fast status|on|off`
- 組態：`agents.defaults.models["<provider>/<model>"].params.fastMode`

啟用快速模式時，OpenClaw 會套用低延遲的 OpenAI 設定檔：

- 當承載未指定推理時，`reasoning.effort = "low"`
- 當承載未指定詳細程度時，`text.verbosity = "low"`
- 對於對 `api.openai.com` 的直接 `openai/*` Responses 呼叫，`service_tier = "priority"`

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

會話覆寫優先於組態。在「會話」使用者介面中清除會話覆寫會將會話恢復為組態的預設值。

### OpenAI Responses 伺服器端壓縮

對於直接的 OpenAI Responses 模型（`openai/*` 使用 `api: "openai-responses"` 並在 `api.openai.com` 上搭配 `baseUrl`），OpenClaw 現在會自動啟用 OpenAI 伺服器端的壓縮負載提示：

- 強制 `store: true`（除非模型相容性設定了 `supportsStore: false`）
- 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`

預設情況下，`compact_threshold` 是模型 `contextWindow` 的 `70%`（或者當不可用時為 `80000`）。

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

`responsesServerCompaction` 僅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍然會強制 `store: true`，除非相容性設定了 `supportsStore: false`。

## 備註

- 模型參照始終使用 `provider/model`（請參閱 [/concepts/models](/zh-Hant/concepts/models)）。
- 驗證詳細資訊 + 重用規則位於 [/concepts/oauth](/zh-Hant/concepts/oauth)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
