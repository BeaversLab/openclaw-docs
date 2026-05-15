---
summary: "使用 LM Studio 執行 OpenClaw"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

LM Studio 是一個親用且強大的應用程式，可在您自己的硬體上執行開放權重模型。它讓您能夠執行 llama.cpp (GGUF) 或 MLX 模型 (Apple Silicon)。提供 GUI 套件或無頭守護程式 (`llmster`)。如需產品和設定文件，請參閱 [lmstudio.ai](https://lmstudio.ai/)。

## 快速開始

1. 安裝 LM Studio (桌面版) 或 `llmster` (無頭模式)，然後啟動本機伺服器：

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

如果您正在使用該應用程式，請確保您已啟用 JIT 以獲得流暢的體驗。在 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) 中瞭解更多資訊。

3. 如果已啟用 LM Studio 驗證，請設定 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果停用了 LM Studio 驗證，您可以在互動式 OpenClaw 設定期間將 API 金鑰留空。

如需 LM Studio 驗證設定詳細資訊，請參閱 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。

4. 執行 onboarding 並選擇 `LM Studio`：

```bash
openclaw onboard
```

5. 在 onboarding 中，使用 `Default model` 提示來選擇您的 LM Studio 模型。

您也可以稍後設定或變更它：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型金鑰遵循 `author/model-name` 格式 (例如 `qwen/qwen3.5-9b`)。OpenClaw 模型參照會在前面加上提供者名稱：`lmstudio/qwen/qwen3.5-9b`。您可以透過執行 `curl http://localhost:1234/api/v1/models` 並查看 `key` 欄位來找到模型的確切金鑰。

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

`--custom-model-id` 接受 LM Studio 傳回的模型金鑰 (例如 `qwen/qwen3.5-9b`)，而不需 `lmstudio/` 提供者前綴。

對於已啟用驗證的 LM Studio 伺服器，請傳遞 `--lmstudio-api-key` 或設定 `LM_API_TOKEN`。對於未啟用驗證的 LM Studio 伺服器，請省略金鑰；OpenClaw 會儲存一個本機非秘密標記。

為了相容性，`--custom-api-key` 仍然受到支援，但對於 LM Studio，首選 `--lmstudio-api-key`。

這會寫入 `models.providers.lmstudio` 並將預設模型設定為 `lmstudio/<custom-model-id>`。當您提供 API 金鑰時，設定也會寫入 `lmstudio:default` 驗證設定檔。

互動式設定可以提示輸入可選的首選載入內容長度，並將其套用至它儲存至設定中偵測到的 LM Studio 模型。
LM Studio 外掛程式設定信任設定的 LM Studio 端點用於模型請求，包括 loopback、LAN 和 tailnet 主機。您可以透過設定 `models.providers.lmstudio.request.allowPrivateNetwork: false` 來選擇退出。

## 設定

### 串流使用相容性

LM Studio 相容串流使用。當它未發出 OpenAI 格式的
`usage` 物件時，OpenClaw 會改從 llama.cpp 風格的
`timings.prompt_n` / `timings.predicted_n` 元資料中回復 token 計數。

相同的串流使用行為適用於這些 OpenAI 相容的本地後端：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### 思考相容性

當 LM Studio 的 `/api/v1/models` 探索回報模型特定的推理選項時，OpenClaw 會在模型相容元資料中公開相符的 OpenAI 相容 `reasoning_effort` 值。目前的 LM Studio 版本可以宣傳二進位 UI 選項（例如 `allowed_options: ["off", "on"]`），但在 `/v1/chat/completions` 上拒絕這些值；OpenClaw 會在發送請求之前，將該二進位探索形狀正規化為 `none`、`minimal`、`low`、`medium`、`high` 和 `xhigh`。
當載入目錄時，包含 `off`/`on` 推理映射的舊版已儲存 LM Studio 設定也會以相同方式進行正規化。

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

請確保 LM Studio 正在執行。如果啟用了驗證，請同時設定 `LM_API_TOKEN`：

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

- 請檢查 `LM_API_TOKEN` 是否符合 LM Studio 中設定的金鑰。
- 如需 LM Studio 驗證設定詳細資訊，請參閱 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果您的伺服器不需要驗證，請在設定期間將金鑰留白。

### Just-in-time 模型載入

LM Studio 支援及時 (JIT) 模型載入，其中模型會在第一次請求時載入。OpenClaw 預設會透過 LM Studio 的原生載入端點預載模型，這在停用 JIT 時很有幫助。若要讓 LM Studio 的 JIT、閒置 TTL 和自動驅逐行為擁有模型生命週期，請停用 OpenClaw 的預載步驟：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        api: "openai-completions",
        params: { preload: false },
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

### 區域網路或 tailnet LM Studio 主機

使用 LM Studio 主機的可連線位址，保留 `/v1`，並確保 LM Studio 在該機器上已綁定至 loopback 以外：

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

與通用的 OpenAI 相容供應商不同，`lmstudio` 會自動信任其設定的本機/私有端點以進行受保護的模型請求。自訂回環供應商 ID（例如 `localhost` 或 `127.0.0.1`）也會自動受信任；對於 LAN、tailnet 或私有 DNS 自訂供應商 ID，請明確設定 `models.providers.<id>.request.allowPrivateNetwork: true`。

## 相關

- [模型選擇](/zh-Hant/concepts/model-providers)
- [Ollama](/zh-Hant/providers/ollama)
- [本機模型](/zh-Hant/gateway/local-models)
