---
summary: "關於 OpenClaw 設定、配置和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對實際設定（本機開發、VPS、多重代理、OAuth/API 金鑰、模型容錯移轉）的快速解答與更深入的疑難排解。如需執行時期診斷，請參閱 [疑難排解](/en/gateway/troubleshooting)。如需完整的設定參考，請參閱 [設定](/en/gateway/configuration)。

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

   執行閘道健康檢查 + 提供者探測（需要可連線的閘道）。請參閱 [健康檢查](/en/gateway/health)。

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

   修復/遷移設定/狀態 + 執行健康檢查。請參閱 [醫生](/en/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道要求完整快照（僅限 WS）。請參閱 [健康檢查](/en/gateway/health)。

## 快速入門與首次執行設置

<AccordionGroup>
  <Accordion title="我卡住了，最快解開困境的方法">
    使用一個能**看到您的機器**的本機 AI Agent。這比在 Discord 提問有效得多，因為大多數「我卡住了」的情況都是**本機配置或環境問題**，遠端協助者無法檢查。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    這些工具可以讀取 repo、執行指令、檢查日誌，並協助修復您的機器層級設定（PATH、服務、權限、auth 檔案）。透過可駭客（git）安裝，提供它們**完整的原始碼 checkout**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會**從 git checkout** 安裝 OpenClaw，因此 Agent 可以讀取程式碼和文件，並針對您正在執行的確切版本進行推論。您之後隨時可以透過不帶 `--install-method git` 參數重新執行安裝程式，切換回穩定版本。

    提示：要求 Agent **規劃並監督**修復過程（逐步進行），然後僅執行必要的指令。這可以讓變動保持細微且更容易稽核。

    如果您發現真正的錯誤或修復方法，請在 GitHub 上提出 issue 或發送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    從這些指令開始（在尋求協助時分享輸出結果）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它們的作用：

    - `openclaw status`: gateway/agent 健康狀況 + 基本配置的快速快照。
    - `openclaw models status`: 檢查提供者 auth + 模型可用性。
    - `openclaw doctor`: 驗證並修復常見的配置/狀態問題。

    其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速除錯循環：[如果出問題的前 60 秒](#first-60-seconds-if-something-is-broken)。
    安裝文件：[安裝](/en/install)、[安裝程式旗標](/en/install/installer)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="安裝和設定 OpenClaw 的推薦方式">
    此儲存庫建議從原始碼執行並使用入門引導：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    精靈也可以自動建置 UI 資產。完成入門引導後，通常會在連接埠 **18789** 上執行 Gateway。

    從原始碼執行（貢獻者/開發者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    如果尚未進行全域安裝，請透過 `pnpm openclaw onboard` 執行。

  </Accordion>

<Accordion title="新手入門後如何開啟儀表板？">精靈會在入門流程結束後立即使用乾淨（未代號化）的儀表板 URL 開啟您的瀏覽器，並在摘要中列印該連結。請保持該分頁開啟；如果未自動開啟，請在同一台機器上複製並貼上列印出來的 URL。</Accordion>

  <Accordion title="如何在本地主機與遠端對儀表板進行驗證 (token)？">
    **本地主機 (同一台機器)：**

    - 開啟 `http://127.0.0.1:18789/`。
    - 如果要求驗證，請將 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`) 中的 token 貼上到 Control UI 設定中。
    - 從 gateway 主機擷取：`openclaw config get gateway.auth.token` (或產生一個：`openclaw doctor --generate-gateway-token`)。

    **非本地主機：**

    - **Tailscale Serve** (推薦)：保持 bind loopback，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，識別標頭滿足 Control UI/WebSocket 驗證 (不需要 token，假設 gateway 主機受信任)；HTTP API 仍然需要 token/密碼。
    - **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`，開啟 `http://<tailscale-ip>:18789/`，在儀表板設定中貼上 token。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/` 並在 Control UI 設定中貼上 token。

    參閱 [Dashboard](/en/web/dashboard) 和 [Web surfaces](/en/web) 以了解綁定模式和驗證細節。

  </Accordion>

  <Accordion title="我需要什麼執行環境？">
    需要 Node **>= 22**。建議使用 `pnpm`。不建議對 Gateway 使用 Bun。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上運行嗎？">
    可以。Gateway 非常輕量——文檔列出的 **512MB-1GB RAM**、**1 核心**和大約 **500MB**
    磁盤空間對於個人使用已足夠，並且請注意 **Raspberry Pi 4 可以運行它**。

    如果您想要額外的餘量（日誌、媒體、其他服務），**建議 2GB**，但這並非
    硬性最低要求。

    提示：小型 Pi/VPS 可以託管 Gateway，並且您可以在筆記本電腦/手機上配對 **節點**
    以進行本地屏幕/相機/畫布或命令執行。請參閱 [節點](/en/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安裝有什麼建議嗎？">
    簡單來說：可以使用，但請預期會有一些粗糙的邊緣情況。

    - 使用 **64 位** 操作系統並保持 Node >= 22。
    - 優先選擇 **可破解 (git) 安裝**，以便您可以查看日誌並快速更新。
    - 先不啟用頻道/技能，然後逐個添加它們。
    - 如果遇到奇怪的二進制問題，通常是由於 **ARM 兼容性** 問題。

    文檔：[Linux](/en/platforms/linux)、[安裝](/en/install)。

  </Accordion>

  <Accordion title="它卡在喚醒我的朋友 / 入門無法孵化。現在怎麼辦？">
    該屏幕取決於 Gateway 是否可訪問且已通過身份驗證。TUI 還會在第一次孵化時自動發送
    "Wake up, my friend!"。如果您看到該行但 **沒有回復**
    並且 token 保持在 0，則表示代理從未運行過。

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

    3. 如果仍然掛起，請運行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是遠程的，請確保隧道/Tailscale 連接已啟動，並且 UI
    指向正確的 Gateway。請參閱 [遠程訪問](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我可以將設定遷移到新機器（Mac mini）而無需重新進行入門設定嗎？">
    可以。複製 **state directory** 和 **workspace**，然後執行一次 Doctor。這樣
    能讓您的機器人「完全相同」（記憶體、對話歷史、認證和通道
    狀態），前提是您複製了**這兩個**位置：

    1. 在新機器上安裝 OpenClaw。
    2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）。
    3. 複製您的工作區（預設：`~/.openclaw/workspace`）。
    4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

    這將保留設定、認證設定檔、WhatsApp 憑證、工作階段和記憶體。如果您處於
    遠端模式，請記得 gateway 主機擁有工作階段存放區和工作區。

    **重要提示：**如果您只是將工作區 commit/push 到 GitHub，您備份的是
    **記憶體 + 引導檔案**，但**沒有**包含對話歷史或認證資訊。這些資料位於
    `~/.openclaw/` 之下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相關主題：[遷移](/en/install/migrating)、[檔案在磁碟上的位置](#where-things-live-on-disk)、
    [Agent 工作區](/en/concepts/agent-workspace)、[Doctor](/en/gateway/doctor)、
    [遠端模式](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪裡可以看到最新版本的新功能？">
    查看 GitHub 變更日誌：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的條目位於頂部。如果頂部區段標記為 **Unreleased**，則下一個帶有日期的
    區段為最新發布的版本。條目按 **Highlights**（亮點）、**Changes**（變更）和
    **Fixes**（修復）分組（需要時還包含文件/其他區段）。

  </Accordion>

  <Accordion title="無法存取 docs.openclaw.ai（SSL 錯誤）">
    某些 Comcast/Xfinity 連線透過 Xfinity
    Advanced Security 錯誤地封鎖了 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。
    請在此處報告以協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然無法存取該網站，文件鏡像位於 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="穩定版與 Beta 版的區別">
    **Stable**（穩定版）和 **beta**（測試版）是 **npm dist-tags**（發行標籤），並非獨立的程式碼分支：

    - `latest` = 穩定版
    - `beta` = 用於測試的早期建置

    我們將建置版本發布到 **beta**，進行測試，一旦某個建置版本穩定後，我們會將**該相同版本升級至 `latest`**。這就是為什麼 beta 和 stable 可能指向**同一個版本**的原因。

    查看變更內容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    若要了解單行安裝指令以及 beta 與 dev 的區別，請參閱下方的折疊選單。

  </Accordion>

  <Accordion title="如何安裝 Beta 版，以及 Beta 與 Dev 版有何區別？">
    **Beta** 是 npm dist-tag `beta`（可能與 `latest` 相同）。
    **Dev** 是 `main` (git) 的移動指標；發布時，它會使用 npm dist-tag `dev`。

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

  <Accordion title="如何嘗試最新版本？">
    有兩個選項：

    1. **Dev channel (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    這會切換到 `main` 分支並從原始碼更新。

    2. **Hackable install (來自安裝程式網站)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    這會提供一個您可以編輯的本地儲存庫，然後透過 git 進行更新。

    如果您偏好手動進行乾淨的複製 (clone)，請使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文件：[Update](/en/cli/update)、[Development channels](/en/install/development-channels)、
    [Install](/en/install)。

  </Accordion>

  <Accordion title="安裝和入門通常需要多久？">
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

    更多選項：[安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="Windows 安裝顯示找不到 git 或無法辨識 openclaw">
    Windows 上兩個常見問題：

    **1) npm 錯誤 spawn git / 找不到 git**

    - 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
    - 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

    **2) 安裝後無法辨識 openclaw**

    - 您的 npm 全域 bin 資料夾不在 PATH 中。
    - 檢查路徑：

      ```powershell
      npm config get prefix
      ```

    - 將該目錄新增到您的使用者 PATH (在 Windows 上不需要 `\bin` 後綴；在大多數系統上是 `%AppData%\npm`)。
    - 更新 PATH 後關閉並重新開啟 PowerShell。

    如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
    文件：[Windows](/en/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 執行輸出顯示亂碼中文 - 我該怎麼辦？">
    這通常是原生 Windows Shell 上的主控台字碼頁 不符造成的。

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

    如果您在最新版本的 OpenClaw 上仍遇到此問題，請在以下位置追蹤/回報：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文件沒有回答我的問題 - 我要如何獲得更好的答案？">
    使用 **可駭客式安裝** 以便您在本地擁有完整的原始碼和文件，然後 _從該資料夾中_ 詢問您的機器人 (或 Claude/Codex)，如此它便能讀取 repo 並精確回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多細節：[安裝](/en/install) 和 [安裝程式旗標](/en/install/installer)。

  </Accordion>

  <Accordion title="我要如何在 Linux 上安裝 OpenClaw？">
    簡短回答：依照 Linux 指南操作，然後執行 onboarding。

    - Linux 快速路徑 + 服務安裝：[Linux](/en/platforms/linux)。
    - 完整逐步解說：[快速入門](/en/start/getting-started)。
    - 安裝程式 + 更新：[安裝與更新](/en/install/updating)。

  </Accordion>

  <Accordion title="我要如何在 VPS 上安裝 OpenClaw？">
    任何 Linux VPS 皆可運作。在伺服器上安裝，然後使用 SSH/Tailscale 連線至 Gateway。

    指南：[exe.dev](/en/install/exe-dev)、[Hetzner](/en/install/hetzner)、[Fly.io](/en/install/fly)。
    遠端存取：[Gateway 遠端](/en/gateway/remote)。

  </Accordion>

  <Accordion title="雲端/VPS 安裝指南在哪裡？">
    我們維護了一個包含常見供應商的 **託管中心 (hosting hub)**。選擇其中一個並跟隨指南操作：

    - [VPS hosting](/en/vps) (所有供應商匯集於此)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    在雲端運作的方式：**Gateway 在伺服器上運行**，您可以透過 Control UI (或 Tailscale/SSH) 從您的筆記型電腦/手機存取它。您的狀態 + 工作空間

位於伺服器上，因此請將主機視為事實來源並進行備份。

    您可以將 **節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway，以存取

本機螢幕/相機/畫布，或在將 Gateway 保留在雲端的同時，在您的筆記型電腦上執行指令。

    中心：[Platforms](/en/platforms)。遠端存取：[Gateway remote](/en/gateway/remote)。
    節點：[Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自己嗎？">
    簡短回答：**可行，但不建議**。更新流程可能會重新啟動
Gateway (這會中斷目前的連線階段)，可能需要乾淨的 git checkout，並且
可能會提示進行確認。更安全的做法：以操作員身分從 shell 執行更新。

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

    文件：[Update](/en/cli/update), [Updating](/en/install/updating)。

  </Accordion>

  <Accordion title="入門引導實際上做了什麼？">
    `openclaw onboard` 是推薦的設定途徑。在 **本機模式** 下，它會引導您完成：

    - **模型/驗證設定**（支援供應商 OAuth/setup-token 流程和 API 金鑰，以及 LM Studio 等本機模型選項）
    - **工作區** 位置 + 啟動檔案
    - **閘道設定**（綁定/連接埠/驗證/tailscale）
    - **供應商**（WhatsApp、Telegram、Discord、Mattermost (plugin)、Signal、iMessage）
    - **常駐程式安裝**（macOS 上為 LaunchAgent；Linux/WSL2 上為 systemd 使用者單元）
    - **健康檢查** 和 **技能** 選擇

    如果您設定的模型未知或缺少驗證，它也會發出警告。

  </Accordion>

  <Accordion title="我需要 Claude 或 OpenAI 訂閱才能執行這個嗎？">
    不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或 **僅限本機的模型** 來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱（Claude Pro/Max 或 OpenAI Codex）是驗證這些供應商的選用方式。

    如果您選擇 Anthropic 訂閱驗證，請自行決定是否使用它：Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱的使用。OpenAI Codex OAuth 明確支援 OpenClaw 等外部工具。

    文件：[Anthropic](/en/providers/anthropic)、[OpenAI](/en/providers/openai)、
    [Local models](/en/gateway/local-models)、[Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎？">
    可以。您可以使用 **setup-token**（設定令牌）或在閘道主機上重用本地的 **Claude CLI**
    登入。

    Claude Pro/Max 訂閱 **不包含 API 金鑰**，因此這是訂閱帳戶的技術途徑。但這取決於您的決定：Anthropic
    過去曾阻止部分在 Claude Code 之外的訂閱使用。
    如果您想要生產環境中最清晰且最安全的支援途徑，請使用 Anthropic API 金鑰。

  </Accordion>

<Accordion title="Anthropic setup-token 驗證如何運作？">
  `claude setup-token` 透過 Claude Code CLI 產生 **權杖字串**（在網路主控台中無法使用）。您可以在 **任何機器** 上執行它。在入門引導中選擇 **Anthropic token (paste setup-token)** 或透過 `openclaw models auth paste-token --provider anthropic` 貼上它。該權杖會儲存為 **anthropic** 供應商的驗證設定檔，並像 API 金鑰一樣使用（不會自動重新整理）。更多細節：[OAuth](/en/concepts/oauth)。
</Accordion>

  <Accordion title="我在哪裡可以找到 Anthropic setup-token？">
    它**不在** Anthropic Console 中。setup-token 是由 **Claude Code CLI** 在**任何機器**上生成的：

    ```bash
    claude setup-token
    ```

    複製它列印出的 token，然後在引導流程中選擇 **Anthropic token (paste setup-token)**。如果您想在 gateway 主機上運行它，請使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方運行了 `claude setup-token`，請使用 `openclaw models auth paste-token --provider anthropic` 將其貼上到 gateway 主機上。請參閱 [Anthropic](/en/providers/anthropic)。

  </Accordion>

  <Accordion title="您是否支援 Claude 訂閱驗證 (Claude Pro 或 Max)？">
    是的。您可以：

    - 使用 **setup-token**
    - 使用 `openclaw models auth login --provider anthropic --method cli --set-default` 在 gateway 主機上重複使用本地的 **Claude CLI** 登入

    仍然支援 setup-token。當 gateway 主機已經運行 Claude Code 時，Claude CLI 遷移會更簡單。請參閱 [Anthropic](/en/providers/anthropic) 和 [OAuth](/en/concepts/oauth)。

    重要提示：這是技術上的相容性，並非政策保證。Anthropic 過去曾阻止在 Claude Code 之外使用某些訂閱。
    您需要決定是否使用它，並驗證 Anthropic 目前的條款。
    對於生產環境或多用戶工作負載，Anthropic API 金鑰驗證是更安全、更推薦的選擇。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="為什麼我會收到來自 Anthropic 的 HTTP 429 rate_limit_error？">
這表示您的 **Anthropic 配額/速率限制** 在目前時間區間內已耗盡。如果您使用的是 **Claude 訂閱** (setup-token)，請等待時間區間重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 的使用量/計費情況，並視需求提高限制。

    如果訊息特別是：
    `Extra usage is required for long context requests`，則表示請求正嘗試使用
    Anthropic 的 1M 上下文測試版 (`context1m: true`)。這僅在您的憑證符合長上下文計費資格時才有效 (API 金鑰計費或已啟用額外使用量的訂閱)。

    提示：設定一個 **後備模型**，如此一來當供應商受到速率限制時，OpenClaw 仍能繼續回覆。
    請參閱 [模型](/en/cli/models)、[OAuth](/en/concepts/oauth) 與
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支援 AWS Bedrock？">是的 - 透過 pi-ai 的 **Amazon Bedrock (Converse)** 供應商並搭配 **手動設定**。您必須在 Gateway 主機上提供 AWS 憑證/區域，並在模型設定中新增 Bedrock 供應商項目。請參閱 [Amazon Bedrock](/en/providers/bedrock) 與 [Model providers](/en/providers/models)。如果您偏好在 Bedrock 前使用代理金鑰流程，則 OpenAI 相容的代理伺服器仍然是一個有效的選項。</Accordion>

<Accordion title="Codex 驗證是如何運作的？">OpenClaw 支援透過 OAuth (ChatGPT 登入) 使用 **OpenAI Code (Codex)**。入引導流程 可以執行 OAuth 流程，並會在適當時將預設模型設為 `openai-codex/gpt-5.4`。請參閱 [Model providers](/en/concepts/model-providers) 與 [Onboarding (CLI)](/en/start/wizard)。</Accordion>

  <Accordion title="您是否支援 OpenAI 訂閱驗證 (Codex OAuth)？">
    是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
    OpenAI 明確允許在 OpenClaw 等外部工具/工作流程中使用訂閱 OAuth。
    Onboarding (引導設定) 可為您執行 OAuth 流程。

    請參閱 [OAuth](/en/concepts/oauth)、[Model providers](/en/concepts/model-providers) 和 [Onboarding (CLI)](/en/start/wizard)。

  </Accordion>

  <Accordion title="如何設定 Gemini CLI OAuth？">
    Gemini CLI 使用 **外掛程式驗證流程**，而非 `openclaw.json` 中的用戶端 ID 或金鑰。

    步驟：

    1. 啟用外掛程式：`openclaw plugins enable google`
    2. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`

    這會將 OAuth 權杖儲存在閘道主機上的驗證設定檔中。詳細資訊：[Model providers](/en/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型適合用於閒聊嗎？">通常不適合。OpenClaw 需要大型上下文 + 強大的安全性；小型顯卡會導致截斷和洩漏。如果您必須使用，請在本地執行您所能執行的 **最大** 模型版本 (LM Studio)，並參閱 [/gateway/local-models](/en/gateway/local-models)。較小/量化模型會增加提示注入的風險 - 請參閱 [Security](/en/gateway/security)。</Accordion>

<Accordion title="如何將託管模型的流量保留在特定區域？">選擇區域固定的端點。OpenRouter 提供了 MiniMax、Kimi 和 GLM 的美國託管選項；選擇美國託管變體以將數據保留在區域內。您仍然可以透過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些服務並列，以便在遵守您選擇的區域供應商的同時保持備援可用。</Accordion>

  <Accordion title="我必須購買 Mac Mini 才能安裝這個嗎？">
    不需要。OpenClaw 可在 macOS 或 Linux（透過 WSL2 的 Windows）上執行。Mac mini 是選配的——有些人會購買它作為常駐主機，但小型 VPS、家庭伺服器或 Raspberry Pi 等級的裝置也都可以運作。

    您只有在需要 **僅限 macOS 的工具** 時才需要 Mac。若要使用 iMessage，請使用 [BlueBubbles](/en/channels/bluebubbles)（推薦）——BlueBubbles 伺服器可在任何 Mac 上執行，而 Gateway 可在 Linux 或其他地方執行。如果您需要其他僅限 macOS 的工具，請在 Mac 上執行 Gateway 或配對 macOS 節點。

    文件：[BlueBubbles](/en/channels/bluebubbles)、[節點](/en/nodes)、[Mac 遠端模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支援 iMessage 嗎？">
    您需要一部已登入 Messages 的 **macOS 裝置**。這**不**一定要是 Mac mini——任何 Mac 都可以。iMessage 請 **使用 [BlueBubbles](/en/channels/bluebubbles)**（推薦）——BlueBubbles 伺服器在 macOS 上執行，而 Gateway 可以在 Linux 或其他地方執行。

    常見設定：

    - 在 Linux/VPS 上執行 Gateway，並在任意已登入 Messages 的 Mac 上執行 BlueBubbles 伺服器。
    - 如果您想要最簡單的單機設定，請將所有內容都在 Mac 上執行。

    文件：[BlueBubbles](/en/channels/bluebubbles)、[節點](/en/nodes)、
    [Mac 遠端模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我購買 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？">
    可以。**Mac mini 可以執行 Gateway**，而您的 MacBook Pro 可以作為 **節點**（companion device）連線。節點不執行 Gateway——它們提供額外功能，例如該裝置上的螢幕/相機/畫布和 `system.run`。

    常見模式：

    - Gateway 在 Mac mini 上（常駐運作）。
    - MacBook Pro 執行 macOS 應用程式或節點主機並與 Gateway 配對。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 進行檢視。

    文件：[節點](/en/nodes)、[節點 CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 嗎？">
    **不建議**使用 Bun。我們發現執行時出現錯誤，特別是在 WhatsApp 和 Telegram 方面。
    請使用 **Node** 以獲得穩定的閘道。

    如果您仍想嘗試 Bun，請在非生產環境的閘道上進行，
    且不要用於 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中應填入什麼？">
    `channels.telegram.allowFrom` 是**人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人的使用者名稱。

    入職流程接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

    更安全的方式（無第三方機器人）：

    - 私訊您的機器人，然後執行 `openclaw logs --follow` 並讀取 `from.id`。

    官方 Bot API：

    - 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並讀取 `message.from.id`。

    第三方方式（隱私性較低）：

    - 私訊 `@userinfobot` 或 `@getidsbot`。

    參見 [/channels/telegram](/en/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多個人能否使用一個 WhatsApp 號碼搭配不同的 OpenClaw 實例？">
  可以，透過**多代理程式路由**。將每個發送者的 WhatsApp **私訊**（peer `kind: "direct"`，發送者 E.164 如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區和會話儲存。回覆仍來自**同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是針對每個 WhatsApp 帳號的全域設定。參見 [多代理程式路由](/en/concepts/multi-agent) 和
  [WhatsApp](/en/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同時運行「快速聊天」代理和「Opus 編碼」代理嗎？">可以。使用多代理路由：為每個代理指定其預設模型，然後將入站路由（提供者帳戶或特定對等節點）綁定到每個代理。配置範例位於[多代理路由](/en/concepts/multi-agent)。另請參閱[模型](/en/concepts/models)和[配置](/en/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能用嗎？">
    可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前綴），這樣 `brew` 安裝的工具才能在非登入 shell 中解析。最近的版本也會在 Linux systemd 服務中預先加入常見的使用者 bin 目錄（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），並在設置時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可修改的 git 安裝與 npm 安裝的區別">
    - **可修改 安裝：** 完整的原始碼检出，可編輯，最適合貢獻者。
      您在本地執行建置並可以修補程式碼/文件。
    - **npm 安裝：** 全域 CLI 安裝，無 repo，最適合「直接執行」。
      更新來自 npm dist-tags。

    文件：[快速入門](/en/start/getting-started)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="我之後可以切換 npm 和 git 安裝嗎？">
    可以。安裝另一個版本，然後運行 Doctor，讓網關服務指向新的入口點。
    這**不會刪除您的資料**——它只會更改 OpenClaw 代碼的安裝位置。您的狀態
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

    Doctor 會檢測到網關服務入口點不匹配，並提議重寫服務配置以符合目前的安裝（在自動化中使用 `--repair`）。

    備份提示：請參閱 [備份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我應該在筆記型電腦還是 VPS 上運行 Gateway？">
    簡短回答：**如果您需要 24/7 的可靠性，請使用 VPS**。如果您希望
    阻力最小，且不介意睡眠/重新啟動，請在本地運行。

    **筆記型電腦 (本機 Gateway)**

    - **優點：** 沒有伺服器成本，可直接存取本機檔案，有即時瀏覽器視窗。
    - **缺點：** 睡眠/網路斷線 = 連線中斷，作業系統更新/重啟會中斷，必須保持喚醒。

    **VPS / 雲端**

    - **優點：** 永遠在線，網路穩定，無筆記型電腦睡眠問題，更容易保持運作。
    - **缺點：** 通常無介面運行（使用截圖），只能遠端存取檔案，您必須透過 SSH 進行更新。

    **OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord 都可以在 VPS 上正常運作。唯一的真正取捨是 **無介面瀏覽器** 與 可視視窗 的對比。請參閱 [瀏覽器](/en/tools/browser)。

    **建議預設值：** 如果您之前遇到過網關斷線，請選擇 VPS。當您正在使用 Mac 且想要存取本機檔案或使用可視瀏覽器進行 UI 自動化時，本機運作是很好的選擇。

  </Accordion>

  <Accordion title="在專用機器上執行 OpenClaw 有多重要？">
    非必要，但**為了可靠性和隔離性，建議這樣做**。

    - **專用主機 (VPS/Mac mini/Pi)：** 永遠在線，較少睡眠/重新啟動的中斷，權限設定更乾淨，更容易維持運作。
    - **共用筆記型電腦/桌機：** 對於測試和主動使用完全沒問題，但預期在電腦睡眠或更新時會暫停。

    如果您想兩者兼顧，請將 Gateway 保持在專用主機上，並將您的筆記型電腦配對為本地螢幕/相機/執行工具的**節點 (node)**。請參閱 [節點](/en/nodes)。
    如需安全性指導，請閱讀 [安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低需求與建議的作業系統為何？">
    OpenClaw 很輕量。對於基本的 Gateway + 一個聊天頻道：

    - **絕對最低需求：** 1 vCPU，1GB RAM，約 500GB 磁碟空間。
    - **建議配置：** 1-2 vCPU，2GB 或更多 RAM 以保留餘裕 (日誌、媒體、多個頻道)。節點工具和瀏覽器自動化可能會消耗較多資源。

    作業系統：請使用 **Ubuntu LTS** (或任何現代的 Debian/Ubuntu)。Linux 安裝路徑在該處測試得最完善。

    文件：[Linux](/en/platforms/linux)、[VPS 託管](/en/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中執行 OpenClaw 嗎？需求為何？">
    可以。將 VM 視為 VPS：它需要永遠在線、可被連線，並且有足夠的
    RAM 給 Gateway 和您啟用的任何頻道。

    基礎指導原則：

    - **絕對最低需求：** 1 vCPU，1GB RAM。
    - **建議配置：** 如果您執行多個頻道、瀏覽器自動化或媒體工具，建議使用 2GB 或更多 RAM。
    - **作業系統：** Ubuntu LTS 或其他現代的 Debian/Ubuntu。

    如果您使用 Windows，**WSL2 是最簡單的 VM 設定方式**，且具有最佳的工具
    相容性。請參閱 [Windows](/en/platforms/windows)、[VPS 託管](/en/vps)。
    如果您在 VM 中執行 macOS，請參閱 [macOS VM](/en/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話介紹 OpenClaw 是什麼？">
    OpenClaw 是一個您可以在自己的設備上運行的個人 AI 助手。它在您已經使用的訊息平台上回覆（WhatsApp、Telegram、Slack、Mattermost (plugin)、Discord、Google Chat、Signal、iMessage、WebChat），並且還可以在支援的平台上進行語音交流和即時 Canvas 操作。**Gateway** 是始終在線的控制平面；而助手則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的封裝」。它是一個**本地優先的控制平面**，讓您能夠在**您自己的硬體**上運行一個功能強大的助手，並從您已經使用的聊天應用程式中訪問它，擁有有狀態的會話、記憶和工具——而無需將您的工作流程控制權交給託管的 SaaS。

    重點亮點：

    - **您的設備，您的數據：** 在您想要的任何地方（Mac、Linux、VPS）運行 Gateway，並保持工作區 + 會話歷史在本機。
    - **真實的渠道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支援的平台上的移動語音和 Canvas。
    - **模型中立：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並支援每個代理的路由和故障轉移。
    - **僅限本機選項：** 運行本機模型，因此如果您願意，**所有數據都可以保留在您的設備上**。
    - **多代理路由：** 為每個渠道、帳戶或任務設置獨立的代理，每個都有自己的工作區和預設值。
    - **開源且可駭客化：** 檢查、擴展和自託管，無供應商鎖定。

    文檔：[Gateway](/en/gateway)、[Channels](/en/channels)、[Multi-agent](/en/concepts/multi-agent)、
    [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="我剛設置好——首先應該做什麼？">
    適合入門的專案：

    - 建立一個網站（WordPress、Shopify 或一個簡單的靜態網站）。
    - 原型設計一個行動應用程式（大綱、畫面、API 計劃）。
    - 整理檔案和資料夾（清理、命名、標記）。
    - 連接 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將其分為多個階段並使用子代理進行並行工作時，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常用例是什麼？">
    日常的實際應用通常包括：

    - **個人簡報：** 收件匣、行事曆以及您關心的新聞摘要。
    - **研究與起草：** 快速研究、摘要，以及電子郵件或文件的初稿。
    - **提醒與跟進：** 由 cron 或心跳驅動的提醒與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集資料以及重複網頁任務。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取得結果。

  </Accordion>

  <Accordion title="OpenClaw 能否協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格？">
    在**研究、資格審查和起草**方面，答案是肯定的。它可以掃描網站、建立候選名單、
    摘要潛在客戶，並撰寫外聯或廣告文案初稿。

    針對**外聯或廣告投放**，請保留人員審查。避免垃圾郵件、遵守當地法律和
    平台政策，並在發送前審查所有內容。最安全的模式是讓
    OpenClaw 起草，然後由您核准。

    文件：[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="與 Claude Code 相比，網頁開發有哪些優勢？">
    OpenClaw 是一個**個人助理**和協調層，並非 IDE 的替代品。請使用
    Claude Code 或 Codex 在儲存庫中進行最快的直接編碼迴圈。當您
    需要持久的記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

    優勢：

    - **持續記憶 + 工作區**跨越不同工作階段
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具協調**（瀏覽器、檔案、排程、掛鉤）
    - **Always-on Gateway**（在 VPS 上運行，從任何地方互動）
    - **節點**用於本機瀏覽器/螢幕/相機/執行

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不弄髒 repo 的情況下自訂技能？">
    使用管理覆寫來代替直接編輯 repo 副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增資料夾）。優先順序是 `<workspace>/skills` > `~/.openclaw/skills` > bundled，因此管理覆寫會優先套用且無需觸及 git。只有值得合併至上游的編輯才應保留在 repo 中並作為 PR 提交。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增額外的目錄（優先順序最低）。預設優先順序保持不變：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 在下一次會話中會將其視為 `<workspace>/skills`。
  </Accordion>

  <Accordion title="如何針對不同的任務使用不同的模型？">
    目前支援的模式有：

    - **Cron jobs**：獨立的作業可以為每個作業設定 `model` 覆寫。
    - **子代理**：將任務路由到具有不同預設模型的獨立代理。
    - **隨需切換**：使用 `/model` 隨時切換目前的工作階段模型。

    請參閱 [Cron jobs](/en/automation/cron-jobs)、[Multi-Agent Routing](/en/concepts/multi-agent) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在進行繁重工作時會卡住。我該如何卸載該工作？">
    對於長時間或並行任務，請使用**子代理**。子代理在各自的會話中運行，
    會返回摘要，並保持您的主聊天流暢回應。

    請您的機器人「為此任務生成一個子代理」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看網關當前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理都會消耗 token。如果您關注成本，請透過 `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

    文件：[子代理](/en/tools/subagents)、[背景任務](/en/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的線程綁定子代理會話是如何運作的？">
    使用線程綁定。您可以將 Discord 線程綁定到子代理或會話目標，以便該線程中的後續訊息保持在該綁定的會話上。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 生成（可選擇使用 `mode: "session"` 進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離線程。

    必要配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆蓋值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[子代理](/en/tools/subagents)、[Discord](/en/channels/discord)、[配置參考](/en/gateway/configuration-reference)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我該檢查什麼？">
    Cron 在 Gateway 程序內運行。如果 Gateway 未持續運行，
    排程任務將不會執行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運行（無休眠/重啟）。
    - 驗證任務的時區設定 (`--tz` vs 主機時區)。

    除錯：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron jobs](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝技能？">
    使用原生 `openclaw skills` 指令或將技能放入您的工作區。macOS 的 Skills UI 在 Linux 上無法使用。
    在 [https://clawhub.com](https://clawhub.com) 瀏覽技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    僅當您想要發布或同步自己的技能時，才安裝獨立的 `clawhub` CLI。

  </Accordion>

  <Accordion title="OpenClaw 可以排程執行任務或在背景持續執行嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後依然存在）。
    - **Heartbeat** 用於「主會話」的定期檢查。
    - **Isolated jobs** 用於發送摘要或傳送訊息至聊天的自主代理程式。

    文件：[Cron jobs](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat),
    [Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行 Apple macOS 專屬的技能嗎？">
    不能直接執行。macOS 技能受到 `metadata.openclaw.os` 以及必要二進制檔案的限制，並且只有在 **Gateway 主機**上符合資格時，這些技能才會出現在系統提示詞中。在 Linux 上，`darwin` 專屬的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）除非您覆寫了限制，否則將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進制檔案的地方執行 Gateway，然後從 Linux 透過[遠端模式](#gateway-ports-already-running-and-remote-mode)或透過 Tailscale 進行連線。因為 Gateway 主機是 macOS，所以技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進制檔案時，OpenClaw 可以將 macOS 專屬技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示詞中核准「Always Allow」會將該指令加入允許清單。

    **選項 C - 透過 SSH 代理 macOS 二進制檔案（進階）。**
    將 Gateway 保留在 Linux 上，但將必要的 CLI 二進制檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二進制檔案建立 SSH 包裝程式（範例：針對 Apple Notes 的 `memo`）：

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

    4. 啟動一個新工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="妳有 Notion 或 HeyGen 整合功能嗎？">
    目前尚未內建。

    選項如下：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion/HeyGen 皆有 API）。
    - **瀏覽器自動化：** 無需程式碼即可運作，但速度較慢且較不穩定。

    如果妳希望為每個客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 在會話開始時要求代理取得該頁面。

    如果妳希望有原生整合，請提出功能請求或建構針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放置於活動工作區 `skills/` 目錄中。若要跨代理共享技能，請將其置於 `~/.openclaw/skills/<name>/SKILL.md`。部分技能預期透過 Homebrew 安裝二進位檔；在 Linux 上這代表 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/en/tools/skills) 與 [ClawHub](/en/tools/clawhub)。

  </Accordion>

  <Accordion title="我如何在 OpenClaw 中使用我現有已登入的 Chrome？">
    使用內建的 `user` 瀏覽器設定檔，其透過 Chrome DevTools MCP 連線：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果妳想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑是主機本地的。如果 Gateway 在其他地方執行，請在瀏覽器機器上執行節點主機，或是改用遠端 CDP。

  </Accordion>
</AccordionGroup>

## 沙盒與記憶體

<AccordionGroup>
  <Accordion title="是否有專屬的沙盒文件？">
    有的。請參閱 [沙盒](/en/gateway/sandboxing)。關於 Docker 特定設定（Docker 中的完整 gateway 或沙盒映像檔），請參閱 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺功能受限 - 我該如何啟用完整功能？">
    預設映像檔以安全為優先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項目建置至映像檔中。
    - 透過內建的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/en/install/docker)、[Browser](/en/tools/browser)。

  </Accordion>

  <Accordion title="我可以讓 DM 保持個人化，但讓群組公開/沙盒化並使用同一個代理程式嗎？">
    可以 - 如果您的私人流量是 **DM** 而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"` 讓群組/頻道工作階段（非主要金鑰）在 Docker 中執行，而主要的 DM 工作階段則保持在主機上。然後透過 `tools.sandbox.tools` 限制沙盒工作階段中可用的工具。

    設定逐步解說 + 範例設定：[群組：個人 DM + 公開群組](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    關鍵設定參考：[Gateway configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="我該如何將主機資料夾掛載進沙盒？">
  將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域 + 每個代理程式的掛載會合併；當 `scope: "shared"` 時，每個代理程式的掛載會被忽略。對任何敏感內容請使用 `:ro`，並記住掛載會繞過沙盒檔案系統的防護牆。範例與安全說明請參閱 [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs
  Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。
</Accordion>

  <Accordion title="記憶是如何運作的？">
    OpenClaw 的記憶只是代理工作區中的 Markdown 檔案：

    - 位於 `memory/YYYY-MM-DD.md` 的每日筆記
    - 位於 `MEMORY.md` 的精選長期筆記（僅限主要/私有會話）

    OpenClaw 還會執行**靜默壓縮前記憶刷新**，以提醒模型
    在自動壓縮之前寫入持久化筆記。這僅在工作區可寫時運行
    （唯讀沙盒會跳過此步驟）。請參閱 [記憶](/en/concepts/memory)。

  </Accordion>

  <Accordion title="記憶一直忘記事情。我該如何讓它牢記？">
    請要求機器人**將事實寫入記憶**。長期筆記應放在 `MEMORY.md`，
    短期語境則進入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有幫助；
    它會知道該做什麼。如果它持續忘記，請驗證 Gateway 在每次運行時是否使用
    相同的工作區。

    文件：[記憶](/en/concepts/memory)、[代理工作區](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有什麼限制？">
    記憶檔案存在於磁碟上，並會一直持續直到您刪除它們。限制在於您的
    儲存空間，而非模型。**會話語境**仍受模型
    語境視窗限制，因此長時間的對話可能會被壓縮或截斷。這就是為什麼
    存在記憶搜尋——它僅將相關部分拉回語境中。

    文件：[記憶](/en/concepts/memory)、[語境](/en/concepts/context)。

  </Accordion>

  <Accordion title="語義記憶體搜尋需要 OpenAI API 金鑰嗎？">
    只有在您使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋了聊天/完成並且
    **不**授予嵌入存取權限，因此 **使用 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語義記憶體搜尋沒有幫助。OpenAI 嵌入
    仍然需要真正的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，當 OpenClaw 可以解析
    API 金鑰（auth profiles、`models.providers.*.apiKey` 或環境變數）時，它會自動選擇一個提供者。
    如果能解析到 OpenAI 金鑰，它會偏好使用 OpenAI，否則如果能解析到 Gemini 金鑰，則使用 Gemini，接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶體
    搜尋將保持停用狀態，直到您進行設定。如果您有設定且存在的本機模型路徑，OpenClaw
    會偏好使用 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持本機運作，請設定 `memorySearch.provider = "local"`（並可選擇性地
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
    模型 - 詳細設定資訊請參閱 [記憶體](/en/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 磁碟上的檔案位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有數據是否都會儲存在本機？">
    不對 —— **OpenClaw 的狀態是本機的**，但 **外部服務仍然會看見您發送給它們的內容**。

    - **預設為本機：** 工作階段、記憶體檔案、設定和工作區都位於 Gateway 主機
      (`~/.openclaw` + 您的工作區目錄) 上。
    - **必要時為遠端：** 您發送給模型提供商 (Anthropic/OpenAI/等.) 的訊息會傳送至
      它們的 API，而聊天平台 (WhatsApp/Telegram/Slack/等.) 則會在其
      伺服器上儲存訊息數據。
    - **您掌控數據範圍：** 使用本機模型可以將提示留存在您的機器上，但頻道
      流量仍會經過頻道的伺服器。

    相關：[Agent workspace](/en/concepts/agent-workspace)、[Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 之下（預設值：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主設定檔 (JSON5)                                                   |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到認證設定檔）                     |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 認證設定檔（OAuth、API 金鑰，以及選用的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 針對 `file` SecretRef 提供者的選用檔案支援機密承載          |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 項目已清理）               |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）                      |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話記錄與狀態（每個代理程式）                                        |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 中繼資料（每個代理程式）                                    |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶體檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 設定（預設值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`,
      `MEMORY.md` (或當 `MEMORY.md` 不存在時的舊版後備 `memory.md`),
      `memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`.
    - **State dir (`~/.openclaw`)**: config、credentials、auth profiles、sessions、logs,
      以及共享的 skills (`~/.openclaw/skills`)。

    預設 workspace 為 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了資訊，請確認 Gateway 在每次啟動時都使用相同的
    workspace (並記住：遠端模式使用的是 **gateway host 的**
    workspace，而不是您的本機筆電)。

    提示：如果您希望行為或偏好設定能持久保存，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參閱 [Agent workspace](/en/concepts/agent-workspace) 和 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放入 **私人** git repo 並將其備份到某個
    私人場所 (例如 GitHub private)。這會儲存 memory + AGENTS/SOUL/USER
    檔案，並讓您稍後還原助手的「心智」。

    請 **不要** 將 `~/.openclaw` 下的任何內容 (credentials、sessions、tokens 或加密的 secrets payloads) commit。
    如果您需要完整還原，請分別備份 workspace 和 state 目錄
    (請參閱上述的遷移問題)。

    文件：[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我要如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="代理程式能否在工作區之外運作？">
    可以。工作區是**預設 cwd**（目前工作目錄）和記憶體錨點，並非嚴格的沙箱。
    相對路徑會在工作區內解析，但除非啟用沙箱功能，否則絕對路徑可以存取其他
    主機位置。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或每個代理程式的沙箱設定。如果您
    希望某個儲存庫成為預設的工作目錄，請將該代理程式的
    `workspace` 指向儲存庫根目錄。OpenClaw 儲存庫僅為原始碼；請將
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

  <Accordion title="遠端模式：Session 儲存在哪裡？">
    Session 狀態由**閘道主機**擁有。如果您處於遠端模式，您關心的 session 儲存位於遠端機器上，而非您的本機筆電。請參閱 [Session 管理](/en/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定檔（預設：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用較安全的預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，現在沒有任何監聽 / UI 顯示未授權'>
    非回環位址綁定**需要身份驗證**。請設定 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

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
    - 只有在未設定 `gateway.auth.*` 時，本機呼叫路徑才能使用 `gateway.remote.*` 作為後備。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析將會以失敗封閉 (不會有遠端後備遮罩)。
    - Control UI 透過 `connect.params.auth.token` 進行驗證 (儲存在 app/UI 設定中)。請避免在 URL 中放入 Token。

  </Accordion>

  <Accordion title="為什麼我現在在本機 (localhost) 需要 Token？">
    OpenClaw 預設強制執行 Token 驗證，包括回環位址。如果未設定 Token，Gateway 啟動時會自動產生一個並儲存至 `gateway.auth.token`，因此**本機 WS 客戶端必須通過驗證**。這會阻擋其他本機程序呼叫 Gateway。

    如果您**真的**想要開放回環位址，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生 Token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    Gateway 會監看設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，關鍵變更則重新啟動
    - `hot`、`restart`、`off` 也有支援

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

    - `off`：隱藏標語文字，但保留標題橫幅/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪換顯示有趣/節慶標語（預設行為）。
    - 如果您完全不想要任何橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 需要您選擇的提供者（Brave、Gemini、Grok、Kimi 或 Perplexity）的金鑰。
    **建議做法：** 執行 `openclaw configure --section web` 並選擇一個提供者。
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

    特定提供者的網路搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版的 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應用於新設定。

    備註：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 服務程序會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[網路工具](/en/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的配置。我該如何恢復並避免這種情況？">
    `config.apply` 會替換**整個配置**。如果您發送部分物件，其他所有內容
    都會被移除。

    恢復：

    - 從備份還原（git 或複製的 `~/.openclaw/openclaw.json`）。
    - 如果沒有備份，請重新執行 `openclaw doctor` 並重新配置通道/模型。
    - 如果這是意外發生的，請提交錯誤報告並附上您最後一次的配置或任何備份。
    - 本地程式碼代理通常可以從日誌或歷史記錄中重建有效的配置。

    避免此情況：

    - 對於小幅修改，使用 `openclaw config set`。
    - 對於互動式編輯，使用 `openclaw configure`。

    文件：[Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="如何跨裝置執行具有專用 Worker 的中央 Gateway？">
    常見的模式是**一個 Gateway**（例如 Raspberry Pi）加上**節點**和**代理程式**：

    - **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和會話。
    - **Nodes（裝置）：** Mac/iOS/Android 作為外圍裝置連接並公開本地工具（`system.run`, `canvas`, `camera`）。
    - **Agents（Worker）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner 運維」、「個人資料」）。
    - **Sub-agents：** 當您需要並行處理時，從主代理程式產生背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/會話。

    文件：[Nodes](/en/nodes), [Remote access](/en/gateway/remote), [Multi-Agent Routing](/en/concepts/multi-agent), [Sub-agents](/en/tools/subagents), [TUI](/en/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器能否以無頭模式（headless）運行？">
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

    預設值為 `false` (有頭模式)。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [瀏覽器](/en/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、抓取、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常封鎖無頭工作階段。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），然後重新啟動 Gateway。
    請參閱 [瀏覽器](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端閘道和節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、閘道和節點之間傳遞？">
    Telegram 訊息由**閘道**處理。閘道運行代理程式（agent），
    並且僅在需要節點工具時，透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不見輸入的提供者流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以
    透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在始終運行主機（VPS/家庭伺服器）上執行 Gateway。
    2. 將 Gateway 主機與您的電腦置於同一個 tailnet 中。
    3. 確保 Gateway WS 可連線（tailnet 綁定或 SSH 隧道）。
    4. 在本機開啟 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）連接
       以便它能註冊為節點。
    5. 在 Gateway 上核准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連接。

    安全提醒：配對 macOS 節點會允許在該機器上進行 `system.run`。僅
    配對您信任的裝置，並參閱 [Security](/en/gateway/security)。

    文件：[Nodes](/en/nodes)、[Gateway protocol](/en/gateway/protocol)、[macOS remote mode](/en/platforms/mac/remote)、[Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連接但我沒有收到回覆。現在該怎麼辦？">
    檢查基本事項：

    - Gateway 正在運行：`openclaw gateway status`
    - Gateway 健康狀況：`openclaw status`
    - 頻道健康狀況：`openclaw channels status`

    然後驗證身分驗證和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 隧道連接，請確認本機隧道已啟動並指向正確的連接埠。
    - 確認您的允許清單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/en/gateway/tailscale)、[Remote access](/en/gateway/remote)、[Channels](/en/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本地 + VPS）？">
    可以。沒有內建的「機器人對機器人」橋接器，但您可以透過幾種可靠的方式進行連接：

    **最簡單：**使用兩個機器人都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像往常一樣回覆。

    **CLI 橋接器（通用）：**執行一個腳本，使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    以另一個機器人正在監聽的聊天為目標。如果其中一個機器人在遠端 VPS 上，
    請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （參見 [Remote access](/en/gateway/remote)）。

    範例模式（從可連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，以免兩個機器人無限循環（僅限提及、頻道
    白名單，或「不回覆機器人訊息」規則）。

    文件：[Remote access](/en/gateway/remote)、[Agent CLI](/en/cli/agent)、[Agent send](/en/tools/agent-send)。

  </Accordion>

  <Accordion title="多個 Agent 需要分開的 VPS 嗎？">
    不需要。一個 Gateway 可以託管多個 Agent，每個都有自己的工作區、模型預設值
    和路由。這是標準設定，比每個 Agent 執行一個 VPS 便宜且簡單得多。

    僅在需要嚴格隔離（安全邊界）或您不想共享的差異非常大的設定時，才使用分開的 VPS。
    否則，請保留一個 Gateway 並使用多個 Agent 或子 Agent。

  </Accordion>

  <Accordion title="與從 VPS 使用 SSH 相比，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    是的——節點是從遠端 Gateway 連線到您的筆記型電腦的首要方式，而且它們
    提供的不僅僅是 Shell 存取權限。Gateway 運行於 macOS/Linux（Windows 透過 WSL2）且
    輕量化（小型 VPS 或樹莓派級別的設備即可；4 GB RAM 綽綽有餘），因此常見的
    設定方式是一台永遠運作的主機加上您的筆記型電腦作為節點。

    - **無需傳入 SSH。** 節點會向外連線至 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受該筆記型電腦上的節點允許清單/核准機制限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 附加至主機上的本機 Chrome。

    SSH 適合臨時的 Shell 存取，但對於持續的 Agent 工作流程和
    裝置自動化，節點更簡單。

    文件：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)、[Browser](/en/tools/browser)。

  </Accordion>

  <Accordion title="節點會執行 Gateway 服務嗎？">
    不會。除非您有意執行獨立的設定檔（請參閱 [Multiple gateways](/en/gateway/multiple-gateways)），否則每個主機應該只執行 **一個 gateway**。節點是連線
    至 Gateway 的外圍設備（iOS/Android 節點，或選單列應用程式中的 macOS「節點模式」）。若是無介面的節點
    主機和 CLI 控制，請參閱 [Node host CLI](/en/cli/node)。

    對於 `gateway`、`discovery` 和 `canvasHost` 的變更，需要完全重新啟動。

  </Accordion>

<Accordion title="是否有 API / RPC 方式可以套用設定？">有的。`config.apply` 會驗證 + 寫入完整設定，並在作業過程中重新啟動 Gateway。</Accordion>

  <Accordion title="首次安裝的最低合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這將設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="如何在 VPS 上設置 Tailscale 並從 Mac 連接？">
    最低步驟：

    1. **在 VPS 上安裝並登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在 Mac 上安裝並登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理控制台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您希望不使用 SSH 即可存取控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將網關綁定到 loopback 並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連接到遠端網關（Tailscale Serve）？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連接。

    建議設置：

    1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
    2. **在遠端模式 下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名）。
       應用程式將會建立 Gateway 通道的隧道並作為節點連接。
    3. **在網關上核准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/en/gateway/protocol)、[Discovery](/en/gateway/discovery)、[macOS remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝還是只新增一個節點？">
    如果您在第二台筆記型電腦上只需要**本機工具**（螢幕/相機/exec），請將其新增為
    **節點**。這樣可以保持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    只有在您需要**硬體隔離**或兩個完全獨立的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)、[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父程序（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 來自目前工作目錄的 `.env`
    - 來自 `~/.openclaw/.env`（又名 `$OPENCLAW_STATE_DIR/.env`）的全域後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋現有的環境變數。

    您也可以在設定中定義內聯環境變數（僅在程序環境中缺失時套用）：

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

  <Accordion title="我透過服務啟動了 Gateway，環境變數卻消失了。該怎麼辦？">
    有兩個常見的解決方法：

    1. 將缺失的鍵放入 `~/.openclaw/.env`，這樣即使服務未繼承您的 shell 環境，也能讀取這些鍵。
    2. 啟用 shell 匯入（選用的便利功能）：

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

    這會執行您的登入 shell 並僅匯入缺失的預期鍵（從不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示 "Shell env: off." 為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**。「Shell env: off」
    **並不**表示您的環境變數遺失——這只是表示 OpenClaw 不會自動載入
    您的登入 shell。

    如果 Gateway 作為服務 (launchd/systemd) 執行，它將不會繼承您的 shell
    環境。請嘗試以下其中一種方式來修復：

    1. 將 token 放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell import (`env.shellEnv.enabled: true`)。
    3. 或將其新增至您的設定 `env` 區塊 (僅在缺失時適用)。

    然後重新啟動 gateway 並再次檢查：

    ```bash
    openclaw models status
    ```

    Copilot tokens 是從 `COPILOT_GITHUB_TOKEN` 讀取的 (也包括 `GH_TOKEN` / `GITHUB_TOKEN`)。
    請參閱 [/concepts/model-providers](/en/concepts/model-providers) 和 [/environment](/en/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="我該如何開始一個新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/en/concepts/session)。
  </Accordion>

  <Accordion title="如果我不發送 /new，sessions 會自動重置嗎？">
    Sessions 可以在 `session.idleMinutes` 之後過期，但這是 **預設停用的** (預設值為 **0**)。
    將其設為正數以啟用閒置過期。啟用後，閒置期間後的 **下一則**
    訊息將會為該聊天金鑰啟動一個新的 session id。
    這不會刪除對話記錄——它只是開始一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法組建一個 OpenClaw 實例團隊（一個 CEO 和許多代理程式）？">
    是的，透過 **多代理程式路由** 和 **子代理程式**。您可以建立一個協調器
    代理程式和數個擁有自己的工作區和模型的
    工作者代理程式。

    也就是說，這最好被視為一個 **有趣的實驗**。它非常耗費 token，而且往往
    比使用一個具有不同會話的機器人效率更低。我們
    構想的典型模式是您與一個機器人對話，並
    使用不同的會話進行並行工作。該
    機器人也可以在需要時生成子代理程式。

    文件：[多代理程式路由](/en/concepts/multi-agent)、[子代理程式](/en/tools/subagents)、[代理程式 CLI](/en/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文會在任務中途被截斷？我該如何預防？">
    會話上下文受限於模型視窗。長時間的對話、龐大的工具輸出或
    許多檔案都可能觸發壓縮或截斷。

    以下是解決方法：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保留在工作區中，並要求機器人將其讀回。
    - 對於長時間或並行工作使用子代理程式，以便讓主對話保持較小。
    - 如果這種情況經常發生，請選擇一個具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留已安裝的狀態？">
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

    說明：

    - 如果入門程式偵測到現有的設定，也會提供 **重置** 選項。請參閱 [入門 (CLI)](/en/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset` (僅限開發；會清除開發設定 + 憑證 + 會話 + 工作區)。

  </Accordion>

  <Accordion title='出現「context too large」錯誤該怎麼辦？如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮** (保留對話但總結較早的輪次)：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置** (為相同的聊天金鑰建立新的 session ID)：

      ```
      /new
      /reset
      ```

    如果問題持續發生：

    - 啟用或調整 **session pruning** (`agents.defaults.contextPruning`) 以修剪舊的工具輸出。
    - 使用具有更大上下文視窗的模型。

    文件：[Compaction](/en/concepts/compaction)、[Session pruning](/en/concepts/session-pruning)、[Session management](/en/concepts/session)。

  </Accordion>

  <Accordion title='為什麼會出現「LLM request rejected: messages.content.tool_use.input field required」錯誤？'>
    這是一個供應商驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必需的
    `input`。這通常意味著 session 歷史記錄已過時或損壞（常發生在長對話執行緒
    或工具/架構變更之後）。

    解決方法：使用 `/new` (獨立訊息) 啟動一個新的 session。

  </Accordion>

  <Accordion title="為什麼每 30 分鐘會收到 heartbeat 訊息？">
    Heartbeat 預設每 **30 分鐘** 執行一次 (使用 OAuth 驗證時為 **1 小時**)。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的 (只有空白行和 markdown
    標題，例如 `# Heading`)，OpenClaw 會跳過 heartbeat 執行以節省 API 呼叫。
    如果檔案不存在，heartbeat 仍會執行，並由模型決定要做什麼。

    每個代理的覆寫設定使用 `agents.list[].heartbeat`。文件：[Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」加入到 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，所以如果您在該群組中，OpenClaw 就能看到它。
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

  <Accordion title="如何取得 WhatsApp 群組的 JID？">
    選項 1 (最快)：追蹤記錄 並在群組中發送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId` (或 `from`)，例如：
    `1234567890-1234567890@g.us`。

    選項 2 (如果已經設定/加入允許列表)：從設定中列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/en/channels/whatsapp), [目錄](/en/cli/directory), [記錄](/en/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟 (預設)。您必須 @提及 機器人 (或符合 `mentionPatterns`)。
    - 您設定 `channels.whatsapp.groups` 但沒有 `"*"`，且該群組未被加入允許列表。

    請參閱 [群組](/en/channels/groups) 和 [群組訊息](/en/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與 DM 共享上下文？">直接聊天預設會折疊到主會話。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒則是獨立的會話。請參閱 [群組](/en/channels/groups) 和 [群組訊息](/en/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。幾十個（甚至數百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會話 + 轉錄檔儲存於 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 更多代理程式意味著更多的並發模型使用量。
    - **營運負擔：** 每個代理程式的驗證設定檔、工作區和通道路由。

    建議：

    - 為每個代理程式保留一個 **作用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增長，請修剪舊的會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來找出遺留的工作區和設定檔不符。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天嗎 (Slack)，該如何設定？">
    可以。使用 **多代理程式路由** 來執行多個隔離的代理程式，並透過
    通道/帳戶/對等節點路由傳入訊息。Slack 支援作為一個通道，並且可以綁定到特定的代理程式。

    瀏覽器存取功能強大但並非「能做任何人類能做的事」——反機器人措施、CAPTCHA 和 MFA
    仍然可以阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或者在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 常駐的閘道主機 (VPS/Mac mini)。
    - 每個角色一個代理程式 (bindings)。
    - 綁定到這些代理程式的 Slack 通道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[多代理程式路由](/en/concepts/multi-agent)、[Slack](/en/channels/slack)、
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

    模型引用為 `provider/model` (例如：`anthropic/claude-opus-4-6`)。如果您省略提供者，OpenClaw 目前會假設 `anthropic` 作為暫時的棄用後備方案——但您仍然應該 **明確地** 設定 `provider/model`。

  </Accordion>

  <Accordion title="您推薦使用哪種模型？">
    **建議預設：** 使用您的供應商堆疊中最強大的最新世代模型。
    **對於啟用工具或不可信輸入的代理：** 優先考慮模型強度而非成本。
    **對於例行/低風險的聊天：** 使用較便宜的備用模型，並根據代理角色進行路由。

    MiniMax 有自己的文件：[MiniMax](/en/providers/minimax) 和
    [本地模型](/en/gateway/local-models)。

    經驗法則：對於高風險的工作，使用您**負擔得起的最佳模型**；對於例行聊天或摘要，使用較便宜的模型。您可以根據代理路由模型，並使用子代理來並行處理長任務（每個子代理都會消耗 tokens）。請參閱 [Models](/en/concepts/models) 和
    [Sub-agents](/en/tools/subagents)。

    強烈警告：較弱/過度量化的模型更容易受到提示注入和不安全行為的影響。請參閱 [Security](/en/gateway/security)。

    更多背景資訊：[Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除設定的情況下切換模型？">
    使用 **model commands** 或僅編輯 **model** 欄位。避免完全替換設定。

    安全的選項：

    - 在聊天中使用 `/model`（快速，每個 session 一次）
    - `openclaw models set ...`（僅更新模型設定）
    - `openclaw configure --section model`（互動式）
    - 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

    除非您打算替換整個設定，否則請避免使用部分物件執行 `config.apply`。如果您確實覆蓋了設定，請從備份還原或重新執行 `openclaw doctor` 進行修復。

    文件：[Models](/en/concepts/models)、[Configure](/en/cli/configure)、[Config](/en/cli/config)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自託管的模型嗎？">
    可以。Ollama 是本地模型最簡單的途徑。

    最快的設定方法：

    1. 從 `https://ollama.com/download` 安裝 Ollama
    2. 拉取一個本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您同時想要 Ollama Cloud，請執行 `ollama signin`
    4. 執行 `openclaw onboard` 並選擇 `Ollama`
    5. 選擇 `Local` 或 `Cloud + Local`

    注意事項：

    - `Cloud + Local` 可讓您獲得 Ollama Cloud 模型以及您的本地 Ollama 模型
    - 諸如 `kimi-k2.5:cloud` 的雲端模型不需要本地拉取
    - 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全性提示：較小或經過高度量化的模型更容易受到提示詞注入的攻擊。我們強烈建議對任何可使用工具的機器人使用**大型模型**。如果您仍想使用小型模型，請啟用沙盒機制和嚴格的工具允許清單。

    文件：[Ollama](/en/providers/ollama)、[Local models](/en/gateway/local-models)、
    [Model providers](/en/concepts/model-providers)、[Security](/en/gateway/security)、
    [Sandboxing](/en/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什麼模型？">- 這些部署可能有所不同，且可能會隨時間變更；沒有固定的建議供應商。 - 使用 `openclaw models status` 檢查每個閘道器上的當前運行時設定。 - 對於安全敏感型/已啟用工具的代理程式，請使用可用的最強大最新世代模型。</Accordion>

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

    這些是內建的別名。可以透過 `agents.defaults.models` 新增自訂別名。

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用的模型。

    `/model`（以及 `/model list`）會顯示一個緊湊的編號選擇器。透過編號進行選擇：

    ```
    /model 3
    ```

    您也可以為提供者強制指定特定的驗證設定檔（每個 session）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 會顯示目前啟用的代理、正在使用的 `auth-profiles.json` 檔案，以及接下來將嘗試的驗證設定檔。
    當有可用時，它也會顯示已設定的提供者端點（`baseUrl`）和 API 模式（`api`）。

    **如何取消固定我透過 @profile 設定的設定檔？**

    重新執行 `/model`，但**不要**加上 `@profile` 後綴：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想恢復預設值，請從 `/model` 中選取（或傳送 `/model <default provider/model>`）。
    使用 `/model status` 確認目前啟用的驗證設定檔。

  </Accordion>

  <Accordion title="我可以將 GPT 5.2 用於日常任務，將 Codex 5.3 用於編碼嗎？">
    是的。將其中一個設為預設值並視需要切換：

    - **快速切換（每個 session）：** 日常任務使用 `/model gpt-5.4`，使用 Codex OAuth 編碼時使用 `/model openai-codex/gpt-5.4`。
    - **預設值 + 切換：** 將 `agents.defaults.model.primary` 設為 `openai/gpt-5.4`，然後在編碼時切換至 `openai-codex/gpt-5.4`（或反之亦可）。
    - **子代理：** 將編碼任務路由到具有不同預設模型的子代理。

    請參閱 [Models](/en/concepts/models) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title='為什麼我會看到「Model ... is not allowed」，然後沒有收到任何回覆？'>
    如果設定了 `agents.defaults.models`，它就會成為 `/model` 和任何
    session 覆蓋設定的 **允許清單**。選擇不在該清單中的模型會傳回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    該錯誤會 **取代** 正常的回覆被傳回。解決方法：將模型加入
    `agents.defaults.models`、移除允許清單，或從 `/model list` 中選擇一個模型。

  </Accordion>

  <Accordion title='為什麼我會看到「Unknown model: minimax/MiniMax-M2.7」？'>
    這表示 **未設定供應商**（找不到 MiniMax 供應商設定或驗證設定檔），
    因此無法解析模型。

    修復檢查清單：

    1. 升級至目前的 OpenClaw 版本（或從原始碼執行 `main`），然後重新啟動 gateway。
    2. 確認已設定 MiniMax（透過精靈或 JSON），或 env/auth 設定檔中存在 MiniMax API 金鑰，
       以便注入供應商。
    3. 使用確切的模型 ID（區分大小寫）：`minimax/MiniMax-M2.7` 或
       `minimax/MiniMax-M2.7-highspeed`。
    4. 執行：

       ```bash
       openclaw models list
       ```

       並從清單中選擇（或在聊天中使用 `/model list`）。

    參閱 [MiniMax](/en/providers/minimax) 和 [Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以將 MiniMax 作為預設值，並在複雜任務中使用 OpenAI 嗎？">
    可以。將 **MiniMax 設為預設**，並在需要時 **每個 session** 切換模型。
    針對 **錯誤** 而非「困難任務」應使用容錯移轉，因此請使用 `/model` 或單獨的 agent。

    **選項 A：每個 session 切換**

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

    **選項 B：分開的 agent**

    - Agent A 預設：MiniMax
    - Agent B 預設：OpenAI
    - 透過 agent 路由或使用 `/agent` 進行切換

    文件：[Models](/en/concepts/models)、[Multi-Agent Routing](/en/concepts/multi-agent)、[MiniMax](/en/providers/minimax)、[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是內建的捷徑嗎？">
    是的。OpenClaw 附帶了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時才套用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您使用相同名稱設定了自己的別名，則您的值優先。

  </Accordion>

  <Accordion title="我該如何定義/覆寫模型捷徑（別名）？">
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

    然後 `/model sonnet` （或在支援時使用 `/<alias>` ）將解析為該模型 ID。

  </Accordion>

  <Accordion title="如何新增來自其他提供商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter （按 Token 付費；提供多種模型）：

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

    Z.AI （GLM 模型）：

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

    如果您引用了某個提供商/模型，但缺少所需的提供商金鑰，您將會收到執行時期的驗證錯誤（例如 `No API key found for provider "zai"`）。

    **新增代理後找不到提供商的 API 金鑰**

    這通常表示 **新代理** 擁有空白的驗證儲存區。驗證是針對每個代理的，並且儲存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修復選項：

    - 執行 `openclaw agents add <id>` 並在精靈設定過程中設定驗證。
    - 或者將 `auth-profiles.json` 從主代理的 `agentDir` 複製到新代理的 `agentDir` 中。

    請 **勿** 在不同代理之間重複使用 `agentDir`；這會導致驗證/會衝突。

  </Accordion>
</AccordionGroup>

## 模型故障轉移與「所有模型均失敗」

<AccordionGroup>
  <Accordion title="容錯機制如何運作？">
    容錯機制分兩個階段進行：

    1. 在同一供應商內進行 **認證設定檔輪替**。
    2. **模型降級** 至 `agents.defaults.model.fallbacks` 中的下一個模型。

    冷卻時間會套用至失敗的設定檔（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 仍能持續回應。

  </Accordion>

  <Accordion title='「找不到設定檔 anthropic:default 的憑證」是什麼意思？'>
    這表示系統嘗試使用認證設定檔 ID `anthropic:default`，但在預期的認證儲存空間中找不到相關憑證。

    **修復檢查清單：**

    - **確認認證設定檔的位置**（新舊路徑對比）
      - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
    - **確認您的環境變數已由 Gateway 載入**
      - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能不會繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
    - **確保您正在編輯正確的代理程式**
      - 多代理程式設置意味著可能存在多個 `auth-profiles.json` 檔案。
    - **合理性檢查模型/認證狀態**
      - 使用 `openclaw models status` 檢視已設定的模型以及供應商是否已通過認證。

    **針對「找不到設定檔 anthropic 的憑證」的修復檢查清單**

    這表示該次執行被鎖定為 Anthropic 認證設定檔，但 Gateway 無法在其認證儲存空間中找到它。

    - **使用 setup-token**
      - 執行 `claude setup-token`，然後使用 `openclaw models auth setup-token --provider anthropic` 貼上。
      - 如果 token 是在另一台機器上建立的，請使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果您想改用 API 金鑰**
      - 將 `ANTHROPIC_API_KEY` 放入 **gateway 主機** 上的 `~/.openclaw/.env` 中。
      - 清除任何強制使用遺失設定檔的固定順序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **確認您正在 gateway 主機上執行指令**
      - 在遠端模式下，認證設定檔位於 gateway 機器上，而不是您的筆記型電腦。

  </Accordion>

  <Accordion title="為什麼它也嘗試了 Google Gemini 並失敗了？">
    如果您的模型配置包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型故障轉移期間嘗試它。如果您尚未配置 Google 憑證，您會看到 `No API key found for provider "google"`。

    修正方法：提供 Google 驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免故障轉移路由到該處。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：對話歷史記錄包含 **沒有簽章的思考區塊**（通常來自於
    已中止/不完整的串流）。Google Antigravity 要求思考區塊必須有簽章。

    修正方法：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽章的思考區塊。如果問題仍然存在，請開始 **新會話** 或為該代理程式設定 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 驗證設定檔：它們是什麼以及如何管理它們

相關： [/concepts/oauth](/en/concepts/oauth) (OAuth 流程、Token 儲存、多帳號模式)

<AccordionGroup>
  <Accordion title="什麼是驗證設定檔？">
    驗證設定檔是與提供者綁定的命名憑證記錄（OAuth 或 API 金鑰）。設定檔存在於：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的設定檔 ID 是什麼？">
    OpenClaw 使用以提供者為前綴的 ID，例如：

    - `anthropic:default` （當沒有電子郵件身分識別時很常見）
    - `anthropic:<email>` 用於 OAuth 身分識別
    - 您選擇的自訂 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先嘗試哪個認證設定檔嗎？">
    可以。設定檔支援選用的元資料 (metadata)，並可為每個提供者設定排序 (`auth.order.<provider>`)。這**不會**儲存機密；它會將 ID 對應到提供者/模式，並設定輪替順序。

    如果某個設定檔處於短期的 **冷卻** (cooldown) 狀態 (速率限制/逾時/認證失敗) 或較長期的 **停用** (disabled) 狀態 (帳單/額度不足)，OpenClaw 可能會暫時跳過該設定檔。若要檢查此狀態，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整設定：`auth.cooldowns.billingBackoffHours*`。

    您也可以透過 CLI 設定 **個別代理程式** (per-agent) 的順序覆寫 (儲存在該代理程式的 `auth-profiles.json` 中)：

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
    OpenClaw 同時支援這兩者：

    - **OAuth** 通常利用訂閱存取權 (如果適用)。
    - **API 金鑰** 則使用依 Token 計費。

    精靈 明確支援 Anthropic setup-token 和 OpenAI Codex OAuth，並可為您儲存 API 金鑰。

  </Accordion>
</AccordionGroup>

## 閘道：連接埠、「正在執行」與遠端模式

<AccordionGroup>
  <Accordion title="閘道 使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP (控制 UI、hooks 等) 的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Runtime: running」，但「RPC probe: failed」？'>
    因為「running」是 **監督程式** (supervisor) (launchd/systemd/schtasks) 的視角。RPC 探測則是 CLI 實際連線到閘道 WebSocket 並呼叫 `status`。

    請使用 `openclaw gateway status` 並參考這幾行資訊：

    - `Probe target:` (探測實際使用的 URL)
    - `Listening:` (連接埠上實際綁定的內容)
    - `Last gateway error:` (常見根本原因：程序存活但連接埠未監聽)

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示的「Config (cli)」和「Config (service)」不同？'>
    您正在編輯一個配置檔案，而服務正在執行另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修復方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的相同 `--profile` / 環境執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行執行時鎖定（預設 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個執行實例正在監聽。

    修復方法：停止另一個執行實例、釋放該連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="我如何在遠端模式下執行 OpenClaw（用戶端連接到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向一個遠端 WebSocket URL，選擇性附帶 token/password：

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

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時啟動（或者您傳遞覆寫標誌）。
    - macOS 應用程式會監看配置檔案，並在這些數值變更時即時切換模式。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或持續重新連線）。該怎麼辦？'>
    您的閘道正在啟用驗證的情況下執行 (`gateway.auth.*`)，但 UI 並未發送相符的 token/密碼。

    事實（來自程式碼）：

    - 控制介面會將 token 保留在 `sessionStorage` 中，以供當前瀏覽器分頁工作階段及選取的閘道 URL 使用，因此相同分頁的重新整理能持續運作，而無需還原長期存在的 localStorage token 持續性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示 (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`) 時，受信任的用戶端可以使用快取的裝置 token 嘗試一次有界的重試。

    修正方法：

    - 最快：`openclaw dashboard` (會列印並複製儀表板 URL，嘗試開啟；若是無頭模式則顯示 SSH 提示)。
    - 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 在閘道主機上設定 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
    - 在控制介面設定中，貼上相同的 token。
    - 如果在一次重試後差異仍然存在，請輪換/重新核准配對的裝置 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 仍然卡住？執行 `openclaw status --all` 並依照 [疑難排解](/en/gateway/troubleshooting) 操作。請參閱 [儀表板](/en/web/dashboard) 以了解驗證詳情。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但它無法綁定且沒有監聽">
    `tailnet` 綁定會從您的網路介面 (100.64.0.0/10) 選擇一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已停用），就沒有可綁定的物件。

    修正方法：

    - 在該主機上啟動 Tailscale（這樣它就會有一個 100.x 位址），或者
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您只需要 tailnet 綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行 - 一個 Gateway 可以執行多個訊息通道和代理程式。只有在需要冗餘（例如：救援機器人）或強隔離時才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` (每個執行個體的設定)
    - `OPENCLAW_STATE_DIR` (每個執行個體的狀態)
    - `agents.defaults.workspace` (工作區隔離)
    - `gateway.port` (唯一的連接埠)

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...` (會自動建立 `~/.openclaw-<name>`)。
    - 在每個 profile 設定中設定唯一的 `gateway.port` (或在手動執行時傳遞 `--port`)。
    - 安裝個別 profile 的服務：`openclaw --profile <name> gateway install`。

    Profiles 也會為服務名稱加上後綴 (`ai.openclaw.<profile>`；舊版 `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`)。
    完整指南：[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「invalid handshake」/ 代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期收到的第一個訊息必須是 `connect` 框架。如果收到其他任何內容，它會以 **代碼 1008** (違反原則) 關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`) 而不是 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭或發送了非 Gateway 的請求。

    快速修復方法：

    1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
    2. 不要在一般的瀏覽器分頁中開啟 WS 連接埠。
    3. 如果開啟了驗證，請在 `connect` 框架中包含 token/password。

    如果您使用的是 CLI 或 TUI，URL 應該看起來像這樣：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    通訊協定細節：[Gateway protocol](/en/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌等級由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌監控方式：

    ```bash
    openclaw logs --follow
    ```

    服務/監督者日誌（當閘道透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    詳情請參閱 [故障排除](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動閘道服務？">
    使用閘道輔助指令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行閘道，`openclaw gateway --force` 可以回收連接埠。請參閱 [閘道](/en/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 - 如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2（推薦）：** 閘道在 Linux 內執行。

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

    **2) 原生 Windows（不推薦）：** 閘道直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它（無服務），請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/en/platforms/windows), [Gateway service runbook](/en/gateway)。

  </Accordion>

  <Accordion title="Gateway 已啟動，但從未收到回覆。我該檢查什麼？">
    首先進行快速健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未在 **gateway host** 上載入（檢查 `models status`）。
    - 頻道配對/允許清單阻擋了回覆（檢查頻道設定 + 日誌）。
    - WebChat/Dashboard 在沒有正確 token 的情況下開啟。

    如果您是遠端連線，請確認 tunnel/Tailscale 連線是否正常，以及
    Gateway WebSocket 是否可存取。

    文件：[Channels](/en/channels)、[Troubleshooting](/en/gateway/troubleshooting)、[Remote access](/en/gateway/remote)。

  </Accordion>

  <Accordion title='「已從 gateway 中斷連線：沒有原因」——該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在運作？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否擁有正確的 token？ `openclaw dashboard`
    4. 若為遠端連線，tunnel/Tailscale 連線是否正常？

    然後查看日誌：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/en/web/dashboard)、[Remote access](/en/gateway/remote)、[Troubleshooting](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗了。我應該檢查什麼？">
    從日誌和頻道狀態開始檢查：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤訊息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目過多。OpenClaw 已經自動修剪至 Telegram 的限制並以較少的指令重試，但您仍需手動移除部分選單項目。請減少外掛/技能/自訂指令，或者如果不需要選單的話，停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您使用的是 VPS 或位於 Proxy 後方，請確認允許對外 HTTPS 連線，且對 `api.telegram.org` 的 DNS 解析正常。

    如果 Gateway 是遠端的，請確保您查看的是 Gateway 主機上的日誌。

    文件：[Telegram](/en/channels/telegram)、[頻道疑難排解](/en/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可以連線，且代理程式 可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 來查看當前狀態。如果您預期在聊天頻道中收到回覆，
    請確認已啟用遞送功能 (`/deliver on`)。

    文件：[TUI](/en/web/tui)、[斜線指令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="我該如何完全停止然後重新啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上是 launchd，Linux 上是 systemd)。
    當 Gateway 在背景作為守護程序 執行時，請使用此方法。

    如果您是在前景執行，請先按 Ctrl-C 停止，然後執行：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段中，於 **前景** 執行 gateway。

    如果您已安裝服務，請使用 gateway 指令。當您想要單次、前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查日誌檔案中的通道認證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    來自代理程式的傳出附件必須包含 `MEDIA:<path-or-url>` 行（單獨一行）。請參閱 [OpenClaw assistant setup](/en/start/openclaw) 和 [Agent send](/en/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時請檢查：

    - 目標通道支援傳出媒體，且未被允許清單封鎖。
    - 檔案大小在提供者的限制範圍內（影像會調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制在 workspace、temp/media-store 和沙箱驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送代理程式已可讀取的主機本機檔案，但僅限於媒體及安全文件類型（影像、音訊、視訊、PDF 和 Office 文件）。純文字和類似機密的檔案仍會被封鎖。

    參閱 [Images](/en/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全性與存取控制

<AccordionGroup>
  <Accordion title="讓 OpenClaw 接收傳入私訊是否安全？">
    將傳入私訊視為不受信任的輸入。預設值的設計旨在降低風險：

    - 支援私訊頻道的預設行為是**配對 (pairing)**：
      - 未知的發送者會收到配對碼；機器人不會處理他們的訊息。
      - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每個頻道的待處理請求上限為 **3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私訊需要明確選擇加入 (`dmPolicy: "open"` 和允許清單 `"*"`)。

    執行 `openclaw doctor` 以顯示有風險的私訊政策。

  </Accordion>

  <Accordion title="提示詞注入僅是公開機器人需要關心的問題嗎？">
    不是。提示詞注入是關於**不受信任的內容**，而不僅僅是誰可以私訊機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    劫持模型的指令。即使**您是唯一的發送者**，也可能發生這種情況。

    最大的風險在於啟用工具時：模型可能被誘騙
    洩漏上下文或代表您呼叫工具。透過以下方式減少損害範圍：

    - 使用唯讀或已停用工具的「讀取器」代理程式來總結不受信任的內容
    - 對已啟用工具的代理程式，保持 `web_search` / `web_fetch` / `browser` 關閉
    - 沙盒化與嚴格的工具允許清單

    詳情：[安全性](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設置而言。使用獨立的帳號和電話號碼將機器人隔離
    可以在出問題時減少損害範圍。這也讓輪替
    憑證或撤銷存取權限變得更容易，且不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號存取權限，並在
    必要時再進行擴充。

    文件：[安全性](/en/gateway/security)、[配對](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它完全控制我的簡訊，這樣安全嗎？">
    我們**不**建議讓其完全控制您的個人訊息。最安全的模式是：

    - 將私人訊息保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
    - 讓它撰寫草稿，然後在發送前**進行審核批准**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以使用更便宜的模型來處理個人助理任務嗎？">可以，**前提是**該代理僅用於聊天且輸入來源可信。較小層級的模型 更容易受到指令劫持，因此請避免將其用於啟用了工具的代理 或在閱讀不可信內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒中運行。請參閱 [安全](/en/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    只有在未知發送者向機器人發送訊息並且
    `dmPolicy: "pairing"` 已啟用時，才會發送配對碼。僅 `/start` 本身不會產生代碼。

    檢查待處理請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許清單或為該帳號設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對如何運作？">
    不會。預設的 WhatsApp 私人訊息政策是**配對**。未知發送者只會收到配對碼，且其訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天訊息或您觸發的明確發送。

    使用以下指令批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：這是用來設定您的**允許清單/擁有者**，以便允許您自己的私人訊息。它不會用於自動發送。如果您在個人 WhatsApp 號碼上運行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務與「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止在聊天中顯示內部系統訊息？">
    大多數內部或工具訊息僅在該會話啟用 **verbose** 或 **reasoning** 時才會出現。

    在您看到該訊息的聊天中進行修復：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然顯得雜亂，請檢查控制 UI 中的會話設定，並將 verbose 設定為 **inherit**。同時確認您沒有使用在設定中將 `verboseDefault` 設定為 `on` 的 bot 設定檔。

    文件：[思考與詳細模式](/en/tools/thinking)、[安全性](/en/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    發送以下任一訊息**作為獨立訊息**（不使用斜線）：

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

    斜線指令概覽：請參閱 [斜線指令](/en/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的**獨立**訊息發送，但少數捷徑（例如 `/status`）對於在白名單中的發送者也可以在行內使用。

  </Accordion>

  <Accordion title='如何從 Telegram 發送 Discord 訊息？（「Cross-context messaging denied」）'>
    OpenClaw 預設會封鎖 **跨供應商** (cross-provider) 訊息傳送。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會發送到 Discord。

    為該代理啟用跨供應商訊息傳送：

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

  <Accordion title='為什麼機器人感覺像「忽略」了連珠砲似的訊息？'>
    佇列模式控制新訊息如何與進行中的執行互動。使用 `/queue` 來變更模式：

    - `steer` - 新訊息會重新導向目前的任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即引導，然後處理待辦事項
    - `interrupt` - 中止目前的執行並重新開始

    您可以為後續模式新增類似 `debounce:2s cap:25 drop:summarize` 的選項。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型為何？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在設定檔中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型取決於您在 `agents.defaults.model.primary` 中的設定（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，表示 Gateway 無法在執行中代理程式預期的 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。
