---
summary: "在本機 LLM 上執行 OpenClaw (LM Studio, vLLM, LiteLLM, 自訂 OpenAI 端點)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本機模型"
---

本機部署可行，但 OpenClaw 預期具備大型上下文 + 針對提示詞注入的強力防禦。小型顯卡會截斷上下文並導致安全性外洩。目標要高：**≥2 台滿配的 Mac Studio 或同等 GPU 裝置 (~$30k+)**。單一 **24 GB** GPU 僅適用於延遲較高的輕量級提示詞。請使用您能執行的**最大 / 全尺寸模型變體**；過度量化或「小型」檢查點會提高提示詞注入風險 (參見 [安全性](/zh-Hant/gateway/security))。

如果您想要最低阻力的本機設置，請從 [LM Studio](/zh-Hant/providers/lmstudio) 或 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。本頁是針對高階本機堆疊和自訂 OpenAI 相容本機伺服器的觀點指南。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 使用者：** 官方 Ollama Linux 安裝程式會啟用具有 `Restart=always` 的 systemd 服務。在 WSL2 GPU 設置上，自動啟動會在開機期間重新載入最後一個模型並釘選主機記憶體。如果您在啟用 Ollama 後 WSL2 VM 重複重新啟動，請參見 [WSL2 當機迴圈](/zh-Hant/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推薦：LM Studio + 大型本地模型（Responses API）

目前最佳的本機堆疊。在 LM Studio 中載入大型模型 (例如，全尺寸的 Qwen、DeepSeek 或 Llama 版本)，啟用本機伺服器 (預設 `http://127.0.0.1:1234`)，並使用 Responses API 將推理與最終文字分開。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**設置檢查清單**

- 安裝 LM Studio： [https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載**可用的最大模型版本** (避免「小型」/重度量化變體)，啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了它。
- 將 `my-local-model` 替換為 LM Studio 中顯示的實際模型 ID。
- 保持模型載入狀態；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，以便僅發送最終文字。

即使在執行本機時也要保持託管模型的配置；使用 `models.mode: "merge"` 以便保持備援可用。

### 混合配置：託管為主，本地備援

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### 本地優先並搭配託管安全網

交換主要與備用的順序；保持相同的 providers 區塊與 `models.mode: "merge"`，以便當本機設備故障時能切換回 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也有具備區域固定端點的代管 MiniMax/Kimi/GLM 變體（例如，美國託管）。在那裡選擇區域變體，將流量保留在您選擇的管轄區域內，同時仍使用 `models.mode: "merge"` 作為 Anthropic/OpenAI 的備用。
- 僅限本地（Local-only）仍然是隱私性最強的路徑；當您需要供應商功能但希望控制資料流時，託管的區域路由是折衷方案。

## 其他相容 OpenAI 的本機代理

只要提供 OpenAI 風格的 `/v1/chat/completions` 端點，MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自訂閘道均可運作。除非後端明確記載支援 `/v1/responses`，否則請使用 Chat Completions 配接器。將上方的 provider 區塊替換為您的端點與模型 ID：

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

若在具有 `baseUrl` 的自訂提供者上省略 `api`，OpenClaw 預設為 `openai-completions`。諸如 `127.0.0.1` 的回送端點會自動被信任；而 LAN、tailnet 與私有 DNS 端點仍需要 `request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是提供者區域性的。請勿在那裡包含提供者前綴。例如，以 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 啟動的 MLX 伺服器應使用此目錄 ID 與模型參照：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

保留 `models.mode: "merge"`，讓託管模型保持可用作為備用。對於緩慢的本機或遠端模型伺服器，在引發 `agents.defaults.timeoutSeconds` 之前使用 `models.providers.<id>.timeoutSeconds`。提供者逾時僅適用於模型 HTTP 請求，包括連線、標頭、主體串流，以及總受保護的 fetch 中止。

<Note>對於自訂 OpenAI 相容的提供者，當 `baseUrl` 解析為回送、私有 LAN、`.local` 或裸機主機名稱時，允許保存非秘密的本機標記（例如 `apiKey: "ollama-local"`）。OpenClaw 會將其視為有效的本機憑證，而不是回報缺少金鑰。對於接受公開主機名稱的任何提供者，請使用真實值。</Note>

本機/代理 `/v1` 後端的行為說明：

- OpenClaw 將這些視為代理風格的 OpenAI 相容路由，而非原生的 OpenAI 端點
- 原生的僅限 OpenAI 的請求整形在此不適用：沒有 `service_tier`，沒有 Responses `store`，沒有 OpenAI 推理相容負載整形，也沒有提示詞快取提示
- 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`, `User-Agent`) 不會被注入到這些自訂代理 URL 中

針對較嚴格的 OpenAI 相容後端的相容性說明：

- 部分伺服器在 Chat Completions 上僅接受字串 `messages[].content`，而非結構化的內容部分陣列。請為那些端點設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 部分本地模型會將獨立的括號工具請求作為文字發出，例如後面接著 JSON 的 `[tool_name]` 和 `[END_TOOL_REQUEST]`。僅當名稱完全符合該輪次的註冊工具時，OpenClaw 才會將這些提升為實際的工具呼叫；否則，該區塊會被視為不支援的文字，並對使用者可見的回覆隱藏。
- 如果模型發出的 JSON、XML 或 ReAct 風格的文字看起來像工具呼叫，但提供者未發出結構化呼叫，OpenClaw 會將其保留為文字，並在可用時記錄包含執行 ID、提供者/模型、偵測到的模式和工具名稱的警告。請將其視為提供者/模型工具呼叫不相容，而非已完成的工具執行。
- 如果工具顯示為助手文字而非執行中，例如提供者回應中的原始 JSON、XML、ReAct 語法或空的 `tool_calls` 陣列，請先驗證伺服器是否使用具有工具呼叫能力的聊天範本/解析器。對於僅在強制使用工具時其解析器才運作的 OpenAI 相容 Chat Completions 後端，請設定各模型的請求覆寫，而不是依賴文字解析：

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
            params: {
              extra_body: {
                tool_choice: "required",
              },
            },
          },
        },
      },
    },
  }
  ```

  僅對每個正常輪次都應呼叫工具的模型/會話使用此設定。它會覆寫 OpenClaw 的預設代理值 `tool_choice: "auto"`。將 `local/my-local-model` 取換為 `openclaw models list` 顯示的確切提供者/模型參照。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 部分較小或較嚴格的本地後端與 OpenClaw 的完整
  agent-runtime 提示詞形狀不相容，尤其是在包含工具架構時。如果
  後端能處理小型直接 `/v1/chat/completions` 呼叫，但在正常的
  OpenClaw agent 輪次時失敗，請先嘗試
  `agents.defaults.experimental.localModelLean: true` 來捨棄重型
  預設工具，例如 `browser`、`cron` 和 `message`；這是一個實驗性
  標誌，而非穩定的預設模式設定。請參閱
  [Experimental Features](/zh-Hant/concepts/experimental-features)。如果這仍然失敗，請嘗試
  `models.providers.<provider>.models[].compat.supportsTools: false`。
- 如果後端仍然僅在較大的 OpenClaw 執行時失敗，其餘的問題
  通常是上游模型/伺服器容量或後端錯誤，而非 OpenClaw 的
  傳輸層問題。

## 疑難排解

- Gateway 可以連接到 proxy？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載？請重新載入；冷啟動是常見的「卡住」原因。
- 本地伺服器顯示 `terminated`、`ECONNRESET`，或在輪次中途中斷串流？
  OpenClaw 會記錄低基數的 `model.call.error.failureKind` 以及診斷中的
  OpenClaw 程序 RSS/heap 快照。針對 LM Studio/Ollama
  的記憶體壓力，請將該時間戳與伺服器日誌或 macOS 當機 /
  jetsam 日誌進行比對，以確認模型伺服器是否已被終止。
- 當偵測到的內容視窗低於 **32k** 時，OpenClaw 會發出警告，低於 **16k** 時則會封鎖。如果您遇到該預檢，請提高伺服器/模型的內容限制或選擇更大的模型。
- 發生內容錯誤？請降低 `contextWindow` 或提高您的伺服器限制。
- OpenAI 相容伺服器回傳 `messages[].content ... expected a string`？
  在該模型條目上新增 `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 呼叫有效，但 `openclaw infer model run`
  在 Gemma 或其他本地模型上失敗？請先使用
  `compat.supportsTools: false` 停用工具架構，然後重新測試。如果伺服器仍然僅在
  較大的 OpenClaw 提示詞時當機，請將其視為上游伺服器/模型的限制。
- 工具呼叫顯示為原始 JSON/XML/ReAct 文字，或者提供者傳回空的 `tool_calls` 陣列？請勿加入盲目將助理文字轉換為工具執行的代理。請先修正伺服器聊天範本/解析器。如果模型僅在強制使用工具時才能運作，請在上方的每個模型 `params.extra_body.tool_choice: "required"` 覆蓋設定中新增，並僅在每個回合都預期會有工具呼叫的階段中使用該模型項目。
- 安全性：本地模型會跳過提供者端的篩選器；請將代理保持狹窄並開啟壓縮，以限制提示注入的爆炸半徑。

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
