---
summary: "常見問題：快速入門與首次執行設定 — 安裝、上線、驗證、訂閱、初始失敗"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "常見問題：首次執行設定"
sidebarTitle: "首次執行常見問題"
---

快速入門與首次執行問答。關於日常操作、模型、驗證、工作階段及疑難排解，請參閱主要的 [常見問題解答](/zh-Hant/help/faq)。

## 快速入門與首次執行設定

<AccordionGroup>
  <Accordion title="我卡住了，最快速的解決方法">
    使用能夠**查看您的機器**的本機 AI 代理程式。這比在 Discord 上提問有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取儲存庫、執行命令、檢查日誌，並協助修復您的機器層級設定 (PATH、服務、權限、驗證檔案)。請透過可駭客 (git) 安裝，提供它們**完整的原始碼檢出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 檢出**安裝 OpenClaw，因此代理程式可以讀取程式碼與文件，並推斷您正在執行的確切版本。您之後總是可以重新執行安裝程式且不加 `--install-method git`，隨時切換回穩定版本。

    提示：請要求代理程式**規劃並監督**修復過程 (逐步進行)，然後僅執行必要的命令。這樣可以讓變動保持細微且更容易稽核。

    如果您發現真正的錯誤或修復方法，請在 GitHub 上提出 issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些命令開始 (尋求協助時請分享輸出結果)：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：閘道器/代理程式健康狀況與基本設定的快速快照。
    - `openclaw models status`：檢查提供者驗證與模型可用性。
    - `openclaw doctor`：驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查指令：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯迴圈：[如果發生故障的前 60 秒](/zh-Hant/help/faq#first-60-seconds-if-something-is-broken)。
    安裝文件：[安裝](/zh-Hant/install)、[安裝程式旗標](/zh-Hant/install/installer)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat keeps skipping. What do the skip reasons mean?">
    常見的心跳跳過原因：

    - `quiet-hours`：超出設定的啟用時段視窗
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但僅包含空白/僅標頭的結構
    - `no-tasks-due`：`HEARTBEAT.md` 任務模式處於啟用狀態，但尚未到達任何任務間隔時間
    - `alerts-disabled`：所有心跳可見性均已停用（`showOk`、`showAlerts` 和 `useIndicator` 均已關閉）

    在任務模式下，只有在完成一次實際的心跳執行後，才會推進到期時間戳記。跳過的執行不會將任務標記為已完成。

    文件：[Heartbeat](/zh-Hant/gateway/heartbeat)、[Automation](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Recommended way to install and set up OpenClaw">
    本儲存庫建議從原始碼執行並使用 onboarding：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    精靈也可以自動建置 UI 資產。onboarding 完成後，您通常會在連接埠 **18789** 上執行 Gateway。

    從原始碼（貢獻者/開發者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    如果您尚未全域安裝，請透過 `pnpm openclaw onboard` 執行。

  </Accordion>

<Accordion title="How do I open the dashboard after onboarding?">精靈會在 onboarding 完成後立即使用乾淨（非 token 化）的儀表板 URL 開啟您的瀏覽器，並且也會在摘要中列印連結。請保持該分頁開啟；如果它沒有啟動，請在同一台機器上複製貼上列印出的 URL。</Accordion>

  <Accordion title="如何在 localhost 與遠端之間對儀表板進行身分驗證？">
    **Localhost（本機）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求 shared-secret 驗證，請將設定的 token 或密碼貼上到 Control UI 設定中。
    - Token 來源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密碼來源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未設定 shared secret，請使用 `openclaw doctor --generate-gateway-token` 產生 token。

    **不在 localhost 上：**

    - **Tailscale Serve**（推薦）：保持 bind loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，則身分標頭滿足 Control UI/WebSocket 驗證（無需貼上 shared secret，假設為受信任的 Gateway 主機）；除非您刻意使用 private-ingress `none` 或 trusted-proxy HTTP 驗證，否則 HTTP API 仍需要 shared-secret 驗證。
      來自同一個用戶端的錯誤並行 Serve 驗證嘗試會在失敗驗證限制器記錄它們之前進行序列化，因此第二次錯誤重試可能已經顯示 `retry later`。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`（或設定密碼驗證），開啟 `http://<tailscale-ip>:18789/`，然後在儀表板設定中貼上相符的 shared secret。
    - **Identity-aware reverse proxy**：將 Gateway 保持在受信任的 proxy 之後，設定 `gateway.auth.mode: "trusted-proxy"`，然後開啟 proxy URL。同主機 loopback proxy 需要明確的 `gateway.auth.trustedProxy.allowLoopback = true`。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。Shared-secret 驗證仍透過 tunnel 套用；如果系統提示，請貼上設定的 token 或密碼。

    請參閱 [儀表板](/zh-Hant/web/dashboard) 和 [Web 介面](/zh-Hant/web) 以了解 bind 模式和驗證細節。

  </Accordion>

  <Accordion title="為什麼聊天審核有兩個執行審核配置？">
    它們控制不同的層級：

    - `approvals.exec`：將審核提示轉發到聊天目標
    - `channels.<channel>.execApprovals`：讓該通道充當執行審核的原生審核客戶端

    主機執行策略仍然是真正的審核閘道。聊天配置僅控制審核提示出現的位置以及人們如何回應它們。

    在大多數設置中，您**不**需要同時使用兩者：

    - 如果聊天已經支援指令和回覆，同聊天 `/approve` 會透過共用路徑運作。
    - 如果支援的原生通道可以安全地推斷審核者，當 `channels.<channel>.execApprovals.enabled` 未設定或 `"auto"` 時，OpenClaw 現在會自動啟用優先使用 DM 的原生審核。
    - 當原生審核卡片/按鈕可用時，該原生 UI 是主要路徑；只有在工具結果顯示聊天審核不可用或手動審核是唯一路徑時，代理才應包含手動 `/approve` 指令。
    - 僅當提示還必須轉發到其他聊天或明確的運維房間時，才使用 `approvals.exec`。
    - 僅當您明確希望將審核提示貼回原始房間/主題時，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 外掛程式審核再次分開處理：它們預設使用同聊天 `/approve`，可選的 `approvals.plugin` 轉發，並且只有部分原生通道在頂層保留外掛程式審核原生處理。

    簡而言之：轉發是用於路由，原生客戶端配置是用於更豐富的特定通道 UX。
    參閱 [Exec Approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。Bun **不建議**用於 Gateway。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上運行嗎？">
    可以。Gateway 非常輕量——文檔列出的 **512MB-1GB RAM**、**1 核**和大約 **500MB** 磁盤空間對於個人使用已足夠，請注意 **Raspberry Pi 4 可以運行它**。

    如果你想要額外的緩衝空間（日誌、媒體、其他服務），**建議使用 2GB**，但這並非硬性最低要求。

    提示：一個小型 Pi/VPS 可以託管 Gateway，你可以在筆記本電腦/手機上配對 **節點** 進行本地屏幕/相機/畫布或命令執行。參見 [節點](/zh-Hant/nodes)。

  </Accordion>

  <Accordion title="有關於 Raspberry Pi 安裝的建議嗎？">
    簡單來說：它可以用，但要做好遇到粗糙邊緣情況的準備。

    - 使用 **64 位** 操作系統並保持 Node >= 22。
    - 優先選擇 **可破解 的安裝**，這樣你可以查看日誌並快速更新。
    - 啟動時不加載通道/技能，然後逐一添加。
    - 如果遇到奇怪的二進制問題，通常是由於 **ARM 兼容性** 問題。

    文檔：[Linux](/zh-Hant/platforms/linux)、[安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="它卡在 wake up my friend / onboarding 將無法孵化。現在怎麼辦？">
    該屏幕取決於 Gateway 是否可訪問且已通過身份驗證。TUI 還會在首次孵化時自動發送 "Wake up, my friend!"。如果你看到該行但 **沒有回覆** 並且 tokens 保持為 0，則代理從未運行。

    1. 重啟 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 檢查狀態 + 身份驗證：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然掛起，請運行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠程的，請確保隧道/Tailscale 連接已建立，並且 UI 指向正確的 Gateway。參見 [遠程訪問](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我可以將我的設定遷移到新機器（Mac mini）而無需重新進入新手引導嗎？">
    可以。複製 **state 目錄** 和 **workspace**，然後執行一次 Doctor。這能讓您的機器人保持「完全一樣」（記憶、會話歷史、驗證和頻道狀態），前提是您複製了這**兩個**位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設為： `~/.openclaw`）。
    3. 複製您的工作區（預設為： `~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、驗證設定檔、WhatsApp 憑證、會話和記憶。如果您處於遠端模式，請記住 Gateway 主機擁有會話存儲和工作區。

    **重要提示：**如果您僅將工作區提交/推送到 GitHub，您備份的是 **記憶 + 引導檔案**，但**不包含**會話歷史或驗證資訊。這些資訊儲存在 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關主題：[遷移](/zh-Hant/install/migrating)、[檔案在磁碟上的位置](/zh-Hant/help/faq#where-things-live-on-disk)、
    [Agent 工作區](/zh-Hant/concepts/agent-workspace)、[Doctor](/zh-Hant/gateway/doctor)、
    [遠端模式](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以看到最新版本的新內容？">
    查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部部分標記為 **Unreleased**（未發布），則下一個帶有日期的部分為最新發布的版本。條目按 **亮點**、**變更** 和 **修復** 分組（需要時還包含文檔/其他部分）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai（SSL 錯誤）">
    某些 Comcast/Xfinity 連線會透過 Xfinity Advanced Security 錯誤封鎖 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。
    請透過此處回報來協助我們解除封鎖： [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文檔已在 GitHub 上提供鏡像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 與 Beta 的區別">
    **Stable** 和 **beta** 是 **npm dist-tags**，而不是獨立的程式碼分支：

    - `latest` = stable
    - `beta` = 用於測試的早期版本

    通常，stable 版本會先發布在 **beta**，然後透過明確的提升步驟將同一個版本移動到 `latest`。維護者也可以在需要時直接發布到 `latest`。這就是為什麼在提升後，beta 和 stable 可能指向 **同一個版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    如需了解單行安裝指令以及 beta 和 dev 的區別，請參閱下方的手風琴選單。

  </Accordion>

  <Accordion title="如何安裝 beta 版本？beta 和 dev 有什麼區別？">
    **Beta** 是 npm dist-tag `beta`（提升後可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的移動指標；發布時，它使用 npm dist-tag `dev`。

    單行指令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳情：[開發頻道](/zh-Hant/install/development-channels) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="如何嘗試最新版本？">
    有兩個選項：

    1. **Dev 頻道 (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從原始碼更新。

    2. **可駭客安裝 (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本機 repo，然後透過 git 進行更新。

    如果您偏好手動進行乾淨的克隆，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[更新](/zh-Hant/cli/update)、[開發頻道](/zh-Hant/install/development-channels)、
    [安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="安裝和導覽通常需要多長時間？">
    大致指南：

    - **安裝：** 2-5 分鐘
    - **導覽：** 5-15 分鐘，視您設定的頻道/模型數量而定

    如果它停住了，請使用 [安裝程式卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速除錯迴圈。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多回饋？">
    使用 **詳細輸出** 重新執行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    Beta 安裝搭配詳細輸出：

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

    更多選項：[安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝顯示找不到 git 或無法辨識 openclaw">
    兩個常見的 Windows 問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法辨識 openclaw**

    - 您的 npm 全域 bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增至您的使用者 PATH (Windows 上不需要 `\bin` 後綴；在大多數系統上是 `%AppData%\npm`)。
    - 更新 PATH 後，關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/zh-Hant/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 我該怎麼辦？">
    這通常是原生 Windows 殼層上的主控台字碼頁不符所致。

    症狀：

    - `system.run`/`exec` 輸出將中文渲染為亂碼
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

    如果您在最新版的 OpenClaw 上仍遇到此問題，請在以下位置追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件沒有回答我的問題 - 我如何獲得更好的答案？">
    使用 **可駭客式 安裝**，讓您在本地擁有完整的原始碼和文件，然後從該資料夾詢問您的機器人（或 Claude/Codex），這樣它就能讀取 repo 並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝 OpenClaw？">
    簡短回答：依照 Linux 指南操作，然後執行 onboarding。

    - Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
    - 完整逐步說明：[開始使用](/zh-Hant/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="我如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 都適用。在伺服器上安裝，然後使用 SSH/Tailscale 連線至 Gateway。

    指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
    遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個涵蓋常見供應商的 **hosting hub**。選擇其中一個並依照指南操作：

    - [VPS hosting](/zh-Hant/vps) (所有供應商總覽)
    - [Fly.io](/zh-Hant/install/fly)
    - [Hetzner](/zh-Hant/install/hetzner)
    - [exe.dev](/zh-Hant/install/exe-dev)

    雲端運作方式：**Gateway 運行於伺服器上**，您可以透過控制 UI（或 Tailscale/SSH）從筆記型電腦/手機存取。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將 **節點**（Mac/iOS/Android/headless）配對至該雲端 Gateway，以便存取本機螢幕/相機/畫布，或在將 Gateway 保留於雲端時，在您的筆記型電腦上執行指令。

    Hub: [Platforms](/zh-Hant/platforms)。遠端存取: [Gateway remote](/zh-Hant/gateway/remote)。
    Nodes: [Nodes](/zh-Hant/nodes), [Nodes CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 自我更新嗎？">
    簡短回答：**可行，但不建議**。更新流程可能會重新啟動 Gateway（這會中斷現有的連線階段），可能需要乾淨的 git checkout，並且可能會提示確認。較安全的做法是：以操作員身分從 shell 執行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必須透過代理程式自動化：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文件: [Update](/zh-Hant/cli/update), [Updating](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="新手引導實際上做了什麼？">
    `openclaw onboard` 是推薦的設定路徑。在**本機模式** 下，它會引導您完成以下步驟：

    - **模型/驗證設定**（提供者 OAuth、API 金鑰、Anthropic setup-token，以及 LM Studio 等本機模型選項）
    - **工作區** 位置 + 引導檔案
    - **閘道設定**（綁定/連接埠/驗證/Tailscale）
    - **頻道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及 QQ Bot 等內建頻道外掛）
    - **常駐程式安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 使用者單元）
    - **健康檢查** 和 **技能** 選擇

    如果您設定的模型未知或缺少驗證，它也會發出警告。

  </Accordion>

  <Accordion title="我需要 Claude 或 OpenAI 訂閱才能執行此程式嗎？">
    不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或 **僅限本機的模型** 來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱（Claude Pro/Max 或 OpenAI Codex）是驗證這些提供者的可選方式。

    對於 OpenClaw 中的 Anthropic，實際的區分如下：

    - **Anthropic API 金鑰**：正常的 Anthropic API 計費
    - **OpenClaw 中的 Claude CLI / Claude 訂閱驗證**：Anthropic 人員
      告訴我們這種使用方式再次被允許，除非 Anthropic 發布新的政策，否則 OpenClaw 將 `claude -p`
      視為此整合的核准用法

    對於長期執行的閘道主機，Anthropic API 金鑰仍然是更可預測的設定方式。OpenAI Codex OAuth 明確支援像 OpenClaw 這樣的外部工具。

    OpenClaw 也支援其他託管的訂閱式選項，包括 **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和
    **Z.AI / GLM Coding Plan**。

    文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
    [Qwen Cloud](/zh-Hant/providers/qwen)、
    [MiniMax](/zh-Hant/providers/minimax)、[GLM Models](/zh-Hant/providers/glm)、
    [Local models](/zh-Hant/gateway/local-models)、[Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    是的。

    Anthropic 的工作人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，OpenClaw 將此整合中的 Claude 訂閱驗證和 `claude -p` 使用視為經認可。如果您想要最可預測的伺服器端設定，請改用 Anthropic API 金鑰。

  </Accordion>

  <Accordion title="你們支援 Claude 訂閱驗證（Claude Pro 或 Max）嗎？">
    是的。

    Anthropic 的工作人員告訴我們這種使用方式再次被允許，因此除非 Anthropic 發布新政策，OpenClaw 將此整合中的 Claude CLI 重複使用和 `claude -p` 使用視為經認可。

    Anthropic 設定權杖仍可作為支援的 OpenClaw 權杖路徑使用，但如果有可用，OpenClaw 現在更傾向於使用 Claude CLI 重複使用和 `claude -p`。對於生產環境或多用戶工作負載，Anthropic API 金鑰驗證仍然是更安全、更可預測的選擇。如果您想要 OpenClaw 中其他訂閱式的託管選項，請參閱 [OpenAI](/zh-Hant/providers/openai)、[Qwen / Model
    Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [GLM
    Models](/zh-Hant/providers/glm)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="為什麼我會看到來自 Anthropic 的 HTTP 429 rate_limit_error 錯誤？">
    這表示您的 **Anthropic 配額/速率限制** 在目前時間視窗內已耗盡。如果您使用的是 **Claude CLI**，請等待時間視窗重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 的使用量/帳單狀況，並視需要提高限制。

    如果訊息具體是：
    `Extra usage is required for long context requests`，則表示該請求嘗試使用 Anthropic 的 1M context beta (`context1m: true`)。這僅在您的憑證符合長 context 計費資格（API 金鑰計費或啟用了額外使用量的 OpenClaw Claude 登入路徑）時才有效。

    提示：設定一個 **備用模型**，以便在提供者受到速率限制時，OpenClaw 能繼續回應。
    請參閱 [模型](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">
  是的。OpenClaw 內建了 **Amazon Bedrock (Converse)** 提供者。當存在 AWS 環境標記時，OpenClaw 可以自動探索串流/文字 Bedrock 目錄，並將其合併為隱含的 `amazon-bedrock` 提供者；否則，您可以明確啟用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或新增手動提供者項目。請參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 和 [模型提供者](/zh-Hant/providers/models)。如果您偏好管理的金鑰流程，在 Bedrock
  前面使用相容 OpenAI 的代理伺服器仍然是一個有效的選項。
</Accordion>

<Accordion title="Codex 驗證是如何運作的？">
  OpenClaw 透過 OAuth（ChatGPT 登入）支援 **OpenAI Code (Codex)**。請使用 `openai/gpt-5.5` 進行常見設定：ChatGPT/Codex 訂閱驗證加上 原生 Codex 應用程式伺服器執行。`openai-codex/gpt-*` 模型參照是 由 `openclaw doctor --fix` 修復的舊版設定。針對非代理程式的 OpenAI API 介面 以及透過有序的 `openai-codex` API 金鑰設定檔的代理程式 模型，直接存取 OpenAI API 金鑰的功能仍然可用。 請參閱
  [模型供應商](/zh-Hant/concepts/model-providers) 和 [入門導覽 (CLI)](/zh-Hant/start/wizard)。
</Accordion>

  <Accordion title="為什麼 OpenClaw 仍然提到 openai-codex？">
    `openai-codex` 是 ChatGPT/Codex OAuth 的提供者和驗證設定檔 ID。
    舊的設定也曾將其用作模型前綴：

    - `openai/gpt-5.5` = 使用原生 Codex 執行時間進行代理程式回合的 ChatGPT/Codex 訂閱驗證
    - `openai-codex/gpt-5.5` = 由 `openclaw doctor --fix` 修復的舊版模型路由
    - `openai/gpt-5.5` 加上有序的 `openai-codex` API 金鑰設定檔 = OpenAI 代理程式模型的 API 金鑰驗證
    - `openai-codex:...` = 驗證設定檔 ID，不是模型參照

    如果您想要直接使用 OpenAI Platform 計費/限制路徑，請設定
    `OPENAI_API_KEY`。如果您想要 ChatGPT/Codex 訂閱驗證，請使用
    `openclaw models auth login --provider openai-codex` 登入。請將模型參照保持為
    `openai/gpt-5.5`；`openai-codex/*` 模型參照是
    由 `openclaw doctor --fix` 重寫的舊版設定。

  </Accordion>

  <Accordion title="為什麼 Codex OAuth 限制會與 ChatGPT 網頁版不同？">
    Codex OAuth 使用由 OpenAI 管理且依方案而定的配額視窗。實際上，
    即使兩者都綁定至同一個帳戶，這些限制也可能與 ChatGPT 網站/應用程式的體驗不同。

    OpenClaw 可以在 `openclaw models status` 中顯示目前可見的供應商使用量/配額視窗，
    但它不會將 ChatGPT 網頁版的權利虛構或正規化為直接 API 存取。如果您想要直接的
    OpenAI Platform 計費/限制路徑，請使用 API 金鑰搭配 `openai/*`。

  </Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在諸如 OpenClaw 等外部工具/工作流程中使用訂閱 OAuth。
    入門程式可以為您執行 OAuth 流程。

    請參閱 [OAuth](/zh-Hant/concepts/oauth)、[模型供應商](/zh-Hant/concepts/model-providers) 和 [入門 (CLI)](/zh-Hant/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用 **外掛程式驗證流程**，而不是 `openclaw.json` 中的客戶端 ID 或密鑰。

    步驟：

    1. 在本機安裝 Gemini CLI，讓 `gemini` 位於 `PATH` 上
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. 啟用外掛程式：`openclaw plugins enable google`
    3. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登入後的預設模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳細資訊：[模型供應商](/zh-Hant/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型適合閒聊嗎？">通常不適合。OpenClaw 需要大型上下文 + 強大的安全性；小顯卡會截斷並洩露內容。如果必須使用，請在本地運行你能運行的**最大**模型版本（LM Studio）並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化模型會增加提示注入風險 - 請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

<Accordion title="如何將託管模型流量保留在特定區域？">選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管的選項；選擇美國託管的變體以將數據保留在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型並列列出，以便在尊重您選擇的區域供應商的同時保持備用可用性。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 運行在 macOS 或 Linux 上（Windows 通過 WSL2）。Mac mini 是可選的 - 有些人購買它作為常開主機，但小型 VPS、家庭服務器或 Raspberry Pi 級別的設備也可以。

    您只需要一個 Mac **來使用僅限 macOS 的工具**。對於 iMessage，請在任何登錄了 Messages 的 Mac 上使用帶有 `imsg` 的 [iMessage](/zh-Hant/channels/imessage)。如果 Gateway 運行在 Linux 或其他地方，請將 `channels.imessage.cliPath` 設置為 SSH 包裝器，在該 Mac 上運行 `imsg`。如果您想要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文檔：[iMessage](/zh-Hant/channels/imessage)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    您需要**某台已登入訊息（Messages）的 macOS 裝置**。這**不**一定要是 Mac mini——
    任何 Mac 都可以。**搭配 `imsg` 使用 [iMessage](/zh-Hant/channels/imessage)**；閘道可以在該 Mac 上執行，也可以透過 SSH 包裝器 `cliPath` 在其他地方執行。

    常見的設定方式：

    - 在 Linux/VPS 上執行閘道，並將 `channels.imessage.cliPath` 設定為 SSH 包裝器，在已登入訊息的 Mac 上執行 `imsg`。
    - 如果您想要最簡單的單機設定，可以在 Mac 上執行所有功能。

    文件：[iMessage](/zh-Hant/channels/imessage)、[節點（Nodes）](/zh-Hant/nodes)、
    [Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行閘道**，而您的 MacBook Pro 可以作為
    **節點**（companion device，伴隨裝置）連接。節點不執行閘道——它們提供額外
    的功能，例如該裝置上的螢幕/攝像頭/畫布以及 `system.run`。

    常見模式：

    - 閘道執行於 Mac mini（常時運作）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並與閘道配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[節點（Nodes）](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    Bun **不建議使用**。我們發現存在運行時錯誤，特別是在 WhatsApp 和 Telegram 上。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍然想嘗試 Bun，請在不包含 WhatsApp/Telegram 的非生產閘道上進行。

  </Accordion>

  <Accordion title="Telegram: allowFrom 中應填入什麼？">
    `channels.telegram.allowFrom` 是 **發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    安裝過程只要求輸入數字型使用者 ID。如果您在設定檔中已經有舊版 `@username` 項目，`openclaw doctor --fix` 可以嘗試解析它們。

    更安全（無第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/zh-Hant/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以使用同一個 WhatsApp 號碼搭配不同的 OpenClaw 執行個體嗎？">
  可以，透過 **多代理程式路由**。將每個發送者的 WhatsApp **私訊**（peer `kind: "direct"`，發送者 E.164 格式如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區與階段儲存空間。回覆仍然來自 **同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是依 WhatsApp 帳號全域設定。參見 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 與
  [WhatsApp](/zh-Hant/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時執行一個「快速聊天」代理程式和一個「Opus 程式碼編寫」代理程式嗎？">可以。使用多代理程式路由：為每個代理程式指定其預設模型，然後將傳入路由（供應商帳號或特定 peer）綁定到各個代理程式。範例設定檔位於 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)。另請參閱 [Models](/zh-Hant/concepts/models) 與 [Configuration](/zh-Hant/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能運作嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或您的 brew 前綴)，以便 `brew` 安裝的工具在非登入 shell 中能正確解析。
    近期的版本也會在 Linux systemd 服務中預先常見的使用者 bin 目錄 (例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`)，並在設定時遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 以及 `FNM_DIR`。

  </Accordion>

  <Accordion title="可駭版 git 安裝與 npm 安裝的差異">
    - **可駭版 安裝：** 完整的原始碼檢出、可編輯，最適合貢獻者。
      您在本地執行建置並可修補程式碼/文件。
    - **npm install：** 全域 CLI 安裝，無 repo，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[開始使用](/zh-Hant/start/getting-started)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="我稍後可以在 npm 和 git 安裝之間切換嗎？">
    可以。當 OpenClaw 已經安裝時，請使用 `openclaw update --channel ...`。
    這**不會刪除您的資料**——它只會變更 OpenClaw 程式碼的安裝。
    您的狀態 (`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 將保持不變。

    從 npm 到 git：

    ```bash
    openclaw update --channel dev
    ```

    從 git 到 npm：

    ```bash
    openclaw update --channel stable
    ```

    加入 `--dry-run` 以先預覽計畫的模式切換。更新程式會執行
    Doctor 後續檢查，重新整理目標通道的外掛來源，並
    重新啟動閘道，除非您傳遞 `--no-restart`。

    安裝程式也可以強制使用任一種模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    備份提示：請參閱 [備份策略](/zh-Hant/help/faq#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦還是 VPS 上執行閘道？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您希望
    阻力最小，並且您不介意休眠/重新啟動，請在本地執行。

    **筆記型電腦 (本地閘道)**

    - **優點：** 無伺服器成本，直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 休眠/網路中斷 = 連線中斷，作業系統更新/重新啟動會造成干擾，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠線上，網路穩定，無筆記型電腦休眠問題，更容易保持執行。
    - **缺點：** 通常以無頭模式執行 (使用螢幕擷圖)，僅能遠端存取檔案，您必須使用 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost/Discord 都可以在 VPS 上正常運作。唯一真正的取捨是**無頭瀏覽器**與可見視窗之間的選擇。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    **建議預設值：** 如果您之前曾遇到閘道連線中斷，請使用 VPS。當您積極使用 Mac 並希望存取本機檔案或使用可見的瀏覽器進行 UI 自動化時，本地非常適合。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必需，但**為了可靠性和隔離性建議使用**。

    - **專用主機 (VPS/Mac mini/Pi)：** 永遠開啟，較少因睡眠或重新啟動而中斷，權限設定更乾淨，更容易保持執行。
    - **共用的筆記型電腦/桌機：** 適合測試和主動使用，但在機器睡眠或更新時預期會有暫停。

    如果您想兼顧兩者，請將 Gateway 保留在專用主機上，並將您的筆記型電腦配對為**節點**，以使用本機畫面/相機/執行工具。請參閱 [節點](/zh-Hant/nodes)。
    若需安全性指導，請閱讀 [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 需求和建議的作業系統是什麼？">
    OpenClaw 很輕量。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **建議：** 1-2 vCPU，2GB RAM 或更多以保留空間 (日誌、媒體、多個頻道)。節點工具和瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS** (或任何現代的 Debian/Ubuntu)。Linux 的安裝路徑在該處測試最為完善。

    文件：[Linux](/zh-Hant/platforms/linux)、[VPS 託管](/zh-Hant/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求是什麼？">
    可以。將 VM 視為與 VPS 相同：它需要永遠開啟、可存取，並且有足夠的 RAM 給 Gateway 和您啟用的任何頻道。

    基準指導：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議：** 如果您執行多個頻道、瀏覽器自動化或媒體工具，建議 2GB RAM 或更多。
    - **作業系統：** Ubuntu LTS 或其他現代的 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，且具有最佳的工具相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS 託管](/zh-Hant/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相關

- [FAQ](/zh-Hant/help/faq) — 主要的常見問題解答 (模型、Sessions、Gateway、安全性等)
- [安裝概覽](/zh-Hant/install)
- [開始使用](/zh-Hant/start/getting-started)
- [疑難排解](/zh-Hant/help/troubleshooting)
