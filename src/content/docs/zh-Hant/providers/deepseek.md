---
summary: "DeepSeek 設定（驗證 + 模型選擇）"
title: "DeepSeek"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

[DeepSeek](https://www.deepseek.com) 提供了具有 OpenAI 相容 API 的強大 AI 模型。

| 屬性     | 值                         |
| -------- | -------------------------- |
| 供應商   | `deepseek`                 |
| 驗證     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI 相容                |
| 基礎 URL | `https://api.deepseek.com` |

## 開始使用

<Steps>
  <Step title="取得您的 API 金鑰">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 建立 API 金鑰。
  </Step>
  <Step title="執行入門引導">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    這將會提示您輸入 API 金鑰，並將 `deepseek/deepseek-v4-flash` 設為預設模型。

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```

    若要檢查隨附的靜態目錄而不需要執行中的 Gateway，請使用：

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非互動式設定">
    對於腳本或無頭安裝，請直接傳遞所有旗標：

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

<Warning>如果 Gateway 作為守護程序執行，請確保 `DEEPSEEK_API_KEY` 可供該程序使用（例如，在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。</Warning>

## 內建目錄

| 模型參照                     | 名稱              | 輸入 | 上下文    | 最大輸出 | 備註                            |
| ---------------------------- | ----------------- | ---- | --------- | -------- | ------------------------------- |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | 文字 | 1,000,000 | 384,000  | 預設模型；V4 具備思考能力的介面 |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | 文字 | 1,000,000 | 384,000  | V4 具備思考能力的介面           |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | 文字 | 131,072   | 8,192    | DeepSeek V3.2 非思考介面        |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | 文字 | 131,072   | 65,536   | 具備推理功能的 V3.2 介面        |

<Tip>V4 模型支援 DeepSeek 的 `thinking` 控制。OpenClaw 也會在後續輪次中重放 DeepSeek `reasoning_content`，因此包含工具呼叫的思考會話可以繼續進行。</Tip>

## 思考與工具

DeepSeek V4 思考會話比大多數 OpenAI 相容的供應商有更嚴格的重放合約：當啟用思考的助理訊息包含
工具呼叫時，DeepSeek 要求先前的助理 `reasoning_content` 必須在後續請求中一併發回。OpenClaw 在 DeepSeek 外掛內部處理了這一點，
因此正常的輪式工具使用可以在 `deepseek/deepseek-v4-flash` 和
`deepseek/deepseek-v4-pro` 上運作。

如果您將現有的會話從另一個 OpenAI 相容的供應商切換到
DeepSeek V4 模型，較舊的助理工具呼叫輪次可能沒有原生的
DeepSeek `reasoning_content`。OpenClaw 會為 DeepSeek V4 思考請求填補該缺失欄位，
以便供應商可以接受重放的工具呼叫歷史，而無需 `/new`。

當在 OpenClaw 中停用思考時（包括 UI 中的 **None** 選擇），
OpenClaw 會發送 DeepSeek `thinking: { type: "disabled" }` 並從傳出的歷史中移除重放的
`reasoning_content`。這可將停用思考的會話保持在非思考的 DeepSeek 路徑上。

使用 `deepseek/deepseek-v4-flash` 作為預設的快速路徑。當您想要更強大的 V4 模型並且可以接受
更高的成本或延遲時，請使用 `deepseek/deepseek-v4-pro`。

## 即時測試

直接的即時模型套件在現代模型集中包含了 DeepSeek V4。若要
僅執行 DeepSeek V4 直接模型檢查：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

該即時檢查會驗證兩個 V4 模型都能完成，並且思考/工具
後續輪次會保留 DeepSeek 所需的重放負載。

## 設定範例

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-flash" },
    },
  },
}
```

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和容錯移轉行為。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    有關代理程式、模型和提供者的完整設定參考。
  </Card>
</CardGroup>
