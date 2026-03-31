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

- 供應商 + 模型：[Models](/en/providers/models)
- 供應商驗證設定：[Getting started](/en/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 顯示已解析的預設值/備案以及認證概覽。
當提供者使用情況快照可用時，OAuth/token 狀態區段會包含
提供者使用情況標頭。
加入 `--probe` 以對每個已設定的提供者設定檔執行即時認證探查。
探查是真實請求（可能會消耗 token 並觸發速率限制）。
使用 `--agent <id>` 來檢視已設定代理程式的 model/auth 狀態。當省略時，
指令會使用已設定的 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（若有設定），否則使用
已設定的預設代理程式。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- 模型參照通過分割**第一個** `/` 來進行解析。如果模型 ID 包含 `/`（OpenRouter 風格），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會將輸入視為**預設提供者**的別名或模型（僅在模型 ID 中沒有 `/` 時有效）。
- `models status` 可能會在驗證輸出中對非秘密佔位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`）顯示 `marker(<value>)`，而不是將其作為秘密掩碼。

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (結束代碼 1=已過期/遺失，2=即將過期)
- `--probe` (對已設定的 auth profiles 進行即時探測)
- `--probe-provider <name>` (探測單一提供者)
- `--probe-profile <id>` (重複或以逗號分隔的 profile ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已設定的 agent ID；會覆蓋 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

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

範例：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw models auth login --provider openai-codex --set-default
```

備註：

- `login --provider anthropic --method cli --set-default` 會重複使用本機的 Claude
  CLI 登入並將主要 Anthropic default-model 路徑重寫為 `claude-cli/...`。
- `setup-token` 會提示輸入 setup-token 值（可在任何機器上使用 `claude setup-token` 產生）。
- `paste-token` 接受在其他地方產生的或來自自動化的 token 字串。
- Anthropic 政策提示：setup-token 支援僅為技術相容性。Anthropic 過去曾封鎖 Claude Code 以外的部分訂閱使用，因此在廣泛使用前請確認目前的條款。
