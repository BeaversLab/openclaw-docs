---
summary: "CLI 入駐的完整參考：每個步驟、旗標和設定欄位"
read_when:
  - 查詢特定的入駐步驟或旗標
  - 使用非互動模式自動化入駐
  - 除錯入駐行為
title: "入駐參考"
sidebarTitle: "入駐參考"
---

# 入駐參考

這是 `openclaw onboard` 的完整參考。
如需高階概覽，請參閱[入駐 (CLI)](/zh-Hant/start/wizard)。

## 流程詳情 (本機模式)

<Steps>
  <Step title="偵測現有設定">
    - 如果 `~/.openclaw/openclaw.json` 存在，請選擇 **保留 / 修改 / 重設**。
    - 重新執行入駐**不會**清除任何內容，除非您明確選擇 **重設**
      (或傳遞 `--reset`)。
    - CLI `--reset` 預設為 `config+creds+sessions`；請使用 `--reset-scope full`
      一併移除工作區。
    - 如果設定無效或包含舊版金鑰，精靈會停止並要求
      您在繼續之前執行 `openclaw doctor`。
    - 重設使用 `trash` (永遠不是 `rm`) 並提供範圍：
      - 僅設定
      - 設定 + 憑證 + 工作階段
      - 完整重設 (也會移除工作區)
  </Step>
  <Step title="Model/Auth">
    - **Anthropic API 金鑰**：如果存在 `ANTHROPIC_API_KEY` 則使用，或提示輸入金鑰，然後將其保存以供守護程序使用。
    - **Anthropic OAuth (Claude Code CLI)**：在 macOS 上，入職檢查鑰匙圈項目 "Claude Code-credentials"（選擇 "始終允許" 以免 launchd 啟動時受阻）；在 Linux/Windows 上，如果存在 `~/.claude/.credentials.json` 則重複使用。
    - **Anthropic token（貼上 setup-token）**：在任何機器上執行 `claude setup-token`，然後貼上 token（您可以為其命名；空白表示預設）。
    - **OpenAI Code (Codex) 訂閱 (Codex CLI)**：如果存在 `~/.codex/auth.json`，入職可以重複使用它。
    - **OpenAI Code (Codex) 訂閱 (OAuth)**：瀏覽器流程；貼上 `code#state`。
      - 當模型未設定或 `openai/*` 時，將 `agents.defaults.model` 設定為 `openai-codex/gpt-5.2`。
    - **OpenAI API 金鑰**：如果存在 `OPENAI_API_KEY` 則使用，或提示輸入金鑰，然後將其儲存在 auth profiles 中。
    - **xAI (Grok) API 金鑰**：提示輸入 `XAI_API_KEY` 並將 xAI 設定為模型提供者。
    - **OpenCode**：提示輸入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 取得），並讓您選擇 Zen 或 Go 目錄。
    - **Ollama**：提示輸入 Ollama 基礎 URL，提供 **Cloud + Local** 或 **Local** 模式，探索可用的模型，並在需要時自動提取選定的本地模型。
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
    - **跳過**：尚未設定認證。
    - 從偵測到的選項中選擇預設模型（或手動輸入提供者/模型）。為了獲得最佳品質和降低提示注入風險，請選擇您的提供者堆疊中可用的最強大最新一代模型。
    - 入職會執行模型檢查，如果設定的模型未知或缺少認證，則會發出警告。
    - API 金鑰儲存模式預設為純文本 auth-profile 值。使用 `--secret-input-mode ref` 來改為儲存 env-backed refs（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 認證資訊存在於 `~/.openclaw/credentials/oauth.json`；auth profiles 存在於 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 金鑰 + OAuth）。
    - 更多詳情：[/concepts/oauth](/zh-Hant/concepts/oauth)
    <Note>
    Headless/伺服器提示：在有瀏覽器的機器上完成 OAuth，然後將
    `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）複製到
    gateway 主機。
    </Note>
  </Step>
  <Step title="Workspace">
    - 預設 `~/.openclaw/workspace` （可配置）。
    - 播種代理程式啟動儀式所需的工作區檔案。
    - 完整的工作區佈局 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 埠、繫結、驗證模式、Tailscale 暴露。
    - 驗證建議：即使對於回環，也保留 **Token**，以便本地 WS 用戶端必須通過驗證。
    - 在 Token 模式下，互動式設定提供：
      - **產生/儲存純文字 Token** （預設）
      - **使用 SecretRef** （選擇加入）
      - 快速入門會重複使用現有的 `gateway.auth.token` SecretRefs，跨 `env`、`file` 和 `exec` 提供者，以進入入職探針/儀表板啟動。
      - 如果已配置該 SecretRef 但無法解析，入職會提前失敗並顯示明確的修復訊息，而不是無聲地降低執行時期驗證。
    - 在密碼模式下，互動式設定也支援純文字或 SecretRef 儲存。
    - 非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在入職流程環境中有一個非空的環境變數。
      - 不能與 `--gateway-token` 結合使用。
    - 僅當您完全信任每個本機流程時，才停用驗證。
    - 非回環繫結仍需要驗證。
  </Step>
  <Step title="頻道">
    - [WhatsApp](/zh-Hant/channels/whatsapp)：選用的 QR 登入。
    - [Telegram](/zh-Hant/channels/telegram)：Bot Token。
    - [Discord](/zh-Hant/channels/discord)：Bot Token。
    - [Google Chat](/zh-Hant/channels/googlechat)：服務帳號 JSON + Webhook 受眾。
    - [Mattermost](/zh-Hant/channels/mattermost) (外掛)：Bot Token + 基礎 URL。
    - [Signal](/zh-Hant/channels/signal)：選用的 `signal-cli` 安裝 + 帳號設定。
    - [BlueBubbles](/zh-Hant/channels/bluebubbles)：**iMessage 的推薦選擇**；伺服器 URL + 密碼 + Webhook。
    - [iMessage](/zh-Hant/channels/imessage)：舊版 `imsg` CLI 路徑 + DB 存取權限。
    - DM 安全性：預設為配對模式。第一則 DM 會發送代碼；透過 `openclaw pairing approve <channel> <code>` 核准或使用允許清單。
  </Step>
  <Step title="網路搜尋">
    - 選擇供應商：Perplexity、Brave、Gemini、Grok 或 Kimi（或略過）。
    - 貼上您的 API 金鑰（QuickStart 會自動從環境變數或現有設定中偵測金鑰）。
    - 使用 `--skip-search` 略過。
    - 稍後設定：`openclaw configure --section web`。
  </Step>
  <Step title="Daemon install">
    - macOS: LaunchAgent
      - 需要已登入的使用者工作階段；如果是無頭模式，請使用自訂的 LaunchDaemon（未隨附）。
    - Linux（以及透過 WSL2 的 Windows）：systemd 使用者單元
      - Onboarding 會嘗試透過 `loginctl enable-linger <user>` 啟用 lingering，讓 Gateway 在登出後保持運作。
      - 可能會提示輸入 sudo（寫入 `/var/lib/systemd/linger`）；它會先嘗試不使用 sudo。
    - **Runtime 選擇：** Node（建議；WhatsApp/Telegram 必需）。**不建議**使用 Bun。
    - 如果 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，daemon install 會驗證它，但不會將解析後的明文 token 值保存到 supervisor 服務環境元資料中。
    - 如果 token 驗證需要 token 且設定的 token SecretRef 未解析，daemon install 會被阻擋並提供可採取的指引。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則 daemon install 會被阻擋，直到明確設定模式為止。
  </Step>
  <Step title="Health check">
    - 啟動 Gateway（如需要）並執行 `openclaw health`。
    - 提示：`openclaw status --deep` 會將 gateway 健康探測加入狀態輸出（需要可存取的 gateway）。
  </Step>
  <Step title="Skills (recommended)">
    - 讀取可用的 skills 並檢查需求。
    - 讓您選擇 node 管理員：**npm / pnpm**（不建議使用 bun）。
    - 安裝選用相依項（有些在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="Finish">
    - 摘要 + 後續步驟，包括用於額外功能的 iOS/Android/macOS 應用程式。
  </Step>
</Steps>

<Note>
  如果偵測不到 GUI，onboarding 會印出 Control UI 的 SSH 連接埠轉發指示，而不是開啟瀏覽器。 如果
  Control UI 資產遺失，onboarding 會嘗試建置它們；後備方案是 `pnpm ui:build`（自動安裝 UI 相依項）。
</Note>

## 非互動模式

使用 `--non-interactive` 來自動化或編寫 onboarding 腳本：

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
  `--json` **並不**意味著非互動模式。請針對腳本使用 `--non-interactive`（以及 `--workspace`）。
</Note>

特定供應商的指令範例位於 [CLI Automation](/zh-Hant/start/wizard-cli-automation#provider-specific-examples)。
請使用此參考頁面了解旗標語意和步驟順序。

### 新增代理程式（非互動）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 精靈 RPC

Gateway 透過 RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`) 公開上架流程。
客戶端（macOS app, Control UI）無需重新實作上架邏輯即可呈現步驟。

