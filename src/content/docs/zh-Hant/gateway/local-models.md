---
summary: "在本機 LLM 上執行 OpenClaw（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本機模型"
---

本地模型是可行的。但同時也提高了對硬體、內容大小和提示詞注入防護的門檻 —— 較小或過度量化 的顯卡會截斷內容並導致安全防護洩漏。本頁面是針對高端本地堆疊 和自訂 OpenAI 相容本地伺服器的觀點指南。若要獲得最低阻力的上手體驗，請從 [LM Studio](/zh-Hant/providers/lmstudio) 或 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。

對於應僅在選定模型需要時才啟動的本地伺服器，請參閱
[Local model services](/zh-Hant/gateway/local-model-services)。

## 硬體底線

目標要高：為了舒適的 Agent 迴圈，**需配備 ≥2 台滿載的 Mac Studio 或同等級的 GPU 裝置 (~$30k+)**。單一 **24 GB** GPU 僅適合延遲較高的輕量提示詞。請務必執行 **您所能主機的 最大 / 完整尺寸變體**；過小或重度量化的檢查點 會提高提示詞注入風險 (請參閱 [Security](/zh-Hant/gateway/security))。

## 選擇後端

| 後端                                             | 使用時機                                                   |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [LM Studio](/zh-Hant/providers/lmstudio)              | 首次本地設置、GUI 載入器、原生 Responses API               |
| [Ollama](/zh-Hant/providers/ollama)                   | CLI 工作流程、模型庫、免人工 systemd 服務                  |
| MLX / vLLM / SGLang                              | 具備 OpenAI 相容 HTTP 端點的高輸送量自託管服務             |
| LiteLLM / OAI-proxy / 自訂 OpenAI 相容代理伺服器 | 您位於另一個模型 API 前端，且需要 OpenClaw 將其視為 OpenAI |

