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

- 提供商 + 模型：[Models](/zh-Hant/providers/models)
- 模型選擇概念 + `/models` 斜線指令：[Models concept](/zh-Hant/concepts/models)
- 提供商認證設定：[Getting started](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 顯示已解析的預設值/備援以及驗證概述。
當提供者使用情況快照可用時，OAuth/API 金鑰狀態區段會包含
提供者使用視窗與配額快照。
目前支援使用視窗的提供者：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、小米和 z.ai。使用驗證來自提供者特定的掛鉤
（如可用）；否則 OpenClaw 會退而求其次，從驗證設定檔、env 或 config 中
比對 OAuth/API 金鑰憑證。
在 `--json` 輸出中，`auth.providers` 是
感知 env/config/store 的提供者概述，而 `auth.oauth` 僅是
驗證儲存設定檔的健康狀況。
新增 `--probe` 可對每個設定的提供者設定檔執行即時驗證探測。
探測是真實請求（可能會消耗 token 並觸發速率限制）。
使用 `--agent <id>` 檢查已設定代理程式的模型/驗證狀態。若省略，
指令會使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（若已設定），
否則使用設定的預設代理程式。
探測列可能來自驗證設定檔、env 憑證或 `models.json`。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- `models list` 是唯讀的：它會讀取設定、認證設定檔、現有的目錄
  狀態以及提供商擁有的目錄行，但不會重寫
  `models.json`。
- `models list --all --provider <id>` 可以包含來自插件清單或捆綁提供商目錄元數據的提供商擁有的靜態目錄
  行，即使您尚未
  向該提供商進行身份驗證。這些行在配置匹配的認證之前仍然顯示為
  不可用。
- `models list` 將原生模型元數據和運行時上限分開。在表格
  輸出中，當有效的運行時
  上限與原生上下文視窗不同時，`Ctx` 會顯示 `contextTokens/contextWindow`；當提供商公開該上限時，JSON 行會包含 `contextTokens`
  。
- `models list --provider <id>` 根據提供商 ID 進行過濾，例如 `moonshot` 或
  `openai-codex`。它不接受來自互動式提供商
  選擇器的顯示標籤，例如 `Moonshot AI`。
- 模型參照通過在 **第一個** `/` 處拆分來解析。如果模型 ID 包含 `/`（OpenRouter 風格），請包含提供商前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 會首先將輸入解析為別名，然後
  解析為該確切模型 ID 的唯一已配置提供商匹配，只有在那之後
  才會回退到已配置的默認提供商並發出棄用警告。
  如果該提供商不再公開已配置的默認模型，OpenClaw
  將回退到第一個已配置的提供商/模型，而不是顯示
  陳舊的已移除提供商默認值。
- `models status` 可能會在驗證輸出中顯示 `marker(<value>)`，針對非機密佔位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不會將其遮蔽為機密。

### Models 掃描

`models scan` 會讀取 OpenRouter 的公開 `:free` 目錄，並對備用候選進行排序。目錄本身是公開的，因此僅元資料掃描不需要 OpenRouter 金鑰。

預設情況下，OpenClaw 會嘗試使用即時模型呼叫來探測工具和影像支援。如果未設定 OpenRouter 金鑰，該指令會退回到僅元資料輸出，並說明 `:free` 模型進行探測和推論仍需要 `OPENROUTER_API_KEY`。

選項：

- `--no-probe` （僅限元資料；不查找設定/機密）
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>` （目錄請求和各次探測逾時）
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` 和 `--set-image` 需要即時探測；僅元資料掃描結果僅供參考，不會應用於設定。

### Models 狀態

選項：

- `--json`
- `--plain`
- `--check` （退出代碼 1=已過期/遺失，2=即將過期）
- `--probe` （即時探測已設定的驗證設定檔）
- `--probe-provider <name>` （探測一個提供商）
- `--probe-profile <id>` （重複或逗號分隔的設定檔 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` （已設定的代理 ID；會覆寫 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

探測狀態分類：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

預期會遇到的探測詳細資訊/原因代碼案例：

- `excluded_by_auth_order`：存在已儲存的設定檔，但明確的
  `auth.order.<provider>` 將其省略，因此探測會回報排除狀態而非
  嘗試進行連線。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  設定檔存在但不具備資格或無法解析。
- `no_model`：提供者驗證存在，但 OpenClaw 無法為該提供者解析
  可探測的候選模型。

## 別名 + 備援

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 驗證設定檔

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是互動式驗證輔助工具。它可以啟動提供者的驗證流程
(OAuth/API 金鑰) 或引導您手動貼上 Token，具體取決於
您選擇的提供者。

`models auth login` 會執行提供者外掛程式的驗證流程 (OAuth/API 金鑰)。使用
`openclaw plugins list` 查看已安裝的提供者。
使用 `openclaw models auth --agent <id> <subcommand>` 將驗證結果寫入
特定的已設定代理程式存放區。父層 `--agent` 標誌會被
`add`、`login`、`setup-token`、`paste-token` 和 `login-github-copilot` 遵守。

範例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

備註：

- `setup-token` 和 `paste-token` 仍是針對
  公開 Token 驗證方法的提供者之通用 Token 指令。
- `setup-token` 需要互動式 TTY 並執行提供者的 Token 驗證
  方法 (當提供者公開該方法時，預設為該提供者的 `setup-token` 方法)。
- `paste-token` 接受在其他地方產生或來自自動化的 Token 字串。
- `paste-token` 需要 `--provider`，會提示輸入 Token 值，並將
  其寫入預設的設定檔 ID `<provider>:manual`，除非您傳遞
  `--profile-id`。
- `paste-token --expires-in <duration>` 儲存從相對持續時間（例如 `365d` 或 `12h`）計算出的絕對 Token 到期時間。
- Anthropic 說明：Anthropic 人員告訴我們，允許再次以 OpenClaw 風格使用 Claude CLI，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重用和 `claude -p` 視為此整合的核准使用方式。
- Anthropic `setup-token` / `paste-token` 仍然可作為支援的 OpenClaw Token 路徑使用，但如果有 Claude CLI 重用和 `claude -p` 可用，OpenClaw 現在優先使用這兩者。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [模型選擇](/zh-Hant/concepts/model-providers)
- [模型故障轉移](/zh-Hant/concepts/model-failover)
