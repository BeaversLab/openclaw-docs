---
summary: "使用裝置流程或非互動式 Token 匯入，從 OpenClaw 登入 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 程式碼編寫助理。它提供對您 GitHub 帳戶和方案所對應的 Copilot 模型的存取權。OpenClaw 可以透過兩種不同的方式將 Copilot 作為模型提供者使用。

## 在 OpenClaw 中使用 Copilot 的兩種方式

<Tabs>
  <Tab title="內建提供者 (github-copilot)">
    使用原生的裝置登入流程取得 GitHub token，然後在 OpenClaw 執行時將其交換為
    Copilot API token。這是**預設**且最簡單的路徑，
    因為它不需要 VS Code。

    <Steps>
      <Step title="執行登入指令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系統會提示您前往一個 URL 並輸入一次性代碼。請保持終端機開啟，直到完成為止。
      </Step>
      <Step title="設定預設模型">
        ```bash
        openclaw models set github-copilot/claude-opus-4.7
        ```

        或在設定中：

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
    使用 **Copilot Proxy** VS Code 擴充功能作為本機橋接器。OpenClaw 與
    Proxy 的 `/v1` 端點通訊，並使用您在那裡設定的模型清單。

    <Note>
    當您已經在 VS Code 中執行 Copilot Proxy 或需要透過它進行路由時，請選擇此選項。
    您必須啟用外掛程式並保持 VS Code 擴充功能執行中。
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

如果您已經有 Copilot 的 GitHub OAuth 存取 token，請在
無頭設定期間使用 `openclaw onboard --non-interactive` 將其匯入：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

您也可以省略 `--auth-choice`；傳遞 `--github-copilot-token` 會推斷
GitHub Copilot 提供者驗證選擇。如果省略該旗標，入門流程會
回退到 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`，然後是 `GITHUB_TOKEN`。使用
`--secret-input-mode ref` 並設定 `COPILOT_GITHUB_TOKEN`，以儲存由環境變數支援的
`tokenRef`，而不是在 `auth-profiles.json` 中儲存純文字。

<AccordionGroup>
  <Accordion title="需要互動式 TTY">
    裝置登入流程需要一個互動式 TTY。請直接在終端機中執行，而不是在非互動式腳本或 CI 管線中執行。
  </Accordion>

<Accordion title="模型可用性取決於您的方案">Copilot 模型的可用性取決於您的 GitHub 方案。如果模型被拒絕，請嘗試另一個 ID（例如 `github-copilot/gpt-5.5`）。請參閱 GitHub 的 [每個 Copilot 方案支援的模型](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) 以取得最新的模型清單。</Accordion>

  <Accordion title="從 Copilot API 即時更新目錄">
    一旦裝置登入（或環境變數）驗證路徑解析了 GitHub 權杖，
    OpenClaw 會視需要從 `${baseUrl}/models` 
    （與 VS Code Copilot 使用的端點相同）更新模型目錄，以便執行時期追蹤
    每個帳戶的權限和準確的上下文視窗，而不會造成清單
    的變動。新發布的 Copilot 模型無需升級 OpenClaw 
    即可顯示，且上下文視窗會反映實際的各模型限制
    （例如 gpt-5.x 系列為 400k，內部
    `claude-opus-*-1m` 變體為 1M）。

    當探索功能被停用、使用者沒有 GitHub 驗證設定檔、權杖交換
    失敗，或 `/models` HTTPS 呼叫發生錯誤時，
    捆綁的靜態目錄會作為可見的備案。若要選擇退出並完全
    依賴靜態清單目錄（離線 / 物理隔離場景）：

    ```json5
    {
      plugins: {
        entries: {
          "github-copilot": {
            config: { discovery: { enabled: false } },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="傳輸選擇">Claude 模型 ID 會自動使用 Anthropic Messages 傳輸。GPT、 o-series 和 Gemini 模型會保留 OpenAI Responses 傳輸。OpenClaw 會根據模型參考選擇正確的傳輸方式。</Accordion>

<Accordion title="請求相容性">OpenClaw 會在 Copilot 傳輸上發送 Copilot IDE 風格的請求標頭， 包括內建的壓縮、工具結果和圖像後續輪次。除非 已針對 Copilot 的 API 驗證該行為，否則它不會為 Copilot 啟用提供者層級的 Responses 延續。</Accordion>

  <Accordion title="環境變數解析順序">
    OpenClaw 會依據下列優先順序從環境變數解析 Copilot 驗證資訊：

    | 優先順序 | 變數                    | 備註                                |
    | -------- | ----------------------- | ----------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高優先權，Copilot 專用              |
    | 2        | `GH_TOKEN`            | GitHub CLI 權杖 (備用)               |
    | 3        | `GITHUB_TOKEN`        | 標準 GitHub 權杖 (最低)               |

    當設定了多個變數時，OpenClaw 將使用優先順序最高者。
    裝置登入流程 (`openclaw models auth login-github-copilot`) 會將其權杖儲存在
    驗證設定檔存放區中，並且優先順序高於所有環境變數。

  </Accordion>

  <Accordion title="權杖儲存">
    登入程序會將 GitHub 權杖儲存在驗證設定檔存放區中，並在 OpenClaw
    執行時將其交換為 Copilot API 權杖。您不需要手動管理該權杖。
  </Accordion>
</AccordionGroup>

<Warning>裝置登入指令需要一個互動式 TTY。當您需要無介面 (headless) 設定時，請使用非互動式入門流程。</Warning>

## 記憶體搜尋嵌入

GitHub Copilot 也可以作為 [記憶體搜尋](/zh-Hant/concepts/memory-search) 的嵌入供應商。如果您有 Copilot
訂閱並且已登入，OpenClaw 可以使用它進行嵌入，而不需要額外的 API 金鑰。

### 自動偵測

當 `memorySearch.provider` 為 `"auto"` (預設值) 時，GitHub Copilot 會以優先順序 15
進行嘗試 —— 在本地嵌入之後，但在 OpenAI 和其他付費供應商之前。如果 GitHub 權杖可用，
OpenClaw 會從 Copilot API 探索可用的嵌入模型並自動選擇最佳的一個。

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

1. OpenClaw 解析您的 GitHub 權杖 (來自環境變數或驗證設定檔)。
2. 將其交換為短期有效的 Copilot API 權杖。
3. 查詢 Copilot `/models` 端點以探索可用的嵌入模型。
4. 挑選最佳模型 (偏好 `text-embedding-3-small`)。
5. 將嵌入請求傳送至 Copilot `/embeddings` 端點。

模型可用性取決於您的 GitHub 方案。如果沒有可用的嵌入模型，OpenClaw 將跳過 Copilot 並嘗試下一個供應商。

## 相關內容

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和容錯移轉行為。
  </Card>
  <Card title="OAuth 和驗證" href="/zh-Hant/gateway/authentication" icon="key">
    驗證詳細資訊和憑證重複使用規則。
  </Card>
</CardGroup>
