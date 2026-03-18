---
summary: "CLI 參考資料：`openclaw models` (status/list/set/scan、別名、備援、auth)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

模型探索、掃描與設定（預設模型、備援、auth profiles）。

相關：

- Providers + models: [Models](/zh-Hant/providers/models)
- Provider auth 設定: [Getting started](/zh-Hant/start/getting-started)

## 常用指令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 會顯示解析後的預設值/備援機制以及 auth 概覽。
當有可用的 provider 使用量快照時，OAuth/token 狀態區段會包含
provider 使用量標頭。
加入 `--probe` 以對每個設定的 provider profile 執行即時 auth 探測。
探測是真實請求（可能會消耗 token 並觸發速率限制）。
使用 `--agent <id>` 檢視設定好的 agent 的 model/auth 狀態。若省略，
該指令會使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（若已設定），否則使用
設定的預設 agent。

備註：

- `models set <model-or-alias>` 接受 `provider/model` 或別名。
- Model refs 會以 **第一個** `/` 分割來解析。若模型 ID 包含 `/`（OpenRouter 風格），請包含 provider 前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 若您省略 provider，OpenClaw 會將輸入視為別名或 **預設 provider** 的模型（僅在模型 ID 中沒有 `/` 時有效）。
- `models status` 可能會在 auth 輸出中對非機密佔位符顯示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`qwen-oauth`、`ollama-local`），而不是將其遮蔽為機密資訊。

### `models status`

選項：

- `--json`
- `--plain`
- `--check` (exit 1=expired/missing, 2=expiring)
- `--probe` (對設定的 auth profiles 進行即時探測)
- `--probe-provider <name>` (偵測單一提供者)
- `--probe-profile <id>` (重複或以逗號分隔的 profile id)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已設定的 agent id；會覆寫 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

## 別名 + 後備

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

`models auth login` 會執行提供者外掛程式的驗證流程 (OAuth/API 金鑰)。使用
`openclaw plugins list` 來查看已安裝哪些提供者。

備註：

- `setup-token` 會提示輸入 setup-token 值 (在任何機器上使用 `claude setup-token` 產生)。
- `paste-token` 接受在其他地方或從自動化產生的 token 字串。
- Anthropic 政策備註：setup-token 支援屬於技術相容性。Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱使用，因此在廣泛使用前請確認目前的條款。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
