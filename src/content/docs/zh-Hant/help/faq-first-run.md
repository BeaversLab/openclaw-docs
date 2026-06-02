---
summary: "常見問題：快速入門與首次執行設定 — 安裝、上線、驗證、訂閱、初始失敗"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "常見問題：首次執行設定"
sidebarTitle: "首次執行常見問題"
---

快速入門與首次運行常見問題解答。如需日常操作、模型、身份驗證、會話及疑難排解，請參閱主要 [常見問題解答](/zh-Hant/help/faq)。

## 快速入門與首次執行設定

<AccordionGroup>
  <Accordion title="我卡住了，解卡的最快方法">
    使用可以**看到您的機器**的本機 AI 代理。這比在 Discord 中提問有效得多，因為大多數「卡住」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取程式庫、執行命令、檢查日誌，並協助修正您的機器層級設定 (PATH、服務、權限、身份驗證檔案)。透過可駭客 (git) 安裝提供給它們**完整的原始碼檢出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 檢出**安裝 OpenClaw，因此代理可以讀取程式碼 + 文件，並推斷您正在執行的確切版本。您可以稍後透過不使用 `--install-method git` 重新執行安裝程式，隨時切換回穩定版。

    提示：請代理**規劃並監督**修正過程 (逐步)，然後僅執行必要的命令。這可保持變更較小且更容易稽核。

    如果您發現真正的錯誤或修正，請提出 GitHub issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些命令開始 (尋求協助時分享輸出)：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：閘道/代理健康狀況 + 基本設定的快速快照。
    - `openclaw models status`：檢查提供者身份驗證 + 模型可用性。
    - `openclaw doctor`：驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯循環：[如果發生問題的前 60 秒](/zh-Hant/help/faq#first-60-seconds-if-something-is-broken)。
    安裝文件：[安裝](/zh-Hant/install)、[安裝程式旗標](/zh-Hant/install/installer)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat 持續跳過。跳過原因代表什麼意思？">
    常見的 Heartbeat 跳過原因：

    - `quiet-hours`：在設定的 active-hours（啟用時段）視窗之外
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但僅包含空白或只有標頭的框架內容
    - `no-tasks-due`：`HEARTBEAT.md` 任務模式已啟用，但尚未到達任何任務間隔時間
    - `alerts-disabled`：已停用所有 Heartbeat 可見性（`showOk`、`showAlerts` 和 `useIndicator` 皆已關閉）

    在任務模式下，截止時間戳記僅會在實際的 Heartbeat 執行完成後推進。
    被跳過的執行不會將任務標記為已完成。

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

  <Accordion title="如何在本地主機與遠端驗證儀表板？">
    **本地主機（同一台機器）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求共享金鑰驗證，請將設定的權杖或密碼貼上到 Control UI 設定中。
    - 權杖來源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密碼來源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未設定共享金鑰，請使用 `openclaw doctor --generate-gateway-token` 產生權杖。

    **非本地主機：**

    - **Tailscale Serve**（推薦）：保持 bind loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 為 `true`，身份標頭會滿足 Control UI/WebSocket 驗證（無需貼上共享金鑰，假設為受信任的 Gateway 主機）；HTTP API 仍需要共享金鑰驗證，除非您刻意使用 private-ingress `none` 或 trusted-proxy HTTP 驗證。
      來自同一個用戶端的不良並行 Serve 驗證嘗試會在 failed-auth limiter 記錄它們之前被序列化，因此第二次不良重試可能已經顯示 `retry later`。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`（或設定密碼驗證），開啟 `http://<tailscale-ip>:18789/`，然後在儀表板設定中貼上相符的共享金鑰。
    - **Identity-aware reverse proxy**：將 Gateway 保持在受信任的代理後方，設定 `gateway.auth.mode: "trusted-proxy"`，然後開啟代理 URL。同主機 loopback 代理需要明確的 `gateway.auth.trustedProxy.allowLoopback = true`。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。共享金鑰驗證仍適用於 tunnel；如果系統提示，請貼上設定的權杖或密碼。

    請參閱 [Dashboard](/zh-Hant/web/dashboard) 和 [Web surfaces](/zh-Hant/web) 以了解綁定模式和驗證詳情。

  </Accordion>

  <Accordion title="為什麼聊天核准有兩個 exec 設定？">
    它們控制不同的層級：

    - `approvals.exec`：將核准提示轉發到聊天目的地
    - `channels.<channel>.execApprovals`：使該通道成為 exec 核准的原生核准客戶端

    主機 exec 策略仍然是真正的核准閘道。聊天設定僅控制核准提示出現的位置以及人們如何回應它們。

    在大多數設定中，您**不**需要兩者都設定：

    - 如果聊天已支援命令和回覆，同聊天 `/approve` 會透過共用路徑運作。
    - 如果支援的原生通道可以安全地推斷核准者，當 `channels.<channel>.execApprovals.enabled` 未設定或 `"auto"` 時，OpenClaw 現在會自動啟用優先 DM 的原生核准。
    - 當原生核准卡/按鈕可用時，該原生 UI 是主要路徑；僅當工具結果指出聊天核准不可用或手動核准是唯一路徑時，agent 才應包含手動 `/approve` 命令。
    - 僅當提示也必須轉發到其他聊天或明確的 ops 房間時，才使用 `approvals.exec`。
    - 僅當您明確希望將核准提示貼回原始房間/主題時，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 外掛核准又是分開的：它們預設使用同聊天 `/approve`，可選的 `approvals.plugin` 轉發，且只有部分原生通道在頂層保留外掛核准原生處理。

    簡而言之：轉發用於路由，原生客戶端設定用於更豐富的特定通道 UX。
    請參閱 [Exec Approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。Bun **不建議**用於 Gateway。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上運行嗎？">
    可以。Gateway 非常輕量——文檔列出 **512MB-1GB RAM**、**1 核心**和約 **500MB** 磁盤空間即足以滿足個人使用需求，請注意 **Raspberry Pi 4 也可以運行它**。

    如果您需要額外的餘量（日誌、媒體、其他服務），**建議使用 2GB**，但這並非硬性最低要求。

    提示：一台小型 Raspberry Pi/VPS 可以託管 Gateway，並且您可以將您的筆記型電腦/手機上的 **nodes** 進行配對，以實現本機屏幕/相機/畫布或命令執行。請參閱 [Nodes](/zh-Hant/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有什麼提示嗎？">
    簡單來說：可以使用，但要做好遇到粗糙邊緣情況的準備。

    - 使用 **64 位** 操作系統並保持 Node >= 22。
    - 優先選擇 **可駭改的 安裝**，這樣您可以查看日誌並快速更新。
    - 啟動時不添加 channels/skills，然後逐個添加。
    - 如果遇到奇怪的二進制問題，通常是 **ARM 兼容性** 問題。

    文檔：[Linux](/zh-Hant/platforms/linux), [Install](/zh-Hant/install)。

  </Accordion>

  <Accordion title="它卡在 wake up my friend / onboarding will not hatch。現在怎麼辦？">
    該屏幕取決於 Gateway 是否可達並已通過驗證。TUI 還會在首次孵化時自動發送「Wake up, my friend!」。如果您看到該行卻 **沒有回覆**
    且 token 保持為 0，則表示代理從未運行。

    1. 重啟 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 檢查狀態和驗證：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然卡住，請運行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠程的，請確保 tunnel/Tailscale 連接已建立，並且 UI 指向正確的 Gateway。請參閱 [Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我可以在不重新執行入門導覽的情況下，將設定遷移到新機器（Mac mini）嗎？">
    可以。複製 **state directory** 和 **workspace**，然後執行一次 Doctor。這能讓您的機器人保持「完全一致」（記憶體、工作階段歷史、驗證和頻道狀態），前提是您複製了這**兩個**位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）。
    3. 複製您的 workspace（預設：`~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這會保留設定、驗證設定檔、WhatsApp 憑證、工作階段和記憶體。如果您處於遠端模式，請記得 gateway 主機擁有工作階段存放區和 workspace。

    **重要提示：**如果您只將 workspace commit/push 到 GitHub，您備份的是**記憶體 + bootstrap 檔案**，但**不包含**工作階段歷史或驗證資料。這些資料儲存在 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關主題：[遷移](/zh-Hant/install/migrating)、[檔案在磁碟上的位置](/zh-Hant/help/faq#where-things-live-on-disk)、
    [Agent workspace](/zh-Hant/concepts/agent-workspace)、[Doctor](/zh-Hant/gateway/doctor)、
    [遠端模式](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我要在哪裡查看最新版本的新內容？">
    請查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部區段標記為 **Unreleased**，則下一個有日期的區段即為最新發布的版本。條目分為 **Highlights**、**Changes** 和 **Fixes**（必要時會加上 docs/other 區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai（SSL 錯誤）">
    部分 Comcast/Xfinity 連線會透過 Xfinity Advanced Security 錯誤封鎖 `docs.openclaw.ai`。請停用該功能或將 `docs.openclaw.ai` 加入允許清單，然後重試。請透過此處回報以協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件在 GitHub 上有鏡像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 與 Beta 的區別">
    **Stable** 和 **beta** 是 **npm dist-tags**，不是獨立的代碼分支：

    - `latest` = stable
    - `beta` = 用於測試的早期構建

    通常，穩定版會先發布到 **beta**，然後通過明確的升級步驟將相同版本移至 `latest`。維護者也可以在需要時直接發布到 `latest`。這就是為什麼在升級後，beta 和 stable 可能指向 **相同的版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    有關單行安裝命令以及 beta 與 dev 的區別，請參閱下方的手風琴。

  </Accordion>

  <Accordion title="如何安裝 Beta 版，Beta 與 Dev 有什麼區別？">
    **Beta** 是 npm dist-tag `beta`（升級後可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的移動 HEAD；發布時，它使用 npm dist-tag `dev`。

    單行命令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多細節：[開發頻道](/zh-Hant/install/development-channels) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="如何嘗試最新版本？">
    兩個選項：

    1. **Dev 頻道 (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從源代碼更新。

    2. **可編輯安裝 (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本地存儲庫，然後通過 git 更新。

    如果您喜歡手動進行乾淨的克隆，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文檔：[更新](/zh-Hant/cli/update)、[開發頻道](/zh-Hant/install/development-channels)、
    [安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="安裝和入門通常需要多久？">
    大致指南：

    - **安裝：** 2-5 分鐘
    - **入門：** 5-15 分鐘，取決於您設定的通道/模型數量

    如果卡住，請使用 [安裝程式卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速偵錯迴圈。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多反饋？">
    使用 **詳細輸出** 重新執行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    含詳細輸出的 Beta 安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    若為可修改 (git) 安裝：

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
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 環境變數中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法辨識 openclaw**

    - 您的 npm 全域 bin 資料夾不在 PATH 環境變數中。
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
    這通常是由於原生 Windows Shell 上的主控台字碼頁不符造成的。

    症狀：

    - `system.run`/`exec` 輸出將中文呈現為亂碼
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

    如果您在最新版的 OpenClaw 上仍然遇到此問題，請在以下位置追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件沒有回答我的問題 - 我如何獲得更好的答案？">
    使用 **可駭客式 安裝**，讓您在本地擁有完整的原始碼和文件，然後 _從該資料夾中_ 詢問您的機器人（或 Claude/Codex），以便它能讀取儲存庫並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝 OpenClaw？">
    簡短回答：依照 Linux 指南操作，然後執行入門引導。

    - Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
    - 完整逐步指南：[入門指南](/zh-Hant/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="我如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 都適用。在伺服器上安裝，然後使用 SSH/Tailscale 連線到 Gateway。

    指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
    遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見供應商的**託管中心**。選擇其中一個並依照指南操作：

    - [VPS 託管](/zh-Hant/vps) (所有供應商彙整於此)
    - [Fly.io](/zh-Hant/install/fly)
    - [Hetzner](/zh-Hant/install/hetzner)
    - [exe.dev](/zh-Hant/install/exe-dev)

    雲端運作方式：**Gateway 在伺服器上運行**，您可以透過控制 UI（或 Tailscale/SSH）從筆記型電腦/手機存取它。您的狀態與工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將**節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway，以存取本機螢幕/相機/畫布或在筆記型電腦上執行指令，同時將 Gateway 保留在雲端。

    中心：[平台](/zh-Hant/platforms)。遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。
    節點：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 自我更新嗎？">
    簡短回答：**可以，但不建議**。更新流程可能會重新啟動
    Gateway（這會中斷現有的連線階段），可能需要乾淨的 git checkout，並且
    可能會提示確認。更安全的做法：以操作員身分從 shell 執行更新。

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

    文件：[更新](/zh-Hant/cli/update)、[更新中](/zh-Hant/install/updating)。

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

  <Accordion title="執行此程式需要 Claude 或 OpenAI 訂閱嗎？">
    不需要。您可以透過 **API 金鑰** (Anthropic/OpenAI/其他) 或 **僅限本機的模型** 來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱 (Claude
    Pro/Max 或 OpenAI Codex) 是用來驗證這些提供者的選擇性方式。

    對於 OpenClaw 中的 Anthropic，實際的區分如下：

    - **Anthropic API 金鑰**：一般的 Anthropic API 計費
    - **OpenClaw 中的 Claude CLI / Claude 訂閱驗證**：Anthropic
      人員告訴我們這種用法再次被允許，除非 Anthropic 發布新政策，
      否則 OpenClaw 將 `claude -p` 的使用視為此整合的
      認可用法

    對於長期運作的閘道主機，Anthropic API 金鑰仍然預測性更高的設定方式。明確支援像 OpenClaw 這類的外部工具使用 OpenAI Codex OAuth。

    OpenClaw 也支援其他託管的訂閱式選項，包括
    **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和
    **Z.AI / GLM Coding Plan**。

    文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
    [Qwen Cloud](/zh-Hant/providers/qwen)、
    [MiniMax](/zh-Hant/providers/minimax)、[Z.AI (GLM)](/zh-Hant/providers/zai)、
    [Local models](/zh-Hant/gateway/local-models)、[Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    是的。

    Anthropic 的工作人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，OpenClaw 將此整合中的 Claude 訂閱驗證和 `claude -p` 使用視為經認可。如果您想要最可預測的伺服器端設定，請改用 Anthropic API 金鑰。

  </Accordion>

  <Accordion title="您支援 Claude 訂閱驗證 (Claude Pro 或 Max) 嗎？">
    是的。

    Anthropic 人員告訴我們這種用法再次被允許，因此除非 Anthropic 發布新政策，
    否則 OpenClaw 將 Claude CLI 的重複使用和 `claude -p` 的使用視為此整合的
    認可用法。

    Anthropic setup-token 仍然是支援的 OpenClaw token 路徑，但如果可用，OpenClaw 現在更傾向於 Claude CLI 的重複使用和 `claude -p`。
    對於生產環境或多用戶的工作負載，Anthropic API 金鑰驗證仍然是更安全、預測性更高的選擇。如果您想要 OpenClaw 中其他訂閱式的託管選項，請參閱 [OpenAI](/zh-Hant/providers/openai)、[Qwen / Model
    Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [GLM
    Models](/zh-Hant/providers/zai)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="為什麼我會從 Anthropic 收到 HTTP 429 rate_limit_error 錯誤？">
    這表示您在當前時間視窗內的 **Anthropic 配額/速率限制** 已耗盡。如果您使用的是 **Claude CLI**，請等待時間視窗重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 中的使用量/帳單情況，並視需要提高限制。

    如果訊息特別是：
    `Extra usage is required for long context requests`，表示請求正在嘗試使用
    Anthropic 的 1M 語境視窗（具備 GA 能力的 1M Claude 4.x 模型或舊版
    `context1m: true` 設定）。這僅在您的憑證符合長語境計費資格時才能運作（API 金鑰計費，或已啟用額外使用量的 OpenClaw Claude 登入路徑）。

    提示：請設定一個 **後備模型**，這樣當供應商受到速率限制時，OpenClaw 仍能繼續回覆。
    請參閱 [模型](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 與
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="支援 AWS Bedrock 嗎？">
  是的。OpenClaw 內建了 **Amazon Bedrock (Converse)** 供應商。當存在 AWS 環境標記時，OpenClaw 可以自動探索串流/文字 Bedrock 目錄，並將其合併為隱含的 `amazon-bedrock` 供應商；否則，您可以明確啟用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或新增手動供應商項目。請參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 與 [模型供應商](/zh-Hant/providers/models)。如果您偏好受管金鑰流程，在 Bedrock
  前面部署一個 OpenAI 相容的代理伺服器仍然是一個有效的選項。
</Accordion>

<Accordion title="Codex 驗證如何運作？">
  OpenClaw 透過 OAuth (ChatGPT 登入) 支援 **OpenAI Code (Codex)**。使用 `openai/gpt-5.5` 進行一般設定：ChatGPT/Codex 訂閱驗證加上 原生 Codex 應用程式伺服器執行。舊版 Codex GPT 參照是 由 `openclaw doctor --fix` 修復的舊版設定。直接 OpenAI API 金鑰 存取仍可供非代理程式 OpenAI API 介面以及透過有序的 `openai` API 金鑰設定檔的代理程式模型使用。 請參閱 [模型提供者](/zh-Hant/concepts/model-providers) 和
  [新手導引 (CLI)](/zh-Hant/start/wizard)。
</Accordion>

  <Accordion title="為什麼 OpenClaw 仍然提到舊版 OpenAI Codex 前綴？">
    `openai` 是 OpenAI API 金鑰和
    ChatGPT/Codex OAuth 的提供者和驗證設定檔 ID。您可能仍會在舊版設定和
    移轉警告中看到舊版 OpenAI Codex 前綴。
    較舊的設定也將其用作模型前綴：

    - `openai/gpt-5.5` = 具有用於代理程式回合的原生 Codex 執行時期的 ChatGPT/Codex 訂閱驗證
    - legacy Codex GPT-5.5 ref = 由 `openclaw doctor --fix` 修復的舊版模型路由
    - `openai/gpt-5.5` 加上有序的 `openai` API 金鑰設定檔 = OpenAI 代理程式模型的 API 金鑰驗證
    - legacy Codex auth profile ids = 由 `openclaw doctor --fix` 移轉的舊版驗證設定檔 ID

    如果您想要直接 OpenAI Platform 計費/限制路徑，請設定
    `OPENAI_API_KEY`。如果您想要 ChatGPT/Codex 訂閱驗證，請使用
    `openclaw models auth login --provider openai` 登入。請將模型參照保持為
    `openai/gpt-5.5`；舊版 Codex 模型參照是
    `openclaw doctor --fix` 重寫的舊版設定。

  </Accordion>

  <Accordion title="為什麼 Codex OAuth 限制會與 ChatGPT 網頁版不同？">
    Codex OAuth 使用由 OpenAI 管理、取決於方案的配額視窗。實際上，
    即使兩者都綁定到同一個帳戶，這些限制也可能與 ChatGPT 網站/應用程式的體驗不同。

    OpenClaw 可以在 `openclaw models status` 中顯示目前可見的提供者使用量/配額視窗，
    但它不會將 ChatGPT 網頁版的權限轉換為直接的 API 存取。如果您想要直接使用
    OpenAI Platform 的計費/限制路徑，請使用 API 金鑰搭配 `openai/*`。

  </Accordion>

  <Accordion title="你們支援 OpenAI 訂閱驗證 (Codex OAuth) 嗎？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在像 OpenClaw 這類的外部工具/工作流程中使用訂閱 OAuth。
    入門流程可以為您執行 OAuth 流程。

    請參閱 [OAuth](/zh-Hant/concepts/oauth)、[Model providers](/zh-Hant/concepts/model-providers) 和 [Onboarding (CLI)](/zh-Hant/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **外掛程式驗證流程**，而不是 `openclaw.json` 中的用戶端 ID 或密碼。

    步驟：

    1. 在本機安裝 Gemini CLI，讓 `gemini` 位於 `PATH` 中
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. 啟用外掛程式：`openclaw plugins enable google`
    3. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登入後的預設模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳細資訊：[Model providers](/zh-Hant/concepts/model-providers)。

  </Accordion>

<Accordion title="是否可以將本地模型用於休閒聊天？">通常不行。OpenClaw 需要長上下文 + 強安全性；小顯卡會截斷並洩露內容。如果必須使用，請在本地運行您所能運行的**最大**模型版本（LM Studio），並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化的模型會增加提示詞注入風險 - 請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

<Accordion title="如何將託管模型流量保留在特定區域？">選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管的選項；選擇美國託管變體可將數據保留在區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型一起列出，以便在遵守您選擇的區域提供商的同時保持備用方案可用。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（Windows 通過 WSL2）上運行。Mac mini 是可選的 - 有些人
    購買它是作為一個始終運行的主機，但小型 VPS、家庭服務器或 Raspberry Pi 級別的設備也可以。

    您僅在需要 **僅限 macOS 的工具** 時才需要 Mac。對於 iMessage，請在任何登錄了 Messages 的 Mac 上使用帶有 `imsg` 的 [iMessage](/zh-Hant/channels/imessage)。如果 Gateway 在 Linux 或其他地方運行，請將 `channels.imessage.cliPath` 設置為 SSH 包裝器，該包裝器在該 Mac 上運行 `imsg`。如果您想要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文檔：[iMessage](/zh-Hant/channels/imessage)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    你需要**某部已登入 Messages 的 macOS 裝置**。這**不**一定是 Mac mini ——
    任何 Mac 都可以。**搭配 [iMessage](/zh-Hant/channels/imessage)** 使用 `imsg`；Gateway 可以在那台 Mac 上運行，也可以在其他地方透過 SSH 包裝器 `cliPath` 運行。

    常見設定：

    - 在 Linux/VPS 上運行 Gateway，並將 `channels.imessage.cliPath` 設定為 SSH 包裝器，該包裝器在已登入 Messages 的 Mac 上運行 `imsg`。
    - 如果你想要最簡單的單機設定，請在 Mac 上運行所有內容。

    文件：[iMessage](/zh-Hant/channels/imessage)、[節點](/zh-Hant/nodes)、
    [Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而你的 MacBook Pro 可以作為
    **節點**（companion device）連線。節點不執行 Gateway —— 它們提供額外
    功能，例如該裝置上的螢幕/相機/畫布 和 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上（永遠開啟）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並與 Gateway 配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 進行檢視。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    Bun **不建議使用**。我們發現存在運行時錯誤，特別是在 WhatsApp 和 Telegram 上。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍然想嘗試 Bun，請在不包含 WhatsApp/Telegram 的非生產閘道上進行。

  </Accordion>

  <Accordion title="Telegram: what goes in allowFrom?">
    `channels.telegram.allowFrom` 是 **人類發送者的 Telegram 用戶 ID**（數字）。它不是機器人用戶名。

    設定僅要求輸入數字用戶 ID。如果您在配置中已有舊版 `@username` 項目，`openclaw doctor --fix` 可以嘗試解析它們。

    更安全（無第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    請參閱 [/channels/telegram](/zh-Hant/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="Can multiple people use one WhatsApp number with different OpenClaw instances?">
  可以，透過 **多代理路由**。將每位發送者的 WhatsApp **私訊**（DM）（peer `kind: "direct"`，發送者 E.164 格式如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區和會話存儲。回覆仍然來自 **同一個 WhatsApp 帳戶**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）對每個 WhatsApp 帳戶是全域的。請參閱 [多代理路由](/zh-Hant/concepts/multi-agent) 和
  [WhatsApp](/zh-Hant/channels/whatsapp)。
</Accordion>

<Accordion title='Can I run a "fast chat" agent and an "Opus for coding" agent?'>可以。使用多代理路由：為每個代理提供其自己的預設模型，然後將入站路由（提供者帳戶或特定對等點）綁定到每個代理。範例配置位於 [多代理路由](/zh-Hant/concepts/multi-agent) 中。另請參閱 [模型](/zh-Hant/concepts/models) 和 [配置](/zh-Hant/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或您的 brew 前綴路徑)，這樣 `brew` 安裝的工具才能在非登入 shell 中正確解析。
    近期的版本也會在 Linux systemd 服務中預設加入常見的使用者 bin 目錄 (例如 `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`)，並在有設定時遵從 `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR`, 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可編輯的 git 安裝與 npm 安裝的差別">
    - **可編輯安裝:** 完整的原始碼检出，可編輯，最適合貢獻者。
      您在本機執行建置，並可以修改程式碼/文件。
    - **npm 安裝:** 全域 CLI 安裝，無儲存庫，最適合「只想直接執行」。
      更新來自 npm dist-tags。

    文件：[入門指南](/zh-Hant/start/getting-started), [更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="日後我可以在 npm 和 git 安裝之間切換嗎？">
    可以。當 OpenClaw 已安裝時，請使用 `openclaw update --channel ...`。
    這**不會刪除您的資料**——它僅變更 OpenClaw 的程式碼安裝。
    您的狀態 (`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 將保持不變。

    從 npm 到 git：

    ```bash
    openclaw update --channel dev
    ```

    從 git 到 npm：

    ```bash
    openclaw update --channel stable
    ```

    新增 `--dry-run` 以先預覽計畫的模式切換。更新程式會執行
    Doctor 後續檢查，重新整理目標頻道的插件來源，並
    重新啟動閘道，除非您傳遞 `--no-restart`。

    安裝程式也可以強制執行任一模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    備份提示：請參閱 [備份策略](/zh-Hant/help/faq#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦或 VPS 上執行 Gateway？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您想要
    最低的摩擦力，並且不介意睡眠/重新啟動，請在本地執行。

    **筆記型電腦 (本地 Gateway)**

    - **優點：** 無伺服器成本，可直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 睡眠/網路中斷 = 連線斷開，作業系統更新/重新啟動會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠線上，網路穩定，無筆記型電腦睡眠問題，更容易保持運作。
    - **缺點：** 通常為無介面模式 (使用螢幕截圖)，僅限遠端檔案存取，您必須使用 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都能正常運作。唯一真正的取捨是 **無介面瀏覽器** 與可視視窗的比較。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    **推薦預設值：** 如果您之前有 Gateway 連線中斷的情況，請選擇 VPS。當您正在使用 Mac 且想要本機檔案存取或透過可視瀏覽器進行 UI 自動化時，本地環境非常適合。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必需，但為了可靠性和隔離性**建議這樣做**。

    - **專用主機 (VPS/Mac mini/Raspberry Pi)：** 永遠線上，較少因休眠/重啟中斷，權限更乾淨，更容易保持運作。
    - **共用筆記型電腦/桌上型電腦：** 非常適合測試和主動使用，但預期當機器休眠或更新時會暫停。

    如果您想兩全其美，請將 Gateway 保持在專用主機上，並將您的筆記型電腦配對為用於本機螢幕/相機/執行工具的**節點 (node)**。請參閱 [節點](/zh-Hant/nodes)。
    如需安全性指導，請閱讀 [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 需求和建議的作業系統為何？">
    OpenClaw 很輕量。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **建議規格：** 1-2 vCPU，2GB RAM 或更多以保留餘裕 (日誌、媒體、多個頻道)。節點工具和瀏覽器自動化可能會消耗較多資源。

    作業系統：使用 **Ubuntu LTS** (或任何現代的 Debian/Ubuntu)。Linux 安裝路徑在那裡測試得最完善。

    文件：[Linux](/zh-Hant/platforms/linux)、[VPS 託管](/zh-Hant/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求為何？">
    可以。將 VM 視為與 VPS 相同：它需要永遠線上、可連線，並且有足夠的 RAM 供 Gateway 和您啟用的任何頻道使用。

    基準指導原則：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議規格：** 2GB RAM 或更多，如果您執行多個頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，並且具有最佳的工具相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS 託管](/zh-Hant/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相關

- [FAQ](/zh-Hant/help/faq) — 主要的常見問題解答 (模型、工作階段、閘道、安全性等)
- [安裝概覽](/zh-Hant/install)
- [開始使用](/zh-Hant/start/getting-started)
- [疑難排解](/zh-Hant/help/troubleshooting)
