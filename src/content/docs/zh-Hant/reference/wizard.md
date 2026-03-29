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
如需高階概覽，請參閱 [Onboarding (CLI)](/en/start/wizard)。

## 流程詳細資訊（本機模式）

<Steps>
  <Step title="偵測現有設定">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇 **保留 / 修改 / 重設**。
    - 重新執行入門程序**不會**清除任何內容，除非您明確選擇 **重設**
      （或傳遞 `--reset`）。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full`
      同時移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求
      您在繼續之前執行 `openclaw doctor`。
    - 重設使用 `trash`（從不使用 `rm`）並提供範圍：
      - 僅設定
      - 設定 + 憑證 + 工作階段
      - 完整重設（也會移除工作區）
  </Step>
  <Step title="Model/Auth">
    - **Anthropic API 金鑰**：如果存在則使用 `ANTHROPIC_API_KEY`，否則提示輸入金鑰，然後將其儲存以供 daemon 使用。
    - **Anthropic OAuth (Claude Code CLI)**：在 macOS 上，入門程式會檢查鑰匙圈項目「Claude Code-credentials」（選擇「Always Allow」以避免 launchd 啟動時被阻擋）；在 Linux/Windows 上，如果存在則重複使用 `~/.claude/.credentials.json`。
    - **Anthropic token (貼上 setup-token)**：在任何機器上執行 `claude setup-token`，然後貼上 token（您可以為其命名；留白則為預設）。
    - **OpenAI Code (Codex) 訂閱 (Codex CLI)**：如果 `~/.codex/auth.json` 存在，入門程式可以重複使用它。
    - **OpenAI Code (Codex) 訂閱 (OAuth)**：瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或為 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.2`。
    - **OpenAI API 金鑰**：如果存在則使用 `OPENAI_API_KEY`，否則提示輸入金鑰，然後將其儲存在 auth profiles 中。
    - **xAI (Grok) API 金鑰**：提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
    - **OpenCode**：提示輸入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，請在 https://opencode.ai/auth 取得），並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**：提示輸入 Ollama 基礎 URL，提供 **Cloud + Local** 或 **Local** 模式，探索可用模型，並在需要時自動拉取所選的本地模型。
    - 更多詳情：[Ollama](/en/providers/ollama)
    - **API 金鑰**：為您儲存金鑰。
    - **Vercel AI Gateway (多模型代理)**：提示輸入 `AI_GATEWAY_API_KEY`。
    - 更多詳情：[Vercel AI Gateway](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示輸入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多詳情：[Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
    - **MiniMax**：組態會自動寫入；託管的預設值是 `MiniMax-M2.7`，而 `MiniMax-M2.5` 保持可用。
    - 更多詳情：[MiniMax](/en/providers/minimax)
    - **Synthetic (Anthropic 相容)**：提示輸入 `SYNTHETIC_API_KEY`。
    - 更多詳情：[Synthetic](/en/providers/synthetic)
    - **Moonshot (Kimi K2)**：組態會自動寫入。
    - **Kimi Coding**：組態會自動寫入。
    - 更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **略過**：尚未設定認證。
    - 從偵測到的選項中選擇預設模型（或手動輸入提供者/模型）。為了獲得最佳品質並降低提示注入 的風險，請選擇提供者堆疊中最強大的最新世代模型。
    - 入門程式會執行模型檢查，如果設定的模型未知或缺少認證，則會發出警告。
    - API 金鑰儲存模式預設為純文字 auth-profile 數值。請使用 `--secret-input-mode ref` 來改為儲存環境變數支援的參照（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 憑證存在於 `~/.openclaw/credentials/oauth.json` 中；auth profiles 存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（API 金鑰 + OAuth）。
    - 更多詳情：[/concepts/oauth](/en/concepts/oauth)
    <Note>
    Headless/伺服器提示：在具有瀏覽器的機器上完成 OAuth，然後將
    `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）複製到
    gateway 主機。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace` (可設定)。
    - 播種代理啟動儀式所需的工作區檔案。
    - 完整的工作區佈局 + 備份指南：[Agent workspace](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 連接埠、綁定、認證模式、tailscale 暴露。
    - 認證建議：即使是回環也請保留 **Token**，以便本機 WS 用戶端必須進行認證。
    - 在 Token 模式下，互動式設定提供：
      - **產生/儲存明文 Token** (預設)
      - **使用 SecretRef** (選用)
      - 快速入門會重複使用現有的 `gateway.auth.token` SecretRefs 於 `env`、`file` 和 `exec` 提供者，以進行入門探針/儀表板啟動。
      - 如果該 SecretRef 已設定但無法解析，入門會提早失敗並顯示明確的修復訊息，而不是靜默降低執行時認證。
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在入門程序環境中設定非空白的環境變數。
      - 無法與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時才停用認證。
    - 非回環綁定仍需認證。
  </Step>
  <Step title="頻道">
    - [WhatsApp](/en/channels/whatsapp): 可選的 QR 登入。
    - [Telegram](/en/channels/telegram): 機器人 token。
    - [Discord](/en/channels/discord): 機器人 token。
    - [Google Chat](/en/channels/googlechat): 服務帳戶 JSON + webhook 受眾。
    - [Mattermost](/en/channels/mattermost) (外掛程式): 機器人 token + 基礎 URL。
    - [Signal](/en/channels/signal): 可選的 `signal-cli` 安裝 + 帳戶設定。
    - [BlueBubbles](/en/channels/bluebubbles): **iMessage 的推薦選擇**; 伺服器 URL + 密碼 + webhook。
    - [iMessage](/en/channels/imessage): 舊版 `imsg` CLI 路徑 + 資料庫存取權。
    - DM 安全性: 預設為配對。第一則 DM 會發送代碼; 透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="網路搜尋">
    - 選擇一個供應商: Perplexity、Brave、Gemini、Grok 或 Kimi (或跳過)。
    - 貼上您的 API 金鑰 (QuickStart 會自動從環境變數或現有設定中偵測金鑰)。
    - 使用 `--skip-search` 跳過。
    - 稍後設定: `openclaw configure --section web`。
  </Step>
  <Step title="守護程式安裝">
    - macOS：LaunchAgent
      - 需要已登入的使用者工作階段；如果是無頭模式（headless），請使用自訂的 LaunchDaemon（未隨附）。
    - Linux（以及透過 WSL2 的 Windows）：systemd 使用者單元（user unit）
      - Onboarding 會嘗試透過 `loginctl enable-linger <user>` 啟用 linger 功能，以便在登出後讓 Gateway 保持運作。
      - 可能會提示輸入 sudo 密碼（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - **執行時期選擇：** Node（推薦；WhatsApp/Telegram 必需）。Bun**不推薦**使用。
    - 如果權杖驗證需要權杖，且 `gateway.auth.token` 是由 SecretRef 管理，則守護程式安裝會驗證它，但不會將解析後的明文權杖值持久化至監督服務環境中繼資料中。
    - 如果權杖驗證需要權杖，且設定的權杖 SecretRef 未解析，則守護程式安裝會被封鎖，並提供可採取的指導。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`，且未設定 `gateway.auth.mode`，則在明確設定模式之前，守護程式安裝會被封鎖。
  </Step>
  <Step title="健康檢查">
    - 啟動 Gateway（如需要）並執行 `openclaw health`。
    - 提示：`openclaw status --deep` 會將 Gateway 健康探測（health probes）新增至狀態輸出（需要可連線的 Gateway）。
  </Step>
  <Step title="技能（Skills，推薦）">
    - 讀取可用的技能並檢查需求。
    - 讓您選擇節點管理程式：**npm / pnpm**（不推薦使用 bun）。
    - 安裝可選的相依項目（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要 + 後續步驟，包括用於額外功能的 iOS/Android/macOS 應用程式。
  </Step>
</Steps>

<Note>如果未偵測到 GUI，Onboarding 會印出用於 Control UI 的 SSH 連接埠轉送指示，而不是開啟瀏覽器。如果缺少 Control UI 資源，Onboarding 會嘗試建置它們；後備方案是 `pnpm ui:build`（自動安裝 UI 相依項目）。</Note>

## 非互動模式

使用 `--non-interactive` 來自動化或撰寫 Onboarding 腳本：

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

加入 `--json` 以取得機器可讀的摘要。

Gateway token SecretRef 在非互動模式下：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>`--json` **並不**表示非互動模式。請在腳本中使用 `--non-interactive`（以及 `--workspace`）。</Note>

特定供應商的指令範例位於 [CLI Automation](/en/start/wizard-cli-automation#provider-specific-examples)。
請參閱本參考頁面以了解標誌語義和步驟順序。

### 新增代理（非互動）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 精靈 RPC

Gateway 透過 RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`) 公開入職流程。
客戶端（macOS app, Control UI）可以呈現步驟而無需重新實作入職邏輯。

## Signal 設定 (signal-cli)

入職程序可以從 GitHub 版本安裝 `signal-cli`：

- 下載適當的發行資產。
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 將 `channels.signal.cliPath` 寫入您的設定。

備註：

- JVM 版本需要 **Java 21**。
- 如果可用，會使用原生版本。
- Windows 使用 WSL2；signal-cli 安裝會遵循 WSL 內的 Linux 流程。

## 精靈寫入的內容

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果選擇了 Minimax）
- `tools.profile`（本地入職在未設定時預設為 `"coding"`；保留現有的明確值）
- `gateway.*`（mode, bind, auth, tailscale）
- `session.dmScope`（行為細節：[CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- 當您在提示期間選擇加入時的頻道允許清單（Slack/Discord/Matrix/Microsoft Teams）（名稱會盡可能解析為 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
Sessions 儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。

部分通道是以外掛形式提供。當您在設定過程中選擇其中一個時，入門嚮導會在設定之前提示您安裝它（npm 或本地路徑）。

## 相關文件

- 入門總覽：[Onboarding (CLI)](/en/start/wizard)
- macOS 應用程式入門：[Onboarding](/en/start/onboarding)
- 設定參考：[Gateway configuration](/en/gateway/configuration)
- 提供者：[WhatsApp](/en/channels/whatsapp)、[Telegram](/en/channels/telegram)、[Discord](/en/channels/discord)、[Google Chat](/en/channels/googlechat)、[Signal](/en/channels/signal)、[BlueBubbles](/en/channels/bluebubbles) (iMessage)、[iMessage](/en/channels/imessage) (舊版)
- 技能：[Skills](/en/tools/skills)、[Skills config](/en/tools/skills-config)
