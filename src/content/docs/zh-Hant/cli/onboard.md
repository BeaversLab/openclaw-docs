---
summary: "CLI 參考資料，用於 `openclaw onboard` (互動式入門)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門。

## 相關指南

- CLI 入門中心：[Onboarding (CLI)](/zh-Hant/start/wizard)
- 入門概述：[Onboarding Overview](/zh-Hant/start/onboarding-overview)
- CLI 入門參考：[CLI Setup Reference](/zh-Hant/start/wizard-cli-reference)
- CLI 自動化：[CLI Automation](/zh-Hant/start/wizard-cli-automation)
- macOS 入門：[Onboarding (macOS App)](/zh-Hant/start/onboarding)

## 範例

```exec
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

對於純文字私人網路 `ws://` 目標（僅限受信任網路），請在入站流程環境中設定
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

非互動式自訂提供者：

```exec
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai
```

`--custom-api-key` 在非互動模式下為選用項。如果省略，入站流程會檢查 `CUSTOM_API_KEY`。

非互動式 Ollama：

```exec
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用項；如果省略，入站流程會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也可以在此使用。

將提供者金鑰以 refs 形式儲存，而非純文字：

```exec
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，入門指引會寫入 env-backed refs，而不是明文金鑰值。對於由 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為 env ref（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式約定：

- 在入門指引流程環境中設定提供者 env var（例如 `OPENAI_API_KEY`）。
- 除非同時設定了該 env var，否則請勿傳遞內聯金鑰旗標（例如 `--openai-api-key`）。
- 如果傳遞了內聯金鑰旗標但未提供所需的 env var，入門指引將會快速失敗並提供指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存明文權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 會將 `gateway.auth.token` 儲存為 env SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 是互斥的。
- `--gateway-token-ref-env` 要求 onboarding 流程環境中存在非空的環境變數。
- 使用 `--install-daemon` 時，當 token auth 需要 token 時，SecretRef 管理的 gateway tokens 會被驗證，但不會以解析後的明文形式儲存在 supervisor service 環境元數據中。
- 使用 `--install-daemon` 時，如果 token 模式需要 token 且設定的 token SecretRef 未解析，onboarding 將失敗並提供修復指導。
- 使用 `--install-daemon` 時，如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 但未設定 `gateway.auth.mode`，onboarding 將封鎖安裝，直到明確設定模式。

範例：

```exec
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

非互動式本地 gateway 健康狀態：

- 除非您傳遞 `--skip-health`，否則在成功結束之前，引導程序會等待一個可連線的本機閘道。
- `--install-daemon` 首先啟動受管閘道的安裝路徑。如果沒有它，您必須已經有一個正在執行的本機閘道，例如 `openclaw gateway run`。
- 如果您只想在自動化中進行設定/工作區/啟動寫入，請使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試「工作排程器」，如果建立工作被拒絕，則會退回到以使用者為主的「啟動」資料夾登入項目。

使用參照模式的互動式引導行為：

- 當被提示時，選擇 **Use secret reference** (使用秘密參照)。
- 然後選擇其中之一：
  - 環境變數
  - 設定的秘密提供者 (`file` 或 `exec`)
- 在儲存參照之前，引導程式會執行快速的飛行前驗證。
  - 如果驗證失敗，入門指南會顯示錯誤並讓您重試。

非互動式 Z.AI 端點選項：

注意： `--auth-choice zai-api-key` 現在會自動為您的金鑰偵測最佳的 Z.AI 端點（偏好搭配 `zai/glm-5` 的通用 API）。
如果您特別想要 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。

```exec
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

```exec
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

流程備註：

- `quickstart`：最精簡的提示，自動產生 gateway 權杖。
- `manual`：針對 port/bind/auth 的完整提示（`advanced` 的別名）。
- 本機入門 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
- 最快第一次對談： `openclaw dashboard` (Control UI，無須設定頻道)。
- 自訂提供者：連接任何 OpenAI 或 Anthropic 相容的端點，
  包括未列出的託管提供者。使用 Unknown 進行自動偵測。

## 常見的後續指令

```exec
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不代表非互動模式。請針對腳本使用 `--non-interactive`。</Note>
