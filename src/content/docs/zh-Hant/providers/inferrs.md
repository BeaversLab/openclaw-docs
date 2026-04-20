---
summary: "透過 inferrs 執行 OpenClaw（OpenAI 相容本地伺服器）"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "inferrs"
---

# inferrs

[inferrs](https://github.com/ericcurtin/inferrs) 可以在 OpenAI 相容的 `/v1` API 後方提供本地模型。OpenClaw 可透過通用 `openai-completions` 路徑與 `inferrs` 搭配使用。

`inferrs` 目前最好視為自訂的託管 OpenAI 相容後端，而非專屬的 OpenClaw 供應商外掛。

## 開始使用

<Steps>
  <Step title="Start inferrs with a model">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Verify the server is reachable">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="新增 OpenClaw 供應商項目">新增一個明確的供應商項目，並將您的預設模型指向它。請參閱下方的完整設定範例。</Step>
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

## 進階

<AccordionGroup>
  <Accordion title="為何 requiresStringContent 很重要">
    部分 `inferrs` Chat Completions 路由僅接受字串
    `messages[].content`，不接受結構化內容部分陣列。

    <Warning>
    如果 OpenClaw 執行失敗並出現類似錯誤：

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

    OpenClaw 會在發送請求之前，將純文字內容部分扁平化為純字串。

  </Accordion>

  <Accordion title="Gemma 與 tool-schema 注意事項">
    部分目前的 `inferrs` + Gemma 組合接受小型直接的
    `/v1/chat/completions` 請求，但在完整的 OpenClaw agent-runtime
    週期中仍會失敗。

    如果發生這種情況，請先嘗試以下操作：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    這會停用模型的 OpenClaw tool schema 介面，並可減少嚴格本地後端的提示詞壓力。

    如果小型直接請求仍然有效，但正常的 OpenClaw agent 週期繼續在 `inferrs` 內部當機，則剩餘問題通常是上游模型/伺服器行為，而非 OpenClaw 的傳輸層。

  </Accordion>

  <Accordion title="手動煙霧測試">
    配置完成後，請測試兩層：

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

    如果第一個指令成功但第二個失敗，請檢查下方的疑難排解章節。

  </Accordion>

  <Accordion title="代理式行為">
    `inferrs` 被視為代理式 OpenAI 相容 `/v1` 後端，而非
    原生 OpenAI 端點。

    - 僅限原生 OpenAI 的請求整形並不在此套用
    - 沒有 `service_tier`，沒有 Responses `store`，沒有提示快取提示，也沒有
      OpenAI 推理相容負載整形
    - 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`, `User-Agent`)
      不會注入到自訂的 `inferrs` 基礎 URL 中

  </Accordion>
</AccordionGroup>

## 疑難排解

<AccordionGroup>
  <Accordion title="curl /v1/models 失敗">
    `inferrs` 未執行、無法連線，或未綁定至預期的
    主機/連接埠。請確認伺服器已啟動並正在監聽您
    配置的位址。
  </Accordion>

<Accordion title="messages[].content 預期為字串">在模型條目中設定 `compat.requiresStringContent: true`。詳情請參閱 上方的 `requiresStringContent` 章節。</Accordion>

<Accordion title="直接呼叫 /v1/chat/completions 成功但 openclaw infer model run 失敗">請嘗試設定 `compat.supportsTools: false` 以停用工具架構表面。 請參閱上方關於 Gemma 工具架構的注意事項。</Accordion>

  <Accordion title="inferrs 在較大的代理回合中仍當機">
    如果 OpenClaw 不再收到架構錯誤，但 `inferrs` 在較大的
    代理回合中仍當機，請將其視為上游 `inferrs` 或模型的限制。請
    降低提示壓力或切換至不同的本地後端或模型。
  </Accordion>
</AccordionGroup>

<Tip>如需一般性協助，請參閱 [疑難排解](/en/help/troubleshooting) 和 [常見問題](/en/help/faq)。</Tip>

## 另請參閱

<CardGroup cols={2}>
  <Card title="Local models" href="/en/gateway/local-models" icon="server">
    針對本地模型伺服器執行 OpenClaw。
  </Card>
  <Card title="Gateway troubleshooting" href="/en/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    偵錯通過探測但代理執行失敗的本地 OpenAI 相容後端。
  </Card>
  <Card title="Model providers" href="/en/concepts/model-providers" icon="layers">
    所有提供者、模型參照和故障移轉行為的概覽。
  </Card>
</CardGroup>
