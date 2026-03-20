---
summary: "CLI 設定流程、身份驗證/模型設定、輸出與內部機制的完整參考"
read_when:
  - 您需要 openclaw board 的詳細行為說明
  - 您正在偵錯 board 結果或整合 board 客戶端
title: "CLI 設定參考"
sidebarTitle: "CLI 參考"
---

# CLI 設定參考

本頁是 `openclaw onboard` 的完整參考。
如需簡短指南，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

## 精靈的運作方式

本地模式 (預設) 會引導您完成以下步驟：

- 模型與驗證設定 (OpenAI Code 訂閱 OAuth、Anthropic API 金鑰或設定權杖，以及 MiniMax、GLM、Ollama、Moonshot 和 AI Gateway 選項)
- 工作區位置與啟動檔案
- Gateway 設定 (連接埠、綁定、驗證、Tailscale)
- 通道與提供者 (Telegram、WhatsApp、Discord、Google Chat、Mattermost 外掛程式、Signal)
- 常駐程式安裝 (LaunchAgent 或 systemd 使用者單元)
- 健康檢查
- 技能設定

遠端模式會將此機器設定為連線到其他位置的閘道。
它不會在遠端主機上安裝或修改任何東西。

## 本地流程詳情

<Steps>
  <Step title="現有設定偵測">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇保留、修改或重設。
    - 重新執行精靈不會清除任何內容，除非您明確選擇重設（或傳遞 `--reset`）。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full` 同時移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求您在繼續之前執行 `openclaw doctor`。
    - 重設會使用 `trash` 並提供範圍選項：
      - 僅設定
      - 設定 + 憑證 + 工作階段
      - 完整重設（同時移除工作區）
  </Step>
  <Step title="模型與身份驗證">
    - 完整選項矩陣請參閱 [Auth and model options](#auth-and-model-options)。
  </Step>
  <Step title="工作區">
    - 預設 `~/.openclaw/workspace`（可設定）。
    - 提供首次執行啟動程序所需的工作區檔案。
    - 工作區配置：[Agent workspace](/zh-Hant/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway">
    - 提示輸入 port、bind、驗證模式及 Tailscale 暴露設定。
    - 建議：即使對於 loopback 也保持啟用 token 驗證，以便本機 WS 客戶端必須通過驗證。
    - 在 token 模式下，互動式安裝程式提供：
      - **產生/儲存純文字 token**（預設）
      - **使用 SecretRef**（選用）
    - 在密碼模式下，互動式安裝程式也支援純文字或 SecretRef 儲存。
    - 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要 onboarding 流程環境中有一個非空白的環境變數。
      - 無法與 `--gateway-token` 搭配使用。
    - 僅在您完全信任每個本機程序時才停用驗證。
    - 非 loopback bind 仍需驗證。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用 QR 登入
    - [Telegram](/zh-Hant/channels/telegram)：bot token
    - [Discord](/zh-Hant/channels/discord)：bot token
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳戶 JSON + webhook 受眾
    - [Mattermost](/zh-Hant/channels/mattermost) 外掛：bot token + 基礎 URL
    - [Signal](/zh-Hant/channels/signal)：選用 `signal-cli` 安裝 + 帳戶設定
    - [BlueBubbles](/zh-Hant/channels/bluebubbles)：建議用於 iMessage；伺服器 URL + 密碼 + webhook
    - [iMessage](/zh-Hant/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取權
    - DM 安全性：預設為配對。第一則 DM 會發送代碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若為 headless，請使用自訂的 LaunchDaemon（未隨附）。
    - Linux 和 Windows 透過 WSL2：systemd 使用者單元
      - 安裝精靈會嘗試 `loginctl enable-linger <user>`，使閘道在登出後保持運作。
      - 可能會提示輸入 sudo（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - 執行時選擇：Node（建議；WhatsApp 和 Telegram 必要）。不建議使用 Bun。
  </Step>
  <Step title="健康檢查">
    - 啟動閘道（如需要）並執行 `openclaw health`。
    - `openclaw status --deep` 會將閘道健康探測加入狀態輸出。
  </Step>
  <Step title="技能">
    - 讀取可用技能並檢查需求。
    - 讓您選擇 Node 管理器：npm 或 pnpm（不建議使用 bun）。
    - 安裝選用依賴（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要與後續步驟，包括 iOS、Android 和 macOS 應用程式選項。
  </Step>
</Steps>

<Note>
若未偵測到 GUI，精靈會列印控制 UI 的 SSH 連接埠轉送指示，而非開啟瀏覽器。
若控制 UI 資產遺失，精靈會嘗試建置；備援方案是 `pnpm ui:build`（自動安裝 UI 依賴）。
</Note>

## 遠端模式詳細資訊

遠端模式會設定此機器以連線到其他地方的 gateway。

<Info>
遠端模式不會在遠端主機上安裝或修改任何項目。
</Info>

您設定的項目：

- 遠端閘道 URL (`ws://...`)
- 若遠端 gateway 需要驗證時的 Token（建議使用）

<Note>
- 若閘道僅限 loopback，請使用 SSH 通道或 tailnet。
- 探索提示：
  - macOS：Bonjour (`dns-sd`)
  - Linux：Avahi (`avahi-browse`)
</Note>

## 驗證與模型選項

