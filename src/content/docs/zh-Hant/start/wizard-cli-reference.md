---
summary: "CLI 設定流程、驗證/模型設定、輸出與內部的完整參考資料"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 設定參考"
sidebarTitle: "CLI 參考"
---

# CLI 設定參考

本頁面是 `openclaw onboard` 的完整參考資料。
簡短指南請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

## 精靈的功能

本地模式（預設）會引導您完成：

- 模型與驗證設定（OpenAI Code 訂閱 OAuth、Anthropic API 金鑰或設定 token，以及 MiniMax、GLM、Ollama、Moonshot 和 AI Gateway 選項）
- 工作區位置與引導檔案
- Gateway 設定（port、bind、auth、tailscale）
- 頻道與提供者（Telegram、WhatsApp、Discord、Google Chat、Mattermost plugin、Signal）
- Daemon 安裝（LaunchAgent 或 systemd user unit）
- 健康檢查
- Skills 設定

遠端模式會將此機器設定為連接到其他位置的 Gateway。
它不會在遠端主機上安裝或修改任何內容。

## 本地流程詳細資訊

<Steps>
  <Step title="偵測現有設定">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇保留、修改或重設。
    - 重新執行精靈不會清除任何內容，除非您明確選擇重設（或傳遞 `--reset`）。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full` 同時移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求您在繼續之前執行 `openclaw doctor`。
    - 重設會使用 `trash` 並提供範圍選項：
      - 僅設定
      - 設定 + 憑證 + 會話
      - 完整重設（也會移除工作區）
  </Step>
  <Step title="模型與驗證">
    - 完整的選項矩陣位於 [Auth and model options](#auth-and-model-options)。
  </Step>
  <Step title="工作區">
    - 預設為 `~/.openclaw/workspace`（可設定）。
    - 炮製首次執行引導程序所需的工作區檔案。
    - 工作區佈局：[Agent workspace](/zh-Hant/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway">
    - 提示輸入 port、bind、auth mode 以及 tailscale exposure。
    - 建議：即使是 loopback，也啟用 token auth，以便本機 WS 用戶端必須通過驗證。
    - 在 token mode 下，互動式設定提供：
      - **Generate/store plaintext token** (預設)
      - **Use SecretRef** (選用)
    - 在 password mode 下，互動式設定也支援純文字或 SecretRef 儲存。
    - 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在 onboarding 過程環境中設定非空的環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時才停用 auth。
    - 非 loopback bind 仍然需要 auth。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用 QR 登入
    - [Telegram](/zh-Hant/channels/telegram)：bot token
    - [Discord](/zh-Hant/channels/discord)：bot token
    - [Google Chat](/zh-Hant/channels/googlechat)：service account JSON + webhook audience
    - [Mattermost](/zh-Hant/channels/mattermost) plugin：bot token + base URL
    - [Signal](/zh-Hant/channels/signal)：選用 `signal-cli` 安裝 + 帳號設定
    - [BlueBubbles](/zh-Hant/channels/bluebubbles)：建議用於 iMessage；server URL + 密碼 + webhook
    - [iMessage](/zh-Hant/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取
    - DM 安全性：預設為 pairing。第一則 DM 會發送代碼；透過
      `openclaw pairing approve <channel> <code>` 核准或使用 allowlists。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若是無頭模式，請使用自訂的 LaunchDaemon (未隨附)。
    - Linux 和 Windows 透過 WSL2：systemd 使用者單元
      - 精靈會嘗試 `loginctl enable-linger <user>`，讓登出後 gateway 仍保持運作。
      - 可能會提示輸入 sudo (寫入 `/var/lib/systemd/linger`)；會先嘗試不使用 sudo。
    - 執行環境選擇：Node (建議；WhatsApp 和 Telegram 必需)。不建議使用 Bun。
  </Step>
  <Step title="健康檢查">
    - 啟動 gateway（如果需要）並執行 `openclaw health`。
    - `openclaw status --deep` 會將 gateway 健康探測新增至狀態輸出。
  </Step>
  <Step title="技能">
    - 讀取可用技能並檢查需求。
    - 讓您選擇 node manager：npm 或 pnpm（不建議使用 bun）。
    - 安裝選用依賴項（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要與後續步驟，包括 iOS、Android 和 macOS 應用程式選項。
  </Step>
</Steps>

<Note>如果未偵測到 GUI，精靈會列印控制 UI 的 SSH 連接埠轉發指令，而不是開啟瀏覽器。如果控制 UI 資產遺失，精靈會嘗試建置它們；備用方案是 `pnpm ui:build`（自動安裝 UI 依賴項）。</Note>

## 遠端模式詳細資訊

遠端模式會設定此機器以連線到其他位置的 gateway。

<Info>遠端模式不會在遠端主機上安裝或修改任何內容。</Info>

您設定的項目：

- 遠端 gateway URL (`ws://...`)
- Token（如果遠端 gateway 需要驗證）（建議）

<Note>- 如果 gateway 僅限回環，請使用 SSH 通道或 tailnet。 - 探索提示： - macOS：Bonjour (`dns-sd`) - Linux：Avahi (`avahi-browse`)</Note>

## 驗證與模型選項

