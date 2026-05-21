---
summary: "code_execution：使用 xAI 執行沙盒化遠端 Python 分析"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "程式碼執行"
---

`code_execution` 在 xAI 的 Responses API 上執行沙盒化遠端 Python 分析。它由內建的 `xai` 外掛程式（根據 `tools` 合約）註冊，並分派至與 `x_search` 使用的相同 `https://api.x.ai/v1/responses` 端點。

| 屬性            | 值                                                                         |
| --------------- | -------------------------------------------------------------------------- |
| 工具名稱        | `code_execution`                                                           |
| 提供者外掛程式  | `xai` (內建，`enabledByDefault: true`)                                     |
| 驗證            | xAI 設定檔、`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey` |
| 預設模型        | `grok-4-1-fast`                                                            |
| 預設逾時        | 30 秒                                                                      |
| 預設 `maxTurns` | 未設定（xAI 應用其內部限制）                                               |

這與本機 [`exec`](/zh-Hant/tools/exec) 不同：

- `exec` 在您的機器或配對節點上執行 shell 指令。
- `code_execution` 在 xAI 的遠端沙盒中執行 Python。

在以下情況使用 `code_execution`：

- 計算。
- 製表。
- 快速統計。
- 圖表式分析。
- 分析由 `x_search` 或 `web_search` 傳回的資料。

當您需要本機檔案、您的 shell、您的存放庫或配對裝置時，請**勿**使用它。請改用 [`exec`](/zh-Hant/tools/exec)。

## 設定

<Steps>
  <Step title="提供 xAI 憑證">
    使用符合資格的 SuperGrok 或 X Premium 訂閱透過 Grok OAuth 登入、
    使用支援遠端的裝置代碼流程，或儲存 API 金鑰。OAuth 適用於
    `code_execution` 和 `x_search`；`XAI_API_KEY` 或外掛程式網路搜尋
    設定也可以驅動 Grok `web_search`。

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw models auth login --provider xai --device-code
    ```

    在全新安裝期間，相同的驗證選項可在
    入門流程中使用：

    ```bash
    openclaw onboard --install-daemon
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    或使用 API 金鑰：

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

    或透過設定：

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              webSearch: {
                apiKey: "xai-...",
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="啟用並調整 code_execution">
    當提供 xAI 憑證時，`code_execution` 即可使用。設定
    `plugins.entries.xai.config.codeExecution.enabled` 為 `false` 以停用它，
    或使用同一個區塊來調整模型和逾時設定。

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast", // override the default xAI code-execution model
                maxTurns: 2,            // optional cap on internal tool turns
                timeoutSeconds: 30,     // request timeout (default: 30)
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="重新啟動 Gateway">
    ```bash
    openclaw gateway restart
    ```

    一旦 xAI 外掛程式向 `enabled: true` 重新註冊，`code_execution` 就會顯示在代理程式的工具清單中。

  </Step>
</Steps>

## 使用方法

自然地提問，並明確說明分析意圖：

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

此工具在內部接受單一 `task` 參數，因此代理程式應該在一個提示中傳送完整的分析請求和任何內聯資料。

## 錯誤

當工具在未經驗證的情況下執行時，它會傳回結構化的 `missing_xai_api_key` 錯誤，指出 auth-profile、環境變數和配置選項。該錯誤是 JSON 格式，而不是拋出的異常，因此代理程式可以自我修正：

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution needs xAI credentials. Run `openclaw onboard --auth-choice xai-oauth` to sign in with Grok, run `openclaw onboard --auth-choice xai-api-key`, set `XAI_API_KEY` in the Gateway environment, or configure `plugins.entries.xai.config.webSearch.apiKey`.",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## 限制

- 這是遠端 xAI 執行，而不是本機進程執行。
- 將結果視為臨時分析，而不是持久的筆記本會話。
- 不要假設可以存取本機檔案或您的工作區。
- 若要取得最新的 X 資料，請先使用 [`x_search`](/zh-Hant/tools/web#x_search)，然後將結果傳遞給 `code_execution`。

## 相關

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/zh-Hant/tools/exec" icon="terminal">
    在您的機器或配對節點上執行本機 Shell 指令。
  </Card>
  <Card title="Exec 核准" href="/zh-Hant/tools/exec-approvals" icon="shield">
    用於 Shell 執行的允許/拒絕原則。
  </Card>
  <Card title="Web 工具" href="/zh-Hant/tools/web" icon="globe">
    `web_search`、`x_search` 和 `web_fetch`。
  </Card>
  <Card title="xAI 提供者" href="/zh-Hant/providers/xai" icon="microchip">
    Grok 模型、web/x 搜尋和程式碼執行配置。
  </Card>
</CardGroup>
