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
如需高層次的概覽，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

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
    - **Anthropic API 金鑰**：如果存在則使用 `ANTHROPIC_API_KEY`，或提示輸入金鑰，然後將其儲存供 daemon 使用。
    - **Anthropic API 金鑰**：在 onboarding/configure 中首選的 Anthropic 助手選擇。
    - **Anthropic setup-token**：在 onboarding/configure 中仍然可用，儘管 OpenClaw 現在在可用時更傾向於重複使用 Claude CLI。
    - **OpenAI Code (Codex) 訂閱 (OAuth)**：瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。
    - **OpenAI Code (Codex) 訂閱 (裝置配對)**：使用短期裝置代碼的瀏覽器配對流程。
      - 當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.4`。
    - **OpenAI API 金鑰**：如果存在則使用 `OPENAI_API_KEY` 或提示輸入金鑰，然後將其儲存在 auth profiles 中。
      - 當模型未設定、`openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.4`。
    - **xAI (Grok) API 金鑰**：提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供商。
    - **OpenCode**：提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 獲取)，並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**：首先提供 **Cloud + Local**、**Cloud only** 或 **Local only** 選項。`Cloud only` 提示輸入 `OLLAMA_API_KEY` 並使用 `https://ollama.com`；主機託管模式會提示輸入 Ollama 基礎 URL，探索可用的模型，並在需要時自動拉取選定的本地模型；`Cloud + Local` 還會檢查該 Ollama 主機是否已登入以進行雲端存取。
    - 更多詳情：[Ollama](/zh-Hant/providers/ollama)
    - **API 金鑰**：為您儲存金鑰。
    - **Vercel AI Gateway (多模型代理)**：提示輸入 `AI_GATEWAY_API_KEY`。
    - 更多詳情：[Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示輸入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多詳情：[Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
    - **MiniMax**：配置會自動寫入；託管的預設值是 `MiniMax-M2.7`。
      API 金鑰設定使用 `minimax/...`，而 OAuth 設定使用
      `minimax-portal/...`。
    - 更多詳情：[MiniMax](/zh-Hant/providers/minimax)
    - **StepFun**：針對中國或全球端點上的 StepFun standard 或 Step Plan，配置會自動寫入。
    - Standard 目前包括 `step-3.5-flash`，而 Step Plan 也包括 `step-3.5-flash-2603`。
    - 更多詳情：[StepFun](/zh-Hant/providers/stepfun)
    - **Synthetic (Anthropic-compatible)**：提示輸入 `SYNTHETIC_API_KEY`。
    - 更多詳情：[Synthetic](/zh-Hant/providers/synthetic)
    - **Moonshot (Kimi K2)**：配置會自動寫入。
    - **Kimi Coding**：配置會自動寫入。
    - 更多詳情：[Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
    - **Skip**：尚未配置身份驗證。
    - 從檢測到的選項中選擇預設模型 (或手動輸入提供商/模型)。為了獲得最佳品質和較低的提示注入風險，請選擇您提供商堆疊中可用的最強大的最新一代模型。
    - Onboarding 會執行模型檢查，如果配置的模型未知或缺少身份驗證，則會發出警告。
    - API 金鑰儲存模式預設為純文字 auth-profile 值。使用 `--secret-input-mode ref` 來儲存 env-backed refs (例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)。
    - Auth profiles 儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中 (API 金鑰 + OAuth)。`~/.openclaw/credentials/oauth.json` 僅用於舊版匯入。
    - 更多詳情：[/concepts/oauth](/zh-Hant/concepts/oauth)
    <Note>
    Headless/server 提示：在帶有瀏覽器的機器上完成 OAuth，然後將
    該 agent 的 `auth-profiles.json` (例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
    `$OPENCLAW_STATE_DIR/...` 路徑) 複製到 gateway 主機。`credentials/oauth.json`
    僅是舊版匯入來源。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace` (可設定)。
    - 為 agent bootstrap ritual 所需的 workspace 檔案進行植入。
    - 完整 workspace 配置 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 連接埠、綁定、認證模式、Tailscale 暴露。
    - 認證建議：即使是 loopback 也請保留 **Token**，以便本機 WS 用戶端必須通過驗證。
    - 在 token 模式下，互動式設定提供：
      - **產生/儲存明文 token** (預設)
      - **使用 SecretRef** (選用)
      - 快速入門會跨 `env`、`file` 和 `exec` 提供者重複使用現有的 `gateway.auth.token` SecretRefs，以進行 onboarding probe/dashboard bootstrap。
      - 若該 SecretRef 已設定但無法解析，onboarding 會提早失敗並顯示清楚的修正訊息，而不是讓執行時期認證無聲降級。
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在 onboarding 流程環境中設定非空的環境變數。
      - 無法與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時停用認證。
    - 非 loopback 綁定仍需要認證。
  </Step>
  <Step title="頻道">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用性的 QR 登入。
    - [Telegram](/zh-Hant/channels/telegram)：bot token。
    - [Discord](/zh-Hant/channels/discord)：bot token。
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳戶 JSON + webhook 受眾。
    - [Mattermost](/zh-Hant/channels/mattermost) (plugin)：bot token + base URL。
    - [Signal](/zh-Hant/channels/signal)：選用性的 `signal-cli` 安裝 + 帳戶設定。
    - [BlueBubbles](/zh-Hant/channels/bluebubbles)：**iMessage 推薦使用**；伺服器 URL + 密碼 + webhook。
    - [iMessage](/zh-Hant/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取權。
    - DM 安全性：預設為配對。第一則 DM 會發送代碼；透過 `openclaw pairing approve <channel> <code>` 核准，或使用允許清單。
  </Step>
  <Step title="網路搜尋">
    - 選擇一個支援的供應商，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily（或跳過）。
    - API 支援的供應商可以使用環境變數或現有設定來快速設定；無金鑰的供應商則改用其供應商特定的先決條件。
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

特定於供應商的指令範例位於 [CLI 自動化](/zh-Hant/start/wizard-cli-automation#provider-specific-examples)。
請使用此參考頁面了解旗標語意和步驟順序。

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

Gateway 通過 RPC (`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`) 公開入職流程。
客戶端 (macOS app、Control UI) 可以呈現步驟而無需重新實現入職邏輯。

## Signal 設定 (signal-cli)

入職可以從 GitHub 版本安裝 `signal-cli`：

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
- `tools.profile` (若未設定，本地入職預設為 `"coding"`；現有的明確值會被保留)
- `gateway.*` (模式、綁定、驗證、Tailscale)
- `session.dmScope` (行為細節：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
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
工作階段儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。

部分通道是以外掛程式形式提供。當您在設定期間選擇其中一個時，入門流程
會提示您先安裝它（npm 或本機路徑），然後才能進行設定。

## 相關文件

- 入職概覽：[入職 (CLI)](/zh-Hant/start/wizard)
- macOS app 入職：[入職](/zh-Hant/start/onboarding)
- 配置參考：[Gateway 配置](/zh-Hant/gateway/configuration)
- 提供者：[WhatsApp](/zh-Hant/channels/whatsapp)、[Telegram](/zh-Hant/channels/telegram)、[Discord](/zh-Hant/channels/discord)、[Google Chat](/zh-Hant/channels/googlechat)、[Signal](/zh-Hant/channels/signal)、[BlueBubbles](/zh-Hant/channels/bluebubbles) (iMessage)、[iMessage](/zh-Hant/channels/imessage) (舊版)
- 技能：[Skills](/zh-Hant/tools/skills)、[Skills 配置](/zh-Hant/tools/skills-config)
