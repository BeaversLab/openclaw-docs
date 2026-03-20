---
summary: "CLI 參考資料 `openclaw onboard` （互動式入職）"
read_when:
  - 您需要針對 gateway、workspace、auth、channels 和 skills 的引導式設定
title: "onboard"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門。

## 相關指南

- CLI 入職中心：[入職 (CLI)](/zh-Hant/start/wizard)
- 入職概覽：[入職概覽](/zh-Hant/start/onboarding-overview)
- CLI 入職參考資料：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)
- CLI 自動化：[CLI 自動化](/zh-Hant/start/wizard-cli-automation)
- macOS 入職：[入職 (macOS 應用程式)](/zh-Hant/start/onboarding)

## 範例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

對於純文字私人網路 `ws://` 目標（僅限受信任網路），請在入職程序環境中設定
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

`--custom-api-key` 在非互動模式下為可選。如果省略，onboarding 會檢查 `CUSTOM_API_KEY`。

非互動式 Ollama：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為可選；如果省略，onboarding 會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也適用於此。

將提供者金鑰以參照形式儲存，而非純文字：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，onboarding 會寫入由環境變數支援的參考，而非純文字金鑰值。對於由 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為環境變數參考（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式約定：

- 在 onboarding 程序環境中設定提供者環境變數（例如 `OPENAI_API_KEY`）。
- 除非同時設定了該環境變數，否則請勿傳遞內聯金鑰標誌（例如 `--openai-api-key`）。
- 如果在沒有所需環境變數的情況下傳遞內聯金鑰旗標，入門會立即失敗並提供指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存純文字權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 會將 `gateway.auth.token` 作為環境變數 SecretRef 儲存。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要在入職流程環境中有一個非空的環境變數。
- 使用 `--install-daemon` 時，當權杖驗證需要權杖，SecretRef 管理的閘道權杖會被驗證，但不會以解析出的純文字形式持久化在監督者服務環境中繼資料中。
- 使用 `--install-daemon` 時，如果權杖模式需要權杖且設定的權杖 SecretRef 未解析，入職將會封閉式失敗並提供修復指引。
- 使用 `--install-daemon` 時，如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則在明確設定模式之前，入門程序會封鎖安裝。

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

- 除非您傳遞 `--skip-health`，否則入門程序會在成功結束之前等待可連線的本地閘道。
- `--install-daemon` 首先啟動受管理的閘道安裝路徑。若沒有它，您必須已經有本地閘道在運行，例如 `openclaw gateway run`。
- 如果您只希望在自動化中進行 config/workspace/bootstrap 寫入，請使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試「工作排程器」(Scheduled Tasks)，如果建立工作被拒絕，則會退而求其次使用使用者專屬的「啟動」資料夾登入項目。

使用參考模式時的互動式入職行為：

- 收到提示時，選擇 **Use secret reference**。
- 然後選擇下列任一項：
  - 環境變數
  - 已設定的 Secret 提供者 (`file` 或 `exec`)
- 入職會在儲存參考之前執行快速的事前檢查驗證。
  - 如果驗證失敗，入職會顯示錯誤並讓您重試。

非互動式 Z.AI 端點選擇：

注意：`--auth-choice zai-api-key` 現在會自動為您的金鑰偵測最佳的 Z.AI 端點（偏好使用含 `zai/glm-5` 的通用 API）。
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

- `quickstart`：最精簡的提示，自動產生 gateway token。
- `manual`：針對 port/bind/auth 的完整提示（`advanced` 的別名）。
- 本地入門 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
- 最快開始首次對話：`openclaw dashboard` (控制 UI，無須設定頻道)。
- 自訂提供者：連接任何 OpenAI 或 Anthropic 相容的端點，
  包括未列出的託管提供者。使用 Unknown 以自動偵測。

## 常見後續指令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不代表非互動模式。腳本請使用 `--non-interactive`。</Note>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