<AccordionGroup>
  <Accordion title="Anthropic API 金鑰">
    若存在 `ANTHROPIC_API_KEY` 則使用，或提示輸入金鑰，然後將其儲存以供 daemon 使用。
  </Accordion>
  <Accordion title="Anthropic OAuth (Claude Code CLI)">
    - macOS：檢查鑰匙圈項目 "Claude Code-credentials"
    - Linux 和 Windows：若存在則重複使用 `~/.claude/.credentials.json`

    在 macOS 上，請選擇「永遠允許」，以免 launchd 啟動被封鎖。

  </Accordion>
  <Accordion title="Anthropic 權杖 (setup-token 貼上)">
    在任何機器上執行 `claude setup-token`，然後貼上權杖。
    您可以為其命名；留白則使用預設值。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (Codex CLI 重複使用)">
    若 `~/.codex/auth.json` 存在，精靈可以重複使用它。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (OAuth)">
    瀏覽器流程；貼上 `code#state`。

    當模型未設定或為 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 金鑰">
    如果存在則使用 `OPENAI_API_KEY`，否則提示輸入金鑰，然後將憑證儲存在設定檔中。

    當模型未設定、為 `openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.1-codex`。

  </Accordion>
  <Accordion title="xAI (Grok) API 金鑰">
    提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型供應商。
  </Accordion>
  <Accordion title="OpenCode">
    提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`) 並讓您選擇 Zen 或 Go 目錄。
    設定網址：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API 金鑰 (通用)">
    為您儲存金鑰。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示輸入 `AI_GATEWAY_API_KEY`。
    更多詳情：[Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示輸入帳戶 ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多詳情：[Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax M2.5">
    設定會自動寫入。
    更多詳情：[MiniMax](/zh-Hant/providers/minimax)。
  </Accordion>
  <Accordion title="Synthetic (相容 Anthropic)">
    提示輸入 `SYNTHETIC_API_KEY`。
    更多詳情：[Synthetic](/zh-Hant/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    提示輸入基礎 URL (預設為 `http://127.0.0.1:11434`)，然後提供 Cloud + Local 或 Local 模式。
    探測可用模型並建議預設值。
    更多詳情：[Ollama](/zh-Hant/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置會自動寫入。
    更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom provider">
    適用於相容 OpenAI 和 Anthropic 的端點。

    互動式入職支援與其他供應商 API 金鑰流程相同的 API 金鑰儲存選項：
    - **現在貼上 API 金鑰** (純文字)
    - **使用密鑰參照** (env ref 或設定的供應商 ref，含預檢驗證)

    非互動式旗標：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (選用；會回退至 `CUSTOM_API_KEY`)
    - `--custom-provider-id` (選用)
    - `--custom-compatibility <openai|anthropic>` (選用；預設為 `openai`)

  </Accordion>
  <Accordion title="Skip">
    保持未設定狀態。
  </Accordion>
</AccordionGroup>

模型行為：

- 從偵測到的選項中選擇預設模型，或手動輸入供應商和模型。
- 精靈會執行模型檢查，如果設定的模型未知或缺少認證則會發出警告。

憑證與設定檔路徑：

- OAuth 認證資訊：`~/.openclaw/credentials/oauth.json`
- 認證設定檔（API 金鑰 + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

憑證儲存模式：

- 預設的入職行為會將 API 金鑰以純文字形式儲存在認證設定檔中。
- `--secret-input-mode ref` 啟用參考模式，而非明文金鑰儲存。
  在互動式設定中，您可以選擇：
  - 環境變數參考（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已設定的供應商參考（`file` 或 `exec`），並包含供應商別名與 ID
- 互動式參照模式會在儲存前執行快速的飛前驗證。
  - 環境變數參照：驗證變數名稱以及在當前上線環境中的非空值。
  - 提供者參照：驗證提供者配置並解析請求的 id。
  - 如果飛前檢查失敗，上線程序會顯示錯誤並讓您重試。
- 在非互動模式下，`--secret-input-mode ref` 僅支援環境變數。
  - 在程序環境中設定提供者環境變數。
  - 內聯金鑰旗標（例如 `--openai-api-key`）要求必須設定該環境變數；否則入駐流程會快速失敗。
  - 對於自訂供應商，非互動式 `ref` 模式會將 `models.providers.<id>.apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在該自訂供應商的情況下，`--custom-api-key` 要求設定 `CUSTOM_API_KEY`；否則上架作業會快速失敗。
- 閘道驗證憑證在互動式設定中支援純文字和 SecretRef 選擇：
  - 令牌模式：**產生/儲存純文字令牌**（預設）或 **使用 SecretRef**。
  - 密碼模式：純文字或 SecretRef。
- 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
- 現有的純文字設定會繼續不變地運作。

<Note>
Headless 和伺服器提示：在具有瀏覽器的機器上完成 OAuth，然後將
`~/.openclaw/credentials/oauth.json` (或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`)
複製到閘道主機。
</Note>

## 輸出與內部機制

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (如果選擇了 Minimax)
- `tools.profile` (本地上架若未設定則預設為 `"coding"`；既有的明確值會予以保留)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (本地上架若未設定會將此預設為 `per-channel-peer`；既有的明確值會予以保留)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- 頻道允許名單（Slack、Discord、Matrix、Microsoft Teams），當您在提示期間選擇加入時（名稱盡可能解析為 ID）
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
Sessions 則儲存在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

<Note>
部分通道是以外掛形式提供。在設定期間選取時，精靈會在通道設定之前提示安裝外掛 (npm 或本機路徑)。
</Note>

閘道精靈 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客戶端（macOS 應用程式和控制 UI）可以呈現步驟而無需重新實作入職邏輯。

Signal 設定行為：

- 下載適當的發行資源
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 之下
- 在設定中寫入 `channels.signal.cliPath`
- JVM 建置需要 Java 21
- 盡可能使用原生建置
- Windows 使用 WSL2 並在 WSL 內遵循 Linux signal-cli 流程

## 相關文件

- 上架中心：[Onboarding (CLI)](/zh-Hant/start/wizard)
- 自動化和腳本：[CLI 自動化](/zh-Hant/start/wizard-cli-automation)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)

import en from "/components/footer/en.mdx";

<en />
