---
summary: "在本機 LLM 上執行 OpenClaw（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本機模型"
---

本機模型是可行的。但它們也對硬體、內容長度（context size）和提示詞注入防禦提出了更高的要求——規格較小或過度量化的顯卡會截斷內容並導致安全性洩漏。本頁面是關於高階本機堆疊和自訂 OpenAI 相容本機伺服器的見解指南。若要無痛入門，請從 [LM Studio](/zh-Hant/providers/lmstudio) 或 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。

## 硬體底線

目標要高：為了順暢的 Agent 迴圈，建議使用 **≥2 台滿配的 Mac Studio 或同等級的 GPU 裝置（約 3 萬美元以上）**。單一 **24 GB** GPU 僅適合在較高延遲下處理較輕量的提示詞。請務必執行您所能主機的**最大 / 完整尺寸變體**；規格較小或重度量化的檢查點會提高提示詞注入的風險（請參閱 [安全性](/zh-Hant/gateway/security)）。

## 選擇後端

| 後端                                             | 使用時機                                                   |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [LM Studio](/zh-Hant/providers/lmstudio)              | 首次本機設定、GUI 載入器、原生 Responses API               |
| [Ollama](/zh-Hant/providers/ollama)                   | CLI 工作流程、模型庫、免手動干預的 systemd 服務            |
| MLX / vLLM / SGLang                              | 具備 OpenAI 相容 HTTP 端點的高輸送量自託管服務             |
| LiteLLM / OAI-proxy / 自訂 OpenAI 相容代理伺服器 | 您位於另一個模型 API 之前，且需要 OpenClaw 將其視為 OpenAI |

