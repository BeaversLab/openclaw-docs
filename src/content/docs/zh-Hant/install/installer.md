---
summary: "安裝程式腳本 (install.sh, install-cli.sh, install.ps1) 的運作方式、旗標和自動化"
read_when:
  - You want to understand `openclaw.ai/install.sh`
  - You want to automate installs (CI / headless)
  - You want to install from a GitHub checkout
title: "安裝程式內部運作"
---

OpenClaw 提供三個安裝程式腳本，可從 `openclaw.ai` 取得。

| 腳本                               | 平台                 | 功能說明                                                                                               |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| [`install.sh`](#installsh)         | macOS / Linux / WSL  | 視需要安裝 Node，透過 npm (預設) 或 git 安裝 OpenClaw，並可執行上手引導。                              |
| [`install-cli.sh`](#install-clish) | macOS / Linux / WSL  | 使用 npm 或 git checkout 模式將 Node + OpenClaw 安裝到本地前綴目錄 (`~/.openclaw`)。不需要 root 權限。 |
| [`install.ps1`](#installps1)       | Windows (PowerShell) | 視需要安裝 Node，透過 npm (預設) 或 git 安裝 OpenClaw，並可執行上手引導。                              |

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

<Tip>推薦用於 macOS/Linux/WSL 上的大多數互動式安裝。</Tip>

### 流程 (install.sh)

<Steps>
  <Step title="偵測作業系統">
    支援 macOS 和 Linux (包括 WSL)。如果偵測到 macOS，會在缺少時安裝 Homebrew。
  </Step>
  <Step title="預設確保 Node.js 24">
    檢查 Node 版本並視需求安裝 Node 24（macOS 上使用 Homebrew，Linux apt/dnf/yum 上使用 NodeSource 設定腳本）。為了相容性，OpenClaw 仍支援 Node 22 LTS，目前為 `22.16+`。
  </Step>
  <Step title="確保 Git">
    如果缺少 Git 則進行安裝。
  </Step>
  <Step title="安裝 OpenClaw">
    - `npm` 方法（預設）：全域 npm 安裝
    - `git` 方法：複製/更新 repo，使用 pnpm 安裝相依套件，建置，然後將安裝包裝器安裝至 `~/.local/bin/openclaw`

  </Step>
  <Step title="安裝後任務">
    - 盡力重新整理已載入的閘道服務（`openclaw gateway install --force`，然後重新啟動）
    - 在升級和 git 安裝時執行 `openclaw doctor --non-interactive`（盡力而為）
    - 在適當時機嘗試入門引導（TTY 可用、未停用入門引導，且 bootstrap/config 檢查通過）
    - 預設為 `SHARP_IGNORE_GLOBAL_LIBVIPS=1`

  </Step>
</Steps>

### 原始碼結帳偵測

如果在 OpenClaw 結帳內執行（`package.json` + `pnpm-workspace.yaml`），該腳本會提供：

- 使用結帳（`git`），或
- 使用全域安裝（`npm`）

如果沒有可用的 TTY 且未設定安裝方法，它會預設為 `npm` 並發出警告。

對於無效的方法選擇或無效的 `--install-method` 值，該腳本會以代碼 `2` 退出。

### 範例 (install.sh)

<Tabs>
  <Tab title="預設">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="略過引導">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard ```</Tab>
  <Tab title="Git 安裝">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git ```</Tab>
  <Tab title="透過 npm 安裝 GitHub main">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --version main ```</Tab>
  <Tab title="試執行">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --dry-run ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="旗標參考">

| 旗標                                  | 說明                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `--install-method npm\|git`           | 選擇安裝方法 (預設: `npm`)。別名: `--method`           |
| `--npm`                               | npm 方法的捷徑                                         |
| `--git`                               | git 方法的捷徑。別名: `--github`                       |
| `--version <version\|dist-tag\|spec>` | npm 版本、dist-tag 或 package spec (預設: `latest`)    |
| `--beta`                              | 如果有可用的 beta dist-tag 則使用，否則回退至 `latest` |
| `--git-dir <path>`                    | 簽出目錄 (預設: `~/openclaw`)。別名: `--dir`           |
| `--no-git-update`                     | 對於現有的簽出，跳過 `git pull`                        |
| `--no-prompt`                         | 停用提示                                               |
| `--no-onboard`                        | 跳過新手引導                                           |
| `--onboard`                           | 啟用新手引導                                           |
| `--dry-run`                           | 列印動作但不套用變更                                   |
| `--verbose`                           | 啟用偵錯輸出 (`set -x`, npm notice-level logs)         |
| `--help`                              | 顯示使用說明 (`-h`)                                    |

  </Accordion>

  <Accordion title="環境變數參考">

| 變數                                                    | 描述                                |
| ------------------------------------------------------- | ----------------------------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm`                      | 安裝方式                            |
| `OPENCLAW_VERSION=latest\|next\|main\|<semver>\|<spec>` | npm 版本、dist-tag 或 package spec  |
| `OPENCLAW_BETA=0\|1`                                    | 如果可用，使用 beta 版本            |
| `OPENCLAW_GIT_DIR=<path>`                               | 檢出目錄                            |
| `OPENCLAW_GIT_UPDATE=0\|1`                              | 切換 git 更新                       |
| `OPENCLAW_NO_PROMPT=1`                                  | 停用提示                            |
| `OPENCLAW_NO_ONBOARD=1`                                 | 略過新人引導                        |
| `OPENCLAW_DRY_RUN=1`                                    | 試執行模式                          |
| `OPENCLAW_VERBOSE=1`                                    | 除錯模式                            |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice`             | npm 日誌層級                        |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`                      | 控制 sharp/libvips 行為 (預設：`1`) |

  </Accordion>
</AccordionGroup>

---

<a id="install-clish"></a>

## install-cli.sh

<Info>專為希望所有內容位於本地前綴 (預設 `~/.openclaw`) 且無系統 Node 依賴的環境設計。預設支援 npm 安裝， 加上相同前綴流程下的 git-checkout 安裝。</Info>

### Flow (install-cli.sh)

<Steps>
  <Step title="安裝本地 Node 執行環境">
    下載一個固定的支援的 Node LTS tarball (版本嵌入在腳本中並獨立更新) 到 `<prefix>/tools/node-v<version>` 並驗證 SHA-256。
  </Step>
  <Step title="確保 Git">
    如果缺少 Git，嘗試在 Linux 上透過 apt/dnf/yum 或在 macOS 上透過 Homebrew 安裝。
  </Step>
  <Step title="在字首下安裝 OpenClaw">
    - `npm` 方法（預設）：使用 npm 在字首下安裝，然後將包裝器寫入 `<prefix>/bin/openclaw`
    - `git` 方法：複製/更新 checkout（預設為 `~/openclaw`），並仍將包裝器寫入 `<prefix>/bin/openclaw`

  </Step>
  <Step title="重新載入已載入的閘道服務">
    如果已經從相同的前綴載入了閘道服務，該腳本會執行
    `openclaw gateway install --force`，然後執行 `openclaw gateway restart`，並
    盡力探測閘道健康狀態。
  </Step>
</Steps>

### 範例 (install-cli.sh)

<Tabs>
  <Tab title="預設">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash ```</Tab>
  <Tab title="自訂前綴 + 版本">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest ```</Tab>
  <Tab title="Git 安裝">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --install-method git --git-dir ~/openclaw ```</Tab>
  <Tab title="自動化 JSON 輸出">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="執行入門引導">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --onboard ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="旗標參考">

| Flag                        | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `--prefix <path>`           | 安裝前綴路徑 (預設：`~/.openclaw`)                                       |
| `--install-method npm\|git` | 選擇安裝方式 (預設：`npm`)。別名：`--method`                             |
| `--npm`                     | npm 方式的捷徑                                                           |
| `--git`, `--github`         | git 方式的捷徑                                                           |
| `--git-dir <path>`          | Git 檢出目錄 (預設：`~/openclaw`)。別名：`--dir`                         |
| `--version <ver>`           | OpenClaw 版本或發行標籤 (預設：`latest`)                                 |
| `--node-version <ver>`      | Node 版本 (預設：`22.22.0`)                                              |
| `--json`                    | 輸出 NDJSON 事件                                                         |
| `--onboard`                 | 安裝後執行 `openclaw onboard`                                            |
| `--no-onboard`              | 跳過新手引導 (預設)                                                      |
| `--set-npm-prefix`          | 在 Linux 上，如果當前前綴路徑不可寫，強制將 npm 前綴設為 `~/.npm-global` |
| `--help`                    | 顯示使用說明 (`-h`)                                                      |

  </Accordion>

  <Accordion title="環境變數參考">

| 變數                                        | 描述                                |
| ------------------------------------------- | ----------------------------------- |
| `OPENCLAW_PREFIX=<path>`                    | 安裝前綴                            |
| `OPENCLAW_INSTALL_METHOD=git\|npm`          | 安裝方式                            |
| `OPENCLAW_VERSION=<ver>`                    | OpenClaw 版本或發布標籤             |
| `OPENCLAW_NODE_VERSION=<ver>`               | Node 版本                           |
| `OPENCLAW_GIT_DIR=<path>`                   | Git 安裝的 Git 檢出目錄             |
| `OPENCLAW_GIT_UPDATE=0\|1`                  | 切換現有檢出的 Git 更新             |
| `OPENCLAW_NO_ONBOARD=1`                     | 跳過引導                            |
| `OPENCLAW_NPM_LOGLEVEL=error\|warn\|notice` | npm 日誌層級                        |
| `SHARP_IGNORE_GLOBAL_LIBVIPS=0\|1`          | 控制 sharp/libvips 行為 (預設：`1`) |

  </Accordion>
</AccordionGroup>

---

<a id="installps1"></a>

## install.ps1

### Flow (install.ps1)

<Steps>
  <Step title="確保 PowerShell + Windows 環境">
    需要 PowerShell 5+。
  </Step>
  <Step title="預設確保 Node.js 24">
    如果缺少，會嘗試透過 winget，然後 Chocolatey，再來 Scoop 進行安裝。為了相容性，Node 22 LTS，目前為 `22.16+`，仍受支援。
  </Step>
  <Step title="安裝 OpenClaw">
    - `npm` 方法（預設）：使用選定的 `-Tag` 進行全域 npm 安裝，從可寫入的安裝程式暫存目錄啟動，以便在受保護資料夾（例如 `C:\`）中開啟的 Shell 仍能正常運作
    - `git` 方法：複製/更新存放庫，使用 pnpm 安裝/建置，並在 `%USERPROFILE%\.local\bin\openclaw.cmd` 安裝包裝程式

  </Step>
  <Step title="安裝後任務">
    - 盡可能將所需的 bin 目錄新增至使用者 PATH
    - 盡力重新整理已載入的閘道服務（`openclaw gateway install --force`，然後重新啟動）
    - 在升級和 git 安裝時執行 `openclaw doctor --non-interactive`（盡力而為）

  </Step>
  <Step title="處理失敗">
    `iwr ... | iex` 和 scriptblock 安裝會回報終止錯誤，而不會關閉目前的 PowerShell 工作階段。直接 `powershell -File` / `pwsh -File` 安裝仍會傳回非零結束代碼以利自動化。
  </Step>
</Steps>

### Examples (install.ps1)

<Tabs>
  <Tab title="預設">```powershell iwr -useb https://openclaw.ai/install.ps1 | iex ```</Tab>
  <Tab title="Git 安裝">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git ```</Tab>
  <Tab title="透過 npm 使用 GitHub main">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -Tag main ```</Tab>
  <Tab title="自訂 git 目錄">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -InstallMethod git -GitDir "C:\openclaw" ```</Tab>
  <Tab title="試執行">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -DryRun ```</Tab>
  <Tab title="除錯追蹤">```powershell # install.ps1 has no dedicated -Verbose flag yet. Set-PSDebug -Trace 1 & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard Set-PSDebug -Trace 0 ```</Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="旗標參考">

| 旗標                        | 描述                                           |
| --------------------------- | ---------------------------------------------- |
| `-InstallMethod npm\|git`   | 安裝方法（預設：`npm`）                        |
| `-Tag <tag\|version\|spec>` | npm dist-tag、版本或套件規格（預設：`latest`） |
| `-GitDir <path>`            | 簽出目錄（預設：`%USERPROFILE%\openclaw`）     |
| `-NoOnboard`                | 略過入門引導                                   |
| `-NoGitUpdate`              | 略過 `git pull`                                |
| `-DryRun`                   | 僅列印動作                                     |

  </Accordion>

  <Accordion title="環境變數參考">

| 變數                               | 說明          |
| ---------------------------------- | ------------- |
| `OPENCLAW_INSTALL_METHOD=git\|npm` | 安裝方法      |
| `OPENCLAW_GIT_DIR=<path>`          | 檢出目錄      |
| `OPENCLAW_NO_ONBOARD=1`            | 略過引導      |
| `OPENCLAW_GIT_UPDATE=0`            | 停用 git pull |
| `OPENCLAW_DRY_RUN=1`               | 試執行模式    |

  </Accordion>
</AccordionGroup>

<Note>如果使用了 `-InstallMethod git` 但系統缺少 Git，腳本將會退出並顯示 Git for Windows 的連結。</Note>

---

## CI 與自動化

請使用非互動式 flags/env vars 以確保可預測的執行結果。

<Tabs>
  <Tab title="install.sh (非互動式 npm)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-prompt --no-onboard ```</Tab>
  <Tab title="install.sh (非互動式 git)">```bash OPENCLAW_INSTALL_METHOD=git OPENCLAW_NO_PROMPT=1 \ curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash ```</Tab>
  <Tab title="install-cli.sh (JSON)">```bash curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install-cli.sh | bash -s -- --json --prefix /opt/openclaw ```</Tab>
  <Tab title="install.ps1 (跳過引導)">```powershell & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard ```</Tab>
</Tabs>

---

## 疑難排解

<AccordionGroup>
  <Accordion title="為什麼需要 Git？">
    `git` 安裝方法需要 Git。對於 `npm` 安裝，仍然會檢查/安裝 Git，以避免當相依套件使用 git URL 時發生 `spawn git ENOENT` 失敗。
  </Accordion>

<Accordion title="為什麼 npm 在 Linux 上會遇到 EACCES？">部分 Linux 設定將 npm 的全域前綴指向 root 擁有的路徑。`install.sh` 可以將前綴切換至 `~/.npm-global` 並將 PATH 匯出附加至 shell rc 檔案（當這些檔案存在時）。</Accordion>

  <Accordion title="sharp/libvips 問題">
    這些腳本預設 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 以避免 sharp 針對系統 libvips 進行建置。若要覆寫：

    ```bash
    SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

  </Accordion>

<Accordion title='Windows: "npm error spawn git / ENOENT"'>安裝適用於 Windows 的 Git，重新開啟 PowerShell，然後重新執行安裝程式。</Accordion>

<Accordion title="Windows：「無法辨識 openclaw」">執行 `npm config get prefix` 並將該目錄新增至您的使用者 PATH（Windows 上不需要 `\bin` 後綴），然後重新開啟 PowerShell。</Accordion>

  <Accordion title="Windows：如何取得詳細的安裝程式輸出">
    `install.ps1` 目前未公開 `-Verbose` 選項。
    使用 PowerShell 追蹤進行腳本層級的診斷：

    ```powershell
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

  </Accordion>

  <Accordion title="安裝後找不到 openclaw">
    通常是 PATH 問題。請參閱 [Node.js 疑難排解](/zh-Hant/install/node#troubleshooting)。
  </Accordion>
</AccordionGroup>

## 相關

- [安裝概覽](/zh-Hant/install)
- [更新](/zh-Hant/install/updating)
- [解除安裝](/zh-Hant/install/uninstall)
