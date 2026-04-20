---
summary: "安裝程式腳本 (install.sh, install-cli.sh, install.ps1) 的運作方式、旗標和自動化"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "安裝程式內部機制"
---

# 安裝程式內部機制

OpenClaw 隨附三個安裝程式腳本，由 `openclaw.ai` 提供。

| 腳本                               | 平台                 | 作用                                                                                                 |
| ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 視需要安裝 Node，透過 npm（預設）或 git 安裝 OpenClaw，並可執行引導程式。                            |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 使用 npm 或 git checkout 模式，將 Node + OpenClaw 安裝到本機前綴 (`~/.openclaw`)。不需要 root 權限。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 視需要安裝 Node，透過 npm（預設）或 git 安裝 OpenClaw，並可執行引導程式。                            |

## 快速指令

<Tabs>
  <Tab title="install.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install-cli.sh">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --help
    ```

  </Tab>
  <Tab title="install.ps1">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```

    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag beta -NoOnboard -DryRun
    ```

  </Tab>
</Tabs>

<Note>如果安裝成功但在新的終端機中找不到 `openclaw`，請參閱 [Node.js 疑難排解](/zh-Hant/install/node#troubleshooting)。</Note>

---

<a id="installsh"></a>

## install.sh

<Tip>推薦用於 macOS/Linux/WSL 上大多數的互動式安裝。</Tip>

### Flow (install.sh)

<Steps>
  <Step title="Detect OS">支援 macOS 和 Linux（包括 WSL）。如果檢測到 macOS，若缺少 Homebrew 則會進行安裝。</Step>
  <Step title="Ensure Node.js 24 by default">檢查 Node 版本並視需要安裝 Node 24（macOS 上使用 Homebrew，Linux 上使用 NodeSource 設定指令碼 apt/dnf/yum）。出於相容性考量，OpenClaw 目前仍支援 Node 22 LTS，即 `22.14+`。</Step>
  <Step title="Ensure Git">若缺少 Git 則進行安裝。</Step>
  <Step title="Install OpenClaw">- `npm` 方法（預設）：全域 npm 安裝 - `git` 方法：克隆/更新 repo，使用 pnpm 安裝依賴，建置，然後在 `~/.local/bin/openclaw` 安裝包裝程式</Step>
  <Step title="Post-install tasks">- 盡力重新整理已載入的閘道服務（`openclaw gateway install --force`，然後重新啟動） - 在升級和 git 安裝時執行 `openclaw doctor --non-interactive`（盡力而為） - 適當時嘗試入門（TTY 可用、未停用入門、且 bootstrap/config 檢查通過） - 預設 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`</Step>
</Steps>

### Source checkout detection

如果在 OpenClaw checkout (`package.json` + `pnpm-workspace.yaml`) 內執行，該指令碼會提供：

- use checkout (`git`)，或
- use global install (`npm`)

如果沒有 TTY 可用且未設定安裝方法，則預設為 `npm` 並發出警告。

如果方法選擇無效或 `--install-method` 值無效，腳本會以代碼 `2` 退出。

### 範例 (install.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="Skip onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Git install">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="GitHub main via npm">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="Dry run">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flags reference">

| Flag                                  | Description                                         |
| ------------------------------------- | --------------------------------------------------- |
| `--install-method npm\|git`           | 選擇安裝方法 (預設: `npm`)。別名: `--method`        |
| `--npm`                               | npm 方法的捷徑                                      |
| `--git`                               | git 方法的捷徑。別名: `--github`                    |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或 package spec (預設: `latest`) |
| `--beta`                              | 如果有 beta dist-tag 則使用，否則回退到 `latest`    |
| `--git-dir <path>`                    | Checkout 目錄 (預設: `~/openclaw`)。別名: `--dir`   |
| `--no-git-update`                     | 針對現有的 checkout 跳過 `git pull`                 |
| `--no-prompt`                         | 停用提示                                            |
| `--no-onboard`                        | 跳過新人引導                                        |
| `--onboard`                           | 啟用新人引導                                        |
| `--dry-run`                           | 列印操作但不套用變更                                |
| `--verbose`                           | 啟用除錯輸出 (`set -x`，npm notice-level logs)      |
| `--help`                              | 顯示用法 (`-h`)                                     |

  </Accordion>

  <Accordion title="環境變數參考">

