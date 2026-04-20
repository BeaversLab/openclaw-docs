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
  <Step title="取得您的 API 金鑰">
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
模型參考遵循模式 `openrouter/<provider>/<model>`。如需可用提供者和模型的完整清單，請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers)。
</Note>

## 驗證與標頭

OpenRouter 在底層使用包含您的 API 金鑰的 Bearer token。

在真實的 OpenRouter 請求上 (`https://openrouter.ai/api/v1`)，OpenClaw 也會新增
OpenRouter 記載的 app-attribution 標頭：

| 標頭                      | 數值                  |
| ------------------------- | --------------------- |
| `HTTP-Referer`            | `https://openclaw.ai` |
| `X-OpenRouter-Title`      | `OpenClaw`            |
| `X-OpenRouter-Categories` | `cli-agent`           |

<Warning>如果您將 OpenRouter 提供者重新指向其他 proxy 或基礎 URL，OpenClaw 將**不會**注入那些 OpenRouter 專屬的標頭或 Anthropic 快取標記。</Warning>

## 進階說明

<AccordionGroup>
  <Accordion title="Anthropic 快取標記">
    在已驗證的 OpenRouter 路由上，Anthropic 模型參考會保留
    OpenClaw 用於在 system/developer 提示區塊上更好地重用
    prompt 快取的 OpenRouter 專屬 Anthropic `cache_control` 標記。
  </Accordion>

<Accordion title="思考 / 推理注入">在支援的非 `auto` 路由上，OpenClaw 會將選取的思考等級對應到 OpenRouter 代理推理負載。不支援的模型提示和 `openrouter/auto` 將跳過該推理注入。</Accordion>

<Accordion title="僅限 OpenAI 的請求塑形">OpenRouter 仍然透過代理樣式的 OpenAI 相容路徑運行，因此 原生僅限 OpenAI 的請求塑形（例如 `serviceTier`、Responses `store`、 OpenAI 推理相容負載以及提示快取提示）不會被轉發。</Accordion>

<Accordion title="Gemini 支援的路由">Gemini 支援的 OpenRouter 參照會保留在代理 Gemini 路徑上：OpenClaw 會 在該處保留 Gemini 思考簽章清理，但不會啟用原生 Gemini 重播驗證或引導重寫。</Accordion>

  <Accordion title="提供者路由元數據">
    如果您在模型參數下傳遞 OpenRouter 提供者路由，OpenClaw 會在共享串流包裝器運行之前，
    將其作為 OpenRouter 路由元數據轉發。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    代理、模型和提供者的完整設定參考。
  </Card>
</CardGroup>
