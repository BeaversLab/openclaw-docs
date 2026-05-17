---
summary: "透過 inferrs 執行 OpenClaw（OpenAI 相容的本地伺服器）"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可透過 OpenAI 相容的 `/v1` API 提供本地模型。OpenClaw 可透過通用 `openai-completions` 路徑與 `inferrs` 搭配使用。

| 屬性           | 值                                                               |
| -------------- | ---------------------------------------------------------------- |
| 供應商 ID      | `inferrs` (自訂；在 `models.providers.inferrs` 下設定)           |
| 外掛程式       | 無 — `inferrs` 不是內建的 OpenClaw 提供者外掛程式                |
| Auth 環境變數  | 選用。如果您的 inferrs 伺服器沒有驗證，則任何值皆可              |
| API            | OpenAI 相容 (`openai-completions`)                               |
| 建議的基礎 URL | `http://127.0.0.1:8080/v1` (或您的 inferrs 伺服器所在的任何位置) |

<Note>`inferrs` 目前最好視為自訂的自託管 OpenAI 相容後端，而非專用的 OpenClaw 提供者外掛程式。您是透過 `models.providers.inferrs` 進行設定，而非透過入門選擇旗標。如果您需要具備自動探索功能的真正內建外掛程式，請參閱 [SGLang](/zh-Hant/providers/sglang) 或 [vLLM](/zh-Hant/providers/vllm)。</Note>

## 開始使用

<Steps>
  <Step title="啟動包含模型的 inferrs">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="驗證伺服器是否可連線">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="新增 OpenClaw 提供者項目">新增明確的提供者項目，並將您的預設模型指向該項目。請參閱下方的完整設定範例。</Step>
</Steps>

## 完整設定範例

此範例在本地 `inferrs` 伺服器上使用 Gemma 4。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
      models: {
        "inferrs/google/gemma-4-E2B-it": {
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

## 隨選啟動

Inferrs 也可以僅在選取 `inferrs/...` 模型時，由 OpenClaw 啟動。將 `localService` 新增至相同的提供者項目：

```json5
{
  models: {
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

`command` 必須是絕對路徑。在 Gateway 主機上使用 `which inferrs` 並將該路徑放入設定中。若要查看完整的欄位參考，請參閱
[Local model services](/zh-Hant/gateway/local-model-services)。

## 進階設定

<AccordionGroup>
  <Accordion title="為什麼 requiresStringContent 很重要">
    某些 `inferrs` 聊天完成路由僅接受字串
    `messages[].content`，而不接受結構化的內容部分陣列。

    <Warning>
    如果 OpenClaw 執行失敗並出現如下錯誤：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    請在您的模型條目中設定 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw 會在發送請求之前，將純文字內容部分扁平化為純字串。

  </Accordion>

  <Accordion title="Gemma 與 tool-schema 注意事項">
    某些目前的 `inferrs` + Gemma 組合接受小型直接的
    `/v1/chat/completions` 請求，但在完整的 OpenClaw agent-runtime
    回合中仍然會失敗。

    如果發生這種情況，請先嘗試此方法：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    這會停用該模型的 OpenClaw 工具架構表面，並能減少對嚴格本機後端的提示詞壓力。

    如果小型直接請求仍然有效，但正常的 OpenClaw agent 回合繼續在 `inferrs` 內部崩潰，則剩餘問題通常是上游模型/伺服器
    的行為，而不是 OpenClaw 的傳輸層。

  </Accordion>

  <Accordion title="手動冒煙測試">
    設定完成後，請測試這兩層：

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "What is 2 + 2? Reply with one short sentence." \
      --json
    ```

    如果第一個指令有效但第二個失敗，請檢查下方的疑難排解章節。

  </Accordion>

  <Accordion title="Proxy 樣式行為">
    `inferrs` 被視為一個 Proxy 樣式的 OpenAI 相容 `/v1` 後端，而非
    原生的 OpenAI 端點。

    - 原生僅限 OpenAI 的請求塑形在此不適用
    - 沒有 `service_tier`，沒有 Responses `store`，沒有 prompt-cache 提示，也沒有
      OpenAI reasoning-compat payload塑形
    - 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`, `User-Agent`)
      不會注入到自訂的 `inferrs` 基礎 URL 上

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="curl /v1/models fails">
    `inferrs` 未運行、無法連接，或未綁定至預期的
    主機/埠位。請確保伺服器已啟動，並監聽您
    設定的位址。
  </Accordion>

<Accordion title="messages[].content expected a string">在模型條目中設定 `compat.requiresStringContent: true`。詳情請參閱 上方的 `requiresStringContent` 區段。</Accordion>

<Accordion title="Direct /v1/chat/completions calls pass but openclaw infer model run fails">請嘗試設定 `compat.supportsTools: false` 以停用工具架構介面。 請參閱上方的 Gemma 工具架構說明。</Accordion>

  <Accordion title="inferrs still crashes on larger agent turns">
    如果 OpenClaw 不再收到架構錯誤，但 `inferrs` 在較大的
    Agent 輪次中仍然當機，請將其視為上游 `inferrs` 或模型的限制。請減少
    提示詞壓力，或切換至不同的本地後端或模型。
  </Accordion>
</AccordionGroup>

<Tip>如需一般協助，請參閱 [疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="Local models" href="/zh-Hant/gateway/local-models" icon="server">
    針對本地模型伺服器執行 OpenClaw。
  </Card>
  <Card title="Local model services" href="/zh-Hant/gateway/local-model-services" icon="play">
    針對設定的供應商按需啟動本地模型伺服器。
  </Card>
  <Card title="Gateway troubleshooting" href="/zh-Hant/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    偵錯通過探測但在 Agent 執行時失敗的本地 OpenAI 相容後端。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障轉移行為的概覽。
  </Card>
</CardGroup>