| 變數                                                    | 描述                                 |
| ------------------------------------------------------- | ------------------------------------ |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安裝方式                             |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或 package spec   |
| `OPENCLAW_BETA=0\|1`                                    | 如果有可用的 beta 版本則使用         |
| `OPENCLAW_GIT_DIR=<path>`                               | Checkout 目錄                        |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切換 git 更新                        |
| `OPENCLAW_NO_PROMPT=1`                                  | 停用提示                             |
| `OPENCLAW_NO_ONBOARD=1`                                 | 跳過入門引導                         |
| `OPENCLAW_DRY_RUN=1`                                    | 試執行模式                           |
| `OPENCLAW_VERBOSE=1`                                    | 除錯模式                             |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm log 層級                         |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行為（預設：`1`） |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>專為希望所有內容都在本地前綴（local prefix，預設為 `~/.openclaw`）下且不依賴系統 Node 的環境而設計。預設支援 npm 安裝，以及在同一個前綴流程下的 git-checkout 安裝。</Info>

### Flow (install-cli.sh)

<Steps>
  <Step title="安裝本地 Node 執行環境">
    下載一個固定的受支援 Node LTS tarball（版本內嵌在腳本中並獨立更新）到 `<prefix>/tools/node-v<version>` 並驗證 SHA-256。
  </Step>
  <Step title="確保 Git 已安裝">
    如果缺少 Git，會嘗試在 Linux 上透過 apt/dnf/yum 或在 macOS 上透過 Homebrew 進行安裝。
  </Step>
  <Step title="在前綴下安裝 OpenClaw">
    - `npm` 方法（預設）：使用 npm 在前綴下安裝，然後將包裝腳本寫入 `<prefix>/bin/openclaw`
    - `git` 方法：克隆/更新 checkout（預設 `~/openclaw`），並仍然將包裝腳本寫入 `<prefix>/bin/openclaw`
  </Step>
  <Step title="Refresh loaded gateway service">
    如果已從相同的前綴加載了 Gateway 服務，腳本會執行
    `openclaw gateway install --force`，然後執行 `openclaw gateway restart`，並
    盡最大努力探測 Gateway 健康狀態。
  </Step>
</Steps>

### 範例 (install-cli.sh)

<Tabs>
  <Tab title="Default">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="Custom prefix + version">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Git install">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="Automation JSON output">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="Run onboarding">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flags reference">

| Flag                        | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `--prefix <path>`           | 安裝前綴（預設：`~/.openclaw`）                                    |
| `--install-method npm\|git` | 選擇安裝方法（預設：`npm`）。別名：`--method`                      |
| `--npm`                     | npm 方法的捷徑                                                     |
| `--git`, `--github`         | git 方法的捷徑                                                     |
| `--git-dir <path>`          | Git checkout 目錄（預設：`~/openclaw`）。別名：`--dir`             |
| `--version <ver>`           | OpenClaw 版本或 dist-tag（預設：`latest`）                         |
| `--node-version <ver>`      | Node 版本（預設：`22.22.0`）                                       |
| `--json`                    | 輸出 NDJSON 事件                                                   |
| `--onboard`                 | 安裝後執行 `openclaw onboard`                                      |
| `--no-onboard`              | 跳過入門引導（預設）                                               |
| `--set-npm-prefix`          | 在 Linux 上，如果當前前綴不可寫，則強制 npm 前綴為 `~/.npm-global` |
| `--help`                    | 顯示用法（`-h`）                                                   |

  </Accordion>

  <Accordion title="環境變數參考">

| 變數                                        | 描述                                |
| ------------------------------------------- | ----------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | 安裝前綴                            |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | 安裝方式                            |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或 dist-tag            |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                           |
| `OPENCLAW_GIT_DIR=<path>`                   | Git 安裝的 Git 檢出目錄             |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | 切換既有檢出的 Git 更新             |
| `OPENCLAW_NO_ONBOARD=1`                     | 略過新人引導                        |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日誌層級                        |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行為 (預設：`1`) |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flow (install.ps1)

