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

純文字 `ws://` 適用於回送、私人 IP 字面值、`.local`，以及
Tailnet `*.ts.net` 閘道 URL。對於其他受信任的私人 DNS 名稱，請在入門流程環境中設定
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

## 地區設定

互動式入門使用 CLI 精靈的語言代碼作為固定的設定文字。解析順序為：

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. 英文後備

支援的精靈語言代碼包括 `en`、`zh-CN` 和 `zh-TW`。語言代碼值可使用底線或 POSIX 後綴形式，例如 `zh_CN.UTF-8`。產品名稱、命令名稱、設定鍵、URL、提供者 ID、模型 ID 以及外掛/頻道標籤均保持原樣。

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

`--custom-api-key` 在非互動模式下為選用。若省略，入門程式會檢查 `CUSTOM_API_KEY`。OpenClaw 會自動將常見的視覺模型 ID 標記為支援影像。對於未知的自訂視覺 ID，請傳入 `--custom-image-input`；若要強制僅限文字的中繼資料，則傳入 `--custom-text-input`。

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

`--custom-base-url` 預設為 `http://127.0.0.1:11434`。`--custom-model-id` 為選用；若省略，入門程式會使用 Ollama 建議的預設值。雲端模型 ID（例如 `kimi-k2.5:cloud`）也可在此使用。

將提供者金鑰以參照而非純文字形式儲存：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 時，入門程式會寫入由環境變數支援的參照，而非純文字金鑰值。對於由 auth-profile 支援的提供者，這會寫入 `keyRef` 項目；對於自訂提供者，這會將 `models.providers.<id>.apiKey` 寫為環境變數參照（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非互動式 `ref` 模式約定：

- 在入門流程環境中設定提供者環境變數（例如 `OPENAI_API_KEY`）。
- 除非已設定該環境變數，否則請勿傳入內聯金鑰旗標（例如 `--openai-api-key`）。
- 若傳入內聯金鑰旗標但未提供所需環境變數，入門程式會顯示指引並快速失敗。

非互動模式下的 Gateway 權杖選項：

- `--gateway-auth token --gateway-token <token>` 會儲存純文字權杖。
- `--gateway-auth token --gateway-token-ref-env <name>` 將 `gateway.auth.token` 儲存為 env SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要在上線流程環境中設定非空的環境變數。
- 使用 `--install-daemon` 時，當權杖驗證需要權杖，SecretRef 管理的閘道權杖會被驗證，但不會在監督器服務環境元資料中以解析後的明文形式保存。
- 使用 `--install-daemon` 時，如果權杖模式需要權杖且已設定的權杖 SecretRef 未解析，上線流程將以封閉式失敗並提供修復指導。
- 使用 `--install-daemon` 時，如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 但未設定 `gateway.auth.mode`，上線流程將封鎖安裝，直到明確設定模式。
- 本機上線會將 `gateway.mode="local"` 寫入設定檔。如果後續的設定檔缺少 `gateway.mode`，應將其視為設定損毀或不完整的手動編輯，而非有效的本機模式捷徑。
- 當選擇的設定路徑需要時，本機上線會安裝選定的可下載外掛程式。
- 遠端上線僅寫入遠端閘道的連線資訊，且不安裝本機外掛套件。
- `--allow-unconfigured` 是一個獨立的閘道執行時緊急應變措施。這並不意味著上線流程可以省略 `gateway.mode`。

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

- 除非您傳遞 `--skip-health`，否則上線流程會等待可連線的本機閘道才會成功結束。
- `--install-daemon` 會先啟動受管理的閘道安裝路徑。若沒有它，您必須已經有一個正在執行的本機閘道，例如 `openclaw gateway run`。
- 如果您只想在自動化中進行設定/工作區/引導寫入，請使用 `--skip-health`。
- 如果您自行管理工作區檔案，請傳入 `--skip-bootstrap` 以設定 `agents.defaults.skipBootstrap: true` 並跳過建立 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 會先嘗試使用「工作排程器」，如果建立工作被拒絕，則會退而求其次使用每個使用者的「啟動」資料夾登入項目。

使用參考模式的互動式上線行為：

- 當系統提示時，請選擇 **Use secret reference**。
- 然後選擇以下其中一項：
  - 環境變數
  - 設定的祕密提供者 (`file` 或 `exec`)
- 上線程序會在儲存參照之前執行快速的飛行前驗證。
  - 如果驗證失敗，上線程序會顯示錯誤並讓您重試。

### 非互動式 Z.AI 端點選擇

<Note>`--auth-choice zai-api-key` 會自動為您的金鑰偵測最佳的 Z.AI 端點 (偏好使用 `zai/glm-5.1` 的通用 API)。如果您特別想要 GLM Coding Plan 端點，請選擇 `zai-coding-global` 或 `zai-coding-cn`。</Note>

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
  <Accordion title="Flow types">
    - `quickstart`：最少的提示，自動產生 gateway token。
    - `manual`：針對連接埠、綁定和驗證的完整提示 (`advanced` 的別名)。
    - `import`：執行偵測到的移轉提供者，預覽計畫，然後在確認後套用。

  </Accordion>
  <Accordion title="提供者預先過濾">
    當驗證選擇暗示首選提供者時，上架流程會將預設模型與允許清單選擇器預先過濾為該提供者。對於 Volcengine 和 BytePlus，這也會比對編碼計劃的變體（`volcengine-plan/*`、`byteplus-plan/*`）。

    如果首選提供者篩選器尚未產生任何已載入的模型，上架流程會退回到未經過濾的目錄，而不是讓選擇器保持空白。

  </Accordion>
  <Accordion title="網頁搜尋後續">
    部分網頁搜尋提供者會觸發特定的後續提示：

    - **Grok** 可以提供選用的 `x_search` 設定，使用相同的 `XAI_API_KEY` 以及 `x_search` 模型選擇。
    - **Kimi** 可以詢問 Moonshot API 區域（`api.moonshot.ai` 與 `api.moonshot.cn`）以及預設的 Kimi 網頁搜尋模型。

  </Accordion>
  <Accordion title="其他行為">
    - 本地上架 DM 範圍行為：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)。
    - 最快第一次聊天：`openclaw dashboard`（控制 UI，無頻道設定）。
    - 自訂提供者：連線任何 OpenAI 或 Anthropic 相容的端點，包括未列出的託管提供者。使用 Unknown 進行自動偵測。
    - 如果偵測到 Hermes 狀態，上架流程會提供遷移流程。使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、覆寫模式、報告和精確對應。

  </Accordion>
</AccordionGroup>

## 常見後續指令

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

當您只需要基礎設定/工作區時，請改用 `openclaw setup`。之後使用 `openclaw configure` 進行特定變更，並使用 `openclaw channels add` 進行僅限頻道的設定。

<Note>`--json` 並不代表非互動模式。請使用 `--non-interactive` 進行腳本撰寫。</Note>
