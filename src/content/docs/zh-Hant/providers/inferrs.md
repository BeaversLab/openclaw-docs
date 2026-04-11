---
summary: "透過 inferrs 執行 OpenClaw (OpenAI 相容的本地伺服器)"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "inferrs"
---

# inferrs

[inferrs](https://github.com/ericcurtin/inferrs) 可以在
OpenAI 相容的 `/v1` API 後端提供本地模型服務。OpenClaw 可透過通用
`openai-completions` 路徑與 `inferrs` 搭配使用。

`inferrs` 目前最好視為自訂的託管 OpenAI 相容
後端，而非專屬的 OpenClaw 提供者外掛。

## 快速開始

1. 使用一個模型啟動 `inferrs`。

範例：

```bash
inferrs serve gg-hf-gg/gemma-4-E2B-it \
  --host 127.0.0.1 \
  --port 8080 \
  --device metal
```

2. 驗證伺服器是否可以連線。

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/v1/models
```

3. 新增明確的 OpenClaw 提供者項目，並將您的預設模型指向它。

## 完整設定範例

此範例在本地 `inferrs` 伺服器上使用 Gemma 4。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/gg-hf-gg/gemma-4-E2B-it" },
      models: {
        "inferrs/gg-hf-gg/gemma-4-E2B-it": {
          alias: "Gemma 4 (inferrs)",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "gg-hf-gg/gemma-4-E2B-it",
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

## 為什麼 `requiresStringContent` 很重要

某些 `inferrs` 聊天完成路由僅接受字串
`messages[].content`，不接受結構化內容部分陣列。

如果 OpenClaw 執行失敗並出現類似錯誤：

```text
messages[1].content: invalid type: sequence, expected a string
```

設定：

```json5
compat: {
  requiresStringContent: true
}
```

OpenClaw 將在發送請求之前，將純文字內容部分扁平化為純字串。

## Gemma 與 tool-schema 注意事項

某些目前的 `inferrs` + Gemma 組合接受小型的直接
`/v1/chat/completions` 請求，但在完整的 OpenClaw agent-runtime
回合中仍然會失敗。

如果發生這種情況，請先嘗試此操作：

```json5
compat: {
  requiresStringContent: true,
  supportsTools: false
}
```

這會停用 OpenClaw 對該模型的工具 schema 介面，並可減輕對較嚴格本地後端的提示詞壓力。

如果小型直接請求仍然有效，但正常的 OpenClaw agent 回合繼續在 `inferrs` 內部崩潰，則剩餘問題通常是上游模型/伺服器
行為，而非 OpenClaw 的傳輸層問題。

## 手動冒煙測試

設定完成後，請測試這兩層：

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"gg-hf-gg/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'

openclaw infer model run \
  --model inferrs/gg-hf-gg/gemma-4-E2B-it \
  --prompt "What is 2 + 2? Reply with one short sentence." \
  --json
```

如果第一個指令有效但第二個失敗，請使用下方的疑難排解說明。

## 疑難排解

- `curl /v1/models` 失敗： `inferrs` 未執行、無法連線，或未
  繫結至預期的主機/連接埠。
- `messages[].content ... expected a string`：設定
  `compat.requiresStringContent: true`。
- 直接的 tiny `/v1/chat/completions` 呼叫可以通過，但 `openclaw infer model run` 失敗：請嘗試 `compat.supportsTools: false`。
- OpenClaw 不再收到 schema 錯誤，但在較大的 agent 輪次中 `inferrs` 仍會崩潰：將其視為上游 `inferrs` 或模型限制，並減少 prompt 壓力或切換本地後端/模型。

## Proxy-style 行為

`inferrs` 被視為 proxy-style 的 OpenAI 相容 `/v1` 後端，而非原生 OpenAI 端點。

- 此處不適用原生專屬於 OpenAI 的請求塑形
- 沒有 `service_tier`，沒有 Responses `store`，沒有 prompt-cache 提示，也沒有 OpenAI reasoning-compat 的負載塑形
- 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`, `User-Agent`) 不會注入到自訂 `inferrs` 基礎 URL

## 另請參閱

- [本地模型](/en/gateway/local-models)
- [Gateway 疑難排解](/en/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)
- [模型供應商](/en/concepts/model-providers)
