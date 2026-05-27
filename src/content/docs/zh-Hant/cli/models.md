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

- 供應商 + 模型：[模型](/zh-Hant/providers/models)
- 模型選取概念 + `/models` 斜線指令：[模型概念](/zh-Hant/concepts/models)
- 供應商驗證設定：[快速開始](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 會顯示解析後的預設/備選（fallbacks）以及驗證概覽。
當供應商使用情況快照可用時，OAuth/API 金鑰狀態區塊會包含
供應商使用視窗與配額快照。
目前支援使用視窗的供應商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、小米 與 z.ai。使用驗證資訊來自供應商特定的掛鉤（hooks），
若無則 OpenClaw 會退回比對來自驗證設定檔、環境變數或配置中的 OAuth/API 金鑰憑證。
在 `--json` 輸出中，`auth.providers` 是感知環境/配置/儲存的供應商
概覽，而 `auth.oauth` 僅包含驗證儲存設定檔的健康狀態。
新增 `--probe` 可對每個已配置的供應商設定檔執行即時驗證探測。
探測為真實請求（可能會消耗 Token 並觸發速率限制）。
使用 `--agent <id>` 可檢查已配置代理程式的模型/驗證狀態。若省略，
該指令會使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（若已設定），否則使用
已配置的預設代理程式。
探測列可以來自驗證設定檔、環境變數憑證或 `models.json`。
若要進行 Codex OAuth 疑難排解，`openclaw models status`、
`openclaw models auth list --provider openai-codex` 與
`openclaw config get agents.defaults.model --json` 是確認代理程式是否具有
透過原生 Codex 執行環境供 `openai/*` 使用的可用 `openai-codex` 驗證設定檔的最快方式。請參閱 [OpenAI 供應商設定](/zh-Hant/providers/openai#check-and-recover-codex-oauth-routing)。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- `models list` 是唯讀的：它讀取設定、驗證設定檔、現有目錄
  狀態和提供者擁有的目錄列，但它不會重寫
  `models.json`。
- `Auth` 欄位是提供者層級且唯讀的。它是根據本機驗證設定檔元資料、環境標記、已設定的提供者金鑰、本機提供者標記、AWS Bedrock 環境/設定檔標記，以及外掛程式合成驗證元資料計算而來；它不會載入提供者執行時期、讀取鑰匙圈密鑰、呼叫提供者 API，或證明確切的可執行狀態。
- `models list --all --provider <id>` 可以包含來自外掛程式清單或內建提供者目錄元資料的提供者自有靜態目錄列，即使您尚未透過該提供者進行驗證。在設定相符的驗證之前，這些列仍會顯示為不可用。
- 當提供者目錄探索速度緩慢時，`models list` 可保持控制回應靈活。預設和已設定的檢視會在短暫等待後回退到已設定或合成的模型列，並讓探索在背景完成。當您需要確切的完整已探索目錄並願意等待提供者探索時，請使用 `--all`。
- 廣泛的 `models list --all` 會在不載入提供者執行時期補充 hook 的情況下，將清單目錄列合併到登錄列之上。提供者篩選的清單快速路徑僅使用標記為 `static` 的提供者；標記為 `refreshable` 的提供者保持由登錄/快取支援，並將清單列附加為補充，而標記為 `runtime` 的提供者則維持在登錄/執行時期探索上。
- `models list` 將原生模型元資料和執行時期上限區分開來。在表格輸出中，當有效的執行時期上限與原生上下文視窗不同時，`Ctx` 會顯示 `contextTokens/contextWindow`；當提供者公開該上限時，JSON 列會包含 `contextTokens`。
- `models list --provider <id>` 會根據提供者 ID 進行篩選，例如 `moonshot` 或 `openai-codex`。它不接受來自互動式提供者選擇器的顯示標籤，例如 `Moonshot AI`。
- 模型參照是透過分割**第一個** `/` 來解析的。如果模型 ID 包含 `/`（OpenRouter 風格），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會先將輸入解析為別名，然後
  作為該特定模型 ID 的唯一已配置提供者匹配，最後
  才回退到已配置的預設提供者並發出棄用警告。
  如果該提供者不再公開已配置的預設模型，OpenClaw
  將回退到第一個已配置的提供者/模型，而不是顯示
  陳舊的已移除提供者預設值。
- `models status` 可能會在認證輸出中針對非機密佔位符顯示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是將其作為機密遮蔽。

### 模型掃描

`models scan` 會讀取 OpenRouter 的公開 `:free` 目錄，並對用於回退的候選者進行排名。該目錄本身是公開的，因此僅限元資料的掃描不需要
OpenRouter 金鑰。

預設情況下，OpenClaw 會嘗試使用即時模型呼叫來探測工具和圖像支援。
如果未配置 OpenRouter 金鑰，該指令會回退到僅限元資料的
輸出，並說明 `:free` 模型進行探測和推論仍需要 `OPENROUTER_API_KEY`。

選項：

- `--no-probe`（僅限元資料；無配置/機密查詢）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`（目錄請求和每次探測的逾時時間）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要即時探測；僅限元資料的掃描
結果僅供參考，不會應用於配置。

### 模型狀態

選項：

- `--json`
- `--plain`
- `--check` (exit 1=已過期/遺失，2=即將過期)
- `--probe` (對已設定的驗證設定檔進行即時探測)
- `--probe-provider <name>` (探測單一供應商)
- `--probe-profile <id>` (重複或以逗號分隔的設定檔 ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已設定的代理程式 ID；會覆寫 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

`--json` 會保留 stdout 給 JSON 資料使用。驗證設定檔、供應商和啟動診斷會被路由到 stderr，因此腳本可以將 stdout 直接傳送給諸如 `jq` 等工具。

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

- `excluded_by_auth_order`：已儲存的設定檔存在，但明確的
  `auth.order.<provider>` 省略了它，因此探測會回報排除狀態而不嘗試使用它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  設定檔存在但不符合資格或無法解析。
- `no_model`：供應商驗證存在，但 OpenClaw 無法為該供應商解析可探測的
  模型候選。

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

`models auth add` 是互動式驗證輔助工具。它可以啟動供應商驗證流程 (OAuth/API 金鑰) 或引導您手動貼上權杖，具體取決於您選擇的供應商。

`models auth list` 列出所選代理程式的已儲存驗證設定檔，而不會列印權杖、API 金鑰或 OAuth 機密資料。使用 `--provider <id>` 篩選至單一供應商 (例如 `openai-codex`)，並使用 `--json` 進行腳本撰寫。

`models auth login` 會執行提供者外掛程式的驗證流程 (OAuth/API 金鑰)。請使用
`openclaw plugins list` 來查看安裝了哪些提供者。
使用 `openclaw models auth --agent <id> <subcommand>` 將驗證結果寫入
特定設定的代理程式存放區。父層 `--agent` 標誌會被
`add`、`list`、`login`、`paste-api-key`、`setup-token`、`paste-token` 和
`login-github-copilot` 遵循。

對於 OpenAI 模型，`--provider openai` 預設為 ChatGPT/Codex 帳戶登入。
僅當您想要新增 OpenAI API 金鑰設定檔時才使用 `--method api-key`，
通常作為 Codex 訂閱限制的備援方案。舊版
`--provider openai-codex` 拼寫方式仍適用於現有指令碼。

範例：

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai-codex
openclaw models auth list --provider openai
```

備註：

- `login` 接受 `--profile-id <id>`，適用於登入期間支援命名
  設定檔的提供者。使用此功能可將同一提供者的多個登入分開。
- `paste-api-key` 接受在其他地方產生的 API 金鑰，提示輸入金鑰
  值，並將其寫入預設設定檔 ID `<provider>:manual`，除非您
  傳遞 `--profile-id`。在自動化中，透過 stdin 傳輸金鑰，例如
  `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai-codex`。
- `setup-token` 和 `paste-token` 仍然是通用金鑰指令，適用於公開
  金鑰驗證方法的提供者。
- `setup-token` 需要互動式 TTY 並執行提供者的金鑰驗證
  方法 (當提供者公開此方法時，預設為該提供者的 `setup-token` 方法)。
- `paste-token` 接受在其他地方或從自動化產生的金鑰字串。
- `paste-token` 需要 `--provider`，提示輸入金鑰值，並將
  其寫入預設設定檔 ID `<provider>:manual`，除非您傳遞
  `--profile-id`。
- `paste-token --expires-in <duration>` 會根據相對持續時間 (例如 `365d` 或 `12h`) 儲存絕對的金鑰過期時間。
- 對於 `openai-codex`，OpenAI API 金鑰和 ChatGPT/OAuth 權杖素材是不同的認證形態。使用 `paste-api-key` 來管理 `sk-...` OpenAI API 金鑰，並僅對權杖認證素材使用 `paste-token`。
- Anthropic 說明：Anthropic 人员告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 的重複使用和 `claude -p` 的使用視為此整合的認可方式。
- Anthropic `setup-token` / `paste-token` 仍作為支援的 OpenClaw 權杖路徑可用，但現在若 Claude CLI 重複使用和 `claude -p` 可用，OpenClaw 會優先使用它們。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
