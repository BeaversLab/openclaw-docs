---
summary: "在 OpenClaw 模型請求之前按需啟動本地模型伺服器"
read_when:
  - You want OpenClaw to start a local model server only when its model is selected
  - You run ds4, inferrs, vLLM, llama.cpp, MLX, or another OpenAI-compatible local server
  - You need to control cold start, readiness, and idle shutdown for local providers
title: "本地模型服務"
---

`models.providers.<id>.localService` 允許 OpenClaw 按需啟動提供商擁有的本地模型伺服器。這是提供商級別的配置：當選定的模型屬於該提供商時，OpenClaw 會探測服務，如果端點關閉則啟動進程，等待就緒，然後發送模型請求。

將其用於全天候運行成本高昂的本地伺服器，或者用於僅憑模型選擇就足以啟動後端的手動設置。

## 運作原理

1. 模型請求解析為已配置的提供商。
2. 如果該提供商具有 `localService`，OpenClaw 會探測 `healthUrl`。
3. 如果探測成功，OpenClaw 會使用現有的伺服器。
4. 如果探測失敗，OpenClaw 會使用 `args` 啟動 `command`。
5. OpenClaw 會輪詢就緒狀態，直到 `readyTimeoutMs` 過期。
6. 模型請求是通過正常的提供商傳輸發送的。
7. 如果 OpenClaw 啟動了該進程並且 `idleStopMs` 為正值，則在最後一個進行中的請求空閒該時長後，進程將停止。

OpenClaw 不會為此安裝 launchd、systemd、Docker 或守護進程。該伺服器是第一個需要它的 OpenClaw 進程的子進程。

## 配置形狀

```json5
{
  models: {
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "local-model",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/absolute/path/to/server",
          args: ["--host", "127.0.0.1", "--port", "8000"],
          cwd: "/absolute/path/to/working-dir",
          env: { LOCAL_MODEL_CACHE: "/absolute/path/to/cache" },
          healthUrl: "http://127.0.0.1:8000/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "my-local-model",
            name: "My Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 欄位

- `command`：絕對可執行檔路徑。不使用 Shell 查找。
- `args`：進程參數。不應用 Shell 展開、管道、通配符或引用規則。
- `cwd`：進程的可選工作目錄。
- `env`：合併到 OpenClaw 進程環境中的可選環境變量。
- `healthUrl`：就緒 URL。如果省略，OpenClaw 會將 `/models` 附加到 `baseUrl`，因此 `http://127.0.0.1:8000/v1` 變成 `http://127.0.0.1:8000/v1/models`。
- `readyTimeoutMs`：啟動就緒截止時間。預設值：`120000`。
- `idleStopMs`：OpenClaw 啟動程序的閒置關閉延遲。如果指定 `0` 或
  省略，程序將保持運行直到 OpenClaw 退出。

## Inferrs 範例

Inferrs 是一個自訂的 OpenAI 相容 `/v1` 後端，因此相同的本地服務
API 可與 `inferrs` 提供者條目搭配使用。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: ["serve", "google/gemma-4-E2B-it", "--host", "127.0.0.1", "--port", "8080", "--device", "metal"],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

將 `command` 取代為執行
OpenClaw 的機器上 `which inferrs` 的結果。

## ds4 範例

有關完整設定、上下文長度指引以及驗證指令，請參閱
[ds4](/zh-Hant/providers/ds4)。

```json5
{
  models: {
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "<DS4_DIR>/ds4-server",
          args: ["--model", "<DS4_DIR>/ds4flash.gguf", "--host", "127.0.0.1", "--port", "18000", "--ctx", "32768", "--tokens", "128"],
          cwd: "<DS4_DIR>",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [],
      },
    },
  },
}
```

## 操作注意事項

- 一個 OpenClaw 程序會管理其啟動的子程序。另一個偵測到相同健康 URL 已上線的 OpenClaw 程序將會重複使用它，而不會接管它。
- 啟動程序會針對每個提供者指令和參數集進行序列化，因此並發請求不會針對相同設定產生重複的伺服器。
- 主動的串流回應會持有租約；閒置關閉會等到回應主體處理完成後才執行。
- 在緩慢的本地提供者上使用 `timeoutSeconds`，以避免冷啟動和長時間生成遇到預設的模型請求逾時。
- 如果您的伺服器在 `/v1/models` 以外的地方公開就緒狀態，請使用明確的 `healthUrl`。

## 相關內容

<CardGroup cols={2}>
  <Card title="Local models" href="/zh-Hant/gateway/local-models" icon="server">
    本地模型設定、提供者選擇以及安全指引。
  </Card>
  <Card title="Inferrs" href="/zh-Hant/providers/inferrs" icon="cpu">
    透過 inferrs OpenAI 相容本地伺服器執行 OpenClaw。
  </Card>
</CardGroup>
