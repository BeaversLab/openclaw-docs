---
title: "Arcee AI"
summary: "Arcee AI 設定（驗證 + 模型選擇）"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) 提供透過 OpenAI 相容 API 存取 Trinity 系列混合專家模型 的權限。所有 Trinity 模型均採用 Apache 2.0 授權。

可以直接透過 Arcee 平台或透過 [OpenRouter](/en/providers/openrouter) 存取 Arcee AI 模型。

| 屬性     | 數值                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 供應商   | `arcee`                                                                                |
| 驗證     | `ARCEEAI_API_KEY` （直接）或 `OPENROUTER_API_KEY` （透過 OpenRouter）                  |
| API      | OpenAI 相容                                                                            |
| 基礎網址 | `https://api.arcee.ai/api/v1` （直接）或 `https://openrouter.ai/api/v1` （OpenRouter） |

## 快速入門

<Tabs>
  <Tab title="直接">
    <Steps>
      <Step title="取得 API 金鑰">
        在 [Arcee AI](https://chat.arcee.ai/) 建立 API 金鑰。
      </Step>
      <Step title="執行引導程式">
        ```bash
        openclaw onboard --auth-choice arceeai-api-key
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="透過 OpenRouter">
    <Steps>
      <Step title="取得 API 金鑰">
        在 [OpenRouter](https://openrouter.ai/keys) 建立 API 金鑰。
      </Step>
      <Step title="執行引導程式">
        ```bash
        openclaw onboard --auth-choice arceeai-openrouter
        ```
      </Step>
      <Step title="設定預設模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```

        相同的模型參照 適用於直接設定和 OpenRouter 設定（例如 `arcee/trinity-large-thinking`）。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 非互動式設定

<Tabs>
  <Tab title="Direct (Arcee platform)">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab title="透過 OpenRouter">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

## 內建目錄

OpenClaw 目前隨附此捆綁的 Arcee 目錄：

| 模型參照                       | 名稱                   | 輸入 | 內文 | 成本（輸入/輸出每 1M） | 備註                       |
| ------------------------------ | ---------------------- | ---- | ---- | ---------------------- | -------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | 文字 | 256K | $0.25 / $0.90          | 預設模型；已啟用推理       |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | 文字 | 128K | $0.25 / $1.00          | 通用；400B 參數，13B 啟用  |
| `arcee/trinity-mini`           | Trinity Mini 26B       | 文字 | 128K | $0.045 / $0.15         | 快速且具成本效益；函數呼叫 |

<Tip>入門預設將 `arcee/trinity-large-thinking` 設定為預設模型。</Tip>

## 支援的功能

| 功能                                | 是否支援                     |
| ----------------------------------- | ---------------------------- |
| 串流                                | 是                           |
| 工具使用 / 函數呼叫                 | 是                           |
| 結構化輸出（JSON 模式和 JSON 架構） | 是                           |
| 擴展思考                            | 是（Trinity Large Thinking） |

<AccordionGroup>
  <Accordion title="環境注意事項">
    如果 Gateway 作為守護程序運行，請確保 `ARCEEAI_API_KEY`
    （或 `OPENROUTER_API_KEY`） 可供該程序使用（例如，在
    `~/.openclaw/.env` 中或透過 `env.shellEnv`）。
  </Accordion>

  <Accordion title="OpenRouter 路由">
    透過 OpenRouter 使用 Arcee 模型時，適用相同的 `arcee/*` 模型參照。
    OpenClaw 會根據您的驗證選擇透明地處理路由。請參閱
    [OpenRouter 提供者文件](/en/providers/openrouter) 以取得 OpenRouter 特定的
    組態詳細資訊。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/en/providers/openrouter" icon="shuffle">
    透過單一 API 金鑰存取 Arcee 模型和許多其他模型。
  </Card>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
</CardGroup>
