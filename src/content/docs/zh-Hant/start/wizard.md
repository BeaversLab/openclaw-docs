---
summary: "CLI 入門：針對 gateway、workspace、channels 和 skills 的引導式設定"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "入門 (CLI)"
sidebarTitle: "入門：CLI"
---

# 入門 (CLI)

CLI 入門是在 macOS、Linux 或 Windows（透過 WSL2；強烈建議）上設定 OpenClaw 的**推薦**方式。
它會在一個引導式流程中設定本機 Gateway 或遠端 Gateway 連線，以及 channels、skills 和 workspace 預設值。

```exec
openclaw onboard
```

<Info>最快進行首次聊天的方式：開啟 Control UI（無需設定 channel）。執行 `openclaw dashboard` 並 在瀏覽器中聊天。文件：[Dashboard](/zh-Hant/web/dashboard)。</Info>

若要稍後重新設定：

```exec
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。針對腳本，請使用 `--non-interactive`。</Note>

<Tip>CLI 入門包含網頁搜尋步驟，您可以在其中選擇提供者（Perplexity、Brave、 Gemini、Grok 或 Kimi）並貼上您的 API 金鑰，以便 agent 能夠使用 `web_search`。您也可以 稍後使用 `openclaw configure --section web` 進行設定。文件：[Web tools](/zh-Hant/tools/web)。</Tip>

## QuickStart 與 Advanced

入門會從 **QuickStart**（預設值）與 **Advanced**（完整控制）開始。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本機 gateway (loopback) - Workspace 預設值 (或現有 workspace) - Gateway 通訊埠 **18789** - Gateway 驗證 **Token** (自動產生，即使在 loopback 上) - 針對新本機 設定的工具原則預設值：`tools.profile: "coding"` (現有的明確設定檔會予以保留) - DM 隔離 預設值：本機入門在未設定時會寫入 `session.dmScope: "per-channel-peer"`。詳細資訊：[CLI Setup
    Reference](/zh-Hant/start/wizard-cli-reference#outputs-and-internals) - Tailscale 暴露 **關閉** - Telegram + WhatsApp DMs 預設為 **allowlist** (系統會提示您輸入您的電話 號碼)
  </Tab>
  <Tab title="Advanced (full control)">- 顯示每個步驟 (模式、workspace、gateway、channels、daemon、skills)。</Tab>
</Tabs>

## 入門設定了什麼

**本機模式 (預設值)** 會引導您完成下列步驟：

1. **Model/Auth** — 選擇任何支援的提供者/驗證流程（API 金鑰、OAuth 或 setup-token），包括自訂提供者
   （OpenAI 相容、Anthropic 相容或未知自動偵測）。選擇一個預設模型。
   安全性備註：如果此代理程式將執行工具或處理 webhook/hooks 內容，請選擇可用的最強最新世代模型，並保持嚴格的工具原則。較弱/舊的世代更容易受到 prompt-inject 攻擊。
   對於非互動式執行，`--secret-input-mode ref` 會在驗證設定檔中儲存環境變數參考，而非純文字 API 金鑰值。
   在非互動式 `ref` 模式下，必須設定提供者環境變數；若在未設定該環境變數的情況下傳遞內聯金鑰旗標，將會快速失敗。
   在互動式執行中，選擇祕密參考模式可讓您指向環境變數或已設定的提供者參考（`file` 或 `exec`），並在儲存前進行快速的飛前驗證。
2. **Workspace** — 代理程式檔案的位置（預設為 `~/.openclaw/workspace`）。植入引導檔案。
3. **Gateway** — 連接埠、綁定位址、驗證模式、Tailscale 暴露。
   在互動式 Token 模式下，選擇預設純文字 Token 儲存或選擇加入 SecretRef。
   非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。
5. **Daemon** — 安裝 LaunchAgent (macOS) 或 systemd user unit (Linux/WSL2)。
   如果 Token 驗證需要 Token 且 `gateway.auth.token` 是由 SecretRef 管理，Daemon 安裝會驗證它，但不會將解析後的 Token 保存到監督服務環境元資料中。
   如果 Token 驗證需要 Token 且設定的 Token SecretRef 未解析，Daemon 安裝將會被阻擋，並提供可執行的指導。
   如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則 Daemon 安裝將被阻擋，直到明確設定模式為止。
6. **Health check** — 啟動 Gateway 並驗證其正在執行。
7. **Skills** — 安裝建議的技能和可選的相依項目。

<Note>重新執行入門嚮導**不會**清除任何內容，除非您明確選擇 **Reset**（或傳遞 `--reset`）。CLI `--reset` 預設為 config、credentials 和 sessions；使用 `--reset-scope full` 以包含 workspace。如果組態無效或包含舊版金鑰，入門嚮導會要求您先執行 `openclaw doctor`。</Note>

**Remote mode** 僅會設定本地客戶端以連接到其他地方的 Gateway。
它**不會**在遠端主機上安裝或變更任何內容。

## 新增另一個代理程式

使用 `openclaw agents add <name>` 建立具有獨立 workspace、
sessions 和 auth 設定檔的個別代理程式。在不帶 `--workspace` 的情況下執行會啟動入門嚮導。

設定項目：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

備註：

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳送傳入訊息（入門嚮導可以執行此操作）。
- 非互動式旗標：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整參考

如需詳細的逐步解析和組態輸出，請參閱
[CLI Setup Reference](/zh-Hant/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI Automation](/zh-Hant/start/wizard-cli-automation)。
如需包含 RPC 詳細資料的更深入技術參考，請參閱
[Onboarding Reference](/zh-Hant/reference/wizard)。

## 相關文件

- CLI 命令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
- 入門總覽：[Onboarding Overview](/zh-Hant/start/onboarding-overview)
- macOS 應用程式入門：[Onboarding](/zh-Hant/start/onboarding)
- Agent 首次執行程序：[Agent Bootstrapping](/zh-Hant/start/bootstrapping)
