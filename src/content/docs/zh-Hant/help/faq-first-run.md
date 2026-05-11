---
summary: "常見問題：快速入門與首次執行設定 — 安裝、上線、驗證、訂閱、初始失敗"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "常見問題：首次執行設定"
sidebarTitle: "首次執行常見問題"
---

快速入門與首次執行問答。若需了解日常操作、模型、驗證、工作階段
以及疑難排解，請參閱主要 [常見問題](/zh-Hant/help/faq)。

## 快速入門與首次執行設定

<AccordionGroup>
  <Accordion title="I am stuck, fastest way to get unstuck">
    使用一個能夠**看到您的機器**的本機 AI 代理。這比在 Discord 上提問要有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取 repo、執行指令、檢查日誌，並協助修復您的機器層級設定（PATH、服務、權限、auth 檔案）。透過可破解 安裝提供給它們**完整的原始碼檢出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會從 git 檢出安裝 OpenClaw，因此代理可以讀取程式碼 + 文件，並推論您正在執行的確切版本。您隨時可以透過不使用 `--install-method git` 重新執行安裝程式來切換回穩定版。

    提示：請代理**計劃並監督**修復過程（逐步進行），然後僅執行必要的指令。這可以保持變更最小且更容易稽核。

    如果您發現真正的錯誤或修復方法，請在 GitHub 上提出 issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（在尋求協助時分享輸出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：網關/代理健康狀況 + 基本設定的快速快照。
    - `openclaw models status`：檢查提供者 auth + 模型可用性。
    - `openclaw doctor`：驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速偵錯循環：[如果出問題的前 60 秒](#first-60-seconds-if-something-is-broken)。
    安裝文件：[安裝](/zh-Hant/install)、[安裝程式旗標](/zh-Hant/install/installer)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat keeps skipping. What do the skip reasons mean?">
    常見的 Heartbeat 跳過原因：

    - `quiet-hours`：超出設定的 active-hours 時間範圍
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在但僅包含空白/僅標頭的鷹架
    - `no-tasks-due`：`HEARTBEAT.md` 任務模式已啟動，但尚未有任何任務間隔到期
    - `alerts-disabled`：所有 heartbeat 可見性均已停用（`showOk`、`showAlerts` 和 `useIndicator` 皆已關閉）

    在任務模式下，只有當真實的 heartbeat 執行完成後，才會推進到期時間戳記。跳過的執行不會將任務標記為已完成。

    文件：[Heartbeat](/zh-Hant/gateway/heartbeat)、[Automation & Tasks](/zh-Hant/automation)。

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
    - 如果要求共用金鑰驗證，請將設定的 token 或密碼貼上至控制 UI 設定中。
    - Token 來源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密碼來源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未設定共用金鑰，請使用 `openclaw doctor --generate-gateway-token` 產生 token。

    **非本地主機：**

    - **Tailscale Serve**（推薦）：保持綁定 loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份標頭將滿足控制 UI/WebSocket 驗證（無需貼上共用金鑰，假設為受信任的閘道主機）；HTTP API 仍需要共用金鑰驗證，除非您刻意使用 private-ingress `none` 或 trusted-proxy HTTP 驗證。
      來自同一個用戶端的不良並行 Serve 驗證嘗試會在失敗驗證限制器記錄它們之前被序列化，因此第二次不良重試可能已經顯示 `retry later`。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`（或設定密碼驗證），開啟 `http://<tailscale-ip>:18789/`，然後在儀表板設定中貼上相符的共用金鑰。
    - **具備感知身份的反向代理**：將閘道保留在非 loopback 的受信任代理後方，設定 `gateway.auth.mode: "trusted-proxy"`，然後開啟代理 URL。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。共用金鑰驗證仍透過 tunnel 套用；如果出現提示，請貼上設定的 token 或密碼。

    參閱 [儀表板](/zh-Hant/web/dashboard) 和 [Web 介面](/zh-Hant/web) 以了解綁定模式和驗證詳細資訊。

  </Accordion>

  <Accordion title="為什麼針對聊天審核有兩個 exec 審核配置？">
    它們控制不同的層級：

    - `approvals.exec`：將審核提示轉發到聊天目的地
    - `channels.<channel>.execApprovals`：讓該通道充當針對 exec 審核的原生審核客戶端

    主機 exec 策略仍然是真正的審核閘門。聊天配置僅控制審核提示出現的位置以及人們可以如何回答。

    在大多數設置中，您並**不**需要同時使用兩者：

    - 如果聊天已支援指令和回覆，同聊天 `/approve` 可透過共享路徑運作。
    - 如果支援的原生通道可以安全地推斷審核者，當 `channels.<channel>.execApprovals.enabled` 未設定或為 `"auto"` 時，OpenClaw 現在會自動啟用 DM 優先的原生審核。
    - 當原生審核卡片/按鈕可用時，該原生 UI 是主要路徑；僅當工具結果指出聊天審核不可用或手動審核是唯一路徑時，代理才應包含手動 `/approve` 指令。
    - 僅當提示也必須轉發到其他聊天或明確的 ops 房間時，才使用 `approvals.exec`。
    - 僅當您明確希望將審核提示發布回原始房間/主題時，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 外掛程式審核又是分開的：它們預設使用同聊天 `/approve`，可選的 `approvals.plugin` 轉發，且只有部分原生通道會在最上方保留外掛程式審核的原生處理。

    簡而言之：轉發用於路由，原生客戶端配置用於更豐富的通道特定 UX。
    參閱 [Exec Approvals](/zh-Hant/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什麼 runtime？">
    需要 Node **>= 22**。建議使用 `pnpm`。不建議將 Bun 用於 Gateway。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上運行嗎？">
    是的。Gateway 非常輕量——文檔列出的 **512MB-1GB RAM**、**1 核心**和約 **500MB** 磁盤空間對於個人使用來說已經足夠，請注意，**Raspberry Pi 4 可以運行它**。

    如果您需要額外的餘量（日誌、媒體、其他服務），建議使用 **2GB**，但這並非硬性最低要求。

    提示：一個小型 Pi/VPS 可以託管 Gateway，您可以在筆記本電腦/手機上配對 **節點** 以進行本地屏幕/相機/畫布操作或命令執行。參見 [Nodes](/zh-Hant/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有什麼提示嗎？">
    簡單來說：它可以運行，但要做好遇到一些粗糙邊緣情況的心理準備。

    - 使用 **64 位** 操作系統並保持 Node >= 22。
    - 優先選擇 **可破解 安裝**，以便您查看日誌並快速更新。
    - 初始啟動時不加載渠道/技能，然後逐個添加。
    - 如果遇到奇怪的二進制問題，通常是 **ARM 兼容性** 問題。

    文檔：[Linux](/zh-Hant/platforms/linux)，[Install](/zh-Hant/install)。

  </Accordion>

  <Accordion title="它卡在「wake up my friend」/ onboarding 無法啟動。現在該怎麼辦？">
    該屏幕取決於 Gateway 是否可訪問且已通過身份驗證。TUI 還會在首次啟動時自動發送“Wake up, my friend!”。如果您看到該行文字卻**沒有回覆**
    且 token 數量保持為 0，則表示代理從未運行。

    1. 重啟 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 檢查狀態和身份驗證：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然卡住，請運行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠程的，請確保隧道/Tailscale 連接已建立，並且 UI 指向正確的 Gateway。參見 [Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我可以在不重新進行入門導覽的情況下，將我的設定遷移到新機器（Mac mini）嗎？">
    可以。複製 **state directory（狀態目錄）** 和 **workspace（工作區）**，然後執行一次 Doctor。這能讓您的機器人「完全一樣」（記憶體、對話歷程、身份驗證和頻道狀態），只要您複製 **這兩個** 位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設： `~/.openclaw`）。
    3. 複製您的工作區（預設： `~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這會保留設定、身份驗證設定檔、WhatsApp 憑證、對話和記憶體。如果您處於遠端模式，請記得 gateway 主機擁有對話儲存區和工作區。

    **重要：** 如果您只將工作區 commit/push 到 GitHub，您備份的是 **記憶體 + 引導檔案**，但 **不包含** 對話歷程或身份驗證資料。這些資料位於 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關連結：[Migrating](/zh-Hant/install/migrating)、[Where things live on disk](#where-things-live-on-disk)、
    [Agent workspace](/zh-Hant/concepts/agent-workspace)、[Doctor](/zh-Hant/gateway/doctor)、
    [Remote mode](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以看到最新版本的新功能？">
    檢查 GitHub 變更記錄：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目在最上面。如果頂部區段標示為 **Unreleased**，下一個有日期的區段就是最新發布的版本。條目分類為 **Highlights（亮點）**、**Changes（變更）** 和 **Fixes（修復）**（必要時會加上 docs/other 區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai（SSL 錯誤）">
    部分 Comcast/Xfinity 連線會透過 Xfinity Advanced Security 錯誤封鎖 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。
    請在此處回報以協助我們解除封鎖： [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件已鏡像至 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 與 Beta 的區別">
    **Stable** 和 **beta** 是 **npm dist-tags**，而不是獨立的代碼線：

    - `latest` = stable
    - `beta` = 用於測試的早期構建

    通常，stable 版本會先發佈到 **beta**，然後通過顯式的晉升步驟將同一版本移動到 `latest`。維護者在需要時也可以直接發佈到 `latest`。這就是為什麼在晉升後 beta 和 stable 可能指向**相同版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    有關單行安裝指令以及 beta 和 dev 的區別，請參閱下方的手風琴組件。

  </Accordion>

  <Accordion title="如何安裝 Beta 版本？Beta 與 Dev 有什麼區別？">
    **Beta** 是 npm dist-tag `beta`（晉升後可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的移動頭部；發佈時，它使用 npm dist-tag `dev`。

    單行指令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳情：[開發頻道](/zh-Hant/install/development-channels) 和 [安裝程式標誌](/zh-Hant/install/installer)。

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

    這會為您提供一個可以編輯的本地倉庫，然後可以通過 git 更新。

    如果您更喜歡手動乾淨克隆，請使用：

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
    時間估算：

    - **安裝：** 2-5 分鐘
    - **入門：** 5-15 分鐘，取決於您設定了多少頻道/模型

    如果程式卡住，請使用 [Installer stuck](#quick-start-and-first-run-setup)
    以及 [I am stuck](#quick-start-and-first-run-setup) 中的快速除錯迴圈。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何取得更多回饋資訊？">
    重新執行安裝程式並開啟 **詳細輸出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用詳細輸出進行 Beta 安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    對於可修改 (git) 的安裝：

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

    更多選項：[Installer flags](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝顯示找不到 git 或無法辨識 openclaw">
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 環境變數中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法辨識 openclaw**

    - 您的 npm全域 bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增至您的使用者 PATH（Windows 上不需要 `\bin` 後綴；在大多數系統上是 `%AppData%\npm`）。
    - 更新 PATH 後，請關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/zh-Hant/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 我該怎麼辦？">
    這通常是由於原生 Windows Shell 中的主控台字碼頁不相符所致。

    症狀：

    - `system.run`/`exec` 輸出將中文呈現為亂碼
    - 相同的指令在另一個終端機設定檔中看起來正常

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

  <Accordion title="文件沒有回答我的問題 - 如何獲得更好的答案？">
    使用 **可駭客式 (git) 安裝**，這樣您就可以在本機擁有完整的原始碼和文件，然後 _從該資料夾中_ 詢問您的機器人（或 Claude/Codex），以便它能讀取 repo 並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝 OpenClaw？">
    簡短回答：依照 Linux 指南操作，然後執行上架引導。

    - Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
    - 完整逐步解說：[快速入門](/zh-Hant/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 均可運作。在伺服器上安裝，然後使用 SSH/Tailscale 連線至 Gateway。

    指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
    遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見供應商的 **託管中心 (hosting hub)**。選擇其中一個並依照指南操作：

    - [VPS 託管](/zh-Hant/vps) (所有供應商都在這裡)
    - [Fly.io](/zh-Hant/install/fly)
    - [Hetzner](/zh-Hant/install/hetzner)
    - [exe.dev](/zh-Hant/install/exe-dev)

    在雲端運作的原理：**Gateway 在伺服器上運行**，您可以透過控制 UI (Control UI，或 Tailscale/SSH) 從您的筆記型電腦/手機存取它。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將 **節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway，以存取本機畫面/相機/畫布或在您的筆記型電腦上執行指令，同時將 Gateway 保留在雲端。

    中心：[平台](/zh-Hant/platforms)。遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。
    節點：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自己嗎？">
    簡短回答：**可行，但不建議**。更新流程可能會重新啟動
    Gateway (這會中斷現有的工作階段)，可能需要乾淨的 git checkout，並且
    可能會提示進行確認。較安全的做法：以操作員身份從 shell 執行更新。

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

    文件：[更新](/zh-Hant/cli/update)、[正在更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="入門導引實際上做了什麼？">
    `openclaw onboard` 是推薦的設定途徑。在**本地模式**下，它會引導您完成以下步驟：

    - **模型/驗證設定**（提供者 OAuth、API 金鑰、Anthropic 設定權杖，以及如 LM Studio 等本地模型選項）
    - **工作區**位置 + 引導檔案
    - **閘道器設定**（綁定/連接埠/驗證/tailscale）
    - **頻道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及如 QQ Bot 等內建的頻道外掛）
    - **守護程序安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 使用者單元）
    - **健康檢查**與**技能**選擇

    如果您設定的模型未知或缺少驗證，它也會發出警告。

  </Accordion>

  <Accordion title="我需要 Claude 或 OpenAI 訂閱才能執行此程式嗎？">
    不需要。您可以透過 **API 金鑰**（Anthropic/OpenAI/其他）或僅使用**本地模型**來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱（Claude Pro/Max 或 OpenAI Codex）是驗證這些提供者的可選方式。

    對於 OpenClaw 中的 Anthropic，實際區分如下：

    - **Anthropic API 金鑰**：一般的 Anthropic API 計費
    - **OpenClaw 中的 Claude CLI / Claude 訂閱驗證**：Anthropic 工作人員告訴我們此種使用方式再次被允許，除非 Anthropic 發布新政策，否則 OpenClaw 將 `claude -p` 的使用視為獲此整合認可

    對於長期執行的閘道器主機，Anthropic API 金鑰仍然是更可預測的設定方式。OpenAI Codex OAuth 明確支援像 OpenClaw 這類的外部工具。

    OpenClaw 也支援其他託管的訂閱式選項，包括**Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和 **Z.AI / GLM Coding Plan**。

    文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
    [Qwen Cloud](/zh-Hant/providers/qwen)、
    [MiniMax](/zh-Hant/providers/minimax)、[GLM Models](/zh-Hant/providers/glm)、
    [Local models](/zh-Hant/gateway/local-models)、[Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    是的。

    Anthropic 人員告訴我們，再次允許 OpenClaw 風格的 Claude CLI 使用，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude 訂閱驗證和 `claude -p` 使用視為此整合的授權方式。如果您希望伺服器端設定最為穩定，請改用 Anthropic API 金鑰。

  </Accordion>

  <Accordion title="你們支援 Claude 訂閱驗證（Claude Pro 或 Max）嗎？">
    是的。

    Anthropic 人員告訴我們，再次允許此類使用方式，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 CLI 重用和 `claude -p` 使用視為此整合的授權方式。

    Anthropic 設定權杖仍作為支援的 OpenClaw 權杖路徑提供，但如果有可用的，OpenClaw 現在更傾向於使用 Claude CLI 重用和 `claude -p`。對於生產環境或多用戶工作負載，Anthropic API 金鑰驗證仍然是更安全、更可預測的選擇。如果您想要 OpenClaw 中的其他訂閱式託管選項，請參閱 [OpenAI](/zh-Hant/providers/openai)、[Qwen / Model
    Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [GLM
    Models](/zh-Hant/providers/glm)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="為什麼我會收到來自 Anthropic 的 HTTP 429 rate_limit_error 錯誤？">
    這表示您在目前的時間視窗內的 **Anthropic 配額/速率限制** 已經用盡。如果您
    使用的是 **Claude CLI**，請等待時間視窗重置或升級您的方案。如果您
    使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console
    的使用量/帳單狀況，並視需要提高限制。

    如果訊息特別是：
    `Extra usage is required for long context requests`，則表示請求正嘗試使用
    Anthropic 的 1M 上下文測試版 (`context1m: true`)。這只有在您的
    憑證符合長上下文計費資格時才有效（API 金鑰計費或已啟用額外使用量的
    OpenClaw Claude 登入路徑）。

    提示：設定一個 **後備模型**，以便當供應商受到速率限制時，OpenClaw 能持續回覆。
    請參閱 [模型](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 與
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">
  是的。OpenClaw 內建了 **Amazon Bedrock (Converse)** 供應商。當存在 AWS 環境標記時，OpenClaw 可以自動探索串流/文字 Bedrock 目錄，並將其合併為隱含的 `amazon-bedrock` 供應商；否則，您可以明確啟用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或新增手動供應商項目。請參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 與 [模型供應商](/zh-Hant/providers/models)。如果您偏好管理金鑰流程，在 Bedrock
  前方使用 OpenAI 相容的代理伺服器仍然是一個可行的選項。
</Accordion>

<Accordion title="Codex 驗證如何運作？">
  OpenClaw 支援透過 OAuth (ChatGPT 登入) 來使用 **OpenAI Code (Codex)**。請使用 `openai-codex/gpt-5.5` 透過預設 PI runner 進行 Codex OAuth。使用 `openai/gpt-5.5` 進行直接 OpenAI API 金鑰存取。GPT-5.5 也可以透過 `openai-codex/gpt-5.5` 使用訂閱/OAuth，或使用原生 Codex app-server 搭配 `openai/gpt-5.5` 和 `agentRuntime.id: "codex"` 執行。 請參閱 [模型提供者](/zh-Hant/concepts/model-providers) 和 [入門導覽
  (CLI)](/zh-Hant/start/wizard)。
</Accordion>

  <Accordion title="為什麼 OpenClaw 仍然提到 openai-codex？">
    `openai-codex` 是 ChatGPT/Codex OAuth 的提供者和 auth-profile id。
    它也是 Codex OAuth 的明確 PI 模型前綴：

    - `openai/gpt-5.5` = 目前 PI 中的直接 OpenAI API 金鑰路由
    - `openai-codex/gpt-5.5` = PI 中的 Codex OAuth 路由
    - `openai/gpt-5.5` + `agentRuntime.id: "codex"` = 原生 Codex app-server 路由
    - `openai-codex:...` = auth profile id，不是模型參考

    如果您想要直接 OpenAI Platform 計費/限制路徑，請設定
    `OPENAI_API_KEY`。如果您想要 ChatGPT/Codex 訂閱驗證，請使用
    `openclaw models auth login --provider openai-codex` 登入並在 PI 執行時使用
    `openai-codex/*` 模型參考。

  </Accordion>

  <Accordion title="為什麼 Codex OAuth 限制可能與 ChatGPT 網頁版不同？">
    Codex OAuth 使用由 OpenAI 管理、取決於方案的配額視窗。實際上，
    這些限制可能與 ChatGPT 網站/應用程式的體驗不同，即使
    兩者都綁定至同一個帳戶。

    OpenClaw 可以在
    `openclaw models status` 中顯示目前可見的提供者使用量/配額視窗，但它不會
    將 ChatGPT 網頁版的權利轉換或正規化為直接 API 存取。如果您想要直接 OpenAI Platform
    計費/限制路徑，請搭配 API 金鑰使用 `openai/*`。

  </Accordion>

  <Accordion title="你們是否支援 OpenAI 訂閱認證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在外部工具/工作流程（如 OpenClaw）中使用訂閱 OAuth。入門流程 (Onboarding) 可以為您執行 OAuth 流程。

    請參閱 [OAuth](/zh-Hant/concepts/oauth)、[模型提供者](/zh-Hant/concepts/model-providers) 和 [入門流程 (CLI)](/zh-Hant/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **外掛程式認證流程**，而不是 `openclaw.json` 中的用戶端 ID 或密鑰。

    步驟如下：

    1. 在本地安裝 Gemini CLI，以便 `gemini` 位於 `PATH` 上
       - Homebrew：`brew install gemini-cli`
       - npm：`npm install -g @google/gemini-cli`
    2. 啟用外掛程式：`openclaw plugins enable google`
    3. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登入後的預設模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    這會將 OAuth 權杖儲存在閘道主機上的認證設定檔中。詳細資訊：[模型提供者](/zh-Hant/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型適合用於閒聊嗎？">通常不適合。OpenClaw 需要大量的上下文 + 強大的安全性；小容量的模型會發生截斷和洩漏。如果您必須使用，請在本地執行您能執行的**最大**模型版本 (LM Studio)，並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化模型會增加提示詞注入的風險 - 請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

<Accordion title="如何將託管模型的流量保留在特定區域？">請選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管的選項；請選擇美國託管的版本以將數據保留在該區域內。您仍然可以透過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些服務並列，以便在尊重您選擇的區域提供者的同時保持備用方案可用。</Accordion>

  <Accordion title="安裝這個軟體需要購買 Mac Mini 嗎？">
    不需要。OpenClaw 可以在 macOS 或 Linux（Windows 透過 WSL2）上運行。Mac mini 是可選的——有些人購買它作為 24/7 運行的主機，但小型 VPS、家庭伺服器或樹莓派級別的設備也可以。

    只有在使用 **僅限 macOS 的工具**時才需要 Mac。對於 iMessage，請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可以在任何 Mac 上運行，而 Gateway 可以在 Linux 或其他地方運行。如果您想使用其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="支援 iMessage 需要 Mac mini 嗎？">
    您需要有一台登入 Messages 的 **macOS 裝置**。它 **不** 非得是 Mac mini——任何 Mac 都可以。對於 iMessage，**請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)**（推薦）——BlueBubbles 伺服器在 macOS 上運行，而 Gateway 可以在 Linux 或其他地方運行。

    常見的設置方式：

    - 在 Linux/VPS 上運行 Gateway，並在任何登入 Messages 的 Mac 上運行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設置，請將所有內容都運行在 Mac 上。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、
    [Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我買了一台 Mac mini 來運行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以運行 Gateway**，而您的 MacBook Pro 可以作為 **節點**（伴隨裝置）連接。節點不運行 Gateway——它們提供螢幕/相機/畫布等額外功能以及該裝置上的 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上運行（24/7）。
    - MacBook Pro 運行 macOS 應用程式或節點主機並與 Gateway 配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    Bun **不建議使用**。我們發現存在運行時錯誤，特別是在 WhatsApp 和 Telegram 上。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍然想嘗試 Bun，請在不包含 WhatsApp/Telegram 的非生產閘道上進行。

  </Accordion>

  <Accordion title="Telegram：allowFrom 應填入什麼？">
    `channels.telegram.allowFrom` 是**人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    設定僅要求輸入數字使用者 ID。如果您在設定中已有舊版的 `@username` 項目，`openclaw doctor --fix` 可以嘗試解析它們。

    更安全的方式（無第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/zh-Hant/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人是否可以透過不同的 OpenClaw 執行個體使用同一個 WhatsApp 號碼？">
  是的，透過**多代理程式路由**。將每個發送者的 WhatsApp **私訊**（peer `kind: "direct"`，發送者 E.164 如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都會有自己的工作區和會話儲存。回覆仍然來自**同一個 WhatsApp 帳戶**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是每個 WhatsApp 帳戶全域的。參見 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和
  [WhatsApp](/zh-Hant/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行「快速聊天」代理和「用於編碼的 Opus」代理嗎？">可以。使用多代理路由：為每個代理指定其預設模型，然後將入站路由（提供者帳戶或特定對等點）綁定到每個代理。範例配置位於 [多代理路由](/zh-Hant/concepts/multi-agent) 中。另請參閱 [模型](/zh-Hant/concepts/models) 和 [配置](/zh-Hant/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 可以在 Linux 上運作嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或您的 brew 前綴)，以便 `brew` 安裝的工具在非登入 shell 中能正確解析。
    近期的版本也會在 Linux systemd 服務中預先常見的使用者 bin 目錄 (例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`)，並在設定時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可駭 (git) 安裝與 npm 安裝的區別">
    - **可駭 (git) 安裝：** 完整的原始碼檢出、可編輯，最適合貢獻者。
      您在本地建構並可以修補程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無儲存庫，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[入門指南](/zh-Hant/start/getting-started)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="之後我可以在 npm 和 git 安裝之間切換嗎？">
    是的。當 OpenClaw 已經安裝時，使用 `openclaw update --channel ...`。
    這**不會刪除您的數據**——它只會變更 OpenClaw 程式碼的安裝。
    您的狀態 (`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 將保持不變。

    從 npm 到 git：

    ```bash
    openclaw update --channel dev
    ```

    從 git 到 npm：

    ```bash
    openclaw update --channel stable
    ```

    新增 `--dry-run` 以先預覽計劃的模式切換。更新程式會執行
    Doctor 後續檢查，重新整理目標頻道的插件來源，並
    重新啟動閘道，除非您傳遞 `--no-restart`。

    安裝程式也可以強制執行任一模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    備份提示：請參閱 [備份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦或 VPS 上執行閘道？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您想要
    最低的阻力，且不介意睡眠/重新啟動，請在本地執行。

    **筆記型電腦 (本地閘道)**

    - **優點：** 沒有伺服器成本，可直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 睡眠/網路斷線 = 中斷連線，作業系統更新/重新啟動會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠在線，網路穩定，沒有筆記型電腦睡眠問題，更容易保持執行。
    - **缺點：** 通常無介面執行 (使用截圖)，僅能遠端存取檔案，您必須使用 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost/Discord 都可以在 VPS 上正常運作。唯一真正的取捨是 **無介面瀏覽器** 與 可見視窗。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    **建議預設值：** 如果您之前有閘道中斷連線的情況，請使用 VPS。當您正在使用 Mac 並想要存取本機檔案或使用可見瀏覽器進行 UI 自動化時，本地非常適合。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必需，但為了**可靠性和隔離性建議使用**。

    - **專用主機 (VPS/Mac mini/Pi)：** 全天候運作，較少休眠/重新啟動的中斷，權限設定更乾淨，更容易維持運作。
    - **共用筆記型電腦/桌機：** 適合測試和主動使用，但預期在電腦休眠或更新時會暫停。

    如果您想兩者兼顧，請將 Gateway 保留在專用主機上，並將您的筆記型電腦配對為本地螢幕/攝影機/執行工具的**節點 (node)**。請參閱[節點](/zh-Hant/nodes)。
    如需安全性指導，請閱讀[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="最低的 VPS 需求和建議的作業系統為何？">
    OpenClaw 是輕量級的。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **建議：** 1-2 vCPU，2GB RAM 或更多以保留餘裕 (日誌、媒體、多個頻道)。節點工具和瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS** (或任何現代版的 Debian/Ubuntu)。Linux 安裝路徑在該處測試最完善。

    文件：[Linux](/zh-Hant/platforms/linux)、[VPS 託管](/zh-Hant/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求為何？">
    可以。將 VM 視同 VPS：它需要全天候運作、可連線，並且有足夠的 RAM 給 Gateway 和您啟用的任何頻道使用。

    基本指導原則：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議：** 2GB RAM 或更多，如果您執行多個頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代版的 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，且具有最佳的工具相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS 託管](/zh-Hant/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相關

- [FAQ](/zh-Hant/help/faq) — 主要的 FAQ (模型、工作階段、閘道、安全性等)
- [安裝概覽](/zh-Hant/install)
- [開始使用](/zh-Hant/start/getting-started)
- [故障排除](/zh-Hant/help/troubleshooting)
