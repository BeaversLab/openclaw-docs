---
summary: "關於 OpenClaw 設定、設定檔和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對真實環境設定（本地開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答以及更深入的疑難排解。如需執行時期診斷，請參閱 [疑難排解](/en/gateway/troubleshooting)。如需完整的設定檔參考，請參閱 [設定](/en/gateway/configuration)。

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

   執行即時的閘道健康狀態探測，包括支援時的通道探測
   （需要可連線的閘道）。請參閱 [健康狀態](/en/gateway/health)。

5. **追蹤最新日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕機，請改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱 [日誌記錄](/en/logging) 和 [疑難排解](/en/gateway/troubleshooting)。

6. **執行修復工具（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移設定檔/狀態並執行健康檢查。請參閱 [Doctor](/en/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道要求完整的快照（僅限 WS）。請參閱 [健康狀態](/en/gateway/health)。

## 快速入門與首次執行設置

<AccordionGroup>
  <Accordion title="我卡住了，解開卡住狀態的最快方法">
    使用一個能**查看您機器**的本機 AI Agent。這比在 Discord 上提問有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取儲存庫、執行指令、檢查日誌，並協助修復您的機器層級設定（PATH、服務、權限、認證檔案）。透過可駭入 (git) 安裝，提供它們**完整的原始碼檢出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 檢出**安裝 OpenClaw，因此 Agent 可以讀取程式碼 + 文件，並針對您正在執行的確切版本進行推理。您稍後總是可以透過不使用 `--install-method git` 重新執行安裝程式，切換回穩定版。

    提示：請 Agent **規劃並監督**修復過程（逐步進行），然後僅執行必要的指令。這樣可以保持變更微小且更容易稽核。

    如果您發現真正的錯誤或修復方法，請提交 GitHub issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（尋求協助時請分享輸出結果）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：閘道器/Agent 健康狀況 + 基本設定的快速快照。
    - `openclaw models status`：檢查提供者認證 + 模型可用性。
    - `openclaw doctor`：驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯循環：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安裝文件：[Install](/en/install)、[Installer flags](/en/install/installer)、[Updating](/en/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat keeps skipping. What do the skip reasons mean?">
    常見的心跳跳過原因：

    - `quiet-hours`：超出設定的啟用時段（active-hours）視窗
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在但僅包含空白/僅有標頭的腳手架
    - `no-tasks-due`：`HEARTBEAT.md` 任務模式已啟用但尚未到達任何任務間隔
    - `alerts-disabled`：所有心跳可見性均已停用（`showOk`、`showAlerts` 和 `useIndicator` 皆為關閉狀態）

    在任務模式下，只有當真正的心跳運行完成後，才會推進到期時間戳記。跳過的運行不會將任務標記為已完成。

    文件：[Heartbeat](/en/gateway/heartbeat)、[Automation & Tasks](/en/automation)。

  </Accordion>

  <Accordion title="Recommended way to install and set up OpenClaw">
    本儲存庫建議從原始碼執行並使用入門引導：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    精靈也可以自動建置 UI 資產。入門引導完成後，您通常會在連接埠 **18789** 上執行 Gateway。

    從原始碼執行（貢獻者/開發者）：

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

  <Accordion title="我如何在本地主機和遠端對儀表板進行驗證？">
    **本地主機（同一台機器）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求共用金鑰驗證，請將設定的權杖或密碼貼上到 Control UI 設定中。
    - 權杖來源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密碼來源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未設定共用金鑰，請使用 `openclaw doctor --generate-gateway-token` 產生權杖。

    **非本地主機：**

    - **Tailscale Serve**（推薦）：保持綁定 loopback，執行 `openclaw gateway --tailscale serve`，然後開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 為 `true`，身分標頭將滿足 Control UI/WebSocket 驗證（無需貼上共用金鑰，假設為受信任的 Gateway 主機）；除非您刻意使用 private-ingress `none` 或 trusted-proxy HTTP 驗證，否則 HTTP API 仍需共用金鑰驗證。
      來自同一個客戶端的錯誤並發 Serve 驗證嘗試會在失敗驗證限制器記錄它們之前進行序列化，因此第二次錯誤重試可能已經顯示 `retry later`。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`（或設定密碼驗證），開啟 `http://<tailscale-ip>:18789/`，然後在儀表板設定中貼上相符的共用金鑰。
    - **身分感知反向代理**：將 Gateway 保持在非 loopback 的受信任代理後面，設定 `gateway.auth.mode: "trusted-proxy"`，然後開啟代理 URL。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。共用金鑰驗證仍適用於隧道；如果系統提示，請貼上設定的權杖或密碼。

    請參閱 [儀表板](/en/web/dashboard) 和 [Web 介面](/en/web) 以了解綁定模式和驗證詳細資訊。

  </Accordion>

  <Accordion title="為什麼有兩個針對聊天審批的執行審批配置？">
    它們控制不同的層級：

    - `approvals.exec`：將審批提示轉發到聊天目標
    - `channels.<channel>.execApprovals`：使該通道充當執行審批的原生審批客戶端

    主機執行策略仍然是真正的審批閘門。聊天配置僅控制審批提示出現的位置以及人們如何回答。

    在大多數設置中，您**不需要**同時使用兩者：

    - 如果聊天已經支援指令和回覆，同聊天 `/approve` 透過共用路徑運作。
    - 如果支援的原生通道可以安全地推斷審批者，當 `channels.<channel>.execApprovals.enabled` 未設定或 `"auto"` 時，OpenClaw 現在會自動啟用優先 DM 的原生審批。
    - 當可使用原生審批卡片/按鈕時，該原生 UI 是主要路徑；只有當工具結果顯示聊天審批不可用或手動審批是唯一路徑時，Agent 才應包含手動 `/approve` 指令。
    - 僅當提示必須轉發到其他聊天或明確的運維室時，才使用 `approvals.exec`。
    - 僅當您明確希望將審批提示發佈回原始房間/主題時，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 外掛程式審批又是分開的：它們預設使用同聊天 `/approve`，可選的 `approvals.plugin` 轉發，並且只有部分原生通道保持外掛程式審批的原生處理。

    簡而言之：轉發用於路由，原生客戶端配置用於更豐富的特定通道 UX。
    請參閱 [執行審批](/en/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。Bun **不建議**用於 Gateway。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上運行嗎？">
    可以。Gateway 非常輕量 — 文件列出 **512MB-1GB RAM**、**1 核心**和大約 **500MB**
    的磁碟空間對個人使用來說就足夠了，並且注意到 **Raspberry Pi 4 可以運行它**。

    如果您想要額外的空間（日誌、媒體、其他服務），建議使用 **2GB**，但這並非
    硬性的最低要求。

    提示：一個小型的 Pi/VPS 可以託管 Gateway，您可以在您的筆記型電腦/手機上配對 **節點**
    以進行本地螢幕/相機/畫布或命令執行。參見 [節點](/en/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有什麼建議嗎？">
    簡而言之：它是可行的，但預期會有一些粗糙的地方。

    - 使用 **64 位元** 作業系統並保持 Node >= 22。
    - 優先選擇 **可駭客的 (git) 安裝**，以便您可以查看日誌並快速更新。
    - 在不啟用頻道/技能的情況下開始，然後逐一新增它們。
    - 如果遇到奇怪的二進位問題，通常是由於 **ARM 相容性** 問題。

    文件：[Linux](/en/platforms/linux)、[安裝](/en/install)。

  </Accordion>

  <Accordion title="它卡在 wake up my friend / onboarding 將無法孵化。現在該怎麼辦？">
    該畫面取決於 Gateway 是否可達且已通過驗證。TUI 也會在首次孵化時自動發送
    「Wake up, my friend!」。如果您看到該行文字卻**沒有回應**
    且 token 數保持在 0，表示代理程式從未執行。

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
    指向正確的 Gateway。參見 [遠端存取](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我可以將我的設定遷移到新機器（Mac mini）而無需重新進入入門設定嗎？">
    可以。複製 **狀態目錄** 和 **工作區**，然後執行一次 Doctor。這能讓您的機器人保持「完全相同」（記憶、會話歷史、驗證和通道狀態），只要您複製了這**兩個**位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）。
    3. 複製您的工作區（預設：`~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、驗證設定檔、WhatsApp 憑證、會話和記憶。如果您使用遠端模式，請記得 gateway 主機擁有會話存儲和工作區。

    **重要提示：**如果您僅將工作區 commit/push 到 GitHub，您是在備份 **記憶 + 引導文件**，但**不包含**會話歷史或驗證資料。這些檔案位於 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關連結：[遷移](/en/install/migrating)、[檔案儲存位置](#where-things-live-on-disk)、
    [Agent 工作區](/en/concepts/agent-workspace)、[Doctor](/en/gateway/doctor)、
    [遠端模式](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以查看最新版本的新功能？">
    請查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部區段標記為 **Unreleased**，則下一個有日期的區段即為最新發布的版本。條目按 **亮點**、**變更** 和 **修復** 分組（必要時還包含文件/其他區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai (SSL 錯誤)">
    部分 Comcast/Xfinity 連線透過 Xfinity 進階安全性錯誤阻擋了 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。請透過此處回報來協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件在 GitHub 上有鏡像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Difference between stable and beta">
    **Stable** 和 **beta** 是 **npm dist-tags**（發布標籤），而非獨立的程式碼分支：

    - `latest` = stable（穩定版）
    - `beta` = early build for testing（早期測試版本）

    通常，穩定版會先發布在 **beta** 上，然後透過明確的升級步驟將相同版本移至 `latest`。維護者也可以在需要時直接發布到 `latest`。這就是為什麼升級後 beta 和 stable 可能指向**相同版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    若要了解安裝指令，以及 beta 和 dev 的區別，請參閱下方的折疊面板。

  </Accordion>

  <Accordion title="How do I install the beta version and what is the difference between beta and dev?">
    **Beta** 是 npm dist-tag `beta`（升級後可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的最新動態分支；發布時，它使用 npm dist-tag `dev`。

    單行指令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳細資訊：[Development channels](/en/install/development-channels) 和 [Installer flags](/en/install/installer)。

  </Accordion>

  <Accordion title="How do I try the latest bits?">
    有兩個選項：

    1. **Dev channel (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從原始碼更新。

    2. **Hackable install (from the installer site)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本機存放庫，然後透過 git 更新。

    如果您喜歡手動進行乾淨的克隆，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[Update](/en/cli/update)、[Development channels](/en/install/development-channels)、
    [Install](/en/install)。

  </Accordion>

  <Accordion title="安裝和入門通常需要多長時間？">
    大致指南：

    - **安裝：** 2-5 分鐘
    - **入門：** 5-15 分鐘，取決於您設定的頻道/模型數量

    如果卡住，請使用 [安裝程式卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速除錯迴圈。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多回饋？">
    使用 **詳細輸出** 重新執行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用詳細輸出的 Beta 安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    針對可修改 的安裝：

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

    更多選項：[安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝顯示找不到 git 或無法辨識 openclaw">
    兩個常見的 Windows 問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法辨識 openclaw**

    - 您的 npm全域 bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增至您的使用者 PATH (Windows 上不需要 `\bin` 後綴；在大多數系統上它是 `%AppData%\npm`)。
    - 更新 PATH 後關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/en/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec output shows garbled Chinese text - what should I do?">
    這通常是原生 Windows Shell 上的主控台字碼頁不符。

    症狀：

    - `system.run`/`exec` 輸出將中文顯示為亂碼
    - 同一個指令在另一個終端機設定檔中看起來正常

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

  <Accordion title="The docs did not answer my question - how do I get a better answer?">
    使用 **可駭客式 安裝**，這樣您就可以在本地擁有完整的原始碼和文件，然後_從該資料夾中_詢問您的機器人（或 Claude/Codex），以便它可以讀取儲存庫並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/en/install) 和 [安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="How do I install OpenClaw on Linux?">
    簡短回答：依照 Linux 指南操作，然後執行 onboarding。

    - Linux 快速路徑 + 服務安裝：[Linux](/en/platforms/linux)。
    - 完整逐步解說：[開始使用](/en/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/en/install/updating)。

  </Accordion>

  <Accordion title="How do I install OpenClaw on a VPS?">
    任何 Linux VPS 皆可。在伺服器上安裝，然後使用 SSH/Tailscale 連線至 Gateway。

    指南：[exe.dev](/en/install/exe-dev)、[Hetzner](/en/install/hetzner)、[Fly.io](/en/install/fly)。
    遠端存取：[Gateway remote](/en/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見供應商的**託管中心 (hosting hub)**。選擇其中一個並跟隨指南操作：

    - [VPS 託管](/en/vps) (所有供應商一應俱全)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    雲端運作方式：**Gateway 在伺服器上運行**，您可以透過 Control UI（或 Tailscale/SSH）從您的筆記型電腦/手機存取它。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將**節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway，以存取本機螢幕/相機/畫布，或在將 Gateway 保持在雲端的同時在您的筆記型電腦上執行指令。

    中心：[平台](/en/platforms)。遠端存取：[Gateway 遠端](/en/gateway/remote)。
    節點：[節點](/en/nodes)，[節點 CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自己嗎？">
    簡短回答：**可行，但不建議**。更新流程可能會重新啟動 Gateway（這會中斷作用中的工作階段），可能需要乾淨的 git checkout，並且可能會提示確認。更安全的方法：以操作員身分從 shell 執行更新。

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

    文件：[更新](/en/cli/update)，[更新中](/en/install/updating)。

  </Accordion>

  <Accordion title="入門流程實際上做什麼？">
    `openclaw onboard` 是推薦的設定路徑。在**本機模式**下，它會引導您完成：

    - **模型/驗證設定**（供應商 OAuth、API 金鑰、Anthropic 舊版 setup-token，以及 LM Studio 等本機模型選項）
    - **工作區**位置 + 啟動檔案
    - **閘道設定**（綁定/連接埠/驗證/tailscale）
    - **頻道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及內建的頻道外掛如 QQ Bot）
    - **Daemon 安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd user unit）
    - **健康檢查**與**技能**選擇

    如果您設定的模型未知或缺少驗證，它也會發出警告。

  </Accordion>

  <Accordion title="我需要 Claude 或 OpenAI 訂閱才能執行這個嗎？">
    不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或僅使用**本機模型**來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱（Claude Pro/Max 或 OpenAI Codex）是驗證這些供應商的可選方式。

    對於 OpenClaw 中的 Anthropic，實際區分為：

    - **Anthropic API 金鑰**：正常的 Anthropic API 計費
    - **OpenClaw 中的 Claude 訂閱驗證**：Anthropic 於 **2026 年 4 月 4 日下午 12:00 PT / 晚上 8:00 BST** 通知 OpenClaw 使用者，這需要與訂閱分開計費的**額外使用量**

    我們的本機重現實驗也顯示，當附加的提示識別出 OpenClaw 時，`claude -p --append-system-prompt ...` 會遇到相同的額外使用量防護，而相同的提示字串在 Anthropic SDK + API 金鑰路徑上**不會**重現該阻擋。OpenAI Codex OAuth 明確支援像 OpenClaw 這樣的外部工具。

    OpenClaw 也支援其他託管的訂閱式選項，包括 **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和 **Z.AI / GLM Coding Plan**。

    文件：[Anthropic](/en/providers/anthropic)、[OpenAI](/en/providers/openai)、
    [Qwen Cloud](/en/providers/qwen)、
    [MiniMax](/en/providers/minimax)、[GLM Models](/en/providers/glm)、
    [Local models](/en/gateway/local-models)、[Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    可以，但請將其視為 **Claude 訂閱驗證搭配額外使用量 (Extra Usage)**。

    Claude Pro/Max 訂閱不包含 API 金鑰。在 OpenClaw 中，這意味著 Anthropic 針對 OpenClaw 的計費通知適用於此：訂閱流量需要 **額外使用量**。如果您希望在不使用該額外使用量路徑的情況下使用 Anthropic 流量，請改用 Anthropic API 金鑰。

  </Accordion>

  <Accordion title="你們支援 Claude 訂閱驗證 (Claude Pro 或 Max) 嗎？">
    支援，但目前支援的解釋如下：

    - 在 OpenClaw 中使用 Anthropic 訂閱代表需要 **額外使用量**
    - 在 OpenClaw 中不使用該路徑則代表使用 **API 金鑰**

    Anthropic 的設定權杖 (setup-token) 仍可作為舊版/手動 OpenClaw 路徑使用，且 Anthropic 針對 OpenClaw 的特定計費通知仍適用於此。我們還在直接使用 `claude -p --append-system-prompt ...` 並且附加提示詞識別出 OpenClaw 時，在本地複現了相同的計費保護機制，而相同的提示詞字串在 Anthropic SDK + API 金鑰路徑上則**未**複現該機制。

    對於生產環境或多用戶工作負載，Anthropic API 金鑰驗證是更安全且被推薦的選擇。如果您想要在 OpenClaw 中使用其他訂閱式的託管選項，請參閱 [OpenAI](/en/providers/openai)、[Qwen / Model
    Cloud](/en/providers/qwen)、[MiniMax](/en/providers/minimax) 和
    [GLM Models](/en/providers/glm)。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="為什麼我會從 Anthropic 看到 HTTP 429 rate_limit_error？">
這表示您的 **Anthropic 配額/速率限制** 在目前時間視窗內已用盡。如果您使用的是 **Claude CLI**，請等待時間視窗重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 的使用量/帳單情況，並視需要提高限制。

    如果訊息特別是：
    `Extra usage is required for long context requests`，表示該請求正在嘗試使用
    Anthropic 的 1M 上下文測試版 (`context1m: true`)。這只有在您的憑證符合長上下文計費資格時才能運作（API 金鑰計費或已啟用額外使用量的 OpenClaw Claude 登入路徑）。

    提示：設定一個 **後備模型**，以便在供應商受到速率限制時，OpenClaw 能持續回覆。
    請參閱 [Models](/en/cli/models)、[OAuth](/en/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="支援 AWS Bedrock 嗎？">
  是的。OpenClaw 內建了 **Amazon Bedrock (Converse)** 供應商。在有 AWS 環境標記的情況下，OpenClaw 可以自動探索串流/文字 Bedrock 目錄，並將其合併為隱含的 `amazon-bedrock` 供應商；否則，您可以明確啟用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或新增手動供應商項目。請參閱 [Amazon Bedrock](/en/providers/bedrock) 和 [Model providers](/en/providers/models)。如果您偏好多個金鑰流程，在
  Bedrock 前面放置一個 OpenAI 相容的代理伺服器仍然是一個有效的選項。
</Accordion>

<Accordion title="Codex 驗證是如何運作的？">OpenClaw 透過 OAuth（ChatGPT 登入）支援 **OpenAI Code (Codex)**。入學流程可以執行 OAuth 流程，並在適當時將預設模型設為 `openai-codex/gpt-5.4`。請參閱 [Model providers](/en/concepts/model-providers) 和 [Onboarding (CLI)](/en/start/wizard)。</Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在外部工具/工作流程（如 OpenClaw）中使用訂閱 OAuth。入門流程 可以為您執行 OAuth 流程。

    請參閱 [OAuth](/en/concepts/oauth)、[模型供應商](/en/concepts/model-providers) 和 [入門 (CLI)](/en/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **外掛程式驗證流程**，而不是 `openclaw.json` 中的用戶端 ID 或金鑰。

    請改用 Gemini API 供應商：

    1. 啟用外掛程式：`openclaw plugins enable google`
    2. 執行 `openclaw onboard --auth-choice gemini-api-key`
    3. 設定 Google 模型，例如 `google/gemini-3.1-pro-preview`

  </Accordion>

<Accordion title="本地模型適合一般閒聊嗎？">通常不適合。OpenClaw 需要大長度上下文 + 強大的安全性；較小的顯卡會導致截斷和洩漏。如果必須使用，請在本地執行您所能負擔的 **最大** 模型版本 (LM Studio)，並參閱 [/gateway/local-models](/en/gateway/local-models)。較小/量化模型會增加提示詞注入的風險 - 請參閱 [安全性](/en/gateway/security)。</Accordion>

<Accordion title="如何將託管模型的流量保留在特定區域？">選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管的選項；選擇美國託管的變體以將數據保留在區域內。您仍然可以透過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型並列，以便在尊重您選擇的區域供應商的同時保持備援方案可用。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（透過 WSL2 的 Windows）上執行。Mac mini 是選配的——有些人會買一台作為永遠上線的主機，但小型 VPS、家用伺服器或樹莓派級別的裝置也可以。

    您只有在 **macOS 專屬工具** 時才需要 Mac。針對 iMessage，請使用 [BlueBubbles](/en/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可在任何 Mac 上執行，而 Gateway 可以在 Linux 或其他地方執行。如果您想要其他 macOS 專屬工具，請在 Mac 上執行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/en/channels/bluebubbles)、[Nodes](/en/nodes)、[Mac remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    您需要 **某個已登入 Messages 的 macOS 裝置**。它 **不一定要** 是 Mac mini——任何 Mac 都可以。針對 iMessage，**請使用 [BlueBubbles](/en/channels/bluebubbles)**（推薦）——BlueBubbles 伺服器在 macOS 上執行，而 Gateway 可以在 Linux 或其他地方執行。

    常見設定方式：

    - 在 Linux/VPS 上執行 Gateway，並在任何已登入 Messages 的 Mac 上執行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請在 Mac 上執行所有操作。

    文件：[BlueBubbles](/en/channels/bluebubbles)、[Nodes](/en/nodes)、
    [Mac remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將其連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為 **節點**（companion device，伴隨裝置）進行連接。節點不執行 Gateway——它們提供額外功能，例如該裝置上的螢幕/相機/畫布和 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上（永遠上線）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並配對至 Gateway。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    不建議使用 **Bun**。我們發現執行時存在錯誤，特別是在 WhatsApp 和 Telegram 方面。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍想嘗試使用 Bun，請在非生產環境的閘道上進行，
    且不要用於 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中應填入什麼？">
    `channels.telegram.allowFrom` 是 **人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    入職流程接受 `@username` 格式的輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

    更安全的方式（無需第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並讀取 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並讀取 `message.from.id`。

    第三方方式（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    請參閱 [/channels/telegram](/en/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以透過不同的 OpenClaw 實例使用同一個 WhatsApp 號碼嗎？">
  可以，透過 **多代理路由**。將每個發送者的 WhatsApp **私訊**（對等節點 `kind: "direct"`，發送者 E.164 格式如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都會獲得自己的工作區和會話儲存空間。回覆仍然來自 **同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）對每個 WhatsApp 帳號是全域的。請參閱 [多代理路由](/en/concepts/multi-agent) 和
  [WhatsApp](/en/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行一個「快速聊天」代理程式和一個「用於編碼的 Opus」代理程式嗎？">可以。使用多代理程式路由：為每個代理程式指定其預設模型，然後將入站路由（提供者帳戶或特定對等點）綁定到每個代理程式。範例配置位於 [Multi-Agent Routing](/en/concepts/multi-agent) 中。另請參閱 [Models](/en/concepts/models) 和 [Configuration](/en/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或您的 brew 前綴)，以便 `brew` 安裝的工具在非登入 shell 中能被解析。
    最近的版本也會在 Linux systemd 服務中預先加入常見的使用者 bin 目錄 (例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`)，並在設置時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可修改的 git 安裝與 npm 安裝之間的區別">
    - **Hackable (git) 安裝：** 完整的原始碼檢出，可編輯，最適合貢獻者。
      您在本地執行建置，並可以修改程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無需程式庫，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[Getting started](/en/start/getting-started)、[Updating](/en/install/updating)。

  </Accordion>

  <Accordion title="我可以稍後在 npm 和 git 安裝之間切換嗎？">
    是的。安裝另一個版本，然後運行 Doctor 以便網關服務指向新的入口點。
    這**不會刪除您的數據**——它只會更改 OpenClaw 代碼安裝。您的狀態
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

  <Accordion title="我應該在筆記型電腦還是 VPS 上運行 Gateway？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您希望
    摩擦最小並且可以接受睡眠/重新啟動，則在本地運行。

    **筆記型電腦（本地 Gateway）**

    - **優點：** 無伺服器成本，直接存取本機檔案，即時瀏覽器視窗。
    - **缺點：** 睡眠/網絡斷線 = 斷開連接，作業系統更新/重新啟動會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠在線，穩定的網絡，無筆記型電腦睡眠問題，更容易保持運行。
    - **缺點：** 通常無頭運行（使用螢幕截圖），僅限遠端檔案存取，您必須透過 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都能正常運作。唯一的真正權衡是**無頭瀏覽器**與可見視窗的對比。請參閱 [瀏覽器](/en/tools/browser)。

    **推薦預設：** 如果您之前遇到過網關斷開連接的情況，請使用 VPS。當您積極使用 Mac 並想要本地檔案存取或使用可見瀏覽器進行 UI 自動化時，本地運行非常棒。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必需，但**為了可靠性和隔離性建議採用**。

    - **專用主機（VPS/Mac mini/Pi）：** 永遠線上，較少睡眠/重啟中斷，權限更乾淨，更容易保持運作。
    - **共用筆記型電腦/桌面電腦：** 非常適合測試和主動使用，但當電腦睡眠或更新時預期會有暫停。

    如果您想要兩全其美，請將 Gateway 放在專用主機上，並將您的筆記型電腦作為本地螢幕/相機/執行工具的**節點**進行配對。請參閱[節點](/en/nodes)。
    如需安全性指導，請閱讀[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 需求和推薦的作業系統是什麼？">
    OpenClaw 是輕量級的。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **推薦配置：** 1-2 vCPU，2GB RAM 或更多以保留餘裕（日誌、媒體、多頻道）。節點工具和瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS**（或任何現代 Debian/Ubuntu）。Linux 安裝路徑在那裡測試最為充分。

    文件：[Linux](/en/platforms/linux)、[VPS 主機託管](/en/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求是什麼？">
    可以。將 VM 視為與 VPS 相同：它需要永遠線上、可連線，並且有足夠的 RAM 供 Gateway 和您啟用的任何頻道使用。

    基本指導原則：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **推薦配置：** 2GB RAM 或更多，如果您執行多頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，並且具有最佳的工具相容性。請參閱[Windows](/en/platforms/windows)、[VPS 主機託管](/en/vps)。
    如果您在 VM 中執行 macOS，請參閱[macOS VM](/en/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什麼，用一段話概括？">
    OpenClaw 是您在自己的設備上運行的個人 AI 助手。它會在您已經使用的訊息表面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及內建的頻道外掛，如 QQ Bot），並且可以在支援的平台上進行語音和實時 Canvas 互動。**Gateway** 是始終在線的控制平面；而助手才是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的殼」。它是一個 **本地優先的控制平面**，讓您能在**您自己的硬體**上運行
    一個功能強大的助手，並從您已經使用的聊天應用程式中訪問它，具備
    有狀態的會話、記憶和工具能力，而無需將您的工作流程控制權交給
    託管的 SaaS。

    重點特色：

    - **您的設備，您的數據：** 在您想要的任何地方（Mac、Linux、VPS）運行 Gateway，並將
      工作空間和會話歷史保留在本地。
    - **真實的頻道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，
      加上支援平台上的行動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並支援每個代理的路由
      和故障轉移。
    - **僅限本地選項：** 運行本地模型，因此如果您願意，**所有數據都可以保留在您的設備上**。
    - **多代理路由：** 為每個頻道、帳戶或任務設置獨立的代理，每個代理都有自己的
      工作空間和預設值。
    - **開源且可駭改：** 檢查、擴展和自我託管，沒有供應商鎖定。

    文檔：[Gateway](/en/gateway)、[Channels](/en/channels)、[Multi-agent](/en/concepts/multi-agent)、
    [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="我剛設置好 - 首先該做什麼？">
    很好的入門專案：

    - 建立一個網站（WordPress、Shopify 或一個簡單的靜態網站）。
    - 製作行動應用程式原型（大綱、畫面、API 規劃）。
    - 整理檔案和資料夾（清理、重新命名、標記）。
    - 連接 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將其分解為幾個階段並
    使用子代理進行並行工作時，效果最佳。

  </Accordion>

  <Accordion title="OpenClaw 的前五大日常使用案例是什麼？">
    日常的勝利通常如下：

    - **個人簡報：** 您關注的收件匣、行事曆和新聞摘要。
    - **研究與草擬：** 快速研究、摘要，以及電子郵件或文件的初稿。
    - **提醒與追蹤：** 由 cron 或 heartbeat 驅動的提醒與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集資料和重複的網頁任務。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取回結果。

  </Accordion>

  <Accordion title="OpenClaw 能否協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格撰寫？">
    在 **研究、篩選和草擬** 方面可以。它可以掃描網站、建立候選名單、
    摘要潛在客戶，並撰寫外聯或廣告文案的草稿。

    針對 **外聯或廣告活動**，請讓人類參與其中。避免垃圾郵件，遵守當地法律和
    平台政策，並在寄送前審查所有內容。最安全的模式是讓
    OpenClaw 草擬，由您審核批准。

    文件：[Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="與 Claude Code 相比，OpenClaw 在網頁開發方面有什麼優勢？">
    OpenClaw 是一個 **個人助理** 和協調層，並非 IDE 的替代品。請使用
    Claude Code 或 Codex 在 repo 中進行最快的直接編碼迴圈。當您
    需要持久記憶、跨裝置存取和工具編排時，請使用 OpenClaw。

    優勢：

    - **跨會話的持久記憶 + 工作區**
    - **多平台存取** (WhatsApp, Telegram, TUI, WebChat)
    - **工具編排** (瀏覽器、檔案、排程、hooks)
    - **永遠在線的 Gateway** (在 VPS 上執行，從任何地方互動)
    - 針對本機瀏覽器/螢幕/相機/執行的 **節點 (Nodes)**

    展示： [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在保持儲存庫乾淨的同時自訂技能？">
    使用受管理的覆寫而非編輯儲存庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增資料夾）。優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此受管理的覆寫仍會勝過內建技能，而無需觸及 git。如果您需要全域安裝該技能，但僅對部分代理程式可見，請將共用副本保留在 `~/.openclaw/skills` 中，並使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可見性。只有值得上游合併的編輯才應保留在儲存庫中並作為 PR 提交。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增額外目錄（優先順序最低）。預設優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills` 中，OpenClaw 在下一次會話中會將其視為 `<workspace>/skills`。如果該技能應僅對特定代理程式可見，請將其與 `agents.defaults.skills` 或 `agents.list[].skills` 搭配使用。
  </Accordion>

  <Accordion title="如何針對不同的任務使用不同的模型？">
    目前支援的模式有：

    - **Cron jobs**：隔離的作業可以為每個作業設定 `model` 覆寫。
    - **Sub-agents**：將任務路由到具有不同預設模型的獨立代理程式。
    - **On-demand switch**：使用 `/model` 隨時切換目前的工作階段模型。

    請參閱 [Cron jobs](/en/automation/cron-jobs)、[Multi-Agent Routing](/en/concepts/multi-agent) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我該如何將其卸載？">
    對於長時間或並行任務，請使用 **sub-agents**。Sub-agents 在自己的工作階段中運行，
    返回摘要，並保持您的主要聊天回應靈敏。

    要求您的機器人「為此任務生成一個 sub-agent」或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway 目前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和 sub-agents 都會消耗 tokens。如果關心成本，請透過 `agents.defaults.subagents.model` 為 sub-agents 設定更便宜的模型。

    文件：[Sub-agents](/en/tools/subagents)、[Background Tasks](/en/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的執行緒綁定子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保持在該綁定的會話上。

    基本流程：

    - 使用 `thread: true` 搭配 `sessions_spawn` 來生成（並可選擇搭配 `mode: "session"` 以進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消焦點。
    - 使用 `/unfocus` 分離執行緒。

    所需設定：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[子代理](/en/tools/subagents)、[Discord](/en/channels/discord)、[設定參考](/en/gateway/configuration-reference)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新卻發送到錯誤的位置或從未發佈。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式的子代理傳送在存在綁定執行緒或對話路由時，會優先使用該路由。
    - 如果完成來源僅攜帶頻道，OpenClaw 會回退到請求者會話的儲存路由 (`lastChannel` / `lastTo` / `lastAccountId`)，以便直接傳送仍能成功。
    - 如果既不存在綁定路由也不存在可用的儲存路由，直接傳送可能會失敗，結果會回退到排隊的會話傳送，而不是立即發佈到聊天。
    - 無效或過期的目標仍可能強制回退到佇列或導致最終傳送失敗。
    - 如果子代理的最後一個可見助理回覆確切是靜默令牌 `NO_REPLY` / `no_reply`，或是確切的 `ANNOUNCE_SKIP`，OpenClaw 會刻意抑制公告，而不是發佈過舊的早期進度。
    - 如果子代理在僅進行工具呼叫後超時，公告可能會將其折疊為簡短的進度摘要，而不是重播原始工具輸出。

    除錯：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[子代理](/en/tools/subagents)、[背景任務](/en/automation/tasks)、[會話工具](/en/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒沒有觸發。我應該檢查什麼？">
    Cron 在閘道程序內運行。如果閘道未持續運行，
    排程的工作將不會執行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查閘道是否 24/7 運行 (無睡眠/重新啟動)。
    - 驗證工作的時區設定 (`--tz` 與主機時區的對比)。

    除錯：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron 工作](/en/automation/cron-jobs)、[自動化與任務](/en/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有發送任何內容到頻道。為什麼？">
    首先檢查傳遞模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期有外部訊息。
    - 遺失或無效的公告目標 (`channel` / `to`) 表示執行器跳過了出站傳遞。
    - 頻道認證失敗 (`unauthorized`, `Forbidden`) 表示執行器嘗試傳遞，但憑證阻擋了它。
    - 靜默的隔離結果 (僅 `NO_REPLY` / `no_reply`) 被視為故意不可傳遞，因此執行器也會抑制排隊的後備傳遞。

    對於隔離的 cron 任務，執行器擁有最終傳遞權。預期 Agent 會返回純文字摘要供執行器發送。`--no-deliver` 將該結果保留在內部；它不允許 Agent 改為直接使用 message 工具發送。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/en/automation/cron-jobs), [Background Tasks](/en/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而不是重複排程。

    隔離的 cron 可以保留執行時模型交接，並在活動執行拋出 `LiveSessionModelSwitchError` 時重試。重試會保留切換後的提供者/模型，並且如果切換攜帶了新的認證設定檔覆寫，cron 也會在重試前保留該設定。

    相關選擇規則：

    - Gmail hook 模型覆寫在適用時優先。
    - 然後是每個任務的 `model`。
    - 然後是任何儲存的 cron-session 模型覆寫。
    - 然後是正常的 Agent/預設模型選擇。

    重試迴圈是有界的。在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/en/automation/cron-jobs), [cron CLI](/en/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝技能？">
    使用原生的 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能介面在 Linux 上無法使用。
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

    原生的 `openclaw skills install` 會寫入至目前使用的工作區 `skills/`
    目錄。僅當您想要發佈或
    同步您自己的技能時，才需要安裝獨立的 `clawhub` CLI。若要在代理程式之間共用安裝，請將技能置於
    `~/.openclaw/skills` 之下，並在您想要限制哪些代理程式能看到它時，使用 `agents.defaults.skills` 或
    `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以排程執行任務或在背景持續執行嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後仍會保留）。
    - **Heartbeat** 用於「主要會話」的定期檢查。
    - **Isolated jobs** 用於發布摘要或傳送訊息至聊天的自主代理程式。

    文件：[Cron jobs](/en/automation/cron-jobs)、[Automation & Tasks](/en/automation)、
    [Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行 Apple macOS 專用的技能嗎？">
    不能直接執行。macOS 技能受到 `metadata.openclaw.os` 加上所需二進位檔案的限制，而且只有當技能在 **Gateway 主機** 上符合資格時，才會出現在系統提示詞中。在 Linux 上，除非您覆寫限制，否則 `darwin` 專用的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔案的地方執行 Gateway，然後從 Linux 以 [遠端模式](#gateway-ports-already-running-and-remote-mode) 連線，或透過 Tailscale 連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在所需的二進位檔案時，OpenClaw 可以將 macOS 專用技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示詞中批准「Always Allow」會將該指令加入允許清單。

    **選項 C - 透過 SSH 代理 macOS 二進位檔案（進階）。**
    將 Gateway 保留在 Linux 上，但讓所需的 CLI 二進位檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

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

  <Accordion title="您是否有 Notion 或 HeyGen 整合功能？">
    目前尚未內建。

    選項：

    - **自訂技能 / 外掛**：最適合可靠的 API 存取（Notion 和 HeyGen 都有 API）。
    - **瀏覽器自動化**：無需編寫程式碼即可運作，但速度較慢且較不穩定。

    如果您想為每位客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每位客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理程式在工作階段開始時擷取該頁面。

    如果您想要原生的整合功能，請開啟功能請求或建構一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放在現用工作區 `skills/` 目錄中。若要跨代理程式共用技能，請將它們放在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有部分代理程式應該能看到共用的安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能期望透過 Homebrew 安裝的二進位檔案；在 Linux 上這代表 Linuxbrew（請參閱上方的 Homebrew Linux 常見問題條目）。請參閱 [技能](/en/tools/skills)、[技能設定](/en/tools/skills-config) 和 [ClawHub](/en/tools/clawhub)。

  </Accordion>

  <Accordion title="如何使用我現有已登入的 Chrome 與 OpenClaw？">
    使用內建的 `user` 瀏覽器設定檔，它會透過 Chrome DevTools MCP 連線：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑是主機本機的。如果 Gateway 在其他地方執行，請在瀏覽器機器上執行節點主機，或改用遠端 CDP。

    目前在 `existing-session` / `user` 上的限制：

    - 動作是由參照驅動的，而不是由 CSS 選擇器驅動
    - 上傳需要 `ref` / `inputRef`，且目前一次僅支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍然需要受管理的瀏覽器或原始 CDP 設定檔

  </Accordion>
</AccordionGroup>

## 沙盒與記憶體

<AccordionGroup>
  <Accordion title="有沒有專門的沙盒文件？">
    有的。請參閱 [沙盒](/en/gateway/sandboxing)。關於 Docker 特定的設定（Docker 中的完整閘道或沙盒映像），請參閱 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限 - 如何啟用完整功能？">
    預設映像以安全為優先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建的瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依性內建至映像中。
    - 透過內建的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已持續保存。

    文件：[Docker](/en/install/docker), [瀏覽器](/en/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持 DM 私密，但讓群組公開/使用沙盒，且只用一個 Agent 嗎？">
    可以 - 如果您的私人流量是 **DM** 而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道階段（非主要金鑰）在 Docker 中執行，而主要 DM 階段保持在主機上。然後透過 `tools.sandbox.tools` 限制沙盒階段中可用的工具。

    設定逐步解說 + 範例設定：[群組：個人 DM + 公開群組](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    關鍵設定參考：[閘道設定](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定到沙箱中？">
    將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]` (例如 `"/home/user/src:/src:ro"`)。全域與個別代理的綁定會合併；當設定 `scope: "shared"` 時，會忽略個別代理的綁定。對於任何敏感內容，請使用 `:ro`，並記住綁定會繞過沙箱檔案系統的防護。

    OpenClaw 會根據標準化路徑以及透過最深層現有祖先解析的規範路徑，來驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父目錄逃逸仍會失敗並關閉，且在解析符號連結後仍會套用允許的根目錄檢查。

    請參閱 [沙箱隔離](/en/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs 工具策略 vs 提權](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以了解範例與安全事項。

  </Accordion>

  <Accordion title="記憶體如何運作？">
    OpenClaw 的記憶體只是代理工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的策展長期筆記 (僅限主要/私人工作階段)

    OpenClaw 還會執行 **靜默預壓縮記憶體排清**，以提醒模型
    在自動壓縮之前寫入持久化的筆記。這僅在工作區
    可寫入時執行 (唯讀沙箱會跳過)。請參閱 [記憶體](/en/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體總是忘記事情。我該如何讓它記住？">
    要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md` 中，
    短期上下文則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有幫助；
    它會知道該怎麼做。如果它一直忘記，請驗證 Gateway 是否在每次執行時使用相同的工作區。

    文件：[記憶體](/en/concepts/memory)、[代理工作區](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有哪些限制？">
    記憶檔案儲存在磁碟上，會持續保存直到您刪除它們。限制取決於您的
    儲存空間，而不是模型。**會話上下文** 仍然受到模型
    上下文視窗的限制，因此長對話可能會被壓縮或截斷。這就是為什麼
    記憶搜尋存在的原因——它只將相關的部分拉回上下文中。

    文件：[記憶](/en/concepts/memory)、[上下文](/en/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋需要 OpenAI API 金鑰嗎？">
    只有當您使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋聊天/完成功能，
    但**並不**授予嵌入存取權限，因此 **透過 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語意記憶搜尋沒有幫助。OpenAI 嵌入
    仍然需要真實的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，當 OpenClaw
    可以解析 API 金鑰時（身分驗證設定檔、`models.providers.*.apiKey` 或環境變數），它會自動選擇提供者。
    如果解析到 OpenAI 金鑰，它優先選擇 OpenAI；否則如果解析到 Gemini 金鑰，則選擇 Gemini，
    接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶
    搜尋將保持停用狀態，直到您進行設定。如果您已設定並存在本機模型路徑，OpenClaw
    優先選擇 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您寧願保持本地化，請設定 `memorySearch.provider = "local"`（並可選地
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
    模型——詳見 [記憶](/en/concepts/memory) 的設定細節。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有資料都會儲存在本機嗎？">
    不會 —— **OpenClaw 的狀態是本機的**，但 **外部服務仍會看到您發送給它們的內容**。

    - **預設為本機：** sessions、記憶體檔案、配置和工作區位於 Gateway 主機上
      (`~/.openclaw` + 您的工作區目錄)。
    - **必要時為遠端：** 您發送給模型提供者 (Anthropic/OpenAI/等) 的訊息會傳送至
      其 API，而聊天平台 (WhatsApp/Telegram/Slack/等) 會在其
      伺服器上儲存訊息資料。
    - **您可以掌控範圍：** 使用本機模型可將提示保留在您的機器上，但通道
      流量仍會經過通道的伺服器。

    相關：[Agent workspace](/en/concepts/agent-workspace), [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設：`~/.openclaw`）：

    | 路徑                                                            | 用途                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要配置 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到身分驗證設定檔中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身分驗證設定檔（OAuth、API 金鑰，以及可選的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 可選的檔案支援秘密載荷，用於 `file` SecretRef 提供者 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已被清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 中繼資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶體檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行配置（預設：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md` (當 `MEMORY.md` 不存在時的舊版後備 `memory.md`)、
      `memory/YYYY-MM-DD.md`、選用 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)**: 配置、頻道/提供者狀態、認證設定檔、工作階段、記錄檔，
      以及共享技能 (`~/.openclaw/skills`)。

    預設 workspace 為 `~/.openclaw/workspace`，可透過以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了，請確認 Gateway 每次啟動時都使用相同的
    workspace (並記住：遠端模式使用的是 **gateway 主機的**
    workspace，而不是您的本地筆記型電腦)。

    提示：如果您想要持久的行為或偏好設定，請要求機器人將其**寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參閱 [Agent workspace](/en/concepts/agent-workspace) 和 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放入**私人** git 儲存庫並備份到某個
    私人位置 (例如 GitHub 私有儲存庫)。這會擷取記憶體 + AGENTS/SOUL/USER
    檔案，並讓您稍後還原助理的「心智」。

    **請勿**提交 `~/.openclaw` 下的任何內容 (憑證、工作階段、權杖或加密的秘密資料承載)。
    如果您需要完整還原，請分別備份 workspace 和 state 目錄
    (請參閱上述移轉問題)。

    文件: [Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全解除安裝 OpenClaw？">請參閱專屬指南: [Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作區之外工作嗎？">
    可以。工作區是**預設的 cwd**（當前工作目錄）和記憶體錨點，而不是一個嚴格的沙箱。
    相對路徑在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或每個代理的沙箱設定。如果您
    希望某個儲存庫成為預設工作目錄，請將該代理的
    `workspace` 指向儲存庫根目錄。OpenClaw 儲存庫只是原始碼；請將
    工作區分開，除非您故意希望代理在其中工作。

    範例（儲存庫作為預設 cwd）：

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
    Session 狀態由**gateway host**（閘道主機）擁有。如果您處於遠端模式，您關心的 session store 位於遠端機器上，而不是您的本地筆記型電腦上。請參閱 [Session 管理](/en/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取可選的 **JSON5** 設定（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它將使用安全預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，現在沒有東西在監聽 / UI 顯示未授權'>
    非迴圈綁定**需要一個有效的閘道驗證路徑**。實務上這意味著：

    - 共用金鑰驗證：token 或密碼
    - `gateway.auth.mode: "trusted-proxy"` 位於正確設定的非迴圈身分感知反向代理後方

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

    備註：

    - `gateway.remote.token` / `.password` **不會**單獨啟用本機閘道驗證。
    - 只有在 `gateway.auth.*` 未設定的情況下，本機呼叫路徑才能將 `gateway.remote.*` 作為後備。
    - 對於密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但無法解析，解析將會失敗關閉 (沒有遠端後備遮罩)。
    - 使用共用金鑰的控制 UI 設定透過 `connect.params.auth.token` 或 `connect.params.auth.password` (儲存在 app/UI 設定中) 進行驗證。承載身分的模式 (例如 Tailscale Serve 或 `trusted-proxy`) 則改用請求標頭。請避免將共用金鑰放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，相同主機的迴圈反向代理仍然**不會**滿足受信任代理驗證。受信任代理必須是設定的非迴圈來源。

  </Accordion>

  <Accordion title="為什麼現在在 localhost 需要一個 token？">
    OpenClaw 預設強制執行閘道驗證，包括回環。在正常的預設路徑中，這意味著 token 驗證：如果未設定顯式的驗證路徑，閘道啟動時會解析為 token 模式並自動生成一個，將其儲存至 `gateway.auth.token`，因此 **本機 WS 用戶端必須進行驗證**。這會阻擋其他本機程序呼叫閘道。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，對於非回環的具身分識別感知的反向代理，`trusted-proxy`）。如果您**真的**想要開放回環，請在您的設定中明確設定 `gateway.auth.mode: "none"`。Doctor 隨時可以為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    閘道會監看設定並支援熱重載：

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

    - `off`：隱藏標語文字，但保留橫幅標題/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪換有趣的/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定 env `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（與網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 取決於您選擇的
    提供者：

    - 支援 API 的提供者，例如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily，需要其標準的 API 金鑰設定。
    - Ollama 網路搜尋不需要金鑰，但它使用您設定的 Ollama 主機並且需要 `ollama signin`。
    - DuckDuckGo 不需要金鑰，但這是一個非官方的 HTML 整合。
    - SearXNG 不需要金鑰/自行託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
    環境變數替代方案：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`，或 `MINIMAX_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG: `SEARXNG_BASE_URL`
    - Tavily: `TAVILY_API_KEY`

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
    舊版 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應用於新的設定。
    Firecrawl 網路擷取備援設定位於 `plugins.entries.firecrawl.config.webFetch.*` 下。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的擷取備援提供者。目前內建的提供者是 Firecrawl。
    - Daemon 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[網路工具](/en/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清空了我的配置。如何恢復並避免這種情況？">
    `config.apply` 會替換**整個配置**。如果您發送部分對象，其他所有內容都會被移除。

    恢復方法：

    - 從備份還原（git 或複製的 `~/.openclaw/openclaw.json`）。
    - 如果沒有備份，請重新執行 `openclaw doctor` 並重新配置通道/模型。
    - 如果這是意外發生的，請提交錯誤報告並附上您最後的已知配置或任何備份。
    - 本地編碼代理通常可以從日誌或歷史記錄中重建可用的配置。

    避免方法：

    - 使用 `openclaw config set` 進行小幅更改。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確定確切路徑或字段形狀時，請先使用 `config.schema.lookup`；它會返回一個淺層架構節點以及用於深入檢查的直接子項摘要。
    - 使用 `config.patch` 進行部分 RPC 編輯；僅將 `config.apply` 用於完整的配置替換。
    - 如果您在代理運行中使用僅限所有者的 `gateway` 工具，它仍將拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入操作（包括標準化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文檔：[配置](/en/cli/config)、[設定](/en/cli/configure)、[診斷](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我如何在不同設備上運行中央 Gateway 和專門的 workers？">
    常見的模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **nodes** 和 **agents**：

    - **Gateway (中央)：** 擁有通道（Signal/WhatsApp）、路由和會話。
    - **Nodes (設備)：** Mac/iOS/Android 作為外設連接並暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **Agents (workers)：** 用於特殊角色的獨立大腦/工作區（例如 "Hetzner ops"、"Personal data"）。
    - **Sub-agents：** 當您需要並行處理時，從主 agent 產生背景工作。
    - **TUI：** 連接到 Gateway 並切換 agents/sessions。

    文件：[Nodes](/en/nodes)、[Remote access](/en/gateway/remote)、[Multi-Agent Routing](/en/concepts/multi-agent)、[Sub-agents](/en/tools/subagents)、[TUI](/en/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式 (headless) 執行嗎？">
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

    預設是 `false` (headful)。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [Browser](/en/tools/browser)。

    無頭模式使用 **相同的 Chromium 引擎**，並且適用於大多數自動化（表單、點擊、爬取、登入）。主要差異：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用螢幕截圖）。
    - 有些網站對無頭模式下的自動化要求更嚴格（CAPTCHAs、反機器人）。
      例如，X/Twitter 經常阻擋無頭模式的會話。

  </Accordion>

  <Accordion title="我如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱 [Browser](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端閘道和節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、Gateway 和節點之間傳遞？">
    Telegram 訊息由 **gateway（網關）** 處理。Gateway 運行 Agent，並且僅在需要節點工具時，才透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到入站提供商流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在常駐主機（VPS/家用伺服器）上運行 Gateway。
    2. 將 Gateway 主機和您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可存取（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式並以 **Remote over SSH** 模式（或直接 tailnet）連接，
       以便註冊為節點。
    5. 在 Gateway 上批准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接；節點透過 Gateway WebSocket 連接。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅配對您信任的設備，並檢閱 [安全性](/en/gateway/security)。

    文件：[節點](/en/nodes)、[Gateway 協定](/en/gateway/protocol)、[macOS 遠端模式](/en/platforms/mac/remote)、[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回覆。現在該怎麼辦？">
    檢查基本項目：

    - Gateway 是否正在執行：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - Channel 健康狀態：`openclaw channels status`

    然後驗證認證和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH tunnel 連線，請確認本地 tunnel 已啟動並指向正確的連接埠。
    - 確認您的允許名單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/en/gateway/tailscale), [遠端存取](/en/gateway/remote), [Channels](/en/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本地 + VPS）？">
    可以。沒有內建的「bot 對 bot」橋接器，但您可以透過幾種可靠的方式進行連接：

    **最簡單：**使用兩個機器人都能存取的普通聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像往常一樣回覆。

    **CLI 橋接器（通用）：**執行一個腳本，使用 `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標是另一個機器人正在監聽的聊天。如果一個機器人在遠端 VPS 上，請將您的 CLI 指向該遠端 Gateway
    （透過 SSH/Tailscale，請參閱[遠端存取](/en/gateway/remote)）。

    範例模式（從可以連到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，避免兩個機器人無限循環（僅限提及、頻道
    允許名單，或「不回覆機器人訊息」規則）。

    文件：[遠端存取](/en/gateway/remote), [Agent CLI](/en/cli/agent), [Agent send](/en/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理都有自己的工作區、模型預設值
    和路由。這是常見的設定，比為每個代理運行一個 VPS 更便宜且更簡單。

    只有當您需要強隔離（安全邊界）或非常不想共享的不同配置時，才使用分開的 VPS。
    否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與從 VPS 使用 SSH 相比，在我的個人筆記型電腦上使用節點有什麼好處？">
    有的——節點是從遠端 Gateway 存取您的筆記型電腦的首選方式，而且它們
    提供的不僅僅是 shell 存取權限。Gateway 運行在 macOS/Linux（Windows 透過 WSL2）上，並且
    佔用資源很少（一個小型 VPS 或 Raspberry Pi 級別的設備就可以；4 GB RAM 綽綽有餘），因此常見的
    設定是一個永遠在線的主機加上您的筆記型電腦作為一個節點。

    - **不需要連入 SSH。** 節點會向外連接到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** 在該筆記型電腦上，`system.run` 受到節點允許清單/核准的限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還暴露了 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或者透過 Chrome MCP 附加到主機上的本機 Chrome。

    SSH 適用於臨時的 shell 存取，但對於持續的代理工作流程和
    裝置自動化來說，節點更簡單。

    文件：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)、[瀏覽器](/en/tools/browser)。

  </Accordion>

  <Accordion title="節點是否執行閘道服務？">
    不會。除非您故意執行獨立的設定檔（請參閱[多重閘道](/en/gateway/multiple-gateways)），否則每個主機應該只執行**一個閘道**。節點是連接到閘道的外設（iOS/Android 節點，或選單列應用程式中的 macOS「節點模式」）。若要管理無介面節點主機和 CLI 控制，請參閱[節點主機 CLI](/en/cli/node)。

    針對 `gateway`、`discovery` 和 `canvasHost` 的變更，需要完全重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式可以套用設定？">
    有。

    - `config.schema.lookup`：在寫入前檢查一個設定子樹、其淺層架構節點、相符的 UI 提示以及直接子摘要
    - `config.get`：取得目前的快照 + 雜湊
    - `config.patch`：安全的部分更新（最適用於大多數 RPC 編輯）
    - `config.apply`：驗證 + 取代完整設定，然後重新啟動
    - 僅限擁有者的 `gateway` 執行時期工具仍拒絕重寫 `tools.exec.ask` / `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

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

  <Accordion title="如何設定 VPS 上的 Tailscale 並從我的 Mac 連線？">
    最低步驟：

    1. **安裝 + 登入 VPS**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **安裝 + 登入您的 Mac**
       - 使用 Tailscale 應用程式並登入相同的 tailnet。
    3. **啟用 MagicDNS (建議)**
       - 在 Tailscale 管理主控台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您不需要 SSH 就想使用 Control UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這樣可以將閘道綁定到 loopback，並透過 Tailscale 暴露 HTTPS。請參閱 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連線到遠端閘道 (Tailscale Serve)？">
    Serve 會暴露 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連線。

    建議設定：

    1. **確保 VPS 和 Mac 位於相同的 tailnet 上**。
    2. **以遠端模式使用 macOS 應用程式** (SSH 目標可以是 tailnet 主機名稱)。
       應用程式將會建立 Gateway 通道的隧道並以節點身分連線。
    3. **在閘道上批准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/en/gateway/protocol)、[Discovery](/en/gateway/discovery)、[macOS remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該安裝在第二台筆記型電腦上，還是只新增一個節點？">
    如果您在第二台筆記型電腦上只需要 **本地工具** (螢幕/相機/exec)，請將其新增為
    **節點**。這樣可以保持單一 Gateway 並避免重複的設定。本地節點工具目前僅限 macOS，但我們計劃將其擴展到其他作業系統。

    只有當您需要 **嚴格隔離** 或兩個完全獨立的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)、[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數和 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 來自當前工作目錄的 `.env`
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

    請參閱 [/environment](/en/help/environment) 以了解完整的優先順序和來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但環境變數不見了。該怎麼辦？">
    兩個常見的修復方法：

    1. 將缺失的金鑰放入 `~/.openclaw/.env`，這樣即使服務未繼承您的 shell 環境，也能載入它們。
    2. 啟用 shell 匯入（可選的便利功能）：

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

    這會執行您的登入 shell 並僅匯入缺失的預期金鑰（絕不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示 "Shell env: off."，為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**。「Shell env: off」
    **並不**代表您的環境變數遺失——這只是表示 OpenClaw 不會自動載入
    您的登入 shell。

    如果 Gateway 作為服務 (launchd/systemd) 執行，它將不會繼承您的 shell
    環境。請透過以下其中一種方式修正：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell import (`env.shellEnv.enabled: true`)。
    3. 或將其加入您的 config `env` 區塊 (僅在遺失時適用)。

    然後重新啟動 gateway 並重新檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的 (也包括 `GH_TOKEN` / `GITHUB_TOKEN`)。
    請參閱 [/concepts/model-providers](/en/concepts/model-providers) 和 [/environment](/en/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="我如何開始一個新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/en/concepts/session)。
  </Accordion>

  <Accordion title="如果從不發送 /new，sessions 會自動重設嗎？">
    Sessions 可以在 `session.idleMinutes` 後過期，但這是 **預設停用的** (預設值為 **0**)。
    將其設定為正值以啟用閒置過期。啟用後，閒置期間結束後的 **下一則**
    訊息將為該聊天金鑰啟動一個新的 session id。
    這不會刪除逐字稿——它只是開啟一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法建立一個由 OpenClaw 實例組成的團隊（一個 CEO 和多個代理）？">
    可以，透過 **多代理路由** 和 **子代理**。您可以建立一個協調器代理和幾個擁有各自工作區和模型的工作者代理。

    不過話說回來，這最好被視為一個 **有趣的實驗**。這非常耗費 token，而且通常不如使用一個具有獨立會話的機器人來得有效率。我們設想的典型模式是您與一個機器人對話，並使用不同的會話進行平行工作。該機器人也可以在需要時生成子代理。

    文件：[多代理路由](/en/concepts/multi-agent)、[子代理](/en/tools/subagents)、[代理 CLI](/en/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文在任務中途被截斷了？我該如何防止？">
    會話上下文受到模型視窗的限制。長時間的對話、大型工具輸出或大量檔案都可能觸發壓縮或截斷。

    以下方法有幫助：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保留在工作區中，並要求機器人將其讀回。
    - 對於漫長或平行的任務使用子代理，以便保持主對話簡潔。
    - 如果這種情況經常發生，請選擇一個具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留安裝？">
    使用重置指令：

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

    - 如果入門流程偵測到現有的設定檔，也會提供 **重置** 選項。請參閱 [入門 (CLI)](/en/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發設定 + 憑證 + 會話 + 工作區)。

  </Accordion>

  <Accordion title='我遇到了「context too large」（上下文過大）錯誤 - 如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮** (保留對話但總結較舊的輪次)：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置** (為同一個 chat key 提供新的 session ID)：

      ```
      /new
      /reset
      ```

    如果持續發生：

    - 啟用或調整 **session pruning** (`agents.defaults.contextPruning`) 以修剪舊的工具輸出。
    - 使用具有更大上下文視窗的模型。

    文件：[壓縮](/en/concepts/compaction)、[Session pruning](/en/concepts/session-pruning)、[Session 管理](/en/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個供應商驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必要的
    `input`。這通常意味著 session 歷史記錄已過時或損壞（通常發生在長執行緒之後
    或工具/架構變更時）。

    解決方法：使用 `/new` (獨立訊息) 啟動一個新的 session。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30m** 執行一次（使用 OAuth 認證時為 **1h**）。調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（只有空行和 markdown
    標題如 `# Heading`），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案遺失，心跳仍會執行，由模型決定要執行什麼操作。

    每個代理的覆蓋設定使用 `agents.list[].heartbeat`。文件：[心跳](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」新增到 WhatsApp 群組？'>
    不需要。OpenClaw 在**您自己的帳號**上運行，因此如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被阻擋，直到您允許傳送者 (`groupPolicy: "allowlist"`)。

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
    選項 1（最快）：追蹤日誌並在群組中傳送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId` (或 `from`)，類似：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經設定/列入允許清單）：從設定檔列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/en/channels/whatsapp)、[Directory](/en/cli/directory)、[Logs](/en/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您設定了 `channels.whatsapp.groups` 但未設定 `"*"`，且該群組未被列入允許清單。

    請參閱 [Groups](/en/channels/groups) 和 [Group messages](/en/channels/group-messages)。

  </Accordion>

<Accordion title="群組/主題串是否與 DM 共用上下文？">私人聊天預設會折疊到主工作階段。群組/頻道有自己的工作階段金鑰，而 Telegram 主題 / Discord 主題串是獨立的工作階段。請參閱 [Groups](/en/channels/groups) 和 [Group messages](/en/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會話和記錄存儲在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多意味著並發的模型使用量越多。
    - **運維開銷：** 每個代理的身份驗證設定檔、工作區和通道路由。

    提示：

    - 為每個代理保留一個 **使用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增長，請清理舊的會話（刪除 JSONL 或存儲條目）。
    - 使用 `openclaw doctor` 來發現遺留的工作區和設定檔不匹配的情況。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天 (Slack) 嗎？該如何設定？">
    可以。使用 **多代理路由** 來執行多個獨立的代理，並根據
    通道/帳戶/對等節點路由傳入訊息。Slack 支援作為通道，並可以綁定到特定的代理。

    瀏覽器存取功能強大，但並非「人類能做的任何事都能做」——反機器人措施、CAPTCHA 和 MFA
    仍然可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 始終運作的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個代理 (bindings)。
    - 綁定到這些代理的 Slack 通道。
    - 根據需要透過 Chrome MCP 或節點使用本地瀏覽器。

    文件：[多代理路由](/en/concepts/multi-agent)、[Slack](/en/channels/slack)、
    [瀏覽器](/en/tools/browser)、[節點](/en/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定的任何內容：

    ```
    agents.defaults.model.primary
    ```

    模型被引用為 `provider/model` (範例: `openai/gpt-5.4`)。如果您省略提供者，OpenClaw 首先會嘗試別名，然後是針對該特定模型 ID 的唯一設定提供者匹配，只有在那之後才會退回到已設定的預設提供者，作為一種已棄用的相容性路徑。如果該提供者不再公開已設定的預設模型，OpenClaw 將退回到第一個已設定的提供者/模型，而不是顯示過時的已移除提供者預設值。您仍應**明確**設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦哪種模型？">
    **推薦預設值：** 使用您提供者堆疊中最強大的最新世代模型。
    **對於啟用工具或非受信任輸入的代理程式：** 優先考慮模型強度而非成本。
    **對於例行/低風險的聊天：** 使用較便宜的備用模型並根據代理程式角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/en/providers/minimax) 和
    [本地模型](/en/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**負擔得起的最佳模型**，並對於例行聊天或摘要使用較便宜的模型。您可以根據代理程式路由模型，並使用子代理程式來並行處理長任務 (每個子代理程式都會消耗 token)。請參閱 [Models](/en/concepts/models) 和
    [Sub-agents](/en/tools/subagents)。

    嚴重警告：較弱/過度量化的模型更容易受到提示注入和不安全行為的影響。請參閱 [Security](/en/gateway/security)。

    更多背景資訊：[Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定檔的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **模型** 欄位。避免完全取代設定檔。

    安全選項：

    - `/model` 在聊天中（快速，僅限當前會話）
    - `openclaw models set ...`（僅更新模型設定）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算取代整個設定檔，否則請避免使用部分物件進行 `config.apply`。
    進行 RPC 編輯時，請先使用 `config.schema.lookup` 檢查，並優先使用 `config.patch`。查找的載荷會提供正規化路徑、淺層結構描述文件/約束以及直接子項摘要。
    以進行部分更新。
    如果您不慎覆寫了設定檔，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[Models](/en/concepts/models)、[Configure](/en/cli/configure)、[Config](/en/cli/config)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管的模型 (llama.cpp, vLLM, Ollama) 嗎？">
    可以。Ollama 是本地模型最簡單的途徑。

    最快的設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 下載一個本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您同時需要雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    注意事項：

    - `Cloud + Local` 讓您可以同時使用雲端模型和您的本地 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 的雲端模型不需要本地下載
    - 如需手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：較小或高度量化的模型更容易受到提示詞注入的攻擊。對於任何可以使用工具的機器人，我們強烈建議使用**大型模型**。如果您仍想使用小型模型，請啟用沙盒機制和嚴格的工具允許清單。

    文件：[Ollama](/en/providers/ollama)、[本地模型](/en/gateway/local-models)、
    [模型提供商](/en/concepts/model-providers)、[安全性](/en/gateway/security)、
    [沙盒機制](/en/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">- 這些部署可能會有所不同，並可能隨時間改變；沒有固定的提供商建議。 - 使用 `openclaw models status` 檢查每個閘道上的當前運行時設定。 - 對於安全敏感型或啟用工具的代理程式，請使用可用的最強大最新一代模型。</Accordion>

  <Accordion title="如何即時切換模型（無需重新啟動）？">
    將 `/model` 指令作為獨立訊息使用：

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

    `/model`（以及 `/model list`）會顯示一個精簡的、編號的選擇器。透過數字選擇：

    ```
    /model 3
    ```

    您也可以為提供者強制指定特定的身分驗證設定檔（每個階段）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示哪個代理程式處於作用中，正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個身分驗證設定檔。
    如果可用，它也會顯示已設定的提供者端點（`baseUrl`）和 API 模式（`api`）。

    **如何取消固定我用 @profile 設定的設定檔？**

    重新執行 `/model`，但**不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想回到預設值，請從 `/model` 中選取（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 確認哪個身分驗證設定檔處於作用中。

  </Accordion>

  <Accordion title="我可以將 GPT 5.2 用於日常任務，並將 Codex 5.3 用於編碼嗎？">
    可以。將其中一個設為預設，並根據需要切換：

    - **快速切換（每個階段）：** 日常任務使用 `/model gpt-5.4`，使用 Codex OAuth 編碼則使用 `/model openai-codex/gpt-5.4`。
    - **預設值 + 切換：** 將 `agents.defaults.model.primary` 設為 `openai/gpt-5.4`，然後在編碼時切換到 `openai-codex/gpt-5.4`（或反過來）。
    - **子代理程式：** 將編碼任務路由到具有不同預設模型的子代理程式。

    參見 [模型](/en/concepts/models) 和 [斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何為 GPT 5.4 配置快速模式？">
    使用會話切換開關或配置預設值均可：

    - **每次會話：** 當會話正在使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 時，發送 `/fast on`。
    - **模型預設值：** 將 `agents.defaults.models["openai/gpt-5.4"].params.fastMode` 設為 `true`。
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

    對於 OpenAI，快速模式會對應到支援的原生 Responses 請求上的 `service_tier = "priority"`。會話 `/fast` 會覆寫 beat 配置預設值。

    請參閱 [思考與快速模式](/en/tools/thinking) 和 [OpenAI 快速模式](/en/providers/openai#openai-fast-mode)。

  </Accordion>

  <Accordion title='為什麼我會看到「Model ... is not allowed」然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它將成為 `/model` 和任何
    會話覆寫值的 **允許清單 (allowlist)**。選擇一個不在該清單中的模型會返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會 **取代** 正常回覆被返回。解決方法：將模型新增至
    `agents.defaults.models`、移除允許清單，或從 `/model list` 中挑選一個模型。

  </Accordion>

  <Accordion title='為什麼我看到「Unknown model: minimax/MiniMax-M2.7」？'>
    這表示**未設定提供者**（找不到 MiniMax 提供者設定或驗證設定檔），所以無法解析模型。

    修復檢查清單：

    1. 升級至目前的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動閘道。
    2. 確認已設定 MiniMax（精靈或 JSON），或是 MiniMax 驗證資料存在於 env/auth 設定檔中，以便注入相符的提供者
       （`MINIMAX_API_KEY` 用於 `minimax`、`MINIMAX_OAUTH_TOKEN` 或儲存的 MiniMax
       OAuth 用於 `minimax-portal`）。
    3. 針對您的驗證路徑使用正確的模型 ID（區分大小寫）：
       `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed` 用於 API 金鑰
       設定，或 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` 用於 OAuth 設定。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選取（或在聊天中使用 `/model list`）。

    參閱 [MiniMax](/en/providers/minimax) 與 [模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 作為預設值，並將 OpenAI 用於複雜任務嗎？">
    可以。使用 **MiniMax 作為預設值**，並在需要時**依工作階段切換**模型。
    也就是說，後備機制是針對**錯誤**，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

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

    **選項 B：獨立的代理程式**

    - Agent A 預設值：MiniMax
    - Agent B 預設值：OpenAI
    - 依代理程式路由或使用 `/agent` 切換

    文件：[模型](/en/concepts/models)、[多代理程式路由](/en/concepts/multi-agent)、[MiniMax](/en/providers/minimax)、[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 附帶了一些預設簡寫（僅在模型存在於 `agents.defaults.models` 時才會套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果你設定了同名的別名，你的值將優先使用。

  </Accordion>

  <Accordion title="我要如何定義/覆寫模型捷徑（別名）？">
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

    然後 `/model sonnet`（或在支援時的 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="我要如何新增來自其他供應商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter（按 Token 付費；多種模型）：

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

    如果你引用了某個供應商/模型，但缺少所需的供應商金鑰，你將會收到執行時期的驗證錯誤（例如 `No API key found for provider "zai"`）。

    **新增代理後找不到供應商的 API 金鑰**

    這通常意味著 **新代理** 擁有一個空的驗證儲存區。驗證是每個代理獨立
    的，並儲存於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈期間設定驗證。
    - 或將 `auth-profiles.json` 從主要代理的 `agentDir` 複製到新代理的 `agentDir`。

    請勿在代理之間重複使用 `agentDir`；這會導致驗證/Session 衝突。

  </Accordion>
</AccordionGroup>

## 模型故障轉移與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移發生在兩個階段：

    1. **認證設定檔輪換**，在同一個供應商內進行。
    2. **模型後備**，切換到 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間適用於失敗的設定檔（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 仍能持續回應。

    速率限制桶包含的不僅僅是單純的 `429` 回應。OpenClaw 也將諸如 `Too many concurrent requests`、
    `ThrottlingException`、 `concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、 `resource exhausted` 等訊息，以及週期性
    的使用量視窗限制（`weekly/monthly limit reached`）視為值得進行故障轉移的
    速率限制。

    某些看起來像計費的回應並非 `402`，而某些 HTTP `402`
    回應也會保留在暫態桶中。如果供應商在 `401` 或 `403` 上傳回明確的計費文字，OpenClaw 仍可將其保留在
    計費通道中，但特定供應商的文字匹配器仍僅限於擁有它們的供應商
    （例如 OpenRouter `Key limit exceeded`）。如果 `402`
    訊息看起來像是可重試的使用量視窗或
    組織/工作區支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 會將其視為
    `rate_limit`，而非長期的計費停用。

    上下文溢出錯誤則有所不同：諸如
    `request_too_large`、 `input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 等特徵會保持在壓縮/重試路徑上，而不是推進模型
    後備。

    通用伺服器錯誤文字的範圍刻意比「任何包含 unknown/error 的內容」
    更狹隘。OpenClaw 確實會將供應商範圍的暫態形式（例如 Anthropic 單純的 `An unknown error occurred`、OpenRouter 單純的
    `Provider returned error`、像 `Unhandled stop reason:
    error`, JSON `api_error` 這類帶有暫態伺服器文字的停止原因錯誤
    （`internal server error`、 `unknown error, 520`、 `upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException`）視為
    值得故障轉移的超時/過載訊號，前提是供應商上下文相符。
    通用的內部後備文字（如 `LLM request failed with an unknown
    error.`）保持保守，不會自行觸發模型後備。

  </Accordion>

  <Accordion title='「找不到設定檔 anthropic:default 的認證資訊」是什麼意思？'>
    這表示系統嘗試使用認證設定檔 ID `anthropic:default`，但無法在預期的認證儲存庫中找到對應的認證資訊。

    **修復檢查清單：**

    - **確認認證設定檔的位置**（新版與舊版路徑）
      - 目前位置：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版位置：`~/.openclaw/agent/*`（由 `openclaw doctor` 進行遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 Shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能無法繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的代理程式**
      - 多代理程式設置意味著可能存在多個 `auth-profiles.json` 檔案。
    - **健全性檢查模型/認證狀態**
      - 使用 `openclaw models status` 來查看已設定的模型以及提供者是否已通過認證。

    **「找不到設定檔 anthropic 的認證資訊」修復檢查清單**

    這表示該次執行被鎖定為 Anthropic 認證設定檔，但 Gateway
    無法在其認證儲存庫中找到它。

    - **使用 Claude CLI**
      - 在 Gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **Gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的鎖定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您是在 Gateway 主機上執行指令**
      - 在遠端模式下，認證設定檔位於 Gateway 機器上，而不是您的筆記型電腦。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未配置 Google 憑證，您將看到 `No API key found for provider "google"`。

    解決方法：提供 Google 驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：工作階段記錄包含 **沒有簽章的思考區塊**（通常來自於
    中斷/部分串流）。Google Antigravity 要求思考區塊必須有簽章。

    解決方法：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽章的思考區塊。如果仍然出現，請啟動一個 **新的工作階段** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles：它們是什麼以及如何管理它們

相關：[/concepts/oauth](/en/concepts/oauth) (OAuth 流程、權杖儲存、多帳戶模式)

<AccordionGroup>
  <Accordion title="什麼是 auth profile？">
    Auth profile 是繫結到提供者的具名憑證記錄（OAuth 或 API 金鑰）。Profiles 位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的 profile IDs 是什麼？">
    OpenClaw 使用提供者前綴的 ID，例如：

    - `anthropic:default` （當不存在電子郵件身份時很常見）
    - `anthropic:<email>` 用於 OAuth 身份
    - 您選擇的自訂 ID （例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個身分驗證設定檔嗎？">
    可以。配置支援設定檔的可選元數據以及每個供應商的排序 (`auth.order.<provider>`)。這**不會**儲存機密；它會將 ID 對應到供應商/模式並設定輪換順序。

    如果設定檔處於短暫的**冷卻**（速率限制/逾時/驗證失敗）或較長的**停用**（計費/額度不足）狀態，OpenClaw 可能會暫時跳過該設定檔。要檢查此狀況，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻可以是特定於模型的。針對某個模型正在冷卻的設定檔，對於同一供應商下的兄弟模型仍然可用，然而計費/停用期間仍會封鎖整個設定檔。

    您也可以透過 CLI 設定**每個代理程式** 的順序覆寫（儲存在該代理程式的 `auth-profiles.json` 中）：

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

    若要驗證實際會嘗試的內容，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果儲存的設定檔未包含在明確順序中，探測會針對該設定檔回報 `excluded_by_auth_order`，而不是無聲地嘗試它。

  </Accordion>

  <Accordion title="OAuth 與 API 金鑰 - 有什麼區別？">
    OpenClaw 支援這兩者：

    - **OAuth** 通常利用訂閱存取權（如適用）。
    - **API 金鑰** 使用依 Token 計費。

    精靈明確支援 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 金鑰。

  </Accordion>
</AccordionGroup>

## 閘道：連接埠、「已在執行」以及遠端模式

<AccordionGroup>
  <Accordion title="閘道使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Runtime: running」但「RPC probe: failed」？'>
    因為「running」是**監控程式**（launchd/systemd/schtasks）的視角。RPC 探測則是 CLI 實際連接到 Gateway WebSocket 並呼叫 `status`。

    使用 `openclaw gateway status` 並信任以下這幾行：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（連接埠上實際綁定的項目）
    - `Last gateway error:`（常見的根本原因，即程序存活但連接埠未監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示的「Config (cli)」和「Config (service)」不同？'>
    您正在編輯一個配置檔案，而服務正在使用另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修復方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的同一個 `--profile` / 環境執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器（預設 `ws://127.0.0.1:18789`）來強制執行執行時鎖定。如果綁定失敗並顯示 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個實例正在監聽。

    修復方法：停止另一個實例，釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何以遠端模式執行 OpenClaw（用戶端連線到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向一個遠端 WebSocket URL，可選搭配共享金鑰的遠端認證資訊：

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

    說明：

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時才會啟動（或者您傳遞了覆寫旗標）。
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅是用戶端的遠端認證資訊；它們本身不會啟用本地 gateway 認證。

  </Accordion>

  <Accordion title='控制 UI 顯示「未授權」（或不斷重新連線）。該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不匹配。

    事實（來自程式碼）：

    - 控制 UI 將權杖保留在 `sessionStorage` 中，用於當前瀏覽器分頁會話和選定的閘道 URL，因此相同分頁的重新整理能持續運作，無需恢復長期存在的 localStorage 權杖持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道返回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以嘗試使用快取的裝置權杖進行一次有限的重試。
    - 該快取權杖重試現在會重複使用與裝置權杖一起儲存的快取已核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫端仍會保留其請求的範圍集，而不是繼承快取的範圍。
    - 在該重試路徑之外，連線驗證優先順序首先是明確的共用工時權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 啟動權杖範圍檢查具有角色前綴。內建啟動操作員允許清單僅滿足操作員請求；節點或其他非操作員角色仍需要在其自己的角色前綴下的範圍。

    修正方法：

    - 最快：`openclaw dashboard`（列印 + 複製儀表板 URL，嘗試開啟；如果是無介面模式，則顯示 SSH 提示）。
    - 如果您還沒有權杖：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 共用工時模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制 UI 設定中貼上匹配的工時。
    - Tailscale Serve 模式：確保已啟用 `gateway.auth.allowTailscale`，並且您正在開啟 Serve URL，而不是繞過 Tailscale 身分標頭的原始回送/tailnet URL。
    - 受信任代理模式：確保您是透過設定的非回送身分感知代理連線，而不是相同主機的回送代理或原始閘道 URL。
    - 如果在一次重試後不匹配仍然存在，請輪替/重新核准配對的裝置權杖：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪替呼叫說被拒絕，請檢查兩件事：
      - 配對裝置會話只能輪替它們**自己**的裝置，除非它們也有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫者當前的操作員範圍
    - 還是卡住了？執行 `openclaw status --all` 並依照 [疑難排解](/en/gateway/troubleshooting) 操作。請參閱 [儀表板](/en/web/dashboard) 以了解驗證詳細資訊。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但無法綁定且沒有任何監聽">
    `tailnet` 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），就無目標可供綁定。

    修正方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好使用 loopback；當您需要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不需要——一個 Gateway 可以執行多個訊息通道和代理。僅當您需要冗餘（例如：救援機器人）或強隔離時，才使用多個 Gateway。

    可以，但您必須將以下項目隔離：

    - `OPENCLAW_CONFIG_PATH`（個別實例設定）
    - `OPENCLAW_STATE_DIR`（個別實例狀態）
    - `agents.defaults.workspace`（工作區隔離）
    - `gateway.port`（唯一連接埠）

    快速設定（建議）：

    - 每個實例使用 `openclaw --profile <name> ...`（會自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔中設定唯一的 `gateway.port`（或針對手動執行傳遞 `--port`）。
    - 安裝個別設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='什麼是「無效的握手」/ 代碼 1008？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期收到的第一則訊息必須是 `connect` 框架。如果收到任何其他內容，它會以 **代碼 1008**（違反策略）關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`)，而不是使用 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或隧道移除了驗證標頭或發送了非 Gateway 的請求。

    快速修復：

    1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
    2. 不要在一般瀏覽器分頁中開啟 WS 連接埠。
    3. 如果開啟了驗證，請在 `connect` 框架中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    通訊協定細節：[Gateway protocol](/en/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與偵錯

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

    服務/監督程式日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log` (預設：`~/.openclaw/logs/...`; 設定檔使用 `~/.openclaw-<profile>/logs/...`)
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多資訊請參閱 [Troubleshooting](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以收回連接埠。請參閱 [Gateway](/en/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 - 我該如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2 (推薦)：** 閘道 執行於 Linux 內部。

    開啟 PowerShell，進入 WSL，然後重新啟動：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您從未安裝過該服務，請在前台啟動它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows (不推薦)：** 閘道 直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它 (無服務)，請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/en/platforms/windows)、[Gateway service runbook](/en/gateway)。

  </Accordion>

  <Accordion title="閘道 已啟動，但回覆從未送達。我應該檢查什麼？">
    先從快速的健康狀態掃描開始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證 未在 **gateway host** 上載入 (檢查 `models status`)。
    - 頻道配對/允許清單 阻擋了回覆 (檢查頻道設定 + 紀錄)。
    - WebChat/Dashboard 開啟時沒有使用正確的權杖。

    如果您是遠端連線，請確認 tunnel/Tailscale 連線已啟動，且
    Gateway WebSocket 是可連線的。

    文件：[Channels](/en/channels)、[Troubleshooting](/en/gateway/troubleshooting)、[Remote access](/en/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - 現在該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否擁有正確的權杖？ `openclaw dashboard`
    4. 如果是遠端連線，tunnel/Tailscale 連線是否已啟動？

    然後查看紀錄：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/en/web/dashboard)、[Remote access](/en/gateway/remote)、[Troubleshooting](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    從日誌和通道狀態開始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單有太多項目。OpenClaw 已經將內容修剪至 Telegram 限制並重試較少的指令，但仍需刪除部分選單項目。減少外掛/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於代理伺服器後面，請確認允許連出 HTTPS 且 DNS 對 `api.telegram.org` 正常運作。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/en/channels/telegram)、[通道疑難排解](/en/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可以連線且代理程式能夠執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看當前狀態。如果您預期在聊天
    通道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/en/web/tui)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="我該如何完全停止然後啟動 Gateway？">
    如果您已安裝該服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監管的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 在背景作為守護程序執行時，請使用此方法。

    如果您是在前景執行，請使用 Ctrl-C 停止，然後：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段中，於 **前景** 執行 gateway。

    如果您已安裝服務，請使用 gateway 指令。當您想要執行一次性、前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查日誌檔中的頻道驗證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    來自代理程式的輸出附件必須包含 `MEDIA:<path-or-url>` 行（獨佔一行）。請參閱 [OpenClaw assistant setup](/en/start/openclaw) 和 [Agent send](/en/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時檢查：

    - 目標頻道支援輸出媒體，且未被允許清單封鎖。
    - 檔案在供應商的大小限制內（圖片會調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制在工作區、temp/media-store 和沙箱驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送代理程式已可讀取的主機本機檔案，但僅限於媒體及安全的文件類型（圖片、音訊、視訊、PDF 和 Office 文件）。純文字和類似機密的檔案仍會被封鎖。

    參閱 [Images](/en/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全性和存取控制

<AccordionGroup>
  <Accordion title="讓 OpenClaw 接收傳入訊息（DM）是否安全？">
    將傳入的訊息（DM）視為不受信任的輸入。預設設定旨在降低風險：

    - 在支援訊息（DM）的頻道上，預設行為是**配對**（pairing）：
      - 未知的發送者會收到一組配對碼；機器人不會處理他們的訊息。
      - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每個頻道的待處理請求上限為 **3 個**；如果沒有收到配對碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放訊息（DM）需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以找出有風險的訊息（DM）政策。

  </Accordion>

  <Accordion title="提示詞注入（Prompt injection）是否只影響公開的機器人？">
    不是。提示詞注入涉及的是**不受信任的內容**，而不僅僅是誰可以傳送訊息給機器人。
    如果您的助理讀取外部內容（網路搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），這些內容可能包含試圖
    劫持模型的指令。即使**您是唯一的發送者**，這種情況也可能發生。

    最大的風險在於啟用工具時：模型可能會被誘騙
    而外洩內容或代表您呼叫工具。您可以透過以下方式降低影響範圍：

    - 使用唯讀或停用工具的「讀者」代理程式來總結不受信任的內容
    - 針對已啟用工具的代理程式，保持 `web_search` / `web_fetch` / `browser` 關閉
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件提取都會將提取的文字包裝在
      明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙盒機制和嚴格的工具允許清單

    詳細資訊：[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設置來說都是如此。使用獨立的帳號和電話號碼將機器人隔離
    可以在發生問題時縮小受影響的範圍。這也讓輪換憑證或
    撤銷存取權限變得更容易，且不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號存取權限，
    並在需要時再進行擴展。

    文件：[安全性](/en/gateway/security)、[配對](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主控制我的簡訊嗎？這樣安全嗎？">
    我們**不**建議讓它對您的個人訊息擁有完全自主權。最安全的模式是：

    - 將直接訊息 (DM) 保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的電話號碼或帳號**。
    - 讓它起草草稿，然後在**發送前進行審核**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以使用較便宜的模型來執行個人助理任務嗎？">可以，**前提是**代理程式僅用於聊天且輸入內容是受信任的。較低階層的模型 更容易受到指令劫持的影響，因此請避免在啟用工具的代理程式上使用 或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒中運行。請參閱 [安全性](/en/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知發送者傳送訊息給機器人且
    已啟用 `dmPolicy: "pairing"` 時才會傳送。單獨的 `/start` 不會產生代碼。

    檢查待處理的要求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許清單或為該帳號設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對如何運作？">
    不會。預設 WhatsApp 私訊策略是 **配對**。未知發送者只會收到配對碼，且其訊息 **不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確發送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：這是用來設定您的 **allowlist/owner**，以便允許您自己的私訊。它不用於自動發送。如果您在您的個人 WhatsApp 號碼上運行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在為該工作階段啟用 **verbose** 或 **reasoning** 時才會出現。

    在您看到訊息的聊天中修正：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很吵雜，請檢查 Control UI 中的工作階段設定並將 verbose 設定為 **inherit**。同時請確認您沒有在設定中使用在設定中將 `verboseDefault` 設定為 `on` 的機器人設定檔。

    文件：[Thinking and verbose](/en/tools/thinking)、[Security](/en/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任一訊息 **作為獨立訊息**（無斜線）：

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

    對於背景程序（來自 exec 工具），您可以要求代理執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [Slash commands](/en/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的 **standalone** 訊息傳送，但少數捷徑（如 `/status`）對於允許清單中的發送者也可在行內運作。

  </Accordion>

  <Accordion title='如何從 Telegram 發送 Discord 訊息？（「跨語境訊息被拒」）'>
    OpenClaw 預設會封鎖 **跨供應商** 訊息。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會傳送到 Discord。

    為代理啟用跨供應商訊息傳遞：

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

  <Accordion title='為什麼機器人似乎會「忽略」快速發送的訊息？'>
    佇列模式控制新訊息如何與正在執行的工作互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向目前的工作
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即導向，然後處理待辦項目
    - `interrupt` - 中止目前的執行並重新開始

    您可以新增像 `debounce:2s cap:25 drop:summarize` 這樣的選項給後續模式。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時 Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或將 Anthropic API 金鑰儲存在 auth profiles 中）會啟用驗證，但實際的預設模型取決於您在 `agents.defaults.model.primary` 中的設定（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這代表閘道無法在正在執行之代理的預期 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問，或是開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。
