---
summary: "在本機 LLM 上執行 OpenClaw（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本機模型"
---

本地模型是可行的。它們也對硬體、上下文大小和提示注入防禦提出了更高的要求 —— 小型或過度量化的顯卡會截斷上下文並導致安全性洩漏。本頁是高端本地堆疊和自訂相容 OpenAI 的本地伺服器的觀點指南。為了獲得最低摩擦的上手體驗，請從 [LM Studio](/zh-Hant/providers/lmstudio) 或 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。

對於應僅在選定的模型需要時才啟動的本地伺服器，請參閱
[本地模型服務](/zh-Hant/gateway/local-model-services)。

## 硬體底線

目標要高：為了舒適的 Agent 迴圈，需要 **≥2 台滿配的 Mac Studio 或同等的 GPU 裝置（約 $30k+）**。單一 **24 GB** GPU 僅適合延遲較高的較輕量提示。始終運行 **你能託管的最大 / 完整尺寸變體**；小型或重度量化的檢查點會增加提示注入風險（請參閱 [安全性](/zh-Hant/gateway/security)）。

## 選擇後端

| 後端                                         | 使用時機                                                          |
| -------------------------------------------- | ----------------------------------------------------------------- |
| [ds4](/zh-Hant/providers/ds4)                     | 在 macOS Metal 上運行相容 OpenAI 工具呼叫的本地 DeepSeek V4 Flash |
| [LM Studio](/zh-Hant/providers/lmstudio)          | 首次本地設定、GUI 載入器、原生 Responses API                      |
| LiteLLM / OAI-proxy / 自訂相容 OpenAI 的代理 | 你位於另一個模型 API 之前，並且需要 OpenClaw 將其視為 OpenAI      |
| MLX / vLLM / SGLang                          | 具備相容 OpenAI 的 HTTP 端點的高吞吐量自託管服務                  |
| [Ollama](/zh-Hant/providers/ollama)               | CLI 工作流程、模型庫、免手動干預的 systemd 服務                   |

當後端支援時，使用 Responses API (`api: "openai-responses"`)（LM Studio 支援）。否則，請堅持使用 Chat Completions (`api: "openai-completions"`)。

