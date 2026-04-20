---
summary: "使用 LM Studio 執行 OpenClaw"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

# LM Studio

LM Studio 是一款友善且強大的應用程式，可讓您在自己的硬體上執行開放權重模型。它支援執行 llama.cpp (GGUF) 或 MLX 模型 (Apple Silicon)。提供圖形使用者介面套件或無頭守護程式 (`llmster`)。如需產品和設定文件，請參閱 [lmstudio.ai](https://lmstudio.ai/)。

## 快速開始

1. 安裝 LM Studio (桌面版) 或 `llmster` (無頭模式)，然後啟動本機伺服器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 啟動伺服器

請確保您啟動桌面應用程式或使用下列指令執行守護程式：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您使用應用程式，請確保啟用 JIT 以獲得流暢的體驗。在 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) 中了解更多資訊。

3. OpenClaw 需要 LM Studio 權杖值。設定 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果停用 LM Studio 驗證，請使用任何非空權杖值：

```bash
export LM_API_TOKEN="placeholder-key"
```

如需 LM Studio 驗證設定詳細資訊，請參閱 [LM Studio 驗證](https://lmstudio.ai/docs/developer/core/authentication)。

4. 執行引導程式並選擇 `LM Studio`：

```bash
openclaw onboard
```

5. 在引導程式中，使用 `Default model` 提示來選擇您的 LM Studio 模型。

您也可以稍後設定或變更：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型金鑰遵循 `author/model-name` 格式 (例如 `qwen/qwen3.5-9b`)。OpenClaw
模型參照會在前面加上提供者名稱：`lmstudio/qwen/qwen3.5-9b`。您可以執行 `curl http://localhost:1234/api/v1/models` 並查看 `key` 欄位來找到模型的確切金鑰。

## 非互動式引導

當您想要以指令碼設定 (CI、佈建、遠端啟動) 時，請使用非互動式引導：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或指定基礎 URL 或搭配 API 金鑰的模型：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 採用 LM Studio 傳回的模型金鑰 (例如 `qwen/qwen3.5-9b`)，不含
`lmstudio/` 提供者前綴。

非互動式引導需要 `--lmstudio-api-key` (或環境變數中的 `LM_API_TOKEN`)。
對於未啟用驗證的 LM Studio 伺服器，任何非空權杖值皆可運作。

`--custom-api-key` 為了相容性仍受支援，但針對 LM Studio 建議使用 `--lmstudio-api-key`。

這會寫入 `models.providers.lmstudio`，將預設模型設定為
`lmstudio/<custom-model-id>`，並寫入 `lmstudio:default` 設定檔。

互動式設定可以提示輸入可選的首選載入內容長度，並將其套用至儲存在設定中的已探索 LM Studio 模型。

## 組態

### 明確組態

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

### 偵測不到 LM Studio

請確保 LM Studio 正在執行，並且您設定了 `LM_API_TOKEN`（對於未經驗證的伺服器，任何非空的 token 值皆可）：

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
- 如果您的伺服器不需要驗證，請為 `LM_API_TOKEN` 使用任何非空的 token 值。

### 及時模型載入

LM Studio 支援及時 (JIT) 模型載入，即模型在首次請求時才載入。請確保您已啟用此功能，以避免「Model not loaded」錯誤。
