---
summary: "關於 OpenClaw 設定、配置和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對真實環境設置（本地開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答以及更深入的故障排除。若需執行時期診斷，請參閱[故障排除](/en/gateway/troubleshooting)。若需完整的配置參考，請參閱[配置](/en/gateway/configuration)。

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

   執行閘道健康檢查 + 提供者探測（需要可連線的閘道）。請參閱[健康狀態](/en/gateway/health)。

5. **追蹤最新日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕機，請改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱[日誌記錄](/en/logging)和[故障排除](/en/gateway/troubleshooting)。

6. **執行修復工具（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移配置/狀態 + 執行健康檢查。請參閱[修復工具](/en/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道請求完整快照（僅限 WS）。請參閱[健康狀態](/en/gateway/health)。

## 快速入門與首次執行設置

<AccordionGroup>
  <Accordion title="我卡住了，最快解決問題的方法">
    使用一個能夠**查看你的機器**的本地 AI 智能體。這比在 Discord 上提問要有效得多，因為大多數「卡住」的情況都是由於**本地配置或環境問題**造成的，而遠端協助者無法檢查這些問題。

    - **Claude Code**：[https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**：[https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取程式庫、執行指令、檢查日誌，並協助修復你的機器級別設定（PATH、服務、權限、認證檔案）。透過可駭客的安裝方式提供它們**完整的原始碼检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git 检出**安裝 OpenClaw，因此智能體可以讀取程式碼和文件，並推斷你正在執行的確切版本。你可以隨時在稍後透過不使用 `--install-method git` 重新執行安裝程式來切換回穩定版本。

    提示：請要求智能體**計劃並監督**修復過程（逐步進行），然後僅執行必要的指令。這可以保持變動較小且更容易稽核。

    如果你發現真正的錯誤或修復方法，請提交 GitHub issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（在尋求協助時分享輸出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`：快速快照閘道/智能體健康狀況 + 基本配置。
    - `openclaw models status`：檢查提供者認證 + 模型可用性。
    - `openclaw doctor`：驗證並修復常見的配置/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯循環：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安裝文件：[Install](/en/install)、[Installer flags](/en/install/installer)、[Updating](/en/install/updating)。

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

<Accordion title="完成入門指引後如何開啟儀表板？">精靈會在入門指引完成後立即使用乾淨（未標記化）的儀表板 URL 開啟您的瀏覽器，並在摘要中列印該連結。請保持該分頁開啟；如果未自動啟動，請在同一台機器上複製/貼上列印出的 URL。</Accordion>

  <Accordion title="在本地與遠端環境下，我如何通過儀表板進行驗證（Token）？">
    **Localhost（同一台機器）：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求驗證，請將 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的 Token 貼上到 Control UI 設定中。
    - 從 gateway 主機擷取：`openclaw config get gateway.auth.token`（或產生一個：`openclaw doctor --generate-gateway-token`）。

    **非 localhost：**

    - **Tailscale Serve**（推薦）：保持 loopback 繫結，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，識別標頭將滿足 Control UI/WebSocket 驗證（無需 Token，假設為受信任的 gateway 主機）；HTTP API 仍需要 Token/密碼。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`，開啟 `http://<tailscale-ip>:18789/`，將 Token 貼上到儀表板設定中。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/` 並將 Token 貼上到 Control UI 設定中。

    請參閱 [Dashboard](/en/web/dashboard) 和 [Web surfaces](/en/web) 以了解繫結模式和驗證細節。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    必須使用 Node **>= 22**。建議使用 `pnpm`。Bun **不推薦**用於 Gateway。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上執行嗎？">
    可以。Gateway 很輕量 —— 文件列出 **512MB-1GB RAM**、**1 核心**和約 **500MB** 磁碟空間作為個人使用的最低要求，並指出 **Raspberry Pi 4 可以執行它**。

    如果你想要一些餘裕（日誌、媒體、其他服務），建議使用 **2GB**，但這不是硬性最低要求。

    提示：一台小型 Pi/VPS 可以託管 Gateway，你可以將筆記型電腦/手機上的 **節點** 進行配對，以實現本機螢幕/相機/畫布或指令執行。參閱 [Nodes](/en/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有任何建議嗎？">
    簡單來說：可以用，但預期會有些粗糙的邊緣情況。

    - 使用 **64 位元** 作業系統並保持 Node >= 22。
    - 優先選擇 **可駭客化 的安裝**，以便查看日誌並快速更新。
    - 一開始不啟用頻道/技能，然後逐一新增。
    - 如果遇到奇怪的二進位問題，通常是 **ARM 相容性** 問題。

    文件：[Linux](/en/platforms/linux)、[Install](/en/install)。

  </Accordion>

  <Accordion title="它卡在 wake up my friend / onboarding will not hatch。該怎麼辦？">
    該畫面依賴於 Gateway 可連線且已通過驗證。TUI 也會在首次孵化時自動發送 "Wake up, my friend!"。如果你看到該行文字卻**沒有回應**，且 Token 數維持在 0，表示 Agent 從未執行。

    1. 重啟 Gateway：

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

    如果 Gateway 是遠端的，請確保通道/Tailscale 連線正常，且 UI 指向正確的 Gateway。參閱 [Remote access](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我可以將設定遷移到新機器（Mac mini）而不需要重新進入入門流程嗎？">
    可以。複製 **狀態目錄 (state directory)** 和 **工作區 (workspace)**，然後執行一次 Doctor。只要您複製了這**兩個**位置，這就能讓您的機器人保持「完全相同」（記憶、會話記錄、驗證和頻道狀態）：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設值：`~/.openclaw`）。
    3. 複製您的工作區（預設值：`~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、驗證設定檔、WhatsApp 憑證、會話和記憶。如果您處於遠端模式，請記得 Gateway 主機擁有會話儲存和工作區。

    **重要：** 如果您只是將工作區提交/推送 (commit/push) 到 GitHub，您備份的是 **記憶 + 引導檔案**，但**不包含**會話記錄或驗證資料。這些資料位於 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關主題：[遷移](/en/install/migrating)、[檔案系統位置](#where-things-live-on-disk)、
    [Agent 工作區](/en/concepts/agent-workspace)、[Doctor](/en/gateway/doctor)、
    [遠端模式](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以看到最新版本的新功能？">
    請查看 GitHub 更新日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部區段標記為 **Unreleased**，則下一個帶有日期的區段是最新發布的版本。條目分組為 **亮點**、**變更** 和 **修復**（以及需要的文件/其他區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai (SSL 錯誤)">
    部分 Comcast/Xfinity 連線透過 Xfinity Advanced Security 錯誤地阻擋了 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。更多詳細資訊：[疑難排解](/en/help/faq#cannot-access-docsopenclaw-ai-ssl-error)。
    請在此回報以幫助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍無法連上該網站，文件已鏡像至 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="穩定版與 Beta 版的差別">
    **Stable** 和 **beta** 是 **npm dist-tags**，而非獨立的程式碼分支：

    - `latest` = 穩定版
    - `beta` = 用於測試的早期建置

    我們會將建置發佈至 **beta**，進行測試，一旦建置穩定後，我們會將該版本**提升至 `latest`**。這就是為什麼 beta 和 stable 可能會指向**相同版本**的原因。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="如何安裝 Beta 版？Beta 版與 Dev 版有何不同？">
    **Beta** 是 npm dist-tag `beta` (可能與 `latest` 相同)。
    **Dev** 是 `main` (git) 的最新開發版本；發佈時，它使用 npm dist-tag `dev`。

    單行指令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安裝程式 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多詳細資訊：[開發管道](/en/install/development-channels) 和 [安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="如何試用最新版本？">
    有兩種選擇：

    1. **開發頻道 (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從原始碼更新。

    2. **可修改的安裝 (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本地儲存庫，然後透過 git 更新。

    如果您偏好手動進行乾淨的複製，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[更新](/en/cli/update)、[開發頻道](/en/install/development-channels)、
    [安裝](/en/install)。

  </Accordion>

  <Accordion title="安裝和上手通常需要多久？">
    概略指南：

    - **安裝：** 2-5 分鐘
    - **上手：** 5-15 分鐘，視您設定的頻道/模型數量而定

    如果它卡住了，請使用 [安裝程式卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速除錯迴圈。

  </Accordion>

  <Accordion title="安裝程式卡住了？如何獲得更多回饋資訊？">
    使用 **詳細輸出** 重新執行安裝程式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用詳細輸出進行 Beta 安裝：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    對於可修改 (git) 安裝：

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

    更多選項：[安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝提示找不到 git 或無法識別 openclaw">
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法識別 openclaw**

    - 您的 npm 全域 bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增到您的使用者 PATH（Windows 上不需要 `\bin` 後綴；在大多數系統上它是 `%AppData%\npm`）。
    - 更新 PATH 後，關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/en/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 我該怎麼辦？">
    這通常是原生 Windows Shell 上的主控台字碼頁不匹配。

    症狀：

    - `system.run`/`exec` 輸出將中文渲染為亂碼
    - 相同的指令在另一個終端機設定檔中看起來正常

    PowerShell 中的快速解決方法：

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

  <Accordion title="文件沒有回答我的問題 - 如何獲得更好的答案？">
    使用 **可破解 (git) 安裝**，以便您在本地擁有完整的來源和文件，然後_從該資料夾中_詢問您的機器人（或 Claude/Codex），以便它可以讀取儲存庫並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多細節：[安裝](/en/install) 和 [安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝 OpenClaw？">
    簡短回答：按照 Linux 指南操作，然後執行入門設定。

    - Linux 快速路徑 + 服務安裝：[Linux](/en/platforms/linux)。
    - 完整指南：[入門指南](/en/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/en/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 均可運作。在伺服器上安裝，然後使用 SSH/Tailscale 連線至 Gateway。

    指南：[exe.dev](/en/install/exe-dev)、[Hetzner](/en/install/hetzner)、[Fly.io](/en/install/fly)。
    遠端存取：[Gateway 遠端](/en/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們針對常見的供應商維護了一個**託管中心**。選擇其中一個並依照指南操作：

    - [VPS 託管](/en/vps) (所有供應商在一處)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    在雲端的運作方式：**Gateway 在伺服器上運行**，您可以透過 Control UI (或 Tailscale/SSH) 從您的筆記型電腦/手機存取它。您的狀態 + 工作區位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將 **節點** (Mac/iOS/Android/headless) 配對至該雲端 Gateway，以存取本機螢幕/相機/畫布，或在將 Gateway 留在雲端時於您的筆記型電腦上執行指令。

    中心：[平台](/en/platforms)。遠端存取：[Gateway 遠端](/en/gateway/remote)。
    節點：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 自行更新嗎？">
    簡短回答：**可以，但不建議**。更新流程可能會重新啟動
    Gateway（這會中斷目前的連線階段），可能需要乾淨的 git checkout，並
    可能會提示確認。較安全的方式：以操作員身分從 shell 執行更新。

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

  <Accordion title="我需要 Claude 或 OpenAI 訂閱才能執行此程式嗎？">
    不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或使用
    **僅限本機的模型** 來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱（Claude
    Pro/Max 或 OpenAI Codex）是驗證這些提供者的選擇性方式。

    如果您選擇 Anthropic 訂閱驗證，請自行決定是否使用：
    Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱的使用。
    OpenAI Codex OAuth 明確支援像 OpenClaw 這樣的外部工具。

    文件：[Anthropic](/en/providers/anthropic)、[OpenAI](/en/providers/openai)、
    [本機模型](/en/gateway/local-models)、[模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    是的。您可以使用 **setup-token**
    代替 API 金鑰進行驗證。這就是訂閱路徑。

    Claude Pro/Max 訂閱 **不包含 API 金鑰**，因此這是訂閱帳號的技術路徑。但這取決於您的決定：Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用。
    如果您想要生產環境中最清晰且最安全的支援路徑，請使用 Anthropic API 金鑰。

  </Accordion>

<Accordion title="Anthropic setup-token 驗證如何運作？">
  `claude setup-token` 透過 Claude Code CLI 產生 **token 字串**（無法在網頁主控台取得）。您可以在**任何機器**上執行它。在引導流程中選擇 **Anthropic token (paste setup-token)**，或是使用 `openclaw models auth paste-token --provider anthropic` 貼上它。此 token 會儲存為 **anthropic** 提供者的驗證設定檔，並像 API 金鑰一樣使用（不會 自動刷新）。更多詳情：[OAuth](/en/concepts/oauth)。
</Accordion>

  <Accordion title="我在哪裡可以找到 Anthropic setup-token？">
    它**不**在 Anthropic Console 中。setup-token 是由 **Claude Code CLI** 在**任何機器**上產生的：

    ```bash
    claude setup-token
    ```

    複製它列印出的 token，然後在引導流程中選擇 **Anthropic token (paste setup-token)**。如果您想在 gateway 主機上執行，請使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方執行了 `claude setup-token`，請使用 `openclaw models auth paste-token --provider anthropic` 將其貼上到 gateway 主機。參閱 [Anthropic](/en/providers/anthropic)。

  </Accordion>

  <Accordion title="您是否支援 Claude 訂閱驗證（Claude Pro 或 Max）？">
    是的 - 透過 **setup-token**。OpenClaw 不再重複使用 Claude Code CLI OAuth 權杖；請使用 setup-token 或 Anthropic API 金鑰。您可以在任何地方產生權杖，並將其貼上到 Gateway 主機。參閱 [Anthropic](/en/providers/anthropic) 和 [OAuth](/en/concepts/oauth)。

    重要提示：這表示技術上的相容性，並非政策保證。Anthropic 過去曾阻擋部分在 Claude Code 之外的訂閱使用。
    您需要自行決定是否使用，並確認 Anthropic 的目前條款。
    對於生產環境或多使用者工作負載，Anthropic API 金鑰驗證是更安全且建議的選擇。

  </Accordion>

  <Accordion title="為什麼我會收到來自 Anthropic 的 HTTP 429 rate_limit_error 錯誤？">
    這表示您的 **Anthropic 配額/速率限制** 在目前時間視窗內已用盡。如果您
    使用 **Claude 訂閱** (setup-token)，請等待時間視窗
    重設或升級您的方案。如果您使用 **Anthropic API 金鑰**，請檢查 Anthropic Console
    的使用量/帳單情況，並視需要提高限制。

    如果訊息特別是：
    `Extra usage is required for long context requests`，表示請求正在嘗試使用
    Anthropic 的 1M context beta (`context1m: true`)。這僅在您的
    憑證符合長 context 計費資格（API 金鑰計費或已啟用額外使用量的
    訂閱）時有效。

    提示：設定一個 **備用模型**，以便當供應商受到速率限制時，OpenClaw 仍能繼續回覆。
    參閱 [Models](/en/cli/models)、[OAuth](/en/concepts/oauth) 和
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">是的 - 透過 pi-ai 的 **Amazon Bedrock (Converse)** 提供者並搭配**手動設定**。您必須在閘道主機上提供 AWS 憑證/區域，並在您的模型設定中新增 Bedrock 提供者項目。請參閱 [Amazon Bedrock](/en/providers/bedrock) 和 [模型提供者](/en/providers/models)。如果您偏好受控金鑰流程，在 Bedrock 前方架設一個 OpenAI 相容的代理伺服器仍然是一個可行的選項。</Accordion>

<Accordion title="Codex 驗證如何運作？">OpenClaw 透過 OAuth（ChatGPT 登入）支援 **OpenAI Code (Codex)**。入學流程可以執行 OAuth 流程，並在適當時將預設模型設定為 `openai-codex/gpt-5.4`。請參閱 [模型提供者](/en/concepts/model-providers) 和 [入學 (CLI)](/en/start/wizard)。</Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在像 OpenClaw 這類的外部工具/工作流程中使用訂閱 OAuth。
    入學流程可以為您執行 OAuth 流程。

    請參閱 [OAuth](/en/concepts/oauth)、[模型提供者](/en/concepts/model-providers) 和 [入學 (CLI)](/en/start/wizard)。

  </Accordion>

  <Accordion title="我該如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用的是**外掛程式驗證流程**，而非 `openclaw.json` 中的客戶端 ID 或密鑰。

    步驟：

    1. 啟用外掛程式：`openclaw plugins enable google`
    2. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳情：[模型提供者](/en/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型適合隨意聊天嗎？">通常不行。OpenClaw 需要大型上下文 + 強大的安全性；小顯卡會導致截斷和洩漏。如果你必須這樣做，請在本地（LM Studio）運行你能負擔的**最大** MiniMax M2.5 版本，並參閱 [/gateway/local-models](/en/gateway/local-models)。較小/量化模型會增加提示注入風險 - 請參閱 [Security](/en/gateway/security)。</Accordion>

<Accordion title="如何將託管模型流量保留在特定區域？">選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管選項；選擇美國託管變體可將數據保留在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型一起列出，以便在尊重您選擇的區域提供商的同時保持備用可用性。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 在 macOS 或 Linux（Windows 通過 WSL2）上運行。Mac mini 是可選的 - 有些人
    購買它作為始終在線的主機，但小型 VPS、家庭伺服器或 Raspberry Pi 級別的設備也可以。

    您只需要 Mac **來使用僅限 macOS 的工具**。對於 iMessage，請使用 [BlueBubbles](/en/channels/bluebubbles)（推薦）- BlueBubbles 伺服器在任何 Mac 上運行，而 Gateway 可以在 Linux 或其他地方運行。如果您想要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

    文檔：[BlueBubbles](/en/channels/bluebubbles), [Nodes](/en/nodes), [Mac remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    您需要**某台已登入訊息 (Messages) 的 macOS 裝置**。它**不**必須是 Mac mini ——
    任何 Mac 都可以。針對 iMessage，**請使用 [BlueBubbles](/en/channels/bluebubbles)** (推薦) —— BlueBubbles 伺服器在 macOS 上執行，而 Gateway 可以在 Linux 或其他地方執行。

    常見設定：

    - 在 Linux/VPS 上執行 Gateway，並在任何已登入訊息 的 Mac 上執行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請將所有內容都執行在 Mac 上。

    文件：[BlueBubbles](/en/channels/bluebubbles), [節點](/en/nodes),
    [Mac 遠端模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將其連接到我的 MacBook Pro 嗎？">
    可以的。 **Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為
    **節點** (companion device) 連線。節點不執行 Gateway —— 它們提供額外功能，例如該裝置上的螢幕/相機/畫布 和 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上 (始終開啟)。
    - MacBook Pro 執行 macOS 應用程式或節點主機並與 Gateway 配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

    文件：[節點](/en/nodes), [節點 CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    **不建議**使用 Bun。我們發現執行時期錯誤，特別是在 WhatsApp 和 Telegram 方面。
    請使用 **Node** 以獲得穩定的 Gateway。

    如果您仍想嘗試使用 Bun，請在非生產環境的 Gateway 上進行，
    且不要包含 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中應填入什麼？">
    `channels.telegram.allowFrom` 是 **發送者的 Telegram 使用者 ID**（數字）。它不是 Bot 的使用者名稱。

    入職引導接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

    更安全的方式（無第三方 Bot）：

    - 私訊您的 Bot，然後執行 `openclaw logs --follow` 並閱讀 `from.id`。

    官方 Bot API：

    - 私訊您的 Bot，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並閱讀 `message.from.id`。

    第三方（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/en/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人可以使用一個 WhatsApp 號碼搭配不同的 OpenClaw 實例嗎？">
  可以，透過 **多代理路由**。將每個發送者的 WhatsApp **私訊**（peer `kind: "direct"`，發送者 E.164 例如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區和會話存儲。回覆仍然來自 **同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）對每個 WhatsApp 帳號是全局的。參見 [Multi-Agent Routing](/en/concepts/multi-agent) 和
  [WhatsApp](/en/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行一個「快速聊天」代理和一個「Opus 編程」代理嗎？">可以。使用多代理路由：為每個代理分配自己的預設模型，然後將入站路由（提供者帳號或特定對象）綁定到每個代理。範例配置位於 [Multi-Agent Routing](/en/concepts/multi-agent)。另請參見 [Models](/en/concepts/models) 和 [Configuration](/en/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    是的。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` (或您的 brew 前綴)，這樣 `brew` 安裝的工具才能在非登入 shell 中解析。
    近期的版本也會在 Linux systemd 服務中前置常見的使用者 bin 目錄 (例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`)，並在設置時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可駭改的 git 安裝與 npm 安裝有什麼區別？">
    - **可駭改 (git) 安裝：** 完整的原始碼检出，可編輯，最適合貢獻者。
      您在本地執行構建並可以修補程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無 repo，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[入門指南](/en/start/getting-started)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="我之後可以在 npm 和 git 安裝之間切換嗎？">
    是的。安裝另一種版本，然後執行 Doctor，以便閘道服務指向新的進入點。
    這**不會刪除您的資料**——它只會變更 OpenClaw 程式碼的安裝位置。您的狀態
    (`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 將保持不變。

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

    Doctor 會檢測到閘道服務進入點不匹配，並提議重寫服務配置以符合當前安裝 (在自動化中使用 `--repair`)。

    備份提示：請參閱 [備份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在我的筆記型電腦還是 VPS 上運行 Gateway？">
    簡短的回答：**如果您希望 24/7 全天候可靠運作，請使用 VPS**。如果您希望
    達到最低阻力，並且不介意休眠/重啟，則在本地運行。

    **筆記型電腦 (本機 Gateway)**

    - **優點：** 無伺服器成本，可直接存取本地檔案，即時瀏覽器視窗。
    - **缺點：** 休眠/網路斷線 = 中斷連線，OS 更新/重開機會造成干擾，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠上線，網路穩定，無筆記型電腦休眠問題，更容易維持運作。
    - **缺點：** 通常以無頭模式 (headless) 執行 (使用截圖)，僅能遠端存取檔案，您必須透過 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost (外掛)/Discord 都可以在 VPS 上順暢運作。唯一的真正權衡取捨是 **無頭瀏覽器** 與可見視窗的差異。請參閱 [瀏覽器](/en/tools/browser)。

    **建議預設值：** 如果您之前曾遇到 Gateway 中斷連線，請使用 VPS。當您正在積極使用 Mac 並且希望存取本地檔案或使用可見瀏覽器進行 UI 自動化時，本機執行則非常棒。

  </Accordion>

  <Accordion title="在專屬機器上運行 OpenClaw 有多重要？">
    並非強制要求，但為了**可靠性和隔離性，建議採用**。

    - **專屬主機 (VPS/Mac mini/Pi)：** 永遠上線，較少的休眠/重啟干擾，權限更乾淨，更容易維持運作。
    - **共用的筆記型電腦/桌機：** 對於測試和主動使用來說完全沒問題，但當機器休眠或更新時，預期會有暫停情況。

    如果您想要兩全其美，請將 Gateway 保留在專屬主機上，並將您的筆記型電腦配對為 **節點** (node)，以用於本機畫面/相機/exec 工具。請參閱 [節點](/en/nodes)。
    如需安全性指引，請閱讀 [安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="最低的 VPS 需求和推薦的作業系統是什麼？">
    OpenClaw 是輕量級的。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，~500MB 磁碟空間。
    - **建議規格：** 1-2 vCPU，2GB RAM 或更多以保留餘裕（日誌、媒體、多個頻道）。Node 工具和瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS**（或任何現代 Debian/Ubuntu）。Linux 安裝路徑在此處經過最充分的測試。

    文件：[Linux](/en/platforms/linux)，[VPS hosting](/en/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求是什麼？">
    可以。將 VM 視為與 VPS 相同：它需要保持開機、可連線，並且擁有足夠的 RAM 給 Gateway 和您啟用的任何頻道。

    基本指導原則：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議規格：** 2GB RAM 或更多，如果您執行多個頻道、瀏覽器自動化或媒體工具。
    - **作業系統：** Ubuntu LTS 或其他現代 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 風格設定**，並且具有最佳的工具相容性。請參閱 [Windows](/en/platforms/windows)，[VPS hosting](/en/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/en/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話描述 OpenClaw 是什麼？">
    OpenClaw 是您在自己的裝置上執行的個人 AI 助理。它會在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost (plugin)、Discord、Google Chat、Signal、iMessage、WebChat），並且可以在支援的平台上進行語音和即時 Canvas 操作。**Gateway** 是永遠在線的控制平面；而助理則是產品本身。
  </Accordion>

  <Accordion title="Value proposition">
    OpenClaw 不僅僅是「Claude 的外殼」。它是一個**優先考慮本地的控制平面**，讓您可以在**自己的硬體上**執行強大的助手，透過您已經習慣使用的聊天應用程式進行存取，並具備有狀態的會話、記憶和工具功能——而無需將您的工作流程控制權交給託管的 SaaS。

    重點如下：

    - **您的裝置，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）執行 Gateway，並將工作區 + 會話紀錄保留在本地。
    - **真實頻道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支援的平台上的行動語音和 Canvas。
    - **模型無關性：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並提供每個代理的路由和故障轉移。
    - **純本地選項：** 執行本地模型，因此如果願意，**所有資料都可以保留在您的裝置上**。
    - **多代理路由：** 每個頻道、帳號或任務使用分開的代理，每個代理都有自己的工作區和預設值。
    - **開源且可駭改：** 檢視、擴展和自託管，無供應商鎖定。

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

  <Accordion title="OpenClaw 能否協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格經營？">
    在**研究、篩選和草擬**方面是可以的。它可以掃描網站、建立候選名單、摘要潛在客戶，並撰寫外聯或廣告文案草稿。

    對於**外聯或廣告投放**，請保持人工在環中。避免垃圾訊息，遵守當地法律和平台政策，並在發送前審核所有內容。最安全的模式是讓 OpenClaw 起草，然後由您審核批准。

    文件：[安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="與 Claude Code 相比，在網頁開發方面有哪些優勢？">
    OpenClaw 是一個**個人助理**和協調層，而不是 IDE 的替代品。請在程式庫內使用 Claude Code 或 Codex 來進行最快的直接編碼迴圈。當您需要持久記憶、跨設備存取和工具協調時，請使用 OpenClaw。

    優勢：

    - 跨會話的**持久記憶 + 工作區**
    - **多平台存取** (WhatsApp, Telegram, TUI, WebChat)
    - **工具協調** (瀏覽器、檔案、排程、掛鉤)
    - **始終在線的 Gateway** (在 VPS 上運行，從任何地方互動)
    - 用於本地瀏覽器/螢幕/相機/執行的 **Nodes**

    展示： [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不弄儲存庫的情況下自訂技能？">
    使用管理覆寫而不是編輯儲存庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增資料夾）。優先順序是 `<workspace>/skills` > `~/.openclaw/skills` > bundled，因此管理覆寫會勝出而無需觸碰 git。只有值得合併到上游的編輯才應該存在於儲存庫中並作為 PR 發送。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增額外目錄（優先順序最低）。預設優先順序保持不變：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 在下一次工作階段會將其視為 `<workspace>/skills`。
  </Accordion>

  <Accordion title="我如何為不同的任務使用不同的模型？">
    目前支援的模式如下：

    - **Cron 任務**：獨立的任務可以為每個任務設定 `model` 覆寫。
    - **子代理**：將任務路由到具有不同預設模型的獨立代理。
    - **按需切換**：隨時使用 `/model` 切換目前的工作階段模型。

    參閱 [Cron 任務](/en/automation/cron-jobs)、[多代理路由](/en/concepts/multi-agent) 和 [斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我該如何卸載該工作？">
    使用 **子代理** 來處理長時間或並行任務。子代理在自己的會話中運行，
    返回摘要，並保持您的主聊天響應迅速。

    要求您的機器人「為此任務生成一個子代理」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看網關當前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理都會消耗 token。如果成本是個問題，請透過 `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

    文件：[子代理](/en/tools/subagents)。

  </Accordion>

  <Accordion title="Discord 上綁定執行緒的子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保持在該綁定的會話上。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 生成（並可選擇使用 `mode: "session"` 進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要設定：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[子代理](/en/tools/subagents)、[Discord](/en/channels/discord)、[設定參考](/en/gateway/configuration-reference)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒沒有觸發。我應該檢查什麼？">
    Cron 在 Gateway 進程內運行。如果 Gateway 不是持續運行，
    排程的工作將不會執行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運行（無休眠/重啟）。
    - 驗證工作的時區設定 (`--tz` 與主機時區)。

    除錯：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron jobs](/en/automation/cron-jobs)、[Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝 skills？">
    使用原生的 `openclaw skills` 指令或將 skills 放入您的工作區。macOS Skills UI 在 Linux 上無法使用。
    在此瀏覽 skills：[https://clawhub.com](https://clawhub.com)。

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    僅在您想要發佈或同步您自己的 skills 時，才安裝獨立的 `clawhub` CLI。

  </Accordion>

  <Accordion title="OpenClaw 可以依排程或在後台持續執行任務嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後持續存在）。
    - **Heartbeat** 用於「主工作階段」的定期檢查。
    - **Isolated jobs** 用於發布摘要或傳遞至聊天的自主代理程式。

    文件：[Cron jobs](/en/automation/cron-jobs)、[Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)、
    [Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上執行僅限 Apple macOS 的技能嗎？">
    無法直接執行。macOS 技能受 `metadata.openclaw.os` 以及必要的二進制檔案限制，而且只有在 **Gateway 主機**上符合條件時，這些技能才會出現在系統提示中。在 Linux 上，僅限 `darwin` 的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）除非您覆寫了限制條件，否則不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進制檔案的地方執行 Gateway，然後從 Linux 以 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或透過 Tailscale 進行連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無需 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進制檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合條件。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示中批准「Always Allow」會將該指令加入允許清單。

    **選項 C - 透過 SSH 代理 macOS 二進制檔案（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進制檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合條件。

    1. 為二進制檔案建立 SSH 包裝程式（例如：針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放置在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆寫技能元數據（工作區或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動一個新的工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="您有 Notion 或 HeyGen 整合嗎？">
    目前尚未內建。

    選項如下：

    - **自訂技能 / 外掛**：最適合可靠的 API 存取（Notion/HeyGen 都有 API）。
    - **瀏覽器自動化**：無需編碼即可運作，但速度較慢且較不穩定。

    如果您想依客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理在會話開始時取得該頁面。

    如果您想要原生整合，請開啟功能請求或建立針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會置於啟用的工作區 `skills/` 目錄中。若要跨代理共用技能，請將其置於 `~/.openclaw/skills/<name>/SKILL.md`。某些技能預期透過 Homebrew 安裝二元檔；在 Linux 上這表示 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/en/tools/skills) 和 [ClawHub](/en/tools/clawhub)。

  </Accordion>

  <Accordion title="如何使用我現有的已登入 Chrome 與 OpenClaw 搭配？">
    使用內建的 `user` 瀏覽器設定檔，透過 Chrome DevTools MCP 連接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑為主機本機。如果閘道在其他地方執行，請在瀏覽器機器上執行節點主機，或改用遠端 CDP。

  </Accordion>
</AccordionGroup>

## 沙盒與記憶體

<AccordionGroup>
  <Accordion title="是否有專屬的沙盒文件？">
    有的。請參閱 [沙盒](/en/gateway/sandboxing)。針對 Docker 特定設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺功能受限 - 如何啟用完整功能？">
    預設映像檔以安全為先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或隨附的瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，以便快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項內建至映像檔中。
    - 透過隨附的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已持續保存。

    文件：[Docker](/en/install/docker)、[Browser](/en/tools/browser)。

  </Accordion>

  <Accordion title="我是否可以保持 DM 私人，但讓群組公開/在沙盒中使用單一 Agent？">
    是的 - 如果您的私人流量是 **DM** 而公開流量是 **groups**。

    使用 `agents.defaults.sandbox.mode: "non-main"` 讓群組/頻道階段（非主要金鑰）在 Docker 中執行，而主要的 DM 階段則保持在主機上。然後透過 `tools.sandbox.tools` 限制沙盒階段中可用的工具。

    設定逐步解說 + 範例設定：[Groups: personal DMs + public groups](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    關鍵設定參考：[Gateway configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="如何將主機資料夾綁定至沙盒？">
  將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域 + 每個 Agent 的綁定會合併；當 `scope: "shared"` 時，會忽略每個 Agent 的綁定。對於任何敏感內容，請使用 `:ro`，並記住綁定會繞過沙盒檔案系統牆。請參閱 [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs
  Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全注意事項。
</Accordion>

  <Accordion title="記憶如何運作？">
    OpenClaw 的記憶只是代理工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的策劃長期筆記（僅限主要/私人工作階段）

    OpenClaw 還會執行**靜默預壓縮記憶刷新**，以提醒模型
    在自動壓縮之前寫入持久化筆記。這僅在工作區
    可寫入時執行（唯讀沙箱會跳過此步驟）。請參閱 [記憶](/en/concepts/memory)。

  </Accordion>

  <Accordion title="記憶一直忘記事情。我該如何讓它記住？">
    要求機器人**將事實寫入記憶**。長期筆記應放在 `MEMORY.md` 中，
    短期內容則放入 `memory/YYYY-MM-DD.md` 中。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有所幫助；
    它會知道該怎麼做。如果它持續忘記，請驗證 Gateway 在每次執行時是否使用相同的
    工作區。

    文件：[記憶](/en/concepts/memory)、[代理工作區](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有什麼限制？">
    記憶檔案存在於磁碟上，並會持續保存直到您將其刪除。限制在於您的
    儲存空間，而非模型。**工作階段內容**仍然受到模型
    內容視窗的限制，因此長對話可能會壓縮或截斷。這就是
    記憶搜尋存在的原因——它僅將相關部分拉回內容中。

    文件：[記憶](/en/concepts/memory)、[內容](/en/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋是否需要 OpenAI API 金鑰？">
    只有在使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋了聊天/補全，並且並**不**授予嵌入存取權限，因此**登入 Codex（OAuth 或 Codex CLI 登入）** 對語意記憶搜尋沒有幫助。OpenAI 嵌入仍然需要一個真實的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您未明確設定提供者，當 OpenClaw 可以解析 API 金鑰（auth profiles、`models.providers.*.apiKey` 或環境變數）時，它會自動選擇一個提供者。
    如果可以解析 OpenAI 金鑰，它會優先使用 OpenAI；其次是 Gemini；然後是 Voyage；再來是 Mistral。如果沒有可用的遠端金鑰，記憶體搜尋將保持停用狀態，直到您進行設定。如果您設定並存在本地模型路徑，OpenClaw
    會優先使用 `local`。當您明確設定 `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持本地使用，請設定 `memorySearch.provider = "local"`（並可選擇性設定
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** 嵌入
    模型 - 詳細設定資訊請參閱 [記憶體](/en/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="所有與 OpenClaw 一起使用的數據都會儲存在本地嗎？">
    不會 —— **OpenClaw 的狀態是本地的**，但 **外部服務仍然會看到您發送給它們的內容**。

    - **預設為本地：** 會話、記憶檔案、配置和工作區位於 Gateway 主機
      （`~/.openclaw` + 您的工作區目錄）上。
    - **必要時為遠端：** 您發送給模型提供商（Anthropic/OpenAI 等）的訊息會傳送至
      其 API，而聊天平台（WhatsApp/Telegram/Slack 等）會在其
      伺服器上儲存訊息數據。
    - **您掌控數據範圍：** 使用本地模型可將提示保留在您的機器上，但頻道
      流量仍會經過該頻道的伺服器。

    相關主題：[Agent 工作區](/en/concepts/agent-workspace)、[記憶](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設值：`~/.openclaw`）：

    | 路徑                                                            | 用途                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要設定 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時複製到 auth profiles 中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles（OAuth、API 金鑰，以及可選的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 用於 `file` SecretRef 提供者的可選檔案支援 secret payload |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（已清除靜態 `api_key` 條目）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史記錄與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 元數據（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **workspace** (AGENTS.md、記憶體檔案、技能等) 是分開的，並透過 `agents.defaults.workspace` 進行設定（預設值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應置於何處？">
    這些檔案位於 **agent workspace**（代理工作區），而非 `~/.openclaw` 中。

    - **Workspace (per agent)**（每個代理的工作區）：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`（或在缺少 `MEMORY.md` 時使用的舊版回退 `memory.md`）、
      `memory/YYYY-MM-DD.md`、可選的 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)**：配置、憑證、認證設定檔、會話、記錄檔，
      以及共享技能（`~/.openclaw/skills`）。

    預設工作區是 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「遺忘」了內容，請確認 Gateway 在每次啟動時使用的是同一個
    工作區（並請記住：遠端模式使用的是 **gateway host's**
    的工作區，而不是您本機的筆記型電腦）。

    提示：如果您希望某種行為或偏好設定能持久存在，請要求機器人將其**寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴對話記錄。

    請參閱 [Agent workspace](/en/concepts/agent-workspace) 和 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放在一個 **私有** 的 git repo 中，並將其備份到某個
    私有位置（例如 GitHub 私有倉庫）。這會擷取記憶體和 AGENTS/SOUL/USER
    檔案，讓您之後能還原助理的「心智」。

    **請勿** 將 `~/.openclaw` 下的任何內容提交（憑證、會話、Token 或加密的密鑰負載）。
    如果您需要完整還原，請分別備份工作區和狀態目錄
    （請參閱上述遷移問題）。

    文件：[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="代理程式可以在工作區外運作嗎？">
    可以。工作區是**預設的 cwd** 和記憶錨點，而非嚴格的沙箱。
    相對路徑在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或各個代理程式的沙箱設定。如果您
    希望某個儲存庫成為預設的工作目錄，請將該代理程式的
    `workspace` 指向儲存庫根目錄。OpenClaw 儲存庫只是原始碼；除非您有意讓代理程式在其中運作，否則請將
    工作區分開存放。

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

  <Accordion title="我在遠端模式下 - Session 儲存在哪裡？">
    Session 狀態由 **gateway host** 擁有。如果您處於遠端模式，您關心的 session 儲存是在遠端機器上，而不是您的本地筆記型電腦。請參閱 [Session 管理](/en/concepts/session)。
  </Accordion>
</AccordionGroup>

## Config 基礎

<AccordionGroup>
  <Accordion title="Config 是什麼格式？它在哪裡？">
    OpenClaw 從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** config（預設：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用預設的安全設定（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，但現在沒有任何監聽 / UI 顯示未授權'>
    非回環綁定**需要驗證**。請設定 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

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

    - `gateway.remote.token` / `.password` **不會**單獨啟用本地閘道驗證。
    - 只有在 `gateway.auth.*` 未設定時，本地呼叫路徑才能將 `gateway.remote.*` 作為後備。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析將會失敗並關閉 (沒有遠端後備遮罩)。
    - Control UI 透過 `connect.params.auth.token` (儲存在 app/UI 設定中) 進行驗證。請避免在 URL 中放入權杖。

  </Accordion>

  <Accordion title="為什麼現在在 localhost 上也需要權杖？">
    OpenClaw 預設強制執行權杖驗證，包括回環。如果沒有設定權杖，閘道啟動時會自動生成一個並將其儲存到 `gateway.auth.token`，因此**本地 WS 用戶端必須通過驗證**。這會阻擋其他本地程序呼叫閘道。

    如果您**真的**想要開放回環，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您生成權杖：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    閘道會監看設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全的變更，關鍵變更則重新啟動
    - `hot`、`restart`、`off` 也受支援

  </Accordion>

  <Accordion title="如何停用有趣的 CLI 標語？">
    在配置中設定 `cli.banner.taglineMode`：

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
    - `random`：輪替顯示有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網頁搜尋（以及網頁抓取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 需要為您
    選擇的提供者（Brave、Gemini、Grok、Kimi 或 Perplexity）提供金鑰。
    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
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

    特定提供者的網頁搜尋配置現位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應用於新配置。

    註事項：

    - 如果您使用許可清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 守護程序會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[網頁工具](/en/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清空了我的配置。如何復原並避免這種情況？">
    `config.apply` 會**替換整個配置**。如果您傳送部分物件，其他所有內容都會被移除。

    復原：

    - 從備份還原（git 或複製的 `~/.openclaw/openclaw.json`）。
    - 如果沒有備份，請重新執行 `openclaw doctor` 並重新配置通道/模型。
    - 如果這是意料之外的行為，請提交錯誤報告並附上您最後的已知配置或任何備份。
    - 本地程式碼代理通常可以從日誌或歷史記錄中重建可用的配置。

    避免發生：

    - 對於小的變更，請使用 `openclaw config set`。
    - 對於互動式編輯，請使用 `openclaw configure`。

    文件：[Config](/en/cli/config)、[Configure](/en/cli/configure)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="如何跨設備運行中央 Gateway 與專用的工作者？">
    常見的模式是**一個 Gateway**（例如 Raspberry Pi）加上**節點**和**代理**：

    - **Gateway（中央）：** 擁有通道、路由和工作階段。
    - **節點（設備）：** Mac/iOS/Android 作為外設連接並公開本地工具（`system.run`、`canvas`、`camera`）。
    - **代理（工作者）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner 運維」、「個人資料」）。
    - **子代理：** 當您需要並行處理時，從主代理生成背景工作。
    - **TUI：** 連接到 Gateway 並切換代理/工作階段。

    文件：[Nodes](/en/nodes)、[Remote access](/en/gateway/remote)、[Multi-Agent Routing](/en/concepts/multi-agent)、[Sub-agents](/en/tools/subagents)、[TUI](/en/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式執行嗎？">
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

    預設為 `false` (有頭模式)。無頭模式在部分網站更容易觸發反機器人檢查。參見 [瀏覽器](/en/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，且適用於大多數自動化操作（表單、點擊、爬取、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺輸出，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格 (CAPTCHAs、反機器人系統)。
      例如，X/Twitter 經常封鎖無頭工作階段。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），然後重新啟動 Gateway。
    請參閱 [瀏覽器](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端閘道與節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、閘道與節點之間傳遞？">
    Telegram 訊息由**閘道**處理。閘道執行代理程式，並僅在需要節點工具時透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到來自供應商的傳入流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果閘道是遠端託管的，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。閘道在其他地方運行，但它可以
    通過閘道 WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在常駐主機（VPS/家用伺服器）上運行閘道。
    2. 將閘道主機和您的電腦放在同一個 tailnet 上。
    3. 確保閘道 WS 可連接（tailnet bind 或 SSH tunnel）。
    4. 在本機打開 macOS 應用程式，並以 **Remote over SSH** 模式（或直接 tailnet）連線，
       以便它能註冊為節點。
    5. 在閘道上核准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點通過閘道 WebSocket 連線。

    安全提醒：配對 macOS 節點會允許該機器上的 `system.run`。僅
    配對您信任的裝置，並檢閱 [安全性](/en/gateway/security)。

    文件：[節點](/en/nodes)、[閘道通訊協定](/en/gateway/protocol)、[macOS 遠端模式](/en/platforms/mac/remote)、[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線，但我沒有收到回應。現在該怎麼辦？">
    檢查基本事項：

    - 閘道正在運行：`openclaw gateway status`
    - 閘道健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證身份驗證和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透 SSH tunnel 連線，請確認本機 tunnel 已啟動並指向正確的連接埠。
    - 確認您的允許清單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/en/gateway/tailscale)、[遠端存取](/en/gateway/remote)、[頻道](/en/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本地 + VPS）？">
    可以。目前沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式進行連接：

    **最簡單的方式：** 使用兩個機器人都能存取的普通聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像平常一樣回覆。

    **CLI 橋接器（通用）：** 執行一個腳本，使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，並指定另一個機器人
    正在監聽的聊天室。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [遠端存取](/en/gateway/remote)）。

    範例模式（從可以連接到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：請加入防護機制，以避免兩個機器人無限迴圈（僅限提及、頻道
    白名單，或是「不要回覆機器人訊息」的規則）。

    文件：[遠端存取](/en/gateway/remote)、[Agent CLI](/en/cli/agent)、[Agent send](/en/tools/agent-send)。

  </Accordion>

  <Accordion title="多個 Agent 需要分開的 VPS 嗎？">
    不需要。一個 Gateway 可以託管多個 Agent，每個都有自己的工作區、模型預設值
    和路由設定。這是標準設定，比每個 Agent 執行一個 VPS 更便宜且更簡單。

    只有在您需要強隔離（安全邊界）或非常不同的設定且不希望共用時，才使用分開的 VPS。否則，請維持一個 Gateway 並
    使用多個 Agent 或子 Agent。

  </Accordion>

  <Accordion title="與從 VPS 使用 SSH 相比，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    是的 - 節點是從遠端 Gateway 存取您的筆記型電腦的首選方式，而且它們
    解鎖的不僅僅是 shell 存取權限。Gateway 執行於 macOS/Linux（Windows 透過 WSL2），並且
    非常輕量（小型 VPS 或樹莓派級別的機器即可；4 GB RAM 綽綽有餘），因此一種常見的
    設定方式是一個永遠上線的主機加上您的筆記型電腦作為節點。

    - **無需連入 SSH。** 節點會主動連出到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受該筆記型電腦上的節點允許清單/核准機制所限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還會公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 連接到主機上的本機 Chrome。

    SSH 適合臨時的 shell 存取，但對於持續的代理程式工作流程和
    裝置自動化來說，節點更簡單。

    文件：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)、[瀏覽器](/en/tools/browser)。

  </Accordion>

  <Accordion title="節點會執行 gateway 服務嗎？">
    不會。除非您有意執行隔離的設定檔（請參閱 [多個 Gateway](/en/gateway/multiple-gateways)），否則每台主機應該只執行 **一個 gateway**。節點是連接到
    gateway 的外圍裝置（iOS/Android 節點，或選單列應用程式中的 macOS 「節點模式」）。對於無外殼節點
    主機和 CLI 控制，請參閱 [節點主機 CLI](/en/cli/node)。

    對於 `gateway`、`discovery` 和 `canvasHost` 的變更，需要完全重新啟動。

  </Accordion>

<Accordion title="是否有 API / RPC 方式可以套用設定？">有的。`config.apply` 會驗證並寫入完整設定，並作為操作的一部分重新啟動 Gateway。</Accordion>

  <Accordion title="首次安裝的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這會設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="如何在 VPS 上設置 Tailscale 並從我的 Mac 連接？">
    最小步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理控制台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名**
       - SSH： `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS： `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您不想使用 SSH 而直接存取 Control UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將 Gateway 綁定到 loopback 並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連接到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連接。

    建議設置：

    1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
    2. **在遠端模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名）。
       應用程式將會透過通道傳輸 Gateway 連接埠並作為節點連接。
    3. **在 gateway 上批准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/en/gateway/protocol)、[Discovery](/en/gateway/discovery)、[macOS remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="Should I install on a second laptop or just add a node?">
    如果你在第二台筆記型電腦上只需要**本地工具**（螢幕/相機/exec），請將其作為**節點**加入。這樣可以保持單一 Gateway 並避免重複的配置。本地節點工具目前僅支援 macOS，但我們計畫將其擴展到其他作業系統。

    只有當你需要**強隔離**或兩個完全獨立的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)、[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="How does OpenClaw load environment variables?">
    OpenClaw 從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 來自當前工作目錄的 `.env`
    - 來自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋既有的環境變數。

    你也可以在配置中定義內聯環境變數（僅在進程環境中缺失時套用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    如需完整的優先順序和來源，請參閱 [/environment](/en/help/environment)。

  </Accordion>

  <Accordion title="I started the Gateway via the service and my env vars disappeared. What now?">
    兩個常見的解決方法：

    1. 將缺失的金鑰放入 `~/.openclaw/.env`，以便在服務未繼承你的 shell 環境時也能載入它們。
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

    這會執行你的登入 shell 並僅匯入缺失的預期金鑰（絕不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off」。為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**。「Shell env: off」並**不**表示缺少您的環境變數，這只是表示 OpenClaw 不會自動載入您的登入 shell。

    如果 Gateway 作為服務（launchd/systemd）執行，它將不會繼承您的 shell 環境。請執行以下其中一項來修正：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell import（`env.shellEnv.enabled: true`）。
    3. 或將其新增至您的 config `env` 區塊（僅在缺少時適用）。

    然後重新啟動 gateway 並重新檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（還有 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/en/concepts/model-providers) 和 [/environment](/en/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="如何開始新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/en/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，session 會自動重置嗎？">
    是的。Session 會在 `session.idleMinutes` 後過期（預設 **60**）。**下一則**訊息會為該聊天金鑰啟動一個新的 session id。這不會刪除紀錄 - 它只是啟動一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法組建一個 OpenClaw 實例團隊（一個 CEO 和多個代理）？">
    可以，透過 **多代理路由 (multi-agent routing)** 和 **子代理 (sub-agents)**。你可以建立一個協調器
    代理和幾個擁有自己的工作區和模型的 Worker 代理。

    不過，這最好被視為一個**有趣的實驗**。它非常耗費 Token，而且通常
    比使用一個具有不同會話的機器人效率更低。我們設想的典型模型
    是你與一個機器人對話，並使用不同的會話進行並行工作。該
    機器人也可以在需要時生成子代理。

    文件：[多代理路由](/en/concepts/multi-agent)、[子代理](/en/tools/subagents)、[代理 CLI](/en/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文在任務中途被截斷？如何預防？">
    會話上下文受模型視窗限制。長時間的對話、大型工具輸出或許多
    檔案都可能觸發壓縮或截斷。

    解決方法：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保存在工作區中，並要求機器人讀回。
    - 對於長時間或並行工作使用子代理，以保持主聊天較小。
    - 如果這種情況經常發生，請選擇一個具有更大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留安裝？">
    使用重置指令：

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

    說明：

    - 如果 Onboarding 發現現有配置，也會提供 **Reset** 選項。請參閱 [Onboarding (CLI)](/en/start/wizard)。
    - 如果你使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發配置 + 憑證 + 會話 + 工作區)。

  </Accordion>

  <Accordion title='我遇到「context too large」錯誤 - 該如何重置或壓縮？'>
    使用以下方法之一：

    - **壓縮**（保留對話但總結較舊的輪次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導摘要。

    - **重置**（為同一個聊天金鑰建立新的 session ID）：

      ```
      /new
      /reset
      ```

    如果持續發生：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）來修剪舊的工具輸出。
    - 使用具有更大上下文視窗的模型。

    文件：[壓縮](/en/concepts/compaction)、[Session pruning](/en/concepts/session-pruning)、[Session 管理](/en/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個提供者驗證錯誤：模型發出了一個 `tool_use` 區塊但缺少必要的
    `input`。這通常意味著 session 歷史記錄已過時或損壞（通常發生在長對話後
    或工具/架構變更後）。

    修復方法：使用 `/new`（獨立訊息）啟動一個新的 session。

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（只有空行和 markdown
    標題，例如 `# Heading`），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行，由模型決定該做什麼。

    針對個別代理的覆寫使用 `agents.list[].heartbeat`。文件：[心跳](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」加入到 WhatsApp 群組？'>
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

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`)，例如：
    `1234567890-1234567890@g.us`.

    選項 2（如果已經配置/加入白名單）：從配置中列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/en/channels/whatsapp)、[Directory](/en/cli/directory)、[Logs](/en/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但沒有配置 `"*"`，且該群組未在白名單中。

    請參閱 [Groups](/en/channels/groups) 和 [Group messages](/en/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與 DM 共享上下文？">直接聊天預設會合併到主會話中。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒是獨立的會話。請參閱 [Groups](/en/channels/groups) 和 [Group messages](/en/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理？">
    沒有硬性限制。幾十個（甚至數百個）都可以，但請注意：

    - **磁碟增長：** 會話 + 轉錄記錄儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 更多代理意味著更多的並發模型使用。
    - **運維開銷：** 每個代理的認證設定檔、工作區和通道路由。

    提示：

    - 為每個代理保留一個 **active** 工作區 (`agents.defaults.workspace`)。
    - 如果磁碟增長，請修剪舊會話（刪除 JSONL 或條目）。
    - 使用 `openclaw doctor` 來發現孤立的工作區和設定檔不匹配。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天嗎？">
    可以。使用 **Multi-Agent Routing** 來執行多個隔離的代理，並根據
    通道/帳戶/節點路由傳入訊息。Slack 受支援為一種通道，並可以綁定到特定的代理。

    瀏覽器存取功能強大，但並非「人類能做的任何事都能做」——反機器人措施、CAPTCHA 和 MFA 仍然
    可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 全時運作的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個代理 (bindings)。
    - 綁定到這些代理的 Slack 通道。
    - 需要時透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[Multi-Agent Routing](/en/concepts/multi-agent)、[Slack](/en/channels/slack)、
    [Browser](/en/tools/browser)、[Nodes](/en/nodes)。

  </Accordion>
</AccordionGroup>

## Models: defaults, selection, aliases, switching

<AccordionGroup>
  <Accordion title='什麼是「預設模型」？'>
    OpenClaw 的預設模型是您設定為：

    ```
    agents.defaults.model.primary
    ```

    模型被引用為 `provider/model` (例如： `anthropic/claude-opus-4-6`)。如果您省略提供商，OpenClaw 目前假定 `anthropic` 作為臨時的棄用後備方案——但您仍然應該 **明確地** 設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪個模型？">
    **推薦預設值：** 使用您的供應商堆疊中最強大的最新一代模型。
    **對於啟用工具或輸入不可信賴的代理：** 優先考慮模型強度而非成本。
    **對於常規/低風險聊天：** 使用較便宜的備用模型，並根據代理角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/en/providers/minimax) 和
    [本機模型](/en/gateway/local-models)。

    經驗法則：對於高風險工作，使用您**負擔得起的最佳模型**，對於常規聊天或摘要，使用較便宜的模型。您可以根據代理路由模型，並使用子代理來並行處理長任務（每個子代理都會消耗 token）。請參閱 [模型](/en/concepts/models) 和
    [子代理](/en/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示注入和不安全行為的影響。請參閱 [安全性](/en/gateway/security)。

    更多背景資訊：[模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定的情況下切換模型？">
    使用 **模型指令** 或僅編輯 **模型** 欄位。避免完全取代設定。

    安全選項：

    - 在聊天中使用 `/model` (快速，僅限目前階段)
    - `openclaw models set ...` (僅更新模型設定)
    - `openclaw configure --section model` (互動式)
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算取代整個設定，否則請避免使用部分物件進行 `config.apply`。
    如果您確實覆寫了設定，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[模型](/en/concepts/models)、[設定](/en/cli/configure)、[Config](/en/cli/config)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管的模型（llama.cpp、vLLM、Ollama）嗎？">
    可以。Ollama 是本地模型最簡單的途徑。

    最快速的設定：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 下載一個本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您同時想要 Ollama Cloud，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    備註：

    - `Cloud + Local` 讓您可以存取 Ollama Cloud 模型以及您的本地 Ollama 模型
    - 雲端模型（例如 `kimi-k2.5:cloud`）不需要在本地下載
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性說明：較小或經過高度量化 的模型更容易受到提示詞 注入攻擊。我們強烈建議任何可以使用工具的機器人都使用 **大型模型**。如果您仍想使用小型模型，請啟用沙盒 和嚴格的工具允許清單。

    文件：[Ollama](/en/providers/ollama)、[本地模型](/en/gateway/local-models)、
    [模型提供商](/en/concepts/model-providers)、[安全性](/en/gateway/security)、
    [沙盒](/en/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">- 這些部署可能有所不同，且可能會隨時間變更；沒有固定的提供商建議。- 使用 `openclaw models status` 檢查每個閘道 上的目前執行階段設定。- 對於安全性敏感或已啟用工具的代理程式，請使用最強大的最新世代模型。</Accordion>

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

    `/model`（以及 `/model list`）會顯示一個緊湊的編號選擇器。透過編號進行選擇：

    ```
    /model 3
    ```

    您也可以為提供者強制指定特定的認證設定檔（每個 session）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前啟用的是哪個 agent、正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個認證設定檔。
    當有可用時，它還會顯示已設定的提供者端點（`baseUrl`）和 API 模式（`api`）。

    **如何取消固定我透過 @profile 設定的設定檔？**

    重新執行 `/model`，但**不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想回到預設值，請從 `/model` 中選取（或發送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前啟用的認證設定檔。

  </Accordion>

  <Accordion title="我可以在日常工作中使用 GPT 5.2，在編程時使用 Codex 5.3 嗎？">
    可以。將一個設為預設，並視需要切換：

    - **快速切換（每個 session）：** 日常工作中使用 `/model gpt-5.2`，使用 Codex OAuth 編程時使用 `/model openai-codex/gpt-5.4`。
    - **預設 + 切換：** 將 `agents.defaults.model.primary` 設為 `openai/gpt-5.2`，然後在編程時切換到 `openai-codex/gpt-5.4`（或者相反）。
    - **Sub-agents：** 將編程任務路由到具有不同預設模型的子 agents。

    請參閱 [Models](/en/concepts/models) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title='為什麼我看到「Model ... is not allowed」然後沒有回覆？'>
    如果設定了 `agents.defaults.models`，它會成為 `/model` 和任何
    session 覆寫值的 **允許清單**。選擇不在該清單中的模型會回傳：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會被回傳 **以取代** 正常回覆。解決方法：將模型加入
    `agents.defaults.models`、移除允許清單，或從 `/model list` 中挑選一個模型。

  </Accordion>

  <Accordion title='為什麼我看到「Unknown model: minimax/MiniMax-M2.7」？'>
    這表示 **未設定提供者**（找不到 MiniMax 提供者設定或 auth
    profile），因此無法解析模型。

    修復檢查清單：

    1. 升級至最新的 OpenClaw 版本（或從原始碼 `main` 執行），然後重新啟動 gateway。
    2. 請確保已設定 MiniMax（精靈或 JSON），或在 env/auth profiles 中存在 MiniMax API 金鑰，以便注入提供者。
    3. 使用確切的模型 ID（區分大小寫）：`minimax/MiniMax-M2.7`、
       `minimax/MiniMax-M2.7-highspeed`、`minimax/MiniMax-M2.5` 或
       `minimax/MiniMax-M2.5-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中挑選（或在聊天中使用 `/model list`）。

    參見 [MiniMax](/en/providers/minimax) 和 [Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 設為預設，並在複雜任務中使用 OpenAI 嗎？">
    是的。使用 **MiniMax 作為預設**，並在需要時 **針對每個會話** 切換模型。
    備援機制是針對 **錯誤** 的，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

    **選項 A：針對每個會話切換**

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

    **選項 B：分開的代理程式**

    - 代理程式 A 預設：MiniMax
    - 代理程式 B 預設：OpenAI
    - 透過代理程式路由或使用 `/agent` 進行切換

    文件：[Models](/en/concepts/models)、[Multi-Agent Routing](/en/concepts/multi-agent)、[MiniMax](/en/providers/minimax)、[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 內建幾個預設簡寫（僅在模型存在於 `agents.defaults.models` 時套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您設定了同名的別名，您的值將優先使用。

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

    然後 `/model sonnet`（或在支援時使用 `/<alias>`）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何添加來自其他供應商（例如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter (按 Token 付費；多種模型)：

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

    這通常意味著**新代理**的認證儲存是空的。認證是依代理而定，且儲存於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在嚮導過程中設定認證。
    - 或者將主代理的 `agentDir` 中的 `auth-profiles.json` 複製到新代理的 `agentDir` 中。

    請**勿**在代理之間重複使用 `agentDir`；這會導致認證/連線衝突。

  </Accordion>
</AccordionGroup>

## 模型容錯移轉與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="容錯移轉如何運作？">
    容錯移轉分兩個階段進行：

    1. 在相同供應商內進行 **Auth 設定檔輪替**。
    2. **模型回退** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間會套用至失敗的設定檔（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 仍能繼續回應。

  </Accordion>

  <Accordion title='「找不到設定檔 anthropic:default 的憑證」是什麼意思？'>
    這表示系統嘗試使用驗證設定檔 ID `anthropic:default`，但在預期的驗證儲存空間中找不到對應的憑證。

    **修復檢查清單：**

    - **確認驗證設定檔的位置**（新路徑與舊路徑）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的 agent**
      - 多 agent 設定表示可能會有多個 `auth-profiles.json` 檔案。
    - **健全性檢查模型/驗證狀態**
      - 使用 `openclaw models status` 檢視已設定的模型以及提供者是否已通過驗證。

    **「找不到設定檔 anthropic 的憑證」修復檢查清單**

    這表示該次執行已鎖定為 Anthropic 驗證設定檔，但 Gateway
    在其驗證儲存空間中找不到它。

    - **使用 setup-token**
      - 執行 `claude setup-token`，然後使用 `openclaw models auth setup-token --provider anthropic` 貼上它。
      - 如果 token 是在另一台機器上建立的，請使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **gateway 主機**上的 `~/.openclaw/.env`。
      - 清除任何強制使用遺失設定檔的鎖定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您正在 gateway 主機上執行指令**
      - 在遠端模式下，驗證設定檔位於 gateway 機器上，而非您的筆記型電腦。

  </Accordion>

  <Accordion title="Why did it also try Google Gemini and fail?">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型後備期間嘗試使用它。如果您尚未配置 Google 憑證，您會看到 `No API key found for provider "google"`。

    修正方法：提供 Google 授權，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免後備路由到那裡。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：工作階段歷史記錄包含 **沒有簽章的思考區塊**（通常來自於
    中止/部分傳輸）。Google Antigravity 要求思考區塊必須有簽章。

    修正方法：OpenClaw 現在會為 Google Antigravity Claude 移除未簽章的思考區塊。如果問題仍然存在，請開啟一個 **新的工作階段** 或為該代理設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles: what they are and how to manage them

相關閱讀： [/concepts/oauth](/en/concepts/oauth) (OAuth 流程、權杖儲存、多帳號模式)

<AccordionGroup>
  <Accordion title="What is an auth profile?">
    授權設定檔是綁定到提供者的命名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="What are typical profile IDs?">
    OpenClaw 使用帶有提供者前綴的 ID，例如：

    - `anthropic:default` （在沒有電子郵件身分時很常見）
    - `anthropic:<email>` 用於 OAuth 身分
    - 您選擇的自訂 ID （例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個身分驗證設定檔嗎？">
    可以。配置支援設定檔的可選元數據以及每個提供者的順序 (`auth.order.<provider>`)。這**不**會儲存機密；它將 ID 對應到提供者/模式並設定輪替順序。

    如果設定檔處於短暫的 **冷卻** (速率限制/逾時/身分驗證失敗) 或較長的 **停用** 狀態 (計費/點數不足)，OpenClaw 可能會暫時跳過該設定檔。要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整方式：`auth.cooldowns.billingBackoffHours*`。

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

    若要指定特定代理程式：

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
  <Accordion title="閘道使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP (控制 UI、掛鉤 等) 的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Runtime: running」，但「RPC probe: failed」？'>
    因為「running」是 **監督程式** (launchd/systemd/schtasks) 的視角。RPC 探測則是 CLI 實際連線到閘道 WebSocket 並呼叫 `status`。

    請使用 `openclaw gateway status` 並參考這幾行：

    - `Probe target:` (探測實際使用的 URL)
    - `Listening:` (連接埠上實際綁定的項目)
    - `Last gateway error:` (常見的根本原因，當程序存活但連接埠未監聽時)

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示的「Config (cli)」和「Config (service)」不一致？'>
    您正在編輯一個配置檔案，而服務正在運行另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    解決方法：

    ```bash
    openclaw gateway install --force
    ```

    請在您希望服務使用的同一個 `--profile` / 環境中執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行執行時鎖定（預設 `ws://127.0.0.1:18789`）。如果綁定失敗並顯示 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個實例正在監聽。

    解決方法：停止另一個實例、釋放該連接埠，或使用 `openclaw gateway --port <port>` 運行。

  </Accordion>

  <Accordion title="如何在遠端模式下運行 OpenClaw（用戶端連接到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，可選擇性加上 token/password：

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

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時啟動（或者您傳遞覆寫標誌）。
    - macOS 應用程式會監看配置檔案，並在這些值變更時即時切換模式。

  </Accordion>

  <Accordion title='控制 UI 顯示「未授權」（或不斷重新連線）。該怎麼辦？'>
    您的閘道已在啟用驗證的情況下執行（`gateway.auth.*`），但 UI 並未傳送相符的 token/密碼。

    事實（來自程式碼）：

    - 控制 UI 會將 token 保存在 `sessionStorage` 中，供目前的瀏覽器分頁階段和選定的閘道 URL 使用，因此同分頁重新整理能持續運作，而無需還原長期的 localStorage token 持續性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以使用快取的裝置 token 嘗試一次有限的重試。

    修正方法：

    - 最快：`openclaw dashboard`（列印並複製儀表板 URL，嘗試開啟；如果是無頭環境則會顯示 SSH 提示）。
    - 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端：先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 在閘道主機上設定 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 在控制 UI 設定中，貼上相同的 token。
    - 如果在單次重試後仍然不匹配，請輪換/重新核准配對的裝置 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 還是卡住了？執行 `openclaw status --all` 並依照 [疑難排解](/en/gateway/troubleshooting) 操作。請參閱 [儀表板](/en/web/dashboard) 以了解驗證詳細資訊。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet，但它無法綁定，且沒有監聽任何項目">
    `tailnet` 綁定會從您的網路介面（100.64.0.0/10）中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），就沒有東西可以綁定。

    修正方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或者
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    備註：`tailnet` 是明確指定的。`auto` 偏好回送介面；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行 - 一個 Gateway 可以執行多個訊息通道和代理程式。僅在您需要冗餘（例如：救援機器人）或強隔離時才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` (個別實例設定)
    - `OPENCLAW_STATE_DIR` (個別實例狀態)
    - `agents.defaults.workspace` (工作區隔離)
    - `gateway.port` (唯一連接埠)

    快速設定 (推薦)：

    - 每個實例使用 `openclaw --profile <name> ...` (自動建立 `~/.openclaw-<name>`)。
    - 在每個 profile 設定中設定唯一的 `gateway.port` (或針對手動執行傳遞 `--port`)。
    - 安裝各 profile 的服務：`openclaw --profile <name> gateway install`。

    Profiles 也會為服務名稱加上後綴 (`ai.openclaw.<profile>`; 舊版 `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`)。
    完整指南：[多個 Gateway](/en/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「invalid handshake」/ 代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期第一個訊息必須是 `connect` 幀。如果收到任何其他內容，它會以 **代碼 1008** (政策違規) 關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`) 而非 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭或發送了非 Gateway 請求。

    快速修復方法：

    1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
    2. 不要在一般瀏覽器分頁中開啟 WS 連接埠。
    3. 如果啟用驗證，請在 `connect` 幀中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應該如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    通訊協定詳細資訊：[Gateway 通訊協定](/en/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌級別由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤方式：

    ```bash
    openclaw logs --follow
    ```

    服務/監督者日誌（當閘道透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設值：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    參閱 [故障排除](/en/gateway/troubleshooting) 以取得更多資訊。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。參閱 [Gateway](/en/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 - 如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2（推薦）：** Gateway 執行於 Linux 內部。

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

    **2) 原生 Windows（不推薦）：** Gateway 直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它（無服務），請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/en/platforms/windows)、[Gateway 服務手冊](/en/gateway)。

  </Accordion>

  <Accordion title="閘道已啟動，但從未收到回應。我應該檢查什麼？">
    首先進行快速健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未在 **gateway host** 上載入（檢查 `models status`）。
    - 通道配對/允許清單阻擋了回應（檢查通道設定和日誌）。
    - WebChat/Dashboard 已開啟，但未使用正確的 Token。

    如果您是在遠端，請確認通道/Tailscale 連線正常，且
    Gateway WebSocket 可以連線。

    文件：[通道](/en/channels)、[疑難排解](/en/gateway/troubleshooting)、[遠端存取](/en/gateway/remote)。

  </Accordion>

  <Accordion title='"已從閘道斷線：無原因」——現在該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在運作？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否擁有正確的 Token？ `openclaw dashboard`
    4. 如果是遠端，通道/Tailscale 連線是否正常？

    然後檢查日誌：

    ```bash
    openclaw logs --follow
    ```

    文件：[儀表板](/en/web/dashboard)、[遠端存取](/en/gateway/remote)、[疑難排解](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    首先檢查日誌和通道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目過多。OpenClaw 已經將項目修剪至 Telegram 限制並以較少的指令重試，但仍需要捨棄部分選單項目。請減少外掛程式/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於代理伺服器後方，請確認允許輸出 HTTPS，且 `api.telegram.org` 的 DNS 運作正常。

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

    在 TUI 中，使用 `/status` 來查看目前狀態。如果您預期在聊天通道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/en/web/tui)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="我該如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上為 launchd，Linux 上為 systemd)。
    當 Gateway 在背景作為常駐程式執行時使用此方法。

    如果您在前台執行，請使用 Ctrl-C 停止，然後執行：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/en/gateway)。

  </Accordion>

  <Accordion title="簡單說明：openclaw gateway restart 與 openclaw gateway">
    - `openclaw gateway restart`：重新啟動**背景服務** (launchd/systemd)。
    - `openclaw gateway`：在此終端機階段中，於**前景**執行 gateway。

    如果您已安裝服務，請使用 gateway 指令。當您需要單次前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="當發生錯誤時，取得更多詳細資訊的最快方法">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查日誌檔案中的通道驗證、模型路由與 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="我的技能生成了圖片/PDF，但沒有傳送任何東西">
    來自此代理程式的出站附件必須包含一行 `MEDIA:<path-or-url>` (在獨立的一行)。請參閱 [OpenClaw assistant setup](/en/start/openclaw) 與 [Agent send](/en/tools/agent-send)。

    CLI 傳送方式：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時請檢查：

    - 目標通道支援出站媒體，且未被允許清單封鎖。
    - 檔案大小在提供者的限制範圍內 (圖片會調整大小至最大 2048px)。

    參閱 [Images](/en/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全性與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露於入站 DM 是否安全？">
    將入站 DM 視為不受信任的輸入。預設值旨在降低風險：

    - 支援 DM 之通道的預設行為是**配對**：
      - 未知的發送者會收到配對碼；bot 不會處理其訊息。
      - 使用以下指令核准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理請求每個通道上限為 **3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放 DM 需要明確選擇加入 (`dmPolicy: "open"` 與 allowlist `"*"`)。

    執行 `openclaw doctor` 以顯示有風險的 DM 政策。

  </Accordion>

  <Accordion title="提示注入是否只對公開機器人來說是個問題？">
    不是。提示注入是關於**不受信任的內容**，而不僅僅是誰可以私訊機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    劫持模型的指令。即使**您是唯一的發送者**，這也可能發生。

    最大的風險在於啟用工具時：模型可能被誘騙
    外洩上下文或代表您呼叫工具。您可以透過以下方式減輕受影響範圍：

    - 使用唯讀或停用工具的「讀取者」代理程式來摘要不受信任的內容
    - 為已啟用工具的代理程式關閉 `web_search` / `web_fetch` / `browser`
    - 沙箱化與嚴格的工具允許清單

    詳情：[Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該擁有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設定而言。使用獨立的帳號和電話號碼將機器人隔離
    可以在發生問題時減輕受影響範圍。這也讓輪換
    憑證或撤銷存取權變得更容易，而不會影響您的個人帳號。

    從小處開始。僅授予您實際需要的工具和帳號存取權，並在
    必要時再進行擴充。

    文件：[Security](/en/gateway/security)、[Pairing](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主控制我的簡訊嗎？這樣安全嗎？">
    我們**不**建議對您的個人訊息給予完全的自主權。最安全的模式是：

    - 將私訊保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
    - 讓它起草草稿，然後**在發送前進行審核**。

    如果您想進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [Security](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以使用更便宜的模型來處理個人助理任務嗎？">可以，**如果**該代理僅用於聊天且輸入內容是受信任的。較低層級的模型更容易受到指令劫持，因此請避免將其用於啟用了工具的代理或讀取不受信任內容的情境。如果您必須使用較小的模型，請鎖定工具並在沙盒中運行。請參閱 [Security](/en/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知發送者傳送訊息給機器人且
    `dmPolicy: "pairing"` 已啟用時才會發送。單獨的 `/start` 不會產生代碼。

    檢查待處理請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入白名單或為該帳戶設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳送訊息給我的聯絡人嗎？配對如何運作？">
    不會。預設的 WhatsApp DM 政策為**配對**。未知發送者只會收到配對碼，且其訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確傳送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：這是用來設定您的 **allowlist/owner**，以便允許您自己的 DM。它不用於自動傳送。如果您在個人的 WhatsApp 號碼上運行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務與「它無法停止」

<AccordionGroup>
  <Accordion title="如何防止内部系统訊息顯示在聊天中？">
    大多數內部或工具訊息僅在該會話啟用了 **verbose** 或 **reasoning** 時才會出現。

    在您看到該訊息的聊天中進行修復：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然顯得雜亂，請檢查 Control UI 中的會話設定，將 verbose 設定為 **inherit**。同時確認您沒有在配置中使用 bot profile 將 `verboseDefault` 設定為 `on`。

    文件：[Thinking and verbose](/en/tools/thinking)、[Security](/en/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    發送以下任一訊息 **作為獨立訊息**（無斜線）：

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

    對於背景處理序（來自 exec 工具），您可以要求代理執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [Slash commands](/en/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的 **獨立** 訊息發送，但少數捷徑（如 `/status`）對於白名單上的發送者也可以內聯使用。

  </Accordion>

  <Accordion title='如何從 Telegram 發送 Discord 訊息？（「Cross-context messaging denied」）'>
    OpenClaw 預設會封鎖 **跨供應商** 訊息傳遞。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會傳送到 Discord。

    為代理啟用跨供應商訊息傳遞：

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

    編輯設定後重新啟動 gateway。如果您只想針對單一代理設定此功能，請改在 `agents.list[].tools.message` 下進行設定。

  </Accordion>

  <Accordion title='為什麼機器人似乎會「忽略」連續發送的訊息？'>
    佇列模式控制新訊息如何與正在進行的執行互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向當前任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 現在導向，然後處理積压
    - `interrupt` - 中止當前執行並重新開始

    您可以新增選項，例如 `debounce:2s cap:25 drop:summarize` 用於後續模式。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時 Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在設定檔中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何模型（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`， 這表示 Gateway 無法在正在執行代理程式的預期 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了嗎？請在 [Discord](https://discord.com/invite/clawd) 提問或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。
