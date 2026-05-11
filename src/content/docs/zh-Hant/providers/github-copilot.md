---
summary: "透過裝置流程或非互動式 Token 匯入，從 OpenClaw 登入 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 程式碼編寫助理。它提供對您 GitHub 帳戶和方案所對應的 Copilot 模型的存取權。OpenClaw 可以透過兩種不同的方式將 Copilot 作為模型提供者使用。

## 在 OpenClaw 中使用 Copilot 的兩種方式

<Tabs>
  <Tab title="內建提供者 (github-copilot)">
    使用原生的裝置登入流程取得 GitHub Token，然後在 OpenClaw 執行時將其交換為 Copilot API Token。這是**預設**且最簡單的方式，因為它不需要 VS Code。

    <Steps>
      <Step title="執行登入指令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系統會提示您前往造訪一個 URL 並輸入一次性代碼。請在程序完成前保持終端機開啟。
      </Step>
      <Step title="設定預設模型">
        ```bash
        openclaw models set github-copilot/claude-opus-4.7
        ```

        或在設定檔中：

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.7" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Copilot Proxy 外掛程式 (copilot-proxy)">
    使用 **Copilot Proxy** VS Code 擴充功能作為本機橋樑。OpenClaw 會與 Proxy 的 `/v1` 端點通訊，並使用您在那裡設定的模型列表。

    <Note>
    當您已經在 VS Code 中執行 Copilot Proxy 或需要透過它進行路由時，請選擇此選項。您必須啟用此外掛程式並讓 VS Code 擴充功能保持執行。
    </Note>

  </Tab>
</Tabs>

## 選用旗標

| 旗標            | 說明                         |
| --------------- | ---------------------------- |
| `--yes`         | 跳過確認提示                 |
| `--set-default` | 一併套用提供者建議的預設模型 |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## 非互動式入門

如果您已經有 Copilot 的 GitHub OAuth 存取 Token，請在無介面設定期間使用 `openclaw onboard --non-interactive` 將其匯入：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

您也可以省略 `--auth-choice`；傳遞 `--github-copilot-token` 會推斷
GitHub Copilot 提供者的驗證選擇。如果省略該旗標，入門流程會依序
後退至 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`，然後是 `GITHUB_TOKEN`。使用
設定為 `COPILOT_GITHUB_TOKEN` 的 `--secret-input-mode ref`，將 `tokenRef` 儲存為由環境變數支援
而非純文字的形式存於 `auth-profiles.json` 中。

<AccordionGroup>
  <Accordion title="需要互動式 TTY">
    裝置登入流程需要一個互動式 TTY。請直接在終端機中執行，而
    不要在非互動式腳本或 CI 管線中執行。
  </Accordion>

<Accordion title="模型可用性取決於您的方案">Copilot 模型的可用性取決於您的 GitHub 方案。如果模型被 拒絕，請嘗試另一個 ID（例如 `github-copilot/gpt-4.1`）。</Accordion>

<Accordion title="傳輸選擇">Claude 模型 ID 會自動使用 Anthropic Messages 傳輸。GPT、 o-series 和 Gemini 模型則保持使用 OpenAI Responses 傳輸。OpenClaw 會根據模型參考選擇正確的傳輸方式。</Accordion>

<Accordion title="請求相容性">OpenClaw 在 Copilot 傳輸上發送 Copilot IDE 風格的請求標頭， 包括內建的壓縮、工具結果和圖像後續回合。它不會為 Copilot 啟用 提供者層級的 Responses 延續，除非該行為已針對 Copilot 的 API 進行過驗證。</Accordion>

  <Accordion title="環境變數解析順序">
    OpenClaw 會依照下列優先順序，從環境變數中解析 Copilot 的驗證資訊：

    | Priority | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高優先權，Copilot 專屬 |
    | 2        | `GH_TOKEN`            | GitHub CLI token (後備)      |
    | 3        | `GITHUB_TOKEN`        | 標準 GitHub token (最低)   |

    當設定了多個變數時，OpenClaw 將使用優先順序最高的那一個。
    裝置登入流程 (`openclaw models auth login-github-copilot`) 會將
    其 token 儲存在 auth profile store 中，並且優先於所有環境
    變數。

  </Accordion>

  <Accordion title="Token 儲存">
    登入程序會將 GitHub token 儲存在 auth profile store 中，並在 OpenClaw 執行時將其
    交換為 Copilot API token。您不需要手動管理
    這個 token。
  </Accordion>
</AccordionGroup>

<Warning>裝置登入指令需要一個互動式 TTY。當您需要無介面設定時， 請使用非互動式上架。</Warning>

## 記憶體搜尋嵌入

GitHub Copilot 也可以作為
[記憶體搜尋](/zh-Hant/concepts/memory-search) 的嵌入提供者。如果您有 Copilot 訂閱並且
已登入，OpenClaw 可以使用它來處理嵌入，而不需要額外的 API 金鑰。

### 自動偵測

當 `memorySearch.provider` 為 `"auto"` (預設值) 時，GitHub Copilot 會以優先順序 15 被嘗試
—— 在本機嵌入之後，但在 OpenAI 和其他付費
提供者之前。如果有 GitHub token 可用，OpenClaw 會從 Copilot API 探索可用的
嵌入模型並自動選擇最好的一個。

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

1. OpenClaw 解析您的 GitHub token (從環境變數或 auth profile)。
2. 將其交換為短期的 Copilot API token。
3. 查詢 Copilot `/models` 端點以探索可用的嵌入模型。
4. 挑選最佳模型 (優先 `text-embedding-3-small`)。
5. 將嵌入請求傳送到 Copilot `/embeddings` 端點。

模型的可用性取決於您的 GitHub 方案。如果沒有可用的嵌入模型，OpenClaw 將跳過 Copilot 並嘗試下一個提供者。

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
  <Card title="OAuth 與認證" href="/zh-Hant/gateway/authentication" icon="key">
    認證詳情與憑證重複使用規則。
  </Card>
</CardGroup>