<Warning>**WSL2 + Ollama + NVIDIA/CUDA 使用者：** 官方 Ollama Linux 安裝程式會啟用具有 `Restart=always` 的 systemd 服務。在 WSL2 GPU 設定上，自動啟動可能會在開機期間重新載入最後一個模型並釘住主機記憶體。如果你的 WSL2 VM 在啟用 Ollama 後重複重新啟動，請參閱 [WSL2 當機迴圈](/zh-Hant/providers/ollama#wsl2-crash-loop-repeated-reboots)。</Warning>

## 推薦：LM Studio + 大型本地模型

目前最佳的本地堆疊。在 LM Studio 中載入大型模型（例如，完整尺寸的 Qwen、DeepSeek 或 Llama 版本），啟用本地伺服器（預設 `http://127.0.0.1:1234`），並使用 Responses API 將推理與最終文字分開。

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
- 在 LM Studio 中，下載 **可用的最大模型版本**（避免 "small"/重度量化版本），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了它。
- 將 `my-local-model` 替換為 LM Studio 中顯示的實際模型 ID。
- 保持模型載入；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，以便僅發送最終文字。

即使在本地運行時，也要保持託管模型的配置；使用 `models.mode: "merge"` 以便保持備援可用。

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

### 本地優先，搭配託管安全網

交換主備順序；保持相同的供應商區塊和 `models.mode: "merge"`，以便當本地主機關閉時，您可以備援到 Sonnet 或 Opus。

### 區域託管 / 數據路由

- OpenRouter 上也提供了託管的 MiniMax/Kimi/GLM 版本，並帶有區域固定的端點（例如，美國託管）。在那裡選擇區域版本，以便將流量保留在您選擇的管轄範圍內，同時仍使用 `models.mode: "merge"` 進行 Anthropic/OpenAI 備援。
- 僅本地仍然是隱私最強的路徑；當您需要供應商功能但希望控制數據流時，託管區域路由是中間立場。

## 其他 OpenAI 相容的本地代理

MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy 或自訂
閘道，只要它們公開 OpenAI 風格的 `/v1/chat/completions`
端點即可使用。除非後端明確記錄了
`/v1/responses` 支援，否則請使用 Chat Completions 配接器。將上面的供應商區塊替換為您的
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

如果在帶有 `baseUrl` 的自訂提供者上省略了 `api`，OpenClaw 會預設為
`openai-completions`。自訂/本機提供者項目會信任其精確設定的
`baseUrl` 來源以用於受防護的模型請求，包括 loopback、LAN、tailnet
和私人 DNS 主機。對於其他私人來源的請求仍然需要
`request.allowPrivateNetwork: true`；metadata/link-local 來源若未明確加入
則保持阻止。將其設定為 `false` 以選擇退出精確來源信任。

`models.providers.<id>.models[].id` 值是提供者本地的。請勿
在那裡包含提供者前綴。例如，使用
`mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 啟動的 MLX 伺服器應使用此
catalog ID 和模型參考：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本機或代理視覺模型上設定 `input: ["text", "image"]`，以便將圖片
附件插入代理回合中。互動式自訂提供者
入會推斷常見的視覺模型 ID，並僅詢問未知的名稱。
非互動式入會使用相同的推斷；對於未知的
視覺 ID 使用 `--custom-image-input`，或者當
外觀已知的模型在您的端點後僅為文字
時使用 `--custom-text-input`。

保留 `models.mode: "merge"`，以便託管模型保持可用作為後備。
對於緩慢的本機或遠端模型伺服器，在提高
`agents.defaults.timeoutSeconds` 之前，請先使用 `models.providers.<id>.timeoutSeconds`。提供者逾時
僅適用於模型 HTTP 請求，包括連線、標頭、主體串流
和總共的受防護提取中止。如果代理或執行逾時較低，也請
提高該上限，因為提供者逾時無法延長整個代理執行。

<Note>對於自訂 OpenAI 相容的提供者，當 `baseUrl` 解析為 loopback、私人 LAN、`.local` 或純主機名稱時，接受保存非秘密的本機標記（例如 `apiKey: "ollama-local"`）。OpenClaw 會將其視為有效的本機憑證，而不是報告缺少金鑰。對於任何接受公開主機名稱的提供者，請使用真實值。</Note>

關於本機/代理 `/v1` 後端的行為說明：

- OpenClaw 將這些視為代理風格的 OpenAI 相容路由，而非原生
  OpenAI 端點
- 原生 OpenAI 專用的請求整形在此不適用：無
  `service_tier`、無 Responses `store`、無 OpenAI 推理相容 Payload
  整形，以及無提示快取提示
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
  不會注入到這些自訂代理 URL 中

針對較嚴格的 OpenAI 相容後端的相容性說明：

- 部分伺服器在 Chat Completions 上僅接受字串 `messages[].content`，不接受
  結構化的 content-part 陣列。請為
  這些端點設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 部分本地模型會以文字形式發出獨立的括號工具請求，例如
  `[tool_name]` 後接 JSON 以及 `[END_TOOL_REQUEST]`。僅當名稱完全符合該輪次
  的已註冊工具時，OpenClaw 才會將其提升為真正的工具呼叫；否則該區塊會被視為不支援的文字
  並對使用者可見的回覆隱藏。
- 如果模型發出了 JSON、XML 或 ReAct 風格的文字，看起來像工具呼叫
  但供應商未發出結構化調用，OpenClaw 會將其保留為
  文字，並記錄包含執行 ID、供應商/模型、偵測到的模式以及
  工具名稱（如果有的話）的警告。請將其視為供應商/模型的工具呼叫
  不相容問題，而非已完成的工具執行。
- 如果工具以助理文字形式出現而非執行，例如原始 JSON、
  XML、ReAct 語法，或供應商回應中出現空的 `tool_calls` 陣列，
  首先請驗證伺服器正在使用具備工具呼叫能力的聊天範本/解析器。對於
  其解析器僅在強制使用工具時才有效的 OpenAI 相容 Chat Completions 後端，請設定每個模型的請求覆寫，而非依賴文字
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

  僅針對每個正常輪次都應呼叫工具的模型/工作階段使用此功能。
  它會覆寫 OpenClaw 的預設代理值 `tool_choice: "auto"`。
  將 `local/my-local-model` 替換為 `openclaw models list` 顯示的確切供應商/模型參照。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自訂的 OpenAI 相容模型接受內建設定檔以外的 OpenAI 推理努力，請在模型相容區塊中宣告它們。在此處新增 `"xhigh"` 會讓 `/think xhigh`、session 選擇器、Gateway 驗證以及 `llm-task` 驗證針對該設定的供應商/模型參照暴露該等級：

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

如果模型載入乾淨但完整的 agent 輪次表現異常，請由上至下進行 — 先確認傳輸，然後縮小範圍。

1. **確認本地模型本身有回應。** 無工具、無 agent 語境：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **確認 Gateway 路由。** 僅傳送提供的提示 — 略過逐字稿、AGENTS 引導程序、context-engine 組裝、工具和捆綁的 MCP 伺服器，但仍會執行 Gateway 路由、驗證和供應商選擇：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **嘗試精簡模式。** 如果這兩項探測都通過，但真實的 agent 輪次因格式錯誤的工具呼叫或過大的提示而失敗，請啟用 `agents.defaults.experimental.localModelLean: true`。它會捨棄三個最重的預設工具 (`browser`、`cron`、`message`)，讓提示形狀更小且不那麼脆弱。請參閱 [Experimental Features → Local model lean mode](/zh-Hant/concepts/experimental-features#local-model-lean-mode) 以了解完整說明、使用時機，以及如何確認它已開啟。

4. **完全停用工具作為最後手段。** 如果精簡模式仍不足夠，請為該模型條目設定 `models.providers.<provider>.models[].compat.supportsTools: false`。Agent 將在該模型上於不使用工具呼叫的情況下運作。

5. **除此之外，瓶頸在於上游。** 如果在精簡模式和 `supportsTools: false` 之後，後端仍僅在較大的 OpenClaw 執行時失敗，剩餘問題通常是上游模型或伺服器容量 — 語境視窗、GPU 記憶體、kv-cache 驅逐，或是後端錯誤。此時問題並非出在 OpenClaw 的傳輸層。

## 疑難排解

- Gateway 可以連線到代理伺服器嗎？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型是否已卸載？請重新載入；冷啟動是常見的「懸置」原因。
- 本地伺服器回報 `terminated`、`ECONNRESET`，或在對話中途關閉串流？
  OpenClaw 會在診斷中記錄一個低基數的 `model.call.error.failureKind` 以及
  OpenClaw 處理程序的 RSS/heap 快照。若要確認 LM Studio/Ollama 的記憶體壓力，
  請將該時間戳記與伺服器日誌或 macOS 當機 / jetsam 日誌進行比對，
  以確認模型伺服器是否被終止。
- OpenClaw 會根據偵測到的模型視窗，或是當 `agents.defaults.contextTokens` 降低有效視窗時的無上限模型視窗，來推導語境視窗預檢閾值。當數值低於 20% 且以 **8k** 為下限時會發出警告。強制阻擋則使用 10% 閾值與 **4k** 下限，並以有效語境視窗為上限，以免過大的模型元資料拒絕了原本有效的使用者設定上限。如果您遇到該預檢錯誤，請提高伺服器/模型的語境限制，或是選擇更大的模型。
- 發生語境錯誤？請降低 `contextWindow` 或提高您的伺服器限制。
- OpenAI 相容伺服器回傳 `messages[].content ... expected a string`？
  在該模型項目中加入 `compat.requiresStringContent: true`。
- OpenAI 相容伺服器回傳 `validation.keys`，或表示訊息項目僅允許 `role` 和 `content`？
  在該模型項目中加入 `compat.strictMessageKeys: true`。
- 直接的小型 `/v1/chat/completions` 呼叫正常運作，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失敗？請先檢查提供者 URL、模型參照、
  驗證標記和伺服器日誌；本地的 `model run` 不包含代理工具。
  如果本地的 `model run` 成功但較大的代理回合失敗，
  請使用 `localModelLean` 或 `compat.supportsTools: false` 來減少代理工具的使用範圍。
- 工具呼叫顯示為原始 JSON/XML/ReAct 文字，或是提供者回傳空的
  `tool_calls` 陣列？請勿盲目地新增將助理文字轉換為工具執行的代理。
  請先修正伺服器的聊天範本/解析器。如果模型僅在強制使用工具時才正常運作，
  請在上文新增各別模型的 `params.extra_body.tool_choice: "required"` 覆寫設定，並僅在預期每輪都會進行工具呼叫的
  工作階段中使用該模型項目。
- 安全性：本地模型會跳過提供商端的過濾器；請保持代理（agents）的範圍狹窄並開啟壓縮（compaction），以限制提示詞注入的影響範圍。

## 相關

- [組態參考](/zh-Hant/gateway/configuration-reference)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
