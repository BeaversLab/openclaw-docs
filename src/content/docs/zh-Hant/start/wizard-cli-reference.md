---
summary: "CLI 設定流程、驗證/模型設定、輸出與內部機制的完整參考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 安裝參考"
sidebarTitle: "CLI 參考"
---

此頁面是 `openclaw onboard` 的完整參考。
如需簡短指南，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

## 精靈的功能

本機模式（預設）會引導您完成：

- 模型與驗證設定（OpenAI Code 訂閱 OAuth、Anthropic Claude CLI 或 API 金鑰，以及 MiniMax、GLM、Ollama、Moonshot、StepFun 和 AI Gateway 選項）
- 工作區位置與啟動檔案
- Gateway 設定（連接埠、綁定、驗證、Tailscale）
- 頻道和提供者（Telegram、WhatsApp、Discord、Google Chat、Mattermost、Signal、iMessage 及其他內建的頻道外掛程式）
- Daemon 安裝（LaunchAgent、systemd 使用者單元，或原生的 Windows 排程任務，並備有啟動資料夾後援）
- 健康檢查
- 技能設定

遠端模式會將此機器設定為連線到其他地方的 Gateway。
它不會在遠端主機上安裝或修改任何內容。

## 本機流程詳情

<Steps>
  <Step title="Existing config detection">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇 Keep（保留）、Modify（修改）或 Reset（重設）。
    - 重新執行精靈不會清除任何內容，除非您明確選擇 Reset（或傳遞 `--reset`）。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full` 一併移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求您在繼續之前執行 `openclaw doctor`。
    - 重設會使用 `trash` 並提供範圍選項：
      - 僅設定
      - 設定 + 憑證 + 工作階段
      - 完整重設（也會移除工作區）

  </Step>
  <Step title="Model and auth">
    - 完整的選項矩陣位於 [Auth and model options](#auth-and-model-options)。

  </Step>
  <Step title="Workspace">
    - 預設為 `~/.openclaw/workspace`（可設定）。
    - 為首次執行啟動程序所需的工作區檔案進行種子設定。
    - 工作區配置：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Step>
  <Step title="Gateway">
    - 提示輸入連接埠、綁定、驗證模式和 Tailscale 曝露。
    - 建議：即使是回環也保持權杖驗證已啟用，以便本機 WS 用戶端必須進行驗證。
    - 在權杖模式下，互動式設定提供：
      - **產生/儲存明文權杖**（預設）
      - **使用 SecretRef**（選用）
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在 onboarding 流程環境中有非空的環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時才停用驗證。
    - 非回環綁定仍需要驗證。

  </Step>
  <Step title="頻道">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選擇性 QR 登入
    - [Telegram](/zh-Hant/channels/telegram)：機器人 token
    - [Discord](/zh-Hant/channels/discord)：機器人 token
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳戶 JSON + webhook 受眾
    - [Mattermost](/zh-Hant/channels/mattermost)：機器人 token + 基礎 URL
    - [Signal](/zh-Hant/channels/signal)：選擇性 `signal-cli` 安裝 + 帳戶設定
    - [iMessage](/zh-Hant/channels/imessage)：`imsg` CLI 路徑 + 訊息 DB 存取權；當 Gateway 在 Mac 以外執行時，請使用 SSH 包裝器
    - DM 安全性：預設為配對。第一則 DM 會傳送代碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="Daemon 安裝">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若是無人值守模式，請使用自訂的 LaunchDaemon (未隨附)。
    - Linux 與透過 WSL2 的 Windows：systemd 使用者單元
      - 精靈會嘗試 `loginctl enable-linger <user>`，讓 gateway 在登出後仍保持運作。
      - 可能會提示輸入 sudo (寫入 `/var/lib/systemd/linger`)；它會先嘗試不使用 sudo。
    - 原生 Windows：優先使用排程任務
      - 如果建立任務被拒絕，OpenClaw 會退回至每個使用者的啟動資料夾登入項目，並立即啟動 gateway。
      - 排程任務仍是首選，因為它們提供更好的監督器狀態。
    - 執行時期選擇：Node (推薦；WhatsApp 和 Telegram 必需)。不推薦使用 Bun。

  </Step>
  <Step title="健康檢查">
    - 啟動 gateway (如果需要) 並執行 `openclaw health`。
    - `openclaw status --deep` 會將即時 gateway 健康探測加入狀態輸出中，包括支援時的頻道探測。

  </Step>
  <Step title="技能">
    - 讀取可用技能並檢查需求。
    - 讓您選擇 node 管理器：npm、pnpm 或 bun。
    - 安裝選用性相依套件 (部分在 macOS 上使用 Homebrew)。

  </Step>
  <Step title="完成">
    - 摘要與後續步驟，包括 iOS、Android 和 macOS 應用程式選項。

  </Step>
</Steps>

<Note>如果未偵測到 GUI，精靈會印出控制 UI 的 SSH 連接埠轉發指示，而不是開啟瀏覽器。 如果缺少控制 UI 資產，精靈會嘗試建置它們；後備方案是 `pnpm ui:build`（自動安裝 UI 相依套件）。</Note>

## 遠端模式詳細資訊

遠端模式會將此機器設定為連線到其他地方的閘道。

<Info>遠端模式不會在遠端主機上安裝或修改任何項目。</Info>

您的設定：

- 遠端閘道 URL (`ws://...`)
- 權杖（如果遠端閘道需要驗證）（建議）

