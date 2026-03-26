---
summary: "關於 OpenClaw 設定、設定檔與使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對實際環境（本地開發、VPS、多代理、OAuth/API 金鑰、模型容錯移轉）的快速解答與更深入的疑難排解。若需執行時期診斷，請參閱[疑難排解](/zh-Hant/gateway/troubleshooting)。若需完整的設定檔參考，請參閱[設定](/zh-Hant/gateway/configuration)。

## 當發生問題時的前 60 秒

1. **快速狀態（首檢）**

   ```bash
   openclaw status
   ```

   快速本地摘要：OS + 更新、閘道/服務連線性、代理/工作階段、提供者設定 + 執行時期問題（當閘道可連線時）。

2. **可貼上的報告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   唯讀診斷，含記錄尾部（Token 已遮蔽）。

3. **常駐程式 + 連接埠狀態**

   ```bash
   openclaw gateway status
   ```

   顯示 supervisor 執行時與 RPC 可達性、探測目標 URL，以及服務可能使用的配置。

4. **深度探測**

   ```bash
   openclaw status --deep
   ```

   執行 gateway 健康檢查 + 提供者探測（需要可達的 gateway）。參見 [Health](/zh-Hant/gateway/health)。

5. **追蹤最新日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 連線中斷，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；參見 [Logging](/zh-Hant/logging) 與 [Troubleshooting](/zh-Hant/gateway/troubleshooting)。

6. **執行修復工具**

   ```bash
   openclaw doctor
   ```

   修復/遷移配置/狀態 + 執行健康檢查。參見 [Doctor](/zh-Hant/gateway/doctor)。

