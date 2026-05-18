---
summary: "CLI onboarding: guided setup for gateway, workspace, channels, and skills"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "Onboarding (CLI)"
sidebarTitle: "Onboarding: CLI"
---

CLI 入門是在 macOS、Linux 或 Windows（透過 WSL2；強烈建議）上設定 OpenClaw 的**推薦**方式。
它會在一個引導流程中設定本機 Gateway 或遠端 Gateway 連線，以及頻道、技能和工作區預設值。

```bash
openclaw onboard
```

## 地區設定

CLI 精靈會將固定的入門說明文字本地化。它會依序解析 `OPENCLAW_LOCALE`、`LC_ALL`、`LC_MESSAGES` 和 `LANG` 來決定地區設定，並回退至英文。支援的精靈地區設定有 `en`、`zh-CN` 和 `zh-TW`。

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

名稱和穩定的識別碼會保持原樣：`OpenClaw`、`Gateway`、`Tailscale`、指令、設定鍵、URL、提供者 ID、模型 ID 和外掛/頻道標籤都不會被翻譯。

<Info>最快的首次聊天方式：開啟控制 UI（無需設定頻道）。執行 `openclaw dashboard` 並在瀏覽器中聊天。文件：[Dashboard](/zh-Hant/web/dashboard)。</Info>

若稍後要重新設定：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。對於腳本，請使用 `--non-interactive`。</Note>

<Tip>CLI 入門包含一個網路搜尋步驟，您可以在其中選擇提供者， 例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、 Ollama Web Search、Perplexity、SearXNG 或 Tavily。有些提供者需要 API 金鑰，而有些則不需要。您也可以稍後使用 `openclaw configure --section web` 進行設定。文件：[Web tools](/zh-Hant/tools/web)。</Tip>

## QuickStart 與 Advanced

入門首先會詢問您要選擇 **QuickStart**（使用預設值）還是 **Advanced**（完全控制）。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本機閘道 (loopback)
    - 工作區預設值 (或現有工作區)
    - 閘道連接埠 **18789**
    - 閘道驗證 **Token** (自動生成，即使在 loopback 上)
    - 新本機設定的工具原則預設值：`tools.profile: "coding"` (保留現有的明確設定檔)
    - DM 隔離預設值：本機導入在未設定時會寫入 `session.dmScope: "per-channel-peer"`。詳細資訊：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **關閉**
    - Telegram + WhatsApp DM 預設為 **允許清單** (系統將提示您輸入電話號碼)

  </Tab>
  <Tab title="Advanced (full control)">
    - 顯示每個步驟 (模式、工作區、閘道、管道、常駐程式、技能)。

  </Tab>
</Tabs>

## 導入設定的內容

**本機模式 (預設)** 會引導您完成以下步驟：

1. **模型/驗證** — 選擇任何支援的提供者/驗證流程 (API 金鑰、OAuth 或提供者特定的手動驗證)，包括自訂提供者
   (OpenAI 相容、Anthropic 相容或未知自動偵測)。選擇預設模型。
   安全性備註：如果此代理程式將執行工具或處理 webhook/hooks 內容，請盡可能選擇最強大的最新世代模型，並保持工具原則嚴格。較弱/舊的階層更容易受到提示注入攻擊。
   對於非互動式執行，`--secret-input-mode ref` 會將環境變數參考儲存在驗證設定檔中，而不是純文字 API 金鑰值。
   在非互動式 `ref` 模式下，必須設定提供者環境變數；如果沒有該環境變數，傳遞內聯金鑰旗標會快速失敗。
   在互動式執行中，選擇秘密參考模式可讓您指向環境變數或已設定的提供者參考 (`file` 或 `exec`)，並在儲存前進行快速飛前驗證。
   對於 Anthropic，互動式導入/設定提供 **Anthropic Claude CLI** 作為首選的本機路徑，並提供 **Anthropic API 金鑰** 作為建議的生產環境路徑。Anthropic 設定權杖 (setup-token) 也仍然可用作支援的權杖驗證路徑。
2. **工作區** — 代理程式檔案的位置 (預設為 `~/.openclaw/workspace`)。植入啟動檔案。
3. **Gateway** — 埠號，綁定地址，驗證模式，Tailscale 曝露。
   在互動式權杖模式下，選擇預設純文字權杖儲存或選擇使用 SecretRef。
   非互動式權杖 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** — 內建和官方外掛聊天頻道，例如 iMessage、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **Daemon** — 安裝 LaunchAgent (macOS)、systemd 使用者單元 (Linux/WSL2) 或原生 Windows 排程任務，並提供每個使用者的啟動資料夾備援方案。
   如果權杖驗證需要權杖且 `gateway.auth.token` 是由 SecretRef 管理，精靈安裝會驗證它，但不會將解析出的權杖保存到監督服務的環境元資料中。
   如果權杖驗證需要權杖且設定的權杖 SecretRef 未解析，精靈安裝會被阻擋並提供可操作的指引。
   如果 `gateway.auth.token` 和 `gateway.auth.password` 都已設定且 `gateway.auth.mode` 未設定，則精靈安裝會被阻擋，直到明確設定模式。
6. **Health check** — 啟動 Gateway 並驗證其正在運作。
7. **Skills** — 安裝推薦的技能和可選相依項。

<Note>重新執行入門設定**不會**清除任何內容，除非您明確選擇 **Reset** (或傳遞 `--reset`)。 CLI `--reset` 預設為設定、憑證和工作階段；使用 `--reset-scope full` 以包含工作區。 如果設定無效或包含舊版金鑰，入門設定會要求您先執行 `openclaw doctor`。</Note>

**Remote mode** 僅設定本地端用戶端以連線到其他地方的 Gateway。
它**不會**在遠端主機上安裝或變更任何內容。

## Add another agent

使用 `openclaw agents add <name>` 建立一個具有自己工作區、
工作階段和驗證設定檔的獨立代理程式。在不使用 `--workspace` 的情況下執行會啟動入門設定。

What it sets:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes:

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳入訊息 (入門設定可以執行此操作)。
- 非互動式標誌：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整參考

如需詳細的逐步分解和設定輸出，請參閱
[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI 自動化](/zh-Hant/start/wizard-cli-automation)。
如需包含 RPC 詳細資訊的更深層技術參考，請參閱
[入門參考](/zh-Hant/reference/wizard)。

## 相關文件

- CLI 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
- 入門概覽：[入門概覽](/zh-Hant/start/onboarding-overview)
- macOS 應用程式入門：[入門](/zh-Hant/start/onboarding)
- Agent 初次執行程序：[Agent 引導程序](/zh-Hant/start/bootstrapping)
