---
summary: "CLI 設定流程、驗證/模型設定、輸出與內部機制的完整參考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 設定參考"
sidebarTitle: "CLI 參考"
---

# CLI 設定參考

此頁面是 `openclaw onboard` 的完整參考。
如需簡短指南，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

## 精靈的功能

本地模式 (預設) 會引導您完成以下步驟：

- Model 和 auth 設定（OpenAI Code 訂閱 OAuth、Anthropic Claude CLI 或 API 金鑰，以及 MiniMax、GLM、Ollama、Moonshot、StepFun 和 AI Gateway 選項）
- 工作區位置與啟動檔案
- Gateway 設定 (連接埠、綁定、驗證、Tailscale)
- 通道與提供者（Telegram、WhatsApp、Discord、Google Chat、Mattermost、Signal、BlueBubbles 以及其他內建的通道外掛）
- Daemon 安裝（LaunchAgent、systemd 使用者單位或原生 Windows 排程任務，並支援啟動資料夾作為備援方案）
- 健康檢查
- Skills 設定

遠端模式會將此機器設定為連線到其他地方的 Gateway。
它不會在遠端主機上安裝或修改任何內容。

## 本地流程詳情

<Steps>
  <Step title="偵測現有設定">
    - 如果 `~/.openclaw/openclaw.json` 已存在，請選擇 Keep（保留）、Modify（修改）或 Reset（重設）。
    - 重新執行精靈不會清除任何內容，除非您明確選擇 Reset（或傳遞 `--reset`）。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full` 一併移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求您在繼續之前先執行 `openclaw doctor`。
    - Reset 會使用 `trash` 並提供範圍選項：
      - 僅設定
      - 設定 + 憑證 + 會話
      - 完整重設（也會移除工作區）
  </Step>
  <Step title="Model and auth">
    - 完整選項矩陣位於 [Auth and model options](#auth-and-model-options)。
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace` (可設定)。
    - 種子首次執行啟動儀式所需的工作區檔案。
    - 工作區佈局：[Agent workspace](/zh-Hant/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway">
    - 提示輸入 port、bind、auth mode 以及 tailscale exposure。
    - 建議：即使是 loopback 也保持 token auth 開啟，讓本地 WS 客戶端必須通過驗證。
    - 在 token mode 下，互動式設定提供：
      - **產生/儲存明文 token** (預設)
      - **使用 SecretRef** (選用)
    - 在 password mode 下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在 onboarding 流程環境中提供非空白的環境變數。
      - 不能與 `--gateway-token` 一起使用。
    - 僅在您完全信任每個本地程序時才停用 auth。
    - 非 loopback 的 bind 仍然需要 auth。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh-Hant/channels/whatsapp): 可選 QR 登入
    - [Telegram](/zh-Hant/channels/telegram): bot token
    - [Discord](/zh-Hant/channels/discord): bot token
    - [Google Chat](/zh-Hant/channels/googlechat): 服務帳號 JSON + webhook audience
    - [Mattermost](/zh-Hant/channels/mattermost): bot token + 基礎 URL
    - [Signal](/zh-Hant/channels/signal): 可選 `signal-cli` 安裝 + 帳號設定
    - [BlueBubbles](/zh-Hant/channels/bluebubbles): 推薦用於 iMessage; 伺服器 URL + 密碼 + webhook
    - [iMessage](/zh-Hant/channels/imessage): 舊版 `imsg` CLI 路徑 + DB 存取權
    - DM 安全性：預設為配對。第一則 DM 發送代碼；透過
      `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="守護程式安裝">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若是無介面環境（headless），請使用自訂的 LaunchDaemon（未隨附）。
    - Linux 與透過 WSL2 的 Windows：systemd 使用者單元
      - 精靈會嘗試 `loginctl enable-linger <user>`，以便登出後閘道仍保持運作。
      - 可能會提示輸入 sudo（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - 原生 Windows：優先使用排定的工作
      - 若工作建立被拒絕，OpenClaw 會改用每個使用者的啟動資料夾登入項目，並立即啟動閘道。
      - 排定的工作仍是首選，因為它們提供更好的監督狀態。
    - 執行時期選擇：Node（推薦；WhatsApp 和 Telegram 必須使用）。不建議使用 Bun。
  </Step>
  <Step title="健康檢查">
    - 啟動閘道（如需要）並執行 `openclaw health`。
    - `openclaw status --deep` 會將即時閘道健康探針加入到狀態輸出中，包括支援時的通道探針。
  </Step>
  <Step title="技能">
    - 讀取可用技能並檢查需求。
    - 讓您選擇 node 管理員：npm、pnpm 或 bun。
    - 安裝選用相依套件（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要與後續步驟，包括 iOS、Android 和 macOS 應用程式選項。
  </Step>
</Steps>

<Note>若未偵測到 GUI，精靈會印出 SSH 連接埠轉發指示給 Control UI，而不是開啟瀏覽器。 若 Control UI 資產遺失，精靈會嘗試建置它們；備案是 `pnpm ui:build`（自動安裝 UI 相依套件）。</Note>

## 遠端模式詳情

遠端模式會將此機器設定為連線到其他地方的閘道。

<Info>遠端模式不會在遠端主機上安裝或修改任何內容。</Info>

您所設定的項目：

- 遠端閘道 URL (`ws://...`)
- 若遠端閘道需要驗證，則填入 Token（建議）

