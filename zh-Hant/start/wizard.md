---
summary: "CLI 入門：針對 Gateway、工作區、頻道和技能的引導式設定"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "入門 (CLI)"
sidebarTitle: "入門：CLI"
---

# 入門 (CLI)

CLI 入門是在 macOS、
Linux 或 Windows（透過 WSL2；強烈建議）上設定 OpenClaw 的**推薦**方式。
它會在單一引導流程中設定本機 Gateway 或遠端 Gateway 連線，以及頻道、技能
和工作區預設值。

```bash
openclaw onboard
```

<Info>
  最快速的首次聊天：開啟控制 UI（無需設定頻道）。執行 `openclaw dashboard` 並
  在瀏覽器中聊天。文件：[儀表板](/zh-Hant/web/dashboard)。
</Info>

若要稍後重新設定：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 並不意味著非互動模式。對於腳本，請使用 `--non-interactive`。</Note>

<Tip>
  CLI 入門包含一個網路搜尋步驟，您可以在其中選擇提供商（Perplexity、Brave、 Gemini、Grok 或
  Kimi）並貼上您的 API 金鑰，以便 Agent 可以使用 `web_search`。您也可以 稍後使用 `openclaw configure
  --section web` 進行設定。文件：[網路工具](/zh-Hant/tools/web)。
</Tip>

## QuickStart 與 Advanced

入門首先會選擇 **QuickStart**（預設值）與 **Advanced**（完整控制）。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本機 Gateway (loopback) - 工作區預設值 (或現有工作區) - Gateway 連接埠 **18789** - Gateway
    驗證 **Token** (自動產生，即使在 loopback 上) - 新的本機 設定之工具原則預設值：`tools.profile:
    "coding"` (現有的明確設定檔會被保留) - DM 隔離 預設值：若未設定，本機入門會寫入
    `session.dmScope: "per-channel-peer"`。詳細資訊：[CLI
    設定參考](/zh-Hant/start/wizard-cli-reference#outputs-and-internals) - Tailscale 暴露 **關閉** -
    Telegram + WhatsApp DM 預設為 **allowlist** (系統會提示您輸入電話 號碼)
  </Tab>
  <Tab title="Advanced (full control)">
    - 顯示每個步驟 (模式、工作區、Gateway、頻道、Daemon、技能)。
  </Tab>
</Tabs>

## 入門設定的內容

**本機模式 (預設值)** 會引導您完成下列步驟：

1. **模型/認證** — 選擇任何支援的提供商/認證流程 (API 金鑰、OAuth 或 setup-token)，包括自訂提供商
   (OpenAI 相容、Anthropic 相容或 Unknown 自動偵測)。選擇一個預設模型。
   安全性注意：如果此代理程式將執行工具或處理 webhook/hooks 內容，建議使用可用的最新一代中最強大的模型，並保持嚴格的工具政策。較弱/較舊的層級較容易受到提示注入。
   對於非互動式執行，`--secret-input-mode ref` 會將環境變數支援的參照儲存在認證設定檔中，而不是明文 API 金鑰值。
   在非互動式 `ref` 模式下，必須設定提供商環境變數；如果沒有該環境變數，傳遞內聯金鑰標誌將會快速失敗。
   在互動式執行中，選擇秘密參照模式可讓您指向環境變數或已設定的提供商參照 (`file` 或 `exec`)，並在儲存前進行快速的飛行前驗證。
2. **工作區** — 代理程式檔案的位置 (預設為 `~/.openclaw/workspace`)。植入啟動檔案。
3. **閘道** — 連接埠、綁定位址、認證模式、Tailscale 暴露設定。
   在互動式 Token 模式下，選擇預設明文 Token 儲存或選用 SecretRef。
   非互動式 Token SecretRef 路徑：`--gateway-token-ref-env <ENV_VAR>`。
4. **通道** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。
5. **常駐程式** — 安裝 LaunchAgent (macOS) 或 systemd 使用者單元 (Linux/WSL2)。
   如果 Token 認證需要 Token 且 `gateway.auth.token` 是由 SecretRef 管理，常駐程式安裝會驗證它，但不會將解析後的 Token 保存到監督服務環境中繼資料中。
   如果 Token 認證需要 Token 且設定的 Token SecretRef 未解析，常駐程式安裝將會被阻止，並提供可行的指導。
   如果 `gateway.auth.token` 和 `gateway.auth.password` 都已設定且 `gateway.auth.mode` 未設定，則常駐程式安裝將會被阻止，直到明確設定模式為止。
6. **健康檢查** — 啟動閘道並驗證其正在執行。
7. **技能** — 安裝建議的技能和可選相依元件。

<Note>
  重新執行入門設定並**不會**清除任何內容，除非您明確選擇 **Reset**（或傳遞 `--reset`）。CLI
  `--reset` 預設包含組態、憑證和工作階段；使用 `--reset-scope full`
  以包含工作區。如果組態無效或包含舊版金鑰，入門設定會要求您先執行 `openclaw doctor`。
</Note>

**遠端模式**僅設定本地端用戶端以連接到其他位置的 Gateway。
它**不會**在遠端主機上安裝或變更任何內容。

## 新增另一個 agent

使用 `openclaw agents add <name>` 建立具有自己工作區、工作階段和認證設定檔的獨立 agent。不帶 `--workspace` 執行會啟動入門設定。

設定項目：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

備註：

- 預設工作區遵循 `~/.openclaw/workspace-<agentId>`。
- 新增 `bindings` 以路由傳送傳入訊息（入門設定可以執行此操作）。
- 非互動式標誌：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整參考

如需詳細的逐步分解和組態輸出，請參閱
[CLI Setup Reference](/zh-Hant/start/wizard-cli-reference)。
如需非互動式範例，請參閱 [CLI Automation](/zh-Hant/start/wizard-cli-automation)。
如需更深入的技術參考，包括 RPC 詳細資訊，請參閱
[Onboarding Reference](/zh-Hant/reference/wizard)。

## 相關文件

- CLI 命令參考：[`openclaw onboard`](/zh-Hant/cli/onboard)
- 入門設定概覽：[Onboarding Overview](/zh-Hant/start/onboarding-overview)
- macOS 應用程式入門設定：[Onboarding](/zh-Hant/start/onboarding)
- Agent 首次執行程序：[Agent Bootstrapping](/zh-Hant/start/bootstrapping)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
