---
summary: "關於 OpenClaw 設定、設定檔和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對真實環境設置（本地開發、VPS、多代理、OAuth/API 密鑰、模型故障轉移）的快速解答與更深入的疑難排解。如需運行時診斷，請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。如需完整的配置參考，請參閱 [配置](/zh-Hant/gateway/configuration)。

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

   執行即時閘道健康探測，包括支援時的通道探測
   （需要可到達的閘道）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕機，請改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱 [日誌記錄](/zh-Hant/logging) 與 [疑難排解](/zh-Hant/gateway/troubleshooting)。

6. **執行修復工具（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移配置/狀態並執行健康檢查。請參閱 [醫生](/zh-Hant/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向運行中的閘道請求完整快照（僅限 WS）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速入門與首次執行設置

<AccordionGroup>
  <Accordion title="我卡住了，解開困境的最快方法">
    使用一個能**看見您機器**的本地 AI 智慧體。這比在 Discord 上提問有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取儲存庫、執行指令、檢查日誌，並協助修復您的機器層級設定（PATH、服務、權限、認證檔案）。透過可駭客化 (git) 安裝方式，提供給它們**完整的原始碼檢出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 檢出**安裝 OpenClaw，因此智慧體可以讀取程式碼和文件，並推斷您執行的確切版本。您可以稍後透過不使用 `--install-method git` 重新執行安裝程式，隨時切換回穩定版本。

    提示：請智慧體**規劃並監督**修復過程（逐步進行），然後僅執行必要的指令。這樣可以保持變更微小且更容易稽核。

    如果您發現真正的錯誤或修復方法，請提出 GitHub issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（在尋求協助時分享輸出結果）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`: 閘道/智慧體健康狀況 + 基本設定的快速快照。
    - `openclaw models status`: 檢查提供者認證 + 模型可用性。
    - `openclaw doctor`: 驗證並修復常見的設定/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯迴圈：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安裝文件：[Install](/zh-Hant/install)、[Installer flags](/zh-Hant/install/installer)、[Updating](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat keeps skipping. What do the skip reasons mean?">
    常見的心跳跳過原因：

    - `quiet-hours`：超出設定的活躍時間 (active-hours) 範圍
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但僅包含空白/僅有標頭的骨架內容
    - `no-tasks-due`：`HEARTBEAT.md` 任務模式已啟用，但尚未到達任何任務間隔時間
    - `alerts-disabled`：所有心跳可見性均已停用（`showOk`、`showAlerts` 和 `useIndicator` 皆為關閉狀態）

    在任務模式下，只有在實際的心跳運行完成後才會推進預定時間戳。跳過的運行不會將任務標記為已完成。

    文件：[Heartbeat](/zh-Hant/gateway/heartbeat)、[Automation & Tasks](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Recommended way to install and set up OpenClaw">
    此程式庫建議從原始碼執行並使用入門引導：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    精靈也可以自動建構 UI 資產。完成入門引導後，您通常會在連接埠 **18789** 上執行 Gateway。

    從原始碼執行（貢獻者/開發者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    如果您尚未進行全域安裝，請透過 `pnpm openclaw onboard` 執行。

  </Accordion>

<Accordion title="How do I open the dashboard after onboarding?">精靈會在入門引導完成後立即使用乾淨（非權杖化）的儀表板 URL 開啟您的瀏覽器，並且也會在摘要中列印連結。請保持該分頁開啟；如果未啟動，請在同一台機器上複製並貼上列印出的 URL。</Accordion>

  <Accordion title="如何在本地主機與遠端對儀表板進行驗證？">
    **本地主機（同一台機器）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果它要求共用金鑰驗證，請將設定的權杖或密碼貼上至控制 UI 設定中。
    - 權杖來源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密碼來源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未設定共用金鑰，請使用 `openclaw doctor --generate-gateway-token` 產生權杖。

    **非本地主機：**

    - **Tailscale Serve**（建議）：保持繫結回送位址，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 為 `true`，身分標頭將滿足控制 UI/WebSocket 驗證（無需貼上共用金鑰，假設為受信任的閘道主機）；除非您刻意使用 private-ingress `none` 或 trusted-proxy HTTP 驗證，否則 HTTP API 仍需要共用金鑰驗證。
      來自同一個用戶端的不良並行 Serve 驗證嘗試會在失敗驗證限制器記錄它們之前進行序列化，因此第二次錯誤重試可能已經顯示 `retry later`。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`（或設定密碼驗證），開啟 `http://<tailscale-ip>:18789/`，然後在儀表板設定中貼上相符的共用金鑰。
    - **身分感知反向代理**：將閘道保留在非回送受信任代理之後，設定 `gateway.auth.mode: "trusted-proxy"`，然後開啟代理 URL。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。共用金鑰驗證仍透過 tunnel 套用；如果系統提示，請貼上設定的權杖或密碼。

    請參閱 [儀表板](/zh-Hant/web/dashboard) 和 [Web 介面](/zh-Hant/web) 以了解繫結模式和驗證詳細資訊。

  </Accordion>

  <Accordion title="為什麼聊天審核有兩個執行審核設定？">
    它們控制不同的層級：

    - `approvals.exec`：將審核提示轉發到聊天目的地
    - `channels.<channel>.execApprovals`：使該通道充當執行審核的原生審核客戶端

    主機執行策略仍然是真正的審核閘道。聊天設定僅控制審核提示出現的位置以及人們如何回答它們。

    在大多數設定中，您並**不**需要同時使用兩者：

    - 如果聊天已支援指令和回覆，同頻道 `/approve` 會透過共用路徑運作。
    - 如果支援的原生通道可以安全地推斷審核者，當 `channels.<channel>.execApprovals.enabled` 未設定或 `"auto"` 時，OpenClaw 現在會自動啟用優先私訊的原生審核。
    - 當原生審核卡片/按鈕可用時，該原生 UI 是主要路徑；只有在工具結果指出聊天審核不可用或手動審核是唯一路徑時，Agent 才應包含手動 `/approve` 指令。
    - 僅當提示也必須轉發到其他聊天或明確的運維房間時，才使用 `approvals.exec`。
    - 僅當您明確希望將審核提示發布回原始房間/主題時，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 外掛程式審核再次分開處理：它們預設使用同頻道 `/approve`，可選的 `approvals.plugin` 轉發，且只有部分原生通道會保留外掛-審核-原生的頂層處理。

    簡而言之：轉發是用於路由，原生客戶端設定是用於更豐富的通道特定 UX。
    請參閱 [執行審核](/zh-Hant/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。對於 Gateway，**不建議**使用 Bun。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上运行嗎？">
    是的。Gateway 非常輕量——文件列出 **512MB-1GB RAM**、**1 核心**和約 **500MB** 磁碟空間對個人使用來說已足夠，並且注意 **Raspberry Pi 4 可以運行它**。

    如果您想要額外的餘量（日誌、媒體、其他服務），**建議使用 2GB**，但這並非硬性最低要求。

    提示：小型 Pi/VPS 可以託管 Gateway，您可以將筆記型電腦/手機上的 **節點** 配對進行本地螢幕/相機/畫布或命令執行。請參閱 [節點](/zh-Hant/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有什麼提示嗎？">
    簡短來說：可以使用，但預期會有一些粗糙的邊緣情況。

    - 使用 **64 位元** 作業系統並保持 Node >= 22。
    - 優先選擇 **可破解 (git) 安裝**，以便您可以查看日誌並快速更新。
    - 首先在不啟用 channels/skills 的情況下啟動，然後逐一添加它們。
    - 如果遇到奇怪的二進位問題，通常是由 **ARM 相容性** 問題引起的。

    文件：[Linux](/zh-Hant/platforms/linux), [安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="它卡在喚醒我的朋友 / 入門無法啟動。現在該怎麼辦？">
    該畫面取決於 Gateway 是否可達以及已通過身份驗證。TUI 也會在首次啟動時自動發送「Wake up, my friend!」。如果您看到該行但 **沒有回覆**
    且 token 數量保持為 0，則表示 Agent 從未運行。

    1. 重新啟動 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 檢查狀態 + 身份驗證：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然掛起，請執行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠端的，請確保 tunnel/Tailscale 連線已啟動，並且 UI 指向正確的 Gateway。請參閱 [遠端存取](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我可以在不重新執行入門流程的情況下將設定遷移到新機器（Mac mini）嗎？">
    可以。複製 **狀態目錄** 和 **工作區**，然後執行一次 Doctor。只要您複製了這**兩個**位置，這就能讓您的機器人保持「完全一致」（記憶體、工作階段歷史、驗證和頻道狀態）：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）。
    3. 複製您的工作區（預設：`~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、驗證設定檔、WhatsApp 憑證、工作階段和記憶體。如果您處於遠端模式，請記住 Gateway 主機擁有工作階段儲存區和工作區。

    **重要事項：**如果您只將工作區提交/推送到 GitHub，您只是備份了 **記憶體 + 啟動檔案**，但**並未**備份工作階段歷史或驗證資料。這些資料位於 `~/.openclaw/` 之下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關主題：[遷移](/zh-Hant/install/migrating)、[檔案在磁碟上的位置](#where-things-live-on-disk)、
    [Agent 工作區](/zh-Hant/concepts/agent-workspace)、[Doctor](/zh-Hant/gateway/doctor)、
    [遠端模式](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以看到最新版本的新功能？">
    請查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部區段標記為 **Unreleased**（未發布），則下一個有日期的區段為最新發布的版本。條目按 **亮點**、**變更** 和 **修復** 分組（並在需要時包含文件/其他區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai（SSL 錯誤）">
    部分 Comcast/Xfinity 連線會透過 Xfinity Advanced Security 錯誤地封鎖 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。
    請透過此處回報協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件已鏡像至 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 與 Beta 的區別">
    **Stable** 和 **beta** 是 **npm dist-tags**，不是獨立的程式碼行：

    - `latest` = stable
    - `beta` = 用於測試的早期版本

    通常，穩定版本會先發布到 **beta**，然後透過明確的推廣步驟將該版本移至 `latest`。維護者也可以在需要時直接發布到 `latest`。這就是為什麼在推廣之後 beta 和 stable 可能會指向 **同一個版本**。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    若要了解安裝單行程式碼以及 beta 和 dev 的區別，請參閱下方手風琴選單。

  </Accordion>

  <Accordion title="我該如何安裝 Beta 版本？Beta 和 Dev 有什麼區別？">
    **Beta** 是 npm dist-tag `beta`（在推廣後可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的最新動態頭部；發布時，它使用 npm dist-tag `dev`。

    單行程式碼 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳細資訊：[開發頻道](/zh-Hant/install/development-channels) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="我如何嘗試最新版本？">
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

    這會提供一個您可以編輯的本機儲存庫，然後透過 git 進行更新。

    如果您更喜歡手動進行乾淨的克隆，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[更新](/zh-Hant/cli/update)、[開發頻道](/zh-Hant/install/development-channels)、
    [安裝](/zh-Hant/install)。

  </Accordion>

  <Accordion title="安裝和上手通常需要多長時間？">
    大概指南：

    - **安裝：** 2-5 分鐘
    - **上手：** 5-15 分鐘，取決於您配置了多少頻道/模型

    如果卡住了，請使用 [Installer stuck](#quick-start-and-first-run-setup)
    以及 [I am stuck](#quick-start-and-first-run-setup) 中的快速調試循環。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多反饋？">
    使用 **詳細輸出** 重新運行安裝程式：

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

    Windows (PowerShell) 等效命令：

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多選項：[Installer flags](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝顯示找不到 git 或無法識別 openclaw">
    Windows 上兩個常見問題：

    **1) npm error spawn git / git not found**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新運行安裝程式。

    **2) 安裝後無法識別 openclaw**

    - 您的 npm global bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增到您的使用者 PATH（Windows 上不需要 `\bin` 後綴；在大多數系統上它是 `%AppData%\npm`）。
    - 更新 PATH 後，關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/zh-Hant/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 我該怎麼辦？">
    這通常是由於原生 Windows Shell 中的主機代碼頁不匹配所導致的。

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

    如果您在最新版本的 OpenClaw 上仍然遇到此問題，請在以下位置追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件未回答我的問題 - 我如何獲得更好的答案？">
    使用 **可駭客式 安裝**，這樣您就可以在本地擁有完整的原始碼和文件，然後_從該資料夾中_詢問您的機器人（或 Claude/Codex），這樣它就可以讀取 repo 並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多詳情：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝 OpenClaw？">
    簡短回答：遵循 Linux 指南，然後執行 onboarding。

    - Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
    - 完整逐步解說：[入門指南](/zh-Hant/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="我如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 都可以運作。在伺服器上安裝，然後使用 SSH/Tailscale 連接 Gateway。

    指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
    遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們提供了一個包含常見供應商的 **託管中心 (hosting hub)**。選擇其中一個並依照指南操作：

    - [VPS hosting](/zh-Hant/vps) (所有供應商一應俱全)
    - [Fly.io](/zh-Hant/install/fly)
    - [Hetzner](/zh-Hant/install/hetzner)
    - [exe.dev](/zh-Hant/install/exe-dev)

    雲端運作方式：**Gateway 運行在伺服器上**，您可以透過 Control UI（或 Tailscale/SSH）從筆記型電腦/手機存取。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將 **節點**（Mac/iOS/Android/headless）配對到該雲端 Gateway，以存取本機畫面/相機/畫布或在筆記型電腦上執行指令，同時將 Gateway 保持在雲端。

    中心：[Platforms](/zh-Hant/platforms)。遠端存取：[Gateway remote](/zh-Hant/gateway/remote)。
    節點：[Nodes](/zh-Hant/nodes), [Nodes CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 自我更新嗎？">
    簡短回答：**可行，但不建議**。更新流程可能會重新啟動 Gateway（這會中斷作用中的連線階段），可能需要乾淨的 git checkout，並且可能會提示確認。更安全的做法是：以操作員身份從 shell 執行更新。

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

    文件：[Update](/zh-Hant/cli/update), [Updating](/zh-Hant/install/updating)。

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

  <Accordion title="執行此操作需要 Claude 或 OpenAI 訂閱嗎？">
    不需要。您可以使用 **API 金鑰** (Anthropic/OpenAI/其他) 或僅使用 **本地模型** 來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱 (Claude Pro/Max 或 OpenAI Codex) 只是驗證這些提供者的選擇性方式。

    對於 OpenClaw 中的 Anthropic，實際上的區分如下：

    - **Anthropic API 金鑰**：正常的 Anthropic API 計費
    - **OpenClaw 中的 Claude CLI / Claude 訂閱驗證**：Anthropic 員工告訴我們這種用法再次被允許，OpenClaw 將 `claude -p` 的使用視為此整合的批准用法，除非 Anthropic 發布新政策

    對於長期運作的閘道主機，Anthropic API 金鑰仍然是更可預測的設定方式。OpenAI Codex OAuth 明確支援像 OpenClaw 這樣的外部工具。

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
    是的。

    Anthropic 員工告訴我們這種用法再次被允許，因此 OpenClaw 將 Claude CLI 重複使用和 `claude -p` 的使用視為此整合的批准用法，除非 Anthropic 發布新政策。

    Anthropic setup-token 仍然是一個支援的 OpenClaw token 路徑，但如果可用的話，OpenClaw 現在更傾向於 Claude CLI 重複使用和 `claude -p`。
    對於生產環境或多用戶工作負載，Anthropic API 金鑰驗證仍然是更安全、更可預測的選擇。如果您想要 OpenClaw 中的其他訂閱式託管選項，請參閱 [OpenAI](/zh-Hant/providers/openai)、[Qwen / Model Cloud](/zh-Hant/providers/qwen)、[MiniMax](/zh-Hant/providers/minimax) 和 [GLM Models](/zh-Hant/providers/glm)。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="為什麼我會看到來自 Anthropic 的 HTTP 429 rate_limit_error？">
這意味著您的 **Anthropic 配額/速率限制** 在當前時間視窗內已耗盡。如果您
使用 **Claude CLI**，請等待時間視窗重置或升級您的方案。如果您
使用 **Anthropic API 金鑰**，請檢查 Anthropic Console
中的使用量/計費情況，並根據需要提高限制。

    如果訊息具體是：
    `Extra usage is required for long context requests`，則該請求正在嘗試使用
    Anthropic 的 1M 上下文測試版 (`context1m: true`)。這只有在您的
    憑證符合長上下文計費條件（API 金鑰計費或啟用了額外使用量的
    OpenClaw Claude 登入路徑）時才有效。

    提示：設定一個 **備用模型**，以便在提供商受到速率限制時，OpenClaw 可以繼續回覆。
    參閱 [模型](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">
  是的。OpenClaw 內建了 **Amazon Bedrock (Converse)** 提供商。如果有 AWS 環境標記，OpenClaw 可以自動發現串流/文字 Bedrock 目錄，並將其合併為隱式 `amazon-bedrock` 提供商；否則，您可以顯式啟用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或添加手動提供商條目。參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 和 [模型提供商](/zh-Hant/providers/models)。如果您更喜歡託管金鑰流程，在 Bedrock 前面使用
  OpenAI 相容的代理仍然是一個有效的選項。
</Accordion>

<Accordion title="Codex 驗證是如何運作的？">OpenClaw 通過 OAuth（ChatGPT 登入）支援 **OpenAI Code (Codex)**。入職流程可以運行 OAuth 流程，並在適當時將預設模型設定為 `openai-codex/gpt-5.4`。參閱 [模型提供商](/zh-Hant/concepts/model-providers) 和 [入職 (CLI)](/zh-Hant/start/wizard)。</Accordion>

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
    OpenAI 明確允許在 OpenClaw 這類外部工具/工作流程中使用訂閱 OAuth。入嚮導程式可以為您執行 OAuth 流程。

    參閱 [OAuth](/zh-Hant/concepts/oauth)、[模型提供商](/zh-Hant/concepts/model-providers) 和 [入嚮導程式 (CLI)](/zh-Hant/start/wizard)。

  </Accordion>

  <Accordion title="我該如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是**外掛程式驗證流程**，而不是 `openclaw.json` 中的客戶端 ID 或祕密金鑰。

    步驟：

    1. 在本機安裝 Gemini CLI，使 `gemini` 位於 `PATH` 中
       - Homebrew：`brew install gemini-cli`
       - npm：`npm install -g @google/gemini-cli`
    2. 啟用外掛程式：`openclaw plugins enable google`
    3. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登入後的預設模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳情：[模型提供商](/zh-Hant/concepts/model-providers)。

  </Accordion>

<Accordion title="區域模型適合休閒聊天嗎？">通常不適合。OpenClaw 需要大型上下文 + 強大的安全性；小型顯卡會截斷並洩漏資料。如果您必須使用，請在本地執行您能執行的**最大**模型版本 (LM Studio)，並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化的模型會增加提示注入風險 - 參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

<Accordion title="如何將託管模型流量保留在特定區域？">選擇區域鎖定的端點。OpenRouter 提供了 MiniMax、Kimi 和 GLM 的美國託管選項；選擇美國託管版本可將數據保留在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型一起列出，以便在遵守您選擇的區域供應商的同時保持備援可用。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（透過 WSL2 的 Windows）上運行。Mac mini 是可選的——有些人購買它作為始終在線的主機，但小型 VPS、家庭伺服器或 Raspberry Pi 級別的設備也可以。

    您只需要 Mac 來使用 **僅限 macOS 的工具**。若要使用 iMessage，請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可在任何 Mac 上運行，而 Gateway 可在 Linux 或其他地方運行。如果您想要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    您需要 **某台 macOS 設備** 登入 Messages。它 **不必** 是 Mac mini——任何 Mac 都可以。若要使用 iMessage，**請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)**（推薦）——BlueBubbles 伺服器在 macOS 上運行，而 Gateway 可在 Linux 或其他地方運行。

    常見設定：

    - 在 Linux/VPS 上運行 Gateway，並在任何登入 Messages 的 Mac 上運行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請在 Mac 上執行所有操作。

    文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、
    [Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將其連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為 **節點**（伴隨裝置）進行連接。節點不執行 Gateway——它們提供螢幕/相機/畫布等額外功能以及該裝置上的 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上執行（始終在線）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並與 Gateway 配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 進行查看。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

  </Accordion>

  <Accordion title="我可以用 Bun 嗎？">
    **不建議**使用 Bun。我們發現執行時有錯誤，特別是在 WhatsApp 和 Telegram 上。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍想嘗試 Bun，請在非生產環境的閘道上進行，
    且不要用於 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中应该填什麼？">
    `channels.telegram.allowFrom` 是**人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    設定僅要求數字的使用者 ID。如果您在設定中已經有舊版的 `@username` 項目，`openclaw doctor --fix` 可以嘗試解析它們。

    更安全的方式（無第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/zh-Hant/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以使用一個 WhatsApp 號碼搭配不同的 OpenClaw 實例嗎？">
  可以，透過**多代理程式路由**。將每個發送者的 WhatsApp **私訊**（peer `kind: "direct"`，發送者 E.164 例如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區和會話儲存。回覆仍然來自**同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是針對每個 WhatsApp 帳號全域的。參見 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和
  [WhatsApp](/zh-Hant/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時執行一個「快速聊天」代理程式和一個「用於編碼的 Opus」代理程式嗎？">可以。使用多代理程式路由：為每個代理程式指定其預設模型，然後將傳入路由（提供者帳號或特定對象）綁定到每個代理程式。範例設定位於 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)。另請參閱 [Models](/zh-Hant/concepts/models) 和 [Configuration](/zh-Hant/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    可以的。Homebrew 支援 Linux（Linuxbrew）。快速設定如下：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或是您的 brew 前綴路徑），這樣 `brew` 安裝的工具才能在非登入 shell 中正確解析。
    近期的版本也會在 Linux systemd 服務中預先加入常見的使用者 bin 目錄（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），並在設定時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可編輯的 git 安裝與 npm 安裝之間的差別">
    - **可編輯 安裝：**完整的原始碼檢出，可編輯，最適合貢獻者。
      您在本地執行建置並可以修改程式碼/文件。
    - **npm install：**全域 CLI 安裝，不包含 repo，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[Getting started](/zh-Hant/start/getting-started)、[Updating](/zh-Hant/install/updating)。

  </Accordion>

  <Accordion title="我日後可以在 npm 和 git 安裝之間切換嗎？">
    可以的。安裝另一個版本，然後執行 Doctor 讓閘道服務指向新的進入點。
    這**不會刪除您的資料**——它僅會變更 OpenClaw 的程式碼安裝。您的狀態
    (`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 將保持不變。

    從 npm 切換到 git：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    從 git 切換到 npm：

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor 會偵測到閘道服務進入點不匹配，並提議重寫服務設定以符合目前的安裝（在自動化中使用 `--repair`）。

    備份提示：請參閱 [Backup strategy](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦還是 VPS 上執行 Gateway？">
    簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您希望
    阻力最低並且不介意睡眠/重新啟動，請在本地執行。

    **筆記型電腦 (本地 Gateway)**

    - **優點：** 沒有伺服器成本，可直接存取本地檔案，可使用即時瀏覽器視窗。
    - **缺點：** 睡眠/網路斷線 = 連線中斷，作業系統更新/重新啟動會造成中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠上線，網路穩定，沒有筆記型電腦睡眠的問題，更容易維持執行。
    - **缺點：** 通常以無頭模式執行 (使用螢幕截圖)，只能遠端存取檔案，您必須透過 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost/Discord 都可以在 VPS 上正常運作。唯一真正的取捨是 **無頭瀏覽器** 與可見視窗之間的選擇。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    **建議預設值：** 如果您之前遇到過中斷連線，請使用 VPS。當您正在使用 Mac 且想要存取本地檔案或使用可見瀏覽器進行 UI 自動化時，本地執行是很棒的選擇。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    並非必要，但**為了可靠性和隔離性建議使用**。

    - **專用主機 (VPS/Mac mini/Pi)：** 永遠上線，較少睡眠/重新啟動中斷，權限更乾淨，更容易維持執行。
    - **共用的筆記型電腦/桌面電腦：** 非常適合測試和主動使用，但當機器睡眠或更新時預計會暫停。

    如果您想要兩全其美，請將 Gateway 保留在專用主機上，並將您的筆記型電腦配對為用於本地螢幕/相機/執行工具的 **節點**。請參閱 [節點](/zh-Hant/nodes)。
    如需安全性指導，請閱讀 [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低需求與推薦的作業系統為何？">
    OpenClaw 是輕量級的。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
    - **推薦配置：** 1-2 vCPU，2GB RAM 或更多以保留餘裕（日誌、媒體、多個頻道）。Node 工具與瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS**（或任何現代的 Debian/Ubuntu）。Linux 的安裝路徑在該環境下測試最為完善。

    文件：[Linux](/zh-Hant/platforms/linux)、[VPS 託管](/zh-Hant/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求為何？">
    可以。將 VM 視為與 VPS 相同：它需要保持運作、可被連線，並具備足夠的 RAM 給 Gateway 與您啟用的任何頻道。

    基準指引：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **推薦配置：** 2GB RAM 或更多，若您執行多個頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代的 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 設定方式**，且具有最佳的工具相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS 託管](/zh-Hant/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什麼，用一段話概括？">
    OpenClaw 是一個運行在您自己設備上的個人 AI 助手。它在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及 QQ Bot 等捆綁的頻道外掛程式），並且可以在支援的平台上進行語音互動和即時 Canvas 操作。**Gateway** 是始終運行的控制平面；而助手則是產品本身。
  </Accordion>

  <Accordion title="Value proposition">
    OpenClaw 不僅僅是一個「Claude 包裝器」。它是一個**本地優先的控制平面**，讓您能夠在**您自己的硬體上**運行一個功能強大的助手，並透過您已經使用的聊天應用程式進行存取，同時具備有狀態的會話、記憶和工具功能——而無需將您的工作流程控制權交給託管的 SaaS。

    亮點：

    - **您的裝置，您的資料：** 在您想要的地方（Mac、Linux、VPS）運行 Gateway，並將工作區 + 會話記錄保留在本地。
    - **真實頻道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支援的平台上的行動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並提供每個代理的路由和故障轉移。
    - **純本地選項：** 執行本地模型，因此如果您願意，**所有資料都可以保留在您的裝置上**。
    - **多代理路由：** 根據頻道、帳戶或任務分開代理，每個代理都有自己的工作區和預設值。
    - **開源且可駭：** 檢查、擴展和自託管，無供應商鎖定。

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

  <Accordion title="Can OpenClaw help with lead gen, outreach, ads, and blogs for a SaaS?">
    可以協助**研究、篩選和草擬**。它可以掃描網站、建立候選名單、總結潛在客戶，並撰寫外聯或廣告文案草稿。

    對於**外聯或廣告投放**，請保持有人員在環中。避免垃圾訊息，遵守當地法律和平台政策，並在發送前審查所有內容。最安全的模式是讓 OpenClaw 草擬，然後由您批准。

    文件：[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code 進行網頁開發，有哪些優勢？">
    OpenClaw 是一個**個人助理**與協調層，並非用來取代 IDE。請使用
    Claude Code 或 Codex 以在程式庫內獲得最快的直接編碼迴圈。當您
    需要持續性的記憶、跨裝置存取以及工具編排時，請使用 OpenClaw。

    優勢：

    - **持久記憶 + 工作區** 跨越不同工作階段
    - **多平台存取** (WhatsApp, Telegram, TUI, WebChat)
    - **工具編排** (瀏覽器、檔案、排程、勾點)
    - **常駐閘道** (在 VPS 上執行，從任何地方互動)
    - **節點** 用於本機瀏覽器/螢幕/相機/執行

    展示： [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不弄髒程式庫的情況下自訂技能？">
    請使用受管理的覆寫，而不是直接編輯程式庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中 (或透過 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中新增資料夾)。優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此受管理的覆寫仍然會勝過內綑技能，而不需要動到 git。如果您需要全域安裝技能但僅讓某些代理程式看見，請將共用副本保留在 `~/.openclaw/skills` 中，並使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可見性。只有值得回饋上游的編輯才應該存放在程式庫中並以 PR 的形式送出。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。透過 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中新增額外目錄（優先順序最低）。預設優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 在下一次工作階段會將其視為 `<workspace>/skills`。如果該技能只應該對特定代理程式可見，請搭配使用 `agents.defaults.skills` 或 `agents.list[].skills`。
  </Accordion>

  <Accordion title="我可以針對不同工作使用不同的模型嗎？">
    目前支援的模式有：

    - **Cron jobs**：隔離的工作可以為每個工作設定 `model` 覆蓋值。
    - **Sub-agents**：將工作路由到具有不同預設模型的獨立代理程式。
    - **On-demand switch**：隨時使用 `/model` 切換目前的工作階段模型。

    參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我該如何將其卸載？">
    請對長時間或平行工作使用 **sub-agents**。Sub-agents 在自己的工作階段中運行，
    回傳摘要，並讓您的主聊天保持回應。

    要求您的機器人「為此工作生成一個 sub-agent」或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway 目前正在做什麼（以及是否忙碌）。

    Token 提示：長時間工作和 sub-agents 都會消耗 token。如果成本是考量因素，請透過 `agents.defaults.subagents.model` 為 sub-agents 設定較便宜的模型。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的執行緒綁定子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息停留在該綁定的會話上。

    基本流程：

    - 使用 `thread: true` 搭配 `sessions_spawn` 產生（並可選擇使用 `mode: "session"` 進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 解除執行緒綁定。

    必要配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆蓋設定：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 產生時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[Configuration Reference](/zh-Hant/gateway/configuration-reference)、[Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理完成了，但完成更新的內容發送到了錯誤的位置或從未發佈。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式的子代理傳遞優先使用任何已綁定的 thread 或 conversation 路由（如果存在的話）。
    - 如果完成來源僅包含 channel，OpenClaw 會回退到請求者會話中存儲的路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳遞仍然可以成功。
    - 如果既沒有綁定路由也沒有可用的存儲路由，直接傳遞可能會失敗，結果會回退到排隊的會話傳遞，而不是立即發佈到聊天。
    - 無效或過期的目標仍然可能強制回退到隊列或最終傳遞失敗。
    - 如果子最後一個可見的助手回覆是精確的靜默令牌 `NO_REPLY` / `no_reply`，或者確切是 `ANNOUNCE_SKIP`，OpenClaw 會有意抑制公告，而不是發佈過早的過期進度。
    - 如果子在僅進行了工具調用後超時，公告可能會將其折疊為簡短的部分進度摘要，而不是重播原始工具輸出。

    調試：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文檔：[子代理](/zh-Hant/tools/subagents)、[後台任務](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒沒有觸發。我應該檢查什麼？">
    Cron 在 Gateway 進程內運行。如果 Gateway 沒有持續運行，
    預定的作業將不會運行。

    檢查清單：

    - 確認 cron 已啟用（`cron.enabled`）並且未設置 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運行（無睡眠/重啟）。
    - 驗證作業的時區設置（`--tz` 與主機時區）。

    調試：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文檔：[Cron 作業](/zh-Hant/automation/cron-jobs)、[自動化與任務](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有任何內容發送到頻道。為什麼？">
    首先檢查傳遞模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示預期不會有 runner 備援傳送。
    - 缺少或無效的公告目標 (`channel` / `to`) 表示 runner 跳過了出站傳遞。
    - 頻道驗證失敗 (`unauthorized`, `Forbidden`) 表示 runner 嘗試傳遞但憑證阻擋了它。
    - 靜默的隔離結果 (僅 `NO_REPLY` / `no_reply`) 被視為故意不可傳遞，因此 runner 也會抑制排隊的備援傳遞。

    對於隔離的 cron 工作，當有聊天路由可用時，Agent 仍然可以使用 `message`
    工具直接發送。`--announce` 僅控制針對 Agent 尚未發送的最終文字的 runner
    備援路徑。

    偵錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而非重複排程。

    隔離的 cron 可以持續化執行時期的模型移交，並在作用中
    執行拋出 `LiveSessionModelSwitchError` 時重試。重試會保留切換後的
    提供者/模型，且如果切換帶有新的驗證設定檔覆寫，cron
    也會在重試前將其持續化。

    相關選擇規則：

    - Gmail hook 模型覆寫在適用時優先。
    - 接著是各別工作的 `model`。
    - 接著是任何儲存的 cron-session 模型覆寫。
    - 然後是正常的 Agent/預設模型選擇。

    重試迴圈是有界的。在初次嘗試加上 2 次切換重試後，
    cron 會中止而不是無限迴圈。

    偵錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="How do I install skills on Linux?">
    使用原生的 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
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

    原生 `openclaw skills install` 會寫入到目前使用的工作區 `skills/`
    目錄中。只有在您想要發佈或
    同步您自己的技能時，才需要安裝獨立的 `clawhub` CLI。若要在代理程式之間共享安裝，請將技能置於
    `~/.openclaw/skills` 之下，並使用 `agents.defaults.skills` 或
    `agents.list[].skills` 如果您想要限制哪些代理程式可以看到它。

  </Accordion>

  <Accordion title="Can OpenClaw run tasks on a schedule or continuously in the background?">
    是的。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後仍會保留）。
    - **Heartbeat** 用於「主階段」週期性檢查。
    - **Isolated jobs** 用於發佈摘要或傳送訊息至聊天室的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation & Tasks](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅適用於 Apple macOS 的技能嗎？">
    不能直接執行。macOS 技能受 `metadata.openclaw.os` 和必要的二進位檔限制，只有在 **Gateway 主機** 上符合資格時，這些技能才會出現在系統提示中。在 Linux 上，除非您覆寫限制，否則 `darwin` 專屬技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔的地方執行 Gateway，然後透過 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 從 Linux 連線。因為 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無需 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（功能表列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進位檔時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示中批准「Always Allow」會將該指令新增到允許清單中。

    **選項 C - 透過 SSH 代理 macOS 二進位檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進位檔解析為在 Mac 上執行的 SSH 包裝函式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二進位檔建立 SSH 包裝函式（範例：針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝函式放在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
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

  <Accordion title="Do you have a Notion or HeyGen integration?">
    目前尚未內建。

    選項：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion/HeyGen 皆有 API）。
    - **瀏覽器自動化：** 無需編寫程式即可運作，但速度較慢且較不穩定。

    若您希望為每個客戶保留情境（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（情境 + 偏好設定 + 進行中的工作）。
    - 指示代理程式在會話開始時擷取該頁面。

    若您希望擁有原生整合，請開啟功能請求或建構以這些 API 為目標的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會置於啟用的工作區 `skills/` 目錄中。若要跨代理程式共享技能，請將其置於 `~/.openclaw/skills/<name>/SKILL.md`。若僅部分代理程式應查看共享安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能預期已透過 Homebrew 安裝二進位檔；在 Linux 上這代表 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 與 [ClawHub](/zh-Hant/tools/clawhub)。

  </Accordion>

  <Accordion title="How do I use my existing signed-in Chrome with OpenClaw?">
    使用內建的 `user` 瀏覽器設定檔，其透過 Chrome DevTools MCP 進行連線：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    若您想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑可使用本地主機瀏覽器或已連線的瀏覽器節點。如果閘道在其他地方執行，請在瀏覽器機器上執行節點主機，或是改用遠端 CDP。

    `existing-session` / `user` 目前的限制：

    - 動作是由 ref 驅動，而非由 CSS 選擇器驅動
    - 上傳需要 `ref` / `inputRef`，且目前一次僅支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍需要受控瀏覽器或原始 CDP 設定檔

  </Accordion>
</AccordionGroup>

## 沙盒機制與記憶體

<AccordionGroup>
  <Accordion title="有專門的沙盒文檔嗎？">
    有的。請參閱 [沙盒 (Sandboxing)](/zh-Hant/gateway/sandboxing)。關於 Docker 特定的設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限——如何啟用完整功能？">
    預設映像檔以安全為先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項建構至映像檔中。
    - 透過內建 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[瀏覽器 (Browser)](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我能否保持 DM 私人化，但讓群組公開/沙盒化，且使用同一個 Agent？">
    可以——前提是您的私人流量是 **DM**，而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道階段作業（非主要金鑰）在設定的沙盒後端中執行，而主要的 DM 階段作業則保留在主機上。如果您未選擇後端，Docker 是預設的後端。然後透過 `tools.sandbox.tools` 限制沙盒階段作業中可用的工具。

    設定逐步解說 + 範例設定：[群組：私人 DM + 公開群組 (Groups: personal DMs + public groups)](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定參考：[閘道設定 (Gateway configuration)](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定至沙箱？">
    設定 `agents.defaults.sandbox.docker.binds` 為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域 + 代理人綁定會合併；當 `scope: "shared"` 時，會忽略代理人綁定。請對任何敏感內容使用 `:ro`，並記得綁定會繞過沙箱檔案系統防護。

    OpenClaw 會根據正規化路徑以及透過最深層現有祖先解析出的規範路徑，來驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父系逃逸仍會被封閉（失敗），並且在解析符號連結後仍會檢查允許的根路徑。

    請參閱 [沙箱](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs 工具原則 vs 提權](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全注意事項。

  </Accordion>

  <Accordion title="記憶體如何運作？">
    OpenClaw 的記憶體只是代理人工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的策展長期筆記（僅限主機/私人階段作業）

    OpenClaw 也會執行 **靜默預壓縮記憶體清除**，以提醒模型
    在自動壓縮之前寫入持久性筆記。這僅在工作區
    可寫入時執行（唯讀沙箱會跳過此步驟）。請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體一直忘記事情。我該如何讓它記住？">
    請要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md`，
    短期情境則放入 `memory/YYYY-MM-DD.md`。

    這仍然是我們正在改進的領域。提醒模型儲存記憶會有幫助；
    它會知道該做什麼。如果它一直忘記，請驗證 Gateway 是否在每次執行時都使用相同的工作區。

    文件：[記憶體](/zh-Hant/concepts/memory)、[代理人工作區](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有哪些限制？">
    記憶檔案儲存在磁碟上，並會持續保存直到您刪除它們。限制在於您的
    儲存空間，而非模型。**會話上下文** 仍受限於模型的
    上下文視窗，因此長時間的對話可能會被壓縮或截斷。這就是為什麼
    存在記憶搜尋——它只將相關的部分拉回上下文中。

    文件：[記憶](/zh-Hant/concepts/memory)、[上下文](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋是否需要 OpenAI API 金鑰？">
    只有在使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋了聊天/完成功能，
    但**不**會授予嵌入存取權限，因此**登入 Codex (OAuth 或
    Codex CLI 登入)** 對語意記憶搜尋沒有幫助。OpenAI 嵌入
    仍然需要真正的 API 金鑰 (`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`)。

    如果您未明確設定提供者，當 OpenClaw 可以解析 API 金鑰 (auth 檔案、`models.providers.*.apiKey` 或環境變數) 時，
    它會自動選擇一個提供者。
    如果可以解析 OpenAI 金鑰，它會優先選擇 OpenAI，其次是 Gemini，然後是 Voyage 和 Mistral。如果沒有可用的遠端金鑰，記憶
    搜尋將保持停用狀態，直到您進行設定。如果您已設定並存在本機模型路徑，
    OpenClaw 會
    優先選擇 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持在本地，請設定 `memorySearch.provider = "local"` (並可選擇性設定
    `memorySearch.fallback = "none"`)。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY` (或
    `memorySearch.remote.apiKey`)。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** 嵌入
    模型——詳見 [記憶](/zh-Hant/concepts/memory) 了解設定細節。

  </Accordion>
</AccordionGroup>

## 磁碟上的檔案位置

<AccordionGroup>
  <Accordion title="所有與 OpenClaw 使用的資料都會儲存在本機嗎？">
    不會 - **OpenClaw 的狀態是本機的**，但 **外部服務仍會看到您發送給它們的內容**。

    - **預設為本機：** 會話、記憶檔案、配置和工作區位於 Gateway 主機
      (`~/.openclaw` + 您的工作區目錄) 上。
    - **必要的遠端：** 您發送給模型提供商 (Anthropic/OpenAI/等) 的訊息會傳送到
      它們的 API，而聊天平台 (WhatsApp/Telegram/Slack/等) 會將訊息資料儲存在它們的
      伺服器上。
    - **由您控制足跡：** 使用本機模型可將提示詞保留在您的機器上，但頻道
      流量仍會經過該頻道的伺服器。

    相關：[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[記憶](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將其資料存放在哪裡？">
    所有內容都儲存在 `$OPENCLAW_STATE_DIR` 下（預設值：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                      |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時複製到 auth profiles）                    |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 驗證設定檔（OAuth、API 金鑰以及可選的 `keyRef`/`tokenRef`） |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | `file` SecretRef 提供者的可選檔案支援機密承載 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已清除）       |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）                    |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史記錄與狀態（每個代理程式）                                   |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 會話元資料（每個代理程式）                                           |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶體檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行配置（預設值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md` (或在缺少 `MEMORY.md` 時的舊版回退 `memory.md`)、
      `memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)**: 設定、通道/提供者狀態、身分設定檔、工作階段、日誌
      以及共享技能 (`~/.openclaw/skills`)。

    預設工作區為 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了資訊，請確認 Gateway 在每次啟動時都使用相同的
    工作區 (並請記住：遠端模式使用的是 **gateway 主機的**
    工作區，而不是你的本機筆記型電腦)。

    提示：如果你希望行為或偏好設定能夠持久保存，請要求機器人將其 **寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴對話記錄。

    參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將你的 **agent workspace** 放入 **私人** git repo 並將其備份到某個
    私人地方 (例如 GitHub 私有儲存庫)。這會捕捉記憶體 + AGENTS/SOUL/USER
    檔案，並讓你稍後能還原助手的「心智」。

    **切勿** 將 `~/.openclaw` 下的任何內容進行 commit (憑證、工作階段、Token 或加密的機密承載)。
    如果你需要完整還原，請分別備份工作區和狀態目錄
    (請參閱上述遷移問題)。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我要如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作區之外運作嗎？">
    是的。工作區是**預設的 cwd**（當前工作目錄）和記憶體錨點，而不是嚴格的沙箱。
    相對路徑在工作區內解析，但除非啟用沙箱功能，否則絕對路徑可以存取其他
    主機位置。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或每個代理的沙箱設定。如果您
    想讓某個存儲庫成為預設工作目錄，請將該代理的
    `workspace` 指向存儲庫根目錄。OpenClaw 存儲庫只是原始碼；請將
    工作區分開，除非您有意讓代理在其中工作。

    範例（存儲庫作為預設 cwd）：

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

  <Accordion title="遠端模式：會話存儲在哪裡？">
    會話狀態歸屬於**閘道主機**。如果您處於遠端模式，您關心的會話存儲位於遠端機器上，而不是您的本地筆記型電腦。請參閱[會話管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它將使用預設的安全設定（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，現在沒有監聽任何東西 / 顯示未授權'>
    非回環綁定**需要有效的閘道驗證路徑**。實際上這意味著：

    - shared-secret 驗證：token 或密碼
    - 位於正確設定的非回環身分感知反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    注意事項：

    - `gateway.remote.token` / `.password` **並不會**自行啟用本機閘道驗證。
    - 本機呼叫路徑僅在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後備。
    - 對於密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 如果透過 SecretRef 明確設定 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析將會失敗並關閉（不會有遠端後備遮罩）。
    - Shared-secret Control UI 設定會透過 `connect.params.auth.token` 或 `connect.params.auth.password` (儲存在 app/UI 設定中) 進行驗證。承載身分的模式 (例如 Tailscale Serve 或 `trusted-proxy`) 則改用請求標頭。請避免將 shared secrets 放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機回環反向代理仍然**不滿足** trusted-proxy 驗證。受信任的代理必須是設定的非回環來源。

  </Accordion>

  <Accordion title="為什麼現在在 localhost 上需要 token？">
    OpenClaw 預設強制執行閘道驗證，包括回環位址。在正常的預設路徑中，這意味著 token 驗證：如果未設定明確的驗證路徑，閘道啟動時會解析為 token 模式並自動生成一個，將其儲存到 `gateway.auth.token`，因此 **本機 WS 用戶端必須通過驗證**。這會阻擋其他本機程序呼叫閘道。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，對於非回環的具身份感知的反向代理，使用 `trusted-proxy`）。如果您 **真的** 想要開放回環，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 隨時可以為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    閘道會監看設定檔並支援熱重載：

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
    - `random`：輪替顯示有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（與網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 取決於您選擇的
    提供者：

    - 支援 API 的提供者，如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily，需要其正常的 API 金鑰設定。
    - Ollama Web Search 不需要金鑰，但它使用您設定的 Ollama 主機並需要 `ollama signin`。
    - DuckDuckGo 不需要金鑰，但它是非官方的 HTML 整合。
    - SearXNG 不需要金鑰/自行託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推薦：** 執行 `openclaw configure --section web` 並選擇一個提供者。
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

    特定提供者的網路搜尋配置現在位於 `plugins.entries.<plugin>.config.webSearch.*` 下。
    舊版 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應用於新配置。
    Firecrawl 網路擷取後備配置位於 `plugins.entries.firecrawl.config.webFetch.*` 下。

    備註：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的擷取後備提供者。目前內建的提供者是 Firecrawl。
    - Daemons 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web tools](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的設定。我該如何恢復並避免這種情況？">
    `config.apply` 會**完全取代設定**。如果您發送部分物件，其他所有內容
    都會被移除。

    目前的 OpenClaw 針對許多意外覆寫提供了保護：

    - OpenClaw 擁有的設定寫入會在寫入前驗證完整的變更後設定。
    - 無效或破壞性的 OpenClaw 擁有寫入會被拒絕，並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯導致啟動或熱重載失敗，Gateway 會還原最後已知良好的設定，並將被拒絕的檔案儲存為 `openclaw.json.clobbered.*`。
    - 主代理在還原後會收到啟動警告，以免再次盲目寫入不良設定。

    恢復方式：

    - 檢查 `openclaw logs --follow` 是否有 `Config auto-restored from last-known-good`、`Config write rejected:` 或 `config reload restored last-known-good config`。
    - 檢查現用設定旁邊最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 如果現用的還原設定可以運作，請保留它，然後使用 `openclaw config set` 或 `config.patch` 僅複製預定的金鑰回來。
    - 執行 `openclaw config validate` 和 `openclaw doctor`。
    - 如果您沒有最後已知良好或被拒絕的負載，請從備份還原，或重新執行 `openclaw doctor` 並重新配置頻道/模型。
    - 如果這出乎意料，請提交錯誤報告並附上您最後的已知設定或任何備份。
    - 本地編碼代理通常可以從記錄或歷史記錄重建可運作的設定。

    避免方式：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層 schema 節點加上直接子項摘要以供深入檢視。
    - 使用 `config.patch` 進行部分 RPC 編輯；僅將 `config.apply` 用於完整設定取代。
    - 如果您在代理執行中使用僅限擁有者的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Gateway troubleshooting](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我如何在跨設備上運行一個中央 Gateway 與專用的 workers？">
    常見的模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **nodes** 和 **agents**：

    - **Gateway (中央)：** 擁有通道（Signal/WhatsApp）、路由和工作階段。
    - **Nodes (設備)：** Mac/iOS/Android 作為外圍設備連接並公開本地工具（`system.run`、`canvas`、`camera`）。
    - **Agents (工作程序)：** 用於特殊角色的獨立 brains/workspaces（例如 "Hetzner ops"、"Personal data"）。
    - **Sub-agents：** 當您需要並行處理時，從主 agent 生成背景工作。
    - **TUI：** 連接到 Gateway 並切換 agents/sessions。

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

    預設是 `false` (有頭模式)。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [Browser](/zh-Hant/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、抓取、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用螢幕截圖）。
    - 某些網站在無頭模式下對自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常阻擋無頭工作階段。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱 [Browser](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## Remote gateways and nodes

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、Gateway 和節點之間傳播？">
    Telegram 訊息由 **gateway** 處理。Gateway 運行代理程式，
    只有在需要節點工具時，才會透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到來自供應商的入站流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以
    透過 Gateway WebSocket 在您的本機上呼叫 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在常駐主機（VPS/家庭伺服器）上運行 Gateway。
    2. 將 Gateway 主機和您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可連線（tailnet 綁定或 SSH 隧道）。
    4. 在本機打開 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）連線，
       以便它註冊為節點。
    5. 在 Gateway 上核准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連線。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅
    配對您信任的裝置，並參閱 [Security](/zh-Hant/gateway/security)。

    文件：[Nodes](/zh-Hant/nodes)、[Gateway protocol](/zh-Hant/gateway/protocol)、[macOS remote mode](/zh-Hant/platforms/mac/remote)、[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回應。現在該怎麼辦？">
    檢查基本項目：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證授權和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 通道連線，請確認本機通道已啟動並指向正確的連接埠。
    - 確認您的允許清單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本機 + VPS）？">
    可以。沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式將其連接起來：

    **最簡單：**使用兩個機器人都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像往常一樣回覆。

    **CLI 橋接器（通用）：**執行一個腳本，該腳本使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    以目標為另一個機器人監聽的聊天室。如果其中一個機器人位於遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway（請參閱[遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：增加防護措施，以免兩個機器人無限循環（僅限提及、頻道允許清單，或「不回覆機器人訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="我是否需要為多個代理設置獨立的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理擁有獨立的工作空間、模型預設值
    和路由。這是標準設置，比為每個代理運行一個 VPS 更便宜、更簡單。

    僅當您需要嚴格隔離（安全邊界）或您不想共享差異非常大的配置時，才使用單獨的 VPS。否則，請保留一個 Gateway
    並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與其從 VPS 使用 SSH，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    是的 —— 節點是從遠端 Gateway 連接到您的筆記型電腦的首要方式，而且
    它們解鎖的不僅僅是 Shell 存取權限。Gateway 執行於 macOS/Linux（Windows 透過 WSL2）並且
    是輕量級的（小型 VPS 或 Raspberry Pi 等級的機器即可；4 GB RAM 綽綽有餘），因此常見的
    設定就是一個永遠開機的主機加上您的筆記型電腦作為節點。

    - **無需 inbound SSH。** 節點會向外連接到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受該筆記型電腦上的節點允許清單/批准機制所限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還暴露了 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本地執行 Chrome，或者透過 Chrome MCP 附加到主機上的本地 Chrome。

    SSH 適用於臨時的 Shell 存取，但對於持續的代理工作流程和
    裝置自動化而言，節點更簡單。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點會執行 gateway 服務嗎？">
    不會。除非您刻意執行隔離的設定檔（請參閱 [多個 Gateway](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行 **一個 gateway**。節點是連接到
    gateway 的周邊裝置（iOS/Android 節點，或選單列應用程式中的 macOS 「節點模式」）。關於無頭節點
    主機和 CLI 控制，請參閱 [Node host CLI](/zh-Hant/cli/node)。

    對於 `gateway`、`discovery` 和 `canvasHost` 的變更需要完全重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式可以套用設定？">
    有的。

    - `config.schema.lookup`：在寫入前，透過其淺層架構節點、相符的 UI 提示及直接子摘要來檢視單一設定子樹
    - `config.get`：取得目前的快照 + 雜湊值
    - `config.patch`：安全的局部更新（多數 RPC 編輯的首選）；盡可能熱重載，必要時重新啟動
    - `config.apply`：驗證並取代完整設定；盡可能熱重載，必要時重新啟動
    - 僅限擁有者的 `gateway` 執行期工具仍拒絕改寫 `tools.exec.ask` / `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化至相同的受保護執行路徑

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

  <Accordion title="如何在 VPS 上設定 Tailscale 並從我的 Mac 連線？">
    最步驟：

    1. **在 VPS 上安裝並登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝並登入**
       - 使用 Tailscale 應用程式並登入至同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理主控台中啟用 MagicDNS，讓 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    若您想在無需 SSH 的情況下使用 Control UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會保持閘道綁定至 loopback 並透過 Tailscale 提供 HTTPS。參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連線到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連線。

    建議設定：

    1. **確保 VPS + Mac 位於同一個 tailnet 上**。
    2. **使用 macOS 應用程式的 Remote 模式** (SSH 目標可以是 tailnet 主機名稱)。
       應用程式將會建立 Gateway 通道的隧道並作為節點連線。
    3. **在 gateway 上核准該節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/zh-Hant/gateway/protocol)、[Discovery](/zh-Hant/gateway/discovery)、[macOS remote mode](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是只新增一個節點？">
    如果您只在第二台筆記型電腦上需要 **本機工具** (screen/camera/exec)，請將其新增為
    **節點**。這樣可以保持單一 Gateway 並避免重複設定。本機節點工具目前僅限 macOS，但我們計劃將其擴展到其他作業系統。

    只有當您需要 **強烈隔離** 或兩個完全分離的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 會從父程序 (shell、launchd/systemd、CI 等) 讀取環境變數，並額外載入：

    - 來自目前工作目錄的 `.env`
    - 來自 `~/.openclaw/.env` (亦即 `$OPENCLAW_STATE_DIR/.env`) 的全域備援 `.env`

    這兩個 `.env` 檔案都不會覆蓋現有的環境變數。

    您也可以在設定中定義內聯環境變數 (僅在程序環境中缺失時套用)：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    請參閱 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，環境變數卻消失了。該怎麼辦？">
    有兩種常見的修復方法：

    1. 將遺失的鍵值放入 `~/.openclaw/.env`，這樣即使服務未繼承您的 shell 環境，也能讀取到這些鍵值。
    2. 啟用 shell 匯入（選擇性的便利功能）：

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

    這會執行您的登入 shell 並僅匯入遺失的預期鍵值（絕不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off.」。為什麼？'>
    `openclaw models status` 回報是否已啟用 **shell env import（環境變數匯入）**。「Shell env: off」
    **並不**表示您的環境變數遺失了——這只是意味 OpenClaw 不會自動
    載入您的登入 shell。

    如果 Gateway 作為服務執行（launchd/systemd），它將不會繼承您的 shell
    環境。您可以透過以下其中一種方式修復：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其加入您的 config `env` 區塊（僅在遺失時套用）。

    然後重新啟動 gateway 並再次檢查：

    ```bash
    openclaw models status
    ```

    Copilot tokens 會從 `COPILOT_GITHUB_TOKEN` 讀取（亦支援 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 與 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## 工作階段與多重聊天

<AccordionGroup>
  <Accordion title="我如何開始新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不發送 /new，會話會自動重置嗎？">
    如果超過 `session.idleMinutes`，會話可能會過期，但這是**預設停用的**（預設值為 **0**）。
    將其設為正值以啟用閒置過期。啟用後，閒置期間後的**下一則**訊息將為該聊天金鑰啟動一個新的會話 ID。
    這不會刪除逐字稿——它只是啟動一個新的會話。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法組成一個 OpenClaw 實例團隊（一個 CEO 和多個代理程式）？">
    有的，透過**多代理程式路由**和**子代理程式**。您可以建立一個協調器
    代理程式和多個擁有各自工作空間和模型的工作者代理程式。

    儘管如此，這最好被視為一項**有趣的實驗**。它非常耗費 Token，且往往
    比使用具有不同會話的一個機器人效率更低。我們設想的典型模型是
    您與一個機器人對話，並使用不同的會話進行並行工作。該機器人也可以在需要時
    產生子代理程式。

    文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[代理程式 CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文會在任務中途被截斷？我該如何預防？">
    會話上下文受到模型視窗的限制。過長的聊天、龐大的工具輸出或過多
    的檔案都可能觸發壓縮或截斷。

    有幫助的做法：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保留在工作空間中，並要求機器人讀回。
    - 對於漫長或並行的工作使用子代理程式，以便保持主聊天較小。
    - 如果這種情況經常發生，請選擇具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留安裝狀態？">
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

    - 如果引導程式偵測到現有設定，也會提供 **Reset** 選項。請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重設每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發環境重置： `openclaw gateway --dev --reset` (僅限開發環境；會清除開發設定、憑證、會話及工作區)。

  </Accordion>

  <Accordion title='我收到「context too large」錯誤 —— 該如何重置或壓縮？'>
    使用以下任一方法：

    - **壓縮 (Compact)** (保留對話但總結較舊的輪次)：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結內容。

    - **重置 (Reset)** (為相同的聊天金鑰建立新的會話 ID)：

      ```
      /new
      /reset
      ```

    如果問題持續發生：

    - 啟用或調整 **會話修剪** (`agents.defaults.contextPruning`) 以移除舊的工具輸出。
    - 使用具有更大上下文視窗的模型。

    文件： [Compaction](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session management](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我會看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個供應商驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必要的
    `input`。這通常表示會話記錄已過時或損毀（常發生於長對話串
    或工具/結構描述變更後）。

    解決方法：使用 `/new` (獨立訊息) 開始新的會話。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30m** 執行一次（使用 OAuth 驗證時為 **1h**）。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行，並由模型決定要做什麼。

    針對每個代理的覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」新增至 WhatsApp 群組？'>
    不需要。OpenClaw 執行在 **您自己的帳號** 上，所以如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被封鎖，直到您允許發送者（`groupPolicy: "allowlist"`）。

    如果您希望只有 **您** 能觸發群組回覆：

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

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經配置/列入允許清單）：從配置中列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但未配置 `"*"`，且群組未被列入允許清單。

    參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與私訊共用上下文？">直接聊天預設會合併到主會話中。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒則是分開的會話。請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會話 + 逐字稿儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理程式越多意味著並行模型使用量越多。
    - **維運負擔：** 每個代理程式的設定檔、工作區和頻道路由。

    提示：

    - 為每個代理程式保留一個 **作用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增長，請修剪舊的會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來找出孤立的工作區和設定檔不符的情況。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天 (Slack) 嗎？該如何設定？">
    是的。使用 **多代理程式路由** 來執行多個獨立的代理程式，並透過頻道/帳號/對象路由傳入訊息。Slack 支援作為頻道，並可以綁定到特定的代理程式。

    瀏覽器存取功能強大但並非「能做到人類能做到的任何事」——反機器人措施、CAPTCHA 和多因素驗證 (MFA) 仍然會阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，或在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 永遠開啟的閘道主機 (VPS/Mac mini)。
    - 每個角色一個代理程式 (綁定)。
    - 綁定到這些代理程式的 Slack 頻道。
    - 根據需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：預設值、選擇、別名、切換

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定為的任何值：

    ```
    agents.defaults.model.primary
    ```

    模型引用為 `provider/model` （例如：`openai/gpt-5.4`）。如果您省略提供商，OpenClaw 首先會嘗試別名，然後嘗試該特定模型 ID 的唯一已配置提供者匹配，只有在這之後才會回退到已配置的預設提供者，作為一種已棄用的相容性路徑。如果該提供者不再公開已配置的預設模型，OpenClaw 將回退到第一個已配置的提供者/模型，而不是顯示陳舊的已移除提供者的預設值。您仍然應該 **明確地** 設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪種模型？">
    **推薦預設值：**使用您的提供者堆疊中最強大的最新一代模型。
    **對於已啟用工具或不可信輸入的代理：**優先考慮模型強度而非成本。
    **對於例行/低風險的聊天：**使用更便宜的後備模型，並根據代理角色進行路由。

    MiniMax 有其自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
    [本地模型](/zh-Hant/gateway/local-models)。

    經驗法則：對於高風險工作，使用您 **負擔得起的最佳模型**，並對於例行聊天或摘要使用較便宜的模型。您可以為每個代理路由模型，並使用子代理來
    並行化長任務（每個子代理都會消耗 Token）。請參閱 [模型](/zh-Hant/concepts/models) 和
    [子代理](/zh-Hant/tools/subagents)。

    嚴重警告：較弱/過度量化的模型更容易受到提示
    注入和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

    更多背景資訊：[模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **模型** 欄位。避免完全替換設定。

    安全選項：

    - 在聊天中使用 `/model`（快速，僅限當前會話）
    - `openclaw models set ...`（僅更新模型設定）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個設定，否則請避免使用部分物件進行 `config.apply`。
    對於 RPC 編輯，請先使用 `config.schema.lookup` 檢查，並優先使用 `config.patch`。查詢負載會提供標準化路徑、淺層架構文件/約束以及直接子項摘要。
    以進行部分更新。
    如果您確實覆寫了設定，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[模型](/zh-Hant/concepts/models)、[設定](/zh-Hant/cli/configure)、[Config](/zh-Hant/cli/config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管模型 (llama.cpp, vLLM, Ollama) 嗎？">
    可以。Ollama 是本地模型最簡單的途徑。

    最快的設定方式：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 拉取一個本地模型，例如 `ollama pull gemma4`
    3. 如果您也想要雲端模型，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    註記：

    - `Cloud + Local` 提供雲端模型以及您的本地 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 的雲端模型不需要本地拉取
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提醒：較小或高度量化的模型更容易受到提示注入（prompt injection）攻擊。我們強烈建議任何可以使用工具的機器人都使用 **大型模型**。如果您仍想使用小型模型，請啟用沙箱機制和嚴格的工具允許清單。

    文件：[Ollama](/zh-Hant/providers/ollama), [本地模型](/zh-Hant/gateway/local-models),
    [模型供應商](/zh-Hant/concepts/model-providers), [安全性](/zh-Hant/gateway/security),
    [沙箱機制](/zh-Hant/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">- 這些部署可能會有所不同，並可能隨時間改變；沒有固定的供應商推薦。 - 使用 `openclaw models status` 檢查每個閘道器目前的執行時設定。 - 對於對安全性敏感或啟用工具的代理程式，請使用可用的最強大最新世代模型。</Accordion>

  <Accordion title="如何即時切換模型（無需重啟）？">
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

    這些是內建別名。可以透過 `agents.defaults.models` 新增自訂別名。

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用的模型。

    `/model`（以及 `/model list`）會顯示精簡的編號選擇器。透過編號進行選擇：

    ```
    /model 3
    ```

    您也可以為提供者強制指定特定的設定檔（每個工作階段）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前啟用的代理、正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個驗證設定檔。
    當可用時，它也會顯示已設定的提供者端點 (`baseUrl`) 和 API 模式 (`api`)。

    **如何取消固定我用 @profile 設定的設定檔？**

    重新執行 `/model`，並**且不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想返回預設值，請從 `/model` 中選擇（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前啟用的驗證設定檔。

  </Accordion>

  <Accordion title="我可以將 GPT 5.2 用於日常工作，並將 Codex 5.3 用於編碼嗎？">
    可以。將其中一個設為預設值，並根據需要切換：

    - **快速切換（每個工作階段）：**日常任務使用 `/model gpt-5.4`，使用 Codex OAuth 進行編碼則使用 `/model openai-codex/gpt-5.4`。
    - **預設 + 切換：**將 `agents.defaults.model.primary` 設為 `openai/gpt-5.4`，然後在編碼時切換到 `openai-codex/gpt-5.4`（或反之亦然）。
    - **子代理：**將編碼任務路由到具有不同預設模型的子代理。

    請參閱 [模型](/zh-Hant/concepts/models) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我如何為 GPT 5.4 設定快速模式？">
    使用工作階段切換或組態預設值均可：

    - **每個工作階段：** 當工作階段使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 時，發送 `/fast on`。
    - **每個模型的預設值：** 將 `agents.defaults.models["openai/gpt-5.4"].params.fastMode` 設定為 `true`。
    - **Codex OAuth 也是：** 如果您也使用 `openai-codex/gpt-5.4`，請在那裡設定相同的標誌。

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

    對於 OpenAI，快速模式會在支援的原生 Responses 要求上對應到 `service_tier = "priority"`。工作階段 `/fast` 會覆寫 beat 組態預設值。

    請參閱 [思考與快速模式](/zh-Hant/tools/thinking) 和 [OpenAI 快速模式](/zh-Hant/providers/openai#openai-fast-mode)。

  </Accordion>

  <Accordion title='為什麼我看到「Model ... is not allowed」然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它就會成為 `/model` 和任何
    工作階段覆寫值的 **允許清單**。選擇不在該清單中的模型會傳回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會 **取代** 正常回覆被傳回。修正方法：將模型加入
    `agents.defaults.models`、移除允許清單，或從 `/model list` 中選擇一個模型。

  </Accordion>

  <Accordion title='為什麼我看到 "Unknown model: minimax/MiniMax-M2.7"？'>
    這表示**未設定供應商**（找不到 MiniMax 供應商設定或授權設定檔），因此無法解析模型。

    修復檢查清單：

    1. 升級至目前的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動 gateway。
    2. 確認已設定 MiniMax（精靈或 JSON），或 env/auth 設定檔中存在 MiniMax 授權，以便注入相符的供應商
       （`MINIMAX_API_KEY` 代表 `minimax`、`MINIMAX_OAUTH_TOKEN` 或已儲存的 MiniMax
       OAuth 代表 `minimax-portal`）。
    3. 針對您的授權路徑，使用正確的模型 ID（區分大小寫）：
       `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed` 用於
       API 金鑰設定，或 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` 用於 OAuth 設定。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選擇（或在聊天中使用 `/model list`）。

    參見 [MiniMax](/zh-Hant/providers/minimax) 與 [模型](/zh-Hant/concepts/models)。

  </Accordion>

  <Accordion title="我可以用 MiniMax 作為預設，並在複雜任務中使用 OpenAI 嗎？">
    可以。將 **MiniMax 設為預設**，並在需要時**依會話切換**模型。
    Fallback 是針對**錯誤**的，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

    **選項 A：依會話切換**

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

    **選項 B：獨立代理程式**

    - 代理程式 A 預設：MiniMax
    - 代理程式 B 預設：OpenAI
    - 透過代理程式路由或使用 `/agent` 進行切換

    文件：[模型](/zh-Hant/concepts/models)、[多代理程式路由](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的快捷方式嗎？">
    是的。OpenClaw 附帶了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了同名的別名，您的設定值將優先使用。

  </Accordion>

  <Accordion title="如何定義/覆寫模型快捷方式（別名）？">
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

    然後 `/model sonnet`（或在支援時使用 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何新增來自其他供應商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter（按 token 付費；多種模型）：

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

    如果您參照了某個供應商/模型，但缺少所需的供應商金鑰，您將會收到執行時期的認證錯誤（例如 `No API key found for provider "zai"`）。

    **新增代理後找不到供應商的 API 金鑰**

    這通常意味著 **新代理** 的認證儲存區是空的。認證是依代理而異的，並儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈設定過程中設定認證。
    - 或將 `auth-profiles.json` 從主代理的 `agentDir` 複製到新代理的 `agentDir` 中。

    請**勿**在代理之間重複使用 `agentDir`，這會導致認證/會衝突。

  </Accordion>
</AccordionGroup>

## 模型故障轉移與 "所有模型皆失敗"

<AccordionGroup>
  <Accordion title="故障轉移是如何運作的？">
    故障轉移分兩個階段進行：

    1. **認證設定檔輪替**，在同一供應商內進行。
    2. **模型降級**，切換到 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻機制適用於失敗的設定檔（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 仍能繼續回應。

    速率限制的範疇不僅包含單純的 `429` 回應。OpenClaw 也會將諸如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`resource exhausted` 等訊息，以及週期性的使用量視窗限制（`weekly/monthly limit reached`）視為值得觸發故障轉移的速率限制。

    某些看起來像是計費的回應並非 `402`，且某些 HTTP `402` 回應也保留在暫態範疇中。如果供應商在 `401` 或 `403` 上返回明確的計費文字，OpenClaw 仍可將其保留在計費通道中，但供應商特定的文字匹配器仍僅限於擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。如果 `402` 訊息看起來像是可重試的使用量視窗或組織/工作區支出限制（`daily limit reached, resets tomorrow`、`organization spending limit exceeded`），OpenClaw 會將其視為 `rate_limit`，而不是長期的計費停用。

    上下文溢出錯誤則不同：諸如 `request_too_large`、`input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`input is too long for the model` 或 `ollama error: context length exceeded` 等簽章會保留在壓縮/重試路徑上，而不會推進模型降級。

    通用伺服器錯誤文字的範圍刻意比「任何包含 unknown/error 的內容」更狹窄。OpenClaw 確實會處理供應商範圍內的暫態形式，例如 Anthropic 單純的 `An unknown error occurred`、OpenRouter 單純的 `Provider returned error`，以及如 `Unhandled stop reason: error`, JSON `api_error` 這類帶有暫態伺服器文字的停止原因錯誤（`internal server error`、`unknown error, 520`、`upstream error`、`backend error`), and provider-busy errors such as `ModelNotReadyException`），當供應商上下文匹配時，將其視為值得故障轉移的超時/過載訊號。通用的內部後備文字，如 `LLM request failed with an unknown error.`，則保持保守，本身不會觸發模型降級。

  </Accordion>

  <Accordion title='「找不到設定檔 anthropic:default 的憑證」是什麼意思？'>
    這表示系統嘗試使用驗證設定檔 ID `anthropic:default`，但無法在預期的驗證儲存空間中找到其憑證。

    **修復檢查清單：**

    - **確認驗證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（已由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY` 但透過 systemd/launchd 執行 Gateway，它可能無法繼承該變數。請將其置於 `~/.openclaw/.env` 中或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的代理程式**
      - 多代理程式設定表示可能存在多個 `auth-profiles.json` 檔案。
    - **檢查模型/驗證狀態**
      - 使用 `openclaw models status` 查看已設定的模型以及供應商是否已通過驗證。

    **「找不到設定檔 anthropic 的憑證」的修復檢查清單**

    這表示該執行被鎖定為 Anthropic 驗證設定檔，但 Gateway
    無法在其驗證儲存空間中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主機上執行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 置於 **gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用缺失設定檔的鎖定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您在 gateway 主機上執行指令**
      - 在遠端模式下，驗證設定檔位於 gateway 機器上，而非您的筆記型電腦。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未配置 Google 憑證，您將會看到 `No API key found for provider "google"`。

    修復方法：提供 Google 授權，或在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由轉向該處。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：會話歷史記錄包含**未簽名的思考區塊**（通常來自
    中止/不完整的串流）。Google Antigravity 要求思考區塊必須有簽章。

    修復方法：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽名的思考區塊。如果問題仍然存在，請啟動**新的會話**或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 驗證設定檔：它們是什麼以及如何管理它們

相關內容：[/concepts/oauth](/zh-Hant/concepts/oauth) (OAuth 流程、Token 儲存、多帳號模式)

<AccordionGroup>
  <Accordion title="什麼是驗證設定檔？">
    驗證設定檔是與提供者綁定的命名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的設定檔 ID 是什麼？">
    OpenClaw 使用提供者前綴的 ID，例如：

    - `anthropic:default` (當不存在電子郵件身分識別時很常見)
    - `anthropic:<email>` 用於 OAuth 身分識別
    - 您選擇的自訂 ID (例如 `anthropic:work`)

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個驗證設定檔嗎？">
    可以。設定檔支援可選的元資料，以及每個供應商的排序 (`auth.order.<provider>`)。這**不會**儲存機密；它會將 ID 對應到供應商/模式並設定輪替順序。

    如果設定檔處於短暫的 **冷卻** (cooldown) 狀態 (速率限制/逾時/驗證失敗) 或較長的 **停用** (disabled) 狀態 (帳單/額度不足)，OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整參數：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷卻可以是特定於模型的。針對某個模型正在冷卻的設定檔，對於同一供應商上的兄弟模型 (sibling model) 仍然可用，但帳單/停用期間仍會阻擋整個設定檔。

    您也可以透過 CLI 設定 **每個代理程式** 的排序覆寫 (儲存在該代理程式的 `auth-state.json` 中)：

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

    若要驗證實際上會嘗試什麼，請使用：

    ```bash
    openclaw models status --probe
    ```

    如果儲存的設定檔未包含在明確的排序中，探測 (probe) 會針對該設定檔回報 `excluded_by_auth_order`，而不是靜默地嘗試它。

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
  <Accordion title="閘道 (Gateway) 使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP (控制 UI、hooks 等) 的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示 "Runtime: running"，但 "Connectivity probe: failed"？'>
    因為 "running" 是 **監督程式** (supervisor) 的視角 (launchd/systemd/schtasks)。連線性探測則是 CLI 實際連線到閘道 WebSocket。

    使用 `openclaw gateway status` 並信任這幾行資訊：

    - `Probe target:` (探測實際使用的 URL)
    - `Listening:` (連接埠上實際綁定的項目)
    - `Last gateway error:` (常見的根本原因，當程序正在執行但連接埠未監聽時)

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 狀態顯示的「Config (cli)」和「Config (service)」不同？'>
    您正在編輯一個設定檔，但服務正在使用另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修復方法：

    ```bash
    openclaw gateway install --force
    ```

    請在您希望服務使用的同一個 `--profile` / 環境中執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行運行時鎖定（預設為 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個實例正在監聽。

    修復方法：停止另一個實例、釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何以遠端模式執行 OpenClaw（客戶端連線到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，可選擇搭配共用密鑰的遠端認證資訊：

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
    - `gateway.remote.token` / `.password` 僅為客戶端的遠端認證資訊；它們本身不會啟用本機 gateway 認證。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或不斷重新連線）。現在該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不相符。

    事實（來自程式碼）：

    - 控制介面會將權杖保留在 `sessionStorage` 中，用於當前瀏覽器分頁階段和所選的閘道 URL，因此同分頁重新整理能持續運作，無需還原長期 localStorage 權杖持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的客戶端可以嘗試使用快取的裝置權杖進行一次有界的重試。
    - 該快取權杖重試現在會重複使用與裝置權杖一起儲存的快取核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫端仍會保留其請求的範圍集，而不是繼承快取範圍。
    - 在該重試路徑之外，連線驗證優先順序首先是明確的共用權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 啟動權杖範圍檢查具有角色前綴。內建的啟動操作員允許清單僅滿足操作員請求；節點或其他非操作員角色仍需要在其自己的角色前綴下擁有範圍。

    修復方法：

    - 最快的方法：`openclaw dashboard`（列印並複製儀表板 URL，嘗試開啟；如果是無頭模式，則顯示 SSH 提示）。
    - 如果您還沒有權杖：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然後開啟 `http://127.0.0.1:18789/`。
    - 共用金鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制介面設定中貼上相符的密碼。
    - Tailscale Serve 模式：確保已啟用 `gateway.auth.allowTailscale`，且您正在開啟 Serve URL，而不是繞過 Tailscale 身分標頭的原始回送/tailnet URL。
    - 受信任的代理模式：確保您是透過設定的非回送身分感知代理連線，而不是同主機回送代理或原始閘道 URL。
    - 如果在一次重試後不匹配仍然存在，請輪替/重新核准配對的裝置權杖：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪替呼叫顯示被拒絕，請檢查兩件事：
      - 配對裝置階段只能輪替其**自己的**裝置，除非它們同時具有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫端當前的操作員範圍
    - 仍然卡住了？執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以了解驗證詳情。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind 從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），則沒有綁定的目標。

    修復方法：

    - 在該主機上啟動 Tailscale（使其具有 100.x 位址），或
    - 切換到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是顯式的。`auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不行——一個 Gateway 可以執行多個訊息通道和代理程式。只有在您需要冗餘（例如：救援機器人）或強隔離時才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH`（每個執行個體的設定）
    - `OPENCLAW_STATE_DIR`（每個執行個體的狀態）
    - `agents.defaults.workspace`（工作區隔離）
    - `gateway.port`（唯一的連接埠）

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...`（自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔設定中設定唯一的 `gateway.port`（或對手動執行傳遞 `--port`）。
    - 安裝每個設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「無效握手」/ code 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它期望第一條訊息是
    一個 `connect` 幀。如果收到其他任何內容，它會以
    **code 1008**（策略違規）關閉連線。

    常見原因：

    - 您在瀏覽器中打開了 **HTTP** URL (`http://...`) 而非 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或隧道剝離了認證標頭或發送了非 Gateway 請求。

    快速修復：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 則使用 `wss://...`）。
    2. 不要在正常的瀏覽器分頁中打開 WS 連接埠。
    3. 如果啟用了認證，請在 `connect` 幀中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協議詳情：[Gateway protocol](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌層級由 `logging.level` 控制。主控台詳細度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤：

    ```bash
    openclaw logs --follow
    ```

    服務/監督者日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多資訊請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助指令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 — 該如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2（推薦）：** Gateway 執行於 Linux 中。

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

    **2) 原生 Windows（不推薦）：** Gateway 直接執行於 Windows 中。

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

  <Accordion title="Gateway 已啟動但回應從未到達。我應該檢查什麼？">
    先從快速健康檢查開始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - Model auth 未載入於 **gateway host**（檢查 `models status`）。
    - 頻道配對/允許清單阻擋了回應（檢查頻道設定 + 記錄）。
    - WebChat/Dashboard 開啟時沒有正確的 token。

    如果您在遠端，請確認 tunnel/Tailscale 連線已啟動，且
    Gateway WebSocket 可存取。

    文件：[Channels](/zh-Hant/channels)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)、[Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" — 現在該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否有正確的 token？ `openclaw dashboard`
    4. 如果是遠端連線，tunnel/Tailscale 連線是否已啟動？

    然後查看記錄：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/zh-Hant/web/dashboard)、[Remote access](/zh-Hant/gateway/remote)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    首先檢查日誌和通道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤訊息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單項目過多。OpenClaw 已經自動修剪至 Telegram 限制並以較少的指令重試，但仍需要手動移除部分選單項目。請減少 plugin/skill/custom 指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於代理伺服器後方，請確認允許對外 HTTPS 連線且 `api.telegram.org` 的 DNS 解析正常。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[通道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可連接且代理程式可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看當前狀態。如果您預期在聊天通道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[Slash 指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 作為背景守護程式執行時請使用此方法。

    如果您在前台執行，請使用 Ctrl-C 停止，然後執行：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機工作階段中 **於前景** 執行閘道。

    如果您安裝了服務，請使用 gateway 指令。當您想要執行一次性、前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查記錄檔以了解通道驗證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    來自代理程式的輸出附件必須包含 `MEDIA:<path-or-url>` 行 (獨自一行)。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時檢查：

    - 目標通道支援輸出媒體，且未被允許清單封鎖。
    - 檔案在提供者的大小限制內 (圖片會調整大小至最大 2048px)。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制在工作區、temp/media-store 和沙盒驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送代理程式已可讀取的主機本機檔案，但僅限於媒體和安全的文件類型 (圖片、音訊、影片、PDF 和 Office 文件)。純文字和類似機密的檔案仍會被封鎖。

    參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露給傳入的私人訊息（DM）是否安全？">
    將傳入的私人訊息視為不受信任的輸入。預設值設計用於降低風險：

    - 支援私人訊息頻道的預設行為是**配對（pairing）**：
      - 未知的發送者會收到配對碼；機器人不會處理他們的訊息。
      - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每個頻道的待處理請求上限為 **3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私人訊息需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示有風險的私人訊息策略。

  </Accordion>

  <Accordion title="提示詞注入（Prompt injection）是否只是公開機器人的隱患？">
    不是。提示詞注入是關於**不受信任的內容**，而不僅僅是誰可以傳送私人訊息給機器人。
    如果您的助理讀取外部內容（網路搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    挾持模型的指令。即使**您是唯一的發送者**，也可能發生這種情況。

    最大的風險在於啟用工具時：模型可能被誘騙
    外洩上下文或代表您呼叫工具。您可以透過以下方式降低損害範圍：

    - 使用唯讀或已停用工具的「閱讀器」代理人來摘要不受信任的內容
    - 針對已啟用工具的代理人，請保持 `web_search` / `web_fetch` / `browser` 為關閉狀態
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件擷取都會將擷取的文字包裝在
      明確的外部內容邊界標記中，而不是傳遞原始檔案文字
    - 沙箱機制和嚴格的工具允許清單

    詳情：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設置來說都是如此。使用獨立的帳號和電話號碼將機器人隔離開來，
    可以在發生問題時減小受影響的範圍。這也讓在需要時輪換憑證或撤銷存取權限
    變得更容易，且不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號的存取權限，並在需要時
    稍後再進行擴展。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它全權處理我的簡訊，這樣安全嗎？">
    我們**不**建議讓它完全控制您的個人訊息。最安全的模式是：

    - 將私訊 (DM) 保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
    - 讓它草擬內容，然後在發送前**進行審核**。

    如果您想進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以使用更便宜的模型來執行個人助理任務嗎？">可以，**但前提是**代理程式僅用於聊天且輸入內容是受信任的。較小的等級 更容易受到指令劫持，因此請避免將其用於啟用工具的代理程式 或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒中執行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知的發送者向機器人發送訊息且
    已啟用 `dmPolicy: "pairing"` 時才會發送。單獨的 `/start` 不會產生代碼。

    檢查待處理的請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許清單，或為該帳號
    設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對運作方式為何？">
    不會。WhatsApp 私訊的預設原則是 **pairing（配對）**。未知的發送者只會收到配對碼，且其訊息 **不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確傳送。

    使用以下方式核准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：此號碼用於設定您的 **allowlist/owner（白名單/擁有者）**，以便允許您自己的私訊。它不會用於自動傳送。如果您在個人 WhatsApp 號碼上執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務和「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在該工作階段啟用 **verbose（詳細）**、**trace（追蹤）** 或 **reasoning（推理）** 時才會出現。

    在您看到該訊息的聊天中修復：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然顯示過多雜訊，請檢查 Control UI 中的工作階段設定，並將 verbose 設定為 **inherit（繼承）**。同時確認您未使用在設定中將 `verboseDefault` 設定為 `on` 的機器人設定檔。

    文件：[Thinking and verbose（思考與詳細輸出）](/zh-Hant/tools/thinking)、[Security（安全性）](/zh-Hant/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任一指令 **作為獨立訊息**（無斜線）：

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

    這些是中止觸發條件（並非斜線指令）。

    對於背景程序（來自 exec 工具），您可以要求代理執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [Slash commands（斜線指令）](/zh-Hant/tools/slash-commands)。

    大多數指令必須以 `/` 開頭的 **standalone（獨立）** 訊息傳送，但少數捷徑（例如 `/status`）也可以對已加入白名單的發送者行內使用。

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

  <Accordion title='為什麼機器人會感覺「忽略」了連續訊息？'>
    佇列模式控制新訊息如何與進行中的任務互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向目前的任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即導向，然後處理待辦事項
    - `interrupt` - 中止目前的執行並重新開始

    您可以新增選項，例如 `debounce:2s cap:25 drop:summarize` 用於後續模式。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY` （或在設定檔中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何內容（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 無法在正在執行之代理程式的預期 `auth-profiles.json`
    中找到 Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問或開啟 [GitHub 討論](https://github.com/openclaw/openclaw/discussions)。