<Note>- 若閘道僅限 loopback，請使用 SSH 通道或 tailnet。 - 探索提示： - macOS：Bonjour (`dns-sd`) - Linux：Avahi (`avahi-browse`)</Note>

## 驗證與模型選項

<AccordionGroup>
  <Accordion title="Anthropic API 金鑰">
    若存在則使用 `ANTHROPIC_API_KEY`，否則提示輸入金鑰，然後將其儲存供守護程式使用。
  </Accordion>
  <Accordion title="OpenAI Code subscription (OAuth)">
    瀏覽器流程；貼上 `code#state`。

    當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI Code subscription (device pairing)">
    使用短期裝置代碼的瀏覽器配對流程。

    當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 金鑰">
    如果存在 `OPENAI_API_KEY` 則使用，否則提示輸入金鑰，然後將憑證儲存在 auth profiles 中。

    當模型未設定、`openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.4`。

  </Accordion>
  <Accordion title="xAI (Grok) API 金鑰">
    提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供商。
  </Accordion>
  <Accordion title="OpenCode">
    提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`) 並讓您選擇 Zen 或 Go 目錄。
    設定 URL：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API 金鑰 (通用)">
    為您存儲金鑰。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示輸入 `AI_GATEWAY_API_KEY`。
    更多詳細資訊：[Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示輸入 account ID、gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多詳細資訊：[Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax">
    配置會自動寫入。託管的預設值為 `MiniMax-M2.7`；API 金鑰設定使用
    `minimax/...`，OAuth 設定使用 `minimax-portal/...`。
    更多詳細資訊：[MiniMax](/zh-Hant/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    會針對中國或全球端點上的 StepFun 標準版或 Step Plan 自動寫入配置。
    標準版目前包含 `step-3.5-flash`，Step Plan 也包含 `step-3.5-flash-2603`。
    更多詳細資訊：[StepFun](/zh-Hant/providers/stepfun)。
  </Accordion>
  <Accordion title="合成 (Anthropic 相容)">
    提示輸入 `SYNTHETIC_API_KEY`。
    更多詳細資訊：[合成](/zh-Hant/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (雲端與本地開放模型)">
    首先提示輸入 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 使用 `OLLAMA_API_KEY` 搭配 `https://ollama.com`。
    主機支援的模式會提示輸入基礎 URL (預設為 `http://127.0.0.1:11434`)、探索可用模型並建議預設值。
    `Cloud + Local` 也會檢查該 Ollama 主機是否已登入以使用雲端存取權。
    更多詳細資訊：[Ollama](/zh-Hant/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot 與 Kimi Coding">
    Moonshot (Kimi K2) 與 Kimi Coding 設定會自動寫入。
    更多詳細資訊：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)。
  </Accordion>
  <Accordion title="自訂提供者">
    適用於 OpenAI 相容與 Anthropic 相容的端點。

    互動式上架支援與其他提供者 API 金鑰流程相同的 API 金鑰儲存選項：
    - **立即貼上 API 金鑰** (純文字)
    - **使用秘密參照** (環境變數參照或已設定的提供者參照，含預檢驗證)

    非互動式旗標：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (選用；若未提供則回退至 `CUSTOM_API_KEY`)
    - `--custom-provider-id` (選用)
    - `--custom-compatibility <openai|anthropic>` (選用；預設為 `openai`)

  </Accordion>
  <Accordion title="Skip">
    保持未設定驗證狀態。
  </Accordion>
</AccordionGroup>

模型行為：

- 從偵測到的選項中挑選預設模型，或手動輸入供應商和模型。
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
- `agents.defaults.model` / `models.providers`（若選擇 Minimax）
- `tools.profile`（若未設定，本機上線預設為 `"coding"`；既有的明確值將被保留）
- `gateway.*`（模式、綁定、驗證、tailscale）
- `session.dmScope`（若未設定，本機上線將此預設為 `per-channel-peer`；既有的明確值將被保留）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 頻道允許清單（Slack、Discord、Matrix、Microsoft Teams），當您在提示期間選擇加入時（名稱會盡可能解析為 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 旗標接受 `npm`、`pnpm` 或 `bun`。
  - 手動設定仍然可以在稍後設定 `skills.install.nodeManager: "yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
工作階段儲存在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

<Note>部分通道以插件形式提供。當在安裝過程中選取時，精靈會提示在通道配置之前安裝插件（npm 或本機路徑）。</Note>

Gateway 精靈 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客戶端（macOS 應用程式和 Control UI）可以呈現步驟，而無需重新實作入門邏輯。

Signal 安裝行為：

- 下載適當的 release 資產
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 之下
- 在設定中寫入 `channels.signal.cliPath`
- JVM 版本需要 Java 21
- 優先使用原生版本（如果可用）
- Windows 使用 WSL2 並在 WSL 內遵循 Linux signal-cli 流程

## 相關文件

- 入門中心：[入門 (CLI)](/zh-Hant/start/wizard)
- 自動化與腳本：[CLI 自動化](/zh-Hant/start/wizard-cli-automation)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
