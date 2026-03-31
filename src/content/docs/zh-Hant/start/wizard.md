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

<Info>最快首次聊天：打開 Control UI（無需設置通道）。執行 `openclaw dashboard` 並在瀏覽器中聊天。文件：[Dashboard](/en/web/dashboard)。</Info>

To reconfigure later:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。對於腳本，請使用 `--non-interactive`。</Note>

<Tip>CLI 入門導覽包含一個網路搜尋步驟，您可以在其中選擇提供商 （Perplexity、Brave、Gemini、Grok 或 Kimi）並貼上您的 API 金鑰，以便 Agent 能夠使用 `web_search`。您也可以稍後使用 `openclaw configure --section web` 進行配置。文件：[Web tools](/en/tools/web)。</Tip>

## QuickStart vs Advanced

Onboarding starts with **QuickStart** (defaults) vs **Advanced** (full control).

<Tabs>
  <Tab title="快速入門 (預設值)">
    - 本機閘道 (loopback) - 工作區預設值 (或現有工作區) - 閘道連接埠 **18789** - 閘道驗證 **Token** (自動生成，即使是 loopback) - 新本地設定的工具政策預設值：`tools.profile: "coding"` (現有的明確設定檔會被保留) - DM 隔離預設值：本機入門設定若未設定則寫入 `session.dmScope: "per-channel-peer"`。詳情：[CLI 設定參考](/en/start/wizard-cli-reference#outputs-and-internals) - Tailscale 暴露 **關閉** -
    Telegram + WhatsApp DM 預設為 **allowlist** (系統會提示您輸入電話號碼)
  </Tab>
  <Tab title="Advanced (full control)">- 顯示每個步驟 (模式、workspace、gateway、channels、daemon、skills)。</Tab>
</Tabs>

## What onboarding configures

**Local mode (default)** walks you through these steps:

1. **Model/Auth** — 選擇任何支援的供應商/驗證流程 (API 金鑰、OAuth 或 setup-token)，包括自訂供應商
   (OpenAI 相容、Anthropic 相容或 Unknown 自動偵測)。選擇預設模型。
   安全注意：如果此代理程式將執行工具或處理 webhook/hooks 內容，請優先使用可用的最強最新世代模型，並保持嚴格的工具政策。較弱/舊的階層更容易受到 prompt-inject 攻擊。
   對於非互動式執行，`--secret-input-mode ref` 會將 env-backed refs 儲存在 auth profiles 中，而不是明文 API 金鑰值。
   在非互動式 `ref` 模式下，必須設定供應商環境變數；在沒有該環境變數的情況下傳遞內聯金鑰旗標會快速失敗。
   在互動式執行中，選擇秘密參考模式可讓您指向環境變數或已配置的供應商參考 (`file` 或 `exec`)，並在儲存前進行快速飛前驗證。
2. **Workspace** — 代理程式檔案的位置 (預設為 `~/.openclaw/workspace`)。播種啟動檔案。
3. **Gateway** — 埠、綁定位址、驗證模式、Tailscale 曝露。
   在互動式 token 模式下，選擇預設明文 token 儲存或選擇加入 SecretRef。
   非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。
5. **Daemon** — 安裝 LaunchAgent (macOS) 或 systemd 使用者單元 (Linux/WSL2)。
   如果 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，daemon 安裝會驗證它，但不會將解析的 token 持久化到監督服務環境元資料中。
   如果 token 驗證需要 token 且配置的 token SecretRef 未解析，daemon 安裝會被阻止並提供可行的指導。
   如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則 daemon 安裝將被阻止，直到明確設定模式。
6. **Health check** — 啟動 Gateway 並驗證其正在執行。
7. **Skills** — 安裝建議的技能和可選的相依性。

<Note>重新執行入門指引**不會**清除任何內容，除非您明確選擇 **Reset**（或傳遞 `--reset`）。 CLI `--reset` 預設涵蓋組態、憑證和會話；請使用 `--reset-scope full` 以包含工作區。 如果組態無效或包含舊版金鑰，入門指引會要求您先執行 `openclaw doctor`。</Note>

**Remote mode** 僅會設定本地端用戶端以連線到其他位置的 Gateway。
它**不會**安裝或變更遠端主機上的任何內容。

## Add another agent

使用 `openclaw agents add <name>` 來建立擁有自己 workspace、sessions 和 auth 設定檔的獨立 agent。在不帶 `--workspace` 的情況下執行會啟動入門流程。

What it sets:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes:

- 預設的 workspace 會遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳入訊息（入門流程可以執行此操作）。
- 非互動式旗標：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## Full reference

如需詳細的逐步分解與組態輸出，請參閱
[CLI 安裝參考](/en/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI 自動化](/en/start/wizard-cli-automation)。
如需包含 RPC 詳細資料的更深層技術參考，請參閱
[Onboarding 參考](/en/reference/wizard)。

## Related docs

- CLI 指令參考：[`openclaw onboard`](/en/cli/onboard)
- 入門總覽：[Onboarding Overview](/en/start/onboarding-overview)
- macOS 應用程式入門：[Onboarding](/en/start/onboarding)
- Agent 首次執行程序：[Agent Bootstrapping](/en/start/bootstrapping)
