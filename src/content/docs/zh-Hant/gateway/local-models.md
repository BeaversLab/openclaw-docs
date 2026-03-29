---
summary: "在本機 LLM 上執行 OpenClaw（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

# 本地模型

本地部署是可行的，但 OpenClaw 期望具備大型上下文以及對提示注入的強力防禦。較小的顯卡會截斷上下文並洩漏安全性。目標要定高：**≥2 台滿配的 Mac Studio 或同等的 GPU 裝置（約 $30k+）**。單張 **24 GB** GPU 僅適合延遲較高的輕量級提示。請使用**您所能執行的最大 / 完整版模型變體**；過度量化或「小型」檢查點會提高提示注入的風險（請參閱 [安全性](/en/gateway/security)）。

如果您想要最低摩擦力的本地設置，請從 [Ollama](/en/providers/ollama) 和 `openclaw onboard` 開始。本頁面是針對高端本地堆疊和自訂 OpenAI 相容本地伺服器的觀點指南。

## 推薦：LM Studio + MiniMax M2.5 (Responses API, 完整版)

目前最佳的本地堆疊。在 LM Studio 中載入 MiniMax M2.5，啟用本地伺服器（預設 `http://127.0.0.1:1234`），並使用 Responses API 將推理與最終文字分離。

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

- 安裝 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載**可用的最大 MiniMax M2.5 版本**（避免「小型」/重度量化變體），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了該模型。
- 保持模型載入；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，這樣只會發送最終文字。

即使在執行本地版本時，也要保持託管模型已配置；使用 `models.mode: "merge"` 以便備援方案保持可用。

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

交換主要和備援順序；保持相同的供應商區塊和 `models.mode: "merge"`，以便當本地機器故障時，您可以備援至 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也存在託管的 MiniMax/Kimi/GLM 變體，並提供區域固定的端點（例如，美國託管）。在那裡選擇區域變體，以便在使用 `models.mode: "merge"` 作為 Anthropic/OpenAI 後備的同時，將流量保留在您選擇的管轄範圍內。
- 僅限本地仍然是最強的隱私途徑；當您需要提供商功能但希望控制數據流時，託管的區域路由是折衷方案。

## 其他 OpenAI 相容的本地代理

如果它們公開了 OpenAI 風格的 `/v1` 端點，vLLM、LiteLLM、OAI-proxy 或自訂閘道都可以使用。將上面的提供商區塊替換為您的端點和模型 ID：

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

## 故障排除

- 閘道可以連接到代理嗎？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型是否已卸載？重新加載；冷啟動是常見的「掛起」原因。
- 上下文錯誤？降低 `contextWindow` 或提高您的伺服器限制。
- 安全性：本地模型會跳過提供商端的過濾器；保持代理範圍狹窄並開啟壓縮，以限制提示注入的爆炸半徑。
