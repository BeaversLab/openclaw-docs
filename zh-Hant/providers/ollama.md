---
summary: "使用 Ollama 執行 OpenClaw（雲端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama 是一個本機 LLM 執行環境，可讓您輕鬆在機器上執行開源模型。OpenClaw 整合了 Ollama 的原生 API (`/api/chat`)，支援串流和工具呼叫，並且當您選擇加入 `OLLAMA_API_KEY`（或驗證設定檔）且未定義明確的 `models.providers.ollama` 項目時，可以自動探索本機 Ollama 模型。

<Warning>
  **遠端 Ollama 使用者**：請不要在 OpenClaw 中使用 `/v1` OpenAI 相容 URL
  (`http://host:11434/v1`)。這會導致工具呼叫失效，且模型可能會將原始工具 JSON
  以純文字形式輸出。請改用原生的 Ollama API URL：`baseUrl: "http://host:11434"` (不要 `/v1`)。
</Warning>

## 快速開始

### 入門引導 (推薦)

設定 Ollama 最快的方式是透過入門引導：

```bash
openclaw onboard
```

從供應商列表中選取 **Ollama**。入門引導將會：

1. 詢問可連線至您實例的 Ollama 基礎 URL (預設為 `http://127.0.0.1:11434`)。
2. 讓您選擇 **Cloud + Local** (雲端模型與本地模型) 或 **Local** (僅限本地模型)。
3. 如果您選擇 **Cloud + Local** 且尚未登入 ollama.com，則會開啟瀏覽器登入流程。
4. 探索可用的模型並建議預設值。
5. 如果選取的模型在本地無法使用，將自動下載該模型。

同時也支援非互動模式：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

可選指定自訂基礎 URL 或模型：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### 手動設定

