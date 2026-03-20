---
summary: "在本機 LLM（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）上執行 OpenClaw"
read_when:
  - 您想從自己的 GPU 主機提供模型服務
  - 您正在連接 LM Studio 或 OpenAI 相容的代理伺服器
  - 您需要最安全的本機模型指引
title: "本機模型"
---

# 本機模型

本機部署是可行的，但 OpenClaw 需要大型上下文以及對提示注入的強大防護。顯卡容量較小會截斷上下文並洩漏安全性資訊。目標要定高：**≥2 台滿配 Mac Studios 或同等的 GPU 設備（約 $30k+）**。單一 **24 GB** GPU 僅適合延遲較高的輕量級提示。使用**您所能執行的最大 / 完整尺寸模型變體**；過度量化或「小型」的檢查點會增加提示注入的風險（請參閱 [安全性](/zh-Hant/gateway/security)）。

如果您想要設定最低阻力的本機環境，請從 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。本頁是針對高階本機堆疊和自訂 OpenAI 相容本機伺服器的觀點指引。

## 推薦：LM Studio + MiniMax M2.5（Responses API，完整尺寸）

目前最佳的本機堆疊。在 LM Studio 中載入 MiniMax M2.5，啟用本機伺服器（預設 `http://127.0.0.1:1234`），並使用 Responses API 將推理與最終文字分開。

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

**設定檢查清單**

- 安裝 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載**可用的最大 MiniMax M2.5 版本**（避免「小型」/ 過度量化變體），啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了該模型。
- 保持模型載入狀態；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，以便只傳送最終文字。

即使在執行本機時，也要保持託管模型的設定；使用 `models.mode: "merge"` 以便備援方案保持可用。

### 混合設定：託管為主，本機為備援

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
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

### 本機優先並搭配託管安全網

交換主要與備援順序；保持相同的供應者區塊和 `models.mode: "merge"`，以便在本機設備停機時能備援至 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也提供託管的 MiniMax/Kimi/GLM 變體，並具備區域固定端點（例如美國託管）。在那裡選擇區域變體，可讓流量保留在您選擇的司法管轄區內，同時仍使用 `models.mode: "merge"` 作為 Anthropic/OpenAI 的備援。
- 僅限本地仍是隱私性最強的路徑；當您需要供應商功能但希望控制資料流向時，託管區域路由則是折衷方案。

## 其他相容 OpenAI 的本地代理

如果 vLLM、LiteLLM、OAI-proxy 或自訂閘道公開了 OpenAI 風格的 `/v1` 端點，即可使用。將上述的 provider 區塊替換為您的端點和模型 ID：

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

保留 `models.mode: "merge"`，以便託管模型保持可用作為備援。

## 疑難排解

- 閘道能否連線到代理？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型是否已卸載？重新載入；冷啟動是常見的「卡住」原因。
- 出現 Context 錯誤？降低 `contextWindow` 或提高您的伺服器限制。
- 安全性：本地模型會跳過供應商端的過濾器；請保持代理的範圍狹窄並啟用壓縮，以限制提示注入的爆炸半徑。

import en from "/components/footer/en.mdx";

<en />
