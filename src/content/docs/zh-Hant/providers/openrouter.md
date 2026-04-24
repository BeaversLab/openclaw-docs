---
summary: "使用 OpenRouter 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一個 **統一 API**，將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

## 開始使用

<Steps>
  <Step title="Get your API key">
    在 [openrouter.ai/keys](https://openrouter.ai/keys) 建立 API 金鑰。
  </Step>
  <Step title="執行 onboarding">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="（選用）切換至特定模型">
    Onboarding 預設為 `openrouter/auto`。稍後選擇一個具體模型：

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## 設定範例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 模型參考

<Note>
模型參照遵循 `openrouter/<provider>/<model>` 模式。如需可用提供者和模型的完整清單，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
</Note>

內建的備援範例：

| 模型參照                             | 備註                           |
| ------------------------------------ | ------------------------------ |
| `openrouter/auto`                    | OpenRouter 自動路由            |
| `openrouter/moonshotai/kimi-k2.6`    | 透過 MoonshotAI 使用 Kimi K2.6 |
| `openrouter/openrouter/healer-alpha` | OpenRouter Healer Alpha 路由   |
| `openrouter/openrouter/hunter-alpha` | OpenRouter Hunter Alpha 路由   |

## 驗證與標頭

OpenRouter 底層使用包含您的 API 金鑰的 Bearer 權杖。

在實際的 OpenRouter 請求 (`https://openrouter.ai/api/v1`) 上，OpenClaw 也會新增
OpenRouter 記錄的 app-attribution 標頭：

| 標頭                      | 數值                  |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>如果您將 OpenRouter 提供者指向其他代理或基礎 URL，OpenClaw 將**不會**新增這些 OpenRouter 專屬的標頭或 Anthropic 快取標記。</Warning>

## 進階備註

<AccordionGroup>
  <Accordion title="Anthropic cache markers">
    在已驗證的 OpenRouter 路由上，Anthropic 模型參照會保留
    OpenClaw 用於在 system/developer 提示區塊上
    提升提示快取重用率的 OpenRouter 專屬 Anthropic `cache_control` 標記。
  </Accordion>

<Accordion title="Thinking / reasoning injection">在支援的非 `auto` 路由上，OpenClaw 會將選取的思考層級對應至 OpenRouter 代理 reasoning 載荷。不支援的模型提示以及 `openrouter/auto` 會略過該 reasoning 注入。</Accordion>

<Accordion title="OpenAI-only request shaping">OpenRouter 仍然透過代理風格的 OpenAI 相容路徑運行，因此原生的 OpenAI 專用請求整形（例如 `serviceTier`、Responses `store`、 OpenAI 推理相容負載以及 prompt-cache 提示）不會被轉發。</Accordion>

<Accordion title="Gemini-backed routes">由 Gemini 支援的 OpenRouter 參照保持在代理 Gemini 路徑上：OpenClaw 會在那裡保留 Gemini 思維簽章清理，但不會啟用原生的 Gemini 重播驗證或引導重寫。</Accordion>

  <Accordion title="Provider routing metadata">
    如果您在模型參數下傳遞 OpenRouter 提供者路由，OpenClaw 會在
    共享串流包裝器運行之前，將其作為 OpenRouter 路由中繼資料轉發。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理程式、模型和提供者的完整設定參照。
  </Card>
</CardGroup>
