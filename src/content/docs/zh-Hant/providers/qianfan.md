---
summary: "使用 Qianfan 的統一 API 存取 OpenClaw 中的多種模型"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

Qianfan 是百度的 MaaS 平台，提供一個**統一 API**，將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可運作。

| 屬性     | 值                                |
| -------- | --------------------------------- |
| 提供者   | `qianfan`                         |
| 驗證     | `QIANFAN_API_KEY`                 |
| API      | 與 OpenAI 相容                    |
| 基礎 URL | `https://qianfan.baidubce.com/v2` |

## 開始使用

<Steps>
  <Step title="建立百度雲端帳戶">在 [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey) 註冊或登入，並確保您已啟用 Qianfan API 存取權限。</Step>
  <Step title="產生 API 金鑰">建立一個新應用程式或選取現有的應用程式，然後產生 API 金鑰。金鑰格式為 `bce-v3/ALTAK-...`。</Step>
  <Step title="執行入門設定">```bash openclaw onboard --auth-choice qianfan-api-key ```</Step>
  <Step title="驗證模型是否可用">```bash openclaw models list --provider qianfan ```</Step>
</Steps>

## 內建目錄

| 模型參照                             | 輸入       | 上下文  | 最大輸出 | 推理 | 備註     |
| ------------------------------------ | ---------- | ------- | -------- | ---- | -------- |
| `qianfan/deepseek-v3.2`              | 文字       | 98,304  | 32,768   | 是   | 預設模型 |
| `qianfan/ernie-5.0-thinking-preview` | 文字、圖片 | 119,000 | 64,000   | 是   | 多模態   |

<Tip>預設內建的模型參照是 `qianfan/deepseek-v3.2`。只有當您需要自訂基礎 URL 或模型元資料時，才需要覆寫 `models.providers.qianfan`。</Tip>

## 設定範例

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="傳輸與相容性">
    Qianfan 透過與 OpenAI 相容的傳輸路徑運作，而非原生的 OpenAI 請求成型。這意味著標準的 OpenAI SDK 功能可以運作，但提供者特有的參數可能無法轉發。
  </Accordion>

  <Accordion title="目錄與覆蓋設定">
    內建的目錄目前包含 `deepseek-v3.2` 與 `ernie-5.0-thinking-preview`。僅在您需要自訂基礎 URL 或模型元資料時，才新增或覆蓋 `models.providers.qianfan`。

    <Note>
    模型參照使用 `qianfan/` 前綴（例如 `qianfan/deepseek-v3.2`）。
    </Note>

  </Accordion>

  <Accordion title="疑難排解">
    - 請確保您的 API 金鑰以 `bce-v3/ALTAK-` 開頭，並且已在百度雲端主控台中啟用 Qianfan API 存取權限。
    - 如果未列出模型，請確認您的帳戶已啟用 Qianfan 服務。
    - 預設的基礎 URL 為 `https://qianfan.baidubce.com/v2`。僅在您使用自訂端點或 Proxy 時才進行變更。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照以及故障轉移行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 設定參考。
  </Card>
  <Card title="Agent 設定" href="/zh-Hant/concepts/agent" icon="robot">
    設定 Agent 預設值與模型指派。
  </Card>
  <Card title="Qianfan API 文件" href="https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb" icon="arrow-up-right-from-square">
    官方 Qianfan API 文件。
  </Card>
</CardGroup>
