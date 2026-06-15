---
summary: "CLI 參考資料 `openclaw onboard` （互動式入門）"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "入門"
---

# `openclaw onboard`

針對本地或遠端 Gateway 設定的完整引導式上架流程。當您希望 OpenClaw 在單一流程中逐步引導模型驗證、工作區、閘道、頻道、技能和健康檢查時使用此選項。

## 相關指南

<CardGroup cols={2}>
  <Card title="CLI 入門中心" href="/zh-Hant/start/wizard" icon="rocket">
    互動式 CLI 流程的逐步介紹。
  </Card>
  <Card title="入門概覽" href="/zh-Hant/start/onboarding-overview" icon="map">
    OpenClaw 入門流程的整體概況。
  </Card>
  <Card title="CLI 設定參考" href="/zh-Hant/start/wizard-cli-reference" icon="book">
    輸出、內部機制及各步驟的行為。
  </Card>
  <Card title="CLI 自動化" href="/zh-Hant/start/wizard-cli-automation" icon="terminal">
    非互動式旗標與腳本設定。
  </Card>
  <Card title="macOS 應用程式入門" href="/zh-Hant/start/onboarding" icon="apple">
    macOS 選單列應用程式的入門流程。
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

`--flow import` 使用外掛程式擁有的遷移提供者（例如 Hermes）。它僅針對全新的 OpenClaw 設定執行；如果現有的設定、憑證、工作階段或工作區記憶體/身分識別檔案存在，請在匯入前重設或選擇全新的設定。

`--modern` 啟動 Crestodian 對話式入門預覽。如果沒有
`--modern`，`openclaw onboard` 將保持傳統的入門流程。

在全新安裝的情況下，如果作用中的設定檔遺失或沒有任何經過編寫的設定（空白或僅有元資料），單獨執行 `openclaw` 也會啟動經典的上線流程。一旦設定檔包含經過編寫的設定，單獨執行 `openclaw` 將會改為開啟 Crestodian。

對於回環位址、私有 IP 位址字面值、`.local` 以及 Tailnet `*.ts.net` 閘道 URL，接受純文字 `ws://`。對於其他受信任的私有 DNS 名稱，請在上線流程環境中設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

## 地區設定

互動式上線使用 CLI 精靈的地區設定作為固定的設定複本。解析順序為：

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. 英文備用

支援的精靈地區設定為 `en`、`zh-CN` 和 `zh-TW`。地區設定值可以使用底線或 POSIX 後綴形式，例如 `zh_CN.UTF-8`。產品名稱、指令名稱、設定鍵、URL、提供者 ID、模型 ID 和外掛/通道標籤保持原樣。

範例：

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

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

`--custom-api-key` 在非互動模式下為選用。如果省略，上線程序會檢查 `CUSTOM_API_KEY`。
OpenClaw 會自動將常見的視覺模型 ID 標記為支援圖像。針對未知的自訂視覺模型 ID，請傳入 `--custom-image-input`，或傳入 `--custom-text-input` 以強制使用僅文字的中繼資料。
請使用 `--custom-compatibility openai-responses` 來支援 `/v1/responses` 但不支援 `/v1/chat/completions` 的 OpenAI 相容端點。

LM Studio 在非互動模式下也支援特定於提供者的金鑰旗標：

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

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用；如果省略，上線程序會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也適用於此。

將提供者金鑰以參照形式儲存，而非純文字：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，上線程序會寫入環境變數支援的參照，而非純文字金鑰值。
對於由 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫入為環境變數參照（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式合約：

- 在上線程序環境中設定提供者環境變數（例如 `OPENAI_API_KEY`）。
- 除非該環境變數也已設定，否則請勿傳遞內嵌金鑰旗標（例如 `--openai-api-key`）。
- 如果在沒有所需環境變數的情況下傳遞內嵌金鑰旗標，入門程式將會快速失敗並提供指導。

非互動模式下的閘道 Token 選項：

