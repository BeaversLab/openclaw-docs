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

- 供應商 + 模型：[模型](/zh-Hant/providers/models)
- 供應商驗證設定：[入門指南](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 會顯示已解析的預設值/備選方案以及驗證概覽。
當可使用供應商使用量快照時，OAuth/API 金鑰狀態區段會包含
供應商使用量視窗和配額快照。
目前的使用量視窗供應商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、小米和 z.ai。使用量驗證來自供應商特定的掛勾
（如果可用）；否則 OpenClaw 會回退到從驗證設定檔、env 或設定中
匹配的 OAuth/API 金鑰憑證。
在 `--json` 輸出中，`auth.providers` 是
env/config/store-aware 的供應商概覽，而 `auth.oauth` 僅是
auth-store 設定檔的健康狀況。
新增 `--probe` 以對每個已設定的供應商設定檔執行即時驗證探測。
探測是真實請求（可能會消耗 token 並觸發速率限制）。
使用 `--agent <id>` 來檢查已設定代理的模型/驗證狀態。如果省略，
該指令會使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已設定），
否則使用已設定的預設代理。
探測列可以來自驗證設定檔、env 憑證或 `models.json`。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- 模型參照透過在 **第一個** `/` 處分割來進行解析。如果模型 ID 包含 `/`（OpenRouter 風格），請包含供應商前綴（範例：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略供應商，OpenClaw 會先將輸入解析為別名，接著
  解析為該特定模型 ID 的唯一已設定供應商匹配項，只有這樣
  才會回退到已設定的預設供應商並發出棄用警告。
  如果該供應商不再公開已設定的預設模型，OpenClaw
  會回退到第一個已設定的供應商/模型，而不是顯示
  過時的已移除供應商預設值。
- `models status` 可能會在認證輸出中顯示 `marker(<value>)`，針對非機密佔位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是將其遮蔽為機密。

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (結束代碼 1=已過期/缺失，2=即將過期)
- `--probe` (對已設定的認證配置檔案進行即時探測)
- `--probe-provider <name>` (探測單一提供商)
- `--probe-profile <id>` (重複或以逗號分隔的配置檔案 ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已設定的代理 ID；會覆蓋 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

探測狀態分類：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

預期會出現的探測詳情/原因代碼案例：

- `excluded_by_auth_order`：已儲存的配置檔案存在，但明確的
  `auth.order.<provider>` 將其省略，因此探測會報告排除狀態而非嘗試連線。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置檔案存在但不具備資格或無法解析。
- `no_model`：提供商認證存在，但 OpenClaw 無法為該提供商解析可探測的模型候選。

## 別名 + 備援

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 認證配置檔案

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是互動式認證輔助程式。它可以啟動提供商認證流程 (OAuth/API 金鑰) 或引導您手動貼上權杖，視您選擇的提供商而定。

`models auth login` 會執行提供商外掛程式的認證流程 (OAuth/API 金鑰)。請使用
`openclaw plugins list` 查看已安裝的提供商。

範例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

備註：

- `setup-token` 和 `paste-token` 仍是針對暴露 token 驗證方法的供應商之通用 token 指令。
- `setup-token` 需要一個互動式 TTY 並執行供應商的 token-auth 方法（當其暴露該方法時，預設為該供應商的 `setup-token` 方法）。
- `paste-token` 接受在其他地方產生或來自自動化的 token 字串。
- `paste-token` 需要 `--provider`，提示輸入 token 值，並將其寫入預設的 profile id `<provider>:manual`，除非您傳遞 `--profile-id`。
- `paste-token --expires-in <duration>` 根據相對持續時間（例如 `365d` 或 `12h`）儲存絕對的 token 有效期限。
- Anthropic 備註：Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重新使用和 `claude -p` 使用視為此整合的核准用法。
- Anthropic `setup-token` / `paste-token` 仍然可作為支援的 OpenClaw 權杖路徑，但 OpenClaw 現在在可用時優先考慮 Claude CLI 重新使用和 `claude -p`。
