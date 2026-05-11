---
summary: "使用 LM Studio 執行 OpenClaw"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

LM Studio 是一款友善且強大的應用程式，可讓您在自己的硬體上執行開放權重模型。它讓您能夠執行 llama.cpp (GGUF) 或 MLX 模型 (Apple Silicon)。提供 GUI 套件或無後台守護程式 (`llmster`)。如需產品和設定文件，請參閱 [lmstudio.ai](https://lmstudio.ai/)。

## 快速開始

1. 安裝 LM Studio (桌面版) 或 `llmster` (無後台)，然後啟動本地伺服器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 啟動伺服器

請確定您啟動了桌面應用程式或使用以下指令執行守護程式：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您使用的是應用程式，請確定您已啟用 JIT 以獲得順暢的體驗。在 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) 中了解更多資訊。

3. 如果已啟用 LM Studio 驗證，請設定 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果停用了 LM Studio 驗證，您可以在互動式 OpenClaw 設定期間將 API 金鑰留空。

有關 LM Studio 驗證設定的詳細資訊，請參閱 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。

4. 執行引導並選擇 `LM Studio`：

```bash
openclaw onboard
```

5. 在引導過程中，使用 `Default model` 提示來選擇您的 LM Studio 模型。

您也可以稍後設定或變更它：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型金鑰遵循 `author/model-name` 格式 (例如 `qwen/qwen3.5-9b`)。OpenClaw 模型參考會在前面加上提供者名稱：`lmstudio/qwen/qwen3.5-9b`。您可以透過執行 `curl http://localhost:1234/api/v1/models` 並查看 `key` 欄位來找到模型的確切金鑰。

## 非互動式引導

當您想要透過腳本設定 (CI、佈建、遠端引導) 時，請使用非互動式引導：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或是指定基礎 URL、模型和選用 API 金鑰：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 接收 LM Studio 傳回的模型金鑰 (例如 `qwen/qwen3.5-9b`)，不含 `lmstudio/` 提供者前綴。

對於已啟用驗證的 LM Studio 伺服器，請傳遞 `--lmstudio-api-key` 或設定 `LM_API_TOKEN`。對於未啟用驗證的 LM Studio 伺服器，請省略金鑰；OpenClaw 會儲存一個本地非機密標記。

`--custom-api-key` 為了相容性仍受支援，但對於 LM Studio，建議使用 `--lmstudio-api-key`。

這會寫入 `models.providers.lmstudio` 並將預設模型設定為
`lmstudio/<custom-model-id>`。當您提供 API 金鑰時，設定也會寫入
`lmstudio:default` 設定檔。

互動式設定可以提示輸入可選的首選載入內容長度，並將其套用至儲存在設定中的已探索 LM Studio 模型。
LM Studio 外掛程式設定信任已設定的 LM Studio 端點用於模型請求，包括 loopback、LAN 和 tailnet 主機。您可以透過設定 `models.providers.lmstudio.request.allowPrivateNetwork: false` 來選擇退出。

## 設定

### 串流使用相容性

LM Studio 相容串流使用。當它未發出 OpenAI 格式的
`usage` 物件時，OpenClaw 會改為從 llama.cpp 風格的
`timings.prompt_n` / `timings.predicted_n` 中繼資料恢復 token 計數。

相同的串流使用行為適用於這些 OpenAI 相容的本地後端：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### 思考相容性

當 LM Studio 的 `/api/v1/models` 探索回報特定模型的推理
選項時，OpenClaw 會在模型相容中繼資料中保留這些原始值。對於
廣告 `allowed_options: ["off", "on"]` 的二進制思考模型，
OpenClaw 會將停用的思考對應到 `off`，並將啟用的 `/think` 層級對應到 `on`，
而不是傳送僅限 OpenAI 的數值，例如 `low` 或 `medium`。

### 明確設定

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 疑難排解

### 未偵測到 LM Studio

請確保 LM Studio 正在執行。如果已啟用驗證，請同時設定 `LM_API_TOKEN`：

```bash
# Start via desktop app, or headless:
lms server start --port 1234
```

驗證 API 是否可存取：

```bash
curl http://localhost:1234/api/v1/models
```

### 驗證錯誤 (HTTP 401)

如果設定回報 HTTP 401，請驗證您的 API 金鑰：

- 檢查 `LM_API_TOKEN` 是否符合 LM Studio 中設定的金鑰。
- 有關 LM Studio 驗證設定的詳細資訊，請參閱 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果您的伺服器不需要驗證，請在設定期間將金鑰留白。

### Just-in-time 模型載入

LM Studio 支援及時（JIT）模型載入，模型會在首次請求時載入。請確保您已啟用此功能，以避免出現「模型未載入」錯誤。

### 區域網路或 tailnet LM Studio 主機

使用 LM Studio 主機的可存取位址，保留 `/v1`，並確保 LM Studio 在該機器上已綁定至 loopback 以外的位址：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

與一般 OpenAI 相容的供應商不同，`lmstudio` 會自動信任其設定的本機/私人端點的受保護模型請求。自訂 loopback 供應商 ID（例如 `localhost` 或 `127.0.0.1`）也會自動受到信任；對於區域網路、tailnet 或私人 DNS 自訂供應商 ID，請明確設定 `models.providers.<id>.request.allowPrivateNetwork: true`。

## 相關

- [模型選擇](/zh-Hant/concepts/model-providers)
- [Ollama](/zh-Hant/providers/ollama)
- [本機模型](/zh-Hant/gateway/local-models)