7. **Gateway 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的 gateway 要求完整快照（僅限 WS）。參見 [Health](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

<AccordionGroup>
  <Accordion title="我卡住了，最快解決方法">
    使用可以「查看您的機器」的本機 AI 代理。這比在 Discord 提問有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的「本機設定或環境問題」。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取 repo、執行指令、檢查日誌，並協助修復您的機器層級設定（PATH、服務、權限、認證檔案）。請透過可駭客（git）安裝提供給它們「完整的原始碼 checkout」：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會從 git checkout 安裝 OpenClaw，因此代理可以讀取程式碼和文件，並推斷您正在執行的確切版本。您隨時可以透過不帶 `--install-method git` 重新執行安裝程式來切換回穩定版本。

    提示：請要求代理「計劃並監督」修復（逐步進行），然後僅執行必要的指令。這樣可以保持變更較小且更容易審查。

    如果您發現真正的錯誤或修復方法，請提出 GitHub issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（求助時分享輸出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`: 閘道/代理健康狀況與基本設定的快速快照。
    - `openclaw models status`: 檢查提供者認證與模型可用性。
    - `openclaw doctor`: 驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速偵錯迴圈：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安裝文件：[Install](/zh-Hant/install)、[Installer flags](/zh-Hant/install/installer)、[Updating](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="安裝並設定 OpenClaw 的推薦方式">
    本儲存庫建議從原始碼執行並使用入門引導：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    精靈也可以自動建構 UI 資產。入門引導完成後，您通常會在連接埠 **18789** 上執行 Gateway。

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

<Accordion title="入門引導後如何開啟儀表板？">
  精靈會在入門引導完成後立即以乾淨（非令牌化）的儀表板 URL 開啟您的瀏覽器
  並且也會在摘要中印出連結。請保持該分頁開啟；如果它沒有啟動，請在 同一台機器上複製貼上印出的 URL。
</Accordion>

  <Accordion title="如何在本地主機與遠端驗證儀表板（權杖）？">
    **Localhost (same machine):**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求驗證，請將 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的權杖貼上到 Control UI 設定中。
    - 從閘道主機取得：`openclaw config get gateway.auth.token`（或產生一個：`openclaw doctor --generate-gateway-token`）。

    **Not on localhost:**

    - **Tailscale Serve**（建議）：保持繫結 loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份標頭滿足 Control UI/WebSocket 驗證（無需權杖，假設閘道主機受信任）；HTTP API 仍需權杖/密碼。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`，開啟 `http://<tailscale-ip>:18789/`，在儀表板設定中貼上權杖。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/` 並在 Control UI 設定中貼上權杖。

    請參閱 [Dashboard](/zh-Hant/web/dashboard) 和 [Web surfaces](/zh-Hant/web) 以了解繫結模式和驗證細節。

  </Accordion>

  <Accordion title="我需要什麼運行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。**不推薦**在 Gateway 上使用 Bun。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上運行嗎？">
    是的。Gateway 很輕量——文檔列出 **512MB-1GB RAM**、**1 核心**和大約 **500MB** 磁盤空間就足以滿足個人使用，並且註明 **Raspberry Pi 4 可以運行它**。

    如果你想要額外的餘量（日誌、媒體、其他服務），建議使用 **2GB**，但這並非硬性最低要求。

    提示：一個小型 Pi/VPS 可以託管 Gateway，你可以在筆記本電腦/手機上配對 **節點** 以進行本地屏幕/相機/畫布操作或命令執行。參見 [Nodes](/zh-Hant/nodes)。

  </Accordion>

  <Accordion title="安裝 Raspberry Pi 有什麼建議嗎？">
    簡單來說：可以使用，但要做好遇到一些小問題的準備。

    - 使用 **64 位元**的作業系統並保持 Node 版本 >= 22。
    - 優先選擇 **可客製化 的安裝方式**，以便檢視日誌並快速更新。
    - 先不啟用頻道/技能，然後逐一新增。
    - 如果遇到奇怪的二進位檔問題，通常是 **ARM 相容性**問題。

    文件：[Linux](/zh-Hant/platforms/linux)、[安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="它卡在“醒醒我的朋友” / 入門無法啟動。現在該怎麼辦？">
    該畫面依賴於 Gateway 可連接且已通過驗證。TUI 也會在首次啟動時自動發送
    “Wake up, my friend!”。如果您看到該行文字但**沒有回應**
    且 tokens 保持在 0，表示代理程式從未執行。

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

    如果 Gateway 是遠端的，請確保 tunnel/Tailscale 連線正常，且 UI
    指向正確的 Gateway。請參閱 [Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我可以在不重新進行入門設定的情況下，將設定遷移到新機器 (Mac mini) 嗎？">
    是的。複製 **state 目錄** 和 **workspace**，然後執行一次 Doctor。這樣
    可以讓您的機器人保持「完全相同」（記憶體、Session 歷史、驗證和
    頻道狀態），只要您複製 **這兩個** 位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR` (預設：`~/.openclaw`)。
    3. 複製您的工作區 (預設：`~/.openclaw/workspace`)。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這會保留設定、驗證設定檔、WhatsApp 憑證、Sessions 和記憶體。如果您使用
    遠端模式，請記得 Gateway 主機擁有 session 存儲和工作區。

    **重要：** 如果您只是將工作區 commit/push 到 GitHub，您備份的是
    **記憶體 + 啟動檔案**，但 **不包含** session 歷史或驗證資料。這些資料位於
    `~/.openclaw/` (例如 `~/.openclaw/agents/<agentId>/sessions/`)。

    相關連結：[遷移](/zh-Hant/install/migrating)、[檔案儲存位置](#where-things-live-on-disk)、
    [Agent 工作區](/zh-Hant/concepts/agent-workspace)、[Doctor](/zh-Hant/gateway/doctor)、
    [遠端模式](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="在哪裡可以看到最新版本的更新內容？">
    請查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部區段標記為 **Unreleased**（未發布），則下一個帶日期的區段即為最新發布的版本。條目分為 **Highlights**（亮點）、**Changes**（變更）和 **Fixes**（修復）（以及在需要時的文檔/其他區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai (SSL 錯誤)">
    部份 Comcast/Xfinity 連線透過 Xfinity 進階安全性錯誤地阻擋了 `docs.openclaw.ai`。請停用該功能或將 `docs.openclaw.ai` 加入允許清單，然後重試。更多詳細資訊：[疑難排解](/zh-Hant/help/faq#docsopenclawai-shows-an-ssl-error-comcast-xfinity)。
    請在此回報以協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件已同步鏡像至 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Difference between stable and beta">
    **Stable** 和 **beta** 是 **npm dist-tags**，而不是獨立的代碼行：

    - `latest` = stable
    - `beta` = 用於測試的早期構建版本

    我們將構建版本發布到 **beta**，進行測試，一旦某個構建版本穩定，我們就會將其**提升至 `latest`**。這就是為什麼 beta 和 stable 可能指向**同一個版本**。

    檢視變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="如何安裝 Beta 版本，以及 Beta 和 Dev 版本有什麼區別？">
    **Beta** 是 npm dist-tag `beta`（可能與 `latest` 相符）。
    **Dev** 是 `main` (git) 的移動分支；發布時，它使用 npm dist-tag `dev`。

    單行指令 (macOS/Linux):

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell):
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多細節：[Development channels](/zh-Hant/install/development-channels) 和 [Installer flags](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="如何嘗試最新的版本？">
    有兩種選項：

    1. **開發頻道 (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從原始碼更新。

    2. **可修改的安裝 (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本機 repo，然後透過 git 更新。

    如果您偏好手動乾淨的 clone，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[更新](/zh-Hant/cli/update)、[開發頻道](/zh-Hant/install/development-channels)、
    [安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="安裝和入門通常需要多長時間？">
    概略指南：

    - **安裝：** 2-5 分鐘
    - **入門：** 5-15 分鐘，視您設定的頻道/模型數量而定

    如果卡住，請使用 [Installer stuck](#quick-start-and-first-run-setup)
    以及 [I am stuck](#quick-start-and-first-run-setup) 中的快速除錯循環。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多回饋？">
    使用 **詳細輸出** 重新執行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用詳細輸出進行 Beta 安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    針對可變動 的安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows (PowerShell) 對等指令：

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多選項：[Installer flags](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝顯示找不到 git 或無法辨識 openclaw">
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法辨識 openclaw**

    - 您的 npm global bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄加入您的使用者 PATH（Windows 上不需要 `\bin` 後綴；在大多數系統上是 `%AppData%\npm`）。
    - 更新 PATH 後，關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/zh-Hant/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 該怎麼辦？">
    這通常是由於原生 Windows Shell 的主控台字碼頁不匹配所導致。

    症狀：

    - `system.run`/`exec` 輸出將中文顯示為亂碼
    - 同一個指令在其他終端機設定檔中看起來正常

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

    如果您在最新版本的 OpenClaw 上仍然遇到此問題，請在以下位置追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件沒有回答我的問題 - 我該如何獲得更好的答案？">
    使用 **可破解的 (git) 安裝**，這樣您就可以在本地擁有完整的源代碼和文檔，然後
    從該文件夾_詢問您的機器人（或 Claude/Codex），以便它可以讀取存儲庫並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/zh-Hant/install) 和 [安裝程序標誌](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝 OpenClaw？">
    簡短回答：遵循 Linux 指南，然後運行入門嚮導。

    - Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
    - 完整指南：[入門指南](/zh-Hant/start/getting-started)。
    - 安裝程序 + 更新：[安裝與更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 均可。在伺服器上安裝，然後使用 SSH/Tailscale 連接 Gateway。

    指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
    遠端存取：[Gateway remote](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見提供商的 **託管中心**。選擇其中一個並按照指南操作：

    - [VPS 託管](/zh-Hant/vps) (所有提供商都在這裡)
    - [Fly.io](/zh-Hant/install/fly)
    - [Hetzner](/zh-Hant/install/hetzner)
    - [exe.dev](/zh-Hant/install/exe-dev)

    雲端運作方式：**Gateway 在伺服器上運行**，您可以透過控制 UI (或 Tailscale/SSH) 從筆記型電腦/手機存取它。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將 **節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway，以存取本機螢幕/相機/畫布，或在將 Gateway 保留在雲端時在您的筆記型電腦上執行指令。

    中心：[平台](/zh-Hant/platforms)。遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。
    節點：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 自我更新嗎？">
    簡短回答：**可以，但不建議**。更新流程可能會重新啟動
    Gateway（這會中斷目前的工作階段），可能需要乾淨的 git checkout，並且
    可能會提示確認。更安全的做法是：以操作員身分從 shell 執行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必須透過代理程式自動化執行：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文件：[更新](/zh-Hant/cli/update)、[正在更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="實際上架設流程做些什麼？">
    `openclaw onboard` 是推薦的設定途徑。在 **本地模式** 下，它會引導您完成：

    - **模型/身份驗證設定**（支援提供者 OAuth/setup-token 流程和 API 金鑰，以及 LM Studio 等本地模型選項）
    - **工作區** 位置 + 引導檔案
    - **閘道設定**（綁定/埠/認證/Tailscale）
    - **提供者**（WhatsApp、Telegram、Discord、Mattermost (plugin)、Signal、iMessage）
    - **守護程式安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd user unit）
    - **健康檢查** 和 **技能** 選擇

    如果您設定的模型未知或缺少認證，它也會發出警告。

  </Accordion>

  <Accordion title="我需要訂閱 Claude 或 OpenAI 才能運行這個嗎？">
    不需要。您可以透過 **API 金鑰** (Anthropic/OpenAI/其他) 或 **僅本機模型** 來運行 OpenClaw，讓您的資料保留在您的裝置上。訂閱 (Claude Pro/Max 或 OpenAI Codex) 只是驗證這些提供者的選用方式。

    如果您選擇 Anthropic 訂閱驗證，請自行決定是否使用：
    Anthropic 過去曾在 Claude Code 以外封鎖部分訂閱的使用。
    OpenAI Codex OAuth 明確支援 OpenClaw 等外部工具。

    文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
    [本機模型](/zh-Hant/gateway/local-models)、[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    是的。您可以使用 **setup-token** 進行驗證，而不是 API 金鑰。這是訂閱路徑。

    Claude Pro/Max 訂閱 **不包含 API 金鑰**，因此這是訂閱帳號的技術路徑。但這取決於您的決定：Anthropic 過去曾阻止部分在 Claude Code 之外的訂閱使用。
    如果您希望獲得生產環境中最清晰、最安全的支援路徑，請使用 Anthropic API 金鑰。

  </Accordion>

<Accordion title="Anthropic setup-token 驗證是如何運作的？">
  `claude setup-token` 透過 Claude Code CLI
  產生一個**權杖字串**（在網頁主控台中無法使用）。您可以在**任何機器**上執行它。在入門流程中選擇
  **Anthropic token (paste setup-token)**，或使用 `openclaw models auth paste-token --provider
  anthropic` 貼上它。該權杖會作為 **anthropic** 提供者的驗證設定檔儲存，並像 API
  金鑰一樣使用（不會自動重新整理）。更多細節：[OAuth](/zh-Hant/concepts/oauth)。
</Accordion>

  <Accordion title="我在哪裡可以找到 Anthropic 設定令牌 (setup-token)？">
    它**不會**出現在 Anthropic Console 中。設定令牌是由 **Claude Code CLI** 在**任何機器**上生成的：

    ```bash
    claude setup-token
    ```

    複製它列印出的令牌，然後在導入流程 中選擇 **Anthropic token (paste setup-token)**。如果您想在 gateway 主機上執行它，請使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方執行了 `claude setup-token`，請使用 `openclaw models auth paste-token --provider anthropic` 將其貼上到 gateway 主機上。參閱 [Anthropic](/zh-Hant/providers/anthropic)。

  </Accordion>

  <Accordion title="您是否支援 Claude 訂閱驗證（Claude Pro 或 Max）？">
    是的 - 透過 **setup-token**。OpenClaw 不再重複使用 Claude Code CLI OAuth 權杖；請使用 setup-token 或 Anthropic API 金鑰。您可以在任何地方生成權杖並將其貼上到閘道主機。請參閱 [Anthropic](/zh-Hant/providers/anthropic) 和 [OAuth](/zh-Hant/concepts/oauth)。

    重要提示：這是技術上的相容性，並非政策保證。Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用行為。
    您需要自行決定是否使用，並確認 Anthropic 目前的條款。
    對於生產環境或多使用者工作負載，Anthropic API 金鑰驗證是更安全、建議的選擇。

  </Accordion>

  <Accordion title="為什麼我會從 Anthropic 收到 HTTP 429 rate_limit_error 錯誤？">
    這表示您的 **Anthropic 配額/速率限制** 在目前時間範圍內已用盡。如果您
    使用的是 **Claude 訂閱** (setup-token)，請等待時間範圍
    重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請查看 Anthropic Console
    的使用量/計費情況，並視需要提高限制。

    如果訊息具體是：
    `Extra usage is required for long context requests`，則表示請求正在嘗試使用
    Anthropic 的 1M context beta (`context1m: true`)。這僅在您的
    憑證符合長內容計費資格（API 金鑰計費或已啟用額外使用量的訂閱）時才有效。

    提示：設定一個 **備用模型**，以便在提供者受到速率限制時，OpenClaw 能繼續回覆。
    請參閱 [Models](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">
  是的 - 通過 pi-ai 的 **Amazon Bedrock (Converse)** 提供商並採用 **手動配置**。您必須在 gateway
  主機上提供 AWS 憑證/區域，並在您的模型配置中新增 Bedrock 提供商條目。 請參閱 [Amazon
  Bedrock](/zh-Hant/providers/bedrock) 和 [模型提供商](/zh-Hant/providers/models)。如果您
  偏好託管金鑰流程，在 Bedrock 前面使用 OpenAI 相容的代理仍然是一個有效的選項。
</Accordion>

<Accordion title="Codex 驗證如何運作？">
  OpenClaw 支援透過 OAuth（ChatGPT 登入）使用 **OpenAI Code (Codex)**。入門流程可以執行 OAuth
  流程，並在適當時將預設模型設定為 `openai-codex/gpt-5.4`。請參閱 [模型
  提供者](/zh-Hant/concepts/model-providers) 與 [入門 (CLI)](/zh-Hant/start/wizard)。
</Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在外部工具/工作流程（如 OpenClaw）中使用訂閱 OAuth。入門程式可以為您執行 OAuth 流程。

    參閱 [OAuth](/zh-Hant/concepts/oauth)、[模型提供者](/zh-Hant/concepts/model-providers) 和 [入門 (CLI)](/zh-Hant/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是**外掛程式驗證流程**，而不是 `openclaw.json` 中的用戶端 ID 或密碼。

    步驟：

    1. 啟用外掛程式：`openclaw plugins enable google`
    2. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳細資訊：[模型提供者](/zh-Hant/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型適合休閒聊天嗎？">
  通常不適合。OpenClaw 需要大上下文 + 強安全性；小顯卡會截斷並洩漏。如果您
  勢必要用，請在本地運行您能運行的 **最大** MiniMax M2.5 版本（LM Studio）並參閱
  [/gateway/local-models](/zh-Hant/gateway/local-models)。更小/量化的模型會增加 提示詞注入的風險 -
  請參閱 [Security](/zh-Hant/gateway/security)。
</Accordion>

<Accordion title="如何將託管模型流量保持在特定區域？">
  選擇區域固定的端點。OpenRouter 提供了 MiniMax、Kimi 和 GLM 的美國託管選項；
  選擇美國託管的變體以將數據保持在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將
  Anthropic/OpenAI 與這些服務並列列出，
  這樣在遵守您選擇的區域提供商的同時，也能保持備用方案的可用性。
</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（Windows 透過 WSL2）上運行。Mac mini 是可選的——有些人會購買它作為始終開啟的主機，但小型 VPS、家庭伺服器或 Raspberry Pi 級別的設備也可以。

    您只需要一台 Mac 來使用 **僅限 macOS 的工具**。對於 iMessage，請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可在任何 Mac 上運行，而 Gateway 可在 Linux 或其他地方運行。如果您想使用其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能使用 iMessage 嗎？">
    您需要**某台已登入訊息 的 macOS 裝置**。它**不一定**要是 Mac mini——
    任何 Mac 都可以。請**使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)**（推薦）來使用 iMessage——BlueBubbles 伺服器在 macOS 上運行，而 Gateway 可以在 Linux 或其他地方運行。

    常見的設定方式：

    - 在 Linux/VPS 上運行 Gateway，並在任何已登入訊息 的 Mac 上運行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請將所有內容都在 Mac 上運行。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[Nodes](/zh-Hant/nodes)、
    [Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為 **node**（伴隨裝置）連線。Node 不執行 Gateway——它們提供額外功能，例如該裝置上的螢幕/相機/畫布以及 `system.run`。

    常見模式：

    - Mac mini 上的 Gateway（始終開啟）。
    - MacBook Pro 執行 macOS 應用程式或 node 主機並配對到 Gateway。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以用 Bun 嗎？">
    不建議使用 **Bun**。我們發現執行時有錯誤，特別是在 WhatsApp 和 Telegram 方面。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍想嘗試 Bun，請在非生產環境的閘道上進行，
    且不要用於 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram: allowFrom 應填入什麼？">
    `channels.telegram.allowFrom` 是 **人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    Onboarding 接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

    更安全（無第三方機器人）：

    - 私訊你的機器人，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊你的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/zh-Hant/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以使用一個 WhatsApp 號碼搭配不同的 OpenClaw 執行個體嗎？">
  是的，透過 **multi-agent routing**。將每個發送者的 WhatsApp **DM** (peer `kind: "direct"`, 發送者
  E.164 如 `+15551234567`) 繫結至不同的 `agentId`，這樣每個人都能擁有自己的 workspace 與 session
  store。回覆仍來自於 **同一個 WhatsApp 帳號**，且 DM 存取 控制 (`channels.whatsapp.dmPolicy` /
  `channels.whatsapp.allowFrom`) 是針對每個 WhatsApp 帳號的全域設定。請參閱 [Multi-Agent
  Routing](/zh-Hant/concepts/multi-agent) 與 [WhatsApp](/zh-Hant/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行一個「快速聊天」代理和一個「用於編碼的 Opus」代理嗎？">
  可以。使用多代理路由：為每個代理分配其自己的預設模型，然後將入站路由
  （提供商帳戶或特定對等點）綁定到每個代理。範例配置位於 [Multi-Agent
  Routing](/zh-Hant/concepts/multi-agent)。另請參閱 [Models](/zh-Hant/concepts/models) 和
  [Configuration](/zh-Hant/gateway/configuration)。
</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或是您的 brew 前綴)，這樣 `brew` 安裝的工具才能在非登入 shell 中解析。
    近期的版本也會在 Linux systemd 服務中預先加入常見的使用者 bin 目錄 (例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`)，並在有設定時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可駭的 git 安裝與 npm 安裝之間的區別">
    - **可駭（git）安裝：** 完整的原始碼簽出，可編輯，最適合貢獻者。
      您在本地執行建置並可以修補程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無 repo，最適合「直接執行它」。
      更新來自 npm dist-tags。

    文件：[入門指南](/zh-Hant/start/getting-started)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="稍後我可以切換 npm 和 git 安裝嗎？">
    可以。安裝另一種版本，然後運行 Doctor，使網關服務指向新的入口點。
    這**不會刪除您的數據**——它只是更改 OpenClaw 代碼安裝。您的狀態
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

    備份提示：請參閱 [備份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在我的筆記型電腦或 VPS 上執行 Gateway 嗎？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您想要
    最低的摩擦力並且可以接受睡眠/重新啟動，則在本地執行。

    **筆記型電腦（本機 Gateway）**

    - **優點：** 沒有伺服器成本，直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 睡眠/網路中斷 = 連線斷開，作業系統更新/重新啟動會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 始終在線，穩定的網路，沒有筆記型電腦睡眠問題，更容易保持執行。
    - **缺點：** 通常無頭執行（使用螢幕截圖），僅限遠端檔案存取，您必須 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost (外掛)/Discord 都可以在 VPS 上正常運作。唯一真正的取捨是 **無頭瀏覽器** 與可見視窗的比較。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    **建議預設值：** 如果您之前有 Gateway 中斷連線，請使用 VPS。當您正在積極使用 Mac 並且想要本機檔案存取或具有可見瀏覽器的 UI 自動化時，本機非常適合。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    並非必要，但**為了可靠性和隔離性建議執行**。

    - **專用主機 (VPS/Mac mini/Pi):** 永遠線上，較少因休眠/重啟而中斷，權限更乾淨，更容易保持執行。
    - **共用筆記型電腦/桌面電腦:** 對於測試和主動使用來說完全沒問題，但當電腦休眠或更新時會發生暫停。

    如果您想要兩全其美，請將 Gateway 保留在專用主機上，並將您的筆記型電腦配對為本機螢幕/相機/exec 工具的 **節點**。請參閱 [節點](/zh-Hant/nodes)。
    若要了解安全性指引，請閱讀 [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低需求與建議作業系統為何？">
    OpenClaw 是輕量級的。對於基本的 Gateway 加上一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **建議配置：** 1-2 vCPU，2GB RAM 或更多以保留餘裕（日誌、媒體、多頻道）。Node 工具與瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS**（或任何現代的 Debian/Ubuntu）。Linux 安裝路徑在此經過最完善的測試。

    文件：[Linux](/zh-Hant/platforms/linux), [VPS hosting](/zh-Hant/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？有哪些需求？">
    可以。將 VM 視為與 VPS 相同：它需要保持永遠開機、可連線，並且有足夠的
    RAM 供閘道以及您啟用的任何頻道使用。

    基準指南：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議：** 2GB RAM 或更多，如果您執行多個頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 樣式設定**，並且具有最佳的工具
    相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS 託管](/zh-Hant/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話說明什麼是 OpenClaw？">
    OpenClaw 是您在自己的設備上運行的個人 AI 助手。它在您已使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost (plugin)、Discord、Google Chat、Signal、iMessage、WebChat），並且在支援的平台上還可以進行語音互動 + 即時 Canvas。**Gateway** 是永遠在線的控制平面；而助手則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的封裝」。它是一個**以本地為先的控制平面**，讓您能在**自己的硬體**上運行
    功能強大的助手，從您已經使用的聊天應用程式訪問，並擁有
    有狀態的會話、記憶和工具 - 而無需將您的工作流程控制權交給
    託管的 SaaS。

    重點亮點：

    - **您的裝置，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）運行 Gateway，並保持
      工作空間 + 會話歷史在本機。
    - **真實的管道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等等，
      加上支援的平台上還有行動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並具有每個代理的路由
      和故障轉移。
    - **僅限本機的選項：** 運行本機模型，因此如果需要，**所有資料都可以留在您的裝置上**。
    - **多代理路由：** 針對每個管道、帳戶或任務分離代理，每個都有自己的
      工作空間和預設值。
    - **開源且可駭客化：** 檢查、擴展和自我託管，而無供應商鎖定。

    文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
    [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="我剛設定好——首先該做什麼？">
    很適合練習的專案：

    - 建立一個網站（WordPress、Shopify 或簡單的靜態網站）。
    - 製作行動應用程式原型（大綱、畫面、API 規劃）。
    - 整理檔案與資料夾（清理、命名、加上標籤）。
    - 連結 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將其分階段進行並
    使用子代理程式進行平行處理時，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的前五大日常應用場景是什麼？">
    日常常見的用途通常包括：

    - **個人簡報：** 收件箱、行事曆以及您關注的新聞摘要。
    - **研究與草擬：** 快速研究、摘要，以及針對郵件或文件的初稿。
    - **提醒與追蹤：** 由 cron 或心跳驅動的提醒與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集資料以及重複執行的網頁任務。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取回結果。

  </Accordion>

  <Accordion title="OpenClaw 是否能協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格營運？">
    在**研究、篩選和草擬**方面是肯定的。它可以掃描網站、建立清單、
    彙總潛在客戶，並撰寫外聯或廣告文案草稿。

    對於**外聯或廣告投放**，請保持人工介入。避免垃圾郵件，遵守當地法律和
    平台政策，並在發送前審核所有內容。最安全的模式是讓
    OpenClaw 草擬，然後由您審核批准。

    文件：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code，OpenClaw 在網頁開發上有什麼優勢？">
    OpenClaw 是一個 **個人助理** 和協調層，並非 IDE 的替代品。若要
    在程式庫中取得最快的直接編碼迴圈，請使用
    Claude Code 或 Codex。當您
    需要持久記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

    優勢：

    - 跨會話的 **持久記憶 + 工作區**
    - **多平台存取** (WhatsApp, Telegram, TUI, WebChat)
    - **工具協調** (瀏覽器、檔案、排程、hooks)
    - **永遠在線的閘道** (在 VPS 上執行，從任何地方互動)
    - 用於本機瀏覽器/螢幕/攝像機/exec 的 **節點**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不弄髒倉庫的情況下自定義技能？">
    請使用受管的覆寫，而不是直接編輯倉庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增資料夾）。優先順序為 `<workspace>/skills` > `~/.openclaw/skills` > 內建，因此受管的覆寫會在無需觸碰 git 的情況下取得優先權。只有值得合併到上游的編輯才應該保留在倉庫中並作為 PR 提交。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 加入額外目錄（優先級最低）。預設優先級維持：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 會在下一次工作階段將其視為 `<workspace>/skills`。
  </Accordion>

  <Accordion title="如何針對不同任務使用不同的模型？">
    目前支援的模式如下：

    - **Cron jobs**：隔離作業可以為每個作業設定 `model` 覆蓋值。
    - **Sub-agents**：將任務路由到具有不同預設模型的獨立代理程式。
    - **On-demand switch**：使用 `/model` 隨時切換目前的工作階段模型。

    參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我如何將其卸載？">
    針對長時間或平行任務使用 **sub-agents**。Sub-agents 在自己的會話中運行，
    返回摘要，並保持您的主要聊天響應。

    要求您的機器人 "spawn a sub-agent for this task" 或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway 目前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和 sub-agents 都會消耗 tokens。如果成本是個問題，請透過 `agents.defaults.subagents.model`
    為 sub-agents 設定更便宜的模型。

    文件：[Sub-agents](/zh-Hant/tools/subagents)。

  </Accordion>

  <Accordion title="Discord 上綁定執行緒的子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保持在該綁定的會話上。

    基本流程：

    - 使用 `sessions_spawn` 配合 `thread: true` 產生（可選擇搭配 `mode: "session"` 以進行持續的後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    所需配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆蓋值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 產生時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[Configuration Reference](/zh-Hant/gateway/configuration-reference)、[Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我應該檢查什麼？">
    Cron 在 Gateway 程序內部運行。如果 Gateway 沒有持續運行，
    排程的工作將不會運行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運行（無休眠/重啟）。
    - 驗證工作的時區設定 (`--tz` 與主機時區的對比)。

    除錯：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝技能？">
    使用 **ClawHub** (CLI) 或將技能放入您的工作區。macOS 技能 UI 在 Linux 上不可用。
    在 [https://clawhub.com](https://clawhub.com) 瀏覽技能。

    安裝 ClawHub CLI（選擇一個套件管理器）：

    ```bash
    npm i -g clawhub
    ```

    ```bash
    pnpm add -g clawhub
    ```

  </Accordion>

  <Accordion title="OpenClaw 可以排程執行任務或在後端持續執行嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後持續存在）。
    - **Heartbeat** 用於「主會話」週期性檢查。
    - **Isolated jobs** 用於發布摘要或傳送訊息至聊天室的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上執行僅限 Apple macOS 的技能嗎？">
    無法直接執行。macOS 技能受 `metadata.openclaw.os` 以及必要的二進位檔案限制，只有當技能在 **Gateway 主機** 上符合資格時，才會出現在系統提示詞中。在 Linux 上，`darwin` 專屬技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入，除非您覆寫該限制。

    您有三種支援的選擇：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔案的地方執行 Gateway，然後透過 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 從 Linux 連線。因為 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（不需要 SSH）。**
    在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **節點執行指令** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進位檔案時，OpenClaw 可以將 macOS 專屬技能視為符合資格。代理程式透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示詞中批准「Always Allow」會將該指令加入允許清單。

    **選項 C - 透過 SSH 代理 macOS 二進位檔案（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進位檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二進位檔案建立 SSH 包裝程式（例如：針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆寫技能中繼資料（工作區或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動新的工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="你是否有 Notion 或 HeyGen 整合功能？">
    目前尚未內建。

    選項如下：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion/HeyGen 皆有 API）。
    - **瀏覽器自動化：** 無需程式碼即可運作，但速度較慢且較不穩定。

    若您希望為每個客戶保留上下文（代理商工作流程），一個簡單的範式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 在會話開始時要求 Agent 擷取該頁面。

    若您需要原生整合，請開啟功能請求或建構針對這些 API 的技能。

    安裝技能：

    ```bash
    clawhub install <skill-slug>
    clawhub update --all
    ```

    ClawHub 會安裝到當前目錄下的 `./skills` 中（或回退到您設定的 OpenClaw 工作區）；OpenClaw 在下一次會話中會將其視為 `<workspace>/skills`。若要在 Agent 間共享技能，請將它們放在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能預期透過 Homebrew 安裝二進位檔；在 Linux 上這表示 Linuxbrew（請參閱上方的 Homebrew Linux 常見問題條目）。請參閱 [技能](/zh-Hant/tools/skills) 和 [ClawHub](/zh-Hant/tools/clawhub)。

  </Accordion>

  <Accordion title="如何使用我現有已登入的 Chrome 與 OpenClaw？">
    使用內建的 `user` 瀏覽器設定檔，它透過 Chrome DevTools MCP 連結：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑是主機本地的。如果 Gateway 在其他地方運行，請在瀏覽器機器上執行節點主機，或者改用遠端 CDP。

  </Accordion>
</AccordionGroup>

## 沙盒與記憶體

<AccordionGroup>
  <Accordion title="是否有專門的沙盒文件？">
    有的。請參閱 [沙盒](/zh-Hant/gateway/sandboxing)。關於 Docker 特定的設定（Docker 中的完整 gateway 或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺功能受限 - 如何啟用完整功能？">
    預設映像檔以安全為先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或捆綁的瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項目內建至映像檔中。
    - 透過捆綁的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以讓私訊保持個人化，並讓群組公開/沙盒化，只使用一個代理程式嗎？">
    可以 - 如果您的私人流量是 **私訊 (DMs)**，而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道會話（非主要金鑰）在 Docker 中執行，而主要的私訊會話則留在主機上。然後透過 `tools.sandbox.tools` 限制沙盒化會話中可用的工具。

    設定逐步解說 + 範例設定：[群組：個人私訊 + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定參考：[閘道器設定](/zh-Hant/gateway/configuration-reference#agents-defaults-sandbox)

  </Accordion>

<Accordion title="如何將主機資料夾綁定至沙箱？">
  將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]`（例如
  `"/home/user/src:/src:ro"`）。全域與個別代理的綁定會合併；當 `scope: "shared"`
  時，會忽略個別代理的綁定。對任何敏感內容請使用 `:ro`，並記得綁定會繞過沙箱 檔案系統牆。請參閱
  [沙箱隔離](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 與 [Sandbox vs Tool Policy vs
  Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)
  以了解 範例與安全注意事項。
</Accordion>

  <Accordion title="記憶如何運作？">
    OpenClaw 的記憶只是代理工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的精選長期筆記（僅限主要/私人工作階段）

    OpenClaw 還會執行**無預壓縮記憶清除**，以提醒模型在自動壓縮之前寫入持久筆記。這僅在工作區可寫入時執行（唯讀沙箱會跳過此步驟）。請參閱 [記憶](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶總是忘記事情。我該如何讓它記住？">
    要求機器人 **將事實寫入記憶**。長期筆記屬於 `MEMORY.md`，
    短期語境則進入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有所幫助；
    它會知道該怎麼做。如果它持續忘記，請驗證 Gateway 在每次執行時是否使用相同的
    工作區。

    文件：[Memory](/zh-Hant/concepts/memory), [Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶體會永久保存嗎？有什麼限制？">
    記憶體檔案儲存在磁碟上，會持續保存直到您將其刪除。其限制取決於您的
    儲存空間，而非模型本身。**工作階段內容** 仍然受限於模型的
    內容視窗，因此較長的對話可能會被壓縮或截斷。這就是為什麼
    存在記憶體搜尋功能——它只將相關部分拉回內容中。

    文件：[Memory](/zh-Hant/concepts/memory)、[Context](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋需要 OpenAI API 金鑰嗎？">
    只有在使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋了聊天/完成，
    但**不**授予嵌入存取權限，因此**使用 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語意記憶搜尋沒有幫助。OpenAI 嵌入
    仍然需要真正的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，當 OpenClaw 可以解析
    API 金鑰時（auth profiles、`models.providers.*.apiKey` 或環境變數），它會自動選擇一個提供者。
    如果解析到 OpenAI 金鑰，它偏好 OpenAI；如果解析到 Gemini 金鑰，則偏好 Gemini，
    然後是 Voyage，接著是 Mistral。如果沒有可用的遠端金鑰，記憶體
    搜尋將保持停用狀態，直到您對其進行設定。如果您已設定並存在本機模型路徑，OpenClaw
    偏好 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持本機，請設定 `memorySearch.provider = "local"`（並可選地設定
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
    模型 - 詳細設定資訊請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 檔案系統中的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有資料都會儲存在本地嗎？">
    不會 - **OpenClaw 的狀態是本地的**，但 **外部服務仍能看到您發送給它們的內容**。

    - **預設為本地：** 會話、記憶檔案、設定和工作區位於 Gateway 主機上
      (`~/.openclaw` + 您的工作區目錄)。
    - **必要時遠端：** 您發送給模型提供商 (Anthropic/OpenAI/等) 的訊息會傳送至
      其 API，而聊天平台 (WhatsApp/Telegram/Slack/等) 會在其伺服器上儲存訊息資料。
    - **您可控製範圍：** 使用本地模型可將提示保留在您的機器上，但頻道
      流量仍會經過頻道的伺服器。

    相關：[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[記憶](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設值：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主設定檔 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到認證設定檔）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 認證設定檔（OAuth、API 金鑰和可選的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | `file` SecretRef 提供者的可選檔案支援秘密負載 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 工作階段中繼資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶體檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行設定（預設值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`（當 `MEMORY.md` 不存在時，舊版後援為 `memory.md`）、
      `memory/YYYY-MM-DD.md`、可選的 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)**: config、credentials、auth profiles、sessions、logs
      以及共享的 skills (`~/.openclaw/skills`)。

    預設的工作區是 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了資訊，請確認 Gateway 在每次啟動時都使用相同的
    workspace（請記住：遠端模式使用的是 **gateway 主機的**
    workspace，而非您本地的筆電）。

    提示：如果您希望行為或偏好設定能持久保存，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    請參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 與 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="Recommended backup strategy">
    將您的 **agent workspace**（工作區）放入一個 **私人** git 儲存庫，並將其備份到
    私密的地方（例如 GitHub 私有儲存庫）。這會捕捉記憶體 + AGENTS/SOUL/USER
    檔案，並讓您稍後還原助手的「心智」。

    請 **勿** 將 `~/.openclaw` 下的任何內容提交（憑證、工作階段、權杖或加密的秘密資料載荷）。
    如果您需要完全還原，請分別備份工作區和狀態目錄
    （請參閱上述遷移問題）。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="How do I completely uninstall OpenClaw?">
  請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。
</Accordion>

  <Accordion title="代理程式可以在工作區外運作嗎？">
    可以。工作區是 **預設的工作目錄 (cwd)** 和記憶錨點，而不是一個嚴格的沙盒。
    相對路徑在工作區內解析，但除非啟用了沙盒功能，否則絕對路徑可以存取其他
    主機位置。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或每個代理程式的沙盒設定。如果您
    希望某個儲存庫成為預設的工作目錄，請將該代理程式的
    `workspace` 指向儲存庫根目錄。OpenClaw 儲存庫只是原始碼；請將
    工作區分開，除非您有意讓代理程式在其中運作。

    範例（將儲存庫作為預設 cwd）：

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

  <Accordion title="我處於遠端模式 - 工作階段存放區在哪裡？">
    工作階段狀態是由**閘道主機**擁有的。如果您處於遠端模式，您關心的工作階段存放區位於遠端機器上，而不是您的本地筆記型電腦。請參閱[工作階段管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定（預設：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用相對安全的預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設置了 gateway.bind: "lan" (或 "tailnet")，現在沒有監聽 / UI 顯示未授權'>
    非回環綁定**需要授權**。配置 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

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

    註意事項：

    - `gateway.remote.token` / `.password` 本身**不**會啟用本地網關授權。
    - 僅當未設置 `gateway.auth.*` 時，本地調用路徑才能將 `gateway.remote.*` 作為後備。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通過 SecretRef 顯式配置但未解析，解析將失敗關閉（無遠程後備掩蓋）。
    - Control UI 通過 `connect.params.auth.token` 進行身份驗證（存儲在 app/UI 設置中）。請避免將令牌放在 URL 中。

  </Accordion>

  <Accordion title="為什麼現在在 localhost 上需要 token？">
    OpenClaw 預設強制執行 token 驗證，包括回環。如果未配置 token，閘道啟動時會自動產生一個並將其儲存至 `gateway.auth.token`，因此 **本地 WS 客戶端必須通過驗證**。這可阻擋其他本機程序呼叫閘道。

    如果您**真的**想要開放回環，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 隨時可以為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改設定後需要重新啟動嗎？">
    Gateway 會監控設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱應用安全變更，針對關鍵變更則重新啟動
    - `hot`、`restart` 和 `off` 也有支援

  </Accordion>

  <Accordion title="如何停用有趣的 CLI 標語？">
    在 config 中設定 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隱藏標語文字，但保留橫幅標題/版本列。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪換顯示有趣/節慶標語（預設行為）。
    - 如果您完全不想要橫幅，請設定 env 變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 需要為您選擇的提供者（Brave、Gemini、Grok、Kimi 或 Perplexity）提供金鑰。
    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
    環境變數替代方案：

    - Brave：`BRAVE_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

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

    特定提供者的網路搜尋組態現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應用於新的組態。

    備註：

    - 如果您使用允許清單，請加入 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - Daemon 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web 工具](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的設定。我該如何復原並避免這種情況？">
    `config.apply` 會取代**整個設定**。如果您發送部分物件，其餘所有內容
    都會被移除。

    復原：

    - 從備份還原（git 或複製的 `~/.openclaw/openclaw.json`）。
    - 如果您沒有備份，請重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果這是未預期的情況，請提交錯誤報告並附上您最後的已知設定或任何備份。
    - 本地編碼代理通常可以從日誌或歷史記錄重建可用的設定。

    避免發生：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。

    文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="如何透過裝置上的專用 Worker 執行中央 Gateway？">
    常見的模式是 **一個 Gateway**（例如樹莓派）加上 **節點** 和 **代理程式**：

    - **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和工作階段。
    - **Nodes（裝置）：** Mac/iOS/Android 作為外圍裝置連接並公開本機工具（`system.run`, `canvas`, `camera`）。
    - **Agents（Workers）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner 營運」、「個人資料」）。
    - **Sub-agents：** 當您需要並行處理時，從主代理程式產生背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

    文件：[Nodes](/zh-Hant/nodes)、[Remote access](/zh-Hant/gateway/remote)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭運行嗎？">
    是的。這是一個配置選項：

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

    預設是 `false` (有頭模式)。在某些網站上，無頭模式更容易觸發反機器人檢查。參見 [瀏覽器](/zh-Hant/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、抓取、登入）。主要區別如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常封鎖無頭會話。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱 [瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端閘道與節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、閘道和節點之間傳遞？">
    Telegram 訊息由 **閘道 (gateway)** 處理。閘道運行代理程式，
    並且僅在需要節點工具時透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到傳入的提供者流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以
    透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、攝影機、系統）。

    典型設定：

    1. 在永久運行主機（VPS/家用伺服器）上執行 Gateway。
    2. 將 Gateway 主機與您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可連線（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）連線
       以便註冊為節點。
    5. 在 Gateway 上核准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要額外的 TCP 橋接器；節點透過 Gateway WebSocket 連線。

    安全提醒：配對 macOS 節點允許 `system.run` 在該機器上執行。僅
    配對您信任的裝置，並參閱 [安全性](/zh-Hant/gateway/security)。

    文件：[節點](/zh-Hant/nodes)、[Gateway 協定](/zh-Hant/gateway/protocol)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)、[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回應。現在該怎麼辦？">
    檢查基本事項：

    - 閘道正在執行：`openclaw gateway status`
    - 閘道健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證身分驗證和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 隧道連線，請確認本機隧道已啟動並指向正確的連接埠。
    - 確認您的允許名單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例能否互相通訊（本地 + VPS）？">
    可以。目前沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式進行連線：

    **最簡單：** 使用兩個機器人都能存取的一般聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 傳送訊息給機器人 B，然後讓機器人 B 像平常一樣回覆。

    **CLI 橋接（通用）：** 執行一個腳本，使用 `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標指向另一個機器人正在監聽的聊天頻道。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [Remote access](/zh-Hant/gateway/remote)）。

    範例模式（從可以連線到目標 Gateway 的機器上執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：新增一個防護機制，以免兩個機器人無限迴圈（僅限提及、頻道
    白名單，或是「不要回覆機器人訊息」的規則）。

    文件：[Remote access](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理都有自己的工作區、模型預設值
    和路由。這是常見的設定，比為每個代理運行一個 VPS 更便宜且更簡單。

    僅當您需要強隔離（安全邊界）或您不想共享的非常不同的配置時，才使用分開的 VPS。
    否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與其從 VPS 使用 SSH，直接在個人筆記型電腦上使用節點有什麼好處嗎？">
    是的——節點是從遠端 Gateway 連接您的筆記型電腦的首要方式，而且它們提供的功能不僅限於 Shell 存取。Gateway 運行於 macOS/Linux（Windows 則透過 WSL2）且十分輕量化（小型 VPS 或樹莓派等級的裝置即可；4 GB RAM 綽綽有餘），因此常見的設定方式是一台永久運作的主機加上您的筆記型電腦作為節點。

    - **不需要傳入 SSH。** 節點會主機向外連接至 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受限於該筆記型電腦上的節點允許清單/核准機制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還會公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 附加至主機上的本機 Chrome。

    SSH 適合臨時的 Shell 存取，但在持續進行的 Agent 工作流程和裝置自動化方面，節點更為簡單。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您刻意執行獨立的設定檔（請參閱[多個閘道](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行**一個閘道**。節點是連線
    至閘道的周邊裝置（iOS/Android 節點，或 macOS 選單列應用程式中的「節點模式」）。若要了解無頭節點
    主機與 CLI 控制，請參閱[節點主機 CLI](/zh-Hant/cli/node)。

    對於 `gateway`、`discovery` 和 `canvasHost` 的變更，需要完全重新啟動。

  </Accordion>

<Accordion title="是否有 API / RPC 方式可以套用設定？">
  有的。`config.apply` 會驗證 + 寫入完整設定，並在作業過程中重新啟動閘道。
</Accordion>

  <Accordion title="初次安裝的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這會設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="如何在 VPS 上設置 Tailscale 並從我的 Mac 連線？">
    最小步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理控制台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您希望在不使用 SSH 的情況下使用控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將閘道綁定到 loopback 並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連線到遠端 Gateway (Tailscale Serve)？">
    Serve 會暴露 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連線。

    推薦設定：

    1. **確保 VPS + Mac 位於同一個 tailnet 上**。
    2. **在遠端模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會透過隧道傳輸 Gateway 連接埠並作為節點連線。
    3. **在 gateway 上核准該節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway 協定](/zh-Hant/gateway/protocol)、[探索](/zh-Hant/gateway/discovery)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝還是直接新增一個節點？">
    如果您在第二台筆記型電腦上只需要 **本地工具**（螢幕/相機/指令執行），請將其作為
    **節點** 新增。這樣可以保持單一 Gateway 並避免重複的配置。本地節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    僅當您需要 **強隔離** 或兩個完全獨立的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 會從父行程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 當前工作目錄中的 `.env`
    - 來自 `~/.openclaw/.env`（亦即 `$OPENCLAW_STATE_DIR/.env`）的全域後備 `.env`

    兩個 `.env` 檔案都不會覆蓋既有的環境變數。

    您也可以在設定中定義內聯環境變數（僅在行程環境中缺失時套用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    查閱 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序與來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但我的環境變數消失了。現在該怎麼辦？">
    兩個常見的修復方法：

    1. 將遺失的金鑰放入 `~/.openclaw/.env`，這樣即使服務未繼承您的 shell 環境，也能載入它們。
    2. 啟用 shell 匯入（選擇性便利功能）：

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

    這會執行您的登入 shell 並僅匯入遺失的預期金鑰（絕不覆蓋）。等效的環境變數：
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off.」。為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**。「Shell env: off」
    並**不**代表缺少您的環境變數——這僅表示 OpenClaw 不會自動載入
    您的登入 shell。

    如果 Gateway 以服務形式運作（launchd/systemd），它將不會繼承您的 shell
    環境。請執行以下其中一項操作來修正：

    1. 將 token 放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell import（`env.shellEnv.enabled: true`）。
    3. 或將其新增至您的設定 `env` 區塊（僅在遺失時適用）。

    然後重新啟動 gateway 並再次檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
    參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 和 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## 工作階段與多重對話

<AccordionGroup>
  <Accordion title="如何開始新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱[工作階段管理](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不發送 /new，工作階段會自動重置嗎？">
    會的。工作階段會在 `session.idleMinutes`（預設 **60**）後過期。**下一則**訊息會為該聊天金鑰啟動一個新的工作階段 ID。這不會刪除對話紀錄——它只是開始一個新的工作階段。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法組建一個 OpenClaw 實例團隊（一個 CEO 和多個代理）？">
    是的，透過 **多代理路由** 和 **子代理**。您可以建立一個協調者
    代理以及幾個擁有自己工作區和模型的工作者代理。

    也就是說，這最好被視為一個**有趣的實驗**。它很消耗 token，而且通常
    比使用一個具有獨立會話的機器人效率低。我們設想的典型模型
    是您與一個機器人對話，並使用不同的會話進行並行工作。該機器人
    也可以在需要時生成子代理。

    文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[子代理](/zh-Hant/tools/subagents)、[Agents CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼任務中途上下文會被截斷？我該如何預防？">
    會話上下文受到模型視窗的限制。長時間的對話、龐大的工具輸出或大量檔案都可能觸發壓縮或截斷。

    以下方法有幫助：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在執行長時間任務前使用 `/compact`，並在切換話題時使用 `/new`。
    - 將重要的上下文保留在工作區中，並要求機器人重新讀取。
    - 對於漫長或並行的工作，使用子代理，以保持主對話較為精簡。
    - 如果這種情況經常發生，請選擇一個具有更大上下文視窗的模型。

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

    備註：

    - 如果 Onboarding 偵測到現有設定，也會提供 **Reset** 選項。請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用過設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發設定 + 憑證 + 會話 + 工作區)。

  </Accordion>

  <Accordion title='我遇到「context too large」錯誤——如何重置或壓縮？'>
    使用下列其中一種方式：

    - **壓縮 (Compact)**（保留對話但總結較舊的輪次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置 (Reset)**（為相同的聊天金鑰建立新的 session ID）：

      ```
      /new
      /reset
      ```

    如果問題持續發生：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有更大內容視窗的模型。

    文件：[Compaction](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session management](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我會看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    這是一個提供者驗證錯誤：模型發出了一個 `tool_use` 區塊但缺少所需的
    `input`。這通常意味著會話歷史記錄已過時或損壞（通常發生在長對話
    或工具/架構變更後）。

    修復方法：使用 `/new`（獨立訊息）開始一個新的會話。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30m** 執行一次。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和 markdown
    標題如 `# Heading`），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行，模型會決定要做什麼。

    每個代理的覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」加入到 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，所以如果您在群組中，OpenClaw 就可以看到它。
    預設情況下，群組回覆會被阻擋，直到您允許發送者 (`groupPolicy: "allowlist"`)。

    如果您希望只有**您**能夠觸發群組回覆：

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

  <Accordion title="如何獲取 WhatsApp 群組的 JID？">
    選項 1（最快）：追蹤日誌並在群組中發送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經配置/列入白名單）：從配置列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[目錄](/zh-Hant/cli/directory)、[日誌](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及門檻已開啟（預設）。你必須 @提及機器人（或符合 `mentionPatterns`）。
    - 你配置了 `channels.whatsapp.groups` 但未設定 `"*"`，且該群組未被加入白名單。

    請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與私人訊息共用情境？">
  私人聊天預設會合併至主會話。群組/頻道擁有自己的會話金鑰， 且 Telegram 主題 / Discord
  執行緒是獨立的會話。請參閱 [群組](/zh-Hant/channels/groups) 和
  [群組訊息](/zh-Hant/channels/group-messages)。
</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會議和文字紀錄儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理程式越多表示並發的模型用量越多。
    - **維運負擔：** 每個代理程式的設定檔、工作區和通道路由。

    建議：

    - 每個代理程式維持一個 **使用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增長，請修剪舊的會議（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來找出遺留的工作區和設定檔不符的問題。

  </Accordion>

  <Accordion title="我可以同時運行多個機器人或聊天 (Slack)，該如何設置？">
    可以。使用 **Multi-Agent Routing**（多智能體路由）來運行多個隔離的智能體，並通過
    頻道/帳戶/對等端路由傳入訊息。Slack 受支持作為一個頻道，並可以綁定到特定的智能體。

    瀏覽器存取功能強大，但並非「能做任何人類能做的事」—— 反機器人措施、驗證碼 (CAPTCHA) 和
    多重要素驗證 (MFA) 仍可能阻止自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際運行瀏覽器的機器上使用 CDP。

    最佳實踐設置：

    - 始終運行的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個智能體（綁定）。
    - 綁定到這些智能體的 Slack 頻道。
    - 需要時通過 Chrome MCP 使用本機瀏覽器或節點。

    文檔：[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [Browser](/zh-Hant/tools/browser)、[Nodes](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定為：

    ```
    agents.defaults.model.primary
    ```

    模型會被引用為 `provider/model`（例如：`anthropic/claude-opus-4-6`）。如果您省略供應商，OpenClaw 目前會假設 `anthropic` 作為暫時的棄用回退方案——但您仍應**明確**設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪種模型？">
    **推薦預設：** 使用您的供應商堆疊中最強大的最新一代模型。
    **對於啟用工具或不受信任輸入的代理：** 優先考慮模型強度而非成本。
    **對於常規/低風險聊天：** 使用較便宜的備用模型，並根據代理角色進行路由。

    MiniMax 有其自己的文檔：[MiniMax](/zh-Hant/providers/minimax) 和
    [本地模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，請使用您**負擔得起的最佳模型**；對於常規聊天或摘要，使用較便宜的模型。您可以根據代理路由模型，並使用子代理來並行化長任務（每個子代理都會消耗 tokens）。請參閱 [模型](/zh-Hant/concepts/models) 和
    [子代理](/zh-Hant/tools/subagents)。

    強烈警告：較弱/過度量化模型更容易受到提示詞注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **模型** 欄位。避免完全替換配置。

    安全的選項：

    - 在聊天中使用 `/model`（快速，僅限當前會話）
    - `openclaw models set ...`（僅更新模型配置）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個配置，否則請避免使用部分物件進行 `config.apply`。
    如果您確實覆蓋了配置，請從備份還原或重新執行 `openclaw doctor` 以進行修復。

    文件：[Models](/zh-Hant/concepts/models)、[Configure](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管的模型（llama.cpp、vLLM、Ollama）嗎？">
    可以。Ollama 是本地模型最簡單的途徑。

    最快的設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 下載一個本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您同時想要 Ollama Cloud，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    注意事項：

    - `Cloud + Local` 會讓您同時擁有 Ollama Cloud 模型和您的本地 Ollama 模型
    - 雲端模型（例如 `kimi-k2.5:cloud`）不需要在本地下載
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：體積較小或經過高度量化的模型更容易受到提示注入
    的攻擊。對於任何可以使用工具的機器人，我們強烈建議使用 **大型模型**。
    如果您仍想要使用小型模型，請啟用沙盒機制和嚴格的工具允許清單。

    文件：[Ollama](/zh-Hant/providers/ollama)、[本地模型](/zh-Hant/gateway/local-models)、
    [模型提供商](/zh-Hant/concepts/model-providers)、[安全性](/zh-Hant/gateway/security)、
    [沙盒機制](/zh-Hant/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">
  - 這些部署可能有所不同，且可能隨時間變更；沒有固定的供應商建議。 - 使用 `openclaw models status`
  檢查每個閘道器上的目前執行時設定。 -
  對於安全敏感性/已啟用工具的代理程式，請使用可用的最強大最新世代模型。
</Accordion>

  <Accordion title="如何動態切換模型（無需重啟）？">
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

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）會顯示一個簡潔的編號選擇器。透過編號進行選擇：

    ```
    /model 3
    ```

    您也可以為提供商強制指定特定的驗證設定檔（每次工作階段）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前哪個代理程式處於活動狀態、正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個驗證設定檔。
    它還會在可用時顯示已配置的提供者端點（`baseUrl`）和 API 模式（`api`）。

    **如何取消固定我用 @profile 設定的設定檔？**

    重新執行 `/model` **但不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想要返回預設值，請從 `/model` 中選取（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前活動的驗證設定檔。

  </Accordion>

  <Accordion title="我可以將 GPT 5.2 用於日常任務，並將 Codex 5.3 用於編寫代碼嗎？">
    可以。將其中一個設為默認，然後根據需要進行切換：

    - **快速切換（每個會話）：** `/model gpt-5.2` 用於日常任務，`/model openai-codex/gpt-5.4` 使用 Codex OAuth 進行編碼。
    - **默認 + 切換：** 將 `agents.defaults.model.primary` 設置為 `openai/gpt-5.2`，然後在編碼時切換到 `openai-codex/gpt-5.4`（反之亦然）。
    - **子代理：** 將編碼任務路由到具有不同默認模型的子代理。

    參見 [Models](/zh-Hant/concepts/models) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title='為什麼我會看到「Model ... is not allowed」然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它就會成為 `/model` 和任何
    會話覆寫的 **允許清單**。選擇不在該清單中的模型會返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會 **取代** 正常的回覆傳回。修正方法：將模型加入
    `agents.defaults.models`、移除允許清單，或從 `/model list` 中挑選一個模型。

  </Accordion>

  <Accordion title='為什麼我看到 "Unknown model: minimax/MiniMax-M2.7"？'>
    這表示 **供應商未設定**（找不到 MiniMax 供應商設定或驗證設定檔），因此無法解析模型。此偵測問題的修復方案位於 **2026.1.12** 版本中（撰寫時尚未發布）。

    修復檢查清單：

    1. 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動閘道。
    2. 確認已設定 MiniMax（精靈或 JSON），或 env/auth 設定檔中存在 MiniMax API 金鑰，以便注入供應商。
    3. 使用確切的模型 ID（區分大小寫）：`minimax/MiniMax-M2.7`、
       `minimax/MiniMax-M2.7-highspeed`、`minimax/MiniMax-M2.5` 或
       `minimax/MiniMax-M2.5-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選擇（或在聊天中使用 `/model list`）。

    請參閱 [MiniMax](/zh-Hant/providers/minimax) 和 [模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 作為預設值，並在複雜任務中使用 OpenAI 嗎？">
    可以。使用 **MiniMax 作為預設** 並在需要時 **每個會話** 切換模型。
    備援機制是用於 **錯誤** 的，而非「困難任務」，因此請使用 `/model` 或單獨的代理程式。

    **選項 A：每個會話切換**

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

    - 代理程式 A 預設：MiniMax
    - 代理程式 B 預設：OpenAI
    - 透過代理程式路由或使用 `/agent` 進行切換

    文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 附帶了一些預設的簡寫（僅在 `agents.defaults.models` 中存在該模型時套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了相同名稱的自訂別名，則以您的設定為準。

  </Accordion>

  <Accordion title="如何定義/覆蓋模型捷徑（別名）？">
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

    然後 `/model sonnet`（或在支援時使用 `/<alias>`）會解析為該模型 ID。

  </Accordion>

  <Accordion title="如何添加來自 OpenRouter 或 Z.AI 等其他供應商的模型？">
    OpenRouter (按 token 付費；多種模型)：

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

    Z.AI (GLM 模型)：

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

    如果您引用了某個供應商/模型，但缺少所需的供應商金鑰，您將會收到執行時期驗證錯誤（例如 `No API key found for provider "zai"`）。

    **新增代理後找不到供應商的 API 金鑰**

    這通常意味著**新代理**的驗證存儲是空的。驗證是針對每個代理的，並儲存於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈引導期間設定驗證。
    - 或者將主代理的 `agentDir` 中的 `auth-profiles.json` 複製到新代理的 `agentDir` 中。

    請**勿**在代理之間重複使用 `agentDir`；這會導致驗證/會衝突。

  </Accordion>
</AccordionGroup>

## 模型故障轉移與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移分兩個階段進行：

    1. 在同一供應商內進行 **Auth profile rotation**（身分配置輪替）。
    2. **Model fallback**（模型回退）至 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻期會套用至失敗的配置（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 仍能持續回應。

  </Accordion>

  <Accordion title='"No credentials found for profile anthropic:default" 是什麼意思？'>
    這表示系統嘗試使用驗證設定檔 ID `anthropic:default`，但在預期的驗證存放區中找不到對應的憑證。

    **修復檢查清單：**

    - **確認驗證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的 Agent**
      - 多 Agent 設定意味著可能存在多個 `auth-profiles.json` 檔案。
    - **完整性檢查模型/驗證狀態**
      - 使用 `openclaw models status` 來查看已設定的模型以及提供者是否已通過驗證。

    **「No credentials found for profile anthropic」的修復檢查清單**

    這表示執行已被固定至 Anthropic 驗證設定檔，但 Gateway 無法在其驗證存放區中找到它。

    - **使用 setup-token**
      - 執行 `claude setup-token`，然後使用 `openclaw models auth setup-token --provider anthropic` 貼上。
      - 如果 token 是在另一台機器上建立的，請使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的固定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您在 gateway 主機上執行指令**
      - 在遠端模式下，驗證設定檔位於 gateway 機器上，而非您的筆記型電腦。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試它。如果您尚未配置 Google 憑證，您將會看到 `No API key found for provider "google"`。

    解決方法：提供 Google 驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備機制路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：對話歷史記錄包含 **未簽名的思考區塊**（通常來自於
    已中止/不完整的串流）。Google Antigravity 要求思考區塊必須具有簽名。

    解決方法：OpenClaw 現在會為 Google Antigravity Claude 移除未簽名的思考區塊。如果問題仍然存在，請開始一個 **新會話** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles：它們是什麼以及如何管理它們

相關：[/concepts/oauth](/zh-Hant/concepts/oauth) (OAuth 流程、權杖儲存、多帳戶模式)

<AccordionGroup>
  <Accordion title="什麼是 auth profile？">
    Auth profile 是綁定到提供者的命名憑證記錄（OAuth 或 API 金鑰）。Profile 位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的 Profile ID 是什麼？">
    OpenClaw 使用帶有提供者前綴的 ID，例如：

    - `anthropic:default` (當不存在電子郵件身分時常見)
    - `anthropic:<email>` 用於 OAuth 身分
    - 您選擇的自訂 ID (例如 `anthropic:work`)

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個驗證設定檔嗎？">
    是的。設定檔支援對設定檔使用可選的中繼資料，以及每個提供者的順序 (`auth.order.<provider>`)。這**不會**儲存密碼；它會將 ID 對應到提供者/模式並設定輪替順序。

    如果某個設定檔處於短暫的 **冷卻** 狀態 (速率限制/逾時/驗證失敗) 或較長的 **停用** 狀態 (帳單/額度不足)，OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀況，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整方式：`auth.cooldowns.billingBackoffHours*`。

    您也可以透過 CLI 設定 **每個代理程式** 的順序覆寫 (儲存在該代理程式的 `auth-profiles.json` 中)：

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

  <Accordion title="OAuth 與 API 金鑰 - 有什麼區別？">
    OpenClaw 同時支援這兩種方式：

    - **OAuth** 通常利用訂閱存取權限（如適用）。
    - **API 金鑰** 使用按 Token 付費的計費方式。

    精靈明確支援 Anthropic setup-token 和 OpenAI Codex OAuth，並可為您儲存 API 金鑰。

  </Accordion>
</AccordionGroup>

## 閘道：連接埠、「已在執行」與遠端模式

<AccordionGroup>
  <Accordion title="閘道使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示 "Runtime: running" 卻顯示 "RPC probe: failed"？'>
    因為 "running" 是 **supervisor**（launchd/systemd/schtasks）的視角。RPC 探測則是 CLI 實際連接到 gateway WebSocket 並呼叫 `status`。

    使用 `openclaw gateway status` 並信任以下幾行資訊：

    - `Probe target:` （探測實際使用的 URL）
    - `Listening:` （連接埠上實際綁定的內容）
    - `Last gateway error:` （常見的根本原因，即程序存活但連接埠未監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 狀態顯示的「Config (cli)」和「Config (service)」不同？'>
    您正在編輯一個設定檔，但服務正在使用另一個設定檔（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不符）。

    修復方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的相同 `--profile` / 環境執行該指令。

  </Accordion>

  <Accordion title='「另一個閘道執行個體正在接聽」是什麼意思？'>
    OpenClaw 透過在啟動時立即繫結 WebSocket 接聽程式來強制執行執行階段鎖定（預設為 `ws://127.0.0.1:18789`）。如果繫結失敗並出現 `EADDRINUSE`，它會擲回 `GatewayLockError`，表示另一個執行個體正在接聽。

    修正方法：停止另一個執行個體、釋放連接埠，或是使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何在遠端模式下執行 OpenClaw（用戶端連接到別處的閘道）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，可選帶有 token/password：

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

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時啟動（或者您傳入覆寫標誌）。
    - macOS 應用程式會監看設定檔，並在這些值變更時即時切換模式。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或不斷重新連線）。該怎麼辦？'>
    您的閘道已在啟用驗證的情況下執行（`gateway.auth.*`），但 UI 並未傳送相符的 Token/密碼。

    事實（來自程式碼）：

    - 控制介面會將 Token 儲存在 `sessionStorage` 中，供目前瀏覽器分頁工作階段和選定的閘道 URL 使用，因此重新整理同一個分頁時仍能持續運作，而無需還原長期的 localStorage Token 持續性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以使用快取的裝置 Token 嘗試一次有限的重試。

    修復方法：

    - 最快的方法：`openclaw dashboard`（會列印並複製儀表板 URL，嘗試開啟；如果是無頭模式則顯示 SSH 提示）。
    - 如果您還沒有 Token：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端：先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然後開啟 `http://127.0.0.1:18789/`。
    - 在閘道主機上設定 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 在控制介面設定中，貼上相同的 Token。
    - 如果在一次重試後仍然不匹配，請輪換/重新批准配對的裝置 Token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 仍然卡住？請執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以了解驗證詳情。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但無法綁定，且沒有監聽任何東西">
    `tailnet` bind 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），就沒有可綁定的對象。

    解決方法：

    - 在該主機上啟動 Tailscale（這樣它就會有一個 100.x 位址），或
    - 切換到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。 `auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行 - 一個 Gateway 可以執行多個訊息通道和代理程式。僅當您需要冗餘（例如：救援機器人）或強隔離時，才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` （每個執行個體的設定）
    - `OPENCLAW_STATE_DIR` （每個執行個體的狀態）
    - `agents.defaults.workspace` （工作區隔離）
    - `gateway.port` （唯一連接埠）

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...` （自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔中設定唯一的 `gateway.port` （或對於手動執行傳遞 `--port`）。
    - 安裝每個設定檔的服務： `openclaw --profile <name> gateway install`。

    設定檔也會作為服務名稱的後綴 （`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、 `openclaw-gateway-<profile>.service`、 `OpenClaw Gateway (<profile>)`）。
    完整指南：[多個 Gateway](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「無效的交握」/ 代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期第一條訊息必須是
    `connect` 框架。如果接收到任何其他內容，它會以
    **代碼 1008**（原則違規）關閉連線。

    常見原因：

    - 您在瀏覽器中打開了 **HTTP** 網址 (`http://...`)，而不是使用 WS 客戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭或發送了非 Gateway 的請求。

    快速修復方法：

    1. 使用 WS 網址：`ws://<host>:18789`（如果使用 HTTPS，則為 `wss://...`）。
    2. 不要在普通的瀏覽器分頁中打開 WS 連接埠。
    3. 如果啟用了驗證，請在 `connect` 框架中包含權杖/密碼。

    如果您使用的是 CLI 或 TUI，網址看起來應該像這樣：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協議詳情：[Gateway 協議](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌層級由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤方式：

    ```bash
    openclaw logs --follow
    ```

    服務/監督程式日誌（當閘道透過 launchd/systemd 執行時）：

    - macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log` (預設：`~/.openclaw/logs/...`; 設定檔使用 `~/.openclaw-<profile>/logs/...`)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    欲知詳情，請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以收回連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 - 如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2 (建議)：** Gateway 在 Linux 內執行。

    開啟 PowerShell，進入 WSL，然後重新啟動：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您從未安裝該服務，請在前台啟動它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows (不建議)：** Gateway 直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它（無服務），請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows)、[Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="The Gateway is up but replies never arrive. What should I check?">
    從快速健康檢查開始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - **閘道主機**上未載入模型驗證（請檢查 `models status`）。
    - 通道配對/白名單阻擋了回覆（請檢查通道設定與日誌）。
    - WebChat/Dashboard 已開啟，但沒有正確的 Token。

    如果您處於遠端環境，請確認 tunnel/Tailscale 連線正常，且
    Gateway WebSocket 可以連接。

    文件：[通道](/zh-Hant/channels)、[疑難排解](/zh-Hant/gateway/troubleshooting)、[遠端存取](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='「已從閘道斷線：無原因」- 該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. 閘道是否正在運作？ `openclaw gateway status`
    2. 閘道是否健康？ `openclaw status`
    3. UI 是否有正確的 Token？ `openclaw dashboard`
    4. 如果是遠端連線，通道/Tailscale 連結是否已啟動？

    然後檢查日誌：

    ```bash
    openclaw logs --follow
    ```

    文件：[儀表板](/zh-Hant/web/dashboard)、[遠端存取](/zh-Hant/gateway/remote)、[疑難排解](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    首先檢查日誌和頻道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 功能表項目過多。OpenClaw 已經會將數量修剪至 Telegram 限制並以較少的指令重試，但仍需要捨棄部分功能表項目。減少外掛/技能/自訂指令，或者如果您不需要功能表，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您使用 VPS 或位於 Proxy 後方，請確認允許輸出 HTTPS 且 DNS 對 `api.telegram.org` 正常運作。

    如果 Gateway 是遠端的，請務必查看 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可以到達，且 Agent 可以運行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看當前狀態。如果您預期在聊天頻道中收到回覆，
    請確保傳送功能已啟用（`/deliver on`）。

    文件：[TUI](/zh-Hant/web/tui)、[Slash 指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我如何完全停止然後啟動 Gateway？">
    如果您已安裝該服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受管服務**（macOS 上的 launchd，Linux 上的 systemd）。
    當 Gateway 作為守護進程在背景運行時，請使用此方法。

    如果您是在前景運行，請使用 Ctrl-C 停止，然後：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`：重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`：在目前的終端機階段中，於 **前景** 執行 gateway。

    如果您安裝了服務，請使用 gateway 指令。當您需要單次前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台細節。然後檢查日誌檔案中的頻道驗證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="我的技能生成了圖片/PDF，但沒有發送任何內容">
    來自主動的出站附件必須包含 `MEDIA:<path-or-url>` 行（單獨成行）。請參閱 [OpenClaw 助手設定](/zh-Hant/start/openclaw) 和 [Agent 發送](/zh-Hant/tools/agent-send)。

    CLI 發送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    另外請檢查：

    - 目標頻道支援出站媒體且未被允許清單封鎖。
    - 檔案在供應商的大小限制內（圖片會調整大小至最大 2048px）。

    參閱 [圖片](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全性與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露於傳入私訊（DM）是否安全？">
    將傳入私訊視為不受信任的輸入。預設值旨在降低風險：

    - 支援私訊頻道的預設行為是**配對**（pairing）：
      - 未知的傳送者會收到配對碼；機器人不會處理其訊息。
      - 使用以下指令核准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理請求限制為**每個頻道 3 個**；如果未收到配對碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私訊需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示具風險的私訊政策。

  </Accordion>

  <Accordion title="提示注入是否僅是公開機器人的關注點？">
    不。提示注入是關於**不受信任的內容**，而不僅僅是誰可以私訊機器人。
    如果您的助理讀取外部內容（網頁搜索/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的紀錄檔），該內容可能包含試圖劫持模型的指令。即使**您是唯一的發送者**，這種情況也可能發生。

    最大的風險在於啟用工具時：模型可能會被誘騙而外洩上下文或代表您呼叫工具。您可以透過以下方式減少影響範圍：

    - 使用唯讀或已停用工具的「讀者」代理程式來摘要不受信任的內容
    - 對已啟用工具的代理程式關閉 `web_search` / `web_fetch` / `browser`
    - 沙箱機制與嚴格的工具允許清單

    詳情：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人是否應該擁有自己的電子郵件、GitHub 帳號或電話號碼？">
    是的，對於大多數設定而言。使用獨立的帳號和電話號碼來隔離機器人
    能在發生錯誤時降低受影響範圍。這也讓輪換憑證
    或撤銷存取權限時更容易，且不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號存取權，
    並在必要時再擴充。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它完全控制我的簡訊，這樣安全嗎？">
    我們**不**建議讓它完全控制您的個人訊息。最安全的模式是：

    - 將私訊保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**專門的號碼或帳號**。
    - 讓它起草草稿，然後在**發送前進行審核批准**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以在個人助理任務中使用更便宜的模型嗎？">
  可以，**如果**代理僅用於聊天並且輸入是可信的。較低階層的模型更容易受到
  指令劫持，因此請避免在啟用工具的代理中或在讀取不可信內容時使用它們。如果
  您必須使用較小的模型，請鎖定工具並在沙盒中運行。請參閱 [安全性](/zh-Hant/gateway/security)。
</Accordion>

  <Accordion title="我在 Telegram 執行了 /start 但沒有收到配對代碼">
    配對代碼**僅**在未知發送者向機器人發送訊息且
    已啟用 `dmPolicy: "pairing"` 時發送。單獨使用 `/start` 不會產生代碼。

    檢查待處理請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許列表，或為該帳戶設定
    `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp: 它會傳訊息給我的聯絡人嗎？配對運作方式為何？">
    不會。預設的 WhatsApp 私訊原則是**配對**。未知的發送者只會收到配對碼，而他們的訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天，或是由您觸發的明確傳送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：這是用來設定您的**白名單/擁有者**，以便允許您自己的私訊。它不會用於自動傳送。如果您使用個人 WhatsApp 號碼執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它不會停止」

<AccordionGroup>
  <Accordion title="如何防止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在為該會話啟用了 **verbose** 或 **reasoning** 時才會出現。

    在您看到該訊息的聊天中進行修復：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很干擾，請檢查 Control UI 中的會話設定，並將 verbose 設定為 **inherit**。同時請確認您沒有使用在設定中將 `verboseDefault` 設定為 `on` 的 bot 配置文件。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking), [Security](/zh-Hant/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    將以下任一訊息 **作為獨立訊息** 傳送（不使用斜線）：

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

    這些是中止觸發器（不是斜線指令）。

    對於背景程序（來自 exec 工具），您可以要求代理程式執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的 **獨立** 訊息傳送，但少數捷徑（例如 `/status`）對於白名單上的發送者也可以在行內使用。

  </Accordion>

  <Accordion title='如何從 Telegram 傳送 Discord 訊息？（「Cross-context messaging denied」）'>
    OpenClaw 預設會封鎖 **跨供應商** 的訊息傳送。如果工具呼叫綁定至 Telegram，除非您明確允許，否則它不會傳送到 Discord。

    為代理程式啟用跨供應商訊息傳送：

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

    編輯設定後請重新啟動閘道。如果您只想對單一代理程式進行此設定，請改在 `agents.list[].tools.message` 下設定。

  </Accordion>

  <Accordion title='為什麼機器人似乎會「無視」快速連續發送的訊息？'>
    佇列模式控制新訊息如何與正在執行的任務互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向目前的任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即引導，然後處理積壓的工作
    - `interrupt` - 中止目前的執行並重新開始

    您可以為後續模式新增選項，例如 `debounce:2s cap:25 drop:summarize`。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時 Anthropic 的預設模型為何？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY` （或在 設定檔中儲存 Anthropic
    API 金鑰）可啟用驗證，但實際的預設 模型是您在 `agents.defaults.model.primary`
    中設定的任何模型（例如， `anthropic/claude-sonnet-4-6` 或
    `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile
    "anthropic:default"`，這表示 Gateway 無法在 執行中代理程式的預期 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
