---
title: "DeepSeek"
summary: "DeepSeek 設定（驗證 + 模型選擇）"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) 提供了透過 OpenAI 相容 API 存取的強大 AI 模型。

| 屬性     | 值                         |
| -------- | -------------------------- |
| 提供者   | `deepseek`                 |
| 驗證     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI 相容                |
| Base URL | `https://api.deepseek.com` |

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 建立 API 金鑰。
  </Step>
  <Step title="執行 onboarding">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    這會提示您輸入 API 金鑰，並將 `deepseek/deepseek-chat` 設為預設模型。

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非互動式設定">
    對於指令碼或無頭安裝，請直接傳遞所有旗標：

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>如果 Gateway 作為守護程序 執行，請確保 `DEEPSEEK_API_KEY` 對該程序可用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。</Warning>

## 內建目錄

| 模型參照                     | 名稱              | 輸入 | Context | 最大輸出 | 備註                               |
| ---------------------------- | ----------------- | ---- | ------- | -------- | ---------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text | 131,072 | 8,192    | 預設模型；DeepSeek V3.2 非思維表層 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text | 131,072 | 65,536   | 具備推理功能的 V3.2 表層           |

<Tip>兩個內建模型目前皆在來源中宣稱支援串流使用相容性。</Tip>

## 設定範例

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-chat" },
    },
  },
}
```

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Configuration reference" href="/en/gateway/configuration-reference" icon="gear">
    代理人、模型和供應商的完整配置參考資料。
  </Card>
</CardGroup>