<AccordionGroup>
  <Accordion title="Anthropic API 金鑰">
    如果存在則使用 `ANTHROPIC_API_KEY`，或提示輸入金鑰，然後將其儲存供 daemon 使用。
  </Accordion>
  <Accordion title="Anthropic OAuth (Claude Code CLI)">
    - macOS：檢查鑰匙圈項目 "Claude Code-credentials"
    - Linux 和 Windows：如果存在則重複使用 `~/.claude/.credentials.json`

    在 macOS 上，選擇「Always Allow」以免 launchd 啟動被封鎖。

  </Accordion>
  <Accordion title="Anthropic token (setup-token 貼上)">
    在任何機器上執行 `claude setup-token`，然後貼上 token。
    您可以將其命名；空白則使用預設值。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (Codex CLI 重用)">
    如果 `~/.codex/auth.json` 存在，精靈可以重用它。
  </Accordion>
  <Accordion title="OpenAI Code 訂閱 (OAuth)">
    瀏覽器流程；貼上 `code#state`。

    當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 金鑰">
    如果存在則使用 `OPENAI_API_KEY` 或提示輸入金鑰，然後將憑證儲存在 auth profiles 中。

    當模型未設定、`openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.1-codex`。

  </Accordion>
  <Accordion title="xAI (Grok) API 金鑰">
    提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
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
  <Accordion title="MiniMax">
    配置會自動寫入。託管預設值為 `MiniMax-M2.7`；`MiniMax-M2.5` 仍然可用。
    更多詳情：[MiniMax](/zh-Hant/providers/minimax)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示輸入 `SYNTHETIC_API_KEY`。
    更多詳情：[Synthetic](/zh-Hant/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    提示輸入基礎 URL（預設為 `http://127.0.0.1:11434`），然後提供 Cloud + Local 或 Local 模式選項。
    探測可用模型並建議預設值。
    更多詳情：[Ollama](/zh-Hant/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置會自動寫入。
    更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom provider">
    適用於 OpenAI 相容和 Anthropic 相容的端點。

    互動式入職支援與其他提供者 API 金鑰流程相同的 API 金鑰儲存選項：
    - **立即貼上 API 金鑰**（明文）
    - **使用秘密參照**（env ref 或配置的提供者 ref，並帶有預檢驗證）

    非互動式標誌：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可選；若未提供則回退至 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可選）
    - `--custom-compatibility <openai|anthropic>`（可選；預設為 `openai`）

  </Accordion>
  <Accordion title="Skip">
    保持未配置驗證狀態。
  </Accordion>
</AccordionGroup>

模型行為：

- 從偵測到的選項中挑選預設模型，或手動輸入提供者和模型。
- 精靈會執行模型檢查，如果配置的模型未知或缺少驗證，則會發出警告。

憑證與設定檔路徑：

- OAuth 憑證：`~/.openclaw/credentials/oauth.json`
- 驗證設定檔（API 金鑰 + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

憑證儲存模式：

- 預設的入職行為會將 API 金鑰以明文形式儲存在驗證設定檔中。
- `--secret-input-mode ref` 啟用參考模式而不是純文字金鑰儲存。
  在互動式設定中，您可以選擇下列任一項：
  - 環境變數參考（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供商參考（`file` 或 `exec`），搭配提供商別名 + ID
- 互動式參考模式會在儲存前執行快速的預先驗證。
  - 環境變數參考：驗證變數名稱 + 當前上架環境中的非空值。
  - 提供商參考：驗證提供商設定並解析請求的 ID。
  - 如果預先驗證失敗，上架流程會顯示錯誤並允許您重試。
- 在非互動模式下，`--secret-input-mode ref` 僅支援環境變數支援。
  - 在上架流程環境中設定提供商環境變數。
  - 內聯金鑰標誌（例如 `--openai-api-key`）要求必須設定該環境變數；否則上架會快速失敗。
  - 對於自訂提供商，非互動式 `ref` 模式會將 `models.providers.<id>.apiKey` 儲存為 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在該自訂提供商的情況下，`--custom-api-key` 要求必須設定 `CUSTOM_API_KEY`；否則上架會快速失敗。
- 閘道驗證憑證在互動式設定中支援純文字和 SecretRef 選項：
  - 權杖模式：**產生/儲存純文字權杖**（預設）或 **使用 SecretRef**。
  - 密碼模式：純文字或 SecretRef。
- 非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
- 現有的純文字設定繼續維持不變運作。

<Note>Headless 和伺服器提示：在具有瀏覽器的機器上完成 OAuth，然後將 `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）複製到 閘道主機。</Note>

## 輸出與內部機制

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果選擇 Minimax）
- `tools.profile`（若未設定，本地上架預設為 `"coding"`；會保留現有的明確值）
- `gateway.*`（mode, bind, auth, tailscale）
- `session.dmScope`（本地上線在未設定時預設為 `per-channel-peer`；現有的明確值會予以保留）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 當您在提示期間選擇加入時，頻道允許清單（Slack、Discord、Matrix、Microsoft Teams）（名稱會盡可能解析為 ID）
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下方。
階段作業儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下方。

<Note>部分通道是以外掛程式形式提供。在設定期間選取時，精靈會提示在通道設定前 安裝外掛程式（npm 或本機路徑）。</Note>

Gateway 精靈 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客戶端（macOS 應用程式和 Control UI）可以呈現步驟，而無需重新實作上線邏輯。

Signal 設定行為：

- 下載適當的發行資產
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下方
- 在設定中寫入 `channels.signal.cliPath`
- JVM 建置需要 Java 21
- 原生建置會在可用時使用
- Windows 使用 WSL2 並在 WSL 內遵循 Linux signal-cli 流程

## 相關文件

- 上線中心：[Onboarding (CLI)](/zh-Hant/start/wizard)
- 自動化與腳本：[CLI Automation](/zh-Hant/start/wizard-cli-automation)
- 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
