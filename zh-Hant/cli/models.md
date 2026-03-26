---
summary: " `openclaw models` 的 CLI 參考手冊（status/list/set/scan、別名、備援、驗證）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

模型探索、掃描與設定（預設模型、備援、驗證設定檔）。

相關連結：

- 供應商 + 模型：[模型](/zh-Hant/providers/models)
- 供應商驗證設定：[快速入門](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 會顯示解析後的預設/後備以及驗證概覽。
當可供提供者使用快照時，OAuth/token 狀態部分會包含
提供者使用標頭。
新增 `--probe` 以對每個已配置的提供者設定檔執行即時驗證探測。
探測是真實請求（可能會消耗 token 並觸發速率限制）。
使用 `--agent <id>` 來檢查已配置代理程式的 model/auth 狀態。如果省略，
該指令會使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已設定），否則為
已配置的預設代理程式。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- 模型參照通過在**第一個** `/` 處分割來解析。如果模型 ID 包含 `/`（OpenRouter 風格），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會將輸入視為別名或**預設提供者**的模型（僅當模型 ID 中沒有 `/` 時才有效）。
- `models status` 可能會在身份驗證輸出中為非機密佔位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`qwen-oauth`、`ollama-local`）顯示 `marker(<value>)`，而不是將它們作為機密遮罩。

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (exit 1=已過期/缺失，2=即將過期)
- `--probe` (即時探測已配置的驗證設定檔)
- `--probe-provider <name>` (探測單一提供者)
- `--probe-profile <id>` (重複或以逗號分隔的設定檔 ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已配置的代理程式 ID；會覆寫 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

## 別名 + 備援

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 驗證設定檔

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` 會執行提供者外掛程式的驗證流程 (OAuth/API 金鑰)。請使用
`openclaw plugins list` 來查看已安裝哪些提供者。

備註：

- `setup-token` 會提示輸入 setup-token 的值 (請在任意機器上使用 `claude setup-token` 產生)。
- `paste-token` 接受在其他地方或由自動化產生的 token 字串。
- Anthropic 政策提示：對 setup-token 的支援屬於技術相容性。Anthropic 過去曾阻止在 Claude Code 之外的某些訂閱使用，因此在廣泛使用前請確認目前的條款。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
