---
summary: "使用 Kilo Gateway 的統一 API 在 OpenClaw 中存取多種模型"
title: "Kilo Gateway"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

Kilo Gateway 提供了一個 **統一 API**，可將請求路由到單一端點和 API 金鑰後的許多模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 都可以透過切換基礎 URL 來運作。

| 屬性     | 值                                 |
| -------- | ---------------------------------- |
| 提供者   | `kilocode`                         |
| 驗證     | `KILOCODE_API_KEY`                 |
| API      | 與 OpenAI 相容                     |
| 基礎 URL | `https://api.kilo.ai/api/gateway/` |

## 開始使用

<Steps>
  <Step title="建立帳戶">
    前往 [app.kilo.ai](https://app.kilo.ai)，登入或建立帳戶，然後導覽至 API 金鑰並產生新的金鑰。
  </Step>
  <Step title="執行引導程序">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或者直接設定環境變數：

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step title="驗證模型是否可用">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

## 預設模型

預設模型是 `kilocode/kilo/auto`，這是由 Kilo Gateway 管理的提供者擁有的智慧路由模型。

<Note>OpenClaw 將 `kilocode/kilo/auto` 視為穩定的預設參考，但並不發佈該路由的來源支援的任務到上游模型映射。`kilocode/kilo/auto` 背後的精確上游路由由 Kilo Gateway 擁有，而非在 OpenClaw 中硬編碼。</Note>

## 內建目錄

OpenClaw 會在啟動時從 Kilo Gateway 動態探索可用的模型。使用
`/models kilocode` 來查看您的帳戶可用的完整模型清單。

閘道上的任何模型都可以與 `kilocode/` 前綴搭配使用：

| 模型參考                                 | 備註                             |
| ---------------------------------------- | -------------------------------- |
| `kilocode/kilo/auto`                     | 預設 — 智慧路由                  |
| `kilocode/anthropic/claude-sonnet-4`     | 透過 Kilo 的 Anthropic           |
| `kilocode/openai/gpt-5.5`                | 透過 Kilo 的 OpenAI              |
| `kilocode/google/gemini-3.1-pro-preview` | 透過 Kilo 的 Google              |
| ...以及更多                              | 使用 `/models kilocode` 列出所有 |

<Tip>在啟動時，OpenClaw 會查詢 `GET https://api.kilo.ai/api/gateway/models` 並將探索到的模型合併到靜態後備目錄之前。隨附的後備版本總是包含 `kilocode/kilo/auto` (`Kilo Auto`)，附帶 `input: ["text", "image"]`、 `reasoning: true`、`contextWindow: 1000000` 和 `maxTokens: 128000`。</Tip>

## 配置範例

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="傳輸與相容性">
    在原始碼中，Kilo Gateway 被記錄為與 OpenRouter 相容，因此它保持
    在代理風格的 OpenAI 相容路徑上，而不是原生的 OpenAI 請求塑形。

    - 由 Gemini 支援的 Kilo refs 保持在 proxy-Gemini 路徑上，因此 OpenClaw 會
      在那裡保持 Gemini 思維簽名清理，而不啟用原生 Gemini
      重播驗證或引導重寫。
    - Kilo Gateway 在底層使用帶有您 API 金鑰的 Bearer token。

  </Accordion>

  <Accordion title="串流包裝器與推理">
    Kilo 的共用串流包裝器會新增提供者應用程式標頭，並為支援的具體模型 refs 正規化
    代理推理 payload。

    <Warning>
    `kilocode/kilo/auto` 和其他不支援代理推理的提示會跳過推理
    注入。如果您需要推理支援，請使用具體的模型 ref，例如
    `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion title="疑難排解">
    - 如果在啟動時模型探索失敗，OpenClaw 會退回到包含 `kilocode/kilo/auto` 的隨附靜態目錄。
    - 請確認您的 API 金鑰有效，且您的 Kilo 帳戶已啟用所需的模型。
    - 當 Gateway 作為 daemon 執行時，請確保 `KILOCODE_API_KEY` 對該程序可用（例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。

  </Accordion>
</AccordionGroup>

## 相關內容

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型 refs 和故障轉移行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 設定參考。
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway 儀表板、API 金鑰與帳戶管理。
  </Card>
</CardGroup>