當後端支援時，請使用 Responses API (`api: "openai-responses"`) (LM Studio 支援)。否則請堅持使用 Chat Completions (`api: "openai-completions"`)。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 使用者：** 官方 Ollama Linux 安裝程式會啟用具有 `Restart=always` 的 systemd 服務。在 WSL2 GPU 設定上，自動啟動可能會在開機期間重新載入最後一個模型並釘選主機記憶體。如果您在啟用 Ollama 後 WSL2 VM 反覆重新啟動，請參閱 [WSL2 crash loop](/zh-Hant/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推薦：LM Studio + 大型本地模型 (Responses API)

目前最佳的本地堆疊。在 LM Studio 中載入大型模型 (例如，完整尺寸的 Qwen、DeepSeek 或 Llama 版本)，啟用本地伺服器 (預設 `http://127.0.0.1:1234`)，並使用 Responses API 將推理與最終文字分離。

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

- 安裝 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載 **可用的最大模型版本**（避免「small」/高度量化的變體），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了該模型。
- 將 `my-local-model` 替換為 LM Studio 中顯示的實際模型 ID。
- 保持模型載入狀態；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，以便僅發送最終文字。

即使在本地執行，也要保持託管模型的配置；使用 `models.mode: "merge"` 以便讓備用方案保持可用。

### 混合配置：託管為主，本地為備

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

### 本地優先，託管為安全網

交換主要和備用順序；保持相同的 providers 區塊和 `models.mode: "merge"`，以便當本地機器故障時可以回退到 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也有託管的 MiniMax/Kimi/GLM 變體，並具有區域固定的端點（例如，美國託管）。在那裡選擇區域變體，以便將流量保留在您選擇的司法管轄區，同時仍使用 `models.mode: "merge"` 進行 Anthropic/OpenAI 備用。
- 純本地仍然是最強大的隱私路徑；當您需要提供商功能但想控制資料流向時，託管區域路由是中間立場。

## 其他 OpenAI 相容的本地代理

如果 MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自訂閘道公開了 OpenAI 風格的 `/v1/chat/completions` 端點，則可以使用它們。除非後端明確記載了 `/v1/responses` 支援，否則請使用 Chat Completions 介接器。將上面的 provider 區塊替換為您的端點和模型 ID：

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

如果具有 `baseUrl` 的自訂提供者省略了 `api`，OpenClaw 預設為
`openai-completions`。諸如 `127.0.0.1` 的回送端點會自動
受信任；LAN、tailnet 和私人 DNS 端點仍然需要
`request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是特定於提供者的。請勿在
其中包含提供者前綴。例如，以 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 啟動的 MLX 伺服器
應使用此目錄 ID 和模型參考：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本機或代理的視覺模型上設定 `input: ["text", "image"]`，以便將
圖片附件插入至代理的對話輪次中。互動式自訂提供者入門流程會推斷常見的視覺模型 ID，並僅詢問未知的名稱。
非互動式入門流程使用相同的推斷方式；對於未知的視覺 ID，請使用 `--custom-image-input`，而當看起來已知的模型在您的端點後實際上僅為文字模型時，請使用 `--custom-text-input`。

請保留 `models.mode: "merge"`，以便託管模型保持可用作為備援。
在提高 `agents.defaults.timeoutSeconds` 之前，請對緩慢的本機或遠端模型伺服器使用 `models.providers.<id>.timeoutSeconds`。
提供者逾時僅適用於模型 HTTP 請求，包括連線、標頭、主體串流，以及總受保護的提取中止。

<Note>對於自訂的 OpenAI 相容提供者，當 `baseUrl` 解析為 loopback、私人 LAN、`.local` 或純主機名稱時，允許保存非機密的本機標記（例如 `apiKey: "ollama-local"`）。OpenClaw 會將其視為有效的本機憑證，而不是回報遺失金鑰。對於任何接受公開主機名稱的提供者，請使用真實值。</Note>

本機/代理 `/v1` 後端的行為說明：

- OpenClaw 將這些視為代理風格的 OpenAI 相容路由，而非原生的
  OpenAI 端點
- 原生的 OpenAI 專屬請求塑造在此不適用：沒有
  `service_tier`、沒有 Responses `store`、沒有 OpenAI 推理相容負載
  塑造，也沒有提示快取提示
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
  不會在這些自訂代理 URL 上注入

針對更嚴格的 OpenAI 相容後端的相容性說明：

- 部分伺服器在 Chat Completions 上僅接受字串 `messages[].content`，不接受
  結構化的 content-part 陣列。請為這些端點設定
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 部分本地模型會以文字形式發出獨立的括號工具請求，例如
  `[tool_name]` 後接 JSON 和 `[END_TOOL_REQUEST]`。只有當名稱完全符合該輪次
  的註冊工具時，OpenClaw 才會將其升級為真正的工具呼叫；否則，該區塊會被視為不支援的文字，
  並對使用者可見的回覆隱藏。
- 如果模型發出的 JSON、XML 或 ReAct 樣式文字看起來像工具呼叫，
  但供應商並未發出結構化的調用，OpenClaw 會將其保留為
  文字，並記錄包含 run id、供應商/模型、偵測到的模式以及
  工具名稱（如果有的話）的警告。將其視為供應商/模型的工具呼叫
  不相容，而非已完成的工具執行。
- 如果工具以助理文字的形式出現而非執行，例如原始 JSON、
  XML、ReAct 語法，或供應商回應中出現空的 `tool_calls` 陣列，
  首先請驗證伺服器使用的是支援工具呼叫的聊天範本/解析器。對於
  其解析器僅在強制使用工具時才能運作的 OpenAI 相容 Chat Completions 後端，
  請設定每個模型的請求覆寫，而不是依賴文字解析：

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

  僅針對每次正常輪次都應呼叫工具的模型/工作階段使用此設定。
  這會覆寫 OpenClaw 的預設代理值 `tool_choice: "auto"`。
  將 `local/my-local-model` 取換為 `openclaw models list` 顯示的確切供應商/模型參考。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自訂的 OpenAI 相容模型接受內建設定檔之外的 OpenAI 推理力，
  請在模型相容性區塊中宣告它們。在此新增 `"xhigh"`
  可讓 `/think xhigh`、工作階段選擇器、Gateway 驗證和 `llm-task`
  驗證為該設定的供應商/模型參考公開該等級：

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "GPT 5.4 via local proxy",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## 更小或更嚴格的後端

如果模型載入乾淨但完整的代理輪次運作異常，請採用由上而下的方式 — 先確認傳輸，再縮小範圍。

1. **確認本地模型本身有回應。** 不使用工具，不使用代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **確認 Gateway 路由。** 僅發送提供的提示 — 跳過對話記錄、AGENTS 啟動、context-engine 組裝、工具和捆綁的 MCP 伺服器，但仍會執行 Gateway 路由、身份驗證和提供者選擇：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **試用精簡模式。** 如果兩項探測都通過，但實際的 Agent 輪次因格式錯誤的工具呼叫或過大的提示而失敗，請啟用 `agents.defaults.experimental.localModelLean: true`。它會移除三個最重的預設工具 (`browser`、`cron`、`message`)，使提示形狀更小且不易出錯。請參閱 [Experimental Features → Local model lean mode](/zh-Hant/concepts/experimental-features#local-model-lean-mode) 以獲得完整說明、使用時機以及確認其開啟的方法。

4. **最後手段：完全停用工具。** 如果精簡模式仍不足夠，請針對該模型條目設定 `models.providers.<provider>.models[].compat.supportsTools: false`。Agent 將會在不進行工具呼叫的情況下於該模型上運作。

5. **除此之外，瓶頸在於上游。** 如果在精簡模式和 `supportsTools: false` 之後，後端仍僅在較大的 OpenClaw 執行中失敗，剩餘的問題通常是上游模型或伺服器容量 — 上下文視窗、GPU 記憶體、kv-cache 驅逐，或是後端錯誤。此時並非 OpenClaw 的傳輸層問題。

## 疑難排解

- Gateway 可以連線到 Proxy 嗎？ `curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載？請重新載入；冷啟動是常見的「懸置」原因。
- 本地伺服器回報 `terminated`、`ECONNRESET`，或在輪次中途關閉串流？
  OpenClaw 會在診斷資訊中記錄低基數的 `model.call.error.failureKind` 以及
  OpenClaw 處理程序的 RSS/heap 快照。針對 LM Studio/Ollama 的
  記憶體壓力，請將該時間戳記與伺服器記錄或 macOS 當機 /
  jetsam 記錄進行比對，以確認模型伺服器是否被終止。
- OpenClaw 會根據偵測到的模型視窗推導 context-window 預檢閾值，或者當 `agents.defaults.contextTokens` 降低有效視窗時，則從無上限的模型視窗推導。它會在低於 20% 時發出警告，底線為 **8k**。強制封鎖使用 10% 閾值，底線為 **4k**，並上限為有效 context 視窗，因此過大的模型中繼資料無法拒絕其他有效的使用者上限。如果您遇到該預檢，請提高伺服器/模型的 context 限制或選擇更大的模型。
- 出現 Context 錯誤？降低 `contextWindow` 或提高您的伺服器限制。
- OpenAI 相容伺服器返回 `messages[].content ... expected a string`？
  在該模型項目中加入 `compat.requiresStringContent: true`。
- OpenAI 相容伺服器返回 `validation.keys` 或指出訊息條目僅允許 `role` 和 `content`？
  在該模型項目中加入 `compat.strictMessageKeys: true`。
- 直接的小型 `/v1/chat/completions` 呼叫有效，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失敗？請先檢查提供者 URL、模型參照、auth
  標記和伺服器日誌；本地 `model run` 不包含 Agent 工具。
  如果本地 `model run` 成功但較大的 Agent 輪次失敗，請使用 `localModelLean` 或 `compat.supportsTools: false` 來減少 Agent 工具表面。
- 工具呼叫顯示為原始 JSON/XML/ReAct 文字，或提供者返回
  空的 `tool_calls` 陣列？不要新增一個將 Assistant
  文字盲目轉換為工具執行的 Proxy。請先修正伺服器聊天範本/解析器。如果
  模型僅在強制使用工具時才有效，請加入上述針對特定模型的
  `params.extra_body.tool_choice: "required"` 覆蓋設定，並且僅在每輪都預期會有工具呼叫的
  工作階段中使用該模型項目。
- 安全性：本地模型會略過提供者端的過濾器；請保持 Agent 狹窄並開啟壓縮功能，以限制提示注入的爆炸半徑。

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference)
- [Model failover](/zh-Hant/concepts/model-failover)
