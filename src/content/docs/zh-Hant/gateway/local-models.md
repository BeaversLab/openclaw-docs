---
summary: "在本機 LLM 上執行 OpenClaw（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

# 本地模型

本地運行是可行的，但 OpenClaw 預期具備長上下文 + 強大的防提示注入防禦。顯卡過小會截斷上下文並導致安全性洩漏。目標要高：**≥2 台全配 Mac Studio 或等效 GPU 裝置（約 $30k+）**。單張 **24 GB** GPU 僅適合較輕量的提示詞，且延遲較高。請使用**您能運行的最大 / 完整版模型變體**；過度量化或「小型」檢查點會提高提示注入風險（請參閱 [安全性](/en/gateway/security)）。

如果您想要最低摩擦力的本地設置，請從 [Ollama](/en/providers/ollama) 和 `openclaw onboard` 開始。本頁面是針對高端本地堆疊和自訂 OpenAI 相容本地伺服器的觀點指南。

## 推薦：LM Studio + 大型本地模型（Responses API）

目前最佳的本地堆疊。在 LM Studio 中載入大型模型（例如，完整版的 Qwen、DeepSeek 或 Llama 版本），啟用本地伺服器（預設 `http://127.0.0.1:1234`），並使用 Responses API 將推理與最終文字分開。

```json5
{
  agents: {
    defaults: {
      model: { primary: “lmstudio/my-local-model” },
      models: {
        “anthropic/claude-opus-4-6”: { alias: “Opus” },
        “lmstudio/my-local-model”: { alias: “Local” },
      },
    },
  },
  models: {
    mode: “merge”,
    providers: {
      lmstudio: {
        baseUrl: “http://127.0.0.1:1234/v1”,
        apiKey: “lmstudio”,
        api: “openai-responses”,
        models: [
          {
            id: “my-local-model”,
            name: “Local Model”,
            reasoning: false,
            input: [“text”],
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
- 在 LM Studio 中，下載**可用的最大模型版本**（避免「小型」/過度量化變體），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了該模型。
- 將 `my-local-model` 替換為 LM Studio 中顯示的實際模型 ID。
- 保持模型載入狀態；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，以便僅發送最終文字。

即使在本地運行時，也要保持託管模型已配置；使用 `models.mode: "merge"` 以便保持備援可用。

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

交換主要和備援順序；保持相同的提供者區塊和 `models.mode: "merge"`，以便當本地裝置故障時，可以備援至 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也有託管的 MiniMax/Kimi/GLM 變體，具備區域鎖定的端點（例如，美國託管）。選擇該處的區域變體，讓流量保留在您選擇的司法管轄區，同時仍使用 `models.mode: "merge"` 進行 Anthropic/OpenAI 備援。
- 僅限本地（Local-only）仍然是隱私性最強的路徑；當您需要供應商功能但希望控制資料流時，託管的區域路由是折衷方案。

## 其他相容 OpenAI 的本機代理

vLLM、LiteLLM、OAI-proxy 或自訂閘道若公開 OpenAI 風格的 `/v1` 端點即可運作。將上方的供應商區塊替換為您的端點和模型 ID：

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
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

保留 `models.mode: "merge"`，以便託管模型作為後備保持可用。

## 疑難排解

- 閘道能連線到代理嗎？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載嗎？請重新載入；冷啟動是常見的「卡住」原因。
- 發生內文錯誤嗎？降低 `contextWindow` 或提高您的伺服器限制。
- 安全性：本機模型會跳過供應商端的過濾器；請保持代理範圍狹窄並開啟壓縮，以限制提示詞注入的爆發半徑。