- `--gateway-auth token --gateway-token <token>` 會儲存純文字 token。
- `--gateway-auth token --gateway-token-ref-env <name>` 會將 `gateway.auth.token` 儲存為環境變數 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 要求在上線程序環境中有一個非空環境變數。
- 使用 `--install-daemon` 時，當 token 驗證需要 token，SecretRef 管理的閘道 token 會被驗證，但不會在監督服務環境中繼資料中保存為解析後的純文字。
- 使用 `--install-daemon` 時，如果 token 模式需要 token 且設定的 token SecretRef 未解析，上線程序會以失敗封閉並提供修復指引。
- 使用 `--install-daemon` 時，如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則導入流程會封鎖安裝，直到明確設定模式。
- 本地導入會將 `gateway.mode="local"` 寫入設定。如果後續的設定檔缺少 `gateway.mode`，請將其視為設定損壞或不完整的手動編輯，而非有效的本地模式捷徑。
- 當選擇的設定路徑需要時，本機入門程式會安裝選取的可下載外掛程式。
- 遠端入門程式僅會寫入遠端閘道的連線資訊，並不會安裝本機外掛程式套件。
- `--allow-unconfigured` 是一個獨立的閘道執行時期緊急逃生門。這並不表示導入流程可以省略 `gateway.mode`。

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

非互動式本地閘道健康檢查：

- 除非您傳遞 `--skip-health`，否則導入流程會在成功結束前等待可連線的本地閘道。
- `--install-daemon` 會先啟動受管理的閘道安裝路徑。如果沒有它，您必須已經有一個本地閘道正在運作，例如 `openclaw gateway run`。
- 如果您只想在自動化中寫入設定/工作區/引導程式，請使用 `--skip-health`。
- 如果您自行管理工作區檔案，請傳遞 `--skip-bootstrap` 來設定 `agents.defaults.skipBootstrap: true`，並跳過建立 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試「排程的工作」，如果建立工作被拒絕，則會回退到個別使用者的「啟動」資料夾登入項目。

使用參照模式時的互動式加入行為：

- 當收到提示時，選擇 **使用秘密參照**。
- 然後選擇下列其中一項：
  - 環境變數
  - 已設定的金鑰提供者 (`file` 或 `exec`)
- 加入流程會在儲存參照之前執行快速的飛前驗證。
  - 如果驗證失敗，加入流程會顯示錯誤並讓您重試。

### 非互動式 Z.AI 端點選擇

<Note>`--auth-choice zai-api-key` 會自動為您的金鑰偵測最佳的 Z.AI 端點（優先搭配 `zai/glm-5.1` 使用的一般 API）。如果您特別想要 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。</Note>

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
    - `quickstart`：最精簡提示，自動產生 gateway token。
    - `manual`：針對 port、bind 與 auth 的完整提示（`advanced` 的別名）。
    - `import`：執行偵測到的遷移提供者，預覽計畫，經確認後套用。

  </Accordion>
  <Accordion title="提供者預先篩選">
    當某個 auth 選擇隱含偏好的提供者時，onboarding 會將「預設模型」與「允許清單」選取器預先篩選至該提供者。對於 Volcengine 與 BytePlus，這也會對應 coding-plan 變體（`volcengine-plan/*`、`byteplus-plan/*`）。

    若偏好的提供者篩選結果尚未產生任何已載入的模型，onboarding 將回退至未篩選的目錄，而不讓選取器保持空白。

  </Accordion>
  <Accordion title="網路搜尋後續提示">
    某些網路搜尋提供者會觸發提供者專屬的後續提示：

    - **Grok** 可提供選擇性的 `x_search` 設定，使用相同的 xAI OAuth 概要檔或 API 金鑰，以及 `x_search` 模型選擇。
    - **Kimi** 可能會詢問 Moonshot API 區域（`api.moonshot.ai` vs `api.moonshot.cn`）與預設的 Kimi 網路搜尋模型。

  </Accordion>
  <Accordion title="其他行為">
    - 本地 onboarding DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
    - 最快的首次聊天：`openclaw dashboard`（Control UI，不需頻道設定）。
    - 自訂提供者：連接任何 OpenAI 或 Anthropic 相容端點，包含未列出的託管提供者。使用 Unknown 以自動偵測。
    - 若偵測到 Hermes 狀態，onboarding 會提供遷移流程。使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、覆寫模式、報告與精確對應。

  </Accordion>
</AccordionGroup>

## 常見後續指令

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

如果您只需要基礎設定/工作區，請改用 `openclaw setup`。稍後請使用 `openclaw configure` 進行特定變更，並使用 `openclaw channels add` 進行僅針對通道的設定。

<Note>`--json` 並不暗示非互動模式。請使用 `--non-interactive` 進行腳本操作。</Note>
