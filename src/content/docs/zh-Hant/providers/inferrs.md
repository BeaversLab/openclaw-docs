---
summary: "透過 inferrs 執行 OpenClaw（OpenAI 相容本地伺服器）"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可以透過相容 OpenAI 的 `/v1` API 來提供本機模型服務。OpenClaw 可透過通用 `openai-completions` 路徑與 `inferrs` 搭配使用。

| 屬性           | 值                                                               |
| -------------- | ---------------------------------------------------------------- |
| 供應商 ID      | `inferrs` (自訂；在 `models.providers.inferrs` 下設定)           |
| 外掛程式       | 無 — `inferrs` 不是內建的 OpenClaw 供應商外掛程式                |
| Auth 環境變數  | 選用。如果您的 inferrs 伺服器沒有驗證，則任何值皆可              |
| API            | OpenAI 相容 (`openai-completions`)                               |
| 建議的基礎 URL | `http://127.0.0.1:8080/v1` (或您的 inferrs 伺服器所在的任何位置) |

<Note>`inferrs` 目前最好視為自訂的自主 OpenAI 相容後端，而非專屬的 OpenClaw 供應商外掛程式。您可以透過 `models.providers.inferrs` 進行設定，而不是透過入門選擇旗標。如果您需要具備自動探索功能的真正內建外掛程式，請參閱 [SGLang](/zh-Hant/providers/sglang) 或 [vLLM](/zh-Hant/providers/vllm)。</Note>

## 開始使用

<Steps>
  <Step title="使用模型啟動 inferrs">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="驗證伺服器是否可連線">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="新增 OpenClaw 供應商項目">新增一個明確的供應商項目，並將您的預設模型指向該項目。請參閱下方的完整設定範例。</Step>
</Steps>

## 完整設定範例

此範例在本機 `inferrs` 伺服器上使用 Gemma 4。

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

## 進階設定

<AccordionGroup>
  <Accordion title="為何 requiresStringContent 很重要">
    某些 `inferrs` Chat Completions 路由僅接受字串
    `messages[].content`，而不接受結構化內容部分陣列。

    <Warning>
    如果 OpenClaw 執行失敗並出現類似以下的錯誤：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    請在您的模型項目中設定 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw 會在傳送請求之前，將純文字內容部分壓平為純字串。

  </Accordion>

  <Accordion title="Gemma 與工具架構注意事項">
    某些目前的 `inferrs` + Gemma 組合接受小型直接
    `/v1/chat/completions` 請求，但在完整的 OpenClaw 代理程式執行階段
    輪次中仍然失敗。

    如果發生這種情況，請先嘗試以下操作：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    這會停用 OpenClaw 對該模型的工具架構介面，並減少對較嚴格的
    後端所造成的提示詞壓力。

    如果小型直接請求仍然有效，但正常的 OpenClaw 代理程式輪次繼續
    在 `inferrs` 內部當機，剩餘的問題通常是上游模型/伺服器
    行為，而非 OpenClaw 的傳輸層問題。

  </Accordion>

  <Accordion title="手動冒煙測試">
    配置完成後，請測試這兩層：

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

  <Accordion title="代理樣式行為">
    `inferrs` 被視為代理樣式的 OpenAI 相容 `/v1` 後端，
    而非原生 OpenAI 端點。

    - 僅限原生 OpenAI 的請求塑形在此處不適用
    - 沒有 `service_tier`、沒有 Responses `store`、沒有提示詞快取提示，也沒有
      OpenAI 推理相容的承載塑形
    - 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
      不會在自訂 `inferrs` 基礎 URL 上注入

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="curl /v1/models 失敗">
    `inferrs` 未執行、無法連線，或未繫結到預期的
    主機/連接埠。請確保伺服器已啟動，並正在監聽您
    配置的位址。
  </Accordion>

<Accordion title="messages[].content 預期為字串">在模型項目中設定 `compat.requiresStringContent: true`。請參閱上方的 `requiresStringContent` 章節以取得詳細資訊。</Accordion>

<Accordion title="Direct /v1/chat/completions calls pass but openclaw infer model run fails">請嘗試設定 `compat.supportsTools: false` 以停用工具 schema 介面。 請參閱上文關於 Gemma tool-schema 的注意事項。</Accordion>

  <Accordion title="inferrs still crashes on larger agent turns">
    如果 OpenClaw 不再出現 schema 錯誤，但 `inferrs` 在較大的
    Agent 輪次中仍然崩潰，請將其視為上游 `inferrs` 或模型限制。請
    減少提示詞壓力或切換至不同的本機後端或模型。
  </Accordion>
</AccordionGroup>

<Tip>如需一般協助，請參閱 [疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="Local models" href="/zh-Hant/gateway/local-models" icon="server">
    對本機模型伺服器執行 OpenClaw。
  </Card>
  <Card title="Gateway troubleshooting" href="/zh-Hant/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    偵錯通過探測但導致執行失敗的本機 OpenAI 相容後端。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障轉移行為的概覽。
  </Card>
</CardGroup>