當後端支援時（LM Studio 支援），請使用 Responses API (`api: "openai-responses"`)。否則請堅持使用 Chat Completions (`api: "openai-completions"`)。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 使用者：** 官方的 Ollama Linux 安裝程式會啟用帶有 `Restart=always` 的 systemd 服務。在 WSL2 GPU 設定上，自動啟動可能會在開機期間重新載入最後一個模型並釘選主機記憶體。如果您在啟用 Ollama 後 WSL2 VM 反覆重啟，請參閱 [WSL2 當機迴圈](/zh-Hant/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推薦：LM Studio + 大型本機模型 (Responses API)

目前最佳的本機堆疊。在 LM Studio 中載入大型模型（例如：完整版的 Qwen、DeepSeek 或 Llama 版本），啟用本機伺服器（預設 `http://127.0.0.1:1234`），並使用 Responses API 將推理過程與最終文字分開。

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

**設定檢查清單**

- 安裝 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載**最大的可用模型版本**（避免 "small"/高度量化的變體），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出該模型。
- 將 `my-local-model` 替換為 LM Studio 中顯示的實際模型 ID。
- 保持模型已載入；冷啟動會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，這樣只會發送最終文字。

即使在本機執行時也要保留託管模型的設定；使用 `models.mode: "merge"` 以便保持備援方案可用。

### 混合設定：託管為主，本機為備援

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

### 本機優先並搭配託管安全網

交換主要和備援的順序；保留相同的供應商區塊和 `models.mode: "merge"`，以便在本機機器停機時能備援至 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也有託管的 MiniMax/Kimi/GLM 變體，具備區域固定的端點（例如：美國託管）。在那裡選擇區域變體，以將流量保留在您選擇的司法管轄區內，同時仍使用 `models.mode: "merge"` 進行 Anthropic/OpenAI 備援。
- 純本機仍然是最強隱私的路徑；當您需要供應商功能但想控制資料流向時，託管的區域路由是折衷方案。

## 其他 OpenAI 相容的本機代理

MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自訂
閘道，如果它們提供 OpenAI 風格的 `/v1/chat/completions`
端點即可運作。除非後端明確記載支援 `/v1/responses`，否則請使用 Chat Completions 介接器。將上述供應商區塊替換為您的
端點和模型 ID：

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

如果在具有 `baseUrl` 的自訂提供者上省略了 `api`，OpenClaw 預設為
`openai-completions`。諸如 `127.0.0.1` 的回送端點會自動受信；
LAN、tailnet 和私人 DNS 端點仍然需要
`request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 值是針對提供者的本機設定。請勿
在其中包含提供者前綴。例如，使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 啟動的 MLX 伺服器應使用此
catalog id 和 model ref：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本機或代理的視覺模型上設定 `input: ["text", "image"]`，以便將
圖像附件插入代理的對話輪次中。互動式自訂提供者入門流程會推斷常見的視覺模型 ID，並僅詢問未知的名稱。
非互動式入門流程使用相同的推斷；對於未知的視覺 ID 請使用 `--custom-image-input`，
當一個看似常見的模型在您的端點後實際上是純文字模型時，請使用 `--custom-text-input`。

保留 `models.mode: "merge"`，以便託管模型保持可用作為後備。
在提高 `agents.defaults.timeoutSeconds` 之前，請對緩慢的本機或遠端模型
伺服器使用 `models.providers.<id>.timeoutSeconds`。提供者逾時僅適用於模型 HTTP 請求，包括連線、標頭、主體串流，
以及總共的 guarded-fetch 中止。

<Note>對於自訂 OpenAI 相容提供者，當 `baseUrl` 解析為回送位址、私人 LAN、`.local` 或純主機名稱時，允許保存非機密的本機標記（例如 `apiKey: "ollama-local"`）。OpenClaw 會將其視為有效的本機憑證，而不是報告遺失金鑰。對於任何接受公開主機名稱的提供者，請使用真實值。</Note>

關於本機/代理 `/v1` 後端的行為註記：

- OpenClaw 將這些視為代理風格的 OpenAI 相容路由，而非原生的
  OpenAI 端點
- 原生的 OpenAI 專用請求塑形在此不適用：沒有
  `service_tier`，沒有 Responses `store`，沒有 OpenAI reasoning-compat payload
  塑形，也沒有 prompt-cache 提示
- 隱藏的 OpenClaw 歸屬標頭 (`originator`, `version`, `User-Agent`)
  不會注入到這些自訂代理 URL 中

針對較嚴格的 OpenAI 相容後端的相容性說明：

- 部分伺服器在 Chat Completions 上僅接受字串 `messages[].content`，而不接受
  結構化的內容部分陣列。請為這些端點設定
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 部分本地模型會以文字形式發出獨立的括號工具請求，例如
  `[tool_name]` 後接 JSON 以及 `[END_TOOL_REQUEST]`。僅當名稱完全符合
  該輪次已註冊的工具時，OpenClaw 才會將其提升為真實的工具呼叫；否則，該區塊將被視為不支援的文字，並
  對使用者可見的回覆隱藏。
- 如果模型發出 JSON、XML 或 ReAct 風格的文字，看起來像是工具呼叫，
  但供應商未發出結構化的呼叫，OpenClaw 會將其保留為
  文字並記錄警告，包含執行 ID、供應商/模型、偵測到的模式，以及
  可用時的工具名稱。請將此視為供應商/模型工具呼叫
  的不相容性，而非已完成的工具執行。
- 如果工具以助理文字形式出現而非執行，例如原始 JSON、
  XML、ReAct 語法，或供應商回應中的空 `tool_calls` 陣列，
  請先確認伺服器正在使用具備工具呼叫能力的聊天範本/解析器。對於
  僅在強制使用工具時解析器才會運作的 OpenAI 相容 Chat Completions 後端，請設定每個模型的請求覆寫，而不是依賴文字
  解析：

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

  僅對每個正常輪次都應呼叫工具的模型/工作階段使用此設定。
  這會覆寫 OpenClaw 的預設代理值 `tool_choice: "auto"`。
  將 `local/my-local-model` 替換為 `openclaw models list` 顯示的確切供應商/模型參照。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自訂的 OpenAI 相容模型接受內建設定檔以外的 OpenAI 推理投入
  請在模型相容性區塊中宣告它們。在此新增 `"xhigh"`
  會讓 `/think xhigh`、工作階段選擇器、Gateway 驗證和 `llm-task`
  驗證對該已設定的供應商/模型參照顯示該等級：

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

## 較小或較嚴格的後端

如果模型載入乾淨，但完整的代理輪次運作異常，請採用由上而下的方式 — 先確認傳輸，再縮小問題範圍。

1. **確認本地模型本身有回應。** 不使用工具，不包含代理上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **確認 Gateway 路由。** 僅發送提供的提示 — 跳過對話紀錄、AGENTS 啟動程序、context-engine 組裝、工具以及捆綁的 MCP 伺服器，但仍會執行 Gateway 路由、驗證和提供者選擇：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **嘗試 lean 模式。** 如果兩項探測都通過，但真實的代理輪次因格式錯誤的工具呼叫或過大的提示而失敗，請啟用 `agents.defaults.experimental.localModelLean: true`。它會移除三個最重的預設工具（`browser`、`cron`、`message`），讓提示形狀更小且不那麼脆弱。請參閱 [實驗性功能 → 本地模型 lean 模式](/zh-Hant/concepts/experimental-features#local-model-lean-mode) 以了解完整說明、使用時機，以及如何確認已開啟。

4. **作為最後手段，完全停用工具。** 如果 lean 模式仍不足，請為該模型項目設定 `models.providers.<provider>.models[].compat.supportsTools: false`。代理隨後將在該模型上無需工具呼叫地運作。

5. **除此之外，瓶頸在於上游。** 如果在啟用 lean 模式和 `supportsTools: false` 後，後端僅在較大的 OpenClaw 執行中失敗，其餘問題通常在於上游模型或伺服器容量 — 上下文視窗、GPU 記憶體、kv-cache 驅逐或後端錯誤。此時並非 OpenClaw 的傳輸層問題。

## 疑難排解

- Gateway 可以連接到代理程式嗎？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載？請重新載入；冷啟動是常見的「懸置」原因。
- 本地伺服器顯示 `terminated`、`ECONNRESET`，或在輪次中途關閉串流嗎？
  OpenClaw 會在診斷資訊中記錄低基數的 `model.call.error.failureKind` 以及
  OpenClaw 程序的 RSS/heap 快照。針對 LM Studio/Ollama 的記憶體壓力，請將該時間戳記與伺服器紀錄或 macOS 當機 /
  jetsam 紀錄進行比對，以確認模型伺服器是否終止。
- OpenClaw 根據檢測到的模型視窗或無限制模型視窗（當 `agents.defaults.contextTokens` 降低有效視窗時）推導出上下文視窗預檢閾值。當低於 20% 時會發出警告，底限為 **8k**。強制阻擋使用 10% 閾值，底限為 **4k**，並上限至有效上下文視窗，以免過大的模型元數據拒絕原本有效的使用者上限。如果您遇到該預檢，請提高伺服器/模型上下文限制或選擇更大的模型。
- 出現上下文錯誤？請降低 `contextWindow` 或提高您的伺服器限制。
- OpenAI 相容伺服器傳回 `messages[].content ... expected a string`？
  在該模型項目中加入 `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 呼叫有效，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失敗？請先檢查提供者 URL、模型參照、auth
  標記和伺服器日誌；本地 `model run` 不包含代理工具。
  如果本地 `model run` 成功但較大的代理回合失敗，請使用 `localModelLean` 或 `compat.supportsTools: false` 來減少代理工具範圍。
- 工具呼叫以原始 JSON/XML/ReAct 文字顯示，或提供者傳回空的
  `tool_calls` 陣列？請勿加入將助手文字盲目轉換為工具執行的
  代理。請先修正伺服器聊天範本/解析器。如果
  模型僅在強制使用工具時才有效，請在上方加入每個模型的
  `params.extra_body.tool_choice: "required"` 覆蓋，並僅在每個回合都預期有工具呼叫的階段中使用該模型項目。
- 安全性：本地模型會跳過提供者端過濾器；請保持代理精簡並開啟壓縮以限制提示詞注入的影響範圍。

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
