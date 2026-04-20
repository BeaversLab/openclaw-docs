---
summary: "關於 OpenClaw 設定、設定檔和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對真實環境設置（本地開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答以及更深層的故障排除。有關運行時診斷，請參閱 [故障排除](/zh-Hant/gateway/troubleshooting)。有關完整的配置參考，請參閱 [配置](/zh-Hant/gateway/configuration)。

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

   運行即時網關健康探測，包括支援時的通道探測
   （需要可到達的網關）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕機，請改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日誌與服務日誌是分開的；請參閱 [日誌記錄](/zh-Hant/logging) 和 [故障排除](/zh-Hant/gateway/troubleshooting)。

6. **執行修復工具（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移配置/狀態並運行健康檢查。請參閱 [醫生](/zh-Hant/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向運行中的網關請求完整快照（僅限 WS）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速入門與首次執行設置

<AccordionGroup>
  <Accordion title="我卡住了，最快脫困的方法">
    使用一個能夠**看到您的機器**的本機 AI Agent。這比在 Discord 提問有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取 repo、執行指令、檢查日誌，並協助修復您的機器層級設定（PATH、服務、權限、認證檔案）。請透過可駭客（git）安裝方式，提供給它們**完整的原始碼檢出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 檢出**安裝 OpenClaw，因此 Agent 可以讀取程式碼 + 文件，並針對您執行的確切版本進行推理。您稍後可以隨時透過不帶 `--install-method git` 參數重新執行安裝程式來切換回穩定版本。

    提示：請要求 Agent **規劃並監督**修復過程（逐步進行），然後僅執行必要的指令。這樣可以讓變動維持在最小範圍，也更容易稽核。

    如果您發現真正的錯誤或修復方法，請提交 GitHub issue 或傳送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（在尋求協助時分享輸出結果）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：gateway/agent 健康狀況 + 基本設定的快速快照。
    - `openclaw models status`：檢查提供者驗證 + 模型可用性。
    - `openclaw doctor`：驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查指令：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯循環：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安裝文件：[Install](/zh-Hant/install)、[Installer flags](/zh-Hant/install/installer)、[Updating](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat 持續跳過。跳過原因代表什麼？">
    常見的 Heartbeat 跳過原因：

    - `quiet-hours`：超出設定的 active-hours 視窗
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但只包含空白/僅標頭的鷹架
    - `no-tasks-due`：`HEARTBEAT.md` 任務模式已啟用，但尚未到任何任務間隔時間
    - `alerts-disabled`：所有 Heartbeat 可見性皆已停用（`showOk`、`showAlerts` 和 `useIndicator` 皆已關閉）

    在任務模式下，到期時間戳僅在實際 Heartbeat 執行完成後才會向前推進。跳過的執行不會將任務標記為已完成。

    文件：[Heartbeat](/zh-Hant/gateway/heartbeat)、[Automation & Tasks](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="安裝與設定 OpenClaw 的推薦方式">
    此 repo 建議從原始碼執行並使用 onboarding：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    此精靈也可以自動建構 UI 資產。完成 onboarding 後，您通常會在連接埠 **18789** 上執行 Gateway。

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

<Accordion title="How do I open the dashboard after onboarding?">精靈會在入門引導完成後立即使用乾淨（非權杖化）的儀表板 URL 開啟您的瀏覽器，並且也會在摘要中列印連結。請保持該分頁開啟；如果未啟動，請在同一台機器上複製並貼上列印出的 URL。</Accordion>

  <Accordion title="如何在本地主機與遠端對儀表板進行驗證？">
    **本地主機（同一台機器）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求共用金鑰驗證，請將設定的權杖或密碼貼上到 Control UI 設定中。
    - 權杖來源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密碼來源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未設定共用金鑰，請使用 `openclaw doctor --generate-gateway-token` 產生權杖。

    **非本地主機：**

    - **Tailscale Serve**（建議）：保持綁定 loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 為 `true`，識別標頭將滿足 Control UI/WebSocket 驗證（無需貼上共用金鑰，假設為信任的閘道主機）；除非您刻意使用 private-ingress `none` 或 trusted-proxy HTTP 驗證，否則 HTTP API 仍需要共用金鑰驗證。
      來自同一個用戶端的不當並發 Serve 驗證嘗試會在失敗驗證限制器記錄它們之前被序列化，因此第二次不當重試可能會顯示 `retry later`。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`（或設定密碼驗證），開啟 `http://<tailscale-ip>:18789/`，然後在儀表板設定中貼上相符的共用金鑰。
    - **身分感知反向代理**：將閘道保留在非 loopback 的信任代理後方，設定 `gateway.auth.mode: "trusted-proxy"`，然後開啟代理 URL。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。共用金鑰驗證仍適用於隧道；如果有提示，請貼上設定的權杖或密碼。

    請參閱 [Dashboard](/zh-Hant/web/dashboard) 和 [Web surfaces](/zh-Hant/web) 以了解綁定模式和驗證詳情。

  </Accordion>

  <Accordion title="為什麼有兩個針對聊天審批的執行審批配置？">
    它們控制不同的層級：

    - `approvals.exec`：將審批提示轉發到聊天目標地
    - `channels.<channel>.execApprovals`：使該通道充當執行審批的原生審批客戶端

    主機執行策略仍然是真正的審批閘門。聊天配置僅控制審批提示出現的位置以及人們如何回答它們。

    在大多數設置中，您**並不**需要同時使用兩者：

    - 如果聊天已支援指令和回覆，同聊天 `/approve` 透過共享路徑運作。
    - 如果支援的原生通道可以安全地推斷審批者，當 `channels.<channel>.execApprovals.enabled` 未設定或 `"auto"` 時，OpenClaw 現在會自動啟用優先使用 DM 的原生審批。
    - 當原生審批卡片/按鈕可用時，該原生 UI 是主要路徑；僅當工具結果指出聊天審批不可用或手動審批是唯一路徑時，代理才應包含手動 `/approve` 指令。
    - 僅當提示必須轉發到其他聊天或明確的運維房間時，才使用 `approvals.exec`。
    - 僅當您明確希望將審批提示發布回原始房間/主題時，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 外掛程式審批是分開的：它們預設使用同聊天 `/approve`，可選的 `approvals.plugin` 轉發，且只有部分原生通道在最上層保留外掛程式審批的原生處理。

    簡而言之：轉發用於路由，原生客戶端配置用於更豐富的特定通道使用者體驗。
    請參閱 [執行審批](/zh-Hant/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。對於 Gateway，**不建議**使用 Bun。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上執行嗎？">
    可以。Gateway 非常輕量——文件列出 **512MB-1GB RAM**、**1 核心以及大約 500MB**
    磁碟空間即可滿足個人使用，並且注意 **Raspberry Pi 4 可以執行它**。

    如果您想要額外的餘裕（日誌、媒體、其他服務），**建議 2GB**，但這並不是
    硬性的最低要求。

    提示：一台小型 Pi/VPS 可以託管 Gateway，您可以在您的筆記型電腦/手機上配對 **節點**
    以進行本機螢幕/相機/畫布或指令執行。請參閱 [節點](/zh-Hant/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有什麼建議嗎？">
    簡單來說：它能運作，但請預期可能會遇到一些問題。

    - 使用 **64 位元** 作業系統並保持 Node >= 22。
    - 優先選擇 **可駭客式安裝**，以便您查看日誌並快速更新。
    - 一開始不啟用頻道/技能，然後逐一新增。
    - 如果遇到奇怪的二進位問題，通常是 **ARM 相容性** 問題。

    文件：[Linux](/zh-Hant/platforms/linux)、[安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="它卡在喚醒我的朋友 / 入門導覽無法啟動。現在該怎麼辦？">
    該畫面取決於 Gateway 是否可連線並已通過驗證。TUI 也會在首次啟動時自動傳送
    「Wake up, my friend!」。如果您看到那行文字卻 **沒有回應**
    且 Tokens 保持為 0，表示代理程式從未執行。

    1. 重新啟動 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 檢查狀態 + 驗證：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然卡住，請執行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠端的，請確保通道/Tailscale 連線正常，且 UI
    指向正確的 Gateway。請參閱 [遠端存取](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我可以將設定遷移到新機器（Mac mini）而無需重新進入入職流程嗎？">
    可以。複製 **state directory** 和 **workspace**，然後執行一次 Doctor。這能讓您的機器人保持「完全一致」（記憶體、會話歷史、身份驗證和頻道狀態），前提是您複製了 **這兩個** 位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）。
    3. 複製您的工作區（預設：`~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、身份驗證設定檔、WhatsApp 憑證、會話和記憶體。如果您使用遠端模式，請記得 gateway 主機擁有會話儲存和工作區。

    **重要：** 如果您僅將工作區提交/推送至 GitHub，您正在備份 **記憶體 + 引導檔案**，但 **不包含** 會話歷史或身份驗證資訊。這些資料位於 `~/.openclaw/` 之下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關連結：[遷移](/zh-Hant/install/migrating)、[檔案在磁碟上的位置](#where-things-live-on-disk)、
    [Agent 工作區](/zh-Hant/concepts/agent-workspace)、[Doctor](/zh-Hant/gateway/doctor)、
    [遠端模式](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以查看最新版本的新功能？">
    請查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新條目位於頂部。如果頂部區段標記為 **Unreleased**，則下一個有日期的區段即為最新發布的版本。條目分為 **Highlights**（亮點）、**Changes**（變更）和 **Fixes**（修復）（並在需要時包含文件/其他區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai (SSL 錯誤)">
    部分 Comcast/Xfinity 連線會透過 Xfinity Advanced Security 錯誤地封鎖 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。
    請透過此處回報協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件已鏡像至 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Difference between stable and beta">
    **Stable** 和 **beta** 是 **npm dist-tags**，而不是獨立的程式碼行：

    - `latest` = stable (穩定版)
    - `beta` = early build for testing (用於測試的早期版本)

    通常，穩定版會先發布到 **beta**，然後透過明確的提升步驟將同一個版本移至 `latest`。維護者也可以在需要時直接發布到 `latest`。這就是為什麼在提升之後，beta 和 stable 可能會指向 **同一個版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    如需安裝單行程式碼以及 beta 和 dev 之間的區別，請參閱下方的摺疊面板。

  </Accordion>

  <Accordion title="How do I install the beta version and what is the difference between beta and dev?">
    **Beta** 是 npm dist-tag `beta` (在提升後可能與 `latest` 相同)。
    **Dev** 是 `main` (git) 的移動開發分支；發布時，它使用 npm dist-tag `dev`。

    單行程式碼 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳細資訊：[Development channels](/zh-Hant/install/development-channels) 和 [Installer flags](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="How do I try the latest bits?">
    有兩種選項：

    1. **Dev channel (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從原始碼更新。

    2. **Hackable install (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本機儲存庫，然後透過 git 更新。

    如果您偏好手動進行乾淨的複製，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[Update](/zh-Hant/cli/update)、[Development channels](/zh-Hant/install/development-channels)、
    [Install](/zh-Hant/install)。

  </Accordion>

  <Accordion title="安裝和入門通常需要多長時間？">
    大致指南：

    - **安裝：** 2-5 分鐘
    - **入門：** 5-15 分鐘，取決於您設定了多少個通道/模型

    如果它卡住了，請使用 [安裝程式卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速調試循環。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多反饋？">
    使用 **詳細輸出** 重新運行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用詳細模式進行 Beta 安裝：

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

  <Accordion title="Windows 安裝提示找不到 git 或無法識別 openclaw">
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / git not found**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新運行安裝程式。

    **2) 安裝後無法識別 openclaw**

    - 您的 npm 全域 bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增到您的使用者 PATH（在 Windows 上不需要 `\bin` 後綴；在大多數系統上它是 `%AppData%\npm`）。
    - 更新 PATH 後，關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而不是原生 Windows。
    文件：[Windows](/zh-Hant/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 我該怎麼辦？">
    這通常是由於原生 Windows Shell 上的主控台字碼頁 不相符。

    症狀：

    - `system.run`/`exec` 輸出將中文渲染為亂碼
    - 同一個指令在另一個終端機設定檔中看起來很正常

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

    如果您在最新版本的 OpenClaw 上仍然遇到此問題，請在此追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件沒有回答我的問題 - 如何獲得更好的答案？">
    使用 **可駭客式 安裝**，讓您在本地擁有完整的原始碼和文件，然後_從該資料夾中_詢問您的機器人（或 Claude/Codex），以便它可以讀取 repo 並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳細資訊：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝 OpenClaw？">
    簡短回答：依照 Linux 指南操作，然後執行上架。

    - Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
    - 完整逐步解說：[入門](/zh-Hant/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 都可以。在伺服器上安裝，然後使用 SSH/Tailscale 連線到 Gateway。

    指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
    遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見供應商的**託管中心**。選擇其中一個並按照指南操作：

    - [VPS 託管](/zh-Hant/vps) (所有供應商集中一處)
    - [Fly.io](/zh-Hant/install/fly)
    - [Hetzner](/zh-Hant/install/hetzner)
    - [exe.dev](/zh-Hant/install/exe-dev)

    在雲端運作的方式：**Gateway 在伺服器上運行**，您可以透過 Control UI (或 Tailscale/SSH) 從筆記型電腦/手機存取它。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將**節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway，以存取本機螢幕/相機/畫布或在筆記型電腦上執行指令，同時將 Gateway 保留在雲端。

    中心：[平台](/zh-Hant/platforms)。遠端存取：[Gateway remote](/zh-Hant/gateway/remote)。
    節點：[節點](/zh-Hant/nodes), [節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自己嗎？">
    簡短回答：**可以，但不建議**。更新流程可能會重新啟動 Gateway (這會中斷現有的工作階段)，可能需要乾淨的 git checkout，並且可能會提示確認。較安全的方法是：以操作員身分從 shell 執行更新。

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

    文件：[更新](/zh-Hant/cli/update), [正在更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="入門設定實際上做些什麼？">
    `openclaw onboard` 是推薦的設定路徑。在 **本地模式** 下，它會引導您完成：

    - **模型/認證設定**（提供者 OAuth、API 金鑰、Anthropic setup-token，以及本地模型選項如 LM Studio）
    - **工作區** 位置 + 引導檔案
    - **Gateway 設定**（綁定/埠/認證/tailscale）
    - **頻道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及內建的頻道外掛如 QQ Bot）
    - **Daemon 安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd user unit）
    - **健康檢查** 和 **技能** 選擇

    如果您設定的模型未知或缺少認證，它也會發出警告。

  </Accordion>

  <Accordion title="我需要 Claude 或 OpenAI 訂閱才能執行這個嗎？">
    不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或僅使用 **本地模型** 來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱（Claude Pro/Max 或 OpenAI Codex）是驗證這些提供者的可選方式。

    對於 OpenClaw 中的 Anthropic，實際的區分如下：

    - **Anthropic API 金鑰**：正常的 Anthropic API 計費
    - **OpenClaw 中的 Claude CLI / Claude 訂閱認證**：Anthropic 工作人員告訴我們這種用法再次被允許，除非 Anthropic 發布新政策，否則 OpenClaw 將 `claude -p`
      的使用視為此整合的允許用法

    對於長期運行的 Gateway 主機，Anthropic API 金鑰仍然是更可預測的設定方式。OpenAI Codex OAuth 明確支援 OpenClaw 等外部工具。

    OpenClaw 也支援其他託管的訂閱式選項，包括 **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和 **Z.AI / GLM Coding Plan**。

    文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
    [Qwen Cloud](/zh-Hant/providers/qwen)、
    [MiniMax](/zh-Hant/providers/minimax)、[GLM Models](/zh-Hant/providers/glm)、
    [Local models](/zh-Hant/gateway/local-models)、[Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    可以的。

    Anthropic 工作人員告知我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將此整合中的 Claude 訂閱驗證和 `claude -p` 使用視為經認可。如果您想要最可預測的伺服器端設定，請改用 Anthropic API 金鑰。

  </Accordion>

  <Accordion title="你們支援 Claude 訂閱驗證 (Claude Pro 或 Max) 嗎？">
    支援的。

    Anthropic 工作人員告知我們這種用法再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將此整合中的 Claude CLI 重複使用和 `claude -p` 使用視為經認可。

    Anthropic setup-token 仍可作為支援的 OpenClaw token 路徑使用，但在可用的情況下，OpenClaw 現在更傾向於使用 Claude CLI 重複使用和 `claude -p`。
    對於生產環境或多使用者工作負載，Anthropic API 金鑰驗證仍然是更安全、更可預測的選擇。如果您想要 OpenClaw 中其他訂閱式託管選項，請參閱 [OpenAI](/zh-Hant/providers/openai)、[Qwen / Model
    Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [GLM
    Models](/zh-Hant/providers/glm)。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="為什麼我會收到來自 Anthropic 的 HTTP 429 rate_limit_error 錯誤？">
這表示您目前的 **Anthropic 配額/速率限制** 已耗盡。如果您使用的是 **Claude CLI**，請等待時間窗口重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 的使用量/帳單情況，並視需要提高限制。

    如果訊息具體為：
    `Extra usage is required for long context requests`，則表示請求正在嘗試使用
    Anthropic 的 1M 上下文測試版 (`context1m: true`)。這僅在您的憑證符合長上下文計費條件時才有效（API 金鑰計費，或已啟用額外使用量的 OpenClaw Claude 登入路徑）。

    提示：設定一個 **備用模型 (fallback model)**，以便當供應商受到速率限制時，OpenClaw 能繼續回覆。
    請參閱 [模型](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">
  是的。OpenClaw 內建了 **Amazon Bedrock (Converse)** 供應商。當 AWS 環境變數標記存在時，OpenClaw 可以自動探索串流/文字 Bedrock 目錄，並將其合併為隱含的 `amazon-bedrock` 供應商；否則您可以明確啟用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或新增手動供應商條目。請參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 和 [模型供應商](/zh-Hant/providers/models)。如果您偏好受管金鑰流程，在 Bedrock
  前方使用 OpenAI 相容的代理伺服器仍然是一個可行的選項。
</Accordion>

<Accordion title="Codex 驗證是如何運作的？">OpenClaw 透過 OAuth（ChatGPT 登入）支援 **OpenAI Code (Codex)**。入門流程可以執行 OAuth 流程，並在適當時將預設模型設定為 `openai-codex/gpt-5.4`。請參閱 [模型供應商](/zh-Hant/concepts/model-providers) 和 [入門 (CLI)](/zh-Hant/start/wizard)。</Accordion>

  <Accordion title="為什麼 ChatGPT GPT-5.4 不會在 OpenClaw 中解鎖 openai/gpt-5.4？">
    OpenClaw 將這兩種路線分開處理：

    - `openai-codex/gpt-5.4` = ChatGPT/Codex OAuth
    - `openai/gpt-5.4` = 直接的 OpenAI Platform API

    在 OpenClaw 中，ChatGPT/Codex 登入連接到 `openai-codex/*` 路線，
    而非直接的 `openai/*` 路線。如果您想要在 OpenClaw 中使用
    直接的 API 路徑，請設定 `OPENAI_API_KEY` （或對等的 OpenAI 提供者設定）。
    如果您想要在 OpenClaw 中使用 ChatGPT/Codex 登入，請使用 `openai-codex/*`。

  </Accordion>

  <Accordion title="為什麼 Codex OAuth 限制可能與 ChatGPT 網頁版不同？">
    `openai-codex/*` 使用 Codex OAuth 路線，其可用的配額視窗是由
    OpenAI 管理且依方案而定。實際上，這些限制可能與 ChatGPT 網站/應用程式的體驗不同，
    即使兩者都綁定到同一個帳戶。

    OpenClaw 可以在 `openclaw models status` 中顯示目前可見的提供者使用量/配額視窗，
    但它不會捏造或將 ChatGPT 網頁版權限正規化為直接 API 存取。如果您想要直接的 OpenAI Platform
    計費/限制路徑，請使用 `openai/*` 搭配 API 金鑰。

  </Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在像 OpenClaw 這類的外部工具/工作流程中使用訂閱 OAuth。
    入門流程可以為您執行 OAuth 流程。

    請參閱 [OAuth](/zh-Hant/concepts/oauth)、[Model providers](/zh-Hant/concepts/model-providers) 和 [Onboarding (CLI)](/zh-Hant/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **外掛程式驗證流程**，而不是 `openclaw.json` 中的用戶端 ID 或密鑰。

    步驟：

    1. 在本機安裝 Gemini CLI，以便 `gemini` 位於 `PATH` 上
       - Homebrew：`brew install gemini-cli`
       - npm：`npm install -g @google/gemini-cli`
    2. 啟用外掛程式：`openclaw plugins enable google`
    3. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登入後的預設模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳細資訊：[模型供應商](/zh-Hant/concepts/model-providers)。

  </Accordion>

<Accordion title="本機模型適合用於閒聊嗎？">通常不適合。OpenClaw 需要較大的上下文 + 強大的安全性；小顯卡會導致截斷和洩漏。如果必須使用，請在本地執行您能使用的 **最大** 模型版本 (LM Studio)，並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化模型會增加提示注入的風險 - 請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

<Accordion title="如何將託管模型流量保留在特定區域？">選擇區域鎖定的端點。OpenRouter 提供了 MiniMax、Kimi 和 GLM 的美國託管選項；選擇美國託管版本可將數據保留在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型一起列出，以便在遵守您選擇的區域供應商的同時保持備援可用。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（透過 WSL2 的 Windows）上執行。Mac mini 是可選的——有些人會買一台作為常時開啟的主機，但小型 VPS、家用伺服器或 Raspberry Pi 級別的盒子也可以運作。

    您只需要一臺 Mac **來使用僅限 macOS 的工具**。對於 iMessage，請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可在任何 Mac 上執行，而 Gateway 可以在 Linux 或其他地方執行。如果您需要其他僅限 macOS 的工具，請在 Mac 上執行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    您需要 **登入 Messages 的某個 macOS 裝置**。它**不**一定要是 Mac mini——任何 Mac 都可以。對於 iMessage，**請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)**（推薦）——BlueBubbles 伺服器在 macOS 上執行，而 Gateway 可以在 Linux 或其他地方執行。

    常見設定：

    - 在 Linux/VPS 上執行 Gateway，並在任何登入 Messages 的 Mac 上執行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請將所有內容都在 Mac 上執行。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、
    [Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為**節點**（伴隨裝置）連線。節點不執行 Gateway——它們提供螢幕/相機/畫布等額外功能以及該裝置上的 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上（常時開啟）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並配對到 Gateway。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以用 Bun 嗎？">
    **不建議**使用 Bun。我們發現執行時有錯誤，特別是在 WhatsApp 和 Telegram 上。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍想嘗試 Bun，請在非生產環境的閘道上進行，
    且不要用於 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中填什麼？">
    `channels.telegram.allowFrom` 是 **人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    Onboarding 接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

    更安全（無第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並讀取 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並讀取 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/zh-Hant/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以使用同一個 WhatsApp 號碼搭配不同的 OpenClaw 實例嗎？">
  可以，透過 **多代理程式路由**。將每個發送者的 WhatsApp **私訊**（peer `kind: "direct"`，發送者 E.164 如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都有自己的工作區和會話儲存。回覆仍來自 **同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）對每個 WhatsApp 帳號是全域的。參見 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和
  [WhatsApp](/zh-Hant/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行一個「快速聊天」代理和一個「用於編碼的 Opus」代理嗎？">可以。使用多代理路由：為每個代理指定其預設模型，然後將入站路由（提供者帳戶或特定對等節點）綁定到每個代理。範例配置位於 [多代理路由](/zh-Hant/concepts/multi-agent)。另請參閱 [模型](/zh-Hant/concepts/models) 和 [配置](/zh-Hant/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 能在 Linux 上運作嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前綴），以便 `brew`-安裝的工具在非登入 shell 中能被解析。
    最近的版本也會在 Linux systemd 服務中加入常見的使用者 bin 目錄（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），並在設定時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可駭 (git) 安裝與 npm 安裝之間的差異">
    - **可駭 (git) 安裝：** 完整的原始碼检出，可編輯，最適合貢獻者。
      您在本地執行建置並可以修補程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無 repo，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[快速入門](/zh-Hant/start/getting-started)、[更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="我可以稍後在 npm 和 git 安裝之間切換嗎？">
    可以。安裝另一個版本，然後執行 Doctor，以便閘道服務指向新的進入點。
    這**不會刪除您的資料**——它只會變更 OpenClaw 程式碼的安裝。您的狀態
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

    Doctor 會偵測到閘道服務進入點不匹配，並提議重寫服務設定以符合目前的安裝（在自動化中使用 `--repair`）。

    備份提示：請參閱 [備份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦或 VPS 上執行 Gateway 嗎？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您想要
    最低的摩擦力，且可以接受休眠/重新啟動，請在本機執行。

    **筆記型電腦（本機 Gateway）**

    - **優點：** 無伺服器成本，可直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 休眠/網路中斷 = 連線中斷，作業系統更新/重新啟動會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠在線，網路穩定，無筆記型電腦休眠問題，更容易保持運作。
    - **缺點：** 通常以無頭模式執行（使用螢幕擷圖），僅能遠端存取檔案，您必須使用 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都能正常運作。唯一真正的取捨是**無頭瀏覽器**與可見視窗的對比。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    **建議預設值：** 如果您之前有閘道中斷連線的問題，請使用 VPS。當您正在積極使用 Mac 並想要本機檔案存取或使用可見瀏覽器進行 UI 自動化時，本機執行非常棒。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必需，但為了**可靠性和隔離性建議使用**。

    - **專用主機 (VPS/Mac mini/Pi)：** 永遠在線，較少的睡眠/重新啟動中斷，更乾淨的權限，更容易保持運作。
    - **共用的筆記型電腦/桌面電腦：** 對於測試和主動使用完全沒問題，但預期在電腦睡眠或更新時會暫停。

    如果您想要兩全其美，請將 Gateway 保留在專用主機上，並將您的筆記型電腦作為本地螢幕/相機/exec 工具的**節點**進行配對。參見 [Nodes](/zh-Hant/nodes)。
    有關安全性指導，請參閱 [Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 需求和建議的作業系統是什麼？">
    OpenClaw 是輕量級的。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **建議：** 1-2 vCPU，2GB RAM 或更多以獲得餘裕 (日誌、媒體、多個頻道)。節點工具和瀏覽器自動化可能會消耗大量資源。

    作業系統：使用 **Ubuntu LTS** (或任何現代的 Debian/Ubuntu)。Linux 安裝路徑在那裡經過最充分的測試。

    文件：[Linux](/zh-Hant/platforms/linux)、[VPS hosting](/zh-Hant/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求是什麼？">
    可以。將 VM 視為與 VPS 相同：它需要永遠在線、可存取，並且擁有足夠的
    RAM 供 Gateway 和您啟用的任何頻道使用。

    基礎指導原則：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議：** 2GB RAM 或更多，如果您執行多個頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，並且具有最佳的工具
    相容性。參見 [Windows](/zh-Hant/platforms/windows)、[VPS hosting](/zh-Hant/vps)。
    如果您在 VM 中執行 macOS，請參見 [macOS VM](/zh-Hant/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什麼，用一段話概括？">
    OpenClaw 是一個運行在您自己設備上的個人 AI 助手。它在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及 QQ Bot 等捆綁的頻道外掛程式），並且可以在支援的平台上進行語音互動和即時 Canvas 操作。**Gateway** 是始終運行的控制平面；而助手則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的外殼」。它是一個**本地優先的控制平面**，允許您在**自己的硬體**上運行功能強大的助手，並能從您習慣使用的聊天應用程式中訪問，具有有狀態的會話、記憶和工具功能——而無需將您的工作流程控制權交給託管的 SaaS。

    重點亮點：

    - **您的設備，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）運行 Gateway，並將工作區 + 會話歷史保留在本地。
    - **真實頻道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支援的平台上的移動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並支援按代理程式路由和故障轉移。
    - **僅限本地選項：** 運行本地模型，因此如果您願意，**所有資料都可以保留在您的設備上**。
    - **多代理程式路由：** 按頻道、帳戶或任務分離代理程式，每個代理程式都有自己的工作區和預設值。
    - **開源且可駭：** 檢查、擴展和自託管，沒有廠商鎖定。

    文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
    [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="我剛設置好——首先應該做什麼？">
    適合入門的專案：

    - 建立網站（WordPress、Shopify 或簡單的靜態網站）。
    - 原型設計行動應用程式（大綱、畫面、API 計畫）。
    - 整理檔案和資料夾（清理、命名、標記）。
    - 連接 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將其分為幾個階段並使用子代理程式進行並行工作時，效果最佳。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常應用案例是什麼？">
    日常應用通常包括：

    - **個人簡報：** 收件匣、行事曆以及您關注的新聞摘要。
    - **研究與起草：** 快速研究、摘要，以及電子郵件或文件的初稿。
    - **提醒與跟進：** 由 cron 或心跳驅動的提醒與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集資料以及重複的網路工作。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中獲得結果。

  </Accordion>

  <Accordion title="OpenClaw 能否協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格？">
    在**研究、篩選和起草**方面可以。它可以掃描網站、建立清單、
    摘要潛在客戶，並撰寫外聯或廣告文案草稿。

    針對**外聯或廣告投放**，請保持人類參與。避免垃圾郵件，遵守當地法律與
    平台政策，並在寄出前審閱所有內容。最安全的模式是讓
    OpenClaw 起草，由您來審核。

    文件：[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code，在網頁開發方面有什麼優勢？">
    OpenClaw 是一個**個人助理**和協調層，並非 IDE 的替代品。請使用
    Claude Code 或 Codex 在儲存庫內進行最快速的直接編碼迴圈。當您需要持久記憶、
    跨裝置存取和工具編排時，請使用 OpenClaw。

    優勢：

    - **跨會話的持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具編排**（瀏覽器、檔案、排程、鉤子）
    - **始終運行的 Gateway**（在 VPS 上執行，從任何地方互動）
    - 用於本機瀏覽器/螢幕/相機/執行的 **Nodes**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不弄儲存庫的情況下自訂技能？">
    使用受管理的覆寫而不是編輯儲存庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md`（或透過 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中新增資料夾）。優先順序是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此受管理的覆寫仍然會勝過內建技能而無需變動 git。如果您需要將技能全域安裝但僅對某些代理可見，請將共享副本保留在 `~/.openclaw/skills` 並使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可見性。只有值得回饋上游的編輯才應存在於儲存庫中並作為 PR 送出。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增額外的目錄（優先順序最低）。預設的優先順序是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 在下一個會話中會將其視為 `<workspace>/skills`。如果該技能應僅對特定代理可見，請搭配使用 `agents.defaults.skills` 或 `agents.list[].skills`。
  </Accordion>

  <Accordion title="我如何針對不同的任務使用不同的模型？">
    目前支援的模式如下：

    - **Cron jobs (排程任務)**：獨立的任務可以針對每個任務設定 `model` 覆蓋值。
    - **子代理**：將任務路由到具有不同預設模型的獨立代理。
    - **隨需切換**：使用 `/model` 隨時切換目前的工作階段模型。

    請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[多代理路由 (Multi-Agent Routing)](/zh-Hant/concepts/multi-agent) 和 [斜線指令 (Slash commands)](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在進行繁重工作時會當機。我該如何將工作卸載？">
    請對耗時或並行任務使用 **子代理**。子代理在自己的工作階段中運行，
    會傳回摘要，並保持您的主要聊天回應順暢。

    請要求您的機器人「為此任務產生子代理」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看閘道目前正在做什麼 (以及它是否忙碌)。

    Token 提示：長時間任務和子代理都會消耗 Token。如果您擔心成本，請透過 `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

    文件：[子代理](/zh-Hant/tools/subagents)、[背景任務](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的綁定執行緒子代理階段是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或階段目標，以便該執行緒中的後續訊息保留在該綁定的階段上。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 生成（並可選擇 `mode: "session"` 以進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要設定：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[子代理](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[設定參考](/zh-Hant/gateway/configuration-reference)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新去了錯誤的地方或從未發布。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式下的子代理傳遞會優先使用任何已綁定的執行緒或對話路由（如果存在的話）。
    - 如果完成來源僅包含頻道，OpenClaw 會退回到請求者會話的儲存路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳遞仍能成功。
    - 如果既沒有綁定路由也沒有可用的儲存路由，直接傳遞可能會失敗，結果會退回到排隊的會話傳遞，而不是立即發布到聊天。
    - 無效或過時的目標仍可能強制進行佇列退回或最終傳遞失敗。
    - 如果子代理的最後一個可見助手回覆是精確的靜默令牌 `NO_REPLY` / `no_reply`，或者是 `ANNOUNCE_SKIP`，OpenClaw 會故意抑制公告，而不是發布過時的早期進度。
    - 如果子代理在僅進行工具呼叫後超時，公告可以將其折疊為一個簡短的局部進度摘要，而不是重播原始工具輸出。

    除錯：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[子代理](/zh-Hant/tools/subagents)、[背景任務](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我應該檢查什麼？">
    Cron 在 Gateway 進程內運行。如果 Gateway 未持續運行，
    排程的工作將不會運行。

    檢查清單：

    - 確認 cron 已啟用（`cron.enabled`）且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運行（無睡眠/重啟）。
    - 驗證工作的時區設定（`--tz` 與主機時區的對比）。

    除錯：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron 工作](/zh-Hant/automation/cron-jobs)、[自動化與任務](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有訊息傳送到頻道。為什麼？">
    請先檢查傳送模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期會有外部訊息。
    - 缺少或無效的發佈目標（`channel` / `to`）表示 runner 略過了對外傳送。
    - 頻道驗證失敗（`unauthorized`，`Forbidden`）表示 runner 嘗試傳送，但憑證阻擋了它。
    - 靜默的隔離結果（僅 `NO_REPLY` / `no_reply`）被視為故意不傳送，因此 runner 也會抑制排入佇列的後備傳送。

    對於隔離的 cron 工作，runner 擁有最終傳送權。Agent 應該
    傳回純文字摘要供 runner 傳送。`--no-deliver` 會將
    該結果保留在內部；它不會讓 agent 改用
    訊息工具直接傳送。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而非重複排程。

    隔離的 cron 可以保存執行時期的模型移交，並在作用中
    執行拋出 `LiveSessionModelSwitchError` 時重試。重試會保留切換後的
    提供者/模型，且如果切換帶有新的設定檔覆寫，cron
    也會在重試前將其保存下來。

    相關選取規則：

    - Gmail hook 模型覆寫在適用時優先。
    - 接著是各工作的 `model`。
    - 接著是任何已儲存的 cron 會話模型覆寫。
    - 接著是一般的 agent/預設模型選取。

    重試迴圈是有界的。在初始嘗試加上 2 次切換重試後，
    cron 會中止，而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝技能？">
    使用原生 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上不可用。
    在 [https://clawhub.ai](https://clawhub.ai) 瀏覽技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 會寫入到現用工作區 `skills/`
    目錄。僅當您想要發佈或
    同步您自己的技能時，才安裝獨立的 `clawhub` CLI。若要跨代理程式共用安裝，請將技能放在
    `~/.openclaw/skills` 下，並在您想要限制哪些代理程式可以看見它時使用 `agents.defaults.skills` 或
    `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以排程執行任務或在背景連續執行嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重新啟動後仍然保留）。
    - **Heartbeat** 用於「主工作階段」定期檢查。
    - **Isolated jobs** 用於發佈摘要或傳遞至聊天室的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation & Tasks](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅限 Apple macOS 的技能嗎？">
    不能直接執行。macOS 技能受到 `metadata.openclaw.os` 以及所需二元檔的閘控限制，而且只有在 **Gateway 主機**上符合資格時，這些技能才會出現在系統提示中。在 Linux 上，除非您覆寫閘控設定，否則 `darwin` 專屬技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二元檔的地方執行 Gateway，然後從 Linux 以 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或透過 Tailscale 進行連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在所需的二元檔時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示中批准「Always Allow」會將該指令新增到允許清單中。

    **選項 C - 透過 SSH 代理 macOS 二元檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓所需的 CLI 二元檔解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二元檔建立一個 SSH 包裝程式（例如 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放置在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
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

    可行方案：

    - **自訂技能 / 外掛：** 最適合穩定的 API 存取（Notion/HeyGen 均有 API）。
    - **瀏覽器自動化：** 無需編碼即可運作，但速度較慢且較不穩定。

    如果你希望為每個客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理在會話開始時取得該頁面。

    如果你想要原生的整合功能，請開啟功能請求或建構針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會置於現用工作區的 `skills/` 目錄中。若要跨代理共用技能，請將其置於 `~/.openclaw/skills/<name>/SKILL.md`。如果只有部分代理應該看到共用安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能預期會透過 Homebrew 安裝二進位檔；在 Linux 上這意味著 Linuxbrew（請參閱上方的 Homebrew Linux 常見問題條目）。請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/tools/clawhub)。

  </Accordion>

  <Accordion title="如何將我現有已登入的 Chrome 與 OpenClaw 搭配使用？">
    使用內建的 `user` 瀏覽器設定檔，其透過 Chrome DevTools MCP 連結：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑為主機本機。如果 Gateway 在其他地方執行，請在瀏覽器機器上執行節點主機，或是改用遠端 CDP。

    目前對 `existing-session` / `user` 的限制：

    - 動作是由 ref 驅動，而非由 CSS 選擇器驅動
    - 上傳需要 `ref` / `inputRef` 且目前一次僅支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍然需要受控瀏覽器或原始 CDP 設定檔

  </Accordion>
</AccordionGroup>

## 沙盒機制與記憶體

<AccordionGroup>
  <Accordion title="有沒有專門的沙盒文件？">
    有的。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。針對 Docker 特定設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限 - 如何啟用完整功能？">
    預設映像檔以安全為先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 保存 `/home/node`，讓快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依性建置至映像檔中。
    - 透過內建 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已持久化。

    文件：[Docker](/zh-Hant/install/docker), [Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我能否保持 DM 私人，但讓群組公開/使用一個代理程式進行沙盒化？">
    可以 - 如果您的私人流量是 **DM** 而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道階段作業（非主要金鑰）在 Docker 中執行，而主要 DM 階段作業則保持在主機上。然後透過 `tools.sandbox.tools` 限制沙盒階段作業中可用的工具。

    設定逐步指南 + 範例設定：[Groups: personal DMs + public groups](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定參考：[Gateway configuration](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定到沙箱中？">
    將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]` (例如 `"/home/user/src:/src:ro"`)。全域 + 個別代理的綁定會合併；當 `scope: "shared"` 時，會忽略個別代理的綁定。請針對任何敏感性內容使用 `:ro`，並記得綁定會繞過沙箱檔案系統的隔離牆。

    OpenClaw 會透過最深層的現有祖先解析路徑，對照正規化路徑和規範路徑來驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父目錄逃逸仍會失敗並保持關閉，且在解析符號連結後仍會套用允許的根目錄檢查。

    請參閱 [沙箱機制](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs 工具原則 vs 提權](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全注意事項。

  </Accordion>

  <Accordion title="記憶體是如何運作的？">
    OpenClaw 的記憶體只是代理工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的精選長期筆記 (僅限主要/私人工作階段)

    OpenClaw 也會執行 **靜默預壓縮記憶體清除 (silent pre-compaction memory flush)**，以提醒模型在自動壓縮之前寫入持久化的筆記。這僅在工作區可寫入時執行 (唯讀沙箱會跳過此步驟)。請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體一直忘記事情。我該如何讓它記住？">
    請要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md`，
    短期語境則放在 `memory/YYYY-MM-DD.md` 中。

    這仍然是我們正在改進的領域。提醒模型儲存記憶會有幫助；它會知道該怎麼做。如果它持續忘記，請驗證 Gateway 是否在每次執行時都使用相同的工作區。

    文件：[記憶體](/zh-Hant/concepts/memory)、[代理工作區](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶體會永久保存嗎？限制是什麼？">
    記憶體檔案儲存在磁碟上，並會一直保存直到您將其刪除。其限制取決於您的
    儲存空間，而非模型本身。由於**會話上下文**仍然受制於模型的
    上下文視窗，因此長對話可能會被壓縮或截斷。這正是
    記憶體搜索存在的意義——它僅將相關部分拉回上下文中。

    文件：[記憶體](/zh-Hant/concepts/memory)、[上下文](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶體搜索需要 OpenAI API 金鑰嗎？">
    只有在使用 **OpenAI 嵌入**時才需要。Codex OAuth 涵蓋了聊天/完成功能，
    但**並未**授予嵌入存取權限，因此**登入 Codex (OAuth 或
    Codex CLI 登入)** 對語意記憶體搜索沒有幫助。OpenAI 嵌入
    仍然需要真正的 API 金鑰 (`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`)。

    如果您未明確設定提供者，當 OpenClaw 能夠解析 API 金鑰時，會自動選擇一個提供者
    (身分設定檔、`models.providers.*.apiKey` 或環境變數)。
    如果解析到 OpenAI 金鑰，它會優先選擇 OpenAI；其次是解析到 Gemini 金鑰時選擇 Gemini，
    接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶體
    搜索將保持停用狀態，直到您進行設定。如果您已設定並存在本地模型路徑，OpenClaw
    會優先選擇 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持本地化，請設定 `memorySearch.provider = "local"` (並可選擇性地
    設定 `memorySearch.fallback = "none"`)。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY` (或
    `memorySearch.remote.apiKey`)。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** 嵌入
    模型 —— 詳細設定資訊請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 磁碟上的檔案位置

<AccordionGroup>
  <Accordion title="與 OpenClaw 一起使用的所有資料都會儲存在本機嗎？">
    不會 —— **OpenClaw 的狀態是本機的**，但 **外部服務仍然可以看到您發送給它們的內容**。

    - **預設為本機：** 會話、記憶體檔案、配置和工作區位於 Gateway 主機
      (`~/.openclaw` + 您的工作區目錄) 上。
    - **出於必要為遠端：** 您發送給模型提供商 (Anthropic/OpenAI/等) 的訊息會傳送到
      它們的 API，而聊天平台 (WhatsApp/Telegram/Slack/等) 則會在其
      伺服器上儲存訊息資料。
    - **您可以控制足跡：** 使用本機模型可以將提示保留在您的機器上，但頻道
      流量仍會通過該頻道的伺服器。

    相關：[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將其資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設值：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要設定 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到 auth profiles）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 認證設定檔（OAuth、API 金鑰和選用的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 選用的檔案支援秘密酬載，用於 `file` SecretRef 提供者 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 會話元資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行設定（預設值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace**（代理工作區）中，而不是 `~/.openclaw` 中。

    - **工作區（每個代理）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`（或當缺少 `MEMORY.md` 時的舊版回退 `memory.md`）、
      `memory/YYYY-MM-DD.md`、可選的 `HEARTBEAT.md`。
    - **狀態目錄（`~/.openclaw`）**：配置、通道/提供者狀態、認證配置文件、會話、日誌、
      以及共享技能（`~/.openclaw/skills`）。

    預設工作區是 `~/.openclaw/workspace`，可透過以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重啟後「忘記」了內容，請確認 Gateway 在每次啟動時都使用相同的
    工作區（請記住：遠端模式使用的是 **gateway host 的**
    工作區，而不是您的本地筆記型電腦）。

    提示：如果您希望保留某種行為或偏好設定，請要求機器人 **將其寫入**
    AGENTS.md 或 MEMORY.md，而不是依賴聊天記錄。

    參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放在一個 **私人** git 儲存庫中，並將其備份到某個
    私密位置（例如 GitHub 私有儲存庫）。這會捕捉記憶體 + AGENTS/SOUL/USER
    檔案，並允許您稍後還原助理的「大腦」。

    **切勿** 提交 `~/.openclaw` 下的任何內容（憑證、會話、權杖或加密的秘密負載）。
    如果您需要完整還原，請分別備份工作區和狀態目錄
    （請參閱上面的遷移問題）。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理程式可以在工作區之外運作嗎？">
    可以。工作區是**預設的 cwd（目前工作目錄）**和記憶錨點，而不是嚴格的沙箱。
    相對路徑在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或針對每個代理程式的沙箱設定。如果您
    希望某個存儲庫成為預設的工作目錄，請將該代理程式的
    `workspace` 指向該存儲庫的根目錄。OpenClaw 存儲庫只是原始碼；請將
    工作區分開，除非您有意讓代理程式在其中運作。

    範例（將存儲庫作為預設 cwd）：

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

  <Accordion title="遠端模式：Session 儲存在哪裡？">
    Session 狀態由**閘道主機**擁有。如果您處於遠端模式，您關心的 session 儲存是在遠端機器上，而不是您的本地筆電。請參閱 [Session 管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？在哪裡？">
    OpenClaw 從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用安全性的預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，現在沒有任何東西在監聽 / UI 顯示未授權'>
    非迴圈綁定 **需要有效的閘道驗證路徑**。實務上這意味著：

    - 共用密鑰驗證：token 或密碼
    - 位於正確設定的非迴圈身分感知反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    - `gateway.remote.token` / `.password` **不會**單獨啟用本機閘道驗證。
    - 本機呼叫路徑僅在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後備。
    - 若要使用密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但無法解析，解析將會失敗封閉 (沒有遠端後備遮罩)。
    - 共用密鑰控制 UI 設定透過 `connect.params.auth.token` 或 `connect.params.auth.password` (儲存在 app/UI 設定中) 進行驗證。承載身分的模式，例如 Tailscale Serve 或 `trusted-proxy`，則改用請求標頭。請避免將共用密鑰放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機的迴圈反向代理仍然 **不會** 滿足受信任代理驗證。受信任的代理必須是已設定的非迴圈來源。

  </Accordion>

  <Accordion title="為什麼我現在在本機連線也需要一個 token？">
    OpenClaw 預設會強制執行 Gateway 驗證，包括回環位址 (loopback)。在一般的預設路徑中，這意味著 token 驗證：如果未設定明確的驗證路徑，Gateway 啟動時會解析為 token 模式並自動生成一個，將其儲存至 `gateway.auth.token`，因此 **本機 WebSocket 用戶端必須進行驗證**。這能阻止其他本機程序呼叫 Gateway。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，對於非回環且具備身分識別的反向代理，使用 `trusted-proxy`）。如果您 **真的** 想要開放回環連線，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 隨時可以為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    Gateway 會監看設定檔並支援熱重新載入 (hot-reload)：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，針對關鍵變更則重新啟動
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

    - `off`：隱藏標語文字，但保留標題橫幅標題/版本列。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪播有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路獲取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 取決於您選擇的
    提供者：

    - 依賴 API 的提供者（例如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily）需要其一般的 API 金鑰設定。
    - Ollama Web Search 是免金鑰的，但它使用您設定的 Ollama 主機並且需要 `ollama signin`。
    - DuckDuckGo 是免金鑰的，但它是一個非官方的基於 HTML 的整合功能。
    - SearXNG 是免金鑰/自託管的；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
    環境變數替代方案：

    - Brave：`BRAVE_API_KEY`
    - Exa：`EXA_API_KEY`
    - Firecrawl：`FIRECRAWL_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG：`SEARXNG_BASE_URL`
    - Tavily：`TAVILY_API_KEY`

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
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    提供者特定的網路搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 下。
    舊版 `tools.web.search.*` 提供者路徑為了相容性暫時仍會載入，但新設定不應再使用它們。
    Firecrawl 的網路獲取備援設定位於 `plugins.entries.firecrawl.config.webFetch.*` 下。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會根據可用的認證資訊自動偵測第一個就緒的獲取備援提供者。目前內建的提供者是 Firecrawl。
    - Daemon 會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[網路工具](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的設定。我該如何恢復並避免這種情況？">
    `config.apply` 會取代**整個設定**。如果您發送部分物件，其他所有內容
    都會被移除。

    恢復：

    - 從備份還原（git 或複製的 `~/.openclaw/openclaw.json`）。
    - 如果沒有備份，請重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果這是意料之外的情況，請回報錯誤並附上您最後的已知設定或任何備份。
    - 本地編碼代理程式通常可以從日誌或歷史記錄重建可用的設定。

    避免發生：

    - 使用 `openclaw config set` 進行小幅度變更。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層綱要節點以及用於深入探查的直接子摘要。
    - 使用 `config.patch` 進行部分 RPC 編輯；僅將 `config.apply` 用於完整設定取代。
    - 如果您在代理程式執行期間使用�限擁有者的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在跨設備的專用工作程式上運行中央 Gateway？">
    常見的模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **節點** 和 **代理程式**：

    - **Gateway（中央）：** 擁有頻道（Signal/WhatsApp）、路由和工作階段。
    - **Nodes（設備）：** Mac/iOS/Android 作為外設連接並公開本機工具（`system.run`、`canvas`、`camera`）。
    - **Agents（工作程式）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner 運維」、「個人資料」）。
    - **Sub-agents：** 當您需要並行處理時，從主代理程式產生背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

    文件：[Nodes](/zh-Hant/nodes)、[Remote access](/zh-Hant/gateway/remote)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以以無頭模式運行嗎？">
    可以。這是一個配置選項：

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

    預設為 `false`（有頭模式）。無頭模式更容易在某些網站上觸發反機器人檢查。請參閱 [Browser](/zh-Hant/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、爬蟲、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果需要視覺效果，請使用螢幕截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常封鎖無頭工作階段。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），然後重新啟動 Gateway。
    請參閱 [Browser](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## Remote gateways and nodes

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、閘道和節點之間傳播？">
    Telegram 訊息由 **閘道 (gateway)** 處理。閘道執行代理程式 (agent)，並且僅在需要節點工具時透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到來自提供者的入站流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 是遠端託管的，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在隨時在線的主機 (VPS/家庭伺服器) 上運行 Gateway。
    2. 將 Gateway 主機和您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可訪問（tailnet 綁定或 SSH 隧道）。
    4. 在本地打開 macOS 應用程式，並以 **Remote over SSH** 模式（或直接透過 tailnet）進行連接，以便註冊為節點。
    5. 在 Gateway 上批准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接；節點透過 Gateway WebSocket 進行連接。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅配對您信任的設備，並參閱 [安全性](/zh-Hant/gateway/security)。

    文件：[節點](/zh-Hant/nodes)、[Gateway 協定](/zh-Hant/gateway/protocol)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)、[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回覆。現在該怎麼辦？">
    檢查基本事項：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證身分驗證與路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 通道連線，請確認本機通道已啟動並指向正確的連接埠。
    - 確認您的允許清單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本地 + VPS）？">
    可以。沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式進行連接：

    **最簡單：**使用兩個機器人都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像平常一樣回覆。

    **CLI 橋接器（通用）：**執行一個腳本，使用 `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，目標設為另一個機器人監聽的聊天室。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway（請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可以連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護機制，以免兩個機器人無限迴圈（僅限提及、頻道允許清單，或「不要回覆機器人訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="我是否需要為多個代理設置獨立的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理擁有獨立的工作空間、模型預設值
    和路由。這是標準設置，比為每個代理運行一個 VPS 更便宜、更簡單。

    僅當您需要嚴格隔離（安全邊界）或您不想共享差異非常大的配置時，才使用單獨的 VPS。否則，請保留一個 Gateway
    並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與其從 VPS 使用 SSH，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    有的——節點是從遠端 Gateway 連接到筆記型電腦的首選方式，
    它們提供的功能不僅限於 Shell 存取。Gateway 運行於 macOS/Linux（Windows 透過 WSL2）且體積輕巧
    （小型 VPS 或 Raspberry Pi 級別的設備即可；4 GB RAM 綽綽有餘），因此常見的
    設置是一個永遠在線的主機加上您的筆記型電腦作為節點。

    - **無需傳入 SSH。** 節點向外連接到 Gateway WebSocket 並使用設備配對。
    - **更安全的執行控制。** `system.run` 受到該筆記型電腦上的節點允許列表/審批限制。
    - **更多設備工具。** 除了 `system.run` 之外，節點還公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 連接到主機上的本機 Chrome。

    SSH 適合臨時的 Shell 存取，但對於持續的代理工作流程和
    設備自動化來說，節點更簡單。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您故意執行隔離的設定檔（請參閱[多重閘道](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行**一個閘道**。節點是連接到
    閘道的周邊裝置（iOS/Android 節點，或功能表列應用程式中的 macOS「節點模式」）。對於無介面節點
    主機和 CLI 控制，請參閱[節點主機 CLI](/zh-Hant/cli/node)。

    變更 `gateway`、`discovery` 和 `canvasHost` 需要完全重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式可套用設定？">
    有的。

    - `config.schema.lookup`：在寫入前檢查一個設定子樹，包含其淺層綱要節點、相符的 UI 提示以及直接子項摘要
    - `config.get`：取得目前的快照 + 雜湊值
    - `config.patch`：安全的部分更新（大多數 RPC 編輯的首選）；盡可能熱載入，必要時重新啟動
    - `config.apply`：驗證並取代完整設定；盡可能熱載入，必要時重新啟動
    - 僅限擁有者使用的 `gateway` 執行階段工具仍然拒絕重寫 `tools.exec.ask` / `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

  </Accordion>

  <Accordion title="首次安裝的最低合理設定">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這會設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="我該如何在 VPS 上設置 Tailscale 並從我的 Mac 連接？">
    最基本步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理主控台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想要在不使用 SSH 的情況下使用控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將閘道綁定到 loopback 並透過 Tailscale公開 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="我該如何將 Mac 節點連線到遠端閘道 (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點會透過相同的 Gateway WS 端點進行連線。

    建議設定：

    1. **確保 VPS + Mac 位於同一個 tailnet 上**。
    2. **在遠端 模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會對閘道連接埠進行通道傳輸並以節點身分連線。
    3. **在閘道上核准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/zh-Hant/gateway/protocol)、[Discovery](/zh-Hant/gateway/discovery)、[macOS remote mode](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是直接新增節點？">
    如果您只需要在第二台筆記型電腦上使用 **本機工具**（畫面/相機/exec），請將其新增為
    **節點**。這樣可以維持單一閘道並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計畫將其擴展至其他作業系統。

    只有在您需要 **嚴格隔離** 或兩個完全分離的機器人時，才安裝第二個閘道。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 當前工作目錄中的 `.env`
    - 來自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局後備 `.env`

    兩個 `.env` 檔案都不會覆蓋現有的環境變數。

    您也可以在配置中定義內聯環境變數（僅在進程環境中缺失時應用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    查閱 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但我的環境變數消失了。該怎麼辦？">
    兩種常見的修復方法：

    1. 將缺失的金鑰放入 `~/.openclaw/.env`，這樣即使服務未繼承您的 shell 環境，也能讀取這些金鑰。
    2. 啟用 shell 匯入（選擇加入的便利功能）：

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

    這會執行您的登入 shell 並僅匯入缺失的預期金鑰（從不覆蓋）。等效的環境變數：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off。」為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**。「Shell env: off」
    **並不**表示您的環境變數遺失了——這只是表示 OpenClaw 不會自動
    載入您的登入 shell。

    如果 Gateway 作為服務運行（launchd/systemd），它將不會繼承您的 shell
    環境。請執行以下其中一項操作來修正：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其加入到您的設定 `env` 區塊中（僅在缺失時適用）。

    然後重新啟動 gateway 並再次檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（也有 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 和 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## 工作階段與多重聊天

<AccordionGroup>
  <Accordion title="我該如何開始一個新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [工作階段管理](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，工作階段會自動重設嗎？">
    工作階段可以在 `session.idleMinutes` 後過期，但這是 **預設停用** 的（預設為 **0**）。
    將其設定為正數值以啟用閒置過期。啟用後，閒置期間後的 **下一則**
    訊息會為該聊天金鑰啟動一個新的工作階段 ID。
    這不會刪除對話紀錄——它只是開始一個新的工作階段。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法建立一個 OpenClaw 實例團隊（一個 CEO 和多個 agents）？">
    可以的，透過 **multi-agent routing** 和 **sub-agents**。您可以建立一個協調器
    agent 和幾個具有自己工作區和模型的工作 agent。

    不過說實話，這最好被視為一個 **有趣的實驗**。這非常消耗 token，而且通常
    比使用一個帶有不同會話的 bot 效率更低。我們設想的典型模式是您與一個 bot 對話，
    並使用不同的會話進行並行工作。該 bot 也可以在需要時生成 sub-agents。

    文件：[Multi-agent routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[Agents CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文在任務中途被截斷了？我該如何預防？">
    Session context 受到模型視窗的限制。長對話、大型工具輸出或許多
    檔案都可能觸發壓縮或截斷。

    以下方法有幫助：

    - 要求 bot 總結當前狀態並將其寫入檔案。
    - 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保存在工作區中，並要求 bot 讀回來。
    - 對於漫長或並行的工作使用 sub-agents，以便主對話保持較小。
    - 如果這種情況經常發生，請選擇一個具有更大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保持已安裝狀態？">
    使用 reset 指令：

    ```bash
    openclaw reset
    ```

    非互動式完全重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然後重新執行設定：

    ```bash
    openclaw onboard --install-daemon
    ```

    註記：

    - 如果 Onboarding 發現現有設定，也會提供 **Reset** 選項。請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了 profiles (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset` （僅限開發；清除開發設定 + 憑證 + 會話 + 工作區）。

  </Accordion>

  <Accordion title='我遇到「context too large」錯誤 - 如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮**（保留對話但總結較早的輪次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置**（為相同的聊天金鑰建立全新的 session ID）：

      ```
      /new
      /reset
      ```

    如果持續發生此情況：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有更大上下文視窗的模型。

    文件：[壓縮](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session 管理](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個提供者驗證錯誤：模型發出了一個 `tool_use` 區塊但缺少必需的
    `input`。這通常意味著 session 歷史記錄已過時或損壞（常發生在長對話串
    或工具/架構變更之後）。

    解決方法：使用 `/new` 啟動一個新的 session（獨立訊息）。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30 分鐘** 執行一次（使用 OAuth 認證時為 **1 小時**）。調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實質上是空的（只有空行和 markdown
    標題，例如 `# Heading`），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行，並由模型決定要做什麼。

    針對單一代理程式的覆蓋設定使用 `agents.list[].heartbeat`。文件：[心跳](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」加入 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被阻擋，直到您允許發送者 (`groupPolicy: "allowlist"`)。

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

  <Accordion title="如何獲取 WhatsApp 群組的 JID？">
    選項 1（最快）：追蹤日誌並在群組中發送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已配置/允許）：從配置中列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但未配置 `"*"`，且該群組未被列入白名單。

    請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/主題是否與 DM 共享上下文？">直接聊天預設會折疊到主會話。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒是獨立的會話。請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。幾十個（甚至幾百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會話 + 轉錄檔儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理程式越多表示同時使用的模型越多。
    - **營運開銷：** 每個代理程式的認證設定檔、工作區和通道路由。

    建議：

    - 每個代理程式保持一個 **作用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增長，請修剪舊的會話（刪除 JSONL 或儲存項目）。
    - 使用 `openclaw doctor` 來找出遺留的工作區和設定檔不匹配。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天 (Slack) 嗎？該如何設定？">
    可以。使用 **Multi-Agent Routing** 來執行多個獨立的代理程式，並透過
    通道/帳號/節點路由傳入訊息。Slack 支援作為通道，並可以綁定到特定的代理程式。

    瀏覽器存取功能強大，但並非「能做人類能做的任何事」——反機器人驗證、CAPTCHA 和 MFA
    仍然可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 永遠上線的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個代理程式 (bindings)。
    - 綁定到這些代理程式的 Slack 通道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [Browser](/zh-Hant/tools/browser)、[Nodes](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定為的內容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用為 `provider/model`（範例：`openai/gpt-5.4`）。如果您省略提供者，OpenClaw 首先會嘗試別名，然後是該確切模型 ID 的唯一已設定提供者匹配，只有在那之後才會回退到已設定的預設提供者，作為已棄用的相容性路徑。如果該提供者不再公開已設定的預設模型，OpenClaw 會回退到第一個已設定的提供者/模型，而不是顯示過時的已移除提供者預設值。您仍應**明確地**設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪種模型？">
    **推薦預設值：** 使用您的提供者堆疊中可用的最強大最新一代模型。
    **對於啟用工具或不受信任輸入的代理程式：** 優先考慮模型強度而非成本。
    **對於常規/低風險聊天：** 使用較便宜的備用模型並根據代理程式角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
    [本機模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**能負擔得起的最好模型**，並對於常規聊天或摘要使用較便宜的模型。您可以根據代理程式路由模型，並使用子代理程式來

並行化長任務（每個子代理程式都會消耗 Token）。請參閱 [模型](/zh-Hant/concepts/models) 和
[子代理程式](/zh-Hant/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **model** 欄位。避免完全替換設定。

    安全的選項：

    - `/model` 在聊天中（快速，僅限當前會話）
    - `openclaw models set ...`（僅更新模型設定）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個設定，否則請避免使用部分物件進行 `config.apply`。
    對於 RPC 編輯，請先使用 `config.schema.lookup` 檢查，並優先使用 `config.patch`。Lookup 載荷會提供正規化路徑、淺層架構文件/限制以及直接子摘要。
    用於部分更新。
    如果您確實覆寫了設定，請從備份還原或重新執行 `openclaw doctor` 來修復。

    文件：[模型](/zh-Hant/concepts/models)、[設定](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管模型（llama.cpp、vLLM、Ollama）嗎？">
    可以。Ollama 是本地模型最簡單的路徑。

    最快設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 下載一個本地模型，例如 `ollama pull gemma4`
    3. 如果您也想要雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    註記：

    - `Cloud + Local` 提供雲端模型以及您的本地 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 的雲端模型不需要本地下載
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性註記：較小或高度量化的模型更容易受到提示詞注入的影響。對於任何可以使用工具的機器人，我們強烈建議使用**大型模型**。如果您仍想使用小型模型，請啟用沙盒和嚴格的工具允許清單。

    文件：[Ollama](/zh-Hant/providers/ollama)、[本地模型](/zh-Hant/gateway/local-models)、
    [模型提供者](/zh-Hant/concepts/model-providers)、[安全性](/zh-Hant/gateway/security)、
    [沙盒](/zh-Hant/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">- 這些部署可能會有所不同，且可能會隨時間變更；沒有固定的提供者建議。 - 使用 `openclaw models status` 檢查每個閘道上的當前執行時設定。 - 對於安全性敏感或啟用工具的代理程式，請使用可用的最強大最新世代模型。</Accordion>

  <Accordion title="How do I switch models on the fly (without restarting)?">
    Use the `/model` command as a standalone message:

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    這些是內建的別名。可以透過 `agents.defaults.models` 新增自訂別名。

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用的模型。

    `/model`（以及 `/model list`）會顯示一個簡潔的帶號碼選擇器。透過數字選擇：

    ```
    /model 3
    ```

    您也可以強制為供應商指定特定的認證設定檔（每個工作階段）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前作用中的代理程式、正在使用的 `auth-profiles.json` 檔案，以及接下來將嘗試使用哪個認證設定檔。
    它也會在可用時顯示已設定的供應商端點 (`baseUrl`) 和 API 模式 (`api`)。

    **如何取消透過 @profile 設定的設定檔？**

    重新執行 `/model`，但**不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想回到預設值，請從 `/model` 中選擇它（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前作用的認證設定檔。

  </Accordion>

  <Accordion title="Can I use GPT 5.2 for daily tasks and Codex 5.3 for coding?">
    可以。將其中一個設為預設值，並根據需要切換：

    - **快速切換（每個工作階段）：** `/model gpt-5.4` 用於日常任務，`/model openai-codex/gpt-5.4` 用於透過 Codex OAuth 進行編碼。
    - **預設值 + 切換：** 將 `agents.defaults.model.primary` 設定為 `openai/gpt-5.4`，然後在編碼時切換到 `openai-codex/gpt-5.4`（或反之亦然）。
    - **子代理程式：** 將編碼任務路由到具有不同預設模型的子代理程式。

    參閱 [模型](/zh-Hant/concepts/models) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我如何為 GPT 5.4 配置快速模式？">
    使用會話切換或配置預設值皆可：

    - **每次會話：** 當會話使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 時，發送 `/fast on`。
    - **每個模型預設：** 將 `agents.defaults.models["openai/gpt-5.4"].params.fastMode` 設定為 `true`。
    - **Codex OAuth 也適用：** 如果您也使用 `openai-codex/gpt-5.4`，請在那裡設定相同的標記。

    範例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
            "openai-codex/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    對於 OpenAI，快速模式會在支援的原生 Responses 請求中對應到 `service_tier = "priority"`。會話 `/fast` 會覆寫配置預設值。

    參閱 [思考與快速模式](/zh-Hant/tools/thinking) 和 [OpenAI 快速模式](/zh-Hant/providers/openai#openai-fast-mode)。

  </Accordion>

  <Accordion title='為什麼我會看到 "Model ... is not allowed" 然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它將成為 `/model` 和任何
    會話覆寫值的 **允許清單**。選擇不在該清單中的模型會傳回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會被傳回，**取代**正常的回覆。解決方法：將模型加入
    `agents.defaults.models`，移除允許清單，或從 `/model list` 中挑選一個模型。

  </Accordion>

  <Accordion title='為什麼我會看到 "Unknown model: minimax/MiniMax-M2.7"？'>
    這表示 **未設定提供者**（找不到 MiniMax 提供者設定或驗證設定檔），因此無法解析模型。

    修復檢查清單：

    1. 升級至目前的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動閘道。
    2. 確認已設定 MiniMax（精靈或 JSON），或 env/auth 設定檔中存在 MiniMax 驗證資訊，以便注入相符的提供者
       （`MINIMAX_API_KEY` 用於 `minimax`、`MINIMAX_OAUTH_TOKEN` 或儲存的 MiniMax
       OAuth 用於 `minimax-portal`）。
    3. 針對您的驗證路徑使用確切的模型 ID（區分大小寫）：
       `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed` 用於 API 金鑰
       設定，或 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` 用於 OAuth 設定。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選取（或在聊天中使用 `/model list`）。

    參閱 [MiniMax](/zh-Hant/providers/minimax) 和 [Models](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 設為預設，並在複雜任務中使用 OpenAI 嗎？">
    可以。將 **MiniMax 設為預設**，並在需要時**依工作階段切換**模型。
    降級機制是針對**錯誤**，而非「困難任務」，因此請使用 `/model` 或個別的代理程式。

    **選項 A：依工作階段切換**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.4": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然後：

    ```
    /model gpt
    ```

    **選項 B：分開的代理程式**

    - 代理程式 A 預設：MiniMax
    - 代理程式 B 預設：OpenAI
    - 依代理程式路由或使用 `/agent` 進行切換

    文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建快捷鍵嗎？">
    是的。OpenClaw 附帶一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時才會套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了同名的別名，您的值會優先套用。

  </Accordion>

  <Accordion title="如何定義/覆寫模型快捷鍵（別名）？">
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

    然後 `/model sonnet`（或在支援的情況下為 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何新增來自其他提供商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter (pay-per-token; many models):

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

    Z.AI (GLM models):

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

    如果您參照了某個提供商/模型，但缺少所需的提供商金鑰，您將會收到執行階段驗證錯誤（例如 `No API key found for provider "zai"`）。

    **No API key found for provider after adding a new agent**

    這通常表示 **新代理程式** 具有空白的驗證儲存。驗證是每個代理程式獨立的，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修正選項：

    - 執行 `openclaw agents add <id>` 並在精靈設定期間配置驗證。
    - 或將主代理程式的 `agentDir` 中的 `auth-profiles.json` 複製到新代理程式的 `agentDir` 中。

    請勿跨代理程式重複使用 `agentDir`；這會導致驗證/會衝突。

  </Accordion>
</AccordionGroup>

## 模型故障轉移與 "所有模型皆失敗"

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移分為兩個階段：

    1. 同一供應商內的 **Auth profile rotation**。
    2. **Model fallback** 到 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間適用於失敗的 profile（指數退避），因此即使當供應商受到速率限制或暫時故障時，OpenClaw 也能保持回應。

    速率限制桶包含的內容不僅僅是普通的 `429` 回應。OpenClaw 也將像 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted` 以及定期
    使用量視窗限制 (`weekly/monthly limit reached`) 等訊息視為值得進行故障轉移的
    速率限制。

    某些看起來像計費的回應並不是 `402`，而某些 HTTP `402`
    回應也保留在暫態桶中。如果供應商在 `401` 或 `403` 上返回明確的計費文本，OpenClaw 仍可將其保留在
    計費通道中，但特定於供應商的文本匹配器仍僅限於擁有它們的供應商

（例如 OpenRouter `Key limit exceeded`）。如果 `402`
訊息看起來像可重試的使用量視窗或
組織/工作區支出限制 (`daily limit reached, resets tomorrow`、
`organization spending limit exceeded`)，OpenClaw 會將其視為
`rate_limit`，而不是長期的計費停用。

    上下文溢出錯誤則不同：諸如 `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 等特徵會保持在壓縮/重試路徑上，而不是推進模型
    故障轉移。

    通用伺服器錯誤文本的範圍刻意比「任何包含 unknown/error 的內容」更窄。當供應商上下文匹配時，OpenClaw 確實會將特定於供應商的暫態形狀（如 Anthropic 單純的 `An unknown error occurred`、OpenRouter 單純的
    `Provider returned error`、像 `Unhandled stop reason:
    error`, JSON `api_error` 這類帶有暫態伺服器文本的停止原因錯誤
    (`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException`) 視為值得故障轉移的超時/過載訊號。
    通用內部後備文本（如 `LLM request failed with an unknown
    error.`）保持保守，不會自行觸發模型故障轉移。

  </Accordion>

  <Accordion title='「No credentials found for profile anthropic:default」是什麼意思？'>
    這表示系統嘗試使用授權設定檔 ID `anthropic:default`，但在預期的授權存放區中找不到該設定檔的憑證。

    **修復檢查清單：**

    - **確認授權設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 Shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的代理程式**
      - 多代理程式設定意味著可能存在多個 `auth-profiles.json` 檔案。
    - **健全性檢查模型/授權狀態**
      - 使用 `openclaw models status` 檢視已設定的模型以及提供者是否已通過驗證。

    **「No credentials found for profile anthropic」的修復檢查清單**

    這表示執行作業已釘選至 Anthropic 授權設定檔，但 Gateway
    在其授權存放區中找不到它。

    - **使用 Claude CLI**
      - 在 Gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **Gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的釘選順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您正在 Gateway 主機上執行指令**
      - 在遠端模式下，授權設定檔位於 Gateway 機器上，而非您的筆記型電腦上。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未配置 Google 憑證，您將會看到 `No API key found for provider "google"`。

    修復方法：提供 Google 授權，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：會話記錄包含 **未簽名的 thinking 區塊**（通常來自於
    已中止/不完整的串流）。Google Antigravity 要求 thinking 區塊必須有簽名。

    修復方法：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽名的 thinking 區塊。如果問題仍然出現，請開始一個 **新會話** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 驗證設定檔：它們是什麼以及如何管理它們

相關連結：[/concepts/oauth](/zh-Hant/concepts/oauth) （OAuth 流程、Token 儲存、多帳號模式）

<AccordionGroup>
  <Accordion title="什麼是驗證設定檔？">
    驗證設定檔是與提供者綁定的命名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的設定檔 ID 是什麼？">
    OpenClaw 使用提供者前綴的 ID，例如：

    - `anthropic:default` （當不存在電子郵件身分識別時很常見）
    - `anthropic:<email>` 用於 OAuth 身分識別
    - 您選擇的自訂 ID （例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制首先嘗試哪個驗證設定檔嗎？">
    可以。設定檔支援選用的元數據，以及每個提供者的排序 (`auth.order.<provider>`)。這並**不**會儲存機密；它會將 ID 對應到提供者/模式並設定輪替順序。

    如果某個設定檔處於短期的「冷卻」(`openclaw models status --json`) (速率限制/逾時/驗證失敗) 或較長期的「停用」(`auth.unusableProfiles`) 狀態 (計費/額度不足)，OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整方式：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻可以是特定於模型的。正在為某個模型冷卻的設定檔，仍然可以在同一個提供者的其他相關模型上使用，但計費/停用期間仍然會封鎖整個設定檔。

    您也可以透過 CLI 設定「個別代理」(`auth-state.json`) 的排序覆寫 (儲存在該代理的 `auth-state.json` 中)：

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

    若要指定特定代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    若要驗證實際會嘗試的內容，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果儲存的設定檔從明確的排序中省略，探測會回報該設定檔的 `excluded_by_auth_order`，而不是在嘗試失敗。

  </Accordion>

  <Accordion title="OAuth 與 API 金鑰 - 有什麼區別？">
    OpenClaw 支援這兩者：

    - **OAuth** 通常利用訂閱存取權 (如適用)。
    - **API 金鑰** 使用依量計費。

    精靈明確支援 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 金鑰。

  </Accordion>
</AccordionGroup>

## Gateway：連接埠、「正在執行」與遠端模式

<AccordionGroup>
  <Accordion title="Gateway 使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP (控制 UI、掛鉤等) 的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 狀態顯示「Runtime: running」，但「RPC probe: failed」？'>
    因為「running」是**監督程式**（supervisor，如 launchd/systemd/schtasks）的視角。RPC 探測則是 CLI 實際連接到 gateway WebSocket 並呼叫 `status`。

    使用 `openclaw gateway status` 並相信這幾行輸出：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（連接埠上實際綁定的內容）
    - `Last gateway error:`（常見的根本原因：程序運行中但連接埠未監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 狀態顯示的「Config (cli)」和「Config (service)」不同？'>
    您正在編輯一個設定檔，而服務運行的是另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修正方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的同一個 `--profile` / 環境中執行上述指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行執行時鎖定（預設為 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個實例正在監聽。

    修正方法：停止另一個實例、釋放連接埠，或使用 `openclaw gateway --port <port>` 運行。

  </Accordion>

  <Accordion title="如何在遠端模式下執行 OpenClaw（客戶端連線到別處的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向一個遠端 WebSocket URL，可選擇搭配 shared-secret 遠端認證資訊：

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

    注意事項：

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時才會啟動（或是您傳遞了覆寫旗標）。
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅為客戶端的遠端認證資訊；它們本身不會啟用本機 gateway 認證。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或不斷重新連線）。現在該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不相符。

    事實（來源代碼）：

    - 控制介面將令牌保存在 `sessionStorage` 中，供當前瀏覽器分頁工作階段及選定的閘道 URL 使用，因此同分頁重新整理能持續運作，無需還原長期的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道返回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以使用快取的裝置令牌嘗試一次有界的重試。
    - 該快取令牌重試現在會重複使用與裝置令牌一起儲存的快取已批准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫端仍會保留其要求的範圍設定，而非繼承快取範圍。
    - 在該重試路徑之外，連線驗證優先順序為：明確的共享令牌/密碼優先，其次是明確的 `deviceToken`，然後是儲存的裝置令牌，最後是引導令牌。
    - 引導令牌範圍檢查會加上角色前綴。內建引導操作員允許清單僅滿足操作員請求；節點或其他非操作員角色仍需要其自身角色前綴下的範圍。

    修復方法：

    - 最快的方法：`openclaw dashboard`（列印並複製儀表板 URL，嘗試開啟；如果是無頭模式則顯示 SSH 提示）。
    - 如果您尚未取得令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端操作，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然後開啟 `http://127.0.0.1:18789/`。
    - 共享密鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制介面設定中貼上相符的密鑰。
    - Tailscale Serve 模式：請確保已啟用 `gateway.auth.allowTailscale`，並且您開啟的是 Serve URL，而非繞過 Tailscale 身分標頭的原始迴路/tailnet URL。
    - 受信任代理模式：請確保您是透過設定的非迴路身分感知代理連線，而非同主機迴路代理或原始閘道 URL。
    - 如果在一次重試後不匹配仍持續存在，請輪換/重新批准配對的裝置令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪換呼叫顯示被拒絕，請檢查兩件事：
      - 配對裝置工作階段只能輪換**其自身**的裝置，除非它們也擁有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫端當前的操作員範圍
    - 仍然卡住？請執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以了解驗證詳情。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），則沒有可綁定的位址。

    修復方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您需要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不行 - 一個 Gateway 可以執行多個訊息通道和代理程式。僅當您需要冗餘（例如：救援機器人）或強隔離時，才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH`（每個執行個體的設定）
    - `OPENCLAW_STATE_DIR`（每個執行個體的狀態）
    - `agents.defaults.workspace`（工作區隔離）
    - `gateway.port`（唯一連接埠）

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...`（自動建立 `~/.openclaw-<name>`）。
    - 在每個 profile 設定中設定唯一的 `gateway.port`（或針對手動執行傳遞 `--port`）。
    - 安裝各個 profile 的服務：`openclaw --profile <name> gateway install`。

    Profiles 也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「invalid handshake」/ 錯誤代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它期望收到的第一個訊息必須是 `connect` 幀。如果收到任何其他內容，它會關閉連線並回傳 **錯誤代碼 1008**（違反政策）。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** 網址（`http://...`）而不是使用 WS 客戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或隧道移除了認證標頭或發送了非 Gateway 的請求。

    快速修復方法：

    1. 使用 WS 網址：`ws://<host>:18789`（如果是 HTTPS 則使用 `wss://...`）。
    2. 不要在一般瀏覽器分頁中開啟 WS 連接埠。
    3. 如果啟用了認證，請在 `connect` 幀中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，網址應該如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    通訊協定詳細資訊：[Gateway 通訊協定](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 記錄與除錯

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

    服務/監督器日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    詳情請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助指令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以收回連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="I closed my terminal on Windows - how do I restart OpenClaw?">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2 (推薦)：** 閘道在 Linux 中執行。

    開啟 PowerShell，進入 WSL，然後重新啟動：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您從未安裝服務，請在前台啟動它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows (不推薦)：** 閘道直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它 (無服務)，請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows)、[Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="The Gateway is up but replies never arrive. What should I check?">
    先進行快速的健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未在 **gateway host** 上載入 (檢查 `models status`)。
    - 通道配對/允許清單阻擋了回覆 (檢查通道設定 + 記錄)。
    - WebChat/Dashboard 已開啟，但使用了錯誤的權杖。

    如果您是遠端連線，請確認通道/Tailscale 連線已啟動，且
    Gateway WebSocket 可連線。

    文件：[Channels](/zh-Hant/channels)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)、[Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - what now?'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否有正確的權杖？ `openclaw dashboard`
    4. 若為遠端連線，通道/Tailscale 連線是否已啟動？

    然後檢視記錄：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/zh-Hant/web/dashboard)、[Remote access](/zh-Hant/gateway/remote)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    首先檢查日誌和頻道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目過多。OpenClaw 已經自動修剪至 Telegram 限制並以較少的指令重試，但您可能仍需要捨棄部分選單項目。請減少外掛程式/技能/自訂指令的數量，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您使用 VPS 或位於 Proxy 後方，請確認允許對外 HTTPS 連線，且對 `api.telegram.org` 的 DNS 解析正常。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可連線，且代理程式 可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看目前的狀態。如果您預期在聊天頻道
    中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 作為常駐程式 在背景執行時，請使用此方法。

    如果您是在前景執行，請使用 Ctrl-C 停止，然後執行：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段的 **前景** 中執行 gateway。

    如果您已安裝服務，請使用 gateway 指令。當您想要進行一次性前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以獲得更多主控台詳細資訊。然後檢查記錄檔中的通道認證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    從代理程式發出的輸出附件必須包含 `MEDIA:<path-or-url>` 行（在單獨的一行）。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    另請檢查：

    - 目標通道支援輸出媒體，且未被允許清單封鎖。
    - 檔案在提供者的大小限制內（圖片會調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制為工作區、temp/media-store 和沙盒驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送代理程式已可讀取的主機本機檔案，但僅限於媒體和安全文件類型（圖片、音訊、視訊、PDF 和 Office 文件）。純文字和類似祕密的檔案仍然被封鎖。

    參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="讓 OpenClaw 接收傳入的私人訊息（DM）安全嗎？">
    將傳入的私人訊息視為不受信任的輸入。預設值的設計旨在降低風險：

    - 支援私人訊息的頻道，其預設行為是 **配對（pairing）**：
      - 未知的發送者會收到一組配對碼；機器人不會處理他們的訊息。
      - 使用以下指令批准： `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理的請求上限為 **每個頻道 3 個**；如果沒有收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私人訊息需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以找出具風險的私人訊息政策。

  </Accordion>

  <Accordion title="提示詞注入（Prompt injection）是否僅是公開機器人的隱患？">
    不。提示詞注入涉及的是 **不受信任的內容**，而不僅僅是誰能傳送私人訊息給機器人。
    如果您的助理讀取外部內容（網路搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    劫持模型的指令。即使 **您是唯一的發送者**，這種情況也可能發生。

    最大的風險在於啟用工具時：模型可能會被誘騙
    外洩上下文或代表您呼叫工具。您可以透過以下方式減少影響範圍：

    - 使用唯讀或停用工具的「讀者」代理程式來總結不受信任的內容
    - 對於已啟用工具的代理程式，請保持 `web_search` / `web_fetch` / `browser` 為關閉狀態
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件提取都會將提取的文字包裝在
      明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙箱機制和嚴格的工具允許清單

    詳細資訊：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設置來說。使用獨立的帳號和電話號碼隔離機器人，可以在發生問題時縮小受影響的範圍（爆炸半徑）。這也能讓您更容易輪換憑證或撤銷存取權限，而不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號的存取權限，如有需要再進行擴展。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主控制我的簡訊，這樣安全嗎？">
    我們**不**建議讓它完全自主控制您的個人訊息。最安全的模式是：

    - 將私訊（DM）保持在**配對模式**或嚴格的白名單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的電話號碼或帳號**。
    - 讓它先擬草稿，然後在**發送前進行審核**。

    如果您想進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以將較便宜的模型用於個人助理任務嗎？">可以，**但前提是**該代理程式僅用於聊天，且輸入內容是受信任的。較低階層的模型更容易受到指令劫持，因此請避免在啟用工具的代理程式或讀取不受信任內容時使用。如果您必須使用較小的模型，請鎖定工具並在沙盒內運行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    只有當未知的發送者向機器人發送訊息並且啟用了
    `dmPolicy: "pairing"` 時，才會發送配對碼。僅憑 `/start` 本身並不會產生代碼。

    檢查待處理的請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入白名單，或針對該帳號設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對運作方式是什麼？">
    不會。預設的 WhatsApp 私訊原則是 **配對**。未知的發送者只會收到配對碼，而他們的訊息 **不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確傳送。

    使用以下方式核准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：它是用來設定您的 **允許清單/擁有者**，以便允許您自己的私訊。它不用於自動傳送。如果您使用個人的 WhatsApp 號碼執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務和「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息只有在該工作階段啟用了 **verbose**、**trace** 或 **reasoning** 時才會出現。

    在您看到問題的聊天中進行修正：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然太吵雜，請檢查 Control UI 中的工作階段設定並將 verbose 設定為 **inherit**。同時確認您沒有使用在 config 中將 `verboseDefault` 設定為 `on` 的 bot 設定檔。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任何一個 **作為獨立訊息**（無斜線）：

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

    大多數指令必須以 `/` 開頭的 **獨立** 訊息傳送，但一些捷徑（例如 `/status`）也可以在列中對允許清單上的發送者運作。

  </Accordion>

  <Accordion title='如何從 Telegram 發送 Discord 訊息？（「跨上下文傳訊被拒絕」）'>
    OpenClaw 預設會阻擋 **跨供應商** 的訊息傳送。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會傳送到 Discord。

    為代理啟用跨供應商傳訊：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    編輯設定後請重新啟動閘道。

  </Accordion>

  <Accordion title='為什麼機器人感覺像是「忽略」了連珠砲式的訊息？'>
    佇列模式控制新訊息如何與進行中的執行互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向目前的任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即引導，然後處理待辦事項
    - `interrupt` - 中止目前執行並重新開始

    您可以為後續模式新增像 `debounce:2s cap:25 drop:summarize` 這樣的選項。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在設定檔中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何內容（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這代表閘道無法在正在執行之代理的預期 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請到 [Discord](https://discord.com/invite/clawd) 提問或開啟一個 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。
