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

這是 `openclaw onboard` 的完整參考文件。
若要了解高層次的概覽，請參閱 [Onboarding (CLI)](/en/start/wizard)。

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
    - **Anthropic API 金鑰**：如果存在則使用 `ANTHROPIC_API_KEY`，或提示輸入金鑰，然後將其儲存以供 daemon 使用。
    - **Anthropic API 金鑰**：在 onboarding/configure 中首選的 Anthropic 助手選項。
    - **Anthropic setup-token (legacy/manual)**：在 onboarding/configure 中再次可用，但 Anthropic 告知 OpenClaw 使用者，OpenClaw Claude 登入路徑被視為第三方套裝軟體使用，並且在 Claude 帳戶上需要 **額外使用量**。
    - **OpenAI Code (Codex) 訂閱**：如果 `~/.codex/auth.json` 存在，onboarding 可以重複使用它。重複使用的 Codex CLI 憑證仍由 Codex CLI 管理；過期時 OpenClaw 會先重新讀取該來源，並且當提供者可以刷新它時，將刷新後的憑證寫回 Codex 儲存空間，而不是自行接管。
    - **OpenAI Code (Codex) 訂閱**：瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。
    - **OpenAI API 金鑰**：如果存在則使用 `OPENAI_API_KEY`，或提示輸入金鑰，然後將其儲存在 auth profiles 中。
      - 當模型未設定、`openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.4`。
    - **xAI (Grok) API 金鑰**：提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
    - **OpenCode**：提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 取得)，並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**：提示輸入 Ollama 基礎 URL，提供 **Cloud + Local** 或 **Local** 模式，探索可用的模型，並在需要時自動拉取所選的本地模型。
    - 更多詳情：[Ollama](/en/providers/ollama)
    - **API 金鑰**：為您儲存金鑰。
    - **Vercel AI Gateway (多模型代理)**：提示輸入 `AI_GATEWAY_API_KEY`。
    - 更多詳情：[Vercel AI Gateway](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示輸入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多詳情：[Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
    - **MiniMax**：設定會自動寫入；託管預設值為 `MiniMax-M2.7`。
      API 金鑰設定使用 `minimax/...`，OAuth 設定使用
      `minimax-portal/...`。
    - 更多詳情：[MiniMax](/en/providers/minimax)
    - **StepFun**：針對中國或全球端點上的 StepFun 標準版或 Step Plan 自動寫入設定。
    - 標準版目前包括 `step-3.5-flash`，Step Plan 還包括 `step-3.5-flash-2603`。
    - 更多詳情：[StepFun](/en/providers/stepfun)
    - **Synthetic (Anthropic-compatible)**：提示輸入 `SYNTHETIC_API_KEY`。
    - 更多詳情：[Synthetic](/en/providers/synthetic)
    - **Moonshot (Kimi K2)**：設定會自動寫入。
    - **Kimi Coding**：設定會自動寫入。
    - 更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **跳過**：尚未設定驗證。
    - 從偵測到的選項中選擇預設模型 (或手動輸入提供者/模型)。為了獲得最佳品質和較低的提示注入風險，請選擇提供者堆疊中可用的最強大最新世代模型。
    - Onboarding 會執行模型檢查，如果設定的模型未知或缺少驗證，則會發出警告。
    - API 金鑰儲存模式預設為純文字 auth-profile 值。請使用 `--secret-input-mode ref` 來儲存 env-backed 引用 (例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)。
    - Auth profiles 位於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (API 金鑰 + OAuth)。`~/.openclaw/credentials/oauth.json` 僅為舊版匯入來源。
    - 更多詳情：[/concepts/oauth](/en/concepts/oauth)
    <Note>
    Headless/server 提示：在具有瀏覽器的機器上完成 OAuth，然後將
    該 agent 的 `auth-profiles.json` (例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或相符的
    `$OPENCLAW_STATE_DIR/...` 路徑) 複製到 gateway host。`credentials/oauth.json`
    僅是舊版匯入來源。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace` (可配置)。
    - 種置代理啟動儀式所需的工作區檔案。
    - 完整的工作區佈局 + 備份指南：[Agent workspace](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 連接埠、綁定、認證模式、Tailscale 暴露。
    - 認證建議：即使是 loopback 也保留 **Token**，以便本機 WS 用戶端必須進行驗證。
    - 在 Token 模式下，互動式設定提供：
      - **產生/儲存明文 Token** (預設)
      - **使用 SecretRef** (選用)
      - 快速開始會在 `env`、`file` 和 `exec` 提供者之間重複使用現有的 `gateway.auth.token` SecretRef，以進入入門探針/儀表板啟動。
      - 如果該 SecretRef 已設定但無法解析，入門會提早失敗並顯示明確的修正訊息，而不是在執行時靜默降低認證安全性。
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在入門流程環境中設定一個非空的環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時才停用認證。
    - 非 loopback 綁定仍然需要認證。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/en/channels/whatsapp): 可選的 QR 登入。
    - [Telegram](/en/channels/telegram): bot token。
    - [Discord](/en/channels/discord): bot token。
    - [Google Chat](/en/channels/googlechat): service account JSON + webhook audience。
    - [Mattermost](/en/channels/mattermost) (plugin): bot token + base URL。
    - [Signal](/en/channels/signal): 可選的 `signal-cli` 安裝 + 帳戶設定。
    - [BlueBubbles](/en/channels/bluebubbles): **iMessage 的推薦選擇**；伺服器 URL + 密碼 + webhook。
    - [iMessage](/en/channels/imessage): 舊版 `imsg` CLI 路徑 + DB 存取權限。
    - DM 安全性：預設為配對模式。第一則 DM 會傳送代碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="Web search">
    - 選擇一個支援的提供商，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily (或跳過)。
    - 支援 API 的提供商可以使用環境變數或現有設定來快速設定；無金鑰的提供商則改用其特定的先決條件。
    - 使用 `--skip-search` 跳過。
    - 稍後設定：`openclaw configure --section web`。
  </Step>
  <Step title="Daemon install">
    - macOS: LaunchAgent
      - Requires a logged-in user session; for headless, use a custom LaunchDaemon (not shipped).
    - Linux (and Windows via WSL2): systemd user unit
      - Onboarding attempts to enable lingering via `loginctl enable-linger <user>` so the Gateway stays up after logout.
      - May prompt for sudo (writes `/var/lib/systemd/linger`); it tries without sudo first.
    - **Runtime selection:** Node (recommended; required for WhatsApp/Telegram). Bun is **not recommended**.
    - If token auth requires a token and `gateway.auth.token` is SecretRef-managed, daemon install validates it but does not persist resolved plaintext token values into supervisor service environment metadata.
    - If token auth requires a token and the configured token SecretRef is unresolved, daemon install is blocked with actionable guidance.
    - If both `gateway.auth.token` and `gateway.auth.password` are configured and `gateway.auth.mode` is unset, daemon install is blocked until mode is set explicitly.
  </Step>
  <Step title="Health check">
    - Starts the Gateway (if needed) and runs `openclaw health`.
    - Tip: `openclaw status --deep` adds the live gateway health probe to status output, including channel probes when supported (requires a reachable gateway).
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

<Note>If no GUI is detected, onboarding prints SSH port-forward instructions for the Control UI instead of opening a browser. If the Control UI assets are missing, onboarding attempts to build them; fallback is `pnpm ui:build` (auto-installs UI deps).</Note>

## 非互動模式

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

Gateway token SecretRef 在非互動模式下：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` and `--gateway-token-ref-env` are mutually exclusive.

<Note>`--json` does **not** imply non-interactive mode. Use `--non-interactive` (and `--workspace`) for scripts.</Note>

特定供應商的指令範例位於 [CLI Automation](/en/start/wizard-cli-automation#provider-specific-examples)。
請使用此參考頁面了解旗標語義與步驟順序。

### 新增代理（非互動）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.4 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 精靈 RPC

Gateway 透過 RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`) 公開入門流程。
用戶端（macOS 應用程式、Control UI）可以呈現步驟，而無需重新實作入門邏輯。

## Signal 設定 (signal-cli)

入門流程可以從 GitHub 版本安裝 `signal-cli`：

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
- `agents.defaults.model` / `models.providers` (如果選擇 Minimax)
- `tools.profile` (若未設定，本機入門預設為 `"coding"`；會保留現有的明確值)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (行為細節：[CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- 當您在提示期間選擇加入時的頻道允許清單（Slack/Discord/Matrix/Microsoft Teams）（名稱會盡可能解析為 ID）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 手動設定仍可透過直接設定 `skills.install.nodeManager` 來使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
Session 則儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。

部分通道是以外掛程式形式提供。當您在設定期間選擇其中一個時，入門流程
會提示您先安裝它（npm 或本機路徑），然後才能進行設定。

## 相關文件

- 上架概覽：[上架 (CLI)](/en/start/wizard)
- macOS 應用程式上架：[上架](/en/start/onboarding)
- 設定參考：[Gateway 設定](/en/gateway/configuration)
- 提供者：[WhatsApp](/en/channels/whatsapp)、[Telegram](/en/channels/telegram)、[Discord](/en/channels/discord)、[Google Chat](/en/channels/googlechat)、[Signal](/en/channels/signal)、[BlueBubbles](/en/channels/bluebubbles) (iMessage)、[iMessage](/en/channels/imessage) (舊版)
- 技能：[技能](/en/tools/skills)、[技能設定](/en/tools/skills-config)
