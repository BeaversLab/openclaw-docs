---
summary: "CLI 入門的完整參考：每個步驟、標誌和設定欄位"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "入門參考"
sidebarTitle: "入門參考"
---

# 入門參考

這是 `openclaw onboard` 的完整參考。
如需高層次的概覽，請參閱 [入門 (CLI)](/zh-Hant/start/wizard)。

## 流程詳情 (本機模式)

<Steps>
  <Step title="偵測現有設定">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇 **保留 / 修改 / 重設**。
    - 重新執行入門**不會**清除任何內容，除非您明確選擇 **重設**
      (或傳遞 `--reset`)。
    - CLI `--reset` 預設為 `config+creds+sessions`；使用 `--reset-scope full`
      同時移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求
      您在繼續之前執行 `openclaw doctor`。
    - 重設使用 `trash` (絕不使用 `rm`) 並提供範圍：
      - 僅設定
      - 設定 + 憑證 + 工作階段
      - 完整重設 (同時移除工作區)
  </Step>
  <Step title="Model/Auth">
    - **Anthropic API 金鑰**：如果存在則使用 `ANTHROPIC_API_KEY`，否則提示輸入金鑰，然後將其儲存以供 daemon 使用。
    - **Anthropic OAuth (Claude Code CLI)**：在 macOS 上，引導流程會檢查鑰匙圈項目 "Claude Code-credentials"（選擇「一律允許」以免 launchd 啟動時被封鎖）；在 Linux/Windows 上，如果存在則會重複使用 `~/.claude/.credentials.json`。
    - **Anthropic token (貼上 setup-token)**：在任何機器上執行 `claude setup-token`，然後貼上 token（您可以為其命名；留白則為預設）。
    - **OpenAI Code (Codex) 訂閱**：如果 `~/.codex/auth.json` 存在，引導流程可以重複使用它。
    - **OpenAI Code (Codex) 訂閱 (OAuth)**：瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.2`。
    - **OpenAI API 金鑰**：如果存在則使用 `OPENAI_API_KEY`，否則提示輸入金鑰，然後將其儲存在 auth profiles 中。
    - **xAI (Grok) API 金鑰**：提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
    - **OpenCode**：提示輸入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，請在 https://opencode.ai/auth 取得），並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**：提示輸入 Ollama 基礎 URL，提供 **Cloud + Local** 或 **Local** 模式，探索可用的模型，並在需要時自動拉取選取的本機模型。
    - 更多詳情：[Ollama](/zh-Hant/providers/ollama)
    - **API 金鑰**：為您儲存金鑰。
    - **Vercel AI Gateway (多模型代理)**：提示輸入 `AI_GATEWAY_API_KEY`。
    - 更多詳情：[Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示輸入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多詳情：[Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
    - **MiniMax M2.5**：設定會自動寫入。
    - 更多詳情：[MiniMax](/zh-Hant/providers/minimax)
    - **Synthetic (Anthropic 相容)**：提示輸入 `SYNTHETIC_API_KEY`。
    - 更多詳情：[Synthetic](/zh-Hant/providers/synthetic)
    - **Moonshot (Kimi K2)**：設定會自動寫入。
    - **Kimi Coding**：設定會自動寫入。
    - 更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
    - **跳過**：尚未設定驗證。
    - 從偵測到的選項中挑選預設模型（或手動輸入提供者/模型）。為了獲得最佳品質並降低提示注入的風險，請選擇您提供者堆疊中最強大的最新世代模型。
    - 引導流程會執行模型檢查，如果設定的模型未知或缺少驗證，則會發出警告。
    - API 金鑰儲存模式預設為明文 auth-profile 值。請使用 `--secret-input-mode ref` 來儲存環境變數參考（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 憑證存放在 `~/.openclaw/credentials/oauth.json`；auth profiles 存放在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 金鑰 + OAuth）。
    - 更多詳情：[/concepts/oauth](/zh-Hant/concepts/oauth)
    <Note>
    Headless/伺服器提示：在具有瀏覽器的機器上完成 OAuth，然後將
    `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）複製到
    gateway host。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace` （可設定）。
    - 為 agent 啟動程序建立所需的工作區檔案。
    - 完整的工作區配置 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 連接埠、綁定、驗證模式、Tailscale 曝露。
    - 驗證建議：即使對於本機回送，也請保留 **Token**，以便本機 WS 用戶端必須通過驗證。
    - 在 Token 模式下，互動式設定提供：
      - **產生/儲存明文 Token** （預設）
      - **使用 SecretRef** （選用）
      - 快速啟動會重複使用現有的 `gateway.auth.token` SecretRef 於 `env`、`file` 和 `exec` 提供者之間，以進入入門探查/儀表板啟動程序。
      - 如果設定了該 SecretRef 但無法解析，入門程序會提早失敗並顯示清楚的修復訊息，而不是靜默降低執行時期的驗證。
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在入門程序環境中有一個非空的環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅當您完全信任每個本機程序時才停用驗證。
    - 非回送綁定仍需驗證。
  </Step>
  <Step title="頻道">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用的 QR 登入。
    - [Telegram](/zh-Hant/channels/telegram)：bot token。
    - [Discord](/zh-Hant/channels/discord)：bot token。
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳戶 JSON + webhook 受眾。
    - [Mattermost](/zh-Hant/channels/mattermost) (plugin)：bot token + 基礎 URL。
    - [Signal](/zh-Hant/channels/signal)：選用的 `signal-cli` 安裝 + 帳戶設定。
    - [BlueBubbles](/zh-Hant/channels/bluebubbles)：**iMessage 的推薦選擇**；伺服器 URL + 密碼 + webhook。
    - [iMessage](/zh-Hant/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取權限。
    - DM 安全性：預設為配對。第一則 DM 會發送代碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="網路搜尋">
    - 選擇提供者：Perplexity、Brave、Gemini、Grok 或 Kimi（或跳過）。
    - 貼上您的 API 金鑰（QuickStart 會自動從環境變數或現有設定中偵測金鑰）。
    - 使用 `--skip-search` 跳過。
    - 稍後設定：`openclaw configure --section web`。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若是無頭環境，請使用自訂的 LaunchDaemon（未附帶）。
    - Linux（以及透過 WSL2 的 Windows）：systemd 使用者單元
      - Onboarding 會嘗試透過 `loginctl enable-linger <user>` 啟用 lingering，讓 Gateway 在登出後仍保持運作。
      - 可能會提示輸入 sudo（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - **Runtime 選擇：**Node（建議使用；WhatsApp/Telegram 必需）。Bun **不建議使用**。
    - 如果 token auth 需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，daemon install 會驗證它，但不會將解析後的明文 token 值保存到 supervisor 服務環境的中繼資料中。
    - 如果 token auth 需要 token 且設定的 token SecretRef 未解析，daemon install 會被阻擋並提供可採取的指引。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，daemon install 會被阻擋，直到明確設定模式為止。
  </Step>
  <Step title="Health check">
    - 啟動 Gateway（如果需要）並執行 `openclaw health`。
    - 提示：`openclaw status --deep` 會將 gateway health probes 新增至狀態輸出（需要可連線的 gateway）。
  </Step>
  <Step title="Skills (recommended)">
    - 讀取可用的 skills 並檢查需求。
    - 讓您選擇 node manager：**npm / pnpm**（不建議使用 bun）。
    - 安裝可選的相依元件（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="Finish">
    - 摘要 + 後續步驟，包括用於額外功能的 iOS/Android/macOS 應用程式。
  </Step>
</Steps>

<Note>
  If no GUI is detected, onboarding prints SSH port-forward instructions for the Control UI instead
  of opening a browser. If the Control UI assets are missing, onboarding attempts to build them;
  fallback is `pnpm ui:build` (auto-installs UI deps).
</Note>

## Non-interactive mode

Use `--non-interactive` to automate or script onboarding:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Add `--json` for a machine‑readable summary.

非互動模式下的 Gateway token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>
  `--json` **並不**意味著非互動模式。對於 腳本，請使用 `--non-interactive`（以及 `--workspace`）。
</Note>

特定提供者的指令範例位於 [CLI 自動化](/zh-Hant/start/wizard-cli-automation#provider-specific-examples)。
請使用此參考頁面了解旗標語義和步驟順序。

### 新增 Agent（非互動式）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 精靈 RPC

Gateway 通過 RPC（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）公開入職流程。
用戶端（macOS 應用程式、Control UI）可以呈現步驟而無需重新實作入職邏輯。

## Signal 設定 (signal-cli)

入職可以從 GitHub 版本安裝 `signal-cli`：

- 下載適當的版本資產。
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 將 `channels.signal.cliPath` 寫入您的設定。

註記：

- JVM 版本需要 **Java 21**。
- 盡可能使用原生版本。
- Windows 使用 WSL2；signal-cli 安裝在 WSL 內部遵循 Linux 流程。

## 精靈寫入的內容

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果選擇了 Minimax）
- `tools.profile`（本地入職未設定時預設為 `"coding"`；現有的顯式值會被保留）
- `gateway.*`（mode、bind、auth、tailscale）
- `session.dmScope`（行為詳情：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 當您在提示期間選擇加入時，頻道允許清單（Slack/Discord/Matrix/Microsoft Teams）（名稱盡可能解析為 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下方。
會話儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下方。

某些通道以插件形式提供。當您在設定期間選擇其中一個時，入門流程會提示您在進行設定之前先安裝它（npm 或本機路徑）。

## 相關文件

- 入門概述：[Onboarding (CLI)](/zh-Hant/start/wizard)
- macOS 應用程式入門：[Onboarding](/zh-Hant/start/onboarding)
- 設定參考：[Gateway configuration](/zh-Hant/gateway/configuration)
- 提供者：[WhatsApp](/zh-Hant/channels/whatsapp)、[Telegram](/zh-Hant/channels/telegram)、[Discord](/zh-Hant/channels/discord)、[Google Chat](/zh-Hant/channels/googlechat)、[Signal](/zh-Hant/channels/signal)、[BlueBubbles](/zh-Hant/channels/bluebubbles) (iMessage)、[iMessage](/zh-Hant/channels/imessage) (舊版)
- 技能：[Skills](/zh-Hant/tools/skills)、[Skills config](/zh-Hant/tools/skills-config)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
