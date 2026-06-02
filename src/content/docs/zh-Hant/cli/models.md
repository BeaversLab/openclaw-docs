---
summary: "`openclaw models` 的 CLI 參考資料（status/list/set/scan、別名、備援、驗證）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "模型"
---

# `openclaw models`

Model discovery, scanning, and configuration (default model, fallbacks, auth profiles).

相關：

- 供應商 + 模型：[Models](/zh-Hant/providers/models)
- 模型選擇概念 + `/models` 斜線指令：[Models concept](/zh-Hant/concepts/models)
- 供應商驗證設定：[Getting started](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 顯示解析後的預設/後備以及驗證概覽。
當供應商使用量快照可用時，OAuth/API 金鑰狀態區段會包含
供應商使用量視窗與配額快照。
目前支援使用量視窗的供應商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI、
MiniMax、Xiaomi 與 z.ai。使用量驗證來自供應商特定的掛鉤
（如果可用）；否則 OpenClaw 會退而求其次，從驗證設定檔、環境變數或設定中
比對 OAuth/API 金鑰憑證。
在 `--json` 輸出中，`auth.providers` 是環境/設定/儲存感知的供應商
概覽，而 `auth.oauth` 僅為驗證儲存設定檔的健康狀態。
加入 `--probe` 以對每個已設定的供應商設定檔執行即時驗證探測。
探測為真實請求（可能會消耗 Token 並觸發速率限制）。
使用 `--agent <id>` 檢查已設定代理程式的模型/驗證狀態。若省略，
該指令會使用 `OPENCLAW_AGENT_DIR`（若已設定），否則使用
已設定的預設代理程式。
探測列可以來自驗證設定檔、環境憑證或 `models.json`。
若要針對 OpenAI ChatGPT/Codex OAuth 進行疑難排解，`openclaw models status`、
`openclaw models auth list --provider openai` 與
`openclaw config get agents.defaults.model --json` 是確認代理程式是否擁有
可用於透過原生 Codex 執行時期的 `openai/*` 之可用 `openai` OAuth 設定檔的
最快方式。請參閱 [OpenAI provider setup](/zh-Hant/providers/openai#check-and-recover-codex-oauth-routing)。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- `models list` 是唯讀的：它會讀取設定、驗證設定檔、現有的目錄
  狀態和供應商擁有的目錄列，但不會重寫
  `models.json`。
- `Auth` 欄位是提供者層級且唯讀的。它是根據本機
  設定檔元數據、環境標記、已設定的提供者金鑰、本地提供者
  標記、AWS Bedrock 環境/設定檔標記以及外掛程式合成認證元數據計算而得；
  它不會載入提供者執行時、讀取鑰匙圈機密、呼叫提供者
  API，也不會證明每個模型的確切執行就緒狀態。
- `models list --all --provider <id>` 可以包含來自外掛程式清單或內建提供者目錄元數據的提供者自有靜態目錄
  列，即使您尚未
  向該提供者進行驗證。在設定相符的認證之前，這些列仍會顯示為
  不可用。
- `models list` 會在提供者目錄
  探索緩慢時保持控制平面回應靈活。預設和已設定的檢視會在短暫等待後回退到已設定
  或合成的模型列，並讓探索在
  背景完成。當您需要確切的完整探索目錄且
  願意等待提供者探索時，請使用 `--all`。
- 廣泛的 `models list --all` 會將清單目錄列合併到登錄列之上
  而不載入提供者執行時補充掛鉤。提供者篩選的清單
  快速路徑僅使用標記為 `static` 的提供者；標記為 `refreshable`
  的提供者保持由登錄/快取支援並將清單列作為補充附加，而
  標記為 `runtime` 的提供者則保持透過登錄/執行時進行探索。
- `models list` 會將原生模型元數據與執行時上限區分開來。在表格
  輸出中，當有效執行時
  上限與原生上下文視窗不同時，`Ctx` 會顯示 `contextTokens/contextWindow`；當提供者
  公開該上限時，JSON 列會包含 `contextTokens`。
- `models list --provider <id>` 根據供應商 ID 篩選，例如 `moonshot` 或
  `openai`。它不接受互動式供應商選擇器的顯示標籤，
  例如 `Moonshot AI`。
- 模型參照是透過在**第一個** `/` 處進行分割來解析的。如果模型 ID 包含 `/`（OpenRouter 樣式），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會先將輸入解析為別名，然後
  作為該特定模型 ID 的唯一已配置提供者匹配，最後
  才回退到已配置的預設提供者並發出棄用警告。
  如果該提供者不再公開已配置的預設模型，OpenClaw
  將回退到第一個已配置的提供者/模型，而不是顯示
  陳舊的已移除提供者預設值。
- `models status` 可能會在非機密佔位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`）的認證輸出中顯示 `marker(<value>)`，而不是將其遮蔽為機密內容。

### 模型掃描

`models scan` 會讀取 OpenRouter 的公開 `:free` 目錄，並對備用候選進行排序。該目錄本身是公開的，因此僅掃描元資料不需要 OpenRouter 金鑰。

預設情況下，OpenClaw 會嘗試透過即時模型呼叫來偵測工具和圖像支援。如果未設定 OpenRouter 金鑰，該指令會回退為僅元資料輸出，並說明 `:free` 模型仍需要 `OPENROUTER_API_KEY` 才能進行偵測和推論。

選項：

- `--no-probe`（僅限元資料；不查找配置/機密）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目錄請求和每次偵測逾時）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要即時偵測；僅元資料的掃描結果僅供參考，不會套用至配置。

### 模型狀態

選項：

- `--json`
- `--plain`
- `--check`（退出代碼 1=已過期/遺失，2=即將過期）
- `--probe`（即時偵測已配置的認證設定檔）
- `--probe-provider <name>`（偵測單一提供者）
- `--probe-profile <id>`（重複或以逗號分隔的設定檔 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的代理 ID；覆寫 `OPENCLAW_AGENT_DIR`）

`--json` 會將 stdout 保留給 JSON 資料。Auth-profile、provider 和啟動診斷會被導向到 stderr，讓腳本可以直接將 stdout 管道傳輸到諸如 `jq` 的工具中。

探測狀態分類：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

預期的探測詳情/原因代碼案例：

- `excluded_by_auth_order`：存在已儲存的設定檔，但明確的
  `auth.order.<provider>` 將其排除，因此 probe 報告此排除狀況而非嘗試使用它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  設定檔存在但不符合資格或無法解析。
- `no_model`：provider auth 存在，但 OpenClaw 無法解析該 provider 可探測的
  模型候選者。

## 別名 + 備援

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 驗證設定檔

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是互動式驗證助手。它可以啟動 provider 驗證流程（OAuth/API 金鑰）或引導您手動貼上 token，取決於您選擇的 provider。

`models auth list` 列出所選代理程式的已儲存驗證設定檔，而不會列印 token、API 金鑰或 OAuth secret 資料。請使用 `--provider <id>` 篩選至單一供應商（例如 `openai`），並使用 `--json` 進行腳本撰寫。

`models auth login` 執行 provider 插件的驗證流程（OAuth/API 金鑰）。使用
`openclaw plugins list` 查看已安裝哪些 providers。
使用 `openclaw models auth --agent <id> <subcommand>` 將驗證結果寫入特定的已配置代理儲存區。父旗標 `--agent` 被
`add`、`list`、`login`、`paste-api-key`、`setup-token`、`paste-token` 和
`login-github-copilot` 所遵循。

對於 OpenAI 模型，`--provider openai` 預設為 ChatGPT/Codex 帳戶登入。僅當您想要新增 OpenAI API 金鑰設定檔（通常作為 Codex 訂閱限制的備援）時，才使用 `--method api-key`。請執行 `openclaw doctor --fix` 將較舊的舊版 OpenAI Codex 前綴驗證/設定檔狀態遷移至 `openai`。

範例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai
openclaw models auth list --provider openai
```

備註：

- `login` 接受 `--profile-id <id>`，以用於登入時支援命名設定檔的供應商。請使用此選項將同一供應商的多個登入分開。
- `paste-api-key` 接受在其他地方產生的 API 金鑰，提示輸入金鑰值，並將其寫入預設設定檔 ID `<provider>:manual`，除非您傳遞 `--profile-id`。在自動化中，請透過 stdin 管線傳送金鑰，例如 `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai`。
- `setup-token` 和 `paste-token` 仍然是針對公開 token 驗證方法的供應商的通用 token 指令。
- `setup-token` 需要互動式 TTY，並執行供應商的 token 驗證方法（當其公開該方法時，預設為該供應商的 `setup-token` 方法）。
- `paste-token` 接受在其他地方或從自動化產生的 token 字串。
- `paste-token` 需要 `--provider`，預設會提示輸入 token 值，並將其寫入預設設定檔 ID `<provider>:manual`，除非您傳遞 `--profile-id`。
- 在自動化中，透過 stdin 管線傳輸 token，而不是將其作為參數傳遞，這樣
  提供者的憑證就不會出現在 shell 歷史記錄或程序清單中。
- `paste-token --expires-in <duration>` 根據相對持續時間（例如 `365d` 或 `12h`）儲存絕對 token 到期時間。
- 對於 `openai`，OpenAI API 金鑰和 ChatGPT/OAuth 權杖材質是
  不同的認證形狀。針對 `sk-...` OpenAI API 金鑰使用 `paste-api-key`，
  並僅針對權杖認證材質使用 `paste-token`。
- Anthropic 備註：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，OpenClaw 將 Claude CLI 的重複使用和 `claude -p` 使用視為此整合的許可做法。
- Anthropic `setup-token` / `paste-token` 仍作為支援的 OpenClaw 權杖路徑提供，但若有可用，OpenClaw 現在傾向於 Claude CLI 的重複使用和 `claude -p`。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型容錯移轉](/zh-Hant/concepts/model-failover)
