---
summary: "CLI 設定流程、驗證/模型設定、輸出與內部機制的完整參考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 安裝參考"
sidebarTitle: "CLI 參考"
---

本頁是 `openclaw onboard` 的完整參考。
如需簡易指南，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

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
    - 如果組態無效或包含舊版金鑰，精靈會停止並要求您在繼續之前執行 `openclaw doctor`。
    - 重設使用 `trash` 並提供範圍選項：
      - 僅組態
      - 組態 + 憑證 + 會話
      - 完整重設（也會移除工作區）

  </Step>
  <Step title="模型與驗證">
    - 完整選項矩陣位於 [Auth and model options](#auth-and-model-options)。

  </Step>
  <Step title="工作區">
    - 預設為 `~/.openclaw/workspace` (可配置)。
    - 播種首次執行引導儀式所需的工作區檔案。
    - 工作區佈局：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Step>
  <Step title="Gateway">
    - 提示輸入連接埠、綁定、驗證模式和 Tailscale 暴露設定。
    - 建議：即使對於 loopback，也請保持 token 驗證已啟用，以便本地 WS 用戶端必須進行驗證。
    - 在 token 模式下，互動式設定提供：
      - **產生/儲存明文 token**（預設）
      - **使用 SecretRef**（選用）
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要 onboarding 程序環境中的非空環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時才停用驗證。
    - 非 loopback 綁定仍需要驗證。

  </Step>
  <Step title="頻道">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用 QR 登入
    - [Telegram](/zh-Hant/channels/telegram)：bot token
    - [Discord](/zh-Hant/channels/discord)：bot token
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳號 JSON + webhook 受眾
    - [Mattermost](/zh-Hant/channels/mattermost)：bot token + base URL
    - [Signal](/zh-Hant/channels/signal)：選用 `signal-cli` 安裝 + 帳號配置
    - [iMessage](/zh-Hant/channels/imessage)：`imsg` CLI 路徑 + Messages DB 存取權；當 Gateway 在 Mac 以外執行時，請使用 SSH 包裝器
    - DM 安全性：預設為配對。第一則 DM 會發送代碼；透過
      `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="Daemon 安裝">
    - macOS：LaunchAgent
      - 需要已登入的使用者工作階段；若是無介面模式，請使用自訂的 LaunchDaemon（未附帶）。
    - Linux 與透過 WSL2 的 Windows：systemd 使用者單元
      - 精靈會嘗試 `loginctl enable-linger <user>`，讓 gateway 在登出後保持運作。
      - 可能會提示輸入 sudo（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - 原生 Windows：優先使用排程工作
      - 如果無法建立工作，OpenClaw 會退回至個別使用者的啟動資料夾登入項目，並立即啟動 gateway。
      - 排程工作仍是首選，因為它們提供更好的監督器狀態。
    - 執行時選擇：Node（推薦；WhatsApp 和 Telegram 必要）。不推薦使用 Bun。

  </Step>
  <Step title="健康檢查">
    - 啟動 gateway（如需要）並執行 `openclaw health`。
    - `openclaw status --deep` 會將即時 gateway 健康探測加入到狀態輸出，當支援時也包含頻道探測。

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

<Note>如果未偵測到 GUI，精靈會印出 SSH 連線埠轉發指示給控制 UI，而不是開啟瀏覽器。 如果控制 UI 資產遺失，精靈會嘗試建置它們；備選方案是 `pnpm ui:build`（自動安裝 UI 相依項）。</Note>

## 遠端模式詳細資訊

遠端模式會將此機器設定為連線到其他地方的閘道。

<Info>遠端模式不會在遠端主機上安裝或修改任何項目。</Info>

您的設定：

- 遠端 gateway URL (`ws://...`)
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
    如果存在則使用 `ANTHROPIC_API_KEY`，否則提示輸入金鑰，然後將其儲存供 daemon 使用。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (OAuth)">
    瀏覽器流程；貼上 `code#state`。

    當模型未設定或已經是 OpenAI 系列時，透過 Codex 執行時將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (裝置配對)">
    具有短期裝置代碼的瀏覽器配對流程。

    當模型未設定或已經是 OpenAI 系列時，透過 Codex 執行時將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI API 金鑰">
    如果存在 `OPENAI_API_KEY` 則使用它，否則提示輸入金鑰，然後將憑證儲存在 auth profiles 中。

    當模型未設定、`openai/*` 或舊版 Codex 模型參照時，將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="xAI (Grok) OAuth">
    符合資格的 SuperGrok 或 X Premium 帳號的瀏覽器登入。這是
    大多數使用者推薦的 xAI 路徑。OpenClaw 會儲存產生的 auth
    profile 以供 Grok 模型、Grok `web_search`、`x_search` 和 `code_execution` 使用。
  </Accordion>
  <Accordion title="xAI (Grok) 裝置代碼">
    適合遠端的瀏覽器登入，使用短代碼代替 localhost
    回呼。從 SSH、Docker 或 VPS 主機使用此功能。
  </Accordion>
  <Accordion title="xAI (Grok) API 金鑰">
    提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型供應商。當您想要使用 xAI Console API 金鑰而非訂閱 OAuth 時使用此選項。
  </Accordion>
  <Accordion title="OpenCode">
    提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`) 並讓您選擇 Zen 或 Go 目錄。
    設定網址：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API key (generic)">
    幫您儲存金鑰。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示輸入 `AI_GATEWAY_API_KEY`。
    更多詳情：[Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示輸入帳戶 ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多詳情：[Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax">
    設定會自動寫入。託管預設值為 `MiniMax-M2.7`；API 金鑰設定使用
    `minimax/...`，而 OAuth 設定使用 `minimax-portal/...`。
    更多詳情：[MiniMax](/zh-Hant/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    針對中國或全球端點上的 StepFun 標準版或 Step Plan，設定會自動寫入。
    標準版目前包含 `step-3.5-flash`，而 Step Plan 也包含 `step-3.5-flash-2603`。
    更多詳情：[StepFun](/zh-Hant/providers/stepfun)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示輸入 `SYNTHETIC_API_KEY`。
    更多詳情：[Synthetic](/zh-Hant/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    首先提示輸入 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 會搭配 `OLLAMA_API_KEY` 使用 `https://ollama.com`。
    主機託管模式會提示輸入基礎 URL (預設 `http://127.0.0.1:11434`)、探索可用模型，並建議預設值。
    `Cloud + Local` 也會檢查該 Ollama 主機是否已登入以存取雲端。
    更多詳情：[Ollama](/zh-Hant/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 設定會自動寫入。
    更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom provider">
    適用於 OpenAI 相容和 Anthropic 相容的端點。

    互動式入門支援與其他供應商 API 金鑰流程相同的 API 金鑰儲存選項：
    - **立即貼上 API 金鑰** (純文字)
    - **使用秘密參照** (環境變數參照或已設定的供應商參照，並包含預檢驗證)

    非互動式旗標：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (選用；若未提供則回退至 `CUSTOM_API_KEY`)
    - `--custom-provider-id` (選用)
    - `--custom-compatibility <openai|anthropic>` (選用；預設為 `openai`)
    - `--custom-image-input` / `--custom-text-input` (選用；覆寫推斷的模型輸入能力)

  </Accordion>
  <Accordion title="Skip">
    保持未設定驗證狀態。
  </Accordion>
</AccordionGroup>

模型行為：

- 從偵測到的選項中挑選預設模型，或手動輸入提供者和模型。
- 自訂提供者上架會推斷常見模型 ID 的圖片支援，並僅在模型名稱未知時進行詢問。
- 當從供應商驗證選項開始入門時，模型選擇器會自動偏好該供應商。對於 Volcengine 和 BytePlus，相同的偏好設定也會符合其 coding-plan 變體 (`volcengine-plan/*`, `byteplus-plan/*`)。
- 如果該優先提供商的過濾結果為空，選擇器會改為回退到完整目錄，而不顯示無模型。
- 精靈會執行模型檢查，如果設定的模型未知或缺少身份驗證，則會發出警告。

憑證與設定檔路徑：

- 驗證設定檔 (API 金鑰 + OAuth)：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版 OAuth 匯入：`~/.openclaw/credentials/oauth.json`

憑證儲存模式：

- 預設的上線行為會將 API 金鑰以純文字值的形式保存在身份驗證設定檔中。
- `--secret-input-mode ref` 啟用參考模式而不是明文金鑰儲存。
  在互動式設定中，您可以選擇其中之一：
  - 環境變數參考（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已設定的提供者參考（`file` 或 `exec`），並附帶提供者別名 + id
- 互動式參考模式會在儲存前執行快速預檢驗證。
  - 環境變數參考：會驗證變數名稱 + 目前上線環境中的非空值。
  - 提供商參考：會驗證提供商設定並解析要求的 ID。
  - 如果預檢失敗，上線程序會顯示錯誤並讓您重試。
- 在非互動模式下，`--secret-input-mode ref` 僅支援環境變數。
  - 在上線程序環境中設定提供商環境變數。
  - 內聯金鑰旗標（例如 `--openai-api-key`）要求必須設定該環境變數；否則入駐流程會快速失敗。
  - 對於自訂提供者，非互動式 `ref` 模式會將 `models.providers.<id>.apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在該自訂提供者的情況下，`--custom-api-key` 要求必須設定 `CUSTOM_API_KEY`；否則入駐流程會快速失敗。
- 閘道身份驗證憑證在互動式設定中支援純文字和 SecretRef 選項：
  - 權杖模式：**產生/儲存純文字權杖**（預設）或 **使用 SecretRef**。
  - 密碼模式：純文字或 SecretRef。
- 非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
- 現有的明文設定繼續保持不變並正常運作。

<Note>
Headless 和伺服器提示：在具有瀏覽器的機器上完成 OAuth，然後將
該 agent 的 `auth-profiles.json`（例如
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或對應的
`$OPENCLAW_STATE_DIR/...` 路徑）複製到 gateway 主機。`credentials/oauth.json`
僅是舊版匯入來源。
</Note>

## 輸出與內部機制

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- 當傳遞 `--skip-bootstrap` 時的 `agents.defaults.skipBootstrap`
- `agents.defaults.model` / `models.providers`（如果選擇 Minimax）
- `tools.profile`（若未設定，本機入駐預設為 `"coding"`；現有的明確值會被保留）
- `gateway.*`（模式、綁定、驗證、tailscale）
- `session.dmScope`（若未設定，本機入駐會將此預設為 `per-channel-peer`；現有的明確值會被保留）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 當您在提示期間選擇加入時的頻道允許清單（Slack、Discord、Matrix、Microsoft Teams）（名稱會盡可能解析為 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 標誌接受 `npm`、`pnpm` 或 `bun`。
  - 手動設定稍後仍可設定 `skills.install.nodeManager: "yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下方。
階段會儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下方。

<Note>部分頻道以插件形式提供。在設定期間選取時，精靈會提示在頻道設定之前安裝插件（npm 或本地路徑）。</Note>

Gateway 精靈 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客戶端（macOS 應用程式和控制 UI）可以呈現步驟，而無需重新實現入邏輯。

信號設置行為：

- 下載適當的版本資產
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下方
- 在設定中寫入 `channels.signal.cliPath`
- JVM 構建需要 Java 21
- 如果可用，則使用原生構建
- Windows 使用 WSL2，並在 WSL 內遵循 Linux signal-cli 流程

## 相關文件

- 入門中心：[Onboarding (CLI)](/zh-Hant/start/wizard)
- 自動化與腳本：[CLI Automation](/zh-Hant/start/wizard-cli-automation)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
