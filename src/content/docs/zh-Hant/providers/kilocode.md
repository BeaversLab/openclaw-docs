---
title: "Kilocode"
summary: "使用 Kilo Gateway 的統一 API 在 OpenClaw 中存取多種模型"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via Kilo Gateway in OpenClaw
---

# Kilo Gateway

Kilo Gateway 提供了一個 **統一 API**，可將請求路由到位於單一端點和 API 金鑰後方的多種模型。它與 OpenAI 相容，因此大多數 OpenAI SDK 只需切換基礎 URL 即可使用。

| 屬性     | 值                                 |
| -------- | ---------------------------------- |
| 提供商   | `kilocode`                         |
| 驗證     | `KILOCODE_API_KEY`                 |
| API      | OpenAI 相容                        |
| Base URL | `https://api.kilo.ai/api/gateway/` |

## 開始使用

<Steps>
  <Step title="Create an account">
    前往 [app.kilo.ai](https://app.kilo.ai)，登入或建立帳戶，然後導覽至 API Keys 並產生新的金鑰。
  </Step>
  <Step title="Run onboarding">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或直接設定環境變數：

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

預設模型為 `kilocode/kilo/auto`，這是由 Kilo Gateway 管理的提供商擁有的智慧路由模型。

<Note>OpenClaw 將 `kilocode/kilo/auto` 視為穩定的預設參考，但不會發布該路由的來源支援任務到上游模型的映射。`kilocode/kilo/auto` 背後的精確上游路由由 Kilo Gateway 擁有，而非在 OpenClaw 中硬式編碼。</Note>

## 可用模型

OpenClaw 會在啟動時動態從 Kilo Gateway 探索可用模型。使用
`/models kilocode` 查看您的帳戶可用的完整模型列表。

閘道上的任何模型都可以搭配 `kilocode/` 前綴使用：

| 模型參考                               | 備註                             |
| -------------------------------------- | -------------------------------- |
| `kilocode/kilo/auto`                   | 預設 — 智慧路由                  |
| `kilocode/anthropic/claude-sonnet-4`   | 透過 Kilo 的 Anthropic           |
| `kilocode/openai/gpt-5.4`              | 透過 Kilo 的 OpenAI              |
| `kilocode/google/gemini-3-pro-preview` | 透過 Kilo 的 Google              |
| ...還有更多                            | 使用 `/models kilocode` 列出所有 |

<Tip>在啟動時，OpenClaw 會查詢 `GET https://api.kilo.ai/api/gateway/models` 並將探索到的模型合併到靜態備援目錄之前。隨附的備援總是包含 帶有 `input: ["text", "image"]` 的 `kilocode/kilo/auto` (`Kilo Auto`)、 `reasoning: true`、`contextWindow: 1000000` 和 `maxTokens: 128000`。</Tip>

## 設定範例

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
    Kilo Gateway 在原始碼中被記載為與 OpenRouter 相容，因此它保持在
    代理風格的 OpenAI 相容路徑上，而非原生 OpenAI 請求塑造。

    - 由 Gemini 支援的 Kilo 引用保持在代理 Gemini 路徑上，因此 OpenClaw 在該處保留
      Gemini 思維簽章清理，而不啟用原生 Gemini
      重播驗證或引導重寫。
    - Kilo Gateway 在底層使用帶有您的 API 金鑰的 Bearer 權杖。

  </Accordion>

  <Accordion title="串流包裝器與推理">
    Kilo 的共用串流包裝器會新增提供者應用程式標頭，並針對支援的具體模型引用
    正規化代理推理承載。

    <Warning>
    `kilocode/kilo/auto` 和其他不支援代理推理的提示會跳過推理
    注入。如果您需要推理支援，請使用具體的模型引用，例如
    `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion title="疑難排解">
    - 如果在啟動時模型探索失敗，OpenClaw 會回退到包含 `kilocode/kilo/auto` 的內建靜態目錄。
    - 請確認您的 API 金鑰有效，且您的 Kilo 帳戶已啟用所需的模型。
    - 當 Gateway 以守護程式執行時，請確保該程序可以使用 `KILOCODE_API_KEY`（例如在 `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型引用和故障轉移行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration" icon="gear">
    完整的 OpenClaw 設定參考。
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway 儀表板、API 金鑰和帳戶管理。
  </Card>
</CardGroup>
