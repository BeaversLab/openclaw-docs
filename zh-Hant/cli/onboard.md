---
summary: "`openclaw onboard` (互動式入門) 的 CLI 參考"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門。

## 相關指南

- CLI 入門中心：[入門 (CLI)](/zh-Hant/start/wizard)
- 入門概述：[入門概述](/zh-Hant/start/onboarding-overview)
- CLI 入門參考：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)
- CLI 自動化：[CLI 自動化](/zh-Hant/start/wizard-cli-automation)
- macOS 入門：[入門 (macOS 應用程式)](/zh-Hant/start/onboarding)

## 範例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

對於純文字私人網路 `ws://` 目標 (僅限信任網路)，請在入門程序環境中設定
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

`--custom-api-key` 在非互動模式下為選用項。如果省略，入門會檢查 `CUSTOM_API_KEY`。

非互動式 Ollama：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用項；如果省略，入門會使用 Ollama 建議的預設值。雲端模型 ID (例如 `kimi-k2.5:cloud`) 也可以在此使用。

將提供者金鑰以參照形式儲存，而非純文字：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref`，入門會寫入 env-backed 參照而非純文字金鑰值。
對於 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為 env 參照 (例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`)。

非互動式 `ref` 模式合約：

- 在入門程序環境中設定提供者環境變數 (例如 `OPENAI_API_KEY`)。
- 除非也已設定該環境變數，否則請勿傳遞內聯金鑰旗標 (例如 `--openai-api-key`)。
- 如果在沒有所需環境變數的情況下傳遞內聯金鑰旗標，入門會立即失敗並提供指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存純文字權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 將 `gateway.auth.token` 儲存為環境變數 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 要求在入職流程環境中有一個非空的環境變數。
- 使用 `--install-daemon` 時，當 Token 認證需要 Token 時，由 SecretRef 管理的閘道 Token 會被驗證，但不會以解析後的明文形式儲存在監督服務環境元資料中。
- 使用 `--install-daemon` 時，如果 Token 模式需要 Token 且設定的 Token SecretRef 未解析，入職將失敗並關閉，同時提供修復指引。
- 使用 `--install-daemon` 時，如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，入職將阻擋安裝直到明確設定模式。

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

非互動式本機閘道健康狀態：

- 除非您傳遞 `--skip-health`，否則入職會等待到可連線的本機閘道後才會成功結束。
- `--install-daemon` 會先啟動受控閘道安裝路徑。如果沒有它，您必須已經有一個正在運行的本機閘道，例如 `openclaw gateway run`。
- 如果您只希望在自動化中進行設定/工作區/引導程式寫入，請使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試使用「工作排程器」，如果任務建立被拒絕，則會改用每個使用者的「啟動」資料夾登入項目作為後備。

使用參考模式時的互動式入職行為：

- 收到提示時，選擇 **Use secret reference**。
- 然後選擇下列任一項：
  - 環境變數
  - 設定的秘密提供者（`file` 或 `exec`）
- 入職會在儲存參考之前執行快速的事前檢查驗證。
  - 如果驗證失敗，入職會顯示錯誤並讓您重試。

非互動式 Z.AI 端點選擇：

注意：`--auth-choice zai-api-key` 現在會自動偵測您的金鑰的最佳 Z.AI 端點（偏好搭配 `zai/glm-5` 的一般 API）。
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

流程說明：

- `quickstart`：最精簡的提示，會自動產生 gateway token。
- `manual`：針對 port/bind/auth 的完整提示（`advanced` 的別名）。
- 本機入門 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
- 最快速首次對話：`openclaw dashboard`（Control UI，無須設定頻道）。
- 自訂提供者：連接任何 OpenAI 或 Anthropic 相容的端點，
  包括未列出的託管提供者。使用 Unknown 來自動偵測。

## 常見後續指令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不代表非互動模式。指令碼請使用 `--non-interactive`。</Note>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
