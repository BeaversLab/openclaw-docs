---
summary: "CLI 入門：針對 gateway、workspace、channels 和 skills 的引導式設定"
read_when:
  - 正在執行或設定 CLI 入門
  - 設定新機器
title: "Onboarding (CLI)"
sidebarTitle: "Onboarding: CLI"
---

# 入門 (CLI)

CLI 入門是在 macOS、
Linux 或 Windows（透過 WSL2；強烈建議）上設定 OpenClaw 的**建議**方式。
它會在一個引導式流程中設定本機 Gateway 或遠端 Gateway 連線，以及 channels、skills
和 workspace 預設值。

```bash
openclaw onboard
```

<Info>
  最快速首次聊天：開啟控制 UI（不需要設定 channel）。執行 `openclaw dashboard`
  並在瀏覽器中聊天。文件：[Dashboard](/zh-Hant/web/dashboard)。
</Info>

若要稍後重新設定：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。對於腳本，請使用 `--non-interactive`。</Note>

<Tip>
  CLI 入駐包含一個網路搜尋步驟，您可以在其中選擇一個提供者 (Perplexity、Brave、Gemini、Grok 或 Kimi)
  並貼上您的 API 金鑰，以便代理程式 能夠使用 `web_search`。您也可以稍後使用 `openclaw configure
  --section web` 進行配置。文件：[Web tools](/zh-Hant/tools/web)。
</Tip>

## QuickStart 與 Advanced

入門首先會選擇 **QuickStart**（預設值）與 **Advanced**（完整控制）。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本機閘道 (loopback) - 工作區預設 (或現有工作區) - 閘道連接埠 **18789** - 閘道驗證 **Token**
    (自動產生，即使是在本機上) - 新的本機設定之工具原則預設：`tools.profile: "coding"`
    (現有的明確設定檔會被保留) - DM 隔離預設值：如果未設定，本機導入會寫入 `session.dmScope:
    "per-channel-peer"`。詳情：[CLI Setup
    Reference](/zh-Hant/start/wizard-cli-reference#outputs-and-internals) - Tailscale 暴露功能
    **關閉** - Telegram + WhatsApp DM 預設為 **允許清單** (系統會提示您輸入電話號碼)
  </Tab>
  <Tab title="Advanced (full control)">
    - 公開每個步驟 (模式、工作區、閘道、頻道、守護程序、技能)。
  </Tab>
</Tabs>

## 入門設定的內容

**本機模式 (預設值)** 會引導您完成下列步驟：

1. **Model/Auth（模型/身份驗證）** — 選擇任何支援的提供者/身份驗證流程（API 金鑰、OAuth 或 setup-token），包括自訂提供者
   (OpenAI 相容、Anthropic 相容或 Unknown 自動偵測)。選擇預設模型。
   安全說明：如果此代理程式將執行工具或處理 webhook/hooks 內容，請優先選擇可用的最強最新世代模型，並保持嚴格的工具政策。較弱/舊的層級更容易受到提示注入。
   對於非互動式執行，`--secret-input-mode ref` 會將環境變數支援的參照儲存在 auth profiles 中，而不是明文 API 金鑰值。
   在非互動式 `ref` 模式中，必須設定提供者環境變數；如果沒有該環境變數，傳遞內聯金鑰旗標會快速失敗。
   在互動式執行中，選擇密鑰參照模式可讓您指向環境變數或設定的提供者參照（`file` 或 `exec`），並在儲存前進行快速的飛行前驗證。
2. **Workspace（工作區）** — 代理程式檔案的位置（預設為 `~/.openclaw/workspace`）。Seeds 引導檔案。
3. **Gateway（閘道）** — 連接埠、綁定位址、身份驗證模式、Tailscale 曝露。
   在互動式 token 模式下，選擇預設明文 token 儲存或選擇使用 SecretRef。
   非互動式 token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **通道** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。
5. **Daemon（常駐程式）** — 安裝 LaunchAgent (macOS) 或 systemd 使用者單元 (Linux/WSL2)。
   如果 token 身驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，常駐程式安裝會驗證它，但不會將解析的 token 持久化到監督服務環境元資料中。
   如果 token 身驗證需要 token 且設定的 token SecretRef 未解析，常駐程式安裝會被阻擋並提供可操作的指引。
   如果 `gateway.auth.token` 和 `gateway.auth.password` 都已設定且 `gateway.auth.mode` 未設定，常駐程式安裝會被阻擋，直到明確設定模式。
6. **健康檢查** — 啟動閘道並驗證其正在執行。
7. **技能** — 安裝建議的技能和可選相依元件。

<Note>
  重新執行入門指引**不會**清除任何資料，除非您明確選擇 **Reset**（或傳遞 `--reset`）。 CLI `--reset`
  預設值包含設定、憑證和工作階段；請使用 `--reset-scope full` 來包含工作區。
  如果設定無效或包含舊版金鑰，入門指引會要求您先執行 `openclaw doctor`。
</Note>

**遠端模式**僅設定本地端用戶端以連線到其他位置的 Gateway。
它**不會**安裝或變更遠端主機上的任何內容。

## 新增另一個 agent

使用 `openclaw agents add <name>` 建立具有自己工作區、
工作階段和驗證設定檔的獨立代理程式。在不使用 `--workspace` 的情況下執行會啟動入門指引。

設定項目：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

備註：

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳入訊息（onboarding 可執行此操作）。
- 非互動式標誌：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整參考

如需詳細的逐步分解和設定輸出，請參閱
[CLI 設定參考](/zh-Hant/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI 自動化](/zh-Hant/start/wizard-cli-automation)。
如需更深入的技術參考，包括 RPC 詳細資訊，請參閱
[Onboarding 參考](/zh-Hant/reference/wizard)。

## 相關文件

- CLI 指令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
- Onboarding 概覽：[Onboarding 概覽](/zh-Hant/start/onboarding-overview)
- macOS 應用程式 Onboarding：[Onboarding](/zh-Hant/start/onboarding)
- Agent 首次執行儀式：[Agent Bootstrapping](/zh-Hant/start/bootstrapping)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
