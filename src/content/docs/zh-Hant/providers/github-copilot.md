---
summary: "使用裝置流程從 OpenClaw 登入 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

GitHub Copilot 是 GitHub 的 AI 程式設計助理。它根據您的 GitHub 帳戶和方案提供對 Copilot 模型的存取權。OpenClaw 可以透過兩種不同的方式將 Copilot 作為模型提供者使用。

## 在 OpenClaw 中使用 Copilot 的兩種方式

<Tabs>
  <Tab title="內建提供者 (github-copilot)">
    使用原生的裝置登入流程取得 GitHub 權杖，然後在 OpenClaw 執行時將其交換為 Copilot API 權杖。這是**預設**且最簡單的方式，因為它不需要 VS Code。

    <Steps>
      <Step title="執行登入指令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        您將被要求前往一個 URL 並輸入一次性代碼。請保持終端機開啟，直到完成為止。
      </Step>
      <Step title="設定預設模型">
        ```bash
        openclaw models set github-copilot/claude-opus-4.6
        ```

        或在設定中：

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.6" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Copilot Proxy 外掛程式 (copilot-proxy)">
    使用 **Copilot Proxy** VS Code 擴充功能作為本機橋接器。OpenClaw 會與 Proxy 的 `/v1` 端點通訊，並使用您在那裡設定的模型清單。

    <Note>
    當您已在 VS Code 中執行 Copilot Proxy 或需要透過它進行路由時，請選擇此選項。您必須啟用此外掛程式並保持 VS Code 擴充功能執行中。
    </Note>

  </Tab>
</Tabs>

## 可選旗標

| 旗標            | 說明                           |
| --------------- | ------------------------------ |
| `--yes`         | 跳過確認提示                   |
| `--set-default` | 同時也套用提供者推薦的預設模型 |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

<AccordionGroup>
  <Accordion title="需要互動式 TTY">
    裝置登入流程需要一個互動式 TTY。請直接在終端機中執行，而不要在非互動式指令碼或 CI 管線中執行。
  </Accordion>

<Accordion title="模型可用性取決於您的方案">Copilot 模型的可用性取決於您的 GitHub 方案。如果模型被拒絕，請嘗試其他 ID (例如 `github-copilot/gpt-4.1`)。</Accordion>

<Accordion title="傳輸選擇">Claude 模型 ID 自動使用 Anthropic Messages 傳輸。GPT、o 系列和 Gemini 模型則保留 OpenAI Responses 傳輸。OpenClaw 會根據模型參考選擇正確的傳輸方式。</Accordion>

  <Accordion title="環境變數解析順序">
    OpenClaw 會依照下列優先順序從環境變數解析 Copilot 驗證資訊：

    | Priority | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高優先順序，Copilot 專用 |
    | 2        | `GH_TOKEN`            | GitHub CLI 權杖 (備用)      |
    | 3        | `GITHUB_TOKEN`        | 標準 GitHub 權杖 (最低)   |

    當設定了多個變數時，OpenClaw 會使用優先順序最高的一個。
    裝置登入流程 (`openclaw models auth login-github-copilot`) 會將其權杖儲存在驗證設定檔存放區中，並且優先於所有環境變數。

  </Accordion>

  <Accordion title="權杖儲存">
    登入程序會在驗證設定檔存放區中儲存一個 GitHub 權杖，並在 OpenClaw 執行時將其交換為 Copilot API 權杖。您不需要手動管理權杖。
  </Accordion>
</AccordionGroup>

<Warning>需要互動式 TTY。請直接在終端機中執行登入指令， 請勿在無頭腳本 (headless script) 或 CI 任務中執行。</Warning>

## 記憶體搜尋嵌入

GitHub Copilot 也可以作為 [記憶體搜尋](/zh-Hant/concepts/memory-search) 的嵌入提供者。如果您有 Copilot 訂閱並且已登入，OpenClaw 可以使用它來進行嵌入，而不需要額外的 API 金鑰。

### 自動偵測

當 `memorySearch.provider` 為 `"auto"` (預設值) 時，GitHub Copilot 會以優先順序 15 嘗試使用 —— 在本地嵌入之後，但在 OpenAI 和其他付費提供者之前。如果有 GitHub 權杖可用，OpenClaw 會從 Copilot API 探索可用的嵌入模型，並自動選擇最好的一個。

### 明確設定

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "github-copilot",
        // Optional: override the auto-discovered model
        model: "text-embedding-3-small",
      },
    },
  },
}
```

### 運作方式

1. OpenClaw 會解析您的 GitHub 權杖 (來自環境變數或驗證設定檔)。
2. 將其交換為短期有效的 Copilot API 權杖。
3. 查詢 Copilot `/models` 端點以探索可用的嵌入模型。
4. 挑選最佳模型（偏好 `text-embedding-3-small`）。
5. 將嵌入請求傳送至 Copilot `/embeddings` 端點。

模型可用性取決於您的 GitHub 方案。如果沒有可用的嵌入模型，OpenClaw 會跳過 Copilot 並嘗試下一個供應商。

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="OAuth 和驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重複使用規則。
  </Card>
</CardGroup>
