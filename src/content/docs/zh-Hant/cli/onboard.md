---
summary: "CLI 參考文件適用於 `openclaw onboard` (互動式入門)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門流程。

## 相關指南

- CLI 入門中心：[Onboarding (CLI)](/zh-Hant/start/wizard)
- 入門總覽：[Onboarding Overview](/zh-Hant/start/onboarding-overview)
- CLI 入門參考：[CLI Setup Reference](/zh-Hant/start/wizard-cli-reference)
- CLI 自動化：[CLI Automation](/zh-Hant/start/wizard-cli-automation)
- macOS 入門：[Onboarding (macOS App)](/zh-Hant/start/onboarding)

## 範例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

對於純文字私人網路 `ws://` 目標（僅限受信任網路），請在入門流程環境中設定
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

`--custom-api-key` 在非互動模式下為選用。如果省略，入門會檢查 `CUSTOM_API_KEY`。

LM Studio 在非互動模式下也支援特定提供者的金鑰旗標：

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

非互動式 Ollama：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用；如果省略，入門會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也可在此使用。

將提供者金鑰儲存為參照而非純文字：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，入門會寫入受環境變數支援的參照，而非純文字金鑰值。
對於受 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為環境變數參照（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式合約：

- 在入門流程環境中設定提供者環境變數（例如 `OPENAI_API_KEY`）。
- 除非也設定了該環境變數，否則請勿傳遞內聯金鑰旗標（例如 `--openai-api-key`）。
- 如果在沒有所需環境變數的情況下傳遞內聯金鑰旗標，入門會失敗並提供指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 儲存純文字權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 將 `gateway.auth.token` 儲存為 env SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要 onboarding 流程環境中設有非空的環境變數。
- 使用 `--install-daemon` 時，當權杖驗證需要權杖時，SecretRef 管理的閘道權杖會經過驗證，但不會以解析後的純文字形式儲存在 supervisor 服務環境元資料中。
- 使用 `--install-daemon` 時，如果權杖模式需要權杖且設定的權杖 SecretRef 尚未解析，onboarding 將會以封閉式失敗並提供修復指導。
- 使用 `--install-daemon` 時，如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 但未設定 `gateway.auth.mode`，onboarding 將會封鎖安裝，直到明確設定模式為止。
- 本機 onboarding 會將 `gateway.mode="local"` 寫入設定檔。如果後續的設定檔缺少 `gateway.mode`，請將其視為設定檔損毀或不完整的手動編輯，而非有效的本機模式捷徑。
- `--allow-unconfigured` 是一個獨立的閘道執行時期緊急出口。這並不代表 onboarding 可以省略 `gateway.mode`。

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

- 除非您傳遞 `--skip-health`，否則 onboarding 會等待可連線的本機閘道才會成功結束。
- `--install-daemon` 會先啟動受控閘道的安裝路徑。若沒有它，您必須已經有一個正在執行的本機閘道，例如 `openclaw gateway run`。
- 如果您只希望在自動化中進行 config/workspace/bootstrap 寫入，請使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試使用「排定的工作」，如果在建立工作時被拒絕，則會改用每個使用者的「啟動」資料夾登入項目。

使用參考模式時的互動式 onboarding 行為：

- 當系統提示時，選擇 **Use secret reference**。
- 然後選擇下列其中之一：
  - 環境變數
  - 設定的秘密提供者 (`file` 或 `exec`)
- 入門程序在儲存參照之前會執行快速的飛前驗證。
  - 如果驗證失敗，入門程序會顯示錯誤並讓您重試。

非互動式 Z.AI 端點選項：

注意： `--auth-choice zai-api-key` 現在會自動為您的金鑰偵測最佳的 Z.AI 端點（優先使用帶有 `zai/glm-5.1` 的通用 API）。
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

- `quickstart`：最少的提示，自動產生 gateway token。
- `manual`：針對 port/bind/auth 的完整提示（`advanced` 的別名）。
- 當驗證選擇隱含偏好的供應商時，入門程序會將預設模型和允許清單選擇器預先篩選至該供應商。對於 Volcengine 和
  BytePlus，這也符合 coding-plan 變體
  (`volcengine-plan/*`, `byteplus-plan/*`)。
- 如果偏好的供應商篩選條件尚未產生任何已載入的模型，入門程序會改回退到未篩選的目錄，而不是讓選擇器保持空白。
- 在網路搜尋步驟中，部分供應商可以觸發供應商特定的
  後續提示：
  - **Grok** 可以提供選擇性的 `x_search` 設定，使用相同的 `XAI_API_KEY`
    和 `x_search` 模型選擇。
  - **Kimi** 可以詢問 Moonshot API 區域 (`api.moonshot.ai` vs
    `api.moonshot.cn`) 和預設的 Kimi 網路搜尋模型。
- 本機入門 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
- 最快的首次聊天： `openclaw dashboard` (控制 UI，無頻道設定)。
- 自訂供應商：連接任何 OpenAI 或 Anthropic 相容的端點，
  包括未列出的託管供應商。使用 Unknown 來自動偵測。

## 常見的後續指令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。請使用 `--non-interactive` 進行腳本操作。</Note>