<Steps>
  <Step title="確保 PowerShell + Windows 環境">需要 PowerShell 5+。</Step>
  <Step title="預設確保 Node.js 24">若缺少，會嘗試透過 winget，接著 Chocolatey，然後 Scoop 安裝。為了相容性，目前仍支援 Node 22 LTS (`22.14+`)。</Step>
  <Step title="安裝 OpenClaw">- `npm` 方法 (預設)：使用選定的 `-Tag` 進行全域 npm 安裝 - `git` 方法：複製/更新 repo，使用 pnpm 安裝/建置，並在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安裝 wrapper</Step>
  <Step title="安裝後任務">- 盡可能將所需的 bin 目錄加入使用者 PATH - 盡力重新整理已載入的 gateway 服務 (`openclaw gateway install --force`，然後重新啟動) - 在升級和 git 安裝時執行 `openclaw doctor --non-interactive` (盡力而為)</Step>
</Steps>

### Examples (install.ps1)

<Tabs>
  <Tab title="預設">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git 安裝">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="透過 npm 使用 GitHub main">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="自訂 git 目錄">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="試運行">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="除錯追蹤">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Flags 參考">

| Flag                        | 描述                                          |
| --------------------------- | --------------------------------------------- |
| `-InstallMethod npm\|git`   | 安裝方式 (預設：`npm`)                        |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或套件規格 (預設：`latest`) |
| `-GitDir <path>`            | 簽出目錄 (預設：`%USERPROFILE%\openclaw`)     |
| `-NoOnboard`                | 跳過入門引導                                  |
| `-NoGitUpdate`              | 跳過 `git pull`                               |
| `-DryRun`                   | 僅列印動作                                    |

  </Accordion>

  <Accordion title="環境變數參考">

| Variable                           | 描述          |
| ---------------------------------- | ------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安裝方式      |
| `OPENCLAW_GIT_DIR=<path>`          | 簽出目錄      |
| `OPENCLAW_NO_ONBOARD=1`            | 跳過入門引導  |
| `OPENCLAW_GIT_UPDATE=0`            | 停用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 試運行模式    |

  </Accordion>
</AccordionGroup>

<Note>如果使用 `-InstallMethod git` 且系統未安裝 Git，腳本將會結束並列印 Git for Windows 的連結。</Note>

---

## CI 與自動化

請使用非互動式 flags/env vars 以確保可預測的執行結果。

<Tabs>
  <Tab title="install.sh (非互動式 npm)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (非互動式 git)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (略過入門引導)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## 疑難排解

<AccordionGroup>
  <Accordion title="為什麼需要 Git？">
    `git` 安裝方法需要 Git。對於 `npm` 安裝，仍會檢查/安裝 Git 以避免當依賴項使用 git URL 時發生 `spawn git ENOENT` 失敗。
  </Accordion>

<Accordion title="為什麼 npm 在 Linux 上會遇到 EACCES？">某些 Linux 設定將 npm 全域前綴指向 root 擁有的路徑。`install.sh` 可以將前綴切換到 `~/.npm-global` 並將 PATH 匯出附加到 shell rc 檔案（當這些檔案存在時）。</Accordion>

  <Accordion title="sharp/libvips 問題">
    這些腳本預設 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 以避免 sharp 针對系統 libvips 進行建置。若要覆寫：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title="Windows：「npm error spawn git / ENOENT」">安裝 Git for Windows，重新開啟 PowerShell，然後重新執行安裝程式。</Accordion>

<Accordion title="Windows：「openclaw is not recognized」">執行 `npm config get prefix` 並將該目錄新增到您的使用者 PATH（Windows 上不需要 `\bin` 後綴），然後重新開啟 PowerShell。</Accordion>

  <Accordion title="Windows: how to get verbose installer output">
    `install.ps1` 目前未公開 `-Verbose` 選項。
    請使用 PowerShell 追蹤來進行腳本層級的診斷：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="openclaw not found after install">
    通常是 PATH 問題。請參閱 [Node.js 疑難排解](/zh-Hant/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>
