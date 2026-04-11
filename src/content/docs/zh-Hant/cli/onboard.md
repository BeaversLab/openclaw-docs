---
summary: "CLI 參考資料：`openclaw onboard` (互動式入門指引)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門指引。

## 相關指南

- CLI 入門中心：[Onboarding (CLI)](/en/start/wizard)
- 入門概述：[Onboarding Overview](/en/start/onboarding-overview)
- CLI 入門參考：[CLI Setup Reference](/en/start/wizard-cli-reference)
- CLI 自動化：[CLI Automation](/en/start/wizard-cli-automation)
- macOS 入門：[Onboarding (macOS App)](/en/start/onboarding)

## 範例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

對於純文字專用網路 `ws://` 目標（僅限信任網路），請在入門指引流程環境中設定
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

非互動式自訂提供者：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai
```

`--custom-api-key` 在非互動模式下為選用。如果省略，入門指引會檢查 `CUSTOM_API_KEY`。

非互動式 Ollama：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用；如果省略，入門指引會使用 Ollama 建議的預設值。雲端模型 ID (例如 `kimi-k2.5:cloud`) 也可在此使用。

將提供者金鑰儲存為參照而非純文字：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，入門指引會寫入 env 支援的參照，而非純文字金鑰值。
對於 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為 env 參照 (例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`)。

非互動式 `ref` 模式約定：

- 在入門指引流程環境中設定提供者環境變數 (例如 `OPENAI_API_KEY`)。
- 除非同時設定了該環境變數，否則請勿傳遞內聯金鑰旗標 (例如 `--openai-api-key`)。
- 如果在未設定所需環境變數的情況下傳遞內聯金鑰旗標，入門指引會快速失敗並顯示指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存純文字權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 將 `gateway.auth.token` 儲存為 env SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要在導入程序環境中有一個非空的環境變數。
- 使用 `--install-daemon` 時，當 Token 驗證需要 Token 時，會驗證由 SecretRef 管理的 Gateway Token，但不會將其解析為純文字儲存在 Supervisor 服務環境元數據中。
- 使用 `--install-daemon` 時，如果 Token 模式需要 Token 但設定的 Token SecretRef 未解析，導入將會失敗並封閉，同時提供修復指引。
- 使用 `--install-daemon` 時，如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，導入程序將封鎖安裝，直到明確設定模式。
- 本地入門會將 `gateway.mode="local"` 寫入配置。如果後續配置檔案缺少 `gateway.mode`，請將其視為配置損壞或不完整的手動編輯，而不是有效的本地模式捷徑。
- `--allow-unconfigured` 是一個獨立的閘道執行時緊急出口。這並不意味著入門可以省略 `gateway.mode`。

範例：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

非互動式本地閘道健全性：

- 除非您傳遞 `--skip-health`，否則入門會等到可以連線的本地閘道後才會成功結束。
- `--install-daemon` 首先啟動受管理的閘道安裝路徑。如果沒有它，您必須已經有一個本地閘道正在運行，例如 `openclaw gateway run`。
- 如果您只想在自動化中寫入 config/workspace/bootstrap，請使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 首先嘗試「排程的工作」，如果拒絕建立工作，則會退回到個別使用者的「啟動」資料夾登入項目。

使用參考模式的互動式入門行為：

- 當系統提示時，選擇 **Use secret reference**。
- 然後選擇以下任一項：
  - 環境變數
  - 設定的秘密提供者 (`file` 或 `exec`)
- 入門會在儲存參考之前執行快速預檢驗證。
  - 如果驗證失敗，入門會顯示錯誤並讓您重試。

非互動式 Z.AI 端點選擇：

注意：`--auth-choice zai-api-key` 現在會自動為您的金鑰偵測最佳的 Z.AI 端點（偏好使用搭配 `zai/glm-5.1` 的一般 API）。
如果您特別需要 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。

```bash
# Promptless endpoint selection
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# Other Z.AI endpoint choices:
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

非互動式 Mistral 範例：

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

流程備註：

- `quickstart`：最少的提示，自動產生閘道 token。
- `manual`：針對 port/bind/auth 的完整提示（`advanced` 的別名）。
- 當驗證選擇隱含首選提供商時，入門程序會將 default-model 和 allowlist 選擇器預先篩選至該提供商。對於 Volcengine 和 BytePlus，這也會符合 coding-plan 變體（`volcengine-plan/*`、`byteplus-plan/*`）。
- 如果首選提供商篩選器尚未產生任何已載入的模型，入門程序會改回退至未篩選的目錄，而不是讓選擇器保持空白。
- 在 web-search 步驟中，部分提供商可以觸發提供商特定的後續提示：
  - **Grok** 可以提供選用的 `x_search` 設定，使用相同的 `XAI_API_KEY` 和 `x_search` 模型選擇。
  - **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` 與 `api.moonshot.cn`）以及預設 Kimi web-search 模型。
- 本機入門 DM 範圍行為：[CLI 設定參考](/en/start/wizard-cli-reference#outputs-and-internals)。
- 最快速的首聊：`openclaw dashboard`（控制 UI，無須頻道設定）。
- 自訂提供商：連接任何 OpenAI 或 Anthropic 相容端點，包括未列出的託管提供商。使用 Unknown 自動偵測。

## 常見的後續指令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。請使用 `--non-interactive` 進行腳本操作。</Note>
