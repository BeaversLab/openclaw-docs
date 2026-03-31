---
summary: "CLI 參考資料：`openclaw onboard` (互動式入門指引)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門指引。

## 相關指南

- CLI 入門指引中心：[Onboarding (CLI)](/en/start/wizard)
- 入門指引總覽：[Onboarding Overview](/en/start/onboarding-overview)
- CLI 入門指引參考：[CLI Setup Reference](/en/start/wizard-cli-reference)
- CLI 自動化：[CLI Automation](/en/start/wizard-cli-automation)
- macOS 入門指引：[Onboarding (macOS App)](/en/start/onboarding)

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

非互動式本機 Gateway 健康檢查：

- 除非您傳遞 `--skip-health`，否則導入程序會等待可連線的本機 Gateway，然後才會成功結束。
- `--install-daemon` 會先啟動受管理的 Gateway 安裝程序。如果沒有它，您必須已經有一個本機 Gateway 正在執行，例如 `openclaw gateway run`。
- 如果您只想在自動化中寫入 config/workspace/bootstrap，請使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試使用「排程的工作」，如果建立工作被拒絕，則會回退到針對每位使用者的「啟動」資料夾登入項目。

使用參考模式的互動式導入行為：

- 當收到提示時，選擇 **Use secret reference** (使用秘密參考)。
- 然後選擇以下任一項：
  - 環境變數
  - 設定的秘密提供者 (`file` 或 `exec`)
- 導入程序會在儲存參考之前執行快速的預檢驗證。
  - 如果驗證失敗，導入程序會顯示錯誤並讓您重試。

非互動式 Z.AI 端點選擇：

注意：`--auth-choice zai-api-key` 現在會自動為您的金鑰偵測最佳的 Z.AI 端點 (優先搭配 `zai/glm-5` 使用一般 API)。
如果您特別想要 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。

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

- `quickstart`：最精簡提示，自動產生 gateway token。
- `manual`：針對 port/bind/auth 的完整提示（`advanced` 的別名）。
- 本地入門 DM 範圍行為：[CLI 設定參考](/en/start/wizard-cli-reference#outputs-and-internals)。
- 最快速首次聊天：`openclaw dashboard`（控制 UI，無須設定頻道）。
- 自訂提供者：連接任何 OpenAI 或 Anthropic 相容端點，包含未列出的託管提供者。使用 Unknown 自動偵測。

## 常見後續指令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。若要用於腳本，請使用 `--non-interactive`。</Note>
