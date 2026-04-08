---
summary: "在本機 LLM 上執行 OpenClaw（LM Studio、vLLM、LiteLLM、自訂 OpenAI 端點）"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "本地模型"
---

# 本地模型

本地部署是可行的，但 OpenClaw 需要大上下文 + 對提示注入的強大防禦。小顯卡會截斷上下文並洩漏安全性。目標要高：**≥2 台滿配的 Mac Studio 或同等 GPU 設備（約 $30k+）**。單個 **24 GB** GPU 僅適合延遲較高的輕量級提示。使用你能運行的**最大 / 完整版模型變體**；過度量化或「小型」檢查點會增加提示注入風險（請參閱 [安全性](/en/gateway/security)）。

如果您想要最低摩擦力的本地設置，請從 [Ollama](/en/providers/ollama) 和 `openclaw onboard` 開始。本頁是針對高端本地堆疊和自訂 OpenAI 相容本地伺服器的觀點指南。

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

本地/代理 `/v1` 後端的行為說明：

- OpenClaw 將這些視為代理式 OpenAI 相容路由，而非原生
  OpenAI 端點
- 僅限原生 OpenAI 的請求整形在此不適用：無
  `service_tier`，無 Responses `store`，無 OpenAI 推理相容負載
  整形，且無提示快取提示
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
  不會注入到這些自訂代理 URL 中

## 疑難排解

- Gateway 可以連接到代理嗎？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型已卸載？重新載入；冷啟動是常見的「懸掛」原因。
- 出現上下文錯誤？降低 `contextWindow` 或提高您的伺服器限制。
- 安全性：本地模型跳過供應商端過濾器；保持代理狹窄並開啟壓縮以限制提示注入的爆炸範圍。
