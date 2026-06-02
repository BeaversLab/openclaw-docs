---
summary: "使用裝置流程或非互動式權杖匯入，從 OpenClaw 登入 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
  - You are choosing between the built-in Copilot provider, Copilot SDK harness, and Copilot Proxy
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 程式設計助理。它根據您的 GitHub 帳戶和方案提供對 Copilot 模型的存取。OpenClaw 可以透過三種不同方式將 Copilot 作為模型提供者或代理執行環境使用。

## 在 OpenClaw 中使用 Copilot 的三種方式

<Tabs>
  <Tab title="內建提供者 (github-copilot)">
    使用原生裝置登入流程取得 GitHub 權杖，然後在 OpenClaw 執行時將其交換為 Copilot API 權杖。這是**預設**且最簡單的路徑，因為它不需要 VS Code。

    <Steps>
      <Step title="執行登入指令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        您將收到提示前往造訪 URL 並輸入一次性代碼。請保持終端機開啟直到完成。
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

  <Tab title="Copilot SDK 套件掛載外掛程式 (copilot)">
    當您希望 GitHub 的 Copilot CLI 和 SDK 擁有所選 `github-copilot/*` 模型的低層級代理迴圈時，請安裝外部 `@openclaw/copilot` 外掛程式。

    ```bash
    openclaw plugins install clawhub:@openclaw/copilot
    ```

    然後將模型或提供者選入執行環境：

    ```json5
    {
      agents: {
        defaults: {
          model: "github-copilot/gpt-5.5",
          models: {
            "github-copilot/gpt-5.5": {
              agentRuntime: { id: "copilot" },
            },
          },
        },
      },
    }
    ```

    當您需要原生 Copilot CLI 工作階段、SDK 管理的執行緒狀態，以及 Copilot 擁有的代理輪次壓縮時，請選擇此選項。請參閱 [Copilot SDK 套件掛載](/zh-Hant/plugins/copilot) 以了解完整的執行環境合約。

  </Tab>

  <Tab title="Copilot Proxy 外掛程式 (copilot-proxy)">
    使用 **Copilot Proxy** VS Code 擴充功能作為本機橋接器。OpenClaw 會與 Proxy 的 `/v1` 端點通訊，並使用您在那裡設定的模型清單。

    <Note>
    當您已在 VS Code 中執行 Copilot Proxy 或需要透過它進行路由時，請選擇此選項。您必須啟用外掛程式並保持 VS Code 擴充功能執行中。
    </Note>

  </Tab>
</Tabs>

## 選用旗標

| 旗標            | 說明                         |
| --------------- | ---------------------------- |
| `--yes`         | 跳過確認提示                 |
| `--set-default` | 同時套用供應商推薦的預設模型 |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## 非互動式入門導覽

如果您已經有用於 Copilot 的 GitHub OAuth 存取權杖，請在無介面安裝期間使用 `openclaw onboard --non-interactive` 匯入：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

