---
summary: "使用 Ollama 執行 OpenClaw（雲端和本地模型）"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama 是一個本地 LLM 運行時，可讓您輕鬆在機器上執行開源模型。OpenClaw 整合了 Ollama 的原生 API (`/api/chat`)，支援串流和工具呼叫，並且當您選擇啟用 `OLLAMA_API_KEY` (或驗證設定檔) 且未定義明確的 `models.providers.ollama` 項目時，可以自動探索本地的 Ollama 模型。

<Warning>**遠端 Ollama 使用者**：請勿將 `/v1` OpenAI 相容 URL (`http://host:11434/v1`) 與 OpenClaw 搭配使用。這會導致工具呼叫失效，且模型可能會以純文字形式輸出原始的工具 JSON。請改用原生的 Ollama API URL：`baseUrl: "http://host:11434"` (不含 `/v1`)。</Warning>

## 快速開始

### 入門引導 (推薦)

設定 Ollama 最快的方法是透過入門引導：

```bash
openclaw onboard
```

從供應商清單中選取 **Ollama**。入門引導將會：

1. 詢問您的 Ollama 實例可連線的基礎 URL (預設為 `http://127.0.0.1:11434`)。
2. 讓您選擇 **雲端 + 本機** (雲端模型和本機模型) 或 **本機** (僅限本機模型)。
3. 如果您選擇 **雲端 + 本機** 且尚未登入 ollama.com，則會開啟瀏覽器登入流程。
4. 探索可用的模型並建議預設值。
5. 如果選取的模型在本機無法使用，則會自動拉取。

也支援非互動模式：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

選擇性地指定自訂基礎 URL 或模型：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### 手動設定

1. 安裝 Ollama：[https://ollama.com/download](https://ollama.com/download)

2. 如果您想要本機推論，請拉取本機模型：

```bash
ollama pull gemma4
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
- 雲端模型（例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud`）**不**需要本地的 `ollama pull`

OpenClaw 目前建議：

- 本地預設值：`gemma4`
- 雲端預設值：`kimi-k2.5:cloud`、`minimax-m2.7:cloud`、`glm-5.1:cloud`

5. 如果您偏好手動設定，請直接為 OpenClaw 啟用 Ollama（任何值皆可；Ollama 不需要真實金鑰）：

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. 檢查或切換模型：

```bash
openclaw models list
openclaw models set ollama/gemma4
```

7. 或在設定中設定預設值：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/gemma4" },
    },
  },
}
```

## 模型探索（隱式提供者）

當您設定 `OLLAMA_API_KEY` (或驗證設定檔) 且 **不** 定義 `models.providers.ollama` 時，OpenClaw 會從 `http://127.0.0.1:11434` 的本地 Ollama 實例探索模型：

- 查詢 `/api/tags`
- 使用盡力而為的 `/api/show` 查詢來讀取 `contextWindow` 並在可用時檢測功能（包括視覺功能）
- 對於由 `/api/show` 回報具有 `vision` 功能的模型，會被標記為支援圖像 (`input: ["text", "image"]`)，因此 OpenClaw 會自動將圖像注入到這些模型的提示詞中
- 使用模型名稱啟發法 (`r1`, `reasoning`, `think`) 標記 `reasoning`
- 將 `maxTokens` 設定為 OpenClaw 使用的預設 Ollama 最大 token 上限
- 將所有成本設定為 `0`

這避免了手動輸入模型，同時保持目錄與本機 Ollama 實例同步。

若要查看有哪些可用的模型：

```bash
ollama list
openclaw models list
```

若要新增模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型將會被自動發現並可供使用。

如果您明確設定 `models.providers.ollama`，將會跳過自動發現，並且您必須手動定義模型（見下文）。

## 設定

### 基本設定（隱含發現）

啟用 Ollama 最簡單的方法是透過環境變數：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 明確設定（手動模型）

在以下情況使用明確設定：

- Ollama 執行於其他主機/連接埠。
- 您想要強制指定特定的內容視窗或模型列表。
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

如果設定了 `OLLAMA_API_KEY`，您可以在供應商項目中省略 `apiKey`，OpenClaw 將會為可用性檢查填入它。

### 自訂基礎 URL（明確設定）

