---
summary: "CLI 入門的完整參考：每個步驟、標誌和設定欄位"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "Onboarding 參考"
sidebarTitle: "入門參考"
---

這是 `openclaw onboard` 的完整參考。
若要了解高階概覽，請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

## 流程詳情 (本機模式)

<Steps>
  <Step title="Existing config detection">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇 **Keep current values**（保留當前值）、**Review and update**（審閱並更新）或 **Reset before setup**（在設定前重設）。
    - 重新執行入門嚮導**不會**清除任何內容，除非您明確選擇 **Reset**（重設）
      （或傳遞 `--reset`）。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full`
      同時移除工作區。
    - 如果設定無效或包含舊版金鑰，嚮導會停止並要求您
      在繼續之前執行 `openclaw doctor`。
    - 重設會使用 `trash`（絕不使用 `rm`）並提供範圍選項：
      - 僅設定
      - 設定 + 憑證 + 會話
      - 完整重設（同時移除工作區）

  </Step>
  <Step title="Model/Auth">
    - **Anthropic API key**: 如果存在則使用 `ANTHROPIC_API_KEY`，否則提示輸入金鑰，然後將其保存供守護程序使用。
    - **Anthropic API key**: 在 onboarding/configure 中首選的 Anthropic 助手選項。
    - **Anthropic setup-token**: 仍然可在 onboarding/configure 中使用，儘管 OpenClaw 現在在可用時更傾向於重複使用 Claude CLI。
    - **OpenAI Code (Codex) subscription (OAuth)**: 瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或已是 OpenAI 系列時，透過 Codex 執行時將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。
    - **OpenAI Code (Codex) subscription (device pairing)**: 使用短期裝置代碼的瀏覽器配對流程。
      - 當模型未設定或已是 OpenAI 系列時，透過 Codex 執行時將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。
    - **OpenAI API key**: 如果存在則使用 `OPENAI_API_KEY`，否則提示輸入金鑰，然後將其儲存在 auth profiles 中。
      - 當模型未設定、`openai/*` 或 `openai-codex/*` 時，將 `agents.defaults.model` 設定為 `openai/gpt-5.5`。
    - **xAI (Grok) API key**: 提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
    - **OpenCode**: 提示輸入 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`，請在 https://opencode.ai/auth 取得)，並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**: 首先提供 **Cloud + Local**、**Cloud only** 或 **Local only**。`Cloud only` 提示輸入 `OLLAMA_API_KEY` 並使用 `https://ollama.com`；主機託管模式會提示輸入 Ollama 基礎 URL，探索可用模型，並在需要時自動拉取選定的本地模型；`Cloud + Local` 也會檢查該 Ollama 主機是否已登入雲端存取權。
    - 更多詳情: [Ollama](/zh-Hant/providers/ollama)
    - **API key**: 為您儲存金鑰。
    - **Vercel AI Gateway (multi-model proxy)**: 提示輸入 `AI_GATEWAY_API_KEY`。
    - 更多詳情: [Vercel AI Gateway](/zh-Hant/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**: 提示輸入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多詳情: [Cloudflare AI Gateway](/zh-Hant/providers/cloudflare-ai-gateway)
    - **MiniMax**: 配置會自動寫入；託管預設值為 `MiniMax-M2.7`。
      API 金鑰設定使用 `minimax/...`，OAuth 設定使用
      `minimax-portal/...`。
    - 更多詳情: [MiniMax](/zh-Hant/providers/minimax)
    - **StepFun**: 會針對中國或全球端點上的 StepFun 標準版或 Step Plan 自動寫入配置。
    - 標準版目前包含 `step-3.5-flash`，Step Plan 也包含 `step-3.5-flash-2603`。
    - 更多詳情: [StepFun](/zh-Hant/providers/stepfun)
    - **Synthetic (Anthropic-compatible)**: 提示輸入 `SYNTHETIC_API_KEY`。
    - 更多詳情: [Synthetic](/zh-Hant/providers/synthetic)
    - **Moonshot (Kimi K2)**: 配置會自動寫入。
    - **Kimi Coding**: 配置會自動寫入。
    - 更多詳情: [Moonshot AI (Kimi + Kimi Coding)](/zh-Hant/providers/moonshot)
    - **Skip**: 尚未配置身份驗證。
    - 從偵測到的選項中挑選一個預設模型 (或手動輸入提供者/模型)。為了獲得最佳品質並降低提示注入風險，請選擇您提供者堆疊中可用的最強最新一代模型。
    - Onboarding 會執行模型檢查，如果設定的模型未知或缺少身份驗證，則會發出警告。
    - API 金鑰儲存模式預設為純文字 auth-profile 值。使用 `--secret-input-mode ref` 來改為儲存環境變數支援的參照 (例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)。
    - Auth profiles 儲存在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中 (API 金鑰 + OAuth)。`~/.openclaw/credentials/oauth.json` 僅供舊版匯入使用。
    - 更多詳情: [/concepts/oauth](/zh-Hant/concepts/oauth)
    <Note>
    Headless/伺服器提示: 在具有瀏覽器的機器上完成 OAuth，然後將
    該代理程式的 `auth-profiles.json` (例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或對應的
    `$OPENCLAW_STATE_DIR/...` 路徑) 複製到閘道主機。`credentials/oauth.json`
    僅是舊版匯入來源。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設為 `~/.openclaw/workspace`（可設定）。
    - 產生代理程式啟動儀式所需的工作區檔案。
    - 完整的工作區佈局與備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)

  </Step>
  <Step title="Gateway">
    - 連接埠、綁定、驗證模式、Tailscale 暴露。
    - 驗證建議：即使是回環也請保留 **Token**，以便本機 WS 用戶端必須通過驗證。
    - 在 Token 模式下，互動式設定提供：
      - **產生/儲存明文 Token**（預設）
      - **使用 SecretRef**（選用）
      - 快速入門會跨 `env`、`file` 和 `exec` 提供者重用現有的 `gateway.auth.token` SecretRefs，以進行入站探查/儀表板啟動。
      - 如果該 SecretRef 已設定但無法解析，入站程式會提前失敗並顯示明確的修復訊息，而不是讓執行時期驗證無聲降級。
    - 在密碼模式下，互動式設定也支援明文或 SecretRef 儲存。
    - 非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在入站程式程序環境中有一個非空的環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅在您完全信任每個本機程序時才停用驗證。
    - 非回環綁定仍需驗證。

  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用 QR 登入。
    - [Telegram](/zh-Hant/channels/telegram)：Bot Token。
    - [Discord](/zh-Hant/channels/discord)：Bot Token。
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳戶 JSON + Webhook 受眾。
    - [Mattermost](/zh-Hant/channels/mattermost) (外掛程式)：Bot Token + 基礎 URL。
    - [Signal](/zh-Hant/channels/signal)：選用 `signal-cli` 安裝 + 帳戶設定。
    - [iMessage](/zh-Hant/channels/imessage)：`imsg` CLI 路徑 + Messages DB 存取；當 Gateway 在非 Mac 上執行時，請使用 SSH 包裝程式。
    - DM 安全性：預設為配對。第一個 DM 會傳送程式碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。

  </Step>
  <Step title="Web 搜尋">
    - 選擇一個支援的供應商，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily（或跳過）。
    - 支援 API 的供應商可以使用環境變數或現有設定來快速設置；免金鑰的供應商則改用其供應商特定的先決條件。
    - 使用 `--skip-search` 跳過。
    - 稍後設定：`openclaw configure --section web`。

  </Step>
  <Step title="Daemon 安裝">
    - macOS：LaunchAgent
      - 需要登入的使用者工作階段；若是無介面模式，請使用自訂的 LaunchDaemon（未附帶）。
    - Linux（以及透過 WSL2 的 Windows）：systemd 使用者單元
      - Onboarding 會嘗試透過 `loginctl enable-linger <user>` 啟用 lingering，讓 Gateway 在登出後仍保持運行。
      - 可能會提示輸入 sudo（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - **Runtime 選擇：** Node（建議；WhatsApp/Telegram 必要）。Bun **不建議** 使用。
    - 如果 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，daemon 安裝會驗證它，但不會將解析後的明文 token 值持久化到 supervisor 服務的環境元數據中。
    - 如果 token 驗證需要 token 且設定的 token SecretRef 未解析，daemon 安裝會被封鎖並提供可行的指引。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則會封鎖 daemon 安裝，直到明確設定模式。

  </Step>
  <Step title="健康檢查">
    - 啟動 Gateway（如果需要）並執行 `openclaw health`。
    - 提示：`openclaw status --deep` 會將即時 gateway 健康探測加入到狀態輸出中，包括在支援時的通道探測（需要可連線的 gateway）。

  </Step>
  <Step title="技能（建議）">
    - 讀取可用技能並檢查需求。
    - 讓您選擇節點管理員：**npm / pnpm**（不建議使用 bun）。
    - 安裝可選的相依性（有些在 macOS 上使用 Homebrew）。

  </Step>
  <Step title="Finish">
    - 摘要與後續步驟，包括針對 Terminal、Browser 或稍後進行的 **您想要如何孵化您的 agent？** 提示。

  </Step>
</Steps>

<Note>如果未偵測到 GUI，onboarding 會列印 Control UI 的 SSH 連接埠轉發指示，而不是開啟瀏覽器。 如果 Control UI 資產遺失，onboarding 會嘗試建置它們；後備方案是 `pnpm ui:build`（自動安裝 UI 相依項）。</Note>

## 非互動模式

使用 `--non-interactive` 來自動化或撰寫 onboarding 腳本：

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

新增 `--json` 以取得機器可讀的摘要。

非互動式模式下的 Gateway token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 與 `--gateway-token-ref-env` 互斥。

<Note>`--json` **並不**意味著非互動式模式。請針對腳本使用 `--non-interactive`（以及 `--workspace`）。</Note>

特定提供者的指令範例位於 [CLI Automation](/zh-Hant/start/wizard-cli-automation#provider-specific-examples)。
請使用此參考頁面了解旗標語義與步驟順序。

### 新增代理程式（非互動式）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 精靈 RPC

Gateway 透過 RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`) 公開入職流程。
客戶端 (macOS app, Control UI) 可以在不重新實作入職邏輯的情況下呈現步驟。

## Signal 設定

入職流程可以從 GitHub releases 安裝 `signal-cli`：

- 下載適當的發行資源。
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 將 `channels.signal.cliPath` 寫入您的設定。

備註：

- JVM 版本需要 **Java 21**。
- 可用時會使用原生版本。
- Windows 使用 WSL2；signal-cli 安裝會在 WSL 內遵循 Linux 流程。

## 精靈寫入的內容

`~/.openclaw/openclaw.json` 中的常見欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（若選擇 Minimax）
- `tools.profile`（若未設定，本機入職預設為 `"coding"`；保留現有的明確值）
- `gateway.*`（mode、bind、auth、tailscale）
- `session.dmScope` (行為細節：[CLI Setup Reference](/zh-Hant/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 頻道允許清單（Slack/Discord/Matrix/Microsoft Teams），當您在提示期間選擇加入時（名稱會盡可能解析為 ID）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 手動配置仍可透過直接設定 `skills.install.nodeManager` 來使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證位於 `~/.openclaw/credentials/whatsapp/<accountId>/` 下方。
Session 儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下方。

部分通道是以外掛程式形式提供。當您在設定期間選擇其中一個時，入門程序會提示您在進行設定之前先安裝它（npm 或本機路徑）。

## 相關文件

- 入職概述：[Onboarding (CLI)](/zh-Hant/start/wizard)
- macOS app 入職：[Onboarding](/zh-Hant/start/onboarding)
- 設定參考：[Gateway configuration](/zh-Hant/gateway/configuration)
- 提供者：[WhatsApp](/zh-Hant/channels/whatsapp)、[Telegram](/zh-Hant/channels/telegram)、[Discord](/zh-Hant/channels/discord)、[Google Chat](/zh-Hant/channels/googlechat)、[Signal](/zh-Hant/channels/signal)、[iMessage](/zh-Hant/channels/imessage)
- 技能：[Skills](/zh-Hant/tools/skills)、[Skills config](/zh-Hant/tools/skills-config)