## Signal 設定 (signal-cli)

上架可以從 GitHub releases 安裝 `signal-cli`：

- 下載適當的 release 資產。
- 將其儲存在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 將 `channels.signal.cliPath` 寫入您的設定。

備註：

- JVM 版本需要 **Java 21**。
- 可用時會使用 Native 版本。
- Windows 使用 WSL2；signal-cli 安裝遵循 WSL 內部的 Linux 流程。

## 精靈寫入的內容

`~/.openclaw/openclaw.json` 中的典型欄位：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` （若選擇 Minimax）
- `tools.profile` （若未設定，本地上架預設為 `"coding"`；保留現有的明確值）
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` （行為詳情：[CLI Setup Reference](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- 當您在提示期間選擇加入時的頻道允許清單 (Slack/Discord/Matrix/Microsoft Teams) （名稡在可能時解析為 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 會寫入 `agents.list[]` 和選用的 `bindings`。

WhatsApp 憑證會放在 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
Session 則儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。

部分通道是以外掛程式形式提供。當您在設定期間選擇其中一個時，入門嚮導會提示您先安裝它（npm 或本機路徑），然後才能進行設定。

## 相關文件

- 入門概述：[Onboarding (CLI)](/zh-Hant/start/wizard)
- macOS 應用程式入門：[Onboarding](/zh-Hant/start/onboarding)
- 設定參考：[Gateway configuration](/zh-Hant/gateway/configuration)
- 提供者：[WhatsApp](/zh-Hant/channels/whatsapp)、[Telegram](/zh-Hant/channels/telegram)、[Discord](/zh-Hant/channels/discord)、[Google Chat](/zh-Hant/channels/googlechat)、[Signal](/zh-Hant/channels/signal)、[BlueBubbles](/zh-Hant/channels/bluebubbles) (iMessage)、[iMessage](/zh-Hant/channels/imessage) (舊版)
- 技能：[Skills](/zh-Hant/tools/skills)、[Skills config](/zh-Hant/tools/skills-config)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