您也可以省略 `--auth-choice`；傳遞 `--github-copilot-token` 會推斷 GitHub Copilot 供應商的驗證選項。如果省略該旗標，入門導覽會依序回退到 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`，然後是 `GITHUB_TOKEN`。使用 `--secret-input-mode ref` 並設定 `COPILOT_GITHUB_TOKEN`，以在 `auth-profiles.json` 中儲存由環境變數支援的 `tokenRef`，而非明文。

<AccordionGroup>
  <Accordion title="需要互動式 TTY">
    裝置登入流程需要互動式 TTY。請直接在終端機中執行，不要在非互動式腳本或 CI 管線中執行。
  </Accordion>

<Accordion title="模型可用性取決於您的方案">Copilot 模型的可用性取決於您的 GitHub 方案。如果模型被拒絕，請嘗試其他 ID（例如 `github-copilot/gpt-5.5`）。請參閱 GitHub 的[每個 Copilot 方案的支援模型](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) 以取得目前的模型清單。</Accordion>

  <Accordion title="從 Copilot API 即時更新目錄">
    一旦裝置登入（或環境變數）驗證路徑解析了 GitHub token，
    OpenClaw 會按需從 `${baseUrl}/models`
    （VS Code Copilot 使用的相同端點）更新模型目錄，以便運行時追蹤
    每個帳戶的權限和準確的上下文視窗，而不需要清單頻繁變動。
    新發布的 Copilot 模型無需升級 OpenClaw 即可見，
    且上下文視窗會反映真實的每個模型限制
    （例如 gpt-5.x 系列為 400k，內部 `claude-opus-*-1m` 變體為 1M）。

    當探索功能被停用、使用者沒有 GitHub 驗證設定檔、token 交換失敗，
    或 `/models` HTTPS 呼叫錯誤時，
    捆綁的靜態目錄會作為可見的備選方案。
    若要選擇退出並完全依賴靜態清單目錄（離線 / 物理隔離情境）：

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

<Accordion title="傳輸選擇">Claude 模型 ID 自動使用 Anthropic Messages 傳輸。 GPT、o 系列和 Gemini 模型則保留 OpenAI Responses 傳輸。 OpenClaw 會根據模型參照選擇正確的傳輸方式。</Accordion>

<Accordion title="請求相容性">OpenClaw 在 Copilot 傳輸上發送 Copilot IDE 風格的請求標頭， 包括內建的壓縮、工具結果和圖片後續輪次。 除非該行為已針對 Copilot 的 API 進行驗證， 否則它不會為 Copilot 啟用提供者層級的 Responses 續傳功能。</Accordion>

  <Accordion title="環境變數解析順序">
    OpenClaw 會依照下列優先順序從環境變數解析 Copilot 驗證資訊：

    | 優先順序 | 變數                  | 備註                              |
    | -------- | --------------------- | --------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高優先順序，Copilot 專用            |
    | 2        | `GH_TOKEN`            | GitHub CLI 權杖 (fallback)        |
    | 3        | `GITHUB_TOKEN`        | 標準 GitHub 權杖 (最低)          |

    當設定了多個變數時，OpenClaw 將使用優先順序最高的一個。
    裝置登入流程 (`openclaw models auth login-github-copilot`) 會將
    其權杖儲存在驗證設定檔儲存庫中，並優先於所有環境變數。

  </Accordion>

  <Accordion title="權杖儲存">
    登入程序會將 GitHub 權杖儲存在驗證設定檔儲存庫中，並在 OpenClaw 執行時將其
    交換為 Copilot API 權杖。您無需手動管理該權杖。
  </Accordion>
</AccordionGroup>

<Warning>裝置登入指令需要互動式 TTY。當您需要無介面設定時，請使用非互動式 入門流程。</Warning>

## 記憶體搜尋嵌入

GitHub Copilot 也可以作為
[記憶體搜尋](/zh-Hant/concepts/memory-search) 的嵌入提供者。如果您擁有 Copilot 訂閱並且
已登入，OpenClaw 可以使用它來處理嵌入，而不需要額外的 API 金鑰。

### 設定

明確設定 `memorySearch.provider` 以使用 GitHub Copilot 嵌入。如果有可用的
GitHub 權杖，OpenClaw 會從 Copilot API 探索可用的嵌入模型，並自動選擇最佳的一個。

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
2. 將其交換為短期的 Copilot API 權杖。
3. 查詢 Copilot `/models` 端點以探索可用的嵌入模型。
4. 選擇最佳模型 (優先 `text-embedding-3-small`)。
5. 將嵌入請求傳送至 Copilot `/embeddings` 端點。

模型可用性取決於您的 GitHub 方案。如果沒有可用的嵌入模型，
OpenClaw 將跳過 Copilot 並嘗試下一個提供者。

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="OAuth 和身份驗證" href="/zh-Hant/gateway/authentication" icon="key">
    身份驗證詳細資訊和憑證重複使用規則。
  </Card>
</CardGroup>
