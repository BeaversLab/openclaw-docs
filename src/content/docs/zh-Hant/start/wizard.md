---
summary: "CLI onboarding: guided setup for gateway, workspace, channels, and skills"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "Onboarding (CLI)"
sidebarTitle: "Onboarding: CLI"
---

# Onboarding (CLI)

CLI onboarding is the **recommended** way to set up OpenClaw on macOS,
Linux, or Windows (via WSL2; strongly recommended).
It configures a local Gateway or a remote Gateway connection, plus channels, skills,
and workspace defaults in one guided flow.

```bash
openclaw onboard
```

<Info>最快首次聊天：開啟控制 UI（無需設定頻道）。執行 `openclaw dashboard` 並在瀏覽器中聊天。文件：[Dashboard](/en/web/dashboard)。</Info>

To reconfigure later:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。對於腳本，請使用 `--non-interactive`。</Note>

<Tip>CLI 入門包含一個網路搜尋步驟，您可以選擇提供者， 例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、 Ollama Web Search、Perplexity、SearXNG 或 Tavily。部分提供者需要 API 金鑰，而其他則不需要。您也可以稍後使用 `openclaw configure --section web` 進行設定。文件：[Web tools](/en/tools/web)。</Tip>

## QuickStart vs Advanced

Onboarding starts with **QuickStart** (defaults) vs **Advanced** (full control).

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本機閘道 (loopback) - 工作區預設值 (或現有工作區) - 閘道連接埠 **18789** - 閘道驗證 **Token** (自動生成，即使在 loopback 上) - 新本機設定的工具原則預設值：`tools.profile: "coding"` (現有明確設定檔會被保留) - DM 隔離預設值：本機入門在未設定時會寫入 `session.dmScope: "per-channel-peer"`。詳細資訊：[CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals) - Tailscale 暴露
    **關閉** - Telegram + WhatsApp DM 預設為 **allowlist** (系統會提示您輸入電話號碼)
  </Tab>
  <Tab title="Advanced (full control)">- 顯示每個步驟 (模式、workspace、gateway、channels、daemon、skills)。</Tab>
</Tabs>

## What onboarding configures

**Local mode (default)** walks you through these steps:

1. **Model/Auth** — 選擇任何支援的提供者/驗證流程（API 金鑰、OAuth 或提供者特定的手動驗證），包括自訂提供者
   (OpenAI 相容、Anthropic 相容或 Unknown 自動偵測)。選擇預設模型。
   安全提示：如果此代理將執行工具或處理 webhook/hooks 內容，請優先選擇可用的最強最新一代模型，並保持嚴格的工具政策。較弱/較舊的層級更容易受到 prompt-injection 攻擊。
   對於非互動式執行，`--secret-input-mode ref` 會將環境變數支援的參照儲存在驗證設定檔中，而不是明文 API 金鑰值。
   在非互動式 `ref` 模式下，必須設定提供者環境變數；如果沒有該環境變數，傳遞內聯金鑰旗標會快速失敗。
   在互動式執行中，選擇密鑰參照模式可讓您指向環境變數或已設定的提供者參照（`file` 或 `exec`），並在儲存前進行快速的預檢驗證。
   對於 Anthropic，互動式入職/設定提供 **Anthropic Claude CLI** 作為本機備援方案，並提供 **Anthropic API 金鑰** 作為建議的生產環境路徑。Anthropic setup-token 也可作為舊版/手動 OpenClaw 路徑再次使用，並帶有 Anthropic 針對 OpenClaw 特定的 **Extra Usage** 計費預期。
2. **Workspace** — 代理檔案的位置（預設 `~/.openclaw/workspace`）。Seeds bootstrap 檔案。
3. **Gateway** — 連接埠、綁定位址、驗證模式、Tailscale 曝光。
   在互動式權杖模式中，選擇預設明文權杖儲存或選用 SecretRef。
   非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** — 內建和附帶的聊天頻道，例如 BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等等。
5. **Daemon (守護程式)** — 安裝 LaunchAgent (macOS)、systemd 使用者單元 (Linux/WSL2)，或原生 Windows 排程任務，並以個別使用者的啟動資料夾作為後備。
   如果 token auth 需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，daemon 安裝程式會驗證它，但不會將解析出的 token 存入 supervisor 服務環境元數據中。
   如果 token auth 需要 token 且設定的 token SecretRef 尚未解析，daemon 安裝程式會被阻擋，並提供可行的指引。
   如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`，且未設定 `gateway.auth.mode`，daemon 安裝程式會被阻擋，直到明確設定 mode 為止。
6. **Health check** — 啟動 Gateway 並驗證其正在執行。
7. **Skills** — 安裝建議的技能和可選的相依性。

<Note>重新執行入門指引**不會**清除任何內容，除非您明確選擇 **Reset (重設)** (或傳遞 `--reset`)。 CLI `--reset` 預設為設定、認證和階段作業；請使用 `--reset-scope full` 以包含工作區。 如果設定無效或包含舊版金鑰，入門指引會要求您先執行 `openclaw doctor`。</Note>

**Remote mode** 僅會設定本地端用戶端以連線到其他位置的 Gateway。
它**不會**安裝或變更遠端主機上的任何內容。

## Add another agent

使用 `openclaw agents add <name>` 建立具有自己的工作區、階段作業和 auth 設定檔的獨立代理程式。不帶 `--workspace` 執行會啟動入門指引。

What it sets:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes:

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳入訊息 (入門指引可以執行此操作)。
- 非互動式旗標：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## Full reference

如需詳細的逐步分解和設定輸出，請參閱
[CLI Setup Reference](/en/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI Automation](/en/start/wizard-cli-automation)。
如需更深入的技術參考，包括 RPC 詳細資訊，請參閱
[Onboarding Reference](/en/reference/wizard)。

## Related docs

- CLI 指令參考：[`openclaw onboard`](/en/cli/onboard)
- 入門指引概覽：[Onboarding Overview](/en/start/onboarding-overview)
- macOS 應用程式入門：[入門](/en/start/onboarding)
- Agent 首次執行程序：[Agent 啟動程序](/en/start/bootstrapping)
