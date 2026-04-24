---
summary: "`openclaw models` 的 CLI 參考資料（status/list/set/scan、別名、備援、驗證）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

Model discovery, scanning, and configuration (default model, fallbacks, auth profiles).

相關：

- 提供者 + 模型：[模型](/zh-Hant/providers/models)
- 模型選擇概念 + `/models` 斜線指令：[模型概念](/zh-Hant/concepts/models)
- 提供者驗證設定：[入門指南](/zh-Hant/start/getting-started)

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
- `models list --all` 包含內建的提供者擁有的靜態目錄列，即使
  您尚未向該提供者進行驗證。在設定符合的驗證之前，這些列仍會
  顯示為無法使用。
- `models list --provider <id>` 根據提供者 ID 篩選，例如 `moonshot` 或
  `openai-codex`。它不接受互動式提供者選擇器的顯示標籤，例如 `Moonshot AI`。
- 模型參照的解析方式是依據**第一個** `/` 進行分割。如果模型 ID 包含 `/`（OpenRouter 風格），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會先將輸入解析為別名，接著
  作為該確切模型 ID 的唯一已配置提供者匹配，然後才
  回退到已配置的預設提供者，並發出棄用警告。
  如果該提供者不再公開已配置的預設模型，OpenClaw
  將回退到第一個已配置的提供者/模型，而不會呈現
  過時的已移除提供者預設值。
- `models status` 可能會在驗證輸出中針對非機密佔位符顯示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是將其遮蔽為機密。

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (退出代碼 1=已過期/缺失，2=即將過期)
- `--probe` (對已配置的驗證設定檔進行即時探測)
- `--probe-provider <name>` (探測單一提供者)
- `--probe-profile <id>` (重複或以逗號分隔的設定檔 ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已配置的代理 ID；會覆寫 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

探測狀態分類：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

預期的探測詳細資訊/原因代碼案例：

- `excluded_by_auth_order`：存在已儲存的設定檔，但明確的
  `auth.order.<provider>` 將其排除，因此探測會回報排除狀態，
  而非嘗試連線。
- `missing_credential`， `invalid_expires`， `expired`， `unresolved_ref`：
  profile 存在但不符合資格或無法解析。
- `no_model`：提供者驗證存在，但 OpenClaw 無法解析該提供者可探測的
  模型候選。

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

`models auth add` 是互動式驗證輔助程式。它可以根據您選擇的
提供者啟動提供者驗證流程（OAuth/API 金鑰）或引導您手動貼上 Token。

`models auth login` 執行提供者外掛程式的驗證流程（OAuth/API 金鑰）。使用
`openclaw plugins list` 查看已安裝哪些提供者。

範例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

備註：

- `setup-token` 和 `paste-token` 仍是針對公開
  Token 驗證方法的提供者的通用 Token 指令。
- `setup-token` 需要互動式 TTY 並執行提供者的 Token 驗證
  方法（當公開時預設為該提供者的 `setup-token` 方法）。
- `paste-token` 接受從其他地方產生或來自自動化的 Token 字串。
- `paste-token` 需要 `--provider`，提示輸入 Token 值，並將
  其寫入預設的 profile id `<provider>:manual`，除非您傳遞
  `--profile-id`。
- `paste-token --expires-in <duration>` 根據相對持續時間（例如 `365d` 或 `12h`）
  儲存絕對 Token 到期時間。
- Anthropic 備註：Anthropic 人員告訴我們，再次允許使用 OpenClaw 風格的 Claude CLI，因此除非 Anthropic 發布新政策，否則 OpenClaw 視 Claude CLI 重複使用和 `claude -p` 使用為此整合的核准方式。
- Anthropic `setup-token` / `paste-token` 仍作為支援的 OpenClaw Token 路徑可用，但 OpenClaw 現在偏好 Claude CLI 重複使用和 `claude -p`（如果可用）。
