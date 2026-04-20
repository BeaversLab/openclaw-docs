---
title: "Chutes"
summary: "Chutes 設定 (OAuth 或 API 金鑰、模型探索、別名)"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

# Chutes

[Chutes](https://chutes.ai) 透過與 OpenAI 相容的 API 公開開源模型目錄。OpenClaw 支援內建 `chutes` 提供者的瀏覽器 OAuth 和直接 API 金鑰驗證。

| 屬性     | 值                          |
| -------- | --------------------------- |
| 提供者   | `chutes`                    |
| API      | 與 OpenAI 相容              |
| 基礎 URL | `https://llm.chutes.ai/v1`  |
| 驗證     | OAuth 或 API 金鑰（見下文） |

## 開始使用

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="執行 OAuth 入門流程">```bash openclaw onboard --auth-choice chutes ``` OpenClaw 會在本地啟動瀏覽器流程，或在遠端/無介面主機上顯示 URL + 重新導向貼上流程。OAuth 權杖會透過 OpenClaw 驗證設定檔自動重新整理。</Step>
      <Step title="驗證預設模型">入門完成後，預設模型會設定為 `chutes/zai-org/GLM-4.7-TEE`，並且會註冊內建的 Chutes 目錄。</Step>
    </Steps>
  </Tab>
  <Tab title="API 金鑰">
    <Steps>
      <Step title="取得 API 金鑰">在 [chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys) 建立金鑰。</Step>
      <Step title="執行 API 金鑰入門流程">```bash openclaw onboard --auth-choice chutes-api-key ```</Step>
      <Step title="驗證預設模型">入門完成後，預設模型會設定為 `chutes/zai-org/GLM-4.7-TEE`，並且會註冊內建的 Chutes 目錄。</Step>
    </Steps>
  </Tab>
</Tabs>

<Note>這兩種驗證方式都會註冊內建的 Chutes 目錄，並將預設模型設定為 `chutes/zai-org/GLM-4.7-TEE`。執行時期環境變數：`CHUTES_API_KEY`、 `CHUTES_OAUTH_TOKEN`。</Note>

## 探索行為

當可以使用 Chutes 驗證時，OpenClaw 會使用該憑證查詢 Chutes 目錄並使用探索到的模型。如果探索失敗，OpenClaw 會退回到內建的靜態目錄，以便入門和啟動仍然能正常運作。

## 預設別名

OpenClaw 會為內建的 Chutes 目錄註冊三個便利別名：

| 別名            | 目標模型                                              |
| --------------- | ----------------------------------------------------- |
| `chutes-fast`   | `chutes/zai-org/GLM-4.7-FP8`                          |
| `chutes-pro`    | `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes-vision` | `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |

## 內建入門目錄

隨附的備用目錄包含目前的 Chutes 參考：

| 模型參考                                              |
| ----------------------------------------------------- |
| `chutes/zai-org/GLM-4.7-TEE`                          |
| `chutes/zai-org/GLM-5-TEE`                            |
| `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`             |
| `chutes/moonshotai/Kimi-K2.5-TEE`                     |
| `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |
| `chutes/Qwen/Qwen3-Coder-Next-TEE`                    |
| `chutes/openai/gpt-oss-120b-TEE`                      |

## 設定範例

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="OAuth 覆寫">
    您可以使用選用的環境變數來自訂 OAuth 流程：

    | 變數 | 用途 |
    | -------- | ------- |
    | `CHUTES_CLIENT_ID` | 自訂 OAuth 用戶端 ID |
    | `CHUTES_CLIENT_SECRET` | 自訂 OAuth 用戶端金鑰 |
    | `CHUTES_OAUTH_REDIRECT_URI` | 自訂重新導向 URI |
    | `CHUTES_OAUTH_SCOPES` | 自訂 OAuth 範圍 |

    參閱 [Chutes OAuth 文件](https://chutes.ai/docs/sign-in-with-chutes/overview)
    以了解重新導向應用程式的需求與協助。

  </Accordion>

  <Accordion title="備註">
    - API 金鑰和 OAuth 探索都使用相同的 `chutes` 提供者 ID。
    - Chutes 模型會註冊為 `chutes/<model-id>`。
    - 如果在啟動時探索失敗，將會自動使用隨附的靜態目錄。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型提供者" href="/en/concepts/model-providers" icon="layers">
    提供者規則、模型參考和故障轉移行為。
  </Card>
  <Card title="設定參考" href="/en/gateway/configuration-reference" icon="gear">
    完整的設定架構，包括提供者設定。
  </Card>
  <Card title="Chutes" href="https://chutes.ai" icon="arrow-up-right-from-square">
    Chutes 儀表板和 API 文件。
  </Card>
  <Card title="Chutes API 金鑰" href="https://chutes.ai/settings/api-keys" icon="key">
    建立並管理 Chutes API 金鑰。
  </Card>
</CardGroup>
