---
summary: "CLI 設定流程、驗證/模型設定、輸出與內部機制的完整參考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 設定參考"
sidebarTitle: "CLI 參考"
---

# CLI 設定參考

本頁面是 `openclaw onboard` 的完整參考。
如需簡短指南，請參閱 [Onboarding (CLI)](/en/start/wizard)。

## 精靈的功能

本地模式 (預設) 會引導您完成以下步驟：

- 模型與驗證設定 (OpenAI Code 訂閱 OAuth、Anthropic API 金鑰或設定權杖，以及 MiniMax、GLM、Ollama、Moonshot 和 AI Gateway 選項)
- 工作區位置與啟動檔案
- Gateway 設定 (連接埠、綁定、驗證、Tailscale)
- 管道與提供者 (Telegram、WhatsApp、Discord、Google Chat、Mattermost 外掛、Signal)
- 常駐程式安裝 (LaunchAgent 或 systemd 使用者單元)
- 健康檢查
- Skills 設定

遠端模式會將此機器設定為連線到其他地方的 Gateway。
它不會在遠端主機上安裝或修改任何內容。

## 本地流程詳情

<Steps>
  <Step title="偵測現有設定">
    - 如果 `~/.openclaw/openclaw.json` 已存在，請選擇保留、修改 或重設。
    - 重新執行精靈不會清除任何內容，除非您明確選擇重設 (或傳遞 `--reset`)。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full` 同時移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求您在繼續之前執行 `openclaw doctor`。
    - 重設會使用 `trash` 並提供範圍選項：
      - 僅設定
      - 設定 + 憑證 + 工作階段
      - 完整重設 (同時移除工作區)
  </Step>
  <Step title="Model and auth">
    - 完整選項矩陣位於 [Auth and model options](#auth-and-model-options)。
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace`（可配置）。
    - 播種首次執行啟動程式所需的 workspace 檔案。
    - Workspace 佈局：[Agent workspace](/en/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway">
    - 提示輸入 port、bind、auth 模式和 tailscale exposure。
    - 建議：即使是 loopback 也保持 token auth 開啟，以便本機 WS 客戶端必須通過驗證。
    - 在 token 模式下，互動式設定提供：
      - **產生/儲存明文 token** (預設)
      - **使用 SecretRef** (選用)
    - 在 password 模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在 onboarding 流程環境中設定非空的 env var。
      - 不能與 `--gateway-token` 結合使用。
    - 只有在您完全信任每個本機程序時才停用 auth。
    - 非 loopback bind 仍然需要 auth。
  </Step>
  <Step title="頻道">
    - [WhatsApp](/en/channels/whatsapp)：選用式 QR 登入
    - [Telegram](/en/channels/telegram)：bot token
    - [Discord](/en/channels/discord)：bot token
    - [Google Chat](/en/channels/googlechat)：服務帳戶 JSON + webhook 受眾
    - [Mattermost](/en/channels/mattermost) 外掛：bot token + 基礎 URL
    - [Signal](/en/channels/signal)：選用式 `signal-cli` 安裝 + 帳戶設定
    - [BlueBubbles](/en/channels/bluebubbles)：建議用於 iMessage；伺服器 URL + 密碼 + webhook
    - [iMessage](/en/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取權
    - DM 安全性：預設為配對。第一則 DM 會傳送代碼；透過
      `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若是 headless，請使用自訂 LaunchDaemon (未隨附)。
    - Linux 和 Windows (透過 WSL2)：systemd 使用者單元
      - 精靈會嘗試 `loginctl enable-linger <user>`，讓 gateway 在登出後保持運作。
      - 可能會提示輸入 sudo (寫入 `/var/lib/systemd/linger`)；它會先嘗試不使用 sudo。
    - 執行時期選擇：Node (建議；WhatsApp 和 Telegram 必須使用)。不建議使用 Bun。
  </Step>
  <Step title="健康檢查">
    - 啟動閘道（如需要）並執行 `openclaw health`。
    - `openclaw status --deep` 會將閘道健康探針加入狀態輸出中。
  </Step>
  <Step title="技能">
    - 讀取可用技能並檢查需求。
    - 讓您選擇 node manager：npm 或 pnpm（不建議使用 bun）。
    - 安裝選用相依套件（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要與後續步驟，包括 iOS、Android 和 macOS 應用程式選項。
  </Step>
</Steps>

<Note>如果未檢測到 GUI，精靈會印出控制 UI 的 SSH 連線埠轉發指示，而不是開啟瀏覽器。 如果控制 UI 的資產遺失，精靈會嘗試建置它們；備選方案是 `pnpm ui:build` (自動安裝 UI 相關依賴)。</Note>

## 遠端模式詳情

遠端模式會將此機器設定為連線到其他地方的閘道。

<Info>遠端模式不會在遠端主機上安裝或修改任何內容。</Info>

您所設定的項目：

- 遠端閘道 URL (`ws://...`)
- 若遠端閘道需要驗證，則填入 Token（建議）

<Note>- 如果閘道僅限回環，請使用 SSH 隧道或 tailnet。 - 探索提示： - macOS：Bonjour (`dns-sd`) - Linux：Avahi (`avahi-browse`)</Note>

## 驗證與模型選項

<AccordionGroup>
  <Accordion title="Anthropic API 金鑰">
    若存在則使用 `ANTHROPIC_API_KEY`，或提示輸入金鑰，然後將其儲存給 daemon 使用。
  </Accordion>
  <Accordion title="Anthropic Claude CLI">
    重複使用閘道主機上的本機 Claude CLI 登入，並將模型
    選取切換至 `claude-cli/...`。

    - macOS：檢查鑰匙圈項目 "Claude Code-credentials"
    - Linux 和 Windows：如果存在，則重複使用 `~/.claude/.credentials.json`

    在 macOS 上，選擇「一律允許」(Always Allow)，以免 launchd 啟動作業遭到封鎖。

  </Accordion>
  <Accordion title="Anthropic token (setup-token paste)">
    在任何機器上執行 `claude setup-token`，然後貼上權杖。
    您可以為其命名；留白則使用預設值。
  </Accordion>
  <Accordion title="OpenAI Code subscription (Codex CLI reuse)">
    如果存在 `~/.codex/auth.json`，精靈可以重複使用它。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (OAuth)">
    瀏覽器流程；貼上 `code#state`。

    當模型未設定或為 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 金鑰">
    如果存在則使用 `OPENAI_API_KEY` 或提示輸入金鑰，然後將憑證存儲在 auth profiles 中。

    當模型未設定、為 `openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.4`。

  </Accordion>
  <Accordion title="xAI (Grok) API 金鑰">
    提示輸入 `XAI_API_KEY` 並將 xAI 配置為模型提供商。
  </Accordion>
  <Accordion title="OpenCode">
    提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`) 並讓您選擇 Zen 或 Go 目錄。
    設定網址：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API key (generic)">
    為您儲存金鑰。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示輸入 `AI_GATEWAY_API_KEY`。
    更多詳情：[Vercel AI Gateway](/en/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示輸入帳戶 ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多詳情：[Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax">
    配置會自動寫入。託管的預設值是 `MiniMax-M2.7`；`MiniMax-M2.5` 仍然可用。
    更多詳情：[MiniMax](/en/providers/minimax)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示輸入 `SYNTHETIC_API_KEY`。
    更多詳情：[Synthetic](/en/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    提示輸入基礎 URL（預設為 `http://127.0.0.1:11434`），然後提供 Cloud + Local 或 Local 模式。
    探索可用的模型並建議預設值。
    更多詳情：[Ollama](/en/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot 和 Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置會自動寫入。
    更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)。
  </Accordion>
  <Accordion title="自訂提供者">
    適用於與 OpenAI 相容和與 Anthropic 相容的端點。

    互動式入站支援與其他提供者 API 金鑰流程相同的 API 金鑰儲存選項：
    - **立即貼上 API 金鑰**（純文字）
    - **使用秘密參照**（環境變數參照或已設定的提供者參照，含預檢驗證）

    非互動式旗標：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（選用；若未提供則回退至 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（選用）
    - `--custom-compatibility <openai|anthropic>`（選用；預設為 `openai`）

  </Accordion>
  <Accordion title="Skip">
    保持未設定驗證狀態。
  </Accordion>
</AccordionGroup>

模型行為：

- 從偵測到的選項中選擇預設模型，或手動輸入供應商和模型。
- 精靈會執行模型檢查，如果設定的模型未知或缺少驗證，則會發出警告。

憑證與設定檔路徑：

- OAuth 憑證：`~/.openclaw/credentials/oauth.json`
- 驗證設定檔（API 金鑰 + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

憑證儲存模式：

- 預設入站行為會將 API 金鑰以純文字值形式儲存在驗證設定檔中。
- `--secret-input-mode ref` 啟用參考模式，而非明文金鑰儲存。
  在互動式設定中，您可以選擇：
  - 環境變數參考（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供者參考（`file` 或 `exec`），需搭配提供者別名 + ID
- 互動式參照模式會在儲存前執行快速飛行前驗證。
  - 環境變數參照：驗證目前入駐環境中的變數名稱和非空值。
  - 提供者參照：驗證提供者設定並解析請求的 ID。
  - 如果飛行前檢查失敗，入駐程序會顯示錯誤並讓您重試。
- 在非互動式模式下，`--secret-input-mode ref` 僅支援環境變數後端。
  - 請在入駐程序環境中設定提供者環境變數。
  - 內聯金鑰旗標（例如 `--openai-api-key`）要求必須設定該環境變數；否則上架流程會快速失敗。
  - 對於自訂提供者，非互動式 `ref` 模式會將 `models.providers.<id>.apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在該自訂提供者情況下，`--custom-api-key` 要求必須設定 `CUSTOM_API_KEY`；否則上架流程會快速失敗。
- 在互動式設置中，閘道驗證憑證支援明文和 SecretRef 選擇：
  - Token 模式：**產生/儲存明文 Token**（預設）或 **使用 SecretRef**。
  - 密碼模式：明文或 SecretRef。
- 非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
- 現有的明文設置會繼續正常運作，不受影響。

<Note>無介面與伺服器提示：在有瀏覽器的機器上完成 OAuth，然後將 `~/.openclaw/credentials/oauth.json` （或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`） 複製到閘道主機。</Note>

## 輸出與內部機制

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` （若選擇 Minimax）
- `tools.profile` （若未設定，本機上架預設為 `"coding"` ；既有的明確值會被保留）
- `gateway.*` （mode, bind, auth, tailscale）
- `session.dmScope` （若未設定，本機上架會將此預設為 `per-channel-peer` ；既有的明確值會被保留）
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- 當您在提示期間選擇加入時的頻道允許清單（Slack、Discord、Matrix、Microsoft Teams）（名稱會盡可能解析為 ID）
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 寫入 `agents.list[]` 和可選的 `bindings`。

WhatsApp 憑證儲存在 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
工作階段儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。

<Note>部分通道是以插件形式提供的。當在設定期間選取這些通道時，精靈會提示您在設定通道之前安裝插件（npm 或本機路徑）。</Note>

Gateway 精靈 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

用戶端（macOS app 和 Control UI）可以呈現步驟而無需重新實作上線邏輯。

Signal 設定行為：

- 下載適當的發行資產
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下
- 在設定中寫入 `channels.signal.cliPath`
- JVM 版本需要 Java 21
- 可用時會使用 Native 版本
- Windows 使用 WSL2 並在 WSL 內遵循 Linux signal-cli 流程

## 相關文件

- 入門中心：[入門 (CLI)](/en/start/wizard)
- 自動化與腳本：[CLI 自動化](/en/start/wizard-cli-automation)
- 指令參考：[`openclaw onboard`](/en/cli/onboard)
