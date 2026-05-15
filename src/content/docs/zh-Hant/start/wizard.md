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

<Info>最快的首次聊天：開啟控制 UI（無需設定頻道）。執行 `openclaw dashboard` 並在瀏覽器中聊天。文件：[Dashboard](/zh-Hant/web/dashboard)。</Info>

若要稍後重新設定：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不暗示非互動模式。對於腳本，請使用 `--non-interactive`。</Note>

<Tip>CLI 入門包含一個網路搜尋步驟，您可以在其中選擇提供者， 例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、 Ollama Web Search、Perplexity、SearXNG 或 Tavily。某些提供者需要 API 金鑰，而其他的則不需要金鑰。您也可以稍後使用 `openclaw configure --section web` 進行設定。文件：[Web tools](/zh-Hant/tools/web)。</Tip>

## QuickStart 與 Advanced

入門從 **QuickStart**（預設值）與 **Advanced**（完整控制）開始。

<Tabs>
  <Tab title="快速入門（預設值）">
    - 本機閘道（loopback）
    - 工作區預設值（或現有工作區）
    - 閘道連接埠 **18789**
    - 閘道驗證 **Token**（自動生成，即使是在 loopback 上）
    - 新增本機設定的工具政策預設值：`tools.profile: "coding"`（現有的明確設定檔會被保留）
    - DM 隔離預設值：當未設定時，本機入門會寫入 `session.dmScope: "per-channel-peer"`。詳細資訊：[CLI 設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **關閉**
    - Telegram + WhatsApp DM 預設為 **允許清單**（系統會提示您輸入電話號碼）

  </Tab>
  <Tab title="進階（完整控制）">
    - 公開每個步驟（模式、工作區、閘道、頻道、守護程式、技能）。

  </Tab>
</Tabs>

## 入門設定的內容

**本機模式 (預設值)** 將引導您完成這些步驟：

1. **模型/認證** — 選擇任何支援的提供者/認證流程（API 金鑰、OAuth 或提供者特定的手動認證），包括自訂提供者
   （OpenAI 相容、Anthropic 相容或未知自動偵測）。選擇一個預設模型。
   安全說明：如果此代理程式將執行工具或處理 webhook/hooks 內容，請選擇可用的最強最新世代模型，並保持嚴格的工具政策。較弱/舊的階層更容易受到提示注入。
   對於非互動式執行，`--secret-input-mode ref` 會在認證設定檔中儲存環境變數支援的參考，而不是純文字 API 金鑰值。
   在非互動式 `ref` 模式下，必須設定提供者環境變數；如果沒有該環境變數，傳遞內聯金鑰旗標會快速失敗。
   在互動式執行中，選擇秘密參考模式可讓您指向環境變數或已設定的提供者參考（`file` 或 `exec`），並在儲存前進行快速事前驗證。
   對於 Anthropic，互動式入門/設定提供 **Anthropic Claude CLI** 作為首選的本機路徑，以及 **Anthropic API 金鑰** 作為推薦的生產路徑。Anthropic 設定令牌也仍可作為支援的令牌認證路徑使用。
2. **工作區** — 代理程式檔案的位置（預設為 `~/.openclaw/workspace`）。植入引導檔案。
3. **閘道** — 連接埠、綁定位址、認證模式、Tailscale 曝光。
   在互動式令牌模式下，選擇預設純文字令牌儲存或選擇加入 SecretRef。
   非互動式令牌 SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **頻道** — 內建及打包的聊天頻道，例如 iMessage、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等等。
5. **Daemon** — 安裝 LaunchAgent (macOS)、systemd 使用者單元 (Linux/WSL2)，或原生 Windows 排程任務，並附帶每個使用者的啟動資料夾備援方案。
   如果 token 驗證需要 token 且 `gateway.auth.token` 由 SecretRef 管理，daemon 安裝程式會驗證它，但不會將解析的 token 保存到 supervisor 服務環境元資料中。
   如果 token 驗證需要 token 且設定的 token SecretRef 未解析，daemon 安裝將會被阻止，並提供可操作的指引。
   如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則會阻擋 daemon 安裝，直到明確設定模式。
6. **Health check** — 啟動 Gateway 並驗證其正在運作。
7. **Skills** — 安裝推薦的技能和可選相依項。

<Note>重新執行上架作業**不會**清除任何內容，除非您明確選擇 **Reset** (或傳遞 `--reset`)。 CLI `--reset` 預設為設定、認證和工作階段；使用 `--reset-scope full` 以包含工作區。 如果設定無效或包含舊版金鑰，上架作業會要求您先執行 `openclaw doctor`。</Note>

**Remote mode** 僅設定本機用戶端以連線到其他位置的 Gateway。
它**不會**安裝或變更遠端主機上的任何內容。

## 新增其他 agent

使用 `openclaw agents add <name>` 建立擁有自己的工作區、
工作階段和認證設定檔的獨立 agent。在不帶 `--workspace` 的情況下執行會啟動上架作業。

設定內容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

備註：

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳入訊息 (上架作業可以執行此操作)。
- 非互動式旗標：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整參考資料

如需詳細的逐步說明和配置輸出，請參閱
[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI 自動化](/zh-Hant/start/wizard-cli-automation)。
如需更深入的技術參考資料，包括 RPC 詳細資訊，請參閱
[Onboarding 參考資料](/zh-Hant/reference/wizard)。

## 相關文件

- CLI 命令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
- Onboarding 概覽：[Onboarding 概覽](/zh-Hant/start/onboarding-overview)
- macOS 應用程式 onboarding：[Onboarding](/zh-Hant/start/onboarding)
- Agent 首次執行程序：[Agent 引導程序](/zh-Hant/start/bootstrapping)
