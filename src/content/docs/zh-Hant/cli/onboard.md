---
summary: "CLI 參考資料：`openclaw onboard`（互動式上線）"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "上線"
---

# `openclaw onboard`

針對本地或遠端 Gateway 設定的完整引導式上架流程。當您希望 OpenClaw 在單一流程中逐步引導模型驗證、工作區、閘道、頻道、技能和健康檢查時使用此選項。

## 相關指南

<CardGroup cols={2}>
  <Card title="CLI 上線中心" href="/zh-Hant/start/wizard" icon="rocket">
    互動式 CLI 流程逐步解說。
  </Card>
  <Card title="上線概覽" href="/zh-Hant/start/onboarding-overview" icon="map">
    OpenClaw 上線流程的整合方式。
  </Card>
  <Card title="CLI 設定參考" href="/zh-Hant/start/wizard-cli-reference" icon="book">
    輸出、內部機制及各步驟行為。
  </Card>
  <Card title="CLI 自動化" href="/zh-Hant/start/wizard-cli-automation" icon="terminal">
    非互動式旗標與腳本化設定。
  </Card>
  <Card title="macOS 應用程式上線" href="/zh-Hant/start/onboarding" icon="apple">
    macOS 選單列應用程式的上線流程。
  </Card>
</CardGroup>

## 範例

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import` 使用外掛程式擁有的遷移提供者（例如 Hermes）。它僅針對全新的 OpenClaw 設定執行；如果現有的設定、憑證、工作階段或工作區記憶體/身分識別檔案已存在，請在匯入前重設或選擇一個全新的設定。

`--modern` 會啟動 Crestodian 對話式上線預覽。如果沒有
`--modern`，`openclaw onboard` 會維持傳統的上線流程。

對於純文字私人網路 `ws://` 目標（僅限受信任網路），請在上線流程環境中設定
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。
這種用戶端傳輸的緊急存取沒有 `openclaw.json` 的對應功能。

非互動式自訂提供者：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

`--custom-api-key` 在非互動模式下為選用項。如果省略，上架流程會檢查 `CUSTOM_API_KEY`。
OpenClaw 會自動將常見的視覺模型 ID 標記為支援影像。若為未知的自訂視覺模型 ID，請傳入 `--custom-image-input`，或傳入 `--custom-text-input` 以強制使用僅文字的中繼資料。

LM Studio 在非互動模式下也支援供應商特定的金鑰旗標：

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

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用項；如果省略，上架流程會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也可以在此使用。

將供應商金鑰以參照形式儲存，而非明文：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，上架流程會寫入由環境變數支援的參照，而不是純文字金鑰值。
對於由 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為環境變數參照（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式合約：

- 在上架流程環境中設定提供者環境變數（例如 `OPENAI_API_KEY`）。
- 除非也已設定該環境變數，否則請勿傳入內聯金鑰旗標（例如 `--openai-api-key`）。
- 如果在未設定所需環境變數的情況下傳遞內聯金鑰旗標，入門指南會快速失敗並提供指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存純文字權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 會將 `gateway.auth.token` 作為環境變數 SecretRef 儲存。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要上架流程環境中存在非空的環境變數。
- 使用 `--install-daemon` 時，當權杖驗證需要權杖時，由 SecretRef 管理的閘道權杖會經過驗證，但不會以解析後的純文字形式儲存在 supervisor 服務環境中繼資料中。
- 使用 `--install-daemon` 時，如果權杖模式需要權杖且設定的權杖 SecretRef 未解析，上架流程會失敗關閉並提供修復指引。
- 使用 `--install-daemon` 時，如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則上架會阻擋安裝，直到明確設定模式為止。
- 本地上架會將 `gateway.mode="local"` 寫入組態。如果後續的組態檔案缺少 `gateway.mode`，請將其視為組態損毀或不完整的手動編輯，而非有效的本地模式捷徑。
- 當選擇的設定路徑需要時，本地上架會安裝所選的可下載外掛。
- 遠端上架僅會寫入遠端 Gateway 的連線資訊，且不會安裝本地外掛套件。
- `--allow-unconfigured` 是一個獨立的 gateway 執行時期緊急應變手段。這並不代表上架可以省略 `gateway.mode`。

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

非互動式本地 gateway 健康檢查：

- 除非您傳遞 `--skip-health`，否則上架會等到可連線的本地 gateway 後才會成功結束。
- `--install-daemon` 會先啟動受控 gateway 安裝路徑。若沒有它，您必須已經有一個本地 gateway 在執行，例如 `openclaw gateway run`。
- 如果您只想要在自動化中進行組態/工作區/引導寫入，請使用 `--skip-health`。
- 如果您自己管理工作區檔案，請傳遞 `--skip-bootstrap` 來設定 `agents.defaults.skipBootstrap: true` 並跳過建立 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試「排定的工作」，如果工作建立被拒絕，則會退而求其次使用針對每位使用者的「啟動」資料夾登入項目。

使用參考模式的互動式上架行為：

- 當被提示時，選擇 **使用密鑰參考**。
- 然後選擇下列之一：
  - 環境變數
  - 設定的密鑰提供者 (`file` 或 `exec`)
- 上架會在儲存參考之前執行快速的飛行前驗證。
  - 如果驗證失敗，上架會顯示錯誤並讓您重試。

### 非互動式 Z.AI 端點選擇

<Note>`--auth-choice zai-api-key` 會自動為您的金鑰偵測最佳的 Z.AI 端點（偏好使用 `zai/glm-5.1` 的一般 API）。如果您特別想要使用 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。</Note>

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

## 流程備註

<AccordionGroup>
  <Accordion title="流程類型">
    - `quickstart`：最少的提示，自動產生 gateway token。
    - `manual`：針對 port、bind 和 auth 的完整提示（`advanced` 的別名）。
    - `import`：執行偵測到的遷移提供者，預覽計畫，然後在確認後套用。

  </Accordion>
  <Accordion title="提供者預先篩選">
    當驗證選擇隱含了偏好的提供者時，onboarding 會將 default-model 和 allowlist 選擇器預先篩選為該提供者。對於 Volcengine 和 BytePlus，這也會符合 coding-plan 變體（`volcengine-plan/*`, `byteplus-plan/*`）。

    如果偏好的提供者篩選結果尚未產生任何已載入的模型，onboarding 將會退回到未篩選的目錄，而不是讓選擇器保持空白。

  </Accordion>
  <Accordion title="網路搜尋後續步驟">
    某些網路搜尋提供者會觸發特定提供者的後續提示：

    - **Grok** 可以提供可選的 `x_search` 設定，使用相同的 `XAI_API_KEY` 和 `x_search` 模型選擇。
    - **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` vs `api.moonshot.cn`）以及預設的 Kimi 網路搜尋模型。

  </Accordion>
  <Accordion title="其他行為">
    - 本地入門 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
    - 最快首次聊天：`openclaw dashboard` (Control UI，無須通道設定)。
    - 自訂供應商：連接任何 OpenAI 或 Anthropic 相容的端點，包括未列出的託管供應商。使用 Unknown 進行自動偵測。
    - 如果偵測到 Hermes 狀態，入門程序會提供遷移流程。使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、覆寫模式、報告和精確對應。

  </Accordion>
</AccordionGroup>

## 常見的後續指令

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

如果您只需要基礎設定/工作區，請改用 `openclaw setup`。稍後請使用 `openclaw configure` 進行特定變更，並使用 `openclaw channels add` 僅進行通道設定。

<Note>`--json` 並不意味著非互動模式。請使用 `--non-interactive` 進行腳本操作。</Note>
