---
summary: "在本機 LLM 上執行 OpenClaw (LM Studio, vLLM, LiteLLM, 自訂 OpenAI 端點)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本機模型"
---

# 本機模型

在本機執行是可行的，但 OpenClaw 需要大量的上下文以及針對提示詞注入的強大防禦機制。較小的顯卡會截斷上下文並導致安全性洩漏。目標要高：**≥2 台滿配的 Mac Studio 或同等的 GPU 設備 (~$30k+)**。單一的 **24 GB** GPU 僅適用於處理較輕量的提示詞，且延遲較高。請使用**您所能執行的最大 / 完整尺寸模型變體**；過度量化或「小型」的檢查點會增加提示詞注入的風險 (請參閱 [安全性](/zh-Hant/gateway/security))。

如果您想要最低阻力的本地設置，請從 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。本頁面是針對高端本地堆疊和自訂 OpenAI 相容本地伺服器的權威指南。

## 推薦：LM Studio + MiniMax M2.5 (Responses API, 完整版)

目前最佳的本地堆疊。在 LM Studio 中載入 MiniMax M2.5，啟用本地伺服器（預設 `http://127.0.0.1:1234`），並使用 Responses API 將推理與最終文字分開。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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

- 安裝 LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載 **最大的可用 MiniMax M2.5 版本**（避免「小型」/重度量化變體），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 已列出它。
- 保持模型已載入；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，以便僅發送最終文字。

即使在執行本地模型時，也要保持託管模型的配置；使用 `models.mode: "merge"` 以便讓備援方案保持可用。

### 混合配置：託管為主，本地備援

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/minimax-m2.5-gs32": { alias: "MiniMax Local" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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

交換主要和備援的順序；保持相同的提供者區塊和 `models.mode: "merge"`，以便當本地機器關閉時，您可以備援到 Sonnet 或 Opus。

### 區域託管 / 資料路由

- 託管的 MiniMax/Kimi/GLM 變體也存在於 OpenRouter 上，並具備區域綁定的端點（例如，美國託管）。請在那裡選擇區域變體，以將流量保留在您選擇的司法管轄區內，同時仍使用 `models.mode: "merge"` 進行 Anthropic/OpenAI 備援。
- 僅使用本地仍是隱私最強的路徑；當您需要供應商功能但想控制資料流向時，託管的區域路由是折衷方案。

## 其他相容 OpenAI 的本地代理

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

保留 `models.mode: "merge"`，以便託管模型可作為備案使用。

## 疑難排解

- 閘道能連上代理？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載？請重新載入；冷啟動是常見的「卡住」原因。
- 發生 Context 錯誤？請降低 `contextWindow` 或提高伺服器限制。
- 安全性：本地模型會跳過供應商端的篩選器；請保持代理人範圍狹窄並開啟壓縮功能，以限制提示詞注入的影響範圍。
