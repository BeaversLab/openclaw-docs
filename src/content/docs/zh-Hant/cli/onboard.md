---
summary: "CLI 參考資料：`openclaw onboard`（互動式上線）"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "上線"
---

# `openclaw onboard`

用於本地或遠端 Gateway 設定的互動式入門流程。

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
  --custom-compatibility openai
```

`--custom-api-key` 在非互動模式下是可選的。如果省略，入門指南會檢查 `CUSTOM_API_KEY`。

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

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 是可選的；如果省略，入門指南會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也可以在此使用。

將供應商金鑰以參照形式儲存，而非明文：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，入門指南會寫入環境變數支援的參照，而非明文金鑰值。
對於由 auth-profile 支援的供應商，這會寫入 `keyRef` 項目；對於自訂供應商，這會將 `models.providers.<id>.apiKey` 寫入為環境變數參照（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式合約：

- 在入門指南流程環境中設定供應商環境變數（例如 `OPENAI_API_KEY`）。
- 除非也設定了該環境變數，否則請勿傳遞內聯金鑰旗標（例如 `--openai-api-key`）。
- 如果在未設定所需環境變數的情況下傳遞內聯金鑰旗標，入門指南會快速失敗並提供指引。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存明文權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 會將 `gateway.auth.token` 儲存為環境變數 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 要求入門指南流程環境中有一個非空的環境變數。
- 使用 `--install-daemon` 時，當權杖驗證需要權杖時，SecretRef 管理的 gateway 權杖會經過驗證，但不會在監督服務環境中繼資料中以解析出的明文形式保存。
- 使用 `--install-daemon` 時，如果權杖模式需要權杖且設定的權杖 SecretRef 未解析，入門指南會快速失敗並提供修復指引。
- 使用 `--install-daemon` 時，如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，入門指南會封鎖安裝，直到明確設定模式為止。
- 本機入門會將 `gateway.mode="local"` 寫入設定。如果後續的設定檔缺少 `gateway.mode`，請將其視為設定損壞或不完整的手動編輯，而非有效的本機模式捷徑。
- `--allow-unconfigured` 是一個獨立的閘道執行時期緊急逃生口。這並不表示入門程序可以省略 `gateway.mode`。

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

- 除非您傳遞 `--skip-health`，否則入門程序會等待可連線的本機閘道，然後才會成功結束。
- `--install-daemon` 會先啟動受管理的閘道安裝路徑。如果沒有它，您必須已經有一個本機閘道正在執行，例如 `openclaw gateway run`。
- 如果您只想在自動化中進行設定/工作區/啟動寫入，請使用 `--skip-health`。
- 如果您自己管理工作區檔案，請傳遞 `--skip-bootstrap` 來設定 `agents.defaults.skipBootstrap: true` 並跳過建立 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，如果拒絕建立工作，`--install-daemon` 會先嘗試「排程的工作」，並回退到每個使用者的「啟動」資料夾登入項目。

使用參考模式的互動式入門行為：

- 當被提示時，選擇 **Use secret reference**。
- 然後選擇下列其中一項：
  - 環境變數
  - 設定的秘密提供者 (`file` 或 `exec`)
- 入門程序會在儲存參照之前執行快速的預先驗證。
  - 如果驗證失敗，入門程序會顯示錯誤並讓您重試。

### 非互動式 Z.AI 端點選擇

<Note>`--auth-choice zai-api-key` 會自動為您的金鑰偵測最佳的 Z.AI 端點（偏好使用 `zai/glm-5.1` 的一般 API）。如果您特別想要 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。</Note>

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

## Flow 備註

<AccordionGroup>
  <Accordion title="Flow types">
    - `quickstart`：最精簡的提示，自動產生 gateway token。
    - `manual`：針對 port、bind 和 auth 的完整提示（`advanced` 的別名）。
    - `import`：執行偵測到的遷移提供者，預覽計畫，然後在確認後套用。
  </Accordion>
  <Accordion title="Provider prefiltering">
    當驗證選擇暗示偏好的提供者時，入門流程會將預設模型與允許清單選擇器預先篩選至該提供者。對於 Volcengine 和 BytePlus，這也會比對 coding-plan 變體（`volcengine-plan/*`、`byteplus-plan/*`）。

    如果偏好提供者篩選尚未產生任何已載入的模型，入門流程會退回至未篩選的目錄，而不是讓選擇器維持空白。

  </Accordion>
  <Accordion title="Web-search follow-ups">
    部分網頁搜尋提供者會觸發特定提供者的後續提示：

    - **Grok** 可以提供選用的 `x_search` 設定，使用相同的 `XAI_API_KEY` 以及 `x_search` 模型選擇。
    - **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` vs `api.moonshot.cn`）以及預設的 Kimi 網頁搜尋模型。

  </Accordion>
  <Accordion title="Other behaviors">
    - 本地入門 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
    - 最快首次聊天：`openclaw dashboard`（Control UI，無頻道設定）。
    - 自訂提供者：連接任何 OpenAI 或 Anthropic 相容端點，包括未列出的託管提供者。使用 Unknown 來自動偵測。
    - 如果偵測到 Hermes 狀態，入課程式會提供遷移流程。使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、覆寫模式、報表與精確對應。
  </Accordion>
</AccordionGroup>

## 常見後續指令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不表示非互動模式。請使用 `--non-interactive` 進行腳本操作。</Note>
