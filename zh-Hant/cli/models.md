---
summary: "`openclaw models` 的 CLI 參考（status/list/set/scan、別名、備援、auth）"
read_when:
  - 您想要變更預設模型或查看提供者 auth 狀態
  - 您想要掃描可用的模型/提供者並除錯 auth 設定檔
title: "models"
---

# `openclaw models`

模型探索、掃描與設定（預設模型、備援、auth 設定檔）。

相關：

- 提供者 + 模型：[Models](/zh-Hant/providers/models)
- 提供者 auth 設定：[Getting started](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 顯示解析後的預設值/備援值以及驗證概覽。
當提供者使用情況快照可用時，OAuth/token 狀態部分會包含
提供者使用情況標頭。
新增 `--probe` 以對每個設定的提供者設定檔執行即時驗證探測。
探測是真實請求（可能會消耗 token 並觸發速率限制）。
使用 `--agent <id>` 檢視已設定代理程式的模型/驗證狀態。若省略，
指令會使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（若已設定），否則使用
設定的預設代理程式。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- 模型參照通過在**第一個** `/` 處分割來解析。如果模型 ID 包含 `/`（OpenRouter 風格），請包含提供者前綴（例如 `openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會將輸入視為別名或**預設提供者**的模型（僅在模型 ID 中沒有 `/` 時有效）。
- `models status` 可能會在非機密佔位符的認證輸出中顯示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`qwen-oauth`、`ollama-local`），而不是將它們作為機密進行遮罩。

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (exit 1=已過期/遺失，2=即將過期)
- `--probe` (對已設定的認證設定檔進行即時探測)
- `--probe-provider <name>` (探測單一提供者)
- `--probe-profile <id>` (重複或以逗號分隔的設定檔 ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已設定的代理程式 ID；覆寫 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

## 別名 + 備援

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 認證設定檔

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` 會執行提供者外掛程式的認證流程 (OAuth/API 金鑰)。使用
`openclaw plugins list` 查看已安裝哪些提供者。

備註：

- `setup-token` 會提示輸入 setup-token 值 (在任何機器上使用 `claude setup-token` 產生)。
- `paste-token` 接受在其他地方產生或由自動化程式產生的權杖字串。
- Anthropic 政策說明：setup-token 支援屬於技術相容性。Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱使用，因此在廣泛使用前請確認目前的條款。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