1. 安裝 Ollama：[https://ollama.com/download](https://ollama.com/download)

2. 如果您想要本地推理，請拉取本地模型：

```bash
ollama pull glm-4.7-flash
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. 如果您也想要雲端模型，請登入：

```bash
ollama signin
```

4. 執行引導程式並選擇 `Ollama`：

```bash
openclaw onboard
```

- `Local`：僅限本地模型
- `Cloud + Local`：本地模型加上雲端模型
- 雲端模型（例如 `kimi-k2.5:cloud`、`minimax-m2.5:cloud` 和 `glm-5:cloud`）**不**需要本地 `ollama pull`

OpenClaw 目前建議：

- 本地預設：`glm-4.7-flash`
- 雲端預設：`kimi-k2.5:cloud`、`minimax-m2.5:cloud`、`glm-5:cloud`

5. 如果您偏愛手動設定，請直接為 OpenClaw 啟用 Ollama（任何值皆可；Ollama 不需要真實的金鑰）：

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. 檢查或切換模型：

```bash
openclaw models list
openclaw models set ollama/glm-4.7-flash
```

7. 或在設定中設定預設值：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/glm-4.7-flash" },
    },
  },
}
```

## 模型探索（隱式提供者）

當您設定 `OLLAMA_API_KEY`（或驗證設定檔）且**未**定義 `models.providers.ollama` 時，OpenClaw 會從位於 `http://127.0.0.1:11434` 的本機 Ollama 實例探索模型：

- 查詢 `/api/tags`
- 使用盡力而為的 `/api/show` 查詢來讀取 `contextWindow`（如果有提供）
- 使用模型名稱啟發法（`r1`、`reasoning`、`think`）標記 `reasoning`
- 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限
- 將所有成本設定為 `0`

這避免了手動輸入模型條目，同時確保目錄與本地 Ollama 實例保持同步。

若要查看有哪些可用的模型：

```bash
ollama list
openclaw models list
```

若要新增模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型將會自動被發現並可供使用。

如果您明確設定了 `models.providers.ollama`，將會跳過自動探索，您必須手動定義模型（見下文）。

## 設定

### 基本設定（隱式探索）

啟用 Ollama 最簡單的方法是透過環境變數：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 明確設定（手動模型）

在以下情況使用明確設定：

- Ollama 運行於其他主機/連接埠。
- 您想要強制指定特定的上下文視窗或模型列表。
- 您想要完全手動的模型定義。

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "gpt-oss:20b",
            name: "GPT-OSS 20B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

如果設定了 `OLLAMA_API_KEY`，您可以在供應商條目中省略 `apiKey`，OpenClaw 將會填入它以進行可用性檢查。

### 自訂基礎 URL（明確設定）

如果 Ollama 運行在不同的主機或連接埠上（顯式配置會停用自動探索，因此請手動定義模型）：

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
        api: "ollama", // Set explicitly to guarantee native tool-calling behavior
      },
    },
  },
}
```

<Warning>
  請勿在 URL 中新增 `/v1`。`/v1` 路徑使用的是 OpenAI 相容模式，其中的工具呼叫並不
  可靠。請使用不含路徑後綴的 Ollama 基礎 URL。
</Warning>

### 模型選擇

完成配置後，您所有的 Ollama 模型即可使用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## 雲端模型

雲端模型讓您可以與本地模型並行運行雲端託管的模型（例如 `kimi-k2.5:cloud`、`minimax-m2.5:cloud`、`glm-5:cloud`）。

若要使用雲端模型，請在設定過程中選取 **Cloud + Local** 模式。精靈會檢查您是否已登入，並在需要時開啟瀏覽器登入流程。如果無法驗證身份驗證，精靈將還原為本地模型預設值。

您也可以直接在 [ollama.com/signin](https://ollama.com/signin) 登入。

## 進階

### 推理模型

OpenClaw 預設將名稱包含 `deepseek-r1`、`reasoning` 或 `think` 等的模型視為具備推理能力：

```bash
ollama pull deepseek-r1:32b
```

### 模型成本

Ollama 是免費且在本機運行的，因此所有模型成本均設為 $0。

### 串流設定

OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，它完全同時支援串流和工具呼叫。不需要特殊的設定。

#### 舊版 OpenAI 相容模式

<Warning>
  **工具呼叫在 OpenAI 相容模式下不可靠。** 僅在您需要代理的 OpenAI
  格式且不依賴原生工具呼叫行為時才使用此模式。
</Warning>

如果您需要改用 OpenAI 相容端點（例如：在僅支援 OpenAI 格式的代理後面），請明確設定 `api: "openai-completions"`：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: true, // default: true
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

此模式可能不支援同時進行串流和工具呼叫。您可能需要在模型設定中停用串流，方法是使用 `params: { streaming: false }`。

當 Ollama 使用 `api: "openai-completions"` 時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 無聲地回退到 4096 的上下文視窗。如果您的代理或上游伺服器拒絕未知的 `options` 欄位，請停用此行為：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: false,
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

### Context windows

對於自動探索到的模型，OpenClaw 會使用 Ollama 回報的上下文視窗（如果可用），否則會回退到 OpenClaw 使用的預設 Ollama 上下文視窗。您可以在明確的提供者設定中覆寫 `contextWindow` 和 `maxTokens`。

## 疑難排解

### 未偵測到 Ollama

請確保 Ollama 正在運行，並且您設定了 `OLLAMA_API_KEY` （或驗證設定檔 profile），且您**沒有**定義明確的 `models.providers.ollama` 項目：

```bash
ollama serve
```

並且 API 可以存取：

```bash
curl http://localhost:11434/api/tags
```

### 沒有可用的模型

如果您的模型未被列出，請執行下列其中一項：

- 在本地端拉取模型，或
- 在 `models.providers.ollama` 中明確定義模型。

若要新增模型：

```bash
ollama list  # See what's installed
ollama pull glm-4.7-flash
ollama pull gpt-oss:20b
ollama pull llama3.3     # Or another model
```

### 連線被拒

請檢查 Ollama 是否在正確的連接埠上運行：

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## 參見

- [模型供應商](/zh-Hant/concepts/model-providers) - 所有供應商的概覽
- [模型選擇](/zh-Hant/concepts/models) - 如何選擇模型
- [設定](/zh-Hant/gateway/configuration) - 完整設定參考

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
