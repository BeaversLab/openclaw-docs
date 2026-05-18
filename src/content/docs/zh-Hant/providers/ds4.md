---
summary: "透過 ds4 執行 OpenClaw，這是一個本地的 DeepSeek V4 Flash OpenAI 相容伺服器"
read_when:
  - You want to run OpenClaw against antirez/ds4
  - You want a local DeepSeek V4 Flash backend with tool calls
  - You need the OpenClaw config for ds4-server
title: "ds4"
---

[ds4](https://github.com/antirez/ds4) 透過本地的 Metal 後端和 OpenAI 相容的 `/v1` API 提供 DeepSeek V4 Flash 服務。OpenClaw 透過通用 `openai-completions` 提供者系列連接到 ds4。

ds4 不是內建的 OpenClaw 提供者外掛。在 `models.providers.ds4` 下進行配置，然後選擇 `ds4/deepseek-v4-flash`。

- 提供者 ID：`ds4`
- 外掛：無
- API：OpenAI 相容的聊天完成 (`openai-completions`)
- 建議的基礎 URL：`http://127.0.0.1:18000/v1`
- 模型 ID：`deepseek-v4-flash`
- 工具呼叫：透過 OpenAI 風格的 `tools` 和 `tool_calls` 支援
- 推理：DeepSeek 風格的 `thinking` 和 `reasoning_effort`

## 需求

- 具有 Metal 支援的 macOS。
- 一個可運作的 ds4 checkout，包含 `ds4-server` 和 DeepSeek V4 Flash GGUF 檔案。
- 足夠的記憶體以容納您選擇的上下文。較大的 `--ctx` 值會在伺服器啟動時分配更多
  KV 記憶體。

<Warning>OpenClaw agent 週期包含工具架構和工作區上下文。像 `--ctx 4096` 這樣微小的上下文 可以通過直接的 curl 測試，但在完整的 agent 執行中會失敗並顯示 `500 prompt exceeds context`。對於 agent 和工具 冒煙測試，請至少使用 `--ctx 32768`。僅當您有足夠的記憶體並且想要 ds4 Think Max 行為時，才使用 `--ctx 393216`。</Warning>

## 快速入門

<Steps>
  <Step title="啟動 ds4-server">
    將 `<DS4_DIR>` 替換為您的 ds4 checkout 路徑。

    ```bash
    <DS4_DIR>/ds4-server \
      --model <DS4_DIR>/ds4flash.gguf \
      --host 127.0.0.1 \
      --port 18000 \
      --ctx 32768 \
      --tokens 128
    ```

  </Step>
  <Step title="驗證 OpenAI 相容的端點">
    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

    回應應包含 `deepseek-v4-flash`。

  </Step>
  <Step title="新增 OpenClaw 提供者設定">
    新增來自 [完整設定](#full-config) 的設定，然後執行單次模型
    檢查：

    ```bash
    openclaw infer model run \
      --local \
      --model ds4/deepseek-v4-flash \
      --thinking off \
      --prompt "Reply with exactly: openclaw-ds4-ok" \
      --json
    ```

  </Step>
</Steps>

## 完整設定

當 ds4 已於 `127.0.0.1:18000` 上運行時，請使用此設定。

```json5
{
  agents: {
    defaults: {
      model: { primary: "ds4/deepseek-v4-flash" },
      models: {
        "ds4/deepseek-v4-flash": {
          alias: "DS4 local",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

請保持 `contextWindow` 與 `ds4-server --ctx` 值一致。請保持 `maxTokens`
與 `--tokens` 一致，除非您刻意希望 OpenClaw 請求的輸出量
少於伺服器預設值。

## 隨需啟動

OpenClaw 僅在選擇 `ds4/...` 模型時才會啟動 ds4。請將
`localService` 新增至同一個提供者項目中：

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
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

`command` 必須是絕對可執行檔路徑。不會使用 Shell 查詢或 `~` 擴展。
請參閱 [本機模型服務](/zh-Hant/gateway/local-model-services) 以了解每個
`localService` 欄位。

## Think Max

僅當兩個條件均成立時，ds4 才會套用 Think Max：

- `ds4-server` 以 `--ctx 393216` 或更高版本開頭。
- 請求使用了 `reasoning_effort: "max"` 或對等的 ds4 effort 欄位。

如果您執行該大型上下文，請同時更新伺服器旗標和 OpenClaw 模型
中繼資料：

```json5
{
  contextWindow: 393216,
  maxTokens: 384000,
  compat: {
    supportsUsageInStreaming: true,
    supportsReasoningEffort: true,
    maxTokensField: "max_tokens",
    supportsStrictMode: false,
    thinkingFormat: "deepseek",
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
  },
}
```

## 測試

首先進行直接 HTTP 檢查：

```bash
curl http://127.0.0.1:18000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"Reply with exactly: ds4-ok"}],"max_tokens":16,"stream":false,"thinking":{"type":"disabled"}}'
```

然後測試 OpenClaw 模型路由：

```bash
openclaw infer model run \
  --local \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --prompt "Reply with exactly: openclaw-ds4-ok" \
  --json
```

若要進行完整的代理程式和工具呼叫冒煙測試，請使用至少 32768 的上下文：

```bash
openclaw agent \
  --local \
  --session-id ds4-tool-smoke \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --message "Use the shell command pwd once, then reply exactly: tool-ok <output>" \
  --json \
  --timeout 240
```

預期結果：

- `executionTrace.winnerProvider` 為 `ds4`
- `executionTrace.winnerModel` 為 `deepseek-v4-flash`
- `toolSummary.calls` 至少為 `1`
- `finalAssistantVisibleText` 以 `tool-ok` 開頭

## 疑難排解

<AccordionGroup>
  <Accordion title="curl /v1/models 無法連線">
    ds4 未運行，或未綁定至 `baseUrl` 中的主機和連接埠。請啟動
    `ds4-server`，然後重試：

    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

  </Accordion>

<Accordion title="500 prompt exceeds context">已配置的 `--ctx` 對 OpenClaw 的輪次來說太小。請提高 `ds4-server --ctx`，然後更新 `models.providers.ds4.models[].contextWindow` 以使其相符。使用工具的完整代理輪次比直接的單一訊息 curl 請求需要更多的語境。</Accordion>

<Accordion title="Think Max does not activate">ds4 只有在 `--ctx` 至少為 `393216` 且請求 要求 `reasoning_effort: "max"` 時才會使用 Think Max。較小的語境會回退到高 推理模式。</Accordion>

  <Accordion title="The first request is slow">
    ds4 有冷啟動 Metal 駐留和模型預熱階段。當 OpenClaw 按需啟動伺服器時，請使用
    `localService.readyTimeoutMs: 300000`。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Local model services" href="/zh-Hant/gateway/local-model-services" icon="play">
    在模型請求之前按需啟動本地模型伺服器。
  </Card>
  <Card title="Local models" href="/zh-Hant/gateway/local-models" icon="server">
    選擇並操作本地模型後端。
  </Card>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    設定提供者參照、驗證和故障轉移。
  </Card>
  <Card title="DeepSeek" href="/zh-Hant/providers/deepseek" icon="brain">
    原生 DeepSeek 提供者行為和思考控制。
  </Card>
</CardGroup>
