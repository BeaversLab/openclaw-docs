---
summary: "在本機 LLM 上執行 OpenClaw (LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本機模型"
---

# 本機模型

本機部署可行，但 OpenClaw 需要長上下文 + 強大的提示詞注入防禦。小顯卡會截斷上下文並導致安全性洩漏。目標要高：**≥2 台滿配的 Mac Studio 或同等 GPU 設備 (~$30k+)**。單一 **24 GB** GPU 僅適用於延遲較高的輕量級提示詞。使用您能執行的**最大 / 完整版模型變體**；過度量化或「小型」檢查點會增加提示詞注入的風險（請參閱 [安全性](/zh-Hant/gateway/security)）。

如果您想要最低阻力的本機設定，請從 [Ollama](/zh-Hant/providers/ollama) 和 `openclaw onboard` 開始。本頁面是針對高階本機堆疊和自訂 OpenAI 相容本機伺服器的觀點指南。

## 推薦：LM Studio + MiniMax M2.5 (Responses API, 完整版)

目前最佳的本機堆疊。在 LM Studio 中載入 MiniMax M2.5，啟用本機伺服器 (預設 `http://127.0.0.1:1234`)，並使用 Responses API 將推理與最終文字分開。

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

- 安裝 LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下載**可用的最大 MiniMax M2.5 版本** (避免「小型」/過度量化變體)，啟動伺服器，確認 `http://127.0.0.1:1234/v1/models` 列出了它。
- 保持模型載入；冷載入會增加啟動延遲。
- 如果您的 LM Studio 版本不同，請調整 `contextWindow`/`maxTokens`。
- 對於 WhatsApp，請堅持使用 Responses API，這樣只會發送最終文字。

即使在本機執行時，也要保持託管模型的配置；使用 `models.mode: "merge"` 以便備援保持可用。

### 混合設定：託管為主，本機為備

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

### 本機優先，託管為安全網

交換主要和備援順序；保持相同的提供者區塊和 `models.mode: "merge"`，以便當本機設備故障時可以備援到 Sonnet 或 Opus。

### 區域託管 / 資料路由

- OpenRouter 上也存在代管的 MiniMax/Kimi/GLM 變體，並提供區域固定的端點（例如，美國代管）。請選擇那裡的區域變體，以便將流量保留在您選擇的司法管轄區內，同時仍使用 `models.mode: "merge"` 作為 Anthropic/OpenAI 的後備。
- 僅使用本地模式仍然是最強隱私的路徑；當您需要提供者功能但希望控制資料流時，代管的區域路由是中間立場。

## 其他 OpenAI 相容的本地代理

vLLM、LiteLLM、OAI-proxy 或自訂閘道如果公開 OpenAI 風格的 `/v1` 端點即可運作。將上方的提供者區塊替換為您的端點和模型 ID：

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

保留 `models.mode: "merge"`，以便代管模型保持可用作為後備。

## 故障排除

- 閘道可以連接到代理嗎？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載嗎？請重新載入；冷啟動是常見的「懸掛」原因。
- 發生內文錯誤嗎？降低 `contextWindow` 或提高您的伺服器限制。
- 安全性：本地模型會略過提供者端的過濾器；請保持代理狹窄並開啟壓縮功能，以限制提示詞注入的爆發半徑。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
