---
summary: "關於 OpenClaw 設定、配置和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對實際部署情境（本地開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答與更深入的疑難排解。若需執行階段診斷，請參閱 [疑難排解](/en/gateway/troubleshooting)。若需完整的組態參考，請參閱 [組態](/en/gateway/configuration)。

## 當發生問題時的前 60 秒

1. **快速狀態（首檢）**

   ```bash
   openclaw status
   ```

   快速本地摘要：OS + 更新、閘道/服務連線性、代理/工作階段、提供者配置 + 執行時期問題（當閘道可連線時）。

2. **可貼上的報告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   唯讀診斷並附上日誌尾部（Token 已編輯）。

3. **Daemon + 連接埠狀態**

   ```bash
   openclaw gateway status
   ```

   顯示監督器執行時期與 RPC 連線性、探測目標 URL，以及服務可能使用的配置。

4. **深度探測**

   ```bash
   openclaw status --deep
   ```

   執行閘道健康檢查 + 提供者探測（需要可連線的閘道）。請參閱 [健康狀態](/en/gateway/health)。

5. **追蹤最新日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕機，請改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱 [日誌記錄](/en/logging) 與 [疑難排解](/en/gateway/troubleshooting)。

6. **執行修復工具（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移組態/狀態並執行健康檢查。請參閱 [Doctor](/en/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   要求執行中的閘道提供完整快照（僅限 WS）。請參閱 [健康狀態](/en/gateway/health)。

## 快速入門與首次執行設置

<AccordionGroup>
  <Accordion title="我卡住了，最快的解脫方法">
    使用一個能**查看您的機器**的本地 AI 代理。這比在 Discord 上提問要有效得多，因為大多數「我卡住了」的情況都是**本地配置或環境問題**，遠端協助者無法檢查這些問題。

    - **Claude Code**：[https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**：[https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取程式庫、執行命令、檢查日誌，並協助修復您的機器級別設定（PATH、服務、權限、認證檔案）。請透過可駭客（git）安裝方式，為它們提供**完整的原始碼副本**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 副本**安裝 OpenClaw，以便代理能讀取程式碼和文件，並針對您執行的確切版本進行推理。您可以稍後透過不帶 `--install-method git` 參數重新執行安裝程式，隨時切換回穩定版本。

    提示：請要求代理**規劃並監督**修復過程（逐步進行），然後僅執行必要的命令。這能保持變動範圍較小，且更容易稽核。

    如果您發現真正的錯誤或修復方法，請在 GitHub 上建立 issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些命令開始（在尋求協助時分享輸出結果）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：閘道/代理健康狀況與基本配置的快速快照。
    - `openclaw models status`：檢查提供者認證與模型可用性。
    - `openclaw doctor`：驗證並修復常見的配置/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯迴圈：[如果出現問題，前 60 秒該做什麼](#first-60-seconds-if-something-is-broken)。
    安裝文件：[安裝](/en/install)、[安裝程式旗標](/en/install/installer)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="安裝和設定 OpenClaw 的推薦方式">
    此儲存庫建議從原始碼執行並使用入門指引：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    精靈也可以自動建構 UI 資產。入門指引完成後，您通常會在連接埠 **18789** 上執行 Gateway。

    從原始碼（貢獻者/開發者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    如果您尚未進行全域安裝，請透過 `pnpm openclaw onboard` 執行。

  </Accordion>

<Accordion title="新手入門後如何開啟儀表板？">精靈會在入門流程結束後立即使用乾淨（未代號化）的儀表板 URL 開啟您的瀏覽器，並在摘要中列印該連結。請保持該分頁開啟；如果未自動開啟，請在同一台機器上複製並貼上列印出來的 URL。</Accordion>

  <Accordion title="如何在本地主機與遠端主機上驗證儀表板（token）？">
    **本地主機（同一台機器）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求驗證，請將 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的 token 貼上到 Control UI 設定中。
    - 從閘道主機取得它：`openclaw config get gateway.auth.token`（或產生一個：`openclaw doctor --generate-gateway-token`）。

    **非本地主機：**

    - **Tailscale Serve**（推薦）：保持繫結 loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份標頭滿足 Control UI/WebSocket 驗證（無 token，假設閘道主機受信任）；HTTP API 仍需要 token/密碼。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`，開啟 `http://<tailscale-ip>:18789/`，將 token 貼上到儀表板設定中。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/` 並將 token 貼上到 Control UI 設定中。

    參閱 [Dashboard](/en/web/dashboard) 和 [Web surfaces](/en/web) 以了解繫結模式和驗證詳情。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    必須使用 Node **>= 22**。建議使用 `pnpm`。Bun **不推薦**用於 Gateway。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上运行吗？">
    是的。Gateway 很轻量 - 文档列出的 **512MB-1GB RAM**、**1 核**以及大约 **500MB**
    磁盘空间足以满足个人使用，并注明 **Raspberry Pi 4 可以运行它**。

    如果你需要额外的预留空间（日志、媒体、其他服务），**推荐 2GB**，但这并不是硬性的最低要求。

    提示：一个小型的 Pi/VPS 可以托管 Gateway，你可以将 **节点** 配对到你的笔记本电脑/手机上，
    用于本地屏幕/摄像头/画布或命令执行。请参阅 [节点](/en/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有任何建議嗎？">
    簡短版本：可以使用，但預期會有一些粗糙之處。

    - 使用 **64 位元** OS 並保持 Node >= 22。
    - 優先選擇 **可破解 的安裝**，這樣您可以查看日誌並快速更新。
    - 不使用 頻道/技能 啟動，然後逐一添加它們。
    - 如果遇到奇怪的二進制問題，通常是一個 **ARM 相容性** 問題。

    文件：[Linux](/en/platforms/linux), [安裝](/en/install)。

  </Accordion>

  <Accordion title="卡在「Wake up my friend」/ 入門設定無法啟動。現在該怎麼辦？">
    該畫面取決於是否能連線並通過 Gateway 的驗證。TUI 也會在首次啟動時自動發送
    「Wake up, my friend!」。如果您看到該行文字但**沒有回應**，
    且 token 數量維持在 0，則表示 Agent 從未執行。

    1. 重新啟動 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 檢查狀態與驗證：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然卡住，請執行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠端的，請確認 tunnel/Tailscale 連線正常，且 UI
    指向正確的 Gateway。請參閱 [Remote access](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我可以將我的設定遷移到新機器 (Mac mini) 而無需重新進入入門流程嗎？">
    可以。複製 **state 目錄** 和 **workspace (工作區)**，然後執行一次 Doctor。這能
    讓您的機器人保持「完全相同」(記憶體、會話歷史、驗證和頻道
    狀態)，前提是您複製了**這兩個**位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR` (預設： `~/.openclaw`)。
    3. 複製您的工作區 (預設： `~/.openclaw/workspace`)。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、驗證設定檔、WhatsApp 憑證、會話和記憶體。如果您處於
    遠端模式，請記住 Gateway 主機擁有會話儲存和工作區。

    **重要提示：** 如果您只將工作區 commit/push 到 GitHub，您備份的是
    **記憶體 + 引導檔案**，但**不包含**會話歷史或驗證資料。這些資料存在於
    `~/.openclaw/` 之下 (例如 `~/.openclaw/agents/<agentId>/sessions/`)。

    相關主題： [遷移](/en/install/migrating)、 [磁碟上的檔案位置](#where-things-live-on-disk)、
    [Agent 工作區](/en/concepts/agent-workspace)、 [Doctor](/en/gateway/doctor)、
    [遠端模式](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以看到最新版本的新內容？">
    查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部部分標記為 **Unreleased**，則下一個帶有日期的部分是最新發布的版本。條目按 **Highlights**、**Changes** 和 **Fixes** 分組（以及需要的時候包含 docs/other 部分）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai (SSL 錯誤)">
    部分 Comcast/Xfinity 連線會透過 Xfinity 進階安全性錯誤封鎖 `docs.openclaw.ai`。請停用該功能或將 `docs.openclaw.ai` 加入允許清單，然後重試。
    請透過此處回報協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍無法存取該網站，文件已在 GitHub 上建立鏡像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 與 Beta 的區別">
    **Stable** 和 **beta** 是 **npm dist-tags**，而不是獨立的程式碼行：

    - `latest` = stable
    - `beta` = 用於測試的早期版本

    我們將版本發佈到 **beta**，進行測試，一旦版本穩定，我們就會將其**推廣至 `latest`**。這就是為什麼 beta 和 stable 可能指向**相同版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="如何安裝 beta 版本？beta 和 dev 有什麼區別？">
    **Beta** 是 npm dist-tag `beta`（可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的移動頭部；發佈時，它使用 npm dist-tag `dev`。

    單行指令：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳情：[Development channels](/en/install/development-channels) 和 [Installer flags](/en/install/installer)。

  </Accordion>

  <Accordion title="如何嘗試最新版本？">
    有兩個選項：

    1. **Dev channel (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從源碼更新。

    2. **Hackable install (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本機 repo，然後透過 git 更新。

    如果您喜歡手動進行乾淨的 clone，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[Update](/en/cli/update), [Development channels](/en/install/development-channels),
    [Install](/en/install)。

  </Accordion>

  <Accordion title="安裝和上手通常需要多久時間？">
    概略指南：

    - **安裝：** 2-5 分鐘
    - **上手：** 5-15 分鐘，視您設定的頻道/模型數量而定

    如果過程停滯，請使用 [安裝程式停滯](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速除錯迴圈。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多反饋？">
    使用 **詳細輸出** 重新執行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用詳細輸出的 Beta 安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    對於可修改 的安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows (PowerShell) 等效指令：

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多選項：[Installer flags](/en/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝程式顯示找不到 git 或無法識別 openclaw">
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / git not found**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 環境變數中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法識別 openclaw**

    - 您的 npm 全域 bin 資料夾不在 PATH 環境變數中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增至您的使用者 PATH 環境變數（Windows 上不需要 `\bin` 後綴；在大多數系統上它是 `%AppData%\npm`）。
    - 更新 PATH 後，關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定體驗，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/en/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec output shows garbled Chinese text - what should I do?">
    這通常是在原生 Windows Shell 上主控台字碼頁（code page）不符所導致的。

    症狀：

    - `system.run`/`exec` 輸出將中文渲染為亂碼
    - 同樣的指令在另一個終端機設定檔中看起來正常

    在 PowerShell 中的快速解決方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然後重新啟動 Gateway 並重試您的指令：

    ```powershell
    openclaw gateway restart
    ```

    如果您在最新版的 OpenClaw 上仍然遇到此問題，請在以下位置追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件沒有回答我的問題 - 我如何獲得更好的答案？">
    使用 **可駭客式安裝** 這樣您就可以在本地擁有完整的源代碼和文檔，然後
    在該文件夾中詢問您的機器人（或 Claude/Codex），以便它可以讀取倉庫並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/en/install) 和 [安裝程序標誌](/en/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝 OpenClaw？">
    簡短回答：按照 Linux 指南操作，然後運行入門引導。

    - Linux 快速路徑 + 服務安裝：[Linux](/en/platforms/linux)。
    - 完整演練：[入門](/en/start/getting-started)。
    - 安裝程序 + 更新：[安裝與更新](/en/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 均可。在伺服器上安裝，然後使用 SSH/Tailscale 連線到 Gateway。

    指南：[exe.dev](/en/install/exe-dev)、[Hetzner](/en/install/hetzner)、[Fly.io](/en/install/fly)。
    遠端存取：[Gateway remote](/en/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見供應商的**託管中心 (hosting hub)**。選擇其中一個並按照指南操作：

    - [VPS 託管](/en/vps) (所有供應商一網打盡)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    雲端運作方式：**Gateway 在伺服器上運行**，您可以透過控制 UI（或 Tailscale/SSH）從筆記型電腦/手機存取它。您的狀態和工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將**節點**（Mac/iOS/Android/headless）配對到該雲端 Gateway，以存取本機螢幕/相機/畫布或在筆記型電腦上執行命令，同時將 Gateway 保留在雲端。

    中心：[平台](/en/platforms)。遠端存取：[Gateway 遠端](/en/gateway/remote)。
    節點：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自己嗎？">
    簡短回答：**可行，但不建議**。更新流程可能會重新啟動
    Gateway（這會中斷活動連線）、可能需要乾淨的 git checkout，並且
    可能會提示進行確認。更安全的做法：以操作員身分從 shell 執行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必須從代理程式自動化：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文件：[更新](/en/cli/update)、[正在更新](/en/install/updating)。

  </Accordion>

  <Accordion title="入門流程實際上做什麼？">
    `openclaw onboard` 是建議的設定途徑。在 **本機模式** 中，它會引導您完成：

    - **模型/驗證設定**（支援提供者 OAuth/設定 token 流程和 API 金鑰，加上本機模型選項如 LM Studio）
    - **工作區** 位置 + 引導檔案
    - **Gateway 設定**（bind/port/auth/tailscale）
    - **提供者**（WhatsApp、Telegram、Discord、Mattermost (外掛)、Signal、iMessage）
    - **常駐程式安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 使用者單元）
    - **健康檢查** 和 **技能** 選擇

    如果您設定的模型未知或缺少驗證，它也會發出警告。

  </Accordion>

  <Accordion title="執行此工具需要 Claude 或 OpenAI 訂閱嗎？">
    不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或 **僅限本地的模型** 來執行 OpenClaw，讓您的資料留在您的裝置上。訂閱（Claude Pro/Max 或 OpenAI Codex）只是用來驗證這些提供者的選擇性方式。

    如果您選擇使用 Anthropic 的訂閱驗證，請自行決定是否使用：
    Anthropic 在過去曾封鎖 Claude Code 以外的一些訂閱使用。
    OpenAI Codex OAuth 明確支援像 OpenClaw 這樣的外部工具。

    文件：[Anthropic](/en/providers/anthropic), [OpenAI](/en/providers/openai),
    [本機模型](/en/gateway/local-models), [模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    可以。您可以使用 **setup-token**（設定令牌）或在閘道主機上重用本地的 **Claude CLI**
    登入。

    Claude Pro/Max 訂閱 **不包含 API 金鑰**，因此這是訂閱帳戶的技術途徑。但這取決於您的決定：Anthropic
    過去曾阻止部分在 Claude Code 之外的訂閱使用。
    如果您想要生產環境中最清晰且最安全的支援途徑，請使用 Anthropic API 金鑰。

  </Accordion>

<Accordion title="Anthropic setup-token 驗證如何運作？">
  `claude setup-token` 透過 Claude Code CLI 產生一個 **token 字串**（在網頁主控台無法使用）。您可以在 **任何機器** 上執行它。在入會設定中選擇 **Anthropic token (貼上 setup-token)**，或使用 `openclaw models auth paste-token --provider anthropic` 貼上。該 token 會以驗證設定檔的形式儲存給 **anthropic** 提供者，並像 API 金鑰一樣使用（不會自動更新）。更多細節：[OAuth](/en/concepts/oauth)。
</Accordion>

  <Accordion title="我可以在哪裡找到 Anthropic 設定權杖？">
    它**並不**在 Anthropic Console 中。設定權杖是由 **Claude Code CLI** 在**任何機器**上產生的：

    ```bash
    claude setup-token
    ```

    複製它顯示的權杖，然後在引導流程中選擇 **Anthropic token (paste setup-token)**。如果您想在閘道主機上執行，請使用 `openclaw models auth setup-token --provider anthropic`。如果您在別處執行了 `claude setup-token`，請將其貼上到閘道主機，方法是使用 `openclaw models auth paste-token --provider anthropic`。請參閱 [Anthropic](/en/providers/anthropic)。

  </Accordion>

  <Accordion title="您是否支援 Claude 訂閱驗證（Claude Pro 或 Max）？">
    是的，您可以：

    - 使用 **setup-token**
    - 在閘道主機上重複使用本地的 **Claude CLI** 登入，使用 `openclaw models auth login --provider anthropic --method cli --set-default`

    Setup-token 仍然受支援。當閘道主機已經執行 Claude Code 時，Claude CLI 的遷移會更簡單。請參閱 [Anthropic](/en/providers/anthropic) 和 [OAuth](/en/concepts/oauth)。

    重要提示：這僅代表技術上的相容性，並非政策保證。Anthropic 過去曾在 Claude Code 以外封鎖部分訂閱的使用。
    您需要自行決定是否使用並確認 Anthropic 的當前條款。
    對於生產環境或多使用者工作負載，Anthropic API 金鑰驗證是更安全、更推薦的選擇。

  </Accordion>

  <Accordion title="為什麼我會看到來自 Anthropic 的 HTTP 429 rate_limit_error？">
    這表示您目前的時間視窗內 **Anthropic 配額/速率限制** 已用盡。如果您使用的是 **Claude 訂閱** (setup-token)，請等待視窗重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 的使用量/帳單狀況，並視需要提高限制。

    如果訊息具體是：
    `Extra usage is required for long context requests`，則表示請求正在嘗試使用
    Anthropic 的 1M 上下文測試版 (`context1m: true`)。這僅在您的憑證符合長上下文計費資格時才有效（API 金鑰計費或啟用了額外使用量的訂閱）。

    提示：設定一個 **後備模型**，以便在供應商受到速率限制時，OpenClaw 仍能繼續回覆。
    請參閱 [模型](/en/cli/models)、[OAuth](/en/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="支援 AWS Bedrock 嗎？">是的 - 透過 pi-ai 的 **Amazon Bedrock (Converse)** 提供者並使用 **手動設定**。您必須在閘道主機上提供 AWS 憑證/區域，並在您的模型設定中新增 Bedrock 提供者項目。請參閱 [Amazon Bedrock](/en/providers/bedrock) 和 [Model providers](/en/providers/models)。如果您更偏好託管金鑰流程，在 Bedrock 前方部署一個 OpenAI 相容的代理仍然是一個可行的選項。</Accordion>

<Accordion title="Codex 驗證如何運作？">OpenClaw 支援透過 OAuth (ChatGPT 登入) 使用 **OpenAI Code (Codex)**。引導流程可以執行 OAuth 流程，並在適當時將預設模型設定為 `openai-codex/gpt-5.4`。請參閱 [模型供應商](/en/concepts/model-providers) 和 [引導流程 (CLI)](/en/start/wizard)。</Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在 OpenClaw 這類外部工具/工作流程中使用訂閱 OAuth。
    入門程式 (Onboarding) 可以為您執行 OAuth 流程。

    請參閱 [OAuth](/en/concepts/oauth)、[模型供應商](/en/concepts/model-providers) 和 [入門程式 (CLI)](/en/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **外掛程式驗證流程**，而不是在 `openclaw.json` 中使用用戶端 ID 或金鑰。

    步驟：

    1. 啟用外掛程式：`openclaw plugins enable google`
    2. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳細資訊：[模型供應商](/en/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型適合隨意聊天嗎？">通常不適合。OpenClaw 需要大量的上下文 + 強大的安全性；小型顯卡會導致截斷和洩漏。如果您必須使用，請在本地（LM Studio）運行您能運行的**最大**的 MiniMax M2.5 版本，並參閱 [/gateway/local-models](/en/gateway/local-models)。較小/量化模型會增加提示注入風險 - 請參閱 [Security](/en/gateway/security)。</Accordion>

<Accordion title="我如何將託管模型流量保留在特定區域？">選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管選項；選擇美國託管的變體以將數據保留在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些服務一起列出，以便在尊重您選擇的區域提供商的同時保持備用可用性。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（透過 WSL2 的 Windows）上運行。Mac mini 是可選的——有些人會購買一台作為全天候運行的主機，但小型 VPS、家庭伺服器或樹莓派級別的設備也可以。

    您只有在需要**僅限 macOS 的工具**時才需要 Mac。對於 iMessage，請使用 [BlueBubbles](/en/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可在任何 Mac 上運行，而 Gateway 可以在 Linux 或其他地方運行。如果您需要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/en/channels/bluebubbles)、[節點](/en/nodes)、[Mac 遠端模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="支援 iMessage 是否需要 Mac mini？">
    您需要**已登入 Messages 的某台 macOS 裝置**。它**不必**是 Mac mini——
    任何 Mac 都可以。**請使用 [BlueBubbles](/en/channels/bluebubbles)**（推薦）來使用 iMessage —— BlueBubbles 伺服器執行於 macOS 上，而 Gateway 則可以執行於 Linux 或其他地方。

    常見設定：

    - 在 Linux/VPS 上執行 Gateway，並在任意已登入 Messages 的 Mac 上執行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請將所有東西都執行在 Mac 上。

    文件：[BlueBubbles](/en/channels/bluebubbles)、[節點](/en/nodes)、
    [Mac 遠端模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買一台 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為
    **節點**（companion device）連線。節點不執行 Gateway——它們提供
    該裝置上的額外功能，例如螢幕/相機/畫布和 `system.run`。

    常見模式：

    - Gateway 位於 Mac mini 上（始終開啟）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並與 Gateway 配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    **不建議**使用 Bun。我們發現執行時期錯誤，特別是在 WhatsApp 和 Telegram 方面。
    請使用 **Node** 以獲得穩定的 Gateway。

    如果您仍想嘗試使用 Bun，請在非生產環境的 Gateway 上進行，
    且不要包含 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram: allowFrom 應填什麼？">
    `channels.telegram.allowFrom` 是 **人類發送者的 Telegram 使用者 ID**（數字）。這不是機器人的使用者名稱。

    入職指引接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

    更安全（無第三方機器人）：

    - 私訊你的機器人，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊你的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（較不私密）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    見 [/channels/telegram](/en/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以透過不同的 OpenClaw 實例使用同一個 WhatsApp 號碼嗎？">
  可以，透過**多代理程式路由**。將每個發送者的 WhatsApp **私訊 (DM)**（對等節點 `kind: "direct"`，發送者 E.164 例如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能擁有自己的工作區和會話儲存空間。回覆仍然來自**同一個 WhatsApp 帳戶**，且私訊存取控制 (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) 是針對每個 WhatsApp 帳戶全域設定的。請參閱
  [多代理程式路由](/en/concepts/multi-agent) 和 [WhatsApp](/en/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行一個「快速聊天」代理和一個「用於編碼的 Opus」代理嗎？">可以。使用多代理路由：為每個代理分配其自己的預設模型，然後將入站路由（提供者帳戶或特定對等端）綁定到每個代理。範例配置位於 [多代理路由](/en/concepts/multi-agent) 中。另請參閱 [模型](/en/concepts/models) 和 [配置](/en/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    是的。Homebrew 支援 Linux (Linuxbrew)。快速設定如下：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或您的 brew 前綴)，以便 `brew` 安裝的工具在非登入 shell 中能被解析。
    近期的版本也會在 Linux systemd 服務中預先加入常見的使用者 bin 目錄 (例如 `~/.local/bin`、 `~/.npm-global/bin`、 `~/.local/share/pnpm`、 `~/.bun/bin`)，並在設定時遵從 `PNPM_HOME`、 `NPM_CONFIG_PREFIX`、 `BUN_INSTALL`、 `VOLTA_HOME`、 `ASDF_DATA_DIR`、 `NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可駭改的 git 安裝與 npm 安裝之間的區別">
    - **可駭改安裝：** 完整的原始碼檢出，可編輯，最適合貢獻者。
      您在本地建構並可以修補程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無程式庫，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[入門指南](/en/start/getting-started)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="我可以稍後在 npm 和 git 安裝之間切換嗎？">
    可以。安裝另一個版本，然後運行 Doctor，以便網關服務指向新的入口點。
    這**不會刪除您的數據**——它僅更改 OpenClaw 代碼安裝。您的狀態
    (`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 保持不變。

    從 npm 到 git：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    從 git 到 npm：

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor 會檢測到網關服務入口點不匹配，並提議重寫服務配置以匹配當前安裝（在自動化中使用 `--repair`）。

    備份提示：請參閱 [Backup strategy](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦還是 VPS 上執行 Gateway？">
    簡短回答：**如果您需要 24/7 的可靠性，請使用 VPS**。如果您希望
    運作最順暢且不介意休眠/重啟，則在本地執行。

    **筆記型電腦（本機 Gateway）**

    - **優點：** 無伺服器成本，可直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 休眠/網路斷線 = 連線中斷，OS 更新/重開機會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠在線，網路穩定，無筆電休眠問題，更容易保持運作。
    - **缺點：** 通常以無頭模式執行（使用螢幕截圖），只能遠端存取檔案，您必須透過 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost（外掛）/Discord 都可以在 VPS 上正常運作。唯一的真正取捨是 **無頭瀏覽器** 與可見視窗的差異。請參閱 [瀏覽器](/en/tools/browser)。

    **建議預設值：** 如果您之前曾遇到 Gateway 連線中斷，請選擇 VPS。當您積極使用 Mac 且想要本機檔案存取或使用可見瀏覽器進行 UI 自動化時，本地執行非常棒。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必須，但**為了可靠性和隔離性建議使用**。

    - **專用主機 (VPS/Mac mini/Pi):** 永遠在線，較少因休眠/重啟而中斷，權限設定更乾淨，更容易保持執行。
    - **共用的筆記型電腦/桌面電腦:** 非常適合測試和主動使用，但當電腦休眠或更新時預料會有暫停現象。

    如果您想要兩全其美，請將 Gateway 保留在專用主機上，並將您的筆記型電腦配對為本地螢幕/相機/執行工具的**節點 (node)**。請參閱 [節點](/en/nodes)。
    如需安全性指導，請閱讀 [安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 需求與推薦作業系統為何？">
    OpenClaw 是輕量級的。對於基本的 Gateway 加上一個聊天頻道：

    - **絕對最低需求：** 1 vCPU、1GB RAM、約 500MB 磁碟空間。
    - **推薦配置：** 1-2 vCPU，2GB RAM 或以上以保留餘裕（日誌、媒體、多個頻道）。Node 工具與瀏覽器自動化可能較耗費資源。

    作業系統：請使用 **Ubuntu LTS**（或任何現代 Debian/Ubuntu）。Linux 安裝路徑在該環境下測試最為完善。

    文件：[Linux](/en/platforms/linux)、[VPS 託管](/en/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中運行 OpenClaw 嗎？有哪些需求？">
    可以。將 VM 視為與 VPS 相同：它需要保持運作、可被連線，並且有足夠的
    RAM 供閘道以及您啟用的任何通道使用。

    基準指南：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議：** 2GB RAM 或更多，如果您執行多個通道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代的 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，且具有最佳的工具
    相容性。請參閱 [Windows](/en/platforms/windows)、[VPS 託管](/en/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/en/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話描述 OpenClaw 是什麼？">
    OpenClaw 是您在自己的裝置上執行的個人 AI 助理。它會在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost (plugin)、Discord、Google Chat、Signal、iMessage、WebChat），並且可以在支援的平台上進行語音和即時 Canvas 操作。**Gateway** 是永遠在線的控制平面；而助理則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的封裝」。它是一個**本地優先的控制平面**，讓您能夠在**您自己的硬體**上
    執行一個強大的助理，您可以從已經使用的聊天應用程式存取它，並具備
    有狀態的工作階段、記憶和工具——而無需將您的工作流程控制權交給
    託管的 SaaS。

    亮點：

    - **您的裝置，您的資料：** 在您想要的任何地方執行 Gateway（Mac、Linux、VPS），並將
      工作空間 + 工作階段記錄保留在本機。
    - **真實的頻道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，
      加上支援平台上的行動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並具備每個代理的路由
      和容錯移轉。
    - **僅限本機選項：** 執行本機模型，因此**如果您願意，所有資料都可以保留在您的裝置上**。
    - **多代理路由：** 每個頻道、帳戶或任務使用獨立的代理，每個代理都有自己的
      工作空間和預設值。
    - **開源且可駭客化：** 檢查、擴展和自我託管，而無供應商鎖定。

    文件：[Gateway](/en/gateway)、[Channels](/en/channels)、[Multi-agent](/en/concepts/multi-agent)、
    [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="I just set it up - what should I do first?">
    適合的入門專案：

    - 建立網站（WordPress、Shopify 或簡單的靜態網站）。
    - 原型設計行動應用程式（大綱、畫面、API 計畫）。
    - 整理檔案和資料夾（清理、命名、標記）。
    - 連結 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將其分為幾個階段並使用子代理進行並行工作時，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常使用案例是什麼？">
    日常的應用場景通常包括：

    - **個人簡報：** 您關心的收件箱、日曆和新聞摘要。
    - **研究與草稿：** 快速研究、摘要，以及電子郵件或文件的初稿。
    - **提醒與跟進：** 由 cron 或心跳驅動的提醒和檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集數據和重複的網頁任務。
    - **跨設備協調：** 從手機發送任務，讓 Gateway 在伺服器上運行，並在聊天中獲取結果。

  </Accordion>

  <Accordion title="OpenClaw 能否協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格營運？">
    在**研究、篩選和草擬**方面可以。它可以掃描網站、建立清單、
    總結潛在客戶，並撰寫外聯或廣告文案草稿。

    針對**外聯或廣告投放**，請保留人工監管。避免垃圾訊息，遵守當地法律和
    平台政策，並在發送前審查所有內容。最安全的模式是讓
    OpenClaw 草擬，由您來審批。

    文件：[安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code 用於網頁開發有什麼優勢？">
    OpenClaw 是一個 **個人助理** 和協調層，而非 IDE 的替代品。使用
    Claude Code 或 Codex 以在 repo 內獲得最快的直接編碼循環。當您
    需要持久的記憶、跨裝置存取和工具編排時，請使用 OpenClaw。

    優勢：

    - **跨工作階段的持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具編排**（瀏覽器、檔案、排程、hooks）
    - **永遠線上的 Gateway**（在 VPS 上運行，從任何地方互動）
    - 用於本地瀏覽器/螢幕/相機/exec 的 **節點**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何自訂技能而不弄髒 repo？">
    使用受管覆寫（managed overrides）而不是編輯 repo 副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增資料夾）。優先順序是 `<workspace>/skills` > `~/.openclaw/skills` > bundled，因此受管覆寫會勝出而無需觸及 git。只有值得上游合併的編輯才應該存在於 repo 中並以 PR 的形式送出。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增額外目錄（優先順序最低）。預設優先順序維持不變：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝至 `./skills`，OpenClaw 在下一次工作階段會將其視為 `<workspace>/skills`。
  </Accordion>

  <Accordion title="我如何針對不同的任務使用不同的模型？">
    目前支援的模式有：

    - **Cron jobs**：隔離的工作可以為每個工作設定 `model` 覆蓋值。
    - **Sub-agents**：將任務路由到具有不同預設模型的個別代理程式。
    - **On-demand switch**：使用 `/model` 隨時切換目前的工作階段模型。

    參閱 [Cron jobs](/en/automation/cron-jobs)、[Multi-Agent Routing](/en/concepts/multi-agent) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在進行繁重工作時會凍結。我該如何卸載這些工作？">
    對於長時間或並行任務，請使用 **sub-agents**（子代理）。子代理在自己的會話中運行，
    返回摘要，並保持您的主聊天響應。

    要求您的機器人「為此任務產生一個子代理」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看 Gateway 現在正在做什麼（以及它是否正忙）。

    Token 提示：長時間任務和子代理都會消耗 token。如果成本是一個問題，請通過 `agents.defaults.subagents.model` 為子代理設置更便宜的模型。

    文檔：[Sub-agents](/en/tools/subagents)。

  </Accordion>

  <Accordion title="Discord 上的線程綁定子代理會話是如何運作的？">
    使用線程綁定。您可以將 Discord 線程綁定到子代理或會話目標，以便該線程中的後續訊息保持在該綁定會話上。

    基本流程：

    - 使用 `sessions_spawn` 透過 `thread: true` 產生（並可選擇使用 `mode: "session"` 進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離線程。

    所需配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆蓋值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 產生時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[子代理](/en/tools/subagents)、[Discord](/en/channels/discord)、[配置參考](/en/gateway/configuration-reference)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我應該檢查什麼？">
    Cron 在 Gateway 程序內運行。如果 Gateway 未持續運行，
    排程的工作將不會執行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否 24/7 運行（無休眠/重啟）。
    - 驗證工作的時區設定 (`--tz` 與主機時區的對比)。

    除錯：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron jobs](/en/automation/cron-jobs)、[Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝技能？">
    使用原生 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
    在 [https://clawhub.com](https://clawhub.com) 瀏覽技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    僅當您想要發佈或同步您自己的技能時，才安裝獨立的 `clawhub` CLI。

  </Accordion>

  <Accordion title="OpenClaw 可以按計畫執行任務或在後台連續執行嗎？">
    是的。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後仍保留）。
    - **Heartbeat** 用於「主會話」定期檢查。
    - **Isolated jobs** 用於發送摘要或傳送訊息至聊天的自主代理程式。

    文件：[Cron jobs](/en/automation/cron-jobs)、[Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)、
    [Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅限 Apple macOS 的技能嗎？">
    無法直接執行。macOS 技能受到 `metadata.openclaw.os` 加上所需執行檔的限制，而且只有在 **Gateway 主機**上符合資格時，這些技能才會出現在系統提示詞中。在 Linux 上，除非您覆寫限制，否則 `darwin` 專屬技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在 macOS 執行檔存在的位置執行 Gateway，然後從 Linux 透過[遠端模式](#gateway-ports-already-running-and-remote-mode)或 Tailscale 進行連線。因為 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無需 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在所需的執行檔時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。Agent 會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示詞中核准「Always Allow」會將該指令加入允許清單。

    **選項 C - 透過 SSH 代理 macOS 執行檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓所需的 CLI 執行檔解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為執行檔建立 SSH 包裝程式（例如：針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放置在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆寫技能中繼資料（workspace 或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動新的工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="您有 Notion 或 HeyGen 整合功能嗎？">
    目前尚未內建。

    選項：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion 和 HeyGen 都有 API）。
    - **瀏覽器自動化：** 無需程式碼即可運作，但速度較慢且較不穩定。

    如果您希望針對每個客戶保留情境（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（情境 + 偏好設定 + 進行中的工作）。
    - 要求代理程式在工作階段開始時擷取該頁面。

    如果您想要原生整合，請開啟功能請求或建構一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放置在現行工作區 `skills/` 目錄中。若要跨代理程式共用技能，請將其放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能預期會安裝透過 Homebrew 安裝的二進位檔案；在 Linux 上這代表 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/en/tools/skills) 和 [ClawHub](/en/tools/clawhub)。

  </Accordion>

  <Accordion title="如何使用我現有已登入的 Chrome 與 OpenClaw？">
    使用內建的 `user` 瀏覽器設定檔，其透過 Chrome DevTools MCP 進行連接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑為主機本機路徑。如果 Gateway 在其他地方運作，請在瀏覽器機器上執行節點主機，或者改用遠端 CDP。

  </Accordion>
</AccordionGroup>

## 沙盒與記憶體

<AccordionGroup>
  <Accordion title="是否有專門的沙盒文件？">
    有的。請參閱 [Sandboxing](/en/gateway/sandboxing)。關於 Docker 特定設定（Docker 中的完整 Gateway 或沙盒映像檔），請參閱 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺功能受限 - 如何啟用完整功能？">
    預設映像檔以安全為優先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以留存。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依性打包至映像檔中。
    - 透過隨附的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/en/install/docker)、[Browser](/en/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持 DM 私人化，但使用一個代理將群組設為公開/沙盒化嗎？">
    可以 - 如果您的私人流量是 **DM** 而您的公開流量是 **groups**。

    使用 `agents.defaults.sandbox.mode: "non-main"` 以便群組/頻道會話（非主金鑰）在 Docker 中執行，而主 DM 會話保持在主機上。然後透過 `tools.sandbox.tools` 限制沙盒化會話中可用的工具。

    設定指南 + 範例配置：[Groups: personal DMs + public groups](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    關鍵配置參考：[Gateway configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="如何將主機資料夾綁定到沙盒中？">
  將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]` (例如，`"/home/user/src:/src:ro"`)。全域 + 每個代理程式的綁定會合併；當 `scope: "shared"` 時，會忽略每個代理程式的綁定。針對任何敏感內容請使用 `:ro`，並記得綁定會繞過沙盒檔案系統防護。請參閱 [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs
  Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全提示。
</Accordion>

  <Accordion title="記憶是如何運作的？">
    OpenClaw 的記憶只是代理工作區中的 Markdown 檔案：

    - 位於 `memory/YYYY-MM-DD.md` 的每日筆記
    - 位於 `MEMORY.md` 的精選長期筆記（僅限主要/私人工作階段）

    OpenClaw 也會執行 **靜默預壓縮記憶清除**，以提醒模型
    在自動壓縮之前寫入持久筆記。這僅在工作區
    可寫入時執行（唯讀沙箱會跳過此步驟）。參閱 [記憶](/en/concepts/memory)。

  </Accordion>

  <Accordion title="記憶一直忘記事情。我該如何讓它記住？">
    請要求機器人**將事實寫入記憶**。長期筆記屬於 `MEMORY.md`，
    短期上下文則放入 `memory/YYYY-MM-DD.md`。

    這仍然是我們正在改進的領域。提醒模型儲存記憶會有幫助；
    它會知道該做什麼。如果它持續忘記，請驗證 Gateway 在每次執行時都使用相同的
    工作區。

    文件：[記憶](/en/concepts/memory)、[Agent 工作區](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶體會永久保存嗎？有什麼限制？">
    記憶體檔案存在於磁碟上，並會持續保存直到您刪除它們。限制在於您的
    儲存空間，而不是模型。**工作階段內容** 仍然受限於模型的
    內容視窗，因此較長的對話可能會被壓縮或截斷。這就是為什麼
    存在記憶體搜尋的原因——它只將相關部分拉回內容中。

    文件：[Memory](/en/concepts/memory), [Context](/en/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋需要 OpenAI API 金鑰嗎？">
    只有在您使用 **OpenAI 嵌入**時才需要。Codex OAuth 涵蓋了聊天/完成功能，並
    **不**授予嵌入存取權限，因此**使用 Codex 登入（OAuth 或 Codex CLI 登入）**
    對語意記憶搜尋沒有幫助。OpenAI 嵌入仍然需要實際的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，當 OpenClaw 可以解析 API 金鑰時（auth profiles、`models.providers.*.apiKey` 或環境變數），
    它會自動選擇一個提供者。如果解析到 OpenAI 金鑰，它偏好 OpenAI，否則如果解析到 Gemini 金鑰則偏好 Gemini，然後是 Voyage，再來是 Mistral。如果沒有可用的遠端金鑰，記憶體
    搜尋將保持停用狀態，直到您進行設定。如果您設定並存在本機模型路徑，OpenClaw
    偏好 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您寧願保持本機，請設定 `memorySearch.provider = "local"`（並可選擇性設定
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
    模型 - 詳細設定資訊請參閱 [記憶體](/en/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="與 OpenClaw 使用的所有數據是否都會在本機儲存？">
    否 - **OpenClaw 的狀態是本機的**，但 **外部服務仍然可以看到您發送給它們的內容**。

    - **預設為本機：** 會話、記憶檔案、配置和工作區位於 Gateway 主機
      （`~/.openclaw` + 您的工作區目錄）上。
    - **必要時為遠端：** 您發送給模型提供商 的訊息會傳送至
      其 API，而聊天平台 會在他們的
      伺服器上儲存訊息數據。
    - **您控制佔用量：** 使用本機模型可以將提示保留在您的機器上，但頻道
      流量仍然會通過頻道的伺服器。

    相關連結：[Agent 工作區](/en/concepts/agent-workspace)、[記憶](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 的資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設為：`~/.openclaw`）：

    | 路徑 | 用途 |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json` | 主要設定檔 (JSON5) |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json` | 舊版 OAuth 匯入（首次使用時會複製到 auth profiles） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 驗證設定檔 (OAuth、API 金鑰和可選的 `keyRef`/`tokenRef`) |
    | `$OPENCLAW_STATE_DIR/secrets.json` | `file` SecretRef 提供者的可選檔案型秘密內容 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json` | 舊版相容性檔案（已清除靜態 `api_key` 條目） |
    | `$OPENCLAW_STATE_DIR/credentials/` | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`） |
    | `$OPENCLAW_STATE_DIR/agents/` | 每個代理程式的狀態 (agentDir + sessions) |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/` | 對話記錄與狀態（每個代理程式） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json` | 工作階段中繼資料（每個代理程式） |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶體檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 設定（預設為：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (per agent)**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md` (當缺少 `MEMORY.md` 時使用舊版回退 `memory.md`)、
      `memory/YYYY-MM-DD.md`、可選的 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)**：設定、認證資訊、設定檔、工作階段、日誌
      以及共享技能 (`~/.openclaw/skills`)。

    預設工作區為 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了，請確認 Gateway 在每次啟動時都使用
    相同的工作區 (並請記住：遠端模式使用的是 **gateway host's** 的工作區，
    而非您本地的筆記型電腦)。

    提示：如果您想要持久的行為或偏好設定，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參見 [Agent workspace](/en/concepts/agent-workspace) 與 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放入一個 **私有** git 儲存庫，並將其備份到某個
    私有位置（例如 GitHub 私有儲存庫）。這會擷取記憶體 + AGENTS/SOUL/USER
    檔案，並讓您稍後能還原助理的「心智」。

    請**切勿**提交 `~/.openclaw` 下的任何內容（憑證、工作階段、權杖或加密的機密承載）。
    如果您需要完整還原，請分別備份工作區與狀態目錄
    （請參閱上述的遷移問題）。

    文件：[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我要如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作區之外運作嗎？">
    是的。工作區是 **預設 cwd** 和記憶錨點，而非嚴格的沙箱。
    相對路徑在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或每個代理的沙箱設定。如果您
    希望某個存放庫成為預設的工作目錄，請將該代理的
    `workspace` 指向存放庫根目錄。OpenClaw 存放庫只是原始碼；請將
    工作區分開，除非您有意讓代理在其中運作。

    範例（存放庫作為預設 cwd）：

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="我處於遠端模式 - session store 在哪裡？">
    Session 狀態由 **gateway host** 擁有。如果您處於遠端模式，您關心的 session store 位於遠端機器上，而不是您的本地筆電。請參閱 [Session 管理](/en/concepts/session)。
  </Accordion>
</AccordionGroup>

## Config 基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取一個選用的 **JSON5** 設定檔（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它將使用較安全的預設值（包括預設的工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，但現在沒有監聽任何東西 / UI 顯示未授權'>
    非迴路綁定 **需要驗證**。請設定 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    註記：

    - `gateway.remote.token` / `.password` **不會**單獨啟用本機 Gateway 驗證。
    - 只有在 `gateway.auth.*` 未設定時，本機呼叫路徑才能將 `gateway.remote.*` 作為後備。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定且未解析，解析將會封閉失敗 (沒有遠端後備遮罩)。
    - Control UI 透過 `connect.params.auth.token` 進行驗證 (儲存在 app/UI 設定中)。請避免將 Token 放在 URL 中。

  </Accordion>

  <Accordion title="為什麼現在在本機連線也需要令牌？">
    OpenClaw 預設強制執行令牌驗證，包括迴路連線。如果未設定令牌，閘道啟動時會自動產生一個並將其儲存至 `gateway.auth.token`，因此 **本機 WS 用戶端必須通過驗證**。這可以阻止其他本機程序呼叫閘道。

    如果您 **真的** 需要開放迴路連線，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生令牌：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後是否需要重新啟動？">
    閘道器會監控設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，關鍵變更則重新啟動
    - `hot`、`restart`、`off` 也受支援

  </Accordion>

  <Accordion title="如何停用有趣的 CLI 標語？">
    在設定中設定 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隱藏標語文字，但保留橫幅標題/版本資訊行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪換顯示有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 需要為您
    選擇的供應商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供金鑰。
    **建議：** 執行 `openclaw configure --section web` 並選擇一個供應商。
    環境變數替代方案：

    - Brave: `BRAVE_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
      },
      tools: {
        web: {
          search: {
            enabled: true,
            provider: "brave",
            maxResults: 5,
          },
          fetch: {
            enabled: true,
          },
        },
      },
    }
    ```

    特定供應商的網路搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版 `tools.web.search.*` 供應商路徑為了相容性仍會暫時載入，但不應將其用於新設定。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - Daemons 會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web tools](/en/tools/web)。

  </Accordion>

  <Accordion title="config.apply 擦除了我的配置。我該如何復原並避免此情況？">
    `config.apply` 會**取代整個配置**。如果您發送部分物件，其他所有內容
    都會被移除。

    復原方式：

    - 從備份還原（git 或複製的 `~/.openclaw/openclaw.json`）。
    - 如果沒有備份，請重新執行 `openclaw doctor` 並重新配置通道/模型。
    - 如果這是意外發生，請回報錯誤並附上您最後已知的配置或任何備份。
    - 本地編碼代理通常可以從日誌或歷史記錄中重建可用的配置。

    避免方式：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。

    文件：[Config](/en/cli/config)、[Configure](/en/cli/configure)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我如何在跨設備的中央 Gateway 上運行專業化 workers？">
    常見的模式是**一個 Gateway**（例如 Raspberry Pi）加上 **nodes** 和 **agents**：

    - **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和會話。
    - **Nodes（設備）：** Macs/iOS/Android 作為外設連接並暴露本地工具（`system.run`, `canvas`, `camera`）。
    - **Agents（workers）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner ops」、「個人數據」）。
    - **Sub-agents：** 當您需要並行處理時，從主 agent 生成後台工作。
    - **TUI：** 連接到 Gateway 並切換 agents/會話。

    文檔：[Nodes](/en/nodes)、[Remote access](/en/gateway/remote)、[Multi-Agent Routing](/en/concepts/multi-agent)、[Sub-agents](/en/tools/subagents)、[TUI](/en/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式運行嗎？">
    可以的。這是一個配置選項：

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    預設是 `false` (有頭模式)。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [Browser](/en/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、抓取、登入）。主要差異在於：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常阻擋無頭會話。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱 [Browser](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整設定範例。
  </Accordion>
</AccordionGroup>

## 遠端閘道與節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、gateway 和節點之間傳遞？">
    Telegram 訊息由 **gateway** 處理。Gateway 執行代理程式，
    僅在需要節點工具時才透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點不會看到傳入的提供者流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果閘道是遠端託管的，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。閘道在其他地方運行，但它可以
    透過閘道 WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在永久運行的主機（VPS/家用伺服器）上運行閘道。
    2. 將閘道主機和您的電腦置於同一個 tailnet。
    3. 確保閘道 WS 可連線（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）進行連線
       以便註冊為節點。
    5. 在閘道上核准該節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要額外的 TCP 橋接器；節點透過閘道 WebSocket 進行連線。

    安全提醒：配對 macOS 節點會允許在該機器上進行 `system.run`。僅
    配對您信任的裝置，並檢視 [Security](/en/gateway/security)。

    文件：[Nodes](/en/nodes), [Gateway protocol](/en/gateway/protocol), [macOS remote mode](/en/platforms/mac/remote), [Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線，但我沒有收到回覆。現在該怎麼辦？">
    檢查基本事項：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀況：`openclaw status`
    - 頻道健康狀況：`openclaw channels status`

    然後驗證授權和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透 SSH 隧道連線，請確認本機隧道已啟動並指向正確的連接埠。
    - 確認您的允許名單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/en/gateway/tailscale)、[Remote access](/en/gateway/remote)、[Channels](/en/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例能否互相通訊（本地 + VPS）？">
    是的。目前沒有內建的「bot 對 bot」橋接器，但您可以透過幾種可靠的方式來連接：

    **最簡單：** 使用兩個機器人都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像平常一樣回覆。

    **CLI 橋接器（通用）：** 執行一個腳本，使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標是另一個機器人正在監聽的聊天室。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （參見 [遠端存取](/en/gateway/remote)）。

    範例模式（從可連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：新增一個防護機制，以免這兩個機器人無限循環（僅限提及、頻道
    白名單，或「不回覆機器人訊息」規則）。

    文件：[遠端存取](/en/gateway/remote)、[Agent CLI](/en/cli/agent)、[Agent send](/en/tools/agent-send)。

  </Accordion>

  <Accordion title="多個 Agent 需要分開的 VPS 嗎？">
    不需要。一個 Gateway 可以託管多個 Agent，每個都有自己的工作區、模型預設值
    和路由設定。這是標準設定，比每個 Agent 執行一個 VPS 更便宜且更簡單。

    只有在您需要強隔離（安全邊界）或非常不同的設定且不希望共用時，才使用分開的 VPS。否則，請維持一個 Gateway 並
    使用多個 Agent 或子 Agent。

  </Accordion>

  <Accordion title="與其從 VPS 使用 SSH，使用我個人筆記型電腦上的節點有什麼好處嗎？">
    是的——節點是從遠端閘道連接您筆記型電腦的一等公民方式，而且它們
    解鎖的不僅僅是 shell 存取權限。閘道執行於 macOS/Linux（Windows 透過 WSL2）且
    輕量化（小型 VPS 或 Raspberry Pi 等級的機器即可；4 GB RAM 綽綽有餘），因此常見的
    設定是永遠上線的主機加上作為節點的筆記型電腦。

    - **不需要傳入 SSH。** 節點會向外連線至閘道 WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受到該筆記型電腦上的節點允許清單/核准機制的限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還會公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將閘道保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或者透過 Chrome MCP 連接到主機上的本機 Chrome。

    SSH 適用於臨時的 shell 存取，但對於持續的代理工作流程和
    裝置自動化來說，節點更簡單。

    文件：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)、[瀏覽器](/en/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您有意執行獨立的設定檔（請參閱 [Multiple gateways](/en/gateway/multiple-gateways)），否則每台主機應該只執行 **一個閘道**。節點是連接到閘道的外設（iOS/Android 節點，或功能表列應用程式中的 macOS「節點模式」）。關於無介面節點主機和 CLI 控制，請參閱 [Node host CLI](/en/cli/node)。

    針對 `gateway`、`discovery` 和 `canvasHost` 的變更，需要完整重新啟動。

  </Accordion>

<Accordion title="是否有 API / RPC 方式可以套用設定？">有的。`config.apply` 會驗證並寫入完整的設定，並在操作過程中重新啟動閘道。</Accordion>

  <Accordion title="首次安裝的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這會設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="如何在 VPS 上設定 Tailscale 並從我的 Mac 連接？">
    最低步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理控制台中，啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您不需要 SSH 就想要使用 Control UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將閘道綁定到 loopback，並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連接到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連線。

    建議設定方式：

    1. **確保 VPS 與 Mac 位於同一個 tailnet 上**。
    2. **在 macOS 應用程式中使用 Remote 模式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會建立 Gateway 通道的隧道並以節點身份連線。
    3. **在 gateway 上批准該節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway 通訊協定](/en/gateway/protocol)、[探索](/en/gateway/discovery)、[macOS 遠端模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是只需新增一個節點？">
    如果您僅需在第二台筆記型電腦上使用 **本地工具** (screen/camera/exec)，請將其新增為
    **節點**。這樣可保持單一 Gateway 並避免重複配置。本地節點工具目前僅支援 macOS，但我們計畫將其擴展至其他作業系統。

    僅當您需要 **強隔離** 或兩個完全獨立的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes), [Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 來自當前工作目錄的 `.env`
    - 來自 `~/.openclaw/.env`（亦稱 `$OPENCLAW_STATE_DIR/.env`）的全域後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋現有的環境變數。

    您也可以在設定中定義內聯環境變數（僅在進程環境中缺失時套用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    參閱 [/environment](/en/help/environment) 以了解完整的優先順序和來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但我的環境變數不見了。現在該怎麼辦？">
    兩個常見的修復方法：

    1. 將遺失的金鑰放入 `~/.openclaw/.env` 中，這樣即使服務未繼承您的 Shell 環境，也能載入這些金鑰。
    2. 啟用 Shell 匯入（選用的便利功能）：

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    這會執行您的登入 Shell 並僅匯入遺失的預期金鑰（絕不覆蓋）。環境變數的等效項：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off.」。為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**。「Shell env: off」
    **並不**代表缺少環境變數——這僅表示 OpenClaw 不會自動載入
    您的登入 shell。

    如果 Gateway 作為服務（launchd/systemd）運行，它不會繼承您的 shell
    環境。請透過下列其中一種方式修正：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其新增至您的 config `env` 區塊（僅在缺失時適用）。

    然後重新啟動 gateway 並再次檢查：

    ```bash
    openclaw models status
    ```

    Copilot tokens 會從 `COPILOT_GITHUB_TOKEN` 讀取（亦包含 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/en/concepts/model-providers) 與 [/environment](/en/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="如何開始新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱[會話管理](/en/concepts/session)。
  </Accordion>

  <Accordion title="如果我不發送 /new，會話會自動重置嗎？">
    是的。會話會在 `session.idleMinutes`（預設為 **60**）後過期。**下一則**
    訊息會為該聊天金鑰啟動一個新的會話 ID。這不會刪除
    轉錄檔——它只是啟動一個新的會話。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法組建一個 OpenClaw 實例團隊（一個 CEO 和多個代理）？">
    是的，透過 **多代理路由** 和 **子代理**。您可以建立一個協調器
    代理和多個具有各自工作空間和模型的工作代理。

    話雖如此，這最好被視為一個 **有趣的實驗**。它非常消耗 token，且通常
    比使用一個具有獨立會話的機器人效率更低。我們設想的典型模型
    是您與一個機器人對話，並使用不同的會話進行並行工作。該
    機器人也可以在需要時生成子代理。

    文件：[多代理路由](/en/concepts/multi-agent)、[子代理](/en/tools/subagents)、[Agents CLI](/en/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文會在任務中途被截斷？我該如何預防？">
    會話上下文受限於模型視窗。長時間的對話、大型工具輸出或大量檔案都可能觸發壓縮或截斷。

    以下是解決方案：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長時間任務之前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保存在工作區中，並要求機器人讀回它。
    - 對長時間或並行的工作使用子代理，以便主對話保持較小。
    - 如果這種情況經常發生，請選擇具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留安裝？">
    使用 reset 指令：

    ```bash
    openclaw reset
    ```

    非互動式完整重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然後重新執行設定：

    ```bash
    openclaw onboard --install-daemon
    ```

    註記：

    - 如果 Onboarding 發現既有設定，也會提供 **Reset** 選項。請參閱 [Onboarding (CLI)](/en/start/wizard)。
    - 如果您使用過設定檔（`--profile` / `OPENCLAW_PROFILE`），請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset`（僅限開發；會清除開發設定 + 憑證 + 會話 + 工作區）。

  </Accordion>

  <Accordion title='我遇到「context too large」錯誤 - 如何重置或壓縮？'>
    使用以下方法之一：

    - **壓縮**（保留對話但總結較舊的輪次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置**（為相同的聊天金鑰產生新的 Session ID）：

      ```
      /new
      /reset
      ```

    如果持續發生：

    - 啟用或調整 **session pruning** (`agents.defaults.contextPruning`) 以修剪舊的工具輸出。
    - 使用具有更大 context window 的模型。

    文件：[壓縮](/en/concepts/compaction)、[Session pruning](/en/concepts/session-pruning)、[Session 管理](/en/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我會看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個提供者驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少所需的
    `input`。這通常意味著會話記錄已過時或損壞（通常發生在長對話
    或工具/架構變更之後）。

    解決方法：使用 `/new` 開始一個新的會話（獨立訊息）。

  </Accordion>

  <Accordion title="為什麼我每隔 30 分鐘就會收到心跳訊息？">
    心跳預設每 **30 分鐘**執行一次。您可以調整或停用它們：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    如果 `HEARTBEAT.md` 存在但實際上是空的（只有空行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案遺失，心跳仍會執行，由模型決定如何處理。

    代理特定覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」加入到 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被阻止，直到您允許發送者 (`groupPolicy: "allowlist"`)。

    如果您希望只有**您**能觸發群組回覆：

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="如何取得 WhatsApp 群組的 JID？">
    選項 1（最快）：監看日誌並在群組中傳送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經配置/加入允許清單）：從配置列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/en/channels/whatsapp)、[目錄](/en/cli/directory)、[日誌](/en/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 在群組中不回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @mention 機器人（或符合 `mentionPatterns`）。
    - 您在沒有 `"*"` 的情況下設定了 `channels.whatsapp.groups`，且該群組未被列入允許清單。

    請參閱 [群組](/en/channels/groups) 和 [群組訊息](/en/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與私訊共用上下文？">私訊預設會合併到主工作階段。群組/頻道有自己的工作階段金鑰，而 Telegram 主題 / Discord 執行緒則是獨立的工作階段。請參閱 [群組](/en/channels/groups) 和 [群組訊息](/en/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會話 + 轉錄記錄存儲在 `~/.openclaw/agents/<agentId>/sessions/` 之下。
    - **Token 成本：** 代理程式越多意味著併發模型使用量越多。
    - **維運負擔：** 每個代理程式的驗證設定檔、工作區和通道路由。

    建議：

    - 每個代理程式保持一個 **使用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增長，請修剪舊會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來發現遺留的工作區和設定檔不符的情況。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天 (Slack)，該如何設定？">
    可以。使用 **Multi-Agent Routing** 來執行多個隔離的代理並透過頻道/帳號/對等節點路由傳入訊息。Slack 支援作為頻道並可以綁定到特定的代理。

    瀏覽器存取功能強大但並非「人類能做到的一切」 - 反爬蟲、CAPTCHA 和 MFA 仍然可以阻擋自動化。為了最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，或者在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 始終運作的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個代理 (綁定)。
    - 綁定到這些代理的 Slack 頻道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[Multi-Agent Routing](/en/concepts/multi-agent)、[Slack](/en/channels/slack)、
    [Browser](/en/tools/browser)、[Nodes](/en/nodes)。

  </Accordion>
</AccordionGroup>

## Models: defaults, selection, aliases, switching

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是指您設定的：

    ```
    agents.defaults.model.primary
    ```

    模型以 `provider/model` 進行引用（例如：`anthropic/claude-opus-4-6`）。如果您省略了提供者，OpenClaw 目前假設 `anthropic` 作為臨時的棄用回退方案——但您仍應**明確**設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪個模型？">
    **推薦預設值：** 使用您供應商堆疊中可用的最強大最新世代模型。
    **對於啟用工具或輸入不可信的代理：** 優先考慮模型強度而非成本。
    **對於常規/低風險聊天：** 使用較便宜的備用模型，並根據代理角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/en/providers/minimax) 和
    [本地模型](/en/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**負擔得起的最佳模型**，對於常規聊天或摘要，則使用較便宜的模型。您可以為每個代理路由模型，並使用子代理來並行化長任務（每個子代理都會消耗 Token）。請參閱 [模型](/en/concepts/models) 和
    [子代理](/en/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示詞注入和不安全行為的影響。請參閱 [安全性](/en/gateway/security)。

    更多背景資訊：[模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情況下切換模型？">
    使用 **模型命令** 或僅編輯 **模型** 欄位。避免完全替換配置。

    安全選項：

    - 在聊天中使用 `/model`（快速，僅限當前會話）
    - `openclaw models set ...`（僅更新模型配置）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個配置，否則請避免使用部分物件進行 `config.apply`。
    如果您確實覆蓋了配置，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文檔：[Models](/en/concepts/models)、[Configure](/en/cli/configure)、[Config](/en/cli/config)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管模型嗎 (llama.cpp, vLLM, Ollama)？">
    可以。Ollama 是使用本地模型最簡單的途徑。

    最快速的設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 下載一個本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您也想要 Ollama Cloud，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    注意事項：

    - `Cloud + Local` 會讓您取得 Ollama Cloud 模型以及您的本地 Ollama 模型
    - 雲端模型（如 `kimi-k2.5:cloud`）不需要在本地下載
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性提示：較小或高度量化的模型更容易受到提示詞注入
    攻擊。我們強烈建議任何能使用工具的機器人使用 **大型模型**。
    如果您仍想使用小型模型，請啟用沙盒機制和嚴格的工具允許清單。

    文件：[Ollama](/en/providers/ollama)、[本地模型](/en/gateway/local-models)、
    [模型供應商](/en/concepts/model-providers)、[安全性](/en/gateway/security)、
    [沙盒機制](/en/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">- 這些部署可能有所不同，且可能會隨時間變化；沒有固定的建議供應商。 - 使用 `openclaw models status` 檢查每個閘道上的當前運行時設定。 - 對於安全敏感型/啟用了工具的代理程式，請使用可用的最強大的最新一代模型。</Accordion>

  <Accordion title="如何即時切換模型（無需重新啟動）？">
    將 `/model` 指令作為獨立訊息使用：

    ```
    /model sonnet
    /model haiku
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    ```

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用的模型。

    `/model`（以及 `/model list`）會顯示一個簡潔的帶號碼選擇器。透過數字進行選擇：

    ```
    /model 3
    ```

    您也可以強制為提供者使用特定的認證設定檔（每個階段一次）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前作用的代理、正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個認證設定檔。
    它也會顯示已設定的提供者端點（`baseUrl`）和 API 模式（`api`）（如果有的話）。

    **如何取消透過 @profile 設定的固定設定檔？**

    重新執行 `/model`，**不帶** `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想返回預設值，請從 `/model` 中選取（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 以確認目前作用的認證設定檔。

  </Accordion>

  <Accordion title="我可以將 GPT 5.2 用於日常任務，將 Codex 5.3 用於編寫程式碼嗎？">
    可以。將一個設定為預設值並根據需要切換：

    - **快速切換（每個階段作業）：** `/model gpt-5.2` 用於日常任務，`/model openai-codex/gpt-5.4` 用於搭配 Codex OAuth 進行編碼。
    - **預設 + 切換：** 將 `agents.defaults.model.primary` 設定為 `openai/gpt-5.2`，然後在編碼時切換到 `openai-codex/gpt-5.4`（或反之亦然）。
    - **子代理程式：** 將編碼任務路由到具有不同預設模型的子代理程式。

    請參閱 [模型](/en/concepts/models) 和 [斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title='為什麼我會看到 "Model ... is not allowed" 然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它就會成為 `/model` 和任何
    session 覆寫的 **allowlist**。選擇一個不在該清單中的模型會傳回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會被傳回，**而不是**正常的回覆。解決方法：將模型新增到
    `agents.defaults.models`、移除 allowlist，或從 `/model list` 中選取一個模型。

  </Accordion>

  <Accordion title='為什麼我看到「Unknown model: minimax/MiniMax-M2.7」？'>
    這表示**未設定提供者**（找不到 MiniMax 提供者設定或驗證設定檔），因此無法解析該模型。

    修復檢查清單：

    1. 升級至最新的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動閘道。
    2. 確認已設定 MiniMax（使用精靈或 JSON），或 env/auth 設定檔中存在 MiniMax API 金鑰，以便注入提供者。
    3. 使用確切的模型 ID（區分大小寫）：`minimax/MiniMax-M2.7` 或
       `minimax/MiniMax-M2.7-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選擇（或在聊天中 `/model list`）。

    參閱 [MiniMax](/en/providers/minimax) 和 [模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 作為預設，並在複雜任務中使用 OpenAI 嗎？">
    是的。將 **MiniMax 作為預設**，並在需要時**按會話**切換模型。
    回退機制是用於**錯誤**的，而不是「困難任務」，因此請使用 `/model` 或獨立的代理程式。

    **選項 A：按會話切換**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.2": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然後：

    ```
    /model gpt
    ```

    **選項 B：分離的代理程式**

    - Agent A 預設：MiniMax
    - Agent B 預設：OpenAI
    - 透過代理程式路由，或使用 `/agent` 進行切換

    文件：[模型](/en/concepts/models)、[多代理程式路由](/en/concepts/multi-agent)、[MiniMax](/en/providers/minimax)、[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 附帶了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 中時才會套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了一個同名的別名，您的值將會優先使用。

  </Accordion>

  <Accordion title="如何定義/覆寫模型捷徑（別名）？">
    別名來自 `agents.defaults.models.<modelId>.alias`。範例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然後 `/model sonnet`（或受支援時的 `/<alias>`）會解析為該模型 ID。

  </Accordion>

  <Accordion title="如何加入來自 OpenRouter 或 Z.AI 等其他提供商的模型？">
    OpenRouter (按 token 付費；多種模型):

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI (GLM 模型):

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果您參照了某個提供商/模型，但缺少所需的提供商金鑰，您會收到執行時期的 auth 錯誤 (例如 `No API key found for provider "zai"`)。

    **新增代理後找不到提供商的 API 金鑰**

    這通常表示**新代理**擁有空白的 auth store。Auth 是針對每個代理的，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈期間設定 auth。
    - 或將 `auth-profiles.json` 從主要代理的 `agentDir` 複製到新代理的 `agentDir`。

    請**勿**在代理之間重複使用 `agentDir`；這會導致 auth/session 衝突。

  </Accordion>
</AccordionGroup>

## 模型容錯移轉與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="容錯機制如何運作？">
    容錯機制分為兩個階段進行：

    1. 同一供應商內的 **驗證設定檔輪替**。
    2. **模型備援** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

    失敗的設定檔會套用冷卻時間（指數退避），因此即使供應商受到速率限制或暫時出錯，OpenClaw 仍能持續回應。

  </Accordion>

  <Accordion title='「找不到設定檔 anthropic:default 的認證」是什麼意思？'>
    這表示系統嘗試使用認證設定檔 ID `anthropic:default`，但在預期的認證儲存區中找不到相關認證資訊。

    **修復檢查清單：**

    - **確認認證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的 Agent**
      - 多 Agent 設定意味著可能存在多個 `auth-profiles.json` 檔案。
    - **理智檢查模型/認證狀態**
      - 使用 `openclaw models status` 來查看已設定的模型以及供應商是否已通過認證。

    **「找不到設定檔 anthropic 的認證」修復檢查清單**

    這表示該執行被釘選至 Anthropic 認證設定檔，但 Gateway
    在其認證儲存區中找不到它。

    - **使用 setup-token**
      - 執行 `claude setup-token`，然後使用 `openclaw models auth setup-token --provider anthropic` 貼上它。
      - 如果 token 是在其他機器上建立的，請使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果您改為想使用 API key**
      - 將 `ANTHROPIC_API_KEY` 放入 **gateway host** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的釘選順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您是在 gateway host 上執行指令**
      - 在遠端模式下，認證設定檔位於 gateway 機器上，而不是您的筆記型電腦上。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並且失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試它。如果您尚未配置 Google 憑證，您將會看到 `No API key found for provider "google"`。

    修復方法：提供 Google 授權，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：會話歷史記錄包含 **未帶簽名的思維區塊**（通常來自
    已中止/不完整的串流）。Google Antigravity 要求思維區塊必須有簽名。

    修復方法：OpenClaw 現在會為 Google Antigravity Claude 移除未簽名的思維區塊。如果問題仍然出現，請開啟 **新會話** 或為該代理程式設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles: what they are and how to manage them

相關：[/concepts/oauth](/en/concepts/oauth)（OAuth 流程、token 儲存、多帳號模式）

<AccordionGroup>
  <Accordion title="What is an auth profile?">
    授權設定檔是綁定到提供者的命名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="常見的設定檔 ID 是什麼？">
    OpenClaw 使用提供者前綴的 ID，例如：

    - `anthropic:default`（當沒有電子郵件身份時常見）
    - OAuth 身份使用 `anthropic:<email>`
    - 您選擇的自訂 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個驗證設定檔嗎？">
    可以。設定支援設定檔的可選元數據以及每個提供者的順序 (`auth.order.<provider>`)。這**不會**儲存秘密；它將 ID 對應到提供者/模式並設置輪替順序。

    OpenClaw 可能會暫時跳過某個設定檔，如果它處於短暫的 **cooldown**（冷卻）（速率限制/逾時/驗證失敗）或較長的 **disabled**（停用）狀態（計費/額度不足）。要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整：`auth.cooldowns.billingBackoffHours*`。

    您也可以透過 CLI 設定 **per-agent**（每個代理程式）的順序覆蓋（儲存在該代理程式的 `auth-profiles.json` 中）：

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    若要指定特定的代理程式：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

  </Accordion>

  <Accordion title="OAuth 與 API 金鑰 - 有什麼差別？">
    OpenClaw 兩者都支援：

    - **OAuth** 通常利用訂閱存取權 (若適用)。
    - **API 金鑰** 則使用依 Token 計費。

    精靈 (wizard) 明確支援 Anthropic setup-token 和 OpenAI Codex OAuth，並可為您儲存 API 金鑰。

  </Accordion>
</AccordionGroup>

## 閘道：連接埠、「正在執行」與遠端模式

<AccordionGroup>
  <Accordion title="閘道器使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多路複用連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Runtime: running」但「RPC probe: failed」？'>
    因為「running」是 **監控程式**（launchd/systemd/schtasks）的視角。RPC 探測則是 CLI 實際連線到 gateway WebSocket 並呼叫 `status`。

    使用 `openclaw gateway status` 並相信這幾行資訊：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（連接埠上實際綁定的內容）
    - `Last gateway error:`（常見根本原因：程序還活著但連接埠未監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 狀態顯示的「Config (cli)」和「Config (service)」不同？'>
    您正在編輯某個組態檔，但服務正在使用另一個組態檔（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修正方法：

    ```bash
    openclaw gateway install --force
    ```

    請在您希望服務使用的同一個 `--profile` / 環境中執行該指令。

  </Accordion>

  <Accordion title='“另一個閘道執行個體正在監聽”是什麼意思？'>
    OpenClaw 會在啟動時立即綁定 WebSocket 監聽器（預設為 `ws://127.0.0.1:18789`）來強制執行執行階段鎖定。如果綁定失敗並出現 `EADDRINUSE` 錯誤，它會擲回 `GatewayLockError`，表示另一個執行個體正在監聽。

    解決方法：停止另一個執行個體、釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何在遠端模式執行 OpenClaw（客戶端連接到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，選擇性地提供 token/password：

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    備註：

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時才會啟動（或者您傳遞覆寫旗標）。
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或持續重新連線）。現在該怎麼辦？'>
    您的閘道正在啟用驗證的情況下執行 (`gateway.auth.*`)，但該介面並未發送相符的 token/密碼。

    事實（來自程式碼）：

    - 控制介面會將 token 保留在 `sessionStorage` 中，用於當前的瀏覽器分頁階段和選定的閘道 URL，因此同分頁重新整理能持續運作，無需還原長期存在的 localStorage token 持續性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示 (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`) 時，受信任的用戶端可以嘗試使用快取的裝置 token 進行一次有限制的重試。

    修正方法：

    - 最快：`openclaw dashboard` (會列印並複製儀表板 URL，嘗試開啟；如果是無頭模式則顯示 SSH 提示)。
    - 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 在閘道主機上設定 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
    - 在控制介面設定中，貼上相同的 token。
    - 如果在一次重試後仍然不符，請輪換/重新核准配對的裝置 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 還是卡住了？執行 `openclaw status --all` 並依照 [疑難排解](/en/gateway/troubleshooting) 操作。關於驗證詳細資訊，請參閱 [儀表板](/en/web/dashboard)。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但無法綁定，也沒有監聽任何內容">
    `tailnet` bind 會從您的網路介面中選取一個 Tailscale IP (100.64.0.0/10)。如果該機器不在 Tailscale 上 (或介面已關閉)，就沒有物件可綁定。

    修正方法：

    - 在該主機上啟動 Tailscale (這樣它就會有 100.x 位址)，或
    - 切換到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一主機上執行多個 Gateway 嗎？">
    通常不需要 - 一個 Gateway 可以執行多個訊息通道和代理程式。只有在您需要冗餘（例如：救援機器人）或嚴格隔離時，才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` (每個執行個體的設定)
    - `OPENCLAW_STATE_DIR` (每個執行個體的狀態)
    - `agents.defaults.workspace` (工作區隔離)
    - `gateway.port` (唯一連接埠)

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...` (自動建立 `~/.openclaw-<name>`)。
    - 在每個設定檔中設定唯一的 `gateway.port` (或在手動執行時傳遞 `--port`)。
    - 安裝每個設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴 (`ai.openclaw.<profile>`；舊版 `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`)。
    完整指南：[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='"invalid handshake" / code 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期的第一則訊息必須是
    一個 `connect` 幀。如果收到任何其他內容，它會以 **code 1008**（政策違規）關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`)，而不是使用 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭或發送了非 Gateway 請求。

    快速修復：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 則為 `wss://...`）。
    2. 不要在一般瀏覽器分頁中開啟 WS 連接埠。
    3. 如果開啟了驗證，請在 `connect` 幀中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應該看起來像這樣：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協定詳細資訊：[Gateway 協定](/en/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌層級由 `logging.level` 控制。控制台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤方式：

    ```bash
    openclaw logs --follow
    ```

    服務/監督程式日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    參閱 [疑難排解](/en/gateway/troubleshooting) 瞭解更多資訊。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助指令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/en/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機——如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2 (推薦)**：Gateway 執行於 Linux 內部。

    開啟 PowerShell，進入 WSL，然後重新啟動：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您從未安裝過服務，請在前台啟動它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows (不推薦)**：Gateway 直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它（無服務），請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/en/platforms/windows)、[Gateway service runbook](/en/gateway)。

  </Accordion>

  <Accordion title="Gateway 已啟動但從未收到回覆。我應該檢查什麼？">
    從快速健康檢查開始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未在 **gateway host** 上載入（檢查 `models status`）。
    - 頻道配對/允許清單封鎖了回覆（檢查頻道設定 + 記錄）。
    - WebChat/Dashboard 在沒有正確 token 的情況下開啟。

    如果您是遠端操作，請確認 tunnel/Tailscale 連線已啟動，且
    Gateway WebSocket 可連線。

    文件：[頻道](/en/channels)、[疑難排解](/en/gateway/troubleshooting)、[遠端存取](/en/gateway/remote)。

  </Accordion>

  <Accordion title='「已與閘道器中斷連線：沒有原因」——現在該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. 閘道器 (Gateway) 是否正在執行？ `openclaw gateway status`
    2. 閘道器是否健康？ `openclaw status`
    3. UI 是否有正確的 Token？ `openclaw dashboard`
    4. 如果是遠端連線，隧道/Tailscale 連線是否正常？

    然後查看日誌：

    ```bash
    openclaw logs --follow
    ```

    文件：[儀表板](/en/web/dashboard)、[遠端存取](/en/gateway/remote)、[疑難排解](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    從日誌和通道狀態開始檢查：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單中的項目太多。OpenClaw 已經將指令修剪至 Telegram 限制並重試較少的指令，但仍需捨棄部分選單項目。減少外掛程式/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於 Proxy 後方，請確認允許連出 HTTPS，且 `api.telegram.org` 的 DNS 解析正常。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/en/channels/telegram)、[通道疑難排解](/en/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有輸出。我應該檢查什麼？">
    首先確認 Gateway 是可達的，並且代理可以運行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 來查看當前狀態。如果您在聊天頻道中期望收到回覆，
    請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/en/web/tui)、[Slash 指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="我如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監管的服務**（macOS 上為 launchd，Linux 上為 systemd）。
    當 Gateway 作為守護程序在背景運行時，請使用此方法。

    如果您是在前景運行，請使用 Ctrl-C 停止，然後：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway service runbook](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段中，於 **前景** 執行 gateway。

    如果您已安裝該服務，請使用 gateway 指令。當您想要單次前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查記錄檔中的 channel auth、model routing 和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="我的技能生成了圖片/PDF，但沒有發送任何內容">
    來自代理程式的出站附件必須包含 `MEDIA:<path-or-url>` 行（獨佔一行）。請參閱 [OpenClaw 助手設定](/en/start/openclaw) 和 [代理程式發送](/en/tools/agent-send)。

    CLI 發送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    還請檢查：

    - 目標頻道支援出站媒體，且未被允許列表阻擋。
    - 檔案大小在提供者的限制範圍內（圖片會調整大小至最大 2048px）。

    參閱 [圖片](/en/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全性與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露於傳入的 DM 是否安全？">
    將傳入的 DM 視為不受信任的輸入。預設設定旨在降低風險：

    - 支援 DM 的頻道上的預設行為是 **配對 (pairing)**：
      - 未知的發送者會收到一個配對碼；機器人不會處理他們的訊息。
      - 使用以下方式批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理請求的上限為 **每頻道 3 個**；如果代碼未送達，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放 DM 需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示有風險的 DM 政策。

  </Accordion>

  <Accordion title="提示詞注入（Prompt injection）僅是公開機器人需要關注的問題嗎？">
    不。提示詞注入關乎的是**不受信任的內容**，而不僅僅是誰可以私信機器人。
    如果您的助手讀取外部內容（網頁搜索/獲取、瀏覽器頁面、電子郵件、
    文檔、附件、貼上的日誌），這些內容可能包含試圖
    劫持模型的指令。即使**您是唯一的發送者**，這也可能發生。

    最大的風險在於啟用工具時：模型可能會被誘導
    外洩上下文或代表您調用工具。您可以通過以下方式減輕影響範圍：

    - 使用只讀或禁用工具的「閱讀器」代理來摘要不受信任的內容
    - 對啟用工具的代理，保持 `web_search` / `web_fetch` / `browser` 關閉
    - 沙箱隔離和嚴格的工具允許列表

    詳情：[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設置來說是這樣的。將機器人與獨立的帳號和電話號碼隔離
    可以在發生問題時減輕受影響的範圍。這也使得輪換憑證
    或撤銷存取權限更容易，而不會影響您的個人帳號。

    從小處著手。只授予您實際需要的工具和帳號的存取權限，並在需要時
    稍後再進行擴展。

    文件：[安全性](/en/gateway/security)、[配對](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它全權處理我的簡訊，這樣安全嗎？">
    我們**不**建議讓它對您的個人訊息擁有完全自主權。最安全的模式是：

    - 將私訊（DM）保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳戶**。
    - 讓它擬草稿，然後在發送前**進行審核**。

    如果您想要進行實驗，請在專用帳戶上進行，並保持隔離。請參閱
    [安全性](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以使用更便宜的模型來執行個人助理任務嗎？">是的，**如果**代理程式僅用於聊天且輸入內容是受信任的。較低階層的模型 更容易受到指令劫持，因此請避免將它們用於啟用工具的代理程式 或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒內運行。請參閱[安全性](/en/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知發送者向機器人發送訊息且
    `dmPolicy: "pairing"` 已啟用時才會發送。`/start` 本身不會產生代碼。

    檢查待處理請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許列表，或為該帳戶設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對運作原理是什麼？">
    不會。WhatsApp 私訊的預設原則是**配對**。未知的發送者只會收到配對碼，而他們的訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天，或您觸發的明確傳送。

    使用以下方式核准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理的請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈手機號碼提示：這是用來設定您的**允許清單/擁有者**，以便允許您自己的私訊。它不用於自動傳送。如果您使用個人 WhatsApp 號碼執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務與「它無法停止」

<AccordionGroup>
  <Accordion title="如何讓內部系統訊息不顯示在聊天中？">
    大多數內部或工具訊息僅在該工作階段啟用 **verbose** 或 **reasoning** 時才會出現。

    在您看到此情況的聊天中進行修正：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很吵雜，請檢查 Control UI 中的工作階段設定，將 verbose 設定為 **inherit**。同時請確認您沒有使用在 config 中將 `verboseDefault` 設定為 `on` 的 bot 設定檔。

    文件：[Thinking and verbose](/en/tools/thinking)、[Security](/en/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    將以下任一內容**作為獨立訊息發送**（不使用斜線）：

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    這些是中止觸發器（而非斜線指令）。

    對於背景進程（來自 exec 工具），您可以要求代理程式執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [斜線指令](/en/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的**獨立**訊息發送，但部分捷徑（例如 `/status`）對於允許列表中的發送者也可以在行內使用。

  </Accordion>

  <Accordion title='如何從 Telegram 發送 Discord 訊息？（「Cross-context messaging denied」）'>
    OpenClaw 預設會封鎖 **跨提供者 (cross-provider)** 訊息傳遞。如果工具呼叫綁定至
    Telegram，除非您明確允許，否則它不會發送訊息至 Discord。

    為該代理程式啟用跨提供者訊息傳遞：

    ```json5
    {
      agents: {
        defaults: {
          tools: {
            message: {
              crossContext: {
                allowAcrossProviders: true,
                marker: { enabled: true, prefix: "[from {channel}] " },
              },
            },
          },
        },
      },
    }
    ```

    編輯設定後請重新啟動閘道。如果您只想針對單一
    代理程式進行此設定，請改在 `agents.list[].tools.message` 下設定。

  </Accordion>

  <Accordion title='為什麼機器人似乎會「忽略」快速連續發送的訊息？'>
    佇列模式控制新訊息如何與正在進行的執行互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向當前任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即導向，然後處理待辦事項
    - `interrupt` - 中止目前的執行並重新開始

    您可以新增諸如 `debounce:2s cap:25 drop:summarize` 之類的選項用於後續模式。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證和模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在 auth profiles 中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何模型（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 無法在正在運行的代理程式的預期
    `auth-profiles.json` 中找到 Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 上提問，或在 GitHub 上開啟 [討論](https://github.com/openclaw/openclaw/discussions)。