如果 Ollama 執行於不同的主機或連接埠（明確設定會停用自動發現，因此請手動定義模型）：

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

<Warning>請勿在 URL 中新增 `/v1`。`/v1` 路徑使用 OpenAI 相容模式，其中的工具呼叫並不可靠。請使用不帶路徑後綴的基礎 Ollama URL。</Warning>

### 模型選擇

設定完成後，您的所有 Ollama 模型皆可供使用：

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

雲端模型讓您可以與本機模型一起執行雲端託管的模型（例如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud`、`glm-5.1:cloud`）。

若要使用雲端模型，請在設定期間選擇 **Cloud + Local** 模式。精靈會檢查您是否已登入，並在需要時開啟瀏覽器登入流程。如果無法驗證身分，精靈將會退回至本機模型預設值。

您也可以直接在 [ollama.com/signin](https://ollama.com/signin) 登入。

## Ollama Web Search

OpenClaw 也支援將 **Ollama Web Search** 作為內建的 `web_search`
提供者。

- 它使用您設定的 Ollama 主機 (若已設定則為 `models.providers.ollama.baseUrl`，
  否則為 `http://127.0.0.1:11434`)。
- 它是免金鑰的。
- 它要求 Ollama 必須正在執行，並已使用 `ollama signin` 登入。

在 `openclaw onboard` 或
`openclaw configure --section web` 期間選擇 **Ollama Web Search**，或設定：

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

如需完整的設定和行為詳細資訊，請參閱 [Ollama Web Search](/en/tools/ollama-search)。

## 進階

### 推理模型

OpenClaw 預設會將名稱包含 `deepseek-r1`、`reasoning` 或 `think` 的模型視為具備推理能力：

```bash
ollama pull deepseek-r1:32b
```

### 模型成本

Ollama 是免費的且在本機執行，因此所有模型成本均設為 $0。

### 串流設定

OpenClaw 的 Ollama 整合預設使用 **原生 Ollama API** (`/api/chat`)，它完全支援同時進行串流和工具呼叫。不需要特殊設定。

#### 舊版 OpenAI 相容模式

<Warning>**在 OpenAI 相容模式下，工具呼叫並不可靠。** 僅在您需要代理伺服器使用 OpenAI 格式，且不依賴原生工具呼叫行為時才使用此模式。</Warning>

如果您需要改用 OpenAI 相容端點 (例如，在僅支援 OpenAI 格式的代理伺服器後面)，請明確設定 `api: "openai-completions"`：

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

此模式可能不支援同時進行串流和工具呼叫。您可能需要在模型設定中使用 `params: { streaming: false }` 停用串流。

當 `api: "openai-completions"` 與 Ollama 一起使用時，OpenClaw 預設會注入 `options.num_ctx`，以免 Ollama 靜默退回至 4096 的內容視窗。如果您的代理伺服器或上游拒絕未知的 `options` 欄位，請停用此行為：

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

### 內容視窗

對於自動探索的模型，OpenClaw 會使用 Ollama 回報的內容視窗（如果可用），否則會回退到 OpenClaw 使用的預設 Ollama 內容視窗。您可以在明確的提供者設定中覆寫 `contextWindow` 和 `maxTokens`。

## 疑難排解

### 未偵測到 Ollama

請確保 Ollama 正在運作，並且您設定了 `OLLAMA_API_KEY` （或驗證設定檔），且您**沒有**定義明確的 `models.providers.ollama` 項目：

```bash
ollama serve
```

並且 API 可以存取：

```bash
curl http://localhost:11434/api/tags
```

### 沒有可用的模型

如果未列出您的模型，請執行下列其中一項：

- 在本地端拉取模型，或
- 在 `models.providers.ollama` 中明確定義模型。

若要新增模型：

```bash
ollama list  # See what's installed
ollama pull gemma4
ollama pull gpt-oss:20b
ollama pull llama3.3     # Or another model
```

### 連線被拒

請檢查 Ollama 是否在正確的連接埠上運作：

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## 參見

- [模型提供者](/en/concepts/model-providers) - 所有提供者概覽
- [模型選擇](/en/concepts/models) - 如何選擇模型
- [設定](/en/gateway/configuration) - 完整設定參考