<Note>
- 如果閘道僅限 loopback，請使用 SSH 通道或 tailnet。
- 探索提示：
  - macOS：Bonjour (`dns-sd`)
  - Linux：Avahi (`avahi-browse`)

</Note>

## 驗證與模型選項

<AccordionGroup>
  <Accordion title="Anthropic API 金鑰">
    如果存在則使用 `ANTHROPIC_API_KEY` 或提示輸入金鑰，然後將其儲存以供常駐程式使用。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (OAuth)">
    瀏覽器流程；貼上 `code#state`。

    當模型未設定或已經是 OpenAI 系列時，透過 Codex 執行時期將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (裝置配對)">
    使用短期裝置代碼的瀏覽器配對流程。

    當模型未設定或已經是 OpenAI 系列時，透過 Codex 執行時期將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI API 金鑰">
    如果存在則使用 `OPENAI_API_KEY` 或提示輸入金鑰，然後將認證資訊儲存在 auth profiles 中。

    當模型未設定、`openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="xAI (Grok) API 金鑰">
    提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
  </Accordion>
  <Accordion title="OpenCode">
    提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`) 並讓您選擇 Zen 或 Go 目錄。
    設定 URL：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API 金鑰 (通用)">
    為您儲存金鑰。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示輸入 `AI_GATEWAY_API_KEY`。
    更多詳情：[Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示輸入帳戶 ID、閘道 ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多詳情：[Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax">
    配置會自動寫入。託管預設值為 `MiniMax-M2.7`；API 金鑰設定使用
    `minimax/...`，而 OAuth 設定使用 `minimax-portal/...`。
    更多詳情：[MiniMax](/zh-Hant/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    針對中國或全球端點上的 StepFun 標準版或 Step Plan，配置會自動寫入。
    標準版目前包括 `step-3.5-flash`，Step Plan 也包括 `step-3.5-flash-2603`。
    更多詳情：[StepFun](/zh-Hant/providers/stepfun)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示輸入 `SYNTHETIC_API_KEY`。
    更多詳情：[Synthetic](/zh-Hant/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    首先提示輸入 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 使用 `OLLAMA_API_KEY` 搭配 `https://ollama.com`。
    主機託管模式會提示輸入基礎 URL（預設為 `http://127.0.0.1:11434`），探索可用模型並建議預設值。
    `Cloud + Local` 還會檢查該 Ollama 主機是否已登入以使用雲端存取。
    更多詳情：[Ollama](/zh-Hant/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置會自動寫入。
    更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom provider">
    適用於 OpenAI 相容和 Anthropic 相容的端點。

    互動式入學支援與其他供應商 API 金鑰流程相同的 API 金鑰儲存選項：
    - **立即貼上 API 金鑰**（純文字）
    - **使用秘密參照**（環境變數參照或已配置的供應商參照，並進行預檢驗證）

    非互動式旗標：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（選用；若未提供則預設為 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（選用）
    - `--custom-compatibility <openai|anthropic>`（選用；預設為 `openai`）
    - `--custom-image-input` / `--custom-text-input`（選用；覆寫推斷的模型輸入能力）

  </Accordion>
  <Accordion title="Skip">
    保持未設定認證狀態。
  </Accordion>
</AccordionGroup>

模型行為：

- 從偵測到的選項中選擇預設模型，或手動輸入供應商與模型。
- 自訂供應商入學會推斷常見模型 ID 的圖片支援，並僅在模型名稱未知時才詢問。
- 當上架作業從提供者驗證選項啟動時，模型選擇器會自動偏好該提供者。對於 Volcengine 與 BytePlus，此偏好設定也會符合其編碼方案變體 (`volcengine-plan/*`,
  `byteplus-plan/*`)。
- 如果該偏好的供應商篩選結果為空，選擇器會回退至完整目錄，而不是不顯示任何模型。
- 精靈會執行模型檢查，如果設定的模型未知或缺少驗證，則會發出警告。

憑證與設定檔路徑：

- 驗證設定檔 (API 金鑰 + OAuth)：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版 OAuth 匯入：`~/.openclaw/credentials/oauth.json`

憑證儲存模式：

- 預設的入職行為會將 API 金鑰以純文字值形式保存在驗證設定檔中。
- `--secret-input-mode ref` 啟用參照模式，而非純文字金鑰儲存。
  在互動式設定中，您可以選擇下列任一項：
  - 環境變數參照（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已設定的提供者參照（`file` 或 `exec`）搭配提供者別名與 ID
- 互動式參照模式會在儲存前執行快速預檢驗證。
  - 環境變數參照：驗證變數名稱以及目前入職環境中的非空值。
  - 供應商參照：驗證供應商設定並解析請求的 ID。
  - 如果 preflight 失敗，onboarding 會顯示錯誤並讓您重試。
- 在非互動模式下，`--secret-input-mode ref` 僅支援環境變數。
  - 在 onboarding 流程環境中設定供應商環境變數。
  - 內聯金鑰旗標（例如 `--openai-api-key`）要求必須設定該環境變數；否則上線流程會快速失敗。
  - 對於自訂提供者，非互動式 `ref` 模式會將 `models.providers.<id>.apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在該自訂提供者的情況下，`--custom-api-key` 要求必須設定 `CUSTOM_API_KEY`；否則上線流程會快速失敗。
- Gateway 驗證憑證在互動式設定中支援純文字和 SecretRef 選項：
  - Token 模式：**產生/儲存純文字 token**（預設）或 **使用 SecretRef**。
  - 密碼模式：純文字或 SecretRef。
- 非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
- 現有的純文字設定會繼續不變地運作。

<Note>
無介面與伺服器提示：在具有瀏覽器的機器上完成 OAuth，然後將該代理程式的 `auth-profiles.json`（例如
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或相符的
`$OPENCLAW_STATE_DIR/...` 路徑）複製到閘道主機。`credentials/oauth.json`
僅是舊版匯入來源。
</Note>

## 輸出與內部機制

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- 當傳遞 `--skip-bootstrap` 時顯示 `agents.defaults.skipBootstrap`
- `agents.defaults.model` / `models.providers`（若選擇 Minimax）
- `tools.profile`（若未設定，本機入學預設為 `"coding"`；會保留現有的明確值）
- `gateway.*`（模式、綁定、驗證、Tailscale）
- `session.dmScope`（若未設定，本機入學會將此預設為 `per-channel-peer`；會保留現有的明確值）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 當您在提示期間選擇加入時，頻道允許清單（Slack、Discord、Matrix、Microsoft Teams）（名稱會盡可能解析為 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 旗標接受 `npm`、`pnpm` 或 `bun`。
  - 手動設定稍後仍可設定 `skills.install.nodeManager: "yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證儲存在 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
Sessions 儲存在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

<Note>部分通道是以插件形式提供。當在設定過程中選擇時，精靈會在通道設定之前提示安裝插件（npm 或本機路徑）。</Note>

Gateway 精靈 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

用戶端（macOS 應用程式和 Control UI）可以呈現步驟，而無需重新實作上架邏輯。

Signal 設定行為：

- 下載適當的發行資產
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 之下
- 在設定中寫入 `channels.signal.cliPath`
- JVM 建置需要 Java 21
- 當可用時會使用原生建置
- Windows 使用 WSL2 並在 WSL 內遵循 Linux signal-cli 流程

## 相關文件

- 上架中心：[Onboarding (CLI)](/zh-Hant/start/wizard)
- 自動化與腳本：[CLI Automation](/zh-Hant/start/wizard-cli-automation)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
