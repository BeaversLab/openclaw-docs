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
    - **Anthropic Claude CLI**：在 macOS 上，引導程序會檢查鑰匙圈項目 "Claude Code-credentials"（選擇 "Always Allow" 以免 launchd 啟動時被阻擋）；在 Linux/Windows 上，如果存在 `~/.claude/.credentials.json` 則重複使用，並將模型選擇切換至 `claude-cli/...`。
    - **Anthropic token (貼上 setup-token)**：在任何機器上執行 `claude setup-token`，然後貼上 token（您可以為其命名；留空則為預設）。
    - **OpenAI Code (Codex) 訂閱**：如果 `~/.codex/auth.json` 存在，引導程序可以重複使用它。
    - **OpenAI Code (Codex) 訂閱**：瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或為 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.2`。
    - **OpenAI API 金鑰**：如果存在則使用 `OPENAI_API_KEY`，或提示輸入金鑰，然後將其儲存在 auth profiles 中。
    - **xAI (Grok) API 金鑰**：提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供商。
    - **OpenCode**：提示輸入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 取得），並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**：提示輸入 Ollama 基礎 URL，提供 **Cloud + Local** 或 **Local** 模式，探索可用的模型，並在需要時自動拉取所選的本地模型。
    - 更多詳細資訊：[Ollama](/en/providers/ollama)
    - **API 金鑰**：為您儲存金鑰。
    - **Vercel AI Gateway (多模型代理)**：提示輸入 `AI_GATEWAY_API_KEY`。
    - 更多詳細資訊：[Vercel AI Gateway](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示輸入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多詳細資訊：[Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
    - **MiniMax**：設定會自動寫入；託管的預設值是 `MiniMax-M2.7` 且 `MiniMax-M2.5` 保持可用。
    - 更多詳細資訊：[MiniMax](/en/providers/minimax)
    - **Synthetic (Anthropic-compatible)**：提示輸入 `SYNTHETIC_API_KEY`。
    - 更多詳細資訊：[Synthetic](/en/providers/synthetic)
    - **Moonshot (Kimi K2)**：設定會自動寫入。
    - **Kimi Coding**：設定會自動寫入。
    - 更多詳細資訊：[Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **跳過**：尚未設定認證。
    - 從偵測到的選項中選擇預設模型（或手動輸入提供商/模型）。為了獲得最佳品質並降低提示注入的風險，請選擇您的提供商堆疊中最強大的最新世代模型。
    - 引導程序會執行模型檢查，如果設定的模型未知或缺少認證則發出警告。
    - API 金鑰儲存模式預設為純文字 auth-profile 數值。使用 `--secret-input-mode ref` 來儲存環境變數支援的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 認證資料存在於 `~/.openclaw/credentials/oauth.json`；auth profiles 存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 金鑰 + OAuth）。
    - 更多詳細資訊：[/concepts/oauth](/en/concepts/oauth)
    <Note>
    Headless/server 提示：在有瀏覽器的機器上完成 OAuth，然後將
    `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）複製到
    gateway 主機。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace`（可設定）。
    - 播種代理啟動儀式所需的工作區檔案。
    - 完整的工作區佈局 + 備份指南：[Agent workspace](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 埠、綁定、認證模式、Tailscale 暴露。
    - 認證建議：即使是 loopback 也保留 **Token**，以便本機 WS 用戶端必須通過驗證。
    - 在 Token 模式下，互動式設定提供：
      - **產生/儲存明文 Token**（預設）
      - **使用 SecretRef**（選用）
      - 快速入門會重複使用現有的 `gateway.auth.token` SecretRefs 於 `env`、`file` 和 `exec` 提供者，以進行入門探頭/儀表板啟動。
      - 如果該 SecretRef 已設定但無法解析，入門流程會提早失敗並顯示明確的修復訊息，而不是無聲地降低執行時認證安全性。
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在入門流程環境中設定非空的環境變數。
      - 無法與 `--gateway-token` 結合使用。
    - 僅當您完全信任每個本機程序時，才停用認證。
    - 非 loopback 綁定仍需認證。
  </Step>
  <Step title="頻道">
    - [WhatsApp](/en/channels/whatsapp)：可選 QR 登入。
    - [Telegram](/en/channels/telegram)：bot token。
    - [Discord](/en/channels/discord)：bot token。
    - [Google Chat](/en/channels/googlechat)：服務帳戶 JSON + webhook 受眾。
    - [Mattermost](/en/channels/mattermost) (外掛)：bot token + 基礎 URL。
    - [Signal](/en/channels/signal)：可選 `signal-cli` 安裝 + 帳戶配置。
    - [BlueBubbles](/en/channels/bluebubbles)：**iMessage 推薦**；伺服器 URL + 密碼 + webhook。
    - [iMessage](/en/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取權限。
    - DM 安全性：預設為配對。第一則 DM 會發送代碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="網路搜尋">
    - 選擇供應商：Perplexity、Brave、Gemini、Grok 或 Kimi（或跳過）。
    - 貼上您的 API 金鑰（QuickStart 會自動從環境變數或現有設定中偵測金鑰）。
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
    - 啟動 Gateway（如需要）並執行 `openclaw health`。
    - 提示：`openclaw status --deep` 會將 gateway 健康探測加入狀態輸出中（需要可連線的 gateway）。
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

<Note>若未偵測到 GUI，入門流程會列印 Control UI 的 SSH 連線埠轉送指示，而不會開啟瀏覽器。 若缺少 Control UI 資產，入門流程會嘗試建置它們；備選方案是 `pnpm ui:build`（自動安裝 UI 相關依賴）。</Note>

## 非互動模式

使用 `--non-interactive` 來自動化或透過腳本執行入門流程：

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

新增 `--json` 以取得機器可讀取的摘要。

Gateway token SecretRef 在非互動模式下：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 與 `--gateway-token-ref-env` 互斥。

<Note>`--json` 並**不**代表非互動模式。請在腳本中使用 `--non-interactive`（以及 `--workspace`）。</Note>

特定於提供者的命令範例位於 [CLI Automation](/en/start/wizard-cli-automation#provider-specific-examples)。
請使用此參考頁面了解旗標語義和步驟順序。

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

Gateway 透過 RPC (`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`) 公開上架流程。
客戶端（macOS 應用程式、Control UI）可以呈現步驟而無需重新實作上架邏輯。

## Signal 設定 (signal-cli)

上架可以從 GitHub 發行版安裝 `signal-cli`：

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
- `agents.defaults.model` / `models.providers` （若選擇 Minimax）
- `tools.profile` （本機入門若未設定則預設為 `"coding"`；保留現有的明確值）
- `gateway.*` （mode、bind、auth、tailscale）
- `session.dmScope` （行為細節：[CLI 設定參考](/en/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 當您在提示期間選擇加入時的頻道允許清單（Slack/Discord/Matrix/Microsoft Teams）（名稱會盡可能解析為 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和可選的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
會話儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。

部分通道是以外掛形式提供。當您在設定過程中選擇其中一個時，入門嚮導會在設定之前提示您安裝它（npm 或本地路徑）。

## 相關文件

- 入門概述：[Onboarding (CLI)](/en/start/wizard)
- macOS 應用程式入門：[Onboarding](/en/start/onboarding)
- 設定參考：[Gateway configuration](/en/gateway/configuration)
- 提供者：[WhatsApp](/en/channels/whatsapp)、[Telegram](/en/channels/telegram)、[Discord](/en/channels/discord)、[Google Chat](/en/channels/googlechat)、[Signal](/en/channels/signal)、[BlueBubbles](/en/channels/bluebubbles) (iMessage)、[iMessage](/en/channels/imessage) (舊版)
- 技能：[技能](/en/tools/skills)、[技能配置](/en/tools/skills-config)
